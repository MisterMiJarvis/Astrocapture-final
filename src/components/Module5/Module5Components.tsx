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
  getKCalib,
  inferObjectType,
  ObjectType,
  K_CALIB_BY_TYPE,
} from '../../services/module5/exposureCalculator';

interface FilterSelectorProps {
  selectedFilter: FilterType;
  onChange: (filter: FilterType) => void;
  moonPhase: number;
  moonAltitude: number;
}

/**
 * Filter selector with Moon compatibility indicator.
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
      <h3 className="text-lg font-semibold">Filter</h3>
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
                  <span className="text-xs text-green-600">🌙 Moon compatible</span>
                ) : (
                  <span className="text-xs text-red-400">🚫 Moon</span>
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
 * SQM gauge with color zones.
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
      <h3 className="text-lg font-semibold mb-3">Dynamic SQM</h3>
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
            <span>17 (City)</span>
            <span>20 (Suburban)</span>
            <span>21.5 (Rural)</span>
            <span>23 (Dark)</span>
          </div>
        </div>
      </div>
      <div className="mt-3 text-sm text-gray-600 space-y-1">
        <p>Base: {sqmModel.sqmBase} mag/arcsec²</p>
        <p>Moon degradation: -{sqmModel.degradation} mag</p>
        <p>Estimated Bortle: {sqmModel.bortleScale}</p>
        <p>Moon phase: {(sqmModel.moonPhase * 100).toFixed(0)}% | Altitude: {sqmModel.moonAltitude.toFixed(0)}°</p>
        <p>Target-Moon separation: {sqmModel.targetMoonSeparation.toFixed(1)}°</p>
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
 * Exposure calculator form with physics-based pipeline.
 */
export const ExposureCalculator: React.FC<ExposureCalculatorProps> = ({
  rigProfile,
  sqmModel,
}) => {
  const [filterType, setFilterType] = useState<FilterType>('L_Ultimate');
  const [kFactor, setKFactor] = useState<5 | 10>(5);
  const [reducerFactor, setReducerFactor] = useState<number>(1.0);
  const [targetName, setTargetName] = useState<string>('');

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
      targetName: targetName || undefined,
    }),
    [rigProfile, sqmModel, filterType, kFactor, reducerFactor, targetName]
  );

  const result: ExposureResult = useMemo(() => calculateExposure(params), [params]);

  const impact: ReducerImpact | null = useMemo(() => {
    if (reducerFactor >= 1) return null;
    return calculateReducerImpact(params, reducerFactor, rigProfile.focalLength);
  }, [params, reducerFactor, rigProfile.focalLength]);

  return (
    <div className="space-y-6">
      <div className="p-4 bg-white rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">Exposure Calculator</h3>

        <FilterSelector
          selectedFilter={filterType}
          onChange={setFilterType}
          moonPhase={sqmModel.moonPhase}
          moonAltitude={sqmModel.moonAltitude}
        />

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">k Factor</label>
            <select
              value={kFactor}
              onChange={(e) => setKFactor(Number(e.target.value) as 5 | 10)}
              className="mt-1 block w-full rounded border-gray-300"
            >
              <option value={5}>k = 5 (conservative)</option>
              <option value={10}>k = 10 (aggressive)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Reducer</label>
            <select
              value={reducerFactor}
              onChange={(e) => setReducerFactor(Number(e.target.value))}
              className="mt-1 block w-full rounded border-gray-300"
            >
              <option value={1.0}>No reducer (1.0×)</option>
              <option value={0.73}>×0.73 (TS-Optics)</option>
              <option value={0.8}>×0.8</option>
              <option value={0.6}>×0.6</option>
            </select>
          </div>
        </div>

        {/* Target name — pour k_calib auto */}
        <div className="mt-4">
          <label className="block text-sm font-medium">Target name (for calibration)</label>
          <input
            type="text"
            value={targetName}
            onChange={(e) => setTargetName(e.target.value)}
            placeholder="e.g. M16, M27, M51, NGC6888..."
            className="mt-1 block w-full rounded border-gray-300 px-2 py-1"
          />
          {targetName && (() => {
            const objType = inferObjectType(targetName);
            const k = getKCalib(objType);
            return (
              <p className="mt-1 text-xs text-gray-500">
                Detected: <span className="font-medium">{objType}</span> → k_calib = <span className="font-mono">{k.toFixed(3)}</span>
              </p>
            );
          })()}
        </div>
      </div>

      {/* Result */}
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-blue-900">Result — Pipeline v9</h4>
        <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-blue-700">Optimal sub-exposure</p>
            <p className="text-2xl font-bold text-blue-900">
              {result.subExposureTime}s
            </p>
          </div>
          <div>
            <p className="text-sm text-blue-700">B_sky (sky background)</p>
            <p className="text-xl font-bold text-blue-900">
              {result.bSky.toFixed(2)} e⁻/px/s
            </p>
          </div>
          <div>
            <p className="text-sm text-blue-700">S_obj (object signal)</p>
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
            <p className="text-sm text-blue-700">SNR per sub</p>
            <p className="text-xl font-bold text-blue-900">
              {result.snrPerSub.toFixed(1)}
            </p>
          </div>
          <div>
            <p className="text-sm text-blue-700">Contrast (S/B)</p>
            <p className="text-xl font-bold text-blue-900">
              {result.contrast.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-blue-700">Required subs</p>
            <p className="text-xl font-bold text-blue-900">
              {result.totalSubsForSNR} subs
            </p>
          </div>
          <div>
            <p className="text-sm text-blue-700">Total integration</p>
            <p className="text-xl font-bold text-blue-900">
              {result.totalIntegrationHours.toFixed(1)}h
            </p>
          </div>
          <div>
            <p className="text-sm text-blue-700">Effective target SNR</p>
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

      {/* Reducer impact */}
      {impact && (
        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
          <h4 className="font-semibold text-purple-900">Reducer Impact</h4>
          <div className="mt-2 grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-purple-700">Without reducer</p>
              <p className="text-xl font-bold">{impact.withoutReducer.subExposureTime}s</p>
            </div>
            <div>
              <p className="text-sm text-purple-700">With reducer</p>
              <p className="text-xl font-bold">{impact.withReducer.subExposureTime}s</p>
            </div>
            <div>
              <p className="text-sm text-purple-700">Time saved</p>
              <p className="text-xl font-bold text-green-700">-{impact.timeSavedPercent}%</p>
            </div>
          </div>
          <p className="mt-2 text-sm text-purple-800">
            Your reducer divides exposure time by {impact.ratio.toFixed(2)}×
          </p>
        </div>
      )}

      {/* Calibration info panel */}
      <CalibrationInfoPanel />
    </div>
  );
};

