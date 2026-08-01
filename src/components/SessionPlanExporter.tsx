// ============================================================================
// COMPOSANT: SessionPlanExporter — Export plan de session imprimable/PDF
// Feature 3 — Consultable au bord du scope sans rouvrir l'app
// v2 — Improved print layout, weather conditions, night date
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Project, ProjectExposurePlan, SNRTarget, SNR_TARGET_CONFIG } from '../types/project';
import { PRESET_LOCATION_MAP } from '../data/locations';

// ─── Helpers ──────────────────────────────────────────────────────────────

const API_BASE = '/api/apls/projects';

function getAuthToken(): string | null {
  return localStorage.getItem('astrosuite_token');
}

function formatExposureTime(seconds: number): string {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }
  const m = Math.round(seconds / 60);
  return `${m}min`;
}

function formatLocation(locationSource: string): string {
  const preset = PRESET_LOCATION_MAP[locationSource];
  return preset?.name || locationSource || '—';
}

function formatRaDec(ra: string, dec: string): string {
  return `${ra || '—'} / ${dec || '—'}`;
}

function formatMagnitude(mag: number | null): string {
  if (mag === null || mag === undefined) return '—';
  return mag.toFixed(1);
}

function formatSize(sizeArcmin: number | null): string {
  if (sizeArcmin === null || sizeArcmin === undefined) return '—';
  return `${sizeArcmin.toFixed(1)}'`;
}

