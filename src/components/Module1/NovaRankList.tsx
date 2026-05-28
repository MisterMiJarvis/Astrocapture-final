// ============================================================================
// COMPOSANT: NovaRankList — Tri cibles par pertinence
// Module 1 — Dashboard Central
// ============================================================================

import React, { useState } from 'react';
import { AstroTarget, FilterType } from '../../types/module1';

interface NovaRankListProps {
  targets: AstroTarget[];
  onTargetSelect?: (target: AstroTarget) => void;
  availableFilters?: FilterType[];
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

function formatTimeUntil(date?: Date): string {
  if (!date) return '—';
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours > 0) return `${hours}h${mins}m`;
  if (mins > 0) return `${mins}m`;
  return 'Maintenant';
}

export const NovaRankList: React.FC<NovaRankListProps> = ({
  targets = [],
  onTargetSelect,
  availableFilters = ['UV_IR_Cut', 'L_Ultimate', 'Ha', 'OIII'],
}) => {
  if (!targets || targets.length === 0) {
    return (
      <div className="rounded-lg bg-white dark:bg-slate-900 p-4 shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold mb-3 text-slate-800 dark:text-slate-100">
          🔭 Nova Rank
        </h3>
        <p className="text-sm text-slate-500">Aucune cible disponible.</p>
      </div>
    );
  }
  const [sortBy, setSortBy] = useState<'novaRank' | 'altitude' | 'moonSep' | 'name'>('novaRank');
  const [filterType, setFilterType] = useState<FilterType | 'all'>('all');
  const [minAltitude, setMinAltitude] = useState(20);

  const sortedTargets = React.useMemo(() => {
    let filtered = [...targets];

    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.recommendedFilters.includes(filterType));
    }

    filtered = filtered.filter(t => (t.altitudeCurrent ?? 0) >= minAltitude);

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'novaRank': return b.novaRank - a.novaRank;
        case 'altitude': return (b.altitudeCurrent ?? 0) - (a.altitudeCurrent ?? 0);
        case 'moonSep': return (b.moonSeparation ?? 0) - (a.moonSeparation ?? 0);
        case 'name': return a.name.localeCompare(b.name);
        default: return 0;
      }
    });
  }, [targets, sortBy, filterType, minAltitude]);

  return (
    <div className="rounded-lg bg-white dark:bg-slate-900 p-4 shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          🎯 Nova Rank — Cibles de la Nuit
        </h3>
        <div className="text-sm text-slate-500">
          {sortedTargets.length} cible{sortedTargets.length > 1 ? 's' : ''}
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as any)}
          className="text-sm border rounded px-2 py-1 bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
        >
          <option value="novaRank">Tri: Nova Rank</option>
          <option value="altitude">Tri: Altitude</option>
          <option value="moonSep">Tri: Séparation Lune</option>
          <option value="name">Tri: Nom</option>
        </select>

        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value as any)}
          className="text-sm border rounded px-2 py-1 bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
        >
          <option value="all">Tous les filtres</option>
          {availableFilters.map(f => (
            <option key={f} value={f}>{f}</option>
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
      </div>

      {/* Liste */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {sortedTargets.map(target => (
          <div
            key={target.id}
            onClick={() => onTargetSelect?.(target)}
            className="group flex items-center gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800
                       hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer transition-all
                       hover:bg-slate-50 dark:hover:bg-slate-800/50"
          >
            {/* Score */}
            <div className={`
              w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold
              ${target.novaRank >= 80 ? 'bg-emerald-100 text-emerald-700' :
                target.novaRank >= 60 ? 'bg-yellow-100 text-yellow-700' :
                target.novaRank >= 40 ? 'bg-orange-100 text-orange-700' :
                'bg-red-100 text-red-700'}
            `}>
              {target.novaRank}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-lg">{TYPE_ICONS[target.type] || '🔭'}</span>
                <span className="font-medium text-slate-800 dark:text-slate-100 truncate">
                  {target.name}
                </span>
                <span className="text-xs text-slate-500">{target.catalogName}</span>
              </div>

              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-slate-500">
                <span>Alt: {(target.altitudeCurrent ?? 0).toFixed(0)}°</span>
                <span>Transit: {formatTimeUntil(target.transitTime)}</span>
                <span>Lune: {(target.moonSeparation ?? 0).toFixed(0)}°</span>
                <span>Mag {target.magnitude}</span>
                <span>{target.sizeArcmin}'</span>
              </div>

              {/* Score détails */}
              <div className="flex gap-1 mt-1">
                {Object.entries(target.scoreDetails).map(([key, val]) => (
                  <div
                    key={key}
                    className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 flex-1 overflow-hidden"
                    title={`${key}: ${val}`}
                  >
                    <div
                      className={`h-full rounded-full ${val >= 60 ? 'bg-emerald-400' : val >= 40 ? 'bg-yellow-400' : 'bg-red-400'}`}
                      style={{ width: `${val}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Filtres */}
            <div className="flex flex-col gap-1">
              {target.recommendedFilters.slice(0, 2).map(f => (
                <span key={f} className={`text-[10px] px-1.5 py-0.5 rounded ${FILTER_COLORS[f] || 'bg-gray-100'}`}>
                  {f.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        ))}

        {sortedTargets.length === 0 && (
          <div className="text-center text-sm text-slate-400 py-8">
            Aucune cible ne correspond aux filtres sélectionnés
          </div>
        )}
      </div>
    </div>
  );
};

export default NovaRankList;
