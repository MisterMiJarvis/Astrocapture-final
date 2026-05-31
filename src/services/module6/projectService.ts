// ============================================================================
// SERVICE PROJETS — Module 6
// Multi-session projects, API SQLite persistence
// Migrated from mock data → /api/sessions + /api/targets
// ============================================================================

import { ProjectDetail, ImagingSession, FilterPlan, TelescopiusSyncStatus } from '../../types/module6';

const API_BASE = '/api';
const TELESCOPIUS_BASE = 'https://api.telescopius.com';

// ─────────────────────────────────────────────────────────────────────────────
// Token helper
// ─────────────────────────────────────────────────────────────────────────────
function getToken(): string | null {
  return localStorage.getItem('astrocapture_token');
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
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

// ─────────────────────────────────────────────────────────────────────────────
// Sessions — API calls
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchSessions(params?: { status?: string; from?: string; to?: string }): Promise<any[]> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.from) query.set('from', params.from);
  if (params?.to) query.set('to', params.to);
  const qs = query.toString();
  return apiFetch<any[]>(`/sessions${qs ? '?' + qs : ''}`);
}

export async function fetchSessionDetail(sessionId: string): Promise<any> {
  return apiFetch<any>(`/sessions/${sessionId}`);
}

export async function createSession(
  projectId: string,
  date: Date,
  locationId: string
): Promise<ImagingSession> {
  const body = {
    id: `sess_${Date.now()}`,
    date: date.toISOString().split('T')[0],
    locationId,
    status: 'planned',
    notes: '',
  };
  const data = await apiFetch<any>('/sessions', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return mapApiSession(data);
}

export async function updateSessionStatus(
  sessionId: string,
  status: ImagingSession['status']
): Promise<void> {
  await apiFetch<any>(`/sessions/${sessionId}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

export async function deleteSession(sessionId: string): Promise<void> {
  await apiFetch<any>(`/sessions/${sessionId}`, { method: 'DELETE' });
}

// ─────────────────────────────────────────────────────────────────────────────
// Projects — assembled from targets + sessions
// Since there's no dedicated projects table, we assemble from targets + their sessions
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchProjectDetail(targetId: string): Promise<ProjectDetail> {
  // Fetch the target (which is the project root)
  const target = await apiFetch<any>(`/targets/${targetId}`);

  // Fetch sessions linked to this target
  const allSessions = await fetchSessions();
  const linkedSessions = allSessions.filter((s: any) =>
    s.targets && s.targets.some((t: any) => t.id === targetId)
  );

  // Calculate progress from sessions
  const capturedIntegrationTime = linkedSessions.reduce(
    (sum: number, s: any) => sum + (s.totalIntegrationTime || 0), 0
  ) / 60; // minutes → hours

  const targetIntegrationTime = target.target_hours || 10;
  const progress = targetIntegrationTime > 0
    ? Math.min(100, Math.round((capturedIntegrationTime / targetIntegrationTime) * 100))
    : 0;

  return {
    id: target.id,
    targetId: target.object_id || target.id,
    targetName: target.common_name || target.object_id || 'Unknown',
    targetRa: target.ra || '',
    targetDec: target.dec || '',
    status: target.completed ? 'completed' : (progress > 0 ? 'in_progress' : 'planned'),
    rigId: '',
    locationId: '',
    targetIntegrationTime,
    capturedIntegrationTime: parseFloat(capturedIntegrationTime.toFixed(1)),
    progress,
    weatherScore: 0,
    priority: target.priority || 'medium',
    notes: target.notes || '',
    createdAt: new Date(target.created_at || Date.now()),
    updatedAt: new Date(target.updated_at || Date.now()),
    filterPlans: [],
    sessions: linkedSessions.map(mapApiSession),
  };
}

export async function fetchAllProjects(): Promise<ProjectDetail[]> {
  try {
    const targets = await apiFetch<any[]>('/targets');
    const projects = await Promise.all(
      (targets || []).map((t: any) => fetchProjectDetail(t.id))
    );
    return projects;
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapping: API session → ImagingSession
// ─────────────────────────────────────────────────────────────────────────────
function mapApiSession(data: any): ImagingSession {
  return {
    id: data.id,
    projectId: data.id, // session is its own project container for now
    date: new Date(data.date),
    startTime: new Date(data.date),
    endTime: data.sunriseTime ? new Date(data.sunriseTime) : undefined,
    status: data.status || 'planned',
    locationId: data.loc_name || '',
    totalIntegrationTime: data.totalIntegrationTime || 0,
    guidingRMS: data.guidingRMS || undefined,
    guidingRMSArcsec: data.guidingRMSArcsec || undefined,
    imagesCount: data.imagesCount || 0,
    notes: data.notes || '',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Telescopius sync (unchanged — external API)
// ─────────────────────────────────────────────────────────────────────────────

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
      const project = await fetchProjectDetail(projectId);
      for (const session of project.sessions) {
        await pushSessionToTelescopius(session, project, apiKey);
        status.sessionsSynced++;
      }
    }

    if (direction === 'pull' || direction === 'bidirectional') {
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

// ─────────────────────────────────────────────────────────────────────────────
// Progress calculation (pure function)
// ─────────────────────────────────────────────────────────────────────────────

export function calculateProjectProgress(
  targetTime: number,
  capturedTime: number,
  filterPlans: FilterPlan[]
): number {
  if (targetTime <= 0) return 0;
  const baseProgress = Math.min(100, (capturedTime / targetTime) * 100);
  const allFiltersComplete = filterPlans.length > 0 && filterPlans.every(f => f.isComplete);
  if (allFiltersComplete && baseProgress >= 95) return 100;
  return Math.round(baseProgress);
}