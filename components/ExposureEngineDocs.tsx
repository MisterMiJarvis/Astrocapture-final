import React, { useState, useEffect } from 'react';
import { FILTER_PROFILES, loadFilterProfiles } from '../src/services/module5/exposureCalculator';
import { FilterProfile } from '../src/types/module5';



const ExposureEngineDocs: React.FC = () => {
  return (
    <div className="space-y-6">
      <DocsView />
    </div>
  );
};

const DocsView: React.FC = () => {
  const [filterProfiles, setFilterProfiles] = useState<Record<string, FilterProfile>>(FILTER_PROFILES);
  
  useEffect(() => {
    loadFilterProfiles().then(setFilterProfiles).catch(() => {});
  }, []);
  
  return (
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
          { n: 1, title: 'Effective SQM', formula: 'sqmEff = sqmBase - max(0, 3.5 × illum^2.5 × sin(alt) × e^(-θ/30))', desc: 'Sky background degradation by the Moon. moonPhaseFactor = 3.5 × illumination^2.5 (non-linear, opposition effect). proximityFactor = e^(-θ/30) (Rayleigh scattering). θ = Moon-target angular distance. 0°→1.0, 30°→0.37, 90°→0.05. Values from Skyfield (Python, NASA DE421).' },
          { n: 2, title: 'Optical Sampling', formula: 's = (206.265 × p) / (F × fR) | A = π × (D/2000)² | d_px = (targetSize × 60) / s', desc: 'Effective focal length with reducer, arcsec/pixel sampling, collecting area, and diameter_px (object size in pixels on sensor — used in step 6)' },
          { n: 3, title: 'Sky Flux (B_sky)', formula: 'B_sky = 10^(0.4×(26.59-sqmEff)) × A × s² × QE × τ_eff', desc: 'Sky background electron rate per pixel per second' },
          { n: 4, title: 'Optimal Sub-Exposure', formula: 't_opt = k_dyn × RN² / B_sky → clamp 10-600s', desc: 'k=2.5 (narrowband) or 5.0 (broadband), intelligent clamping (configurable in v9)' },
          { n: 5, title: 'Object Signal & SNR', formula: 'S_obj = Φ_obj × A × s² × QE × τ_obj × k_calib | SNR_sub = (S_obj × t_sub) / √((S_obj+B_sky+dc)×t_sub + RN²)', desc: 'Object signal with continuumTransmission and empirical k_calib by type: diffuse_nebula=1.0, planetary_nebula=2.0, galaxy=2.0, stellar=2.5, unknown=1.0. Total noise including dark current. Warning if dc×t_sub > 0.1×RN². V11: SB_obj += extinction_mag (atmospheric extinction from Skyfield — airmass × k_ext=0.20)' },
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
              ['Diffuse nebula', '1.0', '5', 'revised 14/07', 'Old 0.223 compensated SB unit error. With mag/arcmin2 to arcsec2 fix, k=1.0 is neutral. M16 reference. To recalibrate with FITS sessions.'],
              ['Planetary nebula', '2.0', '2', 'revised 14/07', 'Old 0.15 compensated SB unit error. k=2.0: M27 ~5h in 3nm NB. Core brighter than avg SB. Gemini: k should be 0.5-2.0. To recalibrate with FITS.'],
              ['Galaxy', '2.0', '2', 'revised 14/07', 'Rounded from 2.572. Core + arms. Conservative. To recalibrate.'],
              ['Stellar cluster', '2.5', '1', '—', 'Rounded from 2.905. Point sources. To recalibrate.'],
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
        <p><strong className="text-text">Ratio:</strong> k_calib = median(SNR_measured / SNR_predicted) across sessions of the same object type. The project creation form auto-detects object type from target name and applies the corresponding k_calib.</p>
        <p><strong className="text-text">Limitations:</strong> High variance within types (e.g. diffuse nebulae range 0.05–0.99). Surface brightness is non-uniform within objects. A single k_calib per type is a first-order correction. Future: radial SB profiles or per-object calibration.</p>
        <p><strong className="text-text">⚠️ v9.1 SB Unit Fix (14/07):</strong> Telescopius provides surface brightness in mag/arcmin², not mag/arcsec². Conversion: SB_arcsec² = SB_arcmin² + 2.5×log₁₀(3600) ≈ SB_arcmin² + 8.89. Old k_calib values unconsciously compensated this unit error (factor ~3600 on flux). New values revised accordingly — recalibration with FITS sessions needed.</p>
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
              ['k_calib', 'k_calib', 'Empirical (auto)', '1.0–10.0'],
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
            {(Object.keys(filterProfiles) as FilterType[]).map(t => {
              const f = filterProfiles[t];
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
};

export default ExposureEngineDocs;