# AstroCapture v2 — Design System

## Design Philosophy

**Aesthetic Direction: Astro Dark**

AstroCapture preserves its original deep space identity — the interface should feel like an extension of the sky itself with the established dark blue foundation and blue accent system.

**Core Principles:**
1. **Dark-first, always.** No light mode. The app is used at night.
2. **Functional beauty.** Every visual element serves a purpose. Glow indicates interactivity. Color encodes data (weather scores, target ratings).
3. **Scientific precision.** Clean typography, monospace for data, grid-based layouts.
4. **Depth through layers.** Subtle glassmorphism on cards, layered backgrounds with ambient light.
5. **Responsive by design.** Works on a tablet at the telescope, on a phone for quick checks, and on desktop for planning.

---

## Design Tokens

### Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-background` | `#0a0f1a` | Deepest background — void of space |
| `--color-surface` | `#1a2238` | Cards, panels, elevated surfaces |
| `--color-surface-elevated` | `#1a2238` | Modals, dropdowns, hover states |
| `--color-primary` | `#3B82F6` | Primary actions, links, active states |
| `--color-primary-hover` | `#60A5FA` | Hover on primary |
| `--color-primary-glow` | `rgba(59, 130, 246, 0.25)` | Glow effects behind primary elements |
| `--color-secondary` | `#1F2937` | Secondary buttons, badges |
| `--color-secondary-hover` | `#374151` | Hover on secondary |
| `--color-accent` | `#3b82f6` | Astro blue — highlights, special features |
| `--color-accent-glow` | `rgba(59, 130, 246, 0.3)` | Subtle blue ambient glow |
| `--color-success` | `#10B981` | Positive indicators, good weather, high scores |
| `--color-warning` | `#F59E0B` | Warnings, moderate conditions |
| `--color-danger` | `#EF4444` | Errors, destructive actions, poor conditions |
| `--color-info` | `#06B6D4` | Informational badges, tips |
| `--color-text` | `#e8eaf6` | Primary text — starlight white |
| `--color-text-secondary` | `#8e9aaf` | Secondary text, labels, placeholders |
| `--color-text-muted` | `#6b7280` | Tertiary text, disabled states |
| `--color-border` | `rgba(148, 163, 184, 0.12)` | Subtle borders — barely visible like distant stars |
| `--color-border-hover` | `rgba(148, 163, 184, 0.25)` | Hover state for borders |

**Score Color Scale (Target Scoring & Weather):**
| Range | Color | Token |
|-------|-------|-------|
| 90-100% | `#10B981` | `--score-excellent` |
| 75-89% | `#34D399` | `--score-good` |
| 60-74% | `#FBBF24` | `--score-fair` |
| 40-59% | `#F97316` | `--score-poor` |
| 0-39% | `#EF4444` | `--score-bad` |

### Typography

| Role | Font | Weight | Size | Line Height | Letter Spacing |
|------|------|--------|------|-------------|----------------|
| **Display / H1** | Manrope | 700 | 2.5rem (40px) | 1.1 | -0.02em |
| **H2** | Manrope | 600 | 1.875rem (30px) | 1.2 | -0.01em |
| **H3** | Manrope | 600 | 1.5rem (24px) | 1.3 | 0 |
| **H4** | Manrope | 500 | 1.25rem (20px) | 1.4 | 0 |
| **Body** | Inter | 400 | 0.875rem (14px) | 1.6 | 0 |
| **Body Large** | Inter | 400 | 1rem (16px) | 1.5 | 0 |
| **Label** | Inter | 500 | 0.75rem (12px) | 1.4 | +0.05em |
| **Data / Mono** | JetBrains Mono | 400 | 0.8125rem (13px) | 1.5 | 0 |
| **Button** | Inter | 600 | 0.875rem (14px) | 1 | +0.01em |
| **Caption** | Inter | 400 | 0.75rem (12px) | 1.4 | 0 |

**CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Space+Grotesk:wght@500;600;700&display=swap');
```

### Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | Tight gaps, icon padding |
| `--space-2` | 8px | Default gap between related items |
| `--space-3` | 12px | Small component padding |
| `--space-4` | 16px | Default component padding |
| `--space-5` | 20px | Medium gaps |
| `--space-6` | 24px | Card padding |
| `--space-8` | 32px | Section gaps |
| `--space-10` | 40px | Large section spacing |
| `--space-12` | 48px | Page section padding |
| `--space-16` | 64px | Major section dividers |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 6px | Small buttons, badges |
| `--radius-md` | 10px | Inputs, small cards |
| `--radius-lg` | 14px | Cards, panels |
| `--radius-xl` | 18px | Modals, large cards |
| `--radius-full` | 9999px | Pills, avatars |

### Shadows & Glows

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.3)` | Subtle elevation |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.4)` | Cards, dropdowns |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.5)` | Modals, toasts |
| `--shadow-glow-primary` | `0 0 20px rgba(59,130,246,0.3)` | Primary button glow |
| `--shadow-glow-accent` | `0 0 30px rgba(59,130,246,0.15)` | Ambient Astro glow |
| `--shadow-inner` | `inset 0 1px 2px rgba(0,0,0,0.2)` | Inset shadows |

### Z-Index Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--z-base` | 0 | Default content |
| `--z-dropdown` | 40 | Dropdowns, menus |
| `--z-sticky` | 50 | Sticky headers |
| `--z-modal` | 100 | Modals, drawers |
| `--z-toast` | 110 | Toast notifications |
| `--z-tooltip` | 120 | Tooltips |

---

## Component Specs

### Buttons

**Primary Button:**
- Background: `--color-primary`
- Text: `#FFFFFF`
- Padding: `--space-3` `--space-5` (12px 20px)
- Border Radius: `--radius-md` (10px)
- Font: Button (Inter 600)
- Shadow: `--shadow-glow-primary` on hover
- Hover: Background `--color-primary-hover`, scale 1.02
- Active: Scale 0.98
- Disabled: Opacity 0.4, cursor not-allowed
- Transition: 150ms ease-out

**Secondary Button:**
- Background: `--color-secondary`
- Text: `--color-text`
- Same sizing as primary
- Hover: Background `--color-secondary-hover`
- Active: Scale 0.98

**Ghost Button:**
- Background: transparent
- Text: `--color-text-secondary`
- Hover: Background `rgba(255,255,255,0.05)`, text `--color-text`
- Used for icon-only actions, subtle CTAs

**Icon Button:**
- Size: 36×36px (min touch target 44×44px with padding)
- Background: transparent
- Hover: Background `rgba(255,255,255,0.05)`
- Border Radius: `--radius-md`
- Icon size: 18px

### Cards

**Standard Card:**
- Background: `--color-surface`
- Border: 1px solid `--color-border`
- Border Radius: `--radius-lg` (14px)
- Padding: `--space-6` (24px)
- Shadow: none (flat in dark mode)
- Hover: Border color `--color-border-hover`, subtle glow for interactive cards
- Transition: 200ms ease-out

**Feature Card (elevated):**
- Background: `--color-surface-elevated`
- Border: 1px solid `--color-border`
- Border Radius: `--radius-lg`
- Padding: `--space-6`
- Shadow: `--shadow-md`
- Used for: Equipment cards, session summaries, target score cards

**Glass Card (for overlays):**
- Background: `rgba(11, 16, 33, 0.7)`
- Backdrop Filter: blur(12px)
- Border: 1px solid `rgba(255,255,255,0.08)`
- Border Radius: `--radius-xl` (18px)
- Used for: Weather overlays, floating panels, tooltips

### Forms

