// ============================================================================
// COMPONENT : TargetExplorerView — Deep-sky target search with Telescopius
// AstroSuite — Full filter support, visibility-aware, equipment-aware
// v2: Best Tonight tab, dynamic filter recommendations, rig-aware scoring
// ============================================================================

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  searchTargets,
  getDefaultFilters,
  getDefaultBestTargetFilters,
  TargetSearchFilters,
  TelescopiusTarget,
  OBJECT_TYPES,
  TargetSearchResult,
  calculateFraming,
  FramingAnalysis,
  RigInfo,
  recommendFiltersForTypes,
  mapApiTarget,
  authHeaders as telescopiusAuthHeaders,
  loadPriorityTargets,
} from '../src/services/targetExplorerService';
import { FilterType } from '../types/module5';
import { RigProfile } from '../types/module2';
import {
  getUserOwnedFilters,
  UserFilterInfo,
  FILTER_COLORS,
  FILTER_TYPE_LABELS,
  FILTER_TYPE_COVERAGE,
  translateRecommendations,
  calculateEnhancedFilterScore,
} from '../src/services/filterMapping';
import { Search, Filter, X, ChevronLeft, ChevronRight, Star, MapPin, Moon, Eye, SlidersHorizontal, RotateCw, Telescope, Sparkles, Target } from 'lucide-react';

interface TargetExplorerProps {
  locationSource: 'current' | 'saintEtienne' | 'pradelles';
  onLocationChange: (source: 'current' | 'saintEtienne' | 'pradelles') => void;
  onStartProject?: (target: TelescopiusTarget) => void;
}

const LOCATION_COORDS: Record<string, { lat: number; lon: number }> = {
  saintEtienne: { lat: 43.7889, lon: 4.7533 },
  pradelles: { lat: 44.6167, lon: 3.9667 },
};

const TYPE_EMOJIS: Record<string, string> = {
  gxy: '🌌', neb: '💨', opcl: '⭐', plnb: '🔮', snrm: '💥',
  gxycl: '🌌', stcl: '⭐',
  Galaxy: '🌌', Nebula: '💨', Cluster: '⭐', Planetary_Nebula: '🔮',
  Supernova_Remnant: '💥', Unknown: '🔭',
};

const TYPE_COLORS: Record<string, string> = {
  gxy: 'bg-purple-500/20 text-purple-300', neb: 'bg-red-500/20 text-red-300',
  opcl: 'bg-yellow-500/20 text-yellow-300', plnb: 'bg-cyan-500/20 text-cyan-300',
  snrm: 'bg-orange-500/20 text-orange-300', gxycl: 'bg-purple-500/20 text-purple-300',
  stcl: 'bg-yellow-500/20 text-yellow-300',
  Galaxy: 'bg-purple-500/20 text-purple-300', Nebula: 'bg-red-500/20 text-red-300',
  Cluster: 'bg-yellow-500/20 text-yellow-300', Planetary_Nebula: 'bg-cyan-500/20 text-cyan-300',
  Supernova_Remnant: 'bg-orange-500/20 text-orange-300', Unknown: 'bg-slate-500/20 text-slate-300',
};

const TYPE_LABELS: Record<string, string> = {
  gxy: 'Galaxy', lgx: 'Lenticular Galaxy', sgx: 'Spiral Galaxy', pogx: 'Peculiar Galaxy', igxs: 'Interacting Galaxy', sfgx: 'Starburst Galaxy', agn: 'AGN',
  neb: 'Nebula', eneb: 'Emission Nebula', rneb: 'Reflection Nebula', dineb: 'Dark Nebula', h2r: 'HII Region',
  opcl: 'Open Cluster', gycl: 'Globular Cluster', stcl: 'Star Cluster',
  plnb: 'Planetary Nebula', snrm: 'SNR', gxycl: 'Galaxy Cluster',
  dso: 'Deep Sky Object',
};

// FILTER_COLORS and ALL_FILTERS now come dynamically from filterMapping.ts
// See getUserOwnedFilters() — only shows filters the user owns

const FIT_COLORS: Record<string, string> = {
  perfect: 'border-green-500/50 bg-green-500/5',
  good: 'border-blue-500/50 bg-blue-500/5',
  tight: 'border-yellow-500/50 bg-yellow-500/5',
  too_large: 'border-red-500/50 bg-red-500/5',
  unknown: 'border-slate-500/50 bg-slate-500/5',
};

const FIT_LABELS: Record<string, string> = {
  perfect: '✅ Perfect', good: '👍 Good', tight: '⚠️ Tight', too_large: '❌ Mosaic', unknown: '❓ Unknown',
};

type TabView = 'bestTonight' | 'priority' | 'search';

