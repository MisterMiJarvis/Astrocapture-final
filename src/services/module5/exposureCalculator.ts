// ============================================================================
// SERVICE — Calculateur d'Exposition (Pipeline Physique)
// APLS v3 — Module 5
// ============================================================================

import {
  ExposureParams,
  ExposureResult,
  ReducerImpact,
  SNRSimulation,
  SNRPoint,
  FilterProfile,
  FilterType,
  SQMDynamicModel,
  EnvironmentConditions,
  DewAlert,
  DewRiskLevel,
} from '../../types/module5';

// Constantes physiques
const M_ZERO = 26.59; // Magnitude zéro

// ============================================================================
// PROFILS DE FILTRES (données terrain)
// ============================================================================

export const FILTER_PROFILES: Record<FilterType, FilterProfile> = {
  'UV_IR_Cut': {
    type: 'UV_IR_Cut',
    name: 'UV/IR Cut',
    bandwidthNm: 350,
    transmission: 1.0,
    skySuppression: 0.0,
    color: '#4FC3F7',
    description: 'Filtre de protection basique. Laisse passer tout le visible.',
    useCases: ['Nuits sans Lune', 'Pollution faible', 'Galaxies', 'Amas'],
    moonCompatible: false,
    recommendedTargets: ['Galaxies', 'Amas ouverts', 'Amas globulaires'],
  },
  'L_Ultimate': {
    type: 'L_Ultimate',
    name: 'L-Ultimate',
    bandwidthNm: 7,
    transmission: 0.85,
    skySuppression: 0.9,
    color: '#7C4DFF',
    description: 'Filtre dual-band Hα + OIII. Permet de shooter sous la Lune.',
    useCases: ['Nébuleuses Hα/OIII', 'Sous Lune', 'Pollution urbaine'],
    moonCompatible: true,
    recommendedTargets: ['Nébuleuses émission', 'Nébuleuses planétaires'],
  },
  'LPS_D2': {
    type: 'LPS_D2',
    name: 'LPS-D2',
    bandwidthNm: 25,
    transmission: 0.75,
    skySuppression: 0.6,
    color: '#FF9800',
    description: 'Filtre anti-pollution lumineuse. Sélectif sur sodium/mercure.',
    useCases: ['Pollution urbaine', 'Banlieue', 'Nuits claires'],
    moonCompatible: false,
    recommendedTargets: ['Galaxies', 'Nébuleuses', 'Amas'],
  },
  'Ha': {
    type: 'Ha',
    name: 'Hα (7nm)',
    bandwidthNm: 7,
    transmission: 0.90,
    skySuppression: 0.95,
    color: '#F44336',
    description: 'Filtre narrowband Hydrogène-alpha.',
    useCases: ['Nébuleuses Hα', 'Sous Lune', 'Bi-color', 'Tri-color'],
    moonCompatible: true,
    recommendedTargets: ['Nébuleuses émission', 'Rémanents supernovae'],
  },
  'OIII': {
    type: 'OIII',
    name: 'OIII (7nm)',
    bandwidthNm: 7,
    transmission: 0.90,
    skySuppression: 0.95,
    color: '#00BCD4',
    description: 'Filtre narrowband Oxygène III.',
    useCases: ['Nébuleuses OIII', 'Planétaires', 'Sous Lune'],
    moonCompatible: true,
    recommendedTargets: ['Nébuleuses planétaires', 'Nébuleuses émission'],
  },
  'SII': {
    type: 'SII',
    name: 'SII (7nm)',
    bandwidthNm: 7,
    transmission: 0.90,
    skySuppression: 0.95,
    color: '#E91E63',
    description: 'Filtre narrowband Soufre II.',
    useCases: ['Tri-color Hubble', 'Sous Lune', 'Nébuleuses'],
    moonCompatible: true,
    recommendedTargets: ['Nébuleuses émission', 'Nébuleuses sombres'],
  },
  'RGB': {
    type: 'RGB',
    name: 'RGB (One-Shot-Color)',
    bandwidthNm: 150,
    transmission: 1.0,
    skySuppression: 0.0,
    color: '#9C27B0',
    description: 'Pas de filtre additionnel — capteur OSC natif.',
    useCases: ['Nuits sans Lune', 'Couleur naturelle'],
    moonCompatible: false,
    recommendedTargets: ['Galaxies', 'Amas', 'Réflections'],
  },
  'Luminance': {
    type: 'Luminance',
    name: 'Luminance',
    bandwidthNm: 200,
    transmission: 1.0,
    skySuppression: 0.0,
    color: '#9E9E9E',
    description: 'Filtre Luminance pour imagerie LRGB.',
    useCases: ['Nuits sans Lune', 'LRGB'],
    moonCompatible: false,
    recommendedTargets: ['Galaxies', 'Amas', 'Toutes cibles LRGB'],
  },
};

