import React, { useState, useMemo } from 'react';
import { EquipmentProfile, ObservationTarget } from '../types';
import { Star, Plus, Trash2, Edit2, Camera, Aperture, Telescope, Layers, ChevronDown, ChevronUp } from 'lucide-react';

interface EquipmentV2ViewProps {
  equipment: EquipmentProfile[];
  onAddEquipment: (eq: EquipmentProfile) => void;
  onUpdateEquipment: (eq: EquipmentProfile) => void;
  onDeleteEquipment: (id: string) => void;
}

const EMPTY_EQUIPMENT: EquipmentProfile = {
  id: '',
  name: '',
  category: 'Telescope',
  brand: '',
  model: '',
  specs: '',
  description: '',
  rating: 0,
  isPersonal: true,
};

function calculateFOV(eq: EquipmentProfile): { fovWidth: number; fovHeight: number; pixelScale: number } | null {
  if (!eq.focalLength || !eq.sensorWidth || !eq.sensorHeight || !eq.pixelSize) return null;
  const fovW = (eq.sensorWidth / eq.focalLength) * 57.3 * 60; // arcmin
  const fovH = (eq.sensorHeight / eq.focalLength) * 57.3 * 60;
  const pxScale = (eq.pixelSize / eq.focalLength) * 206.265;
  return { fovWidth: fovW, fovHeight: fovH, pixelScale: pxScale };
}

