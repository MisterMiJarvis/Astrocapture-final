// ============================================================================
// COMPOSANT: ProjectDetailView — Arbre projet + sessions
// Module 6 — Projets, Logs & Analyse
// ============================================================================

import React, { useState } from 'react';
import { ProjectDetail, ImagingSession, FilterPlan } from '../../types/module6';

interface ProjectDetailViewProps {
  project: ProjectDetail;
  onSessionClick?: (sessionId: string) => void;
  onSyncTelescopius?: () => void;
}

const STATUS_ICONS: Record<string, string> = {
  planned: '📅',
  in_progress: '▶️',
  completed: '✅',
  cancelled: '❌',
};

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
  project,
  onSessionClick,
  onSyncTelescopius,
}) => {
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  // Guard clause — évite crash si project est undefined
  if (!project) {
    return (
      <div className="rounded-lg bg-white dark:bg-slate-900 p-4 shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
          🎯 Projet
        </h3>
        <p className="text-sm text-slate-500 mt-2">
          Chargement du projet...
        </p>
      </div>
    );
  }

  // Valeurs par défaut pour éviter undefined
  const safeProject = {
    ...project,
    progress: project.progress ?? 0,
    capturedIntegrationTime: project.capturedIntegrationTime ?? 0,
    targetIntegrationTime: project.targetIntegrationTime ?? 1,
    filterPlans: project.filterPlans ?? [],
    sessions: project.sessions ?? [],
  };

  const progress = Math.round(safeProject.progress);

  return (
    <div className="rounded-lg bg-white dark:bg-slate-900 p-4 shadow-sm border border-slate-200 dark:border-slate-700">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            🎯 {safeProject.targetName}
          </h3>
          <div className="text-sm text-slate-500 mt-1">
            {safeProject.targetRa} {safeProject.targetDec} • Priorité: {safeProject.priority}
          </div>
        </div>
        <button
          onClick={onSyncTelescopius}
          className="text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-600
                     hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
        >
          🔄 Sync Telescopius
        </button>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-slate-600 dark:text-slate-300">
            {safeProject.capturedIntegrationTime.toFixed(1)}h / {safeProject.targetIntegrationTime}h
          </span>
          <span className="font-medium text-slate-800 dark:text-slate-100">{progress}%</span>
        </div>
        <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              progress >= 100 ? 'bg-emerald-500' : progress >= 60 ? 'bg-emerald-400' : 'bg-yellow-400'
            }`}
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      </div>

      {/* Filter plans */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
          🎨 Plans Filtre
        </h4>
        <div className="space-y-2">
          {safeProject.filterPlans.map((plan, i) => (
            <FilterPlanBar key={i} plan={plan} />
          ))}
        </div>
      </div>

      {/* Sessions */}
      <div>
        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
          📸 Sessions ({safeProject.sessions.length})
        </h4>
        <div className="space-y-2">
          {safeProject.sessions.map(session => (
            <SessionRow
              key={session.id}
              session={session}
              isExpanded={expandedSession === session.id}
              onToggle={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
              onClick={() => onSessionClick?.(session.id)}
            />
          ))}
        </div>
      </div>

      {/* Notes */}
      {safeProject.notes && (
        <div className="mt-4 p-3 rounded bg-slate-50 dark:bg-slate-800/50 text-sm text-slate-600 dark:text-slate-300 italic">
          📝 {safeProject.notes}
        </div>
      )}
    </div>
  );
};

const FilterPlanBar: React.FC<{ plan: FilterPlan }> = ({ plan }) => {
  const progress = plan.targetTotalTime > 0 ? (plan.capturedTime / plan.targetTotalTime) * 100 : 0;

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-20 text-slate-500">{plan.filter.replace(/_/g, ' ')}</span>
      <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full ${plan.isComplete ? 'bg-emerald-500' : 'bg-blue-400'}`}
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>
      <span className="text-xs text-slate-500 w-24 text-right">
        {plan.capturedSubs}/{plan.targetSubs} • {plan.capturedTime.toFixed(0)}/{plan.targetTotalTime.toFixed(0)}min
      </span>
    </div>
  );
};

const SessionRow: React.FC<{
  session: ImagingSession;
  isExpanded: boolean;
  onToggle: () => void;
  onClick: () => void;
}> = ({ session, isExpanded, onToggle, onClick }) => {
  return (
    <div
      className="rounded-lg border border-slate-100 dark:border-slate-800 overflow-hidden
                 hover:border-slate-300 dark:hover:border-slate-600 transition-all"
    >
      <div
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={onToggle}
      >
        <span className="text-lg">{STATUS_ICONS[session.status] || '●'}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {session.date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
          </div>
          <div className="text-xs text-slate-500">
            {session.startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            {session.endTime && ` — ${session.endTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
            {' • '}
            {session.totalIntegrationTime.toFixed(0)}min
          </div>
        </div>
        <div className="flex items-center gap-2">
          {session.guidingRMS && (
            <span className="text-xs text-slate-500">
              RMS: {session.guidingRMS.toFixed(2)}"
            </span>
          )}
          <span className="text-xs text-slate-400">{session.imagesCount} 📸</span>
          <button
            onClick={e => { e.stopPropagation(); onClick(); }}
            className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300
                       hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            Analyser
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="px-3 pb-3 text-xs text-slate-500 space-y-1 border-t border-slate-100 dark:border-slate-800 pt-2">
          {session.guidingRMS && <div>Guidage RMS: {session.guidingRMS.toFixed(2)}" ({session.guidingRMSArcsec?.toFixed(2)}" calculé)</div>}
          {session.notes && <div className="italic">{session.notes}</div>}
        </div>
      )}
    </div>
  );
};

export default ProjectDetailView;
