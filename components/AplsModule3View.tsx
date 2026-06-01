import React, { useState, useEffect } from 'react';
import AladinFramer from '../src/components/Module3';

const AplsModule3View: React.FC = () => {
  const [rig, setRig] = useState({
    focalLength: 714,
    sensorWidth: 11.3,
    sensorHeight: 11.3,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRig() {
      try {
        const token = localStorage.getItem('astrosuite_token');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/apls/rigs', { headers });
        if (res.ok) {
          const rigs = await res.json();
          if (rigs && rigs.length > 0) {
            const r = rigs.find((rig: any) => rig.isDefault) || rigs[0];
            setRig({
              focalLength: r.telescope?.focalLength || 714,
              sensorWidth: r.imagingCamera?.sensorWidth || r.camera?.sensorWidth || 11.3,
              sensorHeight: r.imagingCamera?.sensorHeight || r.camera?.sensorHeight || 11.3,
            });
          }
        }
      } catch (err) {
        console.error('Failed to load rig for Module 3:', err);
      } finally {
        setLoading(false);
      }
    }
    loadRig();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        <span className="ml-3 text-gray-400">Loading equipment data...</span>
      </div>
    );
  }

  return (
    <AladinFramer
      target={null}
      focalLength={rig.focalLength}
      sensorWidth={rig.sensorWidth}
      sensorHeight={rig.sensorHeight}
      rotationAngle={0}
      onRotationChange={() => {}}
    />
  );
};

export default AplsModule3View;
