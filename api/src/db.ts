import BetterSqlite3 from 'better-sqlite3';
import { mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '../../data');
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = process.env.DB_PATH || join(DATA_DIR, 'astrocapture.db');

const db: BetterSqlite3.Database = new BetterSqlite3(DB_PATH);

// Enable WAL mode for better concurrent reads
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL DEFAULT '',
    last_name TEXT NOT NULL DEFAULT '',
    is_admin INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS posts (
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
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS acquisition_logs (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    date TEXT NOT NULL DEFAULT '',
    filter TEXT NOT NULL DEFAULT '',
    exposure_count INTEGER NOT NULL DEFAULT 0,
    exposure_length INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS processing_posts (
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
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS processing_gallery_images (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    image_url TEXT NOT NULL DEFAULT '',
    caption TEXT NOT NULL DEFAULT '',
    show_on_wall INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (post_id) REFERENCES processing_posts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS equipment (
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
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS dso_cache (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL DEFAULT '{}',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS observation_targets (
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
  );

  CREATE TABLE IF NOT EXISTS observation_sessions (
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
  );

  CREATE TABLE IF NOT EXISTS site_config (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL DEFAULT '{}',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Junction table for session <-> targets (many-to-many)
  CREATE TABLE IF NOT EXISTS session_targets (
    session_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    PRIMARY KEY (session_id, target_id),
    FOREIGN KEY (session_id) REFERENCES observation_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (target_id) REFERENCES observation_targets(id) ON DELETE CASCADE
  );

  -- Nova DSO Tracker additions
  CREATE TABLE IF NOT EXISTS mosaic_plans (
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
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS log_analyses (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL DEFAULT '',
    log_type TEXT NOT NULL DEFAULT 'unknown',
    content TEXT NOT NULL DEFAULT '',
    summary TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS equipment_profiles (
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
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Indexes
  CREATE INDEX IF NOT EXISTS idx_posts_object ON posts(object_name);
  CREATE INDEX IF NOT EXISTS idx_posts_wall ON posts(show_on_wall);
  CREATE INDEX IF NOT EXISTS idx_acquisition_post ON acquisition_logs(post_id);
  CREATE INDEX IF NOT EXISTS idx_processing_type ON processing_posts(post_type);
  CREATE INDEX IF NOT EXISTS idx_equipment_category ON equipment(category);
  CREATE INDEX IF NOT EXISTS idx_dso_updated ON dso_cache(updated_at);
  CREATE INDEX IF NOT EXISTS idx_targets_completed ON observation_targets(completed);
  CREATE INDEX IF NOT EXISTS idx_sessions_date ON observation_sessions(date);
  CREATE INDEX IF NOT EXISTS idx_config_id ON site_config(id);
  CREATE INDEX IF NOT EXISTS idx_gallery_post ON processing_gallery_images(post_id);
  CREATE INDEX IF NOT EXISTS idx_mosaic_name ON mosaic_plans(name);
  CREATE INDEX IF NOT EXISTS idx_log_type ON log_analyses(log_type);

  -- ===========================================
  -- APLS v3 — Module 2 : Rig Profiles
  -- ===========================================
  CREATE TABLE IF NOT EXISTS apls_rig_profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    is_default INTEGER DEFAULT 0,
    -- Tube
    telescope_name TEXT,
    telescope_focal_length REAL,
    telescope_aperture REAL,
    telescope_f_ratio REAL,
    telescope_type TEXT,
    -- Modificateur optique
    modifier_type TEXT DEFAULT 'None',
    modifier_factor REAL DEFAULT 1.0,
    effective_focal_length REAL,
    -- Capteur
    sensor_width REAL,
    sensor_height REAL,
    pixel_size REAL,
    resolution_x INTEGER,
    resolution_y INTEGER,
    read_noise REAL,
    quantum_efficiency REAL,
    is_color INTEGER DEFAULT 1,
    has_cooling INTEGER DEFAULT 0,
    binning_acquisition INTEGER DEFAULT 1,  /* 1 ou 2 */
    camera_name TEXT,
    guiding_focal_length REAL,
    -- Guidage
    guiding_camera_name TEXT,
    guiding_pixel_size REAL,
    guiding_binning INTEGER DEFAULT 1,
    guiding_mode TEXT DEFAULT 'GuideScope',
    -- Monture
    mount_name TEXT,
    mount_type TEXT,
    mount_max_payload REAL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  -- ===========================================
  -- APLS v3 — Module 2 : Horizon Masks
  -- ===========================================
  CREATE TABLE IF NOT EXISTS apls_horizon_masks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location_id TEXT,
    format TEXT DEFAULT 'csv',
    points_json TEXT NOT NULL,  -- JSON array de {az, alt}
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_apls_rigs_default ON apls_rig_profiles(is_default);
  CREATE INDEX IF NOT EXISTS idx_apls_horizons_loc ON apls_horizon_masks(location_id);

  -- ===========================================
  -- APLS Filters (user-owned filters)
  -- ===========================================
  CREATE TABLE IF NOT EXISTS apls_filters (
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
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- ===========================================
  -- APLS Projects (user-owned projects)
  -- ===========================================
  CREATE TABLE IF NOT EXISTS apls_projects (
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
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- ===========================================
  -- APLS Project Observations
  -- ===========================================
  CREATE TABLE IF NOT EXISTS apls_project_observations (
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
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES apls_projects(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_apls_filters_user ON apls_filters(user_id);
  CREATE INDEX IF NOT EXISTS idx_apls_projects_user ON apls_projects(user_id);
  CREATE INDEX IF NOT EXISTS idx_apls_observations_project ON apls_project_observations(project_id);
`);

export default db;