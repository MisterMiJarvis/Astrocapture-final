import React, { useState, useEffect } from 'react';
import { RigProfile, RigCalculations } from '../../types/module2';
import { calculateDitherPixels, validateGuidingRatio } from '../../services/module2/rigProfileService';

interface GuidingSetupFormProps {
  profile: RigProfile;
  calculations: RigCalculations;
  onUpdate: (data: Partial<RigProfile>) => void;
}

export const GuidingSetupForm: React.FC<GuidingSetupFormProps> = ({
  profile,
  calculations,
  onUpdate,
}) => {
  const [ditherPixels, setDitherPixels] = useState(3);
  const [ditherResult, setDitherResult] = useState<{
    imaging: number;
    guiding: number;
    physicalShift: number;
  } | null>(null);

  const guidingCalc = calculations.guidingPixelScale && calculations.guidingRatio !== undefined
    ? {
        imagingScale: calculations.pixelScale,
        guidingScale: calculations.guidingPixelScale,
        ratio: calculations.guidingRatio,
        isValid: calculations.guidingRatioValid ?? false,
      }
    : null;

  useEffect(() => {
    if (guidingCalc) {
      const guidePixels = calculateDitherPixels(ditherPixels, calculations.pixelScale, calculations.guidingPixelScale!);
      const physicalShift = ditherPixels * calculations.pixelScale; // arcsec
      setDitherResult({
        imaging: ditherPixels,
        guiding: guidePixels,
        physicalShift,
      });
    }
  }, [ditherPixels, calculations, guidingCalc]);

  const handleUpdateGuiding = (field: string, value: any) => {
    onUpdate({
      guiding: {
        ...profile.guiding,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Configuration guidage */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-100">
          🎯 Configuration de guidage
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Guide camera</label>
            <input
              type="text"
              value={profile.guiding.cameraName}
              onChange={e => handleUpdateGuiding('cameraName', e.target.value)}
              className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 
                         bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Taille pixel guidage</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={profile.guiding.pixelSize}
                onChange={e => handleUpdateGuiding('pixelSize', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 
                           bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm"
              />
              <span className="text-xs text-slate-400">μm</span>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Focale guidage</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={profile.guiding.focalLength || ''}
                onChange={e => handleUpdateGuiding('focalLength', parseFloat(e.target.value) || undefined)}
                className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 
                           bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm"
              />
              <span className="text-xs text-slate-400">mm</span>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Mode</label>
            <select
              value={profile.guiding.mode}
              onChange={e => handleUpdateGuiding('mode', e.target.value)}
              className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 
                         bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm"
            >
              <option value="GuideScope">Lunette guide</option>
              <option value="OAG">OAG</option>
              <option value="Integrated">Integrated guiding</option>
            </select>
          </div>
        </div>
      </div>

      {/* Calculs guidage */}
      {guidingCalc && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-800 text-white p-4 rounded-lg">
            <div className="text-sm text-slate-400">Guiding scale</div>
            <div className="text-2xl font-bold">{guidingCalc.guidingScale}"/px</div>
          </div>
          <div className={`p-4 rounded-lg ${guidingCalc.isValid ? 'bg-emerald-800 text-white' : 'bg-orange-800 text-white'}`}>
            <div className="text-sm text-white/70">Ratio</div>
            <div className="text-2xl font-bold">1:{Math.round(1 / guidingCalc.ratio)}</div>
            <div className="text-xs mt-1">
              {guidingCalc.isValid ? '✅ OK (< 1:5)' : '⚠️ Too high'}
            </div>
          </div>
        </div>
      )}

      {/* Dither Calculator */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-100">
          🎲 Calculateur de Dithering
        </h3>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-xs text-slate-500 mb-1">
              Desired dither on imaging sensor (px)
            </label>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={ditherPixels}
              onChange={e => setDitherPixels(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="text-center text-sm text-slate-600 mt-1">{ditherPixels} px</div>
          </div>
        </div>

        {ditherResult && guidingCalc && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-center">
              <div className="text-sm text-slate-500">Capteur principal</div>
              <div className="text-xl font-bold text-blue-700 dark:text-blue-300">{ditherResult.imaging} px</div>
              <div className="text-xs text-slate-400">≈ {(ditherResult.imaging * calculations.pixelScale).toFixed(1)}" shift</div>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg text-center">
              <div className="text-sm text-slate-500">Enter in PHD2/NINA</div>
              <div className="text-xl font-bold text-purple-700 dark:text-purple-300">{ditherResult.guiding} px</div>
              <div className="text-xs text-slate-400">Valeur de dither guidage</div>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg text-center">
              <div className="text-sm text-slate-500">Physical shift</div>
              <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{ditherResult.physicalShift.toFixed(1)}"</div>
              <div className="text-xs text-slate-400">arcsec sur le ciel</div>
            </div>
          </div>
        )}

        {!guidingCalc && (
          <div className="text-sm text-slate-500 text-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded">
            Configurez la focale guidage pour voir les calculs de dithering.
          </div>
        )}
      </div>

      {/* Software-specific settings */}
      {ditherResult && (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-100">
            ⚙️ Software Settings
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <div className="font-medium text-slate-700 dark:text-slate-200 mb-2">PHD2</div>
              <div className="text-sm text-slate-500 space-y-1">
                <div>Dither amount: <strong>{ditherResult.guiding}</strong> px</div>
                <div>Scale: <strong>1.0</strong></div>
                <div>Settle {'<'} 1.5" for <strong>8</strong> px</div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <div className="font-medium text-slate-700 dark:text-slate-200 mb-2">N.I.N.A.</div>
              <div className="text-sm text-slate-500 space-y-1">
                <div>Dither pixels: <strong>{ditherResult.guiding}</strong></div>
                <div>Dither mode: <strong>RA+Dec</strong></div>
                <div>Settle time: <strong>8s</strong></div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <div className="font-medium text-slate-700 dark:text-slate-200 mb-2">ASIAIR</div>
              <div className="text-sm text-slate-500 space-y-1">
                <div>Dither: <strong>{ditherResult.guiding}</strong> px</div>
                <div>Dither scale: <strong>1.0</strong></div>
                <div>Max dither: <strong>{(ditherResult.guiding * 2)}</strong> px</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
