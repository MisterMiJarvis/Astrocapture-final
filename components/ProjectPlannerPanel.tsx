// ============================================================================
// ProjectPlannerPanel — Observation planner for a single target
// Shows altitude curve, imaging windows, weather snapshot
// ============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Project,
} from '../src/types/project';
import {
  computePlanner,
  fetchPlannerWeather,
  fetchPlannerAstronomy,
  type PlannerResult,
  type AltitudePoint,
  type ImagingWindowSlot,
  type WeatherSnapshot,
} from '../src/services/plannerService';
import {
  Clock, Moon, Sun, Cloud, Wind, Droplets, Eye, TrendingUp, Camera,
  Mountain, AlertTriangle, CheckCircle2, Calendar, RotateCw,
} from 'lucide-react';

interface ProjectPlannerPanelProps {
  project: Project;
}

const QUALITY_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  Excellent: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/40', text: 'text-emerald-300', dot: 'bg-emerald-400' },
  Good:      { bg: 'bg-blue-500/10',    border: 'border-blue-500/40',    text: 'text-blue-300',    dot: 'bg-blue-400' },
  Fair:      { bg: 'bg-amber-500/10',   border: 'border-amber-500/40',   text: 'text-amber-300',   dot: 'bg-amber-400' },
  Poor:      { bg: 'bg-orange-500/10',  border: 'border-orange-500/40',  text: 'text-orange-300',  dot: 'bg-orange-400' },
  Impossible:{ bg: 'bg-red-500/10',     border: 'border-red-500/40',     text: 'text-red-300',     dot: 'bg-red-400' },
};

