// ============================================================================
// SERVICE DASHBOARD — Module 1
// Agrégation des données pour le tableau de bord
// ============================================================================

import { DashboardData, DashboardKPIs, ImagingProject, DashboardQueryParams } from '../../types/module1';
import { fetchWeatherForecast, getWeatherWithCache } from './weatherService';
import { fetchTargetsTonight } from './targetService';

/**
 * Récupère toutes les données du dashboard
 */
export async function fetchDashboardData(params: DashboardQueryParams): Promise<DashboardData> {
  const { locationId, rigId, date } = params;

  // TODO: remplacer par vrais appels API backend
  const location = await fetchLocation(locationId || 'default');
  const rig = rigId ? await fetchRigProfile(rigId) : null;

  // Météo
  const weather = await getWeatherWithCache(
    locationId || 'default',
    location.latitude,
    location.longitude
  );

  // Cibles de la nuit
  const targetsTonight = await fetchTargetsTonight(
    { lat: location.latitude, lon: location.longitude, rigId: rigId || undefined },
    ['UV_IR_Cut', 'L_Ultimate', 'Ha', 'OIII'],
    { phase: 0.25, altitude: 30, raDeg: 200, decDeg: 10 }
  );

  // Projets actifs
  const activeProjects = await fetchActiveProjects();

  // KPIs
  const kpis = await fetchKPIs();

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
 * Récupère les KPIs globaux
 */
export async function fetchKPIs(): Promise<DashboardKPIs> {
  // TODO: remplacer par appel API /api/apls/dashboard/kpis
  return {
    totalIntegrationTime: 127.5,
    totalSessionsCompleted: 23,
    totalProjectsCompleted: 4,
    activeProjectsCount: 3,
    averageGuidingRMS: 0.85,
    bestGuidingRMS: 0.42,
    worstGuidingRMS: 2.1,
    filterDistribution: [
      { filter: 'UV_IR_Cut', hours: 45, percentage: 35 },
      { filter: 'L_Ultimate', hours: 38, percentage: 30 },
      { filter: 'Ha', hours: 25, percentage: 20 },
      { filter: 'OIII', hours: 12, percentage: 9 },
      { filter: 'SII', hours: 7.5, percentage: 6 },
    ],
    monthlyIntegrationTrend: [
      { month: '2026-01', hours: 18 },
      { month: '2026-02', hours: 22 },
      { month: '2026-03', hours: 15 },
      { month: '2026-04', hours: 28 },
      { month: '2026-05', hours: 44.5 },
    ],
    mountHealthScore: 92,
    lastMaintenanceDate: new Date('2026-04-15'),
  };
}

/**
 * Récupère les projets actifs
 */
export async function fetchActiveProjects(): Promise<ImagingProject[]> {
  // TODO: remplacer par appel API /api/apls/projects?status=in_progress,paused,waiting_weather
  return [
    {
      id: 'proj_1', targetId: 'm31', targetName: 'M31 Andromeda',
      status: 'in_progress', rigId: 'rig_1', locationId: 'loc_1',
      targetIntegrationTime: 10, capturedIntegrationTime: 6.5,
      progress: 65, weatherScore: 78,
      createdAt: new Date('2026-01-10'), updatedAt: new Date('2026-05-20'),
      priority: 'high', notes: 'L-Ultimate 3nm',
      sessionsCount: 4,
    },
    {
      id: 'proj_2', targetId: 'm42', targetName: 'M42 Orion',
      status: 'waiting_moon', rigId: 'rig_1', locationId: 'loc_1',
      targetIntegrationTime: 8, capturedIntegrationTime: 2,
      progress: 25, weatherScore: 45,
      createdAt: new Date('2026-02-15'), updatedAt: new Date('2026-05-15'),
      priority: 'medium', notes: 'Ha + OIII',
      sessionsCount: 1,
    },
    {
      id: 'proj_3', targetId: 'ngc7000', targetName: 'NGC 7000 N-Amer',
      status: 'paused', rigId: 'rig_1', locationId: 'loc_1',
      targetIntegrationTime: 12, capturedIntegrationTime: 4,
      progress: 33, weatherScore: 60,
      createdAt: new Date('2026-03-01'), updatedAt: new Date('2026-04-28'),
      priority: 'low', notes: 'SHO narrowband',
      sessionsCount: 2,
    },
  ];
}

// --- Helpers temporaires (à remplacer par API) ---
async function fetchLocation(id: string) {
  return {
    id, name: 'Saint-Étienne-du-Grès',
    latitude: 43.7889, longitude: 4.7533,
    elevation: 15, timezone: 'Europe/Paris',
    bortleScale: 4, sqmBase: 21.5,
  };
}

async function fetchRigProfile(id: string) {
  return {
    id, name: 'TS-Optics 102mm + ASI533',
    isDefault: true,
    focalLength: 714,
    aperture: 102,
    pixelSize: 3.76,
    sensorWidth: 11.3,
    sensorHeight: 11.3,
    binningAcquisition: 1,
  };
}
