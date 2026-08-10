#!/usr/bin/env python3
"""
Visibility Timeline calculator for AstroCapture.
Computes hourly altitude of a target, the Moon, and the Sun over 24h.
Also returns Moon illumination and angular separation target-Moon for each hour.

Uses Skyfield + NASA DE421 ephemeris.

Input: JSON via stdin:
  target_ra_hours, target_dec_degs, year, month, day, lat, lon, timezone_offset (hours)

Output: JSON via stdout:
  {
    "hours": [
      {
        "hour_local": 0, "hour_utc": "2026-08-01T22:00:00Z",
        "target_alt": 45.2, "target_az": 180.3,
        "moon_alt": 30.1, "moon_az": 120.5, "moon_illum": 0.65,
        "moon_sep": 45.3,
        "sun_alt": -15.0
      },
      ...
    ],
    "target_rise_hour": 14,      // local hour when target rises above 0° (or null)
    "target_culmin_hour": 2,      // local hour of max altitude
    "target_set_hour": 8,         // local hour when target sets below 0°
    "target_max_alt": 75.3,
    "sun_set_hour": 19,           // local hour when sun sets
    "sun_rise_hour": 6,           // local hour when sun rises
    "dark_start_hour": 19,       // start of astronomical dark period
    "dark_end_hour": 5,           // end of astronomical dark period
    "moon_interference": [        // hours where moon is above horizon and illumination > 30%
      { "hour": 21, "moon_alt": 45.2, "moon_illum": 0.65 },
      ...
    ]
  }
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


def calculate_timeline(target_ra_hours, target_dec_degs, year, month, day, lat=DEFAULT_LAT, lon=DEFAULT_LON, tz_offset=2):
    """
    Calculate 24h visibility timeline.
    tz_offset: hours from UTC (e.g. 2 for Europe/Paris in summer = CEST)
    The 'day' parameter is the LOCAL day. We compute from 00:00 local = (day - tz_offset) UTC.
    """
    observer = _earth + Topos(latitude_degrees=lat, longitude_degrees=lon)
    target = Star(ra_hours=target_ra_hours, dec_degrees=target_dec_degs)

    hours_data = []
    target_max_alt = -999.0
    target_culmin_hour = None
    target_rise_hour = None
    target_set_hour = None
    prev_target_alt = None

    sun_rise_hour = None
    sun_set_hour = None
    prev_sun_alt = None
    dark_start_hour = None
    dark_end_hour = None

    moon_interference = []

    for local_hour in range(24):
        # Convert local hour to UTC
        utc_hour_raw = local_hour - tz_offset
        utc_day = day
        utc_month = month
        utc_year = year

        # Handle day rollover
        if utc_hour_raw < 0:
            utc_hour_raw += 24
            # Go to previous day
            import datetime
            d = datetime.date(utc_year, utc_month, utc_day) - datetime.timedelta(days=1)
            utc_year, utc_month, utc_day = d.year, d.month, d.day
        elif utc_hour_raw >= 24:
            utc_hour_raw -= 24
            import datetime
            d = datetime.date(utc_year, utc_month, utc_day) + datetime.timedelta(days=1)
            utc_year, utc_month, utc_day = d.year, d.month, d.day

        t = _ts.utc(utc_year, utc_month, utc_day, int(utc_hour_raw), int((utc_hour_raw % 1) * 60), 0)

        # Target altitude/azimuth
        obs_target = observer.at(t).observe(target)
        alt_target, az_target, _ = obs_target.apparent().altaz()
        target_alt = round(alt_target.degrees, 2)
        target_az = round(az_target.degrees, 2)

        # Moon altitude/azimuth
        obs_moon = observer.at(t).observe(_moon)
        alt_moon, az_moon, _ = obs_moon.apparent().altaz()
        moon_alt = round(alt_moon.degrees, 2)
        moon_az = round(az_moon.degrees, 2)

        # Moon illumination
        obs_sun_for_moon = observer.at(t).observe(_sun)
        elongation = obs_moon.separation_from(obs_sun_for_moon).radians
        moon_illum = round((1.0 + math.cos(math.pi - elongation)) / 2.0, 3)

        # Moon-target angular separation
        moon_sep = round(obs_target.separation_from(obs_moon).degrees, 2)

        # Sun altitude
        obs_sun = observer.at(t).observe(_sun)
        alt_sun, _, _ = obs_sun.apparent().altaz()
        sun_alt = round(alt_sun.degrees, 2)

        # Track target max altitude
        if target_alt > target_max_alt:
            target_max_alt = target_alt
            target_culmin_hour = local_hour

        # Detect target rise (crossing 0° upward)
        if prev_target_alt is not None and prev_target_alt <= 0 and target_alt > 0:
            target_rise_hour = local_hour
        # Detect target set (crossing 0° downward)
        if prev_target_alt is not None and prev_target_alt > 0 and target_alt <= 0:
            target_set_hour = local_hour
        prev_target_alt = target_alt

        # Detect sun rise/set (crossing 0°)
        if prev_sun_alt is not None and prev_sun_alt <= 0 and sun_alt > 0:
            sun_rise_hour = local_hour
        if prev_sun_alt is not None and prev_sun_alt > 0 and sun_alt <= 0:
            sun_set_hour = local_hour
        prev_sun_alt = sun_alt

        # Astronomical dark: sun below -18°
        # Track transition into dark (sun going below -18°) and out of dark (sun rising above -18°)
        # We'll compute this after the loop for simplicity

        # Moon interference: moon above horizon AND illumination > 30%
        if moon_alt > 0 and moon_illum > 0.30:
            moon_interference.append({
                "hour": local_hour,
                "moon_alt": moon_alt,
                "moon_illum": moon_illum,
            })

        hours_data.append({
            "hour_local": local_hour,
            "target_alt": target_alt,
            "target_az": target_az,
            "moon_alt": moon_alt,
            "moon_az": moon_az,
            "moon_illum": moon_illum,
            "moon_sep": moon_sep,
            "sun_alt": sun_alt,
        })

    # Compute dark periods (sun below -18°)
    dark_periods = []
    in_dark = False
    dark_start = None
    for h in hours_data:
        if h["sun_alt"] < -18 and not in_dark:
            in_dark = True
            dark_start = h["hour_local"]
        elif h["sun_alt"] >= -18 and in_dark:
            in_dark = False
            dark_periods.append((dark_start, h["hour_local"] - 1))
    if in_dark:
        dark_periods.append((dark_start, 23))

    # Use first dark period for dark_start/end
    if dark_periods:
        dark_start_hour = dark_periods[0][0]
        dark_end_hour = dark_periods[-1][1]
    else:
        dark_start_hour = None
        dark_end_hour = None

    return {
        "hours": hours_data,
        "target_rise_hour": target_rise_hour,
        "target_culmin_hour": target_culmin_hour,
        "target_set_hour": target_set_hour,
        "target_max_alt": round(target_max_alt, 2),
        "sun_rise_hour": sun_rise_hour,
        "sun_set_hour": sun_set_hour,
        "dark_start_hour": dark_start_hour,
        "dark_end_hour": dark_end_hour,
        "moon_interference": moon_interference,
    }


if __name__ == '__main__':
    try:
        params = json.load(sys.stdin)
        result = calculate_timeline(
            target_ra_hours=params['target_ra_hours'],
            target_dec_degs=params['target_dec_degs'],
            year=params.get('year', 2026),
            month=params.get('month', 8),
            day=params.get('day', 1),
            lat=params.get('lat', DEFAULT_LAT),
            lon=params.get('lon', DEFAULT_LON),
            tz_offset=params.get('tz_offset', 2),
        )
        json.dump(result, sys.stdout)
        sys.stdout.write('\n')
    except Exception as e:
        json.dump({"error": str(e)}, sys.stderr)
        sys.exit(1)