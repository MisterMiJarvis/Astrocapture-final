# Specifications: AstroCapture Migration from Firebase to SQLite

This document outlines the technical specifications for migrating the AstroCapture project from Firebase to a self-hosted Hono API with a SQLite backend, following the architecture pattern established for La Maison Jeanne (LMJ).

## 1. Architecture Overview

The current Firebase-centric architecture will be replaced by a decoupled Client-Server model.

- **Frontend**: React 19 + Vite + TypeScript (existing). All Firebase SDK calls will be replaced by standard `fetch` calls to the API.
- **Backend**: Hono API (Node.js) running as a systemd service.
- **Database**: SQLite (via `better-sqlite3`) for structured data storage.
- **Storage**: Local filesystem storage for images and documents, served via the Hono API or directly via Caddy.
- **Auth**: JWT-based authentication using `bcryptjs` for password hashing and `jsonwebtoken` for token management.
- **Reverse Proxy**: Caddy will route `/api/*` and `/uploads/*` to the Hono API and serve the frontend static files.

## 2. Database Schema

The SQLite database (`astrocapture.db`) will contain the following tables:

### `users`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | UUID |
| `email` | TEXT | UNIQUE, NOT NULL | Admin email |
| `password_hash` | TEXT | NOT NULL | Bcrypt hash |
| `created_at` | TEXT | NOT NULL | ISO timestamp |

### `posts`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | UUID |
| `title` | TEXT | NOT NULL | Post title |
| `object_name` | TEXT | NOT NULL | Target (e.g. "M42") |
| `image_url` | TEXT | NOT NULL | Path to image in `/uploads` |
| `capture_date` | TEXT | NOT NULL | ISO Date |
| `equipment` | TEXT | NOT NULL | Equipment string |
| `description` | TEXT | NOT NULL | Post body |
| `tags` | TEXT | NOT NULL | JSON array of tags |
| `astrobin_url` | TEXT | | External link |
| `raw_data_url` | TEXT | | Path to raw data zip |
| `total_integration_time`| INTEGER | NOT NULL | Total minutes |
| `show_on_wall` | INTEGER | DEFAULT 1 | Boolean (0/1) |
| `updated_at` | TEXT | NOT NULL | ISO timestamp |

### `acquisition_logs`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | UUID |
| `post_id` | TEXT | FK(posts.id) | Associated post |
| `date` | TEXT | NOT NULL | Date of capture |
| `filter` | TEXT | NOT NULL | Filter used |
| `exposure_count` | INTEGER | NOT NULL | Number of frames |
| `exposure_length` | INTEGER | NOT NULL | Length in seconds |

### `processing_posts`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | UUID |
| `title` | TEXT | NOT NULL | Article title |
| `description` | TEXT | NOT NULL | HTML content |
| `tags` | TEXT | NOT NULL | JSON array of tags |
| `capture_date` | TEXT | NOT NULL | ISO Date |
| `post_type` | TEXT | NOT NULL | before-after, research, gallery, gear-review |
| `before_image_url` | TEXT | | Path to before image |
| `after_image_url` | TEXT | | Path to after image |
| `featured_image_url` | TEXT | | Path to featured image |
| `attached_audio_url` | TEXT | | Path to audio file |
| `attached_document_url`| TEXT | | Path to PDF/Doc |
| `show_before_on_wall` | INTEGER | DEFAULT 0 | Boolean |
| `show_after_on_wall` | INTEGER | DEFAULT 0 | Boolean |
| `show_featured_on_wall`| INTEGER | DEFAULT 0 | Boolean |
| `updated_at` | TEXT | NOT NULL | ISO timestamp |

### `processing_gallery_images`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | UUID |
| `post_id` | TEXT | FK(processing_posts.id)| Associated processing post |
| `image_url` | TEXT | NOT NULL | Path to image |
| `caption` | TEXT | NOT NULL | Image caption |
| `show_on_wall` | INTEGER | DEFAULT 0 | Boolean |

