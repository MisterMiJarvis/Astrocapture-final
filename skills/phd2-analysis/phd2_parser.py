"""
PHD2 Guiding Log Parser & Analyzer

Parses PHD2 .txt log files, extracts sessions, computes guiding metrics.
Handles all known PHD2 log formats (with and without timestamps).
"""

import re
import math
from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime, timedelta


@dataclass
class GuidingFrame:
    """Single guiding frame from PHD2 log"""
    frame: int
    time: float  # seconds since session start
    dx: float  # RA error in pixels
    dy: float  # DEC error in pixels
    ra_raw_tot: float = 0
    dec_raw_tot: float = 0
    ra_guide_dist: float = 0
    dec_guide_dist: float = 0
    ra_guide_pulse: int = 0
    dec_guide_pulse: int = 0
    gain: float = 0
    snr: float = 0
    star_mass: float = 0


@dataclass
class SessionInfo:
    index: int
    start_time: str = ""
    end_time: str = ""
    duration_seconds: float = 0
    camera: str = ""
    exposure: float = 0  # ms
    focal_length: float = 0  # mm
    pixel_scale: float = 0  # arcsec/px
    mount: str = ""
    binning: int = 1
    frame_count: int = 0


@dataclass
class SessionAnalysis:
    session: SessionInfo
    rms_total_px: float = 0
    rms_total_arcsec: float = 0
    rms_ra_px: float = 0
    rms_ra_arcsec: float = 0
    rms_dec_px: float = 0
    rms_dec_arcsec: float = 0
    peak_ra_px: float = 0
    peak_dec_px: float = 0
    peak_ra_arcsec: float = 0
    peak_dec_arcsec: float = 0
    mean_snr: float = 0
    mean_star_mass: float = 0
    dither_count: int = 0
    settling_failed_count: int = 0
    star_lost_count: int = 0
    frames: list = field(default_factory=list)

    @property
    def duration_formatted(self) -> str:
        secs = self.session.duration_seconds
        h = int(secs // 3600)
        m = int((secs % 3600) // 60)
        s = int(secs % 60)
        if h > 0:
            return f"{h}h {m}m"
        return f"{m}m {s}s"


# Patterns
TIMESTAMP_PATTERN = re.compile(r'^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(?:\.\d+)?)\s+(.+)$')
DATA_LINE_PATTERN = re.compile(r'^(\d+),([\d.]+),([^,]+),([-\d.]+),([-\d.]+)(?:,([-\d.]*))?(?:,([-\d.]*))?(?:,([-\d.]*))?(?:,([-\d.]*))?(?:,([-\d.]*))?(?:,([-\d.]*))?(?:,([-\d.]*))?(?:,([-\d.]*))?(?:,([-\d.]*)?)?\s*$')

SESSION_START_MARKERS = ['Calibration Begins', 'Guiding Begins', 'Re-scope', 'Starting new log file']


def _safe_float(s: str, default: float = 0.0) -> float:
    try:
        return float(s) if s and s.strip() not in ('', '-') else default
    except (ValueError, TypeError):
        return default


def _safe_int(s: str, default: int = 0) -> int:
    try:
        return int(float(s)) if s and s.strip() not in ('', '-') else default
    except (ValueError, TypeError):
        return default


def parse_phd2_log(content: str) -> tuple[list[SessionInfo], dict[int, list[GuidingFrame]]]:
    lines = content.strip().split('\n')
    sessions: list[SessionInfo] = []
    all_frames: dict[int, list[GuidingFrame]] = {}
    current_session_idx = -1
    current_session_start_dt: Optional[datetime] = None
    last_seen_timestamp: Optional[str] = None
    last_seen_dt: Optional[datetime] = None
    pixel_scale = 0.0

    # Accumulate header info before first session
    current_camera = ""
    current_exposure = 0.0
    current_focal = 0.0
    current_mount = ""
    current_binning = 1

    current_session = SessionInfo(index=0)
    current_frames: list[GuidingFrame] = []

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Strip timestamp prefix if present: "2024-06-14 21:30:45.123 ..."
        # Keep the rest of the line for parsing
        line_content = line
        ts_match = TIMESTAMP_PATTERN.match(line)
        if ts_match:
            last_seen_timestamp = ts_match.group(1).strip()
            line_content = ts_match.group(2).strip()
            for fmt in ("%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%d %H:%M:%S"):
                try:
                    last_seen_dt = datetime.strptime(last_seen_timestamp, fmt)
                    break
                except ValueError:
                    continue

        # Now parse line_content (without timestamp) for header info
        lower = line_content.lower()

        # Camera detection — PHD2 logs start with camera name directly
        # "ZWO ASI220MM Mini, gain = 68, ..." or "Camera = ZWO ASI220MM Mini, gain = 68, ..."
        if ', gain =' in line_content and 'pixel size' in line_content:
            camera_match = re.match(r'^(?:Camera\s*=\s*)?([^,]+),\s*gain', line_content)
            if camera_match:
                current_camera = camera_match.group(1).strip()

        # Also handle "Camera = ..." format without gain
        if re.search(r'\bcamera\s*=', lower) and ', gain =' not in line_content:
            m = re.search(r'camera\s*=\s*([^,]+)', line_content, re.IGNORECASE)
            if m:
                current_camera = m.group(1).strip()

        # Exposure — "3000ms exp" or "Exposure = 3000ms"
        exp_match = re.match(r'^([\d.]+)\s*ms\s+exp', line_content, re.IGNORECASE)
        if exp_match:
            current_exposure = float(exp_match.group(1))
        elif 'exposure' in lower and 'ms' in line_content:
            m = re.search(r'([\d.]+)\s*ms', line_content)
            if m:
                current_exposure = float(m.group(1))

        # Mount — "EQMod Mount, connected, ..." or "Mount = EQMod Mount, ..."
        # Match the mount name before the comma, but don't include "Mount =" prefix
        mount_match = re.match(r'^(?:(?:Mount\s*=\s*)?)(\S+\s*\S*?Mount)\s*,\s*(?:connected|disconnected)', line_content, re.IGNORECASE)
        if not mount_match:
            # Try simpler: word+Mount pattern
            mount_match = re.match(r'(\S+\s*Mount)\s*,\s*(?:connected|disconnected)', line_content, re.IGNORECASE)
        if mount_match:
            current_mount = mount_match.group(1).strip()
        elif re.search(r'\bmount\s*=', lower):
            m = re.search(r'mount\s*=\s*(.+)', line_content, re.IGNORECASE)
            if m:
                mount_str = m.group(1).strip()
                # Remove trailing period from "Calibration complete, mount = EQMod Mount."
                mount_str = mount_str.rstrip('.')
                # Keep only the mount name, stop at first comma that's not part of the name
                mount_comma = re.match(r'^([^,]+Mount[^,]*)', mount_str, re.IGNORECASE)
                if mount_comma:
                    current_mount = mount_comma.group(1).strip()
                else:
                    current_mount = mount_str.split(',')[0].strip()

        # Pixel scale — "Pixel scale = 0.52 arcsec/px" or "arc-sec/px" or standalone
        ps_match = re.search(r'pixel\s*scale\s*=\s*([\d.]+)\s*arc[- ]?sec/px', line_content, re.IGNORECASE)
        if ps_match:
            pixel_scale = float(ps_match.group(1))
        else:
            ps_match2 = re.search(r'pixel\s*scale\s*=\s*([\d.]+)\s*["\u2033]', line_content, re.IGNORECASE)
            if ps_match2:
                pixel_scale = float(ps_match2.group(1))

        # Focal length — "Focal length = 714mm" or standalone
        fl_match = re.search(r'focal\s*length\s*=\s*([\d.]+)\s*mm', line_content, re.IGNORECASE)
        if fl_match:
            current_focal = float(fl_match.group(1))

        # Binning
        bin_match = re.search(r'binning\s*=\s*(\d+)', line_content, re.IGNORECASE)
        if bin_match:
            current_binning = int(bin_match.group(1))

        # === SESSION START ===
        is_session_start = False
        for marker in SESSION_START_MARKERS:
            if marker.lower() in lower:
                # Save previous session
                if current_session_idx >= 0 and current_frames:
                    current_session.frame_count = len(current_frames)
                    if len(current_frames) > 1:
                        current_session.duration_seconds = current_frames[-1].time - current_frames[0].time
                    sessions.append(current_session)
                    all_frames[current_session.index] = current_frames

                current_session_idx += 1
                is_session_start = True
                current_session = SessionInfo(
                    index=current_session_idx,
                    pixel_scale=pixel_scale,
                    camera=current_camera,
                    exposure=current_exposure,
                    focal_length=current_focal,
                    mount=current_mount,
                    binning=current_binning,
                )
                current_frames = []

                # Timestamp: extract from "... at YYYY-MM-DD HH:MM:SS" in the line,
                # or from a leading timestamp, or fallback to last seen
                at_ts = re.search(r'at\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(?:\.\d+)?)', line, re.IGNORECASE)
                ts_from_line = TIMESTAMP_PATTERN.match(line)
                if at_ts:
                    current_session.start_time = at_ts.group(1).strip()
                    for fmt in ("%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%d %H:%M:%S"):
                        try:
                            current_session_start_dt = datetime.strptime(current_session.start_time, fmt)
                            break
                        except ValueError:
                            continue
                elif ts_from_line:
                    current_session.start_time = ts_from_line.group(1).strip()
                    for fmt in ("%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%d %H:%M:%S"):
                        try:
                            current_session_start_dt = datetime.strptime(current_session.start_time, fmt)
                            break
                        except ValueError:
                            continue
                elif last_seen_timestamp:
                    current_session.start_time = last_seen_timestamp
                    current_session_start_dt = last_seen_dt
                break

        if is_session_start:
            continue

        # === DATA LINES ===
        # PHD2 v2.5 format (18 fields):
        #   Frame,Time,mount,dx,dy,RARawDist,DECRawDist,RAGuideDist,DECGuideDist,RADur,RADir,DECDur,DECDir,XStep,YStep,StarMass,SNR,ErrorCode
        # Old format (14 fields):
        #   Frame,Time,Mount,dx,dy,RARawTot,DECRawTot,RAGuideDist,DECGuideDist,RAPulse,DECPulse,Gain,SNR,HFD
        if line and line[0].isdigit():
            # Strip any leading timestamp if present
            data_line = line
            ts_prefix = TIMESTAMP_PATTERN.match(line)
            if ts_prefix:
                data_line = ts_prefix.group(2).strip()

            parts = data_line.split(',')
            if len(parts) >= 5:
                try:
                    frame_num = int(parts[0])
                    time_val = float(parts[1])
                    dx = float(parts[3])
                    dy = float(parts[4])

                    # Auto-start session if needed
                    if current_session_idx < 0:
                        current_session_idx = 0
                        current_session = SessionInfo(
                            index=0,
                            pixel_scale=pixel_scale,
                            camera=current_camera,
                            exposure=current_exposure,
                            focal_length=current_focal,
                            mount=current_mount,
                            binning=current_binning,
                        )
                        if last_seen_timestamp:
                            current_session.start_time = last_seen_timestamp
                            current_session_start_dt = last_seen_dt

                    frame = GuidingFrame(
                        frame=frame_num,
                        time=time_val,
                        dx=dx,
                        dy=dy,
                    )

                    if len(parts) >= 18:
                        # v2.5 format: 18 fields with directions
                        frame.ra_raw_tot = _safe_float(parts[5])
                        frame.dec_raw_tot = _safe_float(parts[6])
                        frame.ra_guide_dist = _safe_float(parts[7])
                        frame.dec_guide_dist = _safe_float(parts[8])
                        frame.ra_guide_pulse = _safe_int(parts[9])
                        frame.dec_guide_pulse = _safe_int(parts[11])
                        frame.gain = _safe_float(parts[15])  # StarMass
                        frame.snr = _safe_float(parts[16])
                        frame.star_mass = _safe_float(parts[15])
                        # HFD not in v2.5 format, leave as 0
                    elif len(parts) >= 14:
                        # Old format: 14 fields
                        frame.ra_raw_tot = _safe_float(parts[5])
                        frame.dec_raw_tot = _safe_float(parts[6])
                        frame.ra_guide_dist = _safe_float(parts[7])
                        frame.dec_guide_dist = _safe_float(parts[8])
                        frame.ra_guide_pulse = _safe_int(parts[9])
                        frame.dec_guide_pulse = _safe_int(parts[10])
                        frame.gain = _safe_float(parts[11])
                        frame.snr = _safe_float(parts[12])
                        frame.star_mass = _safe_float(parts[11])  # Gain = StarMass in old format
                        # hfd = parts[13] — kept as 0 for consistency

                    current_frames.append(frame)
                except (ValueError, IndexError):
                    pass

    # Save last session
    if current_frames:
        current_session.frame_count = len(current_frames)
        if len(current_frames) > 1:
            current_session.duration_seconds = current_frames[-1].time - current_frames[0].time
        sessions.append(current_session)
        all_frames[current_session.index] = current_frames

    return sessions, all_frames


def analyze_session(session: SessionInfo, frames: list[GuidingFrame]) -> SessionAnalysis:
    if not frames:
        return SessionAnalysis(session=session)

    dx_values = [f.dx for f in frames]
    dy_values = [f.dy for f in frames]
    snr_values = [f.snr for f in frames if f.snr > 0]
    star_mass_values = [f.star_mass for f in frames if f.star_mass > 0]

    n = len(frames)
    rms_ra_px = math.sqrt(sum(x**2 for x in dx_values) / n)
    rms_dec_px = math.sqrt(sum(y**2 for y in dy_values) / n)
    rms_total_px = math.sqrt(sum(x**2 + y**2 for x, y in zip(dx_values, dy_values)) / n)

    ps = session.pixel_scale or 1.0

    if len(frames) > 1:
        session.duration_seconds = frames[-1].time - frames[0].time

    return SessionAnalysis(
        session=session,
        rms_total_px=round(rms_total_px, 3),
        rms_total_arcsec=round(rms_total_px * ps, 3),
        rms_ra_px=round(rms_ra_px, 3),
        rms_ra_arcsec=round(rms_ra_px * ps, 3),
        rms_dec_px=round(rms_dec_px, 3),
        rms_dec_arcsec=round(rms_dec_px * ps, 3),
        peak_ra_px=round(max(abs(x) for x in dx_values), 3),
        peak_dec_px=round(max(abs(y) for y in dy_values), 3),
        peak_ra_arcsec=round(max(abs(x) for x in dx_values) * ps, 3),
        peak_dec_arcsec=round(max(abs(y) for y in dy_values) * ps, 3),
        mean_snr=round(sum(snr_values) / len(snr_values), 1) if snr_values else 0,
        mean_star_mass=round(sum(star_mass_values) / len(star_mass_values), 1) if star_mass_values else 0,
        frames=frames,
    )


def count_events(content: str) -> dict:
    lines = content.lower().split('\n')
    dither_count = 0
    settling_failed = 0
    star_lost = 0

    for line in lines:
        if 'settling state change' in line:
            dither_count += 1
        if 'settling failed' in line:
            settling_failed += 1
        if 'star lost' in line:
            star_lost += 1

    return {
        'dither_count': dither_count,
        'settling_failed': settling_failed,
        'star_lost': star_lost,
    }


def parse_and_analyze(content: str) -> dict:
    sessions, all_frames = parse_phd2_log(content)
    events = count_events(content)

    analyses = []
    for session in sessions:
        frames = all_frames.get(session.index, [])
        analysis = analyze_session(session, frames)
        if len(sessions) == 1:
            analysis.dither_count = events['dither_count']
            analysis.settling_failed_count = events['settling_failed']
            analysis.star_lost_count = events['star_lost']
        analyses.append(analysis)

    if len(analyses) > 1:
        total_duration = sum(a.session.duration_seconds for a in analyses) or 1
        for a in analyses:
            ratio = a.session.duration_seconds / total_duration if total_duration > 0 else 1 / len(analyses)
            a.dither_count = int(events['dither_count'] * ratio)
            a.settling_failed_count = int(events['settling_failed'] * ratio)
            a.star_lost_count = int(events['star_lost'] * ratio)

    result = {
        'session_count': len(sessions),
        'sessions': [],
        'analyses': [],
    }

    for analysis in analyses:
        s = analysis.session
        a = analysis

        # Calculate end_time
        end_time_str = ''
        if s.start_time:
            for fmt in ("%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%d %H:%M:%S"):
                try:
                    start_dt = datetime.strptime(s.start_time, fmt)
                    end_dt = start_dt + timedelta(seconds=s.duration_seconds)
                    end_time_str = end_dt.strftime("%Y-%m-%d %H:%M:%S")
                    break
                except ValueError:
                    continue

        result['sessions'].append({
            'index': s.index,
            'start_time': s.start_time,
            'end_time': end_time_str,
            'duration_seconds': round(s.duration_seconds, 1),
            'camera': s.camera,
            'exposure_ms': s.exposure,
            'focal_length_mm': s.focal_length,
            'pixel_scale': s.pixel_scale,
            'mount': s.mount,
            'binning': s.binning,
            'frame_count': s.frame_count,
        })
        result['analyses'].append({
            'session_index': s.index,
            'rms_total_px': a.rms_total_px,
            'rms_total_arcsec': a.rms_total_arcsec,
            'rms_ra_px': a.rms_ra_px,
            'rms_ra_arcsec': a.rms_ra_arcsec,
            'rms_dec_px': a.rms_dec_px,
            'rms_dec_arcsec': a.rms_dec_arcsec,
            'peak_ra_arcsec': a.peak_ra_arcsec,
            'peak_dec_arcsec': a.peak_dec_arcsec,
            'mean_snr': a.mean_snr,
            'mean_star_mass': a.mean_star_mass,
            'dither_count': a.dither_count,
            'settling_failed_count': a.settling_failed_count,
            'star_lost_count': a.star_lost_count,
            'duration_formatted': a.duration_formatted,
            'frames': [
                {
                    'frame': f.frame,
                    'time': round(f.time, 2),
                    'dx': f.dx,
                    'dy': f.dy,
                    'dx_arcsec': round(f.dx * (s.pixel_scale or 1.0), 3),
                    'dy_arcsec': round(f.dy * (s.pixel_scale or 1.0), 3),
                    'snr': f.snr,
                    'star_mass': f.star_mass,
                }
                for f in a.frames
            ],
        })

    return result


if __name__ == '__main__':
    import sys
    import json

    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No input file specified'}))
        sys.exit(1)

    filepath = sys.argv[1]
    try:
        with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()
    except FileNotFoundError:
        print(json.dumps({'error': 'File not found'}))
        sys.exit(1)

    result = parse_and_analyze(content)
    print(json.dumps(result))