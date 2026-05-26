import React, { useState } from 'react';
import { Calculator, Aperture, Crosshair, Info, Copy, Check } from 'lucide-react';
import { calculateFOV, calculatePixelScale, calculateDitherRecommendation, calculateExposureTime, calculateMosaicPanes } from '../services/novaService';

interface EquipmentPreset {
  name: string;
  focalLength: number;
  aperture: number;
  sensorW: number;
  sensorH: number;
  pixelSize: number;
}

const EQUIPMENT_PRESETS: EquipmentPreset[] = [
  { name: 'RedCat 51 + ASI2600MM', focalLength: 250, aperture: 51, sensorW: 23.5, sensorH: 15.6, pixelSize: 3.76 },
  { name: 'RedCat 71 + ASI2600MM', focalLength: 348, aperture: 71, sensorW: 23.5, sensorH: 15.6, pixelSize: 3.76 },
  { name: 'EvoStar 72ED + ASI533MC', focalLength: 420, aperture: 72, sensorW: 11.3, sensorH: 11.3, pixelSize: 3.76 },
  { name: 'Svbony SV503 + ASI183MM', focalLength: 600, aperture: 80, sensorW: 13.1, sensorH: 8.8, pixelSize: 2.4 },
  { name: 'SharpStar 61EDPH', focalLength: 335, aperture: 61, sensorW: 23.5, sensorH: 15.6, pixelSize: 3.76 },
];

