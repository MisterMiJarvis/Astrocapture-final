import React, { useState, useEffect } from 'react';
import DashboardKPIsView from '../src/components/Module1';
import { NightlyForecast } from '../types';
import { fetchNightlyForecast } from '../services/weatherService';
import { mapNightlyForecast as mapNightlyForecastData } from '../services/weatherDataMapper';
import { Moon, CloudRain, Cloud, Wind, Star, Clock, Mountain, Eye, ExternalLink } from 'lucide-react';

const PRESET_LOCATIONS: Record<string, { lat: number; lon: number }> = {
  saintEtienne: { lat: 43.79, lon: 4.72 },
  pradelles: { lat: 44.77, lon: 3.88 },
};

type LocationSource = 'current' | 'saintEtienne' | 'pradelles' | '';

interface AplsModule1ViewProps {
  locationSource: LocationSource;
  onLocationChange: (source: LocationSource) => void;
}

interface TelescopiusTarget {
  object: {
    main_id: string;
    main_name: string;
    types: string[];
    con: string;
    con_name: string;
    visual_mag: number;
    photo_mag: number;
    major_axis: number;
    minor_axis: number;
    ra: number;
    dec: number;
    thumbnail_url: string | null;
    main_image_url: string | null;
    url: string;
  };
  tonight_times: {
    rise: string;
    transit: string;
    set: string;
  };
  transit_observation: {
    alt: number;
    az: number;
  };
  tonight_visibility: {
    max_altitude: number;
    max_altitude_hour: string;
    windows: {
      start: string;
      end: string;
      imaging_time_hours: number;
      moon_illumination_percent: number;
      moon_distance_deg: number;
    }[];
  };
}

const getMoonIllumColor = (illum: number): string => {
  if (illum < 25) return 'bg-green-900/50 text-green-300';
  if (illum <= 50) return 'bg-yellow-900/50 text-yellow-300';
  if (illum <= 75) return 'bg-orange-900/50 text-orange-300';
  return 'bg-red-900/50 text-red-300';
};

const getConditionColor = (condition: string): string => {
  switch (condition) {
    case 'Excellent': return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'Good': return 'bg-lime-500/20 text-lime-400 border-lime-500/30';
    case 'Fair': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'Poor': return 'bg-red-500/20 text-red-400 border-red-500/30';
    default: return 'bg-surface text-text-secondary border-border';
  }
};

const getConditionIcon = (summary: string) => {
  if (summary.includes('Rain')) return <CloudRain size={18} />;
  if (summary.includes('Cloud') || summary.includes('cloud')) return <Cloud size={18} />;
  if (summary.includes('Wind')) return <Wind size={18} />;
  return <Star size={18} />;
};

const getObjectTypeLabel = (types: string[]): string => {
  const typeMap: Record<string, string> = {
    'gxy': 'Galaxy', 'sgx': 'Spiral Galaxy', 'egx': 'Elliptical Galaxy',
    'nb': 'Nebula', 'enb': 'Emission Nebula', 'rnb': 'Reflection Nebula', 'pnb': 'Planetary Nebula',
    'oc': 'Open Cluster', 'gc': 'Globular Cluster', 'gn': 'Galaxy Nebula',
    'snr': 'Supernova Remnant', 'dn': 'Dark Nebula',
    'hii': 'HII Region', 'ia': 'Irregular Galaxy',
  };
  for (const t of types) {
    if (typeMap[t]) return typeMap[t];
  }
  return types[0] || 'Deep Sky';
};

