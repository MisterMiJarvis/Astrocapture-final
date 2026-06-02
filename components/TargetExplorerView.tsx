// ============================================================================
// COMPONENT : TargetExplorerView — Deep-sky target search with Telescopius
// AstroSuite — Full filter support, visibility-aware, equipment-aware
// ============================================================================

import React, { useState, useCallback, useEffect } from 'react';
import {
  searchTargets,
  getDefaultFilters,
  TargetSearchFilters,
  TelescopiusTarget,
  OBJECT_TYPES,
  TargetSearchResult,
  calculateFraming,
  FramingAnalysis,
  RigInfo,
} from '../src/services/targetExplorerService';
import { Search, Filter, X, ChevronLeft, ChevronRight, Star, MapPin, Moon, Eye, SlidersHorizontal, RotateCw } from 'lucide-react';

interface TargetExplorerProps {
  locationSource: 'current' | 'saintEtienne' | 'pradelles';
  onLocationChange: (source: 'current' | 'saintEtienne' | 'pradelles') => void;
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
  gxy: 'Galaxy', neb: 'Nebula', opcl: 'Open Cluster', plnb: 'Planetary Nebula',
  snrm: 'SNR', gxycl: 'Galaxy Cluster', stcl: 'Star Cluster',
};

export const TargetExplorerView: React.FC<TargetExplorerProps> = ({ locationSource, onLocationChange }) => {
  const [results, setResults] = useState<TargetSearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<TelescopiusTarget | null>(null);
  const [defaultRig, setDefaultRig] = useState<RigInfo | null>(null);
  const [framingMap, setFramingMap] = useState<Record<string, FramingAnalysis>>({});

  const [filters, setFilters] = useState<TargetSearchFilters>(() => {
    const coords = LOCATION_COORDS[locationSource] || LOCATION_COORDS.saintEtienne;
    return getDefaultFilters(coords.lat, coords.lon);
  });

  // Load default rig on mount
  useEffect(() => {
    fetch('/api/apls/rigs')
      .then(r => r.json())
      .then((rigs: any[]) => {
        const def = rigs.find((r: any) => r.isDefault);
        if (def) {
          setDefaultRig({
            name: def.name,
            focalLength: def.telescope?.focalLength || 0,
            aperture: def.telescope?.aperture || 0,
            fRatio: def.telescope?.fRatio || 0,
            sensorWidth: def.imagingCamera?.sensorWidth || 0,
            sensorHeight: def.imagingCamera?.sensorHeight || 0,
            pixelSize: def.imagingCamera?.pixelSize || 0,
          });
        }
      })
      .catch(() => {});
  }, []);

  // Recalculate framing when results or rig change
  useEffect(() => {
    if (!results || !defaultRig) return;
    const map: Record<string, FramingAnalysis> = {};
    for (const t of results.targets) {
      map[t.id] = calculateFraming(t, defaultRig);
    }
    setFramingMap(map);
  }, [results, defaultRig]);

  // Update filters when location changes
  useEffect(() => {
    const coords = LOCATION_COORDS[locationSource] || LOCATION_COORDS.saintEtienne;
    setFilters(prev => ({ ...prev, lat: coords.lat, lon: coords.lon }));
  }, [locationSource]);

  const handleSearch = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await searchTargets(filters);
      setResults(result);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Initial search on mount
  useEffect(() => {
    handleSearch();
  }, []);

  const updateFilter = useCallback((key: keyof TargetSearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value === '' ? undefined : value }));
  }, []);

  const clearFilters = useCallback(() => {
    const coords = LOCATION_COORDS[locationSource] || LOCATION_COORDS.saintEtienne;
    setFilters(getDefaultFilters(coords.lat, coords.lon));
  }, [locationSource]);

  const changePage = useCallback((delta: number) => {
    setFilters(prev => ({ ...prev, page: Math.max(1, (prev.page || 1) + delta) }));
  }, []);

  // Trigger search when page changes
  useEffect(() => {
    if (results && filters.page !== results.page) {
      handleSearch();
    }
  }, [filters.page]);

  const activeFilterCount = Object.entries(filters).filter(
    ([k, v]) => v !== undefined && v !== '' && !['lat', 'lon', 'timezone', 'resultsPerPage'].includes(k)
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">🎯 Target Explorer</h1>
            <p className="mt-1 text-text-secondary text-sm">Search deep-sky objects with Telescopius</p>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-text-secondary" />
            <select
              value={locationSource}
              onChange={(e) => onLocationChange(e.target.value as any)}
              className="text-sm bg-blue-900/40 border border-blue-700/50 rounded-lg px-3 py-1.5 text-blue-100"
            >
              <option value="saintEtienne">St-Étienne-du-Grès</option>
              <option value="pradelles">Pradelles</option>
            </select>
          </div>
        </div>
      </div>

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
            {/* Type */}
            <div>
              <label className="text-xs text-text-secondary block mb-1">Object Type</label>
              <select
                value={filters.types || ''}
                onChange={(e) => updateFilter('types', e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text"
              >
                {OBJECT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Constellation */}
            <div>
              <label className="text-xs text-text-secondary block mb-1">Constellation</label>
              <select
                value={filters.constellation || ''}
                onChange={(e) => updateFilter('constellation', e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text"
              >
                <option value="">All</option>
                {['And','Aql','Aqr','Ari','Aur','Boo','Cam','Cap','Cas','Cen','Cep','Cet','CMa','CMi','Cnc','Com','Crb','Crv','Cyg','Del','Dra','Gem','Her','Hya','Leo','Lep','Lib','Lmi','Lup','Lyn','Lyr','Mon','Oph','Ori','Peg','Per','Psc','Pup','Sco','Sgr','Tau','Tri','UMa','UMi','Vel','Vir','Vul'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Min altitude */}
            <div>
              <label className="text-xs text-text-secondary block mb-1">Min Altitude (°)</label>
              <input
                type="number"
                value={filters.minAlt ?? ''}
                onChange={(e) => updateFilter('minAlt', e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text"
                placeholder="30"
              />
            </div>

            {/* Min altitude duration */}
            <div>
              <label className="text-xs text-text-secondary block mb-1">Min Duration (min)</label>
              <input
                type="number"
                value={filters.minAltMinutes ?? ''}
                onChange={(e) => updateFilter('minAltMinutes', e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text"
                placeholder="120"
              />
            </div>

            {/* Magnitude range */}
            <div>
              <label className="text-xs text-text-secondary block mb-1">Mag Min</label>
              <input
                type="number"
                step="0.5"
                value={filters.magMin ?? ''}
                onChange={(e) => updateFilter('magMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text"
                placeholder="e.g. 4"
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Mag Max</label>
              <input
                type="number"
                step="0.5"
                value={filters.magMax ?? ''}
                onChange={(e) => updateFilter('magMax', e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text"
                placeholder="e.g. 12"
              />
            </div>

            {/* Angular size */}
            <div>
              <label className="text-xs text-text-secondary block mb-1">Size Min (')</label>
              <input
                type="number"
                value={filters.sizeMin ?? ''}
                onChange={(e) => updateFilter('sizeMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text"
                placeholder="arcmin"
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Size Max (')</label>
              <input
                type="number"
                value={filters.sizeMax ?? ''}
                onChange={(e) => updateFilter('sizeMax', e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text"
                placeholder="arcmin"
              />
            </div>

            {/* Moon distance */}
            <div>
              <label className="text-xs text-text-secondary block mb-1">Moon Dist Min (°)</label>
              <input
                type="number"
                value={filters.moonDistMin ?? ''}
                onChange={(e) => updateFilter('moonDistMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text"
                placeholder="30"
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Moon Dist Max (°)</label>
              <input
                type="number"
                value={filters.moonDistMax ?? ''}
                onChange={(e) => updateFilter('moonDistMax', e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text"
                placeholder="180"
              />
            </div>

            {/* Surface brightness */}
            <div>
              <label className="text-xs text-text-secondary block mb-1">Surface Br. Min</label>
              <input
                type="number"
                step="0.5"
                value={filters.subrMin ?? ''}
                onChange={(e) => updateFilter('subrMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text"
                placeholder="mag/arcsec²"
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Surface Br. Max</label>
              <input
                type="number"
                step="0.5"
                value={filters.subrMax ?? ''}
                onChange={(e) => updateFilter('subrMax', e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text"
                placeholder="mag/arcsec²"
              />
            </div>
          </div>

          <button
            onClick={handleSearch}
            className="w-full py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors"
          >
            Apply Filters
          </button>
        </div>
      )}

      {/* Results info */}
      {results && (
        <div className="flex items-center justify-between text-sm text-text-secondary">
          <span>
            {results.total} target{results.total !== 1 ? 's' : ''} found
            {results.source === 'local_fallback' && ' (local fallback)'}
          </span>
          {results.total > 0 && (
            <span>Page {results.page} · {results.perPage} per page</span>
          )}
        </div>
      )}

      {/* Results grid */}
      {isLoading && !results && (
        <div className="flex items-center justify-center py-20">
          <RotateCw className="w-8 h-8 text-primary animate-spin" />
        </div>
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
          {results.targets.map(target => (
            <div
              key={target.id}
              onClick={() => setSelectedTarget(selectedTarget?.id === target.id ? null : target)}
              className={`group rounded-xl border overflow-hidden cursor-pointer transition-all hover:shadow-lg ${
                selectedTarget?.id === target.id
                  ? 'border-primary ring-2 ring-primary/30'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              {/* Image / Emoji header */}
              <div className="h-28 bg-slate-800 flex items-center justify-center relative">
                {target.imageUrl ? (
                  <img src={target.imageUrl} alt={target.mainName} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <span className="text-4xl">{TYPE_EMOJIS[target.type] || '🔭'}</span>
                )}
                {/* Altitude badge */}
                {target.altitudeMax != null && (
                  <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full font-mono">
                    ↑{target.altitudeMax.toFixed(0)}°
                  </div>
                )}
                {/* Moon separation */}
                {target.moonSeparation != null && (
                  <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
                    <Moon size={10} /> {target.moonSeparation.toFixed(0)}°
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-3">
                <div className="font-semibold text-sm text-text truncate">{target.mainName}</div>
                {target.mainId !== target.mainName && (
                  <div className="text-xs text-text-secondary truncate">{target.mainId}</div>
                )}

                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${TYPE_COLORS[target.type] || TYPE_COLORS.Unknown}`}>
                    {TYPE_LABELS[target.type] || target.type.replace('_', ' ')}
                  </span>
                  {target.constellation && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                      {target.constellation}
                    </span>
                  )}
                  {target.magnitude != null && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-300 font-mono">
                      mag {target.magnitude.toFixed(1)}
                    </span>
                  )}
                  {target.sizeArcmin != null && target.sizeArcmin > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-300 font-mono">
                      {target.sizeArcmin.toFixed(0)}'
                    </span>
                  )}
                </div>

                {/* Framing indicator */}
                {framingMap[target.id] && (() => {
                  const f = framingMap[target.id];
                  const fitColors: Record<string, string> = {
                    perfect: 'bg-green-500/30 text-green-300',
                    good: 'bg-blue-500/30 text-blue-300',
                    tight: 'bg-yellow-500/30 text-yellow-300',
                    too_large: 'bg-red-500/30 text-red-300',
                    unknown: 'bg-slate-500/30 text-slate-300',
                  };
                  const fitIcons: Record<string, string> = {
                    perfect: '✅', good: '👍', tight: '⚠️', too_large: '❌', unknown: '❓',
                  };
                  return (
                    <div className="mt-2 pt-2 border-t border-border/50">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${fitColors[f.fitStatus]}`}>
                          {fitIcons[f.fitStatus]} {f.fitStatus === 'too_large' ? 'Mosaic' : f.fitStatus === 'perfect' ? 'Perfect' : f.fitStatus === 'good' ? 'Good' : f.fitStatus === 'tight' ? 'Tight' : '?'}
                        </span>
                        {f.totalImagingHours > 0 && (
                          <span className="text-[10px] text-text-secondary font-mono">
                            ⏱ {f.totalImagingHours.toFixed(1)}h
                          </span>
                        )}
                      </div>
                      {f.totalExposures > 0 && (
                        <div className="text-[9px] text-text-secondary mt-1 font-mono">
                          {f.subExposure}s × {f.totalExposures} = {f.totalIntegrationHours.toFixed(1)}h int.
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected target detail */}
      {selectedTarget && (
        <div className="bg-surface border border-primary/50 rounded-xl p-5 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-display font-bold text-text">
              {TYPE_EMOJIS[selectedTarget.type] || '🔭'} {selectedTarget.mainName}
            </h3>
            <button onClick={() => setSelectedTarget(null)} className="text-text-secondary hover:text-text">
              <X size={18} />
            </button>
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
              <span className="font-bold text-text">{TYPE_LABELS[selectedTarget.type] || selectedTarget.type.replace('_', ' ')}</span>
            </div>
            <div className="bg-background p-3 rounded-lg border border-border">
              <span className="text-text-secondary text-xs block mb-1">Constellation</span>
              <span className="font-bold text-text">{selectedTarget.constellation || '—'}</span>
            </div>
            {selectedTarget.magnitude != null && (
              <div className="bg-background p-3 rounded-lg border border-border">
                <span className="text-text-secondary text-xs block mb-1">Magnitude</span>
                <span className="font-mono font-bold text-text">{selectedTarget.magnitude.toFixed(1)}</span>
              </div>
            )}
            {selectedTarget.sizeArcmin != null && selectedTarget.sizeArcmin > 0 && (
              <div className="bg-background p-3 rounded-lg border border-border">
                <span className="text-text-secondary text-xs block mb-1">Size</span>
                <span className="font-mono font-bold text-text">{selectedTarget.sizeArcmin.toFixed(1)}'</span>
              </div>
            )}
            {selectedTarget.surfaceBrightness != null && (
              <div className="bg-background p-3 rounded-lg border border-border">
                <span className="text-text-secondary text-xs block mb-1">Surface Br.</span>
                <span className="font-mono font-bold text-text">{selectedTarget.surfaceBrightness.toFixed(1)}</span>
              </div>
            )}
            {selectedTarget.altitudeMax != null && (
              <div className="bg-background p-3 rounded-lg border border-border">
                <span className="text-text-secondary text-xs block mb-1">Max Altitude</span>
                <span className="font-mono font-bold text-text">{selectedTarget.altitudeMax.toFixed(1)}°</span>
              </div>
            )}
            <div className="bg-background p-3 rounded-lg border border-border">
              <span className="text-text-secondary text-xs block mb-1">Coordinates</span>
              <span className="font-mono text-xs text-text">{selectedTarget.ra} / {selectedTarget.dec}</span>
            </div>
          </div>
          {selectedTarget.commonNames.length > 0 && (
            <div className="text-sm text-text-secondary">
              Also known as: {selectedTarget.commonNames.join(', ')}
            </div>
          )}

          {/* Framing & Exposure Analysis */}
          {framingMap[selectedTarget.id] && (() => {
            const f = framingMap[selectedTarget.id];
            const fitColors: Record<string, string> = {
              perfect: 'border-green-500/50 bg-green-500/5',
              good: 'border-blue-500/50 bg-blue-500/5',
              tight: 'border-yellow-500/50 bg-yellow-500/5',
              too_large: 'border-red-500/50 bg-red-500/5',
              unknown: 'border-slate-500/50 bg-slate-500/5',
            };
            const fitLabels: Record<string, string> = {
              perfect: '✅ Perfect Fit', good: '👍 Good Fit', tight: '⚠️ Tight Fit', too_large: '❌ Mosaic Required', unknown: '❓ Unknown',
            };
            const fitBarColors: Record<string, string> = {
              perfect: 'bg-green-500', good: 'bg-blue-500', tight: 'bg-yellow-500', too_large: 'bg-red-500', unknown: 'bg-slate-500',
            };

            return (
              <div className={`mt-3 p-4 rounded-xl border ${fitColors[f.fitStatus]}`}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-text">📐 Framing & Exposure — {f.rigName}</h4>
                  <span className="text-sm font-medium">{fitLabels[f.fitStatus]}</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="bg-background p-3 rounded-lg border border-border">
                    <span className="text-text-secondary text-xs block mb-1">FOV</span>
                    <span className="font-mono font-bold text-text">{f.fovWidth.toFixed(1)}' × {f.fovHeight.toFixed(1)}'</span>
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
                      <span className="font-mono font-bold text-text">{f.targetSizeArcmin.toFixed(0)}' / {Math.max(f.fovWidth, f.fovHeight).toFixed(0)}'</span>
                    </div>
                  )}
                </div>

                {/* Coverage bar */}
                {f.coveragePercent != null && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
                      <span>FOV Coverage</span>
                      <span className="font-mono">{f.coveragePercent.toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-2 bg-background rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${fitBarColors[f.fitStatus]}`}
                        style={{ width: `${Math.min(100, f.coveragePercent)}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="text-xs text-text-secondary mt-2">{f.fitDescription}</div>

                {/* Imaging plan */}
                {f.totalImagingHours > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <h5 className="text-xs font-semibold text-text-secondary mb-2">📷 Imaging Plan Tonight</h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-background p-2 rounded-lg border border-border">
                        <span className="text-text-secondary text-[10px] block mb-0.5">Imaging Window</span>
                        <span className="font-mono text-sm font-bold text-text">⏱ {f.totalImagingHours.toFixed(1)}h</span>
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
                        <span className="font-mono text-sm font-bold text-text">{f.totalIntegrationHours.toFixed(1)}h ({f.snrEstimate})</span>
                      </div>
                    </div>

                    {/* Imaging windows detail */}
                    {f.imagingWindows.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {f.imagingWindows.map((w, i) => (
                          <div key={i} className="flex items-center justify-between text-[10px] text-text-secondary bg-background p-1.5 rounded">
                            <span className="font-mono">{w.start} → {w.end}</span>
                            <span className="font-mono">{w.hours.toFixed(1)}h</span>
                            {w.moonIllumination != null && (
                              <span className="font-mono">🌑 {w.moonIllumination.toFixed(0)}% {w.moonDistance != null ? `${w.moonDistance.toFixed(0)}°` : ''}</span>
                            )}
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

      {/* Pagination */}
      {results && results.total > results.perPage && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => changePage(-1)}
            disabled={filters.page === 1}
            className="px-4 py-2 rounded-lg border border-border text-sm text-text-secondary hover:text-text disabled:opacity-30 flex items-center gap-1"
          >
            <ChevronLeft size={16} /> Previous
          </button>
          <span className="text-sm text-text-secondary">Page {filters.page || 1}</span>
          <button
            onClick={() => changePage(1)}
            disabled={(filters.page || 1) * results.perPage >= results.total}
            className="px-4 py-2 rounded-lg border border-border text-sm text-text-secondary hover:text-text disabled:opacity-30 flex items-center gap-1"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default TargetExplorerView;