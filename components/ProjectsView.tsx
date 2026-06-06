// ============================================================================
// ProjectsView — Astrophotography project management
// Create projects from targets, track observations, progress tracking
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Project,
  ProjectStatus,
  ProjectObservation,
  CreateProjectData,
  AddObservationData,
} from '../src/types/project';
import {
  fetchProjects,
  createProject,
  updateProject,
  deleteProject,
  addObservation,
  deleteObservation,
  calculateProgress,
  calculateExposurePlan,
  calculateFullExposurePlan,
} from '../src/services/projectService';
import {
  searchTargets,
  TelescopiusTarget,
  getDefaultBestTargetFilters,
} from '../src/services/targetExplorerService';
import TargetExplorerView from './TargetExplorerView';
import { FilterType } from '../src/types/module5';
import {
  getUserOwnedFilters,
  UserFilterInfo,
  FILTER_TYPE_LABELS,} from '../src/services/filterMapping';
import {
  Plus, FolderOpen, CheckCircle2, Archive, Trash2, ChevronDown, ChevronRight,
  Telescope, MapPin, Clock, Moon, Target, Camera, Filter, BarChart3,
  X, Eye, Sparkles, Search, RotateCw, Star, ChevronLeft,
} from 'lucide-react';

const STATUS_CONFIG: Record<ProjectStatus, { label: string; icon: string; color: string; bg: string }> = {
  planning: { label: 'Planning', icon: '📋', color: 'text-blue-300', bg: 'bg-blue-500/20 border-blue-500/30' },
  in_progress: { label: 'In Progress', icon: '🔄', color: 'text-emerald-300', bg: 'bg-emerald-500/20 border-emerald-500/30' },
  completed: { label: 'Completed', icon: '✅', color: 'text-amber-300', bg: 'bg-amber-500/20 border-amber-500/30' },
  archived: { label: 'Archived', icon: '📁', color: 'text-slate-400', bg: 'bg-slate-500/20 border-slate-500/30' },
};

const TYPE_EMOJIS: Record<string, string> = {
  gxy: '🌌', neb: '💨', opcl: '⭐', plnb: '🔮', snrm: '💥',
  Galaxy: '🌌', Nebula: '💨', Cluster: '⭐', Planetary_Nebula: '🔮',
};

interface ProjectsViewProps {
  locationSource: string;
  onLocationChange: (source: any) => void;
  preselectedTarget?: TelescopiusTarget | null;
  onClearTarget?: () => void;
}

type ViewMode = 'list' | 'create' | 'detail';

