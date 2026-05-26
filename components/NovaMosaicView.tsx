import React, { useState, useRef, useEffect } from 'react';
import { Grid3X3, Download, Copy, Check, Calculator, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { calculateFOV, calculateMosaicPanes } from '../services/novaService';

interface MosaicPane {
  id: number;
  ra: number;
  dec: number;
  rotation: number;
}

interface MosaicPlan {
  targetName: string;
  targetRa: number;
  targetDec: number;
  targetWidth: number;
  targetHeight: number;
  fovWidth: number;
  fovHeight: number;
  overlap: number;
  cols: number;
  rows: number;
  totalPanes: number;
  panes: MosaicPane[];
  csvData: string;
}

const PRESET_TARGETS = [
  { name: 'M31', ra: 10.6848, dec: 41.2692, width: 178, height: 63 },
  { name: 'M42', ra: 83.8221, dec: -5.3911, width: 66, height: 60 },
  { name: 'M45', ra: 56.7500, dec: 24.1167, width: 110, height: 110 },
  { name: 'North America Nebula', ra: 314.0000, dec: 44.3333, width: 120, height: 100 },
  { name: 'Rosette Nebula', ra: 97.0000, dec: 4.9500, width: 80, height: 80 },
  { name: 'Veil Nebula', ra: 311.5000, dec: 30.7000, width: 180, height: 120 },
  { name: 'Heart Nebula', ra: 42.5000, dec: 61.2000, width: 150, height: 150 },
  { name: 'California Nebula', ra: 63.0000, dec: 36.4000, width: 145, height: 40 },
];

const PRESET_EQUIPMENT = [
  { name: 'RedCat 51 + ASI2600MM', focalLength: 250, sensorW: 23.5, sensorH: 15.6, pixelSize: 3.76 },
  { name: 'RedCat 71 + ASI2600MM', focalLength: 348, sensorW: 23.5, sensorH: 15.6, pixelSize: 3.76 },
  { name: 'EvoStar 72ED + ASI533MC', focalLength: 420, sensorW: 11.3, sensorH: 11.3, pixelSize: 3.76 },
  { name: 'Svbony SV503 + ASI183MM', focalLength: 600, sensorW: 13.1, sensorH: 8.8, pixelSize: 2.4 },
];

const NovaMosaicView: React.FC = () => {
  const [targetName, setTargetName] = useState('');
  const [targetRa, setTargetRa] = useState('');
  const [targetDec, setTargetDec] = useState('');
  const [targetWidth, setTargetWidth] = useState(100);
  const [targetHeight, setTargetHeight] = useState(100);
  const [focalLength, setFocalLength] = useState(250);
  const [sensorW, setSensorW] = useState(23.5);
  const [sensorH, setSensorH] = useState(15.6);
  const [pixelSize, setPixelSize] = useState(3.76);
  const [overlap, setOverlap] = useState(20);
  const [plan, setPlan] = useState<MosaicPlan | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'setup' | 'preview' | 'export'>('setup');
  const aladinRef = useRef<any>(null);
  const [aladinLoaded, setAladinLoaded] = useState(false);

  // Load Aladin Lite
  useEffect(() => {
    if ((window as any).A) {
      setAladinLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://aladin.cds.unistra.fr/AladinLite/api/v3/latest/aladin.js';
    script.async = true;
    script.onload = () => setAladinLoaded(true);
    document.head.appendChild(script);
  }, []);

  // Init Aladin when preview tab is active
  useEffect(() => {
    if (activeTab !== 'preview' || !aladinLoaded || !plan) return;
    
    const container = document.getElementById('mosaic-aladin');
    if (!container || aladinRef.current) return;

    const A = (window as any).A;
    aladinRef.current = A.aladin('#mosaic-aladin', {
      target: `${plan.targetRa} ${plan.targetDec}`,
      fov: Math.max(plan.targetWidth, plan.targetHeight) / 60 * 1.5,
      survey: 'P/DSS2/color',
      showFullscreenControl: false,
    });

    // Draw mosaic grid overlay
    const drawOverlay = () => {
      if (!aladinRef.current) return;
      const canvas = container.querySelector('canvas');
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // This is a simplified overlay - in production you'd calculate exact pixel positions
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      
      const w = canvas.width;
      const h = canvas.height;
      const cols = plan.cols;
      const rows = plan.rows;
      
      for (let c = 0; c <= cols; c++) {
        const x = (w / cols) * c;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      
      for (let r = 0; r <= rows; r++) {
        const y = (h / rows) * r;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    };

    setTimeout(drawOverlay, 2000);
  }, [activeTab, aladinLoaded, plan]);

  const handleCalculate = () => {
    const fov = calculateFOV(focalLength, sensorW, sensorH, pixelSize);
    const mosaic = calculateMosaicPanes(targetWidth, targetHeight, fov.widthArcmin, fov.heightArcmin, overlap);

    // Generate pane coordinates
    const panes: MosaicPane[] = [];
    const effectiveFovW = fov.widthArcmin * (1 - overlap / 100) / 60; // degrees
    const effectiveFovH = fov.heightArcmin * (1 - overlap / 100) / 60;
    
    const raDeg = parseFloat(targetRa) || 0;
    const decDeg = parseFloat(targetDec) || 0;
    
    const startRa = raDeg - ((mosaic.cols - 1) * effectiveFovW) / 2;
    const startDec = decDeg + ((mosaic.rows - 1) * effectiveFovH) / 2;

    for (let row = 0; row < mosaic.rows; row++) {
      for (let col = 0; col < mosaic.cols; col++) {
        panes.push({
          id: row * mosaic.cols + col + 1,
          ra: startRa + col * effectiveFovW,
          dec: startDec - row * effectiveFovH,
          rotation: 0,
        });
      }
    }

    const csv = ['Pane,RA (deg),Dec (deg),Rotation'].concat(
      panes.map(p => `${p.id},${p.ra.toFixed(6)},${p.dec.toFixed(6)},${p.rotation}`)
    ).join('\n');

    setPlan({
      targetName,
      targetRa: raDeg,
      targetDec: decDeg,
      targetWidth,
      targetHeight,
      fovWidth: fov.widthArcmin,
      fovHeight: fov.heightArcmin,
      overlap,
      cols: mosaic.cols,
      rows: mosaic.rows,
      totalPanes: mosaic.totalPanes,
      panes,
      csvData: csv,
    });
    setActiveTab('preview');
  };

  const handleCopyCSV = () => {
    if (!plan) return;
    navigator.clipboard.writeText(plan.csvData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCSV = () => {
    if (!plan) return;
    const blob = new Blob([plan.csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${plan.targetName || 'mosaic'}_plan.csv`;
    a.click();
  };

  const selectPresetTarget = (t: typeof PRESET_TARGETS[0]) => {
    setTargetName(t.name);
    setTargetRa(t.ra.toString());
    setTargetDec(t.dec.toString());
    setTargetWidth(t.width);
    setTargetHeight(t.height);
  };

  const selectPresetEquipment = (e: typeof PRESET_EQUIPMENT[0]) => {
    setFocalLength(e.focalLength);
    setSensorW(e.sensorW);
    setSensorH(e.sensorH);
    setPixelSize(e.pixelSize);
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-[#e8eaf6] p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Grid3X3 className="w-6 h-6 text-[#3b82f6]" /> Mosaic Planner
          </h2>
          <div className="flex gap-2">
            {['setup', 'preview', 'export'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab ? 'bg-[#3b82f6] text-white' : 'bg-[#1a2238] text-[#8e9aaf] hover:text-[#e8eaf6]'
                }`}
              >
                {tab === 'setup' && 'Setup'}
                {tab === 'preview' && 'Preview'}
                {tab === 'export' && 'Export'}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'setup' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Target Selection */}
            <div className="bg-[#1a2238] border border-[rgba(148,163,184,0.12)] rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-4 text-[#e8eaf6]">Target</h3>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {PRESET_TARGETS.map(t => (
                  <button
                    key={t.name}
                    onClick={() => selectPresetTarget(t)}
                    className="px-2.5 py-1 rounded-md text-xs bg-[#0a0f1a] text-[#8e9aaf] border border-[rgba(148,163,184,0.12)] hover:border-[#3b82f6] hover:text-[#3b82f6] transition-colors"
                  >
                    {t.name}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[#8e9aaf] text-xs mb-1 block">Name</label>
                  <input
                    type="text"
                    value={targetName}
                    onChange={e => setTargetName(e.target.value)}
                    placeholder="e.g. M31"
                    className="w-full bg-[#0a0f1a] border border-[rgba(148,163,184,0.12)] rounded-lg px-3 py-2 text-sm text-[#e8eaf6] focus:border-[#3b82f6] focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[#8e9aaf] text-xs mb-1 block">RA (deg)</label>
                    <input
                      type="number"
                      value={targetRa}
                      onChange={e => setTargetRa(e.target.value)}
                      className="w-full bg-[#0a0f1a] border border-[rgba(148,163,184,0.12)] rounded-lg px-3 py-2 text-sm text-[#e8eaf6] focus:border-[#3b82f6] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[#8e9aaf] text-xs mb-1 block">Dec (deg)</label>
                    <input
                      type="number"
                      value={targetDec}
                      onChange={e => setTargetDec(e.target.value)}
                      className="w-full bg-[#0a0f1a] border border-[rgba(148,163,184,0.12)] rounded-lg px-3 py-2 text-sm text-[#e8eaf6] focus:border-[#3b82f6] focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[#8e9aaf] text-xs mb-1 block">Width (arcmin)</label>
                    <input
                      type="number"
                      value={targetWidth}
                      onChange={e => setTargetWidth(Number(e.target.value))}
                      className="w-full bg-[#0a0f1a] border border-[rgba(148,163,184,0.12)] rounded-lg px-3 py-2 text-sm text-[#e8eaf6] focus:border-[#3b82f6] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[#8e9aaf] text-xs mb-1 block">Height (arcmin)</label>
                    <input
                      type="number"
                      value={targetHeight}
                      onChange={e => setTargetHeight(Number(e.target.value))}
                      className="w-full bg-[#0a0f1a] border border-[rgba(148,163,184,0.12)] rounded-lg px-3 py-2 text-sm text-[#e8eaf6] focus:border-[#3b82f6] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Equipment */}
            <div className="bg-[#1a2238] border border-[rgba(148,163,184,0.12)] rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-4 text-[#e8eaf6]">Equipment</h3>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {PRESET_EQUIPMENT.map(e => (
                  <button
                    key={e.name}
                    onClick={() => selectPresetEquipment(e)}
                    className="px-2.5 py-1 rounded-md text-xs bg-[#0a0f1a] text-[#8e9aaf] border border-[rgba(148,163,184,0.12)] hover:border-[#3b82f6] hover:text-[#3b82f6] transition-colors"
                  >
                    {e.name}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[#8e9aaf] text-xs mb-1 block">Focal Length (mm)</label>
                    <input
                      type="number"
                      value={focalLength}
                      onChange={e => setFocalLength(Number(e.target.value))}
                      className="w-full bg-[#0a0f1a] border border-[rgba(148,163,184,0.12)] rounded-lg px-3 py-2 text-sm text-[#e8eaf6] focus:border-[#3b82f6] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[#8e9aaf] text-xs mb-1 block">Pixel Size (µm)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={pixelSize}
                      onChange={e => setPixelSize(Number(e.target.value))}
                      className="w-full bg-[#0a0f1a] border border-[rgba(148,163,184,0.12)] rounded-lg px-3 py-2 text-sm text-[#e8eaf6] focus:border-[#3b82f6] focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[#8e9aaf] text-xs mb-1 block">Sensor W (mm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={sensorW}
                      onChange={e => setSensorW(Number(e.target.value))}
                      className="w-full bg-[#0a0f1a] border border-[rgba(148,163,184,0.12)] rounded-lg px-3 py-2 text-sm text-[#e8eaf6] focus:border-[#3b82f6] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[#8e9aaf] text-xs mb-1 block">Sensor H (mm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={sensorH}
                      onChange={e => setSensorH(Number(e.target.value))}
                      className="w-full bg-[#0a0f1a] border border-[rgba(148,163,184,0.12)] rounded-lg px-3 py-2 text-sm text-[#e8eaf6] focus:border-[#3b82f6] focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[#8e9aaf] text-xs mb-1 block">Overlap (%)</label>
                  <input
                    type="range"
                    min="10"
                    max="50"
                    value={overlap}
                    onChange={e => setOverlap(Number(e.target.value))}
                    className="w-full accent-[#3b82f6]"
                  />
                  <div className="text-right text-xs text-[#8e9aaf]">{overlap}%</div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <button
                onClick={handleCalculate}
                className="w-full py-3 bg-[#3b82f6] text-white rounded-xl font-medium hover:bg-[#60A5FA] transition-colors flex items-center justify-center gap-2"
              >
                <Calculator className="w-5 h-5" /> Calculate Mosaic
              </button>
            </div>
          </div>
        )}

        {activeTab === 'preview' && plan && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#1a2238] border border-[rgba(148,163,184,0.12)] rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-[#3b82f6]">{plan.totalPanes}</div>
                <div className="text-xs text-[#8e9aaf]">Total Panes</div>
              </div>
              <div className="bg-[#1a2238] border border-[rgba(148,163,184,0.12)] rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-[#10B981]">{plan.cols}×{plan.rows}</div>
                <div className="text-xs text-[#8e9aaf]">Grid</div>
              </div>
              <div className="bg-[#1a2238] border border-[rgba(148,163,184,0.12)] rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-[#F59E0B]">{plan.fovWidth.toFixed(1)}′</div>
                <div className="text-xs text-[#8e9aaf]">FOV Width</div>
              </div>
              <div className="bg-[#1a2238] border border-[rgba(148,163,184,0.12)] rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-[#F59E0B]">{plan.fovHeight.toFixed(1)}′</div>
                <div className="text-xs text-[#8e9aaf]">FOV Height</div>
              </div>
            </div>

            <div className="bg-[#1a2238] border border-[rgba(148,163,184,0.12)] rounded-xl overflow-hidden">
              <div id="mosaic-aladin" style={{ width: '100%', height: '500px', background: '#000' }} />
            </div>

            <div className="grid grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-2">
              {plan.panes.map(pane => (
                <div
                  key={pane.id}
                  className="bg-[#1a2238] border border-[rgba(148,163,184,0.12)] rounded-lg p-2 text-center hover:border-[#3b82f6] transition-colors"
                >
                  <div className="text-xs font-bold text-[#3b82f6]">#{pane.id}</div>
                  <div className="text-[10px] text-[#8e9aaf] font-mono mt-1">
                    {pane.ra.toFixed(2)}<br/>{pane.dec.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'export' && plan && (
          <div className="space-y-4">
            <div className="bg-[#1a2238] border border-[rgba(148,163,184,0.12)] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">CSV Export</h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyCSV}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0a0f1a] text-[#8e9aaf] hover:text-[#e8eaf6] text-xs transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={handleDownloadCSV}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3b82f6] text-white hover:bg-[#60A5FA] text-xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                </div>
              </div>
              <pre className="bg-[#0a0f1a] rounded-lg p-4 text-xs text-[#8e9aaf] font-mono overflow-x-auto">
                {plan.csvData}
              </pre>
            </div>

            <div className="bg-[#1a2238] border border-[rgba(148,163,184,0.12)] rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-3">NINA Sequence</h3>
              <pre className="bg-[#0a0f1a] rounded-lg p-4 text-xs text-[#8e9aaf] font-mono overflow-x-auto">
                {plan.panes.map(p => `SlewToRaDec;${p.ra.toFixed(6)};${p.dec.toFixed(6)};0\nTakeExposure;L;300;1`).join('\n')}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NovaMosaicView;
