
import { AstroForecastResponse, AstroForecastHour } from '../types';

// Helper function to parse HH:MM time strings for a given date.
const parseTime = (date: Date, timeStr: string): Date => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const newDate = new Date(date);
    newDate.setHours(hours, minutes, 0, 0);
    return newDate;
};

const getAntoniadiScale = (seeingValue: number): 'I' | 'II' | 'III' | 'IV' | 'V' => {
    if (seeingValue >= 4.5) return 'I';   // Excellent
    if (seeingValue >= 3.5) return 'II';  // Good
    if (seeingValue >= 2.5) return 'III'; // Moderate
    if (seeingValue >= 1.5) return 'IV';  // Poor
    return 'V';                           // Very Poor
};

const getSeeingResolution = (antoniadi: 'I' | 'II' | 'III' | 'IV' | 'V'): string => {
    switch (antoniadi) {
        case 'I': return '< 0.5"';
        case 'II': return '0.5" - 0.75"';
        case 'III': return '0.75" - 1.25"';
        case 'IV': return '1.25" - 2.0"';
        case 'V': return '> 2.0"';
        default: return 'N/A';
    }
};

const getAstroIndexColor = (score: number): string => {
    if (score >= 85) return 'text-green-400';
    if (score >= 70) return 'text-lime-400';
    if (score >= 50) return 'text-yellow-400';
    if (score >= 30) return 'text-orange-400';
    return 'text-red-500';
};

const calculateAstroIndex = (params: {
    cloudTotal: number;
    cloudLow: number;
    precip: number;
    seeingValue: number;
    dewRiskLevel: 'Critical' | 'Warning' | 'Safe';
    moonIllumination: number;
}): number => {
    let score = 100;

    // Precipitation is a showstopper
    if (params.precip > 0) return 0;

    // Cloud cover penalties (heavy)
    if (params.cloudTotal > 80) return 0;
    if (params.cloudTotal > 50) score -= 75;
    else if (params.cloudTotal > 20) score -= 40;
    else if (params.cloudTotal > 5) score -= 20;

    // Low clouds are worse
    if (params.cloudLow > 30) score -= 20;
    
    // Moon illumination penalties
    if (params.moonIllumination > 90) score -= 25;
    else if (params.moonIllumination > 70) score -= 20;
    else if (params.moonIllumination > 40) score -= 15;
    else if (params.moonIllumination > 10) score -= 5;
    
    // Seeing penalties
    const seeingScale = getAntoniadiScale(params.seeingValue);
    if (seeingScale === 'V') score -= 30;
    else if (seeingScale === 'IV') score -= 20;
    else if (seeingScale === 'III') score -= 10;
    
    // Dew risk penalties
    if (params.dewRiskLevel === 'Critical') score -= 15;
    else if (params.dewRiskLevel === 'Warning') score -= 5;

    return Math.max(0, Math.round(score));
};


/**
 * Maps and filters raw weather forecast data to a specialized imaging window forecast.
 * @param data The raw AstroForecastResponse from the API.
 * @param darknessStart The time astronomical darkness begins (e.g., "19:45").
 * @param darknessEnd The time astronomical darkness ends (e.g., "05:30").
 * @param forecastDate The primary date of the forecast.
 * @param moonIllumination The percentage of moon illumination for the night.
 * @returns An array of AstroForecastHour objects for the valid imaging window.
 */
