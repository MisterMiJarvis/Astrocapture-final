import React, { useState, useEffect } from 'react';
import { RigProfile } from '../../types/module2';
import {
  getAllProfiles,
  getProfileById,
  getActiveProfileId,
  setActiveProfileId,
  createProfile,
  updateProfile,
  deleteProfile,
  duplicateProfile,
  calculateRigCalculations,
  getSamplingRecommendation,
  getAllPresets,
  getPresetsByCategory,
  EquipmentPreset,
  FULL_RIG_PRESETS,
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
  const [showPresetPicker, setShowPresetPicker] = useState(false);
  const [presetCategory, setPresetCategory] = useState<EquipmentPreset['category'] | 'full-rig'>('full-rig');

  // Charger les profils au mount
  useEffect(() => {
    const loadedProfiles = getAllProfiles();
    setProfiles(loadedProfiles);
    
    const savedActiveId = getActiveProfileId();
    if (savedActiveId) {
      const profile = getProfileById(savedActiveId);
      if (profile) {
        setActiveProfileIdState(savedActiveId);
        setActiveProfile(profile);
      } else {
        // Profil supprimé, prendre le défaut
        const defaultProfile = loadedProfiles.find(p => p.isDefault) || loadedProfiles[0];
        setActiveProfileIdState(defaultProfile.id);
        setActiveProfile(defaultProfile);
        setActiveProfileId(defaultProfile.id);
      }
    } else {
      const defaultProfile = loadedProfiles.find(p => p.isDefault) || loadedProfiles[0];
      if (defaultProfile) {
        setActiveProfileIdState(defaultProfile.id);
        setActiveProfile(defaultProfile);
        setActiveProfileId(defaultProfile.id);
      }
    }
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
    const profile = getProfileById(profileId);
    if (profile) {
      setActiveProfileIdState(profileId);
      setActiveProfile(profile);
      setActiveProfileId(profileId);
      setIsEditing(false);
    }
  };

  const handleCreateProfile = (name: string, data: Partial<RigProfile>) => {
    const newProfile = createProfile({
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
    
    setProfiles(getAllProfiles());
    setActiveProfileIdState(newProfile.id);
    setActiveProfile(newProfile);
    setActiveProfileId(newProfile.id);
    setIsEditing(false);
    setShowPresetPicker(false);
  };

  const handleUpdateProfile = (id: string, data: Partial<RigProfile>) => {
    const updated = updateProfile(id, {
      telescope: data.telescope,
      modifier: data.modifier,
      camera: data.camera,
      guiding: data.guiding,
      mount: data.mount,
    });
    if (updated) {
      setProfiles(getAllProfiles());
      setActiveProfile(updated);
    }
  };

  const handleDeleteProfile = (id: string) => {
    if (profiles.length <= 1) {
      alert('Impossible de supprimer le dernier profil.');
      return;
    }
    if (confirm('Supprimer ce profil ?')) {
      deleteProfile(id);
      const remaining = getAllProfiles();
      setProfiles(remaining);
      const newActive = remaining.find(p => p.isDefault) || remaining[0];
      if (newActive) {
        setActiveProfileIdState(newActive.id);
        setActiveProfile(newActive);
        setActiveProfileId(newActive.id);
      }
    }
  };

  const handleDuplicateProfile = (id: string) => {
    const duplicated = duplicateProfile(id);
    if (duplicated) {
      setProfiles(getAllProfiles());
      setActiveProfileIdState(duplicated.id);
      setActiveProfile(duplicated);
      setActiveProfileId(duplicated.id);
    }
  };

  const handleApplyPreset = (preset: EquipmentPreset) => {
    if (preset.category === 'full-rig') {
      // Créer un nouveau profil complet
      handleCreateProfile(preset.name, preset.data);
    } else {
      // Fusionner avec le profil actif
      if (activeProfile) {
        const updated = { ...activeProfile };
        if (preset.data.telescope) updated.telescope = preset.data.telescope;
        if (preset.data.modifier) updated.modifier = preset.data.modifier;
        if (preset.data.camera) updated.camera = preset.data.camera;
        if (preset.data.guiding) updated.guiding = preset.data.guiding;
        if (preset.data.mount) updated.mount = preset.data.mount;
        
        handleUpdateProfile(activeProfile.id, updated);
      }
    }
    setShowPresetPicker(false);
  };

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
          🔭 Module 2 — Équipement, Échantillonnage & Guidage
        </h2>
        <p className="text-slate-500 mt-1">
          Gérez vos profils de rigs, calculez l'échantillonnage et configurez le guidage
        </p>
      </header>

      {/* Summary Card */}
      {calculations && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800 text-white p-4 rounded-lg">
            <div className="text-2xl font-bold">{calculations.pixelScale}"</div>
            <div className="text-xs text-slate-400">/pixel</div>
          </div>
          <div className="bg-slate-800 text-white p-4 rounded-lg">
            <div className="text-2xl font-bold">{calculations.fovWidth}'×{calculations.fovHeight}'</div>
            <div className="text-xs text-slate-400">FOV</div>
          </div>
          <div className="bg-slate-800 text-white p-4 rounded-lg">
            <div className="text-2xl font-bold">{calculations.effectiveFocalLength}mm</div>
            <div className="text-xs text-slate-400">Focale eff.</div>
          </div>
          <div className="bg-slate-800 text-white p-4 rounded-lg">
            <div className="text-2xl font-bold">f/{calculations.fRatio}</div>
            <div className="text-xs text-slate-400">f/D</div>
          </div>
        </div>
      )}

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
                onClick={() => setShowPresetPicker(true)}
                className="px-3 py-2 rounded bg-emerald-600 text-white text-sm hover:bg-emerald-700"
              >
                📋 Presets
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

            {/* Preset Picker Modal */}
            {showPresetPicker && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-slate-900 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-auto">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">📋 Configuration Presets</h3>
                    <button
                      onClick={() => setShowPresetPicker(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="flex gap-2 mb-4">
                    {[
                      { key: 'full-rig', label: 'Rigs complets' },
                      { key: 'telescope', label: 'Télescopes' },
                      { key: 'camera', label: 'Caméras' },
                      { key: 'guiding', label: 'Guidage' },
                      { key: 'mount', label: 'Montures' },
                    ].map(cat => (
                      <button
                        key={cat.key}
                        onClick={() => setPresetCategory(cat.key as any)}
                        className={`px-3 py-1 rounded text-sm ${
                          presetCategory === cat.key
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {getPresetsByCategory(presetCategory === 'full-rig' ? 'full-rig' : presetCategory).map(preset => (
                      <button
                        key={preset.id}
                        onClick={() => handleApplyPreset(preset)}
                        className="text-left p-3 rounded border border-slate-200 dark:border-slate-700 
                                   hover:border-blue-400 dark:hover:border-blue-500 
                                   bg-slate-50 dark:bg-slate-800/50 transition-all"
                      >
                        <div className="font-medium text-slate-800 dark:text-slate-100">{preset.name}</div>
                        <div className="text-xs text-slate-500 mt-1">{preset.description}</div>
                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                          {preset.category === 'full-rig' ? 'Créer un nouveau profil' : 'Appliquer au profil actif'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

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
