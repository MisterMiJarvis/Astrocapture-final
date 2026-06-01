import React, { useState, useEffect, useCallback } from 'react';
import { RigProfile } from '../../types/module2';
import {
  getAllProfiles,
  getActiveProfileId,
  setActiveProfileId,
  createProfile,
  updateProfile,
  deleteProfile,
  duplicateProfile,
  calculateRigCalculations,
  getSamplingRecommendation,
  ACTIVE_PROFILE_KEY,
} from '../../services/module2/rigProfileService';
import { RigProfileForm } from './RigProfileForm';
import { SamplingDisplay } from './SamplingDisplay';
import { GuidingSetupForm } from './GuidingSetupForm';
import { HorizonMaskUploader } from './HorizonMaskUploader';

type Tab = 'profiles' | 'sampling' | 'guiding' | 'horizon';

export const Module2Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('profiles');
  const [profiles, setProfiles] = useState<RigProfile[]>([]);
  const [activeProfileId, setActiveProfileIdState] = useState<string | null>(null);
  const [activeProfile, setActiveProfile] = useState<RigProfile | null>(null);
  const [calculations, setCalculations] = useState<ReturnType<typeof calculateRigCalculations> | null>(null);
  const [samplingRec, setSamplingRec] = useState<ReturnType<typeof getSamplingRecommendation> | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);


  // Reload profiles from API and refresh state
  const reloadProfiles = useCallback(async () => {
    const loadedProfiles = await getAllProfiles();
    setProfiles(loadedProfiles);
    return loadedProfiles;
  }, []);

  // Charger les profils au mount
  useEffect(() => {
    (async () => {
      try {
        const loadedProfiles = await getAllProfiles();
        setProfiles(loadedProfiles);

        const savedActiveId = getActiveProfileId();
        if (savedActiveId) {
          const profile = loadedProfiles.find(p => p.id === savedActiveId);
          if (profile) {
            setActiveProfileIdState(savedActiveId);
            setActiveProfile(profile);
          } else {
            // Active ID no longer exists in DB — pick first available
            localStorage.removeItem(ACTIVE_PROFILE_KEY);
            const first = loadedProfiles[0];
            setActiveProfileIdState(first.id);
            setActiveProfile(first);
            setActiveProfileId(first.id);
          }
        } else {
          const defaultProfile = loadedProfiles.find(p => p.isDefault) || loadedProfiles[0];
          if (defaultProfile) {
            setActiveProfileIdState(defaultProfile.id);
            setActiveProfile(defaultProfile);
            setActiveProfileId(defaultProfile.id);
          }
        }
      } catch (err) {
        console.error('Failed to load rig profiles:', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Recalculer quand le profil actif change
  useEffect(() => {
    if (activeProfile) {
      const calc = calculateRigCalculations(activeProfile);
      setCalculations(calc);
      setSamplingRec(getSamplingRecommendation(calc.pixelScale));
    }
  }, [activeProfile]);

  const handleProfileChange = (profileId: string) => {
    const profile = profiles.find(p => p.id === profileId);
    if (profile) {
      setActiveProfileIdState(profileId);
      setActiveProfile(profile);
      setActiveProfileId(profileId);
      setIsEditing(false);
    }
  };

  const handleCreateProfile = async (name: string, data: Partial<RigProfile>) => {
    const newProfile = await createProfile({
      name,
      telescope: data.telescope || {
        name: '', focalLength: 0, aperture: 0, fRatio: 0, type: 'Refractor',
      },
      modifier: data.modifier || { type: 'None', factor: 1.0 },
      camera: data.camera || {
        name: '', sensorWidth: 0, sensorHeight: 0, pixelSize: 0,
        resolutionX: 0, resolutionY: 0, readNoise: 0, quantumEfficiency: 0,
        isColor: true, hasCooling: false, binningAcquisition: 1,
      },
      guiding: data.guiding || {
        cameraName: '', pixelSize: 0, binning: 1, mode: 'GuideScope',
      },
      mount: data.mount || {
        name: '', type: 'EQ', maxPayload: 0,
      },
    });

    const updatedProfiles = await reloadProfiles();
    setActiveProfileIdState(newProfile.id);
    setActiveProfile(newProfile);
    setActiveProfileId(newProfile.id);
    setIsEditing(false);
  };

  const handleUpdateProfile = async (id: string, data: Partial<RigProfile>) => {
    const updated = await updateProfile(id, {
      name: data.name,
      isDefault: data.isDefault,
      telescope: data.telescope,
      modifier: data.modifier,
      camera: data.camera,
      guiding: data.guiding,
      mount: data.mount,
    });
    if (updated) {
      const updatedProfiles = await reloadProfiles();
      setActiveProfile(updated);
    }
  };

  const handleDeleteProfile = async (id: string) => {
    if (profiles.length <= 1) {
      alert('Impossible de supprimer le dernier profil.');
      return;
    }
    if (confirm('Supprimer ce profil ?')) {
      await deleteProfile(id);
      const remaining = await reloadProfiles();
      const newActive = remaining.find(p => p.isDefault) || remaining[0];
      if (newActive) {
        setActiveProfileIdState(newActive.id);
        setActiveProfile(newActive);
        setActiveProfileId(newActive.id);
      }
    }
  };

  const handleDuplicateProfile = async (id: string) => {
    const duplicated = await duplicateProfile(id);
    if (duplicated) {
      const updatedProfiles = await reloadProfiles();
      setActiveProfileIdState(duplicated.id);
      setActiveProfile(duplicated);
      setActiveProfileId(duplicated.id);
    }
  };



  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-slate-400">Chargement des profils...</div>
      </div>
    );
  }

  const TAB_CONFIG: { id: Tab; label: string; icon: string }[] = [
    { id: 'profiles', label: 'Profils de Rigs', icon: '🔭' },
    { id: 'sampling', label: 'Échantillonnage', icon: '📐' },
    { id: 'guiding', label: 'Guidage', icon: '🎯' },
    { id: 'horizon', label: 'Masque d\'horizon', icon: '🏔️' },
  ];

  return (
    <div className="space-y-6 p-4 max-w-7xl mx-auto">
      {/* Header */}
      <header>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          🔭 Equipment, Sampling & Dithering
        </h2>
        <p className="text-slate-500 mt-1">
          Manage your rigs, calculate sampling and configure guiding
        </p>
      </header>



      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700">
        {TAB_CONFIG.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === 'profiles' && (
          <div className="space-y-4">
            {/* Profile Selector */}
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={activeProfileId || ''}
                onChange={e => handleProfileChange(e.target.value)}
                className="px-3 py-2 rounded border border-slate-300 dark:border-slate-600 
                           bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
              >
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.isDefault && '(défaut)'}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-3 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
              >
                {isEditing ? 'Annuler' : '✏️ Modifier'}
              </button>

              <button
                onClick={() => activeProfile && handleDuplicateProfile(activeProfile.id)}
                className="px-3 py-2 rounded bg-slate-600 text-white text-sm hover:bg-slate-700"
                disabled={!activeProfile}
              >
                📄 Dupliquer
              </button>

              <button
                onClick={() => activeProfile && handleDeleteProfile(activeProfile.id)}
                className="px-3 py-2 rounded bg-red-600 text-white text-sm hover:bg-red-700"
                disabled={!activeProfile || profiles.length <= 1}
              >
                🗑️ Supprimer
              </button>
            </div>



            {/* Profile Form */}
            {activeProfile && (
              <RigProfileForm
                profile={activeProfile}
                isEditing={isEditing}
                onSave={handleUpdateProfile}
              />
            )}
          </div>
        )}

        {activeTab === 'sampling' && calculations && samplingRec && (
          <SamplingDisplay
            pixelScale={calculations.pixelScale}
            fovWidth={calculations.fovWidth}
            fovHeight={calculations.fovHeight}
            recommendation={samplingRec}
          />
        )}

        {activeTab === 'guiding' && activeProfile && calculations && (
          <GuidingSetupForm
            profile={activeProfile}
            calculations={calculations}
            onUpdate={(data) => handleUpdateProfile(activeProfile.id, data)}
          />
        )}

        {activeTab === 'horizon' && (
          <HorizonMaskUploader />
        )}
      </div>
    </div>
  );
};

export default Module2Dashboard;