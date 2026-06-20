// ============================================================================
// PROJECT SERVICE — CRUD + Observations + Exposure Planning
// API-first with localStorage fallback
// ============================================================================

import { Project, CreateProjectData, AddObservationData, ProjectObservation, ProjectExposurePlan, SNRTarget } from '../types/project';
import { AstroFilter } from './filterService';
import { fetchFilters, getFilterExposureFactor, getMoonBenefitFactor } from './filterService';

const API_BASE = '/api/apls/projects';

// ─── Auth token helper ────────────────────────────────────────────────────

function getAuthToken(): string | null {
  return localStorage.getItem('astrosuite_token');
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || `API error: ${res.status}`);
  }
  return res.json();
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function generateId(): string {
  return `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function generateObsId(): string {
  return `obs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── SNR / Exposure Calculator — Physical Pipeline (v2 — corrected) ──────────
//
// Based on the APLS v3 specification, corrected for object SNR:
//   Step 1: Sky flux          Φ_sky = 10^(0.4 × (M_zero - m_sky))
//   Step 2: Object flux        Φ_obj = 10^(0.4 × (M_zero - m_obj))
//   Step 3: Aperture          A = π × (D/2000)²  [m²]
//   Step 4: Sampling          sampling = (206.265 × pixelSize_μm) / focalLength_mm  [arcsec/px]
//   Step 5: Sky e- rate       B_sky = Φ_sky × A × sampling² × QE × τ_sky
//   Step 6: Object e- rate     S_obj = Φ_obj × A × sampling² × QE × τ_signal
//   Step 7: Optimal sub-exp   t_opt = k × RN² / B_sky   (k=5 conservative, Swainson)
//   Step 8: SNR per sub       snrPerSub = (S_obj × t_sub) / sqrt((S_obj + B_sky) × t_sub + RN²)
//   Step 9: Num subs          N = (SNR_target / snrPerSub)²
//
// M_zero = 26.59 (V-band zero-point flux in mag/arcsec²)
// ──────────────────────────────────────────────────────────────────────────────

const M_ZERO = 26.59; // V-band zero-point (mag/arcsec²)
const K_CONSERVATIVE = 5; // Swainson k-factor (conservative)

interface ExposureCalcParams {
  targetMagnitude: number | null;
  targetSizeArcmin: number | null;
  surfaceBrightness: number | null;  // mag/arcsec² — used when sizeArcmin is null
  filter: string;
  focalLength: number;
  aperture: number;
  pixelSize: number;      // μm
  readNoise: number;      // e-
  quantumEfficiency: number; // 0-1
  moonIllumination: number;  // 0-1
  avgSeeing: number;       // arcsec
  bortle: number;         // 1-9
  snrTarget: SNRTarget;
  fullWellDepth?: number;  // e- (camera full well capacity)
  filterData?: AstroFilter;
}

/**
 * Convert Bortle scale to approximate SQM (sky magnitude per arcsec²)
 */
function bortleToSQM(bortle: number): number {
  const table: Record<number, number> = {
    1: 22.0, 2: 21.5, 3: 21.0, 4: 20.5, 5: 19.5,
    6: 18.5, 7: 18.0, 8: 17.0, 9: 16.0,
  };
  return table[Math.min(9, Math.max(1, Math.round(bortle)))] ?? 20.5;
}

/**
 * Physical pipeline: Calculate optimal sub-exposure and total integration time
 * for a given SNR target.
 */
export function calculateExposurePlan(params: ExposureCalcParams): ProjectExposurePlan[] {
  const {
    targetMagnitude,
    targetSizeArcmin,
    surfaceBrightness,
    filter,
    focalLength,
    aperture,
    pixelSize,
    readNoise,
    quantumEfficiency,
    moonIllumination,
    avgSeeing = 2.5,
    bortle = 4,
    snrTarget = 30,
    filterData,
  } = params;

  const rawMag = targetMagnitude ?? 10;

  // Convert integrated magnitude to surface brightness (mag/arcsec²)
  // Extended objects have integrated magnitudes that must be converted.
  // Priority: surfaceBrightness > sizeArcmin conversion > fallback assumption
  let mag: number;
  if (surfaceBrightness != null && surfaceBrightness > 0) {
    mag = surfaceBrightness;
  } else if (targetSizeArcmin && targetSizeArcmin > 0) {
    // Convert integrated magnitude to surface brightness using object size
    const surfaceArcsec2 = Math.PI * Math.pow((targetSizeArcmin * 60) / 2, 2);
    mag = rawMag + 2.5 * Math.log10(surfaceArcsec2);
  } else {
    // No size info and no surface brightness — assume moderate surface brightness
    mag = Math.max(rawMag + 5, 18);
  }

  // ─── Filter-aware surface brightness correction ───────────────────────────
  // V-band surface brightness is NOT the right metric for narrowband/dual-band.
  // Emission nebulae have concentrated line emission that is MUCH brighter than
  // their V-band surface brightness. But we must target the faint outer structures.
  //
  // Strategy: For narrowband/dual-band, we keep the V-band SB as the reference
  // for the FAINT structures (they're roughly at the V-band SB level even in narrowband),
  // and let the filter model (tauSignal vs tauSky) handle the brightness advantage.
  // The key insight: narrowband filters have tauSignal ≈ 0.9 but tauSky ≈ 0.02-0.08,
  // giving a huge SNR advantage per pixel that naturally produces shorter exposures.
  //
  // We only apply a small correction for broadband LP filters:
  const isNarrowHa = filter === 'Ha';
  const isNarrowOIII = filter === 'OIII';
  const isNarrowSII = filter === 'SII';
  const isNarrowband = isNarrowHa || isNarrowOIII || isNarrowSII;
  const isDualBand = ['L_Ultimate', 'L_Extreme'].includes(filter);
  const isAntiPollution = ['LPS_D2', 'IDAS_LPS'].includes(filter);

  // No correction for narrowband/dual-band — the tauSignal/tauSky model handles it
  // Small correction for LP filters (they slightly improve contrast)
  if (isAntiPollution) {
    mag -= 0.5;
  }

  // Step 1: Sky flux and object flux
  let mSky = bortleToSQM(bortle);

  // Moon impact: LP filters partially reject moonlight, narrowband nearly immune
  if (isNarrowband) {
    mSky -= moonIllumination * 0.2;
  } else if (isDualBand) {
    mSky -= moonIllumination * 0.8;
  } else {
    mSky -= moonIllumination * 1.5;
  }

  // Filter model: separate signal transmission (tauSignal) from sky transmission (tauSky)
  // For narrowband/dual-band filters, the object signal passes at peak transmission
  // but the sky background is suppressed — these are DIFFERENT effective transmissions
  let tauSignal: number; // transmission for object signal
  let tauSky: number;    // transmission for sky background
  
  if (filterData) {
    // Use real filter specs from user's collection
    const cat = filterData.category || 'broadband';
    const pt = filterData.peakTransmission;
    const ss = filterData.skySuppression;
    
    if (cat === 'narrowband') {
      // Ha/OIII/SII: object signal at peak transmission, sky heavily suppressed
      tauSignal = pt;
      tauSky = pt * (1 - ss); // sky only passes through the narrow band
    } else if (cat === 'dualband') {
      // L-Ultimate type: object signal passes at peak on the full covered bandwidth
      // (Ha line, OIII line, AND continuous emission between them)
      tauSignal = pt;
      // Sky: only passes through the narrow Ha/OIII windows, rest is blocked
      // Effective sky bandwidth is ~2 × 3nm = 6nm out of ~300nm total → ~2% passthrough
      // Plus slight continuous leak between the lines
      tauSky = pt * (1 - ss) * 0.08; // dual-band lets ~8% of broadband sky through
    } else if (cat === 'anti_pollution') {
      // LPS-D2 type: selective filter — passes object signal well on target lines
      // but blocks specific emission lines (Na, Hg) from light pollution
      tauSignal = pt; // object signal barely attenuated on astrophysically relevant bands
      tauSky = pt * (1 - ss * 0.6); // sky suppression is selective, not uniform
    } else {
      // Broadband (UV/IR Cut, Luminance): minimal sky suppression
      tauSignal = pt;
      tauSky = pt; // no sky suppression effect
    }
  } else {
    // Fallbacks without filterData
    const FILTER_TAUS: Record<string, { signal: number; sky: number }> = {
      L_Ultimate: { signal: 0.90, sky: 0.08 },
      LPS_D2:     { signal: 0.90, sky: 0.45 },
      UV_IR_Cut:  { signal: 0.97, sky: 0.97 },
      Ha:         { signal: 0.90, sky: 0.02 },
      OIII:       { signal: 0.85, sky: 0.02 },
      SII:        { signal: 0.80, sky: 0.02 },
      RGB:        { signal: 0.85, sky: 0.85 },
      Luminance:  { signal: 0.95, sky: 0.95 },
    };
    const ft = FILTER_TAUS[filter] ?? { signal: 0.85, sky: 0.85 };
    tauSignal = ft.signal;
    tauSky = ft.sky;
  }

  // Object flux (using the mean surface brightness directly — "Main Extent" model)
  const structureOffset = 0; // No artificial offset — use mean SB directly (Main Extent)
  const magForSignal = mag; // Mean SB = Main Extent
  const phiSky = Math.pow(10, 0.4 * (M_ZERO - mSky));
  const phiObj = Math.pow(10, 0.4 * (M_ZERO - magForSignal));

  // Step 2: Aperture effective area
  const A = Math.PI * Math.pow(aperture / 2000, 2); // m²

  // Step 3: Sampling (arcsec/pixel) — replaces p² (meters) with sampling² (arcsec²)
  const sampling = (206.265 * pixelSize) / focalLength; // arcsec/pixel
  const samplingSq = sampling * sampling; // arcsec²/pixel

  // Step 4: Dark current
  const darkCurrent = 0.001; // e-/px/s (cooled sensors)

  // Step 5: Sky electron rate (e-/px/s) — uses sampling² and tauSky
  const Bsky = phiSky * A * samplingSq * quantumEfficiency * tauSky + darkCurrent;

  // Step 6: Object signal electron rate (e-/px/s) — uses sampling² and tauSignal
  const Sobj = phiObj * A * samplingSq * quantumEfficiency * tauSignal;

  // Step 7: Optimal sub-exposure (Swainson equation)
  const RN = readNoise;
  const tOpt = K_CONSERVATIVE * RN * RN / Bsky;
  const tSub = Math.max(30, Math.min(600, Math.round(tOpt / 10) * 10));

  // Step 8: SNR per sub on the OBJECT (not sky)
  // signalPerSub = S_obj × t_sub
  // noisePerSub = sqrt((S_obj + B_sky) × t_sub + RN²)
  // snrPerSub = signalPerSub / noisePerSub
  const signalPerSub = Sobj * tSub;
  const noisePerSub = Math.sqrt((Sobj + Bsky) * tSub + RN * RN);
  const snrPerSub = noisePerSub > 0 ? signalPerSub / noisePerSub : 0;

  // Step 9: Number of subs to reach target SNR
  // N = (SNR_target / snrPerSub)²
  const N = Math.max(1, Math.ceil(snrPerSub > 0 ? Math.pow(snrTarget / snrPerSub, 2) : 1));
  const totalExposureTime = N * tSub;

  // Actual SNR achieved (cumulative on object)
  // SNR_total = sqrt(N) × snrPerSub
  const actualSNR = snrPerSub * Math.sqrt(N);
  const snrLabel = actualSNR >= 80 ? 'Exceptional' : actualSNR >= 50 ? 'Excellent' : actualSNR >= 25 ? 'Good' : actualSNR >= 12 ? 'Fair' : 'Low';

  // ─── Operating Band (Cosgrove's method) ──────────────────────────────
  // Lower bound: read noise < 10% of total noise → tSub where RN² < 0.1 × (Bsky × tSub + RN²)
  // → tSub > 9 × RN² / Bsky
  const tSubMin = Bsky > 0 ? Math.max(10, Math.ceil(9 * RN * RN / Bsky / 5) * 5) : 10; // round to 5s
  // Upper bound: sky + bright stars should not exceed 50% of full well
  // Assume well depth from QE (typical CMOS: 50-100ke-), brightest star mag 4
  const wellDepth = params.fullWellDepth || (quantumEfficiency > 0.7 ? 50000 : 100000); // e-
  const brightStarMag = 4; // typical bright star in field
  const brightStarFlux = Math.pow(10, 0.4 * (M_ZERO - brightStarMag + (isNarrowband ? 2 : 0)));
  const Sbright = brightStarFlux * A * Math.pow((206.265 * pixelSize) / focalLength, 2) * quantumEfficiency * tauSignal;
  const skyPerPixel = Bsky * 600; // worst case: 600s sub
  const tSubMaxFromSaturation = Sbright > 0 ? Math.floor((wellDepth * 0.5 - skyPerPixel) / Sbright) : 600;
  const tSubMax = Math.max(tSubMin + 10, Math.min(600, tSubMaxFromSaturation)); // clamp 600s

  // Workflow overhead: dither + download + filter change ≈ 10-15s per sub
  const overheadPerSub = 12; // seconds
  const totalWithOverhead = totalExposureTime + N * overheadPerSub;

  return [{
    filter,
    subExposure: tSub,
    subCount: N,
    totalExposureTime,
    totalWithOverhead,
    subExposureMin: tSubMin,
    subExposureMax: tSubMax,
    snrEstimate: `${snrLabel} (SNR ~${actualSNR.toFixed(1)})`,
    snrValue: actualSNR,
    skyElectronRate: Bsky,
    objectElectronRate: Sobj,
    sampling: parseFloat(sampling.toFixed(2)),
    darkCurrent,
    tauSignal,
    tauSky,
  }];
}

export function calculateFullExposurePlan(
  params: ExposureCalcParams & { targetType: string }
): ProjectExposurePlan[] {
  const types = params.targetType?.split(',') || [];
  const plans: ProjectExposurePlan[] = [];

  plans.push(...calculateExposurePlan(params));

  const isNarrowband = types.some(t => ['neb', 'plnb', 'snrb'].includes(t));
  if (isNarrowband && params.filter !== 'Ha' && params.filter !== 'OIII' && params.filter !== 'SII') {
    for (const f of ['Ha', 'OIII', 'SII'] as const) {
      plans.push(...calculateExposurePlan({ ...params, filter: f }));
    }
  }

  return plans;
}

// ─── Project CRUD (API-first, localStorage fallback) ──────────────────────

export async function fetchProjects(): Promise<Project[]> {
  try {
    const data = await apiFetch<Project[]>('');
    const projects = Array.isArray(data) ? data : [];
    // Sync localStorage with server — server is source of truth
    saveLocalProjects(projects);
    return projects;
  } catch {
    return getLocalProjects();
  }
}

export async function fetchProject(id: string): Promise<Project | null> {
  try {
    return await apiFetch<Project>(`/${id}`);
  } catch {
    const projects = getLocalProjects();
    return projects.find(p => p.id === id) || null;
  }
}

export async function createProject(data: CreateProjectData): Promise<Project> {
  const rigInfo = data.rigId ? await getRigById(data.rigId) : await getActiveRig();

  // Determine Bortle from location
  const bortle = data.locationSource === 'pradelles' ? 2 : 4;

  const exposurePlan = calculateExposurePlan({
    targetMagnitude: data.targetMagnitude,
    targetSizeArcmin: data.targetSizeArcmin,
    surfaceBrightness: data.surfaceBrightness ?? null,
    filter: data.primaryFilter,
    focalLength: rigInfo?.focalLength ?? 800,
    aperture: rigInfo?.aperture ?? 200,
    pixelSize: rigInfo?.pixelSize ?? 3.76,
    readNoise: rigInfo?.readNoise ?? 1.5,
    quantumEfficiency: rigInfo?.quantumEfficiency ?? 0.8,
    moonIllumination: await getCurrentMoonIllumination(data.lat, data.lon),
    avgSeeing: 2.5,
    bortle,
    snrTarget: data.snrTarget ?? 30,
  });

  const totalPlannedHours = exposurePlan.reduce((sum, p) => sum + p.totalExposureTime, 0) / 3600;

  const project: Project = {
    id: generateId(),
    title: data.title,
    status: 'planning',
    targetId: data.targetId,
    targetName: data.targetName,
    targetType: data.targetType,
    targetRa: data.targetRa,
    targetDec: data.targetDec,
    targetMagnitude: data.targetMagnitude,
    targetSizeArcmin: data.targetSizeArcmin,
    surfaceBrightness: data.surfaceBrightness ?? null,
    targetImageUrl: data.targetImageUrl,
    locationSource: data.locationSource,
    lat: data.lat,
    lon: data.lon,
    rigId: rigInfo?.id ?? null,
    rigName: rigInfo?.name ?? null,
    focalLength: rigInfo?.focalLength ?? null,
    aperture: rigInfo?.aperture ?? null,
    pixelSize: rigInfo?.pixelSize ?? null,
    sensorWidth: rigInfo?.sensorWidth ?? null,
    sensorHeight: rigInfo?.sensorHeight ?? null,
    primaryFilter: data.primaryFilter,
    snrTarget: data.snrTarget ?? 30,
    exposurePlan,
    totalPlannedHours,
    observations: [],
    totalExposureSeconds: 0,
    completionPercent: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    return await apiFetch<Project>('', {
      method: 'POST',
      body: JSON.stringify(project),
    });
  } catch {
    return saveLocalProject(project);
  }
}

export async function updateProject(id: string, updates: Partial<Project>): Promise<Project> {
  try {
    return await apiFetch<Project>(`/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  } catch {
    return updateLocalProject(id, updates);
  }
}

export async function deleteProject(id: string): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}),
      },
    });
    if (!res.ok) {
      throw new Error(`Delete failed: ${res.status}`);
    }
    // Also remove from localStorage to prevent ghost resurrection
    deleteLocalProject(id);
  } catch {
    deleteLocalProject(id);
  }
}

export async function addObservation(projectId: string, obs: AddObservationData): Promise<Project> {
  const observation: ProjectObservation = {
    id: generateObsId(),
    ...obs,
    seeing: obs.seeing ?? null,
    guidingRms: obs.guidingRms ?? null,
    moonIllumination: obs.moonIllumination ?? null,
    notes: obs.notes ?? '',
    createdAt: new Date().toISOString(),
  };

  try {
    // POST the observation, then re-fetch the project to get updated progress
    await apiFetch<any>(`/${projectId}/observations`, {
      method: 'POST',
      body: JSON.stringify(observation),
    });
    return await apiFetch<Project>(`/${projectId}`);
  } catch {
    return addLocalObservation(projectId, observation);
  }
}

export async function deleteObservation(projectId: string, observationId: string): Promise<Project> {
  try {
    await apiFetch<any>(`/${projectId}/observations/${observationId}`, {
      method: 'DELETE',
    });
    return await apiFetch<Project>(`/${projectId}`);
  } catch {
    return deleteLocalObservation(projectId, observationId);
  }
}

// ─── Sync: push localStorage → server, return merged ─────────────────────

export async function syncProjectsToServer(): Promise<Project[]> {
  const localProjects = getLocalProjects();
  try {
    const result = await apiFetch<{ projects: Project[] }>('/../sync', {
      method: 'POST',
      body: JSON.stringify({ projects: localProjects }),
    });
    if (result.projects && result.projects.length > 0) {
      saveLocalProjects(result.projects);
    }
    return result.projects || [];
  } catch (err) {
    console.error('Project sync failed:', err);
    return localProjects;
  }
}

// ─── Progress calculation ──────────────────────────────────────────────────

export function calculateProgress(project: Project): { totalExposureSeconds: number; completionPercent: number } {
  const totalSeconds = project.observations.reduce(
    (sum, obs) => sum + obs.exposuresTaken * obs.exposureDuration, 0
  );
  const plannedSeconds = project.exposurePlan.reduce((sum, p) => sum + p.totalExposureTime, 0);
  const completion = plannedSeconds > 0 ? Math.min(100, Math.round(totalSeconds / plannedSeconds * 100)) : 0;
  return { totalExposureSeconds: totalSeconds, completionPercent: completion };
}

// ─── Helpers: Rig info ────────────────────────────────────────────────────

interface RigInfoResponse {
  id: string;
  name: string;
  focalLength: number;
  aperture: number;
  pixelSize: number;
  sensorWidth: number;
  sensorHeight: number;
  readNoise: number;
  quantumEfficiency: number;
}

async function getActiveRig(): Promise<RigInfoResponse | null> {
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch('/api/apls/rigs', { headers });
    if (!res.ok) return null;
    const rigs = await res.json();
    const def = Array.isArray(rigs) ? rigs.find((r: any) => r.isDefault) : null;
    if (!def) return null;
    return rigToInfo(def);
  } catch {
    return null;
  }
}

async function getRigById(rigId: string): Promise<RigInfoResponse | null> {
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch('/api/apls/rigs', { headers });
    if (!res.ok) return null;
    const rigs = await res.json();
    const rig = Array.isArray(rigs) ? rigs.find((r: any) => r.id === rigId) : null;
    if (!rig) return null;
    return rigToInfo(rig);
  } catch {
    return null;
  }
}

function rigToInfo(rig: any): RigInfoResponse {
  return {
    id: rig.id,
    name: rig.name,
    focalLength: rig.telescope?.focalLength ?? 800,
    aperture: rig.telescope?.aperture ?? 200,
    pixelSize: rig.imagingCamera?.pixelSize ?? 3.76,
    sensorWidth: rig.imagingCamera?.sensorWidth ?? 23.5,
    sensorHeight: rig.imagingCamera?.sensorHeight ?? 15.6,
    readNoise: rig.imagingCamera?.readNoise ?? 1.5,
    quantumEfficiency: rig.imagingCamera?.quantumEfficiency ?? 0.8,
  };
}

// ─── Helpers: Moon illumination ───────────────────────────────────────────

async function getCurrentMoonIllumination(lat: number, lon: number): Promise<number> {
  try {
    const res = await fetch(`/api/apls/weather/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,cloud_cover&daily=temperature_2m_max,temperature_2m_min,cloud_cover_max,precipitation_sum&timezone=Europe/Paris&forecast_days=3`);
    if (!res.ok) return 0.5;
    const data = await res.json();
    return data.daily?.data?.[0]?.moonPhase ?? 0.5;
  } catch {
    return 0.5;
  }
}

// ─── LocalStorage fallback ────────────────────────────────────────────────

const LOCAL_KEY = 'astrosuite_projects';

function getLocalProjects(): Project[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalProjects(projects: Project[]): void {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(projects));
}

function saveLocalProject(project: Project): Project {
  const projects = getLocalProjects();
  projects.push(project);
  saveLocalProjects(projects);
  return project;
}

function updateLocalProject(id: string, updates: Partial<Project>): Project {
  const projects = getLocalProjects();
  const idx = projects.findIndex(p => p.id === id);
  if (idx === -1) throw new Error('Project not found');
  projects[idx] = {
    ...projects[idx],
    ...updates,
    totalExposureSeconds: 0,
    completionPercent: 0,
    updatedAt: new Date().toISOString(),
  };
  const progress = calculateProgress(projects[idx]);
  projects[idx].totalExposureSeconds = progress.totalExposureSeconds;
  projects[idx].completionPercent = progress.completionPercent;
  saveLocalProjects(projects);
  return projects[idx];
}

function deleteLocalProject(id: string): void {
  const projects = getLocalProjects().filter(p => p.id !== id);
  saveLocalProjects(projects);
}

function addLocalObservation(projectId: string, observation: ProjectObservation): Project {
  const projects = getLocalProjects();
  const idx = projects.findIndex(p => p.id === projectId);
  if (idx === -1) throw new Error('Project not found');
  projects[idx].observations.push(observation);
  const progress = calculateProgress(projects[idx]);
  projects[idx].totalExposureSeconds = progress.totalExposureSeconds;
  projects[idx].completionPercent = progress.completionPercent;
  projects[idx].updatedAt = new Date().toISOString();
  if (projects[idx].status === 'planning') {
    projects[idx].status = 'in_progress';
  }
  saveLocalProjects(projects);
  return projects[idx];
}

function deleteLocalObservation(projectId: string, observationId: string): Project {
  const projects = getLocalProjects();
  const idx = projects.findIndex(p => p.id === projectId);
  if (idx === -1) throw new Error('Project not found');
  projects[idx].observations = projects[idx].observations.filter(o => o.id !== observationId);
  const progress = calculateProgress(projects[idx]);
  projects[idx].totalExposureSeconds = progress.totalExposureSeconds;
  projects[idx].completionPercent = progress.completionPercent;
  projects[idx].updatedAt = new Date().toISOString();
  saveLocalProjects(projects);
  return projects[idx];
}