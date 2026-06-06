// ============================================================================
// FiltersView — Astro Filter Management (CRUD)
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  AstroFilter,
  FilterCategory,
  FILTER_CATEGORY_LABELS,
  FILTER_CATEGORY_ICONS,
} from '../src/types/filter';
import {
  fetchFilters,
  createFilter,
  updateFilter,
  deleteFilter,
  getFilterExposureFactor,
} from '../src/services/filterService';
import {
  Plus, Trash2, Edit3, X, Check, AlertTriangle, Moon, Sun, Filter,
} from 'lucide-react';

const COLOR_OPTIONS = [
  { value: '#F44336', label: 'Red (Hα)' },
  { value: '#00BCD4', label: 'Cyan (OIII)' },
  { value: '#9C27B0', label: 'Purple (SII)' },
  { value: '#7C4DFF', label: 'Violet (Dual-band)' },
  { value: '#4FC3F7', label: 'Blue (Broadband)' },
  { value: '#FF9800', label: 'Orange (LPS)' },
  { value: '#4CAF50', label: 'Green (RGB)' },
  { value: '#E0E0E0', label: 'White (Luminance)' },
  { value: '#FFEB3B', label: 'Yellow (Special)' },
];

const BRAND_OPTIONS = [
  'ZWO', 'Baader', 'Optolong', 'IDAS', 'Astronomik', 'Chroma', 'Custom', 'Generic',
];

const EMPTY_FILTER: Omit<AstroFilter, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '',
  brand: 'ZWO',
  category: 'narrowband',
  bandwidthNm: 7,
  peakTransmission: 0.90,
  centerWavelengthNm: 656.3,
  skySuppression: 0.95,
  moonCompatible: true,
  color: '#F44336',
  description: '',
  useCases: [],
  recommendedTargets: [],
  owned: true,
  isDefault: false,
};

