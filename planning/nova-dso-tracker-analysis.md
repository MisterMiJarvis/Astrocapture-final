# Nova DSO Tracker — Feature Analysis for AstroCapture

## Source
- **GitHub**: https://github.com/mrantonSG/nova_DSO_tracker
- **Website**: https://nova-tracker.com/
- **Stack**: Python (Flask), SQLAlchemy, AstroPy, Ephem, SQLite
- **Frontend**: HTML5, JavaScript, Aladin Lite

## Features Identified

### 1. Ask Nova AI (Target Ranking)
- **Description**: AI-powered ranking that analyzes object list against sky conditions, moon phase, equipment
- **Providers**: Anthropic, OpenAI, Ollama, any OpenAI-compatible
- **AstroCapture Adaptation**: 
  - ✅ We already have best targets scoring (TargetScoreCard)
  - 🔄 Could enhance with AI recommendations via GLM-5.1
  - 💡 Suggest: Add "Ask Hal" button for AI target ranking

### 2. Log File Analysis
- **Description**: Import ASIAIR, PHD2, N.I.N.A logs. Reports: guiding performance, autofocus V-curves, exposure stats, swimlane timelines
- **AstroCapture Adaptation**:
  - 🆕 New feature: Upload session logs → auto-analysis
  - 💡 Suggest: Add log parser for PHD2/ASIAIR in JournalView

### 3. Mobile Companion
- **Description**: Full planning on mobile — object detail, altitude charts, filtering, framing assistant
- **AstroCapture Adaptation**:
  - ✅ Already responsive (Tailwind)
  - 🔄 Could optimize mobile view further

### 4. Guide Optics & Dither Recommendations
- **Description**: Configure guiding equipment per rig, get dither pixel recommendations based on guide camera pixel scale
- **AstroCapture Adaptation**:
  - 🆕 New feature: Add to EquipmentTracker
  - 💡 Calculate: dither_px = (guide_pixel_scale / main_pixel_scale) * desired_px

### 5. Night Explorer (Inspiration Tab)
- **Description**: Visual gallery of targets currently observable, sorted by altitude and visibility duration
- **AstroCapture Adaptation**:
  - ✅ Similar to BestTargetsView
  - 🔄 Could add image thumbnails from Astrobin

### 6. Yearly Heatmap
- **Description**: Waterfall visualization of target visibility over 12 months with moon period indicators
- **AstroCapture Adaptation**:
  - 🆕 New feature: Add to ObservationPlannerView
  - 💡 Use Chart.js or D3 for heatmap

### 7. Project Management & Journal
- **Description**: Group sessions into Projects, track integration time, PDF reports with embedded log charts
- **AstroCapture Adaptation**:
  - ✅ We have JournalView
  - 🔄 Could add project grouping + PDF export

### 8. Mosaic Planning & Export
- **Description**: Plan multi-pane mosaics in Framing Assistant, export as CSV for ASIAIR/N.I.N.A
- **AstroCapture Adaptation**:
  - 🆕 New feature: Add to SessionPlannerView
  - 💡 Integrate with Telescopius API or Aladin Lite for mosaic grid

### 9. Real-time Tracking
- **Description**: Altitude and azimuth tracking updated every minute
- **AstroCapture Adaptation**:
  - ✅ We have NightlyForecastView
  - 🔄 Could add live timer updating every minute

### 10. Duplicate Management
- **Description**: Scan for objects with similar coordinates and merge
- **AstroCapture Adaptation**:
  - 🆕 Utility feature for admin panel

## Technical Architecture Comparison

| Component | Nova (Flask) | AstroCapture (React/Vite) |
|-----------|--------------|---------------------------|
| Backend | Python/Flask | Hono/Node.js |
| DB | SQLite + Alembic | SQLite |
| Astrometry | AstroPy, Ephem | Custom + APIs |
| Sky Map | Aladin Lite v3 | Aladin Lite v3 ✅ |
| AI | Optional (Claude/OpenAI) | GLM-5.1 ✅ |
| Mobile | Responsive | Responsive ✅ |

## Priority Recommendations for AstroCapture

### High Priority (Next Week)
1. **Telescopius API Integration** — Target search, visibility data
2. **Mosaic Planning** — Grid overlay in Aladin Lite, CSV export
3. **Yearly Heatmap** — 12-month visibility chart

### Medium Priority
4. **Log File Analysis** — PHD2/ASIAIR parser
5. **AI Target Ranking** — Enhance BestTargetsView with "Ask Hal"
6. **Guide Dither Calculator** — Add to EquipmentTracker

### Low Priority
7. **PDF Report Generation** — From journal entries
8. **Duplicate Detection** — Admin utility

## Code Patterns to Reuse

### From Nova (Python → JS adaptation):
```python
# Nova: Altitude calculation
from astropy.coordinates import AltAz, EarthLocation, SkyCoord
from astropy.time import Time

# AstroCapture equivalent: Use our weatherService + astronomyApiService
```

```python
# Nova: Observable window calculation  
def get_observable_window(obj, location, date):
    # Calculate dusk/dawn, moon phase, object altitude
    
# AstroCapture: Already in NightlyForecastView + BestTargetsView
```

```python
# Nova: Project grouping
class Project(db.Model):
    sessions = db.relationship('Session', backref='project')
    
# AstroCapture: Add project_id to posts table
```

## Integration Plan

### Phase 1: Telescopius API (This Week)
- [ ] Explore API endpoints
- [ ] Create `services/telescopiusApiService.ts`
- [ ] Add target search to ObservationPlannerView
- [ ] Add visibility chart (altitude vs time)

### Phase 2: Mosaic Planning (Next Week)
- [ ] Add mosaic grid overlay to Aladin Lite
- [ ] Calculate pane count (FOV / sensor size)
- [ ] Export CSV for ASIAIR/NINA

### Phase 3: Heatmap & Analytics (Later)
- [ ] Yearly visibility heatmap
- [ ] Log file analysis
- [ ] AI-enhanced recommendations

## Resources
- Nova Docs: https://nova-tracker.com/docs/
- Nova GitHub: https://github.com/mrantonSG/nova_DSO_tracker
- Telescopius API: https://api.telescopius.com/
