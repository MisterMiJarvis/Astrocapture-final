import React, { useState, useEffect, useCallback } from 'react';
import { DashboardKPIsView } from './DashboardKPIs';
import { NightExplorer } from './NightExplorer';
import { NovaRankList } from './NovaRankList';
import { WeatherHeatmap } from './WeatherHeatmap';
import { ProjectCard } from './ProjectManager';
import { AstroNightMode } from './AstroNightMode';
import { AstroTarget } from '../../types/module1';
import { FilterType } from '../../types/module5';
import { RigProfile } from '../../types/module2';
import { getAllProfiles, getActiveProfileId } from '../../services/module2/rigProfileService';

/**
 * Module 1 — Dashboard Central & Exploration
 * v2: Wired with rig profiles, best targets, dynamic filters
 */
const Module1Dashboard: React.FC = () => {
  const [rigs, setRigs] = useState<RigProfile[]>([]);
  const [activeRig, setActiveRig] = useState<RigProfile | null>(null);
  const [targets, setTargets] = useState<AstroTarget[]>([]);
  const [loading, setLoading] = useState(true);

  const availableFilters: FilterType[] = ['Ha', 'OIII', 'SII', 'L_Ultimate', 'UV_IR_Cut', 'RGB', 'Luminance'];

  useEffect(() => {
    async function loadRigs() {
      try {
        const profiles = await getAllProfiles();
        setRigs(profiles);
        const activeId = getActiveProfileId();
        if (activeId) {
          const active = profiles.find(p => p.id === activeId);
          if (active) setActiveRig(active);
        } else if (profiles.length > 0) {
          setActiveRig(profiles.find(p => p.isDefault) || profiles[0]);
        }
      } catch (err) {
        console.error('Failed to load rig profiles:', err);
      } finally {
        setLoading(false);
      }
    }
    loadRigs();
  }, []);

  const handleTargetSelect = useCallback((target: AstroTarget) => {
    console.log('Selected target:', target.name, target);
  }, []);

  return (
    <div className="space-y-6 p-4">
      <header>
        <h2 className="text-2xl font-bold">Module 1 — Dashboard & Exploration</h2>
        <p className="text-gray-500">Vue d'ensemble, classement des cibles, météo et exploration nocturne</p>
      </header>
      <DashboardKPIsView kpis={undefined} />
      <WeatherHeatmap weeklyData={[]} hourlyData={[]} />
      <NovaRankList
        targets={targets}
        onTargetSelect={handleTargetSelect}
        availableFilters={availableFilters}
        rigs={rigs}
        activeRig={activeRig}
        lat={43.7889}
        lon={4.7533}
        moonData={{ phase: 0.3, altitude: 30, raDeg: 0, decDeg: 0 }}
      />
      <NightExplorer suggestions={[]} />
      <ProjectCard />
      <AstroNightMode />
    </div>
  );
};

export default Module1Dashboard;