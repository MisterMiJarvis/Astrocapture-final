// ============================================================================
// SERVICE — Calculateur d'Exposition (Pipeline Physique v5)
// AstroCapture v5 — Module 5
//
// Spec : 6 étapes — SQM effectif → Sampling → B_sky → t_sub → SNR → N_subs
// Toutes les divisions protégées par max(1e-6, ...)
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
import { FILTER_SPECTRA, getBroadbandReferenceArea } from '../../data/filterSpectra';
import { fetchFilters } from '../filterService';

// Category → continuumTransmission mapping
const CATEGORY_CONTINUUM: Record<string, number> = {
  broadband: 1.0,
  dualband: 0.05,
  narrowband: 0.03,
  anti_pollution: 0.70,
  special: 0.50,
};

/**
 * Load filter profiles from the database API.
 * Falls back to FILTER_PROFILES on error.
 */
export async function loadFilterProfiles(): Promise<Record<string, FilterProfile>> {
  try {
    const filters = await fetchFilters();
    if (!Array.isArray(filters) || filters.length === 0) {
      console.warn('[loadFilterProfiles] Empty filters from API, using fallback');
      return FILTER_PROFILES;
    }

    const profiles: Record<string, FilterProfile> = {};

    for (const f of filters) {
      // Slugify the filter name to use as key
      const slug = f.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

      const category = f.category || 'broadband';
      const continuumTransmission = CATEGORY_CONTINUUM[category] ?? 0.5;

      profiles[slug] = {
        type: slug as FilterType,
        name: f.name,
        bandwidthNm: f.bandwidthNm ?? 350,
        transmission: f.peakTransmission ?? 1.0,
        skySuppression: f.skySuppression ?? 0,
        continuumTransmission,
        color: f.color ?? '#888888',
        description: f.description ?? '',
        useCases: Array.isArray(f.useCases) ? f.useCases : [],
        moonCompatible: Boolean(f.moonCompatible),
        recommendedTargets: Array.isArray(f.recommendedTargets) ? f.recommendedTargets : [],
        transmissionData: f.transmissionData ?? undefined,
      };
    }

    return profiles;
  } catch (err) {
    console.error('[loadFilterProfiles] Failed to load filters:', err);
    return FILTER_PROFILES;
  }
}

// Constantes physiques
// NOTE: M_ZERO = 26.59 est le zeropoint AB en V-band (photons/m²/s/arcsec²).
// Limitation connue (~0.3–0.8 mag d'incertitude) : le spectre du ciel nocturne
// (raies OH, sodium, LED) et des nébuleuses en émission (Hα ~0.6nm) diffère
// d'un spectre plat en fréquence. Les erreurs s'annulent partiellement en
// différentiel (SB_obj et B_sky utilisent la même constante). Ne pas corriger
// sans intégration spectrale complète. Tous les outils du marché partagent
// cette limitation. — Documenté suite review Claude AI 25/06/2026.
const M_ZERO = 26.59;        // Magnitude zéro AB V-band (photons/m²/s/arcsec²)
const GUARD = 1e-6;          // Constante de garde anti division par zéro
const MISSION_IMPOSSIBLE_HOURS = 15; // Seuil "mission impossible" pour le total d'intégration

// ============================================================================
// k_calib PAR TYPE D'OBJET — Calibration empirique (29/06/2026, révisé 14/07/2026)
// ⚠️ Révision 14/07 : correction du bug d'unités SB (Telescopius = mag/arcmin², pas mag/arcsec²)
// Les anciennes valeurs compensaient l'erreur d'unités. En attendant recalibration FITS :
//   - diffuse_nebula : 1.0 (SB moyenne représentative)
//   - planetary_nebula : 10.0 (cœur très brillant, SB moyenne trompeuse)
//   - galaxy : 2.5 (cœur + bras, conservé)
//   - stellar : 3.0 (ponctuel, conservé)
// Source: astro-calibration/run-calibration.py (astropy aperture photometry)
// ============================================================================

export type ObjectType = 'diffuse_nebula' | 'planetary_nebula' | 'galaxy' | 'stellar' | 'unknown';