export const mapAndFilterImagingWindow = (
    data: AstroForecastResponse | null,
    darknessStart: string,
    darknessEnd: string,
    forecastDate: Date,
    moonIllumination: number
): AstroForecastHour[] => {
    if (!data || !data.time || data.time.length === 0 || !darknessStart || !darknessEnd) {
        return [];
    }

    try {
        const today = new Date(forecastDate);
        today.setHours(0, 0, 0, 0);

        // Parse start and end times
        let darknessStartDate = parseTime(today, darknessStart);
        let darknessEndDate = parseTime(today, darknessEnd);

        // Handle overnight window (e.g., starts at 21:00, ends at 05:00 next day)
        if (darknessEndDate < darknessStartDate) {
            darknessEndDate.setDate(darknessEndDate.getDate() + 1);
        }

        // Define the full window: 1h before start to 1h after end
        const windowStart = new Date(darknessStartDate.getTime() - 60 * 60 * 1000);
        const windowEnd = new Date(darknessEndDate.getTime() + 60 * 60 * 1000);

        const imagingHours: AstroForecastHour[] = [];

        data.time.forEach((timeStr, i) => {
            const hourTime = new Date(timeStr);

            // Filter to include only hours within our imaging window
            if (hourTime >= windowStart && hourTime <= windowEnd) {
                
                // Raw data for the hour
                const temp = data.temperature_2m[i];
                const dewpoint = data.dewpoint_2m[i];
                const humidity = data.relative_humidity_2m[i];
                const precip = data.precipitation[i];
                const cloudTotal = data.cloud_cover[i];
                const cloudLow = data.cloud_cover_low[i];
                const cloudMid = data.cloud_cover_mid[i];
                const cloudHigh = data.cloud_cover_high[i];
                const windSpeed = data.wind_speed_10m[i];
                const windGusts = data.wind_gusts_10m[i];

                // --- Logic Calculations ---

                // 1. Dew Risk
                const spread = temp - dewpoint;
                let dewRiskLevel: 'Critical' | 'Warning' | 'Safe';
                if (spread <= 1.0) dewRiskLevel = 'Critical';
                else if (spread <= 2.5) dewRiskLevel = 'Warning';
                else dewRiskLevel = 'Safe';

                // 2. Seeing & Transparency
                let seeingValue = 5.0;
                let seeingReason = "Excellent conditions";

                // Turbulence Penalty
                if (windGusts > 25) {
                    seeingValue -= 1.5;
                    seeingReason = "High Wind Gusts";
                } else if (windSpeed > 0 && (windGusts / windSpeed) > 1.8) {
                    seeingValue -= 1.5;
                    seeingReason = "Turbulent Winds";
                }
                
                // Transparency Penalty (Cirrus)
                if (cloudHigh > 15 && seeingReason === "Excellent conditions") {
                    seeingValue -= 1.0;
                    seeingReason = "High-Altitude Haze";
                }

                // Moisture Penalty
                if (humidity > 80 && seeingReason === "Excellent conditions") {
                    seeingValue -= 1.0;
                    seeingReason = "High Humidity";
                }

                // Hard Ceiling for Clouds
                if (cloudTotal > 50) {
                    seeingValue = Math.min(seeingValue, 1.0);
                    seeingReason = "Overcast";
                } else if (cloudTotal > 20) {
                    seeingValue = Math.min(seeingValue, 2.0);
                    seeingReason = "Significant Clouds";
                }
                
                // Clamp and Label
                seeingValue = Math.max(1, Math.min(5, Math.round(seeingValue * 2) / 2)); // Round to nearest 0.5
                const antoniadiScale = getAntoniadiScale(seeingValue);
                const seeingResolution = getSeeingResolution(antoniadiScale);
                
                // Calculate Astro Index
                const astroIndexValue = calculateAstroIndex({
                    cloudTotal, cloudLow, precip, seeingValue, dewRiskLevel, moonIllumination
                });
                const astroIndexColor = getAstroIndexColor(astroIndexValue);

                // Sky Condition Logic
                let skyCondition: 'Clear' | 'Mostly Clear' | 'Partly Cloudy' | 'Mostly Cloudy' | 'Overcast';
                if (cloudTotal <= 10) skyCondition = 'Clear';
                else if (cloudTotal <= 30) skyCondition = 'Mostly Clear';
                else if (cloudTotal <= 60) skyCondition = 'Partly Cloudy';
                else if (cloudTotal <= 90) skyCondition = 'Mostly Cloudy';
                else skyCondition = 'Overcast';

                // Check for "Good to Go" imaging conditions
                const isGoodForImaging = cloudTotal < 20 && windSpeed < 10 && windGusts < 10 && moonIllumination <= 70;

                // Final Mapped Object
                imagingHours.push({
                    time: hourTime,
                    temp,
                    dewpoint,
                    relativeHumidity: humidity,
                    precipitation: precip,
                    clouds: {
                        total: cloudTotal,
                        low: cloudLow,
                        mid: cloudMid,
                        high: cloudHigh,
                    },
                    wind: {
                        speed: windSpeed,
                        gusts: windGusts,
                    },
                    seeing: {
                        antoniadi: antoniadiScale,
                        reason: seeingReason,
                        resolution: seeingResolution,
                    },
                    skyCondition,
                    dewRisk: {
                        level: dewRiskLevel,
                        spread,
                    },
                    astroIndex: {
                        value: astroIndexValue,
                        color: astroIndexColor,
                        isGoodForImaging: isGoodForImaging,
                    }
                });
            }
        });

        return imagingHours;

    } catch (error) {
        console.error("Error processing weather forecast data:", error);
        return [];
    }
};

