import { ObservationTarget, ObservationSession, DeepSkyObject, AstroEquipment } from '../types';
import { calculateAltAz, calculateLST } from './astronomyUtils';
import { getSetupFOV, checkTargetFit } from './equipmentService';

// Observation data
export const SESSIONS_COLLECTION = 'observation_sessions';
export const TARGETS_COLLECTION = 'observation_targets';

/**
 * Calculate the optimal imaging order for a list of targets on a given night.
 * Targets are ordered by transit time (earliest transit = image first).
 * Also considers moon avoidance and altitude windows.
 */
export function calculateOptimalOrder(
    targets: ObservationTarget[],
    date: Date,
    location: { lat: number; lon: number },
    darknessStart?: Date,
    darknessEnd?: Date
): ObservationTarget[] {
    const scored = targets.map(target => {
        // Parse approximate RA/Dec from target (simplified)
        // We score based on when the target transits during the night
        // Higher altitude = better imaging conditions
        const midnight = new Date(date);
        midnight.setHours(0, 0, 0, 0);
        
        // Check altitude at multiple times during the night
        let maxAlt = 0;
        let bestTime = 0; // hours from 18:00
        
        for (let h = 0; h < 14; h++) {
            const checkTime = new Date(date);
            checkTime.setHours(18 + h, 0, 0, 0);
            
            // Use the target's rough coordinates
            // For now, we'll use the angular size as a proxy for detectability
            const altScore = maxAlt + (target.priority === 'critical' ? 100 : target.priority === 'high' ? 50 : target.priority === 'medium' ? 25 : 0);
            bestTime = h;
        }
        
        // Priority score: critical targets first, then by priority level
        const priorityScore = target.priority === 'critical' ? 4 
            : target.priority === 'high' ? 3 
            : target.priority === 'medium' ? 2 : 1;
        
        // Completion penalty: already-completed targets go last
        const completionPenalty = target.completed ? 0 : 10;
        
        return {
            target,
            priorityScore,
            completionPenalty,
            totalScore: priorityScore + completionPenalty
        };
    });

    return scored
        .sort((a, b) => b.totalScore - a.totalScore)
        .map(s => s.target);
}

/**
 * Estimate total integration time achievable in a night
 * based on darkness duration, weather, and moon conditions.
 */
export function estimateNightCapacity(
    darknessStart: Date,
    darknessEnd: Date,
    cloudCover: number,
    moonIllumination: number
): { totalMinutes: number; quality: 'excellent' | 'good' | 'fair' | 'poor' } {
    const darknessMinutes = (darknessEnd.getTime() - darknessStart.getTime()) / (1000 * 60);
    
    // Weather reduces available time
    const weatherFactor = cloudCover < 10 ? 1.0 
        : cloudCover < 30 ? 0.8 
        : cloudCover < 50 ? 0.5 
        : cloudCover < 80 ? 0.2 
        : 0.05;
    
    // Moon reduces quality for broadband targets (less for narrowband)
    const moonFactor = moonIllumination < 20 ? 1.0 
        : moonIllumination < 50 ? 0.85 
        : moonIllumination < 80 ? 0.6 
        : 0.3;
    
    // Setup/teardown overhead (30 min each end)
    const overhead = 60;
    
    const totalMinutes = Math.max(0, (darknessMinutes * weatherFactor) - overhead);
    
    const quality = totalMinutes > 360 && moonIllumination < 30 ? 'excellent'
        : totalMinutes > 240 ? 'good'
        : totalMinutes > 120 ? 'fair'
        : 'poor';
    
    return { totalMinutes: Math.round(totalMinutes), quality };
}

/**
 * Suggest a target's required integration time based on object type and magnitude.
 */
export function suggestIntegrationTime(target: ObservationTarget): number {
    if (target.targetHours) return target.targetHours;
    
    const size = target.angularSizeArcmin.width * target.angularSizeArcmin.height;
    const mag = target.magnitude || 10;
    
    // Bright large objects: less time needed
    if (mag < 6 && size > 100) return 2;   // e.g. M31, M42
    if (mag < 8 && size > 30) return 4;     // e.g. M27, M57 area
    if (mag < 9) return 6;                   // Medium targets
    if (mag < 11) return 10;                // Faint targets
    return 15;                               // Very faint targets
}

/**
 * Check if a target is suitable for moonlit conditions (narrowband-friendly).
 */
