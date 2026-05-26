import React, { useState } from 'react';
import { PageHeader, Container, Card, Button, IconButton, Badge, Modal, Input, Select, EmptyState } from '../components';
import { NAV_ITEMS } from '../Navbar';

// --- Equipment Management View Wireframe ---
// Implements: Equipment Management (CRUD) + FOV Calculator

export interface EquipmentItemData {
  id: string;
  name: string;
  category: 'Telescope' | 'Camera' | 'Mount' | 'Filter' | 'Accessory';
  brand?: string;
  model?: string;
  // Telescope
  focalLength?: number;      // mm
  aperture?: number;         // mm
  fRatio?: number;
  telescopeType?: 'Refractor' | 'Reflector' | 'Catadioptric' | 'Other';
  // Camera
  sensorWidth?: number;      // mm
  sensorHeight?: number;     // mm
  pixelSize?: number;        // micrometers
  resolution?: string;       // e.g. "3008x3008"
  cameraType?: 'Cooled CCD' | 'DSLR' | 'Mirrorless' | 'Planetary';
  // Mount
  mountType?: 'EQ' | 'Alt-Az' | 'Dobsonian';
  payloadCapacity?: number;   // kg
  // Filter
  filterType?: 'Broadband' | 'Narrowband' | 'OIII' | 'Ha' | 'SII' | 'LRGB' | 'Other';
  bandwidth?: number;        // nm
  wavelength?: number;       // nm (peak)
  // General
  imageUrl?: string;
  notes?: string;
  isDefault?: boolean;
}