**Input Field:**
- Background: `--color-background`
- Border: 1px solid `--color-border`
- Border Radius: `--radius-md`
- Padding: `--space-3` `--space-4`
- Font: Body
- Placeholder: `--color-text-muted`
- Focus: Border `--color-primary`, ring 2px `rgba(59,130,246,0.25)`
- Transition: 150ms

**Select (Dropdown):**
- Same base as Input
- Chevron icon: 16px, `--color-text-secondary`
- Dropdown panel: `--color-surface-elevated`, border `--color-border`, radius `--radius-lg`
- Option hover: `rgba(255,255,255,0.05)`
- Selected: Background `rgba(59,130,246,0.15)`

**Textarea:**
- Same as Input but min-height: 120px
- Line-height: 1.6

**Checkbox / Toggle:**
- Track: 40px × 24px, radius full
- Off: Background `--color-border`
- On: Background `--color-primary`
- Thumb: 20px, white, shadow-sm
- Transition: 200ms

### Modals

**Standard Modal:**
- Overlay: `rgba(0,0,0,0.7)` + backdrop-blur(8px)
- Panel: `--color-surface`, border `--color-border`
- Border Radius: `--radius-xl` (18px)
- Max Width: 640px (default), 480px (small), 900px (large)
- Padding: `--space-6`
- Header: Sticky, bottom border `--color-border`, title H3
- Close: Top-right, X icon, ghost button
- Entry animation: Scale 0.95→1 + fade, 200ms ease-out
- Exit animation: Scale 1→0.95 + fade, 150ms ease-in

**Bottom Sheet (mobile):**
- Overlay: same as modal
- Panel: Bottom-aligned, full width
- Border Radius: `--radius-xl` top corners only
- Max Height: 90vh
- Drag handle: 40px wide, 4px tall, `--color-border`, centered top

### Tables & Data Grids

**Data Table:**
- Header: Background `rgba(255,255,255,0.02)`, font Label, uppercase
- Row: Border-bottom `--color-border`
- Row hover: Background `rgba(255,255,255,0.03)`
- Cell padding: `--space-3` `--space-4`
- Sortable header: Hover text `--color-primary`, sort icon 14px
- Empty state: Centered icon + message, `--color-text-muted`

**Data Grid (for equipment/session cards):**
- Gap: `--space-4`
- Responsive: 1 col mobile, 2 col tablet, 3-4 col desktop

### Badges

| Type | Background | Text | Usage |
|------|------------|------|-------|
| Default | `--color-secondary` | `--color-text` | Neutral labels |
| Primary | `rgba(59,130,246,0.15)` | `--color-primary` | Active, primary |
| Success | `rgba(16,185,129,0.15)` | `--color-success` | Good conditions |
| Warning | `rgba(245,158,11,0.15)` | `--color-warning` | Caution |
| Danger | `rgba(239,68,68,0.15)` | `--color-danger` | Poor conditions |
| Accent | `rgba(59,130,246,0.15)` | `--color-accent` | Special features |

- Padding: 4px 10px
- Border Radius: `--radius-full`
- Font: Label

---

## Layout System

### Container

| Breakpoint | Max Width | Padding |
|------------|-----------|---------|
| Mobile (<640px) | 100% | 16px |
| Tablet (640-1024px) | 100% | 24px |
| Desktop (1024-1440px) | 1200px | 32px |
| Wide (>1440px) | 1400px | 40px |

### Grid System

- 12-column grid
- Gap: 16px mobile, 24px tablet, 32px desktop
- Common patterns:
  - Full width: Hero sections, tables
  - 2-column: Feature cards, form groups
  - 3-column: Equipment grid, target cards
  - 4-column: Dashboard widgets, gallery thumbnails
  - Sidebar + Content: 280px sidebar + flex content (for desktop)

### Navigation

**Desktop Navigation:**
- Position: Fixed top, full width
- Height: 64px
- Background: `--color-background` with `rgba(6,8,17,0.9)` + backdrop-blur(12px)
- Border-bottom: 1px solid `--color-border`
- Layout: Logo left, nav links center, actions right
- Nav links: Inter 500, 14px, `--color-text-secondary` → `--color-text` on hover
- Active link: `--color-primary`, underline indicator (2px, rounded)
- Z-index: `--z-sticky`

