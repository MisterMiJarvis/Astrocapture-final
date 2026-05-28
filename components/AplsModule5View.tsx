import React from 'react';
import { SQMDisplay, ExposureCalculator } from '../src/components/Module5';

const AplsModule5View: React.FC = () => {
  const sqmModel = {
    sqmBase: 21.5,
    sqmEffective: 20.8,
    moonPhase: 0.25,
    moonAltitude: 30,
    moonAzimuth: 120,
    targetMoonSeparation: 45,
    bortleScale: 4,
    degradation: 0.7,
  };

  const rigProfile = {
    aperture: 102,
    focalLength: 714,
    pixelSize: 3.76,
    quantumEfficiency: 0.8,
    readNoise: 1.5,
  };

  return (
    <div className="space-y-6 p-4">
      <header>
        <h2 className="text-2xl font-bold">Module 5 — Environnement & Exposition</h2>
      </header>
      <SQMDisplay sqmModel={sqmModel} />
      <ExposureCalculator rigProfile={rigProfile} sqmModel={sqmModel} />
    </div>
  );
};

export default AplsModule5View;
