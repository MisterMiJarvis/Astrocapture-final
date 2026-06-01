// ============================================================================
// SERVICE DASHBOARD — Module 1
// Agrégation des données pour le tableau de bord
// Migrated from mock data → real API calls
// ============================================================================

import { DashboardData, DashboardKPIs, ImagingProject, AstroLocation, RigProfileSummary } from '../../types/module1';
import { fetchWeatherForecast, getWeatherWithCache } from './weatherService';
import { fetchTargetsTonight } from './targetService';

const API_BASE = '/api/apls';

function getToken(): string | null {
  return localStorage.getItem('astrosuite_token');
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

/**
 * Récupère toutes les données du dashboard
 */
export async function fetchDashboardData(params: { locationId?: string; rigId?: string; date?: string }): Promise<DashboardData> {
  const [location, rig, weather, targetsTonight, activeProjects, kpis] = await Promise.all([
    fetchLocation(params.locationId || 'default'),
    params.rigId ? fetchRigProfile(params.rigId) : fetchDefaultRigProfile(),
    getWeatherWithCache(params.locationId || 'default', 43.7889, 4.7533),
    fetchTargetsTonight(
      { lat: 43.7889, lon: 4.7533, rigId: params.rigId },
      ['UV_IR_Cut', 'L_Ultimate', 'Ha', 'OIII'],
      { phase: 0.25, altitude: 30, raDeg: 200, decDeg: 10 }
    ),
    fetchActiveProjects(),
    fetchKPIs(),
  ]);

  return {
    location,
    currentRig: rig,
    weather,
    targetsTonight,
    activeProjects,
    kpis,
    isNightMode: false,
  };
}

/**
 * Récupère les KPIs globaux from API
 */
export async function fetchKPIs(): Promise<DashboardKPIs> {
  try {
    const res = await fetch(`${API_BASE}/dashboard/kpis`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`KPIs API error: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch KPIs:', err);
    // Return empty KPIs instead of fake data
    return {
      totalIntegrationTime: 0,
      totalSessionsCompleted: 0,
      totalProjectsCompleted: 0,
      activeProjectsCount: 0,
      averageGuidingRMS: 0,
      bestGuidingRMS: 0,
      worstGuidingRMS: 0,
      filterDistribution: [],
      monthlyIntegrationTrend: [],
      mountHealthScore: 0,
    };
  }
}

/**
 * Récupère les projets actifs from API
 */
export async function fetchActiveProjects(): Promise<ImagingProject[]> {
  try {
    const res = await fetch('/api/targets?completed=false', { headers: authHeaders() });
    if (!res.ok) throw new Error(`Targets API error: ${res.status}`);
    const targets = await res.json();
    return targets.map((t: any) => ({
      id: t.id,
      targetId: t.objectId || t.id,
      targetName: t.commonName || t.objectId || 'Unknown',
      status: t.completed ? 'completed' : 'in_progress',
      rigId: '',
      locationId: '',
      targetIntegrationTime: t.targetHours || 0,
      capturedIntegrationTime: t.acquisitionHours || 0,
      progress: t.targetHours ? Math.round((t.acquisitionHours / t.targetHours) * 100) : 0,
      weatherScore: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      priority: t.priority || 'medium',
      notes: t.notes || '',
      sessionsCount: 0,
    }));
  } catch (err) {
    console.error('Failed to fetch active projects:', err);
    return [];
  }
}

/**
 * Récupère la location (hardcoded for now — single obs site)
 */
async function fetchLocation(id: string): Promise<AstroLocation> {
  // TODO: make configurable when multi-location support is added
  return {
    id, name: 'Saint-Étienne-du-Grès',
    latitude: 43.7889, longitude: 4.7533,
    elevation: 15, timezone: 'Europe/Paris',
    bortleScale: 4, sqmBase: 21.5,
  };
}

/**
 * Récupère un rig profile par ID
 */
async function fetchRigProfile(id: string): Promise<RigProfileSummary | null> {
  try {
    const res = await fetch(`${API_BASE}/rigs/${id}`, { headers: authHeaders() });
    if (!res.ok) return null;
    const data = await res.json();
    return mapApiRigToSummary(data);
  } catch {
    return null;
  }
}

/**
 * Récupère le rig par défaut
 */
async function fetchDefaultRigProfile(): Promise<RigProfileSummary | null> {
  try {
    const res = await fetch(`${API_BASE}/rigs`, { headers: authHeaders() });
    if (!res.ok) return null;
    const rigs = await res.json();
    if (!rigs || rigs.length === 0) return null;
    // Use first rig or default
    const rig = rigs.find((r: any) => r.isDefault) || rigs[0];
    return mapApiRigToSummary(rig);
  } catch {
    return null;
  }
}

function mapApiRigToSummary(data: any): RigProfileSummary {
  return {
    id: data.id,
    name: data.name,
    isDefault: data.isDefault || false,
    focalLength: data.telescope?.focalLength || 0,
    aperture: data.telescope?.aperture || 0,
    pixelSize: data.imagingCamera?.pixelSize || data.camera?.pixelSize || 0,
    sensorWidth: data.imagingCamera?.sensorWidth || data.camera?.sensorWidth || 0,
    sensorHeight: data.imagingCamera?.sensorHeight || data.camera?.sensorHeight || 0,
    binningAcquisition: data.imagingCamera?.binning || data.camera?.binning || 1,
  };
}
