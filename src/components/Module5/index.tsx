import React, { useMemo, useState } from 'react';
import {
  FilterType,
  ExposureParams,
  ExposureResult,
  ReducerImpact,
  FilterProfile,
  SQMDynamicModel,
} from '../../types/module5';
import {
  FILTER_PROFILES,
  calculateExposure,
  calculateReducerImpact,
  calculateEffectiveSQM,
  calculateMoonSeparation,
  simulateSNR,
} from '../../services/module5/exposureCalculator';

interface FilterSelectorProps {
  selectedFilter: FilterType;
  onChange: (filter: FilterType) => void;
  moonPhase: number;
  moonAltitude: number;
}

/**
 * Sélecteur de filtres avec indicateur de compatibilité Lune.
 */
export const FilterSelector: React.FC<FilterSelectorProps> = ({
  selectedFilter,
  onChange,
  moonPhase,
  moonAltitude,
}) => {
  const hasMoon = moonPhase > 0.3 && moonAltitude > 0;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Filtre</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(Object.keys(FILTER_PROFILES) as FilterType[]).map((type) => {
          const profile = FILTER_PROFILES[type];
          const isCompatible = !hasMoon || profile.moonCompatible;
          const isSelected = selectedFilter === type;

          return (
            <button
              key={type}
              onClick={() => isCompatible && onChange(type)}
              disabled={!isCompatible}
              className={`
                p-3 rounded-lg border text-left transition-all
                ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                ${!isCompatible ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-300'}
              `}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: profile.color }}
                />
                <span className="font-medium">{profile.name}</span>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                τ={profile.transmission} | {profile.bandwidthNm}nm
              </div>
              <div className="mt-1 flex items-center gap-1">
                {profile.moonCompatible ? (
                  <span className="text-xs text-green-600">🌙 Compatible Lune</span>
                ) : (
                  <span className="text-xs text-red-400">🚫 Lune</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface SQMDisplayProps {
  sqmModel: SQMDynamicModel;
}

/**
 * Gauge SQM avec zones colorées.
 */
export const SQMDisplay: React.FC<SQMDisplayProps> = ({ sqmModel }) => {
  const getColor = (sqm: number) => {
    if (sqm >= 21) return 'text-green-600';
    if (sqm >= 19) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getBarColor = (sqm: number) => {
    if (sqm >= 21) return 'bg-green-500';
    if (sqm >= 19) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="p-4 bg-white rounded-lg border">
      <h3 className="text-lg font-semibold mb-3">SQM Dynamique</h3>
      <div className="flex items-center gap-4">
        <div className={`text-3xl font-bold ${getColor(sqmModel.sqmEffective)}`}>
          {sqmModel.sqmEffective.toFixed(1)}
        </div>
        <div className="flex-1">
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${getBarColor(sqmModel.sqmEffective)} transition-all`}
              style={{
                width: `${Math.min(100, ((sqmModel.sqmEffective - 17) / 6) * 100)}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>17 (Ville)</span>
            <span>20 (Banlieue)</span>
            <span>21.5 (Rural)</span>
            <span>23 (Noir)</span>
          </div>
        </div>
      </div>
      <div className="mt-3 text-sm text-gray-600 space-y-1">
        <p>Base : {sqmModel.sqmBase} mag/arcsec²</p>
        <p>Dégradation Lune : -{sqmModel.degradation} mag</p>
        <p>Bortle estimé : {sqmModel.bortleScale}</p>
        <p>Phase Lune : {(sqmModel.moonPhase * 100).toFixed(0)}% | Altitude : {sqmModel.moonAltitude.toFixed(0)}°</p>
        <p>Séparation cible-Lune : {sqmModel.targetMoonSeparation.toFixed(1)}°</p>
      </div>
    </div>
  );
};

interface ExposureCalculatorProps {
  rigProfile: {
    aperture: number;
    focalLength: number;
    pixelSize: number;
    quantumEfficiency: number;
    readNoise: number;
  };
  sqmModel: SQMDynamicModel;
}

/**
 * Formulaire calculateur d'exposition avec pipeline physique.
 */
export const ExposureCalculator: React.FC<ExposureCalculatorProps> = ({
  rigProfile,
  sqmModel,
}) => {
  const [filterType, setFilterType] = useState<FilterType>('L_Ultimate');
  const [kFactor, setKFactor] = useState<5 | 10>(5);
  const [reducerFactor, setReducerFactor] = useState<number>(1.0);

  const params: ExposureParams = useMemo(
    () => ({
      skyMagnitude: sqmModel.sqmEffective,
      aperture: rigProfile.aperture,
      pixelSize: rigProfile.pixelSize,
      focalLength: rigProfile.focalLength * reducerFactor,
      quantumEfficiency: rigProfile.quantumEfficiency,
      filterTransmission: FILTER_PROFILES[filterType].transmission,
      readNoise: rigProfile.readNoise,
      kFactor,
    }),
    [rigProfile, sqmModel, filterType, kFactor, reducerFactor]
  );

  const result: ExposureResult = useMemo(() => calculateExposure(params), [params]);

  const impact: ReducerImpact | null = useMemo(() => {
    if (reducerFactor >= 1) return null;
    return calculateReducerImpact(params, reducerFactor, rigProfile.focalLength);
  }, [params, reducerFactor, rigProfile.focalLength]);

  return (
    <div className="space-y-6">
      <div className="p-4 bg-white rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">Calculateur d'Exposition</h3>

        <FilterSelector
          selectedFilter={filterType}
          onChange={setFilterType}
          moonPhase={sqmModel.moonPhase}
          moonAltitude={sqmModel.moonAltitude}
        />

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Facteur k</label>
            <select
              value={kFactor}
              onChange={(e) => setKFactor(Number(e.target.value) as 5 | 10)}
              className="mt-1 block w-full rounded border-gray-300"
            >
              <option value={5}>k = 5 (conservateur)</option>
              <option value={10}>k = 10 (agressif)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Réducteur</label>
            <select
              value={reducerFactor}
              onChange={(e) => setReducerFactor(Number(e.target.value))}
              className="mt-1 block w-full rounded border-gray-300"
            >
              <option value={1.0}>Sans réducteur (1.0×)</option>
              <option value={0.73}>×0.73 (TS-Optics)</option>
              <option value={0.8}>×0.8</option>
              <option value={0.6}>×0.6</option>
            </select>
          </div>
        </div>
      </div>

      {/* Résultat */}
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-blue-900">Résultat — Pipeline v9</h4>
        <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-blue-700">Temps de pose optimal</p>
            <p className="text-2xl font-bold text-blue-900">
              {result.subExposureTime}s
            </p>
          </div>
          <div>
            <p className="text-sm text-blue-700">B_sky (fond de ciel)</p>
            <p className="text-xl font-bold text-blue-900">
              {result.bSky.toFixed(2)} e⁻/px/s
            </p>
          </div>
          <div>
            <p className="text-sm text-blue-700">S_obj (signal objet)</p>
            <p className="text-xl font-bold text-blue-900">
              {result.sObj.toFixed(3)} e⁻/px/s
            </p>
          </div>
          <div>
            <p className="text-sm text-blue-700">Swamping Factor</p>
            <p className="text-xl font-bold text-blue-900">
              {result.swampingFactor.toFixed(1)}×
            </p>
          </div>
          <div>
            <p className="text-sm text-blue-700">SNR par pose</p>
            <p className="text-xl font-bold text-blue-900">
              {result.snrPerSub.toFixed(1)}
            </p>
          </div>
          <div>
            <p className="text-sm text-blue-700">Contraste (S/B)</p>
            <p className="text-xl font-bold text-blue-900">
              {result.contrast.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-blue-700">Poses requises</p>
            <p className="text-xl font-bold text-blue-900">
              {result.totalSubsForSNR} subs
            </p>
          </div>
          <div>
            <p className="text-sm text-blue-700">Temps total</p>
            <p className="text-xl font-bold text-blue-900">
              {result.totalIntegrationHours.toFixed(1)}h
            </p>
          </div>
          <div>
            <p className="text-sm text-blue-700">SNR cible effectif</p>
            <p className="text-xl font-bold text-blue-900">
              {result.effectiveTargetSNR.toFixed(0)}
            </p>
          </div>
        </div>
        <p className="mt-3 text-sm text-blue-800">{result.recommendation}</p>
        {result.warning && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
            <p className="text-sm text-red-600">⚠️ {result.warning}</p>
          </div>
        )}
      </div>

      {/* Impact réducteur */}
      {impact && (
        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
          <h4 className="font-semibold text-purple-900">Impact du Réducteur</h4>
          <div className="mt-2 grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-purple-700">Sans réducteur</p>
              <p className="text-xl font-bold">{impact.withoutReducer.subExposureTime}s</p>
            </div>
            <div>
              <p className="text-sm text-purple-700">Avec réducteur</p>
              <p className="text-xl font-bold">{impact.withReducer.subExposureTime}s</p>
            </div>
            <div>
              <p className="text-sm text-purple-700">Gain de temps</p>
              <p className="text-xl font-bold text-green-700">-{impact.timeSavedPercent}%</p>
            </div>
          </div>
          <p className="mt-2 text-sm text-purple-800">
            Votre réducteur divise le temps de pose par {impact.ratio.toFixed(2)}×
          </p>
        </div>
      )}
    </div>
  );
};

interface ReducerImpactChartProps {
  rigProfile: {
    aperture: number;
    pixelSize: number;
    quantumEfficiency: number;
    readNoise: number;
  };
  sqmModel: SQMDynamicModel;
  filterType: FilterType;
  kFactor: 5 | 10;
}

/**
 * Graphique comparatif avec/sans réducteur.
 * Affiche un simple bar chart SVG.
 */
export const ReducerImpactChart: React.FC<ReducerImpactChartProps> = ({
  rigProfile,
  sqmModel,
  filterType,
  kFactor,
}) => {
  const reducers = [1.0, 0.8, 0.73, 0.6];
  const labels = ['1.0×', '0.8×', '0.73×', '0.6×'];

  const data = reducers.map((factor) => {
    const params: ExposureParams = {
      skyMagnitude: sqmModel.sqmEffective,
      aperture: rigProfile.aperture,
      pixelSize: rigProfile.pixelSize / factor,
      focalLength: 500 * factor, // Focale de référence
      quantumEfficiency: rigProfile.quantumEfficiency,
      filterTransmission: FILTER_PROFILES[filterType].transmission,
      readNoise: rigProfile.readNoise,
      kFactor,
    };
    return calculateExposure(params).subExposureTime;
  });

  const max = Math.max(...data);
  const barWidth = 60;
  const chartHeight = 200;

  return (
    <div className="p-4 bg-white rounded-lg border">
      <h4 className="font-semibold">Impact Réducteur — Temps de Pose</h4>
      <svg viewBox="0 0 320 250" className="w-full mt-4">
        {data.map((value, i) => {
          const height = (value / max) * chartHeight;
          const x = i * 80 + 20;
          const y = chartHeight - height + 20;

          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={height}
                fill={i === 0 ? '#94a3b8' : '#7c3aed'}
                rx={4}
              />
              <text
                x={x + barWidth / 2}
                y={y - 8}
                textAnchor="middle"
                className="text-xs fill-gray-700"
              >
                {value.toFixed(0)}s
              </text>
              <text
                x={x + barWidth / 2}
                y={chartHeight + 40}
                textAnchor="middle"
                className="text-xs fill-gray-500"
              >
                {labels[i]}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="text-xs text-gray-500 mt-2">
        Référence : focale 500mm, capteur standard. B_sky augmente quand F diminue.
      </p>
    </div>
  );
};

interface SNRSimulatorProps {
  rigProfile: {
    aperture: number;
    pixelSize: number;
    quantumEfficiency: number;
    readNoise: number;
  };
  sqmModel: SQMDynamicModel;
  filterType: FilterType;
}

/**
 * Simulateur SNR vs nombre de poses.
 * Affiche une courbe SVG simple.
 */
export const SNRSimulator: React.FC<SNRSimulatorProps> = ({
  rigProfile,
  sqmModel,
  filterType,
}) => {
  const [targetSNR, setTargetSNR] = useState(100);
  const [maxSubs, setMaxSubs] = useState(100);
  const [subDuration, setSubDuration] = useState(180);

  // simulateSNR est importé en haut du fichier via ES module
  const simulation = simulateSNR(
    {
      skyMagnitude: sqmModel.sqmEffective,
      aperture: rigProfile.aperture,
      pixelSize: rigProfile.pixelSize,
      focalLength: 500,
      quantumEfficiency: rigProfile.quantumEfficiency,
      filterTransmission: FILTER_PROFILES[filterType].transmission,
      readNoise: rigProfile.readNoise,
      kFactor: 5,
    },
    targetSNR,
    maxSubs,
    subDuration
  );

  const points = simulation.points;
  const width = 600;
  const height = 300;
  const padding = 40;

  const xScale = (i: number) => padding + (i / (points.length - 1)) * (width - 2 * padding);
  const yMax = Math.max(targetSNR * 1.2, Math.max(...points.map((p: any) => p.snr)));
  const yScale = (snr: number) => height - padding - (snr / yMax) * (height - 2 * padding);

  const pathD = points
    .map((p: any, i: number) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(p.snr)}`)
    .join(' ');

  return (
    <div className="p-4 bg-white rounded-lg border">
      <h4 className="font-semibold">Simulateur SNR</h4>

      <div className="mt-3 grid grid-cols-3 gap-4">
        <div>
          <label className="text-sm">SNR cible</label>
          <input
            type="number"
            value={targetSNR}
            onChange={(e) => setTargetSNR(Number(e.target.value))}
            className="block w-full rounded border-gray-300"
          />
        </div>
        <div>
          <label className="text-sm">Max poses</label>
          <input
            type="number"
            value={maxSubs}
            onChange={(e) => setMaxSubs(Number(e.target.value))}
            className="block w-full rounded border-gray-300"
          />
        </div>
        <div>
          <label className="text-sm">Durée pose (s)</label>
          <input
            type="number"
            value={subDuration}
            onChange={(e) => setSubDuration(Number(e.target.value))}
            className="block w-full rounded border-gray-300"
          />
        </div>
      </div>

      <div className="mt-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
          {/* Axes */}
          <line
            x1={padding}
            y1={height - padding}
            x2={width - padding}
            y2={height - padding}
            stroke="#ccc"
          />
          <line
            x1={padding}
            y1={padding}
            x2={padding}
            y2={height - padding}
            stroke="#ccc"
          />

          {/* Ligne cible SNR */}
          <line
            x1={padding}
            y1={yScale(targetSNR)}
            x2={width - padding}
            y2={yScale(targetSNR)}
            stroke="#22c55e"
            strokeDasharray="4,4"
          />
          <text
            x={width - padding + 5}
            y={yScale(targetSNR) + 4}
            className="text-xs fill-green-600"
          >
            SNR={targetSNR}
          </text>

          {/* Ligne SNR=30 (détection) */}
          <line
            x1={padding}
            y1={yScale(30)}
            x2={width - padding}
            y2={yScale(30)}
            stroke="#f59e0b"
            strokeDasharray="2,2"
          />
          <text
            x={width - padding + 5}
            y={yScale(30) + 4}
            className="text-xs fill-amber-500"
          >
            SNR=30
          </text>

          {/* Courbe */}
          <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth={2} />

          {/* Point cible atteint */}
          {simulation.subsToReachTarget < maxSubs && (
            <g>
              <circle
                cx={xScale(simulation.subsToReachTarget)}
                cy={yScale(targetSNR)}
                r={6}
                fill="#22c55e"
              />
              <text
                x={xScale(simulation.subsToReachTarget)}
                y={yScale(targetSNR) - 12}
                textAnchor="middle"
                className="text-xs fill-green-700"
              >
                {simulation.subsToReachTarget} subs
              </text>
            </g>
          )}

          {/* Labels axes */}
          <text
            x={width / 2}
            y={height - 8}
            textAnchor="middle"
            className="text-xs fill-gray-500"
          >
            Nombre de poses
          </text>
          <text
            x={12}
            y={height / 2}
            textAnchor="middle"
            transform={`rotate(-90, 12, ${height / 2})`}
            className="text-xs fill-gray-500"
          >
            SNR
          </text>
        </svg>
      </div>

      <div className="mt-3 text-sm text-gray-600">
        <p>
          🎯 Atteint en {simulation.subsToReachTarget} poses ({simulation.minutesToReachTarget} min)
        </p>
      </div>
    </div>
  );
};

export default SNRSimulator;
