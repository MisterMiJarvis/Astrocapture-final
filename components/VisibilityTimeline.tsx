// ============================================================================
// VisibilityTimeline — 24h altitude timeline for a target with Moon & Sun overlay
// AstroCapture — Dark theme, SVG-based, local time (Europe/Paris)
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Moon, Sun, RotateCw, Mountain, Eye, EyeOff } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface HourData {
  hour_local: number;
  target_alt: number;
  target_az: number;
  moon_alt: number;
  moon_az: number;
  moon_illum: number;
  moon_sep: number;
  sun_alt: number;
}

interface MoonInterference {
  hour: number;
  moon_alt: number;
  moon_illum: number;
}

interface TimelineData {
  hours: HourData[];
  target_rise_hour: number | null;
  target_culmin_hour: number | null;
  target_set_hour: number | null;
  target_max_alt: number;
  sun_rise_hour: number | null;
  sun_set_hour: number | null;
  dark_start_hour: number | null;
  dark_end_hour: number | null;
  moon_interference: MoonInterference[];
}

interface VisibilityTimelineProps {
  targetRaHours: number;
  targetDecDegs: number;
  lat?: number;
  lon?: number;
  targetName?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Europe/Paris offset: +1 in winter, +2 in summer (CEST)
// Simple approximation: April-September = +2, October-March = +1
function getTzOffset(date: Date): number {
  const month = date.getMonth(); // 0-indexed
  if (month >= 3 && month <= 9) return 2; // April-September
  return 1; // October-March
}

// ─── Component ───────────────────────────────────────────────────────────────

export const VisibilityTimeline: React.FC<VisibilityTimelineProps> = ({
  targetRaHours,
  targetDecDegs,
  lat = 43.78,
  lon = 4.73,
  targetName,
}) => {
  const [data, setData] = useState<TimelineData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);