function formatSb(sb: number | null): string {
  if (sb === null || sb === undefined) return '—';
  return `${sb.toFixed(1)} mag/arcsec²`;
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatSeeing(seeing: number | null): string {
  if (seeing === null || seeing === undefined) return '—';
  return `${seeing.toFixed(1)}"`;
}

function formatGuiding(guidingRms: number | null): string {
  if (guidingRms === null || guidingRms === undefined) return '—';
  return `${guidingRms.toFixed(2)}"`;
}

function formatMoonIllumination(illum: number | null): string {
  if (illum === null || illum === undefined) return '—';
  return `${(illum * 100).toFixed(0)}%`;
}

/** Suggests tonight's date (or next clear night) in French format */
function getNightDateLabel(): string {
  const now = new Date();
  // After noon, "tonight" is tonight; before noon, it's still "tonight" (the night we're in)
  const label = now.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// ─── Component ─────────────────────────────────────────────────────────────

interface SessionPlanExporterProps {
  projectId: string;
  onClose: () => void;
}

export const SessionPlanExporter: React.FC<SessionPlanExporterProps> = ({ projectId, onClose }) => {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const token = getAuthToken();
        const res = await fetch(`${API_BASE}/${projectId}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = await res.json();
        setProject(data);
      } catch (err) {
        console.error('Failed to fetch project:', err);
        setError('Impossible de charger les données du projet.');
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [projectId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-surface border border-border rounded-xl p-8 text-text">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-text-secondary text-sm">Chargement du plan de session…</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-surface border border-border rounded-xl p-8 text-center max-w-md">
          <p className="text-red-400 mb-4">{error || 'Projet introuvable'}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-surface-elevated border border-border text-text hover:bg-border-hover transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  const totalSubs = project.exposurePlan.reduce((sum, p) => sum + p.subCount, 0);
  const totalTime = project.exposurePlan.reduce((sum, p) => sum + p.totalExposureTime, 0);
  const snrConfig = SNR_TARGET_CONFIG[project.snrTarget as SNRTarget];
  const lastObservation = project.observations && project.observations.length > 0
    ? project.observations[project.observations.length - 1]
    : null;

  return (
    <>
      {/* ─── Modal Backdrop (screen) ─────────────────────────────────────── */}
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm no-print">
        <div className="min-h-full flex items-start justify-center p-4 md:p-8">
          <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-4xl my-8">
            {/* ─── Modal Header (screen only) ─────────────────────────────── */}
            <div className="flex items-center justify-between p-4 border-b border-border no-print">
              <h2 className="text-lg font-display font-bold text-text">
                📋 Plan de Session
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors"
                >
                  📄 Exporter PDF
                </button>
                <button
                  onClick={onClose}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface-elevated border border-border text-text text-sm hover:bg-border-hover transition-colors"
                >
                  ✕ Fermer
                </button>
              </div>
            </div>

            {/* ─── Printable Content ──────────────────────────────────────── */}
            <div className="p-6 md:p-8 print-content">
              {/* ─── Header ────────────────────────────────────────────────── */}
              <div className="mb-6 pb-4 border-b-2 border-border print-header">
                <h1 className="text-2xl font-display font-bold text-text print:text-black">
                  {project.title}
                </h1>
                <p className="text-lg text-text-secondary mt-1 print:text-gray-700">
                  🎯 {project.targetName}
                </p>
                <p className="text-sm text-text-muted mt-2 print:text-gray-500">
                  Plan d'observation — Nuit du {getNightDateLabel()}
                </p>
              </div>

              {/* ─── Location ──────────────────────────────────────────────── */}
              <section className="mb-6 print-section">
                <h2 className="text-base font-semibold text-text mb-2 print:text-black flex items-center gap-2">
                  📍 Lieu d'observation
                </h2>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-text-muted print:text-gray-500">Site</span>
                    <p className="text-text print:text-black font-medium">{formatLocation(project.locationSource)}</p>
                  </div>
                  <div>
                    <span className="text-text-muted print:text-gray-500">Coordonnées</span>
                    <p className="text-text print:text-black font-mono">
                      {project.lat.toFixed(4)}°, {project.lon.toFixed(4)}°
                    </p>
                  </div>
                  <div>
                    <span className="text-text-muted print:text-gray-500">Bortle</span>
                    <p className="text-text print:text-black font-medium">Classe {project.bortle}</p>
                  </div>
                </div>
              </section>

              {/* ─── Conditions ─────────────────────────────────────────────── */}
              <section className="mb-6 print-section">
                <h2 className="text-base font-semibold text-text mb-2 print:text-black flex items-center gap-2">
                  🌤️ Conditions d'observation
                </h2>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-text-muted print:text-gray-500">Bortle (qualité ciel)</span>
                    <p className="text-text print:text-black font-medium">Classe {project.bortle}</p>
                  </div>
                  <div>
                    <span className="text-text-muted print:text-gray-500">Seeing (dernière obs.)</span>
                    <p className="text-text print:text-black font-mono">{formatSeeing(lastObservation?.seeing ?? null)}</p>
                  </div>
                  <div>
                    <span className="text-text-muted print:text-gray-500">Guiding RMS (dernière obs.)</span>
                    <p className="text-text print:text-black font-mono">{formatGuiding(lastObservation?.guidingRms ?? null)}</p>
                  </div>
                  <div>
                    <span className="text-text-muted print:text-gray-500">Lune (dernière obs.)</span>
                    <p className="text-text print:text-black font-mono">{formatMoonIllumination(lastObservation?.moonIllumination ?? null)}</p>
                  </div>
                </div>
                {(!lastObservation || (lastObservation.seeing == null && lastObservation.guidingRms == null)) && (
                  <p className="text-xs text-text-muted print:text-gray-400 italic mt-2">
                    ℹ️ Conditions basées sur la dernière observation enregistrée. Aucune observation disponible pour le moment.
                  </p>
                )}
              </section>

              {/* ─── Target ────────────────────────────────────────────────── */}
              <section className="mb-6 print-section">
                <h2 className="text-base font-semibold text-text mb-2 print:text-black flex items-center gap-2">
                  🔭 Cible
                </h2>
                <div className="flex gap-6">
                  <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <div>
                      <span className="text-text-muted print:text-gray-500">Nom</span>
                      <p className="text-text print:text-black font-medium">{project.targetName}</p>
                    </div>
                    <div>
                      <span className="text-text-muted print:text-gray-500">Type</span>
                      <p className="text-text print:text-black">{project.targetType || '—'}</p>
                    </div>
                    <div>
                      <span className="text-text-muted print:text-gray-500">RA / Dec</span>
                      <p className="text-text print:text-black font-mono">{formatRaDec(project.targetRa, project.targetDec)}</p>
                    </div>
                    <div>
                      <span className="text-text-muted print:text-gray-500">Magnitude</span>
                      <p className="text-text print:text-black font-mono">{formatMagnitude(project.targetMagnitude)}</p>
                    </div>
                    <div>
                      <span className="text-text-muted print:text-gray-500">Taille</span>
                      <p className="text-text print:text-black font-mono">{formatSize(project.targetSizeArcmin)}</p>
                    </div>
                    <div>
                      <span className="text-text-muted print:text-gray-500">Surface Brightness</span>
                      <p className="text-text print:text-black font-mono">{formatSb(project.surfaceBrightness)}</p>
                    </div>
                  </div>
                  {project.targetImageUrl && (
                    <div className="w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden border border-border print:border-gray-300">
                      <img
                        src={project.targetImageUrl}
                        alt={project.targetName}
                        className="w-full h-full object-cover"
                        crossOrigin="anonymous"
                      />
                    </div>
                  )}
                </div>
              </section>

              {/* ─── Equipment ─────────────────────────────────────────────── */}
              <section className="mb-6 print-section">
                <h2 className="text-base font-semibold text-text mb-2 print:text-black flex items-center gap-2">
                  🔧 Équipement
                </h2>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-text-muted print:text-gray-500">Rig</span>
                    <p className="text-text print:text-black font-medium">{project.rigName || '—'}</p>
                  </div>
                  <div>
                    <span className="text-text-muted print:text-gray-500">Focale</span>
                    <p className="text-text print:text-black font-mono">
                      {project.focalLength ? `${project.focalLength}mm` : '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-text-muted print:text-gray-500">Ouverture</span>
                    <p className="text-text print:text-black font-mono">
                      {project.aperture ? `${project.aperture}mm` : '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-text-muted print:text-gray-500">Filtre principal</span>
                    <p className="text-text print:text-black font-medium">{project.primaryFilter || '—'}</p>
                  </div>
                </div>
              </section>

              {/* ─── Exposure Plan ─────────────────────────────────────────── */}
              <section className="mb-6 print-section">
                <h2 className="text-base font-semibold text-text mb-3 print:text-black flex items-center gap-2">
                  ⏱️ Plan d'exposition
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b-2 border-border print:border-gray-300">
                        <th className="text-left py-2 pr-4 text-text-muted print:text-gray-500 font-medium">Filtre</th>
                        <th className="text-right py-2 px-4 text-text-muted print:text-gray-500 font-medium">t_sub</th>
                        <th className="text-right py-2 px-4 text-text-muted print:text-gray-500 font-medium">N_subs</th>
                        <th className="text-right py-2 px-4 text-text-muted print:text-gray-500 font-medium">Total</th>
                        <th className="text-right py-2 px-4 text-text-muted print:text-gray-500 font-medium">SNR</th>
                        <th className="text-right py-2 px-4 text-text-muted print:text-gray-500 font-medium">Sky e⁻/px/s</th>
                        <th className="text-right py-2 px-4 text-text-muted print:text-gray-500 font-medium">Obj e⁻/px/s</th>
                        <th className="text-right py-2 pl-4 text-text-muted print:text-gray-500 font-medium">Sampling</th>
                      </tr>
                    </thead>
                    <tbody>
                      {project.exposurePlan.map((plan, i) => (
                        <ExposurePlanRow key={i} plan={plan} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* ─── Summary ──────────────────────────────────────────────── */}
              <section className="mb-6 print-section">
                <h2 className="text-base font-semibold text-text mb-2 print:text-black flex items-center gap-2">
                  📊 Récapitulatif
                </h2>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div className="bg-surface-elevated print:bg-transparent border border-border print:border-gray-300 rounded-lg p-3">
                    <span className="text-text-muted print:text-gray-500 block text-xs">Heures planifiées</span>
                    <p className="text-text print:text-black text-lg font-bold font-mono">
                      {project.totalPlannedHours.toFixed(1)}h
                    </p>
                  </div>
                  <div className="bg-surface-elevated print:bg-transparent border border-border print:border-gray-300 rounded-lg p-3">
                    <span className="text-text-muted print:text-gray-500 block text-xs">SNR cible</span>
                    <p className="text-text print:text-black text-lg font-bold">
                      {snrConfig ? `${snrConfig.icon} ${project.snrTarget}` : project.snrTarget}
                    </p>
                    {snrConfig && (
                      <p className="text-xs text-text-muted print:text-gray-500">{snrConfig.label}</p>
                    )}
                  </div>
                  <div className="bg-surface-elevated print:bg-transparent border border-border print:border-gray-300 rounded-lg p-3">
                    <span className="text-text-muted print:text-gray-500 block text-xs">Total subs</span>
                    <p className="text-text print:text-black text-lg font-bold font-mono">{totalSubs}</p>
                  </div>
                  <div className="bg-surface-elevated print:bg-transparent border border-border print:border-gray-300 rounded-lg p-3">
                    <span className="text-text-muted print:text-gray-500 block text-xs">Temps total</span>
                    <p className="text-text print:text-black text-lg font-bold font-mono">
                      {formatExposureTime(totalTime)}
                    </p>
                  </div>
                </div>
              </section>

              {/* ─── Observations (history) ────────────────────────────────── */}
              {project.observations && project.observations.length > 0 && (
                <section className="mb-6 print-section">
                  <h2 className="text-base font-semibold text-text mb-2 print:text-black flex items-center gap-2">
                    📝 Observations ({project.observations.length})
                  </h2>
                  <div className="space-y-1.5 text-sm">
                    {project.observations.map((obs) => (
                      <div
                        key={obs.id}
                        className="flex items-center gap-3 py-1.5 border-b border-border/50 print:border-gray-200"
                      >
                        <span className="text-text-muted print:text-gray-500 font-mono text-xs w-24">
                          {formatDate(obs.date)}
                        </span>
                        <span className="text-text print:text-black">
                          {obs.exposuresTaken} × {obs.exposureDuration}s
                        </span>
                        <span className="text-text-muted print:text-gray-500">
                          {obs.filter}
                        </span>
                        {obs.notes && (
                          <span className="text-text-muted print:text-gray-500 italic text-xs ml-auto truncate">
                            {obs.notes}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ─── Footer ────────────────────────────────────────────────── */}
              <div className="mt-8 pt-4 border-t border-border print:border-gray-300 text-center text-xs text-text-muted print:text-gray-400">
                AstroCapture — Plan de session généré le{' '}
                {new Date().toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// ─── Exposure Plan Row ─────────────────────────────────────────────────────

const ExposurePlanRow: React.FC<{ plan: ProjectExposurePlan }> = ({ plan }) => {
  return (
    <tr className="border-b border-border/50 print:border-gray-200">
      <td className="py-2 pr-4 text-text print:text-black font-medium">
        {plan.filter}
      </td>
      <td className="py-2 px-4 text-right text-text print:text-black font-mono">
        {plan.subExposure}s
      </td>
      <td className="py-2 px-4 text-right text-text print:text-black font-mono">
        {plan.subCount}
      </td>
      <td className="py-2 px-4 text-right text-text print:text-black font-mono font-medium">
        {formatExposureTime(plan.totalExposureTime)}
      </td>
      <td className="py-2 px-4 text-right text-text print:text-black font-mono">
        {plan.snrValue.toFixed(1)}
        <span className="text-text-muted print:text-gray-500 text-xs ml-1">
          ({plan.snrEstimate})
        </span>
      </td>
      <td className="py-2 px-4 text-right text-text print:text-black font-mono text-xs">
        {plan.skyElectronRate.toFixed(2)}
      </td>
      <td className="py-2 px-4 text-right text-text print:text-black font-mono text-xs">
        {plan.objectElectronRate.toFixed(2)}
      </td>
      <td className="py-2 pl-4 text-right text-text print:text-black font-mono text-xs">
        {plan.sampling.toFixed(2)}"/px
      </td>
    </tr>
  );
};

export default SessionPlanExporter;