import React from 'react';
import { SamplingRecommendation } from '../../types/module2';

interface SamplingDisplayProps {
  pixelScale: number;
  fovWidth: number;
  fovHeight: number;
  recommendation: SamplingRecommendation;
}

export const SamplingDisplay: React.FC<SamplingDisplayProps> = ({
  pixelScale,
  fovWidth,
  fovHeight,
  recommendation,
}) => {
  const colorMap = {
    red: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
    orange: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800',
    green: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
    blue: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
  };

  const statusLabels = {
    undersampled_critical: '⚠️ Sous-échantillonnage critique',
    undersampled_moderate: '⚡ Sous-échantillonnage modéré',
    ideal: '✅ Zone idéale',
    oversampled: 'ℹ️ Sur-échantillonnage',
  };

  const drizzleLabels = {
    '2x_aggressive': 'Drizzle 2× (agressif)',
    '2x': 'Drizzle 2×',
    none: 'Pas de Drizzle',
    bin2x2: 'Binning 2×2',
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800 text-white p-6 rounded-lg text-center">
          <div className="text-3xl font-bold">{pixelScale}"</div>
          <div className="text-sm text-slate-400 mt-1">/pixel (échantillonnage)</div>
        </div>
        <div className="bg-slate-800 text-white p-6 rounded-lg text-center">
          <div className="text-3xl font-bold">{fovWidth}'×{fovHeight}'</div>
          <div className="text-sm text-slate-400 mt-1">Champ de vision</div>
        </div>
        <div className="bg-slate-800 text-white p-6 rounded-lg text-center">
          <div className="text-3xl font-bold">{pixelScale > 1.5 ? 'Mauvais' : pixelScale > 0.8 ? 'Optimal' : 'Bon'}</div>
          <div className="text-sm text-slate-400 mt-1">Qualité échantillonnage</div>
        </div>
      </div>

      {/* Recommendation Alert */}
      <div className={`p-6 rounded-lg border-2 ${colorMap[recommendation.colorCode]}`}>
        <div className="text-lg font-semibold mb-2">
          {statusLabels[recommendation.status]}
        </div>
        <p className="text-sm mb-4">{recommendation.explanation}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/50 dark:bg-black/20 p-3 rounded">
            <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Recommandation</div>
            <div className="text-sm font-medium">{drizzleLabels[recommendation.drizzleRecommendation]}</div>
          </div>

          <div className="bg-white/50 dark:bg-black/20 p-3 rounded">
            <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Dithering</div>
            <div className="text-sm font-medium">
              {recommendation.ditherRequired
                ? `Min. ${recommendation.ditherMinPixels} px sur capteur principal`
                : 'Non requis'}
            </div>
          </div>

          {recommendation.pixelDrop && (
            <div className="bg-white/50 dark:bg-black/20 p-3 rounded">
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Pixel Drop</div>
              <div className="text-sm font-medium">{recommendation.pixelDrop}</div>
            </div>
          )}
        </div>
      </div>

      {/* Visual Scale Reference */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-100">
          📐 Référence d'échantillonnage
        </h3>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-32 text-sm text-slate-500">{'> 2.5"/px'}</div>
            <div className="flex-1 h-4 bg-red-200 dark:bg-red-900/50 rounded relative">
              <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-red-800 dark:text-red-300">Critique</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-32 text-sm text-slate-500">{'1.5 - 2.5"/px'}</div>
            <div className="flex-1 h-4 bg-orange-200 dark:bg-orange-900/50 rounded relative">
              <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-orange-800 dark:text-orange-300">Modéré</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-32 text-sm text-slate-500">0.8 - 1.5"/px</div>
            <div className="flex-1 h-4 bg-emerald-200 dark:bg-emerald-900/50 rounded relative">
              <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-emerald-800 dark:text-emerald-300">Idéal ✅</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-32 text-sm text-slate-500">{'< 0.8"/px'}</div>
            <div className="flex-1 h-4 bg-blue-200 dark:bg-blue-900/50 rounded relative">
              <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-blue-800 dark:text-blue-300">Sur-échant.</div>
            </div>
          </div>

          {/* Current position marker */}
          <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded">
            <div className="text-sm text-slate-600 dark:text-slate-300">
              Position actuelle: <strong>{pixelScale}"/px</strong>
              {pixelScale > 2.5 && ' → Sous-échantillonnage critique'}
              {pixelScale > 1.5 && pixelScale <= 2.5 && ' → Sous-échantillonnage modéré'}
              {pixelScale > 0.8 && pixelScale <= 1.5 && ' → Zone idéale'}
              {pixelScale <= 0.8 && ' → Sur-échantillonnage'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
