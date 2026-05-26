import React, { useState, useRef } from 'react';
import { FileText, Upload, BarChart3, Trash2, Download, Clock, Star, AlertTriangle, CheckCircle } from 'lucide-react';
import { parsePHD2Log, parseASIAIRLog, PHD2LogEntry, ASIAIRLogEntry } from '../services/novaService';

interface LogAnalysis {
  type: 'phd2' | 'asiair' | 'unknown';
  entries: PHD2LogEntry[] | ASIAIRLogEntry[];
  summary: any;
  rawContent: string;
}

const NovaLogAnalyzerView: React.FC = () => {
  const [analyses, setAnalyses] = useState<LogAnalysis[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const detectLogType = (content: string): 'phd2' | 'asiair' | 'unknown' => {
    if (content.includes('PHD2') || content.includes('RMS') || content.includes('pixel scale')) {
      return 'phd2';
    }
    if (content.includes('ASIAIR') || content.includes('Exposure') || content.includes('ZWO')) {
      return 'asiair';
    }
    return 'unknown';
  };

  const processLog = (content: string, filename: string) => {
    const type = detectLogType(content);
    
    if (type === 'phd2') {
      const result = parsePHD2Log(content);
      setAnalyses(prev => [...prev, {
        type: 'phd2',
        entries: result.entries,
        summary: result.summary,
        rawContent: content,
      }]);
    } else if (type === 'asiair') {
      const result = parseASIAIRLog(content);
      setAnalyses(prev => [...prev, {
        type: 'asiair',
        entries: result.entries,
        summary: result.summary,
        rawContent: content,
      }]);
    } else {
      // Try both parsers
      const phd2Result = parsePHD2Log(content);
      if (phd2Result.entries.length > 0) {
        setAnalyses(prev => [...prev, {
          type: 'phd2',
          entries: phd2Result.entries,
          summary: phd2Result.summary,
          rawContent: content,
        }]);
      } else {
        const asiairResult = parseASIAIRLog(content);
        setAnalyses(prev => [...prev, {
          type: 'asiair',
          entries: asiairResult.entries,
          summary: asiairResult.summary,
          rawContent: content,
        }]);
      }
    }
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        processLog(content, file.name);
      };
      reader.readAsText(file);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const removeAnalysis = (index: number) => {
    setAnalyses(prev => prev.filter((_, i) => i !== index));
  };

  const getGuidingGrade = (rms: number): { label: string; color: string } => {
    if (rms < 0.5) return { label: 'Excellent', color: 'text-[#10B981]' };
    if (rms < 1.0) return { label: 'Good', color: 'text-[#34D399]' };
    if (rms < 2.0) return { label: 'Fair', color: 'text-[#F59E0B]' };
    return { label: 'Poor', color: 'text-[#EF4444]' };
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-[#e8eaf6] p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#3b82f6]" /> Log Analyzer
          </h2>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-[#3b82f6] text-white rounded-lg font-medium hover:bg-[#60A5FA] transition-colors"
          >
            <Upload className="w-4 h-4" /> Upload Logs
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.log,.csv"
            multiple
            onChange={e => handleFileUpload(e.target.files)}
            className="hidden"
          />
        </div>

        {/* Drop Zone */}
        {analyses.length === 0 && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
              isDragging
                ? 'border-[#3b82f6] bg-[rgba(59,130,246,0.05)]'
                : 'border-[rgba(148,163,184,0.12)] bg-[#1a2238]'
            }`}
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-[#8e9aaf]" />
            <p className="text-[#e8eaf6] font-medium mb-2">Drop log files here</p>
            <p className="text-sm text-[#8e9aaf]">Supports PHD2 and ASIAIR logs (.txt, .log, .csv)</p>
          </div>
        )}

        {/* Analyses */}
        <div className="space-y-6">
          {analyses.map((analysis, idx) => (
            <div key={idx} className="bg-[#1a2238] border border-[rgba(148,163,184,0.12)] rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-[rgba(148,163,184,0.08)]">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    analysis.type === 'phd2' ? 'bg-[#3b82f6]/20' : 'bg-[#10B981]/20'
                  }`}>
                    {analysis.type === 'phd2' ? (
                      <Star className="w-4 h-4 text-[#3b82f6]" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-[#10B981]" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-[#e8eaf6]">
                      {analysis.type === 'phd2' ? 'PHD2 Guiding Log' : 'ASIAIR Session Log'}
                    </div>
                    <div className="text-xs text-[#8e9aaf]">
                      {analysis.entries.length} entries
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => removeAnalysis(idx)}
                  className="p-2 rounded-lg text-[#8e9aaf] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {analysis.type === 'phd2' && (
                <PHD2Analysis analysis={analysis} />
              )}
              {analysis.type === 'asiair' && (
                <ASIAIRAnalysis analysis={analysis} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const PHD2Analysis: React.FC<{ analysis: LogAnalysis }> = ({ analysis }) => {
  const summary = analysis.summary;
  const grade = getGuidingGrade(summary.avgTotalRms);
  const entries = analysis.entries as PHD2LogEntry[];

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#0a0f1a] rounded-lg p-3 text-center">
          <div className={`text-2xl font-bold ${grade.color}`}>{summary.avgTotalRms.toFixed(2)}″</div>
          <div className="text-xs text-[#8e9aaf]">Avg RMS</div>
        </div>
        <div className="bg-[#0a0f1a] rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-[#10B981]">{summary.bestRms.toFixed(2)}″</div>
          <div className="text-xs text-[#8e9aaf]">Best RMS</div>
        </div>
        <div className="bg-[#0a0f1a] rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-[#EF4444]">{summary.worstRms.toFixed(2)}″</div>
          <div className="text-xs text-[#8e9aaf]">Worst RMS</div>
        </div>
        <div className="bg-[#0a0f1a] rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-[#3b82f6]">{Math.round(summary.totalDuration)}m</div>
          <div className="text-xs text-[#8e9aaf]">Duration</div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-[#8e9aaf]">RA RMS:</span>
        <span className="font-mono text-[#e8eaf6]">{summary.avgRaRms.toFixed(2)}″</span>
        <span className="text-[#8e9aaf] ml-4">Dec RMS:</span>
        <span className="font-mono text-[#e8eaf6]">{summary.avgDecRms.toFixed(2)}″</span>
        <span className={`ml-auto px-2 py-0.5 rounded text-xs font-medium ${grade.color} bg-opacity-20`}>
          {grade.label}
        </span>
      </div>

      {/* RMS Chart */}
      <div className="bg-[#0a0f1a] rounded-lg p-4">
        <h4 className="text-xs font-medium text-[#8e9aaf] mb-3">RMS Over Time</h4>
        <div className="h-32 flex items-end gap-px">
          {entries.slice(0, 100).map((entry, i) => {
            const maxRms = Math.max(...entries.slice(0, 100).map(e => e.totalRms));
            const height = maxRms > 0 ? (entry.totalRms / maxRms) * 100 : 0;
            return (
              <div
                key={i}
                className="flex-1 bg-[#3b82f6] rounded-t-sm transition-all hover:bg-[#60A5FA]"
                style={{ height: `${height}%`, minWidth: '2px' }}
                title={`${entry.totalRms.toFixed(2)}″ at ${entry.timestamp}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

const ASIAIRAnalysis: React.FC<{ analysis: LogAnalysis }> = ({ analysis }) => {
  const summary = analysis.summary;
  const entries = analysis.entries as ASIAIRLogEntry[];

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#0a0f1a] rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-[#3b82f6]">{summary.totalExposures}</div>
          <div className="text-xs text-[#8e9aaf]">Exposures</div>
        </div>
        <div className="bg-[#0a0f1a] rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-[#10B981]">{summary.totalIntegrationMinutes.toFixed(1)}h</div>
          <div className="text-xs text-[#8e9aaf]">Integration</div>
        </div>
        <div className="bg-[#0a0f1a] rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-[#F59E0B]">{Object.keys(summary.filterBreakdown).length}</div>
          <div className="text-xs text-[#8e9aaf]">Filters</div>
        </div>
        <div className="bg-[#0a0f1a] rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-[#EF4444]">{summary.errorCount}</div>
          <div className="text-xs text-[#8e9aaf]">Errors</div>
        </div>
      </div>

      {/* Filter Breakdown */}
      {Object.keys(summary.filterBreakdown).length > 0 && (
        <div className="bg-[#0a0f1a] rounded-lg p-4">
          <h4 className="text-xs font-medium text-[#8e9aaf] mb-3">Filter Breakdown</h4>
          <div className="space-y-2">
            {Object.entries(summary.filterBreakdown).map(([filter, minutes]) => (
              <div key={filter} className="flex items-center gap-3">
                <span className="text-xs font-medium w-12">{filter}</span>
                <div className="flex-1 bg-[#1a2238] rounded-full h-4 overflow-hidden">
                  <div
                    className="h-full bg-[#3b82f6] rounded-full transition-all"
                    style={{
                      width: `${(minutes / summary.totalIntegrationMinutes) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-[#8e9aaf] w-16 text-right">
                  {(minutes / 60).toFixed(1)}h
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Target Breakdown */}
      {Object.keys(summary.targetBreakdown).length > 0 && (
        <div className="bg-[#0a0f1a] rounded-lg p-4">
          <h4 className="text-xs font-medium text-[#8e9aaf] mb-3">Targets</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(summary.targetBreakdown).map(([target, count]) => (
              <span key={target} className="px-2 py-1 rounded-md text-xs bg-[#1a2238] text-[#8e9aaf] border border-[rgba(148,163,184,0.12)]">
                {target}: {count}x
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

function getGuidingGrade(rms: number): { label: string; color: string } {
  if (rms < 0.5) return { label: 'Excellent', color: 'text-[#10B981]' };
  if (rms < 1.0) return { label: 'Good', color: 'text-[#34D399]' };
  if (rms < 2.0) return { label: 'Fair', color: 'text-[#F59E0B]' };
  return { label: 'Poor', color: 'text-[#EF4444]' };
}

export default NovaLogAnalyzerView;
