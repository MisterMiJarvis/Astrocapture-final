import React, { useState, useEffect } from 'react';
import ObservationPlannerView from './ObservationPlannerView';
import MultiNightPlanner from '../src/components/Module4/MultiNightPlanner';
import { AstroEquipment } from '../types';
import { Target, Calendar } from 'lucide-react';

type PlannerSubTab = 'wishlist' | 'timeline';

interface AplsModule4ViewProps {
  equipment?: AstroEquipment[];
}

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
        <MultiNightPlanner plan={null as any} />
      )}
    </div>
  );
};

export default AplsModule4View;