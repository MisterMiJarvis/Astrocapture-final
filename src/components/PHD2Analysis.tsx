import React, { useState, useCallback, useMemo } from 'react';
import { Upload, Activity, Crosshair, BarChart3, Target, Clock, Star, AlertTriangle, TrendingUp, ChevronDown, X, Info, Zap, Save, Trash2, BarChart, RefreshCw } from 'lucide-react';

const API_BASE = (window as any).__AC_API_BASE__ || '/api';

interface SessionInfo {
  index: number;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  camera: string;
  exposure_ms: number;
  focal_length_mm: number;
  pixel_scale: number;
  mount: string;
  binning: number;
  frame_count: number;
}

interface FrameData {
  frame: number;
  time: number;
  dx: number;
  dy: number;
  dx_arcsec: number;
  dy_arcsec: number;
  snr: number;
  star_mass: number;
}

interface AnalysisData {
  session_index: number;
  rms_total_px: number;
  rms_total_arcsec: number;
  rms_ra_px: number;
  rms_ra_arcsec: number;
  rms_dec_px: number;
  rms_dec_arcsec: number;
  peak_ra_arcsec: number;
  peak_dec_arcsec: number;
  mean_snr: number;
  mean_star_mass: number;
  dither_count: number;
  settling_failed_count: number;
  star_lost_count: number;
  duration_formatted: string;
  frames: FrameData[];
}

interface ParseResult {
  session_count: number;
  sessions: SessionInfo[];
  analyses: AnalysisData[];
}

interface SavedSession {
  id: string;
  filename: string;
  session_index: number;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  camera: string;
  exposure_ms: number;
  focal_length_mm: number;
  pixel_scale: number;
  mount: string;
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
  project_id: string | null;
  created_at: string;
}

interface Project {
  id: string;
  title: string;
  target_name: string;
  status: string;
}

interface GlobalStats {
  total_sessions: number;
  total_frames: number;
  total_duration_seconds: number;
  avg_rms_total_arcsec: number | null;
  avg_rms_ra_arcsec: number | null;
  avg_rms_dec_arcsec: number | null;
  avg_snr: number | null;
  total_dithers: number;
  total_star_lost: number;
  total_settle_fail: number;
  best_rms_total_arcsec: number | null;
  max_snr: number | null;
  avg_star_mass: number | null;
  best_session: { id: string; start_time: string; camera: string; rms_total_arcsec: number; mean_snr: number } | null;
}

// --- KPI Card ---
const KPICard: React.FC<{ icon: React.ReactNode; label: string; value: string; sub?: string; accent?: boolean; valueClass?: string }> = ({ icon, label, value, sub, accent, valueClass }) => (
  <div className={`bg-surface border rounded-xl p-4 ${accent ? 'border-primary/50' : 'border-border'}`}>
    <div className="flex items-center gap-2 text-text-secondary text-xs mb-1">{icon}{label}</div>
    <div className={`text-2xl font-bold tabular-nums ${valueClass || 'text-text'}`}>{value}</div>
    {sub && <div className={`text-xs mt-1 ${accent ? 'text-primary/80' : 'text-text-secondary'}`}>{sub}</div>}
  </div>
);

// --- SVG Charts (no external lib needed) ---

const TimeSeriesChart: React.FC<{ frames: FrameData[]; pixelScale: number }> = ({ frames, pixelScale }) => {
  if (frames.length < 2) return <div className="text-text-secondary text-center py-8">Not enough data</div>;

  const maxTime = frames[frames.length - 1].time;
  const minTime = frames[0].time;
  const duration = maxTime - minTime;

  // Compute Y range from arcsec values
  const allValues = frames.flatMap(f => [f.dx_arcsec, f.dy_arcsec]);
  const yMax = Math.max(Math.max(...allValues.map(Math.abs)), 0.5) * 1.2;
  const yMin = -yMax;

  const W = 800, H = 300;
  const ML = 50, MR = 20, MT = 20, MB = 40;
  const PW = W - ML - MR, PH = H - MT - MB;

  const scaleX = (t: number) => ML + ((t - minTime) / duration) * PW;
  const scaleY = (v: number) => MT + ((yMax - v) / (yMax - yMin)) * PH;

  // Subsample for performance (max ~400 points per line)
  const step = Math.max(1, Math.floor(frames.length / 400));
  const sampled = frames.filter((_, i) => i % step === 0 || i === frames.length - 1);

  const raPath = sampled.map((f, i) => `${i === 0 ? 'M' : 'L'}${scaleX(f.time).toFixed(1)},${scaleY(f.dx_arcsec).toFixed(1)}`).join(' ');
  const decPath = sampled.map((f, i) => `${i === 0 ? 'M' : 'L'}${scaleX(f.time).toFixed(1)},${scaleY(f.dy_arcsec).toFixed(1)}`).join(' ');

  // Grid lines
  const yTicks = [-yMax, -yMax / 2, 0, yMax / 2, yMax];
  const xTicks = 6;
  const xStep = duration / xTicks;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: '350px' }}>
      {/* Background */}
      <rect x={ML} y={MT} width={PW} height={PH} fill="#0d1117" rx="4" />

      {/* Grid lines */}
      {yTicks.map(v => (
        <g key={v}>
          <line x1={ML} y1={scaleY(v)} x2={W - MR} y2={scaleY(v)} stroke="#1e293b" strokeWidth="1" />
          <text x={ML - 5} y={scaleY(v) + 4} textAnchor="end" fill="#64748b" fontSize="10">{v.toFixed(1)}"</text>
        </g>
      ))}
      {Array.from({ length: xTicks + 1 }, (_, i) => {
        const t = minTime + i * xStep;
        const label = t < 3600 ? `${Math.floor(t / 60)}m` : `${(t / 3600).toFixed(1)}h`;
        return (
          <g key={i}>
            <line x1={scaleX(t)} y1={MT} x2={scaleX(t)} y2={H - MB} stroke="#1e293b" strokeWidth="1" />
            <text x={scaleX(t)} y={H - MB + 15} textAnchor="middle" fill="#64748b" fontSize="10">{label}</text>
          </g>
        );
      })}

      {/* Zero line */}
      <line x1={ML} y1={scaleY(0)} x2={W - MR} y2={scaleY(0)} stroke="#334155" strokeWidth="1.5" />

      {/* RA line */}
      <path d={raPath} fill="none" stroke="#3b82f6" strokeWidth="1" opacity="0.8" />

      {/* DEC line */}
      <path d={decPath} fill="none" stroke="#ef4444" strokeWidth="1" opacity="0.8" />

      {/* Legend */}
      <rect x={ML + 10} y={MT + 10} width={120} height={40} fill="#0d1117" fillOpacity="0.8" rx="4" />
      <line x1={ML + 15} y1={MT + 25} x2={ML + 35} y2={MT + 25} stroke="#3b82f6" strokeWidth="2" />
      <text x={ML + 40} y={MT + 29} fill="#3b82f6" fontSize="11">RA (α)</text>
      <line x1={ML + 15} y1={MT + 40} x2={ML + 35} y2={MT + 40} stroke="#ef4444" strokeWidth="2" />
      <text x={ML + 40} y={MT + 44} fill="#ef4444" fontSize="11">DEC (δ)</text>
    </svg>
  );
};