export const TargetExplorerView: React.FC<TargetExplorerProps> = ({ locationSource, onLocationChange, onStartProject }) => {
  const [activeTab, setActiveTab] = useState<TabView>('bestTonight');
  const [results, setResults] = useState<TargetSearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<TelescopiusTarget | null>(null);
  const [defaultRig, setDefaultRig] = useState<RigInfo | null>(null);
  const [rigs, setRigs] = useState<any[]>([]);
  const [activeRigId, setActiveRigId] = useState<string>('');
  const [framingMap, setFramingMap] = useState<Record<string, FramingAnalysis>>({});
  const [bestTargets, setBestTargets] = useState<TelescopiusTarget[]>([]);
  const [bestLoading, setBestLoading] = useState(false);
  const [bestError, setBestError] = useState<string | null>(null);
  const [priorityTargets, setPriorityTargets] = useState<TelescopiusTarget[]>([]);
  const [priorityLoading, setPriorityLoading] = useState(false);
  const [priorityError, setPriorityError] = useState<string | null>(null);
  const priorityLoadedRef = useRef(false);
  const [priorityRawIds, setPriorityRawIds] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType | 'all'>('all');
  const [minAlt, setMinAlt] = useState(30);
  const [userFilters, setUserFilters] = useState<UserFilterInfo[]>([]);
  const [ownedFilterTypes, setOwnedFilterTypes] = useState<FilterType[]>([]);
  const bestLoadedRef = useRef(false);
  const [priorityIds, setPriorityIds] = useState<Set<string>>(new Set());

  // Load user's owned filters
  useEffect(() => {
    getUserOwnedFilters().then(uf => {
      setUserFilters(uf);
      setOwnedFilterTypes(uf.map(f => f.filterType).filter((v, i, a) => a.indexOf(v) === i));
    }).catch(() => {});
  }, []);

  // Load priority targets config
  useEffect(() => {
    loadPriorityTargets().then(({ ids, raw }) => {
      setPriorityIds(ids);
      setPriorityRawIds(raw);
    }).catch(() => {});
  }, []);

  const coords = LOCATION_COORDS[locationSource] || LOCATION_COORDS.saintEtienne;

  const [filters, setFilters] = useState<TargetSearchFilters>(() => getDefaultFilters(coords.lat, coords.lon));

  // Load rigs
  useEffect(() => {
    fetch('/api/apls/rigs', { headers: { 'Content-Type': 'application/json' } })
      .then(r => r.ok ? r.json() : [])
      .then((rigList: any[]) => {
        setRigs(rigList);
        const def = rigList.find((r: any) => r.isDefault);
        if (def) {
          setActiveRigId(def.id);
          const rigInfo: RigInfo = {
            name: def.name,
            focalLength: def.telescope?.focalLength || 0,
            aperture: def.telescope?.aperture || 0,
            fRatio: def.telescope?.fRatio || 0,
            sensorWidth: def.imagingCamera?.sensorWidth || 0,
            sensorHeight: def.imagingCamera?.sensorHeight || 0,
            pixelSize: def.imagingCamera?.pixelSize || 0,
          };
          setDefaultRig(rigInfo);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch best targets tonight — single highlights call, then diversify client-side
  const loadBestTargets = useCallback(async () => {
    setBestLoading(true);
    setBestError(null);
    try {
      const params = new URLSearchParams({
        lat: coords.lat.toString(),
        lon: coords.lon.toString(),
        timezone: 'Europe/Paris',
        min_alt: minAlt.toString(),
        results_per_page: '50',
      });
      const response = await fetch(`/api/telescopius/highlights?${params.toString()}`, {
        headers: telescopiusAuthHeaders(),
      });
      if (!response.ok) throw new Error(`Highlights failed: ${response.status}`);
      const data = await response.json();
      const allTargets: TelescopiusTarget[] = (data.targets || [])
        .map(mapApiTarget)
        .filter(t => t.altitudeMax != null && t.altitudeMax >= minAlt);

      // Group by type category and interleave for diversity
      const nebulae = allTargets.filter(t => ['eneb','rneb','dineb','h2r','plnb','snrm','neb'].includes(t.type));
      const galaxies = allTargets.filter(t => ['gxy','lgx','sgx','igxs','sfgx','pogx','cgxs','egx','ggxs'].includes(t.type));
      const clusters = allTargets.filter(t => ['opcl','gycl','stcl','mcl','glcl'].includes(t.type));

      const groups = [nebulae.slice(0, 10), galaxies.slice(0, 10), clusters.slice(0, 10)];
      const merged: TelescopiusTarget[] = [];
      const maxLen = Math.max(...groups.map(g => g.length));
      for (let i = 0; i < maxLen; i++) {
        for (const group of groups) {
          if (group[i]) merged.push(group[i]);
        }
      }

      // Mark priority targets and move them to top
      // Match priority targets — normalize by removing spaces (M13 == M 13)
      const norm = (s: string) => s.toUpperCase().replace(/\s+/g, '');
      const priorityTargets = merged.filter(t => priorityIds.has(norm(t.mainId)) || priorityIds.has(norm(t.mainName)) || priorityIds.has(t.mainId.toUpperCase().trim()) || priorityIds.has(t.mainName.toUpperCase().trim()));
      const normalTargets = merged.filter(t => !priorityIds.has(norm(t.mainId)) && !priorityIds.has(norm(t.mainName)) && !priorityIds.has(t.mainId.toUpperCase().trim()) && !priorityIds.has(t.mainName.toUpperCase().trim()));
      priorityTargets.forEach(t => { t.isPriority = true; });
      const finalTargets = [...priorityTargets, ...normalTargets];

      if (finalTargets.length === 0) {
        setBestError('No targets visible tonight. Try lowering the altitude filter.');
      }
      setBestTargets(finalTargets);
    } catch (err) {
      console.error('Best targets load error:', err);
      setBestError(`Failed to load best targets: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setBestLoading(false);
    }
  }, [coords.lat, coords.lon, minAlt, priorityIds]);

  // Load best targets on mount — wait for priorityIds to be loaded first
  // If priorityIds fails to load (empty), still fetch after a short delay
  useEffect(() => {
    if (bestLoadedRef.current) return;
    if (priorityIds.size > 0) {
      loadBestTargets();
      bestLoadedRef.current = true;
    } else {
      // Fallback: if priorities haven't loaded after 3s, fetch anyway
      const timer = setTimeout(() => {
        if (!bestLoadedRef.current) {
          loadBestTargets();
          bestLoadedRef.current = true;
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [loadBestTargets, priorityIds]);

  // Load priority targets visibility — fetch each priority target from Telescopius and filter by altitude
  const loadPriorityVisibility = useCallback(async () => {
    if (priorityRawIds.length === 0) return;
    setPriorityLoading(true);
    setPriorityError(null);
    try {
      // Batch search: Telescopius search supports name filter, but we need individual lookups
      // to get visibility data for each target. We batch them in parallel (5 at a time to avoid rate limits).
      const BATCH_SIZE = 20;
      const allResults: TelescopiusTarget[] = [];
      
      for (let i = 0; i < priorityRawIds.length; i += BATCH_SIZE) {
        const batch = priorityRawIds.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(async (name) => {
            try {
              const params = new URLSearchParams({
                lat: coords.lat.toString(),
                lon: coords.lon.toString(),
                timezone: 'Europe/Paris',
                name: name,
                results_per_page: '1',
                min_alt: '0', // We filter altitude client-side
              });
              const res = await fetch(`/api/telescopius/search?${params.toString()}`, {
                headers: telescopiusAuthHeaders(),
              });
              if (!res.ok) return null;
              const data = await res.json();
              const targets: TelescopiusTarget[] = (data.targets || []).map(mapApiTarget);
              return targets[0] || null;
            } catch {
              return null;
            }
          })
        );
        for (const t of batchResults) {
          if (t) allResults.push(t);
        }
      }
      
      // Filter by min altitude
      const visible = allResults.filter(t => t.altitudeMax != null && t.altitudeMax >= minAlt);
      // Mark all as priority
      visible.forEach(t => { t.isPriority = true; });
      // Sort by max altitude descending (highest first)
      visible.sort((a, b) => (b.altitudeMax ?? 0) - (a.altitudeMax ?? 0));
      
      if (visible.length === 0) {
        setPriorityError('None of your priority targets are visible tonight. Try lowering the altitude filter.');
      }
      setPriorityTargets(visible);
    } catch (err) {
      console.error('Priority targets load error:', err);
      setPriorityError(`Failed to load priority targets: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setPriorityLoading(false);
    }
  }, [coords.lat, coords.lon, minAlt, priorityRawIds]);

  // Load priority visibility when tab is first opened or when priorityRawIds change
  useEffect(() => {
    if (priorityLoadedRef.current) return;
    if (priorityRawIds.length > 0) {
      priorityLoadedRef.current = true;
      // Don't auto-load — wait for tab click. But preload in background if user is likely to click.
      // Actually, let's preload so the tab feels instant.
      loadPriorityVisibility();
    }
  }, [loadPriorityVisibility, priorityRawIds]);

  // Search tab
  const handleSearch = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await searchTargets(filters);
      setResults(result);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => { handleSearch(); }, []);

  const updateFilter = useCallback((key: keyof TargetSearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value === '' ? undefined : value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(getDefaultFilters(coords.lat, coords.lon));
  }, [coords]);

  const changePage = useCallback((delta: number) => {
    setFilters(prev => ({ ...prev, page: Math.max(1, (prev.page || 1) + delta) }));
  }, []);

  useEffect(() => {
    if (results && filters.page !== results.page) handleSearch();
  }, [filters.page]);

  // Recalculate framing when targets or rig change
  useEffect(() => {
    const currentTargets = activeTab === 'bestTonight' ? bestTargets : activeTab === 'priority' ? priorityTargets : (results?.targets || []);
    if (!defaultRig || currentTargets.length === 0) return;
    const map: Record<string, FramingAnalysis> = {};
    for (const t of currentTargets) {
      map[t.id] = calculateFraming(t, defaultRig);
    }
    setFramingMap(map);
  }, [bestTargets, results, defaultRig, activeTab]);

  // Update filters when location changes
  useEffect(() => {
    setFilters(prev => ({ ...prev, lat: coords.lat, lon: coords.lon }));
  }, [coords]);

  const activeFilterCount = Object.entries(filters).filter(
    ([k, v]) => v !== undefined && v !== '' && !['lat', 'lon', 'timezone', 'resultsPerPage'].includes(k)
  ).length;

  // Apply filter to best targets — use coverage map so L_Ultimate matches Ha/OIII targets
  const filterByBand = (targets: TelescopiusTarget[]) => {
    if (activeFilter === 'all') return targets;
    return targets.filter(t => {
      const types = t.type ? t.type.split(',') : [];
      const recommended = recommendFiltersForTypes(types);
      const activeFilterCovers = FILTER_TYPE_COVERAGE[activeFilter as FilterType] || [activeFilter];
      return recommended.some(r => activeFilterCovers.includes(r));
    });
  };

  const filteredBestTargets = filterByBand(bestTargets);
  const filteredPriorityTargets = filterByBand(priorityTargets);

  const displayTargets = activeTab === 'bestTonight' ? filteredBestTargets : activeTab === 'priority' ? filteredPriorityTargets : (results?.targets || []);

  // Render target card (shared between both tabs)
  const renderTargetCard = (target: TelescopiusTarget) => {
    const framing = framingMap[target.id];
    const types = target.type ? target.type.split(',') : [];
    const recommendedFilters = recommendFiltersForTypes(types);

    return (
      <div
        key={target.id}
        onClick={() => setSelectedTarget(selectedTarget?.id === target.id ? null : target)}
        className={`group rounded-xl border overflow-hidden cursor-pointer transition-all hover:shadow-lg ${
          selectedTarget?.id === target.id
            ? 'border-primary ring-2 ring-primary/30'
            : 'border-border hover:border-primary/50'
        }`}
      >
        {/* Image header */}
        <div className="h-28 bg-slate-800 flex items-center justify-center relative">
          {target.imageUrl ? (
            <img src={target.imageUrl} alt={target.mainName} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <span className="text-4xl">{TYPE_EMOJIS[target.type] || '🔭'}</span>
          )}
          {target.altitudeMax != null && (
            <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full font-mono">
              ↑{(target.altitudeMax ?? 0).toFixed(0)}°
            </div>
          )}
          {target.moonSeparation != null && (
            <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
              <Moon size={10} /> {(target.moonSeparation ?? 0).toFixed(0)}°
            </div>
          )}
          {/* Imaging hours badge */}
          {target.totalImagingHours > 0 && (
            <div className="absolute bottom-2 right-2 bg-emerald-500/80 text-white text-xs px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
              ⏱ {(target.totalImagingHours ?? 0).toFixed(1)}h
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3">
          <div className="font-semibold text-sm text-text truncate flex items-center gap-1">
            {target.isPriority && <span title="Priority target" className="text-yellow-400">⭐</span>}
            {target.mainName}
          </div>
          {target.mainId !== target.mainName && (
            <div className="text-xs text-text-secondary truncate">{target.mainId}</div>
          )}

          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${TYPE_COLORS[target.type] || TYPE_COLORS.Unknown}`}>
              {TYPE_LABELS[target.type] || target.type?.replace(/_/g, ' ') || 'DSO'}
            </span>
            {target.constellation && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                {target.constellation}
              </span>
            )}
            {target.magnitude != null && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-300 font-mono">
                mag {(target.magnitude ?? 0).toFixed(1)}
              </span>
            )}
            {target.sizeArcmin != null && target.sizeArcmin > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-300 font-mono">
                {(target.sizeArcmin ?? 0).toFixed(0)}'
              </span>
            )}
          </div>

          {/* Dynamic filter recommendations — only user's owned filters */}
          {recommendedFilters.length > 0 && (() => {
            const { owned } = translateRecommendations(recommendedFilters, userFilters);
            return owned.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {owned.map(uf => (
                  <span key={uf.filterType} className={`text-[9px] px-1.5 py-0.5 rounded ${uf.color}`}>
                    {uf.label}{uf.filter.bandwidthNm <= 30 ? ` ${uf.filter.bandwidthNm}nm` : ''}
                  </span>
                ))}
              </div>
            );
          })()}

          {/* Framing indicator */}
          {framing && (() => {
            const fitIcons: Record<string, string> = {
              perfect: '✅', good: '👍', tight: '⚠️', too_large: '❌', unknown: '❓',
            };
            return (
              <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between">
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${FIT_COLORS[framing.fitStatus]}`}>
                  {fitIcons[framing.fitStatus]} {framing.fitStatus === 'too_large' ? 'Mosaic' : framing.fitStatus === 'perfect' ? 'Perfect' : framing.fitStatus === 'good' ? 'Good' : framing.fitStatus === 'tight' ? 'Tight' : '?'}
                </span>
                {framing.coveragePercent != null && (
                  <span className="text-[10px] text-text-secondary font-mono">{(framing.coveragePercent ?? 0).toFixed(0)}% FOV</span>
                )}
              </div>
            );
          })()}

          {/* Imaging windows */}
          {target.imagingWindows && target.imagingWindows.length > 0 && (
            <div className="mt-1.5 space-y-0.5">
              {target.imagingWindows.slice(0, 2).map((w, i) => (
                <div key={i} className="flex items-center justify-between text-[9px] text-text-secondary font-mono bg-background/50 px-1.5 py-0.5 rounded">
                  <span>{w.start} → {w.end}</span>
                  <span>{(w.hours ?? 0).toFixed(1)}h</span>
                  {w.moonIllumination != null && (
                    <span>🌑 {((w.moonIllumination ?? 0) * 100).toFixed(0)}%</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">🎯 Targets</h1>
            <p className="mt-1 text-text-secondary text-sm">Find the best deep-sky objects for your setup tonight</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Location */}
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-text-secondary" />
              <select
                value={locationSource}
                onChange={(e) => onLocationChange(e.target.value as any)}
                className="text-sm bg-blue-900/40 border border-blue-700/50 rounded-lg px-3 py-1.5 text-blue-100"
              >
                <option value="saintEtienne">🏠 St-Étienne-du-Grès</option>
                <option value="pradelles">🏡 Pradelles</option>
              </select>
            </div>

            {/* Rig selector */}
            {rigs.length > 0 && (
              <div className="flex items-center gap-2">
                <Telescope size={14} className="text-text-secondary" />
                <select
                  value={activeRigId}
                  onChange={(e) => {
                    setActiveRigId(e.target.value);
                    const rig = rigs.find((r: any) => r.id === e.target.value);
                    if (rig) {
                      setDefaultRig({
                        name: rig.name,
                        focalLength: rig.telescope?.focalLength || 0,
                        aperture: rig.telescope?.aperture || 0,
                        fRatio: rig.telescope?.fRatio || 0,
                        sensorWidth: rig.imagingCamera?.sensorWidth || 0,
                        sensorHeight: rig.imagingCamera?.sensorHeight || 0,
                        pixelSize: rig.imagingCamera?.pixelSize || 0,
                      });
                    }
                  }}
                  className="text-sm bg-blue-900/40 border border-blue-700/50 rounded-lg px-3 py-1.5 text-blue-100"
                >
                  {rigs.map((r: any) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab selector */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('bestTonight')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'bestTonight'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
              : 'bg-surface-secondary text-text-secondary hover:text-text border border-border'
          }`}
        >
          <Sparkles size={16} /> Best Tonight
        </button>
        <button
          onClick={() => setActiveTab('priority')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'priority'
              ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50'
              : 'bg-surface-secondary text-text-secondary hover:text-text border border-border'
          }`}
        >
          <Star size={16} /> Priority
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'search'
              ? 'bg-primary/20 text-primary border border-primary/50'
              : 'bg-surface-secondary text-text-secondary hover:text-text border border-border'
          }`}
        >
          <Search size={16} /> Search
        </button>
      </div>

      {/* ===== BEST TONIGHT TAB ===== */}
      {activeTab === 'bestTonight' && (
        <div className="space-y-4">
          {/* Filter bar */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-2 mr-2">
              <Eye size={14} className="text-text-secondary" />
              <span className="text-xs text-text-secondary">Alt min:</span>
              <input
                type="range" min="0" max="80" value={minAlt}
                onChange={e => { setMinAlt(Number(e.target.value)); }}
                className="w-24 accent-emerald-500"
              />
              <span className="text-xs text-text-secondary font-mono w-6">{minAlt}°</span>
            </div>

            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setActiveFilter('all')}
                className={`text-[10px] px-2 py-1 rounded-full transition-colors ${
                  activeFilter === 'all' ? 'bg-white/20 text-white' : 'bg-surface-secondary text-text-secondary hover:text-text'
                }`}
              >
                All
              </button>
              {ownedFilterTypes.map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`text-[10px] px-2 py-1 rounded-full transition-colors ${
                    activeFilter === f ? FILTER_COLORS[f] + ' ring-1 ring-current' : 'bg-surface-secondary text-text-secondary hover:text-text'
                  }`}
                >
                  {FILTER_TYPE_LABELS[f] || f.replace(/_/g, ' ')}
                </button>
              ))}
            </div>

            <button
              onClick={loadBestTargets}
              disabled={bestLoading}
              className="ml-auto px-3 py-1.5 text-sm rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-500/30 disabled:opacity-50 flex items-center gap-1.5"
            >
              <RotateCw size={14} className={bestLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {/* Rig info */}
          {defaultRig && (
            <div className="text-xs text-text-secondary flex items-center gap-3">
              <span>📐 FOV: {defaultRig.sensorWidth && defaultRig.focalLength ? `${(defaultRig.sensorWidth * 206.265 / defaultRig.focalLength).toFixed(1)}' × ${(defaultRig.sensorHeight * 206.265 / defaultRig.focalLength).toFixed(1)}'` : '—'}</span>
              <span>|</span>
              <span>📏 Scale: {defaultRig.pixelSize && defaultRig.focalLength ? `${((defaultRig.pixelSize * 206.265) / defaultRig.focalLength).toFixed(2)}"/px` : '—'}</span>
              <span>|</span>
              <span>🔭 {defaultRig.focalLength}mm f/{defaultRig.fRatio}</span>
            </div>
          )}

          {/* Error */}
          {bestError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-300">
              {bestError}
            </div>
          )}

          {/* Loading */}
          {bestLoading && (
            <div className="flex items-center justify-center py-20">
              <RotateCw className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
          )}

          {/* Targets grid */}
          {!bestLoading && filteredBestTargets.length === 0 && (
            <div className="text-center py-16 text-text-secondary">
              <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg">No targets found for tonight</p>
              <p className="text-sm mt-1">Try adjusting altitude or filter settings</p>
            </div>
          )}

          {!bestLoading && filteredBestTargets.length > 0 && (
            <>
              <div className="text-sm text-text-secondary">
                {filteredBestTargets.length} target{filteredBestTargets.length !== 1 ? 's' : ''} visible tonight
                {activeFilter !== 'all' && ` · Filtered: ${activeFilter.replace(/_/g, ' ')}`}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredBestTargets.map(renderTargetCard)}
              </div>
            </>
          )}
        </div>
      )}

      {/* ===== PRIORITY TAB ===== */}
      {activeTab === 'priority' && (
        <div className="space-y-4">
          {/* Filter bar — same as Best Tonight */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-2 mr-2">
              <Eye size={14} className="text-text-secondary" />
              <span className="text-xs text-text-secondary">Alt min:</span>
              <input
                type="range" min="0" max="80" value={minAlt}
                onChange={e => { setMinAlt(Number(e.target.value)); }}
                className="w-24 accent-yellow-500"
              />
              <span className="text-xs text-text-secondary font-mono w-6">{minAlt}°</span>
            </div>

            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setActiveFilter('all')}
                className={`text-[10px] px-2 py-1 rounded-full transition-colors ${
                  activeFilter === 'all' ? 'bg-white/20 text-white' : 'bg-surface-secondary text-text-secondary hover:text-text'
                }`}
              >
                All
              </button>
              {ownedFilterTypes.map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`text-[10px] px-2 py-1 rounded-full transition-colors ${
                    activeFilter === f ? FILTER_COLORS[f] + ' ring-1 ring-current' : 'bg-surface-secondary text-text-secondary hover:text-text'
                  }`}
                >
                  {FILTER_TYPE_LABELS[f] || f.replace(/_/g, ' ')}
                </button>
              ))}
            </div>

            <button
              onClick={loadPriorityVisibility}
              disabled={priorityLoading}
              className="ml-auto px-3 py-1.5 text-sm rounded-lg bg-yellow-500/20 text-yellow-300 border border-yellow-500/50 hover:bg-yellow-500/30 disabled:opacity-50 flex items-center gap-1.5"
            >
              <RotateCw size={14} className={priorityLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {/* Rig info */}
          {defaultRig && (
            <div className="text-xs text-text-secondary flex items-center gap-3">
              <span>📐 FOV: {defaultRig.sensorWidth && defaultRig.focalLength ? `${(defaultRig.sensorWidth * 206.265 / defaultRig.focalLength).toFixed(1)}' × ${(defaultRig.sensorHeight * 206.265 / defaultRig.focalLength).toFixed(1)}'` : '—'}</span>
              <span>|</span>
              <span>📏 Scale: {defaultRig.pixelSize && defaultRig.focalLength ? `${((defaultRig.pixelSize * 206.265) / defaultRig.focalLength).toFixed(2)}"/px` : '—'}</span>
              <span>|</span>
              <span>🔭 {defaultRig.focalLength}mm f/{defaultRig.fRatio}</span>
            </div>
          )}

          {/* Error */}
          {priorityError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-300">
              {priorityError}
            </div>
          )}

          {/* Loading */}
          {priorityLoading && (
            <div className="flex flex-col items-center justify-center py-20">
              <RotateCw className="w-8 h-8 text-yellow-500 animate-spin" />
              <p className="text-sm text-text-secondary mt-3">Checking visibility for {priorityRawIds.length} priority targets (batch of 20)…</p>
              <p className="text-xs text-text-secondary mt-1">~10-30 seconds</p>
            </div>
          )}

          {/* Targets grid */}
          {!priorityLoading && filteredPriorityTargets.length === 0 && (
            <div className="text-center py-16 text-text-secondary">
              <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg">No priority targets visible tonight</p>
              <p className="text-sm mt-1">Try adjusting altitude or filter settings</p>
            </div>
          )}

          {!priorityLoading && filteredPriorityTargets.length > 0 && (
            <>
              <div className="text-sm text-text-secondary">
                {filteredPriorityTargets.length} priority target{filteredPriorityTargets.length !== 1 ? 's' : ''} visible tonight
                {activeFilter !== 'all' && ` · Filtered: ${activeFilter.replace(/_/g, ' ')}`}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredPriorityTargets.map(renderTargetCard)}
              </div>
            </>
          )}
        </div>
      )}

      {/* ===== SEARCH TAB ===== */}
      {activeTab === 'search' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary w-4 h-4" />
              <input
                type="text"
                placeholder="Search by name (e.g. M31, Orion, Andromeda)..."
                className="w-full bg-surface border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-text placeholder:text-text-secondary/50 focus:outline-none focus:border-primary"
                value={filters.name || ''}
                onChange={(e) => updateFilter('name', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className="px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? <RotateCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Search
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium border flex items-center gap-2 transition-colors ${
                showFilters || activeFilterCount > 0
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'bg-surface border-border text-text-secondary hover:text-text'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-1 bg-primary text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Filters panel */}
          {showFilters && (
            <div className="bg-surface border border-border rounded-xl p-5 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-text">Advanced Filters</h3>
                <button onClick={clearFilters} className="text-xs text-text-secondary hover:text-primary flex items-center gap-1">
                  <X size={12} /> Clear all
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-text-secondary block mb-1">Object Type</label>
                  <select value={filters.types || ''} onChange={(e) => updateFilter('types', e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text">
                    {OBJECT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-text-secondary block mb-1">Constellation</label>
                  <select value={filters.constellation || ''} onChange={(e) => updateFilter('constellation', e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text">
                    <option value="">All</option>
                    {['And','Aql','Aqr','Ari','Aur','Boo','Cam','Cap','Cas','Cen','Cep','Cet','CMa','CMi','Cnc','Com','Crb','Crv','Cyg','Del','Dra','Gem','Her','Hya','Leo','Lep','Lib','Lmi','Lup','Lyn','Lyr','Mon','Oph','Ori','Peg','Per','Psc','Pup','Sco','Sgr','Tau','Tri','UMa','UMi','Vel','Vir','Vul'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-text-secondary block mb-1">Min Altitude (°)</label>
                  <input type="number" value={filters.minAlt ?? ''} onChange={(e) => updateFilter('minAlt', e.target.value ? parseFloat(e.target.value) : undefined)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text" placeholder="30" />
                </div>
                <div>
                  <label className="text-xs text-text-secondary block mb-1">Min Duration (min)</label>
                  <input type="number" value={filters.minAltMinutes ?? ''} onChange={(e) => updateFilter('minAltMinutes', e.target.value ? parseInt(e.target.value) : undefined)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text" placeholder="120" />
                </div>
                <div>
                  <label className="text-xs text-text-secondary block mb-1">Mag Min</label>
                  <input type="number" step="0.5" value={filters.magMin ?? ''} onChange={(e) => updateFilter('magMin', e.target.value ? parseFloat(e.target.value) : undefined)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text" placeholder="4" />
                </div>
                <div>
                  <label className="text-xs text-text-secondary block mb-1">Mag Max</label>
                  <input type="number" step="0.5" value={filters.magMax ?? ''} onChange={(e) => updateFilter('magMax', e.target.value ? parseFloat(e.target.value) : undefined)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text" placeholder="12" />
                </div>
                <div>
                  <label className="text-xs text-text-secondary block mb-1">Size Min (')</label>
                  <input type="number" value={filters.sizeMin ?? ''} onChange={(e) => updateFilter('sizeMin', e.target.value ? parseFloat(e.target.value) : undefined)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text" placeholder="arcmin" />
                </div>
                <div>
                  <label className="text-xs text-text-secondary block mb-1">Size Max (')</label>
                  <input type="number" value={filters.sizeMax ?? ''} onChange={(e) => updateFilter('sizeMax', e.target.value ? parseFloat(e.target.value) : undefined)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text" placeholder="arcmin" />
                </div>
                <div>
                  <label className="text-xs text-text-secondary block mb-1">Moon Dist Min (°)</label>
                  <input type="number" value={filters.moonDistMin ?? ''} onChange={(e) => updateFilter('moonDistMin', e.target.value ? parseFloat(e.target.value) : undefined)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text" placeholder="30" />
                </div>
                <div>
                  <label className="text-xs text-text-secondary block mb-1">Moon Dist Max (°)</label>
                  <input type="number" value={filters.moonDistMax ?? ''} onChange={(e) => updateFilter('moonDistMax', e.target.value ? parseFloat(e.target.value) : undefined)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text" placeholder="180" />
                </div>
                <div>
                  <label className="text-xs text-text-secondary block mb-1">Surface Br. Min</label>
                  <input type="number" step="0.5" value={filters.subrMin ?? ''} onChange={(e) => updateFilter('subrMin', e.target.value ? parseFloat(e.target.value) : undefined)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text" placeholder="mag/arcsec²" />
                </div>
                <div>
                  <label className="text-xs text-text-secondary block mb-1">Surface Br. Max</label>
                  <input type="number" step="0.5" value={filters.subrMax ?? ''} onChange={(e) => updateFilter('subrMax', e.target.value ? parseFloat(e.target.value) : undefined)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text" placeholder="mag/arcsec²" />
                </div>
              </div>
              <button onClick={handleSearch} className="w-full py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors">Apply Filters</button>
            </div>
          )}

          {/* Search results info */}
          {results && (
            <div className="flex items-center justify-between text-sm text-text-secondary">
              <span>{results.total} target{results.total !== 1 ? 's' : ''} found{results.source === 'local_fallback' && ' (local fallback)'}</span>
              {results.total > 0 && <span>Page {results.page} · {results.perPage} per page</span>}
            </div>
          )}

          {isLoading && !results && (
            <div className="flex items-center justify-center py-20"><RotateCw className="w-8 h-8 text-primary animate-spin" /></div>
          )}

          {results && results.targets.length === 0 && (
            <div className="text-center py-16 text-text-secondary">
              <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg">No targets found</p>
              <p className="text-sm mt-1">Try adjusting your filters or search terms</p>
            </div>
          )}

          {results && results.targets.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {results.targets.map(renderTargetCard)}
            </div>
          )}

          {/* Pagination */}
          {results && results.total > results.perPage && (
            <div className="flex items-center justify-center gap-4">
              <button onClick={() => changePage(-1)} disabled={filters.page === 1} className="px-4 py-2 rounded-lg border border-border text-sm text-text-secondary hover:text-text disabled:opacity-30 flex items-center gap-1">
                <ChevronLeft size={16} /> Previous
              </button>
              <span className="text-sm text-text-secondary">Page {filters.page || 1}</span>
              <button onClick={() => changePage(1)} disabled={(filters.page || 1) * results.perPage >= results.total} className="px-4 py-2 rounded-lg border border-border text-sm text-text-secondary hover:text-text disabled:opacity-30 flex items-center gap-1">
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Selected target detail */}
      {selectedTarget && (
        <div className="bg-surface border border-primary/50 rounded-xl p-5 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-display font-bold text-text">
              {TYPE_EMOJIS[selectedTarget.type] || '🔭'} {selectedTarget.mainName}
            </h3>
            <button onClick={() => setSelectedTarget(null)} className="text-text-secondary hover:text-text"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {selectedTarget.mainId !== selectedTarget.mainName && (
              <div className="bg-background p-3 rounded-lg border border-border">
                <span className="text-text-secondary text-xs block mb-1">Catalog</span>
                <span className="font-mono font-bold text-text">{selectedTarget.mainId}</span>
              </div>
            )}
            <div className="bg-background p-3 rounded-lg border border-border">
              <span className="text-text-secondary text-xs block mb-1">Type</span>
              <span className="font-bold text-text">{TYPE_LABELS[selectedTarget.type] || selectedTarget.type?.replace(/_/g, ' ') || '—'}</span>
            </div>
            <div className="bg-background p-3 rounded-lg border border-border">
              <span className="text-text-secondary text-xs block mb-1">Constellation</span>
              <span className="font-bold text-text">{selectedTarget.constellation || '—'}</span>
            </div>
            {selectedTarget.magnitude != null && (
              <div className="bg-background p-3 rounded-lg border border-border">
                <span className="text-text-secondary text-xs block mb-1">Magnitude</span>
                <span className="font-mono font-bold text-text">{(selectedTarget.magnitude ?? 0).toFixed(1)}</span>
              </div>
            )}
            {selectedTarget.sizeArcmin != null && selectedTarget.sizeArcmin > 0 && (
              <div className="bg-background p-3 rounded-lg border border-border">
                <span className="text-text-secondary text-xs block mb-1">Size</span>
                <span className="font-mono font-bold text-text">{(selectedTarget.sizeArcmin ?? 0).toFixed(1)}'</span>
              </div>
            )}
            {selectedTarget.surfaceBrightness != null && (
              <div className="bg-background p-3 rounded-lg border border-border">
                <span className="text-text-secondary text-xs block mb-1">Surface Br.</span>
                <span className="font-mono font-bold text-text">{(selectedTarget.surfaceBrightness ?? 0).toFixed(1)}</span>
              </div>
            )}
            {selectedTarget.altitudeMax != null && (
              <div className="bg-background p-3 rounded-lg border border-border">
                <span className="text-text-secondary text-xs block mb-1">Max Altitude</span>
                <span className="font-mono font-bold text-text">{(selectedTarget.altitudeMax ?? 0).toFixed(1)}°</span>
              </div>
            )}
            <div className="bg-background p-3 rounded-lg border border-border">
              <span className="text-text-secondary text-xs block mb-1">Coordinates</span>
              <span className="font-mono text-xs text-text">{selectedTarget.ra} / {selectedTarget.dec}</span>
            </div>
          </div>

          {/* Recommended filters — only user's owned filters with coverage */}
          {(() => {
            const types = selectedTarget.type ? selectedTarget.type.split(',') : [];
            const recFilters = recommendFiltersForTypes(types);
            const moonIllum = selectedTarget.moonIllumination ?? (selectedTarget.moonSeparation != null ? 0.5 : 0);
            const { owned } = translateRecommendations(recFilters, userFilters);
            return owned.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs text-text-secondary">Your filters:</span>
                {owned.map(uf => (
                  <span key={uf.filterType} className={`text-[10px] px-2 py-0.5 rounded-full ${uf.color}`}>
                    {uf.label}{uf.filter.bandwidthNm <= 30 ? ` ${uf.filter.bandwidthNm}nm` : ''}
                  </span>
                ))}
                {(() => {
                  const score = calculateEnhancedFilterScore(recFilters, userFilters, moonIllum);
                  const scoreColor = score >= 80 ? 'text-emerald-300' : score >= 50 ? 'text-yellow-300' : 'text-red-300';
                  return <span className={`text-[10px] ${scoreColor} ml-1`}>⚡{score}%</span>;
                })()}
              </div>
            );
          })()}

          {selectedTarget.commonNames.length > 0 && (
            <div className="text-sm text-text-secondary">Also known as: {selectedTarget.commonNames.join(', ')}</div>
          )}

          {/* Start Project button */}
          {onStartProject && (
            <button
              onClick={() => onStartProject(selectedTarget)}
              className="mt-3 w-full py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 flex items-center justify-center gap-2 transition-colors"
            >
              📋 Start Project for this Target
            </button>
          )}

          {/* Framing & Exposure Analysis */}
          {framingMap[selectedTarget.id] && (() => {
            const f = framingMap[selectedTarget.id];
            const fitBarColors: Record<string, string> = { perfect: 'bg-green-500', good: 'bg-blue-500', tight: 'bg-yellow-500', too_large: 'bg-red-500', unknown: 'bg-slate-500' };
            return (
              <div className={`mt-3 p-4 rounded-xl border ${FIT_COLORS[f.fitStatus]}`}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-text">📐 Framing & Exposure — {f.rigName}</h4>
                  <span className="text-sm font-medium">{FIT_LABELS[f.fitStatus]}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="bg-background p-3 rounded-lg border border-border">
                    <span className="text-text-secondary text-xs block mb-1">FOV</span>
                    <span className="font-mono font-bold text-text">{(f.fovWidth ?? 0).toFixed(1)}' × {(f.fovHeight ?? 0).toFixed(1)}'</span>
                  </div>
                  <div className="bg-background p-3 rounded-lg border border-border">
                    <span className="text-text-secondary text-xs block mb-1">Pixel Scale</span>
                    <span className="font-mono font-bold text-text">{f.pixelScale}"/px</span>
                  </div>
                  <div className="bg-background p-3 rounded-lg border border-border">
                    <span className="text-text-secondary text-xs block mb-1">Eff. Focal / f</span>
                    <span className="font-mono font-bold text-text">{f.effectiveFocalLength}mm f/{f.fRatio}</span>
                  </div>
                  {f.targetSizeArcmin != null && f.targetSizeArcmin > 0 && (
                    <div className="bg-background p-3 rounded-lg border border-border">
                      <span className="text-text-secondary text-xs block mb-1">Target / FOV</span>
                      <span className="font-mono font-bold text-text">{(f.targetSizeArcmin ?? 0).toFixed(0)}' / {Math.max(f.fovWidth ?? 0, f.fovHeight ?? 0).toFixed(0)}'</span>
                    </div>
                  )}
                </div>
                {f.coveragePercent != null && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
                      <span>FOV Coverage</span><span className="font-mono">{(f.coveragePercent ?? 0).toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-2 bg-background rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${fitBarColors[f.fitStatus]}`} style={{ width: `${Math.min(100, f.coveragePercent)}%` }} />
                    </div>
                  </div>
                )}
                <div className="text-xs text-text-secondary mt-2">{f.fitDescription}</div>
                {f.totalImagingHours > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <h5 className="text-xs font-semibold text-text-secondary mb-2">📷 Imaging Plan Tonight</h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-background p-2 rounded-lg border border-border">
                        <span className="text-text-secondary text-[10px] block mb-0.5">Imaging Window</span>
                        <span className="font-mono text-sm font-bold text-text">⏱ {(f.totalImagingHours ?? 0).toFixed(1)}h</span>
                      </div>
                      <div className="bg-background p-2 rounded-lg border border-border">
                        <span className="text-text-secondary text-[10px] block mb-0.5">Sub-exposure</span>
                        <span className="font-mono text-sm font-bold text-text">{f.subExposure}s</span>
                      </div>
                      <div className="bg-background p-2 rounded-lg border border-border">
                        <span className="text-text-secondary text-[10px] block mb-0.5">Total Exposures</span>
                        <span className="font-mono text-sm font-bold text-text">{f.totalExposures}</span>
                      </div>
                      <div className="bg-background p-2 rounded-lg border border-border">
                        <span className="text-text-secondary text-[10px] block mb-0.5">Integration / SNR</span>
                        <span className="font-mono text-sm font-bold text-text">{(f.totalIntegrationHours ?? 0).toFixed(1)}h ({f.snrEstimate ?? '—'})</span>
                      </div>
                    </div>
                    {f.imagingWindows.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {f.imagingWindows.map((w, i) => (
                          <div key={i} className="flex items-center justify-between text-[10px] text-text-secondary bg-background p-1.5 rounded">
                            <span className="font-mono">{w.start} → {w.end}</span>
                            <span className="font-mono">{(w.hours ?? 0).toFixed(1)}h</span>
                            {w.moonIllumination != null && <span className="font-mono">🌑 {((w.moonIllumination ?? 0) * 100).toFixed(0)}% {w.moonDistance != null ? `${(w.moonDistance ?? 0).toFixed(0)}°` : ''}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default TargetExplorerView;