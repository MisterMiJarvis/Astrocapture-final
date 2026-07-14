# AstroCapture

> 🌌 Astrophotography portfolio, planning suite & community platform

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com)
[![Hono](https://img.shields.io/badge/Hono-4-E36002)](https://hono.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql)](https://www.postgresql.org)
[![Release](https://img.shields.io/badge/Release-v3.0.0-blue)](https://github.com/MisterMiJarvis/Astrocapture-final/releases)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Overview

**AstroCapture** is a full-stack astrophotography platform combining a public portfolio/blog with a complete imaging planning suite (AstroSuite). It features target discovery, exposure calculation with real Moon ephemeris (Skyfield), project tracking, gear management, PHD2 log analysis, and real-time weather/astronomy data.

**Live site:** [https://astrocapture.org](https://astrocapture.org)

---

## Features

### Public Site
- **Gallery** — Image gallery with tag filtering, hero slider, featured posts
- **Image of the Day** — Daily curated astrophotography showcase
- **Image Wall** — Masonry-style infinite scroll
- **Articles** — Processing tutorials and technical articles
- **Gear Reviews** — Equipment reviews and ratings
- **About** — Photographer profile

### AstroSuite (Planning Tools)
- **Target Explorer** — Telescopius-powered deep-sky search with Best Tonight, Priority tab, and Search modes, band filter recommendations (UV/IR Cut, L-Ultimate, Antlia Triband), framing analysis, rig-aware scoring
- **Rigs** — Telescope/camera/filter profile management, FOV calculator with effective focal length (native × reducer factor), sampling calculator
- **Framing** — Aladin Lite integration, real-time framing preview, sensor overlay
- **Filters** — Filter management with real spectral transmission curves, gallery thumbnails per filter (linked via acquisition logs)
- **Exposure Engine v11** — SB-based exposure calculator with:
  - Real Moon ephemeris via **Skyfield** (NASA DE421 ephemeris)
  - Atmospheric extinction (`Δm = k_ext × (X - 1)`, `X = 1/sin(alt)`)
  - Non-linear moon phase factor (`3.5 × illumination^2.5`)
  - Per-object-type calibration (`k_calib`: diffuse=1.0, planetary=2.0, galaxy=2.0, stellar=2.5)
  - SB unit conversion (Telescopius provides mag/arcmin² → converted to mag/arcsec² with `+8.89`)
  - Spectral sky background (τ_eff_sky from filter transmission curves)
  - Broadband clamp 10-300s, narrowband clamp 30-600s
  - SNR stacking (`SNR_sub × √N`)
- **Projects** — Project management with exposure plans, observation tracking, cumulative KPIs (total subs, captured/planned hours, sessions, overall progress), status-based sorting
- **Observation Planner** — Multi-night planning with:
  - Session-averaged weather KPIs (Clouds, Wind, Seeing, Dew — averaged hourly across entire imaging window, not midpoint)
  - Quality score hard caps (clouds >80% → Poor, >60% → Fair, >40% → Good; dew Critical → Fair)
  - Altitude curve, imaging windows, Moon illumination/altitude
  - Remaining exposure time tracking
- **PHD2 Analysis** — Guiding log analyzer with RMS graphs, drift detection, star loss tracking
- **Weather** — Astronomy forecast, seeing, moon phase, imaging windows (Open-Meteo)
- **Journal** — Session journal with conditions tracking (seeing, transparency, temperature, moon illumination)
- **Equipment Tracker v2** — Enhanced equipment management with rig profiles, guiding setup, dithering calculator
- **Gear Reviews** — Equipment reviews and ratings with visitor stats
- **Admin** — User management, visitor statistics, security audit

### Technical
- ⚡ **Vite 6** for fast development and optimized builds
- 🎨 **Custom dark-mode-first design system** with Tailwind CSS 4
- 📱 **PWA** with service worker for offline support (API paths excluded from cache)
- 🔄 **React.lazy** code splitting for performance
- 🔍 **Global search** across posts and articles
- 🖼️ **Lightbox** with keyboard navigation
- 📊 **SEO optimized** with meta tags and structured data
- 🔐 **JWT auth** with bcrypt password hashing

---

## Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| React 19 | UI framework |
| TypeScript 5.7 | Type safety |
| Vite 6 | Build tool & dev server |
| Tailwind CSS 4 | Utility-first styling |
| Motion (Framer) | Animations |
| Lucide React | Icon library |
| Recharts | Charts & graphs |

### Backend
| Technology | Purpose |
|-----------|---------|
| Hono 4 | Lightweight web framework |
| PostgreSQL 17 (pg) | Production database |
| JWT (jsonwebtoken) | Authentication |
| bcryptjs | Password hashing |
| Cloudscraper | Telescopius API proxy |

### External APIs & Data
- **Open-Meteo** — Weather data & astronomy seeing forecasts
- **Telescopius** — Deep-sky object data, target visibility, framing
- **Skyfield (Python)** — NASA DE421 ephemeris for Moon altitude, illumination, angular separation, target altitude, airmass, atmospheric extinction

---

## Project Structure

```
astrocapture/
├── api/                          # Backend API (Hono + PostgreSQL)
│   ├── src/
│   │   ├── index.ts              # API routes & server
│   │   ├── db.ts                 # Database connection (pg Pool)
│   │   └── telescopius_proxy.py  # Telescopius API proxy
│   ├── scripts/
│   │   └── moon_ephemeris.py     # Skyfield Moon ephemeris script
│   ├── cache/telescopius/        # 6h disk cache (gitignored)
│   └── package.json
│
├── src/                          # AstroSuite modules
│   ├── components/
│   │   ├── Module2/              # Rigs & equipment
│   │   ├── Module5/              # Exposure calculator
│   │   └── admin/                # Admin components
│   ├── services/
│   │   ├── module1/              # Target service, NovaRank
│   │   ├── module5/              # Exposure calculator v11
│   │   ├── filterMapping.ts      # Filter type mapping
│   │   ├── projectService.ts     # Project CRUD + exposure + Moon ephemeris
│   │   ├── targetExplorerService.ts  # Telescopius integration
│   │   ├── plannerService.ts     # Observation planner + weather averaging
│   │   └── userService.ts        # User auth
│   └── types/                    # TypeScript type definitions
│
├── components/                   # Shared/top-level components
│   ├── AstroSuiteView.tsx        # AstroSuite dashboard
│   ├── ProjectsView.tsx          # Projects (create/edit/detail)
│   ├── ProjectPlannerPanel.tsx  # Observation planner (KPIs, altitude curve)
│   ├── TargetExplorerView.tsx    # Target search & dashboard
│   ├── FiltersView.tsx           # Filter management + gallery thumbnails
│   ├── ExposureEngineDocs.tsx    # Exposure engine v11 documentation
│   ├── GearReviewsView.tsx       # Gear reviews
│   ├── PHD2Analysis.tsx          # PHD2 log analyzer
│   └── Shared.tsx                # Reusable UI (Card, Lightbox, etc.)
│
├── public/                       # Static assets + service worker
├── docs/                         # Documentation
├── de421.bsp                     # NASA ephemeris (gitignored, 17MB)
└── package.json
```

---

## Getting Started

### Prerequisites
- **Node.js** 22+
- **npm** 10+
- **Python 3** with `skyfield` package (for Moon ephemeris)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/MisterMiJarvis/Astrocapture-final.git
   cd Astrocapture-final
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd api && npm install && cd ..
   ```

4. **Install Python dependencies** (for Skyfield ephemeris)
   ```bash
   pip install skyfield
   # Download NASA DE421 ephemeris (17MB)
   python -c "from skyfield.api import load; load('de421.bsp')"
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173`

6. **Start the API server** (in another terminal)
   ```bash
   cd api && npm run dev
   ```
   The API runs on `http://localhost:3002`

---

## Development

### Available Scripts

```bash
# Frontend
npm run dev          # Start Vite dev server
npm run build        # Production build → dist/
npm run preview      # Preview production build

# Backend
cd api && npm run dev    # Start Hono dev server with watch
cd api && npm run build  # Compile TypeScript → dist/
```

### Database

PostgreSQL 17 database (Docker, localhost:5432). Main tables:

| Table | Purpose |
|-------|---------|
| `posts` | Gallery posts |
| `processing_posts` | Processing articles |
| `hero_slides` | Homepage hero slides |
| `apls_projects` | AstroSuite projects (with exposure plans, SNR target, rig assignment, surface_brightness) |
| `apls_project_observations` | Observation sessions per project |
| `apls_rigs` | Rig profiles (telescope + camera + modifiers, effective_focal_length) |
| `apls_filters` | User filters (transmission 0-1, bandwidth, sky suppression 0-1, spectral data, descriptions, use_cases) |
| `acquisition_logs` | Acquisition session logs (filter, subs, integration time) |
| `my_equipment` | Equipment tracker |
| `config` | Site configuration |

**Note:** Migrated from SQLite to PostgreSQL in v2.6.0. SQLite is no longer supported.

---

## Build & Deploy

### Production Build

```bash
# Build frontend
npm run build

# Build backend
cd api && npm run build

# Deploy frontend
sudo rsync -av --delete dist/ /var/www/astrocapture/

# Restart backend
sudo systemctl restart astrocapture-api
```

### Current Deployment

| Component | Details |
|-----------|---------|
| **Frontend** | Static files served by Caddy |
| **Backend** | Hono API on port 3002, systemd service `astrocapture-api` |
| **Domain** | astrocapture.org |
| **Server** | VPS (Ubuntu 24.04, Node 22) |
| **Database** | PostgreSQL 17 (Docker) |

---

## API Endpoints

### Public
| Endpoint | Description |
|----------|-------------|
| `GET /api/posts` | Gallery posts |
| `GET /api/processing-posts` | Articles |
| `GET /api/config` | Site config |
| `GET /api/gear` | Gear reviews |

### Telescopius Proxy
| Endpoint | Description |
|----------|-------------|
| `GET /api/telescopius/search` | Search deep-sky objects |
| `GET /api/telescopius/highlights` | Best targets tonight |
| `GET /api/telescopius/visibility` | Object visibility |
| `GET /api/telescopius/mosaic` | Mosaic calculator |

### AstroSuite (Auth required)
| Endpoint | Description |
|----------|-------------|
| `GET/POST /api/apls/projects` | Project CRUD |
| `PATCH/DELETE /api/apls/projects/:id` | Project update/delete |
| `POST /api/apls/projects/:id/observations` | Add observation |
| `GET/POST /api/apls/rigs` | Rig profiles |
| `GET/POST /api/apls/filters` | Filter management |
| `POST /api/apls/moon-ephemeris` | Skyfield Moon ephemeris (altitude, illumination, separation, extinction) |
| `GET /api/filters/:filterId/gallery` | Gallery thumbnails by filter (joins acquisition_logs + posts) |
| `POST /api/login` | Admin login (JWT) |

---

## Exposure Engine v11

The exposure engine uses a surface-brightness-based model with real Moon ephemeris:

### Pipeline (6 steps)
1. **Sky brightness** — Bortle class + Moon illumination (non-linear `3.5 × illum^2.5`) + filter sky suppression (spectral τ_eff_sky)
2. **Pixel scale** — Effective focal length (native × reducer), sensor pixel size, sensor area
3. **Sky signal** — Spectral filter transmission at skyglow wavelengths, B_sky in e⁻/px/s
4. **Sub-exposure** — `t_sub = t_opt × k_dyn` with broadband clamp 10-300s, narrowband 30-600s
5. **Object signal** — SB (mag/arcsec², converted from Telescopius mag/arcmin² with +8.89) × k_calib per object type, atmospheric extinction (`Δm = k_ext × (X-1)`)
6. **Stacking** — `N_subs = ceil(SNR_target / (SNR_sub × √N))`, total integration time

### Key Constants
- `M_ZERO = 26.59` (zero-point mag)
- `k_ext = 0.20` (Bortle 4 extinction coefficient)
- `k_calib`: diffuse_nebula=1.0, planetary_nebula=2.0, galaxy=2.0, stellar=2.5 (interim, pending FITS recalibration)

### Data Sources
- **Skyfield** — Moon altitude, illumination, angular separation, target altitude, airmass
- **NASA DE421** — JPL ephemeris (17MB, not committed)
- **Telescopius** — Target SB, magnitude, size, type
- **PostgreSQL** — Rig profiles, filter spectral data, user preferences
- **Open-Meteo** — Weather forecast (cloud cover, wind, temperature, dewpoint)

---

## Observation Planner

### Weather KPIs (Session-Averaged)
Weather data is averaged **hourly across the entire imaging window duration**, not sampled at a single midpoint:

| KPI | Calculation | Description |
|-----|-------------|-------------|
| ☁️ Clouds | Hourly average % | Clear (<20%) / Partly (<50%) / Cloudy (<80%) / Overcast (≥80%) |
| 💨 Wind | Hourly average km/h | ✅ OK (<10) / 🔴 No go (≥10) |
| 👁️ Seeing | Re-estimated from averaged cloud/wind | Antoniadi scale I-V |
| 💧 Dew | **Worst case** during session | Safe / Warning / Critical (dew is a threshold, not an average) |

### Quality Score Hard Caps
| Condition | Score cap |
|-----------|-----------|
| Clouds >80% | Poor (15 pts) |
| Clouds >60% | Fair (40 pts) |
| Clouds >40% | Good (60 pts) |
| Dew Critical | Fair (40 pts) |
| Wind >10 km/h | Poor (15 pts) |

---

## Changelog

### v3.0.0 — Session-Averaged Weather KPIs + Quality Score Caps (2026-07-14)

#### New Features
- **Session-averaged weather KPIs** — Clouds, Wind, Seeing, and Dew are now averaged hourly across the entire imaging window duration instead of sampling at the midpoint. Cloud cover arriving late in the session now correctly impacts the displayed values.
- **3 new KPI boxes** in the observation planner: Clouds (%), Seeing (arcsec + Antoniadi label), Dew (risk level + Δ°C)
- **Quality score hard caps** — Clouds >80% → Poor (15 pts), >60% → Fair (40 pts), >40% → Good (60 pts). Dew Critical → Fair (40 pts). Fixes issue where 85% cloud cover showed 80/100 "Excellent".
- **Moon ephemeris via Skyfield** — Real Moon altitude, illumination, and angular separation from target (replaces hardcoded values). Uses NASA DE421 ephemeris. Observer location: Saint-Étienne-du-Grès (43.78°N, 4.73°E).
- **Atmospheric extinction** — `Δm = k_ext × (X - 1)` where `X = 1/sin(altitude)`, `k_ext = 0.20`. Applied to target SB before signal calculation.
- **Filter gallery thumbnails** — Clickable thumbnails per filter, linked via acquisition logs. Click opens modal with image + acquisition details (subs, integration, equipment).
- **Effective focal length** — Rig dropdown shows correct effective FL (native × reducer factor) for FOV/scale calculations.
- **All planner labels in English** — Translated from French (Planning d'observation → Observation Planner, Lune → Moon, Vent → Wind, etc.)

#### Fixes
- **SB unit bug** — Telescopius provides SB in mag/arcmin², not mag/arcsec². Conversion `+8.89` (`2.5×log₁₀(3600)`) added. All k_calib values revised accordingly.
- **Service-worker API exclusion** — `/api/` paths excluded from stale-while-revalidate cache. Cache versions bumped. `clients.claim()` added to activate handler for immediate SW takeover.
- **Project creation 500** — Missing `surface_brightness` column added to `apls_projects` table.
- **Antlia Triband percentages** — `peak_transmission` and `sky_suppression` corrected from percentage to 0-1 decimal in DB.
- **Service-worker double `event.waitUntil`** — Duplicate activate handler cleaned up.
- **Telescopius cache files** — Added to `.gitignore`.

#### Removed
- **Weather Snapshot section** — Redundant with the new KPI boxes
- **NINA Export section** — Removed from project detail view
- **RAG/Knowledge tab** — Removed (RAGChatView, rag-server.py, data/rag-index/)
- **Module1/ dead components** — 7 unused files deleted
- **Exposure calculator standalone** — Removed from Exposure tab, only documentation remains
- **Horizon Mask section** — Removed from Equipment tab

#### Technical
- `api/scripts/moon_ephemeris.py` — New Skyfield script for Moon ephemeris
- `POST /api/apls/moon-ephemeris` — New API endpoint calling Python script
- `GET /api/filters/:filterId/gallery` — New API endpoint for filter gallery thumbnails
- `src/services/plannerService.ts` — `averageWeatherOverWindow()` function, quality score caps
- `components/ProjectPlannerPanel.tsx` — 8-column KPI grid, English labels, WeatherSnapshotCard removed
- `src/services/module5/exposureCalculator.ts` — k_calib revised, broadband clamp 10s, atmospheric extinction
- `src/services/projectService.ts` — `fetchMoonEphemeris()`, SB conversion, moonPhaseFactor v2
- `de421.bsp` added to `.gitignore` (17MB NASA ephemeris)

### v2.7.0 — Exposure Engine v11 + Gemini Review (2026-07-14)

- Skyfield integration for real Moon ephemeris
- Atmospheric extinction (V11 feature)
- SB unit bug fix (mag/arcmin² → mag/arcsec²)
- k_calib revised after SB unit fix
- moonPhaseFactor non-linear (`3.5 × illum^2.5`)
- Broadband clamp floor 60s → 10s
- Exposure formula reviewed by Gemini (2 rounds)

### v2.6.0 — PostgreSQL Migration + Cache Fallback + Spectral Filters (2026-07-14)

- SQLite → PostgreSQL 17 migration
- Telescopius API cache fallback (6h disk cache)
- Real filter spectral transmission curves
- API-only filter service (no localStorage)
- Gallery image 404 fixes

### v2.5.0 — Priority Targets System + UI Improvements (2026-07-06)

- Priority Targets config (206 deduplicated targets)
- ⭐ Priority badges in Best Tonight
- Priority Tab with hybrid loading
- French → English label translations

### v2.4 — AstroSuite v2 + Exposure Calculator v4 (2026-05)

- Full AstroSuite v2 with 6 modules
- SB-based exposure calculator v4
- Project tracking with cumulative KPIs
- PHD2 log analysis
- PWA support

---

## Roadmap

### Done
- [x] Gallery with tag filtering
- [x] Processing articles with markdown
- [x] AstroSuite — Targets, Rigs, Framing, Filters, Exposure, Projects
- [x] Exposure Engine v11 (SB-based, Skyfield Moon ephemeris, atmospheric extinction)
- [x] PHD2 log analysis
- [x] Project tracking with KPIs
- [x] Observation planner with session-averaged weather
- [x] Filter gallery thumbnails
- [x] PostgreSQL 17 migration
- [x] PWA support (API paths excluded from cache)
- [x] All UI labels in English

### Planned
- [ ] Observation date selection in project form (currently defaults to today)
- [ ] k_calib recalibration with FITS aperture photometry
- [ ] Spectral sky background model (Na/Hg/LED lines by Bortle level)
- [ ] Configurable observer location (currently hardcoded to St-Étienne-du-Grès)
- [ ] Radial SB profile for planetary nebulae
- [ ] Multi-language support
- [ ] Community features

---

## License

MIT — See [LICENSE](LICENSE) for details.

---

<p align="center">
  Made with 🌟 by <a href="https://github.com/MisterMiJarvis">Stéphane Mee</a>
</p>