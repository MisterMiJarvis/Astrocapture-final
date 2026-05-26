import React, { useState, useEffect } from 'react';
import { Calendar, Thermometer, Target, Search } from 'lucide-react';
import { calculateYearlyVisibility, VisibilityMonth } from '../services/novaService';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const PRESET_TARGETS = [
  { name: 'M31', ra: 10.6848, dec: 41.2692 },
  { name: 'M42', ra: 83.8221, dec: -5.3911 },
  { name: 'M45', ra: 56.7500, dec: 24.1167 },
  { name: 'M51', ra: 202.4696, dec: 47.1951 },
  { name: 'M81', ra: 148.8882, dec: 69.0653 },
  { name: 'M101', ra: 210.8024, dec: 54.3491 },
  { name: 'M33', ra: 23.4621, dec: 30.6599 },
  { name: 'North America', ra: 314.0000, dec: 44.3333 },
  { name: 'Orion Belt', ra: 84.0000, dec: -1.5000 },
  { name: 'Rosette', ra: 97.0000, dec: 4.9500 },
];

const NovaYearlyHeatmapView: React.FC = () => {
  const [selectedTarget, setSelectedTarget] = useState(PRESET_TARGETS[0]);
  const [customRa, setCustomRa] = useState('');
  const [customDec, setCustomDec] = useState('');
  const [customName, setCustomName] = useState('');
  const [visibility, setVisibility] = useState<VisibilityMonth[]>([]);
  const [location, setLocation] = useState({ lat: 43.7889, lon: 4.7533 }); // Saint-Étienne-du-Grès
  const [isCustom, setIsCustom] = useState(false);

  useEffect(() => {
    const target = isCustom
      ? { name: customName || 'Custom', ra: parseFloat(customRa) || 0, dec: parseFloat(customDec) || 0 }
      : selectedTarget;

    if (target.ra !== 0 || target.dec !== 0) {
      const data = calculateYearlyVisibility(target.ra, target.dec, location.lat, location.lon);
      setVisibility(data);
    }
  }, [selectedTarget, customRa, customDec, location, isCustom]);

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'bg-[#10B981]';
    if (score >= 60) return 'bg-[#34D399]';
    if (score >= 40) return 'bg-[#F59E0B]';
    if (score >= 20) return 'bg-[#F97316]';
    return 'bg-[#EF4444]';
  };

  const getScoreText = (score: number): string => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    if (score >= 20) return 'Poor';
    return 'Very Poor';
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-[#e8eaf6] p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6 text-[#3b82f6]" /> Yearly Visibility Heatmap
          </h2>
        </div>

        {/* Target Selection */}
        <div className="bg-[#1a2238] border border-[rgba(148,163,184,0.12)] rounded-xl p-5 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => setIsCustom(false)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                !isCustom ? 'bg-[#3b82f6] text-white' : 'bg-[#0a0f1a] text-[#8e9aaf]'
              }`}
            >
              Presets
            </button>
            <button
              onClick={() => setIsCustom(true)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isCustom ? 'bg-[#3b82f6] text-white' : 'bg-[#0a0f1a] text-[#8e9aaf]'
              }`}
            >
              Custom
            </button>
          </div>

          {!isCustom ? (
            <div className="flex flex-wrap gap-2">
              {PRESET_TARGETS.map(t => (
                <button
                  key={t.name}
                  onClick={() => setSelectedTarget(t)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    selectedTarget.name === t.name
                      ? 'bg-[#3b82f6] text-white'
                      : 'bg-[#0a0f1a] text-[#8e9aaf] border border-[rgba(148,163,184,0.12)] hover:border-[#3b82f6]'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Target name"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                className="bg-[#0a0f1a] border border-[rgba(148,163,184,0.12)] rounded-lg px-3 py-2 text-sm text-[#e8eaf6] focus:border-[#3b82f6] focus:outline-none"
              />
              <input
                type="number"
                placeholder="RA (deg)"
                value={customRa}
                onChange={e => setCustomRa(e.target.value)}
                className="bg-[#0a0f1a] border border-[rgba(148,163,184,0.12)] rounded-lg px-3 py-2 text-sm text-[#e8eaf6] focus:border-[#3b82f6] focus:outline-none"
              />
              <input
                type="number"
                placeholder="Dec (deg)"
                value={customDec}
                onChange={e => setCustomDec(e.target.value)}
                className="bg-[#0a0f1a] border border-[rgba(148,163,184,0.12)] rounded-lg px-3 py-2 text-sm text-[#e8eaf6] focus:border-[#3b82f6] focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Heatmap */}
        {visibility.length > 0 && (
          <div className="space-y-6">
            <div className="bg-[#1a2238] border border-[rgba(148,163,184,0.12)] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {isCustom ? customName || 'Custom Target' : selectedTarget.name}
                </h3>
                <div className="flex items-center gap-4 text-xs text-[#8e9aaf]">
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-[#10B981]" /> Excellent
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-[#34D399]" /> Good
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-[#F59E0B]" /> Fair
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-[#EF4444]" /> Poor
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {visibility.map((month) => (
                  <div key={month.month} className="flex items-center gap-3">
                    <span className="text-xs font-medium w-8 text-right text-[#8e9aaf]">
                      {month.monthName}
                    </span>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1 h-8 bg-[#0a0f1a] rounded-lg overflow-hidden relative">
                        <div
                          className={`h-full ${getScoreColor(month.score)} transition-all duration-500`}
                          style={{ width: `${month.score}%` }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow">
                          {month.score}
                        </span>
                      </div>
                      <div className="w-24 text-xs text-[#8e9aaf]">
                        {month.bestAltitude.toFixed(0)}° max
                      </div>
                      <div className="w-20 text-xs text-[#8e9aaf]">
                        {month.visibilityHours.toFixed(1)}h
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Detailed Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#1a2238] border border-[rgba(148,163,184,0.12)] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-[#3b82f6]" />
                  <span className="text-sm font-medium">Best Months</span>
                </div>
                <div className="space-y-1">
                  {visibility
                    .filter(m => m.score >= 60)
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 3)
                    .map(m => (
                      <div key={m.month} className="flex items-center justify-between text-sm">
                        <span className="text-[#e8eaf6]">{MONTHS[m.month]}</span>
                        <span className={`text-xs font-medium ${getScoreColor(m.score).replace('bg-', 'text-')}`}>
                          {getScoreText(m.score)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="bg-[#1a2238] border border-[rgba(148,163,184,0.12)] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Thermometer className="w-4 h-4 text-[#F59E0B]" />
                  <span className="text-sm font-medium">Visibility Window</span>
                </div>
                <div className="space-y-1">
                  {(() => {
                    const goodMonths = visibility.filter(m => m.score >= 40);
                    if (goodMonths.length === 0) return <p className="text-xs text-[#8e9aaf]">Not visible this year</p>;
                    const first = MONTHS[goodMonths[0].month];
                    const last = MONTHS[goodMonths[goodMonths.length - 1].month];
                    return (
                      <>
                        <p className="text-sm text-[#e8eaf6]">{first} — {last}</p>
                        <p className="text-xs text-[#8e9aaf]">{goodMonths.length} months with good visibility</p>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="bg-[#1a2238] border border-[rgba(148,163,184,0.12)] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-[#10B981]" />
                  <span className="text-sm font-medium">Average Stats</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#8e9aaf]">Avg Max Alt</span>
                    <span className="text-[#e8eaf6] font-mono">
                      {(visibility.reduce((s, m) => s + m.bestAltitude, 0) / visibility.length).toFixed(1)}°
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8e9aaf]">Avg Visibility</span>
                    <span className="text-[#e8eaf6] font-mono">
                      {(visibility.reduce((s, m) => s + m.visibilityHours, 0) / visibility.length).toFixed(1)}h
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8e9aaf]">Overall Score</span>
                    <span className="text-[#e8eaf6] font-mono">
                      {Math.round(visibility.reduce((s, m) => s + m.score, 0) / visibility.length)}/100
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NovaYearlyHeatmapView;