**Mobile Navigation:**
- Hamburger: 44×44px touch target, right side
- Menu: Full-screen overlay, `--color-surface`, slide-in from right
- Links: H4 size, stacked vertically, 16px padding
- Active link: `--color-primary`

**Navigation Items (v2):**
1. **Gallery** — Image showcase (existing)
2. **Dashboard** — Astro Index + Weather (existing)
3. **Targets** — Best Targets + Scoring (existing, enhanced)
4. **Planner** — Session Planner (new)
5. **Equipment** — Gear Manager + FOV (new)
6. **Journal** — Session Logbook (new)
7. **Hal** — AI Assistant (new)
8. **Admin** — Settings (existing, gear icon)

### Page Structure

Each page follows:
```
<Page>
  <Navbar />
  <main className="pt-16 min-h-screen"> {/* 64px top padding for fixed nav */}
    <PageHeader title="..." subtitle="..." />
    <Container>
      <Content />
    </Container>
  </main>
  <Footer />
</Page>
```

**Page Header:**
- Padding: `--space-12` top, `--space-6` bottom
- Title: H1, Display font
- Subtitle: Body Large, `--color-text-secondary`
- Optional: Action buttons aligned right on desktop
- Optional: Breadcrumb navigation above title

---

## Animation Specs

### Philosophy
Animations should feel like celestial motion — smooth, gravitational, never jarring. Use physics-based easing where possible. Respect `prefers-reduced-motion`.

### Easing Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Entering elements (modal open, page transition) |
| `--ease-in` | `cubic-bezier(0.7, 0, 0.84, 0)` | Exiting elements |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Bouncy interactions (toggle, checkbox) |
| `--ease-smooth` | `cubic-bezier(0.4, 0, 0.2, 1)` | General transitions |

### Animation Patterns

**Page Load (Staggered Reveal):**
- Container: Fade in 0→1, 300ms, ease-out
- Children: Stagger 50ms each, translateY(20px)→0 + fade
- Total sequence: ~400-600ms for full page

**Card Hover:**
- Scale: 1→1.02, 200ms, ease-smooth
- Border: Color transition to `--color-border-hover`
- Shadow: Add subtle glow for interactive cards

**Button Press:**
- Scale: 1→0.97, 100ms, ease-in
- Release: Scale 0.97→1, 150ms, ease-spring

**Modal Entry:**
- Overlay: Fade 0→1, 200ms
- Panel: Scale 0.95→1 + translateY(20px)→0, 250ms, ease-out
- Content: Stagger children 30ms

**Modal Exit:**
- Panel: Scale 1→0.97 + fade, 150ms, ease-in
- Overlay: Fade 1→0, 200ms

**Toast Notification:**
- Entry: translateX(100%)→0 + fade, 300ms, ease-out
- Exit: translateX(0)→translateX(100%) + fade, 200ms, ease-in
- Auto-dismiss: 5000ms

**Score Bar Animation:**
- Width: 0%→target%, 800ms, ease-out
- Delay: 200ms after card appears
- Color: Matches score category

**Weather Timeline Scroll:**
- Horizontal scroll with momentum
- Active hour: Scale 1→1.05, border highlight
- Transition: 150ms

**Star Background (existing):**
- Keep existing twinkle animation
- 100 stars, random positions
- Opacity oscillation: 0.1→0.6, 2-5s, ease-in-out, infinite

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Feature-Specific UI Patterns

### Equipment Management

**Equipment Card:**
- Layout: Horizontal — image left (80×80px), info right
- Image: Rounded `--radius-md`, object-fit cover
- Category badge: Top-right of image
- Name: H4, bold
- Specs: Data/mono font, key-value pairs
- Actions: Edit (pencil), Delete (trash), Calculate FOV (telescope icon)
- FOV Result: Inline expandable panel with arcmin values