export const ProjectsView: React.FC<ProjectsViewProps> = ({ locationSource, onLocationChange, preselectedTarget: initialTarget, onClearTarget }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>(initialTarget ? 'create' : 'list');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | 'all'>('all');
  const [preselectedTarget, setPreselectedTarget] = useState<TelescopiusTarget | null>(initialTarget || null);
  // Filter options for project filter dropdown
  // useMemo ensures this stays in the component closure and can't be shadowed by Vite minification
  const filterOptions = useMemo(() => [
    { value: 'L_Ultimate', label: 'L Ultimate' },
    { value: 'LPS_D2', label: 'LPS-D2' },
    { value: 'UV_IR_Cut', label: 'UV/IR Cut' },
    { value: 'Ha', label: 'Hα' },
    { value: 'OIII', label: 'OIII' },
    { value: 'SII', label: 'SII' },
    { value: 'RGB', label: 'RGB' },
    { value: 'Luminance', label: 'Luminance' },
  ], []);
  // Load projects
  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchProjects();
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Filter projects
  const filteredProjects = filterStatus === 'all'
    ? projects
    : projects.filter(p => p.status === filterStatus);

  const inProgressCount = projects.filter(p => p.status === 'in_progress').length;
  const completedCount = projects.filter(p => p.status === 'completed').length;
  const planningCount = projects.filter(p => p.status === 'planning').length;

  const handleProjectCreated = (project: Project) => {
    setProjects(prev => [...prev, project]);
    setSelectedProject(project);
    setViewMode('detail');
  };

  const handleProjectUpdated = (project: Project) => {
    setProjects(prev => prev.map(p => p.id === project.id ? project : p));
    if (selectedProject?.id === project.id) {
      setSelectedProject(project);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Delete this project? This cannot be undone.')) return;
    await deleteProject(id);
    setProjects(prev => prev.filter(p => p.id !== id));
    if (selectedProject?.id === id) {
      setSelectedProject(null);
      setViewMode('list');
    }
  };

  // Public method to start project from targets tab
  const startProjectFromTarget = (target: TelescopiusTarget) => {
    setPreselectedTarget(target);
    setViewMode('create');
  };

  // ─── Render ───────────────────────────────────────────────────────────

  if (viewMode === 'create') {
    return (
      <CreateProjectView
        locationSource={locationSource}
        onLocationChange={onLocationChange}
        preselectedTarget={preselectedTarget}
        onCreated={handleProjectCreated}
        onCancel={() => { setPreselectedTarget(null); setViewMode('list'); }}
      />
    );
  }

  if (viewMode === 'detail' && selectedProject) {
    return (
      <ProjectDetailView
        project={selectedProject}
        onBack={() => { setSelectedProject(null); setViewMode('list'); }}
        onUpdate={handleProjectUpdated}
        onDelete={() => handleDeleteProject(selectedProject.id)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">📋 Projects</h1>
          <p className="mt-1 text-text-secondary text-sm">Plan, track, and complete your astrophotography sessions</p>
        </div>
        <button
          onClick={() => setViewMode('create')}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} /> New Project
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => setFilterStatus(filterStatus === 'planning' ? 'all' : 'planning')}
          className={`p-3 rounded-xl border transition-colors ${filterStatus === 'planning' ? 'border-blue-500 bg-blue-500/10' : 'border-border bg-surface hover:bg-surface-secondary'}`}
        >
          <div className="text-2xl font-bold text-blue-300">{planningCount}</div>
          <div className="text-xs text-text-secondary">📋 Planning</div>
        </button>
        <button
          onClick={() => setFilterStatus(filterStatus === 'in_progress' ? 'all' : 'in_progress')}
          className={`p-3 rounded-xl border transition-colors ${filterStatus === 'in_progress' ? 'border-emerald-500 bg-emerald-500/10' : 'border-border bg-surface hover:bg-surface-secondary'}`}
        >
          <div className="text-2xl font-bold text-emerald-300">{inProgressCount}</div>
          <div className="text-xs text-text-secondary">🔄 Active</div>
        </button>
        <button
          onClick={() => setFilterStatus(filterStatus === 'completed' ? 'all' : 'completed')}
          className={`p-3 rounded-xl border transition-colors ${filterStatus === 'completed' ? 'border-amber-500 bg-amber-500/10' : 'border-border bg-surface hover:bg-surface-secondary'}`}
        >
          <div className="text-2xl font-bold text-amber-300">{completedCount}</div>
          <div className="text-xs text-text-secondary">✅ Done</div>
        </button>
      </div>

      {/* Filter */}
      {filterStatus !== 'all' && (
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <span>Showing: <strong className="text-text">{STATUS_CONFIG[filterStatus].icon} {STATUS_CONFIG[filterStatus].label}</strong></span>
          <button onClick={() => setFilterStatus('all')} className="text-primary hover:underline">Show all</button>
        </div>
      )}

      {/* Project list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <RotateCw className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-16 text-text-secondary">
          <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg">No projects yet</p>
          <p className="text-sm mt-1">Create your first project from a target to start tracking</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProjects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => { setSelectedProject(project); setViewMode('detail'); }}
              onDelete={() => handleDeleteProject(project.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Project Card ──────────────────────────────────────────────────────────

const ProjectCard: React.FC<{ project: Project; onClick: () => void; onDelete: () => void }> = ({ project, onClick, onDelete }) => {
  const cfg = STATUS_CONFIG[project.status];
  const progress = calculateProgress(project);
  const totalHours = (progress.totalExposureSeconds / 3600).toFixed(1);
  const plannedHours = project.totalPlannedHours.toFixed(1);

  return (
    <div
      onClick={onClick}
      className="bg-surface border border-border rounded-xl p-4 hover:border-primary/50 cursor-pointer transition-all group"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">{cfg.icon}</span>
            <h3 className="font-semibold text-text truncate">{project.title}</h3>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
              {cfg.label}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-text-secondary">
            <span className="flex items-center gap-1">
              <Target size={12} /> {project.targetName}
            </span>
            {project.targetMagnitude != null && (
              <span className="font-mono">mag {project.targetMagnitude.toFixed(1)}</span>
            )}
            <span className="flex items-center gap-1">
              <Telescope size={12} /> {project.rigName || 'No rig'}
            </span>
            <span className="flex items-center gap-1">
              <Filter size={12} /> {project.primaryFilter.replace(/_/g, ' ')}
            </span>
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover:opacity-100 p-1.5 text-text-secondary hover:text-red-400 transition-all"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
          <span>{progress.completionPercent}% complete</span>
          <span>{totalHours}h / {plannedHours}h</span>
        </div>
        <div className="w-full h-2 bg-background rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              progress.completionPercent >= 100 ? 'bg-amber-500' :
              progress.completionPercent >= 50 ? 'bg-emerald-500' : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(100, progress.completionPercent)}%` }}
          />
        </div>
      </div>

      {/* Observations count */}
      <div className="flex items-center gap-3 mt-2 text-xs text-text-secondary">
        <span className="flex items-center gap-1"><Camera size={12} /> {project.observations.length} observation{project.observations.length !== 1 ? 's' : ''}</span>
        <span className="flex items-center gap-1"><MapPin size={12} /> {project.locationSource}</span>
      </div>
    </div>
  );
};

// ─── Create Project View ───────────────────────────────────────────────────

interface CreateProjectViewProps {
  locationSource: string;
  onLocationChange: (source: any) => void;
  preselectedTarget?: TelescopiusTarget | null;
  onCreated: (project: Project) => void;
  onCancel: () => void;
}

const CREATE_LOCATION_COORDS: Record<string, { lat: number; lon: number }> = {
  saintEtienne: { lat: 43.7889, lon: 4.7533 },
  pradelles: { lat: 44.6167, lon: 3.9667 },
};

const CreateProjectView: React.FC<CreateProjectViewProps> = ({
  locationSource,
  onLocationChange,
  preselectedTarget,
  onCreated,
  onCancel,
}) => {
  const [title, setTitle] = useState('');
  const [selectedTarget, setSelectedTarget] = useState<TelescopiusTarget | null>(preselectedTarget || null);
  const [primaryFilter, setPrimaryFilter] = useState<string>('L_Ultimate');
  const [isCreating, setIsCreating] = useState(false);
  const [exposurePreview, setExposurePreview] = useState<any>(null);
  const [step, setStep] = useState<'target' | 'details'>(preselectedTarget ? 'details' : 'target');

  // Local location/rig state for project creation
  const [localLocation, setLocalLocation] = useState<string>(locationSource);
  const [rigs, setRigs] = useState<any[]>([]);
  const [activeRig, setActiveRig] = useState<any>(null);
  const [activeRigId, setActiveRigId] = useState<string>('');

  const localCoords = CREATE_LOCATION_COORDS[localLocation] || CREATE_LOCATION_COORDS.saintEtienne;

  // Load rigs
  useEffect(() => {
    fetch('/api/apls/rigs', { headers: { 'Content-Type': 'application/json' } })
      .then(r => r.ok ? r.json() : [])
      .then((rigList: any[]) => {
        setRigs(rigList);
        const def = rigList.find((r: any) => r.isDefault);
        if (def) {
          setActiveRigId(def.id);
          setActiveRig(def);
        }
      })
      .catch(() => {});
  }, []);

  // Update exposure preview
  useEffect(() => {
    if (!selectedTarget) { setExposurePreview(null); return; }
    const preview = calculateExposurePlan({
      targetMagnitude: selectedTarget.magnitude ?? null,
      targetSizeArcmin: selectedTarget.sizeArcmin ?? null,
      filter: primaryFilter,
      focalLength: activeRig?.telescope?.focalLength ?? 800,
      aperture: activeRig?.telescope?.aperture ?? 200,
      pixelSize: activeRig?.imagingCamera?.pixelSize ?? 3.76,
      moonIllumination: 0.5,
      avgSeeing: 2.5,
    });
    setExposurePreview(preview);
  }, [selectedTarget, primaryFilter, activeRig]);

  // Handle target selection from TargetExplorerView
  const handleTargetSelect = (target: TelescopiusTarget) => {
    setSelectedTarget(target);
    setStep('details');
    // Auto-fill title if empty
    if (!title.trim()) {
      setTitle(`${target.mainName} — ${primaryFilter.replace(/_/g, ' ')} Project`);
    }
  };

  // Create project
  const handleCreate = async () => {
    if (!selectedTarget || !title.trim()) return;
    setIsCreating(true);
    try {
      const project = await createProject({
        title: title.trim(),
        targetId: selectedTarget.id,
        targetName: selectedTarget.mainName,
        targetType: selectedTarget.type || '',
        targetRa: selectedTarget.ra,
        targetDec: selectedTarget.dec,
        targetMagnitude: selectedTarget.magnitude ?? null,
        targetSizeArcmin: selectedTarget.sizeArcmin ?? null,
        targetImageUrl: selectedTarget.imageUrl ?? null,
        locationSource: localLocation,
        lat: localCoords.lat,
        lon: localCoords.lon,
        rigId: activeRig?.id ?? null,
        primaryFilter,
      });
      onCreated(project);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRigChange = (rigId: string) => {
    setActiveRigId(rigId);
    const rig = rigs.find((r: any) => r.id === rigId);
    setActiveRig(rig || null);
  };

  // ─── Step 1: Target selection (full TargetExplorerView) ──────────────────

  if (step === 'target') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onCancel} className="p-2 rounded-lg hover:bg-surface-secondary transition-colors">
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-display font-bold">🎯 Select Target</h1>
              <p className="text-text-secondary text-sm">Choose a target for your astrophotography project</p>
            </div>
          </div>
          <span className="text-xs text-text-secondary bg-primary/10 text-primary px-3 py-1.5 rounded-full font-medium">
            Step 1/2
          </span>
        </div>

        <TargetExplorerView
          locationSource={localLocation as any}
          onLocationChange={(src) => { setLocalLocation(src); onLocationChange(src); }}
          onStartProject={handleTargetSelect}
        />
      </div>
    );
  }

  // ─── Step 2: Project details ──────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => setStep('target')} className="p-2 rounded-lg hover:bg-surface-secondary transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold">🆕 New Project</h1>
          <p className="text-text-secondary text-sm">Configure your project details</p>
        </div>
        <span className="text-xs text-text-secondary bg-emerald-500/10 text-emerald-300 px-3 py-1.5 rounded-full font-medium">
          Step 2/2
        </span>
      </div>

      {/* Selected target */}
      <div className="bg-surface border border-primary/30 rounded-xl p-5 space-y-3">
        <h3 className="font-semibold text-text flex items-center gap-2"><Target size={16} /> Selected Target</h3>
        <div className="bg-background border border-border rounded-lg p-4 flex items-center gap-4">
          {selectedTarget?.imageUrl ? (
            <img src={selectedTarget.imageUrl} alt={selectedTarget.mainName} className="w-20 h-20 rounded-lg object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-lg bg-surface-secondary flex items-center justify-center text-3xl">
              {TYPE_EMOJIS[selectedTarget?.type || ''] || '🔭'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-text text-lg">{selectedTarget?.mainName}</div>
            <div className="text-sm text-text-secondary flex items-center gap-3 mt-1">
              {selectedTarget?.magnitude != null && <span className="font-mono">mag {(selectedTarget.magnitude ?? 0).toFixed(1)}</span>}
              {selectedTarget?.sizeArcmin != null && (selectedTarget.sizeArcmin ?? 0) > 0 && <span className="font-mono">{(selectedTarget.sizeArcmin ?? 0).toFixed(0)}'</span>}
              {selectedTarget?.constellation && <span>{selectedTarget.constellation}</span>}
              {selectedTarget?.type && <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-secondary">{selectedTarget.type}</span>}
            </div>
            {selectedTarget?.altitudeMax != null && (
              <div className="text-xs text-text-secondary mt-1">↑ Max altitude: {(selectedTarget.altitudeMax ?? 0).toFixed(0)}°</div>
            )}
          </div>
          <button onClick={() => { setSelectedTarget(null); setStep('target'); }} className="p-2 text-text-secondary hover:text-primary transition-colors">
            Change
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
        <h3 className="font-semibold text-text">✏️ Project Title</h3>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. M42 Orion Nebula — Hα project"
          className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-text placeholder:text-text-secondary/50 focus:outline-none focus:border-primary"
        />
      </div>

      {/* Setup: Location + Rig + Filter */}
      <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-text flex items-center gap-2"><Telescope size={16} /> Setup</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Location */}
          <div>
            <label className="text-xs text-text-secondary block mb-1">📍 Location</label>
            <select
              value={localLocation}
              onChange={(e) => { setLocalLocation(e.target.value); onLocationChange(e.target.value); }}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
            >
              <option value="saintEtienne">🏠 St-Étienne-du-Grès</option>
              <option value="pradelles">🏡 Pradelles</option>
            </select>
          </div>

          {/* Rig */}
          <div>
            <label className="text-xs text-text-secondary block mb-1">🔭 Rig</label>
            {rigs.length > 0 ? (
              <select
                value={activeRigId}
                onChange={(e) => handleRigChange(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
              >
                {rigs.map((r: any) => (
                  <option key={r.id} value={r.id}>{r.name} — {r.telescope?.focalLength ?? '?'}mm</option>
                ))}
              </select>
            ) : (
              <div className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-secondary">No rigs configured</div>
            )}
            {activeRig && (
              <div className="text-[10px] text-text-secondary mt-1 font-mono">
                {activeRig.telescope?.focalLength ?? '?'}mm f/{activeRig.telescope?.fRatio ?? '?'} · {activeRig.imagingCamera?.pixelSize ?? '?'}µm/px
              </div>
            )}
          </div>

          {/* Filter */}
          <div>
            <label className="text-xs text-text-secondary block mb-1">🔲 Primary Filter</label>
            <select
              value={primaryFilter}
              onChange={(e) => setPrimaryFilter(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
            >
              {filterOptions.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="text-xs text-text-secondary flex items-center gap-3">
          <span className="flex items-center gap-1"><MapPin size={12} /> {localLocation === 'saintEtienne' ? 'St-Étienne-du-Grès' : 'Pradelles'}</span>
          <span className="flex items-center gap-1"><Moon size={12} /> Moon integration included</span>
        </div>
      </div>

      {/* Exposure Preview */}
      {exposurePreview && exposurePreview.length > 0 && (
        <div className="bg-surface border border-emerald-500/30 rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-text flex items-center gap-2"><span className="bg-emerald-500/20 text-emerald-300 rounded-full w-6 h-6 flex items-center justify-center text-sm">📸</span> Exposure Plan</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {exposurePreview.map((plan: any, i: number) => (
              <div key={i} className="bg-background p-3 rounded-lg border border-border">
                <div className="text-[10px] text-text-secondary block mb-1">{plan.filter.replace(/_/g, ' ')}</div>
                <div className="font-mono font-bold text-text">{plan.subExposure}s × {plan.subCount}</div>
                <div className="text-xs text-text-secondary mt-1">{(plan.totalExposureTime / 3600).toFixed(1)}h total</div>
                <div className="text-xs text-emerald-300 mt-0.5">{plan.snrEstimate}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create button */}
      <button
        onClick={handleCreate}
        disabled={!selectedTarget || !title.trim() || isCreating}
        className="w-full py-3 bg-primary text-white rounded-lg font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
      >
        {isCreating ? <RotateCw className="w-4 h-4 animate-spin" /> : <Plus size={16} />}
        Create Project
      </button>
    </div>
  );
};
// ─── Project Detail View ──────────────────────────────────────────────────

interface ProjectDetailViewProps {
  project: Project;
  onBack: () => void;
  onUpdate: (project: Project) => void;
  onDelete: () => void;
}

const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({ project: initialProject, onBack, onUpdate, onDelete }) => {
  const [project, setProject] = useState<Project>(initialProject);
  const [showAddObs, setShowAddObs] = useState(false);

  // Observation form state
  const [obsDate, setObsDate] = useState(new Date().toISOString().split('T')[0]);
  const [obsExposures, setObsExposures] = useState(10);
  const [obsDuration, setObsDuration] = useState(120);
  const [obsFilter, setObsFilter] = useState(project.primaryFilter);
  const [obsSeeing, setObsSeeing] = useState<string>('');
  const [obsGuiding, setObsGuiding] = useState<string>('');
  const [obsNotes, setObsNotes] = useState('');

  const progress = calculateProgress(project);
  const totalHours = (progress.totalExposureSeconds / 3600).toFixed(2);
  const plannedHours = project.totalPlannedHours.toFixed(1);

  const statusCfg = STATUS_CONFIG[project.status];

  const handleAddObservation = async () => {
    try {
      const obs: AddObservationData = {
        date: obsDate,
        exposuresTaken: obsExposures,
        exposureDuration: obsDuration,
        filter: obsFilter,
        seeing: obsSeeing ? parseFloat(obsSeeing) : null,
        guidingRms: obsGuiding ? parseFloat(obsGuiding) : null,
        notes: obsNotes,
      };
      const updated = await addObservation(project.id, obs);
      setProject(updated);
      onUpdate(updated);
      setShowAddObs(false);
      setObsExposures(10);
      setObsDuration(120);
      setObsNotes('');
    } catch (err) {
      console.error('Failed to add observation:', err);
      alert('Failed to add observation: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleDeleteObservation = async (obsId: string) => {
    try {
      const updated = await deleteObservation(project.id, obsId);
      setProject(updated);
      onUpdate(updated);
    } catch (err) {
      console.error('Failed to delete observation:', err);
      alert('Failed to delete observation: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleStatusChange = async (status: ProjectStatus) => {
    const updated = await updateProject(project.id, { status });
    setProject(updated);
    onUpdate(updated);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-surface-secondary transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              {statusCfg.icon} {project.title}
            </h1>
            <div className="text-sm text-text-secondary flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1"><Target size={12} /> {project.targetName}</span>
              {project.targetMagnitude != null && <span className="font-mono">mag {(project.targetMagnitude ?? 0).toFixed(1)}</span>}
              <span className="flex items-center gap-1"><Telescope size={12} /> {project.rigName || 'No rig'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={project.status}
            onChange={(e) => handleStatusChange(e.target.value as ProjectStatus)}
            className={`text-sm px-3 py-1.5 rounded-lg border ${statusCfg.bg} ${statusCfg.color}`}
          >
            <option value="planning">📋 Planning</option>
            <option value="in_progress">🔄 In Progress</option>
            <option value="completed">✅ Completed</option>
            <option value="archived">📁 Archived</option>
          </select>
          <button onClick={onDelete} className="p-2 text-text-secondary hover:text-red-400 transition-colors">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-semibold">Progress</span>
          <span className="font-mono">{progress.completionPercent}% — {totalHours}h / {plannedHours}h</span>
        </div>
        <div className="w-full h-3 bg-background rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              progress.completionPercent >= 100 ? 'bg-amber-500' :
              progress.completionPercent >= 50 ? 'bg-emerald-500' : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(100, progress.completionPercent)}%` }}
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs text-text-secondary">
          {project.exposurePlan.map((plan, i) => (
            <div key={i} className="bg-background p-2 rounded-lg">
              <div className="font-semibold text-text">{plan.filter.replace(/_/g, ' ')}</div>
              <div>{plan.subExposure}s × {plan.subCount}</div>
              <div>{(plan.totalExposureTime / 3600).toFixed(1)}h</div>
            </div>
          ))}
        </div>
      </div>

      {/* Observations */}
      <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-text flex items-center gap-2"><Camera size={16} /> Observations ({project.observations.length})</h3>
          <button
            onClick={() => setShowAddObs(!showAddObs)}
            className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 flex items-center gap-1"
          >
            <Plus size={14} /> Add
          </button>
        </div>

        {/* Add observation form */}
        {showAddObs && (
          <div className="bg-background border border-border rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-text-secondary block mb-1">Date</label>
                <input type="date" value={obsDate} onChange={(e) => setObsDate(e.target.value)} className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text" />
              </div>
              <div>
                <label className="text-xs text-text-secondary block mb-1">Exposures</label>
                <input type="number" value={obsExposures} onChange={(e) => setObsExposures(parseInt(e.target.value) || 0)} className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text" />
              </div>
              <div>
                <label className="text-xs text-text-secondary block mb-1">Duration (s)</label>
                <input type="number" value={obsDuration} onChange={(e) => setObsDuration(parseInt(e.target.value) || 0)} className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text" />
              </div>
              <div>
                <label className="text-xs text-text-secondary block mb-1">Filter</label>
                <select value={obsFilter} onChange={(e) => setObsFilter(e.target.value)} className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text">
                  {filterOptions.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-text-secondary block mb-1">Seeing (")</label>
                <input type="text" value={obsSeeing} onChange={(e) => setObsSeeing(e.target.value)} placeholder="2.5" className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-secondary/50" />
              </div>
              <div>
                <label className="text-xs text-text-secondary block mb-1">Guiding RMS (")</label>
                <input type="text" value={obsGuiding} onChange={(e) => setObsGuiding(e.target.value)} placeholder="0.6" className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-secondary/50" />
              </div>
              <div>
                <label className="text-xs text-text-secondary block mb-1">Notes</label>
                <input type="text" value={obsNotes} onChange={(e) => setObsNotes(e.target.value)} placeholder="Clouds after 1h..." className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-secondary/50" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleAddObservation} className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 flex items-center gap-1">
                <CheckCircle2 size={14} /> Save
              </button>
              <button onClick={() => setShowAddObs(false)} className="px-4 py-2 bg-surface-secondary text-text-secondary rounded-lg text-sm font-medium hover:bg-surface transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Observation list */}
        {project.observations.length === 0 ? (
          <div className="text-center py-8 text-text-secondary">
            <Camera className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No observations yet</p>
            <p className="text-xs mt-1">Add your first observation to start tracking progress</p>
          </div>
        ) : (
          <div className="space-y-2">
            {[...project.observations].reverse().map(obs => (
              <div key={obs.id} className="bg-background border border-border rounded-lg p-3 flex items-center justify-between group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-mono text-text">{obs.date}</span>
                    <span className="text-text-secondary">{obs.exposuresTaken} × {obs.exposureDuration}s</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-surface-secondary">{obs.filter.replace(/_/g, ' ')}</span>
                    <span className="font-mono text-emerald-300">{(obs.exposuresTaken * obs.exposureDuration / 3600).toFixed(2)}h</span>
                    {obs.seeing && <span className="text-xs text-text-secondary">seeing {obs.seeing}"</span>}
                    {obs.guidingRms && <span className="text-xs text-text-secondary">RMS {obs.guidingRms}"</span>}
                  </div>
                  {obs.notes && <div className="text-xs text-text-secondary mt-1 truncate">{obs.notes}</div>}
                </div>
                <button
                  onClick={() => handleDeleteObservation(obs.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-text-secondary hover:text-red-400 transition-all"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Target info */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <h3 className="font-semibold text-text mb-3 flex items-center gap-2"><Target size={16} /> Target Info</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="bg-background p-3 rounded-lg border border-border">
            <span className="text-text-secondary text-xs block mb-1">Name</span>
            <span className="font-semibold text-text">{project.targetName}</span>
          </div>
          <div className="bg-background p-3 rounded-lg border border-border">
            <span className="text-text-secondary text-xs block mb-1">Coordinates</span>
            <span className="font-mono text-text text-xs">{project.targetRa} / {project.targetDec}</span>
          </div>
          {project.targetMagnitude != null && (
            <div className="bg-background p-3 rounded-lg border border-border">
              <span className="text-text-secondary text-xs block mb-1">Magnitude</span>
              <span className="font-mono font-bold text-text">{(project.targetMagnitude ?? 0).toFixed(1)}</span>
            </div>
          )}
          {project.targetSizeArcmin != null && project.targetSizeArcmin > 0 && (
            <div className="bg-background p-3 rounded-lg border border-border">
              <span className="text-text-secondary text-xs block mb-1">Size</span>
              <span className="font-mono font-bold text-text">{(project.targetSizeArcmin ?? 0).toFixed(1)}'</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectsView;