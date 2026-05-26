import React, { useState } from 'react';
import { BookOpen, Star, Trash2, Edit2, Plus, Filter, Folder, Clock, Calendar, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';
import { Card } from './Shared';

// Enhanced Journal with Project Management (Nova DSO Tracker integration)

export interface JournalEntry {
  id: string;
  date: string;
  title: string;
  targetName: string;
  equipmentUsed: string[];
  totalIntegrationTime: number;
  conditions: {
    seeing?: number;
    transparency?: number;
    temperature?: number;
    humidity?: number;
    windSpeed?: number;
    notes?: string;
  };
  acquisitionNotes: string;
  processingNotes: string;
  overallRating: number;
  images: string[];
  tags: string[];
  projectId?: string;
  logFileUrl?: string;
  guidingRMS?: number;
}

export interface Project {
  id: string;
  name: string;
  targetName: string;
  targetHours: number;
  acquiredHours: number;
  status: 'active' | 'completed' | 'paused';
  entries: JournalEntry[];
  filters: string[];
  thumbnailUrl?: string;
}

const SAMPLE_PROJECTS: Project[] = [
  {
    id: '1',
    name: 'M42 — Orion Nebula',
    targetName: 'M42',
    targetHours: 12,
    acquiredHours: 8.5,
    status: 'active',
    filters: ['Ha', 'OIII', 'SII', 'RGB'],
    entries: [],
  },
  {
    id: '2',
    name: 'M31 — Andromeda Galaxy',
    targetName: 'M31',
    targetHours: 20,
    acquiredHours: 15,
    status: 'active',
    filters: ['L', 'R', 'G', 'B'],
    entries: [],
  },
  {
    id: '3',
    name: 'Rosette Nebula',
    targetName: 'NGC 2237',
    targetHours: 18,
    acquiredHours: 18,
    status: 'completed',
    filters: ['Ha', 'OIII', 'SII'],
    entries: [],
  },
];

const SAMPLE_ENTRIES: JournalEntry[] = [
  {
    id: '1',
    date: '2026-05-20',
    title: 'M42 — Ha data collection',
    targetName: 'M42',
    equipmentUsed: ['RedCat 51', 'ASI2600MM Pro', 'EQ6-R Pro'],
    totalIntegrationTime: 180,
    conditions: { seeing: 3, transparency: 4, temperature: 12, notes: 'Bonne nuit, lune à 25%' },
    acquisitionNotes: '120× 90s en Ha',
    processingNotes: 'PixInsight : DBE, Histogram, Curves',
    overallRating: 4,
    images: [],
    tags: ['Ha', 'Nébuleuse'],
    projectId: '1',
    guidingRMS: 0.8,
  },
  {
    id: '2',
    date: '2026-05-22',
    title: 'M42 — OIII data collection',
    targetName: 'M42',
    equipmentUsed: ['RedCat 51', 'ASI2600MM Pro', 'EQ6-R Pro'],
    totalIntegrationTime: 120,
    conditions: { seeing: 2, transparency: 3, temperature: 14, notes: 'Lune à 40%' },
    acquisitionNotes: '80× 90s en OIII',
    processingNotes: 'En attente de traitement',
    overallRating: 3,
    images: [],
    tags: ['OIII', 'Nébuleuse'],
    projectId: '1',
    guidingRMS: 1.2,
  },
];

const JournalView: React.FC = () => {
  const [entries, setEntries] = useState<JournalEntry[]>(SAMPLE_ENTRIES);
  const [projects, setProjects] = useState<Project[]>(SAMPLE_PROJECTS);
  const [filterTag, setFilterTag] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'entries' | 'projects' | 'stats'>('entries');
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  const filtered = filterTag
    ? entries.filter(e => e.tags.some(t => t.toLowerCase().includes(filterTag.toLowerCase())))
    : selectedProject
    ? entries.filter(e => e.projectId === selectedProject)
    : entries;

  const handleDelete = (id: string) => {
    if (confirm('Supprimer cette entrée du journal ?')) {
      setEntries(prev => prev.filter(e => e.id !== id));
    }
  };

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i < rating ? 'text-[#FBBF24] fill-[#FBBF24]' : 'text-[#374151]'}`}
        />
      ))}
    </div>
  );

  const getProjectProgress = (project: Project) => {
    const pct = Math.min(100, (project.acquiredHours / project.targetHours) * 100);
    return { pct, color: pct >= 100 ? 'bg-[#10B981]' : pct >= 50 ? 'bg-[#3b82f6]' : 'bg-[#F59E0B]' };
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-[#e8eaf6] p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[#3b82f6]" /> Journal &amp; Projects
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              {(['entries', 'projects', 'stats'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab ? 'bg-[#3b82f6] text-white' : 'bg-[#1a2238] text-[#8e9aaf]'
                  }`}
                >
                  {tab === 'entries' && 'Entries'}
                  {tab === 'projects' && 'Projects'}
                  {tab === 'stats' && 'Stats'}
                </button>
              ))}
            </div>
            <div className="relative">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8e9aaf]" />
              <input
                type="text"
                placeholder="Filtrer par tag..."
                value={filterTag}
                onChange={e => setFilterTag(e.target.value)}
                className="bg-[#1a2238] border border-[rgba(148,163,184,0.12)] rounded-lg pl-9 pr-3 py-2 text-sm text-[#e8eaf6] placeholder-[#6b7280] focus:border-[#3b82f6] focus:outline-none"
              />
            </div>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-[#3b82f6] text-white rounded-lg font-medium hover:bg-[#60A5FA] transition-colors">
              <Plus className="w-4 h-4" /> New Entry
            </button>
          </div>
        </div>

        {/* Project Filter */}
        {activeTab === 'entries' && (
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setSelectedProject(null)}
              className={`px-3 py-1 rounded-md text-xs transition-colors ${
                !selectedProject ? 'bg-[#3b82f6] text-white' : 'bg-[#1a2238] text-[#8e9aaf]'
              }`}
            >
              All
            </button>
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedProject(p.id)}
                className={`px-3 py-1 rounded-md text-xs transition-colors ${
                  selectedProject === p.id ? 'bg-[#3b82f6] text-white' : 'bg-[#1a2238] text-[#8e9aaf]'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        {/* Entries Tab */}
        {activeTab === 'entries' && (
          <div className="space-y-3">
            {filtered.map(entry => (
              <Card key={entry.id} className="overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-[#e8eaf6]">{entry.title}</h3>
                        {renderStars(entry.overallRating)}
                      </div>
                      <p className="text-xs text-[#8e9aaf] mb-2">
                        {new Date(entry.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} — {entry.targetName}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {entry.equipmentUsed.map(eq => (
                          <span key={eq} className="px-2 py-0.5 rounded text-[10px] bg-[#0a0f1a] text-[#8e9aaf] border border-[rgba(148,163,184,0.12)]">
                            {eq}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => alert('Édition à venir')} className="p-1.5 rounded-md text-[#8e9aaf] hover:text-[#e8eaf6] transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(entry.id)} className="p-1.5 rounded-md text-[#8e9aaf] hover:text-[#EF4444] transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 pt-3 border-t border-[rgba(148,163,184,0.08)]">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[#8e9aaf] mb-1">Acquisition</p>
                      <p className="text-sm text-[#e8eaf6]">{entry.acquisitionNotes}</p>
                      <p className="text-xs text-[#8e9aaf] mt-1">{entry.totalIntegrationTime} min total</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[#8e9aaf] mb-1">Traitement</p>
                      <p className="text-sm text-[#e8eaf6]">{entry.processingNotes}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[#8e9aaf] mb-1">Conditions</p>
                      <div className="text-xs text-[#e8eaf6] space-y-0.5">
                        {entry.conditions.seeing && <p>Seeing : {entry.conditions.seeing}/5</p>}
                        {entry.conditions.transparency && <p>Transparence : {entry.conditions.transparency}/5</p>}
                        {entry.conditions.temperature && <p>Temp : {entry.conditions.temperature}°C</p>}
                        {entry.guidingRMS && <p>Guiding RMS: {entry.guidingRMS}″</p>}
                        {entry.conditions.notes && <p className="text-[#8e9aaf] italic">{entry.conditions.notes}</p>}
                      </div>
                    </div>
                  </div>

                  {entry.tags.length > 0 && (
                    <div className="flex gap-1.5 mt-3">
                      {entry.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] bg-[#3b82f6]/10 text-[#60A5FA]">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            ))}

            {filtered.length === 0 && (
              <div className="text-center py-16 text-[#8e9aaf]">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucune entrée dans le journal</p>
              </div>
            )}
          </div>
        )}

        {/* Projects Tab */}
        {activeTab === 'projects' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map(project => {
                const progress = getProjectProgress(project);
                const isExpanded = expandedProject === project.id;
                const projectEntries = entries.filter(e => e.projectId === project.id);

                return (
                  <div key={project.id} className="bg-[#1a2238] border border-[rgba(148,163,184,0.12)] rounded-xl overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Folder className="w-4 h-4 text-[#3b82f6]" />
                          <span className="font-semibold text-[#e8eaf6]">{project.name}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          project.status === 'active' ? 'bg-[#3b82f6]/20 text-[#60A5FA]' :
                          project.status === 'completed' ? 'bg-[#10B981]/20 text-[#34D399]' :
                          'bg-[#F59E0B]/20 text-[#F59E0B]'
                        }`}>
                          {project.status}
                        </span>
                      </div>

                      <div className="mb-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-[#8e9aaf]">{project.acquiredHours.toFixed(1)}h / {project.targetHours}h</span>
                          <span className="text-[#e8eaf6] font-mono">{progress.pct.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 bg-[#0a0f1a] rounded-full overflow-hidden">
                          <div className={`h-full ${progress.color} rounded-full transition-all`} style={{ width: `${progress.pct}%` }} />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1 mb-3">
                        {project.filters.map(f => (
                          <span key={f} className="px-1.5 py-0.5 rounded text-[10px] bg-[#0a0f1a] text-[#8e9aaf] border border-[rgba(148,163,184,0.12)]">
                            {f}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center justify-between text-xs text-[#8e9aaf]">
                        <span>{projectEntries.length} sessions</span>
                        <button
                          onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                          className="flex items-center gap-1 text-[#3b82f6] hover:text-[#60A5FA]"
                        >
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          {isExpanded ? 'Hide' : 'Details'}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-[rgba(148,163,184,0.08)] p-4">
                        <div className="space-y-2">
                          {projectEntries.length === 0 ? (
                            <p className="text-xs text-[#8e9aaf]">No sessions recorded yet</p>
                          ) : (
                            projectEntries.map(entry => (
                              <div key={entry.id} className="flex items-center justify-between text-sm">
                                <span className="text-[#e8eaf6]">{entry.title}</span>
                                <span className="text-[#8e9aaf] text-xs">{entry.totalIntegrationTime}min</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#1a2238] border border-[rgba(148,163,184,0.12)] rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-[#3b82f6]">{entries.length}</div>
                <div className="text-xs text-[#8e9aaf]">Total Sessions</div>
              </div>
              <div className="bg-[#1a2238] border border-[rgba(148,163,184,0.12)] rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-[#10B981]">{(entries.reduce((s, e) => s + e.totalIntegrationTime, 0) / 60).toFixed(1)}h</div>
                <div className="text-xs text-[#8e9aaf]">Total Integration</div>
              </div>
              <div className="bg-[#1a2238] border border-[rgba(148,163,184,0.12)] rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-[#F59E0B]">{projects.filter(p => p.status === 'active').length}</div>
                <div className="text-xs text-[#8e9aaf]">Active Projects</div>
              </div>
              <div className="bg-[#1a2238] border border-[rgba(148,163,184,0.12)] rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-[#8e9aaf]">{(entries.reduce((s, e) => s + (e.overallRating || 0), 0) / entries.length).toFixed(1)}</div>
                <div className="text-xs text-[#8e9aaf]">Avg Rating</div>
              </div>
            </div>

            {/* Monthly chart */}
            <div className="bg-[#1a2238] border border-[rgba(148,163,184,0.12)] rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#3b82f6]" /> Monthly Integration Time
              </h3>
              <div className="h-32 flex items-end gap-2">
                {Array.from({ length: 12 }, (_, i) => {
                  const monthEntries = entries.filter(e => new Date(e.date).getMonth() === i);
                  const hours = monthEntries.reduce((s, e) => s + e.totalIntegrationTime, 0) / 60;
                  const maxHours = 20;
                  const height = maxHours > 0 ? (hours / maxHours) * 100 : 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-[#0a0f1a] rounded-t-sm relative" style={{ height: '100px' }}>
                        <div
                          className="absolute bottom-0 w-full bg-[#3b82f6] rounded-t-sm transition-all"
                          style={{ height: `${Math.min(100, height)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-[#8e9aaf]">
                        {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default JournalView;
