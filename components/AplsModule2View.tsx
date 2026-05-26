import React, { useState, useEffect, useCallback } from 'react';
import {
  AplsRigProfile, AplsSamplingResult, AplsGuidingSetup, AplsHorizonMask,
  AplsHorizonPoint, AplsSamplingRecommendation
} from '../types';
import {
  Telescope, Camera, Crosshair, Map, Upload, Download, Trash2, Plus,
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Info, Settings,
  Save, RotateCcw, Star, Eye, Compass, Mountain, FileJson
} from 'lucide-react';

// ============================================================================
// APLS v3 — Module 2 : Équipement, Échantillonnage & Guidage
// ============================================================================

const API_BASE = '/api/apls';

function generateId(): string {
  return crypto.randomUUID();
}

// ---------- Utils ----------
function calculatePixelScale(pixelSizeMicrons: number, effFocalMm: number, binning = 1): number {
  return ((pixelSizeMicrons * binning) * 206.265) / effFocalMm;
}

function calculateFOV(sensorSizeMm: number, effFocalMm: number): number {
  return (sensorSizeMm * 206.265) / effFocalMm;
}

function getDrizzleRecommendation(pixelScale: number): AplsSamplingRecommendation {
  if (pixelScale > 2.5) {
    return {
      status: 'undersampled_critical',
      drizzleRecommendation: '2x_aggressive',
      explanation: 'Sous-échantillonnage critique. Étoiles carrées. Drizzle 2× + dithering agressif (≥ 5 px).',
      ditherRequired: true,
      ditherMinPixels: 5
    };
  } else if (pixelScale > 1.5) {
    return {
      status: 'undersampled_moderate',
      drizzleRecommendation: '2x',
      pixelDrop: 0.7,
      explanation: 'Sous-échantillonnage modéré. Drizzle 2× avec Pixel Drop ~0.7 + dither ≥ 3 px.',
      ditherRequired: true,
      ditherMinPixels: 3
    };
  } else if (pixelScale > 0.8) {
    return {
      status: 'ideal',
      drizzleRecommendation: 'none',
      explanation: 'Zone idéale (0.8–1.5 "/px). Pas de Drizzle nécessaire.',
      ditherRequired: true,
      ditherMinPixels: 3
    };
  } else {
    return {
      status: 'oversampled',
      drizzleRecommendation: 'bin2x2',
      explanation: 'Sur-échantillonnage. Drizzle déconseillé. Binning matériel 2×2 suggéré.',
      ditherRequired: false,
      ditherMinPixels: 0
    };
  }
}

function statusColor(status: AplsSamplingRecommendation['status']): string {
  switch (status) {
    case 'ideal': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    case 'undersampled_moderate': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    case 'undersampled_critical': return 'bg-red-500/20 text-red-300 border-red-500/30';
    case 'oversampled': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
  }
}

function drizzleLabel(d: AplsSamplingRecommendation['drizzleRecommendation']): string {
  switch (d) {
    case '2x_aggressive': return 'Drizzle 2× (agressif)';
    case '2x': return 'Drizzle 2×';
    case '1x': return 'Drizzle 1×';
    case 'none': return 'Pas de Drizzle';
    case 'bin2x2': return 'Binning 2×2 recommandé';
  }
}

// ---------- Services ----------
async function fetchRigs(): Promise<AplsRigProfile[]> {
  const res = await fetch(`${API_BASE}/rigs`);
  if (!res.ok) throw new Error('Failed to fetch rigs');
  return res.json();
}

async function saveRig(rig: AplsRigProfile): Promise<AplsRigProfile> {
  const url = `${API_BASE}/rigs${rig.id && rig.id !== 'new' ? `/${rig.id}` : ''}`;
  const method = rig.id && rig.id !== 'new' ? 'PUT' : 'POST';
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rig) });
  if (!res.ok) throw new Error('Failed to save rig');
  return res.json();
}

async function deleteRig(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/rigs/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete rig');
}

async function calculateSamplingApi(rigId: string): Promise<AplsSamplingResult> {
  const res = await fetch(`${API_BASE}/rigs/${rigId}/calculate-sampling`, { method: 'POST' });
  if (!res.ok) throw new Error('Sampling calculation failed');
  return res.json();
}

