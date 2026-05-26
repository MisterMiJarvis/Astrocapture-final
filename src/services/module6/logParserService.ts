// ============================================================================
// SERVICE LOG PARSER — Module 6
// PHD2, NINA, ASIAIR log parsing + analysis
// ============================================================================

import {
  PHD2Log,
  PHD2Event,
  PHD2GuidingData,
  PHD2DitherData,
  PHD2Calibration,
  NINALog,
  NINAEvent,
  AutofocusRun,
  DitherEvent,
  WeatherTrend,
} from '../../types/module6';

// ============================================================================
// PHD2 LOG PARSER
// ============================================================================

/**
 * Parse un fichier log PHD2 (format texte)
 * Correction terrain Point #1 : RMS en arcsec, pas pixels
 */
export function parsePHD2Log(fileContent: string, fileName: string, pixelScaleImaging: number): PHD2Log {
  const lines = fileContent.split('\n');

  const events: PHD2Event[] = [];
  const guidingSamples: { ra: number; dec: number; rms: number; starMass: number; snr: number }[] = [];
  const ditherEvents: { settleTime: number; failed: boolean }[] = [];
  let calibration: PHD2Calibration | undefined;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Parse timestamp
    const timestampMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/);
    const timestamp = timestampMatch ? new Date(timestampMatch[1]) : new Date();

    // Guide event
    if (trimmed.includes('Guiding')) {
      const raMatch = trimmed.match(/RA=\s*([-\d.]+)/);
      const decMatch = trimmed.match(/DEC=\s*([-\d.]+)/);
      const rmsMatch = trimmed.match(/RMS=\s*([\d.]+)/);
      const massMatch = trimmed.match(/Mass=\s*([\d.]+)/);
      const snrMatch = trimmed.match(/SNR=\s*([\d.]+)/);

      const ra = raMatch ? parseFloat(raMatch[1]) : undefined;
      const dec = decMatch ? parseFloat(decMatch[1]) : undefined;
      const rms = rmsMatch ? parseFloat(rmsMatch[1]) : undefined;
      const starMass = massMatch ? parseFloat(massMatch[1]) : undefined;
      const snr = snrMatch ? parseFloat(snrMatch[1]) : undefined;

      if (rms !== undefined) {
        guidingSamples.push({ ra: ra || 0, dec: dec || 0, rms, starMass: starMass || 0, snr: snr || 0 });
      }

      events.push({ timestamp, type: 'guide', ra, dec, rms, starMass, snr });
    }

    // Dither event
    if (trimmed.includes('Dither')) {
      const settleMatch = trimmed.match(/SettleTime=\s*(\d+)/);
      const failedMatch = trimmed.includes('Failed');
      ditherEvents.push({
        settleTime: settleMatch ? parseInt(settleMatch[1], 10) : 0,
        failed: failedMatch,
      });
      events.push({ timestamp, type: 'dither' });
    }

    // Settle
    if (trimmed.includes('Settling')) {
      events.push({ timestamp, type: 'settle' });
    }

    // Calibration
    if (trimmed.includes('Calibration')) {
      const raRateMatch = trimmed.match(/RA rate=\s*([\d.]+)/);
      const decRateMatch = trimmed.match(/Dec rate=\s*([\d.]+)/);

      calibration = {
        calibrated: true,
        raRate: raRateMatch ? parseFloat(raRateMatch[1]) : 0,
        decRate: decRateMatch ? parseFloat(decRateMatch[1]) : 0,
        raAngle: 0,
        decAngle: 0,
        orthogonalityError: 0,
      };
      events.push({ timestamp, type: 'calibrate' });
    }

    // Star lost
    if (trimmed.includes('Star lost')) {
      events.push({ timestamp, type: 'starlost' });
    }
  }

  // Calcul des stats
  const raValues = guidingSamples.map(s => s.ra);
  const decValues = guidingSamples.map(s => s.dec);
  const rmsValues = guidingSamples.map(s => s.rms);
  const massValues = guidingSamples.map(s => s.starMass);
  const snrValues = guidingSamples.map(s => s.snr);

  const rmsRAPx = raValues.length > 0 ? stdDev(raValues) : 0;
  const rmsDecPx = decValues.length > 0 ? stdDev(decValues) : 0;
  const rmsTotalPx = Math.sqrt(rmsRAPx ** 2 + rmsDecPx ** 2);

  // CONVERSION ARCSEC — Point #1
  const rmsTotalArcsec = rmsTotalPx * pixelScaleImaging;
  const rmsRAArcsec = rmsRAPx * pixelScaleImaging;
  const rmsDecArcsec = rmsDecPx * pixelScaleImaging;
  const peakRA = raValues.length > 0 ? Math.max(...raValues.map(Math.abs)) * pixelScaleImaging : 0;
  const peakDec = decValues.length > 0 ? Math.max(...decValues.map(Math.abs)) * pixelScaleImaging : 0;

  const guidingData: PHD2GuidingData = {
    rmsTotalPixels: Math.round(rmsTotalPx * 100) / 100,
    rmsTotalArcsec: Math.round(rmsTotalArcsec * 100) / 100,
    pixelScaleGuiding: pixelScaleImaging,
    rmsRA: Math.round(rmsRAArcsec * 100) / 100,
    rmsDec: Math.round(rmsDecArcsec * 100) / 100,
    peakRA: Math.round(peakRA * 100) / 100,
    peakDec: Math.round(peakDec * 100) / 100,
    starMass: massValues.length > 0 ? avg(massValues) : 0,
    starMassMin: massValues.length > 0 ? Math.min(...massValues) : 0,
    starMassMax: massValues.length > 0 ? Math.max(...massValues) : 0,
    snr: snrValues.length > 0 ? avg(snrValues) : 0,
    samples: guidingSamples.length,
    duration: events.length > 0
      ? (events[events.length - 1].timestamp.getTime() - events[0].timestamp.getTime()) / 60000
      : 0,
  };

  const settleTimes = ditherEvents.filter(d => !d.failed).map(d => d.settleTime);
  const ditherData: PHD2DitherData = {
    count: ditherEvents.length,
    settleTimeAvg: settleTimes.length > 0 ? avg(settleTimes) : 0,
    settleTimeMax: settleTimes.length > 0 ? Math.max(...settleTimes) : 0,
    failedSettles: ditherEvents.filter(d => d.failed).length,
  };

  return {
    id: `phd2_${Date.now()}`,
    sessionId: 'sess_unknown',
    fileName,
    importDate: new Date(),
    guidingData,
    ditherData,
    timeline: events,
    calibrationData: calibration,
  };
}

