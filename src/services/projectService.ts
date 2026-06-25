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

// ─── SNR / Exposure Calculator — Délègue au pipeline v9 (exposureCalculator.ts) ──────
//
// projectService.ts wrapper : convertit ExposureCalcParams → ExposureParams (v9)
// puis convertit ExposureResult (v9) → ProjectExposurePlan (rétro-compat UI)
//
// Le pipeline physique v9 est dans src/services/module5/exposureCalculator.ts
// 6 étapes : SQM effectif → sampling → B_sky → t_sub (k dyn) → SNR → N_subs
// Calibration SkyTools : 9/10 t_sub dans 3x, 8/10 N_subs dans 3x
// ──────────────────────────────────────────────────────────────────────────────

import { calculateExposure, FILTER_PROFILES } from './module5/exposureCalculator';
import type { ExposureParams, FilterType } from '../types/module5';

const M_ZERO = 26.59; // conservé pour référence — v9 utilise le même dans exposureCalculator.ts

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
 * Délègue au pipeline v9 (exposureCalculator.ts → calculateExposure)
 * Convertit ExposureCalcParams → ExposureParams (v9)
 * puis ExposureResult (v9) → ProjectExposurePlan (rétro-compat UI)
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
    bortle = 4,
  } = params;

  // ─── Convert integrated magnitude to surface brightness (mag/arcsec²) ───────
  const rawMag = targetMagnitude ?? 10;
  let sbObj: number;
  if (surfaceBrightness != null && surfaceBrightness > 0) {
    sbObj = surfaceBrightness;
  } else if (targetSizeArcmin && targetSizeArcmin > 0) {
    const surfaceArcsec2 = Math.PI * Math.pow((targetSizeArcmin * 60) / 2, 2);
    sbObj = rawMag + 2.5 * Math.log10(surfaceArcsec2);
  } else {
    sbObj = Math.max(rawMag + 5, 18);
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
  // projectService a moonIllumination (0-1) → v9 veut moonPhaseFactor (0-3.5)
  const moonPhaseFactor = moonIllumination * 3.5;
  const moonAltitudeDeg = moonIllumination > 0 ? 45 : 0; // altitude approximative

  // ─── Mapper filter string → FilterType v9 ──────────────────────────────
  const FILTER_MAP: Record<string, FilterType> = {
    'UV_IR_Cut': 'UV_IR_Cut', 'UV/IR Cut': 'UV_IR_Cut',
    'L_Ultimate': 'L_Ultimate', 'L-Ultimate': 'L_Ultimate',
    'LPS_D2': 'LPS_D2', 'LPS-D2': 'LPS_D2',
    'Ha': 'Ha', 'Hα': 'Ha',
    'OIII': 'OIII',
    'SII': 'SII',
    'RGB': 'RGB',
    'Luminance': 'Luminance', 'Lum': 'Luminance',
  };
  const filterType = FILTER_MAP[filter] ?? 'UV_IR_Cut';
  const filterProfile = FILTER_PROFILES[filterType];

  // Déterminer le type d'objet (émission vs continuum)
  const isEmissionNebula = ['Ha', 'OIII', 'SII', 'L_Ultimate'].includes(filter);

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
    moonSeparationDeg: 90, // défaut
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