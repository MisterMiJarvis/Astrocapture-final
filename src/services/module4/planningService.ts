// ============================================================================
// SERVICE PLANIFICATION — Module 4
// Multi-night planner, yearly heatmap, meridian flip, exports
// ============================================================================

import {
  MultiNightPlan,
  PlannedNight,
  TimeWindow,
  MeridianFlipInfo,
  YearlyVisibility,
  MonthlyVisibility,
  HourlyVisibility,
  NINASequence,
  ASIAIRPlan,
} from '../../types/module4';

/**
 * Calcule les heures clés astronomiques pour une date
 */
function calculateAstronomicalTimes(date: Date, lat: number, lon: number) {
  // Simplification: on utilise des approximations
  // En production: appel API ou calcul rigoureux avec lib astronomy
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);

  // Sunset/sunrise approximations (dépendent de la latitude)
  const sunsetHour = 18 + (lat > 0 ? Math.sin((dayOfYear - 80) * 2 * Math.PI / 365) * 2 : 0);
  const sunriseHour = 6 - (lat > 0 ? Math.sin((dayOfYear - 80) * 2 * Math.PI / 365) * 2 : 0);

  const sunset = new Date(date);
  sunset.setHours(Math.floor(sunsetHour), Math.floor((sunsetHour % 1) * 60), 0);

  const sunrise = new Date(date);
  sunrise.setHours(Math.floor(sunriseHour), Math.floor((sunriseHour % 1) * 60), 0);

  // Astronomical twilight ≈ 1.5h après/before
  const astroDusk = new Date(sunset);
  astroDusk.setHours(astroDusk.getHours() + 1, 30);

  const astroDawn = new Date(sunrise);
  astroDawn.setHours(astroDawn.getHours() - 1, 30);

  return { sunset, sunrise, astroDusk, astroDawn };
}

/**
 * Calcule le temps sidéral local (approximation)
 */
function getLocalSiderealTime(date: Date, lon: number): number {
  const jd = date.getTime() / 86400000 + 2440587.5;
  return (280.46061837 + 360.98564736629 * (jd - 2451545.0) + lon) % 360;
}

/**
 * Planifie une cible sur N nuits
 */
export async function planMultiNight(
  targetId: string,
  targetName: string,
  raDeg: number,
  decDeg: number,
  lat: number,
  lon: number,
  nightsCount: number,
  startDate?: Date
): Promise<MultiNightPlan> {
  const start = startDate || new Date();
  const nights: PlannedNight[] = [];

  for (let i = 0; i < nightsCount; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i);

    const { sunset, sunrise, astroDusk, astroDawn } = calculateAstronomicalTimes(date, lat, lon);

    // Transit ≈ quand LST = RA
    const lstAtMidnight = getLocalSiderealTime(new Date(date.setHours(0, 0, 0, 0)), lon);
    const haAtMidnight = lstAtMidnight - raDeg;
    const transitHour = (24 - haAtMidnight / 15) % 24;

    const transitTime = new Date(date);
    transitTime.setHours(Math.floor(transitHour), Math.floor((transitHour % 1) * 60), 0);

    // Meridian flip = transit + décalage monture (typiquement 2 min)
    const meridianFlipTime = new Date(transitTime);
    meridianFlipTime.setMinutes(meridianFlipTime.getMinutes() + 2);

    // Calcul altitude actuelle
    const altRad = Math.asin(
      Math.sin(decDeg * Math.PI / 180) * Math.sin(lat * Math.PI / 180) +
      Math.cos(decDeg * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.cos((haAtMidnight * Math.PI) / 180)
    );
    const altitude = (altRad * 180) / Math.PI;

    // Heures au-dessus de l'horizon
    const isVisible = altitude > 0;
    const hoursAboveHorizon = isVisible
      ? Math.max(0, (sunrise.getTime() - sunset.getTime()) / 3600000)
      : 0;

    // Time windows
    const imagingWindow: TimeWindow[] = [];
    if (isVisible) {
      imagingWindow.push({
        start: astroDusk,
        end: meridianFlipTime,
        type: 'imaging',
        label: 'Pre-flip imaging',
      });
      imagingWindow.push({
        start: meridianFlipTime,
        end: new Date(meridianFlipTime.getTime() + 5 * 60000),
        type: 'meridian_flip',
        label: 'Meridian flip',
      });
      imagingWindow.push({
        start: new Date(meridianFlipTime.getTime() + 5 * 60000),
        end: astroDawn,
        type: 'imaging',
        label: 'Post-flip imaging',
      });
    }

    nights.push({
      date,
      sunset,
      sunrise,
      astroDusk,
      astroDawn,
      transitTime,
      meridianFlipTime,
      riseTime: isVisible ? sunset : undefined,
      setTime: isVisible ? sunrise : undefined,
      hoursAboveHorizon,
      hoursAboveMask: undefined,
      isVisible,
      moonPhase: 0.25, // TODO: calcul réel
      moonAltitude: 30,
      weatherScore: 75, // TODO: fetch weather
      imagingWindow,
    });
  }

  return {
    id: `plan_${targetId}_${Date.now()}`,
    targetId,
    targetName,
    raDeg,
    decDeg,
    locationId: 'loc_1',
    rigId: 'rig_1',
    nights,
    createdAt: new Date(),
  };
}

