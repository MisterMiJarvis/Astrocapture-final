// ============================================================================
// SERVICE — Cadrage & Mosaïques
// APLS v3 — Module 3
// ============================================================================

import {
  CatalogTarget,
  TargetSearchResult,
  FramingSession,
  MosaicPlan,
  MosaicPanel,
  MosaicExportRow,
  MosaicRequest,
  FOVOverlay,
} from '../../types/module3';

// ============================================================================
// RECHERCHE MULTI-CATALOGUE
// ============================================================================

const TELESCOPIUS_BASE = '/api/apls/targets';
const SIMBAD_BASE = '/api/apls/simbad';

/**
 * Recherche dans Telescopius (prioritaire) + SIMBAD (résolution doublons).
 * Tolérance doublons : 2.5 arcminutes.
 */
export async function searchTarget(
  query: string,
  lat?: number,
  lon?: number
): Promise<TargetSearchResult> {
  const [telescopiusResults, simbadResults] = await Promise.all([
    searchTelescopius(query, lat, lon),
    searchSIMBAD(query),
  ]);

  // Fusion avec résolution doublons (2.5 arcmin)
  const merged = mergeResults(telescopiusResults, simbadResults, 2.5);

  return {
    query,
    results: merged,
    source: 'merged',
    duplicateCount: telescopiusResults.length + simbadResults.length - merged.length,
  };
}

async function searchTelescopius(
  query: string,
  lat?: number,
  lon?: number
): Promise<CatalogTarget[]> {
  try {
    const url = `${TELESCOPIUS_BASE}/search?q=${encodeURIComponent(query)}${
      lat !== undefined && lon !== undefined ? `&lat=${lat}&lon=${lon}` : ''
    }`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.targets || [];
  } catch {
    return [];
  }
}

