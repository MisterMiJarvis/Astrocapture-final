// User Service — CRUD users via Hono API (SQLite backend)
import { User } from '../types';

const API_BASE = '/api';

// Helper to get auth token
// For admin pages: use the existing admin token from api.ts
// For Astro Suite: use the astro suite token
function getAuthToken(): string | null {
  return localStorage.getItem('astrosuite_token');
}

// Helper for API requests
async function apiRequest(method: string, path: string, body?: any): Promise<Response> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  
  return response;
}

// Authenticate user (Astro Suite login)
export async function authenticateUser(email: string, password: string): Promise<{ user: User; token: string } | null> {
  try {
    const response = await fetch(`${API_BASE}/auth/astro-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (data.token && data.user) {
      // Store token for Astro Suite
      localStorage.setItem('astrosuite_token', data.token);
      localStorage.setItem('astrosuite_user', JSON.stringify(data.user));
      return { user: data.user, token: data.token };
    }
    return null;
  } catch {
    return null;
  }
}

// Get all users (admin only)
export async function getAllUsers(): Promise<User[]> {
  try {
    const response = await apiRequest('GET', '/users');
    if (!response.ok) return [];
    const data = await response.json();
    return data.users || [];
  } catch {
    return [];
  }
}

// Create user (admin only)
export async function createUser(data: {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  isAdmin: boolean;
}): Promise<User | null> {
  try {
    const response = await apiRequest('POST', '/users', data);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create user');
    }
    const result = await response.json();
    return result.user;
  } catch (err) {
    throw err;
  }
}

// Update user (admin only)
export async function updateUser(id: string, data: {
  email?: string;
  firstName?: string;
  lastName?: string;
  password?: string;
  isAdmin?: boolean;
}): Promise<boolean> {
  try {
    const response = await apiRequest('PUT', `/users/${id}`, data);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update user');
    }
    return true;
  } catch (err) {
    throw err;
  }
}

// Delete user (admin only)
export async function deleteUser(id: string): Promise<boolean> {
  try {
    const response = await apiRequest('DELETE', `/users/${id}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete user');
    }
    return true;
  } catch (err) {
    throw err;
  }
}

// Get current Astro Suite user from localStorage
export function getCurrentAstroSuiteUser(): User | null {
  const stored = localStorage.getItem('astrosuite_user');
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    localStorage.removeItem('astrosuite_user');
    return null;
  }
}

// Logout Astro Suite user
export function logoutAstroSuite(): void {
  localStorage.removeItem('astrosuite_token');
  localStorage.removeItem('astrosuite_user');
}