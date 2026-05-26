// ============================================================================
// COMPOSANT: YearlyHeatmap — Waterfall 12 mois + phases lunaires
// Module 4 — Planification Temporelle
// ============================================================================

import React, { useState } from 'react';
import { YearlyVisibility, MonthlyVisibility, HourlyVisibility } from '../../types/module4';

interface YearlyHeatmapProps {
  data: YearlyVisibility;
}

const MONTH_NAMES = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
const NIGHT_HOURS = [20, 21, 22, 23, 0, 1, 2, 3, 4, 5];

export const YearlyHeatmap: React.FC<YearlyHeatmapProps> = ({ data }) => {
  const [hoveredCell, setHoveredCell] = useState<{ month: number; hour: number } | null>(null);

  return (
    <div className="rounded-lg bg-white dark:bg-slate-900 p-4 shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            📊 Visibilité Annuelle — {data.targetName}
          </h3>
          <div className="text-sm text-slate-500 mt-1">
            🌑 {data.blackNightsCount} nuits noires • {data.totalImagingHours.toFixed(0)}h potentielles
          </div>
        </div>
      </div>

      {/* Heatmap grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Header mois */}
          <div className="grid grid-cols-[50px_repeat(12,1fr)] gap-px mb-1">
            <div className="text-xs text-slate-400">Heure</div>
            {MONTH_NAMES.map((m, i) => (
              <div key={i} className="text-center text-xs font-medium text-slate-600 dark:text-slate-300">
                {m}
              </div>
            ))}
          </div>

          {/* Légende phases lunaires */}
          <div className="grid grid-cols-[50px_repeat(12,1fr)] gap-px mb-2">
            <div />
            {data.months.map((month, i) => {
              const blackNights = month.moonPhases.filter(m => m.isBlackNight).length;
              return (
                <div key={i} className="text-center">
                  {blackNights > 0 && (
                    <span className="text-[10px] text-emerald-600 font-medium">
                      🌑 {blackNights}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Grid heures x mois */}
          {NIGHT_HOURS.map(hour => (
            <div key={hour} className="grid grid-cols-[50px_repeat(12,1fr)] gap-px mb-px">
              <div className="text-xs text-slate-500 flex items-center">
                {String(hour).padStart(2, '0')}h
              </div>

              {data.months.map((month, mi) => {
                const hourData = month.hours.find(h => h.hour === hour);
                const isVisible = hourData?.isVisible ?? false;
                const altitude = hourData?.altitude ?? 0;
                const isBlackNight = month.moonPhases.some(m => m.isBlackNight);

                return (
                  <div
                    key={mi}
                    className={`
                      h-6 rounded-sm cursor-pointer transition-all hover:scale-105 hover:ring-1 hover:ring-slate-400
                      ${isVisible
                        ? altitude > 30
                          ? isBlackNight
                            ? 'bg-emerald-500' // Visible + haute + nuit noire
                            : 'bg-emerald-300' // Visible + haute
                          : 'bg-yellow-300' // Visible + basse
                        : 'bg-slate-100 dark:bg-slate-800'}
                    `}
                    onMouseEnter={() => setHoveredCell({ month: mi, hour })}
                    onMouseLeave={() => setHoveredCell(null)}
                    title={hourData
                      ? `${MONTH_NAMES[mi]} ${String(hour).padStart(2, '0')}h — Alt: ${altitude.toFixed(1)}°`
                      : 'Pas de données'}
                  />
                );
              })}
            </div>
          ))}

          {/* Légende */}
          <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
            <span>Légende :</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-emerald-500"></div>
              <span>Visible haute + nuit noire</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-emerald-300"></div>
              <span>Visible haute</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-yellow-300"></div>
              <span>Visible basse</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-slate-200 dark:bg-slate-700"></div>
              <span>Invisible</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default YearlyHeatmap;
