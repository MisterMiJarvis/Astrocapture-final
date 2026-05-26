import React, { useState } from 'react';
import { AstroEquipment } from '../types';
import { Button, Input, Select, TextArea, ImageUploader } from './Shared';
import { Plus, Trash2, Save, ChevronDown, ChevronRight, Camera, Radio, Mountain, Filter, Wrench, Monitor, Star, Eye, EyeOff, Target } from 'lucide-react';
import { calculateFOV, calculateImageScale, getSetupFOV } from '../services/equipmentService';

interface EquipmentTrackerFormProps {
    initialData: AstroEquipment[];
    onSave: (data: AstroEquipment[]) => void;
    isSaving: boolean;
}

const CATEGORY_OPTIONS = [
    { value: 'Telescope', label: '🔭 Telescope' },
    { value: 'Camera', label: '📸 Camera' },
    { value: 'Mount', label: '⚙️ Mount' },
    { value: 'Filter', label: '🔲 Filter' },
    { value: 'Accessory', label: '🔧 Accessory' },
    { value: 'Software', label: '💻 Software' },
];

const TELESCOPE_TYPES = ['Refractor', 'Reflector (Newtonian)', 'Catadioptric (SCT)', 'Catadioptric (CDK)', 'Ritchey-Chrétien', 'Dall-Kirkham', 'Other'];
const CAMERA_TYPES = ['Cooled Color CMOS', 'Cooled Mono CMOS', 'Cooled CCD', 'DSLR', 'Mirrorless', 'Planetary Camera', 'Guide Camera', 'Other'];

const CategoryIcon: React.FC<{ category: string; size?: number }> = ({ category, size = 18 }) => {
    switch (category) {
        case 'Telescope': return <Radio size={size} />;
        case 'Camera': return <Camera size={size} />;
        case 'Mount': return <Mountain size={size} />;
        case 'Filter': return <Filter size={size} />;
        case 'Accessory': return <Wrench size={size} />;
        case 'Software': return <Monitor size={size} />;
        default: return <Star size={size} />;
    }
};

