// ============================================================================
// PROJECT SERVICE — CRUD + Observations + Exposure Planning
// API-first with localStorage fallback
// ============================================================================

import { Project, CreateProjectData, AddObservationData, ProjectObservation, ProjectExposurePlan } from '../types/project';
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

// ─── SNR / Exposure Calculator ───────────────────────────────────────────

interface ExposureCalcParams {
  targetMagnitude: number | null;
  targetSizeArcmin: number | null;
  filter: string;
  focalLength: number;
  aperture: number;
  pixelSize: number;
  moonIllumination: number;
  avgSeeing: number;
  filterData?: AstroFilter;
}

// Fallback hardcoded factors
const FILTER_EXPOSURE_FACTOR: Record<string, number> = {
  L_Ultimate: 1.0,
  Luminance: 1.2,
  UV_IR_Cut: 1.3,
  Ha: 3.0,
  OIII: 4.0,
  SII: 4.5,
  RGB: 1.5,
  LPS_D2: 1.1,
};

const FILTER_SNR_FACTOR: Record<string, number> = {
  L_Ultimate: 1.0,
  Luminance: 0.95,
  UV_IR_Cut: 0.85,
  Ha: 0.7,
  OIII: 0.6,
  SII: 0.55,
  RGB: 0.8,
  LPS_D2: 0.9,
};

/**
 * Calculate optimal sub-exposure and total exposure plan for a target
 */
export function calculateExposurePlan(params: ExposureCalcParams): ProjectExposurePlan[] {
  const {
    targetMagnitude,
    targetSizeArcmin,
    filter,
    focalLength,
    aperture,
    pixelSize,
    moonIllumination,
    avgSeeing = 2.5,
    filterData,
  } = params;

  const mag = targetMagnitude ?? 10;
  const size = targetSizeArcmin ?? 10;

  const lightGrasp = (aperture * aperture) / (200 * 200) * (800 / focalLength);

  let filterFactor: number;
  let snrFactor: number;
  let moonFactor: number;

  if (filterData) {
    filterFactor = getFilterExposureFactor(filterData);
    snrFactor = filterData.peakTransmission * (1 - filterData.skySuppression * 0.3);
    moonFactor = getMoonBenefitFactor(filterData, moonIllumination);
  } else {
    filterFactor = FILTER_EXPOSURE_FACTOR[filter] || 1.0;
    snrFactor = FILTER_SNR_FACTOR[filter] || 0.85;
    moonFactor = 1 + moonIllumination * 1.5;
  }

  const magFactor = Math.pow(10, 0.4 * (mag - 10));
  const baseSubExposure = Math.max(30, Math.min(600, 120 * magFactor / lightGrasp));
  const subExposure = Math.round(baseSubExposure * filterFactor * moonFactor / 10) * 10;

  const moonSnrPenalty = 1 / (1 + moonIllumination * 0.8);

  const baseHours = 2 * magFactor / lightGrasp;
  const totalHours = Math.max(0.5, baseHours * filterFactor / snrFactor * moonSnrPenalty);

  const subCount = Math.max(10, Math.ceil(totalHours * 3600 / subExposure));
  const totalExposureTime = subCount * subExposure;

  const snrScore = Math.sqrt(totalExposureTime / subExposure) * snrFactor * lightGrasp * moonSnrPenalty;
  const snrLabel = snrScore > 15 ? 'Excellent' : snrScore > 8 ? 'Good' : snrScore > 4 ? 'Fair' : 'Low';

  return [{
    filter,
    subExposure,
    subCount,
    totalExposureTime,
    snrEstimate: `${snrLabel} (SNR ~${snrScore.toFixed(1)})`,
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
    return Array.isArray(data) ? data : [];
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
  const rigInfo = await getActiveRig();

  const exposurePlan = calculateExposurePlan({
    targetMagnitude: data.targetMagnitude,
    targetSizeArcmin: data.targetSizeArcmin,
    filter: data.primaryFilter,
    focalLength: rigInfo?.focalLength ?? 800,
    aperture: rigInfo?.aperture ?? 200,
    pixelSize: rigInfo?.pixelSize ?? 3.76,
    moonIllumination: await getCurrentMoonIllumination(data.lat, data.lon),
    avgSeeing: 2.5,
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
    return {
      id: def.id,
      name: def.name,
      focalLength: def.telescope?.focalLength ?? 800,
      aperture: def.telescope?.aperture ?? 200,
      pixelSize: def.imagingCamera?.pixelSize ?? 3.76,
      sensorWidth: def.imagingCamera?.sensorWidth ?? 23.5,
      sensorHeight: def.imagingCamera?.sensorHeight ?? 15.6,
    };
  } catch {
    return null;
  }
}

// ─── Helpers: Moon illumination ───────────────────────────────────────────

async function getCurrentMoonIllumination(lat: number, lon: number): Promise<number> {
  try {
    const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
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