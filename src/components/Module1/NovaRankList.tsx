// ============================================================================
// COMPOSANT: NovaRankList — Tri cibles par pertinence
// Module 1 — Dashboard Central
// v2: Best Tonight tab, rig selector, thumbnails, dynamic filters, imaging windows
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { AstroTarget, BestTargetFilters } from '../../types/module1';
import { FilterType } from '../../types/module5';
import { RigProfile } from '../../types/module2';
import { fetchBestTargetsTonight } from '../../services/module1/targetService';

interface NovaRankListProps {
  targets: AstroTarget[];
  onTargetSelect?: (target: AstroTarget) => void;
  availableFilters?: FilterType[];
  rigs?: RigProfile[];
  activeRig?: RigProfile | null;
  lat?: number;
  lon?: number;
  moonData?: { phase: number; altitude: number; raDeg: number; decDeg: number };
}

const FILTER_COLORS: Record<FilterType, string> = {
  UV_IR_Cut: 'bg-blue-100 text-blue-800',
  L_Ultimate: 'bg-purple-100 text-purple-800',
  LPS_D2: 'bg-green-100 text-green-800',
  Ha: 'bg-red-100 text-red-800',
  OIII: 'bg-cyan-100 text-cyan-800',
  SII: 'bg-orange-100 text-orange-800',
  RGB: 'bg-pink-100 text-pink-800',
  Luminance: 'bg-gray-100 text-gray-800',
};

const TYPE_ICONS: Record<string, string> = {
  Galaxy: '🌌',
  Nebula: '💨',
  Cluster: '⭐',
  Supernova: '💥',
  Quasar: '🔭',
};

const FIT_COLORS: Record<string, string> = {
  perfect: 'bg-emerald-100 text-emerald-700',
  good: 'bg-green-100 text-green-700',
  tight: 'bg-yellow-100 text-yellow-700',
  too_large: 'bg-red-100 text-red-700',
  unknown: 'bg-slate-100 text-slate-500',
};

const FIT_LABELS: Record<string, string> = {
  perfect: '✓ Parfait',
  good: '○ Bon',
  tight: '△ Serré',
  too_large: '✗ Trop grand',
  unknown: '? Inconnu',
};

type TabView = 'ranked' | 'bestTonight';

function formatTimeUntil(date?: Date): string {
  if (!date) return '—';
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  if (diff < 0) return 'Passé';
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours > 0) return `${hours}h${mins}m`;
  if (mins > 0) return `${mins}m`;
  return 'Maintenant';
}

function formatImagingHours(hours: number): string {
  if (hours >= 6) return `🌙 ${hours.toFixed(1)}h`;
  if (hours >= 3) return `${hours.toFixed(1)}h`;
  if (hours > 0) return `${hours.toFixed(1)}h`;
  return '—';
}

