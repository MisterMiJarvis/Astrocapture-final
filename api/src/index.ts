import { execSync } from 'child_process';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { Jwt } from 'hono/utils/jwt';
import bcrypt from 'bcryptjs';
import { mkdirSync, existsSync, writeFileSync, readFileSync, statSync, createReadStream, unlinkSync } from 'fs';
import { join, extname, basename } from 'path';
import db from './db.js';

type Variables = { user: { id: string; email: string } };
const app = new Hono<{ Variables: Variables }>();
const JWT_SECRET = process.env.JWT_SECRET || 'astrocapture-secret-change-in-prod';
const PORT = parseInt(process.env.PORT || '3002');
const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), '..', 'public', 'uploads');

if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

// CORS
app.use('/*', cors({
  origin: ['https://astrocapture.org', 'https://www.astrocapture.org', 'https://beta.astrocapture.org', 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));

// Auth middleware
type AuthUser = { id: string; email: string; isAdmin?: boolean };
const auth = async (c: any, next: any) => {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  try {
    const payload = await Jwt.verify(header.slice(7), JWT_SECRET, 'HS256') as AuthUser;
    c.set('user', payload);
    await next();
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }
};

// =====================
// AUTH
// =====================

app.post('/api/auth/login', async (c) => {
  const { email, password } = await c.req.json();
  const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }
  const token = await Jwt.sign({ id: user.id, email: user.email, isAdmin: !!user.is_admin }, JWT_SECRET);
  return c.json({ token, user: { id: user.id, email: user.email, firstName: user.first_name || '', lastName: user.last_name || '', isAdmin: !!user.is_admin } });
});

app.get('/api/auth/me', async (c) => {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  try {
    const payload = await Jwt.verify(header.slice(7), JWT_SECRET, 'HS256') as any;
    const user = await db.prepare('SELECT id, email, first_name, last_name, is_admin FROM users WHERE id = ?').get(payload.id) as any;
    if (!user) return c.json({ error: 'User not found' }, 404);
    return c.json({ user: { id: user.id, email: user.email, firstName: user.first_name || '', lastName: user.last_name || '', isAdmin: !!user.is_admin } });
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }
});

app.post('/api/auth/setup', async (c) => {
  const userCount = (await db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count;
  if (userCount > 0) return c.json({ error: 'Admin already exists' }, 400);
  const { email, password } = await c.req.json();
  if (!email || !password || password.length < 6) {
    return c.json({ error: 'Email and password (min 6 chars) required' }, 400);
  }
  const id = crypto.randomUUID();
  const hash = await bcrypt.hash(password, 10);
  await db.prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)').run(id, email, hash);
  const token = await Jwt.sign({ id, email }, JWT_SECRET);
  return c.json({ token, user: { id, email } });
});

app.post('/api/auth/astro-login', async (c) => {
  const { email, password } = await c.req.json();
  const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }
  const token = await Jwt.sign({ id: user.id, email: user.email, isAdmin: !!user.is_admin }, JWT_SECRET);
  return c.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      isAdmin: !!user.is_admin,
    }
  });
});

// =====================
// USERS CRUD (Admin + AstroSuite)
// =====================

app.get('/api/users', auth, async (c) => {
  const authUser = c.get('user') as AuthUser;
  if (!authUser.isAdmin) return c.json({ error: 'Admin required' }, 403);
  const rows = await db.prepare('SELECT id, email, first_name, last_name, is_admin, created_at FROM users ORDER BY created_at DESC').all();
  const users = (rows as any[]).map(row => ({
    id: row.id,
    email: row.email,
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    isAdmin: !!row.is_admin,
    createdAt: row.created_at,
  }));
  return c.json({ users });
});

app.post('/api/users', auth, async (c) => {
  const authUser = c.get('user') as AuthUser;
  if (!authUser.isAdmin) return c.json({ error: 'Admin required' }, 403);
  const { email, firstName, lastName, password, isAdmin } = await c.req.json();
  if (!email || !password || password.length < 6) {
    return c.json({ error: 'Email and password (min 6 chars) required' }, 400);
  }
  const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return c.json({ error: 'Email already exists' }, 409);
  const id = crypto.randomUUID();
  const hash = await bcrypt.hash(password, 10);
  await db.prepare('INSERT INTO users (id, email, password_hash, first_name, last_name, is_admin) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, email, hash, firstName || '', lastName || '', isAdmin ? 1 : 0);
  const user = await db.prepare('SELECT id, email, first_name, last_name, is_admin, created_at FROM users WHERE id = ?').get(id) as any;
  return c.json({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      isAdmin: !!user.is_admin,
      createdAt: user.created_at,
    }
  }, 201);
});

app.put('/api/users/:id', auth, async (c) => {
  const authUser = c.get('user') as AuthUser;
  if (!authUser.isAdmin) return c.json({ error: 'Admin required' }, 403);
  const { email, firstName, lastName, password, isAdmin } = await c.req.json();
  const id = c.req.param('id');
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  if (!user) return c.json({ error: 'User not found' }, 404);

  let updates: string[] = [];
  let params: any[] = [];
  if (email !== undefined) { updates.push('email = ?'); params.push(email); }
  if (firstName !== undefined) { updates.push('first_name = ?'); params.push(firstName); }
  if (lastName !== undefined) { updates.push('last_name = ?'); params.push(lastName); }
  if (isAdmin !== undefined) { updates.push('is_admin = ?'); params.push(isAdmin ? 1 : 0); }
  if (password) {
    const hash = await bcrypt.hash(password, 10);
    updates.push('password_hash = ?');
    params.push(hash);
  }
  if (updates.length === 0) return c.json({ error: 'No fields to update' }, 400);
  params.push(id);
  await db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const updated = await db.prepare('SELECT id, email, first_name, last_name, is_admin, created_at FROM users WHERE id = ?').get(id) as any;
  return c.json({
    user: {
      id: updated.id,
      email: updated.email,
      firstName: updated.first_name || '',
      lastName: updated.last_name || '',
      isAdmin: !!updated.is_admin,
      createdAt: updated.created_at,
    }
  });
});

app.delete('/api/users/:id', auth, async (c) => {
  const authUser = c.get('user') as AuthUser;
  if (!authUser.isAdmin) return c.json({ error: 'Admin required' }, 403);
  const id = c.req.param('id');
  if (id === authUser.id) return c.json({ error: 'Cannot delete yourself' }, 400);
  await db.prepare('DELETE FROM users WHERE id = ?').run(id);
  return c.json({ ok: true });
});

// =====================
// TELESCOPIUS PROXY (Real API via cloudscraper)
// =====================

function callTelescopiusProxy(endpoint: string, params: Record<string, string> = {}): any {
  try {
    const paramsJson = JSON.stringify(params);
    const result = execSync(
      `python3 /home/ubuntu/astrocapture/api/src/telescopius_proxy.py ${endpoint} '${paramsJson}'`,
      { encoding: 'utf-8', timeout: 35000 }
    );
    return JSON.parse(result);
  } catch (err: any) {
    console.error('[Telescopius Proxy Error]', err.message);
    return { error: err.message };
  }
}