**Equipment Form (Modal):**
- Sections: Basic Info, Telescope Specs, Camera Specs, Mount Specs, Filters
- Section headers: H4 with icon
- Dynamic fields: Show/hide based on category
- FOV Preview: Live calculation as user types

### Target Scoring (Enhanced)

**Score Card (existing — refine):**
- Keep 5-metric grid layout
- Color coding: Use score color scale
- Progress bar: Animated fill on load
- Recommendation badge: Top-right, colored by score tier
- Expandable: Click to see detailed breakdown

**Score Breakdown (expanded):**
- Altitude graph: Mini line chart showing altitude over time
- Moon phase: Visual moon icon + illumination %
- FOV visualization: Simple SVG showing target size vs camera FOV

### Session Planner

**Monthly Calendar:**
- Grid: 7 columns, gap 4px
- Day cell: Square, `--radius-sm`
- Today: Border `--color-primary`
- Selected: Background `rgba(59,130,246,0.15)`
- Moon phase: Small icon in cell corner
- Weather indicator: Color dot (green/yellow/red)
- Events: Small dots below date

**Day Detail Panel:**
- Slide-in from right (desktop), bottom sheet (mobile)
- Sunrise/sunset times
- Moon info
- Weather hourly strip
- Session list for that day
- "Plan Session" CTA

**Session Creation Form:**
- Target: Searchable dropdown with Messier catalog
- Equipment: Multi-select from gear list
- Date/time: Date + time pickers
- Duration: Slider 0.5-12 hours
- Notes: Textarea
- Auto-weather: Checkbox to pull forecast

### Weather Integration

**Weather Card:**
- Current conditions: Large icon + temp + condition text
- Hourly strip: Horizontal scroll, 24h
  - Each hour: Time, icon, temp, cloud %, wind
  - Color-coded background by quality
- 14-day forecast: Compact vertical list
  - Day, high/low, condition icon, moon phase, quality badge

**Nightly Forecast View:**
- Timeline: Horizontal, hour by hour
- Bars: Height = quality score, color = score color
- Overlay: Moon altitude line (yellow)
- Tooltips: Hover for detailed conditions

### Journal de Sessions

**Session List:**
- Card per session with:
  - Target image (if available) or target icon
  - Target name + date
  - Equipment summary
  - Integration time
  - Quality badge
  - Edit/Delete actions

**Session Detail:**
- Hero: Target image or placeholder
- Metadata grid: Date, location, equipment, conditions
- Notes: Rich text rendered
- Gallery: Thumbnail grid of captured frames
- Export: CSV button

**Session Form:**
- Same fields as planner creation
- Plus: Post-session fields (actual duration, quality rating, notes)
- Image uploads: Multiple file upload for captured frames

### Ask Hal AI

**Chat Interface:**
- Messages: Bubbles, user right (primary color), AI left (surface)
- Input: Fixed bottom, full width, with send button
- Typing indicator: Three dots animation
- Suggested prompts: Chip buttons below input
- Sources: Collapsible "Sources" section in AI responses

**Ranking Results:**
- Numbered list with score bars
- Expandable cards for each target
- "Why this rank?" explanation per item

---

## Responsive Behavior

### Mobile First (<640px)
- Single column layouts
- Bottom sheet modals
- Hamburger navigation
- Touch targets ≥44px
- Horizontal scroll for data tables (with fade indicators)
- Stacked forms (single column)

### Tablet (640-1024px)
- 2-column grids for cards
- Side navigation (collapsible)
- Modals centered (not full screen)
- Form fields: 2-column where appropriate

### Desktop (1024px+)
- Full navigation bar
- 3-4 column grids
- Sidebar layouts (planner, journal)
- Hover states active
- Keyboard shortcuts visible

---

## Accessibility

