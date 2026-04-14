import React from 'react';
import { NightlyForecast } from '../types';
import { Moon, Cloud, CloudRain, Wind, Star, Calendar } from 'lucide-react';

interface NightlyForecastViewProps {
  forecast: NightlyForecast[];
  isLoading: boolean;
  error: string | null;
  onSelectDate: (date: Date) => void;
  selectedDate: Date;
}

export const NightlyForecastView: React.FC<NightlyForecastViewProps> = ({ forecast, isLoading, error, onSelectDate, selectedDate }) => {
  if (isLoading) return <div className="text-center py-8 text-text-secondary">Loading 14-day forecast...</div>;
  if (error) return <div className="text-center py-8 text-red-400">{error}</div>;
  if (!forecast || forecast.length === 0) return null;

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getDate() === d2.getDate() && 
           d1.getMonth() === d2.getMonth() && 
           d1.getFullYear() === d2.getFullYear();
  };

  const getConditionColor = (condition: string, isSelected: boolean) => {
    if (isSelected) return 'bg-primary text-white border-primary shadow-lg ring-2 ring-primary ring-offset-2 ring-offset-background';
    
    switch (condition) {
      case 'Excellent': return 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30 cursor-pointer';
      case 'Good': return 'bg-lime-500/20 text-lime-400 border-lime-500/30 hover:bg-lime-500/30 cursor-pointer';
      case 'Fair': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30 cursor-pointer';
      case 'Poor': return 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30 cursor-pointer';
      default: return 'bg-surface text-text-secondary border-border hover:bg-surface/80 cursor-pointer';
    }
  };

  const getConditionIcon = (summary: string) => {
    if (summary.includes('Rain')) return <CloudRain size={20} />;
    if (summary.includes('Cloud') || summary.includes('cloud')) return <Cloud size={20} />;
    if (summary.includes('Wind')) return <Wind size={20} />;
    return <Star size={20} />;
  };

  return (
    <div className="bg-surface border border-border rounded-lg p-6 space-y-6">
      <h2 className="font-display font-bold text-lg flex items-center gap-2">
        <Calendar size={18} /> 14-Night Stargazing Outlook
      </h2>
      <p className="text-sm text-text-secondary -mt-4">Select a night to view detailed hourly forecast.</p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {forecast.map((night, index) => {
          const isSelected = isSameDay(night.date, selectedDate);
          return (
            <div 
              key={index} 
              onClick={() => onSelectDate(night.date)}
              className={`p-4 rounded-lg border flex flex-col gap-3 transition-all hover:scale-[1.02] ${getConditionColor(night.condition, isSelected)}`}
            >
              <div className="flex justify-between items-start">
                <span className="font-mono font-bold text-sm">
                  {night.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
                {getConditionIcon(night.summary)}
              </div>
              
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wider opacity-80">{night.summary}</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold">{Math.round(night.minTemp)}°</span>
                  <span className="text-xs opacity-70">/ {Math.round(night.maxTemp)}°C</span>
                </div>
              </div>

              <div className="mt-auto pt-3 border-t border-current/10 flex justify-between items-center text-xs">
                <div className="flex items-center gap-1" title="Moon Phase">
                  <Moon size={12} />
                  <span className="truncate max-w-[60px]">{night.moonPhase}</span>
                </div>
                <div className="font-bold px-2 py-0.5 rounded-full bg-black/20">
                  {night.condition}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
