#!/usr/bin/env python3
"""
Moon + target ephemeris calculator for AstroCapture exposure engine.
Uses Skyfield + NASA DE421 ephemeris for precise positions.

Called by the Node API via child_process.execFile.
Input: JSON via stdin with target_ra_hours, target_dec_degs, year, month, day, hour, lat, lon
Output: JSON via stdout with:
  - moon_altitude_deg, moon_illumination, angular_separation_deg, proximity_factor
  - target_altitude_deg (for airmass/extinction calculation)
  - target_airmass (1/sin(alt), capped)
  - extinction_mag (magnitude loss due to atmosphere)
"""

import sys
import json
import math
import os
from skyfield.api import load, load_file, Topos, Star

# Cache the timescale and ephemeris globally
_ts = load.timescale()
_eph_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'de421.bsp')
_eph = load_file(_eph_path)
_earth = _eph['earth']
_moon = _eph['moon']
_sun = _eph['sun']

# Saint-Étienne-du-Grès default
DEFAULT_LAT = 43.78
DEFAULT_LON = 4.73

# Extinction coefficient (mag/airmass)
# 0.15 = montagne/campagne (Bortle 1-3), 0.20 = périurbain (Bortle 4-5), 0.25 = urbain humide (Bortle 6-9)
# We use 0.20 as a reasonable default for St-Étienne-du-Grès (Bortle 4)
DEFAULT_K_EXT = 0.20

def calculate_ephemeris(target_ra_hours, target_dec_degs, year, month, day, hour, lat=DEFAULT_LAT, lon=DEFAULT_LON, k_ext=DEFAULT_K_EXT):
    observer = _earth + Topos(latitude_degrees=lat, longitude_degrees=lon)
    t = _ts.utc(year, month, day, hour, 0, 0)

    target = Star(ra_hours=target_ra_hours, dec_degrees=target_dec_degs)

    # --- Moon ---
    obs_moon = observer.at(t).observe(_moon)
    obs_target = observer.at(t).observe(target)

    # Angular separation Moon-target
    theta = obs_target.separation_from(obs_moon).degrees
    proximity_factor = math.exp(-theta / 30.0)

    # Moon altitude
    alt_moon, az_moon, _ = obs_moon.apparent().altaz()
    moon_alt_deg = alt_moon.degrees

    # Moon illumination
    obs_sun = observer.at(t).observe(_sun)
    elongation = obs_moon.separation_from(obs_sun).radians
    moon_illumination = (1.0 + math.cos(math.pi - elongation)) / 2.0

    # --- Target altitude (for airmass) ---
    alt_target, az_target, _ = obs_target.apparent().altaz()
    target_alt_deg = alt_target.degrees

    # Airmass: X = 1/sin(alt) for alt > 0, capped at 10 (below ~6° it's unusable)
    # For alt <= 0, target is below horizon → airmass = infinity (but we cap)
    if target_alt_deg > 5.0:
        airmass = 1.0 / math.sin(math.radians(target_alt_deg))
        airmass = min(airmass, 10.0)  # cap at 10
    elif target_alt_deg > 0:
        airmass = 10.0  # very low, cap
    else:
        airmass = 10.0  # below horizon

    # Extinction magnitude loss: Δm = k_ext × (X - 1)
    # At zenith (X=1): Δm = 0 (no loss). At 30° alt (X=2): Δm = 0.20 × 1 = 0.20 mag
    extinction_mag = k_ext * (airmass - 1.0)

    return {
        "moon_altitude_deg": round(max(0.0, moon_alt_deg), 2),
        "moon_illumination": round(moon_illumination, 3),
        "angular_separation_deg": round(theta, 2),
        "proximity_factor": round(proximity_factor, 4),
        "target_altitude_deg": round(target_alt_deg, 2),
        "target_airmass": round(airmass, 3),
        "extinction_mag": round(extinction_mag, 3)
    }

if __name__ == '__main__':
    try:
        params = json.load(sys.stdin)
        result = calculate_ephemeris(
            target_ra_hours=params['target_ra_hours'],
            target_dec_degs=params['target_dec_degs'],
            year=params.get('year', 2026),
            month=params.get('month', 7),
            day=params.get('day', 14),
            hour=params.get('hour', 22),
            lat=params.get('lat', DEFAULT_LAT),
            lon=params.get('lon', DEFAULT_LON),
            k_ext=params.get('k_ext', DEFAULT_K_EXT)
        )
        json.dump(result, sys.stdout)
        sys.stdout.write('\n')
    except Exception as e:
        json.dump({"error": str(e)}, sys.stderr)
        sys.exit(1)