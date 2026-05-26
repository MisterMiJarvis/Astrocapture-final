// ============================================================================
// COMPOSANT: PlanExporter — Export NINA / ASIAIR / CSV
// Module 4 — Planification Temporelle
// ============================================================================

import React, { useState } from 'react';
import { MultiNightPlan } from '../../types/module4';

interface PlanExporterProps {
  plan: MultiNightPlan;
  onExport?: (format: 'nina_json' | 'asiair_json' | 'csv_generic', nightIndex?: number) => string;
}

export const PlanExporter: React.FC<PlanExporterProps> = ({ plan, onExport }) => {
  const [selectedFormat, setSelectedFormat] = useState<'nina_json' | 'asiair_json' | 'csv_generic'>('nina_json');
  const [selectedNight, setSelectedNight] = useState<number | 'all'>('all');
  const [exported, setExported] = useState<string | null>(null);

  const handleExport = () => {
    const content = onExport?.(selectedFormat, selectedNight === 'all' ? undefined : selectedNight);
    if (content) {
      setExported(content);
      // Auto-download
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `plan_${plan.targetName}_${selectedFormat}.${selectedFormat === 'csv_generic' ? 'csv' : 'json'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="rounded-lg bg-white dark:bg-slate-900 p-4 shadow-sm border border-slate-200 dark:border-slate-700">
      <h3 className="text-lg font-semibold mb-3 text-slate-800 dark:text-slate-100">
        📤 Export Séquenceur
      </h3>

      <div className="space-y-3">
        {/* Format */}
        <div>
          <label className="text-sm text-slate-500 mb-1 block">Format</label>
          <div className="flex gap-2">
            {[
              { id: 'nina_json' as const, label: 'N.I.N.A.', icon: '🔵' },
              { id: 'asiair_json' as const, label: 'ASIAIR', icon: '🟣' },
              { id: 'csv_generic' as const, label: 'CSV', icon: '📄' },
            ].map(fmt => (
              <button
                key={fmt.id}
                onClick={() => setSelectedFormat(fmt.id)}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm transition-all
                  ${selectedFormat === fmt.id
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}
                `}
              >
                <span>{fmt.icon}</span>
                <span>{fmt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Night selection */}
        <div>
          <label className="text-sm text-slate-500 mb-1 block">Nuit</label>
          <select
            value={selectedNight}
            onChange={e => setSelectedNight(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="w-full text-sm border rounded px-3 py-2 bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
          >
            <option value="all">Toutes les nuits ({plan.nights.length})</option>
            {plan.nights.map((night, i) => (
              <option key={i} value={i}>
                Nuit {i + 1}: {night.date.toLocaleDateString('fr-FR')}
                {night.isVisible ? ` (${night.hoursAboveHorizon.toFixed(1)}h)` : ' (non visible)'}
              </option>
            ))}
          </select>
        </div>

        {/* Preview */}
        {exported && (
          <div className="mt-3">
            <label className="text-sm text-slate-500 mb-1 block">Aperçu</label>
            <pre className="text-xs bg-slate-100 dark:bg-slate-800 p-3 rounded overflow-auto max-h-48
                           text-slate-700 dark:text-slate-300">
              {exported.slice(0, 500)}{exported.length > 500 && '...'}
            </pre>
          </div>
        )}

        {/* Actions */}
        <button
          onClick={handleExport}
          className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium
                     transition-colors flex items-center justify-center gap-2"
        >
          📥 Télécharger {selectedFormat === 'nina_json' ? 'NINA' : selectedFormat === 'asiair_json' ? 'ASIAIR' : 'CSV'}
        </button>
      </div>
    </div>
  );
};

export default PlanExporter;