export const K_CALIB_BY_TYPE: Record<ObjectType, number> = {
  diffuse_nebula:   1.0,    // 14/07: révisé. Ancien 0.223 compensait erreur d'unités SB. Neutre en attendant recalibration.
  planetary_nebula: 2.0,    // 14/07: révisé. Ancien 0.15 compensait erreur d'unités SB. k=2.0 → M27 ~5h (réaliste 3nm NB). Cœur brillant justifie k>1.
  galaxy:           2.0,    // 14/07: arrondi à 2.0 (avant 2.572). Cœur brillant + bras diffus.
  stellar:          2.5,    // 14/07: arrondi (avant 2.905). Source ponctuelle, signal concentré.
  unknown:          1.0,    // Pas de correction par défaut
};

/**
 * Retourne le k_calib selon le type d'objet.
 * Appliqué sur S_obj (signal objet) dans le calcul de SNR.
 */
export function getKCalib(objectType: ObjectType): number {
  return K_CALIB_BY_TYPE[objectType] ?? 1.0;
}

/**
 * Détermine le type d'objet à partir du nom/catalogue.
 */
export function inferObjectType(targetName: string): ObjectType {
  const name = targetName.toUpperCase().trim();
  // Planetary nebulae
  if (/^M27|^NGC\s?7293|^NGC\s?6720|^NGC\s?2392|^NGC\s?6543/.test(name)) return 'planetary_nebula';
  // Galaxies
  const galaxies = ['M31','M51','M63','M81','M82','M104','M106','M33','M74','M77','M84','M86','M87','M89','M90','M98','M99','M100','M58','M59','M60','M61','M64','M65','M66','M88','M91','M94','M95','M96','M101','M102','M108','M109'];
  if (galaxies.some(g => name.startsWith(g))) return 'galaxy';
  // Stellar clusters
  if (/^M45|^M44|^M52|^M103|^NGC\s?869|^NGC\s?884|^C\d/.test(name)) return 'stellar';
  // Diffuse nebulae (default for emission nebulae)
  if (/^M16|^M17|^M20|^M42|^M43|^M78|^IC\d|^NGC\s?281|^NGC\s?6888|^NGC\s?7380|^NGC\s?6960|^NGC\s?7000|^IC\s?1396|^SH\d/.test(name)) return 'diffuse_nebula';
  return 'unknown';
}

// ============================================================================
// PROFILS DE FILTRES v5 — avec continuumTransmission + transmissionData
// ============================================================================

// --- Helpers d'intégration spectrale ---

/**
 * Interpole la transmission à une longueur d'onde donnée.
 * Données triées par longueur d'onde croissante.
 */
export function interpolateTransmission(
  data: { wavelength: number; transmission: number }[],
  wl: number
): number {
  if (data.length === 0) return 0;
  if (wl <= data[0].wavelength) return data[0].transmission / 100;
  if (wl >= data[data.length - 1].wavelength) return data[data.length - 1].transmission / 100;

  // Recherche dichotomique
  let lo = 0, hi = data.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (data[mid].wavelength < wl) lo = mid; else hi = mid;
  }
  const dw = data[hi].wavelength - data[lo].wavelength;
  if (dw === 0) return data[lo].transmission / 100;
  const t = data[lo].transmission +
    ((data[hi].transmission - data[lo].transmission) * (wl - data[lo].wavelength)) / dw;
  return t / 100; // conversion % → 0-1
}

/**
 * Transmission effective pour une raie d'émission donnée.
 * Interpole à partir des données spectrales réelles.
 */
export function getEffectiveTransmissionAtLine(
  data: { wavelength: number; transmission: number }[],
  wavelengthNm: number
): number {
  return interpolateTransmission(data, wavelengthNm);
}

/**
 * Transmission effective pour un spectre continu (galaxies/amas).
 * Intègre la courbe de transmission sur une plage plate et divise par la largeur.
 * Retourne une valeur 0-1 représentant la fraction du continuum transmise.
 */
export function getEffectiveContinuumTransmission(
  data: { wavelength: number; transmission: number }[],
  rangeMin = 400,
  rangeMax = 700
): number {
  if (data.length < 2) return 0.5;

  // Intégration trapézoïdale sur la plage [rangeMin, rangeMax]
  let area = 0;
  for (let i = 1; i < data.length; i++) {
    const wl0 = data[i - 1].wavelength;
    const wl1 = data[i].wavelength;
    if (wl1 < rangeMin || wl0 > rangeMax) continue;
    const lo = Math.max(wl0, rangeMin);
    const hi = Math.min(wl1, rangeMax);
    if (hi <= lo) continue;
    const t0 = interpolateTransmission(data, lo) * 100;
    const t1 = interpolateTransmission(data, hi) * 100;
    area += (hi - lo) * (t0 + t1) / 2;
  }
  const range = rangeMax - rangeMin;
  return range > 0 ? area / (range * 100) : 0; // 0-1
}

