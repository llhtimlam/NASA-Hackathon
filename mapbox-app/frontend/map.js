/* Trails + NASA weather: search area, show spots, click draws trail and opens bottom sheet */

(async () => {
  // --------- tiny utils ----------
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);
  const todayISO = () => new Date().toISOString().slice(0,10);
  const toast = (msg) => { const t = $('#toast'); t.textContent = msg; t.hidden = false; setTimeout(()=> t.hidden = true, 2000); };

  // --------- date control ----------
  const startDateInput = $('#start-date');
  startDateInput.value = todayISO();
  let SELECTED_START_DATE = startDateInput.value;
  startDateInput.addEventListener('change', () => { SELECTED_START_DATE = startDateInput.value || todayISO(); });

  const endDateInput = $('#end-date');
  endDateInput.value = todayISO();
  let SELECTED_END_DATE = endDateInput.value;
  endDateInput.addEventListener('change', () => { SELECTED_END_DATE = endDateInput.value || todayISO(); });
  
  // --------- bottom sheet ----------
  const sheetEl = $('#sheet');
  const sheetBody = $('#sheet-body');
  const sheetTitle = $('#sheet-title');
  const sheetSub = $('#sheet-sub');
  const scrim = $('#sheet-scrim');
  $('#sheet-close').addEventListener('click', closeSheet);
  scrim.addEventListener('click', closeSheet);

  function openSheet(){ sheetEl.classList.add('sheet--open'); scrim.classList.add('sheet--open'); sheetEl.setAttribute('aria-hidden','false'); }
  function closeSheet(){ sheetEl.classList.remove('sheet--open'); scrim.classList.remove('sheet--open'); sheetEl.setAttribute('aria-hidden','true'); }

  function renderNasaTable(rows){
    console.log('renderNasaTable called with:', rows);
    
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return '<p>No data available</p>';
    }

    const firstRow = rows[0];
    
    // Check if this is the grouped format
    if (firstRow.type === 'header') {
      console.log('Rendering grouped table format');
      return renderGroupedTable(rows);
    }
    // Check if this is multi-date format
    else if (firstRow.values && Array.isArray(firstRow.values) && firstRow.values.length > 0) {
      console.log('Rendering multi-date table format');
      return renderMultiDateTable(rows);
    } else {
      console.log('Rendering single-value table format');
      return renderSingleValueTable(rows);
    }
  }

  // Unified group behavior system
  const GroupBehavior = {
    handleGroupState(groupElement, isExpanded) {
      const behaviorAttr = groupElement.getAttribute('data-behavior');
      const behavior = behaviorAttr ? JSON.parse(behaviorAttr) : { collapsedView: 'FIRST_PARAM' };
      const cells = groupElement.querySelectorAll('td:not(:first-child):not(:last-child)');
      
      console.log('Group state:', groupElement.querySelector('strong')?.textContent, 
                  'expanded:', isExpanded, 'behavior:', behavior.collapsedView);
      
      // For SUMMARY behavior (Radiation group) - just style the AI summary
      if (behavior.collapsedView === 'SUMMARY') {
        if (!isExpanded) {
          // Collapsed: Style the AI summary
          cells.forEach(cell => {
            cell.style.fontStyle = 'italic';
            cell.style.color = '#7e57c2';
            cell.style.fontWeight = '600';
          });
        } else {
          // Expanded: Remove special styling (show actual values if any)
          cells.forEach(cell => {
            cell.style.fontStyle = 'normal';
            cell.style.color = '';
            cell.style.fontWeight = 'normal';
          });
        }
      }
    }
  };

  // Simplified table rendering - ALL groups treated the same
  function renderGroupedTable(rows) {
    let html = '<div class="table-container"><table class="wx-table collapsible-table"><thead><tr>';
    
    const firstRow = rows[0];
    html += `<th>${firstRow.label || 'Parameter'}</th>`;
    firstRow.values.forEach(date => html += `<th>${date}</th>`);
    html += `<th>${firstRow.unit || 'Unit'}</th></tr></thead><tbody>`;
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      if (row.type === 'group') {
        const groupId = row.groupId || `group-${row.groupIndex || i}`;
        const behavior = row.behavior || { collapsedView: 'FIRST_PARAM' };
        
        html += `<tr class="param-group collapsed" data-group-id="${groupId}" data-behavior='${JSON.stringify(behavior)}'>`;
        html += `<td class="group-header">`;
        html += `<span class="expand-icon">▶</span>`;
        html += `<strong>${row.label}</strong>`;
        html += `</td>`;
        
        // ALWAYS render the actual shortwave values
        // GroupBehavior will handle showing AI summary when collapsed
        if (row.values && Array.isArray(row.values)) {
          row.values.forEach(value => html += `<td>${value}</td>`);
        } else {
          firstRow.values.forEach(() => html += '<td>—</td>');
        }
        
        html += `<td style="color:#667085">${row.unit || ''}</td>`;
        html += '</tr>';
        
      } else if (row.type === 'subparam') {
        const groupId = row.groupId || `group-${row.groupIndex || findParentGroupIndex(rows, i)}`;
        html += `<tr class="subparam" data-group-id="${groupId}" style="display: none;">`;
        html += `<td class="subparam-label">${row.label}</td>`;
        
        if (row.values && Array.isArray(row.values)) {
          row.values.forEach(value => {
            const displayValue = value !== null && value !== undefined ? 
              (typeof value === 'number' ? value.toFixed(2) : value) : '—';
            html += `<td>${displayValue}</td>`;
          });
        } else {
          firstRow.values.forEach(() => html += '<td>—</td>');
        }
        
        html += `<td style="color:#667085">${row.unit || ''}</td>`;
        html += '</tr>';
      }
    }
    
    html += '</tbody></table></div>';
    return html;
  }

  // Helper function to find parent group
  function findParentGroupIndex(rows, currentIndex) {
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (rows[i].type === 'group') {
        return rows[i].groupIndex;
      }
    }
    return -1;
  }
  function findParentGroup(rows, currentIndex) {
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (rows[i].type === 'group') {
        return rows[i];
      }
    }
    return null;
  }

  function setupCollapsibleTables() {
    console.log('Setting up collapsible tables...');
    
    // Initialize ALL groups
    $$('.param-group').forEach(group => {
      const groupId = group.getAttribute('data-group-id');
      
      // Ensure collapsed state
      group.classList.add('collapsed');
      group.classList.remove('expanded');
      
      const icon = group.querySelector('.expand-icon');
      if (icon) icon.textContent = '▶';
      
      // Hide all subparams
      const subparams = $$(`.subparam[data-group-id="${groupId}"]`);
      subparams.forEach(subparam => {
        subparam.style.display = 'none';
      });
      
      // Apply initial collapsed behavior
      GroupBehavior.handleGroupState(group, false);
    });
    
    // Click event works on entire row
    document.addEventListener('click', function(e) {
      const groupRow = e.target.closest('.param-group');
      
      if (groupRow) {
        const groupId = groupRow.getAttribute('data-group-id');
        const isCurrentlyExpanded = groupRow.classList.contains('expanded');
        
        console.log('Group clicked:', groupId, 'currently expanded:', isCurrentlyExpanded);
        
        // Prevent multiple rapid clicks
        if (groupRow.getAttribute('data-animating') === 'true') return;
        groupRow.setAttribute('data-animating', 'true');
        
        if (isCurrentlyExpanded) {
          collapseGroup(groupRow, groupId);
        } else {
          expandGroup(groupRow, groupId);
        }
        
        // Reset animation lock
        setTimeout(() => {
          groupRow.removeAttribute('data-animating');
        }, 300);
      }
    });
    
    console.log('Collapsible tables setup complete');
  }

  // Simple collapse/expand functions
  function collapseGroup(groupRow, groupId) {
    console.log('Collapsing group:', groupId);
    groupRow.classList.remove('expanded');
    groupRow.classList.add('collapsed');
    groupRow.querySelector('.expand-icon').textContent = '▶';
    
    // Hide subparams
    const subparams = $$(`.subparam[data-group-id="${groupId}"]`);
    subparams.forEach(subparam => {
      subparam.style.display = 'none';
    });
    
    // Apply collapsed behavior
    GroupBehavior.handleGroupState(groupRow, false);
  }

  function expandGroup(groupRow, groupId) {
    console.log('Expanding group:', groupId);
    groupRow.classList.remove('collapsed');
    groupRow.classList.add('expanded');
    groupRow.querySelector('.expand-icon').textContent = '▼';
    
    // Show subparams
    const subparams = $$(`.subparam[data-group-id="${groupId}"]`);
    subparams.forEach(subparam => {
      subparam.style.display = 'table-row';
    });
    
    // Apply expanded behavior
    GroupBehavior.handleGroupState(groupRow, true);
  }

  // Simple collapse/expand functions
  function collapseGroup(groupRow, groupId) {
    console.log('Collapsing group:', groupId);
    groupRow.classList.remove('expanded');
    groupRow.classList.add('collapsed');
    groupRow.querySelector('.expand-icon').textContent = '▶';
    
    // Hide subparams
    const subparams = $$(`.subparam[data-group-id="${groupId}"]`);
    subparams.forEach(subparam => {
      subparam.style.display = 'none';
    });
    
    // Apply collapsed behavior
    GroupBehavior.handleGroupState(groupRow, false);
  }

  function expandGroup(groupRow, groupId) {
    console.log('Expanding group:', groupId);
    groupRow.classList.remove('collapsed');
    groupRow.classList.add('expanded');
    groupRow.querySelector('.expand-icon').textContent = '▼';
    
    // Show subparams
    const subparams = $$(`.subparam[data-group-id="${groupId}"]`);
    subparams.forEach(subparam => {
      subparam.style.display = 'table-row';
    });
    
    // Apply expanded behavior
    GroupBehavior.handleGroupState(groupRow, true);
  }

  // --------- script/CSS fallbacks for Geocoder ----------
  function loadScriptFromAny(urls) {
    return new Promise((resolve, reject) => {
      let i = 0;
      const tryNext = () => {
        if (i >= urls.length) return reject(new Error('All script sources failed'));
        const s = document.createElement('script');
        s.src = urls[i++]; s.async = false;
        s.onload = () => resolve();
        s.onerror = () => tryNext();
        document.head.appendChild(s);
      };
      tryNext();
    });
  }
  function loadCss(href) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l); }

  // --------- Mapbox GL ensure ----------
  if (!window.mapboxgl) {
    await loadScriptFromAny(['https://api.mapbox.com/mapbox-gl-js/v3.6.0/mapbox-gl.js']);
  }
  if (!window.mapboxgl) { console.error('Mapbox GL failed'); return; }

  // --------- config/token ----------
  const BACKEND_URL =
    window.BACKEND_URL ||
    (location.hostname.includes('github.io') ? 'https://YOUR-BACKEND.example.com' : 'http://localhost:4000');

  let MAPBOX_TOKEN = '';
  try {
    const tok = await (await fetch(`${BACKEND_URL}/token`)).json();
    MAPBOX_TOKEN = tok.token || '';
  } catch {}
  if (!MAPBOX_TOKEN) {
    MAPBOX_TOKEN = 'pk.eyJ1Ijoic3VzaHlhbTA1IiwiYSI6ImNtZ2Q0d2lkeDBldmMybW83OW1kZGs3bm4ifQ.2DBdhuCVTFkhtk72Lzp6rQ';
  }
  mapboxgl.accessToken = MAPBOX_TOKEN;

  // --------- build map ----------
  const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/outdoors-v12',
    center: [-79.3832, 43.6532], zoom: 11
  });
  
  map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
  map.on('error', e => console.error('[mapbox]', e?.error || e));
  await new Promise(res => map.once('load', res));

  // --------- Geocoder (with fallback input) ----------
  const GEOCODER_JS = [
    'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v5.0.1/mapbox-gl-geocoder.min.js',
    'https://cdn.jsdelivr.net/npm/@mapbox/mapbox-gl-geocoder@5.0.1/dist/mapbox-gl-geocoder.min.js',
    'https://unpkg.com/@mapbox/mapbox-gl-geocoder@5.0.1/dist/mapbox-gl-geocoder.min.js'
  ];
  const GEOCODER_CSS = 'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v5.0.1/mapbox-gl-geocoder.css';
  let geocoderLoaded = true;
  if (!window.MapboxGeocoder) {
    loadCss(GEOCODER_CSS);
    await loadScriptFromAny(GEOCODER_JS).catch(()=> geocoderLoaded = false);
  }
  const geocoderHost = $('#geocoder');

  // store current markers so we can clear when searching again
  let spotMarkers = [];
  function clearMarkers(){ spotMarkers.forEach(m => m.remove()); spotMarkers = []; }

  async function fetchHikes(lat, lng, radius=12000){
    const resp = await fetch(`${BACKEND_URL}/hikes?lat=${lat}&lng=${lng}&radius=${radius}`);
    const data = await resp.json();
    clearMarkers();
    const spots = data.spots || [];
    if (!spots.length) { toast('No hikes found here'); return; }
    for (const s of spots) {
      const el = document.createElement('div');
      el.style.width = el.style.height = '14px';
      el.style.borderRadius = '50%';
      el.style.background = '#22c55e';   // green dot
      el.style.boxShadow = '0 0 0 2px #fff';
      const marker = new mapboxgl.Marker(el).setLngLat([s.center.lng, s.center.lat]).addTo(map);
      marker.getElement().title = s.name;
      marker.getElement().style.cursor = 'pointer';
      marker.getElement().addEventListener('click', () => showTrail(s.id, s.name));
      spotMarkers.push(marker);
    }
    toast(`${spots.length} hike spots found`);
  }

  // draw selected trail
  const TRAIL_SRC = 'trail-src';
  const TRAIL_LAYER = 'trail-line';
  function setTrailGeoJSON(geojson){
    if (!map.getSource(TRAIL_SRC)) {
      map.addSource(TRAIL_SRC, { type: 'geojson', data: geojson });
      map.addLayer({
        id: TRAIL_LAYER, type: 'line', source: TRAIL_SRC,
        paint: { 'line-color':'#0ea5e9', 'line-width':4 }
      });
    } else {
      map.getSource(TRAIL_SRC).setData(geojson);
    }
  }
  function boundsFromGeom(geometry){
    const b = new mapboxgl.LngLatBounds();
    const pushCoord = (c) => b.extend(c);
    if (geometry.type === 'LineString') geometry.coordinates.forEach(pushCoord);
    if (geometry.type === 'MultiLineString') geometry.coordinates.flat().forEach(pushCoord);
    return b;
  }

  async function showTrail(id, name){
    try{
      const t = await (await fetch(`${BACKEND_URL}/trail?id=${encodeURIComponent(id)}`)).json();
      const geo = { type:'Feature', geometry: t.geometry, properties: { name: t.name } };
      setTrailGeoJSON(geo);
      const b = boundsFromGeom(t.geometry);
      map.fitBounds(b, { padding: 60, duration: 700 });

      // NASA weather for the trail's center + date
      const center = b.getCenter();
      const startDate = SELECTED_START_DATE || todayISO();
      const endDate = SELECTED_END_DATE || todayISO();

      const wx = await (await fetch(`${BACKEND_URL}/nasa?start=${startDate}&end=${endDate}&lat=${center.lat}&lng=${center.lng}`)).json();
      
      sheetTitle.textContent = t.name || name || 'Trail';
      sheetSub.textContent   = `${wx.startDate} to ${wx.endDate} • ${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`;
      sheetBody.innerHTML    = renderNasaTable(wx.table || []);
      
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        try {
          setupCollapsibleTables();
        } catch (e) {
          console.warn('Collapsible setup failed:', e);
        }
      }, 100);
      
      openSheet();
    }catch(err){
      console.warn('trail failed', err);
      toast('Could not load trail');
    }
  }

  function bboxCenter(bbox){   // [minX,minY,maxX,maxY] -> [lng,lat]
    return [(bbox[0]+bbox[2])/2, (bbox[1]+bbox[3])/2];
  }

  if (geocoderLoaded && window.MapboxGeocoder) {
    const gc = new MapboxGeocoder({
      accessToken: MAPBOX_TOKEN, mapboxgl, marker: false, flyTo: false,
      placeholder: 'Search area',
      types: 'place,locality,region,district,neighborhood,postcode',
      language: 'en'
    });
    gc.addTo(geocoderHost);

    gc.on('result', async (e) => {
      const r = e.result;
      let center, radius = 12000;
      if (r.bbox) {
        const b = new mapboxgl.LngLatBounds([r.bbox[0], r.bbox[1]], [r.bbox[2], r.bbox[3]]);
        map.fitBounds(b, { padding: { top: 140, bottom: 40, left: 40, right: 40 }, duration: 700 });
        const c = b.getCenter(); center = [c.lng, c.lat];
        // derive a radius roughly from bbox size
        radius = Math.min(25000, Math.max(6000, Math.hypot(r.bbox[2]-r.bbox[0], r.bbox[3]-r.bbox[1]) * 70000));
      } else if (r.center) {
        center = r.center;
        map.easeTo({ center, zoom: 12, duration: 500 });
      }
      if (center) await fetchHikes(center[1], center[0], radius);
    });
  } else {
    // Fallback basic input
    const input = document.createElement('input');
    input.className = 'fallback-input';
    input.placeholder = 'Search area';
    geocoderHost.appendChild(input);

    async function doSearch(q){
      if (!q?.trim()) return;
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${mapboxgl.accessToken}&types=place,locality,region,district,neighborhood,postcode&limit=1`;
      const j = await (await fetch(url)).json();
      const f = j.features?.[0];
      if (!f) return;
      let center, radius = 12000;
      if (f.bbox) {
        const b = new mapboxgl.LngLatBounds([f.bbox[0], f.bbox[1]], [f.bbox[2], f.bbox[3]]);
        map.fitBounds(b, { padding: { top: 140, bottom: 40, left: 40, right: 40 }, duration: 700 });
        const c = b.getCenter(); center = [c.lng, c.lat];
      } else if (f.center) {
        center = f.center; map.easeTo({ center, zoom: 12, duration: 500 });
      }
      if (center) await fetchHikes(center[1], center[0], radius);
    }
    input.addEventListener('keydown', (ev)=> { if (ev.key === 'Enter') doSearch(input.value); });
  }
})();