async function calculateGuidingApi(rigId: string, body: any): Promise<any> {
  const res = await fetch(`${API_BASE}/rigs/${rigId}/calculate-guiding`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error('Guiding calculation failed');
  return res.json();
}

async function fetchHorizons(): Promise<AplsHorizonMask[]> {
  const res = await fetch(`${API_BASE}/horizons`);
  if (!res.ok) throw new Error('Failed to fetch horizons');
  return res.json();
}

async function saveHorizon(h: AplsHorizonMask): Promise<AplsHorizonMask> {
  const url = `${API_BASE}/horizons${h.id && h.id !== 'new' ? `/${h.id}` : ''}`;
  const method = h.id && h.id !== 'new' ? 'PUT' : 'POST';
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(h) });
  if (!res.ok) throw new Error('Failed to save horizon');
  return res.json();
}

async function deleteHorizon(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/horizons/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete horizon');
}

async function importHorizonCsv(id: string, raw: string, format: string): Promise<{ points: AplsHorizonPoint[]; count: number }> {
  const res = await fetch(`${API_BASE}/horizons/${id}/import`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw, format })
  });
  if (!res.ok) throw new Error('Import failed');
  return res.json();
}

// ---------- Section: Rig Profile Form ----------
const TELESCOPE_TYPES = ['Refractor', 'Reflector', 'SCT', 'RC', 'CDK'] as const;
const MODIFIER_TYPES = ['None', 'Reducer', 'Corrector', 'Reducer-Corrector', 'Flattener', 'Barlow'] as const;
const GUIDE_MODES = ['GuideScope', 'OAG'] as const;

interface RigFormProps {
  rig: AplsRigProfile;
  onChange: (r: AplsRigProfile) => void;
  onSave: () => void;
  onDelete: () => void;
}

