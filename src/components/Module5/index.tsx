import React from 'react';
import { Module5Dashboard } from './Module5Dashboard';

const sqmModel = {
  sqmBase: 21.5,
  sqmEffective: 21.2,
  degradation: 0.3,
  bortleScale: 3,
  moonPhase: 0.2,
  moonAltitude: -10,
  targetMoonSeparation: 120,
};

const conditions = {
  temperature: 15,
  humidity: 60,
  windSpeed: 5,
  cloudCover: 0,
  seeing: 1.5,
};

const rigProfile = {
  aperture: 80,
  focalLength: 500,
  pixelSize: 3.76,
  quantumEfficiency: 0.8,
  readNoise: 1.5,
};

/**
 * Module 5 — Environnement & Exposition
 */
const Module5View: React.FC = () => {
  return (
    <div className="p-4">
      <Module5Dashboard sqmModel={sqmModel} conditions={conditions} rigProfile={rigProfile} />
    </div>
  );
};

export default Module5View;
