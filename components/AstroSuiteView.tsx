import React, { useState, useEffect } from 'react';
import { ViewState, User } from '../types';
import AplsModule1View from './AplsModule1View';
import AplsModule2View from './AplsModule2View';
import FiltersView from './FiltersView';
import ProjectsView from './ProjectsView';
import AplsModule6View from './AplsModule6View';
import PHD2Analysis from '@/src/components/PHD2Analysis';
import RAGChatView from './RAGChatView';
import ExposureEngineDocs from './ExposureEngineDocs';
import AstroSuiteLoginView from './AstroSuiteLoginView';
import AstroSuiteWeatherView from './AstroSuiteWeatherView';
import { getCurrentAstroSuiteUser, logoutAstroSuite } from '../src/services/userService';
import TargetExplorerView from './TargetExplorerView';
import { TelescopiusTarget } from '../src/services/targetExplorerService';
import { MapPin, LogOut } from 'lucide-react';

type AplsTab = 'dashboard' | 'projects' | 'filters' | 'equipment' | 'weather' | 'analysis' | 'help' | 'exposure';
type LocationSource = 'current' | 'saintEtienne' | 'pradelles' | '';

interface AstroSuiteViewProps {
  initialTab?: AplsTab;
  onNavigate?: (view: ViewState) => void;
}

const TAB_CONFIG: { id: AplsTab; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'projects', label: 'Projects', icon: '📋' },
  { id: 'filters', label: 'Filters', icon: '🔲' },
  { id: 'equipment', label: 'Equipment', icon: '🔭' },
  { id: 'weather', label: 'Weather', icon: '🌤️' },
  { id: 'analysis', label: 'Analysis', icon: '📈' },
  { id: 'exposure', label: 'Exposure', icon: '🔬' },
  { id: 'help', label: 'Knowledge', icon: '📚' },
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

  const handleStartProject = (target: TelescopiusTarget) => {
    setProjectFromTarget(target);
    setActiveTab('projects');
  };

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
        return <AplsModule1View locationSource={locationSource} onLocationChange={handleLocationChange} onStartProject={handleStartProject} />;
      case 'weather':
        return <AstroSuiteWeatherView defaultLocation={locationSource} />;
      case 'filters':
        return <FiltersView />;
      case 'equipment':
        return <AplsModule2View />;
      case 'projects':
        return <ProjectsView locationSource={locationSource} onLocationChange={handleLocationChange} preselectedTarget={projectFromTarget} onClearTarget={() => setProjectFromTarget(null)} />;
      case 'analysis':
        return <PHD2Analysis />;
      case 'exposure':
        return <ExposureEngineDocs />;
      case 'help':
        return <RAGChatView />;
      default:
        return <AplsModule1View locationSource={locationSource} onLocationChange={handleLocationChange} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sub-header: location + user + tabs */}
      <div className="bg-surface border-b border-border sticky top-20 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Row 1: location + user + logout */}
          <div className="flex items-center justify-between py-2 sm:py-3">
            {/* Location selector */}
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-text-secondary hidden sm:block" />
              <select
                value={locationSource}
                onChange={(e) => handleLocationChange(e.target.value as LocationSource)}
                className="text-xs sm:text-sm bg-blue-900/40 border border-blue-700/50 rounded-lg px-2 sm:px-3 py-1.5 text-blue-100 font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="" disabled>Location</option>
                <option value="current">📍 Current</option>
                <option value="saintEtienne">🏠 St-Étienne-du-Grès</option>
                <option value="pradelles">🏡 Pradelles</option>
              </select>
            </div>

            {/* User info — desktop only */}
            <div className="hidden sm:flex flex-col items-center">
              <span className="text-sm font-semibold text-text">Welcome, {user.firstName} {user.lastName}</span>
              {user.lastLogin && (
                <span className="text-xs text-text-secondary">
                  Last login: {new Date(user.lastLogin).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>

            {/* Logout */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary font-medium sm:hidden">{user.firstName}</span>
              <button
                onClick={handleLogout}
                className="text-sm font-semibold text-red-400 hover:text-red-300 px-2 sm:px-3 py-1.5 rounded-lg bg-red-900/30 hover:bg-red-900/50 border border-red-700/40 transition-colors flex items-center gap-1"
              >
                <LogOut size={14} className="sm:hidden" />
                <span className="hidden sm:inline">Log out</span>
              </button>
            </div>
          </div>

          {/* Row 2: tabs — horizontal scroll on mobile, full width on desktop */}
          <div className="flex sm:flex space-x-1 bg-surface-secondary rounded-lg p-1 overflow-x-auto sm:overflow-visible mb-2 sm:mb-3">
            {TAB_CONFIG.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 sm:flex-1 flex items-center justify-center gap-1 px-3 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
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
        </div>
      </div>

      {/* Module content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {renderModule()}
      </div>
    </div>
  );
};

export default AstroSuiteView;