const AplsModule1View: React.FC<AplsModule1ViewProps> = ({ locationSource, onLocationChange }) => {
  const [nightlyForecast, setNightlyForecast] = useState<NightlyForecast[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<{ lat: number; lon: number } | null>(null);

  const [highlights, setHighlights] = useState<TelescopiusTarget[] | null>(null);
  const [isLoadingHighlights, setIsLoadingHighlights] = useState(false);
  const [highlightsError, setHighlightsError] = useState<string | null>(null);

  useEffect(() => {
    if (locationSource === 'saintEtienne' || locationSource === 'pradelles') {
      setCoordinates(PRESET_LOCATIONS[locationSource]);
    } else if (locationSource === 'current') {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoordinates({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => setError('Geolocation failed.')
      );
    } else {
      setCoordinates(null);
      setNightlyForecast(null);
    }
  }, [locationSource]);

  useEffect(() => {
    if (!coordinates) return;
    setIsLoading(true);
    setError(null);
    fetchNightlyForecast(coordinates.lat, coordinates.lon)
      .then(data => setNightlyForecast(mapNightlyForecastData(data).slice(0, 4)))
      .catch(() => setError('Failed to load forecast.'))
      .finally(() => setIsLoading(false));
  }, [coordinates]);

  useEffect(() => {
    if (!coordinates) return;
    setIsLoadingHighlights(true);
    setHighlightsError(null);
    fetch(`/api/telescopius/highlights?lat=${coordinates.lat}&lon=${coordinates.lon}&timezone=Europe/Paris&min_alt=20`)
      .then(res => res.json())
      .then(data => {
        const targets = data.page_results || [];
        setHighlights(targets.slice(0, 4));
      })
      .catch(() => setHighlightsError('Failed to load targets.'))
      .finally(() => setIsLoadingHighlights(false));
  }, [coordinates]);

  const mockKPIs = {
    totalIntegrationTime: 127.5,
    totalSessionsCompleted: 23,
    totalProjectsCompleted: 4,
    activeProjectsCount: 3,
    averageGuidingRMS: 0.85,
    bestGuidingRMS: 0.42,
    worstGuidingRMS: 2.1,
    filterDistribution: [
      { filter: 'UV_IR_Cut', hours: 45, percentage: 35 },
      { filter: 'L_Ultimate', hours: 38, percentage: 30 },
      { filter: 'Ha', hours: 25, percentage: 20 },
      { filter: 'OIII', hours: 12, percentage: 9 },
      { filter: 'SII', hours: 7.5, percentage: 6 },
    ],
    monthlyIntegrationTrend: [
      { month: '2026-01', hours: 18 },
      { month: '2026-02', hours: 22 },
      { month: '2026-03', hours: 15 },
      { month: '2026-04', hours: 28 },
      { month: '2026-05', hours: 44.5 },
    ],
    mountHealthScore: 92,
    lastMaintenanceDate: new Date('2026-04-15'),
  };

  return (
    <div className="space-y-6">
      {/* 4-Day Outlook */}
      <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <h3 className="font-display font-bold text-base">🌤️ 4-Night Stargazing Outlook</h3>
        {isLoading && <p className="text-text-secondary text-sm">Loading outlook...</p>}
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {nightlyForecast && nightlyForecast.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {nightlyForecast.map((night, i) => (
              <div
                key={i}
                className={`p-4 rounded-lg border flex flex-col gap-2 transition-all ${getConditionColor(night.condition)}`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-mono font-bold text-sm">
                    {night.date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}
                  </span>
                  {getConditionIcon(night.summary)}
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider opacity-80">{night.summary}</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold">{Math.round(night.minTemp)}°</span>
                  <span className="text-xs opacity-70">/ {Math.round(night.maxTemp)}°C</span>
                </div>
                <div className="mt-auto pt-2 border-t border-current/10 flex justify-between items-center text-xs">
                  <div className="flex items-center gap-1">
                    <Moon size={12} />
                    <span className="truncate max-w-[60px]">{night.moonPhase}</span>
                  </div>
                  <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${getMoonIllumColor(night.moonIllumination)}`}>
                    🌙 {night.moonIllumination}%
                  </span>
                  <span className="font-bold px-2 py-0.5 rounded-full bg-black/20">{night.condition}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        {!locationSource && (
          <p className="text-text-secondary text-sm text-center">Select a location in the header to see the outlook.</p>
        )}
      </div>

      {/* Best Targets for Tonight */}
      <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <h3 className="font-display font-bold text-base">🔭 Best Targets for Tonight</h3>
        <p className="text-xs text-text-secondary -mt-2">Top highlights from Telescopius based on your location and tonight's conditions.</p>
        {isLoadingHighlights && <p className="text-text-secondary text-sm">Loading targets...</p>}
        {highlightsError && <p className="text-red-400 text-sm">{highlightsError}</p>}
        {highlights && highlights.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {highlights.map((target, i) => {
              const obj = target.object;
              const vis = target.tonight_visibility;
              const times = target.tonight_times;
              const bestWindow = vis.windows && vis.windows.length > 0 ? vis.windows[0] : null;
              const sizeStr = obj.major_axis
                ? `${obj.major_axis}'${obj.minor_axis && obj.minor_axis !== obj.major_axis ? ` × ${obj.minor_axis}'` : ''}`
                : '';

              return (
                <div
                  key={i}
                  className="bg-background border border-border rounded-lg overflow-hidden flex flex-col md:flex-row hover:border-primary/40 transition-colors"
                >
                  {/* Left: Image */}
                  {obj.thumbnail_url && (
                    <div className="md:w-1/2 flex-shrink-0">
                      <img
                        src={obj.thumbnail_url}
                        alt={obj.main_name}
                        className="w-full h-48 md:h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {/* Right: Info */}
                  <div className="flex-1 flex flex-col p-4 gap-3 min-w-0">
                    {/* Header */}
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-base truncate">{obj.main_id}</h4>
                        {obj.visual_mag && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-300 font-mono">
                            mag {obj.visual_mag}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-text-secondary truncate">{obj.main_name}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-secondary text-text-secondary">
                          {getObjectTypeLabel(obj.types)}
                        </span>
                        <span className="text-[10px] text-text-secondary">{obj.con_name || obj.con}</span>
                        {sizeStr && (
                          <span className="text-[10px] text-text-secondary font-mono">{sizeStr}</span>
                        )}
                      </div>
                    </div>

                    {/* Visibility info */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Mountain size={12} className="text-text-secondary" />
                        <span className="text-text-secondary">Max alt:</span>
                        <span className="font-semibold">{vis.max_altitude}°</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-text-secondary" />
                        <span className="text-text-secondary">At:</span>
                        <span className="font-semibold">{vis.max_altitude_hour}</span>
                      </div>
                      {times.rise && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-text-secondary">Rise:</span>
                          <span className="font-mono">{times.rise}</span>
                        </div>
                      )}
                      {times.set && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-text-secondary">Set:</span>
                          <span className="font-mono">{times.set}</span>
                        </div>
                      )}
                    </div>

                    {/* Imaging window */}
                    {bestWindow && (
                      <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-2.5 text-xs">
                        <div className="flex items-center gap-1.5 font-semibold text-green-300 mb-1">
                          <Eye size={12} />
                          Imaging window
                        </div>
                        <div className="flex items-center justify-between text-text-secondary">
                          <span className="font-mono">{bestWindow.start} → {bestWindow.end}</span>
                          <span className="font-bold text-green-300">{bestWindow.imaging_time_hours.toFixed(1)}h</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[10px]">
                          <span>🌙 {bestWindow.moon_illumination_percent}%</span>
                          <span>↔ {bestWindow.moon_distance_deg}° from moon</span>
                        </div>
                      </div>
                    )}

                    {/* Link */}
                    <div className="mt-auto pt-2 border-t border-border/50 flex justify-end">
                      <a
                        href={obj.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-primary hover:underline flex items-center gap-1"
                      >
                        Telescopius <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Existing KPIs */}
      <DashboardKPIsView kpis={mockKPIs} />
    </div>
  );
};

export default AplsModule1View;