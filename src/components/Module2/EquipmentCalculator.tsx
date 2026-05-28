import React, { useState } from 'react';
import { Calculator, Aperture, Crosshair, Copy, Check, Telescope, Camera, ChevronDown, ChevronUp } from 'lucide-react';

// Types
interface EquipmentPreset {
  name: string;
  focalLength: number;
  aperture: number;
  sensorW: number;
  sensorH: number;
  pixelSize: number;
}

interface FOVResult {
  widthArcmin: number;
  heightArcmin: number;
  diagonalArcmin: number;
  areaSquareDeg: number;
}

interface PixelScaleResult {
  arcsecPerPixel: number;
  sampling: 'undersampled' | 'optimal' | 'oversampled';
  nyquist: number;
}

interface DitherResult {
  guidePixelScale: number;
  mainPixelScale: number;
  recommendedDitherPixels: number;
  recommendedDitherArcsec: number;
  explanation: string;
}

interface ExposureResult {
  recommendedExposure: number;
  totalIntegrationTime: number;
  subexposureCount: number;
  explanation: string;
}

// Données
const EQUIPMENT_PRESETS: EquipmentPreset[] = [
  { name: 'RedCat 51 + ASI2600MM', focalLength: 250, aperture: 51, sensorW: 23.5, sensorH: 15.6, pixelSize: 3.76 },
  { name: 'RedCat 71 + ASI2600MM', focalLength: 348, aperture: 71, sensorW: 23.5, sensorH: 15.6, pixelSize: 3.76 },
  { name: 'EvoStar 72ED + ASI533MC', focalLength: 420, aperture: 72, sensorW: 11.3, sensorH: 11.3, pixelSize: 3.76 },
  { name: 'Svbony SV503 + ASI183MM', focalLength: 600, aperture: 80, sensorW: 13.1, sensorH: 8.8, pixelSize: 2.4 },
  { name: 'SharpStar 61EDPH', focalLength: 335, aperture: 61, sensorW: 23.5, sensorH: 15.6, pixelSize: 3.76 },
  { name: 'ZWO FF107 + ASI6200MM', focalLength: 400, aperture: 107, sensorW: 36, sensorH: 24, pixelSize: 3.76 },
];

// Calculs
function calculateFOV(focalLength: number, sensorW: number, sensorH: number): FOVResult {
  const widthArcmin = (sensorW / focalLength) * 57.3 * 60;
  const heightArcmin = (sensorH / focalLength) * 57.3 * 60;
  const diagonalArcmin = Math.sqrt(widthArcmin ** 2 + heightArcmin ** 2);
  const areaSquareDeg = (widthArcmin / 60) * (heightArcmin / 60);
  return { widthArcmin, heightArcmin, diagonalArcmin, areaSquareDeg };
}

function calculatePixelScale(pixelSize: number, focalLength: number): PixelScaleResult {
  const arcsecPerPixel = (pixelSize / focalLength) * 206.265;
  const nyquist = 2.0; // arcsec/pixel
  
  let sampling: 'undersampled' | 'optimal' | 'oversampled';
  if (arcsecPerPixel > nyquist * 1.5) sampling = 'undersampled';
  else if (arcsecPerPixel < nyquist * 0.5) sampling = 'oversampled';
  else sampling = 'optimal';
  
  return { arcsecPerPixel, sampling, nyquist };
}

function calculateDither(
  mainPixelSize: number, mainFocalLength: number,
  guidePixelSize: number, guideFocalLength: number,
  seeing: number = 2.5
): DitherResult {
  const mainPixelScale = (mainPixelSize / mainFocalLength) * 206.265;
  const guidePixelScale = (guidePixelSize / guideFocalLength) * 206.265;
  const ditherArcsec = Math.max(seeing * 1.5, mainPixelScale * 5);
  const ditherGuidePixels = ditherArcsec / guidePixelScale;
  
  return {
    guidePixelScale,
    mainPixelScale,
    recommendedDitherPixels: Math.max(1, ditherGuidePixels),
    recommendedDitherArcsec: ditherArcsec,
    explanation: `Dither = max(1.5×seeing, 5×main pixels) = max(${seeing * 1.5}″, ${mainPixelScale * 5}″)`,
  };
}