/**
 * Transmission effective du fond de ciel.
 * Les sources principales de skyglow sont les raies LED (Na 589nm, Hg 435nm, 578nm)
 * et un continuum naturel. Pour l'instant on utilise la transmission moyenne sur
 * la plage 400-700nm comme approximation (proxy).
 * À améliorer : pondérer par un spectre de skyglow réel.
 */
export function getEffectiveSkyTransmission(
  data: { wavelength: number; transmission: number }[]
): number {
  return getEffectiveContinuumTransmission(data, 400, 700);
}

export const FILTER_PROFILES: Record<FilterType, FilterProfile> = {
  'UV_IR_Cut': {
    type: 'UV_IR_Cut',
    name: 'UV/IR Cut',
    bandwidthNm: 350,
    transmission: 1.0,
    skySuppression: 0.0,
    continuumTransmission: 1.0,
    color: '#4FC3F7',
    description: 'Filtre de protection basique. Laisse passer tout le visible.',
    useCases: ['Nuits sans Lune', 'Pollution faible', 'Galaxies', 'Amas'],
    moonCompatible: false,
    recommendedTargets: ['Galaxies', 'Amas ouverts', 'Amas globulaires'],
    transmissionData: FILTER_SPECTRA['filter_uv_ir_cut'],
  },
  'L_Ultimate': {
    type: 'L_Ultimate',
    name: 'L-Ultimate',
    bandwidthNm: 3,
    transmission: 0.95,
    skySuppression: 0.90,
    continuumTransmission: 0.05,
    color: '#7C4DFF',
    description: 'Filtre dual-band Hα + OIII. Permet de shooter sous la Lune.',
    useCases: ['Nébuleuses Hα/OIII', 'Sous Lune', 'Pollution urbaine'],
    moonCompatible: true,
    recommendedTargets: ['Nébuleuses émission', 'Nébuleuses planétaires'],
    transmissionData: FILTER_SPECTRA['filter_l_ultimate'],
  },
  'Antlia_Triband': {
    type: 'Antlia_Triband',
    name: 'Antlia Triband RGB Ultra II',
    bandwidthNm: 35,
    transmission: 0.954,
    skySuppression: 0.95,
    continuumTransmission: 0.15,
    color: '#7C4DFF',
    description: 'Triband Hα + OIII + RGB filter. Wider bands than L-Ultimate, passes some RGB for color.',
    useCases: ['Nébuleuses Hα/OIII', 'Sous Lune', 'RGB + narrowband combo'],
    moonCompatible: true,
    recommendedTargets: ['Nébuleuses émission', 'Nébuleuses planétaires', 'Rémanents supernovae'],
    transmissionData: FILTER_SPECTRA['filter_antlia_triband'],
  },
};

// Legacy filters removed: LPS_D2, Ha, OIII, SII, RGB, Luminance
// Only keep filters that exist in the database.

// ============================================================================
// PIPELINE PHYSIQUE v5 — 6 ÉTAPES
// ============================================================================

/**
 * Étape 1 : Modélisation du Fond de Ciel Local (SQM Effectif)
 *
 * degradation = moonPhaseFactor × sin(moonAltitude × π/180) × proximityFactor
 * sqmEffective = sqmBase - max(0, degradation)
 */
export function calculateEffectiveSQM_v5(
  sqmBase: number,
  moonAltitudeDeg: number,
  moonPhaseFactor: number,
  moonSeparationDeg: number
): { sqmEffective: number; degradation: number } {
  let degradation = 0;

  if (moonAltitudeDeg > 0) {
    const proximityFactor = Math.exp(-moonSeparationDeg / 30);
    degradation = moonPhaseFactor * Math.sin((moonAltitudeDeg * Math.PI) / 180) * proximityFactor;
  }

  degradation = Math.max(0, degradation);
  const sqmEffective = sqmBase - degradation;

  return { sqmEffective, degradation };
}