// ============================================================================
// PIPELINE PHYSIQUE — Calculateur d'Exposition
// ============================================================================

/**
 * Étape 1 : Flux du ciel (photons/m²/s/arcsec²)
 * Φ_sky = 10^(0.4 × (26.59 - m_sky))
 */
export function calculateSkyFlux(skyMagnitude: number): number {
  return Math.pow(10, 0.4 * (M_ZERO - skyMagnitude));
}

/**
 * Étape 2 : Aperture effective (m²)
 * A = π × (D/2000)²  [D en mm]
 */
export function calculateApertureArea(apertureMm: number): number {
  const radiusM = apertureMm / 2000;
  return Math.PI * radiusM * radiusM;
}

/**
 * Étape 3 : Taux d'électrons fond de ciel (e⁻/px/sec)
 * B_sky = Φ_sky × A_aperture × p² × QE × τ
 * p en mètres (pixelSize_μm / 1e6)
 */
export function calculateSkyBrightness(
  skyFlux: number,
  apertureArea: number,
  pixelSizeMicrons: number,
  quantumEfficiency: number,
  filterTransmission: number
): number {
  const pixelSizeM = pixelSizeMicrons / 1_000_000;
  const pixelArea = pixelSizeM * pixelSizeM;
  return skyFlux * apertureArea * pixelArea * quantumEfficiency * filterTransmission;
}

/**
 * Étape 4 : Temps de pose optimal (secondes)
 * t_optimum = k × RN² / B_sky
 */
export function calculateOptimalExposureTime(
  skyBrightness: number,
  readNoise: number,
  kFactor: number = 5
): number {
  if (skyBrightness <= 0) return 0;
  return (kFactor * readNoise * readNoise) / skyBrightness;
}

/**
 * Pipeline complet — calcule le résultat d'exposition (v4 — SB-based + améliorations)
 *
 * v3: SB-based, skySuppression, SNR target adaptatif
 * v4 améliorations:
 * - #1: is_emission_nebula → skySuppression s'applique aux galaxies (spectre continu)
 * - #2: SNR target continu (fonction puissance, sans seuil brutal)
 * - #3: Dark current ajouté au bruit total
 * - #4: SNR pondéré par la taille angulaire (élément de résolution visuelle)
 */
