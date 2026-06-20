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
import { HorizonMaskUploader } from './HorizonMaskUploader';
import { calculateDitherPixels } from '../../services/module2/rigProfileService';

// Guiding read-only: shows guiding info + dithering calculator, no camera input form
const GuidingReadonly: React.FC<{
  profile: RigProfile;
  calculations: ReturnType<typeof calculateRigCalculations>;
  samplingRec: ReturnType<typeof getSamplingRecommendation> | null;
}> = ({ profile, calculations, samplingRec }) => {
  const [ditherPixels, setDitherPixels] = useState(3);

  const guidingCalc = calculations.guidingPixelScale && calculations.guidingRatio !== undefined
    ? (() => {
        const ratio = calculations.guidingRatio;
        const isOAG = profile.guiding.mode === 'OAG';
        return {
          imagingScale: calculations.pixelScale,
          guidingScale: calculations.guidingPixelScale,
          ratio,
          isValid: isOAG ? true : ratio < 0.2,
          isOAG,
        };
      })()
    : null;

  const ditherResult = guidingCalc
    ? (() => {
        const guidePixels = calculateDitherPixels(ditherPixels, calculations.pixelScale, calculations.guidingPixelScale!);
        const physicalShift = ditherPixels * calculations.pixelScale;
        return { imaging: ditherPixels, guiding: guidePixels, physicalShift };
      })()
    : null;

  return (
    <div className="space-y-6">
      {/* Guiding info cards */}
      {profile.guiding.cameraName ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-800 text-white p-4 rounded-lg">
            <div className="text-sm text-slate-400">Guide camera</div>
            <div className="text-xl font-bold">{profile.guiding.cameraName}</div>
            <div className="text-xs text-slate-400 mt-1">{profile.guiding.pixelSize}μm • {profile.guiding.mode}</div>
          </div>
          {guidingCalc && (
            <div className={`p-4 rounded-lg ${guidingCalc.isValid ? 'bg-emerald-800 text-white' : 'bg-orange-800 text-white'}`}>
              <div className="text-sm text-white/70">Ratio</div>
              <div className="text-2xl font-bold">1:{Math.round(1 / guidingCalc.ratio)}</div>
              <div className="text-xs mt-1">
                {guidingCalc.isOAG
                  ? guidingCalc.isValid ? '✅ OAG — same optical path' : '⚠️ OAG — ratio too high'
                  : guidingCalc.isValid ? '✅ OK (< 1:5)' : '⚠️ Too high'}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-sm text-slate-500 p-4 bg-slate-50 dark:bg-slate-800/50 rounded">
          No guiding camera configured. Edit the rig to add one.
        </div>
      )}

      {/* Dither Calculator */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-100">
          🎲 Dithering Calculator
        </h3>

        {guidingCalc ? (
          <>
            {/* Dithering requirement status */}
            {samplingRec && (
              <div className={`mb-4 p-3 rounded-lg border-2 ${
                samplingRec.ditherRequired
                  ? samplingRec.ditherMinPixels > 3
                    ? 'bg-red-100 border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300'
                    : 'bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-300'
                  : 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300'
              }`}>
                {samplingRec.ditherRequired ? (
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{samplingRec.ditherMinPixels > 3 ? '⚠️' : '✅'}</span>
                    <div>
                      <div className="font-semibold">
                        Dithering required — min. {samplingRec.ditherMinPixels} px on imaging sensor
                      </div>
                      <div className="text-sm opacity-80">
                        {samplingRec.ditherMinPixels > 3
                          ? 'Aggressive dithering needed to reconstruct detail (undersampled setup)'
                          : 'Standard dithering to reject hot pixels and walking noise'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-lg">ℹ️</span>
                    <div>
                      <div className="font-semibold">Dithering not required</div>
                      <div className="text-sm opacity-80">Oversampled setup — binning recommended instead
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                <div className="text-xs text-slate-500">Imaging scale</div>
                <div className="text-lg font-bold text-slate-800 dark:text-slate-100">{guidingCalc.imagingScale}"/px</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                <div className="text-xs text-slate-500">Guiding scale</div>
                <div className="text-lg font-bold text-slate-800 dark:text-slate-100">{guidingCalc.guidingScale}"/px</div>
              </div>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1">
                <label className="block text-xs text-slate-500 mb-1">
                  Dither on imaging sensor (px)
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={ditherPixels}
                  onChange={e => setDitherPixels(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="text-center text-sm text-slate-600 mt-1">{ditherPixels} px</div>
              </div>
            </div>

            {ditherResult && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-center">
                    <div className="text-sm text-slate-500">Imaging sensor</div>
                    <div className="text-xl font-bold text-blue-700 dark:text-blue-300">{ditherResult.imaging} px</div>
                    <div className="text-xs text-slate-400">≈ {(ditherResult.imaging * calculations.pixelScale).toFixed(1)}" shift</div>
                  </div>

                  <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg text-center">
                    <div className="text-sm text-slate-500">Enter in PHD2/NINA</div>
                    <div className="text-xl font-bold text-purple-700 dark:text-purple-300">{ditherResult.guiding} px</div>
                    <div className="text-xs text-slate-400">Guiding dither value</div>
                  </div>

                  <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg text-center">
                    <div className="text-sm text-slate-500">Physical shift</div>
                    <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{ditherResult.physicalShift.toFixed(1)}"</div>
                    <div className="text-xs text-slate-400">arcsec on sky</div>
                  </div>
                </div>

                {/* Software settings */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <div className="font-medium text-slate-700 dark:text-slate-200 mb-2">PHD2</div>
                    <div className="text-sm text-slate-500 space-y-1">
                      <div>Dither amount: <strong>{ditherResult.guiding}</strong> px</div>
                      <div>Scale: <strong>1.0</strong></div>
                      <div>Settle {'<'} 1.5" for <strong>8</strong> px</div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <div className="font-medium text-slate-700 dark:text-slate-200 mb-2">N.I.N.A.</div>
                    <div className="text-sm text-slate-500 space-y-1">
                      <div>Dither pixels: <strong>{ditherResult.guiding}</strong></div>
                      <div>Dither mode: <strong>RA+Dec</strong></div>
                      <div>Settle time: <strong>8s</strong></div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <div className="font-medium text-slate-700 dark:text-slate-200 mb-2">ASIAIR</div>
                    <div className="text-sm text-slate-500 space-y-1">
                      <div>Dither: <strong>{ditherResult.guiding}</strong> px</div>
                      <div>Dither scale: <strong>1.0</strong></div>
                      <div>Max dither: <strong>{ditherResult.guiding * 2}</strong> px</div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="text-sm text-slate-500 text-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded">
            Configure guiding focal length in the rig to see dithering calculations.
          </div>
        )}
      </div>
    </div>
  );
};


type ViewMode = 'view' | 'edit' | 'duplicate';

export const Module2Dashboard: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('view');
  const [profiles, setProfiles] = useState<RigProfile[]>([]);
  const [activeProfileId, setActiveProfileIdState] = useState<string | null>(null);
  const [activeProfile, setActiveProfile] = useState<RigProfile | null>(null);
  const [calculations, setCalculations] = useState<ReturnType<typeof calculateRigCalculations> | null>(null);
  const [samplingRec, setSamplingRec] = useState<ReturnType<typeof getSamplingRecommendation> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<'idle' | 'first' | 'second'>('idle');
  const [actionError, setActionError] = useState<string | null>(null);

  const reloadProfiles = useCallback(async () => {
    const loadedProfiles = await getAllProfiles();
    setProfiles(loadedProfiles);
    return loadedProfiles;
  }, []);

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
      setViewMode('view');
      setDeleteConfirm('idle');
      setDitherPixels(3); // reset dither slider on rig change
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
    setViewMode('view');
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
      await reloadProfiles();
      setActiveProfile(updated);
      setViewMode('view');
    }
  };

  const handleDeleteClick = () => {
    if (profiles.length <= 1) return;
    if (deleteConfirm === 'idle') {
      setDeleteConfirm('first');
    } else if (deleteConfirm === 'first') {
      setDeleteConfirm('second');
    } else {
      // second confirm — actually delete
      performDelete();
    }
  };

  const performDelete = async () => {
    if (!activeProfile) return;
    setActionError(null);
    try {
      await deleteProfile(activeProfile.id);
      const remaining = await reloadProfiles();
      const newActive = remaining.find(p => p.isDefault) || remaining[0];
      if (newActive) {
        setActiveProfileIdState(newActive.id);
        setActiveProfile(newActive);
        setActiveProfileId(newActive.id);
      }
      setDeleteConfirm('idle');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
      setDeleteConfirm('idle');
    }
  };

  const handleDuplicateProfile = async (id: string) => {
    setActionError(null);
    try {
      const duplicated = await duplicateProfile(id);
      if (duplicated) {
        await reloadProfiles();
        setActiveProfileIdState(duplicated.id);
        setActiveProfile(duplicated);
        setActiveProfileId(duplicated.id);
        setViewMode('edit');
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur lors de la duplication');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-slate-400">Loading rigs...</div>
      </div>
    );
  }

  const isEditing = viewMode === 'edit' || viewMode === 'duplicate';

  // Full-screen edit mode
  if (isEditing && activeProfile) {
    return (
      <div className="space-y-6 p-4 max-w-7xl mx-auto">
        <header>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {viewMode === 'duplicate' ? '📄 Duplicate Rig' : '✏️ Edit Rig'}
            </h2>
            <button
              onClick={() => setViewMode('view')}
              className="px-4 py-2 rounded bg-slate-600 text-white text-sm hover:bg-slate-700"
            >
              ✕ Close
            </button>
          </div>
          <p className="text-slate-500 mt-1">{activeProfile.name}</p>
        </header>

        <RigProfileForm
          profile={activeProfile}
          isEditing={true}
          onSave={viewMode === 'duplicate'
            ? (_id: string, data: Partial<RigProfile>) => handleCreateProfile(data.name || `${activeProfile.name} (copy)`, data)
            : handleUpdateProfile
          }
        />
      </div>
    );
  }

  // View mode — single page
  return (
    <div className="space-y-6 p-4 max-w-7xl mx-auto">
      {/* Header */}
      <header>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          🔭 Equipment, Sampling & Dithering
        </h2>
        {actionError && (
          <div className="w-full p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
            ⚠️ {actionError}
            <button onClick={() => setActionError(null)} className="ml-2 underline hover:text-red-200">Fermer</button>
          </div>
        )}
        <p className="text-slate-500 mt-1">
          Manage your rigs, calculate sampling and configure guiding
        </p>
      </header>

      {/* Rig Selector + Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={activeProfileId || ''}
          onChange={e => handleProfileChange(e.target.value)}
          className="px-3 py-2 rounded border border-slate-300 dark:border-slate-600 
                     bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
        >
          {profiles.map(p => (
            <option key={p.id} value={p.id}>
              {p.name} {p.isDefault && '(default)'}
            </option>
          ))}
        </select>

        <button
          onClick={() => setViewMode('edit')}
          className="px-3 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
        >
          ✏️ Edit
        </button>

        <button
          onClick={() => activeProfile && handleDuplicateProfile(activeProfile.id)}
          className="px-3 py-2 rounded bg-slate-600 text-white text-sm hover:bg-slate-700"
          disabled={!activeProfile}
        >
          📄 Duplicate
        </button>

        <button
          onClick={handleDeleteClick}
          className={`px-3 py-2 rounded text-white text-sm transition-colors ${
            deleteConfirm === 'second'
              ? 'bg-red-800 hover:bg-red-900 animate-pulse'
              : deleteConfirm === 'first'
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-red-500 hover:bg-red-600'
          }`}
          disabled={!activeProfile || profiles.length <= 1}
          onBlur={() => setTimeout(() => setDeleteConfirm('idle'), 2000)}
        >
          {deleteConfirm === 'second'
            ? '🗑️ Confirm delete?'
            : deleteConfirm === 'first'
            ? '⚠️ Delete rig?'
            : '🗑️ Delete'}
        </button>
      </div>




      {/* Sampling */}
      {calculations && samplingRec && (
        <div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">📐 Sampling</h3>
          <SamplingDisplay
            pixelScale={calculations.pixelScale}
            fovWidth={calculations.fovWidth}
            fovHeight={calculations.fovHeight}
            effectiveFocalLength={calculations.effectiveFocalLength}
            fRatio={calculations.fRatio}
            recommendation={samplingRec}
          />
        </div>
      )}



      {/* Guiding — read-only summary + dithering */}
      {activeProfile && calculations && (
        <div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">🎯 Guiding</h3>
          <GuidingReadonly profile={activeProfile} calculations={calculations} samplingRec={samplingRec} />
        </div>
      )}

      {/* Horizon Mask */}
      <div>
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">🏔️ Horizon Mask</h3>
        <HorizonMaskUploader />
      </div>
    </div>
  );
};

export default Module2Dashboard;