export const NovaRankList: React.FC<NovaRankListProps> = ({
  targets = [],
  onTargetSelect,
  availableFilters = ['Ha', 'OIII', 'SII', 'L_Ultimate', 'UV_IR_Cut'],
  rigs = [],
  activeRig,
  lat = 43.7889,
  lon = 4.7533,
  moonData = { phase: 0.3, altitude: 30, raDeg: 0, decDeg: 0 },
}) => {
  const [sortBy, setSortBy] = useState<'novaRank' | 'altitude' | 'moonSep' | 'imagingHours' | 'name'>('novaRank');
  const [filterType, setFilterType] = useState<FilterType | 'all'>('all');
  const [minAltitude, setMinAltitude] = useState(20);
  const [tab, setTab] = useState<TabView>('bestTonight');
  const [bestTargets, setBestTargets] = useState<AstroTarget[]>([]);
  const [loading, setLoading] = useState(false);
  const [bestFilters, setBestFilters] = useState<BestTargetFilters>({
    lat, lon, timezone: 'Europe/Paris',
    minAlt: 30, magMax: 12, subrMax: 22, sizeMin: 5,
    moonDistMin: 30, minImagingHours: 1, perPage: 30,
  });
  const [selectedRigId, setSelectedRigId] = useState<string>(activeRig?.id || '');

  // Current rig (selected or default)
  const currentRig = rigs.find(r => r.id === selectedRigId) || activeRig || null;

  // Fetch best targets when tab switches or filters change
  const loadBestTargets = useCallback(async () => {
    setLoading(true);
    try {
      const results = await fetchBestTargetsTonight(
        { ...bestFilters, lat, lon },
        availableFilters,
        moonData,
        currentRig
      );
      setBestTargets(results);
    } catch (err) {
      console.error('Failed to load best targets:', err);
    } finally {
      setLoading(false);
    }
  }, [bestFilters, lat, lon, availableFilters, moonData, currentRig]);

  useEffect(() => {
    if (tab === 'bestTonight') {
      loadBestTargets();
    }
  }, [tab, loadBestTargets]);

  const displayTargets = tab === 'bestTonight' ? bestTargets : targets;

  const sortedTargets = React.useMemo(() => {
    let filtered = [...displayTargets];

    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.recommendedFilters.includes(filterType));
    }

    filtered = filtered.filter(t => (t.altitudeCurrent ?? t.altitudeMax ?? 0) >= minAltitude);

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'novaRank': return b.novaRank - a.novaRank;
        case 'altitude': return (b.altitudeCurrent ?? b.altitudeMax ?? 0) - (a.altitudeCurrent ?? a.altitudeMax ?? 0);
        case 'moonSep': return (b.moonSeparation ?? 0) - (a.moonSeparation ?? 0);
        case 'imagingHours': return (b.totalImagingHours ?? 0) - (a.totalImagingHours ?? 0);
        case 'name': return a.name.localeCompare(b.name);
        default: return 0;
      }
    });
  }, [displayTargets, sortBy, filterType, minAltitude]);

  return (
    <div className="rounded-lg bg-white dark:bg-slate-900 p-4 shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          🎯 Targets — {tab === 'bestTonight' ? 'Best Tonight' : 'Nova Rank'}
        </h3>
        <div className="text-sm text-slate-500">
          {sortedTargets.length} cible{sortedTargets.length > 1 ? 's' : ''}
        </div>
      </div>

      {/* Tab selector */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('bestTonight')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            tab === 'bestTonight'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200'
          }`}
        >
          🌟 Best Tonight
        </button>
        <button
          onClick={() => setTab('ranked')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            tab === 'ranked'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200'
          }`}
        >
          📊 All Targets
        </button>
      </div>

      {/* Rig selector */}
      {rigs.length > 0 && (
        <div className="mb-3">
          <label className="text-xs text-slate-500 block mb-1">Rig actif</label>
          <select
            value={selectedRigId}
            onChange={e => setSelectedRigId(e.target.value)}
            className="w-full text-sm border rounded px-2 py-1.5 bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
          >
            <option value="">Aucun rig</option>
            {rigs.map(r => (
              <option key={r.id} value={r.id}>
                {r.name} — {r.telescope.focalLength}mm f/{r.telescope.fRatio}
              </option>
            ))}
          </select>
          {currentRig && (
            <div className="text-xs text-slate-400 mt-1">
              FOV: {(currentRig.camera.sensorWidth * 206.265 / (currentRig.telescope.focalLength * (currentRig.modifier.type === 'None' ? 1 : currentRig.modifier.factor))).toFixed(1)}' ×
              {(currentRig.camera.sensorHeight * 206.265 / (currentRig.telescope.focalLength * (currentRig.modifier.type === 'None' ? 1 : currentRig.modifier.factor))).toFixed(1)}' |
              Pixel scale: {((currentRig.camera.pixelSize * 206.265) / (currentRig.telescope.focalLength * (currentRig.modifier.type === 'None' ? 1 : currentRig.modifier.factor))).toFixed(2)}"/px
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as any)}
          className="text-sm border rounded px-2 py-1 bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
        >
          <option value="novaRank">Tri: Nova Rank</option>
          <option value="altitude">Tri: Altitude</option>
          <option value="moonSep">Tri: Séparation Lune</option>
          <option value="imagingHours">Tri: Heures d'imaging</option>
          <option value="name">Tri: Nom</option>
        </select>

        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value as any)}
          className="text-sm border rounded px-2 py-1 bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
        >
          <option value="all">Tous les filtres</option>
          {availableFilters.map(f => (
            <option key={f} value={f}>{f.replace(/_/g, ' ')}</option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Alt min:</span>
          <input
            type="range"
            min="0"
            max="90"
            value={minAltitude}
            onChange={e => setMinAltitude(Number(e.target.value))}
            className="w-24"
          />
          <span className="text-xs text-slate-500 w-6">{minAltitude}°</span>
        </div>

        {tab === 'bestTonight' && (
          <button
            onClick={loadBestTargets}
            disabled={loading}
            className="px-3 py-1 text-sm rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {loading ? '⟳' : '↻ Refresh'}
          </button>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      )}

      {/* Target list */}
      {!loading && (
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {sortedTargets.map(target => (
            <div
              key={target.id}
              onClick={() => onTargetSelect?.(target)}
              className="group flex gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800
                         hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer transition-all
                         hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              {/* Thumbnail */}
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                {target.imageUrl ? (
                  <img src={target.imageUrl} alt={target.name} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">
                    {TYPE_ICONS[target.type] || '🔭'}
                  </div>
                )}
              </div>

              {/* Score + Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                    ${target.novaRank >= 80 ? 'bg-emerald-100 text-emerald-700' :
                      target.novaRank >= 60 ? 'bg-yellow-100 text-yellow-700' :
                      target.novaRank >= 40 ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'}
                  `}>
                    {target.novaRank}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg">{TYPE_ICONS[target.type] || '🔭'}</span>
                      <span className="font-medium text-slate-800 dark:text-slate-100 truncate">
                        {target.name}
                      </span>
                      {target.constellation && (
                        <span className="text-xs text-slate-400">{target.constellation}</span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-slate-500">
                      <span>Alt: {(target.altitudeCurrent ?? target.altitudeMax ?? 0).toFixed(0)}°</span>
                      {target.totalImagingHours > 0 && (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {formatImagingHours(target.totalImagingHours)}
                        </span>
                      )}
                      {target.moonSeparation != null && (
                        <span>🌙 {target.moonSeparation.toFixed(0)}°</span>
                      )}
                      <span>Mag {target.magnitude}</span>
                      {target.sizeArcmin > 0 && <span>{target.sizeArcmin.toFixed(0)}'</span>}
                      {target.surfaceBrightness != null && <span>SB {target.surfaceBrightness.toFixed(1)}</span>}
                    </div>

                    {/* Score breakdown bars */}
                    <div className="flex gap-0.5 mt-1">
                      {Object.entries(target.scoreDetails).filter(([k]) => !['imagingHours', 'framingFit', 'coveragePercent'].includes(k)).map(([key, val]) => (
                        <div
                          key={key}
                          className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 flex-1 overflow-hidden"
                          title={`${key}: ${val}`}
                        >
                          <div
                            className={`h-full rounded-full ${typeof val === 'number' && (val as number) >= 60 ? 'bg-emerald-400' : typeof val === 'number' && (val as number) >= 40 ? 'bg-yellow-400' : 'bg-red-400'}`}
                            style={{ width: `${typeof val === 'number' ? val : 0}%` }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom row: filters + framing */}
                <div className="flex items-center gap-1 mt-1.5">
                  {target.recommendedFilters.slice(0, 3).map(f => (
                    <span key={f} className={`text-[10px] px-1.5 py-0.5 rounded ${FILTER_COLORS[f] || 'bg-gray-100'}`}>
                      {f.replace(/_/g, ' ')}
                    </span>
                  ))}
                  {target.scoreDetails.framingFit !== 'unknown' && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${FIT_COLORS[target.scoreDetails.framingFit] || 'bg-gray-100'}`}>
                      {FIT_LABELS[target.scoreDetails.framingFit] || target.scoreDetails.framingFit}
                      {target.scoreDetails.coveragePercent != null && ` ${target.scoreDetails.coveragePercent.toFixed(0)}%`}
                    </span>
                  )}
                </div>

                {/* Imaging windows */}
                {target.imagingWindows && target.imagingWindows.length > 0 && (
                  <div className="mt-1 text-[10px] text-slate-400">
                    {target.imagingWindows.map((w, i) => (
                      <span key={i} className="mr-2">
                        {w.start}→{w.end} ({w.hours.toFixed(1)}h)
                        {w.moonIllumination != null && ` 🌙${(w.moonIllumination * 100).toFixed(0)}%`}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {sortedTargets.length === 0 && !loading && (
            <div className="text-center text-sm text-slate-400 py-8">
              {tab === 'bestTonight' ? 'Chargement des meilleures cibles…' : 'Aucune cible ne correspond aux filtres sélectionnés'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NovaRankList;