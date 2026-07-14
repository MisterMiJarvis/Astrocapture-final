// ============================================================================
// PROJECT SERVICE — CRUD + Observations + Exposure Planning
// API-only (no localStorage fallback)
// ============================================================================

import { Project, CreateProjectData, AddObservationData, ProjectObservation, ProjectExposurePlan, ExposureFormulaSnapshot, SNRTarget } from '../types/project';
import { AstroFilter } from './filterService';
import { fetchFilters, getFilterExposureFactor, getMoonBenefitFactor } from './filterService';

const API_BASE = '/api/apls/projects';

// Clean up any leftover localStorage keys from old versions
const OLD_KEYS = ['astrosuite_projects', 'astrosuite_projects_v2', 'apls_projects_v1'];
for (const oldKey of OLD_KEYS) {
  try { localStorage.removeItem(oldKey); } catch {}
}

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

// ─── SNR / Exposure Calculator — Délègue au pipeline v9 (exposureCalculator.ts) ──────
//
// projectService.ts wrapper : convertit ExposureCalcParams → ExposureParams (v9)
// puis convertit ExposureResult (v9) → ProjectExposurePlan (rétro-compat UI)
//
// Le pipeline physique v9 est dans src/services/module5/exposureCalculator.ts
// 6 étapes : SQM effectif → sampling → B_sky → t_sub (k dyn) → SNR → N_subs
// Calibration SkyTools : 9/10 t_sub dans 3x, 8/10 N_subs dans 3x
// ──────────────────────────────────────────────────────────────────────────────

import { calculateExposure, FILTER_PROFILES, loadFilterProfiles, inferObjectType } from './module5/exposureCalculator';
import type { ExposureParams, FilterType, FilterProfile } from '../types/module5';
import type { ObjectType } from './module5/exposureCalculator';

// Cache for DB-loaded filter profiles (loaded once per session)
let cachedDbProfiles: Record<string, FilterProfile> | null = null;

/**
 * Get filter profiles from DB (cached), fallback to hardcoded FILTER_PROFILES
 */
async function getFilterProfiles(): Promise<Record<string, FilterProfile>> {
  if (cachedDbProfiles) return cachedDbProfiles;
  try {
    cachedDbProfiles = await loadFilterProfiles();
    return cachedDbProfiles;
  } catch {
    return FILTER_PROFILES;
  }
}

const M_ZERO = 26.59; // conservé pour référence — v9 utilise le même dans exposureCalculator.ts

