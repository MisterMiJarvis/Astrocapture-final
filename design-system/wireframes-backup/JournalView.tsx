import React, { useState } from 'react';
import { PageHeader, Container, Card, Button, Badge, Modal, Input, BottomSheet, EmptyState } from '../components';

// --- Journal de Sessions View Wireframe ---
// Implements: CRUD sessions + notes + gallery

interface JournalEntry {
  id: string;
  targetName: string;
  targetId?: string;
  date: string;
  location?: string;
  equipmentIds: string[];
  integrationTime: number; // hours
  subExposures: number;
  exposureLength: number;    // seconds
  filters: string[];
  conditions: {
    temperature?: number;
    humidity?: number;
    seeing?: string;
    transparency?: string;
  };
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  notes?: string;
  images: string[];
  processingSteps?: string;
  finalImageUrl?: string;
}

const qualityConfig = {
  excellent: { label: 'Excellent', color: 'success' as const },
  good: { label: 'Good', color: 'primary' as const },
  fair: { label: 'Fair', color: 'warning' as const },
  poor: { label: 'Poor', color: 'danger' as const },
};

// --- Components ---

const JournalCard: React.FC<{
  entry: JournalEntry;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ entry, onEdit, onDelete }) => {
  const config = qualityConfig[entry.quality];
  
  return (
    <Card variant="elevated" className="group overflow-hidden">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Thumbnail */}
        <div className="w-full sm:w-32 h-24 sm:h-24 rounded-lg bg-[#0a0f1a] border border-[rgba(148,163,184,0.12)] flex-shrink-0 flex items-center justify-center overflow-hidden">
          {entry.finalImageUrl ? (
            <img src={entry.finalImageUrl} alt={entry.targetName} className="w-full h-full object-cover" />
          ) : entry.images.length > 0 ? (
            <img src={entry.images[0]} alt={entry.targetName} className="w-full h-full object-cover" />
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-semibold text-[#e8eaf6]">{entry.targetName}</h3>
            <Badge variant={config.color}>{config.label}</Badge>
          </div>
          
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#8e9aaf]">
            <span>{entry.date}</span>
            <span>{entry.integrationTime}h integration</span>
            <span>{entry.subExposures} × {entry.exposureLength}s</span>
            {entry.filters.length > 0 && <span>{entry.filters.join(', ')}</span>}
          </div>
          
          {entry.notes && (
            <p className="mt-2 text-sm text-[#8e9aaf] line-clamp-2">{entry.notes}</p>
          )}
          
          {entry.images.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              <span className="text-xs text-[#6b7280]">{entry.images.length} image{entry.images.length > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex sm:flex-col gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-2 rounded-lg text-[#8e9aaf] hover:text-[#e8eaf6] hover:bg-white/5 transition-colors"
            title="Edit"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-lg text-[#EF4444] hover:bg-red-500/10 transition-colors"
            title="Delete"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>
    </Card>
  );
};

const JournalForm: React.FC<{
  entry?: JournalEntry;
  onSave: (entry: JournalEntry) => void;
  onCancel: () => void;
}> = ({ entry, onSave, onCancel }) => {
  const [form, setForm] = useState<Partial<JournalEntry>>(entry || {
    id: crypto.randomUUID(),
    date: new Date().toISOString().split('T')[0],
    equipmentIds: [],
    integrationTime: 2,
    subExposures: 60,
    exposureLength: 120,
    filters: [],
    quality: 'good',
    images: [],
  });

  const handleSave = () => {
    if (!form.targetName || !form.date) return;
    onSave({
      ...form,
      id: form.id || crypto.randomUUID(),
      targetName: form.targetName!,
      date: form.date!,
      equipmentIds: form.equipmentIds || [],
      integrationTime: form.integrationTime || 0,
      subExposures: form.subExposures || 0,
      exposureLength: form.exposureLength || 0,
      filters: form.filters || [],
      quality: form.quality || 'good',
      images: form.images || [],
    } as JournalEntry);
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div>
        <h3 className="text-sm font-semibold text-[#8e9aaf] uppercase tracking-wider mb-3">Target & Date</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Target Name *"
            value={form.targetName || ''}
            onChange={e => setForm(p => ({ ...p, targetName: e.target.value }))}
            placeholder="e.g. M42 Orion Astro"
          />
          <Input
            label="Date *"
            type="date"
            value={form.date}
            onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
          />
        </div>
        <Input
          label="Location"
          value={form.location || ''}
          onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
          placeholder="e.g. Backyard, Saint-Étienne-du-Grès"
          className="mt-4"
        />
      </div>

      {/* Acquisition Details */}
      <div>
        <h3 className="text-sm font-semibold text-[#8e9aaf] uppercase tracking-wider mb-3">Acquisition Details</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Input
            label="Total Time (h)"
            type="number"
            step="0.1"
            value={form.integrationTime}
            onChange={e => setForm(p => ({ ...p, integrationTime: parseFloat(e.target.value) || 0 }))}
          />
          <Input
            label="Sub-exposures"
            type="number"
            value={form.subExposures}
            onChange={e => setForm(p => ({ ...p, subExposures: parseInt(e.target.value) || 0 }))}
          />
          <Input
            label="Exposure (sec)"
            type="number"
            value={form.exposureLength}
            onChange={e => setForm(p => ({ ...p, exposureLength: parseInt(e.target.value) || 0 }))}
          />
          <div>
            <label className="block text-xs font-medium text-[#8e9aaf] uppercase tracking-wider mb-1.5">Quality</label>
            <select
              value={form.quality}
              onChange={e => setForm(p => ({ ...p, quality: e.target.value as any }))}
              className="w-full bg-[#0a0f1a] border border-[rgba(148,163,184,0.12)] rounded-[10px] px-4 py-2.5 text-sm text-[#e8eaf6] focus:outline-none focus:ring-2 focus:ring-[rgba(59,130,246,0.25)] focus:border-[#3B82F6]"
            >
              <option value="excellent">Excellent</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
            </select>
          </div>
        </div>
      </div>

      {/* Conditions */}
      <div>
        <h3 className="text-sm font-semibold text-[#8e9aaf] uppercase tracking-wider mb-3">Conditions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Input
            label="Temperature (°C)"
            type="number"
            value={form.conditions?.temperature || ''}
            onChange={e => setForm(p => ({
              ...p,
              conditions: { ...p.conditions, temperature: parseFloat(e.target.value) || undefined }
            }))}
          />
          <Input
            label="Humidity (%)"
            type="number"
            value={form.conditions?.humidity || ''}
            onChange={e => setForm(p => ({
              ...p,
              conditions: { ...p.conditions, humidity: parseFloat(e.target.value) || undefined }
            }))}
          />
          <div>
            <label className="block text-xs font-medium text-[#8e9aaf] uppercase tracking-wider mb-1.5">Seeing</label>
            <select
              value={form.conditions?.seeing || ''}
              onChange={e => setForm(p => ({
                ...p,
                conditions: { ...p.conditions, seeing: e.target.value || undefined }
              }))}
              className="w-full bg-[#0a0f1a] border border-[rgba(148,163,184,0.12)] rounded-[10px] px-4 py-2.5 text-sm text-[#e8eaf6] focus:outline-none focus:ring-2 focus:ring-[rgba(59,130,246,0.25)] focus:border-[#3B82F6]"
            >
              <option value="">Select...</option>
              <option value="Excellent">Excellent</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
              <option value="Poor">Poor</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#8e9aaf] uppercase tracking-wider mb-1.5">Transparency</label>
            <select
              value={form.conditions?.transparency || ''}
              onChange={e => setForm(p => ({
                ...p,
                conditions: { ...p.conditions, transparency: e.target.value || undefined }
              }))}
              className="w-full bg-[#0a0f1a] border border-[rgba(148,163,184,0.12)] rounded-[10px] px-4 py-2.5 text-sm text-[#e8eaf6] focus:outline-none focus:ring-2 focus:ring-[rgba(59,130,246,0.25)] focus:border-[#3B82F6]"
            >
              <option value="">Select...</option>
              <option value="Excellent">Excellent</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
              <option value="Poor">Poor</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <h3 className="text-sm font-semibold text-[#8e9aaf] uppercase tracking-wider mb-3">Notes</h3>
        <textarea
          className="w-full bg-[#0a0f1a] border border-[rgba(148,163,184,0.12)] rounded-[10px] px-4 py-2.5 text-sm text-[#e8eaf6] placeholder-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[rgba(59,130,246,0.25)] focus:border-[#3B82F6] min-h-[120px] resize-y leading-relaxed"
          value={form.notes || ''}
          onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
          placeholder="Describe your session, challenges, discoveries..."
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-[rgba(148,163,184,0.12)]">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave}>Save Entry</Button>
      </div>
    </div>
  );
};

// --- Main View ---

export const JournalView: React.FC = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | undefined>();
  const [filter, setFilter] = useState<'all' | 'excellent' | 'good' | 'fair' | 'poor'>('all');

  const handleSave = (entry: JournalEntry) => {
    if (editingEntry) {
      setEntries(prev => prev.map(e => e.id === entry.id ? entry : e));
    } else {
      setEntries(prev => [...prev, entry]);
    }
    setShowForm(false);
    setEditingEntry(undefined);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure? This cannot be undone.')) {
      setEntries(prev => prev.filter(e => e.id !== id));
    }
  };

  const filtered = filter === 'all' ? entries : entries.filter(e => e.quality === filter);

  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      <Container>
        <PageHeader
          title="Session Journal"
          subtitle="Log and review all your imaging sessions"
          actions={
            <Button onClick={() => { setEditingEntry(undefined); setShowForm(true); }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              New Entry
            </Button>
          }
        />

        {/* Filters */}
        {entries.length > 0 && (
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            {(['all', 'excellent', 'good', 'fair', 'poor'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filter === f
                    ? 'bg-[#3B82F6] text-white'
                    : 'bg-[#1F2937] text-[#8e9aaf] hover:bg-[#374151]'
                }`}
              >
                {f === 'all' ? 'All' : qualityConfig[f].label}
              </button>
            ))}
            <span className="ml-auto text-xs text-[#6b7280]">{filtered.length} entries</span>
          </div>
        )}

        {entries.length === 0 ? (
          <EmptyState
            icon={
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            }
            title="No sessions yet"
            description="Record your first imaging session to start building your journal."
            action={
              <Button onClick={() => { setEditingEntry(undefined); setShowForm(true); }}>
                New Entry
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No entries match"
            description="Try adjusting your filter."
          />
        ) : (
          <div className="space-y-4 pb-12">
            {filtered.map(entry => (
              <JournalCard
                key={entry.id}
                entry={entry}
                onEdit={() => { setEditingEntry(entry); setShowForm(true); }}
                onDelete={() => handleDelete(entry.id)}
              />
            ))}
          </div>
        )}
      </Container>

      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingEntry(undefined); }}
        title={editingEntry ? 'Edit Entry' : 'New Journal Entry'}
        size="lg"
      >
        <JournalForm
          entry={editingEntry}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingEntry(undefined); }}
        />
      </Modal>
    </div>
  );
};

export default JournalView;