export function EquipmentV2View({ equipment, onAddEquipment, onUpdateEquipment, onDeleteEquipment }: EquipmentV2ViewProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EquipmentProfile>(EMPTY_EQUIPMENT);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fovResult = useMemo(() => calculateFOV(form), [form]);

  const startEdit = (eq: EquipmentProfile) => {
    setForm(eq);
    setEditingId(eq.id);
    setIsFormOpen(true);
  };

  const resetForm = () => {
    setForm(EMPTY_EQUIPMENT);
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...form };
    if (fovResult) {
      data.fovWidth = fovResult.fovWidth;
      data.fovHeight = fovResult.fovHeight;
      data.pixelScale = fovResult.pixelScale;
    }
    if (editingId) {
      onUpdateEquipment(data);
    } else {
      data.id = crypto.randomUUID();
      onAddEquipment(data);
    }
    resetForm();
  };

  const categoryIcon = (cat: string) => {
    switch(cat) {
      case 'Telescope': return <Telescope className="w-4 h-4" />;
      case 'Camera': return <Camera className="w-4 h-4" />;
      case 'Filter': return <Layers className="w-4 h-4" />;
      default: return <Aperture className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Équipement</h2>
        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          {isFormOpen ? 'Annuler' : 'Ajouter'}
        </button>
      </div>

      {isFormOpen && (
        <form onSubmit={handleSubmit} className="bg-[#1a2238] border border-blue-900/30 rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Nom *"
              value={form.name}
              onChange={e => setForm({...form, name: e.target.value})}
              className="bg-[#0a0f1a] border border-blue-900/30 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              required
            />
            <select
              value={form.category}
              onChange={e => setForm({...form, category: e.target.value as any})}
              className="bg-[#0a0f1a] border border-blue-900/30 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
            >
              {['Telescope', 'Camera', 'Mount', 'Filter', 'Accessory', 'Software'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input type="text" placeholder="Marque" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} className="bg-[#0a0f1a] border border-blue-900/30 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none" />
            <input type="text" placeholder="Modèle" value={form.model} onChange={e => setForm({...form, model: e.target.value})} className="bg-[#0a0f1a] border border-blue-900/30 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none" />
            <input type="number" placeholder="Focale (mm)" value={form.focalLength || ''} onChange={e => setForm({...form, focalLength: Number(e.target.value)})} className="bg-[#0a0f1a] border border-blue-900/30 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none" />
            <input type="number" placeholder="Ouverture (mm)" value={form.aperture || ''} onChange={e => setForm({...form, aperture: Number(e.target.value)})} className="bg-[#0a0f1a] border border-blue-900/30 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none" />
            <input type="number" placeholder="Taille capteur X (mm)" value={form.sensorWidth || ''} onChange={e => setForm({...form, sensorWidth: Number(e.target.value)})} className="bg-[#0a0f1a] border border-blue-900/30 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none" />
            <input type="number" placeholder="Taille capteur Y (mm)" value={form.sensorHeight || ''} onChange={e => setForm({...form, sensorHeight: Number(e.target.value)})} className="bg-[#0a0f1a] border border-blue-900/30 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none" />
            <input type="number" step="0.1" placeholder="Taille pixel (µm)" value={form.pixelSize || ''} onChange={e => setForm({...form, pixelSize: Number(e.target.value)})} className="bg-[#0a0f1a] border border-blue-900/30 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none" />
            <input type="number" placeholder="Note 1-5" min="0" max="5" value={form.rating || ''} onChange={e => setForm({...form, rating: Number(e.target.value)})} className="bg-[#0a0f1a] border border-blue-900/30 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none" />
          </div>
          <textarea placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} className="w-full bg-[#0a0f1a] border border-blue-900/30 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none" />
          <textarea placeholder="Spécifications techniques" value={form.specs} onChange={e => setForm({...form, specs: e.target.value})} rows={2} className="w-full bg-[#0a0f1a] border border-blue-900/30 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none" />

          {fovResult && (
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <h4 className="text-blue-400 font-semibold mb-2">📐 Champ de Vision (FOV)</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><span className="text-gray-400">Largeur:</span> <span className="text-white font-mono">{fovResult.fovWidth.toFixed(1)}′</span></div>
                <div><span className="text-gray-400">Hauteur:</span> <span className="text-white font-mono">{fovResult.fovHeight.toFixed(1)}′</span></div>
                <div><span className="text-gray-400">Échelle:</span> <span className="text-white font-mono">{fovResult.pixelScale.toFixed(2)}″/px</span></div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg transition-all">{editingId ? 'Mettre à jour' : 'Ajouter'}</button>
            <button type="button" onClick={resetForm} className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-all">Annuler</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {equipment.map(eq => (
          <div key={eq.id} className="bg-[#1a2238] border border-blue-900/30 rounded-xl p-4 hover:border-blue-500/50 transition-all cursor-pointer" onClick={() => setExpandedId(expandedId === eq.id ? null : eq.id)}>
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                {categoryIcon(eq.category)}
                <span className="text-blue-400 text-sm">{eq.category}</span>
              </div>
              <div className="flex gap-1">
                <button onClick={e => { e.stopPropagation(); startEdit(eq); }} className="p-1 hover:bg-blue-900/30 rounded transition-colors"><Edit2 className="w-4 h-4 text-blue-400" /></button>
                <button onClick={e => { e.stopPropagation(); onDeleteEquipment(eq.id); }} className="p-1 hover:bg-red-900/30 rounded transition-colors"><Trash2 className="w-4 h-4 text-red-400" /></button>
              </div>
            </div>
            <h3 className="text-white font-semibold">{eq.name}</h3>
            <p className="text-gray-400 text-sm">{eq.brand} {eq.model}</p>
            {eq.rating > 0 && (
              <div className="flex items-center gap-1 mt-2">
                {Array.from({length: 5}).map((_, i) => (
                  <Star key={i} className={`w-4 h-4 ${i < eq.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />
                ))}
              </div>
            )}
            {expandedId === eq.id && (
              <div className="mt-4 pt-4 border-t border-blue-900/30 space-y-2 text-sm">
                {eq.focalLength && <div><span className="text-gray-400">Focale:</span> <span className="text-white">{eq.focalLength}mm</span></div>}
                {eq.aperture && <div><span className="text-gray-400">Ouverture:</span> <span className="text-white">{eq.aperture}mm</span></div>}
                {eq.sensorWidth && <div><span className="text-gray-400">Capteur:</span> <span className="text-white">{eq.sensorWidth}×{eq.sensorHeight}mm</span></div>}
                {eq.pixelSize && <div><span className="text-gray-400">Pixel:</span> <span className="text-white">{eq.pixelSize}µm</span></div>}
                {eq.fovWidth && (
                  <div className="bg-blue-900/20 rounded p-2 mt-2">
                    <span className="text-blue-400 font-semibold">FOV:</span> <span className="text-white font-mono">{eq.fovWidth.toFixed(1)}′ × {eq.fovHeight?.toFixed(1)}′</span>
                    <span className="text-gray-400 ml-2">| Échelle:</span> <span className="text-white font-mono">{eq.pixelScale?.toFixed(2)}″/px</span>
                  </div>
                )}
                {eq.description && <p className="text-gray-400 mt-2">{eq.description}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
