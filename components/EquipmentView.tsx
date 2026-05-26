import React, { useState } from 'react';
import { Camera, Aperture, Trash2, Edit2, Calculator, Plus } from 'lucide-react';
import { Card } from './Shared';

// Equipment Management View — CRUD + FOV Calculator

export interface EquipmentItemData {
  id: string;
  name: string;
  category: 'Telescope' | 'Camera' | 'Mount' | 'Filter' | 'Accessory';
  brand?: string;
  model?: string;
  focalLength?: number;
  aperture?: number;
  fRatio?: number;
  telescopeType?: string;
  sensorWidth?: number;
  sensorHeight?: number;
  pixelSize?: number;
  resolution?: string;
  cameraType?: string;
  mountType?: string;
  payloadCapacity?: number;
  filterType?: string;
  bandwidth?: number;
  wavelength?: number;
  imageUrl?: string;
  notes?: string;
  isDefault?: boolean;
}

export interface FOVResult {
  widthArcmin: number;
  heightArcmin: number;
  widthDegrees: number;
  heightDegrees: number;
  pixelScale: number;
  diagonalArcmin: number;
}

export function calculateFOV(
  focalLength: number,
  sensorWidth: number,
  sensorHeight: number,
  pixelSize: number
): FOVResult {
  const widthArcmin = (sensorWidth / focalLength) * 3438;
  const heightArcmin = (sensorHeight / focalLength) * 3438;
  const pixelScale = (pixelSize / focalLength) * 206.265;
  const diagonalArcmin = Math.sqrt(widthArcmin ** 2 + heightArcmin ** 2);
  return {
    widthArcmin,
    heightArcmin,
    widthDegrees: widthArcmin / 60,
    heightDegrees: heightArcmin / 60,
    pixelScale,
    diagonalArcmin,
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  Telescope: 'Télescope',
  Camera: 'Caméra',
  Mount: 'Monture',
  Filter: 'Filtre',
  Accessory: 'Accessoire',
};

const EquipmentCard: React.FC<{
  item: EquipmentItemData;
  onEdit: () => void;
  onDelete: () => void;
  onCalculateFOV: () => void;
}> = ({ item, onEdit, onDelete, onCalculateFOV }) => {
  const specs: string[] = [];
  if (item.focalLength) specs.push(`${item.focalLength}mm`);
  if (item.aperture && item.focalLength) specs.push(`f/${(item.focalLength / item.aperture).toFixed(1)}`);
  if (item.sensorWidth && item.sensorHeight) specs.push(`${item.sensorWidth}×${item.sensorHeight}mm`);
  if (item.pixelSize) specs.push(`${item.pixelSize}µm`);
  if (item.mountType) specs.push(item.mountType);
  if (item.filterType) specs.push(item.filterType);

  return (
    <Card className="group relative overflow-hidden hover:border-[rgba(59,130,246,0.3)] transition-all duration-200">
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-lg bg-[#1a2238] border border-[rgba(148,163,184,0.12)] flex-shrink-0 flex items-center justify-center overflow-hidden">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <Camera className="w-6 h-6 text-[#8e9aaf]" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-[#e8eaf6] font-semibold text-sm truncate">{item.name}</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#1a2238] text-[#8e9aaf] border border-[rgba(148,163,184,0.12)]">
              {CATEGORY_LABELS[item.category] || item.category}
            </span>
          </div>
          <p className="text-[#8e9aaf] text-xs mb-2">{item.brand} {item.model}</p>
          {specs.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {specs.map((s, i) => (
                <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-[#0a0f1a] text-[#8e9aaf]">{s}</span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {item.category === 'Telescope' && (
          <button onClick={onCalculateFOV} className="p-1.5 rounded-md bg-[#1a2238] text-[#3b82f6] hover:bg-[#3b82f6] hover:text-white transition-colors" title="Calculer FOV">
            <Calculator className="w-3.5 h-3.5" />
          </button>
        )}
        <button onClick={onEdit} className="p-1.5 rounded-md bg-[#1a2238] text-[#8e9aaf] hover:text-[#e8eaf6] transition-colors" title="Modifier">
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDelete} className="p-1.5 rounded-md bg-[#1a2238] text-[#8e9aaf] hover:text-[#EF4444] transition-colors" title="Supprimer">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </Card>
  );
};

const FOVModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  item: EquipmentItemData | null;
}> = ({ isOpen, onClose, item }) => {
  if (!isOpen || !item) return null;

  const [sensorW, setSensorW] = useState(item.sensorWidth || 36);
  const [sensorH, setSensorH] = useState(item.sensorHeight || 24);
  const [pixelSize, setPixelSize] = useState(item.pixelSize || 3.76);
  const [focalLength, setFocalLength] = useState(item.focalLength || 400);

  const fov = calculateFOV(focalLength, sensorW, sensorH, pixelSize);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#0a0f1a] border border-[rgba(148,163,184,0.12)] rounded-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-[#e8eaf6] font-semibold mb-4 flex items-center gap-2">
          <Aperture className="w-5 h-5 text-[#3b82f6]" />
          Calculateur FOV — {item.name}
        </h3>

        <div className="space-y-3 mb-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[#8e9aaf] text-xs mb-1 block">Focale (mm)</label>
              <input type="number" value={focalLength} onChange={e => setFocalLength(Number(e.target.value))}
                className="w-full bg-[#1a2238] border border-[rgba(148,163,184,0.12)] rounded-lg px-3 py-2 text-[#e8eaf6] text-sm focus:border-[#3b82f6] focus:outline-none" />
            </div>
            <div>
              <label className="text-[#8e9aaf] text-xs mb-1 block">Taille pixel (µm)</label>
              <input type="number" value={pixelSize} onChange={e => setPixelSize(Number(e.target.value))}
                className="w-full bg-[#1a2238] border border-[rgba(148,163,184,0.12)] rounded-lg px-3 py-2 text-[#e8eaf6] text-sm focus:border-[#3b82f6] focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[#8e9aaf] text-xs mb-1 block">Capteur W (mm)</label>
              <input type="number" value={sensorW} onChange={e => setSensorW(Number(e.target.value))}
                className="w-full bg-[#1a2238] border border-[rgba(148,163,184,0.12)] rounded-lg px-3 py-2 text-[#e8eaf6] text-sm focus:border-[#3b82f6] focus:outline-none" />
            </div>
            <div>
              <label className="text-[#8e9aaf] text-xs mb-1 block">Capteur H (mm)</label>
              <input type="number" value={sensorH} onChange={e => setSensorH(Number(e.target.value))}
                className="w-full bg-[#1a2238] border border-[rgba(148,163,184,0.12)] rounded-lg px-3 py-2 text-[#e8eaf6] text-sm focus:border-[#3b82f6] focus:outline-none" />
            </div>
          </div>
        </div>

        <div className="bg-[#1a2238] rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[#8e9aaf]">Champ (l×h)</span>
            <span className="text-[#e8eaf6] font-mono">{fov.widthArcmin.toFixed(1)}′ × {fov.heightArcmin.toFixed(1)}′</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#8e9aaf]">Champ (degrés)</span>
            <span className="text-[#e8eaf6] font-mono">{fov.widthDegrees.toFixed(2)}° × {fov.heightDegrees.toFixed(2)}°</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#8e9aaf]">Échelle pixel</span>
            <span className="text-[#e8eaf6] font-mono">{fov.pixelScale.toFixed(2)}″/px</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#8e9aaf]">Diagonale</span>
            <span className="text-[#e8eaf6] font-mono">{fov.diagonalArcmin.toFixed(1)}′</span>
          </div>
        </div>

        <button onClick={onClose} className="mt-4 w-full py-2.5 bg-[#3b82f6] text-white rounded-lg font-medium hover:bg-[#60A5FA] transition-colors">
          Fermer
        </button>
      </div>
    </div>
  );
};

const EquipmentView: React.FC = () => {
  const [items, setItems] = useState<EquipmentItemData[]>([
    { id: '1', name: 'RedCat 51', category: 'Telescope', brand: 'William Optics', focalLength: 250, aperture: 51, fRatio: 4.9, telescopeType: 'Refractor', imageUrl: '' },
    { id: '2', name: 'ASI2600MM Pro', category: 'Camera', brand: 'ZWO', sensorWidth: 23.5, sensorHeight: 15.6, pixelSize: 3.76, resolution: '2600x2600', cameraType: 'Cooled CMOS', imageUrl: '' },
  ]);
  const [editingItem, setEditingItem] = useState<EquipmentItemData | null>(null);
  const [fovItem, setFovItem] = useState<EquipmentItemData | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleSave = (item: EquipmentItemData) => {
    if (editingItem) {
      setItems(prev => prev.map(i => i.id === item.id ? item : i));
    } else {
      setItems(prev => [...prev, { ...item, id: Date.now().toString() }]);
    }
    setShowForm(false);
    setEditingItem(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Supprimer cet équipement ?')) {
      setItems(prev => prev.filter(i => i.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-[#e8eaf6] p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Matériel</h2>
          <button onClick={() => { setEditingItem(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#3b82f6] text-white rounded-lg font-medium hover:bg-[#60A5FA] transition-colors">
            <Plus className="w-4 h-4" /> Ajouter
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(item => (
            <EquipmentCard key={item.id} item={item}
              onEdit={() => { setEditingItem(item); setShowForm(true); }}
              onDelete={() => handleDelete(item.id)}
              onCalculateFOV={() => setFovItem(item)} />
          ))}
        </div>

        {items.length === 0 && (
          <div className="text-center py-16 text-[#8e9aaf]">
            <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Aucun équipement enregistré</p>
          </div>
        )}
      </div>

      <FOVModal isOpen={!!fovItem} onClose={() => setFovItem(null)} item={fovItem} />
    </div>
  );
};
export default EquipmentView;