export const FiltersView: React.FC = () => {
  const [filters, setFilters] = useState<AstroFilter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editForm, setEditForm] = useState<Omit<AstroFilter, 'id' | 'createdAt' | 'updatedAt'>>(EMPTY_FILTER);
  const [filterCategory, setFilterCategory] = useState<FilterCategory | 'all'>('all');

  useEffect(() => {
    loadFilters();
  }, []);

  const loadFilters = async () => {
    setIsLoading(true);
    try {
      const data = await fetchFilters();
      setFilters(data);
    } catch (err) {
      console.error('Failed to load filters', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredFilters = filterCategory === 'all'
    ? filters
    : filters.filter(f => f.category === filterCategory);

  const handleSave = async () => {
    if (!editForm.name.trim()) return;

    if (isCreating) {
      const newFilter = await createFilter(editForm);
      setFilters(prev => [...prev, newFilter]);
    } else if (editingId) {
      const updated = await updateFilter(editingId, editForm);
      setFilters(prev => prev.map(f => f.id === editingId ? updated : f));
    }
    setEditingId(null);
    setIsCreating(false);
    setEditForm(EMPTY_FILTER);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this filter?')) return;
    await deleteFilter(id);
    setFilters(prev => prev.filter(f => f.id !== id));
  };

  const handleEdit = (filter: AstroFilter) => {
    setEditingId(filter.id);
    setIsCreating(false);
    setEditForm({
      name: filter.name,
      brand: filter.brand,
      category: filter.category,
      bandwidthNm: filter.bandwidthNm,
      peakTransmission: filter.peakTransmission,
      centerWavelengthNm: filter.centerWavelengthNm,
      skySuppression: filter.skySuppression,
      moonCompatible: filter.moonCompatible,
      color: filter.color,
      description: filter.description,
      useCases: filter.useCases,
      recommendedTargets: filter.recommendedTargets,
      owned: filter.owned,
      isDefault: filter.isDefault,
    });
  };

  const handleCreate = () => {
    setEditingId(null);
    setIsCreating(true);
    setEditForm(EMPTY_FILTER);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsCreating(false);
    setEditForm(EMPTY_FILTER);
  };

  const categoryOrder: FilterCategory[] = ['narrowband', 'dualband', 'broadband', 'anti_pollution', 'special'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">🔲 Filters</h1>
          <p className="mt-1 text-text-secondary text-sm">Manage your astro filters — bandwidth, transmission, and exposure impact</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} /> Add Filter
        </button>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterCategory('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterCategory === 'all' ? 'bg-primary text-white' : 'bg-surface border border-border hover:border-primary/50'}`}
        >
          All ({filters.length})
        </button>
        {categoryOrder.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterCategory === cat ? 'bg-primary text-white' : 'bg-surface border border-border hover:border-primary/50'}`}
          >
            {FILTER_CATEGORY_ICONS[cat]} {FILTER_CATEGORY_LABELS[cat]} ({filters.filter(f => f.category === cat).length})
          </button>
        ))}
      </div>

      {/* Create/Edit form */}
      {(isCreating || editingId) && (
        <div className="bg-surface border border-primary/30 rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-text flex items-center gap-2">
            {isCreating ? '🆕 New Filter' : '✏️ Edit Filter'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-text-secondary block mb-1">Name *</label>
              <input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Hα 7nm" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Brand</label>
              <select value={editForm.brand} onChange={e => setEditForm({ ...editForm, brand: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary">
                {BRAND_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Category</label>
              <select value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value as FilterCategory })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary">
                {categoryOrder.map(cat => <option key={cat} value={cat}>{FILTER_CATEGORY_ICONS[cat]} {FILTER_CATEGORY_LABELS[cat]}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-text-secondary block mb-1">Bandwidth (nm) *</label>
              <input type="number" step="0.5" value={editForm.bandwidthNm} onChange={e => setEditForm({ ...editForm, bandwidthNm: parseFloat(e.target.value) || 0 })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Peak Transmission (%)</label>
              <input type="number" step="0.05" min="0" max="1" value={editForm.peakTransmission}
                onChange={e => setEditForm({ ...editForm, peakTransmission: parseFloat(e.target.value) || 0 })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Center λ (nm)</label>
              <input type="number" step="0.1" value={editForm.centerWavelengthNm}
                onChange={e => setEditForm({ ...editForm, centerWavelengthNm: parseFloat(e.target.value) || 0 })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Sky Suppression (0-1)</label>
              <input type="number" step="0.05" min="0" max="1" value={editForm.skySuppression}
                onChange={e => setEditForm({ ...editForm, skySuppression: parseFloat(e.target.value) || 0 })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary" />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-text-secondary block mb-1">Color</label>
              <select value={editForm.color} onChange={e => setEditForm({ ...editForm, color: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary">
                {COLOR_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 cursor-pointer bg-background border border-border rounded-lg px-3 py-2 text-sm">
                <input type="checkbox" checked={editForm.moonCompatible}
                  onChange={e => setEditForm({ ...editForm, moonCompatible: e.target.checked })} />
                <span className="text-text">🌙 Moon OK</span>
              </label>
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 cursor-pointer bg-background border border-border rounded-lg px-3 py-2 text-sm">
                <input type="checkbox" checked={editForm.owned}
                  onChange={e => setEditForm({ ...editForm, owned: e.target.checked })} />
                <span className="text-text">📦 Owned</span>
              </label>
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 cursor-pointer bg-background border border-border rounded-lg px-3 py-2 text-sm">
                <input type="checkbox" checked={editForm.isDefault}
                  onChange={e => setEditForm({ ...editForm, isDefault: e.target.checked })} />
                <span className="text-text">⭐ Default</span>
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs text-text-secondary block mb-1">Description</label>
            <input type="text" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })}
              placeholder="Short description of the filter..." className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary" />
          </div>

          {/* Exposure impact preview */}
          <div className="bg-background border border-border rounded-lg p-4">
            <h4 className="text-xs text-text-secondary font-semibold mb-2">📸 Exposure Impact Preview</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-text-secondary">Exposure factor</span>
                <div className="font-mono font-bold text-text text-lg">{getFilterExposureFactor(editForm as AstroFilter).toFixed(1)}×</div>
                <span className="text-[10px] text-text-secondary">vs broadband reference</span>
              </div>
              <div>
                <span className="text-text-secondary">Light throughput</span>
                <div className="font-mono font-bold text-text text-lg">{(editForm.peakTransmission * 100).toFixed(0)}%</div>
                <span className="text-[10px] text-text-secondary">at center wavelength</span>
              </div>
              <div>
                <span className="text-text-secondary">Moon benefit</span>
                <div className="font-mono font-bold text-text text-lg">{editForm.moonCompatible ? '✅ Yes' : '❌ No'}</div>
                <span className="text-[10px] text-text-secondary">sky suppression: {(editForm.skySuppression * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={!editForm.name.trim() || editForm.bandwidthNm <= 0}
              className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-1">
              <Check size={14} /> Save
            </button>
            <button onClick={cancelEdit} className="px-4 py-2 bg-surface-secondary text-text-secondary rounded-lg text-sm font-medium hover:bg-surface">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filter cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredFilters.length === 0 ? (
        <div className="text-center py-16 text-text-secondary">
          <Filter className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg">No filters in this category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFilters.map(filter => {
            const exposureFactor = getFilterExposureFactor(filter);
            const isEditing = editingId === filter.id;

            return (
              <div key={filter.id} className={`bg-surface border rounded-xl p-4 transition-all ${isEditing ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border hover:border-primary/30'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: filter.color }} />
                    <div>
                      <h3 className="font-semibold text-text">{filter.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-text-secondary">
                        <span>{filter.brand}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          filter.category === 'narrowband' ? 'bg-red-500/20 text-red-300' :
                          filter.category === 'dualband' ? 'bg-purple-500/20 text-purple-300' :
                          filter.category === 'broadband' ? 'bg-blue-500/20 text-blue-300' :
                          filter.category === 'anti_pollution' ? 'bg-orange-500/20 text-orange-300' :
                          'bg-surface-secondary text-text-secondary'
                        }`}>{FILTER_CATEGORY_LABELS[filter.category]}</span>
                        {filter.owned && <span className="text-[10px]">📦</span>}
                        {filter.isDefault && <span className="text-[10px]">⭐</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(filter)} className="p-1.5 text-text-secondary hover:text-primary transition-colors">
                      <Edit3 size={14} />
                    </button>
                    <button onClick={() => handleDelete(filter.id)} className="p-1.5 text-text-secondary hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Bandwidth visualization */}
                <div className="bg-background rounded-lg p-3 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-text-secondary">Spectral Bandwidth</span>
                    <span className="font-mono text-sm font-bold text-text">{filter.bandwidthNm} nm</span>
                  </div>
                  {/* Spectrum bar — visible rainbow background with blocked regions dimmed */}
                  <div className="relative h-10 rounded-lg overflow-hidden" style={{ background: 'linear-gradient(to right, #380036, #4400a8, #0044ff, #00ccff, #00ff44, #ccff00, #ffaa00, #ff2200, #660000)' }}>
                    {/* Blocked overlays */}
                    <div className="absolute top-0 bottom-0 left-0 bg-black/70" style={{ width: `${Math.max(0, ((filter.centerWavelengthNm - filter.bandwidthNm / 2) - 400) / 300 * 100)}%` }} />
                    <div className="absolute top-0 bottom-0 right-0 bg-black/70" style={{ width: `${Math.max(0, (700 - (filter.centerWavelengthNm + filter.bandwidthNm / 2)) / 300 * 100)}%` }} />
                    {/* Passband highlight */}
                    <div
                      className="absolute top-1 bottom-1 rounded-md"
                      style={{
                        left: `${((filter.centerWavelengthNm - filter.bandwidthNm / 2) - 400) / 300 * 100}%`,
                        width: `${(filter.bandwidthNm / 300) * 100}%`,
                        backgroundColor: filter.color,
                        opacity: 0.9,
                        boxShadow: `0 0 8px ${filter.color}80, 0 0 20px ${filter.color}40`,
                        border: '2px solid rgba(255,255,255,0.7)',
                      }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[10px] font-mono font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{filter.bandwidthNm}nm</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between text-[10px] text-text-secondary mt-1.5 font-mono">
                    <span>400nm</span>
                    <span className="text-text">{filter.centerWavelengthNm}nm λ<sub>c</sub></span>
                    <span>700nm</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-background rounded-lg p-2 text-center">
                    <div className="font-mono font-bold text-text">{(filter.peakTransmission * 100).toFixed(0)}%</div>
                    <div className="text-text-secondary">Transmission</div>
                  </div>
                  <div className="bg-background rounded-lg p-2 text-center">
                    <div className="font-mono font-bold text-text">{exposureFactor.toFixed(1)}×</div>
                    <div className="text-text-secondary">Exp. Factor</div>
                  </div>
                  <div className="bg-background rounded-lg p-2 text-center">
                    <div className="font-mono font-bold text-text">{(filter.skySuppression * 100).toFixed(0)}%</div>
                    <div className="text-text-secondary">Sky Block</div>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mt-3">
                  {filter.moonCompatible && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 flex items-center gap-1">
                      <Moon size={10} /> Moon OK
                    </span>
                  )}
                  {filter.useCases.slice(0, 3).map((uc, i) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-surface-secondary text-text-secondary">{uc}</span>
                  ))}
                </div>

                {filter.description && (
                  <p className="text-xs text-text-secondary mt-2">{filter.description}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FiltersView;