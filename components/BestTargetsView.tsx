import React from 'react';
import { DeepSkyObject, MappedAstronomyData, NightlyForecast, AstroForecastHour, AstroEquipment } from '../types';
import { fetchAstronomyData } from '../services/astronomyApiService';
import { mapAstronomyData } from '../services/astronomyDataMapper';
import { fetchNightlyForecast, fetchAstroForecast } from '../services/weatherService';
import { mapNightlyForecast, mapAndFilterImagingWindow } from '../services/weatherDataMapper';
import { NightlyForecastView } from './NightlyForecastView';
import { ChevronLeft, ChevronRight, MapPin, Calendar, Star, Info, ExternalLink, Clock, ArrowUp, Filter, ArrowDownUp, SlidersHorizontal, Target, Crosshair } from 'lucide-react';
import { Button, Select, Lightbox, Modal } from './Shared';
import { parseRA, parseDec, calculateImagingWindow, ImagingWindowResult } from '../services/astronomyUtils';
import { fetchDeepSkyCatalog, filterCatalogRoughly } from '../services/catalogService';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import { getSetupFOV, checkTargetFit } from '../services/equipmentService';

interface BestTargetsViewProps {
    onNavigate?: (view: any) => void;
    equipment?: AstroEquipment[];
}

interface EnrichedTarget extends DeepSkyObject {
    imagingWindow: ImagingWindowResult;
    darknessWindow?: { start: Date; end: Date };
}

