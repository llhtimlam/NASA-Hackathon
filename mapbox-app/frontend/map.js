/* Trails + NASA weather: search area, show spots, click draws trail and opens bottom sheet */

(async () => {
  // --------- tiny utils ----------
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);
  const todayISO = () => new Date().toISOString().slice(0,10);
  const toast = (msg) => { const t = $('#toast'); t.textContent = msg; t.hidden = false; setTimeout(()=> t.hidden = true, 2000); };

  // --------- Activity Selection ----------
  const activityModal = $('#activity-modal');
  const activitySelector = $('#activity-selector');
  const currentActivityIcon = $('#current-activity');
  const searchToggle = $('#search-toggle');
  const geocoderContainer = $('#geocoder');
  let currentActivity = 'hiking';
  let searchExpanded = true;

  // Activity icons mapping - UPDATED WITH BETTER ICONS
  const activityIcons = {
    hiking: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="m3 12 5.5 5.5 3-3 8.5-8.5"></path>
      <path d="M14 7l3 3"></path>
      <path d="M5 21h14"></path>
    </svg>`,
    stargazing: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>`,
    water: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M2 20c.5.5 1 1 2 1s1.5-.5 2-1c.5-.5 1-1 2-1s1.5.5 2 1c.5.5 1 1 2 1s1.5-.5 2-1c.5-.5 1-1 2-1s1.5.5 2 1c.5.5 1 1 2 1s1.5-.5 2-1"></path>
      <path d="M2 16c.5.5 1 1 2 1s1.5-.5 2-1c.5-.5 1-1 2-1s1.5.5 2 1c.5.5 1 1 2 1s1.5-.5 2-1c.5-.5 1-1 2-1s1.5.5 2 1c.5.5 1 1 2 1s1.5-.5 2-1"></path>
    </svg>`,
    winter: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="12" y1="2" x2="12" y2="22"></line>
      <line x1="2" y1="12" x2="22" y2="12"></line>
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
      <line x1="19.07" y1="4.93" x2="4.93" y2="19.07"></line>
      <line x1="4.93" y1="19.07" x2="19.07" y2="4.93"></line>
      <line x1="19.07" y1="19.07" x2="4.93" y2="4.93"></line>
    </svg>`
  };

  // Only add event listeners if elements exist
  if (activitySelector) {
    activitySelector.addEventListener('click', () => {
      if (activityModal) {
        activityModal.setAttribute('aria-hidden', 'false');
      }
    });
  }

  if ($('#activity-modal-close')) {
    $('#activity-modal-close').addEventListener('click', () => {
      if (activityModal) {
        activityModal.setAttribute('aria-hidden', 'true');
      }
    });
  }

  if (activityModal) {
    activityModal.addEventListener('click', (e) => {
      if (e.target === activityModal) {
        activityModal.setAttribute('aria-hidden', 'true');
      }
    });
  }

  // Handle activity selection
  const activityOptions = $$('.activity-option');
  if (activityOptions.length > 0) {
    activityOptions.forEach(option => {
      option.addEventListener('click', () => {
        const activity = option.getAttribute('data-activity');
        const iconType = option.getAttribute('data-icon');
        
        currentActivity = activity;
        if (currentActivityIcon) {
          currentActivityIcon.innerHTML = activityIcons[iconType];
        }
        
        // Update the UI to show selected activity
        toast(`Activity set to: ${option.querySelector('.activity-option__label').textContent}`);
        
        // Close modal
        if (activityModal) {
          activityModal.setAttribute('aria-hidden', 'true');
        }
        
        // Here you can add logic to change the map behavior based on activity
        console.log(`Activity changed to: ${activity}`);
      });
    });
  }

  // Search toggle functionality - only if element exists
  if (searchToggle) {
    searchToggle.addEventListener('click', () => {
      searchExpanded = !searchExpanded;
      
      if (searchExpanded) {
        if (geocoderContainer) {
          geocoderContainer.classList.remove('collapsed');
        }
        // Focus the search input if geocoder is loaded
        setTimeout(() => {
          if (geocoderContainer) {
            const searchInput = geocoderContainer.querySelector('input');
            if (searchInput) {
              searchInput.focus();
              // Force mobile keyboard to open
              searchInput.setAttribute('autofocus', 'true');
            }
          }
        }, 100);
      } else {
        if (geocoderContainer) {
          geocoderContainer.classList.add('collapsed');
        }
      }
    });
  }

  // Add touch event support for mobile
  document.addEventListener('touchstart', function(e) {
    // Close search if clicking outside on mobile
    if (window.innerWidth < 768 && searchExpanded) {
      const isSearchClick = e.target.closest('.pill--search');
      if (!isSearchClick) {
        searchExpanded = false;
        if (geocoderContainer) {
          geocoderContainer.classList.add('collapsed');
        }
      }
    }
  });

  // Settings toggle (placeholder for future functionality)
  if ($('#settings-toggle')) {
    $('#settings-toggle').addEventListener('click', () => {
      toast('Settings coming soon!');
      // Add settings modal functionality here
    });
  }

  // Initialize search as expanded by default
  if (geocoderContainer) {
    geocoderContainer.classList.remove('collapsed');
  }

  // --------- date control ----------
  const startDateInput = $('#start-date');
  startDateInput.value = todayISO();
  let SELECTED_START_DATE = startDateInput.value;
  startDateInput.addEventListener('change', () => { SELECTED_START_DATE = startDateInput.value || todayISO(); });

  const endDateInput = $('#end-date');
  endDateInput.value = todayISO();
  let SELECTED_END_DATE = endDateInput.value;
  endDateInput.addEventListener('change', () => { SELECTED_END_DATE = endDateInput.value || todayISO(); });
  
  // Store the current trail info for reloading
  let currentTrailInfo = null;

  // Modified date change handlers
  function handleDateChange() {
    SELECTED_START_DATE = startDateInput.value || todayISO();
    SELECTED_END_DATE = endDateInput.value || todayISO();
    
    // If a trail is currently displayed, reload the weather data
    if (currentTrailInfo) {
      reloadWeatherForCurrentTrail();
    }
  }

  startDateInput.addEventListener('change', handleDateChange);
  endDateInput.addEventListener('change', handleDateChange);

  // Function to reload weather for the currently displayed trail
  async function reloadWeatherForCurrentTrail() {
    if (!currentTrailInfo) return;
    
    try {
      // Show loading state in the sheet
      showSheetLoading();
      
      const { id, name, center } = currentTrailInfo;
      
      // Fetch new weather data with updated dates
      const wx = await (await fetch(`${BACKEND_URL}/nasa?start=${SELECTED_START_DATE}&end=${SELECTED_END_DATE}&lat=${center.lat}&lng=${center.lng}`)).json();
      
      // Update sheet content
      if (sheetTitle) sheetTitle.textContent = name || 'Trail';
      if (sheetSub) sheetSub.textContent = `${wx.startDate} to ${wx.endDate} • ${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`;
      if (sheetBody) sheetBody.innerHTML = renderNasaTable(wx.table || []);
      
      // Show success message
      toast('Weather data updated');
      
      // Re-setup collapsible tables
      setTimeout(() => {
        try {
          setupCollapsibleTables();
        } catch (e) {
          console.warn('Collapsible setup failed:', e);
        }
      }, 100);
      
    } catch(err) {
      console.warn('Weather reload failed', err);
      toast('Failed to update weather data');
      
      // Show error in sheet
      if (sheetBody) {
        sheetBody.innerHTML = '<p style="text-align: center; color: #667085; padding: 40px;">Failed to update weather data</p>';
      }
    }
  }

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

  // --------- LOADING STATES ----------
  function showLoading(message = 'Loading...') {
    const loadingEl = document.createElement('div');
    loadingEl.className = 'loading-overlay';
    loadingEl.innerHTML = `
      <div class="loading">
        <div class="loading-spinner"></div>
        ${message}
      </div>
    `;
    loadingEl.id = 'current-loading';
    document.body.appendChild(loadingEl);
    return loadingEl;
  }

  function hideLoading() {
    const loadingEl = document.getElementById('current-loading');
    if (loadingEl) {
      loadingEl.remove();
    }
  }

  function showSheetLoading() {
    if (sheetBody) {
      sheetBody.innerHTML = `
        <div style="display: flex; justify-content: center; padding: 40px;">
          <div class="loading">
            <div class="loading-spinner"></div>
            Loading weather data...
          </div>
        </div>
      `;
    }
  }
  // --------- Hike Fetching and Display ----------
  // store current markers so we can clear when searching again
  let spotMarkers = [];
  function clearMarkers(){ spotMarkers.forEach(m => m.remove()); spotMarkers = []; }

  async function fetchHikes(lat, lng, radius=12000){
    const loading = showLoading('Finding hiking trails...');
  try {
    const resp = await fetch(`${BACKEND_URL}/hikes?lat=${lat}&lng=${lng}&radius=${radius}`);
    const data = await resp.json();
    clearMarkers();
    const spots = data.spots || [];
    if (!spots.length) { 
      toast('No hikes found here'); 
      return; 
    }
    for (const s of spots) {
      const el = document.createElement('div');
      el.style.width = el.style.height = '14px';
      el.style.borderRadius = '50%';
      el.style.background = '#22c55e';
      el.style.boxShadow = '0 0 0 2px #fff';
      const marker = new mapboxgl.Marker(el).setLngLat([s.center.lng, s.center.lat]).addTo(map);
      marker.getElement().title = s.name;
      marker.getElement().style.cursor = 'pointer';
      marker.getElement().addEventListener('click', () => showTrail(s.id, s.name));
      spotMarkers.push(marker);
    }
      toast(`${spots.length} hike spots found`);
    } catch (error) {
      console.error('Failed to fetch hikes:', error);
      toast('Failed to load hiking trails');
    } finally {
      hideLoading();
    }
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
    showSheetLoading();
    openSheet();
    
    try {
      // Load trail data
      const trailLoading = showLoading('Loading trail...');
      const t = await (await fetch(`${BACKEND_URL}/trail?id=${encodeURIComponent(id)}`)).json();
      hideLoading();
      
      const geo = { type:'Feature', geometry: t.geometry, properties: { name: t.name } };
      setTrailGeoJSON(geo);
      const b = boundsFromGeom(t.geometry);
      map.fitBounds(b, { padding: 60, duration: 700 });

      // NASA weather for the trail's center + date
      const center = b.getCenter();
      
      // Store current trail info for potential reloads
      currentTrailInfo = {
        id,
        name: t.name || name,
        center: center,
        geometry: t.geometry
      };

      // Add visual indicator to date inputs
      startDateInput.classList.add('date-input-active');
      endDateInput.classList.add('date-input-active');

      // And remove it when closing the sheet
      function closeSheet(){ 
        sheetEl.classList.remove('sheet--open'); 
        scrim.classList.remove('sheet--open'); 
        sheetEl.setAttribute('aria-hidden','true');
        currentTrailInfo = null;
        
        // Remove visual indicator
        startDateInput.classList.remove('date-input-active');
        endDateInput.classList.remove('date-input-active');
      }

      // Show weather loading
      showSheetLoading();
      
      const wx = await (await fetch(`${BACKEND_URL}/nasa?start=${SELECTED_START_DATE}&end=${SELECTED_END_DATE}&lat=${center.lat}&lng=${center.lng}`)).json();
      
      // Update sheet content
      sheetTitle.textContent = t.name || name || 'Trail';
      sheetSub.textContent = `${wx.startDate} to ${wx.endDate} • ${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`;
      sheetBody.innerHTML = renderNasaTable(wx.table || []);
      
      // Setup collapsible tables
      setTimeout(() => {
        try {
          setupCollapsibleTables();
        } catch (e) {
          console.warn('Collapsible setup failed:', e);
        }
      }, 100);
      
    } catch(err) {
      console.warn('trail failed', err);
      toast('Could not load trail');
      hideLoading();
      
      // Clear current trail info on error
      currentTrailInfo = null;
      
      // Show error in sheet
      if (sheetBody) {
        sheetBody.innerHTML = '<p style="text-align: center; color: #667085; padding: 40px;">Failed to load trail data</p>';
      }
    }
  }

  // Clear current trail info when sheet is closed
  function closeSheet(){ 
    sheetEl.classList.remove('sheet--open'); 
    scrim.classList.remove('sheet--open'); 
    sheetEl.setAttribute('aria-hidden','true');
    currentTrailInfo = null;
  }

  // Also clear when clicking on the scrim
  scrim.addEventListener('click', () => {
    closeSheet();
    currentTrailInfo = null;
  });

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