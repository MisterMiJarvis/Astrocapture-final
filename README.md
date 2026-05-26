# AstroCapture

> 🌌 An astrophotography portfolio & blog with real-time astronomy data

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Development](#development)
- [Build & Deploy](#build--deploy)
- [API Backend](#api-backend)
- [Environment Variables](#environment-variables)
- [Design System](#design-system)
- [Roadmap](#roadmap)
- [License](#license)

---

## Overview

**AstroCapture** is a modern astrophotography portfolio and blog application. It showcases deep-sky object captures, processing tutorials, gear reviews, and provides real-time astronomy data including weather forecasts and target visibility scoring.

The application features a custom design system with dark-mode-first aesthetics, smooth animations, and a responsive layout optimized for both desktop and mobile viewing.

**Live site:** [https://astro.stephanemee.com](https://astro.stephanemee.com)

---

## Features

### Public Pages
| Feature | Description |
|---------|-------------|
| **Home / Gallery** | Image gallery with filtering by tags, hero slider, featured posts |
| **Image of the Day** | Daily curated astrophotography showcase |
| **Image Wall** | Masonry-style infinite scroll wall of all images |
| **Articles** | Processing tutorials and technical articles |
| **Astro Weather** | Real-time astronomy conditions, seeing forecast, moon phase |
| **About** | Photographer profile and bio |

### Admin Panel (Authenticated)
| Feature | Description |
|---------|-------------|
| **Gallery Editor** | CRUD for gallery posts with rich metadata |
| **Articles Editor** | CRUD for processing articles with markdown support |
| **Global Config** | Site settings, SEO, social links |
| **Hero Slider** | Manage homepage hero slides |
| **Gear Reviews** | Equipment reviews and ratings |
| **Image Wall Config** | Manage image wall layout |

### Technical Features
- ⚡ **Vite** for fast development and optimized builds
- 🎨 **Custom Design System** with CSS variables and Tailwind
- 📱 **PWA** with service worker for offline support
- 🔄 **React.lazy** code splitting for performance
- 🌙 **Dark mode** as default with smooth transitions
- 🔍 **Global Search** across posts and articles
- 🖼️ **Lightbox** with keyboard navigation
- 📊 **SEO optimized** with meta tags and structured data

---

## Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| React 19 | UI framework |
| TypeScript | Type safety |
| Vite | Build tool & dev server |
| Tailwind CSS 4 | Utility-first styling |
| Framer Motion | Animations |
| Lucide React | Icon library |
| date-fns | Date formatting |

### Backend
| Technology | Purpose |
|-----------|---------|
| Hono | Lightweight web framework |
| SQLite | Embedded database |
| better-sqlite3 | SQLite driver |
| Zod | Schema validation |
| bcryptjs | Password hashing |
| jose | JWT handling |

### External APIs
- **Open-Meteo** — Weather data & astronomy seeing forecasts
- **SunCalc** — Sun/moon position calculations
- **Telescopius** — Deep-sky object data & framing

---

## Project Structure

```
astrocapture/
├── api/                          # Backend API (Hono + SQLite)
│   ├── src/
│   │   ├── index.ts              # API routes & server
│   │   ├── db.ts                 # Database setup & queries
│   │   ├── seed.ts               # Seed data
│   │   └── telescopius_proxy.py  # Telescopius API proxy
│   ├── package.json
│   └── tsconfig.json
│
├── components/                   # React components
│   ├── Shared.tsx                # Reusable UI components (Card, Lightbox, etc.)
│   ├── GalleryView.tsx           # Home gallery
│   ├── ImageOfTheDayView.tsx     # IOTD showcase
│   ├── ImageWallView.tsx         # Masonry image wall
│   ├── ProcessingView.tsx        # Articles listing
│   ├── PostDetailView.tsx        # Article detail
│   ├── AstroIndexView.tsx        # Astro Weather dashboard
│   ├── WeatherDisplayView.tsx    # Weather widget
│   ├── NightlyForecastView.tsx   # Nightly seeing forecast
│   ├── GearReviewsView.tsx       # Equipment reviews
│   ├── GearSettingsForm.tsx      # Gear review editor
│   ├── EquipmentTrackerForm.tsx  # Equipment tracker
│   ├── AboutView.tsx             # About page
│   ├── LoginView.tsx             # Admin login
│   └── ...                       # Other components
│
├── services/                     # Business logic & API clients
│   ├── dsoService.ts             # Deep-sky object data
│   ├── equipmentService.ts       # Equipment management
│   ├── observationPlannerService.ts
│   ├── targetScorer.ts           # Target visibility scoring
│   ├── api.ts                    # API client
│   └── firebase.ts               # Firebase config
│
├── design-system/                # Design system documentation
│   ├── DESIGN_SYSTEM.md          # Design tokens & guidelines
│   ├── components.tsx            # Design system components
│   ├── Navbar.tsx                # Navigation patterns
│   └── index.css                 # Base styles
│
├── public/                       # Static assets
│   ├── service-worker.js         # PWA service worker
│   └── ...
│
├── App.tsx                       # Main app component & routing
├── index.tsx                     # Entry point
├── initialData.ts                # Default content seed
├── types.ts                      # TypeScript types
├── vite.config.ts                # Vite configuration
├── package.json
└── README.md                     # This file
```

---

## Getting Started

### Prerequisites
- **Node.js** 20+ 
- **npm** 10+

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
   
   The API will be available at `http://localhost:3001`

---

## Development

### Available Scripts

```bash
# Frontend
npm run dev          # Start Vite dev server
npm run build        # Production build
npm run preview      # Preview production build

# Backend
npm run dev          # Start Hono dev server (in api/)
```

### Adding New Content

Content is managed through the **Admin Dashboard** (requires login):

1. Navigate to `/admin`
2. Login with admin credentials
3. Use the panel buttons to manage:
   - Gallery posts
   - Processing articles
   - Hero slides
   - Site configuration
   - Gear reviews

### Database

The application uses **SQLite** with the following main tables:
- `posts` — Gallery posts
- `processing_posts` — Processing articles
- `hero_slides` — Homepage hero slides
- `my_equipment` — Equipment tracker data
- `observations` — Observation log
- `config` — Site configuration

Database file: `api/data.sqlite`

---

## Build & Deploy

### Production Build

```bash
# Build frontend
npm run build

# Output is in dist/ — deploy to your static host
cp -r dist/* /var/www/astrocapture/
```

### Backend Deployment

The backend API runs as a separate Node.js process:

```bash
cd api
npm install
npm run build
# Use PM2, systemd, or Docker to keep running
```

### Current Deployment

- **Frontend:** Static files served by Caddy
- **Backend:** Hono API on port 3001 (proxied by Caddy)
- **Domain:** https://astro.stephanemee.com

---

## API Backend

The backend is built with **Hono** and provides RESTful endpoints for:

| Endpoint | Description |
|----------|-------------|
| `GET /api/posts` | List all gallery posts |
| `POST /api/posts` | Create a new post |
| `PUT /api/posts/:id` | Update a post |
| `DELETE /api/posts/:id` | Delete a post |
| `GET /api/processing-posts` | List all articles |
| `POST /api/processing-posts` | Create an article |
| `PUT /api/processing-posts/:id` | Update an article |
| `GET /api/config` | Get site config |
| `PUT /api/config` | Update site config |
| `POST /api/login` | Admin login |

Full API documentation is available in `api/src/index.ts`.

---

## Environment Variables

Create `.env` in the project root (not committed):

```env
# OpenWeatherMap API key
VITE_OPENWEATHER_API_KEY=your_key_here

# Telescopius API key
VITE_TELESCOPIUS_API_KEY=your_key_here

# Gemini API key (for AI features)
VITE_GEMINI_API_KEY=your_key_here

# Admin password (for backend)
ADMIN_PASSWORD_HASH=bcrypt_hash_here
```

---

## Design System

The application uses a custom **dark-mode-first** design system:

- **Colors:** CSS custom properties for theming
- **Typography:** Display + body font pairing
- **Spacing:** Consistent 4px grid
- **Components:** Card, Button, Badge, Modal, Lightbox
- **Animations:** Fade-in, slide-up, hover transitions

See `design-system/DESIGN_SYSTEM.md` for full documentation.

---

## Roadmap

- [x] Gallery with tag filtering
- [x] Processing articles with markdown
- [x] Astro Weather dashboard
- [x] Equipment tracker & FOV calculator
- [x] Image of the Day
- [x] Image Wall (masonry layout)
- [x] Gear Reviews
- [x] Admin Dashboard
- [x] PWA support
- [x] SQLite backend
- [ ] Astro Suite v2 (planned refactor)
- [ ] Multi-language support
- [ ] Advanced search with filters
- [ ] Image upload optimization
- [ ] RSS feed

---

## License

MIT — See [LICENSE](LICENSE) for details.

---

<p align="center">
  Made with 🌟 by <a href="https://github.com/MisterMiJarvis">Stéphane Mee</a>
</p>