async function searchSIMBAD(query: string): Promise<CatalogTarget[]> {
  try {
    const url = `${SIMBAD_BASE}/search?q=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.targets || [];
  } catch {
    return [];
  }
}

/**
 * Fusionne deux listes en éliminant les doublons proches (tolérance en arcmin).
 */
function mergeResults(
  list1: CatalogTarget[],
  list2: CatalogTarget[],
  toleranceArcmin: number
): CatalogTarget[] {
  const toleranceDeg = toleranceArcmin / 60;
  const merged: CatalogTarget[] = [...list1];

  for (const t2 of list2) {
    const isDuplicate = merged.some((t1) => {
      const dRa = Math.abs(t1.raDeg - t2.raDeg);
      const dDec = Math.abs(t1.decDeg - t2.decDeg);
      return dRa < toleranceDeg && dDec < toleranceDeg;
    });

    if (!isDuplicate) {
      merged.push(t2);
    } else {
      // Enrichir l'alias
      const existing = merged.find((t1) => {
        const dRa = Math.abs(t1.raDeg - t2.raDeg);
        const dDec = Math.abs(t1.decDeg - t2.decDeg);
        return dRa < toleranceDeg && dDec < toleranceDeg;
      });
      if (existing) {
        existing.aliases = existing.aliases || [];
        if (!existing.aliases.includes(t2.catalogName)) {
          existing.aliases.push(t2.catalogName);
        }
      }
    }
  }

  return merged;
}

// ============================================================================
// CALCULS FOV & MOSAÏQUE
// ============================================================================

/**
 * Calcule le FOV à partir du capteur et de la focale.
 */
export function calculateFOV(
  sensorWidthMm: number,
  sensorHeightMm: number,
  focalLengthMm: number
): { widthArcmin: number; heightArcmin: number; diagonalArcmin: number } {
  const widthArcmin = (sensorWidthMm * 206.265) / focalLengthMm;
  const heightArcmin = (sensorHeightMm * 206.265) / focalLengthMm;
  const diagonalArcmin = Math.sqrt(widthArcmin * widthArcmin + heightArcmin * heightArcmin);

  return { widthArcmin, heightArcmin, diagonalArcmin };
}

/**
 * Calcule le plan de mosaïque N×M.
 */
export function calculateMosaicPlan(request: MosaicRequest): MosaicPlan {
  const { rows, columns, overlapPercent, fovWidth, fovHeight, raDeg, decDeg } = request;

  const overlapFactor = 1 - overlapPercent / 100;
  const totalFovWidth = columns * fovWidth - (columns - 1) * overlapPercent * fovWidth;
  const totalFovHeight = rows * fovHeight - (rows - 1) * overlapPercent * fovHeight;

  const panels: MosaicPanel[] = [];

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < columns; j++) {
      const offsetRA =
        (j - (columns - 1) / 2) * (fovWidth * overlapFactor) / Math.cos((decDeg * Math.PI) / 180);
      const offsetDec = (i - (rows - 1) / 2) * (fovHeight * overlapFactor);

      panels.push({
        id: `${i + 1}_${j + 1}`,
        row: i + 1,
        col: j + 1,
        raDeg: raDeg + offsetRA / 60, // arcmin → degrés
        decDeg: decDeg + offsetDec / 60,
        rotationAngle: 0,
        isCompleted: false,
        integrationTime: 0,
      });
    }
  }

  return {
    id: `mosaic-${Date.now()}`,
    targetId: request.targetId,
    targetName: request.targetName,
    rows,
    columns,
    overlapPercent,
    totalPanels: rows * columns,
    panels,
    fovPerPanel: { width: fovWidth, height: fovHeight },
    totalFov: { width: totalFovWidth, height: totalFovHeight },
    exportFormat: request.exportFormat,
  };
}

// ============================================================================
// FORMATS D'EXPORT CSV
// ============================================================================

function raDegToHMS(raDeg: number): string {
  const totalHours = raDeg / 15;
  const h = Math.floor(totalHours);
  const m = Math.floor((totalHours - h) * 60);
  const s = Math.round(((totalHours - h) * 60 - m) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function decDegToDMS(decDeg: number): string {
  const sign = decDeg >= 0 ? '+' : '-';
  const absDec = Math.abs(decDeg);
  const d = Math.floor(absDec);
  const m = Math.floor((absDec - d) * 60);
  const s = Math.round(((absDec - d) * 60 - m) * 60);
  return `${sign}${String(d).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Exporte un plan de mosaïque au format N.I.N.A.
 */
export function exportNINA(plan: MosaicPlan, filter: string = 'L-Ultimate', subs: number = 20, durationSec: number = 300): string {
  const rows: MosaicExportRow[] = plan.panels.map((panel) => ({
    panel: panel.id,
    ra: raDegToHMS(panel.raDeg),
    dec: decDegToDMS(panel.decDeg),
    rotation: panel.rotationAngle,
    filter,
    subs,
    duration: durationSec,
  }));

  const headers = 'Panel,RA,DEC,Rotation,Filter,Subs,Duration';
  const lines = rows.map((r) =>
    `${r.panel},${r.ra},${r.dec},${r.rotation},${r.filter},${r.subs},${r.duration}`
  );

  return [headers, ...lines].join('\n');
}

/**
 * Exporte au format ASIAIR (JSON simplifié).
 */
export function exportASIAIR(plan: MosaicPlan, filter: string = 'L-Ultimate', subs: number = 20, durationSec: number = 300): string {
  const planData = {
    name: plan.targetName,
    type: 'mosaic',
    panels: plan.panels.map((panel) => ({
      id: panel.id,
      ra: panel.raDeg,
      dec: panel.decDeg,
      rotation: panel.rotationAngle,
      filter,
      exposure: durationSec,
      count: subs,
    })),
  };

  return JSON.stringify(planData, null, 2);
}

/**
 * Exporte au format CSV générique.
 */
export function exportGenericCSV(plan: MosaicPlan, filter: string = 'L-Ultimate', subs: number = 20, durationSec: number = 300): string {
  // Même format que NINA pour l'instant
  return exportNINA(plan, filter, subs, durationSec);
}

/**
 * Export selon le format demandé.
 */
export function exportMosaic(plan: MosaicPlan, format: 'nina_csv' | 'asiair_csv' | 'generic_csv'): string {
  switch (format) {
    case 'nina_csv':
      return exportNINA(plan);
    case 'asiair_csv':
      return exportASIAIR(plan);
    case 'generic_csv':
    default:
      return exportGenericCSV(plan);
  }
}

// ============================================================================
// FOV OVERLAY POUR ALADIN
// ============================================================================

/**
 * Génère un overlay FOV pour Aladin Lite.
 */
export function createFOVOverlay(
  raDeg: number,
  decDeg: number,
  widthArcmin: number,
  heightArcmin: number,
  rotationAngle: number,
  color: string = '#3b82f6'
): FOVOverlay {
  return {
    centerRADeg: raDeg,
    centerDecDeg: decDeg,
    widthArcmin,
    heightArcmin,
    rotationAngle,
    color,
  };
}
