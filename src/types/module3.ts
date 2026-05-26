// ============================================================================
// TYPES MODULE 3 — Cadrage & Mosaïques
// APLS v3
// ============================================================================

/** Données d'une cible depuis un catalogue */
export interface CatalogTarget {
  id: string;
  name: string;
  catalogName: string;          // ex: "M31", "NGC 7000"
  ra: string;                   // "HH:MM:SS"
  dec: string;                  // "DD:MM:SS"
  raDeg: number;
  decDeg: number;
  type: string;                 // Galaxy, Nebula, Cluster...
  subtype?: string;
  magnitude?: number;
  sizeArcmin?: number;
  sizeArcminX?: number;
  sizeArcminY?: number;
  difficulty?: string;
  aliases?: string[];           // Doublons résolus
}

/** Résultat de recherche multi-catalogue */
export interface TargetSearchResult {
  query: string;
  results: CatalogTarget[];
  source: 'telescopius' | 'simbad' | 'merged';
  duplicateCount: number;
}

/** Cadrage / Framing session */
export interface FramingSession {
  id: string;
  targetId: string;
  targetName: string;
  raDeg: number;
  decDeg: number;
  rotationAngle: number;        // PA en degrés
  fovWidth: number;             // arcmin
  fovHeight: number;            // arcmin
  telescopeFocalLength: number; // mm
  cameraSensorWidth: number;    // mm
  cameraSensorHeight: number;   // mm
}

/** Plan de mosaïque */
export interface MosaicPlan {
  id: string;
  targetId: string;
  targetName: string;
  rows: number;                 // N
  columns: number;              // M
  overlapPercent: number;       // 10-20%
  totalPanels: number;          // N×M
  panels: MosaicPanel[];
  fovPerPanel: {
    width: number;              // arcmin
    height: number;             // arcmin
  };
  totalFov: {
    width: number;              // arcmin
    height: number;             // arcmin
  };
  exportFormat: 'nina_csv' | 'asiair_csv' | 'generic_csv';
}

export interface MosaicPanel {
  id: string;
  row: number;
  col: number;
  raDeg: number;
  decDeg: number;
  rotationAngle: number;
  isCompleted: boolean;
  integrationTime: number;      // minutes capturées
}

/** Overlay FOV pour Aladin */
export interface FOVOverlay {
  centerRADeg: number;
  centerDecDeg: number;
  widthArcmin: number;
  heightArcmin: number;
  rotationAngle: number;
  color: string;
}

/** DTO Export CSV */
export interface MosaicExportRow {
  panel: string;
  ra: string;                   // HH:MM:SS
  dec: string;                  // DD:MM:SS
  rotation: number;
  filter: string;
  subs: number;
  duration: number;             // secondes
}

/** Paramètres recherche */
export interface TargetSearchRequest {
  query: string;
  lat?: number;
  lon?: number;
}

/** Paramètres mosaïque */
export interface MosaicRequest {
  targetId: string;
  targetName: string;
  raDeg: number;
  decDeg: number;
  rows: number;
  columns: number;
  overlapPercent: number;
  fovWidth: number;
  fovHeight: number;
  exportFormat: 'nina_csv' | 'asiair_csv' | 'generic_csv';
}
