import React, { useState } from 'react';
import { FilterType, FILTER_PROFILES, calculateExposure } from '../src/services/module5/exposureCalculator';
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
  const [activeView, setActiveView] = useState<'docs' | 'calculator'>('docs');

  return (
    <div className="space-y-6">
      {/* Toggle */}
      <div className="flex gap-2 bg-surface-secondary rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveView('docs')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeView === 'docs' ? 'bg-surface text-text shadow-sm' : 'text-text-secondary hover:text-text'}`}
        >
          📖 Documentation
        </button>
        <button
          onClick={() => setActiveView('calculator')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeView === 'calculator' ? 'bg-surface text-text shadow-sm' : 'text-text-secondary hover:text-text'}`}
        >
          🧮 Interactive Calculator
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
      <h1 className="text-2xl font-bold text-text mb-2">🔭 Exposure Engine v8</h1>
      <p className="text-text-secondary text-sm">
        Pipeline physique de calcul d'exposition — 6 étapes, calibration SkyTools, 8/10 dans 3x pour N_subs.
      </p>
    </div>

    {/* Pipeline overview */}
    <section className="bg-surface border border-border rounded-xl p-6">
      <h2 className="text-lg font-bold text-text mb-4">📋 Pipeline en 6 étapes</h2>
      <div className="space-y-4">
        {[
          { n: 1, title: 'SQM Effectif', formula: 'sqmEff = sqmBase - max(0, moonPhase × sin(alt) × proxFactor)', desc: 'Dégradation du fond de ciel par la Lune (altitude, phase, proximité cible)' },
          { n: 2, title: 'Échantillonnage', formula: 's = (206.265 × p) / (F × fR) | A = π × (D/2000)²', desc: 'Focale effective avec réducteur, sampling arcsec/px, surface collectrice' },
          { n: 3, title: 'Flux du ciel (B_sky)', formula: 'B_sky = 10^(0.4×(26.59-sqmEff)) × A × s² × QE × τ_eff', desc: 'Taux d\'électrons du fond de ciel par pixel/seconde' },
          { n: 4, title: 'Temps de pose optimal', formula: 't_opt = k_dyn × RN² / B_sky → clamp 30-600s', desc: 'k=2.5 (narrowband) ou 5.0 (broadband), clamping intelligent' },
          { n: 5, title: 'Signal objet & SNR', formula: 'SNR_sub = (S_obj × t_sub) / √((S_obj+B_sky+dc)×t_sub + RN²)', desc: 'Signal objet avec continuumTransmission, bruit total incluant dark current' },
          { n: 6, title: 'SNR cible & N_subs', formula: 'N = max(minSubs, ⌈(effTarget/SNR_sub)²⌉)', desc: 'SNR target fixe par type, sizeWeighting capé 0.5-5.0, plancher 15-20 poses' },
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

    {/* Parameters */}
    <section className="bg-surface border border-border rounded-xl p-6">
      <h2 className="text-lg font-bold text-text mb-4">⚙️ Paramètres d'entrée</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-text-secondary text-xs uppercase">
              <th className="text-left py-2 px-3">Paramètre</th>
              <th className="text-left py-2 px-3">Symbole</th>
              <th className="text-left py-2 px-3">Source</th>
              <th className="text-left py-2 px-3">Défaut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {[
              ['Diamètre', 'D', 'Télescopius API', '51mm'],
              ['Focale', 'F', 'Télescopius API', '250mm'],
              ['Réducteur', 'fR', 'User choice', '1.0'],
              ['Pixel size', 'p', 'Specs capteur', '3.76µm'],
              ['Read noise', 'RN', 'Specs capteur', '1.5 e⁻'],
              ['Dark current', 'dc', 'Specs capteur', '0.0005 e⁻/px/s'],
              ['Quantum efficiency', 'QE', 'Specs capteur', '0.80'],
              ['k factor', 'k', 'Dynamique (auto)', '2.5 ou 5.0'],
              ['SQM base', 'sqmBase', 'Site (Bortle)', '21.0'],
              ['Phase Lune', 'moonPhaseFactor', 'Éphémérides', '0-3.5'],
              ['Altitude Lune', 'moonAltitudeDeg', 'Éphémérides', 'degrés'],
              ['Séparation Lune', 'moonSeparationDeg', 'Trigonométrie', 'degrés'],
              ['SB objet', 'SB_obj', 'Telescopius API', 'mag/arcsec²'],
              ['Diamètre objet', '—', 'Telescopius API', 'arcmin'],
              ['Type objet', '—', 'Catégorie', 'émission/continuum'],
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
      <h2 className="text-lg font-bold text-text mb-4">🔲 Profils de filtres</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-text-secondary text-xs uppercase">
              <th className="text-left py-2 px-3">Filtre</th>
              <th className="text-left py-2 px-3">Bandwidth</th>
              <th className="text-left py-2 px-3">τ (pic)</th>
              <th className="text-left py-2 px-3">skySuppression</th>
              <th className="text-left py-2 px-3">continuumT</th>
              <th className="text-left py-2 px-3">Lune</th>
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
        <strong>continuumTransmission</strong> : fraction du spectre continu qui traverse le filtre. Les nébuleuses en émission (Hα, OIII) ne sont pas affectées — seul τ_filter s'applique. Les galaxies (continuum) sont affectées par τ_filter × continuumTransmission.
      </p>
    </section>

    {/* SNR targets */}
    <section className="bg-surface border border-border rounded-xl p-6">
      <h2 className="text-lg font-bold text-text mb-4">🎯 SNR Cibles Métier</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-4">
          <h3 className="font-semibold text-red-300 text-sm">Narrowband + Émission</h3>
          <p className="text-2xl font-bold text-text mt-1">SNR = 250</p>
          <p className="text-xs text-text-secondary mt-1">Hα, OIII, SII (≤12nm)</p>
          <p className="text-xs text-text-secondary">Isoler le signal fin des extensions</p>
        </div>
        <div className="bg-purple-900/20 border border-purple-700/30 rounded-lg p-4">
          <h3 className="font-semibold text-purple-300 text-sm">Broadband + Émission</h3>
          <p className="text-2xl font-bold text-text mt-1">SNR = 150</p>
          <p className="text-xs text-text-secondary mt-1">L-Ultimate, LPS-D2 (&gt;12nm)</p>
          <p className="text-xs text-text-secondary">Dual-band large, anti-pollution</p>
        </div>
        <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
          <h3 className="font-semibold text-blue-300 text-sm">Continuum (Galaxies)</h3>
          <p className="text-2xl font-bold text-text mt-1">SNR = 100</p>
          <p className="text-xs text-text-secondary mt-1">UV/IR Cut, RGB, Luminance</p>
          <p className="text-xs text-text-secondary">Spectre continu, galaxies/amas</p>
        </div>
      </div>
      <div className="mt-4 text-xs text-text-secondary space-y-1">
        <p><strong>sizeWeighting</strong> = √(diameter_px / 100), capé entre 0.5 et 5.0</p>
        <p><strong>effectiveTargetSNR</strong> = target_SNR / sizeWeighting</p>
        <p><strong>Plancher poses</strong> : 20 (broadband) / 15 (narrowband) — anti-cosmiques, satellites, sigma-clipping</p>
      </div>
    </section>

    {/* Calibration results */}
    <section className="bg-surface border border-border rounded-xl p-6">
      <h2 className="text-lg font-bold text-text mb-4">📊 Calibration vs SkyTools</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="text-center">
          <p className="text-3xl font-bold text-green-400">9/10</p>
          <p className="text-xs text-text-secondary">t_sub dans 3x</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-green-400">8/10</p>
          <p className="text-xs text-text-secondary">N_subs dans 3x</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-blue-400">0.50</p>
          <p className="text-xs text-text-secondary">Médiane ratio t_sub</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-blue-400">0.50</p>
          <p className="text-xs text-text-secondary">Médiane ratio N_subs</p>
        </div>
      </div>
      <p className="text-xs text-text-secondary">
        Calibration sur 10 objets de référence (M42, M27, M31, M51, Veil, etc.) avec configurations RedCat 51 + ASI533MC, Bortle 2-4, avec/sans Lune.
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
  };

  const result: ExposureResult = calculateExposure(params);

  return (
    <div className="space-y-4">
      {/* Inputs */}
      <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-text">🧮 Calculateur Interactif</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-text-secondary uppercase font-semibold">Équipement</label>
            <select value={rigKey} onChange={e => setRigKey(e.target.value as keyof typeof RIG_PRESETS)} className="mt-1 block w-full bg-background border border-border rounded-lg p-2 text-sm text-text">
              {Object.entries(RIG_PRESETS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-text-secondary uppercase font-semibold">Cible</label>
            <select value={targetIdx} onChange={e => setTargetIdx(Number(e.target.value))} className="mt-1 block w-full bg-background border border-border rounded-lg p-2 text-sm text-text">
              {EXAMPLE_TARGETS.map((t, i) => <option key={i} value={i}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-text-secondary uppercase font-semibold">Réducteur</label>
            <select value={reducer} onChange={e => setReducer(Number(e.target.value))} className="mt-1 block w-full bg-background border border-border rounded-lg p-2 text-sm text-text">
              <option value={1.0}>Sans (1.0×)</option>
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
              <option value={5}>5 (conservatif)</option>
              <option value={10}>10 (agressif)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-text-secondary">Lune altitude°</label>
            <input type="number" value={moonAlt} onChange={e => setMoonAlt(Number(e.target.value))} className="mt-1 w-full bg-background border border-border rounded-lg p-2 text-sm text-text" />
          </div>
          <div>
            <label className="text-xs text-text-secondary">Lune phase (0-3.5)</label>
            <input type="number" step="0.1" value={moonPhase} onChange={e => setMoonPhase(Number(e.target.value))} className="mt-1 w-full bg-background border border-border rounded-lg p-2 text-sm text-text" />
          </div>
          <div>
            <label className="text-xs text-text-secondary">Séparation°</label>
            <input type="number" value={moonSep} onChange={e => setMoonSep(Number(e.target.value))} className="mt-1 w-full bg-background border border-border rounded-lg p-2 text-sm text-text" />
          </div>
        </div>
      </div>

      {/* Intermediate results */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold text-text mb-3">Variables intermédiaires</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          {[
            ['SQM effectif', `${result.sqmEffective.toFixed(2)} mag/arcsec²`],
            ['Sampling', `${result.sampling.toFixed(2)} "/px`],
            ['B_sky', `${result.bSky.toFixed(4)} e⁻/px/s`],
            ['S_obj', `${result.sObj.toFixed(4)} e⁻/px/s`],
            ['k dynamique', `${result.kDynamic}`],
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
        <h3 className="text-sm font-semibold text-text mb-4">Résultat Final</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-xs text-text-secondary uppercase">Temps de pose</p>
            <p className="text-3xl font-bold text-blue-300">{result.subExposureTime}s</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-text-secondary uppercase">Nombre de poses</p>
            <p className="text-3xl font-bold text-green-300">{result.totalSubsForSNR}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-text-secondary uppercase">Intégration</p>
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
          <p className="mt-1 text-sm text-red-400">⚠️ {result.warning}</p>
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
          Filtre: {filterProfile.name} ({filterProfile.bandwidthNm}nm) | Type: {target.isEmission ? 'Émission' : 'Continuum'}
        </p>
      </div>
    </div>
  );
};

export default ExposureEngineDocs;