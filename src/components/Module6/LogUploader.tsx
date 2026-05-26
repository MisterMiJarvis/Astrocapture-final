// ============================================================================
// COMPOSANT: LogUploader — Upload PHD2 / NINA / ASIAIR
// Module 6 — Projets, Logs & Analyse
// ============================================================================

import React, { useState, useCallback } from 'react';
import { parsePHD2Log, parseNINALog, generateGuidingSummary } from '../../services/module6/logParserService';
import { PHD2Log, NINALog } from '../../types/module6';

interface LogUploaderProps {
  onPHD2Parsed?: (log: PHD2Log) => void;
  onNINAParsed?: (log: NINALog) => void;
  pixelScaleImaging?: number;
}

type UploadType = 'phd2' | 'nina' | 'asiair';

export const LogUploader: React.FC<LogUploaderProps> = ({
  onPHD2Parsed,
  onNINAParsed,
  pixelScaleImaging = 1.09,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadType, setUploadType] = useState<UploadType>('phd2');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setSuccess(null);

    try {
      const content = await file.text();

      if (uploadType === 'phd2') {
        const log = parsePHD2Log(content, file.name, pixelScaleImaging);
        const summary = generateGuidingSummary(log);
        onPHD2Parsed?.(log);
        setSuccess(
          `PHD2 parsé: RMS ${summary.rmsTotalArcsec.toFixed(2)}" (${summary.quality}) • ${summary.durationMinutes}min • ${summary.ditherCount} dithers`
        );
      } else {
        const log = parseNINALog(content, file.name);
        onNINAParsed?.(log);
        setSuccess(
          `${uploadType === 'nina' ? 'NINA' : 'ASIAIR'} parsé: ${log.timeline.length} événements • ${log.autofocusRuns.length} autofocus • ${log.ditherEvents.length} dithers`
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de parsing');
    }
  }, [uploadType, pixelScaleImaging, onPHD2Parsed, onNINAParsed]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="rounded-lg bg-white dark:bg-slate-900 p-4 shadow-sm border border-slate-200 dark:border-slate-700">
      <h3 className="text-lg font-semibold mb-3 text-slate-800 dark:text-slate-100">
        📥 Import Logs
      </h3>

      {/* Type selector */}
      <div className="flex gap-2 mb-3">
        {([
          { id: 'phd2' as UploadType, label: '🎯 PHD2', desc: 'Guidage RMS' },
          { id: 'nina' as UploadType, label: '🔵 N.I.N.A.', desc: 'Timeline + Autofocus' },
          { id: 'asiair' as UploadType, label: '🟣 ASIAIR', desc: 'Séquence' },
        ]).map(type => (
          <button
            key={type.id}
            onClick={() => setUploadType(type.id)}
            className={`flex-1 p-2 rounded-lg border text-sm transition-all
              ${uploadType === type.id
                ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}
            `}
          >
            <div className="font-medium">{type.label}</div>
            <div className="text-[10px] text-slate-400">{type.desc}</div>
          </button>
        ))}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer
          ${isDragging
            ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/10'
            : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'}
        `}
      >
        <input
          type="file"
          accept=".txt,.log,.json,.csv"
          onChange={onFileInput}
          className="hidden"
          id="log-upload"
        />
        <label htmlFor="log-upload" className="cursor-pointer">
          <div className="text-3xl mb-2">📁</div>
          <div className="text-sm text-slate-600 dark:text-slate-300">
            Glissez un fichier ou cliquez pour sélectionner
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {uploadType === 'phd2' ? '.txt, .log (PHD2)' : '.json, .csv (NINA/ASIAIR)'}
          </div>
        </label>
      </div>

      {/* Messages */}
      {error && (
        <div className="mt-3 p-2 rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-sm">
          ❌ {error}
        </div>
      )}
      {success && (
        <div className="mt-3 p-2 rounded bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-300 text-sm">
          ✅ {success}
        </div>
      )}
    </div>
  );
};

export default LogUploader;
