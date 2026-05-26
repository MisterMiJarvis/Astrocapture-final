// ============================================================================
// SERVICE PROJETS — Module 6
// Multi-session projects, Telescopius sync
// ============================================================================

import { ProjectDetail, ImagingSession, FilterPlan, TelescopiusSyncStatus } from '../../types/module6';

const TELESCOPIUS_BASE = 'https://api.telescopius.com';

/**
 * Récupère le détail d'un projet avec sessions et plans filtre
 */
export async function fetchProjectDetail(projectId: string): Promise<ProjectDetail> {
  // TODO: remplacer par appel API backend
  const mockProject: ProjectDetail = {
    id: projectId,
    targetId: 'm31',
    targetName: 'M31 Andromeda',
    targetRa: '00:42:44',
    targetDec: '+41:16:09',
    status: 'in_progress',
    rigId: 'rig_1',
    locationId: 'loc_1',
    targetIntegrationTime: 10,
    capturedIntegrationTime: 6.5,
    progress: 65,
    weatherScore: 78,
    priority: 'high',
    notes: 'Projet L-Ultimate 3nm sur M31. Objectif 10h.',
    createdAt: new Date('2026-01-10'),
    updatedAt: new Date('2026-05-20'),
    filterPlans: [
      { filter: 'L_Ultimate', targetSubs: 120, targetSubLength: 300, targetTotalTime: 600, capturedSubs: 78, capturedTime: 390, isComplete: false },
      { filter: 'Ha', targetSubs: 40, targetSubLength: 300, targetTotalTime: 200, capturedSubs: 0, capturedTime: 0, isComplete: false },
    ],
    sessions: [
      {
        id: 'sess_1', projectId,
        date: new Date('2026-01-15'),
        startTime: new Date('2026-01-15T20:30:00'),
        endTime: new Date('2026-01-16T02:00:00'),
        status: 'completed',
        locationId: 'loc_1',
        totalIntegrationTime: 300,
        guidingRMS: 0.72,
        guidingRMSArcsec: 0.78,
        imagesCount: 60,
        notes: 'Bonne nuit, seeing moyen',
      },
      {
        id: 'sess_2', projectId,
        date: new Date('2026-01-20'),
        startTime: new Date('2026-01-20T21:00:00'),
        endTime: new Date('2026-01-21T01:30:00'),
        status: 'completed',
        locationId: 'loc_1',
        totalIntegrationTime: 270,
        guidingRMS: 0.85,
        guidingRMSArcsec: 0.93,
        imagesCount: 54,
        notes: 'Vent modéré post minuit',
      },
    ],
  };

  return mockProject;
}

/**
 * Crée une nouvelle session dans un projet
 */
export async function createSession(
  projectId: string,
  date: Date,
  locationId: string
): Promise<ImagingSession> {
  const session: ImagingSession = {
    id: `sess_${Date.now()}`,
    projectId,
    date,
    startTime: date,
    status: 'planned',
    locationId,
    totalIntegrationTime: 0,
    imagesCount: 0,
    notes: '',
  };

  // TODO: POST /api/apls/sessions
  return session;
}

/**
 * Met à jour le statut d'une session
 */
export async function updateSessionStatus(
  sessionId: string,
  status: ImagingSession['status']
): Promise<void> {
  // TODO: PUT /api/apls/sessions/:id
  console.log(`Session ${sessionId} → ${status}`);
}

/**
 * Sync bidirectionnelle avec Telescopius Observation Log
 */
export async function syncWithTelescopius(
  projectId: string,
  apiKey: string,
  direction: 'push' | 'pull' | 'bidirectional' = 'bidirectional'
): Promise<TelescopiusSyncStatus> {
  const status: TelescopiusSyncStatus = {
    projectId,
    syncDirection: direction,
    sessionsSynced: 0,
    imagesSynced: 0,
    status: 'syncing',
  };

  try {
    if (direction === 'push' || direction === 'bidirectional') {
      // Push sessions vers Telescopius
      const project = await fetchProjectDetail(projectId);
      for (const session of project.sessions) {
        await pushSessionToTelescopius(session, project, apiKey);
        status.sessionsSynced++;
      }
    }

    if (direction === 'pull' || direction === 'bidirectional') {
      // Pull images/notes depuis Telescopius
      const pulled = await pullFromTelescopius(projectId, apiKey);
      status.imagesSynced = pulled.imagesCount;
    }

    status.status = 'idle';
    status.lastSyncAt = new Date();
  } catch (err) {
    status.status = 'error';
    status.errorMessage = err instanceof Error ? err.message : 'Sync failed';
  }

  return status;
}

async function pushSessionToTelescopius(
  session: ImagingSession,
  project: ProjectDetail,
  apiKey: string
): Promise<void> {
  const payload = {
    target_name: project.targetName,
    date: session.date.toISOString().split('T')[0],
    duration_minutes: session.totalIntegrationTime,
    filter: project.filterPlans[0]?.filter || 'Unknown',
    notes: session.notes,
  };

  const response = await fetch(`${TELESCOPIUS_BASE}/observation-log`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Telescopius push failed: ${response.status}`);
  }
}

async function pullFromTelescopius(projectId: string, apiKey: string): Promise<{ imagesCount: number }> {
  const response = await fetch(`${TELESCOPIUS_BASE}/observation-log?project_id=${projectId}`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    throw new Error(`Telescopius pull failed: ${response.status}`);
  }

  const data = await response.json();
  return { imagesCount: data.images?.length || 0 };
}

/**
 * Calcule la progression d'un projet
 */
export function calculateProjectProgress(
  targetTime: number,
  capturedTime: number,
  filterPlans: FilterPlan[]
): number {
  if (targetTime <= 0) return 0;
  const baseProgress = Math.min(100, (capturedTime / targetTime) * 100);

  // Bonus si tous les filtres sont complétés
  const allFiltersComplete = filterPlans.length > 0 && filterPlans.every(f => f.isComplete);
  if (allFiltersComplete && baseProgress >= 95) return 100;

  return Math.round(baseProgress);
}
