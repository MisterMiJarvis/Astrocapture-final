import React, { useState } from 'react';
import { EquipmentItem } from '../types';
import { Button, Input, TextArea, ImageUploader, DraggableListItem, Select } from './Shared';
import { Plus, Trash2, Save, GripVertical, Sparkles } from 'lucide-react';
import { uploadFile } from '../services/firebase';
import { generateGearSpecs } from '../services/geminiService';

interface GearSettingsFormProps {
  initialData: EquipmentItem[];
  onSave: (data: EquipmentItem[]) => void;
  isSaving: boolean;
}

const GearSettingsForm: React.FC<GearSettingsFormProps> = ({ initialData, onSave, isSaving }) => {
  const [items, setItems] = useState<EquipmentItem[]>(initialData || []);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [generatingSpecsId, setGeneratingSpecsId] = useState<string | null>(null);

  const handleAddItem = () => {
    const newItem: EquipmentItem = {
      id: Date.now().toString(),
      name: 'New Equipment',
      category: 'Other',
      imageUrl: '',
      specs: '',
      description: '',
      rating: 5,
      review: ''
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const handleChange = (id: string, field: keyof EquipmentItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleImageUpload = async (id: string, file: File) => {
    try {
      const url = await uploadFile(file, 'gear');
      handleChange(id, 'imageUrl', url);
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image.");
    }
  };

  const handleGenerateSpecs = async (id: string, name: string) => {
    if (!name || name === 'New Equipment') {
      alert("Please enter a valid equipment name first.");
      return;
    }

    setGeneratingSpecsId(id);
    try {
      const specs = await generateGearSpecs(name);
      handleChange(id, 'specs', specs);
    } catch (error) {
      console.error("Error generating specs:", error);
      alert("Failed to generate specs.");
    } finally {
      setGeneratingSpecsId(null);
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    if (draggedItemIndex === null || draggedItemIndex === index) return;
    const newItems = [...items];
    const draggedItem = newItems[draggedItemIndex];
    newItems.splice(draggedItemIndex, 1);
    newItems.splice(index, 0, draggedItem);
    setDraggedItemIndex(index);
    setItems(newItems);
  };

  const handleDragEnd = () => {
    setDraggedItemIndex(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-display font-bold">Manage Gear Reviews</h2>
        <div className="flex gap-2">
          <Button onClick={handleAddItem} variant="secondary">
            <Plus size={16} /> Add Item
          </Button>
          <Button onClick={() => onSave(items)} isLoading={isSaving}>
            <Save size={16} /> Save Changes
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {items.map((item, index) => (
          <DraggableListItem
            key={item.id}
            index={index}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragEnter={(e) => handleDragEnter(e, index)}
            onDragEnd={handleDragEnd}
          >
            <div className="bg-surface border border-border rounded-lg p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input 
                    label="Name" 
                    value={item.name} 
                    onChange={e => handleChange(item.id, 'name', e.target.value)} 
                  />
                  <Select 
                    label="Category" 
                    value={item.category} 
                    onChange={e => handleChange(item.id, 'category', e.target.value)}
                  >
                    <option value="Camera">Camera</option>
                    <option value="Telescope">Telescope</option>
                    <option value="Mount">Mount</option>
                    <option value="Filter">Filter</option>
                    <option value="Accessory">Accessory</option>
                    <option value="Software">Software</option>
                    <option value="Other">Other</option>
                  </Select>
                </div>
                <button 
                  onClick={() => handleRemoveItem(item.id)}
                  className="text-red-400 hover:text-red-300 p-2"
                  title="Delete Item"
                >
                  <Trash2 size={20} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <ImageUploader 
                    label="Product Image" 
                    currentImageUrl={item.imageUrl} 
                    imageFile={null} 
                    onUrlChange={(url) => handleChange(item.id, 'imageUrl', url)}
                    onFileChange={(file) => file && handleImageUpload(item.id, file)}
                    id={`gear-img-${item.id}`}
                  />
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Rating (0-5)</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="5" 
                      step="0.1"
                      value={item.rating} 
                      onChange={e => handleChange(item.id, 'rating', parseFloat(e.target.value))}
                      className="w-full bg-background border border-border p-2.5 text-text rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="relative">
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-medium text-text-secondary">Specs / Key Features</label>
                      <button
                        onClick={() => handleGenerateSpecs(item.id, item.name)}
                        disabled={generatingSpecsId === item.id}
                        className="text-xs flex items-center gap-1 text-primary hover:text-primary-hover disabled:opacity-50"
                        title="Generate specs from name using AI"
                      >
                        <Sparkles size={12} />
                        {generatingSpecsId === item.id ? 'Generating...' : 'Auto-Fill'}
                      </button>
                    </div>
                    <textarea 
                      value={item.specs} 
                      onChange={e => handleChange(item.id, 'specs', e.target.value)}
                      rows={3}
                      className="w-full bg-background border border-border p-3 text-text rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                    />
                  </div>
                </div>
              </div>

              <TextArea 
                label="Review / Description" 
                value={item.review} 
                onChange={e => handleChange(item.id, 'review', e.target.value)}
                rows={4}
              />
            </div>
          </DraggableListItem>
        ))}

        {items.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-lg text-text-secondary">
            <p>No gear items yet. Click "Add Item" to start.</p>
          </div>
        )}
      </div>
    </div>
  );
};
export default GearSettingsForm;