const ScatterChart: React.FC<{ frames: FrameData[] }> = ({ frames }) => {
  if (frames.length < 2) return <div className="text-text-secondary text-center py-8">Not enough data</div>;

  const maxR = Math.max(
    Math.max(...frames.map(f => Math.abs(f.dx_arcsec))),
    Math.max(...frames.map(f => Math.abs(f.dy_arcsec))),
    1.0
  ) * 1.3;

  const W = 400, H = 400;
  const CX = W / 2, CY = H / 2;
  const scale = (W / 2 - 30) / maxR;

  // Subsample
  const step = Math.max(1, Math.floor(frames.length / 500));
  const sampled = frames.filter((_, i) => i % step === 0);

  // Circle radii for 0.5", 1.0", 2.0"
  const circles = [0.5, 1.0, 2.0].filter(r => r < maxR);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: '400px' }}>
      <rect x="0" y="0" width={W} height={H} fill="#0d1117" rx="4" />

      {/* Concentric circles */}
      {circles.map(r => (
        <g key={r}>
          <circle cx={CX} cy={CY} r={r * scale} fill="none" stroke="#1e293b" strokeWidth="1" strokeDasharray="4,4" />
          <text x={CX + r * scale + 3} y={CY - 3} fill="#64748b" fontSize="9">{r}"</text>
        </g>
      ))}

      {/* Axes */}
      <line x1={30} y1={CY} x2={W - 10} y2={CY} stroke="#334155" strokeWidth="1" />
      <line x1={CX} y1={10} x2={CX} y2={H - 30} stroke="#334155" strokeWidth="1" />

      {/* Labels */}
      <text x={W - 10} y={CY - 5} fill="#64748b" fontSize="10" textAnchor="end">RA →</text>
      <text x={CX + 5} y={18} fill="#64748b" fontSize="10">↑ DEC</text>

      {/* Points */}
      {sampled.map((f, i) => {
        const x = CX + f.dx_arcsec * scale;
        const y = CY - f.dy_arcsec * scale;
        return <circle key={i} cx={x} cy={y} r="1.5" fill="#3b82f6" opacity="0.4" />;
      })}
    </svg>
  );
};

const HistogramChart: React.FC<{ frames: FrameData[] }> = ({ frames }) => {
  if (frames.length < 2) return <div className="text-text-secondary text-center py-8">Not enough data</div>;

  const bins = 40;
  const raValues = frames.map(f => f.dx_arcsec);
  const decValues = frames.map(f => f.dy_arcsec);

  const allValues = [...raValues, ...decValues];
  const minV = Math.min(...allValues);
  const maxV = Math.max(...allValues);
  const range = maxV - minV || 1;
  const binWidth = range / bins;

  const raBins = new Array(bins).fill(0);
  const decBins = new Array(bins).fill(0);

  raValues.forEach(v => {
    const idx = Math.min(Math.floor((v - minV) / binWidth), bins - 1);
    raBins[idx]++;
  });
  decValues.forEach(v => {
    const idx = Math.min(Math.floor((v - minV) / binWidth), bins - 1);
    decBins[idx]++;
  });

  const maxCount = Math.max(...raBins, ...decBins);

  const W = 600, H = 250;
  const ML = 50, MR = 20, MT = 20, MB = 40;
  const PW = W - ML - MR, PH = H - MT - MB;
  const barW = PW / bins;

  const scaleY = (v: number) => MT + PH - (v / maxCount) * PH;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: '300px' }}>
      <rect x={ML} y={MT} width={PW} height={PH} fill="#0d1117" rx="4" />

      {/* Y axis ticks */}
      {[0, 0.25, 0.5, 0.75, 1].map(f => {
        const v = f * maxCount;
        const y = scaleY(v);
        return (
          <g key={f}>
            <line x1={ML} y1={y} x2={W - MR} y2={y} stroke="#1e293b" strokeWidth="1" />
            <text x={ML - 5} y={y + 4} textAnchor="end" fill="#64748b" fontSize="10">{Math.round(v)}</text>
          </g>
        );
      })}

      {/* RA bars */}
      {raBins.map((count, i) => {
        const x = ML + i * barW;
        const h = (count / maxCount) * PH;
        return <rect key={`ra-${i}`} x={x} y={MT + PH - h} width={barW * 0.4} height={h} fill="#3b82f6" opacity="0.6" rx="1" />;
      })}

      {/* DEC bars */}
      {decBins.map((count, i) => {
        const x = ML + i * barW + barW * 0.4;
        const h = (count / maxCount) * PH;
        return <rect key={`dec-${i}`} x={x} y={MT + PH - h} width={barW * 0.4} height={h} fill="#ef4444" opacity="0.6" rx="1" />;
      })}

      {/* X axis labels */}
      <text x={ML} y={H - MB + 15} fill="#64748b" fontSize="10">{minV.toFixed(1)}"</text>
      <text x={W - MR} y={H - MB + 15} fill="#64748b" fontSize="10" textAnchor="end">{maxV.toFixed(1)}"</text>
      <text x={W / 2} y={H - 5} fill="#64748b" fontSize="10" textAnchor="middle">Error (arcsec)</text>

      {/* Legend */}
      <rect x={W - MR - 120} y={MT + 5} width={110} height={40} fill="#0d1117" fillOpacity="0.8" rx="4" />
      <rect x={W - MR - 115} y={MT + 12} width={12} height={10} fill="#3b82f6" opacity="0.6" rx="2" />
      <text x={W - MR - 98} y={MT + 21} fill="#3b82f6" fontSize="10">RA</text>
      <rect x={W - MR - 115} y={MT + 28} width={12} height={10} fill="#ef4444" opacity="0.6" rx="2" />
      <text x={W - MR - 98} y={MT + 37} fill="#ef4444" fontSize="10">DEC</text>
    </svg>
  );
};

