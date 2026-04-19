import { AstroEquipment } from '../types';

/**
 * Calculate the Field of View (FOV) for a telescope + camera combination.
 * Returns FOV in arcminutes.
 */
export function calculateFOV(
    focalLength: number,   // mm
    sensorWidth: number,    // mm
    sensorHeight: number   // mm
): { widthArcmin: number; heightArcmin: number; widthDeg: number; heightDeg: number } {
    // FOV (degrees) = (sensor_size_mm / focal_length_mm) * (180 / pi) * 60
    // Simplified: FOV (arcmin) = (sensor_size_mm / focal_length_mm) * 3438
    const widthDeg = (sensorWidth / focalLength) * (180 / Math.PI);
    const heightDeg = (sensorHeight / focalLength) * (180 / Math.PI);
    const widthArcmin = widthDeg * 60;
    const heightArcmin = heightDeg * 60;

    return {
        widthArcmin: Math.round(widthArcmin * 10) / 10,
        heightArcmin: Math.round(heightArcmin * 10) / 10,
        widthDeg: Math.round(widthDeg * 100) / 100,
        heightDeg: Math.round(heightDeg * 100) / 100,
    };
}

/**
 * Calculate image scale (arcseconds per pixel).
 */
export function calculateImageScale(
    focalLength: number,   // mm
    pixelSize: number       // micrometers
): number {
    // Image scale (arcsec/pixel) = (pixel_size_um / focal_length_mm) * 206.265
    return Math.round((pixelSize / focalLength) * 206.265 * 100) / 100;
}

/**
 * Check if a target fits within the FOV of the equipment.
 * Returns a fit score: 'perfect' (target < 70% FOV), 'good' (70-90%), 'tight' (90-100%), 'too_large' (>100%)
 */
export function checkTargetFit(
    targetSizeArcmin: { width: number; height: number } | undefined,
    fovArcmin: { widthArcmin: number; heightArcmin: number }
): { fit: 'perfect' | 'good' | 'tight' | 'too_large'; ratio: number } {
    if (!targetSizeArcmin) {
        return { fit: 'perfect', ratio: 0 }; // Unknown size, assume it fits
    }

    const fovMin = Math.min(fovArcmin.widthArcmin, fovArcmin.heightArcmin);
    const fovMax = Math.max(fovArcmin.widthArcmin, fovArcmin.heightArcmin);
    const targetMin = Math.min(targetSizeArcmin.width, targetSizeArcmin.height);
    const targetMax = Math.max(targetSizeArcmin.width, targetSizeArcmin.height);

    // Check if target fits within the FOV (considering rotation)
    const ratio = Math.max(targetMax / fovMax, targetMin / fovMin);

    if (ratio > 1.0) return { fit: 'too_large', ratio: Math.round(ratio * 100) / 100 };
    if (ratio > 0.9) return { fit: 'tight', ratio: Math.round(ratio * 100) / 100 };
    if (ratio > 0.7) return { fit: 'good', ratio: Math.round(ratio * 100) / 100 };
    return { fit: 'perfect', ratio: Math.round(ratio * 100) / 100 };
}

/**
 * Get the primary telescope and camera from equipment list.
 */
export function getPrimarySetup(equipment: AstroEquipment[]): {
    telescope: AstroEquipment | null;
    camera: AstroEquipment | null;
} {
    const telescopes = equipment.filter(e => e.category === 'Telescope' && e.isPersonal);
    const cameras = equipment.filter(e => e.category === 'Camera' && e.isPersonal);

    return {
        telescope: telescopes[0] || null,
        camera: cameras[0] || null,
    };
}

/**
 * Calculate the effective FOV from an equipment setup.
 */
export function getSetupFOV(equipment: AstroEquipment[]): {
    fov: { widthArcmin: number; heightArcmin: number; widthDeg: number; heightDeg: number } | null;
    imageScale: number | null;
    telescope: AstroEquipment | null;
    camera: AstroEquipment | null;
} {
    const { telescope, camera } = getPrimarySetup(equipment);

    if (!telescope?.focalLength || !camera?.sensorWidth || !camera?.sensorHeight) {
        return { fov: null, imageScale: null, telescope, camera };
    }

    const fov = calculateFOV(telescope.focalLength, camera.sensorWidth, camera.sensorHeight);
    const imageScale = camera.pixelSize ? calculateImageScale(telescope.focalLength, camera.pixelSize) : null;

    return { fov, imageScale, telescope, camera };
}

// Default equipment for Stéphane (seed data)
export const DEFAULT_EQUIPMENT: AstroEquipment[] = [
    {
        id: 'eq-ts-optics-102',
        name: 'TS-Optics SD-APO 102mm f/7',
        category: 'Telescope',
        imageUrl: '',
        focalLength: 714,
        aperture: 102,
        fRatio: 7,
        telescopeType: 'Refractor',
        specs: '102mm aperture, 714mm focal length, f/7, ED doublet',
        description: 'Primary imaging telescope — excellent color correction for astrophotography.',
        rating: 5,
        isPersonal: true,
    },
    {
        id: 'eq-asi533mc',
        name: 'ZWO ASI533MC Pro',
        category: 'Camera',
        imageUrl: '',
        sensorWidth: 11.3,
        sensorHeight: 11.3,
        pixelSize: 3.76,
        resolution: '3008x3008',
        cameraType: 'Cooled Color CMOS',
        specs: '11.3mm square sensor, 3.76µm pixels, 3008×3008, cooled, USB 3.0',
        description: 'Primary imaging camera — cooled one-shot color with zero amp glow.',
        rating: 5,
        isPersonal: true,
    },
    {
        id: 'eq-eq6r',
        name: 'Sky-Watcher EQ6-R Pro',
        category: 'Mount',
        imageUrl: '',
        payloadCapacity: 20,
        mountType: 'Equatorial (GoTo)',
        specs: 'Payload 20kg, belt-driven EQ GoTo, ST-4 guiding',
        description: 'Equatorial mount with GoTo and periodic error correction.',
        rating: 5,
        isPersonal: true,
    },
    {
        id: 'eq-takahashi-fsq106',
        name: 'Takahashi FSQ-106ED',
        category: 'Telescope',
        imageUrl: '',
        focalLength: 530,
        aperture: 106,
        fRatio: 5,
        telescopeType: 'Refractor',
        specs: '106mm aperture, 530mm focal length, f/5, 4-element fluorite',
        description: 'Wide-field astrograph — legendary flat field across large sensors.',
        rating: 5,
        isPersonal: false, // Remote/shared
    },
    {
        id: 'eq-planewave-cdk24',
        name: 'Planewave CDK24',
        category: 'Telescope',
        imageUrl: '',
        focalLength: 3910,
        aperture: 600,
        fRatio: 6.5,
        telescopeType: 'Catadioptric (CDK)',
        specs: '24-inch CDK, 3910mm focal length, f/6.5',
        description: 'Remote observatory telescope — deep sky imaging at scale.',
        rating: 5,
        isPersonal: false,
    },
    {
        id: 'eq-qhy600',
        name: 'QHYCCD QHY600 Pro M',
        category: 'Camera',
        imageUrl: '',
        sensorWidth: 35.9,
        sensorHeight: 24,
        pixelSize: 3.76,
        resolution: '9576x6388',
        cameraType: 'Cooled Mono CMOS (full frame)',
        specs: 'Full frame 60MP, 3.76µm pixels, cooled',
        description: 'Remote observatory camera — full-frame mono sensor.',
        rating: 5,
        isPersonal: false,
    },
];