/**
 * Étape 2 : Échantillonnage Optique & Géométrie
 *
 * F_eff = F × f_R
 * s = (206.265 × p) / F_eff  [arcsec/pixel]
 * A = π × (D/2000)²          [m²]
 */
export function calculateOpticalGeometry(
  apertureMm: number,
  focalLengthMm: number,
  reducerFactor: number,
  pixelSizeUm: number
): { sampling: number; apertureArea: number; effectiveFocalLength: number } {
  const fEff = focalLengthMm * reducerFactor;
  const sampling = (206.265 * pixelSizeUm) / fEff; // arcsec/pixel
  const radiusM = apertureMm / 2000;
  const apertureArea = Math.PI * radiusM * radiusM;
  // diameter_px : taille de l'objet en pixels sur le capteur (utilisé étape 6)
  // Défini ici car dépend de l'échantillonnage. Calculé par l'étape 6 avec le diamètre cible.
  return { sampling, apertureArea, effectiveFocalLength: fEff };
}

/**
 * Étape 3 : Calcul du Flux du Ciel (B_sky)
 *
 * Φ_sky = 10^(0.4 × (26.59 - sqmEffective))
 * τ_eff_sky = τ_filter × (1 - skySuppression)
 * B_sky = Φ_sky × A × s² × QE × τ_eff_sky  [e⁻/px/s]
 */
export function calculateSkyFluxAndBrightness(
  sqmEffective: number,
  apertureArea: number,
  sampling: number,
  quantumEfficiency: number,
  filterTransmission: number,
  skySuppression: number
): { fluxSky: number; bSky: number } {
  const fluxSky = Math.pow(10, 0.4 * (M_ZERO - sqmEffective));
  const tauEffSky = filterTransmission * (1 - skySuppression);
  const samplingSq = sampling * sampling;
  const bSky = fluxSky * apertureArea * samplingSq * quantumEfficiency * tauEffSky;
  return { fluxSky, bSky };
}

/**
 * Étape 4 : Temps de Pose Unitaire Optimal (t_sub) — v6
 *
 * k dynamique : 2.5 pour narrowband (≤12nm), 5.0 pour broadband
 * Clamping intelligent : 60-300s broadband, 30-600s narrowband
 *
 * t_optimum = (k_dyn × RN²) / max(1e-6, B_sky)
 * Broadband : t_sub = max(60, min(300, round(t_optimum / 10) × 10))
 * Narrowband : t_sub = max(30, min(600, round(t_optimum / 10) × 10))
 */
export function calculateOptimalSubExposure(
  bSky: number,
  readNoise: number,
  kFactor: number,
  filterBandwidthNm: number,
  clampMin?: number,
  clampMax?: number,
): { tOptimumRaw: number; tSub: number; kDynamic: number } {
  // k dynamique : narrowband tolère sous-swamping pour préserver tracking/étoiles
  const kDynamic = filterBandwidthNm <= 12 ? 2.5 : 5.0;
  const tOptimumRaw = (kDynamic * readNoise * readNoise) / Math.max(GUARD, bSky);

  // Clamping intelligent selon le type de filtre
  // v10 : bornes configurables via clampMin/clampMax (sinon valeurs par défaut)
  // Gemini review : plancher broadband 60s trop élevé — saturation FWC sous ciel pollué
  // ou instrument très ouvert (F/4, RASA). Abaissé à 10s.
  const isBroadband = filterBandwidthNm > 50;
  const defaultMin = isBroadband ? 10 : 30;
  const defaultMax = isBroadband ? 300 : 600;
  const min = clampMin ?? defaultMin;
  const max = clampMax ?? defaultMax;
  const tSub = Math.max(min, Math.min(max, Math.round(tOptimumRaw / 10) * 10));

  return { tOptimumRaw, tSub, kDynamic };
}

/**
 * Étape 5 : Signal de l'Objet et Calcul du SNR
 *
 * τ_obj = τ_filter (émission) | τ_filter × continuumTransmission (continuum)
 * S_obj = 10^(0.4 × (26.59 - SB_obj)) × A × s² × QE × τ_obj
 * Noise_sub = √((S_obj + B_sky + dc) × t_sub + RN²)
 * SNR_sub = (S_obj × t_sub) / Noise_sub
 */
