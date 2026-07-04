import React from 'react';
import { MappedAstronomyData, AstroForecastHour, NightlyForecast } from '../types';
import { Button, Select } from './Shared';
import { Moon, Sun, Zap, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchAstroForecast, fetchNightlyForecast } from '../services/weatherService';
import { fetchAstronomyData } from '../services/astronomyApiService';
import { mapAstronomyData } from '../services/astronomyDataMapper';
import { mapAndFilterImagingWindow, mapNightlyForecast as mapNightlyForecastData } from '../services/weatherDataMapper';

const NightlyForecastView = React.lazy(() => import('./NightlyForecastView'));
const WeatherDisplayView = React.lazy(() => import('./WeatherDisplayView'));

const AstroDataCard: React.FC<{ icon: React.ReactNode; label: string; value: string; }> = ({ icon, label, value }) => (
    <div className="bg-background border border-border rounded-lg p-3 text-center">
        <div className="flex items-center justify-center text-text-secondary mb-1">{icon}</div>
        <div className="text-xs text-text-secondary">{label}</div>
        <div className="font-semibold text-sm mt-0.5">{value}</div>
    </div>
);

interface AstroSuiteWeatherViewProps {
  defaultLocation?: string;
}

const AstroSuiteWeatherView: React.FC<AstroSuiteWeatherViewProps> = ({ defaultLocation }) => {
    const [locationSource, setLocationSource] = React.useState<'current' | 'saintEtienne' | 'pradelles' | ''>(
        (defaultLocation as 'current' | 'saintEtienne' | 'pradelles' | '') || ''
    );
    const [coordinates, setCoordinates] = React.useState<{ lat: number; lon: number } | null>(null);
    const [isLoadingLocation, setIsLoadingLocation] = React.useState(false);
    const [locationError, setLocationError] = React.useState<string | null>(null);
    const [currentBortle, setCurrentBortle] = React.useState<number | null>(null);

    const PRESET_LOCATIONS = {
        saintEtienne: { lat: 43.79, lon: 4.72, name: "Saint-Étienne-du-Grès (13103)", bortle: 4 },
        pradelles: { lat: 44.77, lon: 3.88, name: "Pradelles (43420)", bortle: 2 }
    };

    // Sync local location when the parent bandeau changes the default location
    React.useEffect(() => {
        if (defaultLocation && defaultLocation !== locationSource) {
            setLocationSource(defaultLocation as typeof locationSource);
            if (defaultLocation === 'saintEtienne') {
                setCoordinates(PRESET_LOCATIONS.saintEtienne);
                setCurrentBortle(PRESET_LOCATIONS.saintEtienne.bortle);
            } else if (defaultLocation === 'pradelles') {
                setCoordinates(PRESET_LOCATIONS.pradelles);
                setCurrentBortle(PRESET_LOCATIONS.pradelles.bortle);
            }
            setLocationError(null);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [defaultLocation]);

    // (selectedDate moved up — was between old state declarations)
    const [selectedDate, setSelectedDate] = React.useState(new Date());

    // (state declarations continued)
    const [mappedAstroData, setMappedAstroData] = React.useState<MappedAstronomyData | null>(null);
    const [isLoadingAstronomy, setIsLoadingAstronomy] = React.useState(false);
    const [astronomyError, setAstronomyError] = React.useState<string | null>(null);

    const [weatherForecast, setWeatherForecast] = React.useState<AstroForecastHour[] | null>(null);
    const [isLoadingWeather, setIsLoadingWeather] = React.useState(false);
    const [weatherError, setWeatherError] = React.useState<string | null>(null);

    const [nightlyForecast, setNightlyForecast] = React.useState<NightlyForecast[] | null>(null);
    const [isLoadingNightly, setIsLoadingNightly] = React.useState(false);
    const [nightlyError, setNightlyError] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (coordinates) {
            setIsLoadingAstronomy(true);
            setAstronomyError(null);
            setMappedAstroData(null);
            fetchAstronomyData(coordinates.lat, coordinates.lon, selectedDate)
                .then(data => setMappedAstroData(mapAstronomyData(data)))
                .catch(err => {
                    setAstronomyError("Failed to load astronomical data. The API may be unavailable.");
                })
                .finally(() => setIsLoadingAstronomy(false));
        }
    }, [coordinates, selectedDate]);

    React.useEffect(() => {
        if (coordinates && mappedAstroData?.fullNightBegins && mappedAstroData?.fullNightEnds) {
            setIsLoadingWeather(true);
            setWeatherError(null);
            setWeatherForecast(null);
            fetchAstroForecast(coordinates.lat, coordinates.lon, selectedDate)
                .then(data => {
                    const moonIllum = mappedAstroData.moonIllumination ? parseFloat(mappedAstroData.moonIllumination) : 0;
                    const windowData = mapAndFilterImagingWindow(data, mappedAstroData.fullNightBegins, mappedAstroData.fullNightEnds, selectedDate, moonIllum);
                    setWeatherForecast(windowData);
                })
                .catch(err => {
                    setWeatherError("Failed to load weather forecast.");
                })
                .finally(() => setIsLoadingWeather(false));
        }
    }, [coordinates, mappedAstroData, selectedDate]);

    React.useEffect(() => {
        if (coordinates) {
            setIsLoadingNightly(true);
            setNightlyError(null);
            setNightlyForecast(null);
            fetchNightlyForecast(coordinates.lat, coordinates.lon)
                .then(data => setNightlyForecast(mapNightlyForecastData(data)))
                .catch(err => {
                    setNightlyError("Failed to load 14-day forecast.");
                })
                .finally(() => setIsLoadingNightly(false));
        }
    }, [coordinates]);

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
                    setCoordinates({ lat: position.coords.latitude, lon: position.coords.longitude });
                    setCurrentBortle(5);
                    setIsLoadingLocation(false);
                },
                () => {
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxForecastDate = new Date(today);
    maxForecastDate.setDate(today.getDate() + 15);

    const handlePrevDay = () => {
        setSelectedDate(prev => { const d = new Date(prev); d.setDate(prev.getDate() - 1); return d; });
    };
    const handleNextDay = () => {
        setSelectedDate(prev => { const d = new Date(prev); d.setDate(prev.getDate() + 1); return d; });
    };

    const isPrevDisabled = selectedDate.getTime() <= today.getTime();
    const isNextDisabled = selectedDate.getTime() >= maxForecastDate.getTime();

    const formatDateDisplay = (date: Date) => {
        const d = new Date(date); d.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
        if (d.getTime() === today.getTime()) return "Today";
        if (d.getTime() === tomorrow.getTime()) return "Tomorrow";
        return date.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' });
    };

    return (
        <div className="space-y-8">
            <header className="py-4 text-center border-b border-border mb-6">
                <h1 className="text-3xl font-display font-bold">🌤️ Astro Weather</h1>
                <p className="mt-2 text-text-secondary max-w-2xl mx-auto">Real-time stargazing and astrophotography conditions.</p>
            </header>

            <div className="max-w-7xl mx-auto space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-surface border border-border rounded-lg p-6 space-y-4">
                        <Select label="Select Location Source" value={locationSource} onChange={handleLocationChange}>
                            <option value="" disabled>-- Choose a location --</option>
                            <option value="current">My Current Location</option>
                            <option value="saintEtienne">{PRESET_LOCATIONS.saintEtienne.name}</option>
                            <option value="pradelles">{PRESET_LOCATIONS.pradelles.name}</option>
                        </Select>
                        {isLoadingLocation && <p className="text-text-secondary text-center">Fetching your location...</p>}
                        {locationError && <p className="text-red-400 text-center">{locationError}</p>}
                        {coordinates && (
                            <div className="bg-background border border-border p-4 rounded-md font-mono text-sm text-center">
                                <p>
                                    <span className="text-text-secondary">Lat:</span> {coordinates.lat.toFixed(4)}
                                    <span className="text-text-secondary mx-2">|</span>
                                    <span className="text-text-secondary">Lon:</span> {coordinates.lon.toFixed(4)}
                                </p>
                                {currentBortle && (
                                    <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-center gap-2">
                                        <span className="text-text-secondary">Light Pollution:</span>
                                        <span className={`font-bold px-2 py-0.5 rounded text-xs ${
                                            currentBortle <= 3 ? 'bg-blue-900 text-blue-200' :
                                            currentBortle <= 5 ? 'bg-yellow-900 text-yellow-200' :
                                            'bg-red-900 text-red-200'
                                        }`}>Bortle {currentBortle}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="bg-surface border border-border rounded-lg p-6 space-y-4 flex flex-col justify-center">
                        <label className="block text-sm font-medium text-text-secondary">Forecast Date</label>
                        <div className="flex items-center justify-between gap-2">
                            <Button onClick={handlePrevDay} disabled={isPrevDisabled} variant="secondary" size="sm" className="!p-2" aria-label="Previous day">
                                <ChevronLeft size={20} />
                            </Button>
                            <span className="font-semibold text-center text-base sm:text-lg w-full tabular-nums">
                                {formatDateDisplay(selectedDate)}
                            </span>
                            <Button onClick={handleNextDay} disabled={isNextDisabled} variant="secondary" size="sm" className="!p-2" aria-label="Next day">
                                <ChevronRight size={20} />
                            </Button>
                        </div>
                    </div>
                </div>

                {coordinates && (
                    <React.Suspense fallback={<div className="text-center py-10 text-text-secondary">Loading forecast...</div>}>
                        <NightlyForecastView
                            forecast={nightlyForecast || []}
                            isLoading={isLoadingNightly}
                            error={nightlyError}
                            onSelectDate={setSelectedDate}
                            selectedDate={selectedDate}
                        />
                    </React.Suspense>
                )}

                {(isLoadingAstronomy || astronomyError || mappedAstroData) && (
                    <div className="bg-surface border border-border rounded-lg p-6 space-y-4">
                        <h2 className="font-display font-bold text-lg flex items-center gap-2">
                            <Moon size={16} /> Astronomical Data
                        </h2>
                        {isLoadingAstronomy && <p className="text-text-secondary text-center">Loading astronomical data...</p>}
                        {astronomyError && <p className="text-red-400 text-center">{astronomyError}</p>}
                        {mappedAstroData && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 pt-2">
                                <AstroDataCard icon={<Sun size={24} />} label="Sunrise" value={mappedAstroData.sunrise} />
                                <AstroDataCard icon={<Sun size={24} />} label="Sunset" value={mappedAstroData.sunset} />
                                <AstroDataCard icon={<Moon size={24} />} label="Moonrise" value={mappedAstroData.moonrise} />
                                <AstroDataCard icon={<Moon size={24} />} label="Moonset" value={mappedAstroData.moonset} />
                                <AstroDataCard icon={<Zap size={24} />} label="Illumination" value={`${mappedAstroData.moonIllumination}%`} />
                                <AstroDataCard icon={<Moon size={24} />} label="Moon Phase" value={mappedAstroData.moonPhase} />
                                <AstroDataCard icon={<Eye size={24} />} label="Darkness Begins" value={mappedAstroData.fullNightBegins} />
                                <AstroDataCard icon={<Eye size={24} />} label="Darkness Ends" value={mappedAstroData.fullNightEnds} />
                            </div>
                        )}
                    </div>
                )}

                {coordinates && (
                    <React.Suspense fallback={<div className="text-center py-10 text-text-secondary">Loading weather...</div>}>
                        <WeatherDisplayView
                            imagingWindowData={weatherForecast || []}
                            isLoading={isLoadingWeather}
                            error={weatherError}
                        />
                    </React.Suspense>
                )}
            </div>
        </div>
    );
};

export default AstroSuiteWeatherView;