- **Contrast**: All text meets WCAG AA (4.5:1). Large text meets AAA (7:1).
- **Focus rings**: Visible on all interactive elements, 2px `--color-primary` offset 2px
- **Keyboard navigation**: Full Tab support, Escape to close modals
- **ARIA labels**: Icon-only buttons have aria-label
- **Screen reader**: Tables have proper headers, forms have labels
- **Color independence**: Scores use both color AND icons/numbers
- **Motion**: Respect `prefers-reduced-motion`

---

## Copywriting (FR/EN)

### Navigation

| Section | EN | FR |
|---------|-----|-----|
| Gallery | Gallery | Galerie |
| Dashboard | Dashboard | Tableau de bord |
| Targets | Best Targets | Meilleures Cibles |
| Planner | Session Planner | Planificateur |
| Equipment | My Gear | Mon Matériel |
| Journal | Session Log | Journal de Sessions |
| Hal | Ask Hal | Demander à Hal |
| Admin | Settings | Paramètres |

### Equipment Management

| Label | EN | FR |
|-------|-----|-----|
| Page Title | My Equipment | Mon Matériel |
| Subtitle | Manage your astrophotography gear and calculate FOV | Gérez votre matériel et calculez le champ de vue |
| Add Equipment | Add Equipment | Ajouter du Matériel |
| Category Telescope | Telescope | Télescope |
| Category Camera | Camera | Caméra |
| Category Mount | Mount | Monture |
| Category Filter | Filter | Filtre |
| Category Accessory | Accessory | Accessoire |
| FOV Calculation | Calculate FOV | Calculer le FOV |
| FOV Result | Field of View | Champ de Vue |
| Focal Length | Focal Length | Distance Focale |
| Aperture | Aperture | Ouverture |
| Sensor Size | Sensor Size | Taille du Capteur |
| Pixel Size | Pixel Size | Taille des Pixels |
| Resolution | Resolution | Résolution |
| No Equipment | No equipment added yet. Add your first telescope or camera. | Aucun matériel ajouté. Ajoutez votre premier télescope ou caméra. |
| Edit Equipment | Edit | Modifier |
| Delete Equipment | Delete | Supprimer |
| Save Equipment | Save Equipment | Enregistrer |

### Session Planner

| Label | EN | FR |
|-------|-----|-----|
| Page Title | Session Planner | Planificateur de Sessions |
| Subtitle | Plan your imaging nights with weather and moon data | Planifiez vos nuits d'imagerie avec la météo et la Lune |
| New Session | New Session | Nouvelle Session |
| Select Date | Select Date | Sélectionner la Date |
| Select Target | Select Target | Choisir une Cible |
| Select Equipment | Select Equipment | Choisir le Matériel |
| Duration | Duration | Durée |
| Notes | Notes | Notes |
| Weather Forecast | Weather Forecast | Prévisions Météo |
| Moon Phase | Moon Phase | Phase Lunaire |
| Sunrise | Sunrise | Lever du Soleil |
| Sunset | Sunset | Coucher du Soleil |
| Twilight End | Astronomical Twilight End | Fin du Crépuscule |
| Twilight Start | Astronomical Twilight Start | Début de l'Aube |
| Export CSV | Export to CSV | Exporter en CSV |
| No Sessions | No sessions planned for this date | Aucune session planifiée |
| Session Saved | Session saved successfully | Session enregistrée |

### Journal de Sessions

| Label | EN | FR |
|-------|-----|-----|
| Page Title | Session Journal | Journal de Sessions |
| Subtitle | Log and review all your imaging sessions | Enregistrez et consultez toutes vos sessions |
| New Entry | New Entry | Nouvelle Entrée |
| Session Date | Date | Date |
| Target | Target | Cible |
| Integration Time | Integration Time | Temps d'Intégration |
| Equipment Used | Equipment Used | Matériel Utilisé |
| Conditions | Conditions | Conditions |
| Rating | Rating | Note |
| Notes | Notes | Notes |
| Gallery | Captured Frames | Images Capturées |
| No Entries | No sessions recorded yet | Aucune session enregistrée |
| Edit Entry | Edit Entry | Modifier |
| Delete Entry | Delete Entry | Supprimer |
| Confirm Delete | Are you sure? This cannot be undone. | Êtes-vous sûr ? Cette action est irréversible. |

