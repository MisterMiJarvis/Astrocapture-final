// ============================================================================
// ObservationComparison — Predicted vs Actual SNR comparison panel
// Shows the feedback loop: formula predictions vs real observations
// ============================================================================

import React, { useMemo, useState } from 'react';
import {
  Project,
  ProjectObservation,
  ProjectExposurePlan,
  ExposureFormulaSnapshot,
} from '../src/types/project';
import {
  BarChart3, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2,
  Activity, Award,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell,
} from 'recharts';

// ─── Helpers ────────────────────────────────────────────────────────────

function avg(nums: (number | null)[]): number | null {
  const valid = nums.filter((n): n is number => n != null && !isNaN(n));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function pctDiff(predicted: number, actual: number): number {
  if (predicted === 0) return 0;
  return ((actual - predicted) / predicted) * 100;
}

function diffColor(pct: number): string {
  const abs = Math.abs(pct);
  if (abs <= 10) return 'text-emerald-500';
  if (abs <= 25) return 'text-yellow-500';
  if (abs <= 50) return 'text-orange-500';
  return 'text-red-500';
}

function diffBg(pct: number): string {
  const abs = Math.abs(pct);
  if (abs <= 10) return 'bg-emerald-500/10';
  if (abs <= 25) return 'bg-yellow-500/10';
  if (abs <= 50) return 'bg-orange-500/10';
  return 'bg-red-500/10';
}

function formatHours(seconds: number): string {
  return (seconds / 3600).toFixed(2) + 'h';
}

function formatSeconds(s: number): string {
  if (s >= 3600) return formatHours(s);
  if (s >= 60) return (s / 60).toFixed(1) + 'm';
  return s + 's';
}

// ─── Component ──────────────────────────────────────────────────────────

interface ObservationComparisonProps {
  project: Project;
}

const ObservationComparison: React.FC<ObservationComparisonProps> = ({ project }) => {
  if (!project.observations || project.observations.length === 0) return null;

  const primaryPlan = project.exposurePlan?.[0];
  const formulaSnapshot = primaryPlan?.formulaSnapshot;

  // ─── Compute real observation stats ──────────────────────────────────
  const obs = project.observations;

  const realTotalExposures = obs.reduce((sum, o) => sum + o.exposuresTaken, 0);
  const realAvgExposureDuration = avg(obs.map(o => o.exposureDuration)) ?? 0;
  const realTotalExposureTime = obs.reduce((sum, o) => sum + o.exposuresTaken * o.exposureDuration, 0);
  const realAvgSeeing = avg(obs.map(o => o.seeing));
  const realAvgGuidingRms = avg(obs.map(o => o.guidingRms));
  const realAvgMoonIllum = avg(obs.map(o => o.moonIllumination));
  const realFilters = [...new Set(obs.map(o => o.filter))];

  // ─── Predicted values ────────────────────────────────────────────────
  const predictedSubExposure = primaryPlan?.subExposure ?? 0;
  const predictedSubCount = primaryPlan?.subCount ?? 0;
  const predictedTotalTime = primaryPlan?.totalExposureTime ?? 0;
  const predictedSnr = primaryPlan?.snrValue ?? formulaSnapshot?.formulaOutput.snrValue ?? 0;
  const predictedMoonIllum = formulaSnapshot?.inputs.moonIllumination ?? null;
  const predictedFilter = project.primaryFilter;

  // ─── SNR Re-calculé ───────────────────────────────────────────────────
  // SNR_real ≈ SNR_predicted × sqrt(realTotalTime / predictedTotalTime)
  const snrReal = predictedTotalTime > 0
    ? predictedSnr * Math.sqrt(realTotalExposureTime / predictedTotalTime)
    : 0;
  const snrRatio = predictedSnr > 0 ? snrReal / predictedSnr : 0;

  // ─── Per-observation SNR ratios for chart ─────────────────────────────
  // For each observation date, compute cumulative real time and SNR ratio
  const chronologicalObs = [...obs].sort((a, b) => a.date.localeCompare(b.date));

  let cumulativeRealTime = 0;
  const chartData = chronologicalObs.map((o, i) => {
    cumulativeRealTime += o.exposuresTaken * o.exposureDuration;
    const cumulativeSnr = predictedTotalTime > 0
      ? predictedSnr * Math.sqrt(cumulativeRealTime / predictedTotalTime)
      : 0;
    const ratio = predictedSnr > 0 ? cumulativeSnr / predictedSnr : 0;
    return {
      date: o.date,
      ratio: parseFloat(ratio.toFixed(3)),
      cumulativeTime: cumulativeRealTime,
      cumulativeSnr: parseFloat(cumulativeSnr.toFixed(1)),
    };
  });

  // ─── Insights ────────────────────────────────────────────────────────
  const avgRatio = snrRatio; // overall ratio
  const insight = useMemo(() => {
    if (avgRatio < 0.7) {
      const overestPct = Math.round((1 - avgRatio) * 100);
      return {
        icon: AlertTriangle,
        color: 'text-orange-400',
        bg: 'bg-orange-500/10 border-orange-500/30',
        text: `⚠️ Le modèle surestime le SNR de ${overestPct}%. Conditions réelles plus difficiles que prévu.`,
      };
    } else if (avgRatio > 1.3) {
      const underestPct = Math.round((avgRatio - 1) * 100);
      return {
        icon: CheckCircle2,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10 border-emerald-500/30',
        text: `✅ Le modèle sous-estime le SNR de ${underestPct}%. Conditions réelles meilleures que prévu.`,
      };
    } else {
      const accuracyPct = Math.round((1 - Math.abs(1 - avgRatio)) * 100);
      return {
        icon: CheckCircle2,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10 border-emerald-500/30',
        text: `✅ Le modèle est précis à ${accuracyPct}% près.`,
      };
    }
  }, [avgRatio]);

  // ─── Filter match ────────────────────────────────────────────────────
  const filterMatch = realFilters.length === 1 && realFilters[0] === predictedFilter;
  const filterMatchLabel = filterMatch
    ? '✅ Match'
    : realFilters.length === 0
      ? '—'
      : `⚠️ ${realFilters.join(', ')}`;

  // ─── Sub-exposure diff ────────────────────────────────────────────────
  const subExposureDiff = predictedSubExposure > 0
    ? pctDiff(predictedSubExposure, realAvgExposureDuration)
    : 0;
  const subCountDiff = predictedSubCount > 0
    ? pctDiff(predictedSubCount, realTotalExposures)
    : 0;
  const totalTimeDiff = predictedTotalTime > 0
    ? pctDiff(predictedTotalTime, realTotalExposureTime)
    : 0;
  const moonDiff = predictedMoonIllum != null && realAvgMoonIllum != null
    ? pctDiff(predictedMoonIllum, realAvgMoonIllum)
    : null;

  // ─── Calibration state (fetched from API) ────────────────────────────
  const [calibration, setCalibration] = useState<any>(null);
  const [calibLoading, setCalibLoading] = useState(false);
  const [calibError, setCalibError] = useState<string | null>(null);

  const fetchCalibration = async () => {
    setCalibLoading(true);
    setCalibError(null);
    try {
      const token = localStorage.getItem('astrosuite_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`/api/apls/projects/${project.id}/calibration`, { headers });
      if (!res.ok) throw new Error('Failed to fetch calibration');
      const data = await res.json();
      setCalibration(data);
    } catch (err: any) {
      setCalibError(err.message || 'Error fetching calibration');
    } finally {
      setCalibLoading(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <div className="bg-surface border border-border rounded-xl p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-text flex items-center gap-2">
          <BarChart3 size={16} /> Prédit vs Réel — Calibrage SNR
        </h3>
        <span className="text-xs text-text-secondary">
          {obs.length} observation{obs.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-3 text-text-secondary font-medium">Métrique</th>
              <th className="text-right py-2 px-3 text-text-secondary font-medium">Prédit (Formule)</th>
              <th className="text-right py-2 px-3 text-text-secondary font-medium">Réel (Observations)</th>
              <th className="text-right py-2 px-3 text-text-secondary font-medium">Écart</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {/* Sub-exposure */}
            <tr>
              <td className="py-2 px-3 text-text">Sub-exposure</td>
              <td className="py-2 px-3 text-right font-mono text-text">{formatSeconds(predictedSubExposure)}</td>
              <td className="py-2 px-3 text-right font-mono text-text">{formatSeconds(realAvgExposureDuration)}</td>
              <td className={`py-2 px-3 text-right font-mono ${diffColor(subExposureDiff)}`}>
                {subExposureDiff > 0 ? '+' : ''}{subExposureDiff.toFixed(1)}%
              </td>
            </tr>
            {/* Number of subs */}
            <tr>
              <td className="py-2 px-3 text-text">N° subs</td>
              <td className="py-2 px-3 text-right font-mono text-text">{predictedSubCount}</td>
              <td className="py-2 px-3 text-right font-mono text-text">{realTotalExposures}</td>
              <td className={`py-2 px-3 text-right font-mono ${diffColor(subCountDiff)}`}>
                {subCountDiff > 0 ? '+' : ''}{subCountDiff.toFixed(1)}%
              </td>
            </tr>
            {/* Total time */}
            <tr>
              <td className="py-2 px-3 text-text">Temps total</td>
              <td className="py-2 px-3 text-right font-mono text-text">{formatHours(predictedTotalTime)}</td>
              <td className="py-2 px-3 text-right font-mono text-text">{formatHours(realTotalExposureTime)}</td>
              <td className={`py-2 px-3 text-right font-mono ${diffColor(totalTimeDiff)}`}>
                {totalTimeDiff > 0 ? '+' : ''}{totalTimeDiff.toFixed(1)}%
              </td>
            </tr>
            {/* Filter */}
            <tr>
              <td className="py-2 px-3 text-text">Filtre</td>
              <td className="py-2 px-3 text-right text-text">{predictedFilter.replace(/_/g, ' ')}</td>
              <td className="py-2 px-3 text-right text-text">{realFilters.map(f => f.replace(/_/g, ' ')).join(', ') || '—'}</td>
              <td className={`py-2 px-3 text-right ${filterMatch ? 'text-emerald-500' : 'text-yellow-500'}`}>
                {filterMatchLabel}
              </td>
            </tr>
            {/* Seeing (not predicted) */}
            <tr>
              <td className="py-2 px-3 text-text">Seeing</td>
              <td className="py-2 px-3 text-right text-text-secondary">—</td>
              <td className="py-2 px-3 text-right font-mono text-text">
                {realAvgSeeing != null ? `${realAvgSeeing.toFixed(2)}"` : '—'}
              </td>
              <td className="py-2 px-3 text-right text-text-secondary">—</td>
            </tr>
            {/* Guiding RMS (not predicted) */}
            <tr>
              <td className="py-2 px-3 text-text">Guiding RMS</td>
              <td className="py-2 px-3 text-right text-text-secondary">—</td>
              <td className="py-2 px-3 text-right font-mono text-text">
                {realAvgGuidingRms != null ? `${realAvgGuidingRms.toFixed(2)}"` : '—'}
              </td>
              <td className="py-2 px-3 text-right text-text-secondary">—</td>
            </tr>
            {/* Moon illumination */}
            <tr>
              <td className="py-2 px-3 text-text">Moon illum.</td>
              <td className="py-2 px-3 text-right font-mono text-text">
                {predictedMoonIllum != null ? `${(predictedMoonIllum * 100).toFixed(0)}%` : '—'}
              </td>
              <td className="py-2 px-3 text-right font-mono text-text">
                {realAvgMoonIllum != null ? `${(realAvgMoonIllum * 100).toFixed(0)}%` : '—'}
              </td>
              <td className={`py-2 px-3 text-right font-mono ${moonDiff != null ? diffColor(moonDiff) : 'text-text-secondary'}`}>
                {moonDiff != null ? `${moonDiff > 0 ? '+' : ''}${moonDiff.toFixed(1)}%` : '—'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* SNR Re-calculé Section */}
      <div className="bg-background border border-border rounded-lg p-4 space-y-3">
        <h4 className="text-sm font-semibold text-text flex items-center gap-2">
          <Activity size={14} /> SNR Re-calculé
        </h4>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-surface border border-border rounded-lg p-3 text-center">
            <span className="text-xs text-text-secondary block mb-1">SNR Prédit</span>
            <span className="font-mono font-bold text-lg text-text">{predictedSnr.toFixed(1)}</span>
          </div>
          <div className="bg-surface border border-border rounded-lg p-3 text-center">
            <span className="text-xs text-text-secondary block mb-1">SNR Réel (estimé)</span>
            <span className={`font-mono font-bold text-lg ${snrRatio < 0.7 ? 'text-orange-400' : snrRatio > 1.3 ? 'text-emerald-400' : 'text-text'}`}>
              {snrReal.toFixed(1)}
            </span>
          </div>
          <div className="bg-surface border border-border rounded-lg p-3 text-center">
            <span className="text-xs text-text-secondary block mb-1">Ratio réel/prédit</span>
            <span className={`font-mono font-bold text-lg ${snrRatio < 0.7 ? 'text-orange-400' : snrRatio > 1.3 ? 'text-emerald-400' : 'text-emerald-400'}`}>
              {snrRatio.toFixed(3)}
            </span>
          </div>
        </div>
        <p className="text-xs text-text-secondary">
          SNR réel ≈ SNR prédit × √(temps réel / temps prédit) — estimation basée sur le ratio d'intégration.
          Ce ratio est le <strong className="text-text">facteur de calibration empirique</strong> : plus il s'écarte de 1.0, plus le modèle a besoin d'ajustement.
        </p>
      </div>

      {/* Chart: SNR ratio evolution */}
      {chartData.length > 0 && (
        <div className="bg-background border border-border rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-semibold text-text flex items-center gap-2">
            <TrendingUp size={14} /> Évolution du ratio SNR réel/prédit
          </h4>
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  domain={[0, 'auto']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface, #1e293b)',
                    border: '1px solid var(--color-border, #334155)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: '#e2e8f0' }}
                  formatter={(value: number) => [value.toFixed(3), 'Ratio SNR']}
                />
                <ReferenceLine y={1} stroke="#6366f1" strokeDasharray="3 3" label={{ value: 'Prédit', fontSize: 10, fill: '#6366f1' }} />
                <Bar dataKey="ratio" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.ratio < 0.7 ? '#f97316' : entry.ratio > 1.3 ? '#10b981' : '#6366f1'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Insights */}
      <div className={`border rounded-lg p-4 flex items-start gap-3 ${insight.bg}`}>
        <insight.icon size={18} className={insight.color + ' mt-0.5 shrink-0'} />
        <p className="text-sm text-text">{insight.text}</p>
      </div>

      {/* Calibration API Section */}
      <div className="bg-background border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-text flex items-center gap-2">
            <Award size={14} /> Suggestion de Calibration
          </h4>
          <button
            onClick={fetchCalibration}
            disabled={calibLoading}
            className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1"
          >
            {calibLoading ? 'Calcul...' : 'Calculer k_calib'}
          </button>
        </div>

        {calibError && (
          <p className="text-xs text-red-400">{calibError}</p>
        )}

        {calibration && (
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="bg-surface border border-border rounded-lg p-3 text-center">
              <span className="text-xs text-text-secondary block mb-1">Ratio moyen</span>
              <span className="font-mono font-bold text-text">{calibration.ratio?.toFixed(3) ?? '—'}</span>
            </div>
            <div className="bg-surface border border-border rounded-lg p-3 text-center">
              <span className="text-xs text-text-secondary block mb-1">Observations</span>
              <span className="font-mono font-bold text-text">{calibration.observations_count ?? 0}</span>
            </div>
            <div className="bg-surface border border-border rounded-lg p-3 text-center">
              <span className="text-xs text-text-secondary block mb-1">k_calib suggéré</span>
              <span className="font-mono font-bold text-text">{calibration.suggested_k_calib?.toFixed(3) ?? '—'}</span>
            </div>
          </div>
        )}

        {!calibration && !calibLoading && !calibError && (
          <p className="text-xs text-text-secondary">
            Cliquez sur « Calculer k_calib » pour obtenir une suggestion de facteur de calibration basée sur les observations réelles.
          </p>
        )}

        {calibration && calibration.observations_count < 3 && (
          <p className="text-xs text-yellow-500">
            ⚠️ Moins de 3 observations — calibration non fiable. Ajoutez plus d'observations pour affiner le facteur.
          </p>
        )}
      </div>
    </div>
  );
};

export default ObservationComparison;