function calculateExposure(
  focalLength: number, aperture: number, pixelSize: number,
  skyBackground: 'dark' | 'moderate' | 'bright',
  filter: string
): ExposureResult {
  const fRatio = focalLength / aperture;
  const pixelScale = (pixelSize / focalLength) * 206.265;
  
  const skyFactor = { dark: 1.0, moderate: 0.5, bright: 0.25 }[skyBackground];
  const filterFactor = { L: 1.0, R: 1.5, G: 1.5, B: 2.0, Ha: 4.0, OIII: 5.0, SII: 6.0 }[filter] || 1.0;
  
  const recommendedExposure = Math.min(
    600,
    Math.max(30, Math.round((fRatio * pixelScale * filterFactor) / (skyFactor * 2)))
  );
  
  const totalIntegration = Math.round((1800 * filterFactor) / skyFactor);
  const subCount = Math.round(totalIntegration / recommendedExposure);
  
  return {
    recommendedExposure,
    totalIntegrationTime: (totalIntegration / 60).toFixed(1),
    subexposureCount: subCount,
    explanation: `${recommendedExposure}s × ${subCount} subs = ${totalIntegration}s total (${filter} filter, ${skyBackground} skies)`,
  };
}

// Composant
const EquipmentCalculator: React.FC = () => {
  const [preset, setPreset] = useState<EquipmentPreset | null>(null);
  const [focalLength, setFocalLength] = useState(250);
  const [aperture, setAperture] = useState(51);
  const [sensorW, setSensorW] = useState(23.5);
  const [sensorH, setSensorH] = useState(15.6);
  const [pixelSize, setPixelSize] = useState(3.76);
  const [guideFocalLength, setGuideFocalLength] = useState(200);
  const [guidePixelSize, setGuidePixelSize] = useState(3.76);
  const [skyBackground, setSkyBackground] = useState<'dark' | 'moderate' | 'bright'>('dark');
  const [filter, setFilter] = useState('L');
  const [copied, setCopied] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('fov');

  const fov = calculateFOV(focalLength, sensorW, sensorH);
  const pixelScale = calculatePixelScale(pixelSize, focalLength);
  const dither = calculateDither(pixelSize, focalLength, guidePixelSize, guideFocalLength);
  const exposure = calculateExposure(focalLength, aperture, pixelSize, skyBackground, filter);
  const fRatio = (focalLength / aperture).toFixed(1);

  const selectPreset = (p: EquipmentPreset) => {
    setPreset(p);
    setFocalLength(p.focalLength);
    setAperture(p.aperture);
    setSensorW(p.sensorW);
    setSensorH(p.sensorH);
    setPixelSize(p.pixelSize);
  };

  const copyResults = () => {
    const text = `Equipment: ${preset?.name || 'Custom'}
Focal: ${focalLength}mm f/${fRatio}
Sensor: ${sensorW}×${sensorH}mm @ ${pixelSize}µm
FOV: ${fov.widthArcmin.toFixed(1)}'×${fov.heightArcmin.toFixed(1)}'
Pixel Scale: ${pixelScale.arcsecPerPixel.toFixed(2)}″/px (${pixelScale.sampling})
Dither: ${dither.recommendedDitherPixels.toFixed(1)} guide px
Exposure: ${exposure.recommendedExposure}s ${filter} (${skyBackground})`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const Section = ({ id, title, icon: Icon, children }: { id: string; title: string; icon: any; children: React.ReactNode }) => (
    <div className="bg-[#1a2238] border border-[rgba(148,163,184,0.12)] rounded-xl overflow-hidden">
      <button
        onClick={() => setExpandedSection(expandedSection === id ? null : id)}
        className="w-full flex items-center justify-between p-4 hover:bg-[#1e2942] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-[#3b82f6]" />
          <span className="font-semibold">{title}</span>
        </div>
        {expandedSection === id ? <ChevronUp className="w-4 h-4 text-[#8e9aaf]" /> : <ChevronDown className="w-4 h-4 text-[#8e9aaf]" />}
      </button>
      {expandedSection === id && (
        <div className="px-4 pb-4">{children}</div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="w-6 h-6 text-[#3b82f6]" /> Equipment Calculator
        </h2>
        <button
          onClick={copyResults}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1a2238] text-[#8e9aaf] hover:text-[#e8eaf6] text-sm transition-colors border border-[rgba(148,163,184,0.12)]"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Copy Results'}
        </button>
      </div>

      {/* Presets */}
      <div className="bg-[#1a2238] border border-[rgba(148,163,184,0.12)] rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-3">Quick Presets</h3>
        <div className="flex flex-wrap gap-2">
          {EQUIPMENT_PRESETS.map(p => (
            <button
              key={p.name}
              onClick={() => selectPreset(p)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                preset?.name === p.name
                  ? 'bg-[#3b82f6] text-white'
                  : 'bg-[#0a0f1a] text-[#8e9aaf] border border-[rgba(148,163,184,0.12)] hover:border-[#3b82f6]'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Inputs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left - Equipment */}
        <div className="space-y-6">
          <div className="bg-[#1a2238] border border-[rgba(148,163,184,0.12)] rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Telescope className="w-4 h-4 text-[#3b82f6]" /> Main Camera
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[#8e9aaf] text-xs mb-1 block">Focal Length (mm)</label>
                <input type="number" value={focalLength} onChange={e => setFocalLength(Number(e.target.value))}
                  className="w-full bg-[#0a0f1a] border border-[rgba(148,163,184,0.12)] rounded-lg px-3 py-2 text-sm text-[#e8eaf6] focus:border-[#3b82f6] focus:outline-none" />
              </div>
              <div>
                <label className="text-[#8e9aaf] text-xs mb-1 block">Aperture (mm)</label>
                <input type="number" value={aperture} onChange={e => setAperture(Number(e.target.value))}
                  className="w-full bg-[#0a0f1a] border border-[rgba(148,163,184,0.12)] rounded-lg px-3 py-2 text-sm text-[#e8eaf6] focus:border-[#3b82f6] focus:outline-none" />
              </div>
              <div>
                <label className="text-[#8e9aaf] text-xs mb-1 block">Sensor W (mm)</label>
                <input type="number" step="0.1" value={sensorW} onChange={e => setSensorW(Number(e.target.value))}
                  className="w-full bg-[#0a0f1a] border border-[rgba(148,163,184,0.12)] rounded-lg px-3 py-2 text-sm text-[#e8eaf6] focus:border-[#3b82f6] focus:outline-none" />
              </div>
              <div>
                <label className="text-[#8e9aaf] text-xs mb-1 block">Sensor H (mm)</label>
                <input type="number" step="0.1" value={sensorH} onChange={e => setSensorH(Number(e.target.value))}
                  className="w-full bg-[#0a0f1a] border border-[rgba(148,163,184,0.12)] rounded-lg px-3 py-2 text-sm text-[#e8eaf6] focus:border-[#3b82f6] focus:outline-none" />
              </div>
              <div className="col-span-2">
                <label className="text-[#8e9aaf] text-xs mb-1 block">Pixel Size (µm)</label>
                <input type="number" step="0.01" value={pixelSize} onChange={e => setPixelSize(Number(e.target.value))}
                  className="w-full bg-[#0a0f1a] border border-[rgba(148,163,184,0.12)] rounded-lg px-3 py-2 text-sm text-[#e8eaf6] focus:border-[#3b82f6] focus:outline-none" />
              </div>
            </div>
          </div>

          <div className="bg-[#1a2238] border border-[rgba(148,163,184,0.12)] rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-[#10B981]" /> Guide Camera
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[#8e9aaf] text-xs mb-1 block">Guide Focal (mm)</label>
                <input type="number" value={guideFocalLength} onChange={e => setGuideFocalLength(Number(e.target.value))}
                  className="w-full bg-[#0a0f1a] border border-[rgba(148,163,184,0.12)] rounded-lg px-3 py-2 text-sm text-[#e8eaf6] focus:border-[#3b82f6] focus:outline-none" />
              </div>
              <div>
                <label className="text-[#8e9aaf] text-xs mb-1 block">Guide Pixel (µm)</label>
                <input type="number" step="0.01" value={guidePixelSize} onChange={e => setGuidePixelSize(Number(e.target.value))}
                  className="w-full bg-[#0a0f1a] border border-[rgba(148,163,184,0.12)] rounded-lg px-3 py-2 text-sm text-[#e8eaf6] focus:border-[#3b82f6] focus:outline-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Right - Results */}
        <div className="space-y-4">
          <Section id="fov" title="Field of View" icon={Camera}>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#0a0f1a] rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-[#3b82f6]">{fov.widthArcmin.toFixed(1)}′</div>
                <div className="text-xs text-[#8e9aaf]">Width</div>
              </div>
              <div className="bg-[#0a0f1a] rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-[#3b82f6]">{fov.heightArcmin.toFixed(1)}′</div>
                <div className="text-xs text-[#8e9aaf]">Height</div>
              </div>
              <div className="bg-[#0a0f1a] rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-[#F59E0B]">{fov.diagonalArcmin.toFixed(1)}′</div>
                <div className="text-xs text-[#8e9aaf]">Diagonal</div>
              </div>
              <div className="bg-[#0a0f1a] rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-[#10B981]">{fov.areaSquareDeg.toFixed(2)}°²</div>
                <div className="text-xs text-[#8e9aaf]">Area</div>
              </div>
            </div>
          </Section>

          <Section id="sampling" title="Sampling & Pixel Scale" icon={Aperture}>
            <div className="bg-[#0a0f1a] rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#8e9aaf] text-sm">Pixel Scale</span>
                <span className="text-[#e8eaf6] font-bold font-mono">{pixelScale.arcsecPerPixel.toFixed(2)}″/px</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#8e9aaf] text-sm">Nyquist Limit</span>
                <span className="text-[#e8eaf6] font-mono">{pixelScale.nyquist}″/px</span>
              </div>
              <div className="border-t border-[rgba(148,163,184,0.12)] my-2" />
              <div className="flex items-center justify-between">
                <span className="text-[#8e9aaf] text-sm">Sampling</span>
                <span className={`font-bold ${
                  pixelScale.sampling === 'optimal' ? 'text-[#10B981]' :
                  pixelScale.sampling === 'undersampled' ? 'text-[#F59E0B]' : 'text-[#EF4444]'
                }`}>
                  {pixelScale.sampling === 'optimal' ? '✓ Optimal' : 
                   pixelScale.sampling === 'undersampled' ? '⚠ Undersampled' : '⚠ Oversampled'}
                </span>
              </div>
            </div>
          </Section>

          <Section id="dither" title="Dither Recommendation" icon={Crosshair}>
            <div className="bg-[#0a0f1a] rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#8e9aaf] text-sm">Guide pixel scale</span>
                <span className="text-[#e8eaf6] font-mono">{dither.guidePixelScale.toFixed(2)}″/px</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#8e9aaf] text-sm">Main pixel scale</span>
                <span className="text-[#e8eaf6] font-mono">{dither.mainPixelScale.toFixed(2)}″/px</span>
              </div>
              <div className="border-t border-[rgba(148,163,184,0.12)] my-2" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#8e9aaf] text-sm">Dither pixels</span>
                <span className="text-[#10B981] font-bold font-mono">{dither.recommendedDitherPixels.toFixed(1)} px</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8e9aaf] text-sm">Arcsec on main</span>
                <span className="text-[#10B981] font-bold font-mono">{dither.recommendedDitherArcsec.toFixed(1)}″</span>
              </div>
              <p className="mt-2 text-xs text-[#8e9aaf]">{dither.explanation}</p>
            </div>
          </Section>

          <Section id="exposure" title="Exposure Calculator" icon={Camera}>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[#8e9aaf] text-xs mb-1 block">Sky</label>
                <select value={skyBackground} onChange={e => setSkyBackground(e.target.value as any)}
                  className="w-full bg-[#0a0f1a] border border-[rgba(148,163,184,0.12)] rounded-lg px-3 py-2 text-sm text-[#e8eaf6] focus:border-[#3b82f6] focus:outline-none"
                >
                  <option value="dark">Dark (Bortle 1-3)</option>
                  <option value="moderate">Moderate (Bortle 4-5)</option>
                  <option value="bright">Bright (Bortle 6+)</option>
                </select>
              </div>
              <div>
                <label className="text-[#8e9aaf] text-xs mb-1 block">Filter</label>
                <select value={filter} onChange={e => setFilter(e.target.value)}
                  className="w-full bg-[#0a0f1a] border border-[rgba(148,163,184,0.12)] rounded-lg px-3 py-2 text-sm text-[#e8eaf6] focus:border-[#3b82f6] focus:outline-none"
                >
                  <option value="L">Luminance</option>
                  <option value="R">Red</option>
                  <option value="G">Green</option>
                  <option value="B">Blue</option>
                  <option value="Ha">H-alpha</option>
                  <option value="OIII">OIII</option>
                  <option value="SII">SII</option>
                </select>
              </div>
            </div>
            <div className="bg-[#0a0f1a] rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#8e9aaf] text-sm">Recommended sub</span>
                <span className="text-[#e8eaf6] font-bold font-mono">{exposure.recommendedExposure}s</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#8e9aaf] text-sm">Total for SNR 30</span>
                <span className="text-[#e8eaf6] font-bold font-mono">{exposure.totalIntegrationTime}h</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8e9aaf] text-sm">Frame count</span>
                <span className="text-[#e8eaf6] font-bold font-mono">~{exposure.subexposureCount}</span>
              </div>
            </div>
            <p className="mt-2 text-xs text-[#8e9aaf]">{exposure.explanation}</p>
          </Section>
        </div>
      </div>
    </div>
  );
};

export default EquipmentCalculator;
