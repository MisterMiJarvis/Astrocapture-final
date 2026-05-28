import React from 'react';
import AladinFramer from '../src/components/Module3';

const AplsModule3View: React.FC = () => {
  const target = {
    id: 'm42',
    catalogName: 'M42 Orion Nebula',
    ra: '05h 35m 17.3s',
    dec: '-05° 23\' 28"',
    raDeg: 83.8221,
    decDeg: -5.3911,
  };

  return (
    <AladinFramer
      target={target}
      focalLength={714}
      sensorWidth={11.3}
      sensorHeight={11.3}
      rotationAngle={0}
      onRotationChange={() => {}}
    />
  );
};

export default AplsModule3View;
