// ============================================================================
// PROJECT SERVICE — CRUD + Observations + Exposure Planning
// ============================================================================

import { Project, CreateProjectData, AddObservationData, ProjectObservation, ProjectExposurePlan } from '../types/project';

const API_BASE = '/api/apls/projects';

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
}

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
  } = params;

  // Default magnitude if unknown
  const mag = targetMagnitude ?? 10;
  const size = targetSizeArcmin ?? 10;

  // Light grasp relative to reference (f=800mm, D=200mm)
  const lightGrasp = (aperture * aperture) / (200 * 200) * (800 / focalLength);
  const filterFactor = FILTER_EXPOSURE_FACTOR[filter] || 1.0;
  const moonFactor = 1 + moonIllumination * 1.5; // moon pollution factor

  // Sub-exposure: sky-limited approach
  // Rule of thumb: sub should reach sky noise dominance
  // For mag X target: sub_exposure ∝ 10^(0.4 * (mag - 10)) / lightGrasp
  const magFactor = Math.pow(10, 0.4 * (mag - 10));
  const baseSubExposure = Math.max(30, Math.min(600, 120 * magFactor / lightGrasp));
  const subExposure = Math.round(baseSubExposure * filterFactor * moonFactor / 10) * 10;

  // Total integration time for target SNR
  // For a good image: SNR ~ 3-5 per pixel for faint targets
  // Approximate: need total_time such that sqrt(total_time / sub) * sub_flux > noise
  const snrFactor = FILTER_SNR_FACTOR[filter] || 0.85;
  const moonSnrPenalty = 1 / (1 + moonIllumination * 0.8);

  // Hours needed: scale with magnitude and inversely with light grasp
  const baseHours = 2 * magFactor / lightGrasp;
  const totalHours = Math.max(0.5, baseHours * filterFactor / snrFactor * moonSnrPenalty);

  // Number of subs
  const subCount = Math.max(10, Math.ceil(totalHours * 3600 / subExposure));
  const totalExposureTime = subCount * subExposure;

  // SNR estimate label
  const totalIntegration = totalExposureTime;
  const snrScore = Math.sqrt(totalIntegration / subExposure) * snrFactor * lightGrasp * moonSnrPenalty;
  const snrLabel = snrScore > 15 ? 'Excellent' : snrScore > 8 ? 'Good' : snrScore > 4 ? 'Fair' : 'Low';

  return [{
    filter,
    subExposure,
    subCount,
    totalExposureTime,
    snrEstimate: `${snrLabel} (SNR ~${snrScore.toFixed(1)})`,
  }];
}

/**
 * Calculate total exposure plan including recommended filter set
 */
export function calculateFullExposurePlan(
  params: ExposureCalcParams & { targetType: string }
): ProjectExposurePlan[] {
  const types = params.targetType?.split(',') || [];
  const plans: ProjectExposurePlan[] = [];

  // Primary filter
  plans.push(...calculateExposurePlan(params));

  // For narrowband targets, add complementary filters
  const isNarrowband = types.some(t => ['neb', 'plnb', 'snrb'].includes(t));
  if (isNarrowband && params.filter !== 'Ha' && params.filter !== 'OIII' && params.filter !== 'SII') {
    // Add Ha, OIII, SII plans
    for (const f of ['Ha', 'OIII', 'SII'] as const) {
      plans.push(...calculateExposurePlan({ ...params, filter: f }));
    }
  }

  return plans;
}

// ─── Project CRUD ─────────────────────────────────────────────────────────

export async function fetchProjects(): Promise<Project[]> {
  try {
    const res = await fetch(API_BASE);
    if (!res.ok) throw new Error('Failed to fetch projects');
    return await res.json();
  } catch {
    // Fallback to localStorage
    return getLocalProjects();
  }
}

export async function fetchProject(id: string): Promise<Project | null> {
  try {
    const res = await fetch(`${API_BASE}/${id}`);
    if (!res.ok) return null;
    return await res.json();
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
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project),
    });
    if (!res.ok) throw new Error('Failed to create project');
    return await res.json();
  } catch {
    // Fallback to localStorage
    return saveLocalProject(project);
  }
}

export async function updateProject(id: string, updates: Partial<Project>): Promise<Project> {
  try {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update project');
    return await res.json();
  } catch {
    return updateLocalProject(id, updates);
  }
}

export async function deleteProject(id: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
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
    const res = await fetch(`${API_BASE}/${projectId}/observations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(observation),
    });
    if (!res.ok) throw new Error('Failed to add observation');
    return await res.json();
  } catch {
    return addLocalObservation(projectId, observation);
  }
}

export async function deleteObservation(projectId: string, observationId: string): Promise<Project> {
  try {
    const res = await fetch(`${API_BASE}/${projectId}/observations/${observationId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete observation');
    return await res.json();
  } catch {
    return deleteLocalObservation(projectId, observationId);
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
    const res = await fetch('/api/apls/rigs');
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
    // Try to extract moon illumination from weather data
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
  // Auto-transition to in_progress if first observation
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