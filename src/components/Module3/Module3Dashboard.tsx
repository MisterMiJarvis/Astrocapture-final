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
 * Dashboard du Module 3 — Cadrage & Mosaïques.
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
    <div className="space-y-6 p-4">
      <header>
        <h2 className="text-2xl font-bold">Module 3 — Cadrage & Mosaïques</h2>
        <p className="text-gray-500">
          Recherche multi-catalogue, framing Aladin, et planification mosaïque
        </p>
      </header>

      <section className="p-4 bg-white rounded-lg border">
        <TargetSearch onSelectTarget={setTarget} lat={lat} lon={lon} />
      </section>

      {target && (
        <>
          <section className="p-4 bg-white rounded-lg border">
            <AladinFramer
              target={target}
              focalLength={focalLength}
              sensorWidth={sensorWidth}
              sensorHeight={sensorHeight}
              rotationAngle={rotationAngle}
              onRotationChange={setRotationAngle}
            />
          </section>

          <section className="p-4 bg-white rounded-lg border">
            <MosaicPlanner
              target={target}
              focalLength={focalLength}
              sensorWidth={sensorWidth}
              sensorHeight={sensorHeight}
            />
          </section>
        </>
      )}
    </div>
  );
};
