// ============================================================================
// SERVICE : Rig Profile Manager
// Module 2 — Gestion des profils de rigs avec persistence API SQLite
// Migrated from localStorage → /api/apls/rigs
// ============================================================================

import { RigProfile, RigCalculations, SamplingRecommendation, CreateRigProfileDTO, GuidingConfigDTO } from '../types/module2';

const API_BASE = '/api/apls/rigs';
export const ACTIVE_PROFILE_KEY = 'apls_active_rig_profile_id';

// ─────────────────────────────────────────────────────────────────────────────
// Token helper (reuse same pattern as api.ts)
// ─────────────────────────────────────────────────────────────────────────────
function getToken(): string | null {
  return localStorage.getItem('astrosuite_token');
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
// Mapping: API response → Frontend RigProfile
// API uses: opticModifier, imagingCamera, guidingCamera
// Frontend uses: modifier, camera, guiding
// ─────────────────────────────────────────────────────────────────────────────
function mapApiToProfile(data: any): RigProfile {
  return {
    id: data.id,
    name: data.name,
    isDefault: data.isDefault || false,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
    telescope: {
      name: data.telescope?.name || '',
      focalLength: data.telescope?.focalLength || 0,
      aperture: data.telescope?.aperture || 0,
      fRatio: data.telescope?.fRatio || 0,
      type: data.telescope?.type || 'Refractor',
    },
    modifier: {
      type: data.opticModifier?.type || data.modifier?.type || 'None',
      factor: data.opticModifier?.factor ?? data.modifier?.factor ?? 1.0,
    },
    camera: {
      name: data.imagingCamera?.name || data.camera?.name || '',
      sensorWidth: data.imagingCamera?.sensorWidth || data.camera?.sensorWidth || 0,
      sensorHeight: data.imagingCamera?.sensorHeight || data.camera?.sensorHeight || 0,
      pixelSize: data.imagingCamera?.pixelSize || data.camera?.pixelSize || 0,
      resolutionX: data.imagingCamera?.resolutionX || data.camera?.resolutionX || 0,
      resolutionY: data.imagingCamera?.resolutionY || data.camera?.resolutionY || 0,
      readNoise: data.imagingCamera?.readNoise || data.camera?.readNoise || 0,
      quantumEfficiency: data.imagingCamera?.quantumEfficiency || data.camera?.quantumEfficiency || 0,
      isColor: data.imagingCamera?.isColor ?? data.camera?.isColor ?? true,
      hasCooling: data.imagingCamera?.hasCooling ?? data.camera?.hasCooling ?? false,
      binningAcquisition: data.imagingCamera?.binningAcquisition || data.camera?.binningAcquisition || 1,
    },
    guiding: {
      cameraName: data.guidingCamera?.name || data.guiding?.cameraName || '',
      pixelSize: data.guidingCamera?.pixelSize || data.guiding?.pixelSize || 0,
      binning: data.guidingCamera?.binning || data.guiding?.binning || 1,
      mode: data.guidingCamera?.mode || data.guiding?.mode || 'GuideScope',
      focalLength: data.guidingCamera?.focalLength ?? data.guiding?.focalLength,
    },
    mount: {
      name: data.mount?.name || '',
      type: data.mount?.type || 'EQ',
      maxPayload: data.mount?.maxPayload || 0,
    },
  };
}

// Mapping: Frontend CreateRigProfileDTO → API body
function mapDtoToApiBody(dto: CreateRigProfileDTO): any {
  return {
    name: dto.name,
    isDefault: dto.isDefault ?? false,
    telescope: {
      name: dto.telescope.name,
      focalLength: dto.telescope.focalLength,
      aperture: dto.telescope.aperture,
      fRatio: dto.telescope.fRatio,
      type: dto.telescope.type,
    },
    opticModifier: {
      type: dto.modifier.type,
      factor: dto.modifier.factor,
    },
    imagingCamera: {
      name: dto.camera.name,
      sensorWidth: dto.camera.sensorWidth,
      sensorHeight: dto.camera.sensorHeight,
      pixelSize: dto.camera.pixelSize,
      resolutionX: dto.camera.resolutionX,
      resolutionY: dto.camera.resolutionY,
      readNoise: dto.camera.readNoise,
      quantumEfficiency: dto.camera.quantumEfficiency,
      isColor: dto.camera.isColor,
      hasCooling: dto.camera.hasCooling,
      binningAcquisition: dto.camera.binningAcquisition,
    },
    guidingCamera: {
      name: dto.guiding.cameraName,
      pixelSize: dto.guiding.pixelSize,
      binning: dto.guiding.binning,
      mode: dto.guiding.mode,
      focalLength: dto.guiding.focalLength,
    },
    mount: {
      name: dto.mount.name,
      type: dto.mount.type,
      maxPayload: dto.mount.maxPayload,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CRUD Profils (async — API calls)
// ─────────────────────────────────────────────────────────────────────────────

export async function getAllProfiles(): Promise<RigProfile[]> {
  try {
    const data = await apiFetch<any[]>('');
    if (data.length > 0) {
      return data.map(mapApiToProfile);
    }
    // No profiles in DB yet — create the default one
    const created = await createProfile({
      name: 'Default Rig',
      isDefault: true,
      telescope: { name: '', focalLength: 714, aperture: 102, fRatio: 7, type: 'Refractor' },
      modifier: { type: 'None', factor: 1.0 },
      camera: { name: '', sensorWidth: 11.3, sensorHeight: 11.3, pixelSize: 3.76, resolutionX: 3008, resolutionY: 3008, readNoise: 1.5, quantumEfficiency: 0.8, isColor: true, hasCooling: true, binningAcquisition: 1 },
      guiding: { cameraName: '', pixelSize: 3.75, binning: 1, mode: 'GuideScope', focalLength: 120 },
      mount: { name: '', type: 'EQ', maxPayload: 15 },
    });
    return [created];
  } catch (err) {
    console.error('Failed to fetch rig profiles from API:', err);
    return [];
  }
}

export async function getProfileById(id: string): Promise<RigProfile | undefined> {
  try {
    const data = await apiFetch<any>(`/${id}`);
    return mapApiToProfile(data);
  } catch {
    return undefined;
  }
}

export function getDefaultProfileSync(): RigProfile {
  // Default profile for fallback only
  return {
    id: 'default',
    name: 'Default Rig',
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    telescope: { name: '', focalLength: 714, aperture: 102, fRatio: 7, type: 'Refractor' },
    modifier: { type: 'None', factor: 1.0 },
    camera: { name: '', sensorWidth: 11.3, sensorHeight: 11.3, pixelSize: 3.76, resolutionX: 3008, resolutionY: 3008, readNoise: 1.5, quantumEfficiency: 0.8, isColor: true, hasCooling: true, binningAcquisition: 1 },
    guiding: { cameraName: '', pixelSize: 3.75, binning: 1, mode: 'GuideScope', focalLength: 120 },
    mount: { name: '', type: 'EQ', maxPayload: 15 },
  };
}

export async function getDefaultProfile(): Promise<RigProfile> {
  const profiles = await getAllProfiles();
  return profiles.find(p => p.isDefault) || profiles[0];
}

export function getActiveProfileId(): string | null {
  return localStorage.getItem(ACTIVE_PROFILE_KEY);
}

export function setActiveProfileId(id: string): void {
  localStorage.setItem(ACTIVE_PROFILE_KEY, id);
}

export async function createProfile(dto: CreateRigProfileDTO): Promise<RigProfile> {
  const body = mapDtoToApiBody(dto);
  const data = await apiFetch<any>('', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const profile = mapApiToProfile(data);

  // If this is the new default, auto-activate it
  if (profile.isDefault || dto.isDefault) {
    setActiveProfileId(profile.id);
  }

  return profile;
}

export async function updateProfile(id: string, dto: Partial<CreateRigProfileDTO>): Promise<RigProfile | null> {
  // Build the API body from partial DTO
  const body: any = {};
  if (dto.name !== undefined) body.name = dto.name;
  if (dto.isDefault !== undefined) body.isDefault = dto.isDefault;
  if (dto.telescope !== undefined) body.telescope = { name: dto.telescope.name, focalLength: dto.telescope.focalLength, aperture: dto.telescope.aperture, fRatio: dto.telescope.fRatio, type: dto.telescope.type };
  if (dto.modifier !== undefined) body.opticModifier = { type: dto.modifier.type, factor: dto.modifier.factor };
  if (dto.camera !== undefined) body.imagingCamera = { name: dto.camera.name, sensorWidth: dto.camera.sensorWidth, sensorHeight: dto.camera.sensorHeight, pixelSize: dto.camera.pixelSize, resolutionX: dto.camera.resolutionX, resolutionY: dto.camera.resolutionY, readNoise: dto.camera.readNoise, quantumEfficiency: dto.camera.quantumEfficiency, isColor: dto.camera.isColor, hasCooling: dto.camera.hasCooling, binningAcquisition: dto.camera.binningAcquisition };
  if (dto.guiding !== undefined) body.guidingCamera = { name: dto.guiding.cameraName, pixelSize: dto.guiding.pixelSize, binning: dto.guiding.binning, mode: dto.guiding.mode, focalLength: dto.guiding.focalLength };
  if (dto.mount !== undefined) body.mount = { name: dto.mount.name, type: dto.mount.type, maxPayload: dto.mount.maxPayload };

  try {
    const data = await apiFetch<any>(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return mapApiToProfile(data);
  } catch (err) {
    console.error('Failed to update rig profile:', err);
    return null;
  }
}

export async function deleteProfile(id: string): Promise<boolean> {
  try {
    await apiFetch<any>(`/${id}`, { method: 'DELETE' });

    // Reset active if needed
    const activeId = getActiveProfileId();
    if (activeId === id) {
      localStorage.removeItem(ACTIVE_PROFILE_KEY);
    }
    return true;
  } catch {
    return false;
  }
}

export async function duplicateProfile(id: string, newName?: string): Promise<RigProfile | null> {
  const profile = await getProfileById(id);
  if (!profile) return null;

  return createProfile({
    name: newName || `${profile.name} (copie)`,
    telescope: { ...profile.telescope },
    modifier: { ...profile.modifier },
    camera: { ...profile.camera },
    guiding: { ...profile.guiding },
    mount: { ...profile.mount },
    isDefault: false,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CALCULS (pure functions — no API needed)
// ─────────────────────────────────────────────────────────────────────────────

export function calculateRigCalculations(profile: RigProfile): RigCalculations {
  const effFL = profile.telescope.focalLength * profile.modifier.factor;
  const pixelScale = (profile.camera.pixelSize * 206.265) / effFL;
  const fovWidth = (profile.camera.sensorWidth * 206.265) / effFL;
  const fovHeight = (profile.camera.sensorHeight * 206.265) / effFL;
  const fRatio = effFL / profile.telescope.aperture;

  const calc: RigCalculations = {
    effectiveFocalLength: Math.round(effFL),
    pixelScale: parseFloat(pixelScale.toFixed(2)),
    fovWidth: parseFloat(fovWidth.toFixed(1)),
    fovHeight: parseFloat(fovHeight.toFixed(1)),
    fRatio: parseFloat(fRatio.toFixed(1)),
  };

  // Guiding calculations
  if (profile.guiding.mode === 'OAG') {
    // OAG uses same optical path — ratio is always 1:1
    calc.guidingPixelScale = calc.pixelScale; // same path = same scale
    calc.guidingRatio = 1.0;
    calc.guidingRatioValid = true;
    calc.recommendedDitherPixels = 3; // same pixels on both sensors
  } else if (profile.guiding.focalLength && profile.guiding.pixelSize) {
    const guidingPixelScale = (profile.guiding.pixelSize * 206.265) / profile.guiding.focalLength;
    const ratio = pixelScale / guidingPixelScale;

    calc.guidingPixelScale = parseFloat(guidingPixelScale.toFixed(2));
    calc.guidingRatio = parseFloat(ratio.toFixed(2));
    calc.guidingRatioValid = ratio < 0.2; // < 1:5

    const ditherPixelsImaging = 3;
    calc.recommendedDitherPixels = Math.ceil(ditherPixelsImaging * ratio);
  }

  return calc;
}

export function getSamplingRecommendation(pixelScale: number): SamplingRecommendation {
  if (pixelScale > 2.5) {
    return {
      status: 'undersampled_critical',
      drizzleRecommendation: '2x_aggressive',
      explanation: 'Critical undersampling. Blocky stars. Drizzle 2× + aggressive dithering required.',
      ditherRequired: true,
      ditherMinPixels: 5,
      colorCode: 'red',
    };
  } else if (pixelScale > 1.5) {
    return {
      status: 'undersampled_moderate',
      drizzleRecommendation: '2x',
      pixelDrop: 0.7,
      explanation: 'Moderate undersampling. Drizzle 2× with Pixel Drop 0.7.',
      ditherRequired: true,
      ditherMinPixels: 3,
      colorCode: 'orange',
    };
  } else if (pixelScale > 0.8) {
    return {
      status: 'ideal',
      drizzleRecommendation: 'none',
      explanation: 'Ideal zone. No Drizzle needed.',
      ditherRequired: true,
      ditherMinPixels: 3,
      colorCode: 'green',
    };
  } else {
    return {
      status: 'oversampled',
      drizzleRecommendation: 'bin2x2',
      explanation: 'Oversampled. Drizzle not recommended. Binning 2×2 recommended.',
      ditherRequired: false,
      ditherMinPixels: 0,
      colorCode: 'blue',
    };
  }
}

export function calculateDitherPixels(
  ditherPrincipalPixels: number,
  imagingPixelScale: number,
  guidingPixelScale: number
): number {
  return Math.ceil(ditherPrincipalPixels * (imagingPixelScale / guidingPixelScale));
}

export function validateGuidingRatio(
  imagingPixelScale: number,
  guidingPixelScale: number
): { isValid: boolean; ratio: number; message: string } {
  const ratio = imagingPixelScale / guidingPixelScale;
  const isValid = ratio < 0.2; // < 1:5
  return {
    isValid,
    ratio: parseFloat(ratio.toFixed(2)),
    message: isValid
      ? `Ratio ${ratio.toFixed(2)} OK (< 1:5)`
      : `Ratio ${ratio.toFixed(2)} too high. Guide scope too short or guide camera pixels too large.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PRESETS (unchanged — static data, no API needed)
// ─────────────────────────────────────────────────────────────────────────────

export interface EquipmentPreset {
  id: string;
  name: string;
  description: string;
  category: 'telescope' | 'camera' | 'guiding' | 'mount' | 'full-rig';
  data: Partial<RigProfile>;
}

export const TELESCOPE_PRESETS: EquipmentPreset[] = [
  {
    id: 'ts-optics-102',
    name: 'TS-Optics 102mm f/7',
    description: 'APO 102mm refractor, 714mm focal length',
    category: 'telescope',
    data: {
      telescope: {
        name: 'TS-Optics 102mm f/7',
        focalLength: 714,
        aperture: 102,
        fRatio: 7,
        type: 'Refractor',
      },
    },
  },
  {
    id: 'cel-130-pdsa',
    name: 'Celestron 130PDS f/5',
    description: 'Newton 130mm, focale 650mm',
    category: 'telescope',
    data: {
      telescope: {
        name: 'Celestron 130PDS',
        focalLength: 650,
        aperture: 130,
        fRatio: 5,
        type: 'Reflector',
      },
    },
  },
  {
    id: 'edgehd-8',
    name: 'Celestron EdgeHD 8"',
    description: 'SCT 203mm, focale 2032mm',
    category: 'telescope',
    data: {
      telescope: {
        name: 'Celestron EdgeHD 8"',
        focalLength: 2032,
        aperture: 203,
        fRatio: 10,
        type: 'SCT',
      },
    },
  },
  {
    id: 'reducer-073',
    name: '0.73× Reducer',
    description: '0.73× reducer/corrector',
    category: 'telescope',
    data: {
      modifier: {
        type: 'Reducer',
        factor: 0.73,
      },
    },
  },
  {
    id: 'flattener-1',
    name: 'Flatteur 1.0×',
    description: 'Flattener/corrector (no reduction)',
    category: 'telescope',
    data: {
      modifier: {
        type: 'Flattener',
        factor: 1.0,
      },
    },
  },
];

export const CAMERA_PRESETS: EquipmentPreset[] = [
  {
    id: 'asi533mc',
    name: 'ZWO ASI533MC Pro',
    description: 'Capteur 11.3×11.3mm, 3.76μm, 3008×3008',
    category: 'camera',
    data: {
      camera: {
        name: 'ZWO ASI533MC Pro',
        sensorWidth: 11.3,
        sensorHeight: 11.3,
        pixelSize: 3.76,
        resolutionX: 3008,
        resolutionY: 3008,
        readNoise: 1.5,
        quantumEfficiency: 0.8,
        isColor: true,
        hasCooling: true,
        binningAcquisition: 1,
      },
    },
  },
  {
    id: 'asi294mc',
    name: 'ZWO ASI294MC Pro',
    description: 'Capteur 19.1×13.0mm, 4.63μm, 4144×2822',
    category: 'camera',
    data: {
      camera: {
        name: 'ZWO ASI294MC Pro',
        sensorWidth: 19.1,
        sensorHeight: 13.0,
        pixelSize: 4.63,
        resolutionX: 4144,
        resolutionY: 2822,
        readNoise: 1.2,
        quantumEfficiency: 0.75,
        isColor: true,
        hasCooling: true,
        binningAcquisition: 1,
      },
    },
  },
  {
    id: 'asi2600mm',
    name: 'ZWO ASI2600MM Pro',
    description: 'Capteur 23.5×15.7mm, 3.76μm, 6244×4168, Mono',
    category: 'camera',
    data: {
      camera: {
        name: 'ZWO ASI2600MM Pro',
        sensorWidth: 23.5,
        sensorHeight: 15.7,
        pixelSize: 3.76,
        resolutionX: 6244,
        resolutionY: 4168,
        readNoise: 1.0,
        quantumEfficiency: 0.91,
        isColor: false,
        hasCooling: true,
        binningAcquisition: 1,
      },
    },
  },
];

export const GUIDING_PRESETS: EquipmentPreset[] = [
  {
    id: 'guide-120mm',
    name: 'ZWO 120MM-mini + 30mm',
    description: 'Guide camera 3.75μm + guide scope 120mm f/4',
    category: 'guiding',
    data: {
      guiding: {
        cameraName: 'ZWO 120MM-mini',
        pixelSize: 3.75,
        binning: 1,
        mode: 'GuideScope',
        focalLength: 120,
      },
    },
  },
  {
    id: 'guide-174mm',
    name: 'ZWO 174MM + 50mm',
    description: 'Guide camera 5.86μm + guide scope 180mm',
    category: 'guiding',
    data: {
      guiding: {
        cameraName: 'ZWO 174MM',
        pixelSize: 5.86,
        binning: 1,
        mode: 'GuideScope',
        focalLength: 180,
      },
    },
  },
];

export const MOUNT_PRESETS: EquipmentPreset[] = [
  {
    id: 'heq5',
    name: 'Sky-Watcher HEQ5',
    description: 'Equatorial mount 15kg payload',
    category: 'mount',
    data: {
      mount: {
        name: 'Sky-Watcher HEQ5',
        type: 'EQ',
        maxPayload: 15,
      },
    },
  },
  {
    id: 'eq6r',
    name: 'Sky-Watcher EQ6-R Pro',
    description: 'Equatorial mount 20kg payload',
    category: 'mount',
    data: {
      mount: {
        name: 'Sky-Watcher EQ6-R Pro',
        type: 'EQ',
        maxPayload: 20,
      },
    },
  },
];

export const FULL_RIG_PRESETS: EquipmentPreset[] = [
  {
    id: 'rig-ts-asi533',
    name: 'TS-Optics 102 + ASI533MC',
    description: 'Full setup: TS-Optics 102mm f/7 + ASI533MC Pro + 0.73× reducer',
    category: 'full-rig',
    data: {
      telescope: {
        name: 'TS-Optics 102mm f/7',
        focalLength: 714,
        aperture: 102,
        fRatio: 7,
        type: 'Refractor',
      },
      modifier: {
        type: 'Reducer',
        factor: 0.73,
      },
      camera: {
        name: 'ZWO ASI533MC Pro',
        sensorWidth: 11.3,
        sensorHeight: 11.3,
        pixelSize: 3.76,
        resolutionX: 3008,
        resolutionY: 3008,
        readNoise: 1.5,
        quantumEfficiency: 0.8,
        isColor: true,
        hasCooling: true,
        binningAcquisition: 1,
      },
      guiding: {
        cameraName: 'ZWO 120MM-mini',
        pixelSize: 3.75,
        binning: 1,
        mode: 'GuideScope',
        focalLength: 120,
      },
      mount: {
        name: 'Sky-Watcher HEQ5',
        type: 'EQ',
        maxPayload: 15,
      },
    },
  },
  {
    id: 'rig-edgehd-2600',
    name: 'EdgeHD 8" + ASI2600MM',
    description: 'Full setup: Celestron EdgeHD 8" + ASI2600MM Pro + 0.7× reducer',
    category: 'full-rig',
    data: {
      telescope: {
        name: 'Celestron EdgeHD 8"',
        focalLength: 2032,
        aperture: 203,
        fRatio: 10,
        type: 'SCT',
      },
      modifier: {
        type: 'Reducer',
        factor: 0.7,
      },
      camera: {
        name: 'ZWO ASI2600MM Pro',
        sensorWidth: 23.5,
        sensorHeight: 15.7,
        pixelSize: 3.76,
        resolutionX: 6244,
        resolutionY: 4168,
        readNoise: 1.0,
        quantumEfficiency: 0.91,
        isColor: false,
        hasCooling: true,
        binningAcquisition: 1,
      },
      guiding: {
        cameraName: 'ZWO 174MM',
        pixelSize: 5.86,
        binning: 1,
        mode: 'OAG',
        focalLength: 2032,
      },
      mount: {
        name: 'Sky-Watcher EQ6-R Pro',
        type: 'EQ',
        maxPayload: 20,
      },
    },
  },
];

export function getAllPresets(): EquipmentPreset[] {
  return [
    ...TELESCOPE_PRESETS,
    ...CAMERA_PRESETS,
    ...GUIDING_PRESETS,
    ...MOUNT_PRESETS,
    ...FULL_RIG_PRESETS,
  ];
}

export function getPresetsByCategory(category: EquipmentPreset['category']): EquipmentPreset[] {
  switch (category) {
    case 'telescope': return TELESCOPE_PRESETS;
    case 'camera': return CAMERA_PRESETS;
    case 'guiding': return GUIDING_PRESETS;
    case 'mount': return MOUNT_PRESETS;
    case 'full-rig': return FULL_RIG_PRESETS;
    default: return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Export / Import
// ─────────────────────────────────────────────────────────────────────────────

export function exportProfile(profile: RigProfile): string {
  const exportData = {
    version: 'apls-v3' as const,
    profile,
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(exportData, null, 2);
}

export async function importProfile(jsonString: string): Promise<RigProfile | null> {
  try {
    const data = JSON.parse(jsonString);
    if (data.version !== 'apls-v3') return null;

    const profile = data.profile;
    // Create via API — generates new ID
    const created = await createProfile({
      name: `${profile.name} (imported)`,
      telescope: { ...profile.telescope },
      modifier: { ...profile.modifier },
      camera: { ...profile.camera },
      guiding: { ...profile.guiding },
      mount: { ...profile.mount },
      isDefault: false,
    });

    return created;
  } catch {
    return null;
  }
}