const NovaEquipmentCalcView: React.FC = () => {
  const [preset, setPreset] = useState<EquipmentPreset | null>(null);
  const [focalLength, setFocalLength] = useState(250);
  const [aperture, setAperture] = useState(51);
  const [sensorW, setSensorW] = useState(23.5);
  const [sensorH, setSensorH] = useState(15.6);
  const [pixelSize, setPixelSize] = useState(3.76);
  const [guideFocalLength, setGuideFocalLength] = useState(200);
  const [guidePixelSize, setGuidePixelSize] = useState(3.76);
  const [targetWidth, setTargetWidth] = useState(100);
  const [targetHeight, setTargetHeight] = useState(100);
  const [skyBackground, setSkyBackground] = useState<'dark' | 'moderate' | 'bright'>('dark');
  const [filter, setFilter] = useState<'L' | 'R' | 'G' | 'B' | 'Ha' | 'OIII' | 'SII'>('L');
  const [copied, setCopied] = useState(false);

  const fov = calculateFOV(focalLength, sensorW, sensorH, pixelSize);
  const pixelScale = calculatePixelScale(pixelSize, focalLength);
  const dither = calculateDitherRecommendation(pixelSize, focalLength, guidePixelSize, guideFocalLength, 5);
  const exposure = calculateExposureTime({ fRatio: focalLength / aperture, pixelSize, skyBackground, filter });
  const mosaic = calculateMosaicPanes(targetWidth, targetHeight, fov.widthArcmin, fov.heightArcmin, 20);

  const selectPreset = (p: EquipmentPreset) => {
    setPreset(p);
    setFocalLength(p.focalLength);
    setAperture(p.aperture);
    setSensorW(p.sensorW);
    setSensorH(p.sensorH);
    setPixelSize(p.pixelSize);
  };

  const copyResults = () => {
    const text = `FOV: ${fov.widthArcmin.toFixed(1)}' × ${fov.heightArcmin.toFixed(1)}'
Pixel Scale: ${pixelScale.toFixed(2)}"/px
Dither: ${dither.recommendedDitherPixels.toFixed(1)} guide px (${dither.recommendedDitherArcsec.toFixed(1)}")
Exposure: ${exposure.recommendedExposure}s ${filter} (${skyBackground} skies)`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-[#e8eaf6] p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="w-6 h-6 text-[#3b82f6]" /> Equipment Calculator
          </h2>
          <button
            onClick={copyResults}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1a2238] text-[#8e9aaf] hover:text-[#e8eaf6] text-sm transition-colors"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Results'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Inputs */}
          <div className="space-y-6">
            {/* Presets */}
            <div className="bg-[#1a2238] border border-[rgba(148,163,184,0.12)] rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-3">Equipment Presets</h3>
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

            {/* Main Camera */}
            <div className="bg-[#1a2238] border border-[rgba(148,163,184,0.12)] rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Aperture className="w-4 h-4 text-[#3b82f6]" /> Main Camera
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

            {/* Guide Camera */}
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

          {/* Right Column - Results */}
          <div className="space-y-6">
            {/* FOV Results */}
            <div className="bg-[#1a2238] border border-[rgba(148,163,184,0.12)] rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-4">Field of View</h3>
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
                  <div className="text-2xl font-bold text-[#10B981]">{pixelScale.toFixed(2)}″</div>
                  <div className="text-xs text-[#8e9aaf]">Pixel Scale</div>
                </div>
                <div className="bg-[#0a0f1a] rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-[#F59E0B]">{fov.diagonalArcmin.toFixed(1)}′</div>
                  <div className="text-xs text-[#8e9aaf]">Diagonal</div>
                </div>
              </div>
              <div className="mt-3 text-xs text-[#8e9aaf]">
                f/{(focalLength / aperture).toFixed(1)} · {fov.areaSquareDeg.toFixed(2)} sq°
              </div>
            </div>

            {/* Dither */}
            <div className="bg-[#1a2238] border border-[rgba(148,163,184,0.12)] rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-3">Dither Recommendation</h3>
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
                  <span className="text-[#8e9aaf] text-sm">Recommended dither</span>
                  <span className="text-[#10B981] font-bold font-mono">{dither.recommendedDitherPixels.toFixed(1)} px</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8e9aaf] text-sm">Arcsec on main</span>
                  <span className="text-[#10B981] font-bold font-mono">{dither.recommendedDitherArcsec.toFixed(1)}″</span>
                </div>
              </div>
              <p className="mt-2 text-xs text-[#8e9aaf]">{dither.explanation}</p>
            </div>

            {/* Exposure Calculator */}
            <div className="bg-[#1a2238] border border-[rgba(148,163,184,0.12)] rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-3">Exposure Calculator</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-[#8e9aaf] text-xs mb-1 block">Sky</label>
                  <select value={skyBackground} onChange={e => setSkyBackground(e.target.value as any)}
                    className="w-full bg-[#0a0f1a] border border-[rgba(148,163,184,0.12)] rounded-lg px-3 py-2 text-sm text-[#e8eaf6] focus:border-[#3b82f6] focus:outline-none">
                    <option value="dark">Dark (Bortle 1-3)</option>
                    <option value="moderate">Moderate (Bortle 4-5)</option>
                    <option value="bright">Bright (Bortle 6+)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[#8e9aaf] text-xs mb-1 block">Filter</label>
                  <select value={filter} onChange={e => setFilter(e.target.value as any)}
                    className="w-full bg-[#0a0f1a] border border-[rgba(148,163,184,0.12)] rounded-lg px-3 py-2 text-sm text-[#e8eaf6] focus:border-[#3b82f6] focus:outline-none">
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
            </div>

            {/* Mosaic Quick Calc */}
            <div className="bg-[#1a2238] border border-[rgba(148,163,184,0.12)] rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-3">Mosaic Quick Calc</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-[#8e9aaf] text-xs mb-1 block">Target W (arcmin)</label>
                  <input type="number" value={targetWidth} onChange={e => setTargetWidth(Number(e.target.value))}
                    className="w-full bg-[#0a0f1a] border border-[rgba(148,163,184,0.12)] rounded-lg px-3 py-2 text-sm text-[#e8eaf6] focus:border-[#3b82f6] focus:outline-none" />
                </div>
                <div>
                  <label className="text-[#8e9aaf] text-xs mb-1 block">Target H (arcmin)</label>
                  <input type="number" value={targetHeight} onChange={e => setTargetHeight(Number(e.target.value))}
                    className="w-full bg-[#0a0f1a] border border-[rgba(148,163,184,0.12)] rounded-lg px-3 py-2 text-sm text-[#e8eaf6] focus:border-[#3b82f6] focus:outline-none" />
                </div>
              </div>
              <div className="bg-[#0a0f1a] rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#8e9aaf] text-sm">Grid</span>
                  <span className="text-[#e8eaf6] font-bold font-mono">{mosaic.cols} × {mosaic.rows}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#8e9aaf] text-sm">Total panes</span>
                  <span className="text-[#e8eaf6] font-bold font-mono">{mosaic.totalPanes}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8e9aaf] text-sm">Coverage</span>
                  <span className="text-[#e8eaf6] font-bold font-mono">{mosaic.coveragePercent.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NovaEquipmentCalcView;
