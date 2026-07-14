# AstroCapture

> 🌌 Astrophotography portfolio, planning suite & community platform

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com)
[![Hono](https://img.shields.io/badge/Hono-4-E36002)](https://hono.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql)](https://www.postgresql.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Overview

**AstroCapture** is a full-stack astrophotography platform combining a public portfolio/blog with a complete imaging planning suite (AstroSuite). It features target discovery, exposure calculation, project tracking, gear management, PHD2 log analysis, and real-time weather/astronomy data.

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
- **Module 1 — Targets** — Best targets tonight, NovaRank scoring, Telescopius integration, imaging windows, **Priority Targets system** with ⭐ badges and dedicated tab
- **Module 2 — Rigs** — Telescope/camera/filter profile management, FOV calculator, sampling calculator
- **Module 3 — Framing** — Aladin Lite integration, real-time framing preview, sensor overlay
- **Module 4 — Filters** — Filter management, transmission curves, exposure impact analysis
- **Module 5 — Exposure Calculator** — SB-based exposure calculator v4 (calibrated against SkyTools), emission/continuum object handling, continuous SNR targeting, dark current, size weighting, editable sub-exposure/sub-count overrides
- **Module 6 — Projects** — Project management with exposure plans, observation tracking, cumulative KPIs (total subs, captured/planned hours, sessions, overall progress), status-based sorting, NINA Advanced Sequencer export
- **PHD2 Analysis** — Guiding log analyzer with RMS graphs, drift detection, star loss tracking
- **Weather** — Astronomy forecast, seeing, moon phase, imaging windows (Open-Meteo), loads on tab open without location change
- **Journal** — Session journal with conditions tracking (seeing, transparency, temperature, moon illumination)
- **Target Explorer** — Telescopius-powered deep-sky search with Best Tonight, Priority tab, and Search modes, band filter recommendations, framing analysis, rig-aware scoring
- **Observation Planner** — Multi-night planning with weather integration, imaging window snapshots, exposure capping
- **Session Planner** — Session-level planning with horizon mask support
- **Equipment Tracker v2** — Enhanced equipment management with rig profiles, guiding setup, dithering calculator, equipment calculator with exposure estimation
- **Gear Reviews** — Equipment reviews and ratings with visitor stats
- **Admin** — User management, visitor statistics, security audit

### Technical
- ⚡ **Vite 6** for fast development and optimized builds
- 🎨 **Custom dark-mode-first design system** with Tailwind CSS 4
- 📱 **PWA** with service worker for offline support
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
| Sharp | Image processing |

### External APIs
- **Open-Meteo** — Weather data & astronomy seeing forecasts
- **Telescopius** — Deep-sky object data, target visibility, framing
- **Google Gemini** — AI features (Ask Hal)

---

## Project Structure

```
astrocapture/
├── api/                          # Backend API (Hono + SQLite)
│   ├── src/
│   │   ├── index.ts              # API routes & server
│   │   ├── db.ts                 # Database connection
│   │   └── telescopius_proxy.py  # Telescopius API proxy (cloudscraper)
│   ├── data/astrocapture.db      # SQLite database
│   └── package.json
│
├── src/                          # AstroSuite modules
│   ├── components/
│   │   ├── Module1/              # Targets
│   │   ├── Module2/              # Rigs
│   │   ├── Module3/              # Framing
│   │   ├── Module4/              # Filters
│   │   ├── Module5/              # Exposure Calculator
│   │   ├── Module6/              # Projects
│   │   ├── Module1/              # Targets
│   │   └── admin/                # Admin components
│   ├── services/
│   │   ├── module1/              # Target service, NovaRank
│   │   ├── module2/              # Rig profiles
│   │   ├── module3/              # Framing service
│   │   ├── module5/              # Exposure calculator v4
│   │   ├── module6/              # Project service
│   │   ├── filterService.ts      # Filter CRUD
│   │   ├── filterMapping.ts      # Filter type mapping
│   │   ├── projectService.ts     # Project CRUD + exposure plans
│   │   ├── targetExplorerService.ts  # Telescopius integration
│   │   └── userService.ts        # User auth
│   └── types/                    # TypeScript type definitions
│
├── components/                   # Shared/top-level components
│   ├── AstroSuiteView.tsx        # AstroSuite dashboard
│   ├── ProjectsView.tsx          # Projects (create/edit/detail)
│   ├── TargetExplorerView.tsx    # Target search
│   ├── GearReviewsView.tsx       # Gear reviews
│   ├── PHD2Analysis.tsx          # PHD2 log analyzer
│   ├── Shared.tsx                # Reusable UI (Card, Lightbox, etc.)
│   └── ...
│
├── services/                     # Legacy shared services
├── design-system/                # Design system docs & tokens
├── public/                       # Static assets + service worker
├── docs/                         # Documentation
├── planning/                     # Planning notes
│
├── App.tsx                       # Main app component & routing
├── vite.config.ts                # Vite configuration
└── package.json
```

---

## Getting Started

### Prerequisites
- **Node.js** 22+
- **npm** 10+
- **Python 3** (for Telescopius proxy)

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

4. **Start the development server**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173`

5. **Start the API server** (in another terminal)
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

PostgreSQL database (host: localhost:5432). Main tables:

| Table | Purpose |
|-------|---------|
| `posts` | Gallery posts |
| `processing_posts` | Processing articles |
| `hero_slides` | Homepage hero slides |
| `apls_projects` | AstroSuite projects (with exposure plans, SNR target, rig assignment) |
| `apls_project_observations` | Observation sessions per project |
| `apls_rigs` | Rig profiles (telescope + camera + modifiers) |
| `apls_filters` | User filters (transmission, bandwidth, sky suppression) |
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
| **Domain** | astrocapture.org (production), beta.astrocapture.org (beta) |
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
| `POST /api/login` | Admin login (JWT) |

---

## Environment Variables

Create `.env` in the project root (not committed):

```env
# Telescopius API key (in .secrets/telescopius.json)
# Gemini API key (for AI features)
# Admin password hash (bcrypt)
```

---

## Exposure Calculator v4

The exposure calculator uses a surface-brightness-based model calibrated against SkyTools:

- **Sky flux** from Bortle class + skySuppression per filter
- **Object flux** using SB (mag/arcsec²) instead of total magnitude
- **Emission vs continuum** — galaxies attenuated by filter skySuppression, emission nebulae not
- **Continuous SNR target** — `500 × √(contrast)` with size weighting
- **Dark current** included in noise budget
- **Editable overrides** — users can manually adjust sub-exposure time and sub-count per filter

---

## Design System

Custom **dark-mode-first** design system with:
- CSS custom properties for theming
- Display + body font pairing
- Consistent 4px grid spacing
- Card, Button, Badge, Modal, Lightbox components
- Fade-in, slide-up, hover transitions

See `design-system/DESIGN_SYSTEM.md` for full documentation.

---

## Roadmap

### Done
- [x] Gallery with tag filtering
- [x] Processing articles with markdown
- [x] Astro Weather dashboard
- [x] Equipment tracker & FOV calculator
- [x] Image of the Day & Image Wall
- [x] Gear Reviews
- [x] Admin Dashboard
- [x] PWA support
- [x] SQLite backend (migrated from Firebase)
- [x] AstroSuite v2 — Targets, Rigs, Framing, Filters, Exposure Calculator, Projects
- [x] Exposure Calculator v4 (SB-based, SkyTools-calibrated)
- [x] PHD2 log analysis
- [x] Project tracking with KPIs
- [x] NINA Advanced Sequencer target export
- [x] Wind speed in planner KPIs and window cards
- [x] Wind >10 km/h hard no-go (score capped at Poor)
- [x] Imaging windows capped to remaining exposure time
- [x] Priority Targets system (v2.5.0)
- [x] UI labels translated to English
- [x] Weather tab auto-loads on first open
- [x] PostgreSQL 17 migration (v2.6.0)
- [x] Telescopius API cache fallback (v2.6.0)
- [x] Filter spectral data — real transmission curves (v2.6.0)
- [x] API-only filter service — no localStorage (v2.6.0)
- [x] Gallery image 404 fixes (v2.6.0)

### Planned
- [ ] Multi-language support
- [ ] Advanced search with filters
- [ ] Image upload optimization
- [ ] RSS feed
- [ ] Community features

---

## Changelog

### v2.6.0 — PostgreSQL Migration + Cache Fallback + Spectral Filters (2026-07-14)

#### Breaking Changes
- **SQLite → PostgreSQL 17** — Complete backend rewrite. `db.ts` now uses `pg` Pool (async) instead of `better-sqlite3` (sync). All DB calls converted to async/await with parameterized queries. SQLite is no longer supported.
- **Filter service is API-only** — Removed all localStorage fallback/seed logic. Filters are stored exclusively in PostgreSQL. Old localStorage keys are cleaned up automatically.

#### New Features
- **Telescopius API cache fallback** — Disk-based 6h cache (`api/cache/telescopius/`) with stale fallback on API errors (429/500). Manual cache seeded with 10 common targets (M31, M42, M27, M13, M51, M81, NGC7000, M16, M17, NGC6888). Filtered empty parameters before cache hashing for consistent keys.
- **Filter spectral data** — Real transmission curves for UV/IR Cut, L-Ultimate, and Antlia Triband filters. Exposure calculator now uses `getEffectiveTransmissionAtLine()`, `getEffectiveContinuumTransmission()`, and `getEffectiveSkyTransmission()` based on actual filter spectra instead of flat percentages.
- **New Rig button** — Direct rig creation from Module 2 dashboard.
- **RAG server** — `services/rag-server.py` for AI-powered features.

#### Fixes
- **Gallery images 404** — Replaced 10 missing image references in `initialData.ts` with existing webp files from `/uploads/`.
- **Telescopius proxy Cloudflare bypass** — Rewritten with `requests` + Firefox User-Agent instead of `cloudscraper`.
- **Gallery upload** — Added `keepAlive: true` + `connectionTimeoutMillis: 10000` to pg Pool config (connection leak fix).
- **APLS dashboard KPIs** — Fixed date grouping with `TO_CHAR(date::text::date, 'YYYY-MM')` for PostgreSQL compatibility.
- **558 old JS bundles cleaned up** from `dist/` directory.

#### Technical
- `better-sqlite3` replaced with `pg` in `api/package.json`
- `api/src/seed.ts` updated for PostgreSQL syntax
- `api/src/telescopius_proxy.py` rewritten with `requests` library
- Filter service refactored — 353 lines → ~200 lines (removed all localStorage/seed/fallback code)

### v2.5.0 — Priority Targets System + UI Improvements (2026-07-06)

#### New Features
- **Priority Targets config** (`public/priority-targets.json`) — 206 deduplicated targets from 4 source lists (Messier, best NGC, best 100, great imaging targets). Editable file, no code changes needed.
- **⭐ Priority badges in Best Tonight** — Targets from the priority list show a ⭐ badge and are sorted to the top of Best Tonight results.
- **Priority Tab** — New tab between Best Tonight and Search. Shows only your priority targets, checks visibility via Telescopius highlights (500 results) + search fallback for missing targets. Filters by min altitude and band. Sorted by imaging hours.

#### Fixes
- **Priority matching** — Space normalization so `M13` matches `M 13` from Telescopius API
- **Page load timing** — Priority IDs loaded before first Best Tonight fetch so ⭐ badges appear immediately
- **Weather tab** — Fixed bug where weather data didn't load on first tab open (coordinates now initialize from `defaultLocation` prop)
- **French → English labels** — Translated visible French labels to English across Projects, Journal, Planner, Equipment views

#### Performance
- Priority tab: hybrid loading (highlights 500 + batch search 20-parallel fallback) — 5s instead of 30s+

### v2.4.x — Wind & Imaging Window Improvements (2026-06)

- Wind speed added to planner KPIs and window cards
- Wind >10 km/h = hard no-go (score capped at Poor, red indicator)
- Imaging windows capped to remaining exposure time
- NINA export refactored — minimalist target + exposures only

### v2.4 — AstroSuite v2 + Exposure Calculator v4 (2026-05)

- Full AstroSuite v2 with 6 modules
- SB-based exposure calculator v4 calibrated against SkyTools
- Project tracking with cumulative KPIs
- PHD2 log analysis
- Admin dashboard with user management and visitor stats
- PWA support

---

## License

MIT — See [LICENSE](LICENSE) for details.

---

<p align="center">
  Made with 🌟 by <a href="https://github.com/MisterMiJarvis">Stéphane Mee</a>
</p>