  const fetchTimeline = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const now = new Date();
      const tz_offset = getTzOffset(now);
      const res = await fetch('/api/apls/targets/visibility-timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_ra_hours: targetRaHours,
          target_dec_degs: targetDecDegs,
          year: now.getFullYear(),
          month: now.getMonth() + 1,
          day: now.getDate(),
          lat,
          lon,
          tz_offset,
        }),
      });
      if (!res.ok) throw new Error(`Timeline fetch failed: ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [targetRaHours, targetDecDegs, lat, lon]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  // ─── SVG dimensions ──────────────────────────────────────────────────────

  const W = 900;
  const H = 260;
  const PAD_LEFT = 40;
  const PAD_RIGHT = 20;
  const PAD_TOP = 20;
  const PAD_BOTTOM = 40;
  const plotW = W - PAD_LEFT - PAD_RIGHT;
  const plotH = H - PAD_TOP - PAD_BOTTOM;

  // Altitude range: -90 to +90, but we show -30 to +90 for clarity
  const ALT_MIN = -30;
  const ALT_MAX = 90;
  const altToY = (alt: number) => PAD_TOP + plotH * (1 - (alt - ALT_MIN) / (ALT_MAX - ALT_MIN));
  const hourToX = (hour: number) => PAD_LEFT + (plotW * hour) / 23;

  // Build SVG path for an altitude curve
  const buildPath = (hours: HourData[], key: keyof HourData) => {
    const points = hours.map((h, i) => `${hourToX(i)},${altToY(Number(h[key]))}`);
    return `M${points.join(' L')}`;
  };

  // Area path for target altitude (filled below curve)
  const buildAreaPath = (hours: HourData[]) => {
    const topPoints = hours.map((h, i) => `${hourToX(i)},${altToY(h.target_alt)}`);
    const bottomY = altToY(ALT_MIN);
    return `M${hourToX(0)},${bottomY} L${topPoints.join(' L')} L${hourToX(23)},${bottomY} Z`;
  };

  // ─── Loading / Error ─────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <RotateCw className="w-6 h-6 text-primary animate-spin mb-2" />
        <p className="text-sm text-text-secondary">Computing visibility timeline with Skyfield…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-300">
        ⚠️ {error}
      </div>
    );
  }

  if (!data) return null;

  const today = new Date();
  const tz_offset = getTzOffset(today);

  return (
    <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-text flex items-center gap-2">
          📊 24h Visibility Timeline
          {targetName && <span className="text-text-secondary font-normal">— {targetName}</span>}
        </h4>
        <button
          onClick={fetchTimeline}
          disabled={isLoading}
          className="text-text-secondary hover:text-primary transition-colors"
        >
          <RotateCw size={14} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-2 text-xs">
        {data.target_rise_hour != null && (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <Mountain size={12} /> Rises {String(data.target_rise_hour).padStart(2, '0')}:00
          </span>
        )}
        {data.target_culmin_hour != null && (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
            ⬆️ Culminates {String(data.target_culmin_hour).padStart(2, '0')}:00 ({data.target_max_alt}°)
          </span>
        )}
        {data.target_set_hour != null && (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
            <Mountain size={12} className="rotate-180" /> Sets {String(data.target_set_hour).padStart(2, '0')}:00
          </span>
        )}
        {data.dark_start_hour != null && data.dark_end_hour != null && (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            <EyeOff size={12} /> Dark {String(data.dark_start_hour).padStart(2, '0')}:00–{String(data.dark_end_hour).padStart(2, '0')}:00
          </span>
        )}
        {data.sun_set_hour != null && (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <Sun size={12} /> Sunset {String(data.sun_set_hour).padStart(2, '0')}:00
          </span>
        )}
        {data.moon_interference.length > 0 && (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <Moon size={12} /> Moon up {data.moon_interference.length}h
            {data.moon_interference[0] && ` (${Math.round(data.moon_interference[0].moon_illum * 100)}% illum)`}
          </span>
        )}
      </div>

      {/* SVG Timeline */}
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[600px]" style={{ height: 'auto' }}>
          {/* Background gradient: dark night vs day */}
          <defs>
            <linearGradient id="dayNightBg" x1="0" y1="0" x2="1" y2="0">
              {data.hours.map((h, i) => {
                const isNight = h.sun_alt < 0;
                const stopColor = isNight ? '#0a0e1a' : '#1a2030';
                return (
                  <stop key={i} offset={`${(i / 23) * 100}%`} stopColor={stopColor} />
                );
              })}
            </linearGradient>
            <linearGradient id="targetArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="moonArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Day/night background bands (per-hour) */}
          {data.hours.map((h, i) => {
            const isNight = h.sun_alt < 0;
            const isDeepNight = h.sun_alt < -18;
            return (
              <rect
                key={i}
                x={hourToX(i) - plotW / 46}
                y={PAD_TOP}
                width={plotW / 23 + 1}
                height={plotH}
                fill={isDeepNight ? '#080c14' : isNight ? '#0f1520' : '#1a2230'}
                opacity={0.5}
              />
            );
          })}

          {/* Horizon line (0°) */}
          <line
            x1={PAD_LEFT} y1={altToY(0)} x2={W - PAD_RIGHT} y2={altToY(0)}
            stroke="#3a4555" strokeWidth="1" strokeDasharray="4 3"
          />
          <text x={PAD_LEFT - 5} y={altToY(0) + 4} fill="#6b7280" fontSize="9" textAnchor="end">0°</text>

          {/* Min altitude line (30° — useful imaging threshold) */}
          <line
            x1={PAD_LEFT} y1={altToY(30)} x2={W - PAD_RIGHT} y2={altToY(30)}
            stroke="#2a4a3a" strokeWidth="0.5" strokeDasharray="2 4"
          />
          <text x={PAD_LEFT - 5} y={altToY(30) + 4} fill="#4a6b5a" fontSize="9" textAnchor="end">30°</text>

          {/* 60° line */}
          <line
            x1={PAD_LEFT} y1={altToY(60)} x2={W - PAD_RIGHT} y2={altToY(60)}
            stroke="#2a3a4a" strokeWidth="0.5" strokeDasharray="2 4"
          />
          <text x={PAD_LEFT - 5} y={altToY(60) + 4} fill="#4a5b6b" fontSize="9" textAnchor="end">60°</text>

          {/* Top label */}
          <text x={PAD_LEFT - 5} y={altToY(90) + 4} fill="#6b7280" fontSize="9" textAnchor="end">90°</text>

          {/* Target altitude area (filled) */}
          <path d={buildAreaPath(data.hours)} fill="url(#targetArea)" />

          {/* Moon altitude area (subtle) */}
          <path
            d={data.hours.map((h, i) => {
              const y = altToY(Math.max(ALT_MIN, h.moon_alt));
              return `${i === 0 ? 'M' : 'L'}${hourToX(i)},${y}`;
            }).join(' ') + ` L${hourToX(23)},${altToY(ALT_MIN)} L${hourToX(0)},${altToY(ALT_MIN)} Z`}
            fill="url(#moonArea)"
          />

          {/* Sun altitude curve (dashed yellow) */}
          <path
            d={buildPath(data.hours, 'sun_alt')}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="1.5"
            strokeDasharray="3 3"
            opacity="0.6"
          />

          {/* Moon altitude curve (purple, width ~ illumination) */}
          {(() => {
            const avgIllum = data.hours.reduce((s, h) => s + h.moon_illum, 0) / data.hours.length;
            return (
              <path
                d={buildPath(data.hours, 'moon_alt')}
                fill="none"
                stroke="#a855f7"
                strokeWidth={1 + avgIllum * 2}
                opacity={0.5 + avgIllum * 0.4}
              />
            );
          })()}

          {/* Target altitude curve (blue, prominent) */}
          <path
            d={buildPath(data.hours, 'target_alt')}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Culmination marker */}
          {data.target_culmin_hour != null && (
            <g>
              <line
                x1={hourToX(data.target_culmin_hour)} y1={altToY(data.target_max_alt) - 8}
                x2={hourToX(data.target_culmin_hour)} y2={altToY(data.target_max_alt) + 8}
                stroke="#60a5fa" strokeWidth="2"
              />
              <circle
                cx={hourToX(data.target_culmin_hour)} cy={altToY(data.target_max_alt)}
                r="4" fill="#60a5fa"
              />
            </g>
          )}

          {/* Rise marker */}
          {data.target_rise_hour != null && (
            <circle
              cx={hourToX(data.target_rise_hour)} cy={altToY(0)}
              r="3" fill="#10b981" stroke="#0a0e1a" strokeWidth="1"
            />
          )}

          {/* Set marker */}
          {data.target_set_hour != null && (
            <circle
              cx={hourToX(data.target_set_hour)} cy={altToY(0)}
              r="3" fill="#f97316" stroke="#0a0e1a" strokeWidth="1"
            />
          )}

          {/* Hover indicator */}
          {hoveredHour != null && (
            <line
              x1={hourToX(hoveredHour)} y1={PAD_TOP}
              x2={hourToX(hoveredHour)} y2={PAD_TOP + plotH}
              stroke="#ffffff" strokeWidth="0.5" opacity="0.3"
            />
          )}

          {/* Hour labels (every 2h) */}
          {Array.from({ length: 24 }, (_, i) => i).filter(i => i % 2 === 0).map(h => (
            <text
              key={h}
              x={hourToX(h)} y={H - PAD_BOTTOM + 15}
              fill="#6b7280" fontSize="9" textAnchor="middle"
            >
              {String(h).padStart(2, '0')}h
            </text>
          ))}

          {/* Hover targets (invisible rects for mouse events) */}
          {data.hours.map((h, i) => (
            <rect
              key={i}
              x={hourToX(i) - plotW / 46}
              y={PAD_TOP}
              width={plotW / 23}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setHoveredHour(i)}
              onMouseLeave={() => setHoveredHour(null)}
            />
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-text-secondary">
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-0.5 bg-blue-500 rounded"></span>
          Target altitude
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-0.5 bg-purple-500 rounded"></span>
          Moon altitude
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-0.5 bg-amber-500 rounded" style={{ borderTop: '1px dashed' }}></span>
          Sun
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 bg-indigo-900/60 rounded-sm"></span>
          Dark period
        </span>
      </div>

      {/* Hovered hour detail */}
      {hoveredHour != null && data.hours[hoveredHour] && (
        <div className="bg-background border border-border rounded-lg p-3 text-xs grid grid-cols-2 md:grid-cols-4 gap-2">
          <div>
            <span className="text-text-secondary block">{String(hoveredHour).padStart(2, '0')}:00 local</span>
            <span className="font-mono font-bold text-text">
              UTC {String((hoveredHour - tz_offset + 24) % 24).padStart(2, '0')}:00
            </span>
          </div>
          <div>
            <span className="text-text-secondary block">Target alt</span>
            <span className="font-mono font-bold text-blue-300">{data.hours[hoveredHour].target_alt}°</span>
          </div>
          <div>
            <span className="text-text-secondary block">Moon alt / illum</span>
            <span className="font-mono font-bold text-purple-300">
              {data.hours[hoveredHour].moon_alt}° / {Math.round(data.hours[hoveredHour].moon_illum * 100)}%
            </span>
          </div>
          <div>
            <span className="text-text-secondary block">Sun alt</span>
            <span className="font-mono font-bold text-amber-300">{data.hours[hoveredHour].sun_alt}°</span>
          </div>
        </div>
      )}

      {/* Moon interference warning */}
      {data.moon_interference.length > 6 && (
        <div className="flex items-start gap-2 bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 text-xs text-purple-300">
          <Moon size={14} className="mt-0.5 flex-shrink-0" />
          <div>
            <strong>Moon interference:</strong> The Moon is above horizon for {data.moon_interference.length} hours
            {data.moon_interference[0] && ` at ${Math.round(data.moon_interference[0].moon_illum * 100)}% illumination`}.
            Consider Narrowband imaging or wait for a darker night.
          </div>
        </div>
      )}
    </div>
  );
};

export default VisibilityTimeline;