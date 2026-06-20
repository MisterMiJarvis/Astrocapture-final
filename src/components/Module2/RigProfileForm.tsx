import React, { useState, useEffect, useCallback } from 'react';
import { RigProfile, TelescopeType, ModifierType, MountType, GuidingMode } from '../../types/module2';

interface RigProfileFormProps {
  profile: RigProfile;
  isEditing: boolean;
  onSave: (id: string, data: Partial<RigProfile>) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Field component — DEFINED OUTSIDE to avoid re-creation on every render
// This prevents the input losing focus after each keystroke
// ─────────────────────────────────────────────────────────────────────────────
interface FieldProps {
  label: string;
  value: any;
  onChange?: (val: any) => void;
  type?: 'text' | 'number' | 'select' | 'checkbox';
  options?: { value: string; label: string }[];
  unit?: string;
  disabled?: boolean;
  isEditing?: boolean;
}

const Field: React.FC<FieldProps> = React.memo(({
  label, value, onChange, type = 'text', options, unit, disabled, isEditing: editing,
}) => {
  const baseClass = `w-full px-3 py-2 rounded border ${
    editing && !disabled
      ? 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
      : 'border-transparent bg-slate-50 dark:bg-slate-800/30'
  } text-slate-700 dark:text-slate-200 text-sm`;

  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1">{label}</label>
      {type === 'select' ? (
        <select
          value={value}
          onChange={e => onChange?.(e.target.value)}
          disabled={!editing || disabled}
          className={baseClass}
        >
          {options?.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : type === 'checkbox' ? (
        <input
          type="checkbox"
          checked={value}
          onChange={e => onChange?.(e.target.checked)}
          disabled={!editing || disabled}
          className="w-4 h-4 rounded border-slate-300"
        />
      ) : (
        <div className="flex items-center gap-2">
          <input
            type={type}
            value={value}
            onChange={e => onChange?.(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
            disabled={!editing || disabled}
            className={baseClass}
          />
          {unit && <span className="text-xs text-slate-400 whitespace-nowrap">{unit}</span>}
        </div>
      )}
    </div>
  );
});

Field.displayName = 'RigField';

// ─────────────────────────────────────────────────────────────────────────────
// SectionCard — also defined outside
// ─────────────────────────────────────────────────────────────────────────────
const SectionCard: React.FC<{ title: string; icon: string; children: React.ReactNode; isEditing?: boolean }> = ({
  title, icon, children, isEditing: editing,
}) => (
  <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
    <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
      <span className="font-semibold text-slate-700 dark:text-slate-200">
        {icon} {title}
      </span>
    </div>
    <div className={`p-4 space-y-3 ${!editing ? 'opacity-75' : ''}`}>
      {children}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main form component
// ─────────────────────────────────────────────────────────────────────────────
export const RigProfileForm: React.FC<RigProfileFormProps> = ({
  profile,
  isEditing,
  onSave,
}) => {
  const [formData, setFormData] = useState<RigProfile>(profile);
  const [isDefault, setIsDefault] = useState(profile.isDefault);

  useEffect(() => {
    // Ensure f/ratio is always consistent with focalLength / aperture
    const correctedProfile = { ...profile };
    if (profile.telescope.focalLength > 0 && profile.telescope.aperture > 0) {
      const calculatedFRatio = parseFloat((profile.telescope.focalLength / profile.telescope.aperture).toFixed(1));
      if (profile.telescope.fRatio !== calculatedFRatio) {
        correctedProfile.telescope = { ...profile.telescope, fRatio: calculatedFRatio };
      }
    }
    setFormData(correctedProfile);
    setIsDefault(profile.isDefault);
  }, [profile]);

  const handleChange = useCallback((section: keyof RigProfile, field: string, value: any) => {
    setFormData(prev => {
      const updated = {
        ...prev,
        [section]: {
          ...(prev[section] as any),
          [field]: value,
        },
      };
      // Auto-calculate f/ratio when focalLength or aperture changes in telescope section
      if (section === 'telescope' && (field === 'focalLength' || field === 'aperture')) {
        const fl = field === 'focalLength' ? value : updated.telescope.focalLength;
        const ap = field === 'aperture' ? value : updated.telescope.aperture;
        if (fl > 0 && ap > 0) {
          updated.telescope = {
            ...updated.telescope,
            fRatio: parseFloat((fl / ap).toFixed(1)),
          };
        }
      }
      return updated;
    });
  }, []);

  // QE: store as percentage (0-100), convert to/from decimal (0-1) for API
  const qePercent = Math.round((formData.camera.quantumEfficiency || 0) * 100);
  const handleQeChange = useCallback((val: any) => {
    const decimal = (parseFloat(val) || 0) / 100;
    handleChange('camera', 'quantumEfficiency', decimal);
  }, [handleChange]);

  const handleSave = useCallback(() => {
    onSave(profile.id, {
      name: formData.name,
      telescope: formData.telescope,
      modifier: formData.modifier,
      camera: formData.camera,
      guiding: formData.guiding,
      mount: formData.mount,
      isDefault,
    });
  }, [profile.id, formData, isDefault, onSave]);

  const handleReset = useCallback(() => {
    setFormData(profile);
    setIsDefault(profile.isDefault);
  }, [profile]);

  return (
    <div className="space-y-4">
      {/* Profile Name */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Field
              label="Profile Name"
              value={formData.name}
              onChange={val => setFormData(prev => ({ ...prev, name: val }))}
              disabled={!isEditing}
              isEditing={isEditing}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={e => setIsDefault(e.target.checked)}
              disabled={!isEditing}
              className="w-4 h-4"
            />
            Default Profile
          </label>
        </div>

        {isEditing && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
            >
              💾 Save
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded bg-slate-200 text-slate-700 text-sm hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200"
            >
              ↩️ Reset
            </button>
          </div>
        )}
      </div>

      {/* Optical Tube Assembly */}
      <SectionCard title="Optical Tube Assembly" icon="🔭" isEditing={isEditing}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field
            label="Name"
            value={formData.telescope.name}
            onChange={val => handleChange('telescope', 'name', val)}
            isEditing={isEditing}
          />
          <Field
            label="Type"
            value={formData.telescope.type}
            onChange={val => handleChange('telescope', 'type', val)}
            type="select"
            options={[
              { value: 'Refractor', label: 'Refractor' },
              { value: 'Reflector', label: 'Reflector' },
              { value: 'SCT', label: 'Schmidt-Cassegrain' },
              { value: 'RC', label: 'Ritchey-Chretien' },
              { value: 'CDK', label: 'Corrected Dall-Kirkham' },
              { value: 'Newtonian', label: 'Newtonian' },
              { value: 'Maksutov', label: 'Maksutov' },
            ]}
            isEditing={isEditing}
          />
          <Field
            label="Native Focal Length"
            value={formData.telescope.focalLength}
            onChange={val => handleChange('telescope', 'focalLength', val)}
            type="number"
            unit="mm"
            isEditing={isEditing}
          />
          <Field
            label="Aperture"
            value={formData.telescope.aperture}
            onChange={val => handleChange('telescope', 'aperture', val)}
            type="number"
            unit="mm"
            isEditing={isEditing}
          />
          <Field
            label="f/ratio"
            value={formData.telescope.fRatio}
            type="number"
            disabled
            isEditing={isEditing}
          />
        </div>
      </SectionCard>

      {/* Optic Modifier */}
      <SectionCard title="Optic Modifier" icon="🔍" isEditing={isEditing}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field
            label="Type"
            value={formData.modifier.type}
            onChange={val => handleChange('modifier', 'type', val)}
            type="select"
            options={[
              { value: 'None', label: 'None' },
              { value: 'Reducer', label: 'Reducer' },
              { value: 'Corrector', label: 'Corrector' },
              { value: 'Reducer-Corrector', label: 'Reducer-Corrector' },
              { value: 'Flattener', label: 'Flattener' },
              { value: 'Barlow', label: 'Barlow' },
            ]}
            isEditing={isEditing}
          />
          <Field
            label="Factor"
            value={formData.modifier.factor}
            onChange={val => handleChange('modifier', 'factor', val)}
            type="number"
            unit="×"
            isEditing={isEditing}
          />
        </div>
      </SectionCard>

      {/* Imaging Camera */}
      <SectionCard title="Imaging Camera" icon="📷" isEditing={isEditing}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field
            label="Name"
            value={formData.camera.name}
            onChange={val => handleChange('camera', 'name', val)}
            isEditing={isEditing}
          />
          <Field
            label="Pixel Size"
            value={formData.camera.pixelSize}
            onChange={val => handleChange('camera', 'pixelSize', val)}
            type="number"
            unit="μm"
            isEditing={isEditing}
          />
          <Field
            label="Sensor Width"
            value={formData.camera.sensorWidth}
            onChange={val => handleChange('camera', 'sensorWidth', val)}
            type="number"
            unit="mm"
            isEditing={isEditing}
          />
          <Field
            label="Sensor Height"
            value={formData.camera.sensorHeight}
            onChange={val => handleChange('camera', 'sensorHeight', val)}
            type="number"
            unit="mm"
            isEditing={isEditing}
          />
          <Field
            label="Resolution X"
            value={formData.camera.resolutionX}
            onChange={val => handleChange('camera', 'resolutionX', val)}
            type="number"
            unit="px"
            isEditing={isEditing}
          />
          <Field
            label="Resolution Y"
            value={formData.camera.resolutionY}
            onChange={val => handleChange('camera', 'resolutionY', val)}
            type="number"
            unit="px"
            isEditing={isEditing}
          />
          <Field
            label="Read Noise"
            value={formData.camera.readNoise}
            onChange={val => handleChange('camera', 'readNoise', val)}
            type="number"
            unit="e⁻"
            isEditing={isEditing}
          />
          <Field
            label="Quantum Efficiency"
            value={qePercent}
            onChange={handleQeChange}
            type="number"
            unit="%"
            isEditing={isEditing}
          />
          <Field
            label="Full Well Depth"
            value={formData.camera.fullWellDepth || ''}
            onChange={val => handleChange('camera', 'fullWellDepth', val)}
            type="number"
            unit="e⁻"
            isEditing={isEditing}
          />
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={formData.camera.isColor}
                onChange={e => handleChange('camera', 'isColor', e.target.checked)}
                disabled={!isEditing}
                className="w-4 h-4"
              />
              Color
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={formData.camera.hasCooling}
                onChange={e => handleChange('camera', 'hasCooling', e.target.checked)}
                disabled={!isEditing}
                className="w-4 h-4"
              />
              Cooling
            </label>
          </div>
          <Field
            label="Acquisition Binning"
            value={formData.camera.binningAcquisition.toString()}
            onChange={val => handleChange('camera', 'binningAcquisition', parseInt(val))}
            type="select"
            options={[
              { value: '1', label: '1×1' },
              { value: '2', label: '2×2' },
            ]}
            isEditing={isEditing}
          />
        </div>
      </SectionCard>

      {/* Guiding */}
      <SectionCard title="Guiding Camera" icon="🎯" isEditing={isEditing}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field
            label="Name"
            value={formData.guiding.cameraName}
            onChange={val => handleChange('guiding', 'cameraName', val)}
            isEditing={isEditing}
          />
          <Field
            label="Pixel Size"
            value={formData.guiding.pixelSize}
            onChange={val => handleChange('guiding', 'pixelSize', val)}
            type="number"
            unit="μm"
            isEditing={isEditing}
          />
          <Field
            label="Binning"
            value={formData.guiding.binning.toString()}
            onChange={val => handleChange('guiding', 'binning', parseInt(val))}
            type="select"
            options={[
              { value: '1', label: '1×1' },
              { value: '2', label: '2×2' },
            ]}
            isEditing={isEditing}
          />
          <Field
            label="Mode"
            value={formData.guiding.mode}
            onChange={val => handleChange('guiding', 'mode', val)}
            type="select"
            options={[
              { value: 'GuideScope', label: 'Guide Scope' },
              { value: 'OAG', label: 'OAG (Off-Axis Guider)' },
              { value: 'Integrated', label: 'Integrated' },
            ]}
            isEditing={isEditing}
          />
          <Field
            label="Guiding Focal Length"
            value={formData.guiding.focalLength || ''}
            onChange={val => handleChange('guiding', 'focalLength', val || undefined)}
            type="number"
            unit="mm"
            isEditing={isEditing}
          />
        </div>
      </SectionCard>

      {/* Mount */}
      <SectionCard title="Mount" icon="🌍" isEditing={isEditing}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field
            label="Name"
            value={formData.mount.name}
            onChange={val => handleChange('mount', 'name', val)}
            isEditing={isEditing}
          />
          <Field
            label="Type"
            value={formData.mount.type}
            onChange={val => handleChange('mount', 'type', val)}
            type="select"
            options={[
              { value: 'EQ', label: 'Equatorial' },
              { value: 'AZ', label: 'Azimuthal' },
              { value: 'AltAz', label: 'Alt-Az' },
              { value: 'Dobsonian', label: 'Dobsonian' },
              { value: 'Fork', label: 'Fork' },
            ]}
            isEditing={isEditing}
          />
          <Field
            label="Max Payload"
            value={formData.mount.maxPayload}
            onChange={val => handleChange('mount', 'maxPayload', val)}
            type="number"
            unit="kg"
            isEditing={isEditing}
          />
        </div>
      </SectionCard>
    </div>
  );
};