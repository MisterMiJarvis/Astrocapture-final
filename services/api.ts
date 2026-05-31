// AstroCapture API Service Layer
// All data access via REST API calls to /api/*

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

// Read token directly from localStorage — cache removed to avoid stale null bugs
function getToken(): string | null {
  return localStorage.getItem('astrocapture_token');
}
export function invalidateTokenCache(): void {
  // No-op: cache removed, token is read directly from localStorage
}

// Helper for API calls
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

// Upload a file (multipart)
async function uploadFile(file: File, path: string = 'uploads'): Promise<{ id: string; url: string; filename: string }> {
  const token = getToken();
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || `Upload error: ${res.status}`);
  }
  return res.json();
}

// =====================
// AUTH
// =====================

export const auth = {
  async login(email: string, password: string) {
    const result = await apiFetch<{ token: string; user: { id: string; email: string } }>('/auth/login', {
      method: 'POST', body: JSON.stringify({ email, password }),
    });
    localStorage.setItem('astrocapture_token', result.token);
    invalidateTokenCache();
    return result;
  },

  async setup(email: string, password: string) {
    const result = await apiFetch<{ token: string; user: { id: string; email: string } }>('/auth/setup', {
      method: 'POST', body: JSON.stringify({ email, password }),
    });
    localStorage.setItem('astrocapture_token', result.token);
    invalidateTokenCache();
    return result;
  },

  logout() {
    localStorage.removeItem('astrocapture_token');
    invalidateTokenCache();
  },

  async me() {
    return apiFetch<{ user: { id: string; email: string } }>('/auth/me');
  },

  isLoggedIn() {
    return !!getToken();
  },
};

// =====================
// POSTS
// =====================

