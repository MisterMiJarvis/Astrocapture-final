// ============================================================================
// COMPOSANT: PHD2AnalysisView — RMS en arcsec + graphs dérive
// Module 6 — Projets, Logs & Analyse
// Correction terrain Point #1: RMS en arcsec
// ============================================================================

import React, { useState } from 'react';
import { PHD2Log, PHD2Event } from '../../types/module6';

interface PHD2AnalysisViewProps {
  log: PHD2Log;
  pixelScaleImaging: number;
}

type GraphType = 'rms' | 'ra_dec' | 'star_mass' | 'snr';

export const PHD2AnalysisView: React.FC<PHD2AnalysisViewProps> = ({ log, pixelScaleImaging }) => {
  const [graphType, setGraphType] = useState<GraphType>('rms');
  const { guidingData, ditherData, timeline } = log;

  // Qualité guidage
  const getQualityLabel = (rms: number): { label: string; color: string } => {
    if (rms < 0.5) return { label: 'Excellent', color: 'text-emerald-500' };
    if (rms < 1.0) return { label: 'Bon', color: 'text-blue-500' };
    if (rms < 1.5) return { label: 'Moyen', color: 'text-yellow-500' };
    return { label: 'À améliorer', color: 'text-red-500' };
  };

  const quality = getQualityLabel(guidingData.rmsTotalArcsec);

  return (
    <div className="rounded-lg bg-white dark:bg-slate-900 p-4 shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          🎯 Analyse PHD2 — {log.fileName}
        </h3>
        <span className="text-xs text-slate-400">
          {guidingData.samples} échantillons • {guidingData.duration.toFixed(1)} min
        </span>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard
          label="RMS Total"
          value={`${guidingData.rmsTotalArcsec.toFixed(2)}"`}
          sub={`${guidingData.rmsTotalPixels.toFixed(2)} px`}
          color={quality.color}
        />
        <StatCard
          label="RMS RA"
          value={`${guidingData.rmsRA.toFixed(2)}"`}
          sub={`Peak: ${guidingData.peakRA.toFixed(2)}"`}
        />
        <StatCard
          label="RMS Dec"
          value={`${guidingData.rmsDec.toFixed(2)}"`}
          sub={`Peak: ${guidingData.peakDec.toFixed(2)}"`}
        />
        <StatCard
          label="Dithers"
          value={`${ditherData.count}`}
          sub={`Settle: ${ditherData.settleTimeAvg.toFixed(1)}s avg`}
        />
      </div>

      {/* Quality indicator */}
      <div className={`text-sm font-medium mb-4 ${quality.color}`}>
        Qualité: {quality.label} (échelle pixel: {pixelScaleImaging.toFixed(2)}"/px)
      </div>

      {/* Graph type selector */}
      <div className="flex gap-2 mb-3">
        {([
          { id: 'rms' as GraphType, label: 'RMS' },
          { id: 'ra_dec' as GraphType, label: 'RA/DEC' },
          { id: 'star_mass' as GraphType, label: 'Star Mass' },
          { id: 'snr' as GraphType, label: 'SNR' },
        ]).map(g => (
          <button
            key={g.id}
            onClick={() => setGraphType(g.id)}
            className={`text-xs px-3 py-1.5 rounded transition-colors
              ${graphType === g.id
                ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-800'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}
            `}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* SVG Graph */}
      <div className="h-48 w-full bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2">
        <SimpleLineGraph events={timeline} type={graphType} />
      </div>

      {/* Dither stats */}
      {ditherData.count > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded bg-slate-50 dark:bg-slate-800/50 p-2">
            <div className="text-slate-400">Dithers</div>
            <div className="font-medium text-slate-700 dark:text-slate-200">{ditherData.count}</div>
          </div>
          <div className="rounded bg-slate-50 dark:bg-slate-800/50 p-2">
            <div className="text-slate-400">Settle max</div>
            <div className="font-medium text-slate-700 dark:text-slate-200">{ditherData.settleTimeMax.toFixed(1)}s</div>
          </div>
          <div className="rounded bg-slate-50 dark:bg-slate-800/50 p-2">
            <div className="text-slate-400">Échecs</div>
            <div className={`font-medium ${ditherData.failedSettles > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
              {ditherData.failedSettles}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string; sub: string; color?: string }> = ({
  label, value, sub, color = 'text-slate-700 dark:text-slate-200'
}) => (
  <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3">
    <div className="text-xs text-slate-400 uppercase">{label}</div>
    <div className={`text-xl font-bold ${color}`}>{value}</div>
    <div className="text-xs text-slate-500">{sub}</div>
  </div>
);

/**
 * Graphique simple en SVG
 */
const SimpleLineGraph: React.FC<{ events: PHD2Event[]; type: GraphType }> = ({ events, type }) => {
  const width = 600;
  const height = 160;
  const padding = 20;

  // Filtrer et extraire les valeurs
  const guideEvents = events.filter(e => e.type === 'guide');
  const values = guideEvents.map((e, i) => ({
    x: i,
    y: type === 'rms' ? (e.rms || 0)
      : type === 'ra_dec' ? Math.sqrt((e.ra || 0) ** 2 + (e.dec || 0) ** 2)
      : type === 'star_mass' ? (e.starMass || 0)
      : (e.snr || 0),
  }));

  if (values.length === 0) {
    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
        <text x={width / 2} y={height / 2} textAnchor="middle" className="fill-slate-400 text-sm">
          Pas de données
        </text>
      </svg>
    );
  }

  const maxY = Math.max(...values.map(v => v.y), 0.1);
  const minY = 0;

  const xScale = (width - 2 * padding) / Math.max(values.length - 1, 1);
  const yScale = (height - 2 * padding) / (maxY - minY);

  const points = values.map((v, i) => ({
    x: padding + i * xScale,
    y: height - padding - (v.y - minY) * yScale,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map(ratio => (
        <line
          key={ratio}
          x1={padding}
          y1={height - padding - ratio * (height - 2 * padding)}
          x2={width - padding}
          y2={height - padding - ratio * (height - 2 * padding)}
          className="stroke-slate-200 dark:stroke-slate-700"
          strokeWidth="1"
          strokeDasharray="4"
        />
      ))}

      {/* Line */}
      <path
        d={pathD}
        fill="none"
        className="stroke-emerald-500"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />

      {/* Points */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="2"
          className="fill-emerald-500"
        />
      ))}
    </svg>
  );
};

export default PHD2AnalysisView;
