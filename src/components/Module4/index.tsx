import React from 'react';
import { MultiNightPlanner } from './MultiNightPlanner';
import { YearlyHeatmap } from './YearlyHeatmap';
import { PlanExporter } from './PlanExporter';

/**
 * Module 4 — Planification Temporelle
 */
const Module4Dashboard: React.FC = () => {
  return (
    <div className="space-y-6 p-4">
      <header>
        <h2 className="text-2xl font-bold">Module 4 — Planification Temporelle</h2>
        <p className="text-gray-500">Planification multi-nuits, heatmap annuelle et export</p>
      </header>
      <MultiNightPlanner />
      <YearlyHeatmap />
      <PlanExporter />
    </div>
  );
};

export default Module4Dashboard;
