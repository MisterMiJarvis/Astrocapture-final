import pg from 'pg';
import { readFileSync } from 'fs';

// Read PostgreSQL password from secrets
function getPassword(): string {
  try {
    const secrets = JSON.parse(readFileSync('/home/ubuntu/.openclaw/workspace/.secrets/postgresql.json', 'utf-8'));
    return secrets.password;
  } catch {
    return process.env.PG_PASSWORD || '';
  }
}

const poolConfig = {
  host: process.env.PG_HOST || '127.0.0.1',
  port: parseInt(process.env.PG_PORT || '5432'),
  database: process.env.PG_DB || 'haldb',
  user: process.env.PG_USER || 'hal',
  password: getPassword(),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  // Keep connections alive to avoid timeout errors
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
};

export const pool = new pg.Pool(poolConfig);

// Convert SQLite ? placeholders to PostgreSQL $1, $2, etc.
function convertPlaceholders(sql: string): string {
  let index = 0;
  // Don't convert ? inside single quotes (string literals)
  let result = '';
  let inSingleQuote = false;
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    if (char === "'" && sql[i - 1] !== '\\') {
      inSingleQuote = !inSingleQuote;
      result += char;
    } else if (char === '?' && !inSingleQuote) {
      index++;
      result += `$${index}`;
    } else {
      result += char;
    }
  }
  return result;
}

// Convert SQLite-specific SQL functions to PostgreSQL equivalents
function convertSqliteFunctions(sql: string): string {
  return sql
    // datetime('now') → NOW()
    .replace(/datetime\(\s*'now'\s*\)/gi, 'NOW()')
    // datetime('now', '-N days') → NOW() - INTERVAL 'N days'
    .replace(/datetime\(\s*'now'\s*,\s*'(-?\d+)\s*days?'\s*\)/gi, "NOW() - INTERVAL '$1 days'")
    .replace(/datetime\(\s*'now'\s*,\s*'(-?\d+)\s*hours?'\s*\)/gi, "NOW() - INTERVAL '$1 hours'")
    .replace(/datetime\(\s*'now'\s*,\s*'(-?\d+)\s*months?'\s*\)/gi, "NOW() - INTERVAL '$1 months'")
    // date('now') → CURRENT_DATE
    .replace(/date\(\s*'now'\s*\)/gi, 'CURRENT_DATE')
    // strftime('%Y-%m', col) → TO_CHAR(col, 'YYYY-MM')
    .replace(/strftime\(\s*'%Y-%m'\s*,\s*(\w+)\s*\)/gi, 'TO_CHAR($1, \'YYYY-MM\')')
    .replace(/strftime\(\s*'%Y'\s*,\s*(\w+)\s*\)/gi, 'TO_CHAR($1, \'YYYY\')')
    .replace(/strftime\(\s*'%m'\s*,\s*(\w+)\s*\)/gi, 'TO_CHAR($1, \'MM\')')
    .replace(/strftime\(\s*'%d'\s*,\s*(\w+)\s*\)/gi, 'TO_CHAR($1, \'DD\')')
    .replace(/strftime\(\s*'(%[^']+)'[^)]*\)/gi, (match, fmt) => {
      // Generic strftime conversion
      const pgFmt = fmt
        .replace(/%Y/g, 'YYYY')
        .replace(/%m/g, 'MM')
        .replace(/%d/g, 'DD')
        .replace(/%H/g, 'HH24')
        .replace(/%M/g, 'MI')
        .replace(/%S/g, 'SS');
      return `TO_CHAR(${pgFmt})`;
    })
    // INSERT OR IGNORE INTO → INSERT INTO ... ON CONFLICT DO NOTHING
    .replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT INTO')
    // INSERT OR REPLACE INTO → INSERT INTO ... ON CONFLICT DO UPDATE (handled per-query)
    .replace(/INSERT\s+OR\s+REPLACE\s+INTO/gi, 'INSERT INTO')
    // Handle ON CONFLICT syntax (SQLite and PostgreSQL are compatible here)
    // last_insert_rowid() → lastval() (rarely used but just in case)
    .replace(/last_insert_rowid\(\)/gi, 'lastval()');
}