export const ProjectPlannerPanel: React.FC<ProjectPlannerPanelProps> = ({ project }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [planner, setPlanner] = useState<PlannerResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPlanner = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch astronomy + weather in parallel
      const [astroData, weatherData] = await Promise.all([
        fetchPlannerAstronomy(project.lat, project.lon, selectedDate),
        fetchPlannerWeather(project.lat, project.lon, selectedDate),
      ]);
      const result = computePlanner(project, selectedDate, astroData, weatherData);
      setPlanner(result);
    } catch (err) {
      console.error('Planner error:', err);
      setError('Erreur lors du calcul du planning');
    } finally {
      setIsLoading(false);
    }
  }, [project, selectedDate]);

  useEffect(() => {
    loadPlanner();
  }, [loadPlanner]);

  // Date navigation
  const changeDate = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d);
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const selectedStr = selectedDate.toISOString().split('T')[0];
  const isToday = todayStr === selectedStr;

  return (
    <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-text flex items-center gap-2">
            <Calendar size={16} /> Observation Planner
          </h3>
          <p className="text-xs text-text-secondary mt-1">
            Imaging windows, target altitude and weather conditions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => changeDate(-1)}
            className="p-1.5 rounded-lg border border-border hover:bg-surface-secondary text-text-secondary transition-colors"
            title="Previous day"
          >
            <span className="text-sm">←</span>
          </button>
          <input
            type="date"
            value={selectedStr}
            onChange={(e) => {
              const d = new Date(e.target.value + 'T12:00:00');
              if (!isNaN(d.getTime())) setSelectedDate(d);
            }}
            className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-text focus:outline-none focus:border-primary"
          />
          <button
            onClick={() => changeDate(1)}
            className="p-1.5 rounded-lg border border-border hover:bg-surface-secondary text-text-secondary transition-colors"
            title="Next day"
          >
            <span className="text-sm">→</span>
          </button>
          {!isToday && (
            <button
              onClick={() => setSelectedDate(new Date())}
              className="p-1.5 rounded-lg border border-border hover:bg-surface-secondary text-text-secondary transition-colors"
              title="Today"
            >
              <RotateCw size={14} />
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RotateCw className="w-6 h-6 text-primary animate-spin" />
          <span className="ml-2 text-sm text-text-secondary">Loading planner…</span>
        </div>
      ) : error ? (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-300">
          <AlertTriangle size={16} className="inline mr-2" />
          {error}
        </div>
      ) : !planner || planner.windows.length === 0 ? (
        <div className="text-center py-8 text-text-secondary">
          <Mountain className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Target below horizon tonight</p>
          <p className="text-xs mt-1">Try another date</p>
        </div>
      ) : (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <div className="bg-background p-3 rounded-lg border border-border">
              <div className="text-xs text-text-secondary flex items-center gap-1 mb-1">
                <Mountain size={12} /> Max alt
              </div>
              <div className="font-mono font-bold text-text text-lg">
                {planner.transitAltitude.toFixed(0)}°
              </div>
              {planner.transitTime && (
                <div className="text-[10px] text-text-secondary">
                  {planner.transitTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
            <div className="bg-background p-3 rounded-lg border border-border">
              <div className="text-xs text-text-secondary flex items-center gap-1 mb-1">
                <Clock size={12} /> Observable
              </div>
              <div className="font-mono font-bold text-text text-lg">
                {planner.totalObservableHours.toFixed(1)}h
              </div>
              <div className="text-[10px] text-text-secondary">
                {planner.windows.length} window{planner.windows.length > 1 ? 's' : ''}
              </div>
            </div>
            {planner.bestWindow && (
              <>
                <div className="bg-background p-3 rounded-lg border border-border">
                  <div className="text-xs text-text-secondary flex items-center gap-1 mb-1">
                    <TrendingUp size={12} /> Best window
                  </div>
                  <div className={`font-bold text-lg ${QUALITY_COLORS[planner.bestWindow.qualityLabel].text}`}>
                    {planner.bestWindow.qualityScore}/100
                  </div>
                  <div className={`text-[10px] ${QUALITY_COLORS[planner.bestWindow.qualityLabel].text}`}>
                    {planner.bestWindow.qualityLabel}
                  </div>
                </div>
                <div className="bg-background p-3 rounded-lg border border-border">
                  <div className="text-xs text-text-secondary flex items-center gap-1 mb-1">
                    <Moon size={12} /> Moon
                  </div>
                  <div className="font-mono font-bold text-text text-lg">
                    {((planner.bestWindow.moonIllumination ?? 0) * 100).toFixed(0)}%
                  </div>
                  <div className="text-[10px] text-text-secondary">
                    {planner.bestWindow.moonAltitude != null && (
                      (planner.bestWindow.moonAltitude > 0 ? '↑' : '↓') + ' ' + Math.abs(planner.bestWindow.moonAltitude).toFixed(0) + '°'
                    )}
                  </div>
                </div>
                <div className="bg-background p-3 rounded-lg border border-border">
                  <div className="text-xs text-text-secondary flex items-center gap-1 mb-1">
                    <Wind size={12} /> Wind
                  </div>
                  <div className="font-mono font-bold text-text text-lg">
                    {planner.bestWindow.weather ? Math.round(planner.bestWindow.weather.windKmh) : '--'}
                    <span className="text-xs text-text-secondary ml-1">km/h</span>
                  </div>
                  <div className="text-[10px] text-text-secondary">
                    {planner.bestWindow.weather && planner.bestWindow.weather.windKmh > 10 ? '🔴 No go' : '✅ OK'}
                  </div>
                </div>
                <div className="bg-background p-3 rounded-lg border border-border">
                  <div className="text-xs text-text-secondary flex items-center gap-1 mb-1">
                    <Cloud size={12} /> Clouds
                  </div>
                  <div className={`font-mono font-bold text-lg ${
                    planner.bestWindow.weather
                      ? (planner.bestWindow.weather.cloudCoverPct < 20 ? 'text-emerald-300' : planner.bestWindow.weather.cloudCoverPct < 50 ? 'text-blue-300' : planner.bestWindow.weather.cloudCoverPct < 80 ? 'text-amber-300' : 'text-red-300')
                      : 'text-text'
                  }`}>
                    {planner.bestWindow.weather ? planner.bestWindow.weather.cloudCoverPct.toFixed(0) : '--'}
                    <span className="text-xs text-text-secondary ml-0.5">%</span>
                  </div>
                  <div className="text-[10px] text-text-secondary">
                    {planner.bestWindow.weather ? (planner.bestWindow.weather.cloudCoverPct < 20 ? 'Clear' : planner.bestWindow.weather.cloudCoverPct < 50 ? 'Partly' : planner.bestWindow.weather.cloudCoverPct < 80 ? 'Cloudy' : 'Overcast') : ''}
                  </div>
                </div>
                <div className="bg-background p-3 rounded-lg border border-border">
                  <div className="text-xs text-text-secondary flex items-center gap-1 mb-1">
                    <Eye size={12} /> Seeing
                  </div>
                  <div className="font-mono font-bold text-text text-lg">
                    {planner.bestWindow.weather && planner.bestWindow.weather.seeing != null ? planner.bestWindow.weather.seeing.toFixed(1) : '--'}
                    <span className="text-xs text-text-secondary ml-0.5">"</span>
                  </div>
                  <div className="text-[10px] text-text-secondary">
                    {planner.bestWindow.weather ? planner.bestWindow.weather.seeingLabel : ''}
                  </div>
                </div>
                <div className="bg-background p-3 rounded-lg border border-border">
                  <div className="text-xs text-text-secondary flex items-center gap-1 mb-1">
                    <Droplets size={12} /> Dew
                  </div>
                  <div className={`font-mono font-bold text-lg ${
                    planner.bestWindow.weather
                      ? (planner.bestWindow.weather.dewRisk === 'Critical' ? 'text-red-300' : planner.bestWindow.weather.dewRisk === 'Warning' ? 'text-amber-300' : 'text-emerald-300')
                      : 'text-text'
                  }`}>
                    {planner.bestWindow.weather ? planner.bestWindow.weather.dewRisk : '--'}
                  </div>
                  <div className="text-[10px] text-text-secondary">
                    {planner.bestWindow.weather ? `Δ${planner.bestWindow.weather.dewPointDelta.toFixed(1)}°C` : ''}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Exposure budget */}
          {planner.remainingExposureMinutes > 0 ? (
            <div className="text-xs text-text-secondary flex items-center gap-3 bg-background/50 px-3 py-2 rounded-lg">
              <span className="flex items-center gap-1">
                <Camera size={12} /> Remaining exposure:
              </span>
              <span className="font-mono text-text">
                {(planner.remainingExposureMinutes / 60).toFixed(1)}h
              </span>
              {planner.totalObservableHours * 60 >= planner.remainingExposureMinutes ? (
                <span className="text-emerald-400">✅ Windows sufficient</span>
              ) : (
                <span className="text-orange-400">⚠️ Not enough night time</span>
              )}
            </div>
          ) : (
            <div className="text-xs text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-lg">
              ✅ All planned exposures already acquired
            </div>
          )}

          {/* Night boundaries */}
          {planner.nightStart && planner.nightEnd && (
            <div className="text-xs text-text-secondary flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Sun size={12} /> Astronomical night:
              </span>
              <span className="font-mono">
                {planner.nightStart.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                {' → '}
                {planner.nightEnd.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}

          {/* Altitude curve */}
          <AltitudeCurve altitudeCurve={planner.altitudeCurve} />

          {/* Imaging windows */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-text">Imaging windows</h4>
            {planner.windows.map((w, i) => (
              <WindowSlotCard key={i} slot={w} />
            ))}
          </div>

        </>
      )}
    </div>
  );
};

// ─── Altitude Curve (SVG) ────────────────────────────────────────────────────

const AltitudeCurve: React.FC<{ altitudeCurve: AltitudePoint[] }> = ({ altitudeCurve }) => {
  if (altitudeCurve.length === 0) return null;

  const width = 600;
  const height = 160;
  const padding = { top: 10, right: 10, bottom: 25, left: 35 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  // Time range
  const tStart = altitudeCurve[0].time.getTime();
  const tEnd = altitudeCurve[altitudeCurve.length - 1].time.getTime();
  const tRange = tEnd - tStart;

  // Y range: -10° to 90°
  const yMin = -10, yMax = 90;

  const xScale = (t: number) => padding.left + ((t - tStart) / tRange) * plotW;
  const yScale = (alt: number) => padding.top + (1 - (alt - yMin) / (yMax - yMin)) * plotH;

  // Build path
  let pathD = '';
  let optimalPath = '';
  let belowPath = '';
  altitudeCurve.forEach((pt, i) => {
    const x = xScale(pt.time.getTime());
    const y = yScale(pt.altitude);
    if (i === 0) {
      pathD = `M ${x} ${y}`;
      if (pt.isOptimal) optimalPath = `M ${x} ${y}`;
      else if (!pt.isAboveHorizon) belowPath = `M ${x} ${y}`;
    } else {
      pathD += ` L ${x} ${y}`;
      if (pt.isOptimal) {
        optimalPath += (optimalPath ? ' L' : 'M') + ` ${x} ${y}`;
      }
      if (!pt.isAboveHorizon) {
        belowPath += (belowPath ? ' L' : 'M') + ` ${x} ${y}`;
      }
    }
  });

  // Grid lines
  const gridAlts = [0, 30, 60, 90];
  const gridLines = gridAlts.map(alt => ({
    y: yScale(alt),
    label: `${alt}°`,
  }));

  // Time labels (every ~2h)
  const timeLabels: { x: number; label: string }[] = [];
  const step = Math.max(1, Math.floor(altitudeCurve.length / 6));
  for (let i = 0; i < altitudeCurve.length; i += step) {
    timeLabels.push({
      x: xScale(altitudeCurve[i].time.getTime()),
      label: altitudeCurve[i].timeLocal,
    });
  }

  return (
    <div className="bg-background rounded-lg border border-border p-3">
      <div className="text-xs text-text-secondary mb-2 flex items-center gap-1">
        <Mountain size={12} /> Target altitude overnight
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: '200px' }}>
        {/* Grid lines */}
        {gridLines.map((g, i) => (
          <g key={i}>
            <line
              x1={padding.left} y1={g.y}
              x2={width - padding.right} y2={g.y}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={1}
            />
            <text
              x={padding.left - 5} y={g.y + 3}
              textAnchor="end"
              fill="rgba(255,255,255,0.4)"
              fontSize={9}
            >
              {g.label}
            </text>
          </g>
        ))}

        {/* Horizon line (0°) */}
        <line
          x1={padding.left} y1={yScale(0)}
          x2={width - padding.right} y2={yScale(0)}
          stroke="rgba(255,100,100,0.3)"
          strokeWidth={1}
          strokeDasharray="3,3"
        />

        {/* Optimal zone (>30°) — light green fill */}
        <rect
          x={padding.left} y={yScale(90)}
          width={plotW} height={yScale(30) - yScale(90)}
          fill="rgba(16,185,129,0.05)"
        />

        {/* Below horizon (red) */}
        {belowPath && (
          <path d={belowPath} fill="none" stroke="rgba(239,68,68,0.4)" strokeWidth={1.5} />
        )}

        {/* Above horizon but not optimal (blue) */}
        <path d={pathD} fill="none" stroke="rgba(59,130,246,0.6)" strokeWidth={2} />

        {/* Optimal (>30°) — green thick */}
        {optimalPath && (
          <path d={optimalPath} fill="none" stroke="rgba(16,185,129,0.8)" strokeWidth={2.5} />
        )}

        {/* Time labels */}
        {timeLabels.map((t, i) => (
          <text
            key={i}
            x={t.x} y={height - 8}
            textAnchor="middle"
            fill="rgba(255,255,255,0.4)"
            fontSize={9}
          >
            {t.label}
          </text>
        ))}
      </svg>
      <div className="flex items-center gap-3 mt-1 text-[10px] text-text-secondary">
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-emerald-500 inline-block"></span> Optimal ({'>'}30°)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-blue-500 inline-block"></span> Visible
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-red-500 inline-block"></span> Below horizon
        </span>
      </div>
    </div>
  );
};

// ─── Window Slot Card ─────────────────────────────────────────────────────────

const WindowSlotCard: React.FC<{ slot: ImagingWindowSlot }> = ({ slot }) => {
  const colors = QUALITY_COLORS[slot.qualityLabel] || QUALITY_COLORS.Poor;
  const startStr = slot.startTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const endStr = slot.endTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const durStr = slot.durationMinutes >= 60
    ? `${Math.floor(slot.durationMinutes / 60)}h${(slot.durationMinutes % 60).toString().padStart(2, '0')}`
    : `${Math.round(slot.durationMinutes)}min`;
  const cappedEndStr = slot.cappedEndTime ? slot.cappedEndTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : null;
  const cappedDurStr = slot.cappedDurationMinutes > 0
    ? slot.cappedDurationMinutes >= 60
      ? `${Math.floor(slot.cappedDurationMinutes / 60)}h${(slot.cappedDurationMinutes % 60).toString().padStart(2, '0')}`
      : `${Math.round(slot.cappedDurationMinutes)}min`
    : '0min';

  return (
    <div className={`p-3 rounded-lg border ${colors.bg} ${colors.border} ${slot.isBestWindow ? 'ring-1 ring-primary/40' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
          <span className="font-mono text-sm text-text">{startStr} → {endStr}</span>
          <span className="text-xs text-text-secondary">{durStr}</span>
          {slot.isBestWindow && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-semibold">
              ★ Best
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-bold ${colors.text}`}>{slot.qualityScore}/100</span>
          <span className={`text-xs ${colors.text}`}>{slot.qualityLabel}</span>
        </div>
      </div>
      {cappedEndStr && slot.cappedDurationMinutes > 0 && (
        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-primary bg-primary/10 px-2 py-1 rounded">
          <Camera size={10} />
          <span>Capped to exposure: {startStr} → {cappedEndStr} ({cappedDurStr})</span>
        </div>
      )}
      {slot.cappedDurationMinutes === 0 && (
        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
          <span>✅ Exposure already acquired — surplus window</span>
        </div>
      )}
      <div className="flex items-center gap-4 mt-2 text-xs text-text-secondary">
        <span className="flex items-center gap-1">
          <Mountain size={10} /> max {slot.maxAltitude.toFixed(0)}°
        </span>
        <span className="flex items-center gap-1">
          <TrendingUp size={10} /> avg {slot.avgAltitude.toFixed(0)}°
        </span>
        {slot.moonIllumination != null && (
          <span className="flex items-center gap-1">
            <Moon size={10} /> {((slot.moonIllumination) * 100).toFixed(0)}%
            {slot.moonAltitude != null && ` (${slot.moonAltitude > 0 ? '↑' : '↓'}${Math.abs(slot.moonAltitude).toFixed(0)}°)`}
          </span>
        )}
        {slot.weather && (
          <span className="flex items-center gap-1">
            <Cloud size={10} /> {slot.weather.cloudCoverPct.toFixed(0)}%
          </span>
        )}
        {slot.weather && (
          <span className={`flex items-center gap-1 ${slot.weather.windKmh > 10 ? 'text-red-400' : ''}`}>
            <Wind size={10} /> {Math.round(slot.weather.windKmh)} km/h{slot.weather.windKmh > 10 ? ' 🔴' : ''}
          </span>
        )}
      </div>
    </div>
  );
};

// ─── Weather Snapshot Card ───────────────────────────────────────────────────

export default ProjectPlannerPanel;