### Ask Hal AI

| Label | EN | FR |
|-------|-----|-----|
| Page Title | Ask Hal | Demander à Hal |
| Subtitle | AI-powered target ranking and recommendations | Classement intelligent et recommandations par IA |
| Input Placeholder | Ask about targets, weather, or equipment... | Demandez des infos sur les cibles, la météo, le matériel... |
| Send | Send | Envoyer |
| Thinking | Hal is thinking... | Hal réfléchit... |
| Suggested Prompts | Try asking: | Essayez de demander : |
| Prompt 1 | What should I image tonight? | Que devrais-je photographier ce soir ? |
| Prompt 2 | Rank galaxies for my setup | Classez les galaxies pour mon matériel |
| Prompt 3 | Best targets this weekend | Meilleures cibles ce week-end |
| Prompt 4 | Compare these two telescopes | Comparez ces deux télescopes |
| Sources | Sources | Sources |
| Confidence | Confidence | Confiance |

### Weather Integration

| Label | EN | FR |
|-------|-----|-----|
| Current Conditions | Current Conditions | Conditions Actuelles |
| Temperature | Temperature | Température |
| Humidity | Humidity | Humidité |
| Wind | Wind | Vent |
| Cloud Cover | Cloud Cover | Couverture Nuageuse |
| Seeing | Seeing | Seeing |
| Transparency | Transparency | Transparence |
| Hourly Forecast | Hourly Forecast | Prévisions Horaires |
| 14-Day Forecast | 14-Day Forecast | Prévisions à 14 Jours |
| Good Conditions | Good Conditions | Bonnes Conditions |
| Fair Conditions | Fair Conditions | Conditions Moyennes |
| Poor Conditions | Poor Conditions | Mauvaises Conditions |
| Clear Skies | Clear Skies | Ciel Dégagé |
| Partly Cloudy | Partly Cloudy | Partiellement Nuageux |
| Cloudy | Cloudy | Nuageux |
| Rain | Rain | Pluie |

### Target Scoring (Enhanced)

| Label | EN | FR |
|-------|-----|-----|
| Score | Score | Score |
| Match | Match | Correspondance |
| Altitude | Altitude | Altitude |
| Imaging Window | Window | Fenêtre |
| FOV Fit | FOV Fit | Adaptation FOV |
| Moon Separation | Moon | Lune |
| Magnitude | Magnitude | Magnitude |
| Excellent | Excellent | Excellent |
| Good | Good | Bon |
| Fair | Fair | Moyen |
| Poor | Poor | Faible |
| Not Recommended | Not Recommended | Déconseillé |
| Best Season | Best Season | Meilleure Saison |
| Difficulty | Difficulty | Difficulté |

### Common Actions & States

| Label | EN | FR |
|-------|-----|-----|
| Save | Save | Enregistrer |
| Cancel | Cancel | Annuler |
| Delete | Delete | Supprimer |
| Edit | Edit | Modifier |
| Create | Create | Créer |
| Search | Search | Rechercher |
| Filter | Filter | Filtrer |
| Sort | Sort | Trier |
| Export | Export | Exporter |
| Import | Import | Importer |
| Loading | Loading... | Chargement... |
| No Results | No results found | Aucun résultat |
| Error | Something went wrong | Une erreur s'est produite |
| Retry | Retry | Réessayer |
| Success | Success! | Succès ! |
| Confirm | Confirm | Confirmer |
| Close | Close | Fermer |
| More | More | Plus |
| Show More | Show More | Voir Plus |
| Show Less | Show Less | Voir Moins |