export function calculateObjectSignalAndSNR(
  objectSurfaceBrightness: number,
  isEmissionNebula: boolean,
  apertureArea: number,
  sampling: number,
  quantumEfficiency: number,
  filterTransmission: number,
  continuumTransmission: number,
  bSky: number,
  darkCurrent: number,
  tSub: number,
  readNoise: number,
  kCalib: number = 1.0
): { sObj: number; noiseSub: number; snrPerSub: number; darkCurrentWarning?: string } {
  const objectFlux = Math.pow(10, 0.4 * (M_ZERO - objectSurfaceBrightness));
  const tauObj = isEmissionNebula
    ? filterTransmission
    : filterTransmission * continuumTransmission;
  const samplingSq = sampling * sampling;
  const sObj = objectFlux * apertureArea * samplingSq * quantumEfficiency * tauObj * kCalib;

  const noiseSub = Math.sqrt(
    (sObj + bSky + darkCurrent) * tSub + readNoise * readNoise
  );
  const snrPerSub = noiseSub > 0 ? (sObj * tSub) / noiseSub : 0;

  // Warning dark current : si dc × t_sub > 0.1 × RN², le dark current devient non négligeable
  // Capteur refroidi (ASI2600/IMX571) = 0.0005 e⁻/px/s, mais capteur non refroidi en été peut monter à 0.01-0.05
  let darkCurrentWarning: string | undefined;
  const dcContribution = darkCurrent * tSub;
  const rnSquared = readNoise * readNoise;
  if (dcContribution > 0.1 * rnSquared) {
    darkCurrentWarning = `Dark current non négligeable : dc×t_sub = ${dcContribution.toFixed(3)} e⁻/px > 0.1×RN² (${(0.1 * rnSquared).toFixed(3)}). Vérifiez le refroidissement du capteur.`;
  }

  return { sObj, noiseSub, snrPerSub, darkCurrentWarning };
}

/**
 * Étape 6 : SNR Cible Métier & Nombre de Poses (N_subs) — v7
 *
 * SNR target fixe selon le type d'objet + filtre (ne dépend plus du contraste) :
 * - Narrowband (≤12nm) + émission : target_SNR = 250
 * - Broadband/dual-band large + émission : target_SNR = 150
 * - Continuum (galaxies/amas) : target_SNR = 100
 *
 * sizeWeighting capé : min(2.0, max(0.5, √(diameter_px / 100)))
 * effectiveTargetSNR = target_SNR / sizeWeighting
 *
 * Plancher de poses minimum (anti-cosmiques/satellites/sigma-clipping) :
 * - Broadband : N_subs = max(20, ⌈(effectiveTargetSNR / SNR_sub)²⌉)
 * - Narrowband : N_subs = max(15, ⌈(effectiveTargetSNR / SNR_sub)²⌉)
 */
export function calculateSubCount(
  sObj: number,
  bSky: number,
  snrPerSub: number,
  sampling: number,
  objectDiameterArcmin: number,
  isEmissionNebula: boolean,
  filterBandwidthNm: number
): { contrast: number; targetSNR: number; sizeWeighting: number; effectiveTargetSNR: number; nSubs: number } {
  const contrast = sObj / Math.max(GUARD, bSky);

  // v7 : SNR target fixe selon type d'objet + filtre
  const targetSNR = isEmissionNebula
    ? (filterBandwidthNm <= 12 ? 250 : 150)
    : 100;

  // v8 (historique) : sizeWeighting capé entre 0.5 et 5.0 (autorise les objets géants comme M31)
  let sizeWeighting = 1;
  if (objectDiameterArcmin > 0 && sampling > 0) {
    const diameterPx = (objectDiameterArcmin * 60) / sampling;
    sizeWeighting = Math.sqrt(Math.max(1, diameterPx / 100));
  }
  sizeWeighting = Math.min(5.0, Math.max(0.5, sizeWeighting));

  const effectiveTargetSNR = targetSNR / sizeWeighting;

  // v7 : plancher minimum de poses
  const isBroadband = filterBandwidthNm > 50;
  const minSubs = isBroadband ? 20 : 15;
  const nSubs = Math.max(minSubs, Math.ceil(
    Math.pow(effectiveTargetSNR / Math.max(GUARD, snrPerSub), 2)
  ));

  return { contrast, targetSNR, sizeWeighting, effectiveTargetSNR, nSubs };
}

