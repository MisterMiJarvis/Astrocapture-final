import React from 'react';
import { DashboardKPIsView } from './DashboardKPIs';
import { NightExplorer } from './NightExplorer';
import { NovaRankList } from './NovaRankList';
import { WeatherHeatmap } from './WeatherHeatmap';
import { ProjectCard } from './ProjectManager';
import { AstroNightMode } from './AstroNightMode';

/**
 * Module 1 — Dashboard Central & Exploration
 */
const Module1Dashboard: React.FC = () => {
  return (
    <div className="space-y-6 p-4">
      <header>
        <h2 className="text-2xl font-bold">Module 1 — Dashboard & Exploration</h2>
        <p className="text-gray-500">Vue d'ensemble, classement des cibles, météo et exploration nocturne</p>
      </header>
      <DashboardKPIsView kpis={undefined} />
      <WeatherHeatmap weeklyData={[]} hourlyData={[]} />
      <div className="rounded-lg bg-white dark:bg-slate-900 p-4 shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold mb-3 text-slate-800 dark:text-slate-100">🔭 Nova Rank</h3>
        <p className="text-sm text-slate-500">Aucune cible disponible.</p>
      </div>
      <NightExplorer suggestions={[]} />
      <ProjectCard />
      <AstroNightMode />
    </div>
  );
};

export default Module1Dashboard;
