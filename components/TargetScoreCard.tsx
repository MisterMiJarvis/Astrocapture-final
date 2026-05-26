import React from 'react';
import { TargetScore } from '../services/targetScorer';
import { Star, Moon, Clock, Maximize, Eye, ChevronRight } from 'lucide-react';

interface TargetScoreCardProps {
  score: TargetScore;
  rank: number;
}

export const TargetScoreCard: React.FC<TargetScoreCardProps> = ({ score, rank }) => {
  const { totalScore, percentage, details, recommendation } = score;

  const getScoreColor = (pct: number) => {
    if (pct >= 80) return 'text-green-400';
    if (pct >= 60) return 'text-yellow-400';
    if (pct >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreBg = (pct: number) => {
    if (pct >= 80) return 'bg-green-500/20 border-green-500/30';
    if (pct >= 60) return 'bg-yellow-500/20 border-yellow-500/30';
    if (pct >= 40) return 'bg-orange-500/20 border-orange-500/30';
    return 'bg-red-500/20 border-red-500/30';
  };

  return (
    <div className={"rounded-lg border p-4 " + getScoreBg(percentage) + " transition-all hover:scale-[1.02]"}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-text-secondary">#{rank}</span>
          <div>
            <div className={"text-3xl font-bold " + getScoreColor(percentage)}>
              {totalScore}
              <span className="text-lg text-text-secondary">/110</span>
            </div>
            <div className="text-sm text-text-secondary">{Math.round(percentage)}% match</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-text">{recommendation}</div>
        </div>
      </div>

      {/* Score breakdown */}
      <div className="grid grid-cols-5 gap-2 mt-4">
        <ScoreMetric 
          icon={<Eye className="w-4 h-4" />}
          label="Altitude"
          value={`${details.altitude.value}°`}
          score={details.altitude.score}
          max={details.altitude.max}
        />
        <ScoreMetric
          icon={<Clock className="w-4 h-4" />}
          label="Window"
          value={`${details.imagingWindow.hours}h`}
          score={details.imagingWindow.score}
          max={details.imagingWindow.max}
        />
        <ScoreMetric
          icon={<Maximize className="w-4 h-4" />}
          label="FOV Fit"
          value={`${details.fovFit.ratio}%`}
          score={details.fovFit.score}
          max={details.fovFit.max}
        />
        <ScoreMetric
          icon={<Moon className="w-4 h-4" />}
          label="Moon"
          value={`${details.moonPenalty.separation}°`}
          score={details.moonPenalty.score}
          max={details.moonPenalty.max}
        />
        <ScoreMetric
          icon={<Star className="w-4 h-4" />}
          label="Mag"
          value={`${details.brightness.magnitude}`}
          score={details.brightness.score}
          max={details.brightness.max}
        />
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="h-2 bg-surface-light rounded-full overflow-hidden">
          <div 
            className={"h-full rounded-full transition-all duration-500 " + (
              percentage >= 80 ? 'bg-green-400' : 
              percentage >= 60 ? 'bg-yellow-400' : 
              percentage >= 40 ? 'bg-orange-400' : 'bg-red-400'
            )}
            style={{ width: percentage + '%' }}
          />
        </div>
      </div>
    </div>
  );
};

const ScoreMetric: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  score: number;
  max: number;
}> = ({ icon, label, value, score, max }) => (
  <div className="flex flex-col items-center text-center">
    <div className="text-text-secondary mb-1">{icon}</div>
    <div className="text-xs text-text-secondary uppercase">{label}</div>
    <div className="text-sm font-bold text-text">{value}</div>
    <div className={"text-xs font-medium " + (
      score >= max * 0.8 ? 'text-green-400' : 
      score >= max * 0.5 ? 'text-yellow-400' : 'text-orange-400'
    )}>
      {score}/{max}
    </div>
  </div>
);

export default TargetScoreCard;
