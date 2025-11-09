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
  const search = $('.search-icon')
  const geocoderContainer = $('#geocoder');
  let currentActivity = 'hiking';
  let searchExpanded = true;
  if (geocoderContainer) {
    geocoderContainer.classList.remove('collapsed');
  }
  
  // Activity icons mapping - UPDATED WITH BETTER ICONS
  const activityIcons = {
    hiking: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="m8 3 4 8 5-5 5 15H2L8 3z"></path>
    </svg>`,
    stargazing: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>`,
    water: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M2 20c.5.5 1 1 2 1s1.5-.5 2-1c.5-.5 1-1 2-1s1.5.5 2 1c.5.5 1 1 2 1s1.5-.5 2-1c.5-.5 1-1 2-1s1.5.5 2 1c.5.5 1 1 2 1s1.5-.5 2-1"></path>
    <path d="M2 16c.5.5 1 1 2 1s1.5-.5 2-1c.5-.5 1-1 2-1s1.5.5 2 1c.5.5 1 1 2 1s1.5-.5 2-1c.5-.5 1-1 2-1s1.5.5 2 1c.5.5 1 1 2 1s1.5-.5 2-1"></path>
    </svg>`,
    winter: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 2v20"></path>
    <path d="m4.93 4.93 14.14 14.14"></path>
    <path d="m19.07 4.93-14.14 14.14"></path>
    <path d="M8 4l2 2-2 2"></path>
    <path d="M16 4l-2 2 2 2"></path>
    <path d="M20 8l-2 2-2-2"></path>
    <path d="M20 16l-2-2 2-2"></path>
    <path d="M16 20l-2-2 2-2"></path>
    <path d="M8 20l2-2-2-2"></path>
    <path d="M4 16l2-2-2-2"></path>
    <path d="M4 8l2 2-2 2"></path>
    <path d="M2 12h20"></path>
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
        
        // Disable previous activity mode
        if (currentActivity === 'stargazing') {
          disableStargazingMode();
        } else if (currentActivity === 'hiking') {
          disableHikingMode();
        }
        
        currentActivity = activity;
        if (currentActivityIcon) {
          currentActivityIcon.innerHTML = activityIcons[iconType];
        }
        // Clear existing data
        clearMarkers();
        if (map.getLayer(TRAIL_LAYER)) {
          map.removeLayer(TRAIL_LAYER);
        }
        if (map.getSource(TRAIL_SRC)) {
          map.removeSource(TRAIL_SRC);
        }
        closeSheet();
        // Enable new activity mode
        if (activity === 'stargazing') {
          enableStargazingMode();
        } else if (activity === 'hiking') {
          enableHikingMode();
        } else if (activity === 'water' || activity === 'winter') {
          // Placeholder for future activity modes
          toast(`${option.querySelector('.activity-option__label').textContent} mode - feature coming soon!`);
          // Clear any existing markers for these modes
          clearMarkers();
        }
        // Close modal
        if (activityModal) {
          activityModal.setAttribute('aria-hidden', 'true');
        }
      });
    });
  }

  // Search Trail
  if (search) {
    search.addEventListener('click', () => {
      if (currentActivity === 'hiking') {
        // In hiking mode: Search for trails in current view
        const bounds = map.getBounds();
        const center = bounds.getCenter();
        const zoom = map.getZoom();
        
        // Calculate appropriate radius
        let radius;
        if (zoom >= 14) radius = 3000;
        else if (zoom >= 12) radius = 6000;
        else if (zoom >= 10) radius = 12000;
        else radius = 15000;
        fetchHikes(center.lat, center.lng, radius);
        toast('🔍 Searching for trails in this area...');
        // Update currentMapBounds to prevent immediate re-fetching
        currentMapBounds = {
          bounds: bounds,
          center: center,
          zoom: zoom
        };
      }
    });
  }

  // Settings toggle (placeholder for future functionality)
  if ($('#settings-toggle')) {
    $('#settings-toggle').addEventListener('click', () => {
      toast('Settings coming soon!');
      // Add settings modal functionality here
    });
  }

  function setupMobileOptimizations() {
    const isMobile = window.innerWidth <= 767;
    
    if (isMobile) {
      // Improve touch interactions
      document.addEventListener('touchstart', function() {}, { passive: true });
      
      // Prevent double-tap zoom on interactive elements
      const interactiveElements = document.querySelectorAll('.pill, .search-icon, .settings-icon, .activity-icon');
      interactiveElements.forEach(el => {
        el.style.touchAction = 'manipulation';
      });
    }
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
      return renderGroupedTable(rows);
    }
    // Check if this is multi-date format
    else if (firstRow.values && Array.isArray(firstRow.values) && firstRow.values.length > 0) {
      return renderMultiDateTable(rows);
    } else {
      return renderSingleValueTable(rows);
    }
  }

  // Unified group behavior system
  const GroupBehavior = {
    handleGroupState(groupElement, isExpanded) {
      const behaviorAttr = groupElement.getAttribute('data-behavior');
      const behavior = behaviorAttr ? JSON.parse(behaviorAttr) : { collapsedView: 'FIRST_PARAM' };
      const cells = groupElement.querySelectorAll('td:not(:first-child):not(:last-child)');
      
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
  }

  // Simple collapse/expand functions
  function collapseGroup(groupRow, groupId) {
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
    center: [138.6, -34.928], zoom: 12
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
    loadingEl.className = 'loading-corner';
    loadingEl.innerHTML = `
      <div class="loading-indicator">
        <div class="loading-spinner-small"></div>
        <span class="loading-text">${message}</span>
      </div>
    `;
    loadingEl.id = 'current-loading';
    document.body.appendChild(loadingEl);
    return loadingEl;
  }

  function hideLoading() {
    const loadingEl = document.getElementById('current-loading');
    if (loadingEl) {
      // Add fade out animation
      loadingEl.style.opacity = '0';
      loadingEl.style.transform = 'translateY(10px)';
      setTimeout(() => {
        loadingEl.remove();
      }, 300);
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
  let hikingMode = false;
  let currentMapBounds = null;
  let hikeFetchDebounce = null;
  let spotMarkers = [];
  // Improved hiking mode with better trail loading
  let isTrailSelected = false; // Track if a trail is currently selected
  
  map.isMoving = function() {
    return map._moving || map._easing;
  };
  
  function enableHikingMode() {
    hikingMode = true;
    isTrailSelected = false; // Reset when switching to hiking mode
    const canvas = map.getCanvas();
    canvas.classList.add('hiking-mode');
    canvas.classList.remove('stargazing-mode');

    // Clear elements
    disableStargazingMode();
    clearMarkers();
    // Fetch trails for current map view immediately
    setTimeout(() => {
      fetchTrailsForCurrentView();
    }, 300);
    
    // Listen to map movements to update trails
    map.on('dragend', handleMapMoveForHiking);
    map.on('moveend', handleMapMoveForHiking);
    map.on('zoomend', handleMapMoveForHiking);
    
    toast('🥾 Hiking mode: Trails will update automatically as you move the map');
  }

  function disableHikingMode() {
    hikingMode = false;
    const canvas = map.getCanvas();
    canvas.classList.remove('hiking-mode');
    canvas.style.cursor = '';
    
    // Remove event listeners
    map.off('dragend', handleMapMoveForHiking);
    map.off('moveend', handleMapMoveForHiking);
    map.off('zoomend', handleMapMoveForHiking);
    
  }

  function handleMapMoveForHiking() {
    // Don't fetch new trails if a trail is currently selected
    if (isTrailSelected || map.isMoving()) return;
    
    const currentZoom = map.getZoom();
    // Don't fetch trails if zoomed out too far
    if (currentZoom < 9) {
      clearMarkers();
      if (currentZoom > 6) { // Only show toast if reasonably zoomed in
        toast('Zoom in to see hiking trails');
      }
      return;
    }
    
    // Check if we've moved significantly enough to warrant a new search
    const bounds = map.getBounds();
    const center = bounds.getCenter(); // Get current center
    
    if (currentMapBounds) {
      // Check if center has moved significantly
      const centerMoved = 
        Math.abs(currentMapBounds.center.lng - center.lng) > 0.01 || 
        Math.abs(currentMapBounds.center.lat - center.lat) > 0.01;
      
      const zoomChanged = Math.abs(currentMapBounds.zoom - currentZoom) > 0.3;
      
      if (!centerMoved && !zoomChanged) return;
    }
    
    // Debounce to avoid too many API calls
    if (hikeFetchDebounce) {
      clearTimeout(hikeFetchDebounce);
    }
    
    hikeFetchDebounce = setTimeout(() => {
      fetchTrailsForCurrentView();
    }, 500);
  }

  function fetchTrailsForCurrentView() {
    if (!hikingMode || isTrailSelected) return;
    
    const bounds = map.getBounds();
    const center = bounds.getCenter();
    const zoom = map.getZoom();
    
    // Don't fetch trails if zoomed out too far (shows too many trails)
    if (zoom < 9) {
      clearMarkers();
      return;
    }
    
    // Validate center coordinates before proceeding
    if (!center || typeof center.lng !== 'number' || typeof center.lat !== 'number') {
      console.error('Invalid map center coordinates:', center);
      return;
    }
    
    // Calculate search radius based on current view size
    const boundsWidth = bounds.getNorthEast().lng - bounds.getSouthWest().lng;
    const boundsHeight = bounds.getNorthEast().lat - bounds.getSouthWest().lat;
    const viewSize = Math.max(boundsWidth, boundsHeight);

    const radiusInMeters = viewSize * 111000 * 0.7; // 70% of view width in meters
    const radius = Math.min(30000, Math.max(3000, radiusInMeters));
    
    // console.log('Auto-fetching trails at:', center, 'zoom:', zoom, 'radius:', radius);
    fetchHikes(center.lat, center.lng, radius);
    
    // Store current view state WITH center
    currentMapBounds = {
      bounds: bounds,
      center: center,
      zoom: zoom
    };
  }

  function clearMarkers(){ 
    spotMarkers.forEach(m => m.remove()); 
    spotMarkers = []; 
  }

  async function fetchHikes(lat, lng, radius=12000){
    // Only fetch hikes if in hiking mode
    if (currentActivity !== 'hiking') return;
    
    // Show loading only when zoomed in enough to see individual trails
    const shouldShowLoading = map.getZoom() > 11;
    const loading = shouldShowLoading ? showLoading('Finding trails...') : null;
  try {
    const resp = await fetch(`${BACKEND_URL}/hikes?lat=${lat}&lng=${lng}&radius=${radius}`);
    const data = await resp.json();
    clearMarkers();
    const spots = data.spots || [];
    if (!spots.length) { 
       // Only show toast if we're not in a very zoomed-out view
      if (shouldShowLoading && map.getZoom() > 10) {
        setTimeout(() => {
          toast('No trails found in this area');
        }, 300);
      }
      return; 
    }
    for (const s of spots) {
      const el = document.createElement('div');
      el.style.width = el.style.height = '14px';
      el.style.borderRadius = '50%';
      el.style.background = '#208a47ff';
      el.style.boxShadow = '0 0 0 2px #fff';
      const marker = new mapboxgl.Marker(el).setLngLat([s.center.lng, s.center.lat]).addTo(map);
      marker.getElement().title = s.name;
      marker.getElement().style.cursor = 'pointer';
      marker.getElement().addEventListener('click', () => showTrail(s.id, s.name));
      spotMarkers.push(marker);
    }
    // Only show success toast for significant results
    if (spots.length > 2 && shouldShowLoading) {
      toast(`Found ${spots.length} trails`);
    }
    } catch (error) {
      console.error('Failed to fetch hikes:', error);
      if (shouldShowLoading) {
        setTimeout(() => {
          toast('Failed to load trails');
        }, 300);
      }
    } finally {
      if (loading) {
        setTimeout(hideLoading, 400);
      }
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
    if (currentActivity !== 'hiking') return;
    isTrailSelected = true; // Mark that a trail is selected
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
      
      // Add hiking mode indicator
      const modeIndicator = `
        <div style="background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 18px;">🥾</span>
            <div>
              <h4 style="margin: 0 0 4px 0; font-size: 16px;">Hiking Mode</h4>
              <p style="margin: 0; font-size: 12px; opacity: 0.9;">Trail weather conditions and hiking recommendations</p>
            </div>
          </div>
        </div>
      `;
      
      sheetTitle.textContent = t.name || name || 'Trail';
      sheetSub.textContent = `${wx.startDate} to ${wx.endDate} • ${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`;
      sheetBody.innerHTML = modeIndicator + renderNasaTable(wx.table || []);
      
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
      isTrailSelected = false; // Reset on error
      currentTrailInfo = null; // Clear current trail info on error
      
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
    // Reset trail selection after a short delay
    setTimeout(() => {
      isTrailSelected = false;
      currentTrailInfo = null;
    }, 500); // Give user time to see the trail before clearing
    
    // Remove visual indicator
    startDateInput.classList.remove('date-input-active');
    endDateInput.classList.remove('date-input-active');
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
      center = b.getCenter(); // Keep as LngLat object {lng, lat}
      radius = Math.min(25000, Math.max(6000, Math.hypot(r.bbox[2]-r.bbox[0], r.bbox[3]-r.bbox[1]) * 70000));
    } else if (r.center) {
      // Convert array [lng, lat] to object {lng, lat}
      center = { lng: r.center[0], lat: r.center[1] };
      map.easeTo({ center: r.center, zoom: 12, duration: 500 });
    }
    
    // For hiking mode, search for trails in the new area
    if (center && currentActivity === 'hiking') {
      // Wait a bit for the map to finish moving, then search for trails
      setTimeout(() => {
        console.log('Searching trails after geocoder result');
        fetchHikes(center.lat, center.lng, radius);
      }, 800);
    } else if (center && currentActivity === 'stargazing') {
      toast(`Area searched - click on the map to get weather data`);
    }
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
  // Initialize hiking mode if it's the default
  // Add this at the end of your main function
  setTimeout(() => {
    if (currentActivity === 'hiking') {
      enableHikingMode();
    }
  }, 1000);
  // Stargazing mode variables
  let stargazingPin = null;
  let stargazingMode = false;

  function enableStargazingMode() {
    stargazingMode = true;
    const canvas = map.getCanvas();
    canvas.classList.add('stargazing-mode');
    // Clear other modes
    clearMarkers();
    if (map.getLayer(TRAIL_LAYER)) {
      map.removeLayer(TRAIL_LAYER);
    }
    if (map.getSource(TRAIL_SRC)) {
      map.removeSource(TRAIL_SRC);
    }
    
    // Add visual feedback layer for stargazing
    if (!map.getSource('stargazing-feedback')) {
      map.addSource('stargazing-feedback', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      });
      
      map.addLayer({
        id: 'stargazing-click-circle',
        type: 'circle',
        source: 'stargazing-feedback',
        paint: {
          'circle-radius': 8,
          'circle-color': '#7e57c2',
          'circle-opacity': 0.6,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });
    }
    
    // Add click event listener for the map
    map.on('click', handleMapClickForStargazing);
    toast('🎯 Stargazing mode: Orbital Cannon Target coordinates for weather analysis');
  }
  
  function disableStargazingMode() {
    stargazingMode = false;
    // Reset cursor
    const canvas = map.getCanvas();
    canvas.style.cursor = '';
    canvas.classList.remove('stargazing-mode');
    
    // Remove pin if exists
    if (stargazingPin) {
      stargazingPin.remove();
      stargazingPin = null;
    }
  }

  function handleMapClickForStargazing(e) {
    if (!stargazingMode) return;
    
    const { lng, lat } = e.lngLat;
    
    // Show visual feedback (optional - without pin)
    showClickFeedback([lng, lat]);
    
    // Fetch weather data for this location
    fetchStargazingWeather(lat, lng);
  }

  function showClickFeedback(coordinates) {
      if (!map.getSource('stargazing-feedback')) return;
      
      // Create a temporary circle at click location
      const clickFeature = {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: coordinates
        }
      };
      
      map.getSource('stargazing-feedback').setData(clickFeature);
      
      // Set red color for the circle
      map.setPaintProperty('stargazing-click-circle', 'circle-color', '#FF6B35');
      map.setPaintProperty('stargazing-click-circle', 'circle-stroke-color', '#FF8C42');
      map.setPaintProperty('stargazing-click-circle', 'circle-stroke-width', 2);
      
      // Animate the circle - start small and bright red
      map.setPaintProperty('stargazing-click-circle', 'circle-radius', 3);
      map.setPaintProperty('stargazing-click-circle', 'circle-opacity', 1);
      
      // Animate out with red shockwave effect
      setTimeout(() => {
        map.setPaintProperty('stargazing-click-circle', 'circle-radius', 10);
        map.setPaintProperty('stargazing-click-circle', 'circle-opacity', 0.7);
        map.setPaintProperty('stargazing-click-circle', 'circle-color', '#FF8C42');
      }, 100);
      
      setTimeout(() => {
        map.setPaintProperty('stargazing-click-circle', 'circle-radius', 25);
        map.setPaintProperty('stargazing-click-circle', 'circle-opacity', 0.4);
        map.setPaintProperty('stargazing-click-circle', 'circle-color', '#FF4500');
      }, 300);
      
      setTimeout(() => {
        map.setPaintProperty('stargazing-click-circle', 'circle-radius', 40);
        map.setPaintProperty('stargazing-click-circle', 'circle-opacity', 0.1);
        map.setPaintProperty('stargazing-click-circle', 'circle-color', '#FF6347');
      }, 500);
      
      // Clear after animation
      setTimeout(() => {
        map.getSource('stargazing-feedback').setData({
          type: 'FeatureCollection',
          features: []
        });
      }, 800);
  }

  async function fetchStargazingWeather(lat, lng) {
    showSheetLoading();
    openSheet();
    
    try {
      const wx = await (await fetch(`${BACKEND_URL}/nasa?start=${SELECTED_START_DATE}&end=${SELECTED_END_DATE}&lat=${lat}&lng=${lng}`)).json();
      
      // Store current location info for potential reloads (similar to hiking)
      currentTrailInfo = {
        id: `stargazing-${Date.now()}`,
        name: 'Stargazing Location',
        center: { lat, lng },
        geometry: null
      };
      // Add visual indicator to date inputs
      startDateInput.classList.add('date-input-active');
      endDateInput.classList.add('date-input-active');
      // Update sheet content for stargazing
      sheetTitle.textContent = 'Stargazing Location';
      sheetSub.textContent = `${wx.startDate} to ${wx.endDate} • ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      sheetBody.innerHTML = renderNasaTable(wx.table || []);
      
      // Mode indicator and stargazing-specific info
      const modeIndicator = `
        <div style="background: linear-gradient(135deg, #7e57c2, #5e35b1); color: white; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 18px;">⭐</span>
            <div>
              <h4 style="margin: 0 0 4px 0; font-size: 16px;">Stargazing Mode</h4>
              <p style="margin: 0; font-size: 12px; opacity: 0.9;">Ideal conditions: Clear skies, low humidity, minimal cloud cover</p>
            </div>
          </div>
        </div>
      `;
      sheetBody.innerHTML = modeIndicator + sheetBody.innerHTML;
      
      // Setup collapsible tables
      setTimeout(() => {
        try {
          setupCollapsibleTables();
        } catch (e) {
          console.warn('Collapsible setup failed:', e);
        }
      }, 100);
      
    } catch(err) {
      console.warn('Stargazing weather failed', err);
      toast('Could not load weather data for this location');
      // Clear current location info on error
      currentTrailInfo = null;
      if (sheetBody) {
        sheetBody.innerHTML = '<p style="text-align: center; color: #667085; padding: 40px;">Failed to load weather data</p>';
      }
    }
  }
  // Tutorial system
  function initTutorial() {
    // Wait a bit for DOM to be fully ready
    setTimeout(() => {
      const tutorialOverlay = document.getElementById('tutorial-overlay');
      const tutorialPopup = tutorialOverlay?.querySelector('.tutorial-popup');
      const tutorialTrigger = document.getElementById('tutorial-trigger');
      const tutorialTitle = document.getElementById('tutorial-title');
      const tutorialDescription = document.getElementById('tutorial-description');
      const tutorialHighlight = document.getElementById('tutorial-highlight');
      const tutorialStep = document.getElementById('tutorial-step');
      const tutorialTotal = document.getElementById('tutorial-total');
      const tutorialPrev = document.getElementById('tutorial-prev');
      const tutorialNext = document.getElementById('tutorial-next');
      const tutorialSkip = document.getElementById('tutorial-skip');

      if (!tutorialOverlay || !tutorialPopup || !tutorialNext) {
        console.error('❌ Essential tutorial elements missing!');
        return;
      }
      let currentTutorialStep = 0;
      const tutorialSteps = [
        {
          title: "Welcome to HorusCast!",
          description: "This interactive map helps you find outdoor spots and check weather conditions for your adventures.",
          highlight: "Let's explore the main features together!",
          element: null,
          position: { x: '50%', y: '50%' }
        },
        {
          title: "Activity Selection",
          description: "Choose your preferred outdoor activity. We'll focus on the two available modes.",
          highlight: "Hiking 🥾 and Stargazing 🌟 modes are ready to use!",
          element: '.pill--activity',
          position: 'right'
        },
        {
          title: "Hiking Mode", 
          description: "Find and explore hiking trails automatically.",
          highlight: "Trails appear as you move the map. Click any green dot to see trail details and weather.",
          element: '.pill--activity',
          position: 'right'
        },
        {
          title: "Stargazing Mode",
          description: "Check weather conditions for perfect stargazing spots.",
          highlight: "Click anywhere on the map to drop a pin and get detailed weather data for that location.",
          element: '.pill--activity',
          position: 'right'
        },
        {
          title: "Search Locations", 
          description: "Find areas quickly using the search bar.",
          highlight: "Works in both modes - finds trails for hiking or areas for stargazing",
          element: '.pill--search',
          position: 'bottom'
        },
        {
          title: "Search Button", 
          description: "Quickly find trails or focus the search bar.",
          highlight: "In hiking mode: Finds trails in your current view.",
          element: '.search-icon',
          position: 'bottom'
        },
        {
          title: "Date Selection",
          description: "Check weather for your planned trip dates.",
          highlight: "Set start and end dates to see forecasts for your adventure timeframe",
          element: '.pill--date',
          position: 'bottom'
        },
        {
          title: "Ready to Explore!",
          description: "You're all set to start your outdoor adventure.",
          highlight: "Switch between hiking and stargazing modes to get tailored information for your activity!",
          element: null,
          position: { x: '50%', y: '50%' }
        }
      ];

      if (tutorialTotal) {
        tutorialTotal.textContent = tutorialSteps.length;
      }

      function positionPopup(element, position) {
        if (!element) {
          // Center the popup if no target element
          tutorialPopup.style.left = '50%';
          tutorialPopup.style.top = '50%';
          tutorialPopup.style.transform = 'translate(-50%, -50%)';
          tutorialPopup.removeAttribute('data-position');
          return;
        }

        const rect = element.getBoundingClientRect();
        const popupWidth = 320;
        const popupHeight = 280;
        const padding = 20;

        let left, top, transformOrigin;

        switch (position) {
          case 'top':
            left = rect.left + (rect.width / 2) - (popupWidth / 2);
            top = rect.top - popupHeight - padding;
            transformOrigin = 'bottom center';
            break;
          case 'bottom':
            left = rect.left + (rect.width / 2) - (popupWidth / 2);
            top = rect.bottom + padding;
            transformOrigin = 'top center';
            break;
          case 'left':
            left = rect.left - popupWidth - padding;
            top = rect.top + (rect.height / 2) - (popupHeight / 2);
            transformOrigin = 'right center';
            break;
          case 'right':
            left = rect.right + padding;
            top = rect.top + (rect.height / 2) - (popupHeight / 2);
            transformOrigin = 'left center';
            break;
          default:
            // Custom position (for welcome/finish screens)
            if (position.x && position.y) {
              left = position.x === '50%' ? '50%' : `${position.x}px`;
              top = position.y === '50%' ? '50%' : `${position.y}px`;
              tutorialPopup.style.left = left;
              tutorialPopup.style.top = top;
              tutorialPopup.style.transform = position.x === '50%' ? 'translate(-50%, -50%)' : 'none';
              return;
            }
        }

        // Ensure popup stays within viewport
        left = Math.max(padding, Math.min(left, window.innerWidth - popupWidth - padding));
        top = Math.max(padding, Math.min(top, window.innerHeight - popupHeight - padding));

        tutorialPopup.style.left = `${left}px`;
        tutorialPopup.style.top = `${top}px`;
        tutorialPopup.style.transform = 'none';
        tutorialPopup.setAttribute('data-position', position);
      }

      function showTutorialStep(stepIndex) {
        if (stepIndex < 0 || stepIndex >= tutorialSteps.length) return;
        
        currentTutorialStep = stepIndex;
        const step = tutorialSteps[stepIndex];
        
        // Update content
        if (tutorialTitle) tutorialTitle.textContent = step.title;
        if (tutorialDescription) tutorialDescription.textContent = step.description;
        if (tutorialHighlight) tutorialHighlight.textContent = step.highlight;
        if (tutorialStep) tutorialStep.textContent = stepIndex + 1;
        
        // Remove previous highlights
        document.querySelectorAll('.tutorial-highlight-element').forEach(el => {
          el.classList.remove('tutorial-highlight-element');
        });
        
        // Position popup and highlight element
        let targetElement = null;
        if (step.element) {
          targetElement = document.querySelector(step.element);
          if (targetElement) {
            targetElement.classList.add('tutorial-highlight-element');
          }
        }
        
        positionPopup(targetElement, step.position);
        
        // Update button states
        if (tutorialPrev) {
          tutorialPrev.disabled = stepIndex === 0;
        }
        
        if (tutorialNext) {
          tutorialNext.textContent = stepIndex === tutorialSteps.length - 1 ? 'Finish' : 'Next';
        }
        
        if (tutorialSkip) {
          tutorialSkip.style.display = stepIndex === tutorialSteps.length - 1 ? 'none' : 'block';
        }
        
        // Show tutorial
        tutorialOverlay.hidden = false;
      }

      function nextTutorialStep() {
        if (currentTutorialStep < tutorialSteps.length - 1) {
          showTutorialStep(currentTutorialStep + 1);
        } else {
          finishTutorial();
        }
      }

      function prevTutorialStep() {
        if (currentTutorialStep > 0) {
          showTutorialStep(currentTutorialStep - 1);
        }
      }

      function finishTutorial() {
        tutorialOverlay.hidden = true;
        
        // Remove highlights
        document.querySelectorAll('.tutorial-highlight-element').forEach(el => {
          el.classList.remove('tutorial-highlight-element');
        });
        
        localStorage.setItem('horuscast-tutorial-completed', 'true');
        toast('Tutorial completed! Happy exploring! 🗺️');
      }

      function skipTutorial() {
        tutorialOverlay.hidden = true;
        document.querySelectorAll('.tutorial-highlight-element').forEach(el => {
          el.classList.remove('tutorial-highlight-element');
        });
        toast('You can always click the help button to see the tutorial again.');
      }

      function startTutorial() {
        showTutorialStep(0);
      }

      // ATTACH EVENT LISTENERS
      
      if (tutorialTrigger) {
        tutorialTrigger.addEventListener('click', startTutorial);
      }
      
      if (tutorialNext) {
        tutorialNext.addEventListener('click', nextTutorialStep);
      }
      
      if (tutorialPrev) {
        tutorialPrev.addEventListener('click', prevTutorialStep);
      }
      
      if (tutorialSkip) {
        tutorialSkip.addEventListener('click', skipTutorial);
      }
      
      // Close tutorial when clicking outside popup
      tutorialOverlay.addEventListener('click', (e) => {
        if (e.target === tutorialOverlay) {
          skipTutorial();
        }
      });

      // Prevent clicks inside popup from closing
      tutorialPopup.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      // Auto-start on first visit
      const tutorialCompleted = localStorage.getItem('horuscast-tutorial-completed');
      if (!tutorialCompleted) {
        setTimeout(startTutorial, 1000);
      }
    }, 100);
  }
  function resetTutorial() {
    localStorage.removeItem('horuscast-tutorial-completed');
    console.log('✅ Tutorial reset - will auto-start on next page load');
    toast('Tutorial has been reset'); //type localStorage.clear() in F12
  }
  initTutorial();
})();