export interface FOVResult {
  widthArcmin: number;
  heightArcmin: number;
  widthDegrees: number;
  heightDegrees: number;
  pixelScale: number;        // arcsec/pixel
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

// --- Components ---

const EquipmentCard: React.FC<{
  item: EquipmentItemData;
  onEdit: () => void;
  onDelete: () => void;
  onCalculateFOV: () => void;
}> = ({ item, onEdit, onDelete, onCalculateFOV }) => {
  const categoryColors: Record<string, string> = {
    Telescope: 'primary',
    Camera: 'accent',
    Mount: 'info',
    Filter: 'warning',
    Accessory: 'default',
  } as const;

  const specs = [];
  if (item.focalLength) specs.push(`${item.focalLength}mm`);
  if (item.aperture) specs.push(`f/${(item.focalLength! / item.aperture).toFixed(1)}`);
  if (item.sensorWidth) specs.push(`${item.sensorWidth}×${item.sensorHeight}mm`);
  if (item.pixelSize) specs.push(`${item.pixelSize}µm`);
  if (item.mountType) specs.push(item.mountType);
  if (item.filterType) specs.push(item.filterType);

  return (
    <Card variant="elevated" className="group relative overflow-hidden">
      <div className="flex items-start gap-4">
        {/* Image / Icon */}
        <div className="w-16 h-16 rounded-[10px] bg-[#111827] border border-[rgba(148,163,184,0.12)] flex-shrink-0 flex items-center justify-center overflow-hidden">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {item.category === 'Telescope' && <><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></>}
              {item.category === 'Camera' && <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></>}
              {item.category === 'Mount' && <><circle cx="12" cy="5" r="3"/><path d="M12 8v12M8 20h8"/></>}
              {item.category === 'Filter' && <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/></>}
              {item.category === 'Accessory' && <><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/></>}
            </svg>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-semibold text-[#e8eaf6] truncate">{item.name}</h3>
            {item.isDefault && <Badge variant="primary">Default</Badge>}
          </div>
          <Badge variant={categoryColors[item.category] as any || 'default'}>{item.category}</Badge>
          {specs.length > 0 && (
            <p className="mt-2 text-xs text-[#6b7280] font-mono">{specs.join(' · ')}</p>
          )}
          {item.notes && (
            <p className="mt-1.5 text-xs text-[#8e9aaf] line-clamp-2">{item.notes}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {(item.focalLength && item.sensorWidth) && (
            <IconButton
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg>}
              label="Calculate FOV"
              variant="ghost"
              onClick={onCalculateFOV}
            />
          )}
          <IconButton
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>}
            label="Edit"
            variant="ghost"
            onClick={onEdit}
          />
          <IconButton
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>}
            label="Delete"
            variant="danger"
            onClick={onDelete}
          />
        </div>
      </div>
    </Card>
  );
};

const FOVResultPanel: React.FC<{ result: FOVResult }> = ({ result }) => (
  <div className="mt-4 p-4 bg-[rgba(59,130,246,0.08)] border border-[rgba(59,130,246,0.2)] rounded-[10px]">
    <h4 className="text-sm font-semibold text-[#3B82F6] mb-3 font-[Space_Grotesk]">Field of View</h4>
    <div className="grid grid-cols-2 gap-3">
      <div className="text-center">
        <div className="text-2xl font-bold text-[#e8eaf6] font-mono">{result.widthArcmin.toFixed(1)}′</div>
        <div className="text-xs text-[#8e9aaf]">Width</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-[#e8eaf6] font-mono">{result.heightArcmin.toFixed(1)}′</div>
        <div className="text-xs text-[#8e9aaf]">Height</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-[#e8eaf6] font-mono">{result.pixelScale.toFixed(2)}″</div>
        <div className="text-xs text-[#8e9aaf]">Pixel Scale</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-[#e8eaf6] font-mono">{result.diagonalArcmin.toFixed(1)}′</div>
        <div className="text-xs text-[#8e9aaf]">Diagonal</div>
      </div>
    </div>
    <div className="mt-3 pt-3 border-t border-[rgba(59,130,246,0.15)] text-center">
      <span className="text-xs text-[#8e9aaf]">
        {result.widthDegrees.toFixed(2)}° × {result.heightDegrees.toFixed(2)}°
      </span>
    </div>
  </div>
);

const EquipmentForm: React.FC<{
  item?: EquipmentItemData;
  onSave: (item: EquipmentItemData) => void;
  onCancel: () => void;
}> = ({ item, onSave, onCancel }) => {
  const [form, setForm] = useState<EquipmentItemData>(item || {
    id: crypto.randomUUID(),
    name: '',
    category: 'Telescope',
  });

  const handleChange = (field: keyof EquipmentItemData, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const categories = ['Telescope', 'Camera', 'Mount', 'Filter', 'Accessory'] as const;

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div>
        <h3 className="text-sm font-semibold text-[#8e9aaf] uppercase tracking-wider mb-3">Basic Info</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Name *"
            value={form.name}
            onChange={e => handleChange('name', e.target.value)}
            placeholder="e.g. William Optics ZenithStar 61"
          />
          <Select
            label="Category *"
            value={form.category}
            onChange={e => handleChange('category', e.target.value)}
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Input
            label="Brand"
            value={form.brand || ''}
            onChange={e => handleChange('brand', e.target.value)}
            placeholder="e.g. William Optics"
          />
          <Input
            label="Model"
            value={form.model || ''}
            onChange={e => handleChange('model', e.target.value)}
            placeholder="e.g. ZenithStar 61"
          />
        </div>
      </div>

      {/* Telescope Specs */}
      {form.category === 'Telescope' && (
        <div>
          <h3 className="text-sm font-semibold text-[#8e9aaf] uppercase tracking-wider mb-3">Telescope Specs</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Focal Length (mm)"
              type="number"
              value={form.focalLength || ''}
              onChange={e => handleChange('focalLength', parseFloat(e.target.value) || undefined)}
              placeholder="360"
            />
            <Input
              label="Aperture (mm)"
              type="number"
              value={form.aperture || ''}
              onChange={e => handleChange('aperture', parseFloat(e.target.value) || undefined)}
              placeholder="61"
            />
            <Input
              label="f/ Ratio"
              type="number"
              step="0.1"
              value={form.fRatio || ''}
              onChange={e => handleChange('fRatio', parseFloat(e.target.value) || undefined)}
              placeholder="5.9"
            />
          </div>
          <Select
            label="Telescope Type"
            value={form.telescopeType || ''}
            onChange={e => handleChange('telescopeType', e.target.value || undefined)}
            className="mt-4"
          >
            <option value="">Select type...</option>
            <option value="Refractor">Refractor</option>
            <option value="Reflector">Reflector</option>
            <option value="Catadioptric">Catadioptric</option>
            <option value="Other">Other</option>
          </Select>
        </div>
      )}

      {/* Camera Specs */}
      {form.category === 'Camera' && (
        <div>
          <h3 className="text-sm font-semibold text-[#8e9aaf] uppercase tracking-wider mb-3">Camera Specs</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Sensor Width (mm)"
              type="number"
              step="0.1"
              value={form.sensorWidth || ''}
              onChange={e => handleChange('sensorWidth', parseFloat(e.target.value) || undefined)}
              placeholder="22.3"
            />
            <Input
              label="Sensor Height (mm)"
              type="number"
              step="0.1"
              value={form.sensorHeight || ''}
              onChange={e => handleChange('sensorHeight', parseFloat(e.target.value) || undefined)}
              placeholder="14.9"
            />
            <Input
              label="Pixel Size (µm)"
              type="number"
              step="0.1"
              value={form.pixelSize || ''}
              onChange={e => handleChange('pixelSize', parseFloat(e.target.value) || undefined)}
              placeholder="3.76"
            />
            <Input
              label="Resolution"
              value={form.resolution || ''}
              onChange={e => handleChange('resolution', e.target.value)}
              placeholder="e.g. 3008×3008"
            />
          </div>
          <Select
            label="Camera Type"
            value={form.cameraType || ''}
            onChange={e => handleChange('cameraType', e.target.value || undefined)}
            className="mt-4"
          >
            <option value="">Select type...</option>
            <option value="Cooled CCD">Cooled CCD</option>
            <option value="DSLR">DSLR</option>
            <option value="Mirrorless">Mirrorless</option>
            <option value="Planetary">Planetary</option>
          </Select>
        </div>
      )}

      {/* Mount Specs */}
      {form.category === 'Mount' && (
        <div>
          <h3 className="text-sm font-semibold text-[#8e9aaf] uppercase tracking-wider mb-3">Mount Specs</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Mount Type"
              value={form.mountType || ''}
              onChange={e => handleChange('mountType', e.target.value || undefined)}
            >
              <option value="">Select type...</option>
              <option value="EQ">Equatorial (EQ)</option>
              <option value="Alt-Az">Alt-Azimuth</option>
              <option value="Dobsonian">Dobsonian</option>
            </Select>
            <Input
              label="Payload Capacity (kg)"
              type="number"
              value={form.payloadCapacity || ''}
              onChange={e => handleChange('payloadCapacity', parseFloat(e.target.value) || undefined)}
              placeholder="5"
            />
          </div>
        </div>
      )}

      {/* Filter Specs */}
      {form.category === 'Filter' && (
        <div>
          <h3 className="text-sm font-semibold text-[#8e9aaf] uppercase tracking-wider mb-3">Filter Specs</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Filter Type"
              value={form.filterType || ''}
              onChange={e => handleChange('filterType', e.target.value || undefined)}
            >
              <option value="">Select type...</option>
              <option value="Broadband">Broadband</option>
              <option value="Narrowband">Narrowband</option>
              <option value="OIII">OIII</option>
              <option value="Ha">Hα</option>
              <option value="SII">SII</option>
              <option value="LRGB">LRGB</option>
              <option value="Other">Other</option>
            </Select>
            <Input
              label="Bandwidth (nm)"
              type="number"
              value={form.bandwidth || ''}
              onChange={e => handleChange('bandwidth', parseFloat(e.target.value) || undefined)}
              placeholder="7"
            />
            <Input
              label="Wavelength (nm)"
              type="number"
              value={form.wavelength || ''}
              onChange={e => handleChange('wavelength', parseFloat(e.target.value) || undefined)}
              placeholder="500"
            />
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <h3 className="text-sm font-semibold text-[#8e9aaf] uppercase tracking-wider mb-3">Notes</h3>
        <textarea
          className="w-full bg-[#0a0f1a] border border-[rgba(148,163,184,0.12)] rounded-[10px] px-4 py-2.5 text-sm text-[#e8eaf6] placeholder-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[rgba(59,130,246,0.25)] focus:border-[#3B82F6] min-h-[80px] resize-y"
          value={form.notes || ''}
          onChange={e => handleChange('notes', e.target.value)}
          placeholder="Additional notes..."
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-[rgba(148,163,184,0.12)]">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(form)}>Save Equipment</Button>
      </div>
    </div>
  );
};

// --- Main View ---

export const EquipmentView: React.FC = () => {
  const [items, setItems] = useState<EquipmentItemData[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<EquipmentItemData | undefined>();
  const [fovResult, setFovResult] = useState<FOVResult | null>(null);
  const [showFOV, setShowFOV] = useState(false);

  const handleSave = (item: EquipmentItemData) => {
    if (editingItem) {
      setItems(prev => prev.map(i => i.id === item.id ? item : i));
    } else {
      setItems(prev => [...prev, item]);
    }
    setShowForm(false);
    setEditingItem(undefined);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure? This cannot be undone.')) {
      setItems(prev => prev.filter(i => i.id !== id));
    }
  };

  const handleCalculateFOV = (item: EquipmentItemData) => {
    if (item.focalLength && item.sensorWidth && item.sensorHeight && item.pixelSize) {
      const result = calculateFOV(item.focalLength, item.sensorWidth, item.sensorHeight, item.pixelSize);
      setFovResult(result);
      setShowFOV(true);
    }
  };

  const telescopes = items.filter(i => i.category === 'Telescope');
  const cameras = items.filter(i => i.category === 'Camera');
  const others = items.filter(i => !['Telescope', 'Camera'].includes(i.category));

  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      <Container>
        <PageHeader
          title="My Equipment"
          subtitle="Manage your astrophotography gear and calculate FOV"
          actions={
            <Button onClick={() => { setEditingItem(undefined); setShowForm(true); }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Equipment
            </Button>
          }
        />

        {items.length === 0 ? (
          <EmptyState
            icon={
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
            }
            title="No equipment yet"
            description="Add your first telescope or camera to start calculating FOV and planning sessions."
            action={
              <Button onClick={() => { setEditingItem(undefined); setShowForm(true); }}>
                Add Equipment
              </Button>
            }
          />
        ) : (
          <div className="space-y-8 pb-12">
            {/* Telescopes */}
            {telescopes.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold font-[Space_Grotesk] text-[#e8eaf6] mb-4">Telescopes</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {telescopes.map(item => (
                    <EquipmentCard
                      key={item.id}
                      item={item}
                      onEdit={() => { setEditingItem(item); setShowForm(true); }}
                      onDelete={() => handleDelete(item.id)}
                      onCalculateFOV={() => handleCalculateFOV(item)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Cameras */}
            {cameras.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold font-[Space_Grotesk] text-[#e8eaf6] mb-4">Cameras</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {cameras.map(item => (
                    <EquipmentCard
                      key={item.id}
                      item={item}
                      onEdit={() => { setEditingItem(item); setShowForm(true); }}
                      onDelete={() => handleDelete(item.id)}
                      onCalculateFOV={() => handleCalculateFOV(item)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Other */}
            {others.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold font-[Space_Grotesk] text-[#e8eaf6] mb-4">Other Gear</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {others.map(item => (
                    <EquipmentCard
                      key={item.id}
                      item={item}
                      onEdit={() => { setEditingItem(item); setShowForm(true); }}
                      onDelete={() => handleDelete(item.id)}
                      onCalculateFOV={() => handleCalculateFOV(item)}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </Container>

      {/* Equipment Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingItem ? 'Edit Equipment' : 'Add Equipment'}
        size="lg"
      >
        <EquipmentForm
          item={editingItem}
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
        />
      </Modal>

      {/* FOV Result Modal */}
      <Modal
        isOpen={showFOV}
        onClose={() => setShowFOV(false)}
        title="Field of View"
        size="sm"
      >
        {fovResult && <FOVResultPanel result={fovResult} />}
      </Modal>
    </div>
  );
};

export default EquipmentView;