### `equipment`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | UUID |
| `name` | TEXT | NOT NULL | Item name |
| `category` | TEXT | NOT NULL | Camera, Telescope, etc. |
| `image_url` | TEXT | | Path to image |
| `specs` | TEXT | NOT NULL | Technical specs |
| `description` | TEXT | NOT NULL | Description |
| `rating` | INTEGER | NOT NULL | 1-5 rating |
| `is_personal` | INTEGER | NOT NULL | Boolean (owned vs remote) |
| `focal_length` | REAL | | mm |
| `aperture` | REAL | | mm |
| `f_ratio` | REAL | | f/x |
| `sensor_width` | REAL | | mm |
| `sensor_height` | REAL | | mm |
| `pixel_size` | REAL | | micrometers |
| `payload_capacity` | REAL | | kg |
| `updated_at` | TEXT | NOT NULL | ISO timestamp |

### `dso_cache`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | e.g., "M42" |
| `data` | TEXT | NOT NULL | JSON blob of DeepSkyObject |
| `updated_at` | TEXT | NOT NULL | ISO timestamp |

### `observation_targets`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | UUID |
| `object_id` | TEXT | NOT NULL | DSO ID |
| `common_name` | TEXT | NOT NULL | Common name |
| `object_type` | TEXT | NOT NULL | Type |
| `constellation` | TEXT | NOT NULL | Constellation |
| `magnitude` | REAL | | Apparent mag |
| `size_width` | REAL | NOT NULL | Arcmin |
| `size_height` | REAL | NOT NULL | Arcmin |
| `priority` | TEXT | NOT NULL | critical, high, medium, low |
| `notes` | TEXT | | User notes |
| `completed` | INTEGER | DEFAULT 0 | Boolean |
| `completed_date` | TEXT | | ISO date |
| `acquisition_hours` | REAL | DEFAULT 0 | Hours captured |
| `target_hours` | REAL | | Goal hours |

### `observation_sessions`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | UUID |
| `date` | TEXT | NOT NULL | ISO date |
| `loc_name` | TEXT | NOT NULL | Location name |
| `loc_lat` | REAL | NOT NULL | Latitude |
| `loc_lon` | REAL | NOT NULL | Longitude |
| `moon_illum` | REAL | NOT NULL | % |
| `sunset_time` | TEXT | NOT NULL | ISO time |
| `darkness_start` | TEXT | NOT NULL | ISO timestamp |
| `darkness_end` | TEXT | NOT NULL | ISO timestamp |
| `sunrise_time` | TEXT | NOT NULL | ISO time |
| `status` | TEXT | NOT NULL | planned, completed, etc. |
| `weather_summary` | TEXT | | Summary |
| `notes` | TEXT | | Session notes |
| `cloud_cover` | INTEGER | | % |

### `site_config`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | Config key (e.g., 'heroSlides') |
| `data` | TEXT | NOT NULL | JSON blob |
| `updated_at` | TEXT | NOT NULL | ISO timestamp |

## 3. API Endpoints

All endpoints except `GET` (public) and `/api/auth/login` / `/api/auth/setup` require the `Authorization: Bearer <token>` header.

### Authentication
- `POST /api/auth/login`: Returns `{ token, user }`.
- `POST /api/auth/setup`: Initial admin account creation (one-time).
- `GET /api/auth/me`: Returns current user session.

### Content (Posts & Processing)
- `GET /api/posts`: List all posts (filters: `published`, `tag`).
- `GET /api/posts/:id`: Get single post.
- `POST /api/posts`: Create post.
- `PUT /api/posts/:id`: Update post.
- `DELETE /api/posts/:id`: Delete post.
- `GET /api/processing-posts`: List processing articles.
- `GET /api/processing-posts/:id`: Get single article.
- `POST /api/processing-posts`: Create article.
- `PUT /api/processing-posts/:id`: Update article.
- `DELETE /api/processing-posts/:id`: Delete article.