---

## Migration Notes

### From v1 to v2

**Existing components to preserve (no changes):**
- `StarBackground` — Keep as-is
- `TargetScoreCard` — Enhance styling per this system, keep logic
- `WeatherDisplayView` — Enhance styling, keep API integration
- `BestTargetsView` — Enhance styling, keep logic
- `NightlyForecastView` — Enhance styling, keep API integration
- Gallery/Posts/CMS components — Keep functionality, apply new token colors
- All API services (`weatherService`, `astronomyApiService`, `catalogService`) — Preserve

**CSS variable migration:**
| Old Token | New Token |
|-----------|-----------|
| `--color-background: #0a0f1a` | `--color-background: #0a0f1a` |
| `--color-surface: #111827` | `--color-surface: #1a2238` |
| `--color-primary: #3b82f6` | Same (keep) |
| `--color-primary-hover: #2563eb` | `--color-primary-hover: #60A5FA` |
| `--color-secondary: #1f2937` | Same (keep) |
| `--color-secondary-hover: #374151` | Same (keep) |
| `--color-border: #1f2937` | `--color-border: rgba(148,163,184,0.12)` |
| `--color-text: #d1d5db` | `--color-text: #e8eaf6` |
| `--color-text-secondary: #6b7280` | `--color-text-secondary: #8e9aaf` |

**Font migration:**
| Old | New |
|-----|-----|
| `--font-sans: 'Inter'` | Keep, add `--font-body: 'Inter'` |
| `--font-display: 'Manrope'` | `--font-display: 'Manrope'` |
| (none) | Add `--font-mono: 'JetBrains Mono'` |

---

## File Structure

```
/astrocapture
├── design-system/
│   ├── DESIGN_SYSTEM.md          ← Master document
│   ├── index.css                  ← Updated CSS tokens
│   ├── components.tsx             ← Shared UI primitives
│   ├── Navbar.tsx                 ← Navigation component
│   └── wireframes/
│       ├── EquipmentView.tsx      ← Equipment CRUD + FOV
│       ├── PlannerView.tsx        ← Calendar + session planner
│       ├── JournalView.tsx        ← Session journal
│       └── AskHalView.tsx         ← AI chat interface
├── src/
│   ├── index.css                 ← Updated with new tokens
│   ├── components/
│   │   ├── ui/                   ← New shared UI primitives
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── TextArea.tsx
│   │   │   └── Toggle.tsx
│   │   ├── layout/
│   │   │   ├── Navbar.tsx
│   │   │   ├── PageHeader.tsx
│   │   │   ├── Container.tsx
│   │   │   └── Footer.tsx
│   │   ├── equipment/
│   │   │   ├── EquipmentCard.tsx
│   │   │   ├── EquipmentForm.tsx
│   │   │   ├── EquipmentList.tsx
│   │   │   └── FovCalculator.tsx
│   │   ├── planner/
│   │   │   ├── CalendarView.tsx
│   │   │   ├── DayDetailPanel.tsx
│   │   │   ├── SessionForm.tsx
│   │   │   └── SessionList.tsx
│   │   ├── journal/
│   │   │   ├── JournalEntryCard.tsx
│   │   │   ├── JournalEntryForm.tsx
│   │   │   ├── JournalDetail.tsx
│   │   │   └── JournalList.tsx
│   │   ├── hal/
│   │   │   ├── ChatInterface.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── SuggestedPrompts.tsx
│   │   │   └── RankingResults.tsx
│   │   ├── Shared.tsx            ← Existing (keep, refactor to ui/)
│   │   ├── TargetScoreCard.tsx   ← Existing (enhance)
│   │   ├── WeatherDisplayView.tsx ← Existing (enhance)
│   │   └── ... (existing components)
```

---

*Version: 2.0.0 | Date: 2026-05-23 | For AstroCapture v2*
