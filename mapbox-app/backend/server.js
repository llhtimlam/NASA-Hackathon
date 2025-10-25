// mapbox-app/backend/server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ---------- Robust fetch (native or node-fetch fallback) ----------
let fetchFn = globalThis.fetch;
if (!fetchFn) {
  const { default: fetch } = await import('node-fetch');
  fetchFn = fetch;
}
// ---------- Paths / FS setup ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();

// Allow your local front-end ports. Add prod origins when you deploy.
const allowedOrigins = [
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:8088',
  'http://127.0.0.1:8088',
  // 'https://<your-user>.github.io',
  // 'https://<your-user>.github.io/<your-repo>',
];
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// Data folder/files
const dataDir       = path.join(__dirname, 'data');
const journeysFile  = path.join(dataDir, 'journeys.json');
const searchesFile  = path.join(dataDir, 'searches.json');

if (!fs.existsSync(dataDir))       fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(journeysFile))  fs.writeFileSync(journeysFile, '[]', 'utf8');
if (!fs.existsSync(searchesFile))  fs.writeFileSync(searchesFile, '[]', 'utf8');

function appendJSON(filePath, obj) {
  const arr = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  arr.push(obj);
  fs.writeFileSync(filePath, JSON.stringify(arr, null, 2), 'utf8');
}

// ---------- Optional: serve your static site from the backend ----------
const repoRoot = path.join(__dirname, '..', '..');            // project root
app.use('/css', express.static(path.join(repoRoot, 'css')));
app.use('/images', express.static(path.join(repoRoot, 'images')));
app.use('/mapbox-app/frontend', express.static(path.join(repoRoot, 'mapbox-app', 'frontend')));

// Visit http://localhost:4000/ to see welcome.html (optional)
app.get('/', (_req, res) => {
  const welcome = path.join(repoRoot, 'welcome.html');
  if (fs.existsSync(welcome)) return res.sendFile(welcome);
  res.type('text').send('Backend running. Front-end not served here.');
});

// ---------- Health / Token ----------
app.get('/health', (_req, res) => res.json({ ok: true }));

// Return your public Mapbox token (safe to expose client-side)
app.get('/token', (_req, res) => {
  res.json({ token: process.env.MAPBOX_PUBLIC_TOKEN || '' });
});