// ============================================================================
// PIPELINE COMPLET v5
// ============================================================================

/**
 * Pipeline complet v5 — calcule le résultat d'exposition en 6 étapes.
 *
 * Rétro-compat : accepte les params v4 (filterTransmission, skySuppression)
 * et les params v5 (reducerFactor, moonAltitudeDeg, moonPhaseFactor, etc.)
 */
export function calculateExposure(params: ExposureParams): ExposureResult {
  // --- Defaults ---
  const reducerFactor = params.reducerFactor ?? 1.0;
  const darkCurrent = params.darkCurrent ?? 0.0005;
  const isEmissionNebula = params.isEmissionNebula ?? true;
  const objectSurfaceBrightness = params.objectSurfaceBrightness ?? params.skyMagnitude + 5;
  const objectDiameterArcmin = params.objectDiameterArcmin ?? 0;
  const skySuppression = params.skySuppression ?? 0;

  // --- Étape 1 : SQM Effectif ---
  // Si l'appelant fournit déjà skyMagnitude (SQM effectif), on l'utilise directement.
  // Sinon, on calcule depuis moonAltitudeDeg / moonPhaseFactor.
  let sqmEffective = params.skyMagnitude;
  let degradation = 0;
  if (params.moonAltitudeDeg !== undefined && params.moonPhaseFactor !== undefined) {
    const moonSep = params.moonSeparationDeg ?? 180;
    const result = calculateEffectiveSQM_v5(
      params.skyMagnitude, // ici c'est sqmBase
      params.moonAltitudeDeg,
      params.moonPhaseFactor,
      moonSep
    );
    sqmEffective = result.sqmEffective;
    degradation = result.degradation;
  }

  // --- Étape 2 : Échantillonnage & Géométrie ---
  const { sampling, apertureArea, effectiveFocalLength } = calculateOpticalGeometry(
    params.aperture,
    params.focalLength,
    reducerFactor,
    params.pixelSize
  );

  // --- Résolution du filtre (avant étape 3 — nécessaire pour spectral data) ---
  const profiles = params.filterProfiles ?? FILTER_PROFILES;
  const filterEntry = Object.values(profiles).find(
    f => f.transmission === params.filterTransmission && f.skySuppression === skySuppression
  );
  const filterBandwidthNm = filterEntry?.bandwidthNm ?? 350; // défaut : broadband

  // --- Étape 3 : B_sky ---
  // Utilise les données spectrales réelles si disponibles
  const transmissionData = filterEntry?.transmissionData;
  const effSkyTransmission = transmissionData
    ? getEffectiveSkyTransmission(transmissionData)
    : params.filterTransmission;
  const effSkySuppression = transmissionData
    ? 1 - effSkyTransmission // derive sky suppression from real data
    : skySuppression;

  const { fluxSky, bSky } = calculateSkyFluxAndBrightness(
    sqmEffective,
    apertureArea,
    sampling,
    params.quantumEfficiency,
    transmissionData ? effSkyTransmission : params.filterTransmission,
    transmissionData ? effSkySuppression : skySuppression
  );

  // --- Étape 4 : t_sub (k dynamique + clamping intelligent) ---
  const isBroadband = filterBandwidthNm > 50 || (!isEmissionNebula && filterBandwidthNm > 50);

  const { tOptimumRaw, tSub, kDynamic } = calculateOptimalSubExposure(
    bSky,
    params.readNoise,
    params.kFactor,
    filterBandwidthNm
  );

  // --- Étape 5 : Signal objet & SNR ---
  // k_calib : calibration empirique par type d'objet (29/06/2026)
  const objectType = params.objectType ?? (params.targetName ? inferObjectType(params.targetName) : 'unknown');
  const kCalib = getKCalib(objectType);

  // #3 : utiliser continuumTransmission depuis FILTER_PROFILES
  // Si transmissionData disponible, calculer les valeurs effectives réelles
  const emissionWavelengthNm = params.emissionWavelengthNm ?? 656.3; // Hα par défaut

  const effFilterTransmission = transmissionData
    ? getEffectiveTransmissionAtLine(transmissionData, emissionWavelengthNm)
    : params.filterTransmission;
  const continuumTransmission = transmissionData
    ? getEffectiveContinuumTransmission(transmissionData)
    : (filterEntry?.continuumTransmission ?? 1.0);

  const { sObj, noiseSub, snrPerSub, darkCurrentWarning } = calculateObjectSignalAndSNR(
    objectSurfaceBrightness,
    isEmissionNebula,
    apertureArea,
    sampling,
    params.quantumEfficiency,
    transmissionData ? effFilterTransmission : params.filterTransmission,
    continuumTransmission,
    bSky,
    darkCurrent,
    tSub,
    params.readNoise,
    kCalib
  );

  // --- Étape 6 : N_subs (v7 — SNR target métier + plancher minimum) ---
  const { contrast, targetSNR, sizeWeighting, effectiveTargetSNR, nSubs } = calculateSubCount(
    sObj,
    bSky,
    snrPerSub,
    sampling,
    objectDiameterArcmin,
    isEmissionNebula,
    filterBandwidthNm
  );

  // --- Recommandations ---
  let recommendation = '';
  let warning: string | undefined;

  if (tSub < 60) {
    recommendation = `Pose courte (${tSub}s). Empilement rapide — idéal pour objets brillants.`;
  } else if (tSub < 180) {
    recommendation = `Pose standard (${tSub}s). Zone confortable pour la plupart des montures.`;
  } else if (tSub < 300) {
    recommendation = `Pose longue (${tSub}s). Assurez-vous d'un guidage < 1"/px.`;
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

  const totalIntegrationTime = Math.round((nSubs * tSub) / 60);
  const totalIntegrationHours = totalIntegrationTime / 60;

  // Warning "mission impossible" : si le temps total d'intégration dépasse le seuil
  // Suggéré par Claude AI review 25/06/2026
  let missionWarning: string | undefined;
  if (totalIntegrationHours > MISSION_IMPOSSIBLE_HOURS) {
    missionWarning = `⚠️ Temps total d'intégration ${totalIntegrationHours.toFixed(1)}h — au-delà de ${MISSION_IMPOSSIBLE_HOURS}h. Considérez : (1) réduire le SNR cible, (2) un filtre plus étroit, (3) un ciel plus sombre, ou (4) multi-nuits.`;
  }

  if (darkCurrentWarning) {
    warning = (warning ?? '') + (warning ? ' ' : '') + darkCurrentWarning;
  }
  if (missionWarning) {
    warning = (warning ?? '') + (warning ? ' ' : '') + missionWarning;
  }

  return {
    subExposureTime: tSub,
    totalSubsForSNR: nSubs,
    totalIntegrationTime,
    totalIntegrationHours,
    sqmEffective,
    sampling,
    bSky,
    sObj,
    fluxSky,
    apertureArea,
    swampingFactor: bSky > 0 ? bSky / (params.readNoise * params.readNoise) : 0,
    snrPerSub,
    contrast,
    effectiveTargetSNR,
    tOptimumRaw,
    kDynamic,
    recommendation,
    warning,
    // Spectral data values (if used)
    effectiveSkyTransmission: transmissionData ? effSkyTransmission : undefined,
    effectiveLineTransmission: transmissionData ? effFilterTransmission : undefined,
    effectiveContinuumTransmission: transmissionData ? continuumTransmission : undefined,
    usingSpectralData: !!transmissionData,
  };
}

// ============================================================================
// IMPACT RÉDUCTEUR — Démonstration mathématique (rétro-compat)
// ============================================================================

/**
 * Compare le temps de pose avec et sans réducteur.
 * v5 : utilise reducerFactor dans le pipeline directement.
 */
export function calculateReducerImpact(
  params: ExposureParams,
  reducerFactor: number,
  originalFocalLength: number
): ReducerImpact {
  const without = calculateExposure({ ...params, reducerFactor: 1.0, focalLength: originalFocalLength });
  const withReducer = calculateExposure({ ...params, reducerFactor, focalLength: originalFocalLength });

  const ratio = without.subExposureTime / Math.max(1, withReducer.subExposureTime);
  const timeSavedPercent = Math.round((1 - 1 / ratio) * 100);

  return {
    withoutReducer: without,
    withReducer,
    ratio,
    timeSavedPercent,
  };
}

// ============================================================================
// SIMULATEUR SNR (rétro-compat, mis à jour avec dark current)
// ============================================================================

/**
 * Simule le SNR en fonction du nombre de poses.
 * SNR ∝ √(N_subs) pour le signal dominant.
 */
export function simulateSNR(
  params: ExposureParams,
  targetSNR: number,
  maxSubs: number,
  subDurationSeconds?: number
): SNRSimulation {
  const duration = subDurationSeconds || 180;
  const reducerFactor = params.reducerFactor ?? 1.0;
  const darkCurrent = params.darkCurrent ?? 0.0005;
  const skySuppression = params.skySuppression ?? 0;

  // Pipeline léger pour le simulateur
  const { sampling, apertureArea } = calculateOpticalGeometry(
    params.aperture,
    params.focalLength,
    reducerFactor,
    params.pixelSize
  );

  const { fluxSky, bSky } = calculateSkyFluxAndBrightness(
    params.skyMagnitude,
    apertureArea,
    sampling,
    params.quantumEfficiency,
    params.filterTransmission,
    skySuppression
  );

  const objectSB = params.objectSurfaceBrightness ?? params.skyMagnitude + 5;
  const isEmission = params.isEmissionNebula ?? true;
  const continuumT = skySuppression > 0 ? Math.max(0.01, 1 - skySuppression) : 1.0;
  const { sObj } = calculateObjectSignalAndSNR(
    objectSB,
    isEmission,
    apertureArea,
    sampling,
    params.quantumEfficiency,
    params.filterTransmission,
    continuumT,
    bSky,
    darkCurrent,
    duration,
    params.readNoise
  );

  // SNR par sub sur l'objet
  const signalPerSub = sObj * duration;
  const noisePerSub = Math.sqrt((sObj + bSky + darkCurrent) * duration + params.readNoise * params.readNoise);
  const snrPerSub = noisePerSub > 0 ? signalPerSub / noisePerSub : 0;

  const points: SNRPoint[] = [];
  let subsToReachTarget = maxSubs;

  for (let n = 1; n <= maxSubs; n++) {
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
// MODÉLISATION SQM DYNAMIQUE (rétro-compat UI)
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

  const altitudeFactor = moonAltitude > 0 ? Math.sin((moonAltitude * Math.PI) / 180) : 0;
  const proximityFactor = targetMoonSeparation < 30
    ? 1 + (30 - targetMoonSeparation) / 30
    : 1;

  return baseDegradation * altitudeFactor * proximityFactor;
}

/**
 * Calcule le SQM effectif (rétro-compat avec SQMDynamicModel).
 */
export function calculateEffectiveSQM(
  sqmBase: number,
  moonPhase: number,
  moonAltitude: number,
  targetMoonSeparation: number
): SQMDynamicModel {
  const degradation = calculateMoonDegradation(moonPhase, moonAltitude, targetMoonSeparation);
  const sqmEffective = sqmBase - degradation;
  const bortleScale = Math.max(1, Math.min(9, Math.round((22.0 - sqmEffective) * 1.5)));

  return {
    sqmBase,
    sqmEffective: Math.round(sqmEffective * 10) / 10,
    moonPhase,
    moonAltitude,
    moonAzimuth: 0,
    targetMoonSeparation,
    bortleScale,
    degradation: Math.round(degradation * 10) / 10,
  };
}

// ============================================================================
// DEW RISK ALGORITHM
// ============================================================================

export function calculateDewRisk(temperature: number, dewpoint: number): DewRiskLevel {
  const delta = temperature - dewpoint;
  if (delta <= 2.0) return 'Critical';
  if (delta <= 5.0) return 'Warning';
  return 'Safe';
}

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

  return { level, ...messages[level], delta };
}

// ============================================================================
// SÉPARATION LUNE-CIBLE — Trigonométrie Sphérique
// ============================================================================

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

  const clampedCosD = Math.max(-1, Math.min(1, cosD));
  const separationRad = Math.acos(clampedCosD);

  return (separationRad * 180) / Math.PI;
}

// ============================================================================
// RECOMMANDATION FILTRE AUTOMATIQUE
// ============================================================================

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

  return {
    filter: availableFilters[0] || 'UV_IR_Cut',
    reason: 'Filtre par défaut selon disponibilité.',
  };
}

// Les sous-fonctions v5/v6/v7/v8/v9 sont déjà exportées individuellement
// au-dessus (export function ...). Pas besoin de re-exporter ici.