// ============================================================================
// ProjectsView — Astrophotography project management
// Create projects from targets, track observations, progress tracking
// ============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Project,
  ProjectStatus,
  ProjectObservation,
  CreateProjectData,
  AddObservationData,
  SNRTarget,
  SNR_TARGET_CONFIG,
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
  FILTER_TYPE_LABELS,
} from '../src/services/filterMapping';
import { AstroFilter, fetchFilters } from '../src/services/filterService';
import {
  Plus, FolderOpen, CheckCircle2, Archive, Trash2, ChevronDown, ChevronRight,
  Telescope, MapPin, Clock, Moon, Target, Camera, Filter, BarChart3,
  X, Eye, Sparkles, Search, RotateCw, Star, ChevronLeft,
  Crosshair, Maximize2, Pencil, Save,
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
  const STATUS_ORDER: Record<string, number> = { in_progress: 0, planning: 1, completed: 2, archived: 3 };
  const filteredProjects = (filterStatus === 'all'
    ? projects
    : projects.filter(p => p.status === filterStatus)
  ).sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9));

  const inProgressCount = projects.filter(p => p.status === 'in_progress').length;
  const completedCount = projects.filter(p => p.status === 'completed' || p.status === 'archived').length;
  const planningCount = projects.filter(p => p.status === 'planning').length;

  // Cumulative KPIs across all projects
  const allExposurePlans = projects.flatMap(p => p.exposurePlan || []);
  const totalSubs = allExposurePlans.reduce((sum, plan) => sum + (plan.subCount || 0), 0);
  const totalPlannedHours = projects.reduce((sum, p) => sum + (p.totalPlannedHours || 0), 0);
  const totalCapturedHours = projects.reduce((sum, p) => sum + (p.totalExposureSeconds || 0), 0) / 3600;
  const totalObservations = projects.reduce((sum, p) => sum + (p.observations?.length || 0), 0);
  const overallProgress = totalPlannedHours > 0 ? Math.min(100, Math.round((totalCapturedHours / totalPlannedHours) * 100)) : 0;

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
    // Optimistic: remove from state immediately
    setProjects(prev => prev.filter(p => p.id !== id));
    if (selectedProject?.id === id) {
      setSelectedProject(null);
      setViewMode('list');
    }
    // Fire and forget — don't block UI
    deleteProject(id).catch(err => console.error('Delete failed:', err));
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

      {/* Cumulative KPIs */}
      {projects.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-surface border border-border rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-primary">{totalSubs.toLocaleString()}</div>
            <div className="text-[10px] text-text-secondary">📸 Total Subs</div>
          </div>
          <div className="bg-surface border border-border rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-yellow-400">{totalCapturedHours.toFixed(1)}h</div>
            <div className="text-[10px] text-text-secondary">⏱️ Captured</div>
          </div>
          <div className="bg-surface border border-border rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-orange-400">{totalPlannedHours.toFixed(1)}h</div>
            <div className="text-[10px] text-text-secondary">🎯 Planned</div>
          </div>
          <div className="bg-surface border border-border rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-emerald-400">{totalObservations}</div>
            <div className="text-[10px] text-text-secondary">🔭 Sessions</div>
          </div>
          <div className="bg-surface border border-border rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-blue-400">{overallProgress}%</div>
            <div className="text-[10px] text-text-secondary">📊 Overall Progress</div>
            <div className="w-full h-1.5 bg-background rounded-full overflow-hidden mt-1.5">
              <div className={`h-full rounded-full transition-all ${overallProgress >= 100 ? 'bg-amber-500' : overallProgress >= 50 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, overallProgress)}%` }} />
            </div>
          </div>
        </div>
      )}

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
            {project.targetMagnitude != null && project.targetMagnitude > 0 && (
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
        <span className="flex items-center gap-1"><MapPin size={12} /> {project.locationSource === 'saintEtienne' ? 'St-Étienne-du-Grès' : project.locationSource === 'pradelles' ? 'Pradelles' : project.locationSource}</span>
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
  const [snrTarget, setSnrTarget] = useState<SNRTarget>(30);
  const [isCreating, setIsCreating] = useState(false);
  const [exposurePreview, setExposurePreview] = useState<any>(null);
  const [manualOverrides, setManualOverrides] = useState<Record<number, { subExposure?: number; subCount?: number }>>({});
  const [step, setStep] = useState<'target' | 'details'>(preselectedTarget ? 'details' : 'target');
  const [showFraming, setShowFraming] = useState(false);

  // Local location/rig state for project creation
  const [localLocation, setLocalLocation] = useState<string>(locationSource);
  const [rigs, setRigs] = useState<any[]>([]);
  const [activeRig, setActiveRig] = useState<any>(null);
  const [activeRigId, setActiveRigId] = useState<string>('');
  const [userFilters, setUserFilters] = useState<AstroFilter[]>([]);

  const localCoords = CREATE_LOCATION_COORDS[localLocation] || CREATE_LOCATION_COORDS.saintEtienne;

  // Load rigs
  useEffect(() => {
    fetch('/api/apls/rigs', { headers: { 'Content-Type': 'application/json' } })
      .then(r => r.ok ? r.json() : [])
      .then((rigList: any[]) => {
        setRigs(rigList);
        const def = rigList.find((r: any) => r.isDefault) || rigList[0];
        if (def) {
          setActiveRigId(def.id);
          setActiveRig(def);
        }
      })
      .catch(() => {});
  }, []);

  // Load user filters from API
  useEffect(() => {
    fetchFilters()
      .then((filters: AstroFilter[]) => setUserFilters(filters.filter(f => f.owned)))
      .catch(() => setUserFilters([]));
  }, []);

  // Clear overrides when exposure preview recalculates (filter/rig/snr change)
  useEffect(() => {
    setManualOverrides({});
  }, [primaryFilter, snrTarget, activeRigId, localLocation]);

  // Update exposure preview
  useEffect(() => {
    if (!selectedTarget) { setExposurePreview(null); return; }
    const effectiveRig = activeRig || rigs[0];
    const bortle = localLocation === 'pradelles' ? 2 : 4;
    // Find the actual filter data from user's collection
    const filterData = userFilters.find((f: AstroFilter) => f.filterType === primaryFilter || f.id === primaryFilter);
    const preview = calculateExposurePlan({
      targetMagnitude: selectedTarget.magnitude ?? null,
      targetSizeArcmin: selectedTarget.sizeArcmin ?? null,
      surfaceBrightness: selectedTarget.surfaceBrightness ?? null,
      filter: primaryFilter,
      focalLength: effectiveRig?.opticModifier?.effectiveFocalLength ?? effectiveRig?.telescope?.focalLength ?? 800,
      aperture: effectiveRig?.telescope?.aperture ?? 200,
      pixelSize: effectiveRig?.imagingCamera?.pixelSize ?? 3.76,
      readNoise: effectiveRig?.imagingCamera?.readNoise ?? 1.5,
      quantumEfficiency: effectiveRig?.imagingCamera?.quantumEfficiency ?? 0.8,
      fullWellDepth: effectiveRig?.imagingCamera?.fullWellDepth ?? 50000,
      moonIllumination: 0.5,
      avgSeeing: 2.5,
      bortle,
      snrTarget,
      filterData, // Pass real filter specs!
    });
    setExposurePreview(preview);
  }, [selectedTarget, primaryFilter, activeRig, rigs, snrTarget, userFilters, localLocation]);

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
      let project = await createProject({
        title: title.trim(),
        targetId: selectedTarget.id,
        targetName: selectedTarget.mainName,
        targetType: selectedTarget.type || '',
        targetRa: selectedTarget.ra,
        targetDec: selectedTarget.dec,
        targetMagnitude: selectedTarget.magnitude ?? null,
        targetSizeArcmin: selectedTarget.sizeArcmin ?? null,
        surfaceBrightness: selectedTarget.surfaceBrightness ?? null,
        targetImageUrl: selectedTarget.imageUrl ?? null,
        locationSource: localLocation,
        lat: localCoords.lat,
        lon: localCoords.lon,
        rigId: activeRig?.id ?? null,
        primaryFilter,
        snrTarget,
      });
      // Apply manual overrides to exposure plan if any
      if (Object.keys(manualOverrides).length > 0 && project.exposurePlan) {
        const overriddenPlan = project.exposurePlan.map((plan, i) => {
          const ov = manualOverrides[i];
          if (!ov) return plan;
          const subExposure = ov.subExposure ?? plan.subExposure;
          const subCount = ov.subCount ?? plan.subCount;
          return {
            ...plan,
            subExposure,
            subCount,
            totalExposureTime: subExposure * subCount,
            totalWithOverhead: Math.round(subExposure * subCount * 1.15),
          };
        });
        const totalPlannedHours = overriddenPlan.reduce((sum, p) => sum + p.totalExposureTime, 0) / 3600;
        project = await updateProject(project.id, { exposurePlan: overriddenPlan, totalPlannedHours });
      }
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
              {selectedTarget?.magnitude != null && selectedTarget.magnitude > 0 && <span className="font-mono">mag {(selectedTarget.magnitude ?? 0).toFixed(1)}</span>}
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
                  <option key={r.id} value={r.id}>{r.name} — {r?.opticModifier?.effectiveFocalLength ?? r?.telescope?.focalLength ?? '?'}mm</option>
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
              {userFilters.length > 0 ? (
                userFilters.map((f: any) => (
                  <option key={f.id} value={f.filterType || f.type}>
                    {f.name} — τ={((f.peakTransmission ?? 0) * 100).toFixed(0)}% | SS={((f.skySuppression ?? 0) * 100).toFixed(0)}%
                  </option>
                ))
              ) : (
                [
                  { value: 'L_Ultimate', label: 'L Ultimate' },
                  { value: 'LPS_D2', label: 'LPS-D2' },
                  { value: 'UV_IR_Cut', label: 'UV/IR Cut' },
                  { value: 'Ha', label: 'Hα' },
                  { value: 'OIII', label: 'OIII' },
                  { value: 'SII', label: 'SII' },
                  { value: 'RGB', label: 'RGB' },
                  { value: 'Luminance', label: 'Luminance' },
                ].map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))
              )}
            </select>
            {(() => {
              const selected = userFilters.find((f: any) => (f.filterType || f.type) === primaryFilter);
              if (!selected) return null;
              return (
                <div className="text-[10px] text-text-secondary mt-1 font-mono">
                  τ={((selected.peakTransmission ?? 0) * 100).toFixed(0)}% | BW={selected.bandwidthNm ?? '?'}nm | SS={((selected.skySuppression ?? 0) * 100).toFixed(0)}%
                </div>
              );
            })()}
          </div>
        </div>
        <div className="text-xs text-text-secondary flex items-center gap-3">
          <span className="flex items-center gap-1"><MapPin size={12} /> {localLocation === 'saintEtienne' ? 'St-Étienne-du-Grès' : 'Pradelles'}</span>
          <span className="flex items-center gap-1"><Moon size={12} /> Moon integration included</span>
        </div>
      </div>

      {/* SNR Target Selector */}
      <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-text flex items-center gap-2"><BarChart3 size={16} /> Objectif SNR</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {([15, 30, 60, 100] as SNRTarget[]).map(snr => {
            const cfg = SNR_TARGET_CONFIG[snr];
            const isSelected = snrTarget === snr;
            return (
              <button
                key={snr}
                onClick={() => setSnrTarget(snr)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/10 ring-1 ring-primary/50'
                    : 'border-border bg-background hover:border-primary/30'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{cfg.icon}</span>
                  <span className={`text-sm font-semibold ${isSelected ? 'text-primary' : 'text-text'}`}>SNR {snr}</span>
                </div>
                <div className={`text-xs ${isSelected ? 'text-primary/80' : 'text-text-secondary'}`}>{cfg.label}</div>
                <div className="text-[10px] text-text-secondary mt-0.5">{cfg.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Framing Assistant */}
      {selectedTarget && (activeRig || rigs.length > 0) && (
        <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text flex items-center gap-2"><Crosshair size={16} /> Cadrage</h3>
            <button
              onClick={() => setShowFraming(!showFraming)}
              className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-surface-secondary text-text-secondary transition-colors"
            >
              {showFraming ? 'Masquer' : 'Voir Aladin'}
            </button>
          </div>
          <FramingPreview
            ra={selectedTarget.ra}
            dec={selectedTarget.dec}
            targetName={selectedTarget.mainName}
            focalLength={activeRig?.opticModifier?.effectiveFocalLength ?? activeRig?.telescope?.focalLength ?? 800}
            sensorWidth={activeRig?.imagingCamera?.sensorWidth ?? 11.3}
            sensorHeight={activeRig?.imagingCamera?.sensorHeight ?? 11.3}
          />
          {showFraming && (
            <AladinFramerInline
              ra={selectedTarget.ra}
              dec={selectedTarget.dec}
              targetName={selectedTarget.mainName}
              focalLength={activeRig?.opticModifier?.effectiveFocalLength ?? activeRig?.telescope?.focalLength ?? 800}
              sensorWidth={activeRig?.imagingCamera?.sensorWidth ?? 11.3}
              sensorHeight={activeRig?.imagingCamera?.sensorHeight ?? 11.3}
            />
          )}
        </div>
      )}

      {/* Exposure Preview */}
      {exposurePreview && exposurePreview.length > 0 && (
        <div className="bg-surface border border-emerald-500/30 rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-text flex items-center gap-2"><span className="bg-emerald-500/20 text-emerald-300 rounded-full w-6 h-6 flex items-center justify-center text-sm">📸</span> Exposure Plan</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {exposurePreview.map((plan: any, i: number) => {
              const ov = manualOverrides[i] || {};
              const currentSubExposure = ov.subExposure ?? plan.subExposure;
              const currentSubCount = ov.subCount ?? plan.subCount;
              const currentTotal = currentSubExposure * currentSubCount;
              const currentWithOverhead = Math.round(currentSubExposure * currentSubCount * 1.15);
              const isOverridden = !!manualOverrides[i];
              return (
                <div key={i} className={`bg-background p-3 rounded-lg border ${isOverridden ? 'border-amber-500/50' : 'border-border'}`}>
                  <div className="text-[10px] text-text-secondary block mb-1">{plan.filter.replace(/_/g, ' ')}</div>
                  <div className="flex items-end gap-1 mb-1">
                    <div className="flex-1">
                      <label className="text-[9px] text-text-secondary block">Sub(s)</label>
                      <input
                        type="number"
                        step={10}
                        min={10}
                        max={600}
                        value={currentSubExposure}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || plan.subExposure;
                          setManualOverrides(prev => ({ ...prev, [i]: { ...prev[i], subExposure: val } }));
                        }}
                        className="w-full bg-surface border border-border rounded px-1.5 py-1 text-xs text-text font-mono focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[9px] text-text-secondary block">#Subs</label>
                      <input
                        type="number"
                        step={1}
                        min={1}
                        value={currentSubCount}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || plan.subCount;
                          setManualOverrides(prev => ({ ...prev, [i]: { ...prev[i], subCount: val } }));
                        }}
                        className="w-full bg-surface border border-border rounded px-1.5 py-1 text-xs text-text font-mono focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                  <div className="text-xs text-text-secondary mt-1">{(currentWithOverhead / 3600).toFixed(1)}h total</div>
                  <div className="text-[10px] text-amber-300 mt-0.5">Range: {plan.subExposureMin}s–{plan.subExposureMax}s</div>
                  <div className="text-xs text-emerald-300 mt-0.5">{plan.snrEstimate}</div>
                  <div className="text-[9px] text-text-secondary/60 mt-0.5">
                    {plan.sampling ? plan.sampling + '"/px' : ''} · τ<sub>s</sub>={plan.tauSignal ? (plan.tauSignal * 100).toFixed(0) + '%' : '?'} · τ<sub>sky</sub>={plan.tauSky ? (plan.tauSky * 100).toFixed(0) + '%' : '?'}
                  </div>
                  {isOverridden && (
                    <button
                      onClick={() => setManualOverrides(prev => { const next = { ...prev }; delete next[i]; return next; })}
                      className="mt-1 text-[9px] text-amber-400 hover:text-amber-300 flex items-center gap-0.5"
                    >
                      <RotateCw size={9} /> Auto
                    </button>
                  )}
                </div>
              );
            })}
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
  const [isEditing, setIsEditing] = useState(false);

  // Edit state
  const [editTitle, setEditTitle] = useState(project.title);
  const [editLocation, setEditLocation] = useState(project.locationSource);
  const [editFilter, setEditFilter] = useState(project.primaryFilter);
  const [editSnrTarget, setEditSnrTarget] = useState<SNRTarget>(project.snrTarget);
  const [editRigId, setEditRigId] = useState(project.rigId || '');

  // Rigs & filters for edit mode
  const [rigs, setRigs] = useState<any[]>([]);
  const [activeRig, setActiveRig] = useState<any>(null);
  const [userFilters, setUserFilters] = useState<any[]>([]);
  const [editExposurePreview, setEditExposurePreview] = useState<any>(null);
  const [editManualOverrides, setEditManualOverrides] = useState<Record<number, { subExposure?: number; subCount?: number }>>({});
  const [showFraming, setShowFraming] = useState(false);

  // Load rigs and filters
  useEffect(() => {
    fetch('/api/apls/rigs', { headers: { 'Content-Type': 'application/json' } })
      .then(r => r.ok ? r.json() : [])
      .then((rigList: any[]) => {
        setRigs(rigList);
        const current = rigList.find((r: any) => r.id === project.rigId);
        const def = current || rigList.find((r: any) => r.isDefault);
        if (def) {
          setActiveRig(def);
          if (!editRigId) setEditRigId(def.id);
        }
      })
      .catch(() => {});
    fetchFilters()
      .then((filters: any[]) => setUserFilters(filters.filter((f: any) => f.owned)))
      .catch(() => setUserFilters([]));
  }, []);

  // Recalculate exposure plan on edit changes
  const isFirstEditRender = useRef(true);
  useEffect(() => {
    if (!isEditing) { isFirstEditRender.current = true; return; }
    // Don't reset overrides on first render — they were pre-filled by startEditing()
    if (!isFirstEditRender.current) {
      setEditManualOverrides({});
    }
    isFirstEditRender.current = false;
    const bortle = editLocation === 'pradelles' ? 2 : 4;
    const editEffectiveRig = activeRig || rigs.find((r: any) => r.id === editRigId);
    const filterData = userFilters.find((f: any) => f.filterType === editFilter || f.type === editFilter);
    const preview = calculateExposurePlan({
      targetMagnitude: project.targetMagnitude,
      targetSizeArcmin: project.targetSizeArcmin,
      surfaceBrightness: project.surfaceBrightness ?? null,
      filter: editFilter,
      focalLength: editEffectiveRig?.opticModifier?.effectiveFocalLength ?? editEffectiveRig?.telescope?.focalLength ?? project.focalLength ?? 800,
      aperture: editEffectiveRig?.telescope?.aperture ?? project.aperture ?? 200,
      pixelSize: editEffectiveRig?.imagingCamera?.pixelSize ?? project.pixelSize ?? 3.76,
      readNoise: editEffectiveRig?.imagingCamera?.readNoise ?? 1.5,
      quantumEfficiency: editEffectiveRig?.imagingCamera?.quantumEfficiency ?? 0.8,
      fullWellDepth: editEffectiveRig?.imagingCamera?.fullWellDepth ?? 50000,
      moonIllumination: 0.5,
      avgSeeing: 2.5,
      bortle,
      snrTarget: editSnrTarget,
      filterData,
    });
    setEditExposurePreview(preview);
  }, [isEditing, editFilter, editSnrTarget, editLocation, editRigId, rigs, activeRig, userFilters, project]);

  const handleRigChange = (rigId: string) => {
    setEditRigId(rigId);
    const rig = rigs.find((r: any) => r.id === rigId);
    setActiveRig(rig || null);
  };

  const startEditing = () => {
    setEditTitle(project.title);
    setEditLocation(project.locationSource);
    setEditFilter(project.primaryFilter);
    setEditSnrTarget(project.snrTarget);
    setEditRigId(project.rigId || '');
    const currentRig = rigs.find((r: any) => r.id === project.rigId);
    if (currentRig) setActiveRig(currentRig);
    // Pre-fill manual overrides with the project's saved exposure plan values
    // so the UI shows what was saved, not the formula defaults
    if (project.exposurePlan && project.exposurePlan.length > 0) {
      const savedOverrides: Record<number, { subExposure?: number; subCount?: number }> = {};
      project.exposurePlan.forEach((plan: any, i: number) => {
        savedOverrides[i] = {
          subExposure: plan.subExposure,
          subCount: plan.subCount,
        };
      });
      setEditManualOverrides(savedOverrides);
    }
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditExposurePreview(null);
    setEditManualOverrides({});
  };

  const saveEdits = async () => {
    const rig = rigs.find((r: any) => r.id === editRigId);
    const updates: any = {
      title: editTitle.trim(),
      locationSource: editLocation,
      primaryFilter: editFilter,
      snrTarget: editSnrTarget,
      rigId: editRigId || null,
      rigName: rig?.name || null,
      focalLength: rig?.opticModifier?.effectiveFocalLength ?? rig?.telescope?.focalLength ?? null,
      aperture: rig?.telescope?.aperture ?? null,
      pixelSize: rig?.imagingCamera?.pixelSize ?? null,
      sensorWidth: rig?.imagingCamera?.sensorWidth ?? null,
      sensorHeight: rig?.imagingCamera?.sensorHeight ?? null,
    };
    // Recalculate exposure plan (apply manual overrides if any)
    if (editExposurePreview && editExposurePreview.length > 0) {
      const overriddenPlan = editExposurePreview.map((plan: any, i: number) => {
        const ov = editManualOverrides[i];
        if (!ov) return plan;
        const subExposure = ov.subExposure ?? plan.subExposure;
        const subCount = ov.subCount ?? plan.subCount;
        return {
          ...plan,
          subExposure,
          subCount,
          totalExposureTime: subExposure * subCount,
          totalWithOverhead: Math.round(subExposure * subCount * 1.15),
        };
      });
      updates.exposurePlan = overriddenPlan;
      updates.totalPlannedHours = overriddenPlan.reduce((sum: number, p: any) => sum + p.totalExposureTime, 0) / 3600;
    }
    try {
      const updated = await updateProject(project.id, updates);
      setProject(updated);
      onUpdate(updated);
      setIsEditing(false);
      setEditExposurePreview(null);
      setEditManualOverrides({});
    } catch (err) {
      console.error('Failed to update project:', err);
      alert('Erreur lors de la sauvegarde');
    }
  };

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

  // ─── Edit Mode ──────────────────────────────────────────────────────────────

  if (isEditing) {
    const LOCATION_COORDS: Record<string, { lat: number; lon: number }> = {
      saintEtienne: { lat: 43.7889, lon: 4.7533 },
      pradelles: { lat: 44.6167, lon: 3.9667 },
    };

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={cancelEditing} className="p-2 rounded-lg hover:bg-surface-secondary transition-colors">
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-display font-bold flex items-center gap-2">
                ✏️ Modifier le projet
              </h1>
              <p className="text-sm text-text-secondary">Modifiez les paramètres du projet</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={saveEdits}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors"
            >
              <Save size={14} /> Sauvegarder
            </button>
            <button onClick={cancelEditing} className="px-4 py-2 bg-surface-secondary text-text-secondary rounded-lg text-sm font-medium hover:bg-surface transition-colors">
              Annuler
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-text">Titre du projet</h3>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="e.g. M42 Orion Nebula — Hα project"
            className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-text placeholder:text-text-secondary/50 focus:outline-none focus:border-primary"
          />
        </div>

        {/* Target info (read-only in edit — target change would require new project) */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-text flex items-center gap-2"><Target size={16} /> Cible</h3>
          <div className="bg-background border border-border rounded-lg p-4 flex items-center gap-4">
            {project.targetImageUrl ? (
              <img src={project.targetImageUrl} alt={project.targetName} className="w-16 h-16 rounded-lg object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-surface-secondary flex items-center justify-center text-2xl">
                {TYPE_EMOJIS[project.targetType] || '🔭'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-text">{project.targetName}</div>
              <div className="text-sm text-text-secondary flex items-center gap-3 mt-1">
                {project.targetMagnitude != null && project.targetMagnitude > 0 && <span className="font-mono">mag {(project.targetMagnitude ?? 0).toFixed(1)}</span>}
                {project.targetSizeArcmin != null && (project.targetSizeArcmin ?? 0) > 0 && <span className="font-mono">{(project.targetSizeArcmin ?? 0).toFixed(0)}'</span>}
                <span className="font-mono text-xs text-text-secondary">{project.targetRa} / {project.targetDec}</span>
              </div>
            </div>
            <span className="text-xs text-text-secondary bg-surface-secondary px-2 py-1 rounded">Changer = nouveau projet</span>
          </div>
        </div>

        {/* Setup: Location + Rig + Filter */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-text flex items-center gap-2"><Telescope size={16} /> Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Location */}
            <div>
              <label className="text-xs text-text-secondary block mb-1">📍 Lieu</label>
              <select
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
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
                  value={editRigId}
                  onChange={(e) => handleRigChange(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
                >
                  {rigs.map((r: any) => (
                    <option key={r.id} value={r.id}>{r.name} — {r?.opticModifier?.effectiveFocalLength ?? r?.telescope?.focalLength ?? '?'}mm</option>
                  ))}
                </select>
              ) : (
                <div className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-secondary">Aucun rig configuré</div>
              )}
              {activeRig && (
                <div className="text-[10px] text-text-secondary mt-1 font-mono">
                  {activeRig.telescope?.focalLength ?? '?'}mm f/{activeRig.telescope?.fRatio ?? '?'} · {activeRig.imagingCamera?.pixelSize ?? '?'}µm/px
                </div>
              )}
            </div>

            {/* Filter */}
            <div>
              <label className="text-xs text-text-secondary block mb-1">🔲 Filtre principal</label>
              <select
                value={editFilter}
                onChange={(e) => setEditFilter(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
              >
                {userFilters.length > 0 ? (
                  userFilters.map((f: any) => (
                    <option key={f.id} value={f.filterType || f.type}>
                      {f.name} — τ={((f.peakTransmission ?? 0) * 100).toFixed(0)}% | SS={((f.skySuppression ?? 0) * 100).toFixed(0)}%
                    </option>
                  ))
                ) : (
                  [
                    { value: 'L_Ultimate', label: 'L Ultimate' },
                    { value: 'LPS_D2', label: 'LPS-D2' },
                    { value: 'UV_IR_Cut', label: 'UV/IR Cut' },
                    { value: 'Ha', label: 'Hα' },
                    { value: 'OIII', label: 'OIII' },
                    { value: 'SII', label: 'SII' },
                    { value: 'RGB', label: 'RGB' },
                    { value: 'Luminance', label: 'Luminance' },
                  ].map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))
                )}
              </select>
              {(() => {
                const selected = userFilters.find((f: any) => (f.filterType || f.type) === editFilter);
                if (!selected) return null;
                return (
                  <div className="text-[10px] text-text-secondary mt-1 font-mono">
                    τ={((selected.peakTransmission ?? 0) * 100).toFixed(0)}% | BW={selected.bandwidthNm ?? '?'}nm | SS={((selected.skySuppression ?? 0) * 100).toFixed(0)}%
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* SNR Target Selector */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-text flex items-center gap-2"><BarChart3 size={16} /> Objectif SNR</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {([15, 30, 60, 100] as SNRTarget[]).map(snr => {
              const cfg = SNR_TARGET_CONFIG[snr];
              const isSelected = editSnrTarget === snr;
              return (
                <button
                  key={snr}
                  onClick={() => setEditSnrTarget(snr)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/10 ring-1 ring-primary/50'
                      : 'border-border bg-background hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{cfg.icon}</span>
                    <span className={`text-sm font-semibold ${isSelected ? 'text-primary' : 'text-text'}`}>SNR {snr}</span>
                  </div>
                  <div className={`text-xs ${isSelected ? 'text-primary/80' : 'text-text-secondary'}`}>{cfg.label}</div>
                  <div className="text-[10px] text-text-secondary mt-0.5">{cfg.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Framing */}
        {(activeRig || project.targetRa) && (
          <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-text flex items-center gap-2"><Crosshair size={16} /> Cadrage</h3>
              <button
                onClick={() => setShowFraming(!showFraming)}
                className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-surface-secondary text-text-secondary transition-colors"
              >
                {showFraming ? 'Masquer' : 'Voir Aladin'}
              </button>
            </div>
            <FramingPreview
              ra={project.targetRa}
              dec={project.targetDec}
              targetName={project.targetName}
              focalLength={activeRig?.opticModifier?.effectiveFocalLength ?? activeRig?.telescope?.focalLength ?? project.focalLength ?? 800}
              sensorWidth={activeRig?.imagingCamera?.sensorWidth ?? project.sensorWidth ?? 11.3}
              sensorHeight={activeRig?.imagingCamera?.sensorHeight ?? project.sensorHeight ?? 11.3}
            />
            {showFraming && (
              <AladinFramerInline
                ra={project.targetRa}
                dec={project.targetDec}
                targetName={project.targetName}
                focalLength={activeRig?.opticModifier?.effectiveFocalLength ?? activeRig?.telescope?.focalLength ?? project.focalLength ?? 800}
                sensorWidth={activeRig?.imagingCamera?.sensorWidth ?? project.sensorWidth ?? 11.3}
                sensorHeight={activeRig?.imagingCamera?.sensorHeight ?? project.sensorHeight ?? 11.3}
              />
            )}
          </div>
        )}

        {/* Exposure Plan Preview */}
        {editExposurePreview && editExposurePreview.length > 0 && (
          <div className="bg-surface border border-emerald-500/30 rounded-xl p-5 space-y-3">
            <h3 className="font-semibold text-text flex items-center gap-2">
              <span className="bg-emerald-500/20 text-emerald-300 rounded-full w-6 h-6 flex items-center justify-center text-sm">📸</span> Plan d'exposition recalculé
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {editExposurePreview.map((plan: any, i: number) => {
                const ov = editManualOverrides[i] || {};
                const currentSubExposure = ov.subExposure ?? plan.subExposure;
                const currentSubCount = ov.subCount ?? plan.subCount;
                const currentWithOverhead = Math.round(currentSubExposure * currentSubCount * 1.15);
                const isOverridden = !!editManualOverrides[i];
                return (
                  <div key={i} className={`bg-background p-3 rounded-lg border ${isOverridden ? 'border-amber-500/50' : 'border-border'}`}>
                    <div className="text-[10px] text-text-secondary block mb-1">{plan.filter.replace(/_/g, ' ')}</div>
                    <div className="flex items-end gap-1 mb-1">
                      <div className="flex-1">
                        <label className="text-[9px] text-text-secondary block">Sub(s)</label>
                        <input
                          type="number"
                          step={10}
                          min={10}
                          max={600}
                          value={currentSubExposure}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || plan.subExposure;
                            setEditManualOverrides(prev => ({ ...prev, [i]: { ...prev[i], subExposure: val } }));
                          }}
                          className="w-full bg-surface border border-border rounded px-1.5 py-1 text-xs text-text font-mono focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[9px] text-text-secondary block">#Subs</label>
                        <input
                          type="number"
                          step={1}
                          min={1}
                          value={currentSubCount}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || plan.subCount;
                            setEditManualOverrides(prev => ({ ...prev, [i]: { ...prev[i], subCount: val } }));
                          }}
                          className="w-full bg-surface border border-border rounded px-1.5 py-1 text-xs text-text font-mono focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                    <div className="text-xs text-text-secondary mt-1">{(currentWithOverhead / 3600).toFixed(1)}h total</div>
                    <div className="text-[10px] text-amber-300 mt-0.5">Range: {plan.subExposureMin}s–{plan.subExposureMax}s</div>
                    <div className="text-xs text-emerald-300 mt-0.5">{plan.snrEstimate}</div>
                    <div className="text-[9px] text-text-secondary/60 mt-0.5">
                      {plan.sampling ? plan.sampling + '"/px' : ''} · τ<sub>s</sub>={plan.tauSignal ? (plan.tauSignal * 100).toFixed(0) + '%' : '?'} · τ<sub>sky</sub>={plan.tauSky ? (plan.tauSky * 100).toFixed(0) + '%' : '?'}
                    </div>
                    {isOverridden && (
                      <button
                        onClick={() => setEditManualOverrides(prev => { const next = { ...prev }; delete next[i]; return next; })}
                        className="mt-1 text-[9px] text-amber-400 hover:text-amber-300 flex items-center gap-0.5"
                      >
                        <RotateCw size={9} /> Auto
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="text-xs text-text-secondary">
              Total: {editExposurePreview.reduce((sum: number, p: any, i: number) => {
                const ov = editManualOverrides[i];
                if (!ov) return sum + p.totalExposureTime;
                return sum + (ov.subExposure ?? p.subExposure) * (ov.subCount ?? p.subCount);
              }, 0) / 3600}h
            </div>
          </div>
        )}

        {/* Save / Cancel at bottom */}
        <div className="flex gap-3">
          <button
            onClick={saveEdits}
            className="flex-1 py-3 bg-emerald-500 text-white rounded-lg font-semibold text-sm hover:bg-emerald-600 flex items-center justify-center gap-2 transition-colors"
          >
            <Save size={16} /> Sauvegarder les modifications
          </button>
          <button
            onClick={cancelEditing}
            className="px-6 py-3 bg-surface-secondary text-text-secondary rounded-lg font-medium text-sm hover:bg-surface transition-colors"
          >
            Annuler
          </button>
        </div>
      </div>
    );
  }

  // ─── View Mode (original detail view) ──────────────────────────────────────

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
              {project.targetMagnitude != null && project.targetMagnitude > 0 && <span className="font-mono">mag {(project.targetMagnitude ?? 0).toFixed(1)}</span>}
              <span className="flex items-center gap-1"><Telescope size={12} /> {project.rigName || 'No rig'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={startEditing}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-sm text-text-secondary hover:text-primary hover:border-primary/50 transition-colors"
          >
            <Pencil size={14} /> Modifier
          </button>
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
                  {[
                    { value: 'L_Ultimate', label: 'L Ultimate' },
                    { value: 'LPS_D2', label: 'LPS-D2' },
                    { value: 'UV_IR_Cut', label: 'UV/IR Cut' },
                    { value: 'Ha', label: 'Hα' },
                    { value: 'OIII', label: 'OIII' },
                    { value: 'SII', label: 'SII' },
                    { value: 'RGB', label: 'RGB' },
                    { value: 'Luminance', label: 'Luminance' },
                  ].map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
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
          {project.targetMagnitude != null && project.targetMagnitude > 0 && (
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

      {/* Setup summary */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <h3 className="font-semibold text-text mb-3 flex items-center gap-2"><Telescope size={16} /> Configuration</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="bg-background p-3 rounded-lg border border-border">
            <span className="text-text-secondary text-xs block mb-1">Lieu</span>
            <span className="font-semibold text-text">{project.locationSource === 'saintEtienne' ? 'St-Étienne-du-Grès' : 'Pradelles'}</span>
          </div>
          <div className="bg-background p-3 rounded-lg border border-border">
            <span className="text-text-secondary text-xs block mb-1">Filtre</span>
            <span className="font-semibold text-text">{project.primaryFilter.replace(/_/g, ' ')}</span>
          </div>
          <div className="bg-background p-3 rounded-lg border border-border">
            <span className="text-text-secondary text-xs block mb-1">SNR cible</span>
            <span className="font-mono font-bold text-text">{project.snrTarget}</span>
          </div>
          <div className="bg-background p-3 rounded-lg border border-border">
            <span className="text-text-secondary text-xs block mb-1">Rig</span>
            <span className="font-semibold text-text">{project.rigName || 'Non assigné'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectsView;

// ─── Framing Preview Component ────────────────────────────────────────────

interface FramingPreviewProps {
  ra: string;
  dec: string;
  targetName: string;
  focalLength: number;
  sensorWidth: number;
  sensorHeight: number;
}

/**
 * Shows FOV dimensions and fit assessment for the target + rig combination.
 */
const FramingPreview: React.FC<FramingPreviewProps> = ({
  ra, dec, targetName, focalLength, sensorWidth, sensorHeight,
}) => {
  // Calculate FOV in arcmin
  const fovWidth = sensorWidth / focalLength * 3438;  // arcmin
  const fovHeight = sensorHeight / focalLength * 3438;  // arcmin
  const fovDiagonal = Math.sqrt(fovWidth * fovWidth + fovHeight * fovHeight);
  const resolution = (sensorWidth / focalLength * 206.265); // arcsec/px (approx)

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="bg-background p-3 rounded-lg border border-border">
        <span className="text-text-secondary text-xs block mb-1">Champ de vue</span>
        <span className="font-mono font-bold text-text">{fovWidth.toFixed(1)}' × {fovHeight.toFixed(1)}'</span>
      </div>
      <div className="bg-background p-3 rounded-lg border border-border">
        <span className="text-text-secondary text-xs block mb-1">Résolution</span>
        <span className="font-mono font-bold text-text">{resolution.toFixed(2)}"/px</span>
      </div>
      <div className="bg-background p-3 rounded-lg border border-border">
        <span className="text-text-secondary text-xs block mb-1">Cible</span>
        <span className="font-mono text-xs text-text">{ra} {dec}</span>
      </div>
      <div className="bg-background p-3 rounded-lg border border-border">
        <span className="text-text-secondary text-xs block mb-1">Diagonale</span>
        <span className="font-mono font-bold text-text">{fovDiagonal.toFixed(1)}'</span>
      </div>
    </div>
  );
};

// ─── Aladin Framer Inline ────────────────────────────────────────────────

interface AladinFramerInlineProps {
  ra: string;
  dec: string;
  targetName: string;
  focalLength: number;
  sensorWidth: number;
  sensorHeight: number;
}

/**
 * Inline Aladin Lite viewer for framing in project creation.
 * Loads Aladin dynamically and shows FOV overlay.
 */
const AladinFramerInline: React.FC<AladinFramerInlineProps> = ({
  ra, dec, targetName, focalLength, sensorWidth, sensorHeight,
}) => {
  const aladinRef = useRef<HTMLDivElement | null>(null);
  const aladinInstanceRef = useRef<any>(null);
  const [aladinLoaded, setAladinLoaded] = useState(false);
  const [scriptError, setScriptError] = useState(false);
  const [rotationAngle, setRotationAngle] = useState(0);

  const fovWidth = sensorWidth / focalLength * 3438;
  const fovHeight = sensorHeight / focalLength * 3438;

  // Parse RA/Dec into degrees — Telescopius returns RA in hours, Dec in degrees
  const centerRA = parseRaToDeg(ra);
  const centerDec = parseDecToDeg(dec);

  useEffect(() => {
    if ((window as any).A) {
      setAladinLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://aladin.cds.unistra.fr/AladinLite/api/v3/latest/aladin.js';
    script.charset = 'utf-8';
    script.onload = () => setAladinLoaded(true);
    script.onerror = () => setScriptError(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!aladinLoaded || !aladinRef.current || !(window as any).A) return;
    try {
      const A = (window as any).A;
      // Destroy previous instance if exists
      if (aladinInstanceRef.current) {
        try { aladinInstanceRef.current = null; } catch {}
        if (aladinRef.current) aladinRef.current.innerHTML = '';
      }
      // Initialize Aladin with a generic target, then reposition via gotoRaDec
      const aladin = A.aladin(aladinRef.current, {
        target: '0 0', // placeholder — will reposition below
        fov: Math.max(fovWidth, fovHeight) / 60 * 1.3,
        cooFrame: 'ICRS',
        showReticle: true,
        showZoomControl: true,
        showFullscreenControl: false,
        showLayersControl: true,
        survey: 'https://alasky.cds.unistra.fr/DSS/color',
      });

      // Reposition to correct coordinates using gotoRaDec (degrees, unambiguous)
      if (centerRA != null && centerDec != null && !isNaN(centerRA) && !isNaN(centerDec)) {
        aladin.gotoRaDec(centerRA, centerDec);
      }

      // Store instance for cleanup
      aladinInstanceRef.current = aladin;
      // FOV overlay rectangle
      const overlay = A.graphicOverlay({ name: 'FOV', color: '#3b82f6', lineWidth: 2 });
      aladin.addOverlay(overlay);

      // Draw FOV rectangle
      const fovWDeg = fovWidth / 60;
      const fovHDeg = fovHeight / 60;

      if (centerRA != null && centerDec != null) {
        const corners = getRotatedCorners(centerRA, centerDec, fovWDeg, fovHDeg, rotationAngle);
        overlay.addFootprints([A.polygon(corners)]);
      }
    } catch (err) {
      console.error('Aladin init error:', err);
      setScriptError(true);
    }
  }, [aladinLoaded, centerRA, centerDec, focalLength, sensorWidth, sensorHeight, rotationAngle]);

  if (scriptError) {
    return (
      <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-center text-sm text-red-300">
        ⚠️ Impossible de charger Aladin Lite
      </div>
    );
  }

  if (!aladinLoaded) {
    return (
      <div className="p-8 rounded-lg bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-secondary">PA:</span>
        <input
          type="number"
          value={rotationAngle}
          onChange={(e) => setRotationAngle(Number(e.target.value))}
          className="w-16 px-2 py-1 rounded-lg border border-border bg-background text-sm text-text"
        />
        <span className="text-xs text-text-secondary">°</span>
        <button onClick={() => setRotationAngle(0)} className="text-xs px-2 py-1 rounded border border-border hover:bg-surface-secondary text-text-secondary">
          Reset
        </button>
      </div>
      <div
        ref={aladinRef}
        style={{ width: '100%', height: '400px' }}
        className="rounded-lg border border-border overflow-hidden"
      />
    </div>
  );
};

// ─── Helper: Parse coordinates ─────────────────────────────────────────────

function parseRaToDeg(ra: string | number): number | null {
  try {
    // Telescopius API returns RA in hours (J2000), not degrees!
    if (typeof ra === 'number') return ra * 15; // hours → degrees
    if (!ra) return null;
    if (!ra.includes(':')) return (parseFloat(ra) || 0) * 15 || null; // hours → degrees
    const parts = ra.split(':').map(Number);
    return parts[0] * 15 + parts[1] * 15 / 60 + parts[2] * 15 / 3600;
  } catch { return null; }
}

function parseDecToDeg(dec: string | number): number | null {
  try {
    if (typeof dec === 'number') return dec;
    if (!dec) return null;
    if (!dec.includes(':')) return parseFloat(dec) || null;
    const sign = (dec.startsWith('-')) ? -1 : 1;
    const parts = dec.replace(/[+-]/, '').split(':').map(Number);
    return sign * (parts[0] + parts[1] / 60 + parts[2] / 3600);
  } catch { return null; }
}

function getRotatedCorners(
  centerRA: number, centerDec: number,
  widthDeg: number, heightDeg: number, rotationDeg: number
): [number, number][] {
  const rotRad = (rotationDeg * Math.PI) / 180;
  const cosR = Math.cos(rotRad);
  const sinR = Math.sin(rotRad);
  const hw = widthDeg / 2;
  const hh = heightDeg / 2;
  const corners = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]];
  return corners.map(([x, y]) => {
    const rx = x * cosR - y * sinR;
    const ry = x * sinR + y * cosR;
    const ra = centerRA + rx / Math.cos((centerDec * Math.PI) / 180);
    const dec = centerDec + ry;
    return [ra, dec] as [number, number];
  });
}