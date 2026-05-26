// ============================================================================
// COMPOSANT: MultiNightPlanner — Timeline 7-14 nuits
// Module 4 — Planification Temporelle
// ============================================================================

import React, { useState } from 'react';
import { MultiNightPlan, PlannedNight, TimeWindow } from '../../types/module4';
import { getMeridianFlipInfo } from '../../services/module4/planningService';

interface MultiNightPlannerProps {
  plan: MultiNightPlan;
  onExport?: (plan: MultiNightPlan, nightIndex: number, format: string) => void;
}

const WINDOW_COLORS: Record<TimeWindow['type'], string> = {
  imaging: 'bg-emerald-400',
  meridian_flip: 'bg-orange-400',
  day: 'bg-slate-200 dark:bg-slate-700',
  weather_block: 'bg-red-300',
};

export const MultiNightPlanner: React.FC<MultiNightPlannerProps> = ({ plan, onExport }) => {
  const [selectedNight, setSelectedNight] = useState<number | null>(null);
  const [showFlipInfo, setShowFlipInfo] = useState(false);

  const totalHours = plan.nights.reduce((sum, n) => sum + n.hoursAboveHorizon, 0);
  const visibleNights = plan.nights.filter(n => n.isVisible).length;

  return (
    <div className="rounded-lg bg-white dark:bg-slate-900 p-4 shadow-sm border border-slate-200 dark:border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            📅 Plan {plan.nights.length} Nuits — {plan.targetName}
          </h3>
          <div className="text-sm text-slate-500 mt-1">
            {visibleNights} nuits visibles • {totalHours.toFixed(1)}h au total
          </div>
        </div>
        <button
          onClick={() => setShowFlipInfo(!showFlipInfo)}
          className="text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-600
                     hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
        >
          {showFlipInfo ? 'Masquer' : 'Meridian Flip'}
        </button>
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {plan.nights.map((night, i) => (
          <div
            key={i}
            className={`rounded-lg border p-3 transition-all cursor-pointer
              ${selectedNight === i
                ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/10'
                : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600'}
            `}
            onClick={() => setSelectedNight(selectedNight === i ? null : i)}
          >
            {/* Night header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                  ${night.isVisible ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}
                `}>
                  {i + 1}
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    {night.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}
                  </div>
                  <div className="text-xs text-slate-500">
                    {night.isVisible
                      ? `🌙 ${night.hoursAboveHorizon.toFixed(1)}h • Transit ${night.transitTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                      : '❌ Non visible'}
                  </div>
                </div>
              </div>

              {night.isVisible && (
                <div className="flex gap-1">
                  <button
                    onClick={e => { e.stopPropagation(); onExport?.(plan, i, 'nina_json'); }}
                    className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100"
                  >
                    NINA
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); onExport?.(plan, i, 'asiair_json'); }}
                    className="text-xs px-2 py-1 rounded bg-purple-50 text-purple-600 hover:bg-purple-100"
                  >
                    ASIAIR
                  </button>
                </div>
              )}
            </div>

            {/* Time windows bar */}
            {night.isVisible && night.imagingWindow.length > 0 && (
              <div className="mt-2">
                <div className="flex h-4 rounded-full overflow-hidden">
                  {night.imagingWindow.map((win, wi) => {
                    const duration = (win.end.getTime() - win.start.getTime()) / 60000;
                    const totalNight = night.hoursAboveHorizon * 60;
                    const width = totalNight > 0 ? (duration / totalNight) * 100 : 0;

                    return (
                      <div
                        key={wi}
                        className={`${WINDOW_COLORS[win.type]} relative group`}
                        style={{ width: `${Math.max(5, width)}%` }}
                      >
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1
                                      hidden group-hover:block whitespace-nowrap text-xs
                                      bg-slate-800 text-white px-2 py-1 rounded z-10">
                          {win.label}: {win.start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} —
                          {win.end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>{night.sunset.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                  <span>{night.meridianFlipTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} 🔄</span>
                  <span>{night.sunrise.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            )}

            {/* Details */}
            {selectedNight === i && showFlipInfo && night.isVisible && (
              <div className="mt-3 p-3 rounded bg-slate-50 dark:bg-slate-800/50 text-sm">
                <div className="font-medium text-slate-700 dark:text-slate-200 mb-2">
                  🔄 Meridian Flip
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                  <div>Transit: {night.transitTime.toLocaleTimeString('fr-FR')}</div>
                  <div>Flip: {night.meridianFlipTime.toLocaleTimeString('fr-FR')}</div>
                  <div>Pré-flip: {((night.meridianFlipTime.getTime() - night.astroDusk.getTime()) / 60000).toFixed(0)} min</div>
                  <div>Post-flip: {((night.astroDawn.getTime() - night.meridianFlipTime.getTime()) / 60000).toFixed(0)} min</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MultiNightPlanner;