// Full SQL transformation
function transformSql(sql: string): string {
  return convertPlaceholders(convertSqliteFunctions(sql));
}

// Prepare a statement - returns an object with async run/get/all methods
// This mimics better-sqlite3's API but async
function prepare(sql: string) {
  const transformedSql = transformSql(sql);
  return {
    // run() - INSERT/UPDATE/DELETE - returns result with changes, lastInsertRowid
    async run(...params: any[]) {
      const client = await pool.connect();
      try {
        const result = await client.query(transformedSql, params);
        return {
          changes: result.rowCount ?? 0,
          lastInsertRowid: result.rows[0]?.id ?? (result as any).insertId ?? null,
        };
      } finally {
        client.release();
      }
    },
    // get() - SELECT - returns first row or undefined
    async get(...params: any[]) {
      const client = await pool.connect();
      try {
        const result = await client.query(transformedSql, params);
        return result.rows[0] ?? undefined;
      } finally {
        client.release();
      }
    },
    // all() - SELECT - returns all rows
    async all(...params: any[]) {
      const client = await pool.connect();
      try {
        const result = await client.query(transformedSql, params);
        return result.rows;
      } finally {
        client.release();
      }
    },
  };
}

// exec() - run raw SQL (for schema creation etc.)
async function exec(sql: string) {
  const client = await pool.connect();
  try {
    await client.query(transformSql(sql));
  } finally {
    client.release();
  }
}

// pragma() - no-op for PostgreSQL (FKs are handled at schema level)
function pragma(_sql: string) {
  // PostgreSQL handles foreign keys at schema level, no-op
}