// ============================================================================
// CALIBRATION INFO PANEL — k_calib par type d'objet
// ============================================================================

const CALIB_ROWS = [
  { type: 'Diffuse nebula', key: 'diffuse_nebula' as ObjectType, k: K_CALIB_BY_TYPE.diffuse_nebula, n: 5, note: 'M16=0.99 (reference). Reliable if uniform SB.' },
  { type: 'Planetary nebula', key: 'planetary_nebula' as ObjectType, k: K_CALIB_BY_TYPE.planetary_nebula, n: 2, note: 'Pipeline over-estimates (bright core vs faint halo).' },
  { type: 'Galaxy', key: 'galaxy' as ObjectType, k: K_CALIB_BY_TYPE.galaxy, n: 2, note: 'Pipeline under-estimates (core captured).' },
  { type: 'Stellar cluster', key: 'stellar' as ObjectType, k: K_CALIB_BY_TYPE.stellar, n: 1, note: 'Not enough data.' },
];

const CalibrationInfoPanel: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="p-4 bg-gray-50 rounded-lg border">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">🔬 SNR Calibration — k_calib by object type</h3>
        <span className="text-gray-400">{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        >
        <p className="text-xs text-gray-500 mt-2 mb-3">
          Coefficients measured by aperture photometry on 10 master FITS sessions (2026-06-29).
          Applied to S_obj (object signal) in the SNR calculation. Refined as new sessions are added.
        </p>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b">
              <th className="text-left py-1">Object type</th>
              <th className="text-right">k_calib</th>
              <th className="text-right">Sessions</th>
              <th className="text-left pl-3">Note</th>
            </tr>
          </thead>
          <tbody>
            {CALIB_ROWS.map((r) => (
              <tr key={r.key} className="border-b border-gray-200">
                <td className="py-1 font-medium">{r.type}</td>
                <td className="text-right font-mono">{r.k.toFixed(3)}</td>
                <td className="text-right text-gray-400">{r.n}</td>
                <td className="text-left pl-3 text-gray-400">{r.note}</td>
              </tr>
            ))}
            <tr className="border-b border-gray-200">
              <td className="py-1 font-medium">Unknown</td>
              <td className="text-right font-mono">1.000</td>
              <td className="text-right text-gray-400">—</td>
              <td className="text-left pl-3 text-gray-400">No correction</td>
            </tr>
          </tbody>
        </table>
        <div className="mt-2 text-xs text-gray-400">
          <p>Method: astropy aperture photometry on 16-bit non-normalized master FITS. Adaptive aperture based on target diameter.</p>
          <p>Script: astro-calibration/run-calibration.py</p>
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
 * Reducer impact comparison chart.
 * Simple SVG bar chart.
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
      focalLength: 500 * factor,
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
      <h4 className="font-semibold">Reducer Impact — Exposure Time</h4>
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
        Reference: 500mm focal length, standard sensor. B_sky increases as F decreases.
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
 * SNR vs sub count simulator.
 * Simple SVG curve.
 */
export const SNRSimulator: React.FC<SNRSimulatorProps> = ({
  rigProfile,
  sqmModel,
  filterType,
}) => {
  const [targetSNR, setTargetSNR] = useState(100);
  const [maxSubs, setMaxSubs] = useState(100);
  const [subDuration, setSubDuration] = useState(180);

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
      <h4 className="font-semibold">SNR Simulator</h4>

      <div className="mt-3 grid grid-cols-3 gap-4">
        <div>
          <label className="text-sm">Target SNR</label>
          <input
            type="number"
            value={targetSNR}
            onChange={(e) => setTargetSNR(Number(e.target.value))}
            className="block w-full rounded border-gray-300"
          />
        </div>
        <div>
          <label className="text-sm">Max subs</label>
          <input
            type="number"
            value={maxSubs}
            onChange={(e) => setMaxSubs(Number(e.target.value))}
            className="block w-full rounded border-gray-300"
          />
        </div>
        <div>
          <label className="text-sm">Sub duration (s)</label>
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

          {/* Target SNR line */}
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

          {/* SNR=30 (detection) line */}
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

          {/* Curve */}
          <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth={2} />

          {/* Target reached point */}
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

          {/* Axis labels */}
          <text
            x={width / 2}
            y={height - 8}
            textAnchor="middle"
            className="text-xs fill-gray-500"
          >
            Number of subs
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
          🎯 Reached in {simulation.subsToReachTarget} subs ({simulation.minutesToReachTarget} min)
        </p>
      </div>
    </div>
  );
};

export default SNRSimulator;