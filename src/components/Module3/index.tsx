import React from 'react';
import { Module3Dashboard } from './Module3Dashboard';

/**
 * Wrapper avec export default pour lazy loading.
 */
const Module3View: React.FC = () => {
  return <Module3Dashboard focalLength={500} sensorWidth={23.5} sensorHeight={15.6} lat={43.7889} lon={4.7533} />;
};

export default Module3View;
