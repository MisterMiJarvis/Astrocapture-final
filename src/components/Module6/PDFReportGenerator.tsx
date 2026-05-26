// ============================================================================
// COMPOSANT: PDFReportGenerator — Rapports session et projet historique
// Module 6 — Projets, Logs & Analyse
// ============================================================================

import React, { useState } from 'react';
import { PDFReportRequest, PHD2Log, NINALog } from '../../types/module6';

interface PDFReportGeneratorProps {
  sessionId?: string;
  projectId?: string;
  phd2Log?: PHD2Log;
  ninaLog?: NINALog;
  onGenerate?: (request: PDFReportRequest) => Promise<{ url: string; pages: number }>;
}

export const PDFReportGenerator: React.FC<PDFReportGeneratorProps> = ({
  sessionId,
  projectId,
  phd2Log,
  ninaLog,
  onGenerate,
}) => {
  const [config, setConfig] = useState<PDFReportRequest>({
    sessionId,
    projectId,
    type: sessionId ? 'session' : projectId ? 'project' : 'historical',
    includeGuiding: true,
    includeWeather: true,
    includeTimeline: true,
    includeGallery: false,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{ url: string; pages: number } | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await onGenerate?.(config);
      if (res) setResult(res);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="rounded-lg bg-white dark:bg-slate-900 p-4 shadow-sm border border-slate-200 dark:border-slate-700">
      <h3 className="text-lg font-semibold mb-3 text-slate-800 dark:text-slate-100">
        📄 Générateur de Rapport PDF
      </h3>

      <div className="space-y-3">
        {/* Type */}
        <div>
          <label className="text-sm text-slate-500 mb-1 block">Type de rapport</label>
          <select
            value={config.type}
            onChange={e => setConfig({ ...config, type: e.target.value as any })}
            className="w-full text-sm border rounded px-3 py-2 bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
          >
            {sessionId && <option value="session">📸 Rapport de Session</option>}
            {projectId && <option value="project">🎯 Rapport de Projet</option>}
            <option value="historical">📚 Rapport Historique</option>
          </select>
        </div>

        {/* Sections */}
        <div>
          <label className="text-sm text-slate-500 mb-1 block">Sections à inclure</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'includeGuiding' as const, label: '🎯 Guidage', enabled: !!phd2Log },
              { key: 'includeWeather' as const, label: '🌤️ Météo', enabled: true },
              { key: 'includeTimeline' as const, label: '⏱️ Timeline', enabled: !!ninaLog },
              { key: 'includeGallery' as const, label: '🖼️ Galerie', enabled: false },
            ].map(section => (
              <label
                key={section.key}
                className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-all
                  ${!section.enabled ? 'opacity-50 cursor-not-allowed border-slate-100' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}
                `}
              >
                <input
                  type="checkbox"
                  checked={config[section.key]}
                  disabled={!section.enabled}
                  onChange={e => setConfig({ ...config, [section.key]: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-slate-700 dark:text-slate-200">{section.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Generate */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300
                     text-white font-medium transition-colors flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              Génération...
            </>
          ) : (
            <>📄 Générer le PDF</>
          )}
        </button>

        {/* Result */}
        {result && (
          <div className="mt-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
            <div className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
              ✅ Rapport généré ({result.pages} pages)
            </div>
            <a
              href={result.url}
              download
              className="text-sm text-blue-500 hover:text-blue-600 underline mt-1 inline-block"
            >
              Télécharger le PDF
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFReportGenerator;
