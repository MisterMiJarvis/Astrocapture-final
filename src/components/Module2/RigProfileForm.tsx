import React, { useState, useEffect } from 'react';
import { RigProfile, TelescopeType, ModifierType, MountType, GuidingMode } from '../../types/module2';

interface RigProfileFormProps {
  profile: RigProfile;
  isEditing: boolean;
  onSave: (id: string, data: Partial<RigProfile>) => void;
}

export const RigProfileForm: React.FC<RigProfileFormProps> = ({
  profile,
  isEditing,
  onSave,
}) => {
  const [formData, setFormData] = useState<RigProfile>(profile);
  const [isDefault, setIsDefault] = useState(profile.isDefault);

  useEffect(() => {
    setFormData(profile);
    setIsDefault(profile.isDefault);
  }, [profile]);

  const handleChange = (section: keyof RigProfile, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const handleSave = () => {
    onSave(profile.id, {
      name: formData.name,
      telescope: formData.telescope,
      modifier: formData.modifier,
      camera: formData.camera,
      guiding: formData.guiding,
      mount: formData.mount,
      isDefault,
    });
  };

  const SectionCard: React.FC<{ title: string; icon: string; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
        <span className="font-semibold text-slate-700 dark:text-slate-200">
          {icon} {title}
        </span>
      </div>
      <div className={`p-4 space-y-3 ${!isEditing ? 'opacity-75' : ''}`}>
        {children}
      </div>
    </div>
  );

  const Field: React.FC<{
    label: string;
    value: any;
    onChange?: (val: any) => void;
    type?: 'text' | 'number' | 'select' | 'checkbox';
    options?: { value: string; label: string }[];
    unit?: string;
    disabled?: boolean;
  }> = ({ label, value, onChange, type = 'text', options, unit, disabled }) => {
    const baseClass = `w-full px-3 py-2 rounded border ${
      isEditing && !disabled
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
            disabled={!isEditing || disabled}
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
            disabled={!isEditing || disabled}
            className="w-4 h-4 rounded border-slate-300"
          />
        ) : (
          <div className="flex items-center gap-2">
            <input
              type={type}
              value={value}
              onChange={e => onChange?.(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
              disabled={!isEditing || disabled}
              className={baseClass}
            />
            {unit && <span className="text-xs text-slate-400">{unit}</span>}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Nom du profil */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Field
              label="Nom du profil"
              value={formData.name}
              onChange={val => setFormData(prev => ({ ...prev, name: val }))}
              disabled={!isEditing}
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
            Profil par défaut
          </label>
        </div>
        
        {isEditing && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
            >
              💾 Sauvegarder
            </button>
            <button
              onClick={() => {
                setFormData(profile);
                setIsDefault(profile.isDefault);
              }}
              className="px-4 py-2 rounded bg-slate-200 text-slate-700 text-sm hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200"
            >
              ↩️ Réinitialiser
            </button>
          </div>
        )}
      </div>

      {/* Tube optique */}
      <SectionCard title="Tube optique" icon="🔭">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field
            label="Nom"
            value={formData.telescope.name}
            onChange={val => handleChange('telescope', 'name', val)}
          />
          <Field
            label="Type"
            value={formData.telescope.type}
            onChange={val => handleChange('telescope', 'type', val)}
            type="select"
            options={[
              { value: 'Refractor', label: 'Réfracteur' },
              { value: 'Reflector', label: 'Réflecteur' },
              { value: 'SCT', label: 'Schmidt-Cassegrain' },
              { value: 'RC', label: 'Ritchey-Chrétien' },
              { value: 'CDK', label: 'Corrected Dall-Kirkham' },
              { value: 'Newtonian', label: 'Newton' },
              { value: 'Maksutov', label: 'Maksutov' },
            ]}
          />
          <Field
            label="Focale native"
            value={formData.telescope.focalLength}
            onChange={val => handleChange('telescope', 'focalLength', val)}
            type="number"
            unit="mm"
          />
          <Field
            label="Ouverture"
            value={formData.telescope.aperture}
            onChange={val => handleChange('telescope', 'aperture', val)}
            type="number"
            unit="mm"
          />
          <Field
            label="f/D"
            value={formData.telescope.fRatio}
            onChange={val => handleChange('telescope', 'fRatio', val)}
            type="number"
            unit=""
            disabled
          />
        </div>
      </SectionCard>

      {/* Modificateur optique */}
      <SectionCard title="Modificateur optique" icon="🔍">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field
            label="Type"
            value={formData.modifier.type}
            onChange={val => handleChange('modifier', 'type', val)}
            type="select"
            options={[
              { value: 'None', label: 'Aucun' },
              { value: 'Reducer', label: 'Réducteur' },
              { value: 'Corrector', label: 'Correcteur' },
              { value: 'Reducer-Corrector', label: 'Réducteur-Correcteur' },
              { value: 'Flattener', label: 'Flatteur' },
              { value: 'Barlow', label: 'Barlow' },
            ]}
          />
          <Field
            label="Facteur"
            value={formData.modifier.factor}
            onChange={val => handleChange('modifier', 'factor', val)}
            type="number"
            unit="×"
          />
        </div>
      </SectionCard>

      {/* Capteur d'imagerie */}
      <SectionCard title="Capteur d'imagerie" icon="📷">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field
            label="Nom"
            value={formData.camera.name}
            onChange={val => handleChange('camera', 'name', val)}
          />
          <Field
            label="Taille pixel"
            value={formData.camera.pixelSize}
            onChange={val => handleChange('camera', 'pixelSize', val)}
            type="number"
            unit="μm"
          />
          <Field
            label="Largeur capteur"
            value={formData.camera.sensorWidth}
            onChange={val => handleChange('camera', 'sensorWidth', val)}
            type="number"
            unit="mm"
          />
          <Field
            label="Hauteur capteur"
            value={formData.camera.sensorHeight}
            onChange={val => handleChange('camera', 'sensorHeight', val)}
            type="number"
            unit="mm"
          />
          <Field
            label="Résolution X"
            value={formData.camera.resolutionX}
            onChange={val => handleChange('camera', 'resolutionX', val)}
            type="number"
            unit="px"
          />
          <Field
            label="Résolution Y"
            value={formData.camera.resolutionY}
            onChange={val => handleChange('camera', 'resolutionY', val)}
            type="number"
            unit="px"
          />
          <Field
            label="Bruit de lecture"
            value={formData.camera.readNoise}
            onChange={val => handleChange('camera', 'readNoise', val)}
            type="number"
            unit="e⁻"
          />
          <Field
            label="QE"
            value={formData.camera.quantumEfficiency}
            onChange={val => handleChange('camera', 'quantumEfficiency', val)}
            type="number"
            unit=""
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
              Couleur
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={formData.camera.hasCooling}
                onChange={e => handleChange('camera', 'hasCooling', e.target.checked)}
                disabled={!isEditing}
                className="w-4 h-4"
              />
              Refroidissement
            </label>
          </div>
          <Field
            label="Binning acquisition"
            value={formData.camera.binningAcquisition.toString()}
            onChange={val => handleChange('camera', 'binningAcquisition', parseInt(val))}
            type="select"
            options={[
              { value: '1', label: '1×1' },
              { value: '2', label: '2×2' },
            ]}
          />
        </div>
      </SectionCard>

      {/* Guidage */}
      <SectionCard title="Caméra de guidage" icon="🎯">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field
            label="Nom"
            value={formData.guiding.cameraName}
            onChange={val => handleChange('guiding', 'cameraName', val)}
          />
          <Field
            label="Taille pixel"
            value={formData.guiding.pixelSize}
            onChange={val => handleChange('guiding', 'pixelSize', val)}
            type="number"
            unit="μm"
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
          />
          <Field
            label="Mode"
            value={formData.guiding.mode}
            onChange={val => handleChange('guiding', 'mode', val)}
            type="select"
            options={[
              { value: 'GuideScope', label: 'Lunette guide' },
              { value: 'OAG', label: 'OAG (Off-Axis Guider)' },
              { value: 'Integrated', label: 'Guidage intégré' },
            ]}
          />
          <Field
            label="Focale guidage"
            value={formData.guiding.focalLength || ''}
            onChange={val => handleChange('guiding', 'focalLength', val || undefined)}
            type="number"
            unit="mm"
          />
        </div>
      </SectionCard>

      {/* Monture */}
      <SectionCard title="Monture" icon="🌍">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field
            label="Nom"
            value={formData.mount.name}
            onChange={val => handleChange('mount', 'name', val)}
          />
          <Field
            label="Type"
            value={formData.mount.type}
            onChange={val => handleChange('mount', 'type', val)}
            type="select"
            options={[
              { value: 'EQ', label: 'Équatoriale' },
              { value: 'AZ', label: 'Azimutale' },
              { value: 'AltAz', label: 'Alt-Az' },
              { value: 'Dobsonian', label: 'Dobson' },
              { value: 'Fork', label: 'Fourche' },
            ]}
          />
          <Field
            label="Charge max"
            value={formData.mount.maxPayload}
            onChange={val => handleChange('mount', 'maxPayload', val)}
            type="number"
            unit="kg"
          />
        </div>
      </SectionCard>
    </div>
  );
};