// ============================================================================
// NINA / ASIAIR LOG PARSER
// ============================================================================

/**
 * Parse un log NINA (JSON)
 */
export function parseNINALog(fileContent: string, fileName: string): NINALog {
  let data: any;
  try {
    data = JSON.parse(fileContent);
  } catch {
    // Fallback: tenter parsing ligne par ligne
    return parseNINALogText(fileContent, fileName);
  }

  const timeline: NINAEvent[] = (data.events || []).map((e: any) => ({
    timestamp: new Date(e.timestamp),
    type: e.type,
    filter: e.filter,
    duration: e.duration,
    temperature: e.temperature,
    fwhm: e.fwhm,
  }));

  const autofocusRuns: AutofocusRun[] = (data.autofocus || []).map((af: any) => ({
    timestamp: new Date(af.timestamp),
    filter: af.filter || 'Luminance',
    temperature: af.temperature || 0,
    focuserPosition: af.position || 0,
    curveV: {
      positions: af.curve?.positions || [],
      hfrValues: af.curve?.hfr || [],
      bestPosition: af.best_position || 0,
      bestHfr: af.best_hfr || 0,
    },
    isSuccessful: af.successful || false,
  }));

  const ditherEvents: DitherEvent[] = (data.dither || []).map((d: any) => ({
    timestamp: new Date(d.timestamp),
    settleTime: d.settle_time || 0,
    isSuccessful: d.successful !== false,
  }));

  const weatherTrends: WeatherTrend[] = (data.weather || []).map((w: any) => ({
    timestamp: new Date(w.timestamp),
    temperature: w.temperature || 0,
    humidity: w.humidity || 0,
    cloudCover: w.cloud_cover || 0,
    windSpeed: w.wind_speed || 0,
  }));

  return {
    id: `nina_${Date.now()}`,
    sessionId: 'sess_unknown',
    fileName,
    importDate: new Date(),
    timeline,
    autofocusRuns,
    ditherEvents,
    weatherTrends,
  };
}

/**
 * Parse un log NINA au format texte (fallback)
 */
function parseNINALogText(content: string, fileName: string): NINALog {
  const lines = content.split('\n');
  const timeline: NINAEvent[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Pattern matching basique
    if (trimmed.includes('Exposure started')) {
      timeline.push({ timestamp: extractTimestamp(trimmed) || new Date(), type: 'exposure_start' });
    } else if (trimmed.includes('Exposure finished')) {
      timeline.push({ timestamp: extractTimestamp(trimmed) || new Date(), type: 'exposure_end' });
    } else if (trimmed.includes('Filter changed')) {
      const filterMatch = trimmed.match(/to\s+(\w+)/);
      timeline.push({
        timestamp: extractTimestamp(trimmed) || new Date(),
        type: 'filter_change',
        filter: filterMatch?.[1] as any,
      });
    } else if (trimmed.includes('Meridian flip')) {
      timeline.push({ timestamp: extractTimestamp(trimmed) || new Date(), type: 'meridian_flip' });
    } else if (trimmed.includes('Autofocus')) {
      timeline.push({ timestamp: extractTimestamp(trimmed) || new Date(), type: 'autofocus' });
    }
  }

  return {
    id: `nina_${Date.now()}`,
    sessionId: 'sess_unknown',
    fileName,
    importDate: new Date(),
    timeline,
    autofocusRuns: [],
    ditherEvents: [],
    weatherTrends: [],
  };
}

// ============================================================================
// UTILITAIRES
// ============================================================================

function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = avg(values);
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function extractTimestamp(line: string): Date | null {
  const match = line.match(/(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2})/);
  return match ? new Date(match[1]) : null;
}

/**
 * Génère un résumé guidage pour le dashboard
 */
export function generateGuidingSummary(phd2Log: PHD2Log): {
  rmsTotalArcsec: number;
  rmsRAArcsec: number;
  rmsDecArcsec: number;
  durationMinutes: number;
  ditherCount: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
} {
  const { rmsTotalArcsec, rmsRA, rmsDec } = phd2Log.guidingData;
  const duration = phd2Log.guidingData.duration;
  const ditherCount = phd2Log.ditherData.count;

  let quality: 'excellent' | 'good' | 'fair' | 'poor' = 'good';
  if (rmsTotalArcsec < 0.5) quality = 'excellent';
  else if (rmsTotalArcsec < 1.0) quality = 'good';
  else if (rmsTotalArcsec < 1.5) quality = 'fair';
  else quality = 'poor';

  return {
    rmsTotalArcsec,
    rmsRAArcsec: rmsRA,
    rmsDecArcsec: rmsDec,
    durationMinutes: Math.round(duration),
    ditherCount,
    quality,
  };
}
