// ============================================================================
// COMPOSANT: DashboardKPIs — Statistiques globales + graphs
// Module 1 — Dashboard Central
// ============================================================================

import React from 'react';
import { DashboardKPIs, FilterDistributionItem, MonthlyTrendItem } from '../../types/module1';

interface DashboardKPIsProps {
  kpis: DashboardKPIs;
}

// Pie chart simple en SVG
const FilterPieChart: React.FC<{ data: FilterDistributionItem[] }> = ({ data }) => {
  const total = data.reduce((sum, d) => sum + d.hours, 0);
  const radius = 50;
  const cx = 60;
  const cy = 60;

  const colors = [
    '#3b82f6', // UV/IR Cut
    '#8b5cf6', // L-Ultimate
    '#ef4444', // Ha
    '#06b6d4', // OIII
    '#f97316', // SII
    '#ec4899', // RGB
    '#6b7280', // Luminance
  ];

  let cumulativeAngle = 0;
  const slices = data.map((item, i) => {
    const angle = (item.hours / total) * 360;
    const startAngle = cumulativeAngle;
    cumulativeAngle += angle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = ((startAngle + angle) * Math.PI) / 180;

    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;

    return {
      path: `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`,
      color: colors[i % colors.length],
      label: item.filter.replace(/_/g, ' '),
      percent: Math.round(item.percentage),
    };
  });

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="120" viewBox="0 0 120 120">
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} stroke="white" strokeWidth="2" />
        ))}
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" className="text-xs font-bold fill-slate-700">
          {Math.round(total)}h
        </text>
      </svg>
      <div className="flex flex-wrap gap-2 mt-2 justify-center">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-1 text-xs text-slate-600">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
            <span>{s.label} ({s.percent}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Bar chart mensuel simple
const MonthlyTrendChart: React.FC<{ data: MonthlyTrendItem[] }> = ({ data }) => {
  const maxHours = Math.max(...data.map(d => d.hours), 1);

  return (
    <div className="flex items-end gap-2 h-32 mt-2">
      {data.map((item, i) => {
        const height = (item.hours / maxHours) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-t bg-emerald-400 hover:bg-emerald-500 transition-colors relative group"
              style={{ height: `${height}%` }}
            >
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-slate-600
                            opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {item.hours}h
              </div>
            </div>
            <span className="text-[10px] text-slate-400">
              {item.month.split('-')[1]}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export const DashboardKPIsView: React.FC<DashboardKPIsProps> = ({ kpis }) => {
  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          label="Temps total"
          value={`${kpis.totalIntegrationTime.toFixed(1)}h`}
          sub={`${kpis.totalSessionsCompleted} sessions`}
          icon="⏱️"
        />
        <KPICard
          label="Projets"
          value={`${kpis.activeProjectsCount}`}
          sub={`${kpis.totalProjectsCompleted} terminés`}
          icon="📁"
        />
        <KPICard
          label="RMS moyen"
          value={`${kpis.averageGuidingRMS.toFixed(2)}"`}
          sub={`Best: ${kpis.bestGuidingRMS.toFixed(2)}"`}
          icon="🎯"
          trend={kpis.averageGuidingRMS < 1.0 ? 'good' : 'warning'}
        />
        <KPICard
          label="Santé monture"
          value={`${kpis.mountHealthScore}%`}
          sub={kpis.lastMaintenanceDate
            ? `Dernier entretien: ${kpis.lastMaintenanceDate.toLocaleDateString('fr-FR')}`
            : 'Aucun entretien'}
          icon="🔧"
          trend={kpis.mountHealthScore > 80 ? 'good' : 'warning'}
        />
      </div>

      {/* Graphs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg bg-white dark:bg-slate-900 p-4 shadow-sm border border-slate-200 dark:border-slate-700">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
            Répartition par Filtre
          </h4>
          <FilterPieChart data={kpis.filterDistribution} />
        </div>

        <div className="rounded-lg bg-white dark:bg-slate-900 p-4 shadow-sm border border-slate-200 dark:border-slate-700">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
            Tendance Mensuelle (heures)
          </h4>
          <MonthlyTrendChart data={kpis.monthlyIntegrationTrend} />
        </div>
      </div>
    </div>
  );
};

const KPICard: React.FC<{
  label: string;
  value: string;
  sub: string;
  icon: string;
  trend?: 'good' | 'warning' | 'bad';
}> = ({ label, value, sub, icon, trend }) => {
  const trendColors = {
    good: 'border-l-emerald-400',
    warning: 'border-l-yellow-400',
    bad: 'border-l-red-400',
  };

  return (
    <div className={`rounded-lg bg-white dark:bg-slate-900 p-3 shadow-sm border border-slate-200 dark:border-slate-700
                     border-l-4 ${trend ? trendColors[trend] : 'border-l-slate-300'}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-xs text-slate-500 uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</div>
      <div className="text-xs text-slate-400">{sub}</div>
    </div>
  );
};

export default DashboardKPIsView;