const EquipmentTrackerForm: React.FC<EquipmentTrackerFormProps> = ({ initialData, onSave, isSaving }) => {
    const [items, setItems] = useState<AstroEquipment[]>(initialData || []);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const setupInfo = getSetupFOV(items);

    const handleAddItem = () => {
        const newItem: AstroEquipment = {
            id: Date.now().toString(),
            name: 'New Equipment',
            category: 'Telescope',
            imageUrl: '',
            specs: '',
            description: '',
            rating: 5,
            isPersonal: true,
        };
        setItems([...items, newItem]);
        setExpandedId(newItem.id);
    };

    const handleRemoveItem = (id: string) => {
        if (window.confirm('Remove this equipment?')) {
            setItems(items.filter(i => i.id !== id));
        }
    };

    const handleChange = (id: string, field: keyof AstroEquipment, value: any) => {
        setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const toggleExpanded = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const personalItems = items.filter(i => i.isPersonal);
    const remoteItems = items.filter(i => !i.isPersonal);

    const renderItem = (item: AstroEquipment) => {
        const isExpanded = expandedId === item.id;

        return (
            <div key={item.id} className="border border-border rounded-lg overflow-hidden mb-2">
                <div
                    className="flex items-center gap-3 p-3 cursor-pointer hover:bg-surface-light transition-colors"
                    onClick={() => toggleExpanded(item.id)}
                >
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <CategoryIcon category={item.category} />
                    <span className="flex-1 font-medium truncate">{item.name}</span>
                    <span className="text-xs text-text-secondary px-2 py-0.5 rounded bg-primary/10">{item.category}</span>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleChange(item.id, 'isPersonal', !item.isPersonal); }}
                        className="p-1 rounded hover:bg-surface-light transition-colors"
                        title={item.isPersonal ? 'Personal equipment' : 'Shared/Remote equipment'}
                    >
                        {item.isPersonal ? <Eye size={16} className="text-primary" /> : <EyeOff size={16} className="text-text-secondary" />}
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleRemoveItem(item.id); }}
                        className="p-1 rounded hover:bg-red-500/20 text-red-400 transition-colors"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>

                {isExpanded && (
                    <div className="border-t border-border p-4 space-y-3 bg-surface-light/30">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Input label="Name" value={item.name} onChange={e => handleChange(item.id, 'name', e.target.value)} />
                            <Select label="Category" value={item.category} onChange={e => handleChange(item.id, 'category', e.target.value)}
                                options={CATEGORY_OPTIONS} />
                        </div>

                        <TextArea label="Description" value={item.description} onChange={e => handleChange(item.id, 'description', e.target.value)} rows={2} />
                        <TextArea label="Specs" value={item.specs} onChange={e => handleChange(item.id, 'specs', e.target.value)} rows={2} />

                        {/* Telescope-specific fields */}
                        {item.category === 'Telescope' && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-primary/5 rounded-lg">
                                <Input label="Focal Length (mm)" type="number" value={item.focalLength || ''} onChange={e => handleChange(item.id, 'focalLength', parseFloat(e.target.value) || undefined)} />
                                <Input label="Aperture (mm)" type="number" value={item.aperture || ''} onChange={e => handleChange(item.id, 'aperture', parseFloat(e.target.value) || undefined)} />
                                <Input label="f-ratio" type="number" step="0.1" value={item.fRatio || ''} onChange={e => handleChange(item.id, 'fRatio', parseFloat(e.target.value) || undefined)} />
                                <Select label="Type" value={item.telescopeType || ''} onChange={e => handleChange(item.id, 'telescopeType', e.target.value)}
                                    options={[{ value: '', label: '— Select —' }, ...TELESCOPE_TYPES.map(t => ({ value: t, label: t }))]} />
                            </div>
                        )}

                        {/* Camera-specific fields */}
                        {item.category === 'Camera' && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-primary/5 rounded-lg">
                                <Input label="Sensor Width (mm)" type="number" step="0.1" value={item.sensorWidth || ''} onChange={e => handleChange(item.id, 'sensorWidth', parseFloat(e.target.value) || undefined)} />
                                <Input label="Sensor Height (mm)" type="number" step="0.1" value={item.sensorHeight || ''} onChange={e => handleChange(item.id, 'sensorHeight', parseFloat(e.target.value) || undefined)} />
                                <Input label="Pixel Size (µm)" type="number" step="0.01" value={item.pixelSize || ''} onChange={e => handleChange(item.id, 'pixelSize', parseFloat(e.target.value) || undefined)} />
                                <Input label="Resolution" value={item.resolution || ''} onChange={e => handleChange(item.id, 'resolution', e.target.value)} placeholder="e.g. 3008x3008" />
                                <Select label="Type" value={item.cameraType || ''} onChange={e => handleChange(item.id, 'cameraType', e.target.value)}
                                    options={[{ value: '', label: '— Select —' }, ...CAMERA_TYPES.map(t => ({ value: t, label: t }))]} />
                            </div>
                        )}

                        {/* Mount-specific fields */}
                        {item.category === 'Mount' && (
                            <div className="grid grid-cols-2 gap-3 p-3 bg-primary/5 rounded-lg">
                                <Input label="Payload Capacity (kg)" type="number" value={item.payloadCapacity || ''} onChange={e => handleChange(item.id, 'payloadCapacity', parseFloat(e.target.value) || undefined)} />
                                <Input label="Mount Type" value={item.mountType || ''} onChange={e => handleChange(item.id, 'mountType', e.target.value)} />
                            </div>
                        )}

                        {/* Filter-specific fields */}
                        {item.category === 'Filter' && (
                            <div className="grid grid-cols-2 gap-3 p-3 bg-primary/5 rounded-lg">
                                <Input label="Filter Type" value={item.filterType || ''} onChange={e => handleChange(item.id, 'filterType', e.target.value)} placeholder="e.g. Narrowband, Broadband" />
                                <Input label="Bandwidth (nm)" type="number" value={item.bandwidth || ''} onChange={e => handleChange(item.id, 'bandwidth', parseFloat(e.target.value) || undefined)} />
                            </div>
                        )}

                        <div className="flex items-center gap-3">
                            <span className="text-sm text-text-secondary">Rating:</span>
                            {[1, 2, 3, 4, 5].map(star => (
                                <button key={star} onClick={() => handleChange(item.id, 'rating', star)}
                                    className={`text-lg ${star <= item.rating ? 'text-yellow-400' : 'text-gray-600'}`}>
                                    ★
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* FOV Summary Card */}
            {setupInfo.fov && (
                <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
                    <h3 className="text-lg font-display font-bold mb-2 flex items-center gap-2">
                        <Target size={20} className="text-primary" /> Primary Setup FOV
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <span className="text-text-secondary">Telescope</span>
                            <p className="font-bold">{setupInfo.telescope?.name}</p>
                        </div>
                        <div>
                            <span className="text-text-secondary">Camera</span>
                            <p className="font-bold">{setupInfo.camera?.name}</p>
                        </div>
                        <div>
                            <span className="text-text-secondary">Field of View</span>
                            <p className="font-bold">{setupInfo.fov.widthArcmin}' × {setupInfo.fov.heightArcmin}'</p>
                            <p className="text-xs text-text-secondary">({setupInfo.fov.widthDeg}° × {setupInfo.fov.heightDeg}°)</p>
                        </div>
                        {setupInfo.imageScale && (
                            <div>
                                <span className="text-text-secondary">Image Scale</span>
                                <p className="font-bold">{setupInfo.imageScale}"/px</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {!setupInfo.fov && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-sm text-yellow-400">
                    Add a telescope with focal length + camera with sensor size to see your FOV calculation.
                </div>
            )}

            {/* Personal Equipment */}
            <div>
                <h3 className="text-lg font-display font-bold mb-3 flex items-center gap-2">
                    <Eye size={18} /> Personal Equipment
                </h3>
                {personalItems.length === 0 ? (
                    <p className="text-text-secondary text-sm py-2">No personal equipment added yet.</p>
                ) : personalItems.map(renderItem)}
            </div>

            {/* Remote/Shared Equipment */}
            {remoteItems.length > 0 && (
                <div>
                    <h3 className="text-lg font-display font-bold mb-3 flex items-center gap-2">
                        <EyeOff size={18} /> Remote / Shared Equipment
                    </h3>
                    {remoteItems.map(renderItem)}
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3">
                <Button onClick={handleAddItem} variant="outline" className="flex items-center gap-2">
                    <Plus size={16} /> Add Equipment
                </Button>
                <Button onClick={() => onSave(items)} disabled={isSaving} className="flex items-center gap-2">
                    <Save size={16} /> {isSaving ? 'Saving...' : 'Save Equipment'}
                </Button>
            </div>
        </div>
    );
};
export default EquipmentTrackerForm;