export function calculateExposure(params: ExposureParams): ExposureResult {
  const fluxSky = calculateSkyFlux(params.skyMagnitude);
  const apertureArea = calculateApertureArea(params.aperture);

  // Sampling: (206.265 × pixelSize_μm) / focalLength_mm  [arcsec/px]
  let samplingSq: number;
  let sampling: number;
  if ((params as any).focalLength) {
    sampling = (206.265 * params.pixelSize) / (params as any).focalLength;
    samplingSq = sampling * sampling;
  } else {
    sampling = 0;
    const pixelSizeM = params.pixelSize / 1_000_000;
    samplingSq = pixelSizeM * pixelSizeM;
  }

  // --- Sky brightness WITH filter sky suppression ---
  const skySuppression = (params as any).skySuppression ?? 0;
  const effectiveSkyTransmission = params.filterTransmission * (1 - skySuppression);
  const bSky = fluxSky * apertureArea * samplingSq * params.quantumEfficiency * effectiveSkyTransmission;

  // --- Object signal per pixel (SB-based) ---
  // #1: Emission nebulae (Hα/OIII) are NOT suppressed by narrowband filters
  //     But galaxies (continuous spectrum) ARE suppressed just like the sky
  const objectSB = (params as any).objectSurfaceBrightness ?? params.skyMagnitude + 5;
  const isEmissionNebula = (params as any).isEmissionNebula ?? true;
  const objectFlux = Math.pow(10, 0.4 * (M_ZERO - objectSB));
  const objTransmission = isEmissionNebula
    ? params.filterTransmission                              // emission: only transmission loss
    : params.filterTransmission * (1 - skySuppression);     // continuum: skySuppression applies
  const Sobj = objectFlux * apertureArea * samplingSq * params.quantumEfficiency * objTransmission;

  // --- Optimal sub exposure time (sky-limited) ---
  const tOptimum = calculateOptimalExposureTime(bSky, params.readNoise, params.kFactor);
  const swampingFactor = bSky > 0 ? bSky / (params.readNoise * params.readNoise) : 0;

  // Dynamic sub exposure time
  const tSub = Math.max(30, Math.min(600, Math.round(tOptimum / 10) * 10));

  // --- #2: Continuous adaptive SNR target (no step function) ---
  // target_SNR = max(10, 30 × contrast^0.4)
  // Smooth curve: rises fast for faint objects, flattens for bright ones
  const contrast = bSky > 0 ? Sobj / bSky : 0;
  const targetSNR = (params as any).targetSNR ?? Math.max(10, 500 * Math.pow(Math.max(contrast, 0.001), 0.5));

  // --- #4: Angular size weighting (SNR per visual resolution element) ---
  // Large objects (M31, M42) tolerate lower per-pixel SNR because our eyes/brain
  // average adjacent pixels. Small objects (M97, M57) need higher per-pixel SNR.
  // objectSizeArcmin: diameter in arcminutes
  // pixelsCovered = object diameter / sampling [pixels]
  // weighting = sqrt(pixelsCovered) — effectively a binning factor
  const objectSizeArcmin = (params as any).objectSizeArcmin ?? 0;
  let sizeWeighting = 1;
  if (objectSizeArcmin > 0 && sampling > 0) {
    const objectDiameterPx = (objectSizeArcmin * 60) / sampling; // arcsec / (arcsec/px) = px
    // Normalize: 100px diameter = 1x weighting, larger objects get slight reduction
    sizeWeighting = Math.sqrt(Math.max(1, objectDiameterPx / 100));
  }
  // Effective target per pixel is reduced by the binning factor
  const effectiveTargetSNR = targetSNR / sizeWeighting;

  // --- #3: Dark current in noise ---
  // ASI533MC at -10°C: ~0.0005 e-/px/s. Uncooled DSLR: ~0.1 e-/px/s
  const darkCurrent = (params as any).darkCurrent ?? 0.0005;

  // --- SNR per sub ---
  const signalPerSub = Sobj * tSub;
  const noisePerSub = Math.sqrt((Sobj + bSky + darkCurrent) * tSub + params.readNoise * params.readNoise);
  const snrPerSub = noisePerSub > 0 ? signalPerSub / noisePerSub : 0;

  // Number of subs
  const totalSubsForSNR = Math.max(1, Math.ceil(snrPerSub > 0 ? Math.pow(effectiveTargetSNR / snrPerSub, 2) : 1));
  const totalIntegrationTime = (totalSubsForSNR * tSub) / 60;

  let recommendation = '';
  let warning: string | undefined;

  if (tSub < 60) {
    recommendation = `Pose courte (${tSub}s). Empilement rapide — idéal pour objets brillants.`;
  } else if (tSub < 180) {
    recommendation = `Pose standard (${tSub}s). Zone confortable pour la plupart des montures.`;
  } else if (tSub < 300) {
    recommendation = `Pose longue (${tSub}s). Assurez-vous d\'un guidage < 1"/px.`;
  } else {
    recommendation = `Pose très longue (${tSub}s). Nécessite un guidage excellent.`;
    warning = 'Temps de pose > 300s — vérifiez le guidage et la stabilité thermique.';
  }

  if (contrast < 1 && !isEmissionNebula) {
    warning = (warning ?? '') + (warning ? ' ' : '') +
      `Contraste faible (S/B < 1) + spectre continu — le filtre narrowband détruit le signal objet. UV/IR Cut recommandé.`;
  } else if (contrast < 1) {
    warning = (warning ?? '') + (warning ? ' ' : '') +
      'Contraste faible (S/B < 1) — l objet est plus faible que le fond de ciel. Filtre narrowband recommandé.';
  }

  return {
    subExposureTime: tSub,
    totalSubsForSNR,
    totalIntegrationTime: Math.round(totalIntegrationTime),
    bSky,
    swampingFactor,
    recommendation,
    warning,
    fluxSky,
    apertureArea,
  };
}