app.get('/api/telescopius/search', async (c) => {
  // Collect all query params for Telescopius API
  const proxyParams: Record<string, string> = {};
  
  // Location & time
  const lat = c.req.query('lat') || '43.7889';
  const lon = c.req.query('lon') || '4.7533';
  const timezone = c.req.query('timezone') || 'Europe/Paris';
  proxyParams.lat = lat;
  proxyParams.lon = lon;
  proxyParams.timezone = timezone;
  if (c.req.query('datetime')) proxyParams.datetime = c.req.query('datetime')!;
  
  // Name & type
  if (c.req.query('name') || c.req.query('q')) proxyParams.name = c.req.query('name') || c.req.query('q')!;
  if (c.req.query('name_exact')) proxyParams.name_exact = c.req.query('name_exact')!;
  if (c.req.query('types')) proxyParams.types = c.req.query('types')!;
  if (c.req.query('con')) proxyParams.con = c.req.query('con')!;
  if (c.req.query('cat')) proxyParams.cat = c.req.query('cat')!;
  
  // Magnitude
  if (c.req.query('mag_min')) proxyParams.mag_min = c.req.query('mag_min')!;
  if (c.req.query('mag_max')) proxyParams.mag_max = c.req.query('mag_max')!;
  if (c.req.query('mag_unknown')) proxyParams.mag_unknown = c.req.query('mag_unknown')!;
  
  // Size
  if (c.req.query('size_min')) proxyParams.size_min = c.req.query('size_min')!;
  if (c.req.query('size_max')) proxyParams.size_max = c.req.query('size_max')!;
  if (c.req.query('size_unknown')) proxyParams.size_unknown = c.req.query('size_unknown')!;
  
  // Surface brightness
  if (c.req.query('subr_min')) proxyParams.subr_min = c.req.query('subr_min')!;
  if (c.req.query('subr_max')) proxyParams.subr_max = c.req.query('subr_max')!;
  if (c.req.query('subr_unknown')) proxyParams.subr_unknown = c.req.query('subr_unknown')!;
  
  // Visibility
  if (c.req.query('min_alt')) proxyParams.min_alt = c.req.query('min_alt')!;
  if (c.req.query('min_alt_minutes')) proxyParams.min_alt_minutes = c.req.query('min_alt_minutes')!;
  if (c.req.query('moon_dist_min')) proxyParams.moon_dist_min = c.req.query('moon_dist_min')!;
  if (c.req.query('moon_dist_max')) proxyParams.moon_dist_max = c.req.query('moon_dist_max')!;
  
  // Sky position
  if (c.req.query('ra_min')) proxyParams.ra_min = c.req.query('ra_min')!;
  if (c.req.query('ra_max')) proxyParams.ra_max = c.req.query('ra_max')!;
  if (c.req.query('dec_min')) proxyParams.dec_min = c.req.query('dec_min')!;
  if (c.req.query('dec_max')) proxyParams.dec_max = c.req.query('dec_max')!;
  
  // Sort & pagination
  if (c.req.query('order')) proxyParams.order = c.req.query('order')!;
  if (c.req.query('order_asc')) proxyParams.order_asc = c.req.query('order_asc')!;
  proxyParams.results_per_page = c.req.query('results_per_page') || '20';
  if (c.req.query('page')) proxyParams.page = c.req.query('page')!;
  
  try {
    const result = callTelescopiusProxy('search', proxyParams);
    
    if (result.error) {
      // Fallback to local DSO database
      const q = c.req.query('name') || c.req.query('q') || '';
      const stmt = await db.prepare('SELECT * FROM dso_cache WHERE id LIKE ? OR data LIKE ? LIMIT 20');
      const rows = await stmt.all(`%${q}%`, `%${q}%`) as any[];
      const targets = rows.map(row => {
        const data = JSON.parse(row.data || '{}');
        return {
          id: data.id || row.id,
          name: data.id || row.id,
          type: data.objectType || 'Unknown',
          constellation: data.constellation || '',
          ra: data.rightAscension || '',
          dec: data.declination || '',
          magnitude: data.magnitude || null,
          size: { width: 10, height: 10, unit: 'arcmin' },
          commonNames: data.commonName ? [data.commonName] : [],
        };
      });
      return c.json({ targets, total: targets.length, page: 1, perPage: 20, source: 'local_fallback' });
    }
    
    // Filter out solar system objects and transform Telescopius format
    const allResults = result.page_results || [];
    const targets = allResults
      .filter((item: any) => {
        const obj = item.object || item || {};
        const family = obj.family || '';
        const types = obj.types || [];
        // Exclude solar system objects
        return family !== 'solar_system_object' && !types.includes('solar_system_object');
      })
      .map((item: any) => {
        const obj = item.object || item || {};
        const transit = item.transit_observation || {};
        const typeList = obj.types || [];
        // Extract main deep-sky type code (exclude generic tags)
        const genericTypes = ['deep_sky_object', 'solar_system_object', 'str', 'uvsrc', 'irsrc', 'nirsrc', 'mirsrc', 'varst', 'xrsrc', 'radsrc', 'gamsrc', 'best', 'dms', 'stass', 'ism'];
        const mainType = typeList.find((t: string) => !genericTypes.includes(t)) || 'deep_sky_object';
        
        const visibility = item.tonight_visibility || {};
        const tonightTimes = item.tonight_times || {};
        
        return {
          id: obj.main_id || obj.id || '',
          name: obj.main_name || obj.name || obj.main_id || '',
          type: mainType,
          constellation: transit.con || obj.constellation || '',
          ra: obj.ra || '',
          dec: obj.dec || '',
          ra_deg: transit.ra || obj.ra_deg || null,
          dec_deg: transit.dec || obj.dec_deg || null,
          magnitude: transit.mag ?? obj.visual_mag ?? obj.magnitude ?? null,
          surface_brightness: obj.surface_brightness ?? obj.subr ?? null,
          size_arcmin: obj.size_arcmin ?? (obj.size ? parseFloat(obj.size) : null),
          altitude_max: transit.alt ?? obj.altitude_max ?? obj.alt_max ?? null,
          moon_separation: obj.moon_separation ?? null,
          image_url: obj.main_image_url || obj.thumbnail_url || obj.image_url || null,
          commonNames: (obj.names || []).slice(0, 5),
          // Imaging windows & visibility
          rise: tonightTimes.rise || null,
          transit_time: tonightTimes.transit || null,
          set_time: tonightTimes.set || null,
          imaging_windows: (visibility.windows || []).map((w: any) => ({
            start: w.start,
            end: w.end,
            hours: w.imaging_time_hours || 0,
            moon_illumination: w.moon_illumination_percent ?? null,
            moon_distance: w.moon_distance_deg ?? null,
          })),
          total_imaging_hours: (visibility.windows || []).reduce((sum: number, w: any) => sum + (w.imaging_time_hours || 0), 0),
        };
      });
    
    const page = parseInt(c.req.query('page') || '1');
    const perPage = parseInt(proxyParams.results_per_page);
    
    return c.json({ targets, total: result.matched || targets.length, page, perPage, source: 'telescopius' });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/api/telescopius/visibility', async (c) => {
  const { target, date, lat, lon } = c.req.query();
  // Simplified visibility calculation
  return c.json({
    targetId: target,
    date,
    riseTime: null,
    setTime: null,
    transitTime: '00:00',
    maxAltitude: 45,
    visibleHours: 6,
    moonSeparation: 90,
    recommendation: 'good',
  });
});

app.get('/api/telescopius/altitude', async (c) => {
  const { ra, dec, date, lat, lon } = c.req.query();
  // Generate hourly altitude data
  const data = [];
  for (let hour = 0; hour < 24; hour++) {
    const time = `${String(hour).padStart(2, '0')}:00`;
    const altitude = 30 + Math.sin((hour - 6) * Math.PI / 12) * 60;
    const azimuth = (hour * 15) % 360;
    data.push({ time, altitude: Math.max(0, altitude), azimuth });
  }
  return c.json(data);
});

app.get('/api/telescopius/mosaic', async (c) => {
  const { target, fov_w, fov_h, overlap } = c.req.query();
  return c.json({
    targetRa: 0,
    targetDec: 0,
    targetWidth: 100,
    targetHeight: 100,
    fovWidth: parseFloat(fov_w || '60'),
    fovHeight: parseFloat(fov_h || '40'),
    overlap: parseInt(overlap || '20'),
    panes: [{ id: 1, ra: 0, dec: 0, rotation: 0 }],
    csvData: 'Pane,RA,Dec,Rotation\n1,0,0,0',
  });
});

// New endpoints using real Telescopius API
app.get('/api/telescopius/quote', async (c) => {
  try {
    const result = callTelescopiusProxy('quote');
    if (result.error) console.warn('[quote] API error, serving stale cache:', result.error);
    return c.json(result);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/api/telescopius/highlights', async (c) => {
  const lat = c.req.query('lat') || '43.7889';
  const lon = c.req.query('lon') || '4.7533';
  const timezone = c.req.query('timezone') || 'Europe/Paris';
  const min_alt = c.req.query('min_alt') || '20';
  const types = c.req.query('types') || c.req.query('type') || '';
  const mag_max = c.req.query('mag_max') || '';
  const results_per_page = c.req.query('results_per_page') || '30';
  
  console.log(`[highlights] lat=${lat} lon=${lon} tz=${timezone} min_alt=${min_alt}`);
  try {
    const proxyParams: Record<string, string> = { lat, lon, timezone, min_alt };
    if (types) proxyParams.types = types;
    if (mag_max) proxyParams.mag_max = mag_max;
    if (results_per_page) proxyParams.results_per_page = results_per_page;
    const result = callTelescopiusProxy('highlights', proxyParams);
    if (result.error && !result.page_results) return c.json({ error: result.error }, 500);
    if (result.error) console.warn('[highlights] API error, serving stale cache:', result.error);
    
    // Flatten highlights format to match search format expected by front-end
    const pageResults = result.page_results || [];
    const targets = pageResults.map((pr: any) => {
      const obj = pr.object || {};
      const tonightVis = pr.tonight_visibility || {};
      const tonightTimes = pr.tonight_times || {};
      const transit = pr.transit_observation || {};
      const windows = tonightVis.windows || [];
      
      // Calculate total imaging hours from windows
      const totalImagingHours = windows.reduce((sum: number, w: any) => sum + (w.imaging_time_hours || w.hours || 0), 0);
      
      return {
        id: obj.main_id || '',
        main_id: obj.main_id || '',
        name: obj.main_name || obj.main_id || '',
        main_name: obj.main_name || '',
        type: (obj.types || [])[0] || obj.family || 'Unknown',
        constellation: obj.con || '',
        con_name: obj.con_name || '',
        ra: obj.ra || '',
        dec: obj.dec || '',
        magnitude: obj.visual_mag ?? obj.magnitude ?? null,
        surface_brightness: obj.surface_brightness ?? obj.subr ?? null,
        size_arcmin: obj.size_arcmin ?? obj.size?.width ?? null,
        image_url: obj.main_image_url || obj.thumbnail_url || null,
        common_names: obj.names || [],
        // Tonight-specific data (flattened for front-end)
        altitude_max: tonightVis.max_altitude ?? null,
        max_altitude_hour: tonightVis.max_altitude_hour || null,
        moon_separation: transit.dist_au ?? null,
        total_imaging_hours: totalImagingHours,
        rise: tonightTimes.rise || null,
        transit_time: tonightTimes.transit || null,
        set_time: tonightTimes.set || null,
        imaging_windows: windows.map((w: any) => ({
          start: w.start || '',
          end: w.end || '',
          hours: w.imaging_time_hours || w.hours || 0,
          moon_illumination: w.moon_illumination_percent ?? w.moon_illumination ?? null,
          moon_distance: w.moon_distance_deg ?? w.moon_distance ?? null,
        })),
      };
    });
    
    return c.json({
      targets,
      total: result.matched || targets.length,
      page: 1,
      perPage: targets.length,
      source: 'telescopius',
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/api/telescopius/solar', async (c) => {
  const lat = c.req.query('lat') || '43.7889';
  const lon = c.req.query('lon') || '4.7533';
  const timezone = c.req.query('timezone') || 'Europe/Paris';
  
  try {
    const result = callTelescopiusProxy('solar', { lat, lon, timezone });
    if (result.error) console.warn('[solar] API error, serving stale:', result.error);
    return c.json(result);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/api/telescopius/pictures', async (c) => {
  const order = c.req.query('order') || 'is_featured';
  const results_per_page = c.req.query('results_per_page') || '10';
  
  try {
    const result = callTelescopiusProxy('pictures', { order, results_per_page });
    if (result.error) console.warn('[pictures] API error, serving stale:', result.error);
    return c.json(result);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/api/telescopius/lists', async (c) => {
  try {
    const result = callTelescopiusProxy('lists');
    if (result.error) console.warn('[lists] API error, serving stale:', result.error);
    return c.json(result);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// =====================


app.post('/api/logs/analyze', async (c) => {
  const { content, type } = await c.req.json();
  // Server-side analysis endpoint (client does most work)
  return c.json({ ok: true, type, entries: 0 });
});

// =====================
// POSTS (Astrophotography posts)
// =====================

async function parsePost(row: any) {
  return {
    id: row.id,
    title: row.title,
    imageUrl: row.image_url,
    objectName: row.object_name,
    captureDate: row.capture_date,
    equipment: row.equipment,
    description: row.description,
    tags: JSON.parse(row.tags || '[]'),
    astrobinUrl: row.astrobin_url,
    rawDataUrl: row.raw_data_url,
    totalIntegrationTime: row.total_integration_time,
    showOnWall: Boolean(row.show_on_wall),
    updatedAt: row.updated_at,
    acquisitionLogs: row.id ? (await db.prepare('SELECT * FROM acquisition_logs WHERE post_id = ? ORDER BY date ASC').all(row.id)).map((r: any) => ({
      id: r.id, date: r.date, filter: r.filter, exposureCount: r.exposure_count, exposureLength: r.exposure_length,
    })) : [],
  };
}

app.get('/api/posts', async (c) => {
  const { tag, wall } = c.req.query();
  let query = 'SELECT * FROM posts';
  const conditions: string[] = [];
  const params: any[] = [];
  if (tag) { conditions.push('tags LIKE ?'); params.push(`%"${tag}"%`); }
  if (wall === 'true') { conditions.push('show_on_wall = 1'); }
  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY capture_date DESC';
  return c.json(await Promise.all((await db.prepare(query).all(...params)).map(parsePost)));
});

app.get('/api/posts/:id', async (c) => {
  const row = await db.prepare('SELECT * FROM posts WHERE id = ?').get(c.req.param('id'));
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json(await parsePost(row));
});

app.post('/api/posts', auth, async (c) => {
  const body = await c.req.json();
  
  const id = body.id || crypto.randomUUID();
  const now = new Date().toISOString();
  await db.prepare(`INSERT INTO posts (id, title, image_url, object_name, capture_date, equipment, description, tags, astrobin_url, raw_data_url, total_integration_time, show_on_wall, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, body.title || '', body.imageUrl || '', body.objectName || '', body.captureDate || '',
    body.equipment || '', body.description || '', JSON.stringify(body.tags || []),
    body.astrobinUrl || '', body.rawDataUrl || '', body.totalIntegrationTime || 0,
    body.showOnWall ? 1 : 0, now
  );
  // Insert acquisition logs if provided
  if (body.acquisitionLogs?.length) {
    for (const log of body.acquisitionLogs) {
      const logId = log.id || crypto.randomUUID();
      await db.prepare(`INSERT INTO acquisition_logs (id, post_id, date, filter, exposure_count, exposure_length)
        VALUES (?, ?, ?, ?, ?, ?)`).run(
        logId, id, log.date || '', log.filter || '', log.exposureCount || 0, log.exposureLength || 0
      );
    }
  }
  return c.json(await parsePost(await db.prepare('SELECT * FROM posts WHERE id = ?').get(id)));
});

app.put('/api/posts/:id', auth, async (c) => {
  const id = c.req.param('id');
  const existing = await db.prepare('SELECT id FROM posts WHERE id = ?').get(id);
  if (!existing) return c.json({ error: 'Post not found' }, 404);
  const body = await c.req.json();
  const now = new Date().toISOString();
  await db.prepare(`UPDATE posts SET
    title = ?, image_url = ?, object_name = ?, capture_date = ?, equipment = ?,
    description = ?, tags = ?, astrobin_url = ?, raw_data_url = ?,
    total_integration_time = ?, show_on_wall = ?, updated_at = ?
    WHERE id = ?`).run(
    body.title ?? '', body.imageUrl ?? '', body.objectName ?? '', body.captureDate ?? '',
    body.equipment ?? '', body.description ?? '', JSON.stringify(body.tags || []),
    body.astrobinUrl ?? '', body.rawDataUrl ?? '',
    body.totalIntegrationTime ?? 0, body.showOnWall ? 1 : 0, now, id
  );
  // Update acquisition logs: delete old, insert new
  if (body.acquisitionLogs !== undefined) {
    await db.prepare('DELETE FROM acquisition_logs WHERE post_id = ?').run(id);
    if (body.acquisitionLogs?.length) {
      for (const log of body.acquisitionLogs) {
        const logId = log.id || crypto.randomUUID();
        await db.prepare(`INSERT INTO acquisition_logs (id, post_id, date, filter, exposure_count, exposure_length)
          VALUES (?, ?, ?, ?, ?, ?)`).run(
          logId, id, log.date || '', log.filter || '', log.exposureCount || 0, log.exposureLength || 0
        );
      }
    }
  }
  return c.json(await parsePost(await db.prepare('SELECT * FROM posts WHERE id = ?').get(id)));
});

app.delete('/api/posts/:id', auth, async (c) => {
  await db.prepare('DELETE FROM posts WHERE id = ?').run(c.req.param('id'));
  return c.json({ ok: true });
});

// =====================
// ACQUISITION LOGS
// =====================

app.get('/api/posts/:postId/acquisition-logs', async (c) => {
  const logs = await db.prepare('SELECT * FROM acquisition_logs WHERE post_id = ? ORDER BY date ASC').all(c.req.param('postId'));
  return c.json(logs.map((r: any) => ({
    id: r.id, date: r.date, filter: r.filter, exposureCount: r.exposure_count, exposureLength: r.exposure_length,
  })));
});

app.post('/api/posts/:postId/acquisition-logs', auth, async (c) => {
  const body = await c.req.json();
  const id = body.id || crypto.randomUUID();
  await db.prepare(`INSERT INTO acquisition_logs (id, post_id, date, filter, exposure_count, exposure_length)
    VALUES (?, ?, ?, ?, ?, ?)`).run(id, c.req.param('postId'), body.date || '', body.filter || '', body.exposureCount || 0, body.exposureLength || 0);
  return c.json({ id, postId: c.req.param('postId'), ...body });
});

app.delete('/api/acquisition-logs/:id', auth, async (c) => {
  await db.prepare('DELETE FROM acquisition_logs WHERE id = ?').run(c.req.param('id'));
  return c.json({ ok: true });
});

// =====================
// PROCESSING POSTS
// =====================

function parseProcessingPost(row: any, includeGallery: boolean = false) {
  const base = {
    id: row.id,
    title: row.title,
    description: row.description,
    tags: JSON.parse(row.tags || '[]'),
    captureDate: row.capture_date,
    postType: row.post_type,
    beforeImageUrl: row.before_image_url,
    afterImageUrl: row.after_image_url,
    featuredImageUrl: row.featured_image_url,
    attachedAudioUrl: row.attached_audio_url,
    attachedDocumentUrl: row.attached_document_url,
    showBeforeOnWall: Boolean(row.show_before_on_wall),
    showAfterOnWall: Boolean(row.show_after_on_wall),
    showFeaturedOnWall: Boolean(row.show_featured_on_wall),
    updatedAt: row.updated_at,
  };
  if (includeGallery) {
    // Note: galleryImages should be fetched by the caller and attached separately
    return { ...base, galleryImages: (row as any)._galleryImages || [] };
  }
  return base;
}

app.get('/api/processing-posts', async (c) => {
  const { type, wall } = c.req.query();
  let query = 'SELECT * FROM processing_posts';
  const conditions: string[] = [];
  const params: any[] = [];
  if (type) { conditions.push('post_type = ?'); params.push(type); }
  if (wall === 'true') { conditions.push('(show_before_on_wall = 1 OR show_after_on_wall = 1 OR show_featured_on_wall = 1)'); }
  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY capture_date DESC';

  const posts = await db.prepare(query).all(...params);
  const postIds = (posts as any[]).map((p: any) => p.id);

  // Fetch all gallery images in one query
  let imagesByPostId: Record<string, any[]> = {};
  if (postIds.length > 0) {
    const placeholders = postIds.map(() => '?').join(',');
    const images = await db.prepare(`SELECT * FROM processing_gallery_images WHERE post_id IN (${placeholders}) ORDER BY id`).all(...postIds) as any[];
    for (const img of images) {
      if (!imagesByPostId[img.post_id]) imagesByPostId[img.post_id] = [];
      imagesByPostId[img.post_id].push({
        id: img.id,
        imageUrl: img.image_url,
        caption: img.caption,
        showOnWall: Boolean(img.show_on_wall),
      });
    }
  }

  return c.json((posts as any[]).map((row: any) => ({
    ...parseProcessingPost(row),
    galleryImages: imagesByPostId[row.id] || [],
  })));
});

app.get('/api/processing-posts/:id', async (c) => {
  const row = await db.prepare('SELECT * FROM processing_posts WHERE id = ?').get(c.req.param('id'));
  if (!row) return c.json({ error: 'Not found' }, 404);
  const galleryRows = await db.prepare('SELECT * FROM processing_gallery_images WHERE post_id = ? ORDER BY id').all(c.req.param('id')) as any[];
  (row as any)._galleryImages = galleryRows.map((r: any) => ({ id: r.id, imageUrl: r.image_url, caption: r.caption, showOnWall: Boolean(r.show_on_wall) }));
  return c.json(parseProcessingPost(row, true));
});

app.post('/api/processing-posts', auth, async (c) => {
  const body = await c.req.json();
  console.log('POST /api/processing-posts — body keys:', Object.keys(body));
  console.log('POST processing-posts — galleryImages count:', body.galleryImages?.length);
  console.log('POST /api/processing-posts — galleryImages:', JSON.stringify(body.galleryImages));
  const id = body.id || crypto.randomUUID();
  const now = new Date().toISOString();
  await db.prepare(`INSERT INTO processing_posts (id, title, description, tags, capture_date, post_type, before_image_url, after_image_url, featured_image_url, attached_audio_url, attached_document_url, show_before_on_wall, show_after_on_wall, show_featured_on_wall, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, body.title || '', body.description || '', JSON.stringify(body.tags || []),
    body.captureDate || '', body.postType || 'gallery',
    body.beforeImageUrl || '', body.afterImageUrl || '', body.featuredImageUrl || '',
    body.attachedAudioUrl || '', body.attachedDocumentUrl || '',
    body.showBeforeOnWall ? 1 : 0, body.showAfterOnWall ? 1 : 0, body.showFeaturedOnWall ? 1 : 0, now
  );
  // Sync gallery images if provided
  if (body.galleryImages && Array.isArray(body.galleryImages)) {
    console.log('POST — syncing', body.galleryImages.length, 'gallery images');
    await db.prepare('DELETE FROM processing_gallery_images WHERE post_id = ?').run(id);
    for (const img of body.galleryImages) {
      if (img.imageUrl) {
        console.log('POST — inserting gallery image:', img.imageUrl);
        await db.prepare(`INSERT INTO processing_gallery_images (id, post_id, image_url, caption, show_on_wall)
          VALUES (?, ?, ?, ?, ?)`).run(
          crypto.randomUUID(), id, img.imageUrl, img.caption || '', img.showOnWall ? 1 : 0
        );
      }
    }
  }
  const postRow = await db.prepare('SELECT * FROM processing_posts WHERE id = ?').get(id);
  const galleryRows = await db.prepare('SELECT * FROM processing_gallery_images WHERE post_id = ? ORDER BY id').all(id) as any[];
  postRow._galleryImages = galleryRows.map((r: any) => ({ id: r.id, imageUrl: r.image_url, caption: r.caption, showOnWall: Boolean(r.show_on_wall) }));
  return c.json(parseProcessingPost(postRow, true));
});

app.put('/api/processing-posts/:id', auth, async (c) => {
  const id = c.req.param('id');
  const existing = await db.prepare('SELECT id FROM processing_posts WHERE id = ?').get(id);
  if (!existing) return c.json({ error: 'Processing post not found' }, 404);
  const body = await c.req.json();
  console.log('PUT /api/processing-posts/' + id + ' — body keys:', Object.keys(body));
  console.log('PUT processing-posts/' + id + ' — galleryImages count:', body.galleryImages?.length);
  console.log('PUT /api/processing-posts/' + id + ' — galleryImages:', JSON.stringify(body.galleryImages));
  const now = new Date().toISOString();
  await db.prepare(`UPDATE processing_posts SET
    title = ?, description = ?, tags = ?, capture_date = ?, post_type = ?,
    before_image_url = ?, after_image_url = ?, featured_image_url = ?,
    attached_audio_url = ?, attached_document_url = ?,
    show_before_on_wall = ?, show_after_on_wall = ?, show_featured_on_wall = ?,
    updated_at = ? WHERE id = ?`).run(
    body.title ?? '', body.description ?? '', JSON.stringify(body.tags || []),
    body.captureDate ?? '', body.postType ?? 'gallery',
    body.beforeImageUrl ?? '', body.afterImageUrl ?? '', body.featuredImageUrl ?? '',
    body.attachedAudioUrl ?? '', body.attachedDocumentUrl ?? '',
    body.showBeforeOnWall ? 1 : 0, body.showAfterOnWall ? 1 : 0, body.showFeaturedOnWall ? 1 : 0,
    now, id
  );
  // Sync gallery images if provided
  if (body.galleryImages && Array.isArray(body.galleryImages)) {
    await db.prepare('DELETE FROM processing_gallery_images WHERE post_id = ?').run(id);
    for (const img of body.galleryImages) {
      if (img.imageUrl) {
        await db.prepare(`INSERT INTO processing_gallery_images (id, post_id, image_url, caption, show_on_wall)
          VALUES (?, ?, ?, ?, ?)`).run(
          crypto.randomUUID(), id, img.imageUrl, img.caption || '', img.showOnWall ? 1 : 0
        );
      }
    }
  }
  const postRow = await db.prepare('SELECT * FROM processing_posts WHERE id = ?').get(id);
  const galleryRows = await db.prepare('SELECT * FROM processing_gallery_images WHERE post_id = ? ORDER BY id').all(id) as any[];
  postRow._galleryImages = galleryRows.map((r: any) => ({ id: r.id, imageUrl: r.image_url, caption: r.caption, showOnWall: Boolean(r.show_on_wall) }));
  return c.json(parseProcessingPost(postRow, true));
});

app.delete('/api/processing-posts/:id', auth, async (c) => {
  await db.prepare('DELETE FROM processing_posts WHERE id = ?').run(c.req.param('id'));
  return c.json({ ok: true });
});

// Gallery images for a processing post
app.get('/api/processing-posts/:postId/gallery', async (c) => {
  const images = await db.prepare('SELECT * FROM processing_gallery_images WHERE post_id = ? ORDER BY id').all(c.req.param('postId'));
  return c.json(images.map((r: any) => ({
    id: r.id, postId: r.post_id, imageUrl: r.image_url, caption: r.caption, showOnWall: Boolean(r.show_on_wall),
  })));
});

app.post('/api/processing-posts/:postId/gallery', auth, async (c) => {
  const body = await c.req.json();
  const id = body.id || crypto.randomUUID();
  await db.prepare(`INSERT INTO processing_gallery_images (id, post_id, image_url, caption, show_on_wall)
    VALUES (?, ?, ?, ?, ?)`).run(id, c.req.param('postId'), body.imageUrl || '', body.caption || '', body.showOnWall ? 1 : 0);
  return c.json({ id, postId: c.req.param('postId'), ...body });
});

app.delete('/api/processing-gallery/:id', auth, async (c) => {
  await db.prepare('DELETE FROM processing_gallery_images WHERE id = ?').run(c.req.param('id'));
  return c.json({ ok: true });
});

// =====================
// EQUIPMENT
// =====================

function parseEquipment(row: any) {
  return {
    id: row.id, name: row.name, category: row.category, imageUrl: row.image_url,
    specs: row.specs, description: row.description, rating: row.rating,
    isPersonal: Boolean(row.is_personal),
    focalLength: row.focal_length, aperture: row.aperture, fRatio: row.f_ratio,
    telescopeType: row.telescope_type,
    sensorWidth: row.sensor_width, sensorHeight: row.sensor_height,
    pixelSize: row.pixel_size, resolution: row.resolution, cameraType: row.camera_type,
    payloadCapacity: row.payload_capacity, mountType: row.mount_type,
    filterType: row.filter_type, bandwidth: row.bandwidth,
    updatedAt: row.updated_at,
  };
}

app.get('/api/equipment', async (c) => {
  const { category, personal } = c.req.query();
  let query = 'SELECT * FROM equipment';
  const conditions: string[] = [];
  const params: any[] = [];
  if (category) { conditions.push('category = ?'); params.push(category); }
  if (personal === 'true') { conditions.push('is_personal = 1'); }
  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  return c.json((await db.prepare(query).all(...params)).map(parseEquipment));
});

app.get('/api/equipment/:id', async (c) => {
  const row = await db.prepare('SELECT * FROM equipment WHERE id = ?').get(c.req.param('id'));
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json(parseEquipment(row));
});

app.post('/api/equipment', auth, async (c) => {
  const body = await c.req.json();
  const id = body.id || crypto.randomUUID();
  const now = new Date().toISOString();
  await db.prepare(`INSERT INTO equipment (id, name, category, image_url, specs, description, rating, is_personal, focal_length, aperture, f_ratio, telescope_type, sensor_width, sensor_height, pixel_size, resolution, camera_type, payload_capacity, mount_type, filter_type, bandwidth, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, body.name || '', body.category || 'Other', body.imageUrl || '', body.specs || '',
    body.description || '', body.rating || 0, body.isPersonal ? 1 : 0,
    body.focalLength ?? null, body.aperture ?? null, body.fRatio ?? null, body.telescopeType ?? null,
    body.sensorWidth ?? null, body.sensorHeight ?? null, body.pixelSize ?? null, body.resolution ?? null,
    body.cameraType ?? null, body.payloadCapacity ?? null, body.mountType ?? null,
    body.filterType ?? null, body.bandwidth ?? null, now
  );
  return c.json(parseEquipment(await db.prepare('SELECT * FROM equipment WHERE id = ?').get(id)));
});

app.put('/api/equipment/:id', auth, async (c) => {
  const body = await c.req.json();
  const now = new Date().toISOString();
  const sets: string[] = [];
  const params: any[] = [];
  const fields = {
    name: body.name, category: body.category, image_url: body.imageUrl, specs: body.specs,
    description: body.description, rating: body.rating, is_personal: body.isPersonal ? 1 : 0,
    focal_length: body.focalLength, aperture: body.aperture, f_ratio: body.fRatio, telescope_type: body.telescopeType,
    sensor_width: body.sensorWidth, sensor_height: body.sensorHeight, pixel_size: body.pixelSize,
    resolution: body.resolution, camera_type: body.cameraType, payload_capacity: body.payloadCapacity,
    mount_type: body.mountType, filter_type: body.filterType, bandwidth: body.bandwidth,
  };
  for (const [col, val] of Object.entries(fields)) {
    if (val !== undefined) { sets.push(`${col} = ?`); params.push(val); }
  }
  if (sets.length) {
    sets.push('updated_at = ?'); params.push(now);
    params.push(c.req.param('id'));
    await db.prepare(`UPDATE equipment SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  }
  return c.json(parseEquipment(await db.prepare('SELECT * FROM equipment WHERE id = ?').get(c.req.param('id'))));
});

app.delete('/api/equipment/:id', auth, async (c) => {
  await db.prepare('DELETE FROM equipment WHERE id = ?').run(c.req.param('id'));
  return c.json({ ok: true });
});

// =====================
// DSO CACHE
// =====================

app.get('/api/dso/:id', async (c) => {
  const row = await db.prepare('SELECT * FROM dso_cache WHERE id = ?').get(c.req.param('id'));
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json({ id: (row as any).id, ...JSON.parse((row as any).data) });
});

// NEW: Search DSO by name using local Ollama (Hal)
app.get('/api/dso/search/:name', async (c) => {
  const objectName = c.req.param('name');
  const docId = objectName.toUpperCase().replace(/\s+/g, '');
  
  // 1. Check cache first (but skip empty/incomplete entries)
  const cached = await db.prepare('SELECT * FROM dso_cache WHERE id = ?').get(docId);
  if (cached) {
    const cachedData = JSON.parse((cached as any).data);
    // Only serve from cache if we have real data (objectType not null)
    if (cachedData.objectType !== null && cachedData.objectType !== undefined) {
      console.log(`[DSO] Serving "${objectName}" from cache.`);
      return c.json({ id: (cached as any).id, ...cachedData });
    }
    // Cache entry is incomplete, delete it and continue to knownObjects/Ollama
    console.log(`[DSO] Cache for "${objectName}" is incomplete, refreshing...`);
    await db.prepare('DELETE FROM dso_cache WHERE id = ?').run(docId);
  }
  
  console.log(`[DSO] Cache miss for "${objectName}". Using Hal knowledge...`);
  
  // 2. Known objects database (Hal's astronomical knowledge)
  const knownObjects: Record<string, any> = {
    'WIZARDNEBULA': {
      _aliases: ['NGC7380', 'NGC 7380', 'SH2-142', 'SH2 142'],
      id: 'NGC7380',
      commonName: 'Wizard Nebula',
      objectType: 'Emission Nebula / Open Cluster',
      constellation: 'Cepheus',
      rightAscension: '22 47 21',
      declination: '+58 05 54',
      distance: 8000,
      distanceUnit: 'ly',
      magnitude: 7.2,
      catalogDenominations: ['NGC 7380', 'SH2-142'],
      composition: ['Ionized Hydrogen', 'Oxygen'],
      age: null,
      ageUnit: 'years'
    },
    'NGC7380': {
      _ref: 'WIZARDNEBULA'
    },
    'NGC7000': {
      _aliases: ['NORTHAMERICANEBULA', 'NORTH AMERICA NEBULA'],
      id: 'NGC7000',
      commonName: 'North America Nebula',
      objectType: 'Emission Nebula',
      constellation: 'Cygnus',
      rightAscension: '20 59 18',
      declination: '+44 31 00',
      distance: 2590,
      distanceUnit: 'ly',
      magnitude: 4.0,
      catalogDenominations: ['NGC 7000', 'Caldwell 20'],
      composition: ['Ionized Hydrogen'],
      age: null,
      ageUnit: 'years'
    },
    'ORIONNEBULA': {
      _aliases: ['M42', 'NGC1976', 'NGC 1976'],
      id: 'M42',
      commonName: 'Orion Nebula',
      objectType: 'Emission Nebula / Reflection Nebula',
      constellation: 'Orion',
      rightAscension: '05 35 17.3',
      declination: '-05 23 28',
      distance: 1344,
      distanceUnit: 'ly',
      magnitude: 4.0,
      catalogDenominations: ['M42', 'NGC 1976'],
      composition: ['Hydrogen', 'Helium', 'Dust'],
      age: 3,
      ageUnit: 'million years'
    },
    'M42': { _ref: 'ORIONNEBULA' },
    'ANDROMEDA': {
      _aliases: ['M31', 'NGC224', 'NGC 224'],
      id: 'M31',
      commonName: 'Andromeda Galaxy',
      objectType: 'Spiral Galaxy',
      constellation: 'Andromeda',
      rightAscension: '00 42 44.3',
      declination: '+41 16 09',
      distance: 2537000,
      distanceUnit: 'ly',
      magnitude: 3.4,
      catalogDenominations: ['M31', 'NGC 224'],
      composition: ['Stars', 'Dust', 'Dark Matter'],
      age: 10000,
      ageUnit: 'million years'
    },
    'M31': { _ref: 'ANDROMEDA' },
    'M13': {
      _aliases: ['NGC6205', 'NGC 6205', 'HERCULES'],
      id: 'M13',
      commonName: 'Great Globular Cluster',
      objectType: 'Globular Cluster',
      constellation: 'Hercules',
      rightAscension: '16 41 41.24',
      declination: '+36 27 35.5',
      distance: 22200,
      distanceUnit: 'ly',
      magnitude: 5.8,
      catalogDenominations: ['M13', 'NGC 6205'],
      composition: ['Stars'],
      age: 12,
      ageUnit: 'billion years'
    },
    'NGC6205': { _ref: 'M13' },
    'HERCULES': { _ref: 'M13' },
    'ROSETTE': {
      id: 'NGC2237',
      commonName: 'Rosette Nebula',
      objectType: 'Emission Nebula',
      constellation: 'Monoceros',
      rightAscension: '06 33 45',
      declination: '+04 59 54',
      distance: 5200,
      distanceUnit: 'ly',
      magnitude: 9.0,
      catalogDenominations: ['NGC 2237', 'NGC 2238', 'NGC 2239', 'NGC 2246'],
      composition: ['Ionized Hydrogen'],
      age: null,
      ageUnit: 'years'
    },
    'PLEIADES': {
      id: 'M45',
      commonName: 'Pleiades',
      objectType: 'Open Cluster',
      constellation: 'Taurus',
      rightAscension: '03 47 24',
      declination: '+24 07 00',
      distance: 444,
      distanceUnit: 'ly',
      magnitude: 1.6,
      catalogDenominations: ['M45'],
      composition: ['Young Stars', 'Reflection Nebula'],
      age: 100,
      ageUnit: 'million years'
    },
    'RINGNEBULA': {
      id: 'M57',
      commonName: 'Ring Nebula',
      objectType: 'Planetary Nebula',
      constellation: 'Lyra',
      rightAscension: '18 53 35.1',
      declination: '+33 01 45',
      distance: 2567,
      distanceUnit: 'ly',
      magnitude: 8.8,
      catalogDenominations: ['M57', 'NGC 6720'],
      composition: ['Ionized Helium', 'Nitrogen'],
      age: null,
      ageUnit: 'years'
    },
    'M27': { _ref: 'DUMBBELL' },
    'M57': { _ref: 'RINGNEBULA' },
    'NGC6720': { _ref: 'RINGNEBULA' },
    'NGC6853': { _ref: 'DUMBBELL' },
    'NGC7293': { _ref: 'HELIX' },
    'ELEPHANTTRUNK': {
      _aliases: ['IC1396', 'IC 1396', 'IC1396A', 'IC 1396A', 'ELEPHANTTRUNKNEBULA'],
      id: 'IC1396',
      commonName: 'Elephant Trunk Nebula',
      objectType: 'Emission Nebula',
      constellation: 'Cepheus',
      rightAscension: '21 39 00',
      declination: '+57 30 00',
      distance: 2400,
      distanceUnit: 'ly',
      magnitude: 3.5,
      catalogDenominations: ['IC 1396'],
      composition: ['Ionized Hydrogen', 'Dust'],
      age: null,
      ageUnit: 'years'
    },
    'IC1396': { _ref: 'ELEPHANTTRUNK' },
    'CRESCENT': {
      _aliases: ['NGC6888', 'NGC 6888', 'CALDWELL27'],
      id: 'NGC6888',
      commonName: 'Crescent Nebula',
      objectType: 'Emission Nebula',
      constellation: 'Cygnus',
      rightAscension: '20 12 07',
      declination: '+38 21 18',
      distance: 5000,
      distanceUnit: 'ly',
      magnitude: 7.4,
      catalogDenominations: ['NGC 6888', 'Caldwell 27'],
      composition: ['Ionized Oxygen', 'Nitrogen'],
      age: null,
      ageUnit: 'years'
    },
    'NGC6888': { _ref: 'CRESCENT' },
    'DUMBBELL': {
      id: 'M27',
      commonName: 'Dumbbell Nebula',
      objectType: 'Planetary Nebula',
      constellation: 'Vulpecula',
      rightAscension: '19 59 36.3',
      declination: '+22 43 16',
      distance: 1360,
      distanceUnit: 'ly',
      magnitude: 7.5,
      catalogDenominations: ['M27', 'NGC 6853'],
      composition: ['Ionized Oxygen'],
      age: null,
      ageUnit: 'years'
    },
    'HELIX': {
      id: 'NGC7293',
      commonName: 'Helix Nebula',
      objectType: 'Planetary Nebula',
      constellation: 'Aquarius',
      rightAscension: '22 29 38.5',
      declination: '-20 50 13',
      distance: 655,
      distanceUnit: 'ly',
      magnitude: 7.3,
      catalogDenominations: ['NGC 7293'],
      composition: ['Ionized Helium', 'Oxygen'],
      age: null,
      ageUnit: 'years'
    },
    'EAGLE': {
      id: 'M16',
      commonName: 'Eagle Nebula',
      objectType: 'Emission Nebula',
      constellation: 'Serpens',
      rightAscension: '18 18 58.30',
      declination: '-13 49 33.2',
      distance: 7000,
      distanceUnit: 'ly',
      magnitude: 6.0,
      catalogDenominations: ['M16', 'NGC 6611'],
      composition: ['Hydrogen', 'Dust'],
      age: 5.5,
      ageUnit: 'million years'
    },
    'M16': { _ref: 'EAGLE' },
    'NGC6611': { _ref: 'EAGLE' },
    'NGC 6611': { _ref: 'EAGLE' },
    'LAGOON': {
      id: 'M8',
      commonName: 'Lagoon Nebula',
      objectType: 'Emission Nebula',
      constellation: 'Sagittarius',
      rightAscension: '18 03 37',
      declination: '-24 23 12',
      distance: 4100,
      distanceUnit: 'ly',
      magnitude: 6.0,
      catalogDenominations: ['M8', 'NGC 6523'],
      composition: ['Ionized Hydrogen'],
      age: null,
      ageUnit: 'years'
    },
    'IRISNEBULA': {
      _aliases: ['NGC7023', 'NGC 7023'],
      id: 'NGC7023',
      commonName: 'Iris Nebula',
      objectType: 'Reflection Nebula',
      constellation: 'Cepheus',
      rightAscension: '21 01 35',
      declination: '+68 10 15',
      distance: 1300,
      distanceUnit: 'ly',
      magnitude: 7.0,
      catalogDenominations: ['NGC 7023', 'Caldwell 4'],
      composition: ['Dust', 'Gas'],
      age: null,
      ageUnit: 'years'
    },
    'NGC7023': { _ref: 'IRISNEBULA' },
    'COCOONNEBULA': {
      _aliases: ['IC5146', 'IC 5146'],
      id: 'IC5146',
      commonName: 'Cocoon Nebula',
      objectType: 'Emission Nebula / Open Cluster',
      constellation: 'Cygnus',
      rightAscension: '21 53 24',
      declination: '+47 16 00',
      distance: 4000,
      distanceUnit: 'ly',
      magnitude: 7.2,
      catalogDenominations: ['IC 5146', 'Caldwell 19'],
      composition: ['Ionized Hydrogen'],
      age: null,
      ageUnit: 'years'
    },
    'IC5146': { _ref: 'COCOONNEBULA' },
    'M92': {
      id: 'M92',
      commonName: 'Messier 92',
      objectType: 'Globular Cluster',
      constellation: 'Hercules',
      rightAscension: '17 17 07',
      declination: '+43 08 10',
      distance: 26700,
      distanceUnit: 'ly',
      magnitude: 6.4,
      catalogDenominations: ['M92', 'NGC 6341'],
      composition: ['Stars'],
      age: null,
      ageUnit: 'years'
    },
    'NGC6341': { _ref: 'M92' },
    'SH2-132': {
      id: 'SH2-132',
      commonName: 'Lion Nebula',
      objectType: 'Emission Nebula',
      constellation: 'Cepheus',
      rightAscension: '22 17 30',
      declination: '+55 06 00',
      distance: 10000,
      distanceUnit: 'ly',
      magnitude: null,
      catalogDenominations: ['SH2-132', 'Sh 2-132'],
      composition: ['Ionized Hydrogen'],
      age: null,
      ageUnit: 'years'
    },
    'SH2-101': {
      id: 'SH2-101',
      commonName: 'Tulip Nebula',
      objectType: 'Emission Nebula',
      constellation: 'Cygnus',
      rightAscension: '19 59 30',
      declination: '+35 15 00',
      distance: 6000,
      distanceUnit: 'ly',
      magnitude: null,
      catalogDenominations: ['SH2-101', 'Sh 2-101'],
      composition: ['Ionized Hydrogen'],
      age: null,
      ageUnit: 'years'
    },
    'M81': {
      _aliases: ['BODESGALAXY', 'BODE', 'NGC3031', 'NGC 3031'],
      id: 'M81',
      commonName: "Bode's Galaxy",
      objectType: 'Spiral Galaxy',
      constellation: 'Ursa Major',
      rightAscension: '09 55 33.2',
      declination: '+69 03 55',
      distance: 11800000,
      distanceUnit: 'ly',
      magnitude: 6.9,
      catalogDenominations: ['M81', 'NGC 3031', 'Bode\'s Galaxy'],
      composition: ['Stars', 'Dust', 'Dark Matter'],
      age: null,
      ageUnit: 'years'
    },
    'NGC3031': { _ref: 'M81' },
    'BODESGALAXY': { _ref: 'M81' },
    'BODE': { _ref: 'M81' },
    'WHIRLPOOL': {
      _aliases: ['M51', 'NGC5194', 'NGC 5194', 'WHIRLPOOLGALAXY', 'M51A'],
      id: 'M51',
      commonName: 'Whirlpool Galaxy',
      objectType: 'Spiral Galaxy',
      constellation: 'Canes Venatici',
      rightAscension: '13 29 52.7',
      declination: '+47 11 43',
      distance: 23000000,
      distanceUnit: 'ly',
      magnitude: 8.4,
      catalogDenominations: ['M51', 'NGC 5194', 'NGC 5195', 'Arp 85'],
      composition: ['Stars', 'Dust', 'Dark Matter', 'HII Regions'],
      age: null,
      ageUnit: 'years'
    },
    'M51': { _ref: 'WHIRLPOOL' },
    'NGC5194': { _ref: 'WHIRLPOOL' },
    'NGC5195': { _ref: 'WHIRLPOOL' },
  };
  
  const upperName = objectName.toUpperCase().replace(/\s+/g, '');
  let dsoData = knownObjects[upperName];
  
  // Resolve references
  if (dsoData?._ref) {
    dsoData = knownObjects[dsoData._ref];
  }
  
  // Try aliases matching
  if (!dsoData) {
    for (const [key, data] of Object.entries(knownObjects)) {
      if (data._ref) continue; // skip refs
      const aliases = data._aliases || [];
      const cleanAliases = aliases.map((a: string) => a.toUpperCase().replace(/\s+/g, ''));
      if (upperName === key || cleanAliases.includes(upperName)) {
        dsoData = data;
        break;
      }
    }
  }
  
  // Try partial name match
  if (!dsoData) {
    for (const [key, data] of Object.entries(knownObjects)) {
      if (data._ref) continue;
      if (upperName.includes(key) || key.includes(upperName)) {
        dsoData = data;
        break;
      }
    }
  }
  
  if (dsoData) {
    console.log(`[DSO] Found "${objectName}" in Hal knowledge base.`);
    
    // Clean internal fields before returning
    const { _aliases, _ref, ...cleanData } = dsoData;
    
    // Save to cache
    const now = new Date().toISOString();
    await db.prepare(`INSERT INTO dso_cache (id, data, updated_at) VALUES (?, ?, ?)`).run(
      docId, JSON.stringify(cleanData), now
    );
    return c.json(cleanData);
  }
  
  // 3. Fallback: query Ollama for unknown objects
  try {
    const ollamaResponse = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'glm-5.1:cloud',
        messages: [{
          role: 'user',
          content: `Astronomer mode. Object: ${objectName}. Reply ONLY with a single JSON object, no markdown, no explanations, no backticks. Keys: id, commonName, objectType, constellation, rightAscension, declination, distance, distanceUnit, magnitude, catalogDenominations, composition, age, ageUnit. Use null for unknowns.`
        }],
        stream: false,
        options: { temperature: 0.05, num_predict: 400 }
      })
    });
    
    if (!ollamaResponse.ok) {
      throw new Error(`Ollama error: ${ollamaResponse.status}`);
    }
    
    const ollamaData = await ollamaResponse.json();
    const responseText = ollamaData.message?.content || '';
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Ollama response');
    }
    
    let parsedJson;
    try {
      parsedJson = JSON.parse(jsonMatch[0]);
    } catch (e) {
      const cleaned = jsonMatch[0].replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
      parsedJson = JSON.parse(cleaned);
    }
    
    dsoData = {
      id: parsedJson.id || objectName,
      commonName: parsedJson.commonName || null,
      objectType: parsedJson.objectType || null,
      constellation: parsedJson.constellation || null,
      rightAscension: parsedJson.rightAscension || null,
      declination: parsedJson.declination || null,
      distance: typeof parsedJson.distance === 'number' ? parsedJson.distance : null,
      distanceUnit: parsedJson.distanceUnit || 'ly',
      magnitude: typeof parsedJson.magnitude === 'number' ? parsedJson.magnitude : null,
      catalogDenominations: Array.isArray(parsedJson.catalogDenominations) ? parsedJson.catalogDenominations : null,
      composition: Array.isArray(parsedJson.composition) ? parsedJson.composition : null,
      age: typeof parsedJson.age === 'number' ? parsedJson.age : null,
      ageUnit: parsedJson.ageUnit || 'years',
    };
    
    // Save to cache
    const now = new Date().toISOString();
    await db.prepare(`INSERT INTO dso_cache (id, data, updated_at) VALUES (?, ?, ?)`).run(
      docId, JSON.stringify(dsoData), now
    );
    console.log(`[DSO] Cached data for "${objectName}" from Ollama.`);
    return c.json(dsoData);
    
  } catch (error: any) {
    console.error(`[DSO] Ollama failed for "${objectName}":`, error.message);
    // Return minimal fallback data instead of 500 error
    const fallback = {
      id: objectName.replace(/\s+/g, ''),
      commonName: objectName,
      objectType: null,
      constellation: null,
      rightAscension: null,
      declination: null,
      distance: null,
      distanceUnit: 'ly',
      magnitude: null,
      catalogDenominations: null,
      composition: null,
      age: null,
      ageUnit: 'years',
    };
    // Save fallback to cache to avoid repeated failures
    const now = new Date().toISOString();
    await db.prepare(`INSERT INTO dso_cache (id, data, updated_at) VALUES (?, ?, ?)`).run(
      docId, JSON.stringify(fallback), now
    );
    console.log(`[DSO] Saved fallback data for "${objectName}".`);
    return c.json(fallback);
  }
});

app.post('/api/dso', auth, async (c) => {
  const body = await c.req.json();
  const id = body.id || body.objectId;
  const now = new Date().toISOString();
  const { id: _id, ...data } = body;
  await db.prepare(`INSERT INTO dso_cache (id, data, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`).run(
    id, JSON.stringify(data), now
  );
  return c.json({ id, ...data });
});

// =====================
// OBSERVATION TARGETS
// =====================

function parseTarget(row: any) {
  return {
    id: row.id, objectId: row.object_id, commonName: row.common_name,
    objectType: row.object_type, constellation: row.constellation,
    magnitude: row.magnitude, angularSizeArcmin: { width: row.size_width, height: row.size_height },
    ra: row.ra, dec: row.dec, raDeg: row.ra_deg, decDeg: row.dec_deg,
    priority: row.priority, notes: row.notes, completed: Boolean(row.completed),
    completedDate: row.completed_date, acquisitionHours: row.acquisition_hours,
    targetHours: row.target_hours, imageUrl: row.image_url,
  };

}

app.get('/api/targets', async (c) => {
  const { completed, priority } = c.req.query();
  let query = 'SELECT * FROM observation_targets';
  const conditions: string[] = [];
  const params: any[] = [];
  if (completed !== undefined) { conditions.push('completed = ?'); params.push(completed === 'true' ? 1 : 0); }
  if (priority) { conditions.push('priority = ?'); params.push(priority); }
  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  return c.json((await db.prepare(query).all(...params)).map(parseTarget));
});

app.get('/api/targets/:id', async (c) => {
  const row = await db.prepare('SELECT * FROM observation_targets WHERE id = ?').get(c.req.param('id'));
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json(parseTarget(row));
});

app.post('/api/targets', auth, async (c) => {
  const body = await c.req.json();
  const id = body.id || crypto.randomUUID();
  await db.prepare(`INSERT INTO observation_targets (id, object_id, common_name, object_type, constellation, magnitude, size_width, size_height, ra, dec, ra_deg, dec_deg, priority, notes, completed, completed_date, acquisition_hours, target_hours, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, body.objectId || '', body.commonName || '', body.objectType || '', body.constellation || '',
    body.magnitude ?? null, body.angularSizeArcmin?.width ?? 0, body.angularSizeArcmin?.height ?? 0,
    body.ra || '', body.dec || '', body.raDeg ?? 0, body.decDeg ?? 0,
    body.priority || 'medium', body.notes || '', body.completed ? 1 : 0, body.completedDate ?? null,
    body.acquisitionHours ?? 0, body.targetHours ?? null, body.imageUrl ?? null
  );
  return c.json(parseTarget(await db.prepare('SELECT * FROM observation_targets WHERE id = ?').get(id)));
});

app.put('/api/targets/:id', auth, async (c) => {
  const body = await c.req.json();
  await db.prepare(`UPDATE observation_targets SET
    object_id = ?, common_name = ?, object_type = ?, constellation = ?, magnitude = ?,
    size_width = ?, size_height = ?, ra = ?, dec = ?, ra_deg = ?, dec_deg = ?,
    priority = ?, notes = ?, completed = ?,
    completed_date = ?, acquisition_hours = ?, target_hours = ?, image_url = ?
    WHERE id = ?`).run(
    body.objectId ?? '', body.commonName ?? '', body.objectType ?? '', body.constellation ?? '', body.magnitude ?? null,
    body.angularSizeArcmin?.width ?? 0, body.angularSizeArcmin?.height ?? 0,
    body.ra ?? '', body.dec ?? '', body.raDeg ?? 0, body.decDeg ?? 0,
    body.priority ?? 'medium', body.notes ?? '', body.completed ? 1 : 0, body.completedDate ?? null,
    body.acquisitionHours ?? 0, body.targetHours ?? null, body.imageUrl ?? null, c.req.param('id')
  );
  return c.json(parseTarget(await db.prepare('SELECT * FROM observation_targets WHERE id = ?').get(c.req.param('id'))));
});

app.delete('/api/targets/:id', auth, async (c) => {
  await db.prepare('DELETE FROM observation_targets WHERE id = ?').run(c.req.param('id'));
  return c.json({ ok: true });
});

// =====================
// OBSERVATION SESSIONS
// =====================

function parseSession(row: any) {
  return {
    id: row.id, date: row.date,
    location: { name: row.loc_name, lat: row.loc_lat, lon: row.loc_lon },
    moonIllumination: row.moon_illum, sunsetTime: row.sunset_time,
    darknessStart: row.darkness_start, darknessEnd: row.darkness_end,
    sunriseTime: row.sunrise_time, status: row.status,
    weatherSummary: row.weather_summary, notes: row.notes,
    cloudCover: row.cloud_cover, seeing: row.seeing,
    rigId: row.rig_id,
  };
}

app.get('/api/sessions', async (c) => {
  const { status, from, to } = c.req.query();
  let query = 'SELECT * FROM observation_sessions';
  const conditions: string[] = [];
  const params: any[] = [];
  if (status) { conditions.push('status = ?'); params.push(status); }
  if (from) { conditions.push('date >= ?'); params.push(from); }
  if (to) { conditions.push('date <= ?'); params.push(to); }
  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY date DESC';
  return c.json((await db.prepare(query).all(...params)).map(parseSession));
});

app.get('/api/sessions/:id', async (c) => {
  const row = await db.prepare('SELECT * FROM observation_sessions WHERE id = ?').get(c.req.param('id'));
  if (!row) return c.json({ error: 'Not found' }, 404);
  const session = parseSession(row);
  // Include targets
  const targets = await db.prepare(`SELECT t.* FROM observation_targets t
    JOIN session_targets st ON t.id = st.target_id WHERE st.session_id = ?`).all(c.req.param('id'));
  return c.json({ ...session, targets: targets.map(parseTarget) });
});

app.post('/api/sessions', auth, async (c) => {
  const body = await c.req.json();
  const id = body.id || crypto.randomUUID();
  await db.prepare(`INSERT INTO observation_sessions (id, date, loc_name, loc_lat, loc_lon, moon_illum, sunset_time, darkness_start, darkness_end, sunrise_time, status, weather_summary, notes, cloud_cover, seeing)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, body.date || '', body.location?.name || '', body.location?.lat ?? 0, body.location?.lon ?? 0,
    body.moonIllumination ?? 0, body.sunsetTime || '', body.darknessStart || '', body.darknessEnd || '',
    body.sunriseTime || '', body.status || 'planned', body.weatherSummary || '',
    body.notes || '', body.cloudCover ?? null, body.seeing ?? '', body.rigId ?? ''
  );
  // Link targets
  if (body.targets?.length) {
    for (const t of body.targets) {
      const tid = typeof t === 'string' ? t : t.id;
      await db.prepare('INSERT INTO session_targets (session_id, target_id) VALUES (?, ?) ON CONFLICT DO NOTHING').run(id, tid);
    }
  }
  return c.json(parseSession(await db.prepare('SELECT * FROM observation_sessions WHERE id = ?').get(id)));
});

app.put('/api/sessions/:id', auth, async (c) => {
  const body = await c.req.json();
  await db.prepare(`UPDATE observation_sessions SET
    date = ?, loc_name = ?, loc_lat = ?, loc_lon = ?, moon_illum = ?,
    sunset_time = ?, darkness_start = ?, darkness_end = ?, sunrise_time = ?,
    status = ?, weather_summary = ?, notes = ?, cloud_cover = ?, seeing = ?, rig_id = ?
    WHERE id = ?`).run(
    body.date ?? '', body.location?.name ?? '', body.location?.lat ?? 0, body.location?.lon ?? 0,
    body.moonIllumination ?? 0, body.sunsetTime ?? '', body.darknessStart ?? '',
    body.darknessEnd ?? '', body.sunriseTime ?? '', body.status ?? 'planned',
    body.weatherSummary ?? '', body.notes ?? '', body.cloudCover ?? null, body.seeing ?? '',
    body.rigId ?? '', c.req.param('id')
  );
  // Update targets if provided
  if (body.targets) {
    await db.prepare('DELETE FROM session_targets WHERE session_id = ?').run(c.req.param('id'));
    for (const t of body.targets) {
      const tid = typeof t === 'string' ? t : t.id;
      await db.prepare('INSERT INTO session_targets (session_id, target_id) VALUES (?, ?) ON CONFLICT DO NOTHING').run(c.req.param('id'), tid);
    }
  }
  return c.json(parseSession(await db.prepare('SELECT * FROM observation_sessions WHERE id = ?').get(c.req.param('id'))));
});

app.delete('/api/sessions/:id', auth, async (c) => {
  await db.prepare('DELETE FROM observation_sessions WHERE id = ?').run(c.req.param('id'));
  return c.json({ ok: true });
});

// =====================
// SITE CONFIG (Settings)
// =====================

app.get('/api/config/:id', async (c) => {
  const row = await db.prepare('SELECT * FROM site_config WHERE id = ?').get(c.req.param('id'));
  if (!row) return c.json({});
  return c.json({ id: (row as any).id, ...JSON.parse((row as any).data) });
});

app.put('/api/config/:id', auth, async (c) => {
  const body = await c.req.json();
  const now = new Date().toISOString();
  const data = { ...body };
  delete (data as any).id;
  await db.prepare(`INSERT INTO site_config (id, data, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`).run(
    c.req.param('id'), JSON.stringify(data), now
  );
  return c.json({ id: c.req.param('id'), ...data });
});

// =====================
// IMAGE UPLOAD
// =====================

app.post('/api/upload', auth, async (c) => {
  console.log('UPLOAD endpoint — Authorization header:', c.req.header('Authorization')?.slice(0, 50) + '...');
  console.log('UPLOAD endpoint — user:', JSON.stringify(c.get('user')));
  const formData = await c.req.parseBody();
  const file = formData['file'] as File;
  if (!file) return c.json({ error: 'No file' }, 400);

  const ext = extname(file.name) || '.bin';
  const id = crypto.randomUUID();
  const filename = `${id}${ext}`;
  const filepath = join(UPLOAD_DIR, filename);

  // Stream file to disk instead of buffering in memory
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  writeFileSync(filepath, buffer);

  // Convert images to WebP automatically
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif'];
  if (imageExts.includes(ext.toLowerCase())) {
    try {
      const sharp = await import('sharp');
      const webpFilename = `${id}.webp`;
      const webpPath = join(UPLOAD_DIR, webpFilename);
      
      await sharp.default(filepath)
        .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toFile(webpPath);
      
      // Delete original, keep only WebP
      import('fs').then(m => m.unlinkSync(filepath));
      
      return c.json({ id, url: `/uploads/${webpFilename}`, filename: webpFilename });
    } catch (err) {
      console.error('WebP conversion failed:', err);
      // Fallback: return original if conversion fails
      return c.json({ id, url: `/uploads/${filename}`, filename });
    }
  }

  return c.json({ id, url: `/uploads/${filename}`, filename });
});

// Serve uploaded files
app.get('/uploads/*', async (c) => {
  const filename = c.req.path.replace('/uploads/', '');
  const filepath = join(UPLOAD_DIR, filename);
  if (!existsSync(filepath)) return c.json({ error: 'Not found' }, 404);
  const data = await import('fs').then(m => m.readFileSync(filepath));
  return new Response(data, {
    headers: { 'Content-Type': getContentType(extname(filepath)) },
  });
});

function getContentType(ext: string): string {
  const types: Record<string, string> = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon',
    '.pdf': 'application/pdf', '.zip': 'application/zip',
    '.mp4': 'video/mp4', '.mp3': 'audio/mpeg',
  };
  return types[ext.toLowerCase()] || 'application/octet-stream';
}

// =====================
// SEED STATUS
// =====================

app.get('/api/seed/status', async (c) => {
  const posts = (await db.prepare('SELECT COUNT(*) as c FROM posts').get() as any).c;
  const processing = (await db.prepare('SELECT COUNT(*) as c FROM processing_posts').get() as any).c;
  const equipment = (await db.prepare('SELECT COUNT(*) as c FROM equipment').get() as any).c;
  const targets = (await db.prepare('SELECT COUNT(*) as c FROM observation_targets').get() as any).c;
  const sessions = (await db.prepare('SELECT COUNT(*) as c FROM observation_sessions').get() as any).c;
  const configs = (await db.prepare('SELECT COUNT(*) as c FROM site_config').get() as any).c;
  const users = (await db.prepare('SELECT COUNT(*) as c FROM users').get() as any).c;
  const dso = (await db.prepare('SELECT COUNT(*) as c FROM dso_cache').get() as any).c;
  return c.json({ posts, processingPosts: processing, equipment, targets, sessions, configs, users, dsoCache: dso });
});

// =====================
// ASK HAL (Astrophotography Knowledge Base)
// =====================


app.get('/api/ask-hal', async (c) => {
  const question = c.req.query('q');
  if (!question || question.trim().length < 3) {
    return c.json({ error: 'Question required (min 3 chars)' }, 400);
  }

  try {
    // Step 1: Retrieve relevant chunks using the skill
    const scriptPath = '/home/ubuntu/.openclaw/workspace/skills/astrophotography/scripts/query_smart.py';
    const result = execSync(
      `python3 "${scriptPath}" ${JSON.stringify(question)}`,
      { encoding: 'utf-8', timeout: 30000, maxBuffer: 1024 * 1024 }
    );

    // Parse passages
    const lines = result.split('\n');
    const passages: Array<{ book: string; text: string; similarity: number }> = [];
    let currentBook = '';
    let currentText = '';
    let currentSim = 0;
    let inTextBlock = false;

    for (const line of lines) {
      if (line.startsWith('--- Result')) {
        if (currentBook && currentText && currentText.length > 100) {
          passages.push({ book: currentBook, text: currentText.trim(), similarity: currentSim });
        }
        currentBook = '';
        currentText = '';
        currentSim = 0;
        inTextBlock = false;
      } else if (line.includes('score:') || line.includes('similarity:')) {
        const simMatch = line.match(/(?:score|similarity):\s*([\d.]+)/);
        if (simMatch) currentSim = parseFloat(simMatch[1]);
      } else if (line.startsWith('📖 ')) {
        currentBook = line.replace('📖 ', '').trim();
      } else if (line.startsWith('📝 ')) {
        currentText = line.replace('📝 ', '').trim();
        inTextBlock = true;
      } else if (inTextBlock && line.trim() && !line.startsWith('---') && !line.startsWith('📖') && !line.startsWith('🔍') && !line.startsWith('📊')) {
        currentText += '\n' + line.trim();
      } else if (line.startsWith('---') || line.startsWith('📖') || line.startsWith('🔍') || line.startsWith('📊')) {
        inTextBlock = false;
      }
    }
    if (currentBook && currentText && currentText.length > 100) {
      passages.push({ book: currentBook, text: currentText.trim(), similarity: currentSim });
    }

    passages.sort((a, b) => b.similarity - a.similarity);
    const topPassages = passages.slice(0, 3); // Reduce to top 3 to save context space

    // Step 2: Build context for LLM synthesis (limit each passage to 500 chars)
    let contextText = '';
    topPassages.forEach((p, i) => {
      const truncatedText = p.text.slice(0, 500);
      contextText += `\n[PASSAGE ${i + 1}] Source: ${p.book}\n${truncatedText}\n`;
    });

    // Step 3: Call LLM for structured synthesis
    const systemPrompt = `You are an expert astrophotography assistant. You answer ONLY from the provided passages below (extracts from books by Thierry Legault, Chris Woodhouse and Ian Morison). You must NOT invent information.\n\nStructure your response exactly as follows:\n1. 🎨 General Method (technique name + description)\n2. 📋 Detailed Steps (numbered list)\n3. 💡 Pro Tip (practical advice)\n4. 📚 Sources (books used)\n\nCite authors in parentheses. Be complete and precise. ALWAYS answer in English.`;

    const userPrompt = `QUESTION: ${question}\n\nRELEVANT PASSAGES:\n${contextText}\n\nGive a COMPLETE and STRUCTURED response. Do not truncate. Explain all methods mentioned in the passages. Cite authors systematically. ALWAYS answer in English.`;

    const llmResponse = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'glm-5.1:cloud',
        system: systemPrompt,
        prompt: userPrompt,
        stream: false,
        options: { temperature: 0.3, num_predict: 3000, num_ctx: 8192 }
      })
    });

    const llmData = await llmResponse.json();
    const synthesizedAnswer = llmData.response || llmData.text || 'Désolé, je n\'ai pas pu synthétiser une réponse.';

    const books = [...new Set(topPassages.map(p => p.book))];

    return c.json({
      question: question.trim(),
      answer: synthesizedAnswer,
      sources: topPassages.map(p => `${p.book}: ${p.text.slice(0, 200)}...`),
      books: books,
      book: books[0] || 'Unknown',
      confidence: topPassages.length > 0 ? topPassages[0].similarity : 0,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[Ask Hal] Error:', error.message);
    return c.json({
      question: question.trim(),
      answer: 'Désolé, une erreur est survenue lors de la synthèse de la réponse.',
      sources: [],
      books: [],
      book: null,
      confidence: 0,
      error: error.message,
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// =====================
// APLS v3 — Module 2 : Rig Profiles
// =====================

function parseAplsRig(row: any) {
  return {
    id: row.id,
    name: row.name,
    isDefault: Boolean(row.is_default),
    telescope: {
      name: row.telescope_name || '',
      focalLength: row.telescope_focal_length,
      aperture: row.telescope_aperture,
      fRatio: row.telescope_f_ratio,
      type: row.telescope_type || 'Refractor',
    },
    opticModifier: {
      type: row.modifier_type || 'None',
      factor: row.modifier_factor || 1.0,
      effectiveFocalLength: row.effective_focal_length,
    },
    imagingCamera: {
      name: row.camera_name || '',
      sensorWidth: row.sensor_width,
      sensorHeight: row.sensor_height,
      pixelSize: row.pixel_size,
      resolutionX: row.resolution_x,
      resolutionY: row.resolution_y,
      readNoise: row.read_noise,
      quantumEfficiency: row.quantum_efficiency,
      fullWellDepth: row.full_well_depth ?? 50000,
      isColor: Boolean(row.is_color),
      hasCooling: Boolean(row.has_cooling),
      binningAcquisition: row.binning_acquisition || 1,
    },
    guidingCamera: row.guiding_camera_name ? {
      name: row.guiding_camera_name,
      pixelSize: row.guiding_pixel_size,
      binning: row.guiding_binning || 1,
      mode: row.guiding_mode || 'GuideScope',
      focalLength: row.guiding_focal_length,
    } : undefined,
    mount: {
      name: row.mount_name || '',
      type: row.mount_type || '',
      maxPayload: row.mount_max_payload,
    },
  };
}

app.get('/api/apls/rigs', async (c) => {
  const rows = await db.prepare('SELECT * FROM apls_rig_profiles ORDER BY name ASC').all();
  return c.json((rows as any[]).map(parseAplsRig));
});

app.get('/api/apls/rigs/:id', async (c) => {
  const row = await db.prepare('SELECT * FROM apls_rig_profiles WHERE id = ?').get(c.req.param('id'));
  if (!row) return c.json({ error: 'Rig not found' }, 404);
  return c.json(parseAplsRig(row));
});

app.post('/api/apls/rigs', auth, async (c) => {
  const body = await c.req.json();
  const id = body.id || crypto.randomUUID();
  const now = new Date().toISOString();

  // Auto-compute effective focal length if not provided
  const effFocal = body.opticModifier?.effectiveFocalLength
    || (body.telescope?.focalLength || 0) * (body.opticModifier?.factor || 1.0);

  await db.prepare(`INSERT INTO apls_rig_profiles (
    id, name, is_default,
    telescope_name, telescope_focal_length, telescope_aperture, telescope_f_ratio, telescope_type,
    modifier_type, modifier_factor, effective_focal_length,
    sensor_width, sensor_height, pixel_size, resolution_x, resolution_y,
    read_noise, quantum_efficiency, is_color, has_cooling, binning_acquisition,
    full_well_depth,
    camera_name, guiding_camera_name, guiding_pixel_size, guiding_binning, guiding_mode, guiding_focal_length,
    mount_name, mount_type, mount_max_payload,
    created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, body.name || 'New Rig', body.isDefault ? 1 : 0,
    body.telescope?.name || '', body.telescope?.focalLength || 0, body.telescope?.aperture || 0,
    body.telescope?.fRatio || 0, body.telescope?.type || 'Refractor',
    body.opticModifier?.type || 'None', body.opticModifier?.factor || 1.0, effFocal,
    body.imagingCamera?.sensorWidth || 0, body.imagingCamera?.sensorHeight || 0,
    body.imagingCamera?.pixelSize || 0, body.imagingCamera?.resolutionX || 0,
    body.imagingCamera?.resolutionY || 0, body.imagingCamera?.readNoise || 0,
    body.imagingCamera?.quantumEfficiency || 0, body.imagingCamera?.isColor ? 1 : 0,
    body.imagingCamera?.hasCooling ? 1 : 0, body.imagingCamera?.binningAcquisition || 1,
    body.imagingCamera?.fullWellDepth ?? 50000,
    body.imagingCamera?.name || null,
    body.guidingCamera?.name || null, body.guidingCamera?.pixelSize || null,
    body.guidingCamera?.binning || null, body.guidingCamera?.mode || null,
    body.guidingCamera?.focalLength || null,
    body.mount?.name || '', body.mount?.type || '', body.mount?.maxPayload || 0,
    now, now
  );

  return c.json(parseAplsRig(await db.prepare('SELECT * FROM apls_rig_profiles WHERE id = ?').get(id)));
});

app.put('/api/apls/rigs/:id', auth, async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const now = new Date().toISOString();

  const effFocal = body.opticModifier?.effectiveFocalLength
    || (body.telescope?.focalLength || 0) * (body.opticModifier?.factor || 1.0);

  await db.prepare(`UPDATE apls_rig_profiles SET
    name = ?, is_default = ?,
    telescope_name = ?, telescope_focal_length = ?, telescope_aperture = ?, telescope_f_ratio = ?, telescope_type = ?,
    modifier_type = ?, modifier_factor = ?, effective_focal_length = ?,
    sensor_width = ?, sensor_height = ?, pixel_size = ?, resolution_x = ?, resolution_y = ?,
    read_noise = ?, quantum_efficiency = ?, is_color = ?, has_cooling = ?, binning_acquisition = ?,
    full_well_depth = ?,
    camera_name = ?,
    guiding_camera_name = ?, guiding_pixel_size = ?, guiding_binning = ?, guiding_mode = ?, guiding_focal_length = ?,
    mount_name = ?, mount_type = ?, mount_max_payload = ?,
    updated_at = ?
    WHERE id = ?`).run(
    body.name || '', body.isDefault ? 1 : 0,
    body.telescope?.name || '', body.telescope?.focalLength || 0, body.telescope?.aperture || 0,
    body.telescope?.fRatio || 0, body.telescope?.type || 'Refractor',
    body.opticModifier?.type || 'None', body.opticModifier?.factor || 1.0, effFocal,
    body.imagingCamera?.sensorWidth || 0, body.imagingCamera?.sensorHeight || 0,
    body.imagingCamera?.pixelSize || 0, body.imagingCamera?.resolutionX || 0,
    body.imagingCamera?.resolutionY || 0, body.imagingCamera?.readNoise || 0,
    body.imagingCamera?.quantumEfficiency || 0, body.imagingCamera?.isColor ? 1 : 0,
    body.imagingCamera?.hasCooling ? 1 : 0, body.imagingCamera?.binningAcquisition || 1,
    body.imagingCamera?.fullWellDepth ?? 50000,
    body.imagingCamera?.name || null,
    body.guidingCamera?.name || null, body.guidingCamera?.pixelSize || null,
    body.guidingCamera?.binning || null, body.guidingCamera?.mode || null,
    body.guidingCamera?.focalLength || null,
    body.mount?.name || '', body.mount?.type || '', body.mount?.maxPayload || 0,
    now, id
  );

  return c.json(parseAplsRig(await db.prepare('SELECT * FROM apls_rig_profiles WHERE id = ?').get(id)));
});

app.delete('/api/apls/rigs/:id', auth, async (c) => {
  await db.prepare('DELETE FROM apls_rig_profiles WHERE id = ?').run(c.req.param('id'));
  return c.json({ ok: true });
});

// Sampling calculation endpoint
app.post('/api/apls/rigs/:id/calculate-sampling', async (c) => {
  const rig = await db.prepare('SELECT * FROM apls_rig_profiles WHERE id = ?').get(c.req.param('id'));
  if (!rig) return c.json({ error: 'Rig not found' }, 404);

  const r = rig as any;
  const pixelSize = r.pixel_size || 0;
  const effFocal = r.effective_focal_length || r.telescope_focal_length || 1;
  const binning = r.binning_acquisition || 1;

  // E_imaging = (pixel_size_natif * binning) * 206.265 / F_eff
  const pixelScale = ((pixelSize * binning) * 206.265) / effFocal;

  const sensorW = r.sensor_width || 0;
  const sensorH = r.sensor_height || 0;
  const fovW = (sensorW * 206.265) / effFocal;
  const fovH = (sensorH * 206.265) / effFocal;
  const fovDiag = Math.sqrt(fovW * fovW + fovH * fovH);

  let recommendation: any;
  if (pixelScale > 2.5) {
    recommendation = {
      status: 'undersampled_critical',
      drizzleRecommendation: '2x_aggressive',
      explanation: 'Sous-échantillonnage critique. Étoiles carrées. Drizzle 2× + dithering agressif.',
      ditherRequired: true, ditherMinPixels: 5
    };
  } else if (pixelScale > 1.5) {
    recommendation = {
      status: 'undersampled_moderate',
      drizzleRecommendation: '2x',
      pixelDrop: 0.7,
      explanation: 'Sous-échantillonnage modéré. Drizzle 2× avec Pixel Drop 0.7.',
      ditherRequired: true, ditherMinPixels: 3
    };
  } else if (pixelScale > 0.8) {
    recommendation = {
      status: 'ideal',
      drizzleRecommendation: 'none',
      explanation: 'Zone idéale. Pas de Drizzle nécessaire.',
      ditherRequired: true, ditherMinPixels: 3
    };
  } else {
    recommendation = {
      status: 'oversampled',
      drizzleRecommendation: 'bin2x2',
      explanation: 'Sur-échantillonnage. Drizzle déconseillé. Binning 2×2 recommandé.',
      ditherRequired: false, ditherMinPixels: 0
    };
  }

  return c.json({
    imagingPixelScale: parseFloat(pixelScale.toFixed(3)),
    fovWidth: parseFloat(fovW.toFixed(2)),
    fovHeight: parseFloat(fovH.toFixed(2)),
    fovDiagonal: parseFloat(fovDiag.toFixed(2)),
    isOversampled: pixelScale < 0.8,
    isUndersampled: pixelScale > 1.5,
    recommendation,
  });
});

// Guiding calculation endpoint
app.post('/api/apls/rigs/:id/calculate-guiding', async (c) => {
  const rig = await db.prepare('SELECT * FROM apls_rig_profiles WHERE id = ?').get(c.req.param('id'));
  if (!rig) return c.json({ error: 'Rig not found' }, 404);

  const body = await c.req.json();
  const r = rig as any;

  const guideFocal = body.guidingFocalLength || r.guiding_focal_length || r.telescope_focal_length || 1;
  const guidePixelSize = body.guidingPixelSize || r.guiding_pixel_size || r.pixel_size || 1;
  const guideBinning = body.guidingBinning || r.guiding_binning || 1;

  const imagingPixelScale = ((r.pixel_size * (r.binning_acquisition || 1)) * 206.265) / (r.effective_focal_length || r.telescope_focal_length || 1);
  const guidingPixelScale = ((guidePixelSize * guideBinning) * 206.265) / guideFocal;
  const ratio = imagingPixelScale / guidingPixelScale;

  const ditherPrincipalPixels = body.ditherPrincipalPixels || 3;
  const ditherGuidePixels = Math.ceil(ditherPrincipalPixels * ratio);
  const ditherArcseconds = ditherGuidePixels * guidingPixelScale;

  return c.json({
    imagingPixelScale: parseFloat(imagingPixelScale.toFixed(3)),
    guidingPixelScale: parseFloat(guidingPixelScale.toFixed(3)),
    ratioImagingToGuiding: parseFloat(ratio.toFixed(2)),
    isValid: ratio < 0.2, // < 1:5
    message: ratio < 0.2
      ? `Ratio ${ratio.toFixed(2)} OK (< 1:5)`
      : `Ratio ${ratio.toFixed(2)} trop élevé. Guide scope trop court ou capteur guidage trop gros.`,
    ditherPixels: ditherGuidePixels,
    ditherArcseconds: parseFloat(ditherArcseconds.toFixed(2)),
  });
});

// =====================
// APLS v3 — Module 2 : Horizon Masks
// =====================

function parseHorizonMask(row: any) {
  return {
    id: row.id,
    name: row.name,
    locationId: row.location_id,
    format: row.format || 'csv',
    points: JSON.parse(row.points_json || '[]'),
  };
}

app.get('/api/apls/horizons', async (c) => {
  const rows = await db.prepare('SELECT * FROM apls_horizon_masks ORDER BY name ASC').all();
  return c.json((rows as any[]).map(parseHorizonMask));
});

app.get('/api/apls/horizons/:id', async (c) => {
  const row = await db.prepare('SELECT * FROM apls_horizon_masks WHERE id = ?').get(c.req.param('id'));
  if (!row) return c.json({ error: 'Horizon mask not found' }, 404);
  return c.json(parseHorizonMask(row));
});

app.post('/api/apls/horizons', auth, async (c) => {
  const body = await c.req.json();
  const id = body.id || crypto.randomUUID();
  await db.prepare(`INSERT INTO apls_horizon_masks (id, name, location_id, format, points_json)
    VALUES (?, ?, ?, ?, ?)`).run(
    id, body.name || 'New Horizon', body.locationId || null, body.format || 'csv',
    JSON.stringify(body.points || [])
  );
  return c.json(parseHorizonMask(await db.prepare('SELECT * FROM apls_horizon_masks WHERE id = ?').get(id)));
});

app.put('/api/apls/horizons/:id', auth, async (c) => {
  const body = await c.req.json();
  await db.prepare(`UPDATE apls_horizon_masks SET
    name = ?, location_id = ?, format = ?, points_json = ? WHERE id = ?`).run(
    body.name || '', body.locationId || null, body.format || 'csv',
    JSON.stringify(body.points || []), c.req.param('id')
  );
  return c.json(parseHorizonMask(await db.prepare('SELECT * FROM apls_horizon_masks WHERE id = ?').get(c.req.param('id'))));
});

app.delete('/api/apls/horizons/:id', auth, async (c) => {
  await db.prepare('DELETE FROM apls_horizon_masks WHERE id = ?').run(c.req.param('id'));
  return c.json({ ok: true });
});

app.post('/api/apls/horizons/:id/import', auth, async (c) => {
  const body = await c.req.json();
  const raw = body.raw || '';
  let points: Array<{azimuth: number; altitude: number}> = [];

  if (body.format === 'csv') {
    const lines = raw.split('\n').filter((l: string) => l.trim() && !l.startsWith('#'));
    for (const line of lines) {
      const parts = line.split(/[,;\t]/).map((s: string) => parseFloat(s.trim())).filter((n: number) => !isNaN(n));
      if (parts.length >= 2) {
        points.push({ azimuth: parts[0], altitude: parts[1] });
      }
    }
  } else if (body.format === 'yaml') {
    const lines = raw.split('\n').filter((l: string) => l.trim());
    for (const line of lines) {
      const m = line.match(/az(?:imuth)?[:\s]+(\d+(?:\.\d+)?)/i);
      const m2 = line.match(/alt(?:itude)?[:\s]+(\d+(?:\.\d+)?)/i);
      if (m && m2) {
        points.push({ azimuth: parseFloat(m[1]), altitude: parseFloat(m[2]) });
      }
    }
  }

  await db.prepare(`UPDATE apls_horizon_masks SET points_json = ? WHERE id = ?`).run(
    JSON.stringify(points), c.req.param('id')
  );

  return c.json({ points, count: points.length });
});

app.get('/api/apls/horizons/:id/export', async (c) => {
  const row = await db.prepare('SELECT * FROM apls_horizon_masks WHERE id = ?').get(c.req.param('id'));
  if (!row) return c.json({ error: 'Not found' }, 404);
  const points = JSON.parse((row as any).points_json || '[]');
  // Telescopius format: CSV with Azimuth,Altitude
  let csv = '# Horizon mask for Telescopius\n# Format: Azimuth(deg),Altitude(deg)\n';
  for (const p of points) {
    csv += `${p.azimuth.toFixed(1)},${p.altitude.toFixed(1)}\n`;
  }
  return new Response(csv, {
    headers: { 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="${(row as any).name.replace(/\s+/g, '_')}_horizon.csv"` }
  });
});


// =====================
// APLS DASHBOARD KPIs
// =====================

app.get('/api/apls/dashboard/kpis', async (c) => {
  // Aggregate from real DB data
  const totalSessions = await db.prepare('SELECT COUNT(*) as count FROM observation_sessions WHERE status = ?').get('completed') as any;
  const activeProjects = await db.prepare('SELECT COUNT(*) as count FROM observation_targets WHERE completed = 0').get() as any;
  const completedProjects = await db.prepare('SELECT COUNT(*) as count FROM observation_targets WHERE completed = 1').get() as any;
  const totalIntegrationTime = await db.prepare('SELECT COALESCE(SUM(acquisition_hours), 0) as total FROM observation_targets').get() as any;
  
  // Monthly trend (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const sixMonthsAgoStr = sixMonthsAgo.toISOString().slice(0, 7);
  const monthlyData = await db.prepare(`
    SELECT TO_CHAR(date::text::date, 'YYYY-MM') as month, COUNT(*) as sessions
    FROM observation_sessions 
    WHERE date >= ? AND status = 'completed'
    GROUP BY month ORDER BY month
  `).all(sixMonthsAgoStr) as any[];

  const monthlyIntegrationTrend = monthlyData.map((r: any) => ({
    month: r.month,
    hours: r.sessions * 3,
  }));

  // Filter distribution from target types + acquisition hours
  const targets = await db.prepare('SELECT object_type, acquisition_hours FROM observation_targets WHERE acquisition_hours > 0').all() as any[];
  const filterMap: Record<string, number> = {};
  for (const t of targets) {
    const type = t.object_type || 'Unknown';
    filterMap[type] = (filterMap[type] || 0) + (t.acquisition_hours || 0);
  }
  const totalFilterHours = Object.values(filterMap).reduce((a: number, b: number) => a + b, 0) || 1;
  const filterDistribution = Object.entries(filterMap).map(([filter, hours]) => ({
    filter,
    hours: Math.round((hours as number) * 10) / 10,
    percentage: Math.round(((hours as number) / totalFilterHours) * 100),
  }));

  return c.json({
    totalIntegrationTime: Math.round(totalIntegrationTime.total * 10) / 10,
    totalSessionsCompleted: totalSessions.count || 0,
    totalProjectsCompleted: completedProjects.count || 0,
    activeProjectsCount: activeProjects.count || 0,
    averageGuidingRMS: 0,
    bestGuidingRMS: 0,
    worstGuidingRMS: 0,
    filterDistribution,
    monthlyIntegrationTrend,
    mountHealthScore: 0,
    lastMaintenanceDate: null,
  });
});

// =====================
// APLS WEATHER PROXY
// =====================

app.get('/api/apls/weather/*', async (c) => {
  const path = c.req.path.replace('/api/apls/weather/', '');
  const query = new URL(c.req.url).searchParams.toString();
  const url = `https://api.open-meteo.com/v1/${path}${query ? '?' + query : ''}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return c.json({ error: 'Open-Meteo error' }, res.status as any);
    const data = await res.json();
    return c.json(data);
  } catch {
    return c.json({ error: 'Weather proxy failed' }, 502 as any);
  }
});

app.get('/api/apls/targets/moon', async (c) => {
  const { lat, lon, date } = c.req.query();
  let apiKey = '';
  try {
    const fs = require('fs');
    apiKey = JSON.parse(fs.readFileSync('.secrets/telescopius.json', 'utf8')).api_key || JSON.parse(fs.readFileSync('.secrets/telescopius.json', 'utf8')).apiKey;
  } catch {}
  const url = `https://api.telescopius.com/api/v2/moon?lat=${lat}&lon=${lon}${date ? `&date=${date}` : ''}`;
  try {
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${apiKey}` } });
    if (!res.ok) return c.json({ error: 'Telescopius moon error' }, res.status as any);
    return c.json(await res.json());
  } catch {
    return c.json({ error: 'Moon proxy failed' }, 502 as any);
  }
});

// =====================
// APLS v3 — Module : Filters (user-owned)
// =====================

function parseFilter(row: any) {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    category: row.category,
    bandwidthNm: row.bandwidth_nm,
    peakTransmission: row.peak_transmission,
    centerWavelengthNm: row.center_wavelength_nm,
    skySuppression: row.sky_suppression,
    moonCompatible: Boolean(row.moon_compatible),
    color: row.color,
    description: row.description,
    useCases: JSON.parse(row.use_cases || '[]'),
    recommendedTargets: JSON.parse(row.recommended_targets || '[]'),
    owned: Boolean(row.owned),
    isDefault: Boolean(row.is_default),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

app.get('/api/apls/filters', auth, async (c) => {
  const userId = c.get('user').id;
  const rows = await db.prepare('SELECT * FROM apls_filters WHERE user_id = ? ORDER BY created_at ASC').all(userId);
  return c.json(rows.map(parseFilter));
});

app.get('/api/apls/filters/:id', auth, async (c) => {
  const userId = c.get('user').id;
  const row = await db.prepare('SELECT * FROM apls_filters WHERE id = ? AND user_id = ?').get(c.req.param('id'), userId);
  if (!row) return c.json({ error: 'Filter not found' }, 404);
  return c.json(parseFilter(row));
});

app.post('/api/apls/filters', auth, async (c) => {
  const userId = c.get('user').id;
  const body = await c.req.json();
  const id = body.id || crypto.randomUUID();
  const now = new Date().toISOString();
  await db.prepare(`INSERT INTO apls_filters (
    id, user_id, name, brand, category, bandwidth_nm, peak_transmission,
    center_wavelength_nm, sky_suppression, moon_compatible, color, description,
    use_cases, recommended_targets, owned, is_default, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, userId, body.name || '', body.brand || '', body.category || 'broadband',
    body.bandwidthNm ?? 0, body.peakTransmission ?? 0, body.centerWavelengthNm ?? 0,
    body.skySuppression ?? 0, body.moonCompatible ? 1 : 0, body.color || '#4FC3F7',
    body.description || '', JSON.stringify(body.useCases || []),
    JSON.stringify(body.recommendedTargets || []),
    body.owned ? 1 : 0, body.isDefault ? 1 : 0, now, now
  );
  return c.json(parseFilter(await db.prepare('SELECT * FROM apls_filters WHERE id = ?').get(id)), 201);
});

app.patch('/api/apls/filters/:id', auth, async (c) => {
  const userId = c.get('user').id;
  const id = c.req.param('id');
  const existing = await db.prepare('SELECT id FROM apls_filters WHERE id = ? AND user_id = ?').get(id, userId);
  if (!existing) return c.json({ error: 'Filter not found' }, 404);
  const body = await c.req.json();
  const now = new Date().toISOString();
  const fields: Record<string, any> = {};
  if (body.name !== undefined) fields.name = body.name;
  if (body.brand !== undefined) fields.brand = body.brand;
  if (body.category !== undefined) fields.category = body.category;
  if (body.bandwidthNm !== undefined) fields.bandwidth_nm = body.bandwidthNm;
  if (body.peakTransmission !== undefined) fields.peak_transmission = body.peakTransmission;
  if (body.centerWavelengthNm !== undefined) fields.center_wavelength_nm = body.centerWavelengthNm;
  if (body.skySuppression !== undefined) fields.sky_suppression = body.skySuppression;
  if (body.moonCompatible !== undefined) fields.moon_compatible = body.moonCompatible ? 1 : 0;
  if (body.color !== undefined) fields.color = body.color;
  if (body.description !== undefined) fields.description = body.description;
  if (body.useCases !== undefined) fields.use_cases = JSON.stringify(body.useCases);
  if (body.recommendedTargets !== undefined) fields.recommended_targets = JSON.stringify(body.recommendedTargets);
  if (body.owned !== undefined) fields.owned = body.owned ? 1 : 0;
  if (body.isDefault !== undefined) fields.is_default = body.isDefault ? 1 : 0;
  fields.updated_at = now;
  const sets = Object.keys(fields).map(k => `${k} = ?`).join(', ');
  const values = Object.values(fields);
  values.push(id);
  await db.prepare(`UPDATE apls_filters SET ${sets} WHERE id = ?`).run(...values);
  return c.json(parseFilter(await db.prepare('SELECT * FROM apls_filters WHERE id = ?').get(id)));
});

app.delete('/api/apls/filters/:id', auth, async (c) => {
  const userId = c.get('user').id;
  const result = await db.prepare('DELETE FROM apls_filters WHERE id = ? AND user_id = ?').run(c.req.param('id'), userId);
  if (result.changes === 0) return c.json({ error: 'Filter not found' }, 404);
  return c.json({ ok: true });
});

// =====================
// APLS v3 — Module : Projects (user-owned)
// =====================

function parseProject(row: any) {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    targetId: row.target_id,
    targetName: row.target_name,
    targetType: row.target_type,
    targetRa: row.target_ra,
    targetDec: row.target_dec,
    targetMagnitude: row.target_magnitude,
    targetSizeArcmin: row.target_size_arcmin,
    surfaceBrightness: row.surface_brightness ?? null,
    targetImageUrl: row.target_image_url,
    locationSource: row.location_source,
    lat: row.lat,
    lon: row.lon,
    rigId: row.rig_id,
    rigName: row.rig_name,
    focalLength: row.focal_length,
    aperture: row.aperture,
    pixelSize: row.pixel_size,
    sensorWidth: row.sensor_width,
    sensorHeight: row.sensor_height,
    primaryFilter: row.primary_filter,
    snrTarget: row.snr_target ?? 30,
    exposurePlan: JSON.parse(row.exposure_plan || '[]'),
    totalPlannedHours: row.total_planned_hours,
    observations: [] as any[],  // filled separately
    totalExposureSeconds: row.total_exposure_seconds,
    completionPercent: row.completion_percent,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseObservation(row: any) {
  return {
    id: row.id,
    projectId: row.project_id,
    date: row.date,
    exposuresTaken: row.exposures_taken,
    exposureDuration: row.exposure_duration,
    filter: row.filter,
    seeing: row.seeing,
    guidingRms: row.guiding_rms,
    moonIllumination: row.moon_illumination,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

app.get('/api/apls/projects', auth, async (c) => {
  const userId = c.get('user').id;
  const rows = await db.prepare('SELECT * FROM apls_projects WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  const projects = rows.map(parseProject);
  // Attach observations
  const projectIds = projects.map((p: any) => p.id);
  if (projectIds.length > 0) {
    const placeholders = projectIds.map(() => '?').join(',');
    const obsRows = await db.prepare(`SELECT * FROM apls_project_observations WHERE project_id IN (${placeholders}) ORDER BY created_at ASC`).all(...projectIds) as any[];
    const obsByProject: Record<string, any[]> = {};
    for (const obs of obsRows) {
      if (!obsByProject[obs.project_id]) obsByProject[obs.project_id] = [];
      obsByProject[obs.project_id].push(parseObservation(obs));
    }
    for (const p of projects) {
      p.observations = obsByProject[p.id] || [];
    }
  }
  return c.json(projects);
});

app.get('/api/apls/projects/:id', auth, async (c) => {
  const userId = c.get('user').id;
  const row = await db.prepare('SELECT * FROM apls_projects WHERE id = ? AND user_id = ?').get(c.req.param('id'), userId);
  if (!row) return c.json({ error: 'Project not found' }, 404);
  const project = parseProject(row);
  const obsRows = await db.prepare('SELECT * FROM apls_project_observations WHERE project_id = ? ORDER BY created_at ASC').all(c.req.param('id'));
  project.observations = (obsRows as any[]).map(parseObservation);
  return c.json(project);
});

app.post('/api/apls/projects', auth, async (c) => {
  const userId = c.get('user').id;
  const body = await c.req.json();
  const id = body.id || crypto.randomUUID();
  const now = new Date().toISOString();
  await db.prepare(`INSERT INTO apls_projects (
    id, user_id, title, status,
    target_id, target_name, target_type, target_ra, target_dec,
    target_magnitude, target_size_arcmin, surface_brightness, target_image_url,
    location_source, lat, lon,
    rig_id, rig_name, focal_length, aperture, pixel_size, sensor_width, sensor_height,
    primary_filter, exposure_plan, total_planned_hours,
    total_exposure_seconds, completion_percent, snr_target, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, userId, body.title || '', body.status || 'planning',
    body.targetId || '', body.targetName || '', body.targetType || '',
    body.targetRa || '', body.targetDec || '',
    body.targetMagnitude ?? null, body.targetSizeArcmin ?? null, body.surfaceBrightness ?? null, body.targetImageUrl ?? null,
    body.locationSource || '', body.lat ?? 0, body.lon ?? 0,
    body.rigId ?? null, body.rigName ?? null, body.focalLength ?? null,
    body.aperture ?? null, body.pixelSize ?? null, body.sensorWidth ?? null, body.sensorHeight ?? null,
    body.primaryFilter || '', JSON.stringify(body.exposurePlan || []),
    body.totalPlannedHours ?? 0, body.totalExposureSeconds ?? 0,
    body.completionPercent ?? 0, body.snrTarget ?? 30, now, now
  );
  // Insert observations if provided
  const observations = body.observations || [];
  for (const obs of observations) {
    const obsId = obs.id || crypto.randomUUID();
    await db.prepare(`INSERT INTO apls_project_observations (
      id, project_id, date, exposures_taken, exposure_duration, filter,
      seeing, guiding_rms, moon_illumination, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      obsId, id, obs.date || '', obs.exposuresTaken ?? 0, obs.exposureDuration ?? 0,
      obs.filter || '', obs.seeing ?? null, obs.guidingRms ?? null,
      obs.moonIllumination ?? null, obs.notes || '', obs.createdAt || now
    );
  }
  const project = parseProject(await db.prepare('SELECT * FROM apls_projects WHERE id = ?').get(id));
  const obsRows = await db.prepare('SELECT * FROM apls_project_observations WHERE project_id = ? ORDER BY created_at ASC').all(id);
  project.observations = (obsRows as any[]).map(parseObservation);
  return c.json(project, 201);
});

app.patch('/api/apls/projects/:id', auth, async (c) => {
  const userId = c.get('user').id;
  const id = c.req.param('id');
  const existing = await db.prepare('SELECT id FROM apls_projects WHERE id = ? AND user_id = ?').get(id, userId);
  if (!existing) return c.json({ error: 'Project not found' }, 404);
  const body = await c.req.json();
  const now = new Date().toISOString();
  const fields: Record<string, any> = {};
  if (body.title !== undefined) fields.title = body.title;
  if (body.status !== undefined) fields.status = body.status;
  if (body.targetId !== undefined) fields.target_id = body.targetId;
  if (body.targetName !== undefined) fields.target_name = body.targetName;
  if (body.targetType !== undefined) fields.target_type = body.targetType;
  if (body.targetRa !== undefined) fields.target_ra = body.targetRa;
  if (body.targetDec !== undefined) fields.target_dec = body.targetDec;
  if (body.targetMagnitude !== undefined) fields.target_magnitude = body.targetMagnitude;
  if (body.targetSizeArcmin !== undefined) fields.target_size_arcmin = body.targetSizeArcmin;
  if (body.surfaceBrightness !== undefined) fields.surface_brightness = body.surfaceBrightness;
  if (body.targetImageUrl !== undefined) fields.target_image_url = body.targetImageUrl;
  if (body.locationSource !== undefined) fields.location_source = body.locationSource;
  if (body.lat !== undefined) fields.lat = body.lat;
  if (body.lon !== undefined) fields.lon = body.lon;
  if (body.rigId !== undefined) fields.rig_id = body.rigId;
  if (body.rigName !== undefined) fields.rig_name = body.rigName;
  if (body.focalLength !== undefined) fields.focal_length = body.focalLength;
  if (body.aperture !== undefined) fields.aperture = body.aperture;
  if (body.pixelSize !== undefined) fields.pixel_size = body.pixelSize;
  if (body.sensorWidth !== undefined) fields.sensor_width = body.sensorWidth;
  if (body.sensorHeight !== undefined) fields.sensor_height = body.sensorHeight;
  if (body.primaryFilter !== undefined) fields.primary_filter = body.primaryFilter;
  if (body.snrTarget !== undefined) fields.snr_target = body.snrTarget;
  if (body.exposurePlan !== undefined) fields.exposure_plan = JSON.stringify(body.exposurePlan);
  if (body.totalPlannedHours !== undefined) fields.total_planned_hours = body.totalPlannedHours;
  if (body.totalExposureSeconds !== undefined) fields.total_exposure_seconds = body.totalExposureSeconds;
  if (body.completionPercent !== undefined) fields.completion_percent = body.completionPercent;
  fields.updated_at = now;
  const sets = Object.keys(fields).map(k => `${k} = ?`).join(', ');
  const values = Object.values(fields);
  values.push(id);
  await db.prepare(`UPDATE apls_projects SET ${sets} WHERE id = ?`).run(...values);
  const project = parseProject(await db.prepare('SELECT * FROM apls_projects WHERE id = ?').get(id));
  const obsRows = await db.prepare('SELECT * FROM apls_project_observations WHERE project_id = ? ORDER BY created_at ASC').all(id);
  project.observations = (obsRows as any[]).map(parseObservation);
  return c.json(project);
});

app.delete('/api/apls/projects/:id', auth, async (c) => {
  const userId = c.get('user').id;
  // Observations are cascade-deleted by FK
  const result = await db.prepare('DELETE FROM apls_projects WHERE id = ? AND user_id = ?').run(c.req.param('id'), userId);
  if (result.changes === 0) return c.json({ error: 'Project not found' }, 404);
  return c.json({ ok: true });
});

app.post('/api/apls/projects/:id/observations', auth, async (c) => {
  const userId = c.get('user').id;
  const projectId = c.req.param('id');
  const existing = await db.prepare('SELECT id FROM apls_projects WHERE id = ? AND user_id = ?').get(projectId, userId);
  if (!existing) return c.json({ error: 'Project not found' }, 404);
  const body = await c.req.json();
  const obsId = body.id || crypto.randomUUID();
  const now = new Date().toISOString();
  await db.prepare(`INSERT INTO apls_project_observations (
    id, project_id, date, exposures_taken, exposure_duration, filter,
    seeing, guiding_rms, moon_illumination, notes, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    obsId, projectId, body.date || '', body.exposuresTaken ?? 0,
    body.exposureDuration ?? 0, body.filter || '',
    body.seeing ?? null, body.guidingRms ?? null,
    body.moonIllumination ?? null, body.notes || '', now
  );
  // Recalculate project progress
  const obsRows = await db.prepare('SELECT * FROM apls_project_observations WHERE project_id = ?').all(projectId) as any[];
  const totalExposureSeconds = obsRows.reduce((sum: number, o: any) => sum + (o.exposures_taken * o.exposure_duration), 0);
  const project = await db.prepare('SELECT * FROM apls_projects WHERE id = ?').get(projectId) as any;
  const plannedSeconds = (project.total_planned_hours || 0) * 3600;
  const completionPercent = plannedSeconds > 0 ? Math.min(100, Math.round(totalExposureSeconds / plannedSeconds * 100)) : 0;
  await db.prepare('UPDATE apls_projects SET total_exposure_seconds = ?, completion_percent = ?, updated_at = ? WHERE id = ?').run(
    totalExposureSeconds, completionPercent, now, projectId
  );
  return c.json(parseObservation(await db.prepare('SELECT * FROM apls_project_observations WHERE id = ?').get(obsId)));
});

app.delete('/api/apls/projects/:id/observations/:obsId', auth, async (c) => {
  const userId = c.get('user').id;
  const projectId = c.req.param('id');
  const obsId = c.req.param('obsId');
  const existing = await db.prepare('SELECT id FROM apls_projects WHERE id = ? AND user_id = ?').get(projectId, userId);
  if (!existing) return c.json({ error: 'Project not found' }, 404);
  await db.prepare('DELETE FROM apls_project_observations WHERE id = ? AND project_id = ?').run(obsId, projectId);
  // Recalculate progress
  const now = new Date().toISOString();
  const obsRows = await db.prepare('SELECT * FROM apls_project_observations WHERE project_id = ?').all(projectId) as any[];
  const totalExposureSeconds = obsRows.reduce((sum: number, o: any) => sum + (o.exposures_taken * o.exposure_duration), 0);
  const project = await db.prepare('SELECT * FROM apls_projects WHERE id = ?').get(projectId) as any;
  const plannedSeconds = (project.total_planned_hours || 0) * 3600;
  const completionPercent = plannedSeconds > 0 ? Math.min(100, Math.round(totalExposureSeconds / plannedSeconds * 100)) : 0;
  await db.prepare('UPDATE apls_projects SET total_exposure_seconds = ?, completion_percent = ?, updated_at = ? WHERE id = ?').run(
    totalExposureSeconds, completionPercent, now, projectId
  );
  return c.json({ ok: true });
});

// =====================
// APLS v3 — Sync endpoint (migrate localStorage → API)
// =====================

app.post('/api/apls/sync', auth, async (c) => {
  const userId = c.get('user').id;
  const body = await c.req.json();
  const now = new Date().toISOString();
  const result: { filters: any[]; projects: any[] } = { filters: [], projects: [] };

  // Sync filters
  if (body.filters && Array.isArray(body.filters)) {
    for (const filter of body.filters) {
      // Check if filter already exists by id
      const existing = await db.prepare('SELECT id FROM apls_filters WHERE id = ?').get(filter.id) as any;
      if (existing) {
        // Update only if server version is older
        const serverFilter = await db.prepare('SELECT updated_at FROM apls_filters WHERE id = ?').get(filter.id) as any;
        if (filter.updatedAt && filter.updatedAt > serverFilter.updated_at) {
          await db.prepare(`UPDATE apls_filters SET
            name = ?, brand = ?, category = ?, bandwidth_nm = ?, peak_transmission = ?,
            center_wavelength_nm = ?, sky_suppression = ?, moon_compatible = ?, color = ?,
            description = ?, use_cases = ?, recommended_targets = ?, owned = ?, is_default = ?,
            updated_at = ?
            WHERE id = ?`).run(
            filter.name || '', filter.brand || '', filter.category || 'broadband',
            filter.bandwidthNm ?? 0, filter.peakTransmission ?? 0,
            filter.centerWavelengthNm ?? 0, filter.skySuppression ?? 0,
            filter.moonCompatible ? 1 : 0, filter.color || '#4FC3F7',
            filter.description || '', JSON.stringify(filter.useCases || []),
            JSON.stringify(filter.recommendedTargets || []),
            filter.owned ? 1 : 0, filter.isDefault ? 1 : 0, now, filter.id
          );
        }
      } else {
        // Insert new filter
        await db.prepare(`INSERT INTO apls_filters (
          id, user_id, name, brand, category, bandwidth_nm, peak_transmission,
          center_wavelength_nm, sky_suppression, moon_compatible, color, description,
          use_cases, recommended_targets, owned, is_default, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
          filter.id, userId, filter.name || '', filter.brand || '', filter.category || 'broadband',
          filter.bandwidthNm ?? 0, filter.peakTransmission ?? 0, filter.centerWavelengthNm ?? 0,
          filter.skySuppression ?? 0, filter.moonCompatible ? 1 : 0, filter.color || '#4FC3F7',
          filter.description || '', JSON.stringify(filter.useCases || []),
          JSON.stringify(filter.recommendedTargets || []),
          filter.owned ? 1 : 0, filter.isDefault ? 1 : 0,
          filter.createdAt || now, filter.updatedAt || now
        );
      }
    }
    // Return all user's filters
    const rows = await db.prepare('SELECT * FROM apls_filters WHERE user_id = ? ORDER BY created_at ASC').all(userId);
    result.filters = rows.map(parseFilter);
  }

  // Sync projects
  if (body.projects && Array.isArray(body.projects)) {
    for (const project of body.projects) {
      const existing = await db.prepare('SELECT id FROM apls_projects WHERE id = ?').get(project.id) as any;
      if (existing) {
        // Update if newer
        const serverProject = await db.prepare('SELECT updated_at FROM apls_projects WHERE id = ?').get(project.id) as any;
        if (project.updatedAt && project.updatedAt > serverProject.updated_at) {
          await db.prepare(`UPDATE apls_projects SET
            title = ?, status = ?, target_id = ?, target_name = ?, target_type = ?,
            target_ra = ?, target_dec = ?, target_magnitude = ?, target_size_arcmin = ?,
            target_image_url = ?, location_source = ?, lat = ?, lon = ?,
            rig_id = ?, rig_name = ?, focal_length = ?, aperture = ?, pixel_size = ?,
            sensor_width = ?, sensor_height = ?, primary_filter = ?,
            exposure_plan = ?, total_planned_hours = ?, total_exposure_seconds = ?,
            completion_percent = ?, updated_at = ?
            WHERE id = ?`).run(
            project.title || '', project.status || 'planning',
            project.targetId || '', project.targetName || '', project.targetType || '',
            project.targetRa || '', project.targetDec || '',
            project.targetMagnitude ?? null, project.targetSizeArcmin ?? null,
            project.targetImageUrl ?? null, project.locationSource || '',
            project.lat ?? 0, project.lon ?? 0, project.rigId ?? null,
            project.rigName ?? null, project.focalLength ?? null, project.aperture ?? null,
            project.pixelSize ?? null, project.sensorWidth ?? null, project.sensorHeight ?? null,
            project.primaryFilter || '', JSON.stringify(project.exposurePlan || []),
            project.totalPlannedHours ?? 0, project.totalExposureSeconds ?? 0,
            project.completionPercent ?? 0, now, project.id
          );
        }
      } else {
        await db.prepare(`INSERT INTO apls_projects (
          id, user_id, title, status, target_id, target_name, target_type, target_ra, target_dec,
          target_magnitude, target_size_arcmin, surface_brightness, target_image_url,
          location_source, lat, lon, rig_id, rig_name, focal_length, aperture,
          pixel_size, sensor_width, sensor_height, primary_filter,
          exposure_plan, total_planned_hours, total_exposure_seconds,
          completion_percent, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
          project.id, userId, project.title || '', project.status || 'planning',
          project.targetId || '', project.targetName || '', project.targetType || '',
          project.targetRa || '', project.targetDec || '',
          project.targetMagnitude ?? null, project.targetSizeArcmin ?? null,
          project.surfaceBrightness ?? null, project.targetImageUrl ?? null, project.locationSource || '',
          project.lat ?? 0, project.lon ?? 0, project.rigId ?? null,
          project.rigName ?? null, project.focalLength ?? null, project.aperture ?? null,
          project.pixelSize ?? null, project.sensorWidth ?? null, project.sensorHeight ?? null,
          project.primaryFilter || '', JSON.stringify(project.exposurePlan || []),
          project.totalPlannedHours ?? 0, project.totalExposureSeconds ?? 0,
          project.completionPercent ?? 0, project.createdAt || now, project.updatedAt || now
        );
      }
      // Sync observations for this project
      if (project.observations && Array.isArray(project.observations)) {
        for (const obs of project.observations) {
          const obsExisting = await db.prepare('SELECT id FROM apls_project_observations WHERE id = ?').get(obs.id) as any;
          if (!obsExisting) {
            await db.prepare(`INSERT INTO apls_project_observations (
              id, project_id, date, exposures_taken, exposure_duration, filter,
              seeing, guiding_rms, moon_illumination, notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
              obs.id, project.id, obs.date || '', obs.exposuresTaken ?? 0,
              obs.exposureDuration ?? 0, obs.filter || '',
              obs.seeing ?? null, obs.guidingRms ?? null,
              obs.moonIllumination ?? null, obs.notes || '', obs.createdAt || now
            );
          }
        }
      }
    }
    // Return all user's projects with observations
    const projectRows = await db.prepare('SELECT * FROM apls_projects WHERE user_id = ? ORDER BY created_at DESC').all(userId);
    const projectIds = (projectRows as any[]).map((r: any) => r.id);
    const allObs: any[] = [];
    if (projectIds.length > 0) {
      const placeholders = projectIds.map(() => '?').join(',');
      allObs.push(...(await db.prepare(`SELECT * FROM apls_project_observations WHERE project_id IN (${placeholders}) ORDER BY created_at ASC`).all(...projectIds)) as any[]);
    }
    const obsByProject: Record<string, any[]> = {};
    for (const obs of allObs) {
      if (!obsByProject[obs.project_id]) obsByProject[obs.project_id] = [];
      obsByProject[obs.project_id].push(parseObservation(obs));
    }
    result.projects = projectRows.map((r: any) => {
      const p = parseProject(r);
      p.observations = obsByProject[r.id] || [];
      return p;
    });
  }

  return c.json(result);
});

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Start
console.log(`🔭 AstroCapture API starting on port ${PORT}...`);

// Seed default filters for existing users if they have none
try {
  const users = await db.prepare('SELECT id FROM users').all() as any[];
  const filterCount = (await db.prepare('SELECT COUNT(*) as c FROM apls_filters').get() as any).c;
  if (filterCount === 0 && users.length > 0) {
    const defaultFilters = [
      { id: 'filter_uv_ir_cut', name: 'UV/IR Cut', brand: 'ZWO', category: 'broadband', bandwidth_nm: 300, peak_transmission: 0.97, center_wavelength_nm: 560, sky_suppression: 0.0, moon_compatible: 0, color: '#4FC3F7', description: 'ZWO protection filter. Flat ~97% transmission from 420-700nm.', use_cases: JSON.stringify(['Nuits sans Lune', 'Pollution faible', 'Galaxies', 'Amas', 'Luminance']), recommended_targets: JSON.stringify(['Galaxies', 'Amas ouverts', 'Amas globulaires', 'Nébuleuses larges']), owned: 1, is_default: 1 },
      { id: 'filter_l_ultimate', name: 'L-Ultimate', brand: 'Optolong', category: 'dualband', bandwidth_nm: 3, peak_transmission: 0.90, center_wavelength_nm: 500, sky_suppression: 0.95, moon_compatible: 1, color: '#7C4DFF', description: 'Dual-3nm Hα + OIII filter. Blocking >OD4.', use_cases: JSON.stringify(['Nébuleuses Hα/OIII', 'Sous Lune', 'Pollution urbaine', 'Anti-halos']), recommended_targets: JSON.stringify(['Nébuleuses émission', 'Nébuleuses planétaires', 'Rémanents supernovae']), owned: 1, is_default: 1 },
      { id: 'filter_lps_d2', name: 'LPS-D2', brand: 'IDAS', category: 'anti_pollution', bandwidth_nm: 69, peak_transmission: 0.975, center_wavelength_nm: 525, sky_suppression: 0.85, moon_compatible: 0, color: '#FF9800', description: 'IDAS light pollution suppression filter.', use_cases: JSON.stringify(['Pollution urbaine', 'Banlieue', 'Nuits claires', 'Galaxies sous pollution']), recommended_targets: JSON.stringify(['Galaxies', 'Nébuleuses', 'Amas', 'Amas ouverts']), owned: 1, is_default: 0 },
      { id: 'filter_ha', name: 'Hα 7nm', brand: 'ZWO', category: 'narrowband', bandwidth_nm: 7, peak_transmission: 0.90, center_wavelength_nm: 656.3, sky_suppression: 0.95, moon_compatible: 1, color: '#F44336', description: 'Narrowband Hydrogen-alpha filter.', use_cases: JSON.stringify(['Nébuleuses Hα', 'Sous Lune', 'Bi-color', 'Tri-color']), recommended_targets: JSON.stringify(['Nébuleuses émission', 'Rémanents supernovae']), owned: 0, is_default: 1 },
      { id: 'filter_oiii', name: 'OIII 7nm', brand: 'ZWO', category: 'narrowband', bandwidth_nm: 7, peak_transmission: 0.90, center_wavelength_nm: 500.7, sky_suppression: 0.95, moon_compatible: 1, color: '#00BCD4', description: 'Narrowband Oxygen-III filter.', use_cases: JSON.stringify(['Nébuleuses OIII', 'Sous Lune', 'Bi-color', 'Tri-color']), recommended_targets: JSON.stringify(['Nébuleuses planétaires', 'Rémanents supernovae']), owned: 0, is_default: 1 },
      { id: 'filter_sii', name: 'SII 7nm', brand: 'ZWO', category: 'narrowband', bandwidth_nm: 7, peak_transmission: 0.85, center_wavelength_nm: 672.4, sky_suppression: 0.95, moon_compatible: 1, color: '#9C27B0', description: 'Narrowband Sulfur-II filter.', use_cases: JSON.stringify(['Nébuleuses SII', 'Sous Lune', 'Tri-color SHO']), recommended_targets: JSON.stringify(['Nébuleuses émission', 'Rémanents supernovae']), owned: 0, is_default: 1 },
      { id: 'filter_rgb', name: 'RGB', brand: 'Generic', category: 'broadband', bandwidth_nm: 350, peak_transmission: 0.95, center_wavelength_nm: 550, sky_suppression: 0.0, moon_compatible: 0, color: '#4CAF50', description: 'RGB color filter set for monochrome camera.', use_cases: JSON.stringify(['Galaxies', 'Nébuleuses en couleur', 'Amas']), recommended_targets: JSON.stringify(['Galaxies', 'Amas', 'Nébuleuses larges']), owned: 0, is_default: 0 },
      { id: 'filter_luminance', name: 'Luminance', brand: 'Generic', category: 'broadband', bandwidth_nm: 400, peak_transmission: 0.95, center_wavelength_nm: 550, sky_suppression: 0.0, moon_compatible: 0, color: '#E0E0E0', description: 'Broadband luminance filter for LRGB imaging.', use_cases: JSON.stringify(['Luminance LRGB', 'Nuits sans Lune']), recommended_targets: JSON.stringify(['Galaxies', 'Amas', 'Nébuleuses larges']), owned: 0, is_default: 0 },
    ];
    const adminUser = users.find((u: any) => u.is_admin) || users[0];
    const insertStmt = await db.prepare('INSERT INTO apls_filters (id, user_id, name, brand, category, bandwidth_nm, peak_transmission, center_wavelength_nm, sky_suppression, moon_compatible, color, description, use_cases, recommended_targets, owned, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING');
    for (const f of defaultFilters) {
      insertStmt.run(f.id, adminUser.id, f.name, f.brand, f.category, f.bandwidth_nm, f.peak_transmission, f.center_wavelength_nm, f.sky_suppression, f.moon_compatible, f.color, f.description, f.use_cases, f.recommended_targets, f.owned, f.is_default);
    }
    console.log(`[Seed] Inserted ${defaultFilters.length} default filters for user ${adminUser.id}`);
  }
} catch (err) {
  console.error('[Seed] Failed to seed default filters:', err);
}

// =====================
// ANALYTICS / PAGE VIEWS
// =====================

// Track a page view (public, no auth required)
app.post('/api/analytics/track', async (c) => {
  const { path: pagePath, referrer, sessionId } = await c.req.json();
  if (!pagePath || typeof pagePath !== 'string') return c.json({ error: 'path required' }, 400);
  // Sanitize: strip query params, limit length
  const cleanPath = pagePath.split('?')[0].slice(0, 200);
  const cleanReferrer = (referrer || '').slice(0, 500);
  const cleanSession = (sessionId || '').slice(0, 100);
  const ua = (c.req.header('User-Agent') || '').slice(0, 500);

  // Simple bot filter: skip common bots
  if (/bot|crawl|spider|slurp|mediapartners/i.test(ua)) return c.json({ ok: true, bot: true });

  await db.prepare(`INSERT INTO page_views (path, referrer, user_agent, session_id, created_at) VALUES (?, ?, ?, ?, NOW())`)
    .run(cleanPath, cleanReferrer, ua, cleanSession);
  return c.json({ ok: true });
});

// Get analytics summary (admin only)
app.get('/api/analytics/stats', auth, async (c) => {
  const authUser = c.get('user') as AuthUser;
  if (!authUser.isAdmin) return c.json({ error: 'Admin required' }, 403);

  const days = parseInt(c.req.query('days') || '30');

  // Total views, unique sessions, top pages
  const totalViews = (await db.prepare(`SELECT COUNT(*) as count FROM page_views WHERE created_at >= NOW() - ?::interval`).get(`${days} days`) as any).count;
  const uniqueSessions = (await db.prepare(`SELECT COUNT(DISTINCT session_id) as count FROM page_views WHERE created_at >= NOW() - ?::interval`).get(`${days} days`) as any).count;
  const uniquePages = (await db.prepare(`SELECT COUNT(DISTINCT path) as count FROM page_views WHERE created_at >= NOW() - ?::interval`).get(`${days} days`) as any).count;

  // Top pages
  const topPages = await db.prepare(`
    SELECT path, COUNT(*) as views, COUNT(DISTINCT session_id) as unique_visitors
    FROM page_views
    WHERE created_at >= NOW() - ?::interval
    GROUP BY path
    ORDER BY views DESC
    LIMIT 20
  `).all(`-${days} days`);

  // Top referrers
  const topReferrers = await db.prepare(`
    SELECT referrer, COUNT(*) as count
    FROM page_views
    WHERE created_at >= NOW() - ?::interval AND referrer != ''
    GROUP BY referrer
    ORDER BY count DESC
    LIMIT 10
  `).all(`-${days} days`);

  // Views today
  const todayViews = (await db.prepare(`SELECT COUNT(*) as count FROM page_views WHERE created_at::date = CURRENT_DATE`).get() as any).count;
  const todaySessions = (await db.prepare(`SELECT COUNT(DISTINCT session_id) as count FROM page_views WHERE created_at::date = CURRENT_DATE`).get() as any).count;

  return c.json({
    days,
    totalViews,
    uniqueSessions,
    uniquePages,
    todayViews,
    todaySessions,
    topPages,
    topReferrers,
  });
});

// Get daily timeline (admin only)
app.get('/api/analytics/timeline', auth, async (c) => {
  const authUser = c.get('user') as AuthUser;
  if (!authUser.isAdmin) return c.json({ error: 'Admin required' }, 403);

  const days = parseInt(c.req.query('days') || '30');

  const timeline = await db.prepare(`
    SELECT date(created_at) as date, COUNT(*) as views, COUNT(DISTINCT session_id) as unique_visitors
    FROM page_views
    WHERE created_at >= NOW() - ?::interval
    GROUP BY date(created_at)
    ORDER BY date ASC
  `).all(`-${days} days`);

  return c.json(timeline);
});

// =====================
// PHD2 LOG ANALYSIS
// =====================

// DB table for saved PHD2 sessions
async function initPhd2Table() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS phd2_sessions (
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
    );
  `);
  // Migration: add project_id column if it doesn't exist
  try {
    await db.exec('ALTER TABLE phd2_sessions ADD COLUMN project_id TEXT');
  } catch {}
  // Index for project queries
  await db.exec('CREATE INDEX IF NOT EXISTS idx_phd2_sessions_project ON phd2_sessions(project_id)');
}
initPhd2Table().catch(console.error);

// Save PHD2 sessions
app.post('/api/phd2/sessions', async (c) => {
  try {
    const { sessions, analyses, filename, raw_log } = await c.req.json();
    if (!sessions || !Array.isArray(sessions)) {
      return c.json({ error: 'sessions array required' }, 400);
    }

    const saved = [];
    for (let i = 0; i < sessions.length; i++) {
      const s = sessions[i];
      const a = analyses?.[i] || {};
      const id = `phd2_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 8)}`;

      await db.prepare(`
        INSERT INTO phd2_sessions
        (id, filename, session_index, start_time, end_time, duration_seconds,
         camera, exposure_ms, focal_length_mm, pixel_scale, mount, frame_count,
         rms_total_arcsec, rms_ra_arcsec, rms_dec_arcsec, peak_ra_arcsec, peak_dec_arcsec,
         mean_snr, mean_star_mass, dither_count, star_lost_count, settling_failed_count,
         raw_log, analysis_json, project_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (id) DO UPDATE SET
         filename = EXCLUDED.filename, session_index = EXCLUDED.session_index,
         start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time,
         duration_seconds = EXCLUDED.duration_seconds, camera = EXCLUDED.camera,
         exposure_ms = EXCLUDED.exposure_ms, focal_length_mm = EXCLUDED.focal_length_mm,
         pixel_scale = EXCLUDED.pixel_scale, mount = EXCLUDED.mount,
         frame_count = EXCLUDED.frame_count, rms_total_arcsec = EXCLUDED.rms_total_arcsec,
         rms_ra_arcsec = EXCLUDED.rms_ra_arcsec, rms_dec_arcsec = EXCLUDED.rms_dec_arcsec,
         peak_ra_arcsec = EXCLUDED.peak_ra_arcsec, peak_dec_arcsec = EXCLUDED.peak_dec_arcsec,
         mean_snr = EXCLUDED.mean_snr, mean_star_mass = EXCLUDED.mean_star_mass,
         dither_count = EXCLUDED.dither_count, star_lost_count = EXCLUDED.star_lost_count,
         settling_failed_count = EXCLUDED.settling_failed_count,
         raw_log = EXCLUDED.raw_log, analysis_json = EXCLUDED.analysis_json,
         project_id = EXCLUDED.project_id
      `).run(
        id, filename || '', s.index ?? i, s.start_time || '', s.end_time || '', s.duration_seconds || 0,
        s.camera || '', s.exposure_ms || 0, s.focal_length_mm || 0, s.pixel_scale || 0, s.mount || '', s.frame_count || 0,
        a.rms_total_arcsec || 0, a.rms_ra_arcsec || 0, a.rms_dec_arcsec || 0, a.peak_ra_arcsec || 0, a.peak_dec_arcsec || 0,
        a.mean_snr || 0, a.mean_star_mass || 0, a.dither_count || 0, a.star_lost_count || 0, a.settling_failed_count || 0,
        raw_log || '', JSON.stringify(a), s.project_id || null
      );

      saved.push({ id, ...s, analysis: a });
    }

    return c.json({ saved: saved.length, sessions: saved });
  } catch (err: any) {
    console.error('PHD2 save error:', err);
    return c.json({ error: 'Failed to save sessions' }, 500);
  }
});

// List saved PHD2 sessions
app.get('/api/phd2/sessions', async (c) => {
  try {
    const sessions = await db.prepare(`
      SELECT id, filename, session_index, start_time, end_time, duration_seconds,
             camera, exposure_ms, focal_length_mm, pixel_scale, mount, frame_count,
             rms_total_arcsec, rms_ra_arcsec, rms_dec_arcsec, peak_ra_arcsec, peak_dec_arcsec,
             mean_snr, mean_star_mass, dither_count, star_lost_count, settling_failed_count,
             project_id, created_at
      FROM phd2_sessions ORDER BY start_time DESC
    `).all();
    return c.json({ sessions });
  } catch (err: any) {
    console.error('PHD2 list error:', err);
    return c.json({ error: 'Failed to list sessions' }, 500);
  }
});

// Link a PHD2 session to a project
app.put('/api/phd2/sessions/:id/link', async (c) => {
  try {
    const id = c.req.param('id');
    const { project_id } = await c.req.json();
    const result = await db.prepare('UPDATE phd2_sessions SET project_id = ? WHERE id = ?').run(project_id || null, id);
    if (result.changes === 0) {
      return c.json({ error: 'Session not found' }, 404);
    }
    return c.json({ linked: true, project_id: project_id || null });
  } catch (err: any) {
    console.error('PHD2 link error:', err);
    return c.json({ error: 'Failed to link session' }, 500);
  }
});

// Get guiding performance aggregated for a project
app.get('/api/apls/projects/:id/guiding', async (c) => {
  try {
    const projectId = c.req.param('id');
    const sessions = await db.prepare(`
      SELECT id, filename, session_index, start_time, end_time, duration_seconds,
             camera, exposure_ms, focal_length_mm, pixel_scale, mount, frame_count,
             rms_total_arcsec, rms_ra_arcsec, rms_dec_arcsec, peak_ra_arcsec, peak_dec_arcsec,
             mean_snr, mean_star_mass, dither_count, star_lost_count, settling_failed_count,
             created_at
      FROM phd2_sessions WHERE project_id = ? ORDER BY start_time ASC
    `).all(projectId);

    if (sessions.length === 0) {
      return c.json({ hasData: false, sessions: [] });
    }

    const totalFrames = sessions.reduce((sum: number, s: any) => sum + s.frame_count, 0);
    const totalDuration = sessions.reduce((sum: number, s: any) => sum + s.duration_seconds, 0);
    const avgRmsTotal = sessions.reduce((sum: number, s: any) => sum + s.rms_total_arcsec, 0) / sessions.length;
    const avgRmsRa = sessions.reduce((sum: number, s: any) => sum + s.rms_ra_arcsec, 0) / sessions.length;
    const avgRmsDec = sessions.reduce((sum: number, s: any) => sum + s.rms_dec_arcsec, 0) / sessions.length;
    const avgSnr = sessions.reduce((sum: number, s: any) => sum + s.mean_snr, 0) / sessions.length;
    const totalDithers = sessions.reduce((sum: number, s: any) => sum + s.dither_count, 0);
    const totalStarLost = sessions.reduce((sum: number, s: any) => sum + s.star_lost_count, 0);
    const totalSettlingFailed = sessions.reduce((sum: number, s: any) => sum + s.settling_failed_count, 0);

    const bestSession: any = sessions.reduce((best: any, s: any) =>
      !best || s.rms_total_arcsec < best.rms_total_arcsec ? s : best, null);
    const worstSession: any = sessions.reduce((worst: any, s: any) =>
      !worst || s.rms_total_arcsec > worst.rms_total_arcsec ? s : worst, null);

    // RMS trend (by session, chronological)
    const rmsTrend = sessions.map((s: any) => ({
      session_id: s.id,
      start_time: s.start_time,
      rms_total: s.rms_total_arcsec,
      rms_ra: s.rms_ra_arcsec,
      rms_dec: s.rms_dec_arcsec,
    }));

    return c.json({
      hasData: true,
      sessionCount: sessions.length,
      totalFrames,
      totalDurationSeconds: totalDuration,
      avgRmsTotal,
      avgRmsRa,
      avgRmsDec,
      avgSnr,
      totalDithers,
      totalStarLost,
      totalSettlingFailed,
      bestSession: bestSession ? {
        id: bestSession.id, start_time: bestSession.start_time,
        rms_total_arcsec: bestSession.rms_total_arcsec, filename: bestSession.filename,
      } : null,
      worstSession: worstSession ? {
        id: worstSession.id, start_time: worstSession.start_time,
        rms_total_arcsec: worstSession.rms_total_arcsec, filename: worstSession.filename,
      } : null,
      rmsTrend,
      sessions,
    });
  } catch (err: any) {
    console.error('Guiding performance error:', err);
    return c.json({ error: 'Failed to get guiding performance' }, 500);
  }
});

// Delete a PHD2 session
app.delete('/api/phd2/sessions/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const result = await db.prepare('DELETE FROM phd2_sessions WHERE id = ?').run(id);
    if (result.changes === 0) {
      return c.json({ error: 'Session not found' }, 404);
    }
    return c.json({ deleted: true });
  } catch (err: any) {
    console.error('PHD2 delete error:', err);
    return c.json({ error: 'Failed to delete session' }, 500);
  }
});

// Get a single PHD2 session with full analysis
app.get('/api/phd2/sessions/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const row: any = await db.prepare('SELECT * FROM phd2_sessions WHERE id = ?').get(id);
    if (!row) {
      return c.json({ error: 'Session not found' }, 404);
    }
    // Parse analysis_json
    let analysis = null;
    if (row.analysis_json) {
      try { analysis = JSON.parse(row.analysis_json); } catch {}
    }
    return c.json({ session: row, analysis });
  } catch (err: any) {
    console.error('PHD2 get session error:', err);
    return c.json({ error: 'Failed to get session' }, 500);
  }
});

// Get PHD2 global stats
app.get('/api/phd2/stats', async (c) => {
  try {
    const stats = await db.prepare(`
      SELECT
        COUNT(*) as total_sessions,
        SUM(frame_count) as total_frames,
        SUM(duration_seconds) as total_duration_seconds,
        AVG(rms_total_arcsec) as avg_rms_total_arcsec,
        AVG(rms_ra_arcsec) as avg_rms_ra_arcsec,
        AVG(rms_dec_arcsec) as avg_rms_dec_arcsec,
        AVG(mean_snr) as avg_snr,
        SUM(dither_count) as total_dithers,
        SUM(star_lost_count) as total_star_lost,
        SUM(settling_failed_count) as total_settle_fail,
        MIN(rms_total_arcsec) as best_rms_total_arcsec,
        MAX(mean_snr) as max_snr,
        AVG(mean_star_mass) as avg_star_mass
      FROM phd2_sessions
    `).get();

    const bestSession = await db.prepare(`
      SELECT id, start_time, camera, rms_total_arcsec, mean_snr
      FROM phd2_sessions ORDER BY rms_total_arcsec ASC LIMIT 1
    `).get();

    return c.json({ ...(stats as Record<string, any>), best_session: bestSession || null });
  } catch (err: any) {
    console.error('PHD2 stats error:', err);
    return c.json({ error: 'Failed to get stats' }, 500);
  }
});

app.post('/api/phd2/analyze', async (c) => {
  try {
    const { content } = await c.req.json();
    if (!content || typeof content !== 'string') {
      return c.json({ error: 'Log content required' }, 400);
    }
    if (content.length > 50 * 1024 * 1024) { // 50MB max
      return c.json({ error: 'Log file too large (max 50MB)' }, 413);
    }

    const { execFileSync } = await import('child_process');
    const scriptPath = join(process.cwd(), '..', 'skills', 'phd2-analysis', 'phd2_parser.py');
    
    // Write content to temp file to avoid shell escaping issues
    const tmpFile = join(process.cwd(), 'tmp_phd2_log_' + Date.now() + '.txt');
    writeFileSync(tmpFile, content, 'utf-8');
    
    try {
      const result = execFileSync('python3', [scriptPath, tmpFile], {
        maxBuffer: 50 * 1024 * 1024,
        timeout: 30000,
        encoding: 'utf-8',
      });
      
      // Clean up temp file
      try { unlinkSync(tmpFile); } catch {}
      
      return c.json(JSON.parse(result));
    } catch (err: any) {
      // Clean up temp file on error
      try { unlinkSync(tmpFile); } catch {}
      
      if (err.stderr) {
        console.error('PHD2 parser error:', err.stderr.toString());
      }
      return c.json({ error: 'Failed to parse PHD2 log', details: err.stderr?.toString()?.slice(0, 500) }, 500);
    }
  } catch (err) {
    return c.json({ error: 'Invalid request' }, 400);
  }
});

// =====================
// IMAGE RESIZE PROXY
// =====================

app.get('/api/images/resize', async (c) => {
  const url = c.req.query('url');
  const width = Math.min(parseInt(c.req.query('width') || '800'), 2000);  // Cap at 2000px
  const height = Math.min(parseInt(c.req.query('height') || '0'), 2000);
  const quality = Math.min(parseInt(c.req.query('quality') || '80'), 100);
  const format = c.req.query('format') === 'webp' ? 'webp' : 'jpeg';

  if (!url || !url.startsWith('/uploads/')) {
    return c.json({ error: 'Invalid URL' }, 400);
  }

  const filepath = join(UPLOAD_DIR, basename(url));
  if (!existsSync(filepath)) {
    return c.json({ error: 'Image not found' }, 404);
  }

  // Cache key for resized images
  const cacheDir = join(UPLOAD_DIR, '.resized');
  if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });
  const ext = format === 'webp' ? 'webp' : 'jpg';
  const cacheKey = `${basename(url, extname(url))}_${width}x${height}_q${quality}.${ext}`;
  const cachePath = join(cacheDir, cacheKey);

  // Serve from cache if exists and original hasn't changed
  if (existsSync(cachePath)) {
    const origStat = statSync(filepath);
    const cacheStat = statSync(cachePath);
    if (cacheStat.mtimeMs > origStat.mtimeMs) {
      const contentType = format === 'webp' ? 'image/webp' : 'image/jpeg';
      return new Response(readFileSync(cachePath), {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Vary': 'Accept',
        },
      });
    }
  }

  try {
    const sharp = await import('sharp');
    const resizeOpts: any = { width };
    if (height > 0) resizeOpts.height = height;
    resizeOpts.fit = 'inside';
    resizeOpts.withoutEnlargement = true;

    let pipeline = sharp.default(filepath).resize(resizeOpts).rotate(); // auto-rotate based on EXIF
    if (format === 'webp') {
      pipeline = pipeline.webp({ quality });
    } else {
      pipeline = pipeline.jpeg({ quality });
    }

    const buffer = await pipeline.toBuffer();

    // Cache the result
    writeFileSync(cachePath, buffer);

    const contentType = format === 'webp' ? 'image/webp' : 'image/jpeg';
    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Vary': 'Accept',
      },
    });
  } catch (err) {
    console.error('Image resize error:', err);
    // Fallback: serve original
    const stream = createReadStream(filepath);
    return new Response(stream as any, {
      headers: { 'Content-Type': 'image/webp' },
    });
  }
});

// =====================
// RAG QUERY (Astrophotography Knowledge Base)
// =====================

app.post('/api/rag-query', async (c) => {
  try {
    const { question, history } = await c.req.json();
    if (!question?.trim()) {
      return c.json({ error: 'Question required' }, 400);
    }
    const res = await fetch('http://localhost:5090/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, history: history || [] }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error('[RAG Error]', err);
      return c.json({ error: 'Knowledge base query failed' }, 502);
    }
    const data = await res.json();
    return c.json(data);
  } catch (err: any) {
    console.error('[RAG Error]', err.message);
    return c.json({ error: 'Knowledge base unavailable' }, 503);
  }
});

// =====================

// Initialize PostgreSQL schema then start server
db.initSchema().then(() => {
  const server = serve({ fetch: app.fetch, port: PORT });
  // Increase timeouts for large file uploads (FITS/XISF can be 300MB+)
  if ('timeout' in server) {
    (server as any).timeout = 600000; // 10 minutes
    (server as any).keepAliveTimeout = 600000; // 10 minutes
    (server as any).requestTimeout = 600000; // 10 minutes (Node 18+)
    (server as any).headersTimeout = 600000; // 10 minutes (Node 18+)
  }
  console.log(`🚀 AstroCapture API running on port ${PORT}`);
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
