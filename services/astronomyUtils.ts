// Utility functions for astronomical calculations

export interface CelestialCoordinates {
    ra: number; // Right Ascension in degrees
    dec: number; // Declination in degrees
}

export interface ObserverLocation {
    lat: number; // Latitude in degrees
    lon: number; // Longitude in degrees
}

/**
 * Parses RA string (HH:MM:SS.S) to degrees
 */
export function parseRA(raStr: string): number {
    if (!raStr) return 0;
    const parts = raStr.split(':');
    const h = parseFloat(parts[0]);
    const m = parseFloat(parts[1]);
    const s = parseFloat(parts[2]);
    return (h + m / 60 + s / 3600) * 15;
}

/**
 * Parses Dec string (+DD:MM:SS.S) to degrees
 */
export function parseDec(decStr: string): number {
    if (!decStr) return 0;
    const parts = decStr.split(':');
    const d = parseFloat(parts[0]);
    const m = parseFloat(parts[1]);
    const s = parseFloat(parts[2]);
    const sign = decStr.startsWith('-') ? -1 : 1;
    // Handle negative sign correctly for minutes/seconds
    const absD = Math.abs(d);
    return sign * (absD + m / 60 + s / 3600);
}

/**
 * Calculates Local Sidereal Time (LST) in degrees
 */
export function calculateLST(date: Date, longitude: number): number {
    // Julian Date calculation
    const d = new Date(date);
    // Convert to UTC
    const utcYear = d.getUTCFullYear();
    const utcMonth = d.getUTCMonth() + 1;
    const utcDay = d.getUTCDate();
    const utcHours = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;

    // J2000
    const J2000 = 2451545.0;
    
    // Calculate JD
    let Y = utcYear;
    let M = utcMonth;
    if (M <= 2) {
        Y -= 1;
        M += 12;
    }
    const A = Math.floor(Y / 100);
    const B = 2 - A + Math.floor(A / 4);
    const JD = Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + utcDay + B - 1524.5 + utcHours / 24;

    // Days since J2000
    const D = JD - J2000;

    // GMST (Greenwich Mean Sidereal Time) in degrees
    let GMST = 280.46061837 + 360.98564736629 * D;
    GMST = GMST % 360;
    if (GMST < 0) GMST += 360;

    // LST = GMST + Longitude
    let LST = GMST + longitude;
    LST = LST % 360;
    if (LST < 0) LST += 360;

    return LST;
}

/**
 * Calculates Altitude and Azimuth of a celestial object
 */
export function calculateAltAz(coords: CelestialCoordinates, location: ObserverLocation, date: Date): { alt: number; az: number } {
    const lst = calculateLST(date, location.lon);
    const ha = (lst - coords.ra + 360) % 360; // Hour Angle in degrees

    // Convert to radians
    const radHa = ha * (Math.PI / 180);
    const radDec = coords.dec * (Math.PI / 180);
    const radLat = location.lat * (Math.PI / 180);

    // Calculate Altitude
    const sinAlt = Math.sin(radDec) * Math.sin(radLat) + Math.cos(radDec) * Math.cos(radLat) * Math.cos(radHa);
    const alt = Math.asin(sinAlt) * (180 / Math.PI);

    // Calculate Azimuth
    const cosAz = (Math.sin(radDec) - Math.sin(radLat) * sinAlt) / (Math.cos(radLat) * Math.cos(Math.asin(sinAlt)));
    let az = Math.acos(cosAz) * (180 / Math.PI);
    
    if (Math.sin(radHa) > 0) {
        az = 360 - az;
    }

    return { alt, az };
}

export interface ImagingWindowResult {
    duration: number;
    maxAlt: number;
    transitTime: Date | null;
    graphData: { time: string; timestamp: number; alt: number; isDark: boolean; isGoodWeather: boolean; imagingAlt: number | null }[];
}

/**
 * Calculates the best imaging window (time above 30 degrees altitude) for a given night
 * Now considers weather conditions if provided.
 */
export function calculateImagingWindow(
    coords: CelestialCoordinates, 
    location: ObserverLocation, 
    date: Date,
    darknessStart?: Date,
    darknessEnd?: Date,
    minAltitude: number = 30,
    hourlyWeather?: any[] // Should be AstroForecastHour[] but avoiding circular dependency if possible, or just use any for now as it's a utility
): ImagingWindowResult {
    // Check every 15 minutes from sunset to sunrise (approximate night window 18:00 to 06:00 local time)
    // For simplicity, we'll check a 24h window centered on midnight of the target date
    
    const checkDate = new Date(date);
    checkDate.setHours(18, 0, 0, 0); // Start at 6 PM
    
    let durationMinutes = 0;
    let maxAlt = -90;
    let transitTime = null;
    const graphData: { time: string; timestamp: number; alt: number; isDark: boolean; isGoodWeather: boolean }[] = [];
    
    // Check for next 14 hours (night time)
    for (let i = 0; i < 14 * 4; i++) {
        const currentCheck = new Date(checkDate.getTime() + i * 15 * 60 * 1000);
        const { alt } = calculateAltAz(coords, location, currentCheck);
        
        if (alt > maxAlt) {
            maxAlt = alt;
            transitTime = new Date(currentCheck);
        }
        
        const isDark = darknessStart && darknessEnd 
            ? currentCheck >= darknessStart && currentCheck <= darknessEnd
            : true; // Default to true if no darkness data provided (backward compatibility)

        // Weather Check
        let isGoodWeather = true;
        if (hourlyWeather && hourlyWeather.length > 0) {
            // Find closest weather hour
            // We assume hourlyWeather is sorted or we just find the matching hour
            const checkTime = currentCheck.getTime();
            const weatherPoint = hourlyWeather.find(w => {
                const wTime = new Date(w.time).getTime();
                return Math.abs(wTime - checkTime) <= 30 * 60 * 1000 + 1000; // Within 30 mins (inclusive + 1s buffer)
            });

            if (weatherPoint) {
                // Criteria:
                // Clouds < 10% (Strict: >= 10 is bad)
                // Rain == 0
                // Wind < 10 km/h (Strict: >= 10 is bad)
                if (weatherPoint.clouds.total >= 10 || weatherPoint.precipitation > 0 || weatherPoint.wind.speed >= 10) {
                    isGoodWeather = false;
                }
            }
        }

        // Determine if this specific moment is valid for imaging
        const isValidImagingMoment = alt > minAltitude && isDark && isGoodWeather;

        if (isValidImagingMoment) { 
            durationMinutes += 15;
        }

        // Add point to graph data (every 30 mins to keep it clean, or every 15 mins)
        // Let's do every 30 mins (every 2nd iteration)
        if (i % 2 === 0) {
            graphData.push({
                time: currentCheck.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
                timestamp: currentCheck.getTime(),
                alt: Math.round(alt),
                isDark,
                isGoodWeather,
                // imagingAlt is the altitude ONLY if conditions are perfect. Used for the "active" graph area.
                imagingAlt: isValidImagingMoment ? Math.round(alt) : null 
            });
        }
    }
    
    return {
        duration: durationMinutes / 60, // hours
        maxAlt,
        transitTime,
        graphData
    };
}
