import React, { useState, useEffect } from 'react';
import { SQMDisplay, ExposureCalculator } from '../src/components/Module5';
import { SQMDynamicModel } from '../src/types/module5';
import { computeEnvironmentConditions } from '../src/services/module5/sqmService';

interface RigData {
  aperture: number;
  focalLength: number;
  pixelSize: number;
  quantumEfficiency: number;
  readNoise: number;
}

const DEFAULT_RIG: RigData = {
  aperture: 102,
  focalLength: 714,
  pixelSize: 3.76,
  quantumEfficiency: 0.8,
  readNoise: 1.5,
};

const DEFAULT_SQM: SQMDynamicModel = {
  sqmBase: 21.5,
  sqmEffective: 20.8,
  moonPhase: 0.25,
  moonAltitude: 30,
  moonAzimuth: 120,
  targetMoonSeparation: 45,
  bortleScale: 4,
  degradation: 0.7,
};

const AplsModule5View: React.FC = () => {
  const [rigProfile, setRigProfile] = useState<RigData>(DEFAULT_RIG);
  const [sqmModel, setSqmModel] = useState<SQMDynamicModel>(DEFAULT_SQM);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const token = localStorage.getItem('astrosuite_token');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        // Load rig profile from API
        const rigRes = await fetch('/api/apls/rigs', { headers });
        if (rigRes.ok) {
          const rigs = await rigRes.json();
          if (rigs && rigs.length > 0) {
            // Use first rig (or active/default)
            const rig = rigs[0];
            setRigProfile({
              aperture: rig.telescope?.aperture || DEFAULT_RIG.aperture,
              focalLength: rig.telescope?.focalLength || DEFAULT_RIG.focalLength,
              pixelSize: rig.imagingCamera?.pixelSize || rig.camera?.pixelSize || DEFAULT_RIG.pixelSize,
              quantumEfficiency: (rig.imagingCamera?.quantumEfficiency || rig.camera?.quantumEfficiency || DEFAULT_RIG.quantumEfficiency) / 100,
              readNoise: rig.imagingCamera?.readNoise || rig.camera?.readNoise || DEFAULT_RIG.readNoise,
            });
          }
        }

        // Compute SQM from real weather/moon data
        // Using St-Étienne-du-Grès coordinates and a generic target
        const lat = 43.79;
        const lon = 4.74;
        const result = await computeEnvironmentConditions(21.5, 0, 0, lat, lon, 22); // hour 22 = 10pm
        if (result) {
          setSqmModel(result.conditions.sqm);
        }
      } catch (err) {
        console.error('Failed to load Module 5 data:', err);
        setError('Could not load rig/environment data. Using defaults.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        <span className="ml-3 text-gray-400">Loading environment data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <header>
        <h2 className="text-2xl font-bold">Module 5 — Environment & Exposure</h2>
      </header>
      {error && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-4 py-2 text-sm text-yellow-400">
          {error}
        </div>
      )}
      <SQMDisplay sqmModel={sqmModel} />
      <ExposureCalculator rigProfile={rigProfile} sqmModel={sqmModel} />
    </div>
  );
};

export default AplsModule5View;
