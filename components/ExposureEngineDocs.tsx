import React, { useState } from 'react';
import { FilterType, FILTER_PROFILES, calculateExposure, getKCalib, inferObjectType, K_CALIB_BY_TYPE, ObjectType } from '../src/services/module5/exposureCalculator';
import { ExposureParams, ExposureResult } from '../src/types/module5';

const RIG_PRESETS = {
  'RedCat51_ASI533MC': {
    label: 'RedCat 51 + ASI533MC',
    aperture: 51, focalLength: 250, pixelSize: 3.76,
    quantumEfficiency: 0.80, readNoise: 1.5, darkCurrent: 0.0005,
  },
  'FSQ106_ASI2600': {
    label: 'FSQ-106N + ASI2600MC',
    aperture: 106, focalLength: 530, pixelSize: 3.76,
    quantumEfficiency: 0.82, readNoise: 1.0, darkCurrent: 0.0003,
  },
  'EdgeHD8_ASI6200': {
    label: 'EdgeHD 8" + ASI6200MC',
    aperture: 203, focalLength: 2032, pixelSize: 3.76,
    quantumEfficiency: 0.85, readNoise: 1.3, darkCurrent: 0.0004,
  },
};

const EXAMPLE_TARGETS = [
  { name: 'M42 Orion Nebula', sb: 14.0, diameter: 65, isEmission: true, filter: 'Ha' as FilterType },
  { name: 'M31 Andromeda', sb: 22.0, diameter: 180, isEmission: false, filter: 'UV_IR_Cut' as FilterType },
  { name: 'M27 Dumbbell', sb: 13.5, diameter: 8, isEmission: true, filter: 'OIII' as FilterType },
  { name: 'M51 Whirlpool', sb: 21.0, diameter: 11, isEmission: false, filter: 'UV_IR_Cut' as FilterType },
  { name: 'NGC6960 Western Veil', sb: 18.0, diameter: 70, isEmission: true, filter: 'Ha' as FilterType },
];

