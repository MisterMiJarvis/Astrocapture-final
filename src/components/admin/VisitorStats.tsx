import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, Eye, Users, Globe, TrendingUp, Calendar, ExternalLink } from 'lucide-react';

const API_BASE = (window as any).__AC_API_BASE__ || '/api';

interface StatsData {
  days: number;
  totalViews: number;
  uniqueSessions: number;
  uniquePages: number;
  todayViews: number;
  todaySessions: number;
  topPages: { path: string; views: number; unique_visitors: number }[];
  topReferrers: { referrer: string; count: number }[];
}

interface TimelineEntry {
  date: string;
  views: number;
  unique_visitors: number;
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('astrosuite_token');
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

// Mini sparkline using SVG (no external chart lib needed)
const Sparkline: React.FC<{ data: number[]; width?: number; height?: number; color?: string }> = ({ data, width = 200, height = 40, color = '#6366f1' }) => {
  if (data.length < 2) return <span className="text-text-secondary text-xs">No data</span>;
  const max = Math.max(...data, 1);
  const step = width / (data.length - 1);
  const points = data.map((v, i) => `${i * step},${height - (v / max) * height}`).join(' ');
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: `${height}px` }}>
      <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
      {/* area fill */}
      <polyline fill={`${color}20`} stroke="none" points={`0,${height} ${points} ${width},${height}`} />
    </svg>
  );
};

// Simple bar chart for timeline
const TimelineChart: React.FC<{ data: TimelineEntry[] }> = ({ data }) => {
  if (data.length === 0) return <div className="text-text-secondary text-center py-8">Aucune donnée</div>;
  const maxViews = Math.max(...data.map(d => d.views), 1);
  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((d, i) => {
        const h = Math.max(2, (d.views / maxViews) * 100);
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center group relative">
            <div
              className="w-full bg-primary/80 rounded-t hover:bg-primary transition-colors"
              style={{ height: `${h}%` }}
              title={`${d.date}: ${d.views} views, ${d.unique_visitors} visitors`}
            />
            {/* Tooltip */}
            <div className="absolute bottom-full mb-1 hidden group-hover:block bg-surface border border-border rounded px-2 py-1 text-xs whitespace-nowrap z-10">
              <div className="font-semibold">{d.date}</div>
              <div>{d.views} vues · {d.unique_visitors} visiteurs</div>
            </div>
            {/* Date label (show every 3rd or 7th) */}
            {(data.length <= 7 || i % Math.ceil(data.length / 7) === 0) && (
              <span className="text-[9px] text-text-secondary mt-1">{d.date.slice(5)}</span>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Clean referrer URL to just domain
function cleanReferrer(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url.slice(0, 40);
  }
}

// Clean path for display
function cleanPath(path: string): string {
  return path.replace(/^\/(apls|astrosuite)/, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '/';
}

const VisitorStats: React.FC = () => {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const headers = getAuthHeaders();
      const [statsRes, timelineRes] = await Promise.all([
        fetch(`${API_BASE}/analytics/stats?days=${days}`, { headers }),
        fetch(`${API_BASE}/analytics/timeline?days=${days}`, { headers }),
      ]);
      if (!statsRes.ok || !timelineRes.ok) throw new Error('Failed to fetch analytics');
      setStats(await statsRes.json());
      setTimeline(await timelineRes.json());
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div className="text-center py-20 text-text-secondary">Chargement des statistiques...</div>;
  if (error) return <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">{error}</div>;
  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold">Statistiques de visites</h2>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${days === d ? 'bg-primary text-primary-foreground' : 'bg-surface-secondary text-text-secondary hover:bg-surface-tertiary'}`}
            >
              {d}j
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard icon={<Eye className="w-4 h-4" />} label="Vues totales" value={stats.totalViews.toLocaleString('fr-FR')} accent={days <= 7} />
        <KPICard icon={<Users className="w-4 h-4" />} label="Visiteurs uniques" value={stats.uniqueSessions.toLocaleString('fr-FR')} />
        <KPICard icon={<Globe className="w-4 h-4" />} label="Pages uniques" value={stats.uniquePages.toLocaleString('fr-FR')} />
        <KPICard icon={<TrendingUp className="w-4 h-4" />} label="Vues aujourd'hui" value={stats.todayViews.toLocaleString('fr-FR')} accent />
        <KPICard icon={<Calendar className="w-4 h-4" />} label="Visiteurs aujourd'hui" value={stats.todaySessions.toLocaleString('fr-FR')} />
        <KPICard icon={<BarChart3 className="w-4 h-4" />} label="Moy/jour" value={timeline.length > 0 ? Math.round(stats.totalViews / timeline.length).toLocaleString('fr-FR') : '—'} />
      </div>

      {/* Sparklines */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-text-secondary mb-2">📈 Vues par jour</h3>
          <TimelineChart data={timeline} />
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-text-secondary mb-2">👥 Visiteurs uniques par jour</h3>
          <TimelineChart data={timeline.map(t => ({ ...t, views: t.unique_visitors }))} />
        </div>
      </div>

      {/* Top Pages + Referrers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Pages */}
        <div className="bg-surface border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-text-secondary mb-3">📄 Pages les plus visitées</h3>
          <div className="space-y-2">
            {stats.topPages.map((p, i) => (
              <div key={p.path} className="flex items-center gap-2 text-sm">
                <span className="w-6 text-text-secondary text-right">{i + 1}.</span>
                <span className="flex-1 truncate text-text">{cleanPath(p.path)}</span>
                <span className="text-text-secondary tabular-nums">{p.views}</span>
                <span className="text-[10px] text-text-secondary/60">({p.unique_visitors} uniq)</span>
              </div>
            ))}
            {stats.topPages.length === 0 && <div className="text-text-secondary text-sm">Aucune donnée</div>}
          </div>
        </div>

        {/* Top Referrers */}
        <div className="bg-surface border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-text-secondary mb-3">🔗 Sources de trafic</h3>
          <div className="space-y-2">
            {stats.topReferrers.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="w-6 text-text-secondary text-right">{i + 1}.</span>
                <span className="flex-1 truncate text-text">{cleanReferrer(r.referrer)}</span>
                <span className="text-text-secondary tabular-nums">{r.count}</span>
              </div>
            ))}
            {stats.topReferrers.length === 0 && <div className="text-text-secondary text-sm">Accès direct uniquement</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

const KPICard: React.FC<{ icon: React.ReactNode; label: string; value: string; accent?: boolean }> = ({ icon, label, value, accent }) => (
  <div className={`bg-surface border rounded-xl p-3 text-center ${accent ? 'border-primary/50' : 'border-border'}`}>
    <div className={`flex items-center justify-center gap-1 mb-1 ${accent ? 'text-primary' : 'text-text-secondary'}`}>{icon}</div>
    <div className="text-lg font-bold text-text tabular-nums">{value}</div>
    <div className="text-[10px] text-text-secondary uppercase tracking-wider">{label}</div>
  </div>
);

export default VisitorStats;