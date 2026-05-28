// ============================================================================
// COMPOSANT: NightExplorer — Suggestions Telescopius
// Module 1 — Dashboard Central
// ============================================================================

import React from 'react';
import { TelescopiusSuggestion } from '../../types/module1';

interface NightExplorerProps {
  suggestions: TelescopiusSuggestion[];
  onTargetSelect?: (id: string) => void;
  isLoading?: boolean;
}

const TYPE_EMOJIS: Record<string, string> = {
  Galaxy: '🌌',
  Nebula: '💨',
  Cluster: '⭐',
  Supernova: '💥',
  Quasar: '🔭',
};

export const NightExplorer: React.FC<NightExplorerProps> = ({
  suggestions = [],
  onTargetSelect,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="rounded-lg bg-white dark:bg-slate-900 p-4 shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold mb-3 text-slate-800 dark:text-slate-100">
          🔭 Night Explorer
        </h3>
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white dark:bg-slate-900 p-4 shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          🔭 Night Explorer
        </h3>
        <span className="text-xs text-slate-400">
          via Telescopius
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {suggestions.map(target => (
          <div
            key={target.id}
            onClick={() => onTargetSelect?.(target.id)}
            className="group rounded-lg border border-slate-100 dark:border-slate-800 overflow-hidden
                       hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer transition-all
                       hover:shadow-md"
          >
            {/* Image placeholder */}
            <div className="h-24 bg-slate-100 dark:bg-slate-800 flex items-center justify-center relative">
              {target.imageUrl ? (
                <img
                  src={target.imageUrl}
                  alt={target.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <span className="text-3xl">{TYPE_EMOJIS[target.type] || '🔭'}</span>
              )}
              <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                {target.altitudeMax.toFixed(0)}°
              </div>
            </div>

            {/* Info */}
            <div className="p-3">
              <div className="font-medium text-sm text-slate-800 dark:text-slate-100 truncate">
                {target.name}
              </div>
              <div className="text-xs text-slate-500">
                {target.catalogName}
              </div>

              <div className="flex flex-wrap gap-1 mt-2">
                {target.badges.map((badge, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}

        {suggestions.length === 0 && (
          <div className="col-span-full text-center text-sm text-slate-400 py-8">
            Aucune suggestion disponible. Vérifiez votre localisation.
          </div>
        )}
      </div>
    </div>
  );
};

export default NightExplorer;
