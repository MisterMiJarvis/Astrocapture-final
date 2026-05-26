// ============================================================================
// COMPOSANT: NINAAnalysisView — Swimlane, autofocus, dithering
// Module 6 — Projets, Logs & Analyse
// ============================================================================

import React, { useState } from 'react';
import { NINALog, NINAEvent, AutofocusRun, DitherEvent } from '../../types/module6';

interface NINAAnalysisViewProps {
  log: NINALog;
}

type SwimlaneRow = 'acquisition' | 'guiding' | 'focuser' | 'dither';

export const NINAAnalysisView: React.FC<NINAAnalysisViewProps> = ({ log }) => {
  const [selectedAutofocus, setSelectedAutofocus] = useState<AutofocusRun | null>(null);
  const { timeline, autofocusRuns, ditherEvents } = log;

  if (timeline.length === 0) {
    return (
      <div className="rounded-lg bg-white dark:bg-slate-900 p-4 shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          📊 Analyse N.I.N.A. / ASIAIR
        </h3>
        <div className="text-sm text-slate-400 mt-2">Aucune timeline disponible</div>
      </div>
    );
  }

  const startTime = timeline[0].timestamp;
  const endTime = timeline[timeline.length - 1].timestamp;
  const totalDuration = (endTime.getTime() - startTime.getTime()) / 60000; // minutes

  return (
    <div className="rounded-lg bg-white dark:bg-slate-900 p-4 shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          📊 Analyse N.I.N.A. / ASIAIR — {log.fileName}
        </h3>
        <span className="text-xs text-slate-400">
          {timeline.length} événements • {totalDuration.toFixed(0)} min
        </span>
      </div>

      {/* Swimlane */}
      <div className="mb-4 overflow-x-auto">
        <SwimlaneView timeline={timeline} startTime={startTime} endTime={endTime} />
      </div>

      {/* Autofocus runs */}
      {autofocusRuns.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
            🔬 Autofocus ({autofocusRuns.length} runs)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {autofocusRuns.map((af, i) => (
              <div
                key={i}
                onClick={() => setSelectedAutofocus(selectedAutofocus === af ? null : af)}
                className={`rounded-lg border p-3 cursor-pointer transition-all
                  ${af.isSuccessful ? 'border-emerald-200 bg-emerald-50/30' : 'border-red-200 bg-red-50/30'}
                  hover:shadow-md`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Run {i + 1}</span>
                  <span className={`text-xs ${af.isSuccessful ? 'text-emerald-500' : 'text-red-500'}`}>
                    {af.isSuccessful ? '✅' : '❌'}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {af.timestamp.toLocaleTimeString('fr-FR')} • {af.filter} • T={af.temperature}°C
                </div>
                <div className="text-xs text-slate-500">
                  Best HFR: {af.curveV.bestHfr.toFixed(2)} @ pos {af.curveV.bestPosition}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Autofocus curve */}
      {selectedAutofocus && (
        <div className="mb-4 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Courbe V — {selectedAutofocus.filter} @ {selectedAutofocus.timestamp.toLocaleTimeString('fr-FR')}
            </span>
            <button
              onClick={() => setSelectedAutofocus(null)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
          <AutofocusCurve run={selectedAutofocus} />
        </div>
      )}

      {/* Dither stats */}
      {ditherEvents.length > 0 && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded bg-slate-50 dark:bg-slate-800/50 p-2">
            <div className="text-xs text-slate-400">Dithers</div>
            <div className="font-medium">{ditherEvents.length}</div>
          </div>
          <div className="rounded bg-slate-50 dark:bg-slate-800/50 p-2">
            <div className="text-xs text-slate-400">Settle moyen</div>
            <div className="font-medium">
              {(ditherEvents.reduce((s, d) => s + d.settleTime, 0) / ditherEvents.length).toFixed(1)}s
            </div>
          </div>
          <div className="rounded bg-slate-50 dark:bg-slate-800/50 p-2">
            <div className="text-xs text-slate-400">Succès</div>
            <div className="font-medium text-emerald-500">
              {ditherEvents.filter(d => d.isSuccessful).length} / {ditherEvents.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Swimlane visuel
 */
const SwimlaneView: React.FC<{
  timeline: NINAEvent[];
  startTime: Date;
  endTime: Date;
}> = ({ timeline, startTime, endTime }) => {
  const duration = endTime.getTime() - startTime.getTime();
  const lanes: { type: SwimlaneRow; label: string; color: string }[] = [
    { type: 'acquisition', label: 'Acquisition', color: 'bg-emerald-400' },
    { type: 'guiding', label: 'Guidage', color: 'bg-blue-400' },
    { type: 'focuser', label: 'Focuser', color: 'bg-yellow-400' },
    { type: 'dither', label: 'Dither', color: 'bg-purple-400' },
  ];

  const getLaneForEvent = (event: NINAEvent): SwimlaneRow => {
    if (event.type === 'exposure_start' || event.type === 'exposure_end') return 'acquisition';
    if (event.type === 'autofocus') return 'focuser';
    if (event.type === 'dither') return 'dither';
    return 'guiding';
  };

  const getEventColor = (event: NINAEvent): string => {
    if (event.type === 'exposure_start') return 'bg-emerald-400';
    if (event.type === 'exposure_end') return 'bg-emerald-300';
    if (event.type === 'autofocus') return 'bg-yellow-400';
    if (event.type === 'dither') return 'bg-purple-400';
    if (event.type === 'meridian_flip') return 'bg-orange-400';
    if (event.type === 'abort') return 'bg-red-400';
    return 'bg-blue-400';
  };

  return (
    <div className="min-w-[600px]">
      {/* Légende */}
      <div className="flex gap-3 mb-2 text-xs">
        {lanes.map(lane => (
          <div key={lane.type} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded ${lane.color}`} />
            <span className="text-slate-500">{lane.label}</span>
          </div>
        ))}
      </div>

      {/* Timeline bar */}
      <div className="relative h-24 bg-slate-50 dark:bg-slate-800/50 rounded-lg overflow-hidden">
        {/* Events */}
        {timeline.map((event, i) => {
          const offset = ((event.timestamp.getTime() - startTime.getTime()) / duration) * 100;
          const lane = lanes.findIndex(l => l.type === getLaneForEvent(event));
          const laneHeight = 24;
          const top = lane * laneHeight;

          return (
            <div
              key={i}
              className={`absolute h-5 rounded ${getEventColor(event)} opacity-80 hover:opacity-100
                         transition-opacity cursor-pointer`}
              style={{
                left: `${offset}%`,
                top: `${top + 2}px`,
                width: '4px',
              }}
              title={`${event.type} @ ${event.timestamp.toLocaleTimeString('fr-FR')}`}
            />
          );
        })}

        {/* Lane separators */}
        {lanes.map((_, i) => (
          <div
            key={i}
            className="absolute w-full border-t border-slate-200 dark:border-slate-700"
            style={{ top: `${(i + 1) * 24}px` }}
          />
        ))}
      </div>

      {/* Time labels */}
      <div className="flex justify-between text-[10px] text-slate-400 mt-1">
        <span>{startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
        <span>{endTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  );
};

/**
 * Graphique courbe V autofocus
 */
const AutofocusCurve: React.FC<{ run: AutofocusRun }> = ({ run }) => {
  const { positions, hfrValues } = run.curveV;
  if (positions.length === 0) return <div className="text-sm text-slate-400">Pas de données de courbe</div>;

  const width = 400;
  const height = 200;
  const padding = 30;

  const minPos = Math.min(...positions);
  const maxPos = Math.max(...positions);
  const minHfr = Math.min(...hfrValues);
  const maxHfr = Math.max(...hfrValues);

  const xScale = (width - 2 * padding) / (maxPos - minPos || 1);
  const yScale = (height - 2 * padding) / (maxHfr - minHfr || 1);

  const points = positions.map((pos, i) => ({
    x: padding + (pos - minPos) * xScale,
    y: height - padding - (hfrValues[i] - minHfr) * yScale,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Best position
  const bestX = padding + (run.curveV.bestPosition - minPos) * xScale;
  const bestY = height - padding - (run.curveV.bestHfr - minHfr) * yScale;

  return (
    <svg width="100%" height="200" viewBox={`0 0 ${width} ${height}`}>
      {/* Grid */}
      {[0.25, 0.5, 0.75].map(r => (
        <line
          key={r}
          x1={padding}
          y1={padding + r * (height - 2 * padding)}
          x2={width - padding}
          y2={padding + r * (height - 2 * padding)}
          className="stroke-slate-200 dark:stroke-slate-700"
          strokeDasharray="4"
        />
      ))}

      {/* Curve */}
      <path d={pathD} fill="none" className="stroke-blue-400" strokeWidth="2" />

      {/* Points */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" className="fill-blue-400" />
      ))}

      {/* Best point */}
      <circle cx={bestX} cy={bestY} r="5" className="fill-emerald-500" />
      <text x={bestX + 8} y={bestY} className="text-xs fill-emerald-600">
        Best: {run.curveV.bestHfr.toFixed(2)}
      </text>
    </svg>
  );
};

export default NINAAnalysisView;