const ExposureEngineDocs: React.FC = () => {
  const [activeView, setActiveView] = useState<'docs' | 'calculator'>('calculator');

  return (
    <div className="space-y-6">
      {/* Toggle */}
      <div className="flex gap-2 bg-surface-secondary rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveView('calculator')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeView === 'calculator' ? 'bg-surface text-text shadow-sm' : 'text-text-secondary hover:text-text'}`}
        >
          🧮 Interactive Calculator
        </button>
        <button
          onClick={() => setActiveView('docs')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeView === 'docs' ? 'bg-surface text-text shadow-sm' : 'text-text-secondary hover:text-text'}`}
        >
          📖 Documentation
        </button>
      </div>

      {activeView === 'docs' ? <DocsView /> : <CalculatorView />}
    </div>
  );
};

const DocsView: React.FC = () => (
  <div className="prose prose-invert max-w-none space-y-8">
    {/* Header */}
    <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-700/30 rounded-xl p-6">
      <h1 className="text-2xl font-bold text-text mb-2">🔭 Exposure Engine v9</h1>
      <p className="text-text-secondary text-sm">
        Physics-based exposure calculation pipeline — 6 steps, SkyTools-calibrated, 8/10 within 3x for N_subs.
      </p>
    </div>

    {/* Pipeline overview */}
    <section className="bg-surface border border-border rounded-xl p-6">
      <h2 className="text-lg font-bold text-text mb-4">📋 6-Step Pipeline</h2>
      <div className="space-y-4">
        {[
          { n: 1, title: 'Effective SQM', formula: 'sqmEff = sqmBase - max(0, moonPhase × sin(alt) × proxFactor)', desc: 'Sky background degradation by the Moon (altitude, phase, target proximity)' },
          { n: 2, title: 'Optical Sampling', formula: 's = (206.265 × p) / (F × fR) | A = π × (D/2000)²', desc: 'Effective focal length with reducer, arcsec/pixel sampling, collecting area' },
          { n: 3, title: 'Sky Flux (B_sky)', formula: 'B_sky = 10^(0.4×(26.59-sqmEff)) × A × s² × QE × τ_eff', desc: 'Sky background electron rate per pixel per second' },
          { n: 4, title: 'Optimal Sub-Exposure', formula: 't_opt = k_dyn × RN² / B_sky → clamp 30-600s', desc: 'k=2.5 (narrowband) or 5.0 (broadband), intelligent clamping (configurable in v9)' },
          { n: 5, title: 'Object Signal & SNR', formula: 'S_obj = Φ_obj × A × s² × QE × τ_obj × k_calib | SNR_sub = (S_obj × t_sub) / √((S_obj+B_sky+dc)×t_sub + RN²)', desc: 'Object signal with continuumTransmission and empirical k_calib correction by object type. Total noise including dark current. Dark current warning if dc×t_sub &gt; 0.1×RN²' },
          { n: 6, title: 'Target SNR & N_subs', formula: 'N = max(minSubs, ⌈(effTarget/SNR_sub)²⌉)', desc: 'Fixed SNR target by type, sizeWeighting capped 0.5-5.0, floor 15-20 subs. Mission impossible warning if total &gt; 15h' },
        ].map(s => (
          <div key={s.n} className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">{s.n}</div>
            <div className="flex-1">
              <h3 className="font-semibold text-text text-sm">{s.title}</h3>
              <code className="block mt-1 text-xs bg-background/50 rounded p-2 text-blue-300 font-mono overflow-x-auto">{s.formula}</code>
              <p className="text-xs text-text-secondary mt-1">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>

    {/* SNR Calibration — k_calib section */}
    <section className="bg-surface border border-border rounded-xl p-6">
      <h2 className="text-lg font-bold text-text mb-3">🔬 SNR Calibration — k_calib by Object Type</h2>
      <p className="text-sm text-text-secondary mb-4">
        Empirical calibration coefficients measured by aperture photometry on 10 master FITS sessions (2026-06-29).
        The pipeline computes S_obj from surface brightness, but real objects have non-uniform brightness profiles
        (bright cores vs faint halos for planetary nebulae, spiral arms for galaxies). The k_calib coefficient
        corrects this systematic bias, applied as: S_obj_corrected = S_obj × k_calib.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-text-secondary text-xs uppercase">
              <th className="text-left py-2 px-3">Object Type</th>
              <th className="text-right py-2 px-3">k_calib</th>
              <th className="text-right py-2 px-3">Sessions</th>
              <th className="text-right py-2 px-3">Range</th>
              <th className="text-left py-2 px-3">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {[
              ['Diffuse nebula', '0.223', '5', '0.049–0.988', 'M16=0.99 (reference). Reliable for uniform SB. Pipeline over-estimates signal for faint extended nebulae (NGC7380, IC1396).'],
              ['Planetary nebula', '0.019', '2', '0.017–0.021', 'M27. Pipeline massively over-estimates: bright core dominates but aperture captures faint halo too. Needs radial SB profile.'],
              ['Galaxy', '2.572', '2', '0.687–4.457', 'M51/M63. Pipeline under-estimates: aperture captures bright core. M51 core is much brighter than average SB suggests.'],
              ['Stellar cluster', '2.905', '1', '—', 'c4. Not enough data. Point sources follow different physics.'],
              ['Unknown', '1.000', '—', '—', 'No correction applied. Used when object type cannot be determined.'],
            ].map(([type, k, n, range, notes]) => (
              <tr key={type} className="hover:bg-surface-secondary/50">
                <td className="py-2 px-3 text-text font-medium">{type}</td>
                <td className="py-2 px-3 text-right font-mono text-blue-300">{k}</td>
                <td className="py-2 px-3 text-right text-text-secondary">{n}</td>
                <td className="py-2 px-3 text-right text-text-secondary font-mono text-xs">{range}</td>
                <td className="py-2 px-3 text-text-secondary text-xs">{notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 space-y-2 text-sm text-text-secondary">
        <p><strong className="text-text">Method:</strong> Astropy aperture photometry on 16-bit non-normalized master FITS. Adaptive aperture sized to target diameter (TARGETS_DIAM). Sky annulus for local background. SNR_measured = integrated_signal / √(signal + n_pix × σ_sky²).</p>
        <p><strong className="text-text">Ratio:</strong> k_calib = median(SNR_measured / SNR_predicted) across sessions of the same object type. The Interactive Calculator auto-detects object type from target name and applies the corresponding k_calib.</p>
        <p><strong className="text-text">Limitations:</strong> High variance within types (e.g. diffuse nebulae range 0.05–0.99). Surface brightness is non-uniform within objects. A single k_calib per type is a first-order correction. Future: radial SB profiles or per-object calibration.</p>
        <p><strong className="text-text">Refinement:</strong> Coefficients updated as new master FITS sessions are added. Script: <code className="text-blue-300">astro-calibration/run-calibration.py</code></p>
      </div>
    </section>

    {/* Known limitations */}
    <section className="bg-yellow-900/10 border border-yellow-700/30 rounded-xl p-6">
      <h2 className="text-lg font-bold text-yellow-300 mb-3">⚠️ Known Limitations</h2>
      <div className="space-y-2 text-sm text-text-secondary">
        <p><strong>M_ZERO = 26.59</strong> — AB V-band zeropoint (~0.3–0.8 mag uncertainty). The night sky spectrum (OH lines, sodium, LED) and emission nebulae (Hα ~0.6nm) differ from a flat-frequency reference. Errors partially cancel in differential (SB_obj and B_sky use the same constant). Shared by all market tools — documented per Claude AI review 25/06/2026.</p>
        <p><strong>Dark current</strong> — Default 0.0005 e⁻/px/s assumes a cooled sensor (ASI2600/IMX571). Uncooled sensors in summer can reach 0.01–0.05. Warning triggered when dc × t_sub &gt; 0.1 × RN².</p>
        <p><strong>Clamping</strong> — Default 30-600s (narrowband) / 60-300s (broadband). Configurable via clampMin/clampMax params since v9.</p>
      </div>
    </section>

    {/* Parameters */}
    <section className="bg-surface border border-border rounded-xl p-6">
      <h2 className="text-lg font-bold text-text mb-4">⚙️ Input Parameters</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-text-secondary text-xs uppercase">
              <th className="text-left py-2 px-3">Parameter</th>
              <th className="text-left py-2 px-3">Symbol</th>
              <th className="text-left py-2 px-3">Source</th>
              <th className="text-left py-2 px-3">Default</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {[
              ['Aperture', 'D', 'Telescopius API', '51mm'],
              ['Focal length', 'F', 'Telescopius API', '250mm'],
              ['Reducer', 'fR', 'User choice', '1.0'],
              ['Pixel size', 'p', 'Sensor specs', '3.76µm'],
              ['Read noise', 'RN', 'Sensor specs', '1.5 e⁻'],
              ['Dark current', 'dc', 'Sensor specs', '0.0005 e⁻/px/s'],
              ['Quantum efficiency', 'QE', 'Sensor specs', '0.80'],
              ['k factor', 'k', 'Dynamic (auto)', '2.5 or 5.0'],
              ['SQM base', 'sqmBase', 'Site (Bortle)', '21.0'],
              ['Moon phase', 'moonPhaseFactor', 'Ephemeris', '0-3.5'],
              ['Moon altitude', 'moonAltitudeDeg', 'Ephemeris', 'degrees'],
              ['Moon separation', 'moonSeparationDeg', 'Trigonometry', 'degrees'],
              ['Object SB', 'SB_obj', 'Telescopius API', 'mag/arcsec²'],
              ['Object diameter', '—', 'Telescopius API', 'arcmin'],
              ['Object type', '—', 'Category', 'emission/continuum'],
              ['k_calib', 'k_calib', 'Empirical (auto)', '0.019–2.905'],
            ].map(([p, s, src, def]) => (
              <tr key={p} className="hover:bg-surface-secondary/50">
                <td className="py-2 px-3 text-text">{p}</td>
                <td className="py-2 px-3 text-blue-300 font-mono text-xs">{s}</td>
                <td className="py-2 px-3 text-text-secondary text-xs">{src}</td>
                <td className="py-2 px-3 text-text-secondary text-xs font-mono">{def}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>

    {/* Filter profiles */}
    <section className="bg-surface border border-border rounded-xl p-6">
      <h2 className="text-lg font-bold text-text mb-4">🔲 Filter Profiles</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-text-secondary text-xs uppercase">
              <th className="text-left py-2 px-3">Filter</th>
              <th className="text-left py-2 px-3">Bandwidth</th>
              <th className="text-left py-2 px-3">τ (peak)</th>
              <th className="text-left py-2 px-3">skySuppression</th>
              <th className="text-left py-2 px-3">continuumT</th>
              <th className="text-left py-2 px-3">Moon</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {(Object.keys(FILTER_PROFILES) as FilterType[]).map(t => {
              const f = FILTER_PROFILES[t];
              return (
                <tr key={t} className="hover:bg-surface-secondary/50">
                  <td className="py-2 px-3 text-text font-medium">{f.name}</td>
                  <td className="py-2 px-3 text-text-secondary font-mono text-xs">{f.bandwidthNm}nm</td>
                  <td className="py-2 px-3 text-blue-300 font-mono text-xs">{f.transmission}</td>
                  <td className="py-2 px-3 text-orange-300 font-mono text-xs">{f.skySuppression}</td>
                  <td className="py-2 px-3 text-green-300 font-mono text-xs">{f.continuumTransmission}</td>
                  <td className="py-2 px-3 text-xs">{f.moonCompatible ? '✅' : '❌'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-text-secondary mt-3">
        <strong>continuumTransmission</strong>: fraction of the continuous spectrum that passes through the filter. Emission nebulae (Hα, OIII) are unaffected — only τ_filter applies. Galaxies (continuum) are affected by τ_filter × continuumTransmission.
      </p>
    </section>

    {/* SNR targets */}
    <section className="bg-surface border border-border rounded-xl p-6">
      <h2 className="text-lg font-bold text-text mb-4">🎯 SNR Targets</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-4">
          <h3 className="font-semibold text-red-300 text-sm">Narrowband + Emission</h3>
          <p className="text-2xl font-bold text-text mt-1">SNR = 250</p>
          <p className="text-xs text-text-secondary mt-1">Hα, OIII, SII (≤12nm)</p>
          <p className="text-xs text-text-secondary">Isolate fine signal in faint extensions</p>
        </div>
        <div className="bg-purple-900/20 border border-purple-700/30 rounded-lg p-4">
          <h3 className="font-semibold text-purple-300 text-sm">Broadband + Emission</h3>
          <p className="text-2xl font-bold text-text mt-1">SNR = 150</p>
          <p className="text-xs text-text-secondary mt-1">L-Ultimate, LPS-D2 (&gt;12nm)</p>
          <p className="text-xs text-text-secondary">Dual-band large, anti-pollution</p>
        </div>
        <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
          <h3 className="font-semibold text-blue-300 text-sm">Continuum (Galaxies)</h3>
          <p className="text-2xl font-bold text-text mt-1">SNR = 100</p>
          <p className="text-xs text-text-secondary mt-1">UV/IR Cut, RGB, Luminance</p>
          <p className="text-xs text-text-secondary">Continuous spectrum, galaxies/clusters</p>
        </div>
      </div>
      <div className="mt-4 text-xs text-text-secondary space-y-1">
        <p><strong>sizeWeighting</strong> = √(diameter_px / 100), capped between 0.5 and 5.0</p>
        <p><strong>effectiveTargetSNR</strong> = target_SNR / sizeWeighting</p>
        <p><strong>Sub floor</strong>: 20 (broadband) / 15 (narrowband) — anti-cosmics, satellites, sigma-clipping</p>
        <p><strong>Mission impossible</strong>: warning if total integration &gt; 15h</p>
      </div>
    </section>

    {/* Calibration results */}
    <section className="bg-surface border border-border rounded-xl p-6">
      <h2 className="text-lg font-bold text-text mb-4">📊 SkyTools Calibration</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="text-center">
          <p className="text-3xl font-bold text-green-400">9/10</p>
          <p className="text-xs text-text-secondary">t_sub within 3x</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-green-400">8/10</p>
          <p className="text-xs text-text-secondary">N_subs within 3x</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-blue-400">0.50</p>
          <p className="text-xs text-text-secondary">Median ratio t_sub</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-blue-400">0.50</p>
          <p className="text-xs text-text-secondary">Median ratio N_subs</p>
        </div>
      </div>
      <p className="text-xs text-text-secondary">
        Calibrated on 10 reference targets (M42, M27, M31, M51, Veil, etc.) with RedCat 51 + ASI533MC, Bortle 2-4, with/without Moon.
      </p>
    </section>
  </div>
);

const CalculatorView: React.FC = () => {
  const [rigKey, setRigKey] = useState<keyof typeof RIG_PRESETS>('RedCat51_ASI533MC');
  const [targetIdx, setTargetIdx] = useState(0);
  const [sqm, setSqm] = useState(21.0);
  const [kFactor, setKFactor] = useState(5);
  const [reducer, setReducer] = useState(1.0);
  const [moonAlt, setMoonAlt] = useState(0);
  const [moonPhase, setMoonPhase] = useState(0);
  const [moonSep, setMoonSep] = useState(180);

  const rig = RIG_PRESETS[rigKey];
  const target = EXAMPLE_TARGETS[targetIdx];
  const filterProfile = FILTER_PROFILES[target.filter];

  const params: ExposureParams = {
    aperture: rig.aperture,
    focalLength: rig.focalLength,
    reducerFactor: reducer,
    pixelSize: rig.pixelSize,
    readNoise: rig.readNoise,
    darkCurrent: rig.darkCurrent,
    quantumEfficiency: rig.quantumEfficiency,
    kFactor,
    skyMagnitude: sqm,
    moonAltitudeDeg: moonAlt,
    moonPhaseFactor: moonPhase,
    moonSeparationDeg: moonSep,
    filterTransmission: filterProfile.transmission,
    skySuppression: filterProfile.skySuppression,
    objectSurfaceBrightness: target.sb,
    objectDiameterArcmin: target.diameter,
    isEmissionNebula: target.isEmission,
    targetName: target.name,
  };

  const result: ExposureResult = calculateExposure(params);

  return (
    <div className="space-y-4">
      {/* Inputs */}
      <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-text">🧮 Interactive Calculator</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-text-secondary uppercase font-semibold">Equipment</label>
            <select value={rigKey} onChange={e => setRigKey(e.target.value as keyof typeof RIG_PRESETS)} className="mt-1 block w-full bg-background border border-border rounded-lg p-2 text-sm text-text">
              {Object.entries(RIG_PRESETS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-text-secondary uppercase font-semibold">Target</label>
            <select value={targetIdx} onChange={e => setTargetIdx(Number(e.target.value))} className="mt-1 block w-full bg-background border border-border rounded-lg p-2 text-sm text-text">
              {EXAMPLE_TARGETS.map((t, i) => <option key={i} value={i}>{t.name}</option>)}
            </select>
            {(() => {
              const objType = inferObjectType(target.name);
              const k = getKCalib(objType);
              return (
                <p className="mt-1 text-xs text-text-secondary">
                  Type: <span className="font-medium text-text">{objType}</span> → k_calib = <span className="font-mono text-blue-300">{k.toFixed(3)}</span>
                </p>
              );
            })()}
          </div>
          <div>
            <label className="text-xs text-text-secondary uppercase font-semibold">Reducer</label>
            <select value={reducer} onChange={e => setReducer(Number(e.target.value))} className="mt-1 block w-full bg-background border border-border rounded-lg p-2 text-sm text-text">
              <option value={1.0}>None (1.0×)</option>
              <option value={0.73}>×0.73</option>
              <option value={0.8}>×0.8</option>
              <option value={0.6}>×0.6</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="text-xs text-text-secondary">SQM base</label>
            <input type="number" step="0.1" value={sqm} onChange={e => setSqm(Number(e.target.value))} className="mt-1 w-full bg-background border border-border rounded-lg p-2 text-sm text-text" />
          </div>
          <div>
            <label className="text-xs text-text-secondary">k factor</label>
            <select value={kFactor} onChange={e => setKFactor(Number(e.target.value))} className="mt-1 w-full bg-background border border-border rounded-lg p-2 text-sm text-text">
              <option value={5}>5 (conservative)</option>
              <option value={10}>10 (aggressive)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-text-secondary">Moon altitude°</label>
            <input type="number" value={moonAlt} onChange={e => setMoonAlt(Number(e.target.value))} className="mt-1 w-full bg-background border border-border rounded-lg p-2 text-sm text-text" />
          </div>
          <div>
            <label className="text-xs text-text-secondary">Moon phase (0-3.5)</label>
            <input type="number" step="0.1" value={moonPhase} onChange={e => setMoonPhase(Number(e.target.value))} className="mt-1 w-full bg-background border border-border rounded-lg p-2 text-sm text-text" />
          </div>
          <div>
            <label className="text-xs text-text-secondary">Separation°</label>
            <input type="number" value={moonSep} onChange={e => setMoonSep(Number(e.target.value))} className="mt-1 w-full bg-background border border-border rounded-lg p-2 text-sm text-text" />
          </div>
        </div>
      </div>

      {/* Intermediate results */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold text-text mb-3">Intermediate Variables</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          {[
            ['Effective SQM', `${result.sqmEffective.toFixed(2)} mag/arcsec²`],
            ['Sampling', `${result.sampling.toFixed(2)} "/px`],
            ['B_sky', `${result.bSky.toFixed(4)} e⁻/px/s`],
            ['S_obj', `${result.sObj.toFixed(4)} e⁻/px/s`],
            ['k dynamic', `${result.kDynamic}`],
            ['t_opt raw', `${result.tOptimumRaw.toFixed(1)}s`],
            ['SNR/sub', `${result.snrPerSub.toFixed(2)}`],
            ['Contrast', `${result.contrast.toFixed(3)}`],
          ].map(([label, val]) => (
            <div key={label} className="bg-background/50 rounded-lg p-2">
              <p className="text-xs text-text-secondary">{label}</p>
              <p className="font-mono text-blue-300 text-sm">{val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Final results */}
      <div className="bg-gradient-to-r from-blue-900/30 to-green-900/20 border border-blue-700/30 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-text mb-4">Final Result</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-xs text-text-secondary uppercase">Sub-exposure</p>
            <p className="text-3xl font-bold text-blue-300">{result.subExposureTime}s</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-text-secondary uppercase">Sub count</p>
            <p className="text-3xl font-bold text-green-300">{result.totalSubsForSNR}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-text-secondary uppercase">Integration</p>
            <p className="text-3xl font-bold text-text">{result.totalIntegrationHours.toFixed(2)}h</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-text-secondary uppercase">Swamping</p>
            <p className="text-3xl font-bold text-purple-300">{result.swampingFactor.toFixed(1)}×</p>
          </div>
        </div>
        {result.recommendation && (
          <p className="mt-4 text-sm text-text-secondary">💡 {result.recommendation}</p>
        )}
        {result.warning && (
          <div className="mt-2 p-2 bg-red-900/20 border border-red-700/30 rounded">
            <p className="text-sm text-red-400">⚠️ {result.warning}</p>
          </div>
        )}
      </div>

      {/* Target SNR breakdown */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold text-text mb-3">SNR Target Breakdown</h3>
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <span className="bg-blue-900/40 px-3 py-1 rounded-lg text-blue-300">target_SNR: {result.targetSNR}</span>
          <span className="text-text-secondary">÷</span>
          <span className="bg-purple-900/40 px-3 py-1 rounded-lg text-purple-300">sizeWeighting: {result.sizeWeighting}</span>
          <span className="text-text-secondary">=</span>
          <span className="bg-green-900/40 px-3 py-1 rounded-lg text-green-300">effectiveTarget: {result.effectiveTargetSNR.toFixed(1)}</span>
        </div>
        <p className="text-xs text-text-secondary mt-2">
          Filter: {filterProfile.name} ({filterProfile.bandwidthNm}nm) | Type: {target.isEmission ? 'Emission' : 'Continuum'}
        </p>
      </div>

      {/* Calibration info panel */}
      <CalibrationInfoPanel />
    </div>
  );
};

// Calibration Info Panel — k_calib by object type
const CALIB_ROWS = [
  { type: 'Diffuse nebula', key: 'diffuse_nebula' as ObjectType, k: K_CALIB_BY_TYPE.diffuse_nebula, n: 5, note: 'M16=0.99 (reference)' },
  { type: 'Planetary nebula', key: 'planetary_nebula' as ObjectType, k: K_CALIB_BY_TYPE.planetary_nebula, n: 2, note: 'Over-estimates (core vs halo)' },
  { type: 'Galaxy', key: 'galaxy' as ObjectType, k: K_CALIB_BY_TYPE.galaxy, n: 2, note: 'Under-estimates (core captured)' },
  { type: 'Stellar cluster', key: 'stellar' as ObjectType, k: K_CALIB_BY_TYPE.stellar, n: 1, note: 'Not enough data' },
];

const CalibrationInfoPanel: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text">🔬 SNR Calibration — k_calib by object type</h3>
        <span className="text-text-secondary">{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <>
        <p className="text-xs text-text-secondary mt-2 mb-3">
          Coefficients measured by aperture photometry on 10 master FITS sessions (2026-06-29). Applied to S_obj in SNR calculation. Refined as new sessions are added.
        </p>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-text-secondary uppercase">
              <th className="text-left py-1 px-2">Object type</th>
              <th className="text-right px-2">k_calib</th>
              <th className="text-right px-2">Sessions</th>
              <th className="text-left px-2">Note</th>
            </tr>
          </thead>
          <tbody>
            {CALIB_ROWS.map(r => (
              <tr key={r.key} className="border-b border-border/50">
                <td className="py-1 px-2 text-text font-medium">{r.type}</td>
                <td className="py-1 px-2 text-right font-mono text-blue-300">{r.k.toFixed(3)}</td>
                <td className="py-1 px-2 text-right text-text-secondary">{r.n}</td>
                <td className="py-1 px-2 text-text-secondary">{r.note}</td>
              </tr>
            ))}
            <tr className="border-b border-border/50">
              <td className="py-1 px-2 text-text font-medium">Unknown</td>
              <td className="py-1 px-2 text-right font-mono text-blue-300">1.000</td>
              <td className="py-1 px-2 text-right text-text-secondary">—</td>
              <td className="py-1 px-2 text-text-secondary">No correction</td>
            </tr>
          </tbody>
        </table>
        <p className="text-xs text-text-secondary mt-2">Method: astropy aperture photometry on 16-bit non-normalized master FITS. Adaptive aperture based on target diameter.</p>
        </>
      )}
    </div>
  );
};

export default ExposureEngineDocs;