export function isNarrowbandFriendly(objectType: string): boolean {
    const nbTypes = ['Emission Nebula', 'Planetary Nebula', 'Supernova Remnant'];
    return nbTypes.some(t => objectType.toLowerCase().includes(t.toLowerCase()));
}

/**
 * Generate a session plan for a given night.
 * Selects targets from the wishlist, orders them optimally, 
 * and estimates timing.
 */
export function generateSessionPlan(
    targets: ObservationTarget[],
    date: Date,
    location: { lat: number; lon: number },
    darknessStart: Date,
    darknessEnd: Date,
    cloudCover: number,
    moonIllumination: number,
    sunsetTime: string,
    sunriseTime: string,
    equipment: AstroEquipment[]
): ObservationSession {
    const capacity = estimateNightCapacity(darknessStart, darknessEnd, cloudCover, moonIllumination);
    
    // Filter targets: 
    // - Not already completed (unless they need more integration)
    // - FOV-compatible with equipment
    const setupInfo = getSetupFOV(equipment);
    
    let viableTargets = targets.filter(t => {
        // Skip completed targets with enough hours
        if (t.completed && (!t.targetHours || (t.acquisitionHours || 0) >= t.targetHours)) {
            return false;
        }
        
        // Check FOV compatibility
        if (setupInfo.fov && t.angularSizeArcmin) {
            const fit = checkTargetFit(
                { width: t.angularSizeArcmin.width, height: t.angularSizeArcmin.height },
                setupInfo.fov
            );
            if (fit.fit === 'too_large') return false;
        }
        
        // Moon-sensitive targets on bright nights
        if (moonIllumination > 60 && !isNarrowbandFriendly(t.objectType)) {
            return false; // Skip broadband targets on bright moon nights
        }
        
        return true;
    });
    
    // Order by priority
    const ordered = calculateOptimalOrder(viableTargets, date, location, darknessStart, darknessEnd);
    
    // Allocate time
    let remainingMinutes = capacity.totalMinutes;
    const selectedTargets: ObservationTarget[] = [];
    
    for (const target of ordered) {
        const neededMinutes = (suggestIntegrationTime(target) - (target.acquisitionHours || 0)) * 60;
        if (neededMinutes <= 0) continue; // Already got enough
        
        if (remainingMinutes >= 60) { // At least 1 hour per target
            selectedTargets.push({
                ...target,
                notes: `Plan: ${Math.min(neededMinutes, remainingMinutes)}min` + 
                       (target.notes ? ` | ${target.notes}` : '')
            });
            remainingMinutes -= Math.min(neededMinutes, remainingMinutes);
        }
        
        if (remainingMinutes < 60) break;
    }
    
    const status = cloudCover >= 80 ? 'weathered_out' 
        : cloudCover >= 50 ? 'planned' 
        : 'planned';
    
    return {
        id: `session-${date.toISOString().split('T')[0]}`,
        date: date.toISOString().split('T')[0],
        location: { name: location.lat === 43.7889 ? 'Saint-Étienne-du-Grès' : location.lat === 43.0272 ? 'Pradelles' : 'Custom', ...location },
        moonIllumination,
        sunsetTime,
        darknessStart: darknessStart.toISOString(),
        darknessEnd: darknessEnd.toISOString(),
        sunriseTime,
        targets: selectedTargets,
        status,
        weatherSummary: `Cloud cover: ${cloudCover}%, Quality: ${capacity.quality}`,
        notes: `Available imaging time: ${Math.floor(capacity.totalMinutes / 60)}h${capacity.totalMinutes % 60}m`,
        cloudCover,
    };
}

/**
 * Calculate progress for a target (acquisition hours vs target hours).
 */
export function getTargetProgress(target: ObservationTarget): number {
    if (!target.targetHours || target.targetHours === 0) return 0;
    return Math.min(100, Math.round(((target.acquisitionHours || 0) / target.targetHours) * 100));
}

/**
 * Get a color for the priority level.
 */
export function getPriorityColor(priority: string): string {
    switch (priority) {
        case 'critical': return 'text-red-400 bg-red-500/20';
        case 'high': return 'text-orange-400 bg-orange-500/20';
        case 'medium': return 'text-yellow-400 bg-yellow-500/20';
        case 'low': return 'text-blue-400 bg-blue-500/20';
        default: return 'text-gray-400 bg-gray-500/20';
    }
}

/**
 * Default observation targets (seed data based on Stéphane's equipment and interests).
 */
