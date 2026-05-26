import React, { useState, useMemo } from 'react';
import { MosaicPlan, MosaicRequest, CatalogTarget } from '../../types/module3';
import { calculateMosaicPlan, exportMosaic, calculateFOV } from '../../services/module3/framingService';

interface MosaicPlannerProps {
  target: CatalogTarget;
  focalLength: number;
  sensorWidth: number;
  sensorHeight: number;
}

/**
 * Planification de mosaïque N×M avec export CSV.
 */
export const MosaicPlanner: React.FC<MosaicPlannerProps> = ({
  target,
  focalLength,
  sensorWidth,
  sensorHeight,
}) => {
  const [rows, setRows] = useState(2);
  const [columns, setColumns] = useState(2);
  const [overlap, setOverlap] = useState(15);
  const [exportFormat, setExportFormat] = useState<'nina_csv' | 'asiair_csv' | 'generic_csv'>('nina_csv');

  const fov = useMemo(
    () => calculateFOV(sensorWidth, sensorHeight, focalLength),
    [sensorWidth, sensorHeight, focalLength]
  );

  const plan: MosaicPlan | null = useMemo(() => {
    if (rows < 1 || columns < 1) return null;

    const request: MosaicRequest = {
      targetId: target.id,
      targetName: target.catalogName,
      raDeg: target.raDeg,
      decDeg: target.decDeg,
      rows,
      columns,
      overlapPercent: overlap,
      fovWidth: fov.widthArcmin,
      fovHeight: fov.heightArcmin,
      exportFormat,
    };

    return calculateMosaicPlan(request);
  }, [target, rows, columns, overlap, fov, exportFormat]);

  const handleExport = () => {
    if (!plan) return;
    const content = exportMosaic(plan, exportFormat);
    const blob = new Blob([content], {
      type: exportFormat === 'asiair_csv' ? 'application/json' : 'text/csv',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${target.catalogName}_mosaic_${rows}x${columns}.${exportFormat === 'asiair_csv' ? 'json' : 'csv'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <h4 className="font-semibold">Plan de Mosaïque</h4>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm">Lignes (N)</label>
          <input
            type="number"
            min={1}
            max={10}
            value={rows}
            onChange={(e) => setRows(Number(e.target.value))}
            className="block w-full rounded border-gray-300"
          />
        </div>
        <div>
          <label className="block text-sm">Colonnes (M)</label>
          <input
            type="number"
            min={1}
            max={10}
            value={columns}
            onChange={(e) => setColumns(Number(e.target.value))}
            className="block w-full rounded border-gray-300"
          />
        </div>
        <div>
          <label className="block text-sm">Recouvrement (%)</label>
          <input
            type="number"
            min={10}
            max={20}
            value={overlap}
            onChange={(e) => setOverlap(Number(e.target.value))}
            className="block w-full rounded border-gray-300"
          />
        </div>
        <div>
          <label className="block text-sm">Format</label>
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as any)}
            className="block w-full rounded border-gray-300"
          >
            <option value="nina_csv">N.I.N.A. CSV</option>
            <option value="asiair_csv">ASIAIR JSON</option>
            <option value="generic_csv">CSV Générique</option>
          </select>
        </div>
      </div>

      {plan && (
        <div className="space-y-3">
          <div className="p-3 bg-gray-50 rounded border text-sm space-y-1">
            <p>Total panneaux: <b>{plan.totalPanels}</b></p>
            <p>FOV par panneau: {plan.fovPerPanel.width.toFixed(2)}′ × {plan.fovPerPanel.height.toFixed(2)}′</p>
            <p>FOV total couvert: {plan.totalFov.width.toFixed(2)}′ × {plan.totalFov.height.toFixed(2)}′</p>
          </div>

          {/* Grille visuelle */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2">Panneau</th>
                  <th className="px-3 py-2">RA</th>
                  <th className="px-3 py-2">Dec</th>
                  <th className="px-3 py-2">Statut</th>
                </tr>
              </thead>
              <tbody>
                {plan.panels.map((panel) => (
                  <tr key={panel.id} className="border-b">
                    <td className="px-3 py-2 font-medium">{panel.id}</td>
                    <td className="px-3 py-2 font-mono">{panel.raDeg.toFixed(4)}°</td>
                    <td className="px-3 py-2 font-mono">{panel.decDeg.toFixed(4)}°</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        panel.isCompleted ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {panel.isCompleted ? '✓ Fait' : '⏳ En attente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleExport}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            📥 Exporter {exportFormat === 'asiair_csv' ? 'JSON' : 'CSV'}
          </button>
        </div>
      )}
    </div>
  );
};