// ============================================================================
// IMPACT RÉDUCTEUR — Démonstration mathématique
// ============================================================================

/**
 * Compare le temps de pose avec et sans réducteur.
 * Le réducteur diminue F_eff, donc augmente le pixel scale,
 * donc B_sky augmente drastiquement → t_optimum diminue.
 */
export function calculateReducerImpact(
  params: ExposureParams,
  reducerFactor: number,
  originalFocalLength: number
): ReducerImpact {
  const reducedFocalLength = originalFocalLength * reducerFactor;
  const reducedPixelSize = params.pixelSize / reducerFactor; // effet équivalent

  const without = calculateExposure(params);

  const withParams: ExposureParams = {
    ...params,
    focalLength: reducedFocalLength,
    pixelSize: reducedPixelSize,
  };
  const withReducer = calculateExposure(withParams);

  const ratio = without.subExposureTime / withReducer.subExposureTime;
  const timeSavedPercent = ((1 - 1 / ratio) * 100);

  return {
    withoutReducer: without,
    withReducer: withReducer,
    ratio,
    timeSavedPercent: Math.round(timeSavedPercent),
  };
}

// ============================================================================
// SIMULATEUR SNR
// ============================================================================

/**
* Simule le SNR en fonction du nombre de poses.
* Approximation : SNR ∝ √(N_subs) pour le signal dominant.
 */
export function simulateSNR(
  params: ExposureParams,
  targetSNR: number,
  maxSubs: number,
  subDurationSeconds?: number
): SNRSimulation {
  const duration = subDurationSeconds || 180;
  const fluxSky = calculateSkyFlux(params.skyMagnitude);
  const apertureArea = calculateApertureArea(params.aperture);
  // Sampling (arcsec/pixel)²
  let samplingSq: number;
  if ((params as any).focalLength) {
    const sampling = (206.265 * params.pixelSize) / (params as any).focalLength;
    samplingSq = sampling * sampling;
  } else {
    const pixelSizeM = params.pixelSize / 1_000_000;
    samplingSq = pixelSizeM * pixelSizeM;
  }
  const bSky = fluxSky * apertureArea * samplingSq * params.quantumEfficiency * params.filterTransmission;
  // Object signal rate — uses object magnitude if available
  const mObj = (params as any).objectMagnitude ?? params.skyMagnitude + 5;
  const objectFlux = Math.pow(10, 0.4 * (M_ZERO - mObj));
  const Sobj = objectFlux * apertureArea * samplingSq * params.quantumEfficiency * params.filterTransmission;
  // SNR per sub on the object
  const signalPerSub = Sobj * duration;
  const noisePerSub = Math.sqrt((Sobj + bSky) * duration + params.readNoise * params.readNoise);
  const snrPerSub = noisePerSub > 0 ? signalPerSub / noisePerSub : 0;

  const points: SNRPoint[] = [];
  let subsToReachTarget = maxSubs;

  for (let n = 1; n <= maxSubs; n++) {
    // Cumulative SNR on the object: sqrt(N) × snrPerSub
    const snr = snrPerSub * Math.sqrt(n);

    points.push({
      subsCount: n,
      subDuration: duration,
      totalMinutes: (n * duration) / 60,
      snr: Math.round(snr * 10) / 10,
    });

    if (snr >= targetSNR && subsToReachTarget === maxSubs) {
      subsToReachTarget = n;
    }
  }

  return {
    params,
    targetSNR,
    points,
    subsToReachTarget,
    minutesToReachTarget: Math.round((subsToReachTarget * duration) / 60),
  };
}

