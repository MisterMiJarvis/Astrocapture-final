import React, { useState, useEffect } from 'react';
import { ViewState, User } from '../types';
import AplsModule1View from './AplsModule1View';
import AplsModule2View from './AplsModule2View';
import ProjectsView from './ProjectsView';
import AplsModule6View from './AplsModule6View';
import AstroSuiteLoginView from './AstroSuiteLoginView';
import AstroSuiteWeatherView from './AstroSuiteWeatherView';
import { getCurrentAstroSuiteUser, logoutAstroSuite } from '../src/services/userService';
import TargetExplorerView from './TargetExplorerView';
import { TelescopiusTarget } from '../src/services/targetExplorerService';
import { MapPin } from 'lucide-react';

type AplsTab = 'dashboard' | 'equipment' | 'targets' | 'projects' | 'analysis' | 'weather' | 'help';
type LocationSource = 'current' | 'saintEtienne' | 'pradelles' | '';

interface AstroSuiteViewProps {
  initialTab?: AplsTab;
  onNavigate?: (view: ViewState) => void;
}

const TAB_CONFIG: { id: AplsTab; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'targets', label: 'Targets', icon: '🎯' },
  { id: 'projects', label: 'Projects', icon: '📋' },
  { id: 'equipment', label: 'Equipment', icon: '🔭' },
  { id: 'weather', label: 'Weather', icon: '🌤️' },
  { id: 'analysis', label: 'Analysis', icon: '📈' },
  { id: 'help', label: 'Help', icon: '❓' },
];

const LOCATION_NAMES: Record<string, string> = {
  current: 'Current',
  saintEtienne: 'St-Étienne-du-Grès',
  pradelles: 'Pradelles',
};

const AstroSuiteView: React.FC<AstroSuiteViewProps> = ({ initialTab = 'dashboard', onNavigate }) => {
  const [activeTab, setActiveTab] = useState<AplsTab>(initialTab);
  const [user, setUser] = useState<User | null>(null);
  const [locationSource, setLocationSource] = useState<LocationSource>('saintEtienne');
  const [projectFromTarget, setProjectFromTarget] = useState<TelescopiusTarget | null>(null);

  // Start a project from the Targets tab
  const handleStartProject = (target: TelescopiusTarget) => {
    setProjectFromTarget(target);
    setActiveTab('projects');
  };

  // Persist location in localStorage
  useEffect(() => {
    const saved = localStorage.getItem('astrosuite_location') as LocationSource;
    if (saved && LOCATION_NAMES[saved]) setLocationSource(saved);
  }, []);

  const handleLocationChange = (source: LocationSource) => {
    setLocationSource(source);
    localStorage.setItem('astrosuite_location', source);
  };

  useEffect(() => {
    const stored = getCurrentAstroSuiteUser();
    if (stored) setUser(stored);
  }, []);

  const handleLogin = (loggedUser: User) => {
    setUser(loggedUser);
  };

  const handleLogout = () => {
    logoutAstroSuite();
    setUser(null);
  };

  if (!user) {
    return <AstroSuiteLoginView onLogin={handleLogin} onNavigate={onNavigate} />;
  }

  const renderModule = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AplsModule1View locationSource={locationSource} onLocationChange={handleLocationChange} />;
      case 'weather':
        return <AstroSuiteWeatherView defaultLocation={locationSource} />;
      case 'equipment':
        return <AplsModule2View />;
      case 'targets':
        return <TargetExplorerView locationSource={locationSource} onLocationChange={handleLocationChange} onStartProject={handleStartProject} />;
      case 'projects':
        return <ProjectsView locationSource={locationSource} onLocationChange={handleLocationChange} preselectedTarget={projectFromTarget} onClearTarget={() => setProjectFromTarget(null)} />;
      case 'analysis':
        return <AplsModule6View />;
      case 'help':
        return (
          <div className="space-y-6">
            <div className="py-4 text-center border-b border-border">
              <h1 className="text-3xl font-display font-bold">❓ Help</h1>
              <p className="mt-2 text-text-secondary">Astro Suite documentation and guides</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-8 text-center text-text-secondary">
              <p className="text-lg">Documentation coming soon...</p>
              <p className="text-sm mt-2">Guides for each module will be available here.</p>
            </div>
          </div>
        );
      default:
        return <AplsModule1View locationSource={locationSource} onLocationChange={handleLocationChange} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-surface border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <div className="flex items-center justify-between mb-4">
              {/* Location selector - left */}
              <div className="flex-1 flex items-center gap-2">
                <MapPin size={16} className="text-text-secondary" />
                <select
                  value={locationSource}
                  onChange={(e) => handleLocationChange(e.target.value as LocationSource)}
                  className="text-sm bg-blue-900/40 border border-blue-700/50 rounded-lg px-3 py-1.5 text-blue-100 font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="" disabled>Location</option>
                  <option value="current">📍 Current</option>
                  <option value="saintEtienne">🏠 St-Étienne-du-Grès</option>
                  <option value="pradelles">🏡 Pradelles</option>
                </select>
              </div>

              {/* Welcome - center */}
              <div className="flex flex-col items-center">
                <h2 className="text-lg font-semibold text-text">Welcome, {user.firstName} {user.lastName}</h2>
                {user.lastLogin && (
                  <span className="text-xs text-text-secondary">
                    Last login: {new Date(user.lastLogin).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>

              {/* Logout - right */}
              <div className="flex-1 flex justify-end">
                <button
                  onClick={handleLogout}
                  className="text-sm font-semibold text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg bg-red-900/30 hover:bg-red-900/50 border border-red-700/40 transition-colors"
                >
                  Log out
                </button>
              </div>
            </div>

            {/* Desktop tabs */}
            <div className="hidden sm:flex space-x-1 bg-surface-secondary rounded-lg p-1">
              {TAB_CONFIG.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-surface text-text shadow-sm'
                      : 'text-text-secondary hover:text-text hover:bg-surface-tertiary'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Mobile tabs */}
            <div className="sm:hidden">
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value as AplsTab)}
                className="w-full px-4 py-2.5 rounded-lg bg-surface-secondary border border-border text-text focus:ring-2 focus:ring-primary focus:outline-none"
              >
                {TAB_CONFIG.map((tab) => (
                  <option key={tab.id} value={tab.id}>
                    {tab.icon} {tab.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Module content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {renderModule()}
      </div>
    </div>
  );
};

export default AstroSuiteView;