// ---------- Mapbox Directions proxy ----------
app.get('/route', async (req, res) => {
  try {
    const { start, end, profile = 'driving' } = req.query; // "lng,lat"
    if (!start || !end) return res.status(400).json({ error: 'start and end are required as "lng,lat"' });

    const token = process.env.MAPBOX_DIRECTIONS_TOKEN || process.env.MAPBOX_PUBLIC_TOKEN;
    const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${start};${end}?geometries=geojson&overview=full&alternatives=false&steps=false&access_token=${token}`;

    const resp  = await fetchFn(url);
    const data  = await resp.json();
    const route = data?.routes?.[0];
    if (!route) return res.status(502).json({ error: 'no route' });

    res.json({ route: route.geometry, distance_m: route.distance, duration_s: route.duration });
  } catch (err) {
    console.error('Route error:', err);
    res.status(500).json({ error: 'route failed' });
  }
});

// ---------- Journeys (save start/end + coords) ----------
app.post('/journeys', (req, res) => {
  const { start, end, latitude, longitude, date, timestamp } = req.body || {};
  if (
    typeof start !== 'string' || typeof end !== 'string' ||
    !Array.isArray(latitude) || latitude.length !== 2 ||
    !Array.isArray(longitude) || longitude.length !== 2 ||
    typeof latitude[0] !== 'number' || typeof latitude[1] !== 'number' ||
    typeof longitude[0] !== 'number' || typeof longitude[1] !== 'number'
  ) {
    return res.status(400).json({ error: 'Expected {start, end, latitude[2], longitude[2], date?}' });
  }

  appendJSON(journeysFile, {
    start, end, latitude, longitude,
    date: date || null,
    timestamp: timestamp || new Date().toISOString()
  });
  res.json({ ok: true });
});

app.get('/journeys', (_req, res) => res.sendFile(journeysFile));

// ---------- Overpass (OSM) helpers for hikes/trails ----------
async function overpass(query) {
  const url = 'https://overpass-api.de/api/interpreter';
  const resp = await fetchFn(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'horuscast-hikes/1.0'
    },
    body: 'data=' + encodeURIComponent(query)
  });
  return resp.json();
}

function centroid(coords) {
  let x = 0, y = 0;
  for (const [lng, lat] of coords) { x += lng; y += lat; }
  return [x / coords.length, y / coords.length];
}

// List hiking “spots” (named paths or hiking relations) around a lat/lng
app.get('/hikes', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radius = parseInt(req.query.radius || '12000', 10); // meters
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: 'lat and lng required' });
    }

    // Focus on actual hiking routes + named footways/paths
    const q = `
      [out:json][timeout:30];
      (
        relation["route"="hiking"](around:${radius},${lat},${lng});
        way["route"="hiking"](around:${radius},${lat},${lng});
        way["highway"~"path|footway"]["name"](around:${radius},${lat},${lng});
      );
      out geom tags;
    `;

    const data = await overpass(q);
    const spots = [];
    const seen = new Set();

    for (const el of data.elements || []) {
      let lines = [];
      if (el.type === 'way' && el.geometry?.length >= 2) {
        lines.push(el.geometry.map(p => [p.lon, p.lat]));
      } else if (el.type === 'relation' && el.members) {
        for (const m of el.members) {
          if (m.type === 'way' && m.geometry?.length >= 2) {
            lines.push(m.geometry.map(p => [p.lon, p.lat]));
          }
        }
      } else continue;

      const id = `${el.type}/${el.id}`;
      if (seen.has(id)) continue;
      seen.add(id);

      const name = (el.tags && (el.tags.name || el.tags.ref || el.tags.route)) || `Trail ${id}`;
      const c = centroid(lines[0]);
      spots.push({ id, name, center: { lng: c[0], lat: c[1] }, kind: el.type });

      if (spots.length >= 60) break; // reasonable cap
    }

    res.json({ spots });
  } catch (e) {
    console.error('Hikes error:', e);
    res.status(500).json({ error: 'hikes failed' });
  }
});

// Get the full geometry for a given trail (way/123 or relation/456)
app.get('/trail', async (req, res) => {
  try {
    const id = String(req.query.id || '');
    const [kind, raw] = id.split('/');
    const nid = parseInt(raw, 10);
    if (!kind || !Number.isFinite(nid)) {
      return res.status(400).json({ error: 'id must be way/123 or relation/456' });
    }

    const q =
      kind === 'way'
        ? `[out:json][timeout:25]; way(${nid}); out geom tags;`
        : kind === 'relation'
        ? `[out:json][timeout:25]; relation(${nid}); out geom tags;`
        : null;

    if (!q) return res.status(400).json({ error: 'kind must be way or relation' });

    const data = await overpass(q);
    const el = data.elements?.[0];
    if (!el) return res.status(404).json({ error: 'not found' });

    const name = (el.tags && (el.tags.name || el.tags.ref || el.tags.route)) || `Trail ${el.type}/${el.id}`;

    // Build GeoJSON
    let geometry;
    if (el.type === 'way') {
      const coords = el.geometry.map(p => [p.lon, p.lat]);
      geometry = { type: 'LineString', coordinates: coords };
    } else if (el.type === 'relation') {
      const lines = [];
      for (const m of el.members || []) {
        if (m.type === 'way' && m.geometry?.length >= 2) {
          lines.push(m.geometry.map(p => [p.lon, p.lat]));
        }
      }
      if (!lines.length) return res.status(404).json({ error: 'no geometry' });
      geometry = lines.length === 1
        ? { type: 'LineString', coordinates: lines[0] }
        : { type: 'MultiLineString', coordinates: lines };
    }

    // Start/end for convenience
    let start, end;
    if (geometry.type === 'LineString') {
      const coords = geometry.coordinates;
      start = coords[0];
      end   = coords[coords.length - 1];
    } else {
      const first = geometry.coordinates[0];
      const last  = geometry.coordinates[geometry.coordinates.length - 1];
      start = first[0];
      end   = last[last.length - 1];
    }

    res.json({
      name,
      geometry,
      start: { lng: start[0], lat: start[1] },
      end:   { lng: end[0],   lat: end[1] }
    });
  } catch (e) {
    console.error('Trail error:', e);
    res.status(500).json({ error: 'trail failed' });
  }
});

// ---------- NASA POWER daily point proxy ----------
/*
 * GET /nasa?lat=..&lng=..&date=YYYY-MM-DD
 * Returns: { date, table: [{label, value, unit}], raw }
 */

app.get('/nasa', async (req, res) => {
  try {
    const startDate = String(req.query.start || '').slice(0, 10); // YYYY-MM-DD
    const endDate = String(req.query.end || '').slice(0, 10); // YYYY-MM-DD
    const lat  = parseFloat(req.query.lat);
    const lng  = parseFloat(req.query.lng);

    // DEBUG: Check each condition
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || 
        !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || 
        !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return res.status(400).json({ error: 'lat,lng,start=YYYY-MM-DD,end=YYYY-MM-DD required' });
    }

    const startyyyymmdd = startDate.replaceAll('-', '');
    const endyyyymmdd = endDate.replaceAll('-', '');
    console.log(`Requesting NASA data for start: ${startDate}, end: ${endDate}, lat: ${lat}, lng: ${lng}`);
    console.log(`Formatted dates for API: ${startyyyymmdd} to ${endyyyymmdd}`);
    // Parameters chosen to match your UI (adjust as you like)
    const params = [
      'T2M', 'T2M_MAX', 'T2M_MIN',        // temp
      'PRECTOTCORR',                       // precipitation
      'RH2M', 'QV2M',                     // relative humidity
      'WS10M',                             // wind speed
      'ALLSKY_SFC_SW_DWN', 'ALLSKY_SFC_LW_DWN'  // solar/longwave
      
    ].join('%2C');

    const url = `https://power.larc.nasa.gov/api/projection/daily/point?&start=${startyyyymmdd}&end=${endyyyymmdd}&latitude=${lat}&longitude=${lng}&community=ag&parameters=${params}&format=JSON&user=T123&header=true&time-standard=utc&model=ensemble&scenario=ssp126`;

    console.log(`NASA API URL: ${url}`);

    const r   = await fetchFn(url, { headers: { 'User-Agent': 'horuscast-nasa/1.0' } });
    const j   = await r.json();
    const d = (j?.properties?.parameter) || {};

    // Get all available dates from the first parameter
    const firstParam = Object.keys(d)[0];
    const availableDates = d[firstParam] ? Object.keys(d[firstParam]) : [];

    console.log('Available dates:', availableDates);

    // Create table header
    const table = [];
    table.push({
      label: 'Parameter',
      values: availableDates.map(date => `${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}`),
      unit: 'Unit'
    });

    // Add data rows for each parameter
    const parameters = [
      { key: 'T2M', label: 'Temperature' },
      { key: 'T2M_MAX', label: 'Max Temperature' },
      { key: 'T2M_MIN', label: 'Min Temperature' },
      { key: 'PRECTOTCORR', label: 'Precipitation' },
      { key: 'QV2M', label: 'Specific Humidity' },
      { key: 'RH2M', label: 'Relative Humidity' },
      { key: 'WS10M', label: 'Wind Speed' },
      { key: 'ALLSKY_SFC_SW_DWN', label: 'Shortwave Irradiance' },
      { key: 'ALLSKY_SFC_LW_DWN', label: 'Longwave Irradiance' }
    ];

    parameters.forEach(param => {
      const values = availableDates.map(date => d[param.key]?.[date]);
      table.push({
        label: param.label,
        values: values,
        unit: getUnit(param.key)
      });
    });

    function getUnit(paramKey) {
      const units = {
        'T2M': '°C',
        'T2M_MAX': '°C', 
        'T2M_MIN': '°C',
        'PRECTOTCORR': 'mm',
        'QV2M': 'g/kg',
        'RH2M': '%',
        'WS10M': 'm/s',
        'ALLSKY_SFC_SW_DWN': 'W/m²',
        'ALLSKY_SFC_LW_DWN': 'W/m²'
      };
      return units[paramKey] || '';
    }

    res.json({ 
      startDate, 
      endDate,
      table, 
      raw: j 
    });
  } catch (e) {
    console.error('NASA error:', e);
    console.log(`NASA API URL: ${url}`);
    res.status(500).json({ error: 'nasa failed' });
  }
});

// ---------- Start server ----------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend on http://localhost:${PORT}`);
});
