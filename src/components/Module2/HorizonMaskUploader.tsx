import React, { useState } from 'react';
import { HorizonMask, HorizonPoint } from '../../types/module2';

export const HorizonMaskUploader: React.FC = () => {
  const [mask, setMask] = useState<HorizonMask | null>(null);
  const [points, setPoints] = useState<HorizonPoint[]>([]);
  const [importError, setImportError] = useState<string | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = parseHorizonCSV(text);
        setPoints(parsed);
        setMask({
          id: `mask_${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          points: parsed,
          format: 'csv',
        });
        setImportError(null);
      } catch (err) {
        setImportError('Erreur de parsing CSV. Format attendu: Azimut,Altitude (degrés)');
      }
    };
    reader.readAsText(file);
  };

  const parseHorizonCSV = (text: string): HorizonPoint[] => {
    const lines = text.trim().split('\n');
    const points: HorizonPoint[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      const parts = trimmed.split(/[,;\t]/);
      if (parts.length >= 2) {
        const az = parseFloat(parts[0]);
        const alt = parseFloat(parts[1]);
        if (!isNaN(az) && !isNaN(alt)) {
          points.push({ azimuth: az, altitude: alt });
        }
      }
    }
    
    return points;
  };

  const handleAddPoint = () => {
    setPoints(prev => [...prev, { azimuth: 0, altitude: 0 }]);
  };

  const handleUpdatePoint = (index: number, field: keyof HorizonPoint, value: number) => {
    setPoints(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const handleRemovePoint = (index: number) => {
    setPoints(prev => prev.filter((_, i) => i !== index));
  };

  const handleExport = () => {
    if (points.length === 0) return;
    
    const csv = points.map(p => `${p.azimuth.toFixed(1)},${p.altitude.toFixed(1)}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mask?.name || 'horizon'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-100">
          🏔️ Masque d'horizon
        </h3>

        <div className="flex gap-3 mb-4">
          <label className="px-4 py-2 rounded bg-blue-600 text-white text-sm cursor-pointer hover:bg-blue-700">
            📁 Importer CSV
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <button
            onClick={handleAddPoint}
            className="px-4 py-2 rounded bg-emerald-600 text-white text-sm hover:bg-emerald-700"
          >
            ➕ Ajouter point
          </button>

          <button
            onClick={handleExport}
            disabled={points.length === 0}
            className="px-4 py-2 rounded bg-slate-600 text-white text-sm hover:bg-slate-700 
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            💾 Exporter CSV
          </button>
        </div>

        {importError && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded text-sm mb-4">
            {importError}
          </div>
        )}

        {/* Points Table */}
        {points.length > 0 && (
          <div className="overflow-auto max-h-96">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left px-2 py-2 text-slate-500">#</th>
                  <th className="text-left px-2 py-2 text-slate-500">Azimut (°)</th>
                  <th className="text-left px-2 py-2 text-slate-500">Altitude (°)</th>
                  <th className="text-left px-2 py-2 text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {points.map((point, index) => (
                  <tr key={index} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="px-2 py-2 text-slate-400">{index + 1}</td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        min="0"
                        max="360"
                        step="0.1"
                        value={point.azimuth}
                        onChange={e => handleUpdatePoint(index, 'azimuth', parseFloat(e.target.value) || 0)}
                        className="w-24 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 
                                   bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        min="0"
                        max="90"
                        step="0.1"
                        value={point.altitude}
                        onChange={e => handleUpdatePoint(index, 'altitude', parseFloat(e.target.value) || 0)}
                        className="w-24 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 
                                   bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <button
                        onClick={() => handleRemovePoint(index)}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {points.length === 0 && (
          <div className="text-center p-8 text-slate-400">
            📁 Importez un fichier CSV ou ajoutez des points manuellement.
            <br />
            <span className="text-xs">Format: Azimut,Altitude (degrés, une ligne par point)</span>
          </div>
        )}
      </div>
    </div>
  );
};