export const BestTargetsView: React.FC<BestTargetsViewProps> = ({ onNavigate, equipment = [] }) => {
    const [locationSource, setLocationSource] = React.useState<'current' | 'saintEtienne' | 'pradelles' | ''>('');
    const [coordinates, setCoordinates] = React.useState<{ lat: number; lon: number } | null>(null);
    const [isLoadingLocation, setIsLoadingLocation] = React.useState(false);
    const [locationError, setLocationError] = React.useState<string | null>(null);
    const [currentBortle, setCurrentBortle] = React.useState<number | null>(null);

    const [selectedType, setSelectedType] = React.useState<string>('all');
    const [selectedDifficulty, setSelectedDifficulty] = React.useState<string>('all');
    const [showDifficultyHelp, setShowDifficultyHelp] = React.useState(false);
    const [fovFilter, setFovFilter] = React.useState<boolean>(false); // FOV-based filter toggle
    const [sortBy, setSortBy] = React.useState<'duration' | 'transit' | 'mag'>('duration');
    const [minAltitude, setMinAltitude] = React.useState<number>(30);

    const [selectedDate, setSelectedDate] = React.useState(new Date());
    const [mappedAstroData, setMappedAstroData] = React.useState<MappedAstronomyData | null>(null);
    const [bestTargets, setBestTargets] = React.useState<EnrichedTarget[]>([]);
    const [fullCatalog, setFullCatalog] = React.useState<DeepSkyObject[]>([]);
    const [isCatalogLoading, setIsCatalogLoading] = React.useState(true);

    const [nightlyForecast, setNightlyForecast] = React.useState<NightlyForecast[] | null>(null);
    const [hourlyWeather, setHourlyWeather] = React.useState<AstroForecastHour[] | null>(null);
    const [isLoadingNightly, setIsLoadingNightly] = React.useState(false);
    const [nightlyError, setNightlyError] = React.useState<string | null>(null);

    // Lightbox state
    const [lightboxOpen, setLightboxOpen] = React.useState(false);
    const [currentImage, setCurrentImage] = React.useState<{ url: string; alt: string } | null>(null);

    const PRESET_LOCATIONS = {
        saintEtienne: { lat: 43.79, lon: 4.72, name: "Saint-Étienne-du-Grès (13103)", bortle: 4 },
        pradelles: { lat: 44.77, lon: 3.88, name: "Pradelles (43420)", bortle: 2 }
    };

    // --- Load Catalog ---
    React.useEffect(() => {
        fetchDeepSkyCatalog().then(data => {
            setFullCatalog(data);
            setIsCatalogLoading(false);
        });
    }, []);

    // --- Date Handling ---
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const maxForecastDate = new Date(today);
    maxForecastDate.setDate(today.getDate() + 365); // Allow planning ahead

    const handlePrevDay = () => {
        const prev = new Date(selectedDate);
        prev.setDate(selectedDate.getDate() - 1);
        if (prev >= today) setSelectedDate(prev);
    };

    const handleNextDay = () => {
        const next = new Date(selectedDate);
        next.setDate(selectedDate.getDate() + 1);
        if (next <= maxForecastDate) setSelectedDate(next);
    };

    const isPrevDisabled = selectedDate.getTime() <= today.getTime();
    const isNextDisabled = selectedDate.getTime() >= maxForecastDate.getTime();

    const formatDateDisplay = (date: Date) => {
        const dateToCompare = new Date(date);
        dateToCompare.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        if (dateToCompare.getTime() === today.getTime()) return "Today";
        if (dateToCompare.getTime() === tomorrow.getTime()) return "Tomorrow";
        
        return date.toLocaleDateString(undefined, {
            weekday: 'short',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    // --- Location Handling ---
    const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const source = e.target.value as typeof locationSource;
        setLocationSource(source);
        setCoordinates(null);
        setLocationError(null);
        setCurrentBortle(null);

        if (source === 'current') {
            setIsLoadingLocation(true);
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setCoordinates({
                        lat: position.coords.latitude,
                        lon: position.coords.longitude
                    });
                    setCurrentBortle(5); // Default estimate
                    setIsLoadingLocation(false);
                },
                (err) => {
                    setLocationError('Geolocation failed. Please enable location permissions.');
                    setIsLoadingLocation(false);
                }
            );
        } else if (source === 'saintEtienne') {
            setCoordinates(PRESET_LOCATIONS.saintEtienne);
            setCurrentBortle(PRESET_LOCATIONS.saintEtienne.bortle);
        } else if (source === 'pradelles') {
            setCoordinates(PRESET_LOCATIONS.pradelles);
            setCurrentBortle(PRESET_LOCATIONS.pradelles.bortle);
        }
    };

    // --- Data Fetching & Calculation ---
    React.useEffect(() => {
        if (coordinates) {
            fetchAstronomyData(coordinates.lat, coordinates.lon, selectedDate)
                .then(data => setMappedAstroData(mapAstronomyData(data)))
                .catch(console.error);
        }
    }, [coordinates, selectedDate]);

    React.useEffect(() => {
        if (coordinates) {
            setIsLoadingNightly(true);
            setNightlyError(null);
            setNightlyForecast(null);
            setHourlyWeather(null);
            
            // Fetch both nightly and hourly forecast
            Promise.all([
                fetchNightlyForecast(coordinates.lat, coordinates.lon),
                fetchAstroForecast(coordinates.lat, coordinates.lon, selectedDate)
            ])
                .then(([nightlyData, hourlyData]) => {
                    const mappedNightly = mapNightlyForecast(nightlyData);
                    setNightlyForecast(mappedNightly);

                    // We need darkness times for mapping hourly data, but we might not have them yet from mappedAstroData if it's slow.
                    // However, mapAndFilterImagingWindow is robust.
                    // Ideally we wait for mappedAstroData, but let's try to map what we can or wait.
                    // Actually, let's just store the raw data or map it if we have darkness times.
                    // Better yet, let's just fetch it here and map it when we have everything.
                    // For simplicity, let's just use the raw response if we can, but mapAndFilterImagingWindow expects darkness times.
                    
                    // Let's rely on the fact that mappedAstroData effect runs in parallel. 
                    // We can store the raw hourly data and map it in the calculation effect?
                    // Or just map it here if we have darkness times.
                    
                    // To keep it simple and robust:
                    // We will just store the raw hourly data if we can't map it yet, OR
                    // we re-fetch/re-map in the calculation effect.
                    
                    // Actually, let's just use the existing mapAndFilterImagingWindow if we have the times.
                    // If not, we can't map it properly yet.
                    
                    // Let's modify the flow:
                    // 1. Fetch Astro Data (Sun/Moon times)
                    // 2. Fetch Weather (Nightly & Hourly)
                    // 3. Calculate Targets
                    
                    // We can just store the hourlyData in a temporary state or just map it here if we have the times.
                    // But mappedAstroData is in another effect.
                    
                    // Let's just set the raw data? No, types.
                    // Let's just set hourlyWeather to null initially and update it when we have both weather and astro data.
                    
                    // Actually, we can just use the `mapAndFilterImagingWindow` inside the main calculation effect if we have the raw data.
                    // But `fetchAstroForecast` returns `AstroForecastResponse`.
                    // Let's store the raw response?
                    // No, let's just chain it.
                    
                    // Simplified approach:
                    // We will fetch hourly forecast here, but we need darkness times to map it to `AstroForecastHour[]`.
                    // If we don't have darkness times yet, we can't map it perfectly.
                    // However, `calculateImagingWindow` just needs the weather data points.
                    
                    // Let's just use a ref or state for raw weather data?
                    // Or better, let's just fetch it in the same effect as astro data?
                    // No, separation of concerns.
                    
                    // Let's just use a separate effect for hourly weather that depends on coordinates AND selectedDate AND mappedAstroData.
                })
                .catch(err => {
                    setNightlyError("Failed to load forecasts.");
                    console.error(err);
                })
                .finally(() => setIsLoadingNightly(false));
        }
    }, [coordinates]); // This only runs on coordinate change (location change)

    // Separate effect for hourly weather which needs date and astro data
    React.useEffect(() => {
        if (coordinates && mappedAstroData?.fullNightBegins && mappedAstroData?.fullNightEnds) {
             fetchAstroForecast(coordinates.lat, coordinates.lon, selectedDate)
                .then(data => {
                    const moonIllum = mappedAstroData.moonIllumination ? parseFloat(mappedAstroData.moonIllumination) : 0;
                    const windowData = mapAndFilterImagingWindow(data, mappedAstroData.fullNightBegins, mappedAstroData.fullNightEnds, selectedDate, moonIllum);
                    setHourlyWeather(windowData);
                })
                .catch(console.error);
        }
    }, [coordinates, selectedDate, mappedAstroData]);

    React.useEffect(() => {
        if (coordinates && mappedAstroData && fullCatalog.length > 0) {
            // Parse darkness times
            let darknessStart: Date | undefined;
            let darknessEnd: Date | undefined;

            if (mappedAstroData.fullNightBegins && mappedAstroData.fullNightEnds) {
                const startParts = mappedAstroData.fullNightBegins.split(':');
                const endParts = mappedAstroData.fullNightEnds.split(':');
                
                if (startParts.length === 2 && endParts.length === 2) {
                    darknessStart = new Date(selectedDate);
                    darknessStart.setHours(parseInt(startParts[0]), parseInt(startParts[1]), 0, 0);
                    
                    darknessEnd = new Date(selectedDate);
                    darknessEnd.setDate(darknessEnd.getDate() + 1);
                    darknessEnd.setHours(parseInt(endParts[0]), parseInt(endParts[1]), 0, 0);
                }
            }

            // 1. Rough Filter (The Funnel)
            // Filter by magnitude and rough visibility first to reduce the list from 14k to ~500
            const magLimit = currentBortle && currentBortle > 5 ? 6 : 12;
            
            const roughFiltered = filterCatalogRoughly(
                fullCatalog,
                coordinates.lat,
                coordinates.lon,
                selectedDate,
                magLimit,
                minAltitude
            );

            // 2. Detailed Filter & Calculation
            const visibleTargets = roughFiltered.filter(target => {
                // Type Filter
                if (selectedType !== 'all') {
                    const type = target.objectType?.toLowerCase() || '';
                    if (selectedType === 'galaxy' && !type.includes('galaxy')) return false;
                    if (selectedType === 'nebula' && !type.includes('nebula')) return false;
                    if (selectedType === 'cluster' && !type.includes('cluster')) return false;
                }

                // Difficulty Filter
                if (selectedDifficulty !== 'all') {
                    if (target.difficulty !== selectedDifficulty) return false;
                }

                return true;
            });

            // Calculate imaging windows and enrich targets
            const enrichedTargets: EnrichedTarget[] = visibleTargets.map(target => {
                const ra = parseRA(target.rightAscension || "00:00:00");
                const dec = parseDec(target.declination || "+00:00:00");
                
                const window = calculateImagingWindow(
                    { ra, dec },
                    { lat: coordinates.lat, lon: coordinates.lon },
                    selectedDate,
                    darknessStart,
                    darknessEnd,
                    minAltitude,
                    hourlyWeather || undefined
                );

                return {
                    ...target,
                    imagingWindow: window,
                    darknessWindow: darknessStart && darknessEnd ? { start: darknessStart, end: darknessEnd } : undefined
                };
            });

            // Filter out targets that are not visible (max altitude < minAltitude)
            // Also filter out targets with 0 duration (bad weather or never rises)
            let actuallyVisibleTargets = enrichedTargets.filter(t => t.imagingWindow.maxAlt >= minAltitude && t.imagingWindow.duration > 0);

            // FOV-based filter: remove targets that are too large for the primary setup
            if (fovFilter && equipment.length > 0) {
                const setupInfo = getSetupFOV(equipment);
                if (setupInfo.fov) {
                    actuallyVisibleTargets = actuallyVisibleTargets.filter(t => {
                        const fit = checkTargetFit(t.angularSize, setupInfo.fov!);
                        return fit.fit !== 'too_large'; // Keep targets that fit or are smaller than FOV
                    });
                }
            }

            // Sort logic
            actuallyVisibleTargets.sort((a, b) => {
                if (sortBy === 'duration') return b.imagingWindow.duration - a.imagingWindow.duration;
                if (sortBy === 'mag') return (a.magnitude || 99) - (b.magnitude || 99); // Lower mag is brighter
                if (sortBy === 'transit') {
                    // Sort by transit time (earliest first)
                    if (!a.imagingWindow.transitTime) return 1;
                    if (!b.imagingWindow.transitTime) return -1;
                    return a.imagingWindow.transitTime.getTime() - b.imagingWindow.transitTime.getTime();
                }
                return 0;
            });

            // Limit to top 50 to prevent rendering issues if the list is still huge
            setBestTargets(actuallyVisibleTargets.slice(0, 50));
        }
    }, [coordinates, mappedAstroData, selectedDate, currentBortle, selectedType, selectedDifficulty, sortBy, minAltitude, hourlyWeather, fullCatalog, fovFilter, equipment]);


    const handleImageClick = (url: string, alt: string) => {
        setCurrentImage({ url, alt });
        setLightboxOpen(true);
    };

    return (
        <div className="space-y-8">
            <header className="py-8 text-center border-b border-border mb-8">
                <h1 className="text-4xl font-display font-bold">Astro Targets</h1>
                <p className="mt-2 text-text-secondary max-w-2xl mx-auto text-lg">
                    Discover the best deep-sky objects to photograph tonight from your location.
                </p>
                <div className="mt-6 max-w-3xl mx-auto bg-surface/50 border border-border rounded-lg p-4 text-sm text-text-secondary leading-relaxed">
                    <p>
                        <Info size={16} className="inline-block mr-1.5 mb-0.5 text-primary" />
                        Based on the <strong>Messier Catalog</strong> (110 deep-sky objects), this tool calculates optimal targets for your specific location and date. 
                        Recommendations are filtered by object altitude (default &gt;30°), astronomical darkness, and strict weather criteria 
                        (<strong>Cloud Cover &lt; 10%</strong>, <strong>Wind &lt; 10km/h</strong>, No Rain). 
                        The <span className="text-green-400 font-bold">green graph</span> indicates the actual high-quality imaging window when all conditions are met.
                        Targets are also categorized by <strong>Difficulty</strong> (Easy, Medium, Hard) to help you choose appropriate objects.
                    </p>
                </div>
            </header>

            <div className="max-w-7xl mx-auto space-y-8">
                {/* Controls Section (Replicated from AstroIndex) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Location Selector */}
                    <div className="bg-surface border border-border rounded-lg p-6 space-y-4">
                        <Select
                            label="Select Location"
                            value={locationSource}
                            onChange={handleLocationChange}
                        >
                            <option value="" disabled>-- Choose a location --</option>
                            <option value="current">My Current Location</option>
                            <option value="saintEtienne">{PRESET_LOCATIONS.saintEtienne.name}</option>
                            <option value="pradelles">{PRESET_LOCATIONS.pradelles.name}</option>
                        </Select>

                        {isLoadingLocation && <p className="text-text-secondary text-center">Fetching location...</p>}
                        {locationError && <p className="text-red-400 text-center">{locationError}</p>}

                        {coordinates && (
                            <div className="bg-background border border-border p-4 rounded-md font-mono text-sm text-center">
                                <p>
                                    <span className="text-text-secondary">Lat:</span> {coordinates.lat.toFixed(2)}
                                    <span className="text-text-secondary mx-2">|</span>
                                    <span className="text-text-secondary">Lon:</span> {coordinates.lon.toFixed(2)}
                                </p>
                                {currentBortle && (
                                    <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-center gap-2">
                                        <span className="text-text-secondary">Light Pollution:</span>
                                        <span className={`font-bold px-2 py-0.5 rounded text-xs ${
                                            currentBortle <= 3 ? 'bg-blue-900 text-blue-200' :
                                            currentBortle <= 5 ? 'bg-yellow-900 text-yellow-200' :
                                            'bg-red-900 text-red-200'
                                        }`}>
                                            Bortle {currentBortle}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>                    {/* Date Selector */}
                    <div className="bg-surface border border-border rounded-lg p-6 space-y-4 flex flex-col justify-center">
                        <label className="block text-sm font-medium text-text-secondary">Target Date</label>
                        <div className="flex items-center justify-between gap-2">
                            <Button 
                                onClick={handlePrevDay} 
                                disabled={isPrevDisabled} 
                                variant="secondary" 
                                size="sm" 
                                className="!p-2"
                            >
                                <ChevronLeft size={20} />
                            </Button>
                            <span className="font-semibold text-center text-base sm:text-lg w-full tabular-nums">
                                {formatDateDisplay(selectedDate)}
                            </span>
                            <Button 
                                onClick={handleNextDay} 
                                disabled={isNextDisabled} 
                                variant="secondary" 
                                size="sm" 
                                className="!p-2"
                            >
                                <ChevronRight size={20} />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Filters & Sorting */}
                {coordinates && (
                    <div className="bg-surface border border-border rounded-lg p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Filter Type */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                                    <Filter size={16} /> Object Type
                                </label>
                                <Select 
                                    value={selectedType} 
                                    onChange={(e) => setSelectedType(e.target.value)}
                                    className="w-full"
                                >
                                    <option value="all">All Objects</option>
                                    <option value="galaxy">Galaxies</option>
                                    <option value="nebula">Nebulae</option>
                                    <option value="cluster">Clusters</option>
                                </Select>
                            </div>

                            {/* Filter Difficulty */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                                        <Target size={16} /> Difficulty
                                    </label>
                                    <button 
                                        onClick={() => setShowDifficultyHelp(true)}
                                        className="text-primary hover:text-primary-hover text-xs flex items-center gap-1 transition-colors"
                                    >
                                        <Info size={14} /> What's this?
                                    </button>
                                </div>
                                <Select 
                                    value={selectedDifficulty} 
                                    onChange={(e) => setSelectedDifficulty(e.target.value)}
                                    className="w-full"
                                >
                                    <option value="all">All Difficulties</option>
                                    <option value="Easy">Easy (Beginner)</option>
                                    <option value="Medium">Medium (Intermediate)</option>
                                    <option value="Hard">Hard (Advanced)</option>
                                </Select>
                            </div>

                            {/* Sort By */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                                    <ArrowDownUp size={16} /> Sort By
                                </label>
                                <Select 
                                    value={sortBy} 
                                    onChange={(e) => setSortBy(e.target.value as any)}
                                    className="w-full"
                                >
                                    <option value="duration">Best Duration (Longest)</option>
                                    <option value="transit">Transit Time (Earliest)</option>
                                    <option value="mag">Brightness (Brightest)</option>
                                </Select>
                            </div>

                            {" "}
                            {/* Min Altitude */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                                    <SlidersHorizontal size={16} /> Min Altitude: {minAltitude}°
                                </label>
                                <div className="flex items-center gap-4">
                                    <span className="text-xs text-text-secondary">10°</span>
                                    <input 
                                        type="range" 
                                        min="10" 
                                        max="60" 
                                        step="5" 
                                        value={minAltitude} 
                                        onChange={(e) => setMinAltitude(parseInt(e.target.value))}
                                        className="w-full accent-primary h-2 bg-background rounded-lg appearance-none cursor-pointer"
                                    />
                                    <span className="text-xs text-text-secondary">60°</span>
                                </div>
                            </div>

                            {/* FOV Filter */}
                            {equipment.length > 0 && (() => {
                                const setupInfo = getSetupFOV(equipment);
                                return setupInfo.fov ? (
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                                            <Crosshair size={16} /> FOV Filter
                                        </label>
                                        <button
                                            onClick={() => setFovFilter(!fovFilter)}
                                            className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                                                fovFilter ? 'bg-primary text-white' : 'bg-surface-light text-text-secondary hover:bg-primary/10 hover:text-primary'
                                            }`}
                                        >
                                            <Crosshair size={14} />
                                            {fovFilter ? 'Fits My Setup' : 'All Targets'}
                                        </button>
                                        <p className='text-xs text-text-secondary'>
                                            {setupInfo.telescope?.name} + {setupInfo.camera?.name}
                                            <br />
                                            FOV: {setupInfo.fov.widthArcmin}&apos; × {setupInfo.fov.heightArcmin}&apos;
                                            {setupInfo.imageScale && ` | ${setupInfo.imageScale}"/px`}
                                        </p>
                                    </div>
                                ) : null;
                            })()}
                        </div>
                    </div>
                )}

                {/* Results Section */}
                {coordinates ? (
                    <div className="space-y-6">
                        {/* Weather Forecast */}
                        <NightlyForecastView 
                            forecast={nightlyForecast || []}
                            isLoading={isLoadingNightly}
                            error={nightlyError}
                            onSelectDate={setSelectedDate}
                            selectedDate={selectedDate}
                        />

                        <h2 className="font-display font-bold text-2xl flex items-center gap-2">
                            <Star className="text-yellow-400" /> Top Recommendations
                        </h2>
                        
                        {bestTargets.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {bestTargets.map((target) => (
                                    <div key={target.id} className="bg-surface border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-all group flex flex-col">
                                        <div 
                                            className="aspect-video w-full overflow-hidden bg-black relative cursor-pointer"
                                            onClick={() => handleImageClick(target.image || '', target.commonName || target.id)}
                                        >
                                            <img 
                                                src={target.image || 'https://via.placeholder.com/640x360?text=No+Image'} 
                                                alt={target.commonName || target.id}
                                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500 group-hover:scale-105 transform"
                                                referrerPolicy="no-referrer"
                                            />
                                            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-xs font-mono font-bold border border-white/10 pointer-events-none">
                                                Mag {target.magnitude}
                                            </div>
                                            <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-xs font-mono font-bold border border-white/10 flex items-center gap-1 pointer-events-none">
                                                <Clock size={12} className="text-primary" />
                                                {target.imagingWindow.duration.toFixed(1)}h Window
                                            </div>
                                        </div>
                                        <div className="p-5 space-y-3 flex-grow flex flex-col">
                                            <div>
                                                <div className="flex justify-between items-start">
                                                    <h3 className="font-display font-bold text-xl">{target.id}</h3>
                                                    <div className="flex gap-2">
                                                        {target.difficulty && (
                                                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                                                                target.difficulty === 'Easy' ? 'bg-green-500/20 text-green-400' :
                                                                target.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                                                'bg-red-500/20 text-red-400'
                                                            }`}>
                                                                {target.difficulty}
                                                            </span>
                                                        )}
                                                        <span className="text-xs font-mono text-text-secondary border border-border px-1.5 py-0.5 rounded">
                                                            {target.constellation}
                                                        </span>
                                                        {/* FOV Fit Badge */}
                                                        {fovFilter && equipment.length > 0 && (() => {
                                                            const setupInfo = getSetupFOV(equipment);
                                                            if (!setupInfo.fov) return null;
                                                            const fit = checkTargetFit(target.angularSize, setupInfo.fov);
                                                            const colors = {
                                                                perfect: 'bg-emerald-500/20 text-emerald-400',
                                                                good: 'bg-green-500/20 text-green-400',
                                                                tight: 'bg-yellow-500/20 text-yellow-400',
                                                                too_large: 'bg-red-500/20 text-red-400'
                                                            };
                                                            return (
                                                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${colors[fit.fit]}`}>
                                                                    {fit.fit === 'perfect' ? '✓' : fit.fit === 'good' ? '≈' : fit.fit === 'tight' ? '⚠' : '✗'}
                                                                    {target.angularSize ? `${target.angularSize.width}'` : ''}
                                                                </span>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                                <p className="text-primary font-medium">{target.commonName}</p>
                                                <p className="text-sm text-text-secondary italic">{target.objectType}</p>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-2 text-sm border-t border-border pt-3">
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-text-secondary uppercase">Type</span>
                                                    <span>{target.objectType}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-text-secondary uppercase">Distance</span>
                                                    <span>{target.distance ? `${target.distance} ${target.distanceUnit}` : 'N/A'}</span>
                                                </div>
                                            </div>

                                            <div className="border-t border-border pt-3 flex-grow">
                                                <div className="h-32 w-full">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <AreaChart data={target.imagingWindow.graphData}>
                                                            <defs>
                                                                <linearGradient id={`colorAlt-${target.id}`} x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.3}/>
                                                                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                                                                </linearGradient>
                                                                <linearGradient id={`colorImaging-${target.id}`} x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="5%" stopColor="#4ade80" stopOpacity={0.8}/>
                                                                    <stop offset="95%" stopColor="#4ade80" stopOpacity={0}/>
                                                                </linearGradient>
                                                            </defs>
                                                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                                            <XAxis 
                                                                dataKey="timestamp" 
                                                                type="number"
                                                                domain={['dataMin', 'dataMax']}
                                                                tickFormatter={(unixTime) => new Date(unixTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                                tick={{fontSize: 10, fill: '#666'}} 
                                                                interval="preserveStartEnd"
                                                                stroke="#444"
                                                            />
                                                            <YAxis 
                                                                domain={[0, 90]} 
                                                                hide 
                                                            />
                                                            <Tooltip 
                                                                labelFormatter={(label) => new Date(label).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                                contentStyle={{backgroundColor: '#111', border: '1px solid #333', borderRadius: '4px', fontSize: '12px'}}
                                                                itemStyle={{color: '#ccc'}}
                                                                labelStyle={{color: '#888'}}
                                                                formatter={(value: any, name: any, props: any) => {
                                                                    if (name === 'alt') return [`${value}°`, 'Altitude'];
                                                                    if (name === 'imagingAlt') return [value ? `${value}°` : 'N/A', 'Imaging Window'];
                                                                    return [value, name];
                                                                }}
                                                            />
                                                            <ReferenceLine 
                                                                y={minAltitude} 
                                                                stroke="red" 
                                                                strokeDasharray="3 3" 
                                                                label={{ value: `${minAltitude}° Min`, position: 'insideTopLeft', fill: 'red', fontSize: 10 }}
                                                            />
                                                            {target.darknessWindow && (
                                                                <>
                                                                    <ReferenceLine 
                                                                        x={target.darknessWindow.start.getTime()} 
                                                                        stroke="cyan" 
                                                                        strokeDasharray="3 3"
                                                                        label={{ value: "Dark Start", position: 'insideTopRight', fill: 'cyan', fontSize: 10, angle: -90, dy: 20 }}
                                                                    />
                                                                    <ReferenceLine 
                                                                        x={target.darknessWindow.end.getTime()} 
                                                                        stroke="cyan" 
                                                                        strokeDasharray="3 3"
                                                                        label={{ value: "Dark End", position: 'insideTopLeft', fill: 'cyan', fontSize: 10, angle: -90, dy: 20 }}
                                                                    />
                                                                </>
                                                            )}
                                                            {/* Background Altitude (Potential) */}
                                                            <Area 
                                                                type="monotone" 
                                                                dataKey="alt" 
                                                                stroke="#8884d8" 
                                                                strokeOpacity={0.5}
                                                                fillOpacity={1} 
                                                                fill={`url(#colorAlt-${target.id})`} 
                                                            />
                                                            {/* Actual Imaging Window (Good Weather + Dark + High Enough) */}
                                                            <Area 
                                                                type="monotone" 
                                                                dataKey="imagingAlt" 
                                                                stroke="#4ade80" 
                                                                strokeWidth={2}
                                                                fillOpacity={1} 
                                                                fill={`url(#colorImaging-${target.id})`} 
                                                                connectNulls={false}
                                                            />
                                                        </AreaChart>
                                                    </ResponsiveContainer>
                                                </div>
                                                <div className="flex justify-between text-xs text-text-secondary mt-1">
                                                    <span>18:00</span>
                                                    <span className="text-primary font-bold flex items-center gap-1">
                                                        Transit: {target.imagingWindow.transitTime ? target.imagingWindow.transitTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}
                                                        <span className="text-text-secondary font-normal">
                                                            ({Math.round(target.imagingWindow.maxAlt)}°)
                                                        </span>
                                                    </span>
                                                    <span>08:00</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-surface/30 rounded-lg border border-border border-dashed">
                                <p className="text-text-secondary">
                                    {isCatalogLoading ? "Loading catalog..." : "No suitable targets found for this date/location combination."}
                                </p>
                                <p className="text-sm text-text-secondary mt-2">Try checking a different season or finding a darker location.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <MapPin size={48} className="mx-auto text-text-secondary mb-4 opacity-50" />
                        <h3 className="text-xl font-bold text-text-secondary">Select a location to see recommendations</h3>
                    </div>
                )}
            </div>

            {/* Lightbox for viewing images */}
            <Lightbox 
                isOpen={lightboxOpen} 
                onClose={() => setLightboxOpen(false)} 
                items={currentImage ? [currentImage] : []} 
            />

            {/* Difficulty Help Modal */}
            <Modal isOpen={showDifficultyHelp} onClose={() => setShowDifficultyHelp(false)} title="Target Difficulty Guide">
                <div className="space-y-6">
                    <p className="text-text-secondary">
                        Difficulty levels are categorized based on <strong>brightness (magnitude)</strong>, <strong>size</strong>, and <strong>surface brightness</strong>, which determine how easy an object is to locate and photograph.
                    </p>
                    
                    <div className="space-y-4">
                        <div className="bg-surface border border-border rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-sm font-bold">Easy (Beginner)</span>
                            </div>
                            <ul className="list-disc list-inside text-sm text-text-secondary space-y-1 ml-1">
                                <li><strong>Criteria:</strong> Very bright (Mag &lt; 6) and large.</li>
                                <li><strong>Equipment:</strong> Visible with binoculars. Can be photographed with a standard DSLR and tripod or simple tracker.</li>
                                <li><strong>Examples:</strong> Orion Nebula (M42), Pleiades (M45), Andromeda Galaxy (M31).</li>
                            </ul>
                        </div>

                        <div className="bg-surface border border-border rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded text-sm font-bold">Medium (Intermediate)</span>
                            </div>
                            <ul className="list-disc list-inside text-sm text-text-secondary space-y-1 ml-1">
                                <li><strong>Criteria:</strong> Moderately bright (Mag 6-9) or compact.</li>
                                <li><strong>Equipment:</strong> Requires a telescope and a tracking mount. Longer exposures (30s - 2m) needed.</li>
                                <li><strong>Examples:</strong> Whirlpool Galaxy (M51), Dumbbell Nebula (M27), Hercules Cluster (M13).</li>
                            </ul>
                        </div>

                        <div className="bg-surface border border-border rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-sm font-bold">Hard (Advanced)</span>
                            </div>
                            <ul className="list-disc list-inside text-sm text-text-secondary space-y-1 ml-1">
                                <li><strong>Criteria:</strong> Faint (Mag &gt; 9), very small, or low surface brightness.</li>
                                <li><strong>Equipment:</strong> Requires a telescope with precise guiding and long integration times (hours). Dark skies essential.</li>
                                <li><strong>Examples:</strong> Pinwheel Galaxy (M101), Crab Nebula (M1), smaller Virgo galaxies.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
