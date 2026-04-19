import React from 'react';
import { ObservationTarget, ObservationSession, DeepSkyObject, AstroEquipment } from '../types';
import { 
    getSetupFOV, checkTargetFit 
} from '../services/equipmentService';
import {
    generateSessionPlan, estimateNightCapacity, suggestIntegrationTime,
    getTargetProgress, getPriorityColor, isNarrowbandFriendly,
    DEFAULT_OBSERVATION_TARGETS, SESSIONS_COLLECTION, TARGETS_COLLECTION
} from '../services/observationPlannerService';
import { fetchAstronomyData } from '../services/astronomyApiService';
import { mapAstronomyData } from '../services/astronomyDataMapper';
import { fetchAstroForecast } from '../services/weatherService';
import { mapAndFilterImagingWindow } from '../services/weatherDataMapper';
import { parseRA, parseDec, calculateImagingWindow } from '../services/astronomyUtils';
import { subscribeToCollection, saveCollectionItem, deleteCollectionItem } from '../services/firebase';
import { fetchDeepSkyCatalog } from '../services/catalogService';
import {
    Calendar, Target, Clock, Moon, Cloud, Star, Plus, Trash2, Save,
    CheckCircle, Circle, ChevronDown, ChevronRight, AlertTriangle,
    MapPin, Eye, Zap, BookOpen, ArrowUp, ArrowDown, Edit2, X, Crosshair
} from 'lucide-react';
import { Button, Select, Modal, Lightbox } from './Shared';

interface ObservationPlannerViewProps {
    equipment: AstroEquipment[];
}

type PlannerTab = 'tonight' | 'wishlist' | 'history';

