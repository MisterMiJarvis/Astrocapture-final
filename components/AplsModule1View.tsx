import React, { useState, useEffect } from 'react';
import { NightlyForecast } from '../types';
import { fetchNightlyForecast } from '../services/weatherService';
import { mapNightlyForecast as mapNightlyForecastData } from '../services/weatherDataMapper';
import { fetchProjects, calculateProgress } from '../src/services/projectService';
import { Project } from '../src/types/project';
import { TelescopiusTarget } from '../src/services/targetExplorerService';
import TargetExplorerView from './TargetExplorerView';
import { Moon, Target, Camera } from 'lucide-react';

const PRESET_LOCATIONS: Record<string, { lat: number; lon: number }> = {
  saintEtienne: { lat: 43.7889, lon: 4.7533 },
  pradelles: { lat: 44.6167, lon: 3.9667 },
};

type LocationSource = 'current' | 'saintEtienne' | 'pradelles' | '';

interface AplsModule1ViewProps {
  locationSource?: LocationSource;
  onLocationChange?: (source: LocationSource) => void;
  onStartProject?: (target: TelescopiusTarget) => void;
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

const STATUS_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  planning: { label: 'Planning', icon: '📋', color: 'text-blue-300', bg: 'bg-blue-500/20 border-blue-500/30' },
  in_progress: { label: 'In Progress', icon: '🔄', color: 'text-emerald-300', bg: 'bg-emerald-500/20 border-emerald-500/30' },
  completed: { label: 'Completed', icon: '✅', color: 'text-amber-300', bg: 'bg-amber-500/20 border-amber-500/30' },
  archived: { label: 'Archived', icon: '📁', color: 'text-slate-400', bg: 'bg-slate-500/20 border-slate-500/30' },
};

const AplsModule1View: React.FC<AplsModule1ViewProps> = ({ locationSource: locationSourceProp, onLocationChange: onLocationChangeProp, onStartProject }) => {
  const [localLocationSource, setLocalLocationSource] = useState<LocationSource>('');
  const locationSource = locationSourceProp ?? localLocationSource;
  const onLocationChange = onLocationChangeProp ?? setLocalLocationSource;
  const [nightlyForecast, setNightlyForecast] = useState<NightlyForecast[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<{ lat: number; lon: number } | null>(null);

  const [activeProjects, setActiveProjects] = useState<Project[]>([]);

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
    fetchProjects().then(projects => {
      setActiveProjects(projects.filter(p => p.status === 'in_progress' || p.status === 'planning'));
    }).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      {/* 4-Night Stargazing Outlook */}
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
                  {night.summary.includes('Rain') ? '🌧️' : night.summary.includes('Cloud') || night.summary.includes('cloud') ? '☁️' : night.summary.includes('Wind') ? '💨' : '⭐'}
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

      {/* Active Projects */}
      {activeProjects.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-base">📋 Active Projects</h3>
            <span className="text-xs text-text-secondary">{activeProjects.length} project{activeProjects.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="space-y-3">
            {activeProjects.map(project => {
              const progress = calculateProgress(project);
              const totalHours = (progress.totalExposureSeconds / 3600).toFixed(1);
              const plannedHours = project.totalPlannedHours.toFixed(1);
              const cfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.planning;

              return (
                <div key={project.id} className="bg-background border border-border rounded-lg p-4 hover:border-primary/40 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span>{cfg.icon}</span>
                        <span className="font-semibold text-text truncate">{project.title}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-text-secondary">
                        <span className="flex items-center gap-1"><Target size={12} /> {project.targetName}</span>
                        {project.targetMagnitude != null && <span className="font-mono">mag {(project.targetMagnitude ?? 0).toFixed(1)}</span>}
                        <span className="flex items-center gap-1"><Camera size={12} /> {project.observations.length} obs</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
                    <span>{progress.completionPercent}%</span>
                    <span>{totalHours}h / {plannedHours}h</span>
                  </div>
                  <div className="w-full h-2 bg-background rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        progress.completionPercent >= 100 ? 'bg-amber-500' :
                        progress.completionPercent >= 50 ? 'bg-emerald-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(100, progress.completionPercent)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Target Explorer */}
      <TargetExplorerView
        locationSource={locationSource as any}
        onLocationChange={onLocationChange as any}
        onStartProject={onStartProject}
      />
    </div>
  );
};

export default AplsModule1View;