// ============================================================================
// MODÉLISATION SQM DYNAMIQUE
// ============================================================================

/**
 * Calcule la dégradation SQM due à la Lune.
 * Dégradation plus forte quand la Lune est haute et proche de la cible.
 */
export function calculateMoonDegradation(
  moonPhase: number,
  moonAltitude: number,
  targetMoonSeparation: number
): number {
  let baseDegradation = 0;

  if (moonPhase <= 0.25) {
    baseDegradation = moonPhase * 2.0; // 0 → 0.5
  } else if (moonPhase <= 0.5) {
    baseDegradation = 0.5 + (moonPhase - 0.25) * 4.0; // 0.5 → 1.5
  } else if (moonPhase <= 0.75) {
    baseDegradation = 1.5 + (moonPhase - 0.5) * 4.0; // 1.5 → 2.5
  } else {
    baseDegradation = 2.5 + (moonPhase - 0.75) * 4.0; // 2.5 → 3.5
  }

  // Facteur altitude (sinus) — Lune haute = plus de lumière
  const altitudeFactor = moonAltitude > 0 ? Math.sin((moonAltitude * Math.PI) / 180) : 0;

  // Facteur proximité — Lune proche de la cible = plus de dégradation
  const proximityFactor = targetMoonSeparation < 30
    ? 1 + (30 - targetMoonSeparation) / 30
    : 1;

  return baseDegradation * altitudeFactor * proximityFactor;
}

/**
 * Calcule le SQM effectif.
 */
export function calculateEffectiveSQM(
  sqmBase: number,
  moonPhase: number,
  moonAltitude: number,
  targetMoonSeparation: number
): SQMDynamicModel {
  const degradation = calculateMoonDegradation(moonPhase, moonAltitude, targetMoonSeparation);
  const sqmEffective = sqmBase - degradation;

  // Mapping Bortle approximatif
  const bortleScale = Math.max(1, Math.min(9, Math.round((22.0 - sqmEffective) * 1.5)));

  return {
    sqmBase,
    sqmEffective: Math.round(sqmEffective * 10) / 10,
    moonPhase,
    moonAltitude,
    moonAzimuth: 0, // à calculer séparément si besoin
    targetMoonSeparation,
    bortleScale,
    degradation: Math.round(degradation * 10) / 10,
  };
}

// ============================================================================
// DEW RISK ALGORITHM (Point #4 v3)
// ============================================================================

/**
 * Calcule le niveau de risque de rosée.
 * IF (temperature - dewpoint) <= 2.0°C THEN dewRisk = 'Critical'
 */
export function calculateDewRisk(temperature: number, dewpoint: number): DewRiskLevel {
  const delta = temperature - dewpoint;
  if (delta <= 2.0) return 'Critical';
  if (delta <= 5.0) return 'Warning';
  return 'Safe';
}