export const ObservationPlannerView: React.FC<ObservationPlannerViewProps> = ({ equipment }) => {
    const [activeTab, setActiveTab] = React.useState<PlannerTab>('wishlist');
    const [targets, setTargets] = React.useState<ObservationTarget[]>(DEFAULT_OBSERVATION_TARGETS);
    const [sessions, setSessions] = React.useState<ObservationSession[]>([]);
    const [selectedDate, setSelectedDate] = React.useState(new Date());
    const [location, setLocation] = React.useState<{ name: string; lat: number; lon: number }>({
        name: 'Saint-Étienne-du-Grès', lat: 43.7889, lon: 4.7533
    });
    const [isPlanning, setIsPlanning] = React.useState(false);
    const [tonightPlan, setTonightPlan] = React.useState<ObservationSession | null>(null);
    const [expandedTarget, setExpandedTarget] = React.useState<string | null>(null);
    const [editingTarget, setEditingTarget] = React.useState<string | null>(null);
    const [showAddTarget, setShowAddTarget] = React.useState(false);
    const [catalogSearch, setCatalogSearch] = React.useState('');
    const [catalogResults, setCatalogResults] = React.useState<DeepSkyObject[]>([]);
    const [isSaving, setIsSaving] = React.useState(false);
    const [weatherData, setWeatherData] = React.useState<any[]>([]);
    const [astroData, setAstroData] = React.useState<any>(null);

    const setupInfo = getSetupFOV(equipment);

    // Subscribe to Firestore
    React.useEffect(() => {
        const unsub1 = subscribeToCollection(TARGETS_COLLECTION, (data) => {
            if (data && data.length > 0) setTargets(data as ObservationTarget[]);
        });
        const unsub2 = subscribeToCollection(SESSIONS_COLLECTION, (data) => {
            if (data && data.length > 0) setSessions(data as ObservationSession[]);
        });
        return () => { unsub1(); unsub2(); };
    }, []);

    // Fetch weather & astronomy data for tonight
    React.useEffect(() => {
        const fetchData = async () => {
            try {
                const astro = await fetchAstronomyData(location.lat, location.lon, selectedDate);
                const mapped = mapAstronomyData(astro);
                setAstroData(mapped);

                const forecast = await fetchAstroForecast(location.lat, location.lon, selectedDate);
                setWeatherData(forecast || []);
            } catch (err) {
                console.error('Failed to fetch planner data:', err);
            }
        };
        fetchData();
    }, [location, selectedDate]);

    // Generate tonight's plan
    const handlePlanTonight = () => {
        setIsPlanning(true);
        try {
            const today = new Date();
            today.setHours(18, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setHours(tomorrow.getHours() + 14);

            // Parse darkness times
            const darknessStart = astroData?.fullNightBegins
                ? new Date(`${selectedDate.toISOString().split('T')[0]}T${astroData.fullNightBegins}:00`)
                : new Date(today.getTime() + 2 * 3600000);
            const darknessEnd = astroData?.fullNightEnds
                ? new Date(`${selectedDate.toISOString().split('T')[0]}T${astroData.fullNightEnds}:00`)
                : new Date(tomorrow.getTime() - 1 * 3600000);

            // Get cloud cover from weather
            const avgCloudCover = weatherData.length > 0
                ? Math.round(weatherData.reduce((s: number, w: any) => s + (w.clouds?.total || 50), 0) / weatherData.length)
                : 30;

            // Get moon illumination
            const moonIllum = astroData?.moonIllumination ? parseFloat(astroData.moonIllumination) : 50;

            const plan = generateSessionPlan(
                targets,
                selectedDate,
                { lat: location.lat, lon: location.lon },
                darknessStart,
                darknessEnd,
                avgCloudCover,
                moonIllum,
                astroData?.sunset || '20:30',
                astroData?.sunrise || '06:30',
                equipment
            );

            setTonightPlan(plan);
            setActiveTab('tonight');
        } catch (err) {
            console.error('Planning error:', err);
        } finally {
            setIsPlanning(false);
        }
    };

    const handleSaveTargets = async () => {
        setIsSaving(true);
        try {
            // Delete removed targets
            for (const existing of targets) {
                // Already in the list, skip
            }
            for (const target of targets) {
                await saveCollectionItem(TARGETS_COLLECTION, target.id, target);
            }
            alert('Targets saved!');
        } catch (err: any) {
            console.error('Save error:', err);
            alert(`Save failed: ${err.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddTarget = (dso: DeepSkyObject) => {
        const newTarget: ObservationTarget = {
            id: `target-${dso.id.toLowerCase().replace(/\s/g, '-')}`,
            objectId: dso.id,
            commonName: dso.commonName || dso.id,
            objectType: dso.objectType || 'Unknown',
            constellation: dso.constellation || '',
            magnitude: dso.magnitude,
            angularSizeArcmin: dso.angularSize || { width: 10, height: 10 },
            priority: 'medium',
            notes: '',
            completed: false,
            targetHours: 6,
            acquisitionHours: 0,
            imageUrl: dso.image || ''
        };
        setTargets([...targets, newTarget]);
        setShowAddTarget(false);
        setCatalogSearch('');
    };

    const handleRemoveTarget = (id: string) => {
        if (window.confirm('Remove this target from your wishlist?')) {
            setTargets(targets.filter(t => t.id !== id));
        }
    };

    const handleToggleComplete = (id: string) => {
        setTargets(targets.map(t =>
            t.id === id
                ? { ...t, completed: !t.completed, completedDate: !t.completed ? new Date().toISOString().split('T')[0] : undefined }
                : t
        ));
    };

    const handleUpdateTarget = (id: string, field: keyof ObservationTarget, value: any) => {
        setTargets(targets.map(t =>
            t.id === id ? { ...t, [field]: value } : t
        ));
    };

    const handleReorder = (id: string, direction: 'up' | 'down') => {
        const idx = targets.findIndex(t => t.id === id);
        if (idx < 0) return;
        const newIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (newIdx < 0 || newIdx >= targets.length) return;
        const newTargets = [...targets];
        [newTargets[idx], newTargets[newIdx]] = [newTargets[newIdx], newTargets[idx]];
        setTargets(newTargets);
    };

    // Search catalog
    const handleCatalogSearch = async (query: string) => {
        setCatalogSearch(query);
        if (query.length < 2) { setCatalogResults([]); return; }
        try {
            const catalog = await fetchDeepSkyCatalog();
            const q = query.toLowerCase();
            const results = catalog.filter(dso =>
                dso.id.toLowerCase().includes(q) ||
                (dso.commonName && dso.commonName.toLowerCase().includes(q)) ||
                (dso.constellation && dso.constellation.toLowerCase().includes(q))
            ).slice(0, 20);
            setCatalogResults(results);
        } catch (err) {
            console.error('Catalog search error:', err);
        }
    };

    // Stats
    const completedCount = targets.filter(t => t.completed).length;
    const totalTargets = targets.length;
    const totalHoursNeeded = targets.reduce((s, t) => s + Math.max(0, (t.targetHours || 0) - (t.acquisitionHours || 0)), 0);
    const totalHoursAcquired = targets.reduce((s, t) => s + (t.acquisitionHours || 0), 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <header className="py-8 text-center border-b border-border">
                <h1 className="font-display text-4xl font-bold mb-2 flex items-center justify-center gap-3">
                    <Calendar className="text-primary" /> Observation Planner
                </h1>
                <p className="text-text-secondary max-w-2xl mx-auto">
                    Plan your imaging sessions, track target progress, and optimize your night under the stars.
                </p>
            </header>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-surface border border-border rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-primary">{totalTargets}</div>
                    <div className="text-xs text-text-secondary">Wishlist Targets</div>
                </div>
                <div className="bg-surface border border-border rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-400">{completedCount}</div>
                    <div className="text-xs text-text-secondary">Completed</div>
                </div>
                <div className="bg-surface border border-border rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-400">{totalHoursAcquired.toFixed(1)}h</div>
                    <div className="text-xs text-text-secondary">Hours Captured</div>
                </div>
                <div className="bg-surface border border-border rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-orange-400">{totalHoursNeeded.toFixed(0)}h</div>
                    <div className="text-xs text-text-secondary">Hours Remaining</div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-border pb-2">
                {(['wishlist', 'tonight', 'history'] as PlannerTab[]).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                            activeTab === tab
                                ? 'bg-primary text-white'
                                : 'text-text-secondary hover:bg-surface-light'
                        }`}
                    >
                        {tab === 'wishlist' && <><Target size={14} className="inline mr-1" /> Wishlist</>}
                        {tab === 'tonight' && <><Moon size={14} className="inline mr-1" /> Tonight's Plan</>}
                        {tab === 'history' && <><BookOpen size={14} className="inline mr-1" /> History</>}
                    </button>
                ))}
            </div>

            {/* Wishlist Tab */}
            {activeTab === 'wishlist' && (
                <div className="space-y-4">
                    {/* Actions */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <Button onClick={() => setShowAddTarget(true)} className="flex items-center gap-2">
                            <Plus size={14} /> Add Target
                        </Button>
                        <Button onClick={handleSaveTargets} disabled={isSaving} variant="outline" className="flex items-center gap-2">
                            <Save size={14} /> {isSaving ? 'Saving...' : 'Save Wishlist'}
                        </Button>
                        <Button onClick={handlePlanTonight} disabled={isPlanning} className="flex items-center gap-2 ml-auto">
                            <Moon size={14} /> {isPlanning ? 'Planning...' : 'Plan Tonight'}
                        </Button>
                    </div>

                    {/* Setup info */}
                    {setupInfo.fov && (
                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm">
                            <Crosshair size={14} className="inline mr-1 text-primary" />
                            <span className="text-text-secondary">Your FOV:</span>{' '}
                            <span className="font-bold">{setupInfo.fov.widthArcmin}' × {setupInfo.fov.heightArcmin}'</span>
                            {' '}({setupInfo.telescope?.name} + {setupInfo.camera?.name})
                        </div>
                    )}

                    {/* Target List */}
                    {targets.length === 0 ? (
                        <div className="text-center py-12 text-text-secondary">
                            <Target size={48} className="mx-auto mb-4 opacity-30" />
                            <p>Your observation wishlist is empty.</p>
                            <p className="text-sm mt-1">Add targets from the catalog to start planning!</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {targets.map((target, idx) => {
                                const isExpanded = expandedTarget === target.id;
                                const isEditing = editingTarget === target.id;
                                const progress = getTargetProgress(target);
                                const fovFit = setupInfo.fov ? checkTargetFit(
                                    { width: target.angularSizeArcmin.width, height: target.angularSizeArcmin.height },
                                    setupInfo.fov
                                ) : null;
                                const fitColors: Record<string, string> = {
                                    perfect: 'text-emerald-400', good: 'text-green-400',
                                    tight: 'text-yellow-400', too_large: 'text-red-400'
                                };
                                const fitIcons: Record<string, string> = {
                                    perfect: '✓', good: '≈', tight: '⚠', too_large: '✗'
                                };

                                return (
                                    <div key={target.id} className={`border rounded-lg overflow-hidden transition-colors ${
                                        target.completed ? 'border-green-500/20 bg-green-500/5' : 'border-border'
                                    }`}>
                                        <div
                                            className="flex items-center gap-3 p-3 cursor-pointer hover:bg-surface-light transition-colors"
                                            onClick={() => setExpandedTarget(isExpanded ? null : target.id)}
                                        >
                                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                            
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleToggleComplete(target.id); }}
                                                className="p-0.5"
                                                title={target.completed ? 'Mark incomplete' : 'Mark complete'}
                                            >
                                                {target.completed
                                                    ? <CheckCircle size={18} className="text-green-400" />
                                                    : <Circle size={18} className="text-text-secondary" />
                                                }
                                            </button>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className={`font-bold ${target.completed ? 'line-through text-text-secondary' : ''}`}>
                                                        {target.objectId}
                                                    </span>
                                                    {target.commonName && (
                                                        <span className={`text-sm ${target.completed ? 'text-text-secondary' : 'text-text-secondary'}`}>
                                                            {target.commonName}
                                                        </span>
                                                    )}
                                                    <span className="text-xs px-1.5 py-0.5 rounded bg-surface-light text-text-secondary">
                                                        {target.constellation}
                                                    </span>
                                                    <span className={`text-xs px-1.5 py-0.5 rounded ${getPriorityColor(target.priority)}`}>
                                                        {target.priority}
                                                    </span>
                                                    {fovFit && (
                                                        <span className={`text-xs font-bold ${fitColors[fovFit.fit]}`}>
                                                            {fitIcons[fovFit.fit]} FOV
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="text-right text-xs text-text-secondary shrink-0">
                                                <div>Mag {target.magnitude || '—'}</div>
                                                <div>{target.angularSizeArcmin.width}' × {target.angularSizeArcmin.height}'</div>
                                            </div>

                                            {/* Progress bar */}
                                            <div className="w-20 shrink-0">
                                                <div className="flex items-center gap-1 text-xs text-text-secondary mb-0.5">
                                                    <span>{target.acquisitionHours || 0}h</span>
                                                    <span>/</span>
                                                    <span>{target.targetHours || '?'}h</span>
                                                </div>
                                                <div className="h-2 bg-surface-light rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${
                                                            progress >= 100 ? 'bg-green-400' : progress > 50 ? 'bg-yellow-400' : 'bg-primary'
                                                        }`}
                                                        style={{ width: `${Math.min(100, progress)}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Reorder */}
                                            <div className="flex flex-col gap-0.5 shrink-0">
                                                <button onClick={(e) => { e.stopPropagation(); handleReorder(target.id, 'up'); }}
                                                    className="p-0.5 hover:text-primary" disabled={idx === 0}>
                                                    <ArrowUp size={12} />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleReorder(target.id, 'down'); }}
                                                    className="p-0.5 hover:text-primary" disabled={idx === targets.length - 1}>
                                                    <ArrowDown size={12} />
                                                </button>
                                            </div>

                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleRemoveTarget(target.id); }}
                                                className="p-1 rounded hover:bg-red-500/20 text-red-400 transition-colors shrink-0"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>

                                        {/* Expanded details */}
                                        {isExpanded && (
                                            <div className="border-t border-border p-4 bg-surface-light/30 space-y-3">
                                                {isEditing ? (
                                                    <div className="space-y-3">
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <label className="text-xs text-text-secondary">Priority</label>
                                                                <select value={target.priority}
                                                                    onChange={e => handleUpdateTarget(target.id, 'priority', e.target.value)}
                                                                    className="w-full bg-surface border border-border rounded px-2 py-1 text-sm">
                                                                    <option value="critical">Critical</option>
                                                                    <option value="high">High</option>
                                                                    <option value="medium">Medium</option>
                                                                    <option value="low">Low</option>
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="text-xs text-text-secondary">Target Hours</label>
                                                                <input type="number" value={target.targetHours || ''}
                                                                    onChange={e => handleUpdateTarget(target.id, 'targetHours', parseFloat(e.target.value) || 0)}
                                                                    className="w-full bg-surface border border-border rounded px-2 py-1 text-sm"
                                                                    step="0.5" min="0" />
                                                            </div>
                                                            <div>
                                                                <label className="text-xs text-text-secondary">Acquired Hours</label>
                                                                <input type="number" value={target.acquisitionHours || ''}
                                                                    onChange={e => handleUpdateTarget(target.id, 'acquisitionHours', parseFloat(e.target.value) || 0)}
                                                                    className="w-full bg-surface border border-border rounded px-2 py-1 text-sm"
                                                                    step="0.5" min="0" />
                                                            </div>
                                                            <div>
                                                                <label className="text-xs text-text-secondary">Object Type</label>
                                                                <input type="text" value={target.objectType}
                                                                    onChange={e => handleUpdateTarget(target.id, 'objectType', e.target.value)}
                                                                    className="w-full bg-surface border border-border rounded px-2 py-1 text-sm" />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="text-xs text-text-secondary">Notes</label>
                                                            <textarea value={target.notes}
                                                                onChange={e => handleUpdateTarget(target.id, 'notes', e.target.value)}
                                                                className="w-full bg-surface border border-border rounded px-2 py-1 text-sm" rows={2} />
                                                        </div>
                                                        <Button onClick={() => setEditingTarget(null)} variant="outline" className="text-sm">
                                                            <CheckCircle size={14} /> Done
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                                            <div>
                                                                <span className="text-text-secondary">Type:</span>{' '}
                                                                <span className="font-medium">{target.objectType}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-text-secondary">Size:</span>{' '}
                                                                <span className="font-medium">{target.angularSizeArcmin.width}' × {target.angularSizeArcmin.height}'</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-text-secondary">Progress:</span>{' '}
                                                                <span className="font-medium">{target.acquisitionHours || 0}h / {target.targetHours || '?'}h</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-text-secondary">NB-friendly:</span>{' '}
                                                                <span className="font-medium">{isNarrowbandFriendly(target.objectType) ? '✓ Yes' : '✗ No'}</span>
                                                            </div>
                                                        </div>
                                                        {target.notes && (
                                                            <p className="text-sm text-text-secondary">📝 {target.notes}</p>
                                                        )}
                                                        {fovFit && (
                                                            <p className="text-sm">
                                                                <Crosshair size={12} className="inline mr-1" />
                                                                <span className="text-text-secondary">FOV Fit:</span>{' '}
                                                                <span className={`font-medium ${fitColors[fovFit.fit]}`}>
                                                                    {fovFit.fit.replace('_', ' ')} 
                                                                    {fovFit.fit !== 'too_large' && ` (${fovFit.fillPercentage.toFixed(0)}% fill)`}
                                                                </span>
                                                            </p>
                                                        )}
                                                        <Button onClick={() => setEditingTarget(target.id)} variant="outline" className="text-sm">
                                                            <Edit2 size={12} /> Edit
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Tonight's Plan Tab */}
            {activeTab === 'tonight' && (
                <div className="space-y-6">
                    {!tonightPlan ? (
                        <div className="text-center py-12">
                            <Moon size={48} className="mx-auto mb-4 opacity-30" />
                            <p className="text-text-secondary mb-4">No session plan generated yet.</p>
                            <Button onClick={handlePlanTonight} disabled={isPlanning} className="flex items-center gap-2 mx-auto">
                                <Zap size={14} /> {isPlanning ? 'Planning...' : 'Generate Tonight\'s Plan'}
                            </Button>
                        </div>
                    ) : (
                        <>
                            {/* Session Header */}
                            <div className="bg-primary/10 border border-primary/20 rounded-xl p-6">
                                <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
                                    <Moon className="text-primary" /> Session Plan — {tonightPlan.date}
                                </h2>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                        <span className="text-text-secondary block">Location</span>
                                        <span className="font-bold">{tonightPlan.location.name}</span>
                                    </div>
                                    <div>
                                        <span className="text-text-secondary block">Darkness Window</span>
                                        <span className="font-bold">
                                            {new Date(tonightPlan.darknessStart).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})} — 
                                            {new Date(tonightPlan.darknessEnd).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-text-secondary block">Moon</span>
                                        <span className="font-bold">{tonightPlan.moonIllumination}% illumination</span>
                                    </div>
                                    <div>
                                        <span className="text-text-secondary block">Weather</span>
                                        <span className="font-bold">{tonightPlan.weatherSummary}</span>
                                    </div>
                                </div>
                                {tonightPlan.notes && (
                                    <p className="mt-3 text-sm text-text-secondary">⏱️ {tonightPlan.notes}</p>
                                )}
                            </div>

                            {/* Planned Targets */}
                            {tonightPlan.targets.length === 0 ? (
                                <div className="text-center py-8 text-text-secondary">
                                    <Cloud size={32} className="mx-auto mb-2 opacity-30" />
                                    <p>No viable targets for tonight's conditions.</p>
                                    <p className="text-xs mt-1">Check moon phase, weather, or add targets to your wishlist.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <h3 className="font-display font-bold text-lg">Imaging Order</h3>
                                    {tonightPlan.targets.map((target, idx) => {
                                        const progress = getTargetProgress(target);
                                        return (
                                            <div key={target.id} className="bg-surface border border-border rounded-lg p-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="text-2xl font-display font-bold text-primary w-8 text-center">
                                                        {idx + 1}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold">{target.objectId}</span>
                                                            <span className="text-text-secondary text-sm">{target.commonName}</span>
                                                            <span className={`text-xs px-1.5 py-0.5 rounded ${getPriorityColor(target.priority)}`}>
                                                                {target.priority}
                                                            </span>
                                                        </div>
                                                        <div className="text-xs text-text-secondary mt-1">
                                                            {target.objectType} • {target.angularSizeArcmin.width}' × {target.angularSizeArcmin.height}' • Mag {target.magnitude || '—'}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-sm font-bold">{target.notes?.split('|')[0]?.trim() || ''}</div>
                                                        <div className="text-xs text-text-secondary">
                                                            {target.acquisitionHours || 0}h / {target.targetHours || '?'}h
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <Button onClick={handlePlanTonight} disabled={isPlanning} variant="outline" className="flex items-center gap-2">
                                <Zap size={14} /> Regenerate Plan
                            </Button>
                        </>
                    )}
                </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
                <div className="space-y-4">
                    {sessions.length === 0 ? (
                        <div className="text-center py-12 text-text-secondary">
                            <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
                            <p>No observation sessions recorded yet.</p>
                            <p className="text-sm mt-1">Generate a plan and mark it as completed to see history.</p>
                        </div>
                    ) : (
                        sessions.map(session => (
                            <div key={session.id} className="bg-surface border border-border rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="font-bold">{session.date}</span>
                                        <span className="text-text-secondary text-sm ml-2">{session.location.name}</span>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded ${
                                        session.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                        session.status === 'weathered_out' ? 'bg-red-500/20 text-red-400' :
                                        'bg-yellow-500/20 text-yellow-400'
                                    }`}>
                                        {session.status.replace('_', ' ')}
                                    </span>
                                </div>
                                <div className="text-sm text-text-secondary mt-2">
                                    {session.targets.length} targets • {session.notes}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Add Target Modal */}
            {showAddTarget && (
                <Modal isOpen={showAddTarget} onClose={() => setShowAddTarget(false)} title="Add Target from Catalog">
                    <div className="space-y-4">
                        <input
                            type="text"
                            value={catalogSearch}
                            onChange={e => handleCatalogSearch(e.target.value)}
                            placeholder="Search by name, Messier, NGC, constellation..."
                            className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-primary"
                            autoFocus
                        />

                        {catalogResults.length > 0 && (
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {catalogResults.map(dso => {
                                    const existing = targets.find(t => t.objectId === dso.id);
                                    const fovFit = setupInfo.fov && dso.angularSize
                                        ? checkTargetFit({ width: dso.angularSize.width, height: dso.angularSize.height }, setupInfo.fov)
                                        : null;
                                    
                                    return (
                                        <div key={dso.id} className="flex items-center gap-3 p-2 bg-surface rounded-lg hover:bg-surface-light transition-colors">
                                            {dso.image && (
                                                <img src={dso.image} alt={dso.id} className="w-10 h-10 rounded object-cover" referrerPolicy="no-referrer" />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-sm">{dso.id}</div>
                                                <div className="text-xs text-text-secondary truncate">{dso.commonName} • {dso.objectType}</div>
                                                <div className="text-xs text-text-secondary">
                                                    Mag {dso.magnitude || '—'} • {dso.angularSize?.width || '?'}' × {dso.angularSize?.height || '?'}'
                                                    {fovFit && <span className={`ml-1 ${fovFit.fit === 'too_large' ? 'text-red-400' : 'text-green-400'}`}>
                                                        {fovFit.fit === 'too_large' ? '✗ Too large' : '✓ Fits FOV'}
                                                    </span>}
                                                </div>
                                            </div>
                                            <Button
                                                onClick={() => handleAddTarget(dso)}
                                                disabled={!!existing}
                                                variant={existing ? 'secondary' : 'outline'}
                                                className="text-xs shrink-0"
                                            >
                                                {existing ? 'Added' : <><Plus size={12} /> Add</>}
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {catalogSearch.length >= 2 && catalogResults.length === 0 && (
                            <p className="text-center text-text-secondary text-sm py-4">No objects found matching "{catalogSearch}"</p>
                        )}

                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => setShowAddTarget(false)}>Close</Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};