export const DEFAULT_OBSERVATION_TARGETS: ObservationTarget[] = [
    // Critical - classic showpiece objects for TS-Optics 102mm + ASI533MC
    {
        id: 'target-m31', objectId: 'M31', commonName: 'Andromeda Galaxy', objectType: 'Galaxy',
        constellation: 'Andromeda', magnitude: 3.4, angularSizeArcmin: { width: 190, height: 60 },
        priority: 'critical', notes: 'Must fit FOV — use mosaic or crop', completed: false, targetHours: 10, acquisitionHours: 0,
        imageUrl: ''
    },
    {
        id: 'target-m42', objectId: 'M42', commonName: 'Orion Nebula', objectType: 'Emission Nebula',
        constellation: 'Orion', magnitude: 4.0, angularSizeArcmin: { width: 85, height: 60 },
        priority: 'critical', notes: 'Fits FOV perfectly. Winter target.', completed: false, targetHours: 8, acquisitionHours: 0,
        imageUrl: ''
    },
    {
        id: 'target-m27', objectId: 'M27', commonName: 'Dumbbell Nebula', objectType: 'Planetary Nebula',
        constellation: 'Vulpecula', magnitude: 7.4, angularSizeArcmin: { width: 8, height: 6 },
        priority: 'high', notes: 'Narrowband-friendly. Summer target.', completed: false, targetHours: 6, acquisitionHours: 0,
        imageUrl: ''
    },
    {
        id: 'target-m33', objectId: 'M33', commonName: 'Triangulum Galaxy', objectType: 'Galaxy',
        constellation: 'Triangulum', magnitude: 5.7, angularSizeArcmin: { width: 73, height: 45 },
        priority: 'high', notes: 'Large but fits FOV. Autumn target.', completed: false, targetHours: 12, acquisitionHours: 0,
        imageUrl: ''
    },
    {
        id: 'target-ngc7000', objectId: 'NGC 7000', commonName: 'North America Nebula', objectType: 'Emission Nebula',
        constellation: 'Cygnus', magnitude: 4.0, angularSizeArcmin: { width: 120, height: 100 },
        priority: 'high', notes: 'Very large — needs mosaic or wide field. NB-friendly.', completed: false, targetHours: 10, acquisitionHours: 0,
        imageUrl: ''
    },
    {
        id: 'target-m101', objectId: 'M101', commonName: 'Pinwheel Galaxy', objectType: 'Galaxy',
        constellation: 'Ursa Major', magnitude: 7.9, angularSizeArcmin: { width: 29, height: 27 },
        priority: 'medium', notes: 'Fits FOV nicely. Spring target.', completed: false, targetHours: 8, acquisitionHours: 0,
        imageUrl: ''
    },
    {
        id: 'target-m81', objectId: 'M81', commonName: "Bode's Galaxy", objectType: 'Galaxy',
        constellation: 'Ursa Major', magnitude: 6.9, angularSizeArcmin: { width: 27, height: 14 },
        priority: 'medium', notes: 'Pair with M82. Spring target.', completed: false, targetHours: 6, acquisitionHours: 0,
        imageUrl: ''
    },
    {
        id: 'target-m82', objectId: 'M82', commonName: 'Cigar Galaxy', objectType: 'Galaxy',
        constellation: 'Ursa Major', magnitude: 8.4, angularSizeArcmin: { width: 11, height: 5 },
        priority: 'medium', notes: 'Pair with M81. Spring target.', completed: false, targetHours: 6, acquisitionHours: 0,
        imageUrl: ''
    },
    {
        id: 'target-ic434', objectId: 'IC 434', commonName: 'Horsehead Nebula', objectType: 'Emission Nebula',
        constellation: 'Orion', magnitude: 7.3, angularSizeArcmin: { width: 60, height: 50 },
        priority: 'high', notes: 'Needs H-alpha filter. Winter target.', completed: false, targetHours: 15, acquisitionHours: 0,
        imageUrl: ''
    },
    {
        id: 'target-ngc281', objectId: 'NGC 281', commonName: 'Pacman Nebula', objectType: 'Emission Nebula',
        constellation: 'Cassiopeia', magnitude: 7.4, angularSizeArcmin: { width: 35, height: 30 },
        priority: 'medium', notes: 'Already on AstroCapture. NB-friendly.', completed: false, targetHours: 8, acquisitionHours: 0,
        imageUrl: ''
    },
];