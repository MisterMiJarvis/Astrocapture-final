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
      <DashboardKPIsView />
      <WeatherHeatmap />
      <NovaRankList />
      <NightExplorer />
      <ProjectCard />
      <AstroNightMode />
    </div>
  );
};

export default Module1Dashboard;
