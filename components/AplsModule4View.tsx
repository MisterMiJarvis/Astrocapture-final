import React, { useState, useEffect } from 'react';
import ObservationPlannerView from './ObservationPlannerView';
import MultiNightPlanner from '../src/components/Module4/MultiNightPlanner';
import { AstroEquipment } from '../types';
import { Target, Calendar } from 'lucide-react';

type PlannerSubTab = 'wishlist' | 'timeline';

interface AplsModule4ViewProps {
  equipment?: AstroEquipment[];
}

const mockPlan = {
  targetName: 'M42 Orion',
  nights: [{
    date: new Date(),
    isVisible: true,
    hoursAboveHorizon: 5.5,
    transitTime: new Date('2026-05-27T02:00:00'),
    sunset: new Date('2026-05-27T21:00:00'),
    sunrise: new Date('2026-05-27T06:00:00'),
    meridianFlipTime: new Date('2026-05-27T02:00:00'),
    astroDusk: new Date('2026-05-27T22:30:00'),
    astroDawn: new Date('2026-05-27T04:30:00'),
    imagingWindow: [{
      type: 'imaging' as const,
      start: new Date('2026-05-27T22:30:00'),
      end: new Date('2026-05-27T04:30:00'),
      label: 'Imaging',
    }],
  }],
};

const AplsModule4View: React.FC<AplsModule4ViewProps> = ({ equipment: propEquipment }) => {
  const [subTab, setSubTab] = useState<PlannerSubTab>('wishlist');
  const [equipment, setEquipment] = useState<AstroEquipment[]>(propEquipment || []);
  const [isLoadingEquipment, setIsLoadingEquipment] = useState(false);

  useEffect(() => {
    if (propEquipment && propEquipment.length > 0) {
      setEquipment(propEquipment);
      return;
    }
    setIsLoadingEquipment(true);
    fetch('/api/equipment?personal=true')
      .then(res => res.json())
      .then(data => {
        setEquipment(Array.isArray(data) ? data : []);
      })
      .catch(() => setEquipment([]))
      .finally(() => setIsLoadingEquipment(false));
  }, [propEquipment]);

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setSubTab('wishlist')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            subTab === 'wishlist'
              ? 'bg-primary text-white'
              : 'bg-surface border border-border text-text-secondary hover:bg-surface-light'
          }`}
        >
          <Target size={14} /> Targets & Plan
        </button>
        <button
          onClick={() => setSubTab('timeline')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            subTab === 'timeline'
              ? 'bg-primary text-white'
              : 'bg-surface border border-border text-text-secondary hover:bg-surface-light'
          }`}
        >
          <Calendar size={14} /> Multi-Night Timeline
        </button>
      </div>

      {/* Content */}
      {subTab === 'wishlist' && (
        <ObservationPlannerView equipment={equipment} />
      )}
      {subTab === 'timeline' && (
        <MultiNightPlanner plan={mockPlan} />
      )}
    </div>
  );
};

export default AplsModule4View;