/**
 * Maps raw hourly forecast data to a 14-day nightly summary.
 * Considers "night" as 21:00 to 05:00.
 */
import { NightlyForecast } from '../types';

export const mapNightlyForecast = (data: AstroForecastResponse | null): NightlyForecast[] => {
    if (!data || !data.time || data.time.length === 0) return [];

    const nightlyForecasts: NightlyForecast[] = [];
    const processedDates = new Set<string>();

    // Helper to estimate moon phase
    const getMoonPhase = (date: Date): string => {
        let year = date.getFullYear();
        let month = date.getMonth() + 1;
        let day = date.getDate();
        if (month < 3) { year--; month += 12; }
        const c = 365.25 * year;
        const e = 30.6 * month;
        const jd = c + e + day - 694039.09; // jd is total days elapsed
        const b = jd / 29.5305882; // divide by the moon cycle
        const phase = parseInt(b.toString()); // int(b) -> b, take integer part of b
        const diff = Math.round((b - phase) * 8); // round to nearest integer
        
        switch (diff) {
            case 0: return 'New Moon';
            case 1: return 'Waxing Crescent';
            case 2: return 'First Quarter';
            case 3: return 'Waxing Gibbous';
            case 4: return 'Full Moon';
            case 5: return 'Waning Gibbous';
            case 6: return 'Last Quarter';
            case 7: return 'Waning Crescent';
            default: return 'New Moon';
        }
    };

    // Iterate through days
    // We start from today.
    const today = new Date();
    today.setHours(0,0,0,0);

    for (let i = 0; i < 14; i++) {
        const currentDate = new Date(today);
        currentDate.setDate(today.getDate() + i);
        const dateStr = currentDate.toISOString().split('T')[0];

        if (processedDates.has(dateStr)) continue;
        processedDates.add(dateStr);

        // Define night window: 21:00 of current day to 05:00 of next day
        const nightStart = new Date(currentDate);
        nightStart.setHours(21, 0, 0, 0);
        
        const nightEnd = new Date(currentDate);
        nightEnd.setDate(nightEnd.getDate() + 1);
        nightEnd.setHours(5, 0, 0, 0);

        // Collect hourly data for this night
        let temps: number[] = [];
        let clouds: number[] = [];
        let precips: number[] = [];
        let windSpeeds: number[] = [];

        data.time.forEach((t, idx) => {
            const time = new Date(t);
            if (time >= nightStart && time <= nightEnd) {
                temps.push(data.temperature_2m[idx]);
                clouds.push(data.cloud_cover[idx]);
                precips.push(data.precipitation[idx]);
                windSpeeds.push(data.wind_speed_10m[idx]);
            }
        });

        if (temps.length === 0) continue;

        const minTemp = Math.min(...temps);
        const maxTemp = Math.max(...temps);
        const avgCloud = clouds.reduce((a, b) => a + b, 0) / clouds.length;
        const totalPrecip = precips.reduce((a, b) => a + b, 0);
        const maxWind = Math.max(...windSpeeds);

        // Determine Condition
        let condition: 'Excellent' | 'Good' | 'Fair' | 'Poor' = 'Poor';
        let summary = '';

        if (totalPrecip > 0.5) {
            condition = 'Poor';
            summary = 'Rain likely';
        } else if (avgCloud > 75) {
            condition = 'Poor';
            summary = 'Mostly cloudy';
        } else if (avgCloud > 40) {
            condition = 'Fair';
            summary = 'Partly cloudy';
        } else if (maxWind > 25) {
            condition = 'Fair';
            summary = 'Windy';
        } else if (avgCloud > 15) {
            condition = 'Good';
            summary = 'Mostly clear';
        } else {
            condition = 'Excellent';
            summary = 'Clear skies';
        }

        nightlyForecasts.push({
            date: currentDate,
            minTemp,
            maxTemp,
            avgCloudCover: avgCloud,
            precipitationChance: totalPrecip > 0 ? 100 : 0, // Simplified
            moonPhase: getMoonPhase(currentDate),
            condition,
            summary
        });
    }

    return nightlyForecasts;
};
