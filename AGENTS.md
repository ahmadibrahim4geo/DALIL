# DALIL Chrome Extension - Agent Guidelines & Engineering Rules

## 1. Project Overview
**دَلِيل (DALIL)** is a production-grade Google Chrome Extension built on **Manifest V3** for spatial data engineering, POI discovery, and automated mesh-based scraping from Google Maps. It outputs to **ArcGIS / QGIS** (GeoJSON, KML, Shapefile) and business intelligence tools (**Excel .xlsx, UTF-8 BOM CSV**).

## 2. Directory Structure
```text
DALIL Chrome Exstension/
├── manifest.json              # Chrome MV3 manifest definition
├── background/
│   ├── background.js          # Service worker, queue orchestrator & state manager
│   └── grid-presets.js        # Geographic preset bounds (Egypt, Gulf, Global)
├── content/
│   └── content.js             # Content script injected into Google Maps DOM
├── dashboard/
│   ├── dashboard.html         # Full-screen GIS command center UI
│   ├── dashboard.js           # Leaflet map, drawing controls & HUD manager
│   └── dashboard.css          # Dark-mode GIS styling
├── lib/
│   ├── spatial-utils.js       # Mesh generation, ray casting & spatial hash dedup
│   ├── taxonomy-engine.js     # 31 sectors, 114 branches, 940 category leaves
│   ├── smart-brands.js        # Bilingual dictionary & brand expansion
│   ├── export-utils.js        # Multi-format GIS & Excel exporter
│   └── ...                    # Libraries (Leaflet, XLSX, etc.)
├── test/                      # Node.js automated test suites
└── skills/                    # Specialized AI agent skills
    ├── chrome-extensions/
    ├── google-maps-spatial-scraper/
    └── gis-spatial-mesh-engine/
```

## 3. Strict Spatial & Code Rules
1. **Coordinate Discipline**:
   - $X = Longitude$ (East/West, $-180^\circ$ to $+180^\circ$).
   - $Y = Latitude$ (North/South, $-90^\circ$ to $+90^\circ$).
   - Coordinates must be formatted as numeric floats with 6 decimal places.
   - Reject unverified camera centers (`@lat,lng`) from being marked as exact place geometry (`hasExactCoords = false`). Never assign cell centers as fake fallback coordinates.
2. **Geometric Cell Ownership**:
   - Places must be assigned strictly to their containing cell (`ownerCellId`) via `SpatialUtils.findOwnerCell(lngX, latY, cells)`, while recording discovery provenance in `discoveryCellIds`.
3. **Query Plan Integrity**:
   - In `comprehensive` mode, 100% of leaves must be queried without silent dropping, and each leaf must have a deterministic ID (`${branchId}.L${idx}`).
4. **Arabic CSV & KML Formatting**:
   - Always prepend the UTF-8 BOM (`\uFEFF`) when creating or modifying CSV export functions to prevent Arabic text corruption in Microsoft Excel.
   - Always XML-escape special characters (`<`, `>`, `&`, `"`, `'`) and sanitize `CDATA` in KML/KMZ exports. Exclude places with unverified coordinates from KML Point features.
5. **Manifest V3 Constraints**:
   - No `eval()` or inline scripts (CSP strict).
   - Ensure background tasks handle Service Worker inactivity via `chrome.alarms` or active port connections.
   - Block grid regeneration (`SET_ACTIVE_GRID`) while a scraping task is running or paused.
6. **Verification**:
   - Always run the automated test suite after code changes:
     ```powershell
     cd "DALIL Chrome Exstension"
     npm.cmd test
     node test/test_comprehensive_audit.js
     ```
