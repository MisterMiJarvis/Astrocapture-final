// ============================================================================
// COMPOSANT: ProjectDetailView — Arbre projet + sessions
// Module 6 — Projets, Logs & Analyse
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Activity, TrendingDown, TrendingUp, Award, AlertTriangle, Crosshair } from 'lucide-react';
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


// ============================================================================
// GuidingPerformance — Aggregated PHD2 stats for a project
// ============================================================================

interface GuidingSession {
  id: string;
  filename: string;
  session_index: number;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  camera: string;
  frame_count: number;
  rms_total_arcsec: number;
  rms_ra_arcsec: number;
  rms_dec_arcsec: number;
  peak_ra_arcsec: number;
  peak_dec_arcsec: number;
  mean_snr: number;
  mean_star_mass: number;
  dither_count: number;
  star_lost_count: number;
  settling_failed_count: number;
  created_at: string;
}

interface GuidingData {
  hasData: boolean;
  sessionCount: number;
  totalFrames: number;
  totalDurationSeconds: number;
  avgRmsTotal: number;
  avgRmsRa: number;
  avgRmsDec: number;
  avgSnr: number;
  totalDithers: number;
  totalStarLost: number;
  totalSettlingFailed: number;
  bestSession: { id: string; start_time: string; rms_total_arcsec: number; filename: string } | null;
  worstSession: { id: string; start_time: string; rms_total_arcsec: number; filename: string } | null;
  rmsTrend: { session_id: string; start_time: string; rms_total: number; rms_ra: number; rms_dec: number }[];
  sessions: GuidingSession[];
}

const API_BASE = (window as any).__AC_API_BASE__ || '/api';

const rmsColor = (rms: number) => {
  if (rms <= 0.8) return 'text-emerald-500';
  if (rms <= 1.5) return 'text-yellow-500';
  if (rms <= 2.5) return 'text-orange-500';
  return 'text-red-500';
};

const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const GuidingPerformance: React.FC<{ projectId: string }> = ({ projectId }) => {
  const [data, setData] = useState<GuidingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGuiding = async () => {
      try {
        const res = await fetch(`${API_BASE}/apls/projects/${projectId}/guiding`);
        if (res.ok) {
          const d = await res.json();
          setData(d);
        }
      } catch (err) {
        console.error('Guiding fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchGuiding();
  }, [projectId]);

  if (loading) {
    return (
      <div className="mt-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-2">
          <Activity size={16} className="text-primary" />
          Guiding Performance
        </h4>
        <p className="text-xs text-slate-400">Loading...</p>
      </div>
    );
  }

  if (!data || !data.hasData) {
    return (
      <div className="mt-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-2">
          <Activity size={16} className="text-primary" />
          Guiding Performance
        </h4>
        <p className="text-xs text-slate-400">
          No PHD2 guiding logs linked to this project yet. Link a session from the PHD2 Analysis tab.
        </p>
      </div>
    );
  }

  const maxRms = Math.max(...data.rmsTrend.map(t => t.rms_total), 1);

  return (
    <div className="mt-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
      <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
        <Activity size={16} className="text-primary" />
        Guiding Performance
        <span className="text-xs text-slate-400 font-normal">
          {data.sessionCount} session{data.sessionCount > 1 ? 's' : ''} · {data.totalFrames} frames · {formatDuration(data.totalDurationSeconds)}
        </span>
      </h4>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
          <div className="text-xs text-slate-500 mb-1">Avg RMS Total</div>
          <div className={`text-lg font-bold ${rmsColor(data.avgRmsTotal)}`}>
            {data.avgRmsTotal.toFixed(2)}"
          </div>
          <div className="text-xs text-slate-400 mt-1">
            RA {data.avgRmsRa.toFixed(2)}" / DEC {data.avgRmsDec.toFixed(2)}"
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
          <div className="text-xs text-slate-500 mb-1">Avg SNR</div>
          <div className="text-lg font-bold text-slate-700 dark:text-slate-200">
            {data.avgSnr.toFixed(1)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {data.totalDithers} dithers · {data.totalStarLost} star lost
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
          <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
            <Award size={12} className="text-emerald-500" /> Best Session
          </div>
          <div className={`text-lg font-bold ${rmsColor(data.bestSession?.rms_total_arcsec || 0)}`}>
            {data.bestSession?.rms_total_arcsec.toFixed(2) || '—'}"
          </div>
          <div className="text-xs text-slate-400 mt-1 truncate">
            {data.bestSession?.filename || data.bestSession?.start_time?.slice(0, 19) || '—'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
          <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
            <AlertTriangle size={12} className="text-orange-500" /> Worst Session
          </div>
          <div className={`text-lg font-bold ${rmsColor(data.worstSession?.rms_total_arcsec || 0)}`}>
            {data.worstSession?.rms_total_arcsec.toFixed(2) || '—'}"
          </div>
          <div className="text-xs text-slate-400 mt-1 truncate">
            {data.worstSession?.filename || data.worstSession?.start_time?.slice(0, 19) || '—'}
          </div>
        </div>
      </div>

      {/* RMS Trend Bar Chart */}
      {data.rmsTrend.length > 1 && (
        <div className="mb-4">
          <div className="text-xs text-slate-500 mb-2 flex items-center gap-1">
            <TrendingUp size={12} /> RMS Trend across sessions
          </div>
          <div className="flex items-end gap-2 h-24">
            {data.rmsTrend.map((t, i) => {
              const heightPct = (t.rms_total / maxRms) * 100;
              const color = t.rms_total <= 0.8 ? 'bg-emerald-500' :
                           t.rms_total <= 1.5 ? 'bg-yellow-500' :
                           t.rms_total <= 2.5 ? 'bg-orange-500' : 'bg-red-500';
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    {t.rms_total.toFixed(2)}"
                  </div>
                  <div
                    className={`w-full rounded-t ${color} transition-all duration-300`}
                    style={{ height: `${heightPct}%` }}
                  />
                  <div className="text-[10px] text-slate-400">
                    {t.start_time?.slice(5, 10) || `S${i + 1}`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Session List */}
      <div className="space-y-1.5">
        {data.sessions.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-3 p-2 rounded bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-sm"
          >
            <Crosshair size={14} className="text-slate-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {s.filename || `Session ${s.session_index + 1}`}
              </span>
              <span className="text-slate-400 ml-2 text-xs">
                {s.start_time?.slice(0, 19)}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>{s.frame_count} frames</span>
              <span className={rmsColor(s.rms_total_arcsec)}>RMS {s.rms_total_arcsec.toFixed(2)}"</span>
              <span>SNR {s.mean_snr.toFixed(1)}</span>
              {s.star_lost_count > 0 && (
                <span className="text-orange-500">⚠ {s.star_lost_count} lost</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
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

      {/* Guiding Performance */}
      <GuidingPerformance projectId={safeProject.id} />

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