### Equipment & Gear
- `GET /api/equipment`: List all gear.
- `POST /api/equipment`: Add gear.
- `PUT /api/equipment/:id`: Update gear.
- `DELETE /api/equipment/:id`: Remove gear.

### Observation Planner
- `GET /api/targets`: List targets wishlist.
- `POST /api/targets`: Add target.
- `PUT /api/targets/:id`: Update target.
- `DELETE /api/targets/:id`: Remove target.
- `GET /api/sessions`: List sessions.
- `POST /api/sessions`: Create session.
- `PUT /api/sessions/:id`: Update session.
- `DELETE /api/sessions/:id`: Remove session.

### DSO Cache
- `GET /api/dso/:id`: Get cached DSO data.
- `POST /api/dso`: Cache new DSO data (Admin).

### Configuration
- `GET /api/config/:id`: Get config (e.g., `/api/config/heroSlides`).
- `PUT /api/config/:id`: Update config.

### Files
- `POST /api/upload`: Accepts `multipart/form-data`. Returns `{ id, url, filename }`.
- `GET /uploads/*`: Serves static files from the upload directory.

## 4. Auth Migration

- **Firebase Auth $\rightarrow$ JWT/Bcrypt**:
    - Admin credentials will be moved to the `users` table.
    - The frontend will store the JWT in `localStorage`.
    - An `auth` middleware in Hono will validate the JWT for all protected routes.
    - `/api/auth/setup` will allow the initial creation of the admin account.

## 5. Image Upload & Storage

- **Firebase Storage $\rightarrow$ Local Filesystem**:
    - Uploads will be stored in `/home/ubuntu/astrocapture/public/uploads/`.
    - The API will handle file writes and return relative URLs (e.g., `/uploads/uuid.jpg`).
    - Caddy will serve the `/uploads` directory.

## 6. Frontend Changes

- **Firebase SDK Removal**:
    - Remove `firebase` and `firebase-compat` dependencies.
    - Remove `services/firebase.ts` and `services/firebaseConfig.ts`.
- **Service Layer Update**:
    - Create a new `services/api.ts` using `fetch` (or a small axios instance) to communicate with `/api/*`.
    - Replace `subscribeToCollection` and `subscribeToSettings` (Real-time listeners) with polling or simple `GET` calls on mount/update.
- **State Management**:
    - Shift from Firebase's push-based updates to a request-response cycle.
    - Update `App.tsx` to use `useEffect` to fetch initial data from the API.

## 7. Data Migration Plan

A migration script (`scripts/migrate-firebase.ts`) will be created to:
1. Authenticate with Firebase Admin SDK.
2. Export all documents from `posts`, `processingPosts`, `equipment`, `dsoCache`, `observationTargets`, `observationSessions`, and `settings` collections.
3. Map Firebase document IDs to SQLite Primary Keys.
4. Download all images from Firebase Storage to the local `/uploads` folder.
5. Update all image URLs in the data to point to local paths.
6. Insert all data into the SQLite database.

## 8. Deployment

- **Systemd Service**:
    - Create `astrocapture-api.service` to run `node dist/index.js`.
- **Caddy Configuration**:
    ```caddy
    www.astrocapture.org {
        handle /api/* {
            reverse_proxy localhost:3001
        }
        handle /uploads/* {
            root * /home/ubuntu/astrocapture/public
            file_server
        }
        handle {
            root * /home/ubuntu/astrocapture/dist
            file_server
            try_files {path} /index.html
        }
    }
    ```

## 9. Breaking Changes & Preservations

- **Breaking Changes**:
    - No more real-time "live" updates of the UI when data changes (unless polling is implemented).
    - Admin must perform a one-time setup via `/api/auth/setup`.
- **Preserved Features**:
    - **Gemini API**: Remains as a frontend/backend call (backend is preferred for security).
    - **Weather & Astronomy APIs**: Remain as external `fetch` calls from the frontend.
    - **Astrobin/NASA API**: Unchanged.
