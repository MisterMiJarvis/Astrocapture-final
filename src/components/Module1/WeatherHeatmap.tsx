// ============================================================================
// COMPOSANT: WeatherHeatmap — Heatmap hebdomadaire nuit astro
// Module 1 — Dashboard Central
// ============================================================================

import React, { useMemo } from 'react';
import { WeeklyWeatherDay, HourlyWeather } from '../../types/module1';

interface WeatherHeatmapProps {
  weeklyData: WeeklyWeatherDay[];
  hourlyData: HourlyWeather[];
  nightStartHour?: number; // default 20
  nightEndHour?: number;   // default 5
}

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const HOURS_NIGHT = [20, 21, 22, 23, 0, 1, 2, 3, 4, 5];

function scoreToColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-emerald-300';
  if (score >= 40) return 'bg-yellow-400';
  if (score >= 20) return 'bg-orange-400';
  return 'bg-red-500';
}

function scoreToText(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Bon';
  if (score >= 40) return 'Moyen';
  if (score >= 20) return 'Faible';
  return 'Mauvais';
}

export const WeatherHeatmap: React.FC<WeatherHeatmapProps> = ({
  weeklyData,
  hourlyData,
  nightStartHour = 20,
  nightEndHour = 5,
}) => {
  const heatmapGrid = useMemo(() => {
    const grid: { hour: number; dayIndex: number; score: number; data: HourlyWeather | null }[][] = [];

    for (const hour of HOURS_NIGHT) {
      const row: { hour: number; dayIndex: number; score: number; data: HourlyWeather | null }[] = [];
      for (let dayIndex = 0; dayIndex < weeklyData.length; dayIndex++) {
        const dayHourly = hourlyData.filter(h => {
          const d = new Date(h.time);
          const dayMatch = weeklyData[dayIndex] && d.toDateString() === new Date(weeklyData[dayIndex].date).toDateString();
          const hourMatch = d.getHours() === hour || (hour === 0 && d.getHours() === 0);
          return dayMatch && hourMatch;
        });

        const best = dayHourly.length > 0
          ? dayHourly.reduce((max, h) => h.astroIndex > max.astroIndex ? h : max, dayHourly[0])
          : null;

        row.push({
          hour,
          dayIndex,
          score: best?.astroIndex ?? 0,
          data: best,
        });
      }
      grid.push(row);
    }

    return grid;
  }, [hourlyData, weeklyData]);

  return (
    <div className="rounded-lg bg-white dark:bg-slate-900 p-4 shadow-sm border border-slate-200 dark:border-slate-700">
      <h3 className="text-lg font-semibold mb-3 text-slate-800 dark:text-slate-100">
        Heatmap Météo Astro (7 nuits)
      </h3>

      <div className="overflow-x-auto">
        <div className="min-w-[500px]">
          {/* Header jours */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-1 mb-1">
            <div className="text-xs text-slate-500">Heure</div>
            {weeklyData.map((day, i) => (
              <div key={i} className="text-center text-xs font-medium text-slate-700 dark:text-slate-300">
                {DAYS[i % 7]}
                <div className="text-[10px] text-slate-400">
                  {new Date(day.date).getDate()}/{new Date(day.date).getMonth() + 1}
                </div>
              </div>
            ))}
          </div>

          {/* Grid heures */}
          {heatmapGrid.map((row, rowIdx) => (
            <div key={rowIdx} className="grid grid-cols-[60px_repeat(7,1fr)] gap-1 mb-1">
              <div className="text-xs text-slate-500 flex items-center">
                {String(row[0]?.hour ?? HOURS_NIGHT[rowIdx]).padStart(2, '0')}h
              </div>
              {row.map((cell, colIdx) => (
                <div
                  key={colIdx}
                  className={`
                    h-8 rounded cursor-pointer transition-all hover:scale-105 hover:ring-2 hover:ring-slate-400
                    ${scoreToColor(cell.score)}
                    ${cell.score >= 70 ? 'ring-1 ring-emerald-600' : ''}
                  `}
                  title={cell.data
                    ? `${String(cell.hour).padStart(2, '0')}h — ${scoreToText(cell.score)} (${cell.score}/100)\n` +
                      `Nuages: ${cell.data.cloudTotal}% | Vent: ${cell.data.windSpeed}km/h | Rosée: ${cell.data.dewRisk}`
                    : 'Pas de données'}
                />
              ))}
            </div>
          ))}

          {/* Légende */}
          <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
            <span>Légende :</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-emerald-500"></div>
              <span>≥80</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-emerald-300"></div>
              <span>60-79</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-yellow-400"></div>
              <span>40-59</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-orange-400"></div>
              <span>20-39</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-500"></div>
              <span>&lt;20</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeatherHeatmap;
