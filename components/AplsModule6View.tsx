import React from 'react';
import ProjectDetailView from '../src/components/Module6/ProjectDetailView';

const mockProject = {
  id: 'proj_1',
  targetName: 'M31 Andromeda',
  targetRa: '00h 42m 44s',
  targetDec: '+41° 16\' 09"',
  priority: 'high',
  status: 'in_progress',
  progress: 65,
  capturedIntegrationTime: 6.5,
  targetIntegrationTime: 10,
  filterPlans: [{
    filter: 'Ha',
    targetSubs: 60,
    capturedSubs: 40,
    targetTotalTime: 300,
    capturedTime: 200,
    isComplete: false,
  }],
  sessions: [{
    id: 'sess_1',
    date: new Date('2026-05-20'),
    startTime: new Date('2026-05-20T22:00:00'),
    endTime: new Date('2026-05-21T02:00:00'),
    status: 'completed',
    totalIntegrationTime: 240,
    imagesCount: 40,
    guidingRMS: 0.85,
    notes: 'Session test',
  }],
  notes: 'Projet exemple M31',
};

const AplsModule6View: React.FC = () => {
  return <ProjectDetailView project={mockProject} />;
};

export default AplsModule6View;