interface ExposureCalcParams {
  targetMagnitude: number | null;
  targetSizeArcmin: number | null;
  surfaceBrightness: number | null;  // mag/arcmin² (de Telescopius) — converti en arcsec² dans le calcul
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
  targetName?: string;    // nom de la cible (pour auto-dÃ©tection k_calib)
  targetType?: string;    // type de cible (string libre â mappÃ© vers ObjectType)
  targetRaDeg?: number;   // RA en degres (pour ephemerides Lune + cible)
  targetDecDeg?: number;  // Dec en degres (pour ephemerides Lune + cible)
  observationDate?: string; // ISO date (pour ephemerides Lune + cible)
  extinctionMag?: number;  // Perte de magnitude par extinction atmosphérique (Skyfield)
  targetAirmass?: number;  // Masse d'air de la cible (Skyfield)
  targetAltitudeDeg?: number; // Altitude de la cible en degrés (Skyfield)
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
 * Délègue au pipeline v9 (exposureCalculator.ts → calculateExposure)
 * Convertit ExposureCalcParams → ExposureParams (v9)
 * puis ExposureResult (v9) → ProjectExposurePlan (rétro-compat UI)
 */

/**
 * Fetch real Moon ephemeris from Skyfield (via API → Python script).
 * Returns null if unavailable (fallback to hardcoded values).
 */
export async function fetchMoonEphemeris(targetRaDeg: number, targetDecDeg: number, observationDate?: string): Promise<{
  moonAltitudeDeg: number;
  moonIllumination: number;
  angularSeparationDeg: number;
  proximityFactor: number;
  targetAltitudeDeg: number;
  targetAirmass: number;
  extinctionMag: number;
} | null> {
  try {
    const date = observationDate ? new Date(observationDate) : new Date();
    const res = await fetch('/api/apls/moon-ephemeris', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_ra_hours: targetRaDeg / 15, // deg → hours
        target_dec_degs: targetDecDeg,
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
        day: date.getUTCDate(),
        hour: date.getUTCHours() || 22,
      }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function calculateExposurePlan(params: ExposureCalcParams, profiles?: Record<string, FilterProfile>): ProjectExposurePlan[] {
  const filterProfiles = profiles ?? FILTER_PROFILES;
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
    bortle = 4,
    moonAltitudeDeg: providedMoonAlt = 0,
    moonSeparationDeg: providedMoonSep = 90,
  } = params as ExposureCalcParams & { moonAltitudeDeg?: number; moonSeparationDeg?: number };

  // ─── Convert integrated magnitude to surface brightness (mag/arcsec²) ───────
  const rawMag = targetMagnitude ?? 10;
  let sbObj: number;
  // ⚠️ Telescopius fournit la SB en mag/arcmin² — convertir en mag/arcsec²
  // Conversion : SB_arcsec² = SB_arcmin² + 2.5 × log10(3600) ≈ SB_arcmin² + 8.89
  // (Gemini review 14/07/2026 — sinon le flux est gonflé ×3600)
  if (surfaceBrightness != null && surfaceBrightness > 0) {
    sbObj = surfaceBrightness + 8.89;
  } else if (targetSizeArcmin && targetSizeArcmin > 0) {
    const surfaceArcsec2 = Math.PI * Math.pow((targetSizeArcmin * 60) / 2, 2);
    sbObj = rawMag + 2.5 * Math.log10(surfaceArcsec2);
  } else {
    sbObj = Math.max(rawMag + 5, 18);
  }

  // ─── Extinction atmosphérique (V11 — Gemini suggestion) ────────────────
  // La cible perd en luminosité quand elle est basse sur l'horizon (masse d'air).
  // Δm = k_ext × (X - 1), où X = 1/sin(altitude) et k_ext ≈ 0.20 (Bortle 4)
  // Skyfield calcule l'altitude réelle de la cible et renvoie extinction_mag.
  // On l'ajoute à SB : plus la cible est basse, plus SB_obj augmente (plus faint).
  const extinctionMag = (params as ExposureCalcParams & { extinctionMag?: number }).extinctionMag;
  if (extinctionMag != null && extinctionMag > 0) {
    sbObj += extinctionMag;
  }

  // ─── Convert Bortle to SQM base ─────────────────────────────────────────
  const bortleToSQM = (b: number): number => {
    const table: Record<number, number> = {
      1: 22.0, 2: 21.5, 3: 21.0, 4: 20.5, 5: 19.5,
      6: 18.5, 7: 18.0, 8: 17.0, 9: 16.0,
    };
    return table[Math.min(9, Math.max(1, Math.round(b)))] ?? 20.5;
  };
  const sqmBase = bortleToSQM(bortle);

  // ─── Moon → v9 params ──────────────────────────────────────────────────
  // Utilise les valeurs réelles de Skyfield si disponibles, sinon fallback
  // Effet d'opposition de la Lune : la relation illumination→brightness est non-linéaire
  // Un quartier (50%) est ~10x moins brillant qu'une Pleine Lune, pas 2x
  // Formule : 3.5 × illumination^2.5 (Gemini review 14/07/2026)
  // Pleine Lune (1.0) → 3.5 | Quartier (0.5) → 0.62 | Nouvelle (0.0) → 0.0
  const moonPhaseFactor = 3.5 * Math.pow(moonIllumination, 2.5);
  const moonAltitudeDeg = providedMoonAlt || (moonIllumination > 0 ? 45 : 0);
  const moonSeparationDeg = providedMoonSep || 90;

  // ─── Chercher le filtre dans les profils (DB ou fallback) ─────────────
  // Essayer d'abord une correspondance exacte par nom, puis par slug
  const filterSlug = filter.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  let filterProfile = filterProfiles[filterSlug] ?? filterProfiles[filter] ?? null;
  
  // Fallback: chercher par nom insensible à la casse
  if (!filterProfile) {
    const match = Object.values(filterProfiles).find(
      p => p.name.toLowerCase() === filter.toLowerCase()
    );
    filterProfile = match ?? null;
  }
  
  // Dernier recours: UV/IR Cut (broadband par défaut)
  if (!filterProfile) {
    filterProfile = filterProfiles['UV_IR_Cut'] ?? Object.values(filterProfiles)[0];
  }
  
  // Déterminer le type d'objet (émission vs continuum)
  const isEmissionNebula = filterProfile.bandwidthNm <= 12 || 
    ['Ha', 'OIII', 'SII', 'L_Ultimate', 'l_ultimate_3nm'].includes(filterSlug) ||
    filterProfile.continuumTransmission <= 0.1;

  // ─── Construire ExposureParams (v9) ──────────────────────────────────────
  const v9Params: ExposureParams = {
    aperture,
    focalLength,
    pixelSize,
    readNoise,
    quantumEfficiency,
    kFactor: 5, // v9 utilise k dynamique en interne (2.5 NB / 5.0 BB)
    skyMagnitude: sqmBase,
    moonAltitudeDeg,
    moonPhaseFactor,
    moonSeparationDeg,
    filterTransmission: filterProfile.transmission,
    skySuppression: filterProfile.skySuppression,
    objectSurfaceBrightness: sbObj,
    objectDiameterArcmin: targetSizeArcmin ?? 0,
    isEmissionNebula,
  };

  // ─── Appeler le pipeline v9 ──────────────────────────────────────────────
  const result = calculateExposure(v9Params);

  // ─── Operating bounds (Cosgrove) — conservé pour rétro-compat UI ──────────
  const RN = readNoise;
  const Bsky = result.bSky;
  const tSubMin = Bsky > 0 ? Math.max(10, Math.ceil(9 * RN * RN / Bsky / 5) * 5) : 10;
  const wellDepth = params.fullWellDepth || (quantumEfficiency > 0.7 ? 50000 : 100000);
  const brightStarMag = 4;
  const brightStarFlux = Math.pow(10, 0.4 * (M_ZERO - brightStarMag + (filterProfile.bandwidthNm <= 12 ? 2 : 0)));
  const A = Math.PI * Math.pow(aperture / 2000, 2);
  const Sbright = brightStarFlux * A * Math.pow((206.265 * pixelSize) / focalLength, 2) * quantumEfficiency * filterProfile.transmission;
  const skyPerPixel = Bsky * 600;
  const tSubMaxFromSaturation = Sbright > 0 ? Math.floor((wellDepth * 0.5 - skyPerPixel) / Sbright) : 600;
  const tSubMax = Math.max(tSubMin + 10, Math.min(600, tSubMaxFromSaturation));

  // Workflow overhead
  const overheadPerSub = 12;
  const totalExposureTime = result.totalSubsForSNR * result.subExposureTime;
  const totalWithOverhead = totalExposureTime + result.totalSubsForSNR * overheadPerSub;

  // SNR label
  const actualSNR = result.snrPerSub * Math.sqrt(result.totalSubsForSNR);
  const snrLabel = actualSNR >= 80 ? 'Exceptional' : actualSNR >= 50 ? 'Excellent' : actualSNR >= 25 ? 'Good' : actualSNR >= 12 ? 'Fair' : 'Low';

  // tauSignal / tauSky pour rétro-compat UI
  const tauSignal = filterProfile.transmission;
  const tauSky = filterProfile.transmission * (1 - filterProfile.skySuppression);

  // ─── Exposure Tracking Snapshot (Point 1) ────────────────────────────
  const formulaSnapshot: ExposureFormulaSnapshot = {
    formulaVersion: 'V9',
    inputs: {
      sqm: sqmBase,
      bortle,
      moonIllumination: moonIllumination ?? 0,
      moonAltitudeDeg,
      moonPhaseFactor,
      filter,
      aperture,
      focalLength,
      pixelSize,
      readNoise,
      quantumEfficiency,
      objectType: params.targetType ?? 'unknown',
      objectSurfaceBrightness: sbObj,
      objectDiameterArcmin: targetSizeArcmin ?? 0,
      isEmissionNebula,
    },
    formulaOutput: {
      subExposure: result.subExposureTime,
      subCount: result.totalSubsForSNR,
      totalExposureTime,
      snrValue: actualSNR,
      snrEstimate: `${snrLabel} (SNR ~${actualSNR.toFixed(1)})`,
    },
  };

  return [{
    filter,
    subExposure: result.subExposureTime,
    subExposureMin: tSubMin,
    subExposureMax: tSubMax,
    subCount: result.totalSubsForSNR,
    totalExposureTime,
    totalWithOverhead,
    snrEstimate: `${snrLabel} (SNR ~${actualSNR.toFixed(1)})`,
    snrValue: actualSNR,
    skyElectronRate: Bsky,
    objectElectronRate: result.sObj,
    sampling: parseFloat(result.sampling.toFixed(2)),
    darkCurrent: 0.0005,
    tauSignal,
    tauSky,
    formulaSnapshot,
  }];
}

export function calculateFullExposurePlan(
  params: ExposureCalcParams & { targetType: string },
  profiles?: Record<string, FilterProfile>
): ProjectExposurePlan[] {
  const types = params.targetType?.split(',') || [];
  const plans: ProjectExposurePlan[] = [];

  plans.push(...calculateExposurePlan(params, profiles));

  const isNarrowband = types.some(t => ['neb', 'plnb', 'snrb'].includes(t));
  if (isNarrowband && params.filter !== 'Ha' && params.filter !== 'OIII' && params.filter !== 'SII') {
    for (const f of ['Ha', 'OIII', 'SII'] as const) {
      plans.push(...calculateExposurePlan({ ...params, filter: f }, profiles));
    }
  }

  return plans;
}

// ─── Project CRUD (API-only) ──────────────────────────────────────────────

export async function fetchProjects(): Promise<Project[]> {
  const data = await apiFetch<Project[]>('');
  return Array.isArray(data) ? data : [];
}

export async function fetchProject(id: string): Promise<Project | null> {
  return await apiFetch<Project>(`/${id}`);
}

export async function createProject(data: CreateProjectData): Promise<Project> {
  const rigInfo = data.rigId ? await getRigById(data.rigId) : await getActiveRig();

  // Determine Bortle from location
  const bortle = data.locationSource === 'pradelles' ? 2 : 4;

  // Load filter profiles from DB (cached)
  const profiles = await getFilterProfiles();
  
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
    targetName: data.targetName,
    targetType: data.targetType,
  }, profiles);

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

  return await apiFetch<Project>('', {
    method: 'POST',
    body: JSON.stringify(project),
  });
}

export async function updateProject(id: string, updates: Partial<Project>): Promise<Project> {
  return await apiFetch<Project>(`/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function deleteProject(id: string): Promise<void> {
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

  // POST the observation, then re-fetch the project to get updated progress
  await apiFetch<any>(`/${projectId}/observations`, {
    method: 'POST',
    body: JSON.stringify(observation),
  });
  return await apiFetch<Project>(`/${projectId}`);
}

export async function deleteObservation(projectId: string, observationId: string): Promise<Project> {
  await apiFetch<any>(`/${projectId}/observations/${observationId}`, {
    method: 'DELETE',
  });
  return await apiFetch<Project>(`/${projectId}`);
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
  const nativeFL = rig.telescope?.focalLength ?? 800;
  const factor = rig.opticModifier?.factor ?? 1;
  return {
    id: rig.id,
    name: rig.name,
    focalLength: nativeFL * factor,  // effective focal length for exposure calc
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

