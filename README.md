# AstroCapture

> 🌌 Astrophotography portfolio, planning suite & community platform

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com)
[![Hono](https://img.shields.io/badge/Hono-4-E36002)](https://hono.dev)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite)](https://sqlite.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Overview

**AstroCapture** is a full-stack astrophotography platform combining a public portfolio/blog with a complete imaging planning suite (AstroSuite). It features target discovery, exposure calculation, project tracking, gear management, PHD2 log analysis, and real-time weather/astronomy data.

**Live site:** [https://astrocapture.org](https://astrocapture.org)  
**Beta:** [https://beta.astrocapture.org](https://beta.astrocapture.org)

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
- **Module 1 — Targets** — Best targets tonight, NovaRank scoring, Telescopius integration, imaging windows
- **Module 2 — Rigs** — Telescope/camera/filter profile management, FOV calculator, sampling calculator
- **Module 3 — Framing** — Aladin Lite integration, real-time framing preview, sensor overlay
- **Module 4 — Filters** — Filter management, transmission curves, exposure impact analysis
- **Module 5 — Exposure Calculator** — SB-based exposure calculator v4 (calibrated against SkyTools), emission/continuum object handling, continuous SNR targeting, dark current, size weighting, editable sub-exposure/sub-count overrides
- **Module 6 — Projects** — Project management with exposure plans, observation tracking, cumulative KPIs (total subs, captured/planned hours, sessions, overall progress), status-based sorting
- **PHD2 Analysis** — Guiding log analyzer with RMS graphs, drift detection, star loss tracking
- **Weather** — Astronomy forecast, seeing, moon phase, imaging windows (Open-Meteo)

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
| SQLite (better-sqlite3) | Embedded database |
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

SQLite database at `api/data/astrocapture.db`. Main tables:

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
- [ ] Multi-language support
- [ ] Advanced search with filters
- [ ] Image upload optimization
- [ ] RSS feed
- [ ] Community features

---

## License

MIT — See [LICENSE](LICENSE) for details.

---

<p align="center">
  Made with 🌟 by <a href="https://github.com/MisterMiJarvis">Stéphane Mee</a>
</p>