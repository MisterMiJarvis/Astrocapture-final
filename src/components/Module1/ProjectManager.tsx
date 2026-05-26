// ============================================================================
// COMPOSANT: ProjectCard — Fiche projet avec progression
// Module 1 — Dashboard Central
// ============================================================================

import React from 'react';
import { ImagingProject, ProjectStatus } from '../../types/module1';

interface ProjectCardProps {
  project: ImagingProject;
  onPlay?: (id: string) => void;
  onPause?: (id: string) => void;
  onStop?: (id: string) => void;
  onView?: (id: string) => void;
}

const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string; icon: string }> = {
  waiting_weather: { label: 'En attente météo', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: '⏳' },
  waiting_moon: { label: 'En attente Lune', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: '🌙' },
  in_progress: { label: 'En cours', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: '▶️' },
  paused: { label: 'En pause', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: '⏸️' },
  ready_processing: { label: 'Prêt traitement', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: '🔧' },
  completed: { label: 'Terminé', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: '✅' },
};

const PRIORITY_COLORS = {
  low: 'text-slate-400',
  medium: 'text-yellow-500',
  high: 'text-orange-500',
  critical: 'text-red-500',
};

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onPlay,
  onPause,
  onStop,
  onView,
}) => {
  const status = STATUS_CONFIG[project.status];
  const progress = Math.round(project.progress);

  return (
    <div className="rounded-lg bg-white dark:bg-slate-900 p-4 shadow-sm border border-slate-200 dark:border-slate-700
                    hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">{status.icon}</span>
            <h4 className="font-semibold text-slate-800 dark:text-slate-100 truncate">
              {project.targetName}
            </h4>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded-full border ${status.color}`}>
              {status.label}
            </span>
            <span className={`text-xs ${PRIORITY_COLORS[project.priority]}`}>
              {'★'.repeat(project.priority === 'critical' ? 3 : project.priority === 'high' ? 2 : 1)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {project.status === 'in_progress' ? (
            <button
              onClick={() => onPause?.(project.id)}
              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              title="Pause"
            >
              ⏸️
            </button>
          ) : (
            <button
              onClick={() => onPlay?.(project.id)}
              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-emerald-600"
              title="Démarrer"
            >
              ▶️
            </button>
          )}
          <button
            onClick={() => onStop?.(project.id)}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-red-500"
            title="Arrêter"
          >
            ⏹️
          </button>
          <button
            onClick={() => onView?.(project.id)}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
            title="Détails"
          >
            🔍
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>{project.capturedIntegrationTime.toFixed(1)}h / {project.targetIntegrationTime}h</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className={`
              h-full rounded-full transition-all duration-500
              ${progress >= 100 ? 'bg-emerald-500' :
                progress >= 60 ? 'bg-emerald-400' :
                progress >= 30 ? 'bg-yellow-400' :
                'bg-orange-400'}
            `}
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      </div>

      {/* Footer info */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <div className="flex gap-3">
          <span>🌤️ Score: {project.weatherScore}/100</span>
          {project.sessionsCount && <span>📸 {project.sessionsCount} session{project.sessionsCount > 1 ? 's' : ''}</span>}
        </div>
        <span>
          MAJ: {project.updatedAt.toLocaleDateString('fr-FR')}
        </span>
      </div>

      {/* Notes */}
      {project.notes && (
        <div className="mt-2 text-xs text-slate-400 italic truncate">
          📝 {project.notes}
        </div>
      )}
    </div>
  );
};

export default ProjectCard;