export const posts = {
  list(filters?: { tag?: string; wall?: boolean }) {
    const params = new URLSearchParams();
    if (filters?.tag) params.set('tag', filters.tag);
    if (filters?.wall) params.set('wall', 'true');
    return apiFetch<any[]>(`/posts?${params.toString()}`);
  },

  get(id: string) {
    return apiFetch<any>(`/posts/${id}`);
  },

  create(data: any) {
    return apiFetch<any>('/posts', { method: 'POST', body: JSON.stringify(data) });
  },

  update(id: string, data: any) {
    return apiFetch<any>(`/posts/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  delete(id: string) {
    return apiFetch<{ ok: boolean }>(`/posts/${id}`, { method: 'DELETE' });
  },

  // Acquisition logs
  listAcquisitionLogs(postId: string) {
    return apiFetch<any[]>(`/posts/${postId}/acquisition-logs`);
  },

  addAcquisitionLog(postId: string, data: any) {
    return apiFetch<any>(`/posts/${postId}/acquisition-logs`, { method: 'POST', body: JSON.stringify(data) });
  },

  deleteAcquisitionLog(id: string) {
    return apiFetch<{ ok: boolean }>(`/acquisition-logs/${id}`, { method: 'DELETE' });
  },
};

// =====================
// PROCESSING POSTS
// =====================

export const processingPosts = {
  list(filters?: { type?: string; wall?: boolean }) {
    const params = new URLSearchParams();
    if (filters?.type) params.set('type', filters.type);
    if (filters?.wall) params.set('wall', 'true');
    return apiFetch<any[]>(`/processing-posts?${params.toString()}`);
  },

  get(id: string) {
    return apiFetch<any>(`/processing-posts/${id}`);
  },

  create(data: any) {
    return apiFetch<any>('/processing-posts', { method: 'POST', body: JSON.stringify(data) });
  },

  update(id: string, data: any) {
    return apiFetch<any>(`/processing-posts/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  delete(id: string) {
    return apiFetch<{ ok: boolean }>(`/processing-posts/${id}`, { method: 'DELETE' });
  },

  // Gallery images
  listGallery(postId: string) {
    return apiFetch<any[]>(`/processing-posts/${postId}/gallery`);
  },

  addGalleryImage(postId: string, data: any) {
    return apiFetch<any>(`/processing-posts/${postId}/gallery`, { method: 'POST', body: JSON.stringify(data) });
  },

  deleteGalleryImage(id: string) {
    return apiFetch<{ ok: boolean }>(`/processing-gallery/${id}`, { method: 'DELETE' });
  },
};

// =====================
// EQUIPMENT
// =====================

export const equipment = {
  list(filters?: { category?: string; personal?: boolean }) {
    const params = new URLSearchParams();
    if (filters?.category) params.set('category', filters.category);
    if (filters?.personal) params.set('personal', 'true');
    return apiFetch<any[]>(`/equipment?${params.toString()}`);
  },

  get(id: string) {
    return apiFetch<any>(`/equipment/${id}`);
  },

  create(data: any) {
    return apiFetch<any>('/equipment', { method: 'POST', body: JSON.stringify(data) });
  },

  update(id: string, data: any) {
    return apiFetch<any>(`/equipment/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  delete(id: string) {
    return apiFetch<{ ok: boolean }>(`/equipment/${id}`, { method: 'DELETE' });
  },
};

// =====================
// DSO CACHE
// =====================

export const dsoCache = {
  get(id: string) {
    return apiFetch<any>(`/dso/${encodeURIComponent(id)}`);
  },

  save(data: any) {
    return apiFetch<any>('/dso', { method: 'POST', body: JSON.stringify(data) });
  },
};

// =====================
// OBSERVATION TARGETS
// =====================

export const targets = {
  list(filters?: { completed?: boolean; priority?: string }) {
    const params = new URLSearchParams();
    if (filters?.completed !== undefined) params.set('completed', String(filters.completed));
    if (filters?.priority) params.set('priority', filters.priority);
    return apiFetch<any[]>(`/targets?${params.toString()}`);
  },

  get(id: string) {
    return apiFetch<any>(`/targets/${id}`);
  },

  create(data: any) {
    return apiFetch<any>('/targets', { method: 'POST', body: JSON.stringify(data) });
  },

  update(id: string, data: any) {
    return apiFetch<any>(`/targets/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  delete(id: string) {
    return apiFetch<{ ok: boolean }>(`/targets/${id}`, { method: 'DELETE' });
  },
};

// =====================
// OBSERVATION SESSIONS
// =====================

export const sessions = {
  list(filters?: { status?: string; from?: string; to?: string }) {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.from) params.set('from', filters.from);
    if (filters?.to) params.set('to', filters.to);
    return apiFetch<any[]>(`/sessions?${params.toString()}`);
  },

  get(id: string) {
    return apiFetch<any>(`/sessions/${id}`);
  },

  create(data: any) {
    return apiFetch<any>('/sessions', { method: 'POST', body: JSON.stringify(data) });
  },

  update(id: string, data: any) {
    return apiFetch<any>(`/sessions/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  delete(id: string) {
    return apiFetch<{ ok: boolean }>(`/sessions/${id}`, { method: 'DELETE' });
  },
};

// =====================
// SITE CONFIG (Settings)
// =====================

export const config = {
  get(id: string) {
    return apiFetch<any>(`/config/${id}`);
  },

  save(id: string, data: any) {
    return apiFetch<any>(`/config/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
};

// =====================
// UPLOAD
// =====================

export { uploadFile };

// =====================
// BACKWARD COMPAT shims
// =====================

// API-based real-time replacements (polling-based)

export const subscribeToSettings = (docName: string, onUpdate: (data: any) => void) => {
  // Replace real-time listener with a one-time fetch + polling
  config.get(docName).then(onUpdate).catch(console.error);
  const interval = setInterval(() => {
    config.get(docName).then(onUpdate).catch(console.error);
  }, 30000); // Poll every 30s
  return () => clearInterval(interval);
};

export const subscribeToCollection = (collectionName: string, onUpdate: (data: any[]) => void) => {
  // Map collection names to API endpoints
  const fetchers: Record<string, () => Promise<any[]>> = {
    posts: () => posts.list(),
    processingPosts: () => processingPosts.list(),
    processing_logs: () => Promise.resolve([]), // processing logs are embedded in posts
    gear: () => equipment.list(),
    my_equipment: () => equipment.list(),
    equipment: () => equipment.list(),
    observationTargets: () => targets.list(),
    observationSessions: () => sessions.list(),
  };

  const fetcher = fetchers[collectionName];
  if (!fetcher) {
    console.warn(`Unknown collection: ${collectionName}`);
    onUpdate([]);
    return () => {};
  }

  fetcher().then(onUpdate).catch(console.error);
  const interval = setInterval(() => {
    fetcher().then(onUpdate).catch(console.error);
  }, 30000);
  return () => clearInterval(interval);
};

export const saveSettings = (docName: string, data: any) => config.save(docName, data);
export const saveCollectionItem = (collectionName: string, id: string, data: any) => {
  const updaters: Record<string, (id: string, data: any) => Promise<any>> = {
    posts: posts.update,
    processingPosts: processingPosts.update,
    equipment: equipment.update,
    gear: equipment.update,
    my_equipment: equipment.update,
    observationTargets: targets.update,
    observationSessions: sessions.update,
  };
  // If no id match, it's a create
  const creators: Record<string, (data: any) => Promise<any>> = {
    posts: posts.create,
    processingPosts: processingPosts.create,
    equipment: equipment.create,
    gear: equipment.create,
    my_equipment: equipment.create,
    observationTargets: targets.create,
    observationSessions: sessions.create,
  };

  const updater = updaters[collectionName];
  const creator = creators[collectionName];
  if (updater && creator) {
    // Try update first, if 404 then create
    return updater(id, data).catch(() => creator({ ...data, id }));
  }
  return Promise.reject(new Error(`Unknown collection: ${collectionName}`));
};

export const deleteCollectionItem = (collectionName: string, id: string) => {
  const deleters: Record<string, (id: string) => Promise<any>> = {
    posts: posts.delete,
    processingPosts: processingPosts.delete,
    equipment: equipment.delete,
    gear: equipment.delete,
    my_equipment: equipment.delete,
    observationTargets: targets.delete,
    observationSessions: sessions.delete,
  };
  const deleter = deleters[collectionName];
  if (deleter) return deleter(id);
  return Promise.reject(new Error(`Unknown collection: ${collectionName}`));
};

export const getDocument = (collectionName: string, docId: string) => {
  // This is mainly used for DSO cache lookups
  if (collectionName === 'dsoCache') return dsoCache.get(docId);
  // For settings
  if (collectionName === 'settings') return config.get(docId);
  return Promise.reject(new Error(`Unknown collection: ${collectionName}`));
};

export const login = (email: string, password: string) => auth.login(email, password);
export const logout = () => auth.logout();
export const getAuthInstance = () => ({
  onAuthStateChanged: (callback: (user: any) => void) => {
    if (auth.isLoggedIn()) {
      auth.me().then(r => callback(r.user)).catch(() => callback(null));
    } else {
      callback(null);
    }
    return () => {};
  },
  signInWithEmailAndPassword: (_email: string, _password: string) => {
    return auth.login(_email, _password);
  },
  signOut: () => { auth.logout(); },
});