const RigProfileForm: React.FC<RigFormProps> = ({ rig, onChange, onSave, onDelete }) => {
  const effFocal = rig.opticModifier.effectiveFocalLength
    || (rig.telescope.focalLength * rig.opticModifier.factor);
  const pixelScale = rig.telescope.focalLength > 0 && rig.imagingCamera.pixelSize > 0
    ? calculatePixelScale(rig.imagingCamera.pixelSize, effFocal, rig.imagingCamera.binningAcquisition)
    : 0;
  const fovW = rig.imagingCamera.sensorWidth > 0 && effFocal > 0 ? calculateFOV(rig.imagingCamera.sensorWidth, effFocal) : 0;
  const fovH = rig.imagingCamera.sensorHeight > 0 && effFocal > 0 ? calculateFOV(rig.imagingCamera.sensorHeight, effFocal) : 0;

  const update = (path: string, val: any) => {
    const next = { ...rig };
    const parts = path.split('.');
    let cur: any = next;
    for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]];
    cur[parts[parts.length - 1]] = val;
    onChange(next);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" /> Profil de Rig
        </h3>
        <div className="flex gap-2">
          <button onClick={onSave} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium flex items-center gap-1 hover:opacity-90">
            <Save className="w-4 h-4" /> Sauvegarder
          </button>
          <button onClick={onDelete} className="px-3 py-1.5 bg-red-500/20 text-red-300 rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-red-500/30">
            <Trash2 className="w-4 h-4" /> Supprimer
          </button>
        </div>
      </div>

      {/* Nom + défaut */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Nom du profil</label>
          <input value={rig.name} onChange={e => update('name', e.target.value)}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
        <div className="flex items-end gap-3">
          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
            <input type="checkbox" checked={rig.isDefault} onChange={e => update('isDefault', e.target.checked)}
              className="w-4 h-4 accent-primary" />
            Profil par défaut
          </label>
        </div>
      </div>

      {/* Section Tube */}
      <div className="border border-border rounded-xl p-4 space-y-4">
        <h4 className="font-medium text-text flex items-center gap-2">
          <Telescope className="w-4 h-4 text-primary" /> Tube optique
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-text-secondary mb-1">Nom</label>
            <input value={rig.telescope.name || ''} onChange={e => update('telescope.name', e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm" />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Focale native F (mm)</label>
            <input type="number" step="0.1" value={rig.telescope.focalLength || ''}
              onChange={e => update('telescope.focalLength', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm" />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Ouverture D (mm)</label>
            <input type="number" step="0.1" value={rig.telescope.aperture || ''}
              onChange={e => update('telescope.aperture', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm" />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">f/D</label>
            <input type="number" step="0.01" value={rig.telescope.fRatio || ''}
              onChange={e => update('telescope.fRatio', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-xs text-text-secondary mb-1">Type</label>
          <select value={rig.telescope.type} onChange={e => update('telescope.type', e.target.value)}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm">
            {TELESCOPE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Section Modificateur */}
      <div className="border border-border rounded-xl p-4 space-y-4">
        <h4 className="font-medium text-text flex items-center gap-2">
          <Compass className="w-4 h-4 text-primary" /> Modificateur optique
        </h4>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-text-secondary mb-1">Type</label>
            <select value={rig.opticModifier.type} onChange={e => update('opticModifier.type', e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm">
              {MODIFIER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Facteur (×)</label>
            <input type="number" step="0.01" value={rig.opticModifier.factor || ''}
              onChange={e => {
                const f = parseFloat(e.target.value) || 1;
                update('opticModifier.factor', f);
                update('opticModifier.effectiveFocalLength', rig.telescope.focalLength * f);
              }}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm" />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Focale efficace (mm)</label>
            <input type="number" step="0.1" value={effFocal}
              readOnly
              className="w-full px-3 py-2 bg-surface/50 border border-border rounded-lg text-text text-sm opacity-70" />
          </div>
        </div>
      </div>

      {/* Section Capteur */}
      <div className="border border-border rounded-xl p-4 space-y-4">
        <h4 className="font-medium text-text flex items-center gap-2">
          <Camera className="w-4 h-4 text-primary" /> Capteur d'imagerie
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-text-secondary mb-1">Nom</label>
            <input value={rig.imagingCamera.name} onChange={e => update('imagingCamera.name', e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm" />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Taille pixel (μm)</label>
            <input type="number" step="0.01" value={rig.imagingCamera.pixelSize || ''}
              onChange={e => update('imagingCamera.pixelSize', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm" />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Largeur capteur (mm)</label>
            <input type="number" step="0.1" value={rig.imagingCamera.sensorWidth || ''}
              onChange={e => update('imagingCamera.sensorWidth', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm" />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Hauteur capteur (mm)</label>
            <input type="number" step="0.1" value={rig.imagingCamera.sensorHeight || ''}
              onChange={e => update('imagingCamera.sensorHeight', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm" />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Résolution X (px)</label>
            <input type="number" value={rig.imagingCamera.resolutionX || ''}
              onChange={e => update('imagingCamera.resolutionX', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm" />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Résolution Y (px)</label>
            <input type="number" value={rig.imagingCamera.resolutionY || ''}
              onChange={e => update('imagingCamera.resolutionY', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm" />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Bruit lecture (e⁻)</label>
            <input type="number" step="0.1" value={rig.imagingCamera.readNoise || ''}
              onChange={e => update('imagingCamera.readNoise', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm" />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">QE (0-1)</label>
            <input type="number" step="0.01" min="0" max="1" value={rig.imagingCamera.quantumEfficiency || ''}
              onChange={e => update('imagingCamera.quantumEfficiency', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
            <input type="checkbox" checked={rig.imagingCamera.isColor}
              onChange={e => update('imagingCamera.isColor', e.target.checked)}
              className="w-4 h-4 accent-primary" />
            Capteur couleur
          </label>
          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
            <input type="checkbox" checked={rig.imagingCamera.hasCooling}
              onChange={e => update('imagingCamera.hasCooling', e.target.checked)}
              className="w-4 h-4 accent-primary" />
            Refroidissement
          </label>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Binning acquisition (1 ou 2)</label>
            <select value={rig.imagingCamera.binningAcquisition}
              onChange={e => update('imagingCamera.binningAcquisition', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm">
              <option value={1}>1×1 (natif)</option>
              <option value={2}>2×2</option>
            </select>
          </div>
        </div>
      </div>

      {/* Section Guidage */}
      <div className="border border-border rounded-xl p-4 space-y-4">
        <h4 className="font-medium text-text flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-primary" /> Caméra de guidage (optionnel)
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-text-secondary mb-1">Nom</label>
            <input value={rig.guidingCamera?.name || ''}
              onChange={e => update('guidingCamera', { ...rig.guidingCamera, name: e.target.value })}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm" />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Taille pixel (μm)</label>
            <input type="number" step="0.01" value={rig.guidingCamera?.pixelSize || ''}
              onChange={e => update('guidingCamera', { ...rig.guidingCamera, pixelSize: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm" />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Binning</label>
            <select value={rig.guidingCamera?.binning || 1}
              onChange={e => update('guidingCamera', { ...rig.guidingCamera, binning: parseInt(e.target.value) })}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm">
              <option value={1}>1×1</option>
              <option value={2}>2×2</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Mode</label>
            <select value={rig.guidingCamera?.mode || 'GuideScope'}
              onChange={e => update('guidingCamera', { ...rig.guidingCamera, mode: e.target.value as any })}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm">
              {GUIDE_MODES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Section Monture */}
      <div className="border border-border rounded-xl p-4 space-y-4">
        <h4 className="font-medium text-text flex items-center gap-2">
          <Mountain className="w-4 h-4 text-primary" /> Monture
        </h4>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-text-secondary mb-1">Nom</label>
            <input value={rig.mount.name} onChange={e => update('mount.name', e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm" />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Type</label>
            <input value={rig.mount.type} onChange={e => update('mount.type', e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm" />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Charge max (kg)</label>
            <input type="number" step="0.1" value={rig.mount.maxPayload || ''}
              onChange={e => update('mount.maxPayload', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm" />
          </div>
        </div>
      </div>

      {/* Résumé calculé */}
      {pixelScale > 0 && (
        <div className="bg-surface border border-border rounded-xl p-4">
          <h4 className="text-sm font-semibold text-text mb-3">📊 Résumé calculé</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center p-3 bg-surface-elevated rounded-lg">
              <div className="text-2xl font-bold text-primary">{pixelScale.toFixed(2)}</div>
              <div className="text-text-secondary text-xs mt-1">"/pixel (E_imaging)</div>
            </div>
            <div className="text-center p-3 bg-surface-elevated rounded-lg">
              <div className="text-2xl font-bold text-primary">{fovW.toFixed(1)}′ × {fovH.toFixed(1)}′</div>
              <div className="text-text-secondary text-xs mt-1">FOV</div>
            </div>
            <div className="text-center p-3 bg-surface-elevated rounded-lg">
              <div className="text-2xl font-bold text-primary">{effFocal.toFixed(0)}</div>
              <div className="text-text-secondary text-xs mt-1">mm focale eff.</div>
            </div>
            <div className="text-center p-3 bg-surface-elevated rounded-lg">
              <div className="text-2xl font-bold text-primary">{rig.telescope.fRatio.toFixed(1)}</div>
              <div className="text-text-secondary text-xs mt-1">f/D</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------- Section: Sampling Display ----------
const SamplingDisplay: React.FC<{ result: AplsSamplingResult | null }> = ({ result }) => {
  if (!result) return null;
  const rec = result.recommendation;
  return (
    <div className={`border rounded-xl p-4 ${statusColor(rec.status)}`}>
      <div className="flex items-center gap-2 mb-3">
        {rec.status === 'ideal' && <CheckCircle className="w-5 h-5" />}
        {rec.status === 'undersampled_critical' && <AlertTriangle className="w-5 h-5" />}
        {rec.status === 'undersampled_moderate' && <AlertTriangle className="w-5 h-5" />}
        {rec.status === 'oversampled' && <Info className="w-5 h-5" />}
        <span className="font-semibold">
          {rec.status === 'ideal' ? '✅ Zone idéale' :
           rec.status === 'undersampled_critical' ? '⚠️ Sous-échantillonnage critique' :
           rec.status === 'undersampled_moderate' ? '⚠️ Sous-échantillonnage modéré' :
           'ℹ️ Sur-échantillonnage'}
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-sm">
        <div className="bg-black/20 rounded-lg p-2 text-center">
          <div className="font-bold text-lg">{result.imagingPixelScale.toFixed(2)}″</div>
          <div className="text-xs opacity-80">/ pixel</div>
        </div>
        <div className="bg-black/20 rounded-lg p-2 text-center">
          <div className="font-bold text-lg">{result.fovWidth.toFixed(1)}′ × {result.fovHeight.toFixed(1)}′</div>
          <div className="text-xs opacity-80">FOV</div>
        </div>
        <div className="bg-black/20 rounded-lg p-2 text-center">
          <div className="font-bold text-lg">{result.fovDiagonal.toFixed(1)}′</div>
          <div className="text-xs opacity-80">Diagonale</div>
        </div>
        <div className="bg-black/20 rounded-lg p-2 text-center">
          <div className="font-bold text-lg">{rec.ditherMinPixels}</div>
          <div className="text-xs opacity-80">Dither min (px)</div>
        </div>
      </div>
      <p className="text-sm opacity-90">{rec.explanation}</p>
    </div>
  );
};

// ---------- Section: Drizzle Recommendation ----------
const DrizzleRecommendation: React.FC<{ pixelScale: number }> = ({ pixelScale }) => {
  const rec = getDrizzleRecommendation(pixelScale);
  return (
    <div className={`border rounded-xl p-4 ${statusColor(rec.status)}`}>
      <h4 className="font-semibold flex items-center gap-2 mb-3">
        <Star className="w-4 h-4" /> Recommandation Drizzle
      </h4>
      <div className="text-center mb-3">
        <div className="text-3xl font-bold">{drizzleLabel(rec.drizzleRecommendation)}</div>
        {rec.pixelDrop && <div className="text-sm mt-1">Pixel Drop ~{rec.pixelDrop}</div>}
      </div>
      <p className="text-sm">{rec.explanation}</p>
    </div>
  );
};

// ---------- Section: Guiding Setup Form ----------
const GuidingSetupForm: React.FC<{ rig: AplsRigProfile | null }> = ({ rig }) => {
  const [guideFocal, setGuideFocal] = useState(200);
  const [guidePixelSize, setGuidePixelSize] = useState(3.76);
  const [guideBinning, setGuideBinning] = useState(1);
  const [ditherPrincipal, setDitherPrincipal] = useState(3);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const calc = useCallback(async () => {
    if (!rig || !rig.id) return;
    setLoading(true);
    try {
      const r = await calculateGuidingApi(rig.id, {
        guidingFocalLength: guideFocal,
        guidingPixelSize: guidePixelSize,
        guidingBinning: guideBinning,
        ditherPrincipalPixels: ditherPrincipal,
      });
      setResult(r);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [rig, guideFocal, guidePixelSize, guideBinning, ditherPrincipal]);

  useEffect(() => { calc(); }, [calc]);

  if (!rig) return <div className="text-text-secondary text-sm">Sélectionnez un profil de rig pour configurer le guidage.</div>;

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-text flex items-center gap-2">
        <Crosshair className="w-4 h-4 text-primary" /> Setup de guidage
      </h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs text-text-secondary mb-1">Focale guidage (mm)</label>
          <input type="number" step="1" value={guideFocal} onChange={e => setGuideFocal(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm" />
        </div>
        <div>
          <label className="block text-xs text-text-secondary mb-1">Pixel guide (μm)</label>
          <input type="number" step="0.01" value={guidePixelSize} onChange={e => setGuidePixelSize(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm" />
        </div>
        <div>
          <label className="block text-xs text-text-secondary mb-1">Binning guidage</label>
          <select value={guideBinning} onChange={e => setGuideBinning(parseInt(e.target.value))}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm">
            <option value={1}>1×1</option>
            <option value={2}>2×2</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-text-secondary mb-1">Dither imagerie (px)</label>
          <input type="number" step="1" value={ditherPrincipal} onChange={e => setDitherPrincipal(parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm" />
        </div>
      </div>
      <button onClick={calc} disabled={loading}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-90 disabled:opacity-50">
        <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Recalculer
      </button>

      {result && (
        <div className={`border rounded-xl p-4 ${result.isValid ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
            <div className="bg-black/20 rounded-lg p-2 text-center">
              <div className="font-bold text-lg">{result.guidingPixelScale.toFixed(2)}″</div>
              <div className="text-xs opacity-80">/ pixel guidage</div>
            </div>
            <div className="bg-black/20 rounded-lg p-2 text-center">
              <div className="font-bold text-lg">1:{(1 / result.ratioImagingToGuiding).toFixed(0)}</div>
              <div className="text-xs opacity-80">Ratio guide/imagerie</div>
            </div>
            <div className="bg-black/20 rounded-lg p-2 text-center">
              <div className="font-bold text-lg">{result.ditherPixels} px</div>
              <div className="text-xs opacity-80">Dither à entrer (PHD2)</div>
            </div>
            <div className="bg-black/20 rounded-lg p-2 text-center">
              <div className="font-bold text-lg">{result.ditherArcseconds}″</div>
              <div className="text-xs opacity-80">Décalage physique</div>
            </div>
          </div>
          <p className="text-sm font-medium">{result.message}</p>
        </div>
      )}
    </div>
  );
};

// ---------- Section: Horizon Mask Uploader ----------
const HorizonMaskUploader: React.FC = () => {
  const [masks, setMasks] = useState<AplsHorizonMask[]>([]);
  const [activeMask, setActiveMask] = useState<AplsHorizonMask | null>(null);
  const [rawText, setRawText] = useState('');
  const [importFormat, setImportFormat] = useState<'csv' | 'yaml'>('csv');

  const load = useCallback(async () => {
    try { setMasks(await fetchHorizons()); } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const createNew = async () => {
    const m: AplsHorizonMask = { id: 'new', name: 'Nouveau masque', points: [], format: 'csv' };
    const saved = await saveHorizon(m);
    setMasks(prev => [...prev, saved]);
    setActiveMask(saved);
  };

  const updateMask = async (m: AplsHorizonMask) => {
    const saved = await saveHorizon(m);
    setMasks(prev => prev.map(x => x.id === saved.id ? saved : x));
    setActiveMask(saved);
  };

  const del = async (id: string) => {
    await deleteHorizon(id);
    setMasks(prev => prev.filter(x => x.id !== id));
    if (activeMask?.id === id) setActiveMask(null);
  };

  const doImport = async () => {
    if (!activeMask) return;
    try {
      const r = await importHorizonCsv(activeMask.id, rawText, importFormat);
      const updated = { ...activeMask, points: r.points, format: importFormat };
      await updateMask(updated);
      setRawText('');
      alert(`${r.count} points importés avec succès.`);
    } catch (e: any) {
      alert('Erreur import : ' + e.message);
    }
  };

  const exportCsv = (mask: AplsHorizonMask) => {
    let csv = '# Horizon mask\n# Format: Azimuth(deg),Altitude(deg)\n';
    for (const p of mask.points) csv += `${p.azimuth.toFixed(1)},${p.altitude.toFixed(1)}\n`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${mask.name.replace(/\s+/g, '_')}_horizon.csv`;
    a.click();
  };

  // Simple polar chart via SVG
  const renderRadar = (points: AplsHorizonPoint[]) => {
    const size = 200;
    const cx = size / 2, cy = size / 2, r = size / 2 - 10;
    const toXY = (az: number, alt: number) => {
      const rad = (az - 90) * Math.PI / 180;
      const dist = (1 - alt / 90) * r;
      return { x: cx + Math.cos(rad) * dist, y: cy + Math.sin(rad) * dist };
    };
    // Sort by azimuth for polygon
    const sorted = [...points].sort((a, b) => a.azimuth - b.azimuth);
    if (sorted.length > 0 && sorted[0].azimuth !== sorted[sorted.length - 1].azimuth) {
      sorted.push({ ...sorted[0] });
    }
    const path = sorted.map((p, i) => {
      const { x, y } = toXY(p.azimuth, p.altitude);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');

    return (
      <svg width={size} height={size} className="mx-auto">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeOpacity={0.2} strokeWidth={1} />
        <circle cx={cx} cy={cy} r={r * 0.33} fill="none" stroke="currentColor" strokeOpacity={0.2} strokeWidth={1} />
        <circle cx={cx} cy={cy} r={r * 0.66} fill="none" stroke="currentColor" strokeOpacity={0.2} strokeWidth={1} />
        <line x1={cx} y1={10} x2={cx} y2={size - 10} stroke="currentColor" strokeOpacity={0.2} />
        <line x1={10} y1={cy} x2={size - 10} y2={cy} stroke="currentColor" strokeOpacity={0.2} />
        {points.map((p, i) => {
          const { x, y } = toXY(p.azimuth, p.altitude);
          return <circle key={i} cx={x} cy={y} r={3} fill="currentColor" />;
        })}
        {path && <path d={path + ' Z'} fill="currentColor" fillOpacity={0.15} stroke="currentColor" strokeWidth={1.5} />}
        <text x={cx} y={12} textAnchor="middle" fontSize={10} fill="currentColor">N</text>
        <text x={size - 8} y={cy + 4} textAnchor="middle" fontSize={10} fill="currentColor">E</text>
        <text x={cx} y={size - 4} textAnchor="middle" fontSize={10} fill="currentColor">S</text>
        <text x={8} y={cy + 4} textAnchor="middle" fontSize={10} fill="currentColor">W</text>
      </svg>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text flex items-center gap-2">
          <Map className="w-5 h-5 text-primary" /> Masques d'horizon
        </h3>
        <button onClick={createNew} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium flex items-center gap-1 hover:opacity-90">
          <Plus className="w-4 h-4" /> Nouveau
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {masks.map(m => (
          <div key={m.id} className={`border rounded-xl p-3 cursor-pointer transition-colors ${activeMask?.id === m.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
            onClick={() => setActiveMask(m)}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-text text-sm">{m.name}</span>
              <div className="flex gap-1">
                <button onClick={e => { e.stopPropagation(); exportCsv(m); }} className="p-1 text-text-secondary hover:text-primary">
                  <Download className="w-4 h-4" />
                </button>
                <button onClick={e => { e.stopPropagation(); del(m.id); }} className="p-1 text-text-secondary hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="text-xs text-text-secondary">{m.points.length} points • {m.format}</div>
            <div className="mt-2 text-text-secondary">{renderRadar(m.points)}</div>
          </div>
        ))}
      </div>

      {activeMask && (
        <div className="border border-border rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2">
            <input value={activeMask.name} onChange={e => setActiveMask({ ...activeMask, name: e.target.value })}
              className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm" />
            <button onClick={() => updateMask(activeMask)} className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90">
              <Save className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-secondary mb-1">Format d'import</label>
              <select value={importFormat} onChange={e => setImportFormat(e.target.value as any)}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm">
                <option value="csv">CSV (Az,Alt)</option>
                <option value="yaml">YAML</option>
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={doImport} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-90">
                <Upload className="w-4 h-4" /> Importer
              </button>
            </div>
          </div>
          <textarea value={rawText} onChange={e => setRawText(e.target.value)} rows={6}
            placeholder={importFormat === 'csv' ? '# Azimuth,Altitude\n0,10\n45,15\n90,20\n...' : 'az: 0\nalt: 10\naz: 45\nalt: 15\n...'}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm font-mono" />

          {activeMask.points.length > 0 && (
            <div className="text-text-secondary">{renderRadar(activeMask.points)}</div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN VIEW
// ============================================================================

const AplsModule2View: React.FC = () => {
  const [rigs, setRigs] = useState<AplsRigProfile[]>([]);
  const [activeRig, setActiveRig] = useState<AplsRigProfile | null>(null);
  const [samplingResult, setSamplingResult] = useState<AplsSamplingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'rigs' | 'sampling' | 'guiding' | 'horizon'>('rigs');

  const loadRigs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchRigs();
      setRigs(data);
      if (data.length > 0 && !activeRig) {
        const def = data.find(r => r.isDefault) || data[0];
        setActiveRig(def);
      }
    } catch (e) {
      console.error('Failed to load rigs', e);
    }
    setLoading(false);
  }, [activeRig]);

  useEffect(() => { loadRigs(); }, []);

  const calcSampling = useCallback(async (rig: AplsRigProfile) => {
    if (!rig.id) return;
    try {
      const res = await calculateSamplingApi(rig.id);
      setSamplingResult(res);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (activeRig?.id) calcSampling(activeRig);
  }, [activeRig, calcSampling]);

  const createRig = () => {
    const newRig: AplsRigProfile = {
      id: 'new', name: 'Nouveau rig', isDefault: false,
      telescope: { focalLength: 714, aperture: 102, fRatio: 7, type: 'Refractor' },
      opticModifier: { type: 'None', factor: 1, effectiveFocalLength: 714 },
      imagingCamera: { name: 'ASI533MC', sensorWidth: 11.3, sensorHeight: 11.3, pixelSize: 3.76, resolutionX: 3008, resolutionY: 3008, readNoise: 1.5, quantumEfficiency: 0.8, isColor: true, hasCooling: true, binningAcquisition: 1 },
      mount: { name: 'HEQ5', type: 'EQ', maxPayload: 15 },
    };
    setActiveRig(newRig);
    setActiveTab('rigs');
  };

  const saveActiveRig = async () => {
    if (!activeRig) return;
    try {
      const saved = await saveRig(activeRig);
      setRigs(prev => {
        const exists = prev.find(r => r.id === saved.id);
        if (exists) return prev.map(r => r.id === saved.id ? saved : r);
        return [...prev, saved];
      });
      setActiveRig(saved);
      alert('Profil sauvegardé ✅');
    } catch (e: any) {
      alert('Erreur : ' + e.message);
    }
  };

  const deleteActiveRig = async () => {
    if (!activeRig?.id || activeRig.id === 'new') {
      setActiveRig(null);
      return;
    }
    if (!confirm('Supprimer ce profil ?')) return;
    try {
      await deleteRig(activeRig.id);
      setRigs(prev => prev.filter(r => r.id !== activeRig.id));
      setActiveRig(null);
    } catch (e: any) {
      alert('Erreur : ' + e.message);
    }
  };

  const pixelScale = activeRig
    ? calculatePixelScale(activeRig.imagingCamera.pixelSize, activeRig.opticModifier.effectiveFocalLength || activeRig.telescope.focalLength, activeRig.imagingCamera.binningAcquisition)
    : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold text-text mb-6 flex items-center gap-3">
        <Telescope className="w-7 h-7 text-primary" />
        APLS v3 — Module 2 : Équipement, Échantillonnage & Guidage
      </h2>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border pb-1 overflow-x-auto">
        {[
          { key: 'rigs', label: 'Profils de Rigs', icon: Settings },
          { key: 'sampling', label: 'Échantillonnage', icon: Eye },
          { key: 'guiding', label: 'Guidage', icon: Crosshair },
          { key: 'horizon', label: 'Masque d\'horizon', icon: Map },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key as any)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === t.key ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-text-secondary hover:text-text'
            }`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* RIGS TAB */}
      {activeTab === 'rigs' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <select value={activeRig?.id || ''} onChange={e => {
              const r = rigs.find(x => x.id === e.target.value);
              setActiveRig(r || null);
            }} className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm">
              <option value="">— Sélectionner un rig —</option>
              {rigs.map(r => <option key={r.id} value={r.id}>{r.name} {r.isDefault ? '(défaut)' : ''}</option>)}
            </select>
            <button onClick={createRig} className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-90">
              <Plus className="w-4 h-4" /> Nouveau
            </button>
          </div>
          {activeRig && (
            <RigProfileForm rig={activeRig} onChange={setActiveRig} onSave={saveActiveRig} onDelete={deleteActiveRig} />
          )}
          {!activeRig && <div className="text-text-secondary text-sm">Créez ou sélectionnez un profil de rig.</div>}
        </div>
      )}

      {/* SAMPLING TAB */}
      {activeTab === 'sampling' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <select value={activeRig?.id || ''} onChange={e => {
              const r = rigs.find(x => x.id === e.target.value);
              setActiveRig(r || null);
            }} className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm">
              <option value="">— Sélectionner un rig —</option>
              {rigs.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          {activeRig && samplingResult && (
            <div className="space-y-4">
              <SamplingDisplay result={samplingResult} />
              <DrizzleRecommendation pixelScale={pixelScale} />
            </div>
          )}
          {!activeRig && <div className="text-text-secondary text-sm">Sélectionnez un rig pour voir l'échantillonnage.</div>}
        </div>
      )}

      {/* GUIDING TAB */}
      {activeTab === 'guiding' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <select value={activeRig?.id || ''} onChange={e => {
              const r = rigs.find(x => x.id === e.target.value);
              setActiveRig(r || null);
            }} className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm">
              <option value="">— Sélectionner un rig —</option>
              {rigs.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <GuidingSetupForm rig={activeRig} />
        </div>
      )}

      {/* HORIZON TAB */}
      {activeTab === 'horizon' && <HorizonMaskUploader />}
    </div>
  );
};

export default AplsModule2View;