// --- Main Component ---
const PHD2Analysis: React.FC = () => {
  const [result, setResult] = useState<ParseResult | null>(null);
  const [selectedSession, setSelectedSession] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [saving, setSaving] = useState(false);
  const [fileName, setFileName] = useState('');
  const [viewingSaved, setViewingSaved] = useState<{session: any; analysis: any} | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [linkingId, setLinkingId] = useState<string | null>(null);

  const handleViewSaved = useCallback(async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/phd2/sessions/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.session) {
          // analysis may be null for old sessions — construct from session data
          const analysis = data.analysis || {
            session_index: data.session.session_index,
            rms_total_px: 0,
            rms_total_arcsec: data.session.rms_total_arcsec || 0,
            rms_ra_px: 0,
            rms_ra_arcsec: data.session.rms_ra_arcsec || 0,
            rms_dec_px: 0,
            rms_dec_arcsec: data.session.rms_dec_arcsec || 0,
            peak_ra_arcsec: data.session.peak_ra_arcsec || 0,
            peak_dec_arcsec: data.session.peak_dec_arcsec || 0,
            mean_snr: data.session.mean_snr || 0,
            mean_star_mass: data.session.mean_star_mass || 0,
            dither_count: data.session.dither_count || 0,
            settling_failed_count: data.session.settling_failed_count || 0,
            star_lost_count: data.session.star_lost_count || 0,
            duration_formatted: '',
            frames: [],
          };
          setViewingSaved({ session: data.session, analysis });
        }
      }
    } catch (e) { console.error('Failed to load session', e); }
  }, []);

  const fetchSavedSessions = useCallback(async () => {
    try {
      const [sessionsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/phd2/sessions`),
        fetch(`${API_BASE}/phd2/stats`),
      ]);
      if (sessionsRes.ok) {
        const data = await sessionsRes.json();
        setSavedSessions(data.sessions || []);
      }
      if (statsRes.ok) {
        const data = await statsRes.json();
        setGlobalStats(data);
      }
    } catch {}
  }, []);

  const handleSave = useCallback(async () => {
    if (!result || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/phd2/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessions: result.sessions,
          analyses: result.analyses,
          filename: fileName,
        }),
      });
      if (res.ok) {
        await fetchSavedSessions();
      }
    } catch {}
    setSaving(false);
  }, [result, saving, fileName, fetchSavedSessions]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await fetch(`${API_BASE}/phd2/sessions/${id}`, { method: 'DELETE' });
      await fetchSavedSessions();
    } catch {}
  }, [fetchSavedSessions]);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/apls/projects`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProjects((Array.isArray(data) ? data : []).map((p: any) => ({
          id: p.id, title: p.title || '', target_name: p.targetName || '', status: p.status || '',
        })));
      }
    } catch {}
  }, []);

  const handleLinkProject = useCallback(async (sessionId: string, projectId: string) => {
    setLinkingId(sessionId);
    try {
      await fetch(`${API_BASE}/phd2/sessions/${sessionId}/link`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId || null }),
      });
      await fetchSavedSessions();
    } catch {} finally {
      setLinkingId(null);
    }
  }, [fetchSavedSessions]);

  // Fetch saved sessions on mount
  React.useEffect(() => { fetchSavedSessions(); fetchProjects(); }, [fetchSavedSessions, fetchProjects]);

  const handleFile = useCallback(async (file: File) => {
    setLoading(true);
    setError('');
    setResult(null);
    setFileName(file.name);

    try {
      const content = await file.text();

      const res = await fetch(`${API_BASE}/phd2/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Analysis failed');
      }

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.session_count === 0) throw new Error('No guiding sessions found in this log file.');

      setResult(data);
      setSelectedSession(0);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze log');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const analysis = useMemo(() => {
    if (!result || !result.analyses[selectedSession]) return null;
    return result.analyses[selectedSession];
  }, [result, selectedSession]);

  const session = useMemo(() => {
    if (!result || !result.sessions[selectedSession]) return null;
    return result.sessions[selectedSession];
  }, [result, selectedSession]);

  // RMS quality color
  const rmsColor = (v: number) => {
    if (v <= 0.5) return 'text-green-400';
    if (v <= 1.0) return 'text-yellow-400';
    if (v <= 2.0) return 'text-orange-400';
    return 'text-red-400';
  };

  const rmsLabel = (v: number) => {
    if (v <= 0.5) return 'Excellent';
    if (v <= 1.0) return 'Good';
    if (v <= 2.0) return 'Fair';
    return 'Poor';
  };

  const snrColor = (v: number) => {
    if (v >= 30) return 'text-green-400';
    if (v >= 15) return 'text-yellow-400';
    if (v >= 5) return 'text-orange-400';
    return 'text-red-400';
  };

  const snrLabel = (v: number) => {
    if (v >= 30) return 'Excellent';
    if (v >= 15) return 'Good';
    if (v >= 5) return 'Fair';
    return 'Poor';
  };

  const starLostColor = (v: number) => {
    if (v === 0) return 'text-green-400';
    if (v <= 2) return 'text-yellow-400';
    return 'text-red-400';
  };

  const starLostLabel = (v: number) => {
    if (v === 0) return 'None';
    if (v <= 2) return 'Few';
    return 'Many';
  };

  const settleColor = (v: number) => {
    if (v === 0) return 'text-green-400';
    if (v <= 2) return 'text-yellow-400';
    return 'text-red-400';
  };

  const settleLabel = (v: number) => {
    if (v === 0) return 'None';
    if (v <= 2) return 'Few';
    return 'Many';
  };

  const ditherLabel = (v: number) => {
    if (v === 0) return 'No dither';
    return `${v} dither${v > 1 ? 's' : ''}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
        <p className="text-text-secondary">Analyzing PHD2 log...</p>
      </div>
    );
  }

  // Viewing a saved session
  if (viewingSaved) {
    const vs = viewingSaved.session;
    const va = viewingSaved.analysis;
    const vsSession: SessionInfo = {
      index: vs.session_index,
      start_time: vs.start_time,
      end_time: vs.end_time,
      duration_seconds: vs.duration_seconds,
      camera: vs.camera,
      exposure_ms: vs.exposure_ms,
      focal_length_mm: vs.focal_length_mm,
      pixel_scale: vs.pixel_scale,
      mount: vs.mount,
      binning: 1,
      frame_count: vs.frame_count,
    };
    const vsAnalysis: AnalysisData = {
      session_index: vs.session_index,
      rms_total_px: 0,
      rms_total_arcsec: vs.rms_total_arcsec,
      rms_ra_px: 0,
      rms_ra_arcsec: vs.rms_ra_arcsec,
      rms_dec_px: 0,
      rms_dec_arcsec: vs.rms_dec_arcsec,
      peak_ra_arcsec: vs.peak_ra_arcsec,
      peak_dec_arcsec: vs.peak_dec_arcsec,
      mean_snr: vs.mean_snr,
      mean_star_mass: vs.mean_star_mass,
      dither_count: vs.dither_count,
      settling_failed_count: vs.settling_failed_count,
      star_lost_count: vs.star_lost_count,
      duration_formatted: vs.duration_seconds >= 3600 ? `${Math.floor(vs.duration_seconds / 3600)}h ${Math.floor((vs.duration_seconds % 3600) / 60)}m` : `${Math.floor(vs.duration_seconds / 60)}m ${Math.floor(vs.duration_seconds % 60)}s`,
      frames: va?.frames || [],
    };

    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-display font-bold flex items-center gap-2">
              <Activity className="w-6 h-6 text-primary" />
              {vs.filename || `Session ${vs.session_index + 1}`}
            </h2>
            <p className="text-text-secondary text-sm mt-1">
              {vs.camera && `${vs.camera} · `}{vs.pixel_scale}" /px
            </p>
          </div>
          <button
            onClick={() => setViewingSaved(null)}
            className="px-4 py-2 bg-surface border border-border rounded-lg text-text-secondary hover:text-text transition-colors"
          >
            ← Back
          </button>
        </div>

        {/* Session Info Bar */}
        <div className="bg-surface border border-border rounded-xl p-4 mb-6">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {vsSession.camera && <span className="flex items-center gap-1"><Star size={14} className="text-primary" />{vsSession.camera}</span>}
            {vsSession.exposure_ms > 0 && <span className="flex items-center gap-1"><Zap size={14} className="text-primary" />{vsSession.exposure_ms}ms exposure</span>}
            {vsSession.focal_length_mm > 0 && <span>{vsSession.focal_length_mm}mm focal length</span>}
            {vsSession.pixel_scale > 0 && <span>{vsSession.pixel_scale}" /px</span>}
            {vsSession.mount && <span>{vsSession.mount}</span>}
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-text-secondary mt-2">
            <span className="flex items-center gap-1"><Clock size={14} />{vsSession.start_time ? `Start: ${vsSession.start_time.slice(0, 19)}` : 'No date'}</span>
            {vsSession.end_time && <span className="flex items-center gap-1"><Clock size={14} />End: {vsSession.end_time}</span>}
            <span className="flex items-center gap-1"><Clock size={14} />Duration: {vsAnalysis.duration_formatted}</span>
            <span>{vsSession.frame_count} frames</span>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          <KPICard icon={<Target size={14} />} label="RMS Total" value={`${vsAnalysis.rms_total_arcsec}"`} sub={`${vsAnalysis.rms_total_arcsec}px · ${rmsLabel(vsAnalysis.rms_total_arcsec)}`} accent valueClass={rmsColor(vsAnalysis.rms_total_arcsec)} />
          <KPICard icon={<TrendingUp size={14} />} label="RMS RA" value={`${vsAnalysis.rms_ra_arcsec}"`} sub={`${vsAnalysis.rms_ra_arcsec}px · ${rmsLabel(vsAnalysis.rms_ra_arcsec)}`} valueClass={rmsColor(vsAnalysis.rms_ra_arcsec)} />
          <KPICard icon={<TrendingUp size={14} />} label="RMS DEC" value={`${vsAnalysis.rms_dec_arcsec}"`} sub={`${vsAnalysis.rms_dec_arcsec}px · ${rmsLabel(vsAnalysis.rms_dec_arcsec)}`} valueClass={rmsColor(vsAnalysis.rms_dec_arcsec)} />
          <KPICard icon={<Star size={14} />} label="Avg SNR" value={vsAnalysis.mean_snr.toFixed(1)} sub={snrLabel(vsAnalysis.mean_snr)} valueClass={snrColor(vsAnalysis.mean_snr)} />
          <KPICard icon={<Activity size={14} />} label="Dithers" value={String(vsAnalysis.dither_count)} sub={ditherLabel(vsAnalysis.dither_count)} />
          <KPICard icon={<AlertTriangle size={14} />} label="Star Lost" value={String(vsAnalysis.star_lost_count)} sub={starLostLabel(vsAnalysis.star_lost_count)} valueClass={starLostColor(vsAnalysis.star_lost_count)} />
          <KPICard icon={<AlertTriangle size={14} />} label="Settle Fail" value={String(vsAnalysis.settling_failed_count)} sub={settleLabel(vsAnalysis.settling_failed_count)} valueClass={settleColor(vsAnalysis.settling_failed_count)} />
        </div>

        {/* Charts */}
        {vsAnalysis.frames.length > 2 && (
          <div className="space-y-6">
            <div className="bg-surface border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
                <Activity size={16} /> Guiding Corrections Over Time
              </h3>
              <TimeSeriesChart frames={vsAnalysis.frames} pixelScale={vsSession.pixel_scale || 1} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-surface border border-border rounded-xl p-4">
                <h3 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
                  <Crosshair size={16} /> Guiding Scatter
                </h3>
                <ScatterChart frames={vsAnalysis.frames} />
              </div>
              <div className="bg-surface border border-border rounded-xl p-4">
                <h3 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
                  <BarChart3 size={16} /> Error Distribution
                </h3>
                <HistogramChart frames={vsAnalysis.frames} />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
        <p className="text-text-secondary">Analyzing PHD2 log...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-display font-bold text-center mb-2">PHD2 Guiding Analysis</h2>
        <p className="text-text-secondary text-center mb-8">Upload your PHD2 guiding log file to analyze session performance</p>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
            dragOver ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
          }`}
        >
          <Upload className="w-12 h-12 mx-auto mb-4 text-text-secondary" />
          <p className="text-text font-semibold mb-2">Drop your PHD2 log file here</p>
          <p className="text-text-secondary text-sm mb-4">or click to browse</p>
          <input
            type="file"
            accept=".txt,.log"
            onChange={handleInputChange}
            className="hidden"
            id="phd2-file-input"
          />
          <label
            htmlFor="phd2-file-input"
            className="inline-block px-6 py-2 bg-primary text-primary-foreground rounded-lg cursor-pointer hover:bg-primary-hover transition-colors"
          >
            Choose File
          </label>
          <p className="text-text-secondary text-xs mt-4">Supports PHD2 guiding log .txt files</p>
        </div>

        {error && (
          <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 flex items-center gap-2">
            <AlertTriangle size={18} />
            {error}
          </div>
        )}

        {/* Global Stats */}
        {(globalStats && globalStats.total_sessions > 0) && (
          <div className="mt-8">
            <h3 className="text-lg font-display font-bold flex items-center gap-2 mb-4">
              <BarChart size={18} className="text-primary" />
              Global Statistics
              <span className="text-sm font-normal text-text-secondary">({globalStats.total_sessions} sessions, {globalStats.total_frames?.toLocaleString()} frames)</span>
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">
              <KPICard icon={<Target size={14} />} label="Avg RMS Total" value={globalStats.avg_rms_total_arcsec ? `${globalStats.avg_rms_total_arcsec.toFixed(2)}"` : '—'} sub={globalStats.avg_rms_total_arcsec ? rmsLabel(globalStats.avg_rms_total_arcsec) : ''} valueClass={globalStats.avg_rms_total_arcsec ? rmsColor(globalStats.avg_rms_total_arcsec) : ''} />
              <KPICard icon={<TrendingUp size={14} />} label="Avg RMS RA" value={globalStats.avg_rms_ra_arcsec ? `${globalStats.avg_rms_ra_arcsec.toFixed(2)}"` : '—'} sub={globalStats.avg_rms_ra_arcsec ? rmsLabel(globalStats.avg_rms_ra_arcsec) : ''} valueClass={globalStats.avg_rms_ra_arcsec ? rmsColor(globalStats.avg_rms_ra_arcsec) : ''} />
              <KPICard icon={<TrendingUp size={14} />} label="Avg RMS DEC" value={globalStats.avg_rms_dec_arcsec ? `${globalStats.avg_rms_dec_arcsec.toFixed(2)}"` : '—'} sub={globalStats.avg_rms_dec_arcsec ? rmsLabel(globalStats.avg_rms_dec_arcsec) : ''} valueClass={globalStats.avg_rms_dec_arcsec ? rmsColor(globalStats.avg_rms_dec_arcsec) : ''} />
              <KPICard icon={<Star size={14} />} label="Avg SNR" value={globalStats.avg_snr ? globalStats.avg_snr.toFixed(1) : '—'} sub={globalStats.avg_snr ? snrLabel(globalStats.avg_snr) : ''} valueClass={globalStats.avg_snr ? snrColor(globalStats.avg_snr) : ''} />
              <KPICard icon={<Activity size={14} />} label="Total Dithers" value={String(globalStats.total_dithers || 0)} />
              <KPICard icon={<AlertTriangle size={14} />} label="Total Star Lost" value={String(globalStats.total_star_lost || 0)} valueClass={starLostColor(globalStats.total_star_lost || 0)} />
              <KPICard icon={<AlertTriangle size={14} />} label="Total Settle Fail" value={String(globalStats.total_settle_fail || 0)} valueClass={settleColor(globalStats.total_settle_fail || 0)} />
            </div>

            {globalStats.best_session && (
              <div className="bg-surface border border-green-500/30 rounded-xl p-3 mb-4">
                <div className="text-sm text-text-secondary">
                  <span className="text-green-400 font-semibold">🏆 Best Session</span> —
                  {globalStats.best_session.start_time ? globalStats.best_session.start_time.slice(0, 19) : 'Unknown date'} ·
                  {globalStats.best_session.camera} ·
                  RMS {globalStats.best_session.rms_total_arcsec}" · SNR {globalStats.best_session.mean_snr.toFixed(1)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Saved Sessions List */}
        {savedSessions.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-display font-bold flex items-center gap-2 mb-3">
              <Clock size={18} className="text-primary" />
              Saved Sessions
            </h3>
            <div className="space-y-2">
              {savedSessions.map(s => (
                <div key={s.id} className="bg-surface border border-border rounded-lg p-3 flex items-center justify-between cursor-pointer hover:border-primary/30 transition-colors"
                  onClick={() => handleViewSaved(s.id)}
                >
                  <div className="flex-1">
                    <div className="text-sm font-semibold">
                      {s.filename || `Session ${s.session_index + 1}`}
                      {s.start_time && <span className="text-text-secondary font-normal ml-2">{s.start_time.slice(0, 19)}</span>}
                    </div>
                    <div className="text-xs text-text-secondary flex gap-3 mt-1">
                      {s.camera && <span>{s.camera}</span>}
                      {s.pixel_scale > 0 && <span>{s.pixel_scale}" /px</span>}
                      <span>{s.frame_count} frames</span>
                      <span className={rmsColor(s.rms_total_arcsec)}>RMS {s.rms_total_arcsec}"</span>
                      <span className={snrColor(s.mean_snr)}>SNR {s.mean_snr.toFixed(1)}</span>
                    </div>
                    {s.project_id && (
                      <div className="text-xs text-primary mt-1">
                        📁 {projects.find(p => p.id === s.project_id)?.target_name || 'Linked'}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={s.project_id || ''}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => { e.stopPropagation(); handleLinkProject(s.id, e.target.value); }}
                      disabled={linkingId === s.id}
                      className="text-xs bg-surface border border-border rounded px-2 py-1 text-text-secondary"
                      title="Link to project"
                    >
                      <option value="">📁 Link to project</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.target_name || p.title}</option>
                      ))}
                    </select>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                      className="p-2 text-text-secondary hover:text-red-400 transition-colors"
                      title="Delete session"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-display font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            PHD2 Guiding Analysis
          </h2>
          <p className="text-text-secondary text-sm mt-1">
            {result.session_count} session{result.session_count > 1 ? 's' : ''} found
            {session?.camera && ` · ${session.camera}`}
            {session?.pixel_scale && ` · ${session.pixel_scale}" /px`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {result.session_count > 1 && (
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(parseInt(e.target.value))}
              className="bg-surface border border-border rounded-lg px-3 py-2 text-text"
            >
              {result.sessions.map((s, i) => (
                <option key={i} value={i}>
                  Session {i + 1} · {s.start_time ? s.start_time.slice(0, 19) : '—'} · {s.end_time ? s.end_time.slice(11, 19) : ''} · {s.frame_count} frames
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => { setResult(null); setError(''); }}
            className="px-4 py-2 bg-surface border border-border rounded-lg text-text-secondary hover:text-text transition-colors"
          >
            New Analysis
          </button>
          {result && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={14} />
              {saving ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>
      </div>

      {analysis && session && (
        <>
          {/* Session Info Bar */}
          <div className="bg-surface border border-border rounded-xl p-4 mb-6">
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {session.camera && <span className="flex items-center gap-1"><Star size={14} className="text-primary" />{session.camera}</span>}
              {session.exposure_ms > 0 && <span className="flex items-center gap-1"><Zap size={14} className="text-primary" />{session.exposure_ms}ms exposure</span>}
              {session.focal_length_mm > 0 && <span>{session.focal_length_mm}mm focal length</span>}
              {session.pixel_scale > 0 && <span>{session.pixel_scale}" /px</span>}
              {session.mount && <span>{session.mount}</span>}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-text-secondary mt-2">
              <span className="flex items-center gap-1"><Clock size={14} />{session.start_time ? `Start: ${session.start_time.slice(0, 19)}` : 'No date'}</span>
              {session.end_time && <span className="flex items-center gap-1"><Clock size={14} />End: {session.end_time}</span>}
              <span className="flex items-center gap-1"><Clock size={14} />Duration: {analysis.duration_formatted}</span>
              <span>{session.frame_count} frames</span>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
            <KPICard
              icon={<Target size={14} />}
              label="RMS Total"
              value={`${analysis.rms_total_arcsec}"`}
              sub={`${analysis.rms_total_px}px · ${rmsLabel(analysis.rms_total_arcsec)}`}
              accent
              valueClass={rmsColor(analysis.rms_total_arcsec)}
            />
            <KPICard
              icon={<TrendingUp size={14} />}
              label="RMS RA"
              value={`${analysis.rms_ra_arcsec}"`}
              sub={`${analysis.rms_ra_px}px · ${rmsLabel(analysis.rms_ra_arcsec)}`}
              valueClass={rmsColor(analysis.rms_ra_arcsec)}
            />
            <KPICard
              icon={<TrendingUp size={14} />}
              label="RMS DEC"
              value={`${analysis.rms_dec_arcsec}"`}
              sub={`${analysis.rms_dec_px}px · ${rmsLabel(analysis.rms_dec_arcsec)}`}
              valueClass={rmsColor(analysis.rms_dec_arcsec)}
            />
            <KPICard
              icon={<Star size={14} />}
              label="Avg SNR"
              value={analysis.mean_snr.toFixed(1)}
              sub={snrLabel(analysis.mean_snr)}
              valueClass={snrColor(analysis.mean_snr)}
            />
            <KPICard
              icon={<Activity size={14} />}
              label="Dithers"
              value={String(analysis.dither_count)}
              sub={ditherLabel(analysis.dither_count)}
            />
            <KPICard
              icon={<AlertTriangle size={14} />}
              label="Star Lost"
              value={String(analysis.star_lost_count)}
              sub={starLostLabel(analysis.star_lost_count)}
              valueClass={starLostColor(analysis.star_lost_count)}
            />
            <KPICard
              icon={<AlertTriangle size={14} />}
              label="Settle Fail"
              value={String(analysis.settling_failed_count)}
              sub={settleLabel(analysis.settling_failed_count)}
              valueClass={settleColor(analysis.settling_failed_count)}
            />
          </div>

          {/* RMS Quality Indicator */}
          <div className={`bg-surface border rounded-xl p-4 mb-6 ${analysis.rms_total_arcsec <= 0.5 ? 'border-green-500/30' : analysis.rms_total_arcsec <= 1.0 ? 'border-yellow-500/30' : analysis.rms_total_arcsec <= 2.0 ? 'border-orange-500/30' : 'border-red-500/30'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Target className={`w-8 h-8 ${rmsColor(analysis.rms_total_arcsec)}`} />
                <div>
                  <div className={`text-3xl font-bold tabular-nums ${rmsColor(analysis.rms_total_arcsec)}`}>
                    {analysis.rms_total_arcsec}"
                  </div>
                  <div className="text-sm text-text-secondary">
                    {rmsLabel(analysis.rms_total_arcsec)} guiding · {analysis.rms_total_px}px
                  </div>
                </div>
              </div>
              <div className="text-right text-sm text-text-secondary">
                <div>Peak RA: {analysis.peak_ra_arcsec}" <span className={rmsColor(analysis.peak_ra_arcsec)}>({rmsLabel(analysis.peak_ra_arcsec)})</span></div>
                <div>Peak DEC: {analysis.peak_dec_arcsec}" <span className={rmsColor(analysis.peak_dec_arcsec)}>({rmsLabel(analysis.peak_dec_arcsec)})</span></div>
                {analysis.mean_star_mass > 0 && <div>Star Mass: {analysis.mean_star_mass.toFixed(0)}</div>}
              </div>
            </div>
            {/* Quality bar — linear scale 0 to 3", tick marks at actual positions */}
            <div className="mt-3 h-2 bg-surface-tertiary rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  analysis.rms_total_arcsec <= 0.5 ? 'bg-green-500' :
                  analysis.rms_total_arcsec <= 1.0 ? 'bg-yellow-500' :
                  analysis.rms_total_arcsec <= 2.0 ? 'bg-orange-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(100, (analysis.rms_total_arcsec / 3) * 100)}%` }}
              /></div>
            <div className="relative h-4 text-[10px] text-text-secondary">
              <span className="absolute left-0">0"</span>
              <span className="absolute" style={{ left: `${(0.5 / 3) * 100}%`, transform: 'translateX(-50%)' }}>0.5"</span>
              <span className="absolute" style={{ left: `${(1 / 3) * 100}%`, transform: 'translateX(-50%)' }}>1"</span>
              <span className="absolute" style={{ left: `${(2 / 3) * 100}%`, transform: 'translateX(-50%)' }}>2"</span>
              <span className="absolute right-0">3"+</span>
            </div>
          </div>

          {/* Charts */}
          <div className="space-y-6">
            {/* Time Series */}
            <div className="bg-surface border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
                <Activity size={16} /> Guiding Corrections Over Time
              </h3>
              <TimeSeriesChart frames={analysis.frames} pixelScale={session.pixel_scale || 1} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Scatter Plot */}
              <div className="bg-surface border border-border rounded-xl p-4">
                <h3 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
                  <Crosshair size={16} /> Guiding Scatter
                </h3>
                <ScatterChart frames={analysis.frames} />
              </div>

              {/* Histogram */}
              <div className="bg-surface border border-border rounded-xl p-4">
                <h3 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
                  <BarChart3 size={16} /> Error Distribution
                </h3>
                <HistogramChart frames={analysis.frames} />
              </div>
            </div>
          </div>

          {/* Raw Data Table (collapsible) */}
          <details className="mt-6 bg-surface border border-border rounded-xl">
            <summary className="p-4 cursor-pointer text-sm font-semibold text-text-secondary hover:text-text">
              <Info size={14} className="inline mr-2" />
              Raw Data ({analysis.frames.length} frames)
            </summary>
            <div className="overflow-x-auto max-h-96 overflow-y-auto p-4 pt-0">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-surface">
                  <tr className="text-text-secondary border-b border-border">
                    <th className="py-2 text-left">Frame</th>
                    <th className="py-2 text-left">Time (s)</th>
                    <th className="py-2 text-right">RA (px)</th>
                    <th className="py-2 text-right">DEC (px)</th>
                    <th className="py-2 text-right">RA ("</th>
                    <th className="py-2 text-right">DEC ("</th>
                    <th className="py-2 text-right">SNR</th>
                    <th className="py-2 text-right">Star Mass</th>
                  </tr>
                </thead>
                <tbody className="text-text">
                  {analysis.frames.slice(0, 500).map((f, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-surface-secondary/50">
                      <td className="py-1">{f.frame}</td>
                      <td className="py-1">{f.time.toFixed(1)}</td>
                      <td className="py-1 text-right">{f.dx.toFixed(2)}</td>
                      <td className="py-1 text-right">{f.dy.toFixed(2)}</td>
                      <td className="py-1 text-right">{f.dx_arcsec.toFixed(3)}</td>
                      <td className="py-1 text-right">{f.dy_arcsec.toFixed(3)}</td>
                      <td className="py-1 text-right">{f.snr.toFixed(0)}</td>
                      <td className="py-1 text-right">{f.star_mass > 0 ? f.star_mass.toFixed(0) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {analysis.frames.length > 500 && (
                <p className="text-xs text-text-secondary mt-2">Showing first 500 of {analysis.frames.length} frames</p>
              )}
            </div>
          </details>
        </>
      )}

      {/* Global Stats & Saved Sessions */}
      {(globalStats && globalStats.total_sessions > 0) && (
        <div className="mt-8">
          <h3 className="text-lg font-display font-bold flex items-center gap-2 mb-4">
            <BarChart size={18} className="text-primary" />
            Global Statistics
            <span className="text-sm font-normal text-text-secondary">({globalStats.total_sessions} sessions, {globalStats.total_frames?.toLocaleString()} frames)</span>
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">
            <KPICard
              icon={<Target size={14} />}
              label="Avg RMS Total"
              value={globalStats.avg_rms_total_arcsec ? `${globalStats.avg_rms_total_arcsec.toFixed(2)}"` : '—'}
              sub={globalStats.avg_rms_total_arcsec ? rmsLabel(globalStats.avg_rms_total_arcsec) : ''}
              valueClass={globalStats.avg_rms_total_arcsec ? rmsColor(globalStats.avg_rms_total_arcsec) : ''}
            />
            <KPICard
              icon={<TrendingUp size={14} />}
              label="Avg RMS RA"
              value={globalStats.avg_rms_ra_arcsec ? `${globalStats.avg_rms_ra_arcsec.toFixed(2)}"` : '—'}
              sub={globalStats.avg_rms_ra_arcsec ? rmsLabel(globalStats.avg_rms_ra_arcsec) : ''}
              valueClass={globalStats.avg_rms_ra_arcsec ? rmsColor(globalStats.avg_rms_ra_arcsec) : ''}
            />
            <KPICard
              icon={<TrendingUp size={14} />}
              label="Avg RMS DEC"
              value={globalStats.avg_rms_dec_arcsec ? `${globalStats.avg_rms_dec_arcsec.toFixed(2)}"` : '—'}
              sub={globalStats.avg_rms_dec_arcsec ? rmsLabel(globalStats.avg_rms_dec_arcsec) : ''}
              valueClass={globalStats.avg_rms_dec_arcsec ? rmsColor(globalStats.avg_rms_dec_arcsec) : ''}
            />
            <KPICard
              icon={<Star size={14} />}
              label="Avg SNR"
              value={globalStats.avg_snr ? globalStats.avg_snr.toFixed(1) : '—'}
              sub={globalStats.avg_snr ? snrLabel(globalStats.avg_snr) : ''}
              valueClass={globalStats.avg_snr ? snrColor(globalStats.avg_snr) : ''}
            />
            <KPICard
              icon={<Activity size={14} />}
              label="Total Dithers"
              value={String(globalStats.total_dithers || 0)}
            />
            <KPICard
              icon={<AlertTriangle size={14} />}
              label="Total Star Lost"
              value={String(globalStats.total_star_lost || 0)}
              valueClass={starLostColor(globalStats.total_star_lost || 0)}
            />
            <KPICard
              icon={<AlertTriangle size={14} />}
              label="Total Settle Fail"
              value={String(globalStats.total_settle_fail || 0)}
              valueClass={settleColor(globalStats.total_settle_fail || 0)}
            />
          </div>

          {globalStats.best_session && (
            <div className="bg-surface border border-green-500/30 rounded-xl p-3 mb-4">
              <div className="text-sm text-text-secondary">
                <span className="text-green-400 font-semibold">🏆 Best Session</span> — 
                {globalStats.best_session.start_time ? globalStats.best_session.start_time.slice(0, 19) : 'Unknown date'} · 
                {globalStats.best_session.camera} · 
                RMS {globalStats.best_session.rms_total_arcsec}" · SNR {globalStats.best_session.mean_snr.toFixed(1)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Saved Sessions List */}
      {savedSessions.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-display font-bold flex items-center gap-2 mb-3">
            <Clock size={18} className="text-primary" />
            Saved Sessions
          </h3>
          <div className="space-y-2">
            {savedSessions.map(s => (
              <div key={s.id} className="bg-surface border border-border rounded-lg p-3 flex items-center justify-between cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => handleViewSaved(s.id)}
              >
                <div className="flex-1">
                  <div className="text-sm font-semibold">
                    {s.filename || `Session ${s.session_index + 1}`}
                    {s.start_time && <span className="text-text-secondary font-normal ml-2">{s.start_time.slice(0, 19)}</span>}
                  </div>
                  <div className="text-xs text-text-secondary flex gap-3 mt-1">
                    {s.camera && <span>{ s.camera}</span>}
                    {s.pixel_scale > 0 && <span>{s.pixel_scale}" /px</span>}
                    <span>{s.frame_count} frames</span>
                    <span className={rmsColor(s.rms_total_arcsec)}>RMS {s.rms_total_arcsec}"</span>
                    <span className={snrColor(s.mean_snr)}>SNR {s.mean_snr.toFixed(1)}</span>
                  </div>
                  {s.project_id && (
                    <div className="text-xs text-primary mt-1">
                      📁 {projects.find(p => p.id === s.project_id)?.target_name || 'Linked'}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={s.project_id || ''}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => { e.stopPropagation(); handleLinkProject(s.id, e.target.value); }}
                    disabled={linkingId === s.id}
                    className="text-xs bg-surface border border-border rounded px-2 py-1 text-text-secondary"
                    title="Link to project"
                  >
                    <option value="">📁 Link to project</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.target_name || p.title}</option>
                    ))}
                  </select>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                    className="p-2 text-text-secondary hover:text-red-400 transition-colors"
                    title="Delete session"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PHD2Analysis;