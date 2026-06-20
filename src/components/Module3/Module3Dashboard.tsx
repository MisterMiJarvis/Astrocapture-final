import React, { useState } from 'react';
import { CatalogTarget } from '../../types/module3';
import { TargetSearch } from './TargetSearch';
import { AladinFramer } from './AladinFramer';
import { MosaicPlanner } from './MosaicPlanner';

interface Module3DashboardProps {
  focalLength: number;
  sensorWidth: number;
  sensorHeight: number;
  lat?: number;
  lon?: number;
}

/**
 * Dashboard du Module 3 — Framing & Mosaics
 */
export const Module3Dashboard: React.FC<Module3DashboardProps> = ({
  focalLength,
  sensorWidth,
  sensorHeight,
  lat,
  lon,
}) => {
  const [target, setTarget] = useState<CatalogTarget | null>(null);
  const [rotationAngle, setRotationAngle] = useState(0);

  return (
    <div className="space-y-6">
      <div className="py-4 text-center border-b border-border">
        <h1 className="text-3xl font-display font-bold">🎯 Framing & Mosaics</h1>
        <p className="mt-2 text-text-secondary">
          Target search, Aladin framing, and mosaic planning
        </p>
      </div>

      <section className="bg-surface border border-border rounded-xl p-4">
        <TargetSearch onSelectTarget={setTarget} lat={lat} lon={lon} />
      </section>

      {target && (
        <>
          <section className="bg-surface border border-border rounded-xl p-4">
            <AladinFramer
              target={target}
              focalLength={focalLength}
              sensorWidth={sensorWidth}
              sensorHeight={sensorHeight}
              rotationAngle={rotationAngle}
              onRotationChange={setRotationAngle}
            />
          </section>

          <section className="bg-surface border border-border rounded-xl p-4">
            <MosaicPlanner
              target={target}
              focalLength={focalLength}
              sensorWidth={sensorWidth}
              sensorHeight={sensorHeight}
            />
          </section>
        </>
      )}

      {!target && (
        <div className="bg-surface border border-border rounded-xl p-12 text-center">
          <div className="text-6xl mb-4">🔭</div>
          <h3 className="text-lg font-semibold text-text">Search for a target</h3>
          <p className="text-text-secondary mt-2">
            Search for a deep sky object above to start framing and planning your mosaic.
          </p>
        </div>
      )}
    </div>
  );
};