/**
 * Génère une alerte Dashboard pour la rosée.
 */
export function generateDewAlert(conditions: EnvironmentConditions): DewAlert {
  const level = calculateDewRisk(conditions.temperature, conditions.dewpoint);
  const delta = Math.round((conditions.temperature - conditions.dewpoint) * 10) / 10;

  const messages: Record<DewRiskLevel, { message: string; recommendation: string }> = {
    'Safe': {
      message: `Rosée : conditions sûres (ΔT = ${delta}°C).`,
      recommendation: 'Aucune action nécessaire.',
    },
    'Warning': {
      message: `Rosée : risque modéré (ΔT = ${delta}°C).`,
      recommendation: 'Surveillez l\'humidité. Préparez vos bandes chauffantes.',
    },
    'Critical': {
      message: `Rosée : RISQUE CRITIQUE (ΔT = ${delta}°C).`,
      recommendation: 'Activez vos bandes chauffantes immédiatement.',
    },
  };

  return {
    level,
    ...messages[level],
    delta,
  };
}

// ============================================================================
// SÉPARATION LUNE-CIBLE — Trigonométrie Sphérique (Point #5 v3)
// ============================================================================

/**
 * Calcule la séparation angulaire entre deux objets célestes
 * par trigonométrie sphérique.
 *
 * d = acos(sin(δ₁)·sin(δ₂) + cos(δ₁)·cos(δ₂)·cos(α₁ - α₂))
 *
 * @param ra1Deg — Ascension droite objet 1 (degrés)
 * @param dec1Deg — Déclinaison objet 1 (degrés)
 * @param ra2Deg — Ascension droite objet 2 (degrés)
 * @param dec2Deg — Déclinaison objet 2 (degrés)
 * @returns Séparation en degrés
 */
export function calculateMoonSeparation(
  ra1Deg: number,
  dec1Deg: number,
  ra2Deg: number,
  dec2Deg: number
): number {
  const dec1Rad = (dec1Deg * Math.PI) / 180;
  const dec2Rad = (dec2Deg * Math.PI) / 180;
  const deltaRaRad = ((ra1Deg - ra2Deg) * Math.PI) / 180;

  const cosD =
    Math.sin(dec1Rad) * Math.sin(dec2Rad) +
    Math.cos(dec1Rad) * Math.cos(dec2Rad) * Math.cos(deltaRaRad);

  // Clamp pour éviter les erreurs d'arrondi
  const clampedCosD = Math.max(-1, Math.min(1, cosD));
  const separationRad = Math.acos(clampedCosD);

  return (separationRad * 180) / Math.PI;
}

// ============================================================================
// RECOMMANDATION FILTRE AUTOMATIQUE
// ============================================================================

/**
 * Recommande le meilleur filtre selon les conditions.
 */
export function recommendFilter(
  moonPhase: number,
  moonAltitude: number,
  isNebula: boolean,
  availableFilters: FilterType[]
): { filter: FilterType; reason: string } {
  const hasMoon = moonPhase > 0.3 && moonAltitude > 0;

  if (hasMoon && isNebula) {
    if (availableFilters.includes('L_Ultimate')) {
      return { filter: 'L_Ultimate', reason: 'Lune présente + nébuleuse → L-Ultimate optimal.' };
    }
    if (availableFilters.includes('Ha')) {
      return { filter: 'Ha', reason: 'Lune présente → Hα narrowband résiste.' };
    }
  }

  if (!hasMoon && !isNebula) {
    if (availableFilters.includes('UV_IR_Cut')) {
      return { filter: 'UV_IR_Cut', reason: 'Nuit sans Lune + galaxie → UV/IR Cut.' };
    }
  }

  // Fallback
  return {
    filter: availableFilters[0] || 'UV_IR_Cut',
    reason: 'Filtre par défaut selon disponibilité.',
  };
}