/**
 * Calcule l'info meridian flip pour une nuit donnée
 */
export function getMeridianFlipInfo(
  targetId: string,
  date: Date,
  raDeg: number,
  lat: number,
  lon: number
): MeridianFlipInfo {
  const lst = getLocalSiderealTime(date, lon);
  const ha = ((lst - raDeg + 360) % 360);
  const transitHour = (24 - ha / 15) % 24;

  const transitTime = new Date(date);
  transitTime.setHours(Math.floor(transitHour), Math.floor((transitHour % 1) * 60), 0);

  const flipTime = new Date(transitTime);
  flipTime.setMinutes(flipTime.getMinutes() + 2);

  const preFlipMinutes = Math.max(0, (flipTime.getTime() - date.getTime()) / 60000);
  const postFlipMinutes = 120; // approx

  return {
    targetId,
    date,
    transitTime,
    flipTime,
    preFlipMinutes,
    postFlipMinutes,
    recommendation: `Flip at ${flipTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}. Resume imaging after settle.`,
  };
}

/**
 * Génère le heatmap annuel de visibilité
 */
export async function generateYearlyHeatmap(
  targetId: string,
  targetName: string,
  raDeg: number,
  decDeg: number,
  lat: number,
  lon: number,
  year?: number
): Promise<YearlyVisibility> {
  const yr = year || new Date().getFullYear();
  const months: MonthlyVisibility[] = [];
  let blackNightsCount = 0;
  let totalImagingHours = 0;

  for (let month = 0; month < 12; month++) {
    const daysInMonth = new Date(yr, month + 1, 0).getDate();
    const hours: HourlyVisibility[] = [];
    const moonPhases: { day: number; phase: number; phaseName: string; isBlackNight: boolean }[] = [];
    let monthVisibleHours = 0;

    // Pour chaque heure de la nuit (20h - 05h)
    for (let hour = 20; hour <= 29; hour++) {
      const realHour = hour % 24;
      // Calcul altitude moyenne pour ce mois à cette heure
      const testDate = new Date(yr, month, 15, realHour, 0, 0);
      const lst = getLocalSiderealTime(testDate, lon);
      const ha = lst - raDeg;

      const altRad = Math.asin(
        Math.sin(decDeg * Math.PI / 180) * Math.sin(lat * Math.PI / 180) +
        Math.cos(decDeg * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.cos((ha * Math.PI) / 180)
      );
      const altitude = (altRad * 180) / Math.PI;
      const isAboveHorizon = altitude > 0;
      const isAboveMask = altitude > 20; // masque par défaut 20°

      if (isAboveHorizon) monthVisibleHours++;

      hours.push({
        hour: realHour,
        isVisible: isAboveHorizon,
        altitude: Math.round(altitude * 10) / 10,
        isAboveHorizon,
        isAboveMask,
      });
    }

    // Phases lunaires (simplifié)
    for (let day = 1; day <= daysInMonth; day += 5) {
      const phase = ((month * 30 + day) % 295) / 295; // cycle lunaire simplifié
      const phaseName = getMoonPhaseName(phase);
      const isBlackNight = phase < 0.1 && monthVisibleHours > 3;
      if (isBlackNight) blackNightsCount++;

      moonPhases.push({ day, phase, phaseName, isBlackNight });
    }

    totalImagingHours += monthVisibleHours * daysInMonth;

    months.push({
      month,
      monthName: new Date(yr, month, 1).toLocaleString('fr-FR', { month: 'short' }),
      hours,
      moonPhases,
      isTargetVisible: monthVisibleHours > 0,
      totalVisibleHours: monthVisibleHours,
    });
  }

  return {
    targetId,
    targetName,
    months,
    blackNightsCount,
    totalImagingHours,
  };
}

/**
 * Export vers format N.I.N.A.
 */
export function exportToNINA(plan: MultiNightPlan, nightIndex: number): NINASequence[] {
  const night = plan.nights[nightIndex];
  if (!night) throw new Error('Invalid night index');

  return [{
    targetName: plan.targetName,
    ra: degToHMS(plan.raDeg),
    dec: degToDMS(plan.decDeg),
    rotation: 0,
    exposureTime: 300,
    totalSubs: 20,
    filter: 'L-Ultimate',
    binning: 1,
    gain: 100,
    offset: 10,
    meridianFlip: true,
    dithering: true,
  }];
}

/**
 * Export vers format ASIAIR
 */
export function exportToASIAIR(plan: MultiNightPlan, nightIndex: number): ASIAIRPlan[] {
  const night = plan.nights[nightIndex];
  if (!night) throw new Error('Invalid night index');

  return [{
    planName: `${plan.targetName} — ${night.date.toISOString().split('T')[0]}`,
    target: plan.targetName,
    ra: degToHMS(plan.raDeg),
    dec: degToDMS(plan.decDeg),
    exposure: 300,
    count: 20,
    filter: 'L-Ultimate',
    delay: 5,
  }];
}

/**
 * Export CSV générique
 */
export function exportToCSV(plan: MultiNightPlan): string {
  const lines = ['Night,Start,End,Transit,Flip,VisibleHours'];
  plan.nights.forEach(n => {
    lines.push([
      n.date.toISOString().split('T')[0],
      n.astroDusk.toISOString(),
      n.astroDawn.toISOString(),
      n.transitTime.toISOString(),
      n.meridianFlipTime.toISOString(),
      n.hoursAboveHorizon.toFixed(1),
    ].join(','));
  });
  return lines.join('\n');
}

// --- Utilitaires ---

function degToHMS(deg: number): string {
  const hours = deg / 15;
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  const s = ((hours - h) * 3600 - m * 60).toFixed(1);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.padStart(4, '0')}`;
}

function degToDMS(deg: number): string {
  const sign = deg >= 0 ? '+' : '-';
  const d = Math.abs(deg);
  const degInt = Math.floor(d);
  const m = Math.floor((d - degInt) * 60);
  const s = ((d - degInt) * 3600 - m * 60).toFixed(1);
  return `${sign}${degInt.toString().padStart(2, '0')}°${m.toString().padStart(2, '0')}'${s}"`;
}

function getMoonPhaseName(phase: number): string {
  if (phase < 0.05 || phase > 0.95) return 'New Moon';
  if (phase < 0.2) return 'Waxing Crescent';
  if (phase < 0.3) return 'First Quarter';
  if (phase < 0.45) return 'Waxing Gibbous';
  if (phase < 0.55) return 'Full Moon';
  if (phase < 0.7) return 'Waning Gibbous';
  if (phase < 0.8) return 'Last Quarter';
  return 'Waning Crescent';
}
