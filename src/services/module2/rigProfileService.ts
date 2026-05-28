// ============================================================================
// SERVICE : Rig Profile Manager
// Module 2 — Gestion des profils de rigs avec persistence localStorage
// ============================================================================

import { RigProfile, RigCalculations, SamplingRecommendation, CreateRigProfileDTO, GuidingConfigDTO } from '../types/module2';

const STORAGE_KEY = 'apls_rig_profiles';
const ACTIVE_PROFILE_KEY = 'apls_active_rig_profile_id';

// ─────────────────────────────────────────────────────────────────────────────
// CRUD Profils
// ─────────────────────────────────────────────────────────────────────────────

export function getAllProfiles(): RigProfile[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [getDefaultProfile()];
    const profiles: RigProfile[] = JSON.parse(data);
    return profiles.length > 0 ? profiles : [getDefaultProfile()];
  } catch {
    return [getDefaultProfile()];
  }
}

export function getProfileById(id: string): RigProfile | undefined {
  return getAllProfiles().find(p => p.id === id);
}

export function getDefaultProfile(): RigProfile {
  const profiles = getAllProfiles();
  return profiles.find(p => p.isDefault) || profiles[0];
}

export function getActiveProfileId(): string | null {
  return localStorage.getItem(ACTIVE_PROFILE_KEY);
}

export function setActiveProfileId(id: string): void {
  localStorage.setItem(ACTIVE_PROFILE_KEY, id);
}

export function createProfile(dto: CreateRigProfileDTO): RigProfile {
  const profiles = getAllProfiles();
  
  const newProfile: RigProfile = {
    id: generateProfileId(),
    name: dto.name,
    isDefault: dto.isDefault ?? false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    telescope: dto.telescope,
    modifier: dto.modifier,
    camera: dto.camera,
    guiding: dto.guiding,
    mount: dto.mount,
  };
  
  // Si ce profil devient défaut, retirer le flag des autres
  if (newProfile.isDefault) {
    profiles.forEach(p => { p.isDefault = false; });
  }
  
  profiles.push(newProfile);
  saveProfiles(profiles);
  
  // Activer automatiquement
  setActiveProfileId(newProfile.id);
  
  return newProfile;
}

export function updateProfile(id: string, dto: Partial<CreateRigProfileDTO>): RigProfile | null {
  const profiles = getAllProfiles();
  const index = profiles.findIndex(p => p.id === id);
  if (index === -1) return null;
  
  const profile = profiles[index];
  
  if (dto.name !== undefined) profile.name = dto.name;
  if (dto.telescope !== undefined) profile.telescope = dto.telescope;
  if (dto.modifier !== undefined) profile.modifier = dto.modifier;
  if (dto.camera !== undefined) profile.camera = dto.camera;
  if (dto.guiding !== undefined) profile.guiding = dto.guiding;
  if (dto.mount !== undefined) profile.mount = dto.mount;
  if (dto.isDefault !== undefined) {
    profile.isDefault = dto.isDefault;
    if (dto.isDefault) {
      profiles.forEach((p, i) => { if (i !== index) p.isDefault = false; });
    }
  }
  
  profile.updatedAt = new Date().toISOString();
  saveProfiles(profiles);
  
  return profile;
}

export function deleteProfile(id: string): boolean {
  const profiles = getAllProfiles();
  const index = profiles.findIndex(p => p.id === id);
  if (index === -1) return false;
  if (profiles.length <= 1) return false; // Garder au moins un profil
  
  const wasDefault = profiles[index].isDefault;
  profiles.splice(index, 1);
  
  if (wasDefault && profiles.length > 0) {
    profiles[0].isDefault = true;
  }
  
  saveProfiles(profiles);
  
  // Réinitialiser l'actif si nécessaire
  const activeId = getActiveProfileId();
  if (activeId === id) {
    setActiveProfileId(profiles[0].id);
  }
  
  return true;
}

export function duplicateProfile(id: string, newName?: string): RigProfile | null {
  const profile = getProfileById(id);
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

function saveProfiles(profiles: RigProfile[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

function generateProfileId(): string {
  return `rig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// CALCULS
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
  
  // Calculs guidage
  if (profile.guiding.focalLength && profile.guiding.pixelSize) {
    const guidingPixelScale = (profile.guiding.pixelSize * 206.265) / profile.guiding.focalLength;
    const ratio = pixelScale / guidingPixelScale;
    
    calc.guidingPixelScale = parseFloat(guidingPixelScale.toFixed(2));
    calc.guidingRatio = parseFloat(ratio.toFixed(2));
    calc.guidingRatioValid = ratio < 0.2; // < 1:5
    
    // Dither recommandé (3px minimum sur capteur principal)
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
      explanation: 'Sous-échantillonnage critique. Étoiles carrées. Drizzle 2× + dithering agressif.',
      ditherRequired: true,
      ditherMinPixels: 5,
      colorCode: 'red',
    };
  } else if (pixelScale > 1.5) {
    return {
      status: 'undersampled_moderate',
      drizzleRecommendation: '2x',
      pixelDrop: 0.7,
      explanation: 'Sous-échantillonnage modéré. Drizzle 2× avec Pixel Drop 0.7.',
      ditherRequired: true,
      ditherMinPixels: 3,
      colorCode: 'orange',
    };
  } else if (pixelScale > 0.8) {
    return {
      status: 'ideal',
      drizzleRecommendation: 'none',
      explanation: 'Zone idéale. Pas de Drizzle nécessaire.',
      ditherRequired: true,
      ditherMinPixels: 3,
      colorCode: 'green',
    };
  } else {
    return {
      status: 'oversampled',
      drizzleRecommendation: 'bin2x2',
      explanation: 'Sur-échantillonnage. Drizzle déconseillé. Binning 2×2 recommandé.',
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
      : `Ratio ${ratio.toFixed(2)} trop élevé. Guide scope trop court ou capteur guidage trop gros.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PRESETS
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
    description: 'Réfracteur APO 102mm, focale 714mm',
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
    name: 'Réducteur 0.73×',
    description: 'Réducteur/correcteur 0.73×',
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
    description: 'Flatteur/correcteur (pas de réduction)',
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
    description: 'Caméra guidage 3.75μm + lunette 120mm f/4',
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
    description: 'Caméra guidage 5.86μm + lunette 180mm',
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
    description: 'Monture équatoriale 15kg',
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
    description: 'Monture équatoriale 20kg',
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
    description: 'Setup complet : TS-Optics 102mm f/7 + ASI533MC Pro + réducteur 0.73×',
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
    description: 'Setup complet : Celestron EdgeHD 8" + ASI2600MM Pro + réducteur 0.7×',
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

export function importProfile(jsonString: string): RigProfile | null {
  try {
    const data = JSON.parse(jsonString);
    if (data.version !== 'apls-v3') return null;
    
    const profile = data.profile;
    // Générer nouvel ID pour éviter conflits
    profile.id = generateProfileId();
    profile.name = `${profile.name} (importé)`;
    profile.isDefault = false;
    profile.createdAt = new Date().toISOString();
    profile.updatedAt = new Date().toISOString();
    
    return profile;
  } catch {
    return null;
  }
}