// Async init - create tables if they don't exist
async function initSchema() {
  const client = await pool.connect();
  try {
    // Enable FK constraints
    await client.query('SET session_replication_role = replica;'); // Bypass FK checks during creation

    // Users
    await client.query(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      first_name TEXT NOT NULL DEFAULT '',
      last_name TEXT NOT NULL DEFAULT '',
      is_admin INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`);

    // Posts
    await client.query(`CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      image_url TEXT NOT NULL DEFAULT '',
      object_name TEXT NOT NULL DEFAULT '',
      capture_date TEXT NOT NULL DEFAULT '',
      equipment TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '[]',
      astrobin_url TEXT DEFAULT '',
      raw_data_url TEXT DEFAULT '',
      total_integration_time INTEGER NOT NULL DEFAULT 0,
      show_on_wall INTEGER NOT NULL DEFAULT 1,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`);

    // Acquisition logs
    await client.query(`CREATE TABLE IF NOT EXISTS acquisition_logs (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      date TEXT NOT NULL DEFAULT '',
      filter TEXT NOT NULL DEFAULT '',
      exposure_count INTEGER NOT NULL DEFAULT 0,
      exposure_length INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    )`);

    // Processing posts
    await client.query(`CREATE TABLE IF NOT EXISTS processing_posts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '[]',
      capture_date TEXT NOT NULL DEFAULT '',
      post_type TEXT NOT NULL DEFAULT 'gallery',
      before_image_url TEXT DEFAULT '',
      after_image_url TEXT DEFAULT '',
      featured_image_url TEXT DEFAULT '',
      attached_audio_url TEXT DEFAULT '',
      attached_document_url TEXT DEFAULT '',
      show_before_on_wall INTEGER NOT NULL DEFAULT 0,
      show_after_on_wall INTEGER NOT NULL DEFAULT 0,
      show_featured_on_wall INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`);

    // Processing gallery images
    await client.query(`CREATE TABLE IF NOT EXISTS processing_gallery_images (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      image_url TEXT NOT NULL DEFAULT '',
      caption TEXT NOT NULL DEFAULT '',
      show_on_wall INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (post_id) REFERENCES processing_posts(id) ON DELETE CASCADE
    )`);

    // Equipment
    await client.query(`CREATE TABLE IF NOT EXISTS equipment (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Other',
      image_url TEXT DEFAULT '',
      specs TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      rating INTEGER NOT NULL DEFAULT 0,
      is_personal INTEGER NOT NULL DEFAULT 1,
      focal_length REAL,
      aperture REAL,
      f_ratio REAL,
      telescope_type TEXT,
      sensor_width REAL,
      sensor_height REAL,
      pixel_size REAL,
      resolution TEXT,
      camera_type TEXT,
      payload_capacity REAL,
      mount_type TEXT,
      filter_type TEXT,
      bandwidth REAL,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`);

    // DSO cache
    await client.query(`CREATE TABLE IF NOT EXISTS dso_cache (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL DEFAULT '{}',
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`);

    // Observation targets
    await client.query(`CREATE TABLE IF NOT EXISTS observation_targets (
      id TEXT PRIMARY KEY,
      object_id TEXT NOT NULL,
      common_name TEXT NOT NULL DEFAULT '',
      object_type TEXT NOT NULL DEFAULT '',
      constellation TEXT NOT NULL DEFAULT '',
      magnitude REAL,
      size_width REAL NOT NULL DEFAULT 0,
      size_height REAL NOT NULL DEFAULT 0,
      priority TEXT NOT NULL DEFAULT 'medium',
      notes TEXT DEFAULT '',
      completed INTEGER NOT NULL DEFAULT 0,
      completed_date TEXT,
      acquisition_hours REAL DEFAULT 0,
      target_hours REAL,
      image_url TEXT DEFAULT '',
      ra TEXT DEFAULT '',
      dec TEXT DEFAULT '',
      ra_deg REAL DEFAULT 0,
      dec_deg REAL DEFAULT 0
    )`);

    // Observation sessions
    await client.query(`CREATE TABLE IF NOT EXISTS observation_sessions (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      loc_name TEXT NOT NULL DEFAULT '',
      loc_lat REAL NOT NULL DEFAULT 0,
      loc_lon REAL NOT NULL DEFAULT 0,
      moon_illum REAL NOT NULL DEFAULT 0,
      sunset_time TEXT NOT NULL DEFAULT '',
      darkness_start TEXT NOT NULL DEFAULT '',
      darkness_end TEXT NOT NULL DEFAULT '',
      sunrise_time TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'planned',
      weather_summary TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      cloud_cover INTEGER,
      seeing TEXT DEFAULT '',
      rig_id TEXT DEFAULT ''
    )`);

    // Site config
    await client.query(`CREATE TABLE IF NOT EXISTS site_config (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL DEFAULT '{}',
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`);

    // Session targets (junction)
    await client.query(`CREATE TABLE IF NOT EXISTS session_targets (
      session_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      PRIMARY KEY (session_id, target_id),
      FOREIGN KEY (session_id) REFERENCES observation_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (target_id) REFERENCES observation_targets(id) ON DELETE CASCADE
    )`);

    // Mosaic plans
    await client.query(`CREATE TABLE IF NOT EXISTS mosaic_plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      target_name TEXT NOT NULL DEFAULT '',
      target_ra REAL NOT NULL DEFAULT 0,
      target_dec REAL NOT NULL DEFAULT 0,
      target_width REAL NOT NULL DEFAULT 0,
      target_height REAL NOT NULL DEFAULT 0,
      fov_width REAL NOT NULL DEFAULT 0,
      fov_height REAL NOT NULL DEFAULT 0,
      overlap INTEGER NOT NULL DEFAULT 20,
      cols INTEGER NOT NULL DEFAULT 1,
      rows INTEGER NOT NULL DEFAULT 1,
      panes TEXT NOT NULL DEFAULT '[]',
      csv_data TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`);

    // Log analyses
    await client.query(`CREATE TABLE IF NOT EXISTS log_analyses (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL DEFAULT '',
      log_type TEXT NOT NULL DEFAULT 'unknown',
      content TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '{}',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`);

    // Equipment profiles
    await client.query(`CREATE TABLE IF NOT EXISTS equipment_profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      focal_length REAL,
      aperture REAL,
      sensor_width REAL,
      sensor_height REAL,
      pixel_size REAL,
      guide_focal_length REAL,
      guide_pixel_size REAL,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`);

    // APLS rig profiles
    await client.query(`CREATE TABLE IF NOT EXISTS apls_rig_profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      telescope_name TEXT,
      telescope_focal_length REAL,
      telescope_aperture REAL,
      telescope_f_ratio REAL,
      telescope_type TEXT,
      modifier_type TEXT DEFAULT 'None',
      modifier_factor REAL DEFAULT 1.0,
      effective_focal_length REAL,
      sensor_width REAL,
      sensor_height REAL,
      pixel_size REAL,
      resolution_x INTEGER,
      resolution_y INTEGER,
      read_noise REAL,
      quantum_efficiency REAL,
      is_color INTEGER DEFAULT 1,
      has_cooling INTEGER DEFAULT 0,
      binning_acquisition INTEGER DEFAULT 1,
      camera_name TEXT,
      guiding_focal_length REAL,
      guiding_camera_name TEXT,
      guiding_pixel_size REAL,
      guiding_binning INTEGER DEFAULT 1,
      guiding_mode TEXT DEFAULT 'GuideScope',
      mount_name TEXT,
      mount_type TEXT,
      mount_max_payload REAL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`);

    // APLS horizon masks
    await client.query(`CREATE TABLE IF NOT EXISTS apls_horizon_masks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location_id TEXT,
      format TEXT DEFAULT 'csv',
      points_json TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )`);

    // APLS filters
    await client.query(`CREATE TABLE IF NOT EXISTS apls_filters (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      brand TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'broadband',
      bandwidth_nm REAL NOT NULL DEFAULT 0,
      peak_transmission REAL NOT NULL DEFAULT 0,
      center_wavelength_nm REAL NOT NULL DEFAULT 0,
      sky_suppression REAL NOT NULL DEFAULT 0,
      moon_compatible INTEGER NOT NULL DEFAULT 0,
      color TEXT NOT NULL DEFAULT '#4FC3F7',
      description TEXT NOT NULL DEFAULT '',
      use_cases TEXT NOT NULL DEFAULT '[]',
      recommended_targets TEXT NOT NULL DEFAULT '[]',
      owned INTEGER NOT NULL DEFAULT 1,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    // APLS projects
    await client.query(`CREATE TABLE IF NOT EXISTS apls_projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'planning',
      target_id TEXT NOT NULL DEFAULT '',
      target_name TEXT NOT NULL DEFAULT '',
      target_type TEXT NOT NULL DEFAULT '',
      target_ra TEXT NOT NULL DEFAULT '',
      target_dec TEXT NOT NULL DEFAULT '',
      target_magnitude REAL,
      target_size_arcmin REAL,
      target_image_url TEXT,
      location_source TEXT NOT NULL DEFAULT '',
      lat REAL NOT NULL DEFAULT 0,
      lon REAL NOT NULL DEFAULT 0,
      rig_id TEXT,
      rig_name TEXT,
      focal_length REAL,
      aperture REAL,
      pixel_size REAL,
      sensor_width REAL,
      sensor_height REAL,
      primary_filter TEXT NOT NULL DEFAULT '',
      exposure_plan TEXT NOT NULL DEFAULT '[]',
      total_planned_hours REAL NOT NULL DEFAULT 0,
      total_exposure_seconds REAL NOT NULL DEFAULT 0,
      completion_percent REAL NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    // APLS project observations
    await client.query(`CREATE TABLE IF NOT EXISTS apls_project_observations (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      date TEXT NOT NULL DEFAULT '',
      exposures_taken INTEGER NOT NULL DEFAULT 0,
      exposure_duration REAL NOT NULL DEFAULT 0,
      filter TEXT NOT NULL DEFAULT '',
      seeing REAL,
      guiding_rms REAL,
      moon_illumination REAL,
      notes TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      FOREIGN KEY (project_id) REFERENCES apls_projects(id) ON DELETE CASCADE
    )`);

    // Page views
    await client.query(`CREATE TABLE IF NOT EXISTS page_views (
      id SERIAL PRIMARY KEY,
      path TEXT NOT NULL,
      referrer TEXT NOT NULL DEFAULT '',
      user_agent TEXT NOT NULL DEFAULT '',
      country TEXT NOT NULL DEFAULT '',
      session_id TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`);

    // PHD2 sessions
    await client.query(`CREATE TABLE IF NOT EXISTS phd2_sessions (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL DEFAULT '',
      session_index INTEGER NOT NULL DEFAULT 0,
      start_time TEXT NOT NULL DEFAULT '',
      end_time TEXT NOT NULL DEFAULT '',
      duration_seconds REAL NOT NULL DEFAULT 0,
      camera TEXT NOT NULL DEFAULT '',
      exposure_ms REAL NOT NULL DEFAULT 0,
      focal_length_mm REAL NOT NULL DEFAULT 0,
      pixel_scale REAL NOT NULL DEFAULT 0,
      mount TEXT NOT NULL DEFAULT '',
      frame_count INTEGER NOT NULL DEFAULT 0,
      rms_total_arcsec REAL NOT NULL DEFAULT 0,
      rms_ra_arcsec REAL NOT NULL DEFAULT 0,
      rms_dec_arcsec REAL NOT NULL DEFAULT 0,
      peak_ra_arcsec REAL NOT NULL DEFAULT 0,
      peak_dec_arcsec REAL NOT NULL DEFAULT 0,
      mean_snr REAL NOT NULL DEFAULT 0,
      mean_star_mass REAL NOT NULL DEFAULT 0,
      dither_count INTEGER NOT NULL DEFAULT 0,
      star_lost_count INTEGER NOT NULL DEFAULT 0,
      settling_failed_count INTEGER NOT NULL DEFAULT 0,
      raw_log TEXT NOT NULL DEFAULT '',
      analysis_json TEXT NOT NULL DEFAULT '',
      project_id TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`);

    await client.query('SET session_replication_role = DEFAULT;'); // Re-enable FK checks

    // Indexes
    const indexes = [
      'idx_posts_object ON posts(object_name)',
      'idx_posts_wall ON posts(show_on_wall)',
      'idx_acquisition_post ON acquisition_logs(post_id)',
      'idx_processing_type ON processing_posts(post_type)',
      'idx_equipment_category ON equipment(category)',
      'idx_dso_updated ON dso_cache(updated_at)',
      'idx_targets_completed ON observation_targets(completed)',
      'idx_sessions_date ON observation_sessions(date)',
      'idx_config_id ON site_config(id)',
      'idx_gallery_post ON processing_gallery_images(post_id)',
      'idx_mosaic_name ON mosaic_plans(name)',
      'idx_log_type ON log_analyses(log_type)',
      'idx_apls_rigs_default ON apls_rig_profiles(is_default)',
      'idx_apls_horizons_loc ON apls_horizon_masks(location_id)',
      'idx_apls_filters_user ON apls_filters(user_id)',
      'idx_apls_projects_user ON apls_projects(user_id)',
      'idx_apls_observations_project ON apls_project_observations(project_id)',
      'idx_pageviews_path ON page_views(path)',
      'idx_pageviews_created ON page_views(created_at)',
      'idx_pageviews_session ON page_views(session_id)',
      'idx_phd2_sessions_project ON phd2_sessions(project_id)',
    ];
    for (const idx of indexes) {
      const idxName = idx.split(' ')[0];
      await client.query(`CREATE INDEX IF NOT EXISTS ${idx}`);
    }

    console.log('[db] PostgreSQL schema initialized');
  } finally {
    client.release();
  }
}

// Export a db object that mimics better-sqlite3's API but async
const db = {
  prepare,
  exec,
  pragma,
  initSchema,
  pool,
};

export default db;