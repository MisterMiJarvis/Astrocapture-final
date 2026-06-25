import React from 'react';
import {
  SQMDynamicModel,
  EnvironmentConditions,
} from '../../types/module5';
import { SQMDisplay, ExposureCalculator, ReducerImpactChart, SNRSimulator } from './Module5Components';

interface Module5DashboardProps {
  sqmModel: SQMDynamicModel;
  conditions: EnvironmentConditions;
  rigProfile: {
    aperture: number;
    focalLength: number;
    pixelSize: number;
    quantumEfficiency: number;
    readNoise: number;
  };
}

/**
 * Module 5 Dashboard — groups all environment & exposure components.
 */
export const Module5Dashboard: React.FC<Module5DashboardProps> = ({
  sqmModel,
  conditions,
  rigProfile,
}) => {
  return (
    <div className="space-y-6 p-4">
      <header>
        <h2 className="text-2xl font-bold">Module 5 — Environment & Exposure</h2>
        <p className="text-gray-500">
          SQM modeling, filters, exposure calculator and SNR simulator
        </p>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SQMDisplay sqmModel={sqmModel} />
        <ExposureCalculator rigProfile={rigProfile} sqmModel={sqmModel} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReducerImpactChart
          rigProfile={rigProfile}
          sqmModel={sqmModel}
          filterType="L_Ultimate"
          kFactor={5}
        />
        <SNRSimulator
          rigProfile={rigProfile}
          sqmModel={sqmModel}
          filterType="L_Ultimate"
        />
      </section>
    </div>
  );
};