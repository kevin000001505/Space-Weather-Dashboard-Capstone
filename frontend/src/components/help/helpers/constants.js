export const TOPBAR_HEIGHT = 68;
export const LEFT_SIDEBAR_WIDTH = 320;
export const RIGHT_SIDEBAR_WIDTH = 320;

export const helpNav = [
  {
    label: "Overview",
    items: [
      "Purpose of the platform",
      "Who should use this platform?",
      "Main dashboards at a glance",
      "Supported workflows",
      "Key concepts and terminology",
    ],
  },
  {
    label: "Quick Start",
    items: [
      "Understanding the main layout",
      "Switching between dashboards",
      "Choosing time range and timezone",
      "Using search, filters, and toggles",
      "Reading legends, labels, and values",
    ],
  },
  {
    label: "Features",
    items: ["Dashboard", "Reports", "Alerts"],
  },
  {
    label: "Plane & Events Tracker",
    items: [
      "What the tracker shows",
      "Flights on the map",
      "Airports on the map",
      "Space weather event overlays",
      "Searching for flights or airports",
      "Filtering visible data",
      "Interpreting marker colors and symbols",
      "Using layer controls",
      "Contact Support",
    ],
  },
  {
    label: "Analytics Dashboard",
    items: [
      "Dashboard purpose",
      "Available chart categories",
      "KP Index",
      "X-Ray Flux",
      "Proton Flux",
      "Time-window controls",
      "Comparing multiple plots",
      "Interpreting peaks, spikes, and trends",
      "Exporting or downloading chart views",
    ],
  },
  {
    label: "Space Weather Terms",
    items: [
      "Solar flares",
      "Coronal mass ejections",
      "X-ray flux",
      "Proton flux",
      "KP index",
      "Geomagnetic storms",
      "Aurora activity",
      "DRAP absorption",
      "Geoelectric field activity",
    ],
  },
];

// ---------------------------------------------------------------------------
// Per-topic help content
// ---------------------------------------------------------------------------

const topicContent = {
  // ── Overview ──────────────────────────────────────────────────────────
  "Purpose of the platform": {
    title: "Purpose of the Platform",
    intro:
      "The Space Weather Dashboard is a real-time monitoring and analytics platform that visualizes how solar activity affects aviation and power-grid infrastructure. It combines live flight tracking, airport data, and multiple space-weather overlays into a single interactive map, alongside an analytics dashboard for historical trend analysis.",
    sections: [
      {
        id: "overview",
        title: "Overview",
        body: [
          "Space weather events such as solar flares, geomagnetic storms, and radiation storms can disrupt high-frequency radio communications, satellite navigation, and power grids. This platform brings together data from NOAA's Space Weather Prediction Center, OpenSky Network, and other authoritative sources so that operators can see impacts at a glance.",
          "Whether you are an air-traffic controller checking HF-radio absorption along polar routes, or a grid operator monitoring geoelectric field intensity near transmission lines, this tool provides the situational awareness you need.",
        ],
        subsections: [
          {
            id: "overview-mission",
            title: "Mission",
            body: "Our mission is to make space-weather data accessible and actionable by combining it with real-world infrastructure data in an intuitive visual interface.",
          },
        ],
      },
      {
        id: "data-sources",
        title: "Data Sources",
        body: [
          "All space-weather data is sourced from NOAA's Space Weather Prediction Center (SWPC), including Kp index, X-ray flux, proton flux, DRAP absorption, aurora forecasts, and geoelectric field estimates.",
          "Flight positions are provided by the OpenSky Network. Airport metadata and power-grid transmission line data come from publicly available government datasets.",
        ],
        subsections: [
          {
            id: "data-sources-refresh",
            title: "Data Refresh",
            body: "Map overlays update automatically via server-sent events (SSE). The analytics charts poll for new data every 60 seconds.",
          },
        ],
      },
    ],
  },

  "Who should use this platform?": {
    title: "Who Should Use This Platform?",
    intro:
      "This platform is designed for anyone who needs to understand the impact of space weather on critical infrastructure, including aviation professionals, power-grid operators, researchers, and students.",
    sections: [
      {
        id: "target-audiences",
        title: "Target Audiences",
        body: [
          "Aviation professionals -- dispatchers, flight planners, and air-traffic controllers -- can use the Plane & Events Tracker to see how DRAP absorption zones and aurora ovals overlap with active flight routes, especially over polar regions where HF-radio blackouts are most disruptive.",
          "Power-grid operators and engineers can overlay geoelectric field intensity on top of high-voltage transmission lines to assess geomagnetically induced current (GIC) risk during geomagnetic storms.",
        ],
        subsections: [
          {
            id: "target-audiences-researchers",
            title: "Researchers & Students",
            body: "Researchers and students studying heliophysics, ionospheric science, or space-weather impacts can use the analytics dashboard to explore historical Kp index, X-ray flux, and proton flux trends across configurable time windows.",
          },
        ],
      },
    ],
  },

  "Main dashboards at a glance": {
    title: "Main Dashboards at a Glance",
    intro:
      "The platform has two primary views: the Plane & Events Tracker (the home page map) and the Analytics Dashboard (charts). You can switch between them from the sidebar.",
    sections: [
      {
        id: "plane-tracker-glance",
        title: "Plane & Events Tracker",
        body: [
          "The home page presents a full-screen interactive map powered by MapLibre. Flights, airports, and space-weather overlays (DRAP, aurora, geoelectric field, power-grid lines) are rendered as toggleable layers.",
          "Use the search bar in the top-left to find a specific flight or airport. The control buttons in the top-right let you toggle layers, switch units, open settings, and change the theme.",
        ],
        subsections: [
          {
            id: "plane-tracker-glance-playback",
            title: "Playback Mode",
            body: "When live-stream mode is off, a playback panel appears at the bottom of the map. You can scrub through past DRAP snapshots to see how radio absorption changed throughout the day.",
          },
        ],
      },
      {
        id: "analytics-glance",
        title: "Analytics Dashboard",
        body: [
          "Navigate to the Analytics page via the sidebar. It presents Kp Index, X-ray Flux, and Proton Flux charts. Tabs at the top let you view all plots at once or focus on a single metric.",
          "A time-range selector and settings gear icon provide control over the date window, timezone, axis sizes, and chart styling. You can also download chart data or images.",
        ],
        subsections: [
          {
            id: "analytics-glance-scales",
            title: "NOAA Scale Indicators",
            body: "The sidebar also displays current NOAA space-weather scale levels (G for geomagnetic storms, R for radio blackouts, S for solar radiation) so you can see the current alert status at a glance.",
          },
        ],
      },
    ],
  },

  "Supported workflows": {
    title: "Supported Workflows",
    intro:
      "The platform supports several common operational and analytical workflows out of the box.",
    sections: [
      {
        id: "workflow-monitoring",
        title: "Real-Time Monitoring",
        body: [
          "Open the Plane & Events Tracker to monitor live flight positions alongside space-weather overlays. Enable DRAP and aurora layers to see which regions are currently experiencing HF-radio absorption or elevated aurora activity.",
          "Click on any flight to open a details panel showing callsign, ICAO24 code, altitude, speed, heading, and position. Click on any airport to see its metadata and runway information.",
        ],
        subsections: [
          {
            id: "workflow-monitoring-alerts",
            title: "Checking Alert Levels",
            body: "Open the sidebar to see the current NOAA G/R/S scale levels. These correspond to geomagnetic storms, radio blackouts, and solar radiation storms respectively.",
          },
        ],
      },
      {
        id: "workflow-analysis",
        title: "Historical Analysis",
        body: [
          "Switch to the Analytics Dashboard to explore historical trends. Select a time range (6 hours, 1 day, 3 days, 7 days, or custom) and view how Kp index, X-ray flux, or proton flux evolved.",
          "Charts include color-coded NOAA-scale background bands (G0-G5, R0-R5, S0-S5) so you can quickly see when conditions reached storm thresholds.",
        ],
        subsections: [
          {
            id: "workflow-analysis-export",
            title: "Exporting Data",
            body: "Use the download button on the Analytics Dashboard to export chart data as CSV, JSON, HTML, or XML. You can also export the chart image as PNG or PDF.",
          },
        ],
      },
    ],
  },

  "Key concepts and terminology": {
    title: "Key Concepts and Terminology",
    intro:
      "Understanding a few key concepts will help you get the most out of this platform. This section covers the most important terms used throughout the interface.",
    sections: [
      {
        id: "concepts-noaa-scales",
        title: "NOAA Space Weather Scales",
        body: [
          "NOAA uses three scales to communicate space-weather severity: G (Geomagnetic Storms, G1-G5), R (Radio Blackouts, R1-R5), and S (Solar Radiation Storms, S1-S5). G0, R0, and S0 indicate quiet conditions. Higher numbers indicate more severe events.",
          "On charts, these levels are shown as colored background bands. On the sidebar, the current levels are displayed as badges.",
        ],
        subsections: [
          {
            id: "concepts-noaa-scales-colors",
            title: "Scale Color Coding",
            body: "Green indicates quiet conditions, yellow-green is minor, yellow is moderate, orange is strong, dark orange is severe, and red is extreme. These colors are consistent across all charts and overlays.",
          },
        ],
      },
      {
        id: "concepts-units",
        title: "Measurement Units",
        body: [
          "The platform supports both metric and imperial units for altitude and speed. Metric uses meters (m) and meters per second (m/s). Imperial uses feet (ft) and knots. Toggle between them using the unit button (M/F) in the top-right of the map.",
          "X-ray flux is measured in watts per square meter (W/m\u00B2) on a logarithmic scale. Proton flux is measured in particle flux units (pfu). The Kp index is a dimensionless value from 0 to 9.",
        ],
        subsections: [
          {
            id: "concepts-units-icao",
            title: "Flight Identifiers",
            body: "Each aircraft is identified by an ICAO24 hex code (a unique transponder address) and optionally a callsign (the flight number assigned by the airline or operator).",
          },
        ],
      },
    ],
  },

  // ── Quick Start ───────────────────────────────────────────────────────
  "Understanding the main layout": {
    title: "Understanding the Main Layout",
    intro:
      "The application uses a simple layout with a sidebar for navigation and a full-screen content area for either the map or the analytics charts.",
    sections: [
      {
        id: "layout-sidebar",
        title: "Sidebar Navigation",
        body: [
          "The sidebar slides in from the right when you click the menu icon. It contains links to the Dashboard (map), Analytics (charts), Help, and About pages.",
          "The sidebar also displays the current NOAA space-weather scale levels and a link to the Tutorial.",
        ],
        subsections: [
          {
            id: "layout-sidebar-noaa",
            title: "NOAA Scales in the Sidebar",
            body: "Below the navigation links, the sidebar shows the latest NOAA G, R, and S scale readings. These update automatically and give you a quick status check without leaving your current view.",
          },
        ],
      },
      {
        id: "layout-map",
        title: "Map Area",
        body: [
          "On the Dashboard page, the full-screen map occupies the entire viewport. A search bar sits in the top-left corner, and control buttons are in the top-right. A date/time viewer shows the current timestamp at the top center.",
          "Panels for selected flights or airports appear as draggable cards overlaid on the map. A playback bar and legends appear at the bottom when enabled.",
        ],
        subsections: [
          {
            id: "layout-map-controls",
            title: "Map Interaction",
            body: "Pan by clicking and dragging. Zoom with the scroll wheel or pinch gesture. Click on a flight or airport icon to select it and see its popup. Double-click a flight to open its detail panel.",
          },
        ],
      },
    ],
  },

  "Switching between dashboards": {
    title: "Switching Between Dashboards",
    intro:
      "Use the sidebar to move between the Plane & Events Tracker and the Analytics Dashboard.",
    sections: [
      {
        id: "switching-how",
        title: "How to Switch",
        body: [
          "Click the hamburger menu icon in the top-right corner of either page to open the sidebar. Then select 'Dashboard' to go to the map or 'Analytics' to view the charts.",
          "The sidebar closes automatically after you select a destination. Your settings (dark mode, unit preference, etc.) persist across pages.",
        ],
        subsections: [
          {
            id: "switching-how-url",
            title: "Direct URLs",
            body: "You can also navigate directly: the map is at '/', the analytics dashboard at '/charts', this help page at '/help', and the about page at '/about'.",
          },
        ],
      },
    ],
  },

  "Choosing time range and timezone": {
    title: "Choosing Time Range and Timezone",
    intro:
      "The Analytics Dashboard lets you control the time window and timezone used for all charts.",
    sections: [
      {
        id: "time-range",
        title: "Time Range Selector",
        body: [
          "In the tab bar at the top of the Analytics page, you will find a time-range dropdown on the right side. Preset options include 6 hours, 1 day, 3 days, and 7 days. The default is 3 days.",
          "When you change the time range, all visible charts re-fetch data for the new window. The charts also poll for updates every 60 seconds, so new data points appear automatically.",
        ],
        subsections: [
          {
            id: "time-range-custom",
            title: "Custom Date Range",
            body: "Select the 'Custom' option in the time-range dropdown to enter specific start and end dates and times. This is useful for investigating a particular space-weather event.",
          },
        ],
      },
      {
        id: "timezone",
        title: "Timezone Selection",
        body: [
          "The chart settings panel allows you to choose from all IANA timezones. Chart axis labels adjust to display times in your selected timezone, making it easy to correlate events with local time.",
        ],
        subsections: [
          {
            id: "timezone-default",
            title: "Default Timezone",
            body: "By default, chart times are displayed in UTC. You can change this in the settings panel accessible via the gear icon on the Analytics tab bar.",
          },
        ],
      },
    ],
  },

  "Using search, filters, and toggles": {
    title: "Using Search, Filters, and Toggles",
    intro:
      "The map provides a search bar, layer toggles, and a settings panel to help you find and focus on the data you need.",
    sections: [
      {
        id: "search-bar",
        title: "Search Bar",
        body: [
          "The search bar in the top-left corner of the map lets you search for flights by callsign or ICAO24 code, and airports by name, IATA code, or GPS code. Start typing at least 3 characters to see results.",
          "Results are displayed in a dropdown with flight matches showing an airplane icon and altitude badge, and airport matches showing a pin icon and airport code. Click a result to zoom the map to that location.",
        ],
        subsections: [
          {
            id: "search-bar-tips",
            title: "Search Tips",
            body: "Search is case-insensitive. For flights, try the callsign (e.g., 'UAL123') or the ICAO24 hex code. For airports, try the name (e.g., 'Dulles'), IATA code (e.g., 'IAD'), or ICAO code (e.g., 'KIAD').",
          },
        ],
      },
      {
        id: "layer-toggles",
        title: "Layer Toggles",
        body: [
          "The visibility speed-dial button (eye icon) in the top-right expands to reveal individual layer toggles for: Airplanes, Airports, DRAP Regions, Aurora, GeoElectric Field, and Power Grid lines.",
          "Green borders indicate a layer is visible; red borders indicate it is hidden. Click the main eye icon to enter isolate mode, which hides all layers except those with selected/pinned items.",
        ],
        subsections: [
          {
            id: "layer-toggles-legend",
            title: "Legend Toggles",
            body: "The 'L' speed-dial button lets you toggle the icon legend and altitude color legend independently. These legends appear at the bottom of the map.",
          },
        ],
      },
    ],
  },

  "Reading legends, labels, and values": {
    title: "Reading Legends, Labels, and Values",
    intro:
      "Legends and labels throughout the interface help you interpret the data shown on the map and charts.",
    sections: [
      {
        id: "map-legends",
        title: "Map Legends",
        body: [
          "The altitude color legend shows a gradient bar mapping flight altitude to color. Low-altitude flights appear in cool colors (blue/green) and high-altitude flights in warm colors (orange/red).",
          "The icon legend (stats panel) shows the count of currently visible flights and airports, along with icon explanations.",
        ],
        subsections: [
          {
            id: "map-legends-overlays",
            title: "Overlay Colors",
            body: "DRAP regions use a yellow-to-red gradient indicating HF-radio absorption intensity (dB). Aurora regions use a green-to-red gradient indicating aurora probability (%). Geoelectric fields use a blue-to-red gradient based on field magnitude (mV/km).",
          },
        ],
      },
      {
        id: "chart-labels",
        title: "Chart Labels and Bands",
        body: [
          "On the Analytics Dashboard, each chart has color-coded background bands corresponding to NOAA scale levels. For the Kp Index chart, bands show G0 through G5. For X-ray Flux, bands show R0 through R5. For Proton Flux, bands show S0 through S5.",
          "Hover over any data point on a chart to see its exact value and timestamp in a tooltip.",
        ],
        subsections: [
          {
            id: "chart-labels-axes",
            title: "Axis Formatting",
            body: "X-ray and proton flux charts use logarithmic Y-axes. The Kp index chart uses a linear Y-axis from 0 to 9. Time axes show labels formatted according to your selected timezone.",
          },
        ],
      },
    ],
  },

  // ── Features ──────────────────────────────────────────────────────────
  Dashboard: {
    title: "Dashboard",
    intro:
      "The Dashboard is the home page of the platform. It shows a full-screen interactive map with live flight positions, airport locations, and space-weather overlays.",
    sections: [
      {
        id: "dashboard-overview",
        title: "Overview",
        body: [
          "The Dashboard (Plane & Events Tracker) is designed for real-time situational awareness. It displays live aircraft positions from the OpenSky Network overlaid with space-weather data from NOAA.",
          "You can toggle individual data layers on or off, search for specific flights or airports, filter by altitude or airport type, and view detailed information panels for any selected object.",
        ],
        subsections: [
          {
            id: "dashboard-overview-layers",
            title: "Available Layers",
            body: "Six data layers are available: Airplanes, Airports, DRAP (radio absorption), Aurora, Geoelectric Field, and Electric Transmission Lines (power grid). Each can be toggled independently.",
          },
        ],
      },
      {
        id: "dashboard-controls",
        title: "Controls",
        body: [
          "The top-right corner contains: a unit toggle (metric/imperial), legend controls, layer visibility controls, a dark/light mode toggle, a settings button, and a sidebar menu button.",
          "The top-left corner has the search bar. The top center shows the current date and time. The bottom of the screen can show a playback panel, altitude legend, and stats panel depending on your settings.",
        ],
        subsections: [
          {
            id: "dashboard-controls-settings",
            title: "Settings Panel",
            body: "The settings panel is a draggable, resizable window with tabs for filtering flights, airports, DRAP, aurora, geoelectric, and power-grid data by various attributes like altitude range, airport type, absorption intensity, voltage level, and more.",
          },
        ],
      },
    ],
  },

  Reports: {
    title: "Reports",
    intro:
      "The Analytics Dashboard serves as the reporting interface. It provides time-series charts for key space-weather indices that you can analyze and export.",
    sections: [
      {
        id: "reports-overview",
        title: "Overview",
        body: [
          "Reports are generated through the Analytics Dashboard's charting system. Three primary metrics are tracked: Kp Index (geomagnetic activity), X-ray Flux (solar flare intensity), and Proton Flux (solar radiation).",
          "Each chart can be viewed individually or all three together. Charts update in real-time and include NOAA-scale background bands for quick severity assessment.",
        ],
        subsections: [
          {
            id: "reports-overview-export",
            title: "Exporting Reports",
            body: "Click the download button on the Analytics tab bar to export the current chart data as CSV, JSON, HTML, or XML. You can also export chart images as PNG or PDF for inclusion in reports and presentations.",
          },
        ],
      },
    ],
  },

  Alerts: {
    title: "Alerts",
    intro:
      "The platform displays current NOAA space-weather alert levels in the sidebar and through visual indicators on charts.",
    sections: [
      {
        id: "alerts-overview",
        title: "Overview",
        body: [
          "NOAA publishes three space-weather scales that indicate event severity: G (Geomagnetic Storms), R (Radio Blackouts), and S (Solar Radiation Storms). Each scale runs from 1 (minor) to 5 (extreme), with 0 indicating quiet conditions.",
          "The sidebar displays the current level for each scale. These values update automatically and give you an at-a-glance status of current space-weather conditions.",
        ],
        subsections: [
          {
            id: "alerts-overview-chart-bands",
            title: "Chart-Level Indicators",
            body: "On the Analytics Dashboard, colored background bands on each chart correspond to NOAA scale thresholds. When the plotted data enters a colored band, it means conditions have reached that severity level.",
          },
        ],
      },
    ],
  },

  // ── Plane & Events Tracker ────────────────────────────────────────────
  "What the tracker shows": {
    title: "What the Tracker Shows",
    intro:
      "The Plane & Events Tracker is a real-time interactive map that combines live aviation data with space-weather event overlays to show how solar activity affects the airspace and power infrastructure.",
    sections: [
      {
        id: "tracker-data",
        title: "Data on the Map",
        body: [
          "The map displays live aircraft positions with altitude-based color coding, airports with type-based icons, DRAP radio-absorption regions, aurora probability zones, geoelectric field intensity, and high-voltage electric transmission lines.",
          "All data layers update in real-time via server-sent events (SSE) when in live-stream mode, or can be explored historically using the playback panel.",
        ],
        subsections: [
          {
            id: "tracker-data-interactions",
            title: "Interacting with Data",
            body: "Click on any flight to see a popup with its callsign, altitude, speed, and heading. Double-click to open a full detail panel. Click on an airport to see its name, code, type, elevation, and location. Hover over power lines to see voltage, type, and owner information.",
          },
        ],
      },
    ],
  },

  "Flights on the map": {
    title: "Flights on the Map",
    intro:
      "Aircraft are displayed as icons on the map, rotated to match their heading and colored based on altitude.",
    sections: [
      {
        id: "flights-display",
        title: "Flight Display",
        body: [
          "Each aircraft is represented by a directional icon that rotates to indicate the plane's heading. The icon color corresponds to the aircraft's geometric altitude, ranging from cool colors (blue/green) at low altitudes to warm colors (orange/red) at high altitudes.",
          "You can adjust the flight icon size in the settings panel. Flights without valid position data are automatically hidden.",
        ],
        subsections: [
          {
            id: "flights-display-details",
            title: "Flight Details Panel",
            body: "Double-clicking a flight opens a draggable detail panel showing the callsign, ICAO24 code, altitude, speed, heading, and geographic coordinates. The panel also displays the flight path trace on the map.",
          },
        ],
      },
      {
        id: "flights-filtering",
        title: "Filtering Flights",
        body: [
          "Use the settings panel to filter flights by altitude range. The altitude slider lets you set a minimum and maximum altitude so you can focus on specific flight levels.",
          "In isolate mode, only flights that you have explicitly selected (via double-click) are shown on the map. This is useful for tracking specific flights without visual clutter.",
        ],
        subsections: [
          {
            id: "flights-filtering-units",
            title: "Altitude Units",
            body: "Altitude values are displayed in meters (metric) or feet (imperial), depending on your unit preference. Toggle units using the M/F button in the top-right controls.",
          },
        ],
      },
    ],
  },

  "Airports on the map": {
    title: "Airports on the Map",
    intro:
      "Airports are displayed as icons on the map and can be filtered by type and elevation.",
    sections: [
      {
        id: "airports-display",
        title: "Airport Display",
        body: [
          "Airport icons vary by type: large airports, medium airports, small airports, heliports, seaplane bases, and closed airports each have distinct styling. Click an airport to see a popup with its name, IATA/GPS code, type, location, and elevation.",
          "Double-clicking an airport opens a detail panel with additional information including runway data when available.",
        ],
        subsections: [
          {
            id: "airports-display-types",
            title: "Airport Types",
            body: "The settings panel lets you filter airports by type using checkboxes. Available types include large_airport, medium_airport, small_airport, heliport, seaplane_base, and closed. Only checked types are displayed on the map.",
          },
        ],
      },
      {
        id: "airports-elevation",
        title: "Elevation Filtering",
        body: [
          "An elevation range slider in the settings panel lets you filter airports by their field elevation. This is useful for focusing on high-altitude or low-altitude airports.",
        ],
        subsections: [
          {
            id: "airports-elevation-size",
            title: "Icon Size",
            body: "You can adjust airport icon size in the settings panel to make airports more or less prominent on the map relative to other data layers.",
          },
        ],
      },
    ],
  },

  "Space weather event overlays": {
    title: "Space Weather Event Overlays",
    intro:
      "The map supports four space-weather overlay layers: DRAP absorption, aurora probability, geoelectric field intensity, and power-grid transmission lines.",
    sections: [
      {
        id: "overlay-drap",
        title: "DRAP (D-Region Absorption Prediction)",
        body: [
          "The DRAP overlay shows regions of high-frequency (HF) radio absorption caused by solar X-ray and proton events. It displays as a colored grid where yellow indicates light absorption and red indicates severe absorption, measured in decibels (dB).",
          "You can filter the displayed DRAP cells by absorption intensity range using the slider in the settings panel.",
        ],
        subsections: [
          {
            id: "overlay-drap-impact",
            title: "Aviation Impact",
            body: "Flights passing through high-DRAP regions may lose HF radio communication, which is critical for oceanic and polar routes where VHF and satellite coverage may be limited.",
          },
        ],
      },
      {
        id: "overlay-aurora",
        title: "Aurora Overlay",
        body: [
          "The aurora overlay shows the predicted aurora borealis (northern hemisphere) and aurora australis (southern hemisphere) probability as a percentage. Higher percentages are shown in brighter, warmer colors.",
          "Filter by aurora probability range using the settings panel slider to focus on regions with significant aurora activity.",
        ],
        subsections: [
          {
            id: "overlay-aurora-impact",
            title: "Navigation Impact",
            body: "Strong aurora activity is correlated with geomagnetic disturbances that can affect compass accuracy and GPS precision, particularly at high latitudes.",
          },
        ],
      },
      {
        id: "overlay-geoelectric",
        title: "Geoelectric Field",
        body: [
          "The geoelectric field overlay displays estimated electric field intensities at the Earth's surface (in millivolts per kilometer). These fields are induced by geomagnetic storms and can drive geomagnetically induced currents (GIC) through power grid infrastructure.",
          "The field magnitude is displayed on a logarithmic scale. Use the settings panel slider to adjust the visible magnitude range.",
        ],
        subsections: [
          {
            id: "overlay-geoelectric-risk",
            title: "Power Grid Risk",
            body: "When the geoelectric field intensity is high, the risk of GIC damage to transformers and other grid equipment increases. Overlay this layer with the power-grid transmission lines layer to assess which lines are most exposed.",
          },
        ],
      },
      {
        id: "overlay-power-grid",
        title: "Electric Transmission Lines",
        body: [
          "This layer displays high-voltage electric transmission lines. Lines are color-coded by voltage level. Hover over any line to see its owner, voltage, type (AC/DC, overhead/underground), status, and the substations it connects.",
          "The settings panel provides extensive filtering: voltage range, in-service only, exclude inferred voltages, AC/DC type, and overhead/underground construction.",
        ],
        subsections: [
          {
            id: "overlay-power-grid-info",
            title: "Popup Information",
            body: "Hovering over a transmission line shows: owner name, voltage (kV), type, status, source, whether the voltage is reported or estimated, connected substations, and line length in miles or kilometers.",
          },
        ],
      },
    ],
  },

  "Searching for flights or airports": {
    title: "Searching for Flights or Airports",
    intro:
      "The search bar in the top-left corner of the map lets you quickly find and zoom to any flight or airport.",
    sections: [
      {
        id: "search-how",
        title: "How to Search",
        body: [
          "Type at least 3 characters into the search bar to see matching results. The search matches against flight callsigns and ICAO24 codes, as well as airport names, IATA codes, and GPS codes.",
          "Results appear in a dropdown list. Flights are marked with an airplane icon and altitude badge. Airports are marked with a pin icon and their airport code.",
        ],
        subsections: [
          {
            id: "search-how-select",
            title: "Selecting a Result",
            body: "Click on a result to zoom the map to that flight or airport. For flights, a popup shows the plane's details. For airports, a detail panel opens automatically with airport information.",
          },
        ],
      },
    ],
  },

  "Filtering visible data": {
    title: "Filtering Visible Data",
    intro:
      "The settings panel offers granular filtering controls for every data layer on the map.",
    sections: [
      {
        id: "filtering-settings",
        title: "Settings Panel Overview",
        body: [
          "Open the settings panel by clicking the tune/settings icon in the top-right controls. The panel is draggable and resizable. It contains tabs for different data categories.",
          "Each tab shows the current number of visible items (e.g., '234 flights') and provides sliders, checkboxes, or dropdowns to refine what is shown on the map.",
        ],
        subsections: [
          {
            id: "filtering-settings-flights",
            title: "Flight Filters",
            body: "Filter flights by altitude range. The slider bounds adjust based on your current unit preference (meters or feet).",
          },
          {
            id: "filtering-settings-airports",
            title: "Airport Filters",
            body: "Filter airports by type (large, medium, small, heliport, seaplane base, closed) and by elevation range.",
          },
        ],
      },
      {
        id: "filtering-overlays",
        title: "Overlay Filters",
        body: [
          "DRAP regions can be filtered by absorption intensity (dB). Aurora regions can be filtered by probability percentage. Geoelectric field regions can be filtered by field magnitude on a logarithmic scale.",
          "Power-grid transmission lines can be filtered by voltage range, service status, voltage source (reported vs. inferred), current type (AC/DC), and construction type (overhead/underground).",
        ],
        subsections: [
          {
            id: "filtering-overlays-counts",
            title: "Item Counts",
            body: "Each filter tab displays the count of items matching the current filter criteria, so you can see the impact of your filters in real time.",
          },
        ],
      },
    ],
  },

  "Interpreting marker colors and symbols": {
    title: "Interpreting Marker Colors and Symbols",
    intro:
      "Colors and symbols on the map encode important information about each data layer.",
    sections: [
      {
        id: "markers-flights",
        title: "Flight Colors",
        body: [
          "Flight icons are colored based on geometric altitude. The altitude color legend at the bottom of the map (toggle with the 'A' legend button) shows the full gradient from low to high altitude.",
          "Selected flights are highlighted with a distinct outline. Flight paths for pinned flights are drawn as lines on the map.",
        ],
        subsections: [
          {
            id: "markers-flights-heading",
            title: "Heading Indicator",
            body: "Each flight icon is rotated to match the aircraft's current heading, giving you a visual indication of its direction of travel.",
          },
        ],
      },
      {
        id: "markers-overlays",
        title: "Overlay Color Gradients",
        body: [
          "DRAP: yellow (low absorption) to red (high absorption). Aurora: green (low probability) to red (high probability). Geoelectric: blue (weak field) to red (intense field). Power lines: colored by voltage level.",
        ],
        subsections: [
          {
            id: "markers-overlays-hover",
            title: "Hover Details",
            body: "Hovering over power-grid lines shows a popup with detailed information. Other overlays display their values through the color intensity -- use the corresponding legends to interpret the scale.",
          },
        ],
      },
    ],
  },

  "Using layer controls": {
    title: "Using Layer Controls",
    intro:
      "Layer controls let you show or hide individual data layers and switch between normal and isolate mode.",
    sections: [
      {
        id: "layers-visibility",
        title: "Visibility Speed Dial",
        body: [
          "The eye icon in the top-right opens a speed-dial menu with six layer toggles: Airplanes, Airports, DRAP, Aurora, GeoElectric, and Power Grids. Each has a green (visible) or red (hidden) border indicator.",
          "Clicking the main eye icon toggles isolate mode. In isolate mode, only explicitly selected flights and airports are visible, regardless of the individual layer toggles.",
        ],
        subsections: [
          {
            id: "layers-visibility-isolate",
            title: "Isolate Mode",
            body: "Isolate mode is useful when you want to focus on specific flights you have pinned. All other flights and airports are hidden, and only space-weather overlays remain visible in the background.",
          },
        ],
      },
      {
        id: "layers-other-controls",
        title: "Other Controls",
        body: [
          "The top-right control bar also includes: a unit toggle (M for metric, F for imperial), a dark/light theme toggle, a settings button, and a sidebar menu button.",
          "The legend speed-dial (L icon) lets you independently show or hide the icon legend and altitude color legend.",
        ],
        subsections: [
          {
            id: "layers-other-controls-theme",
            title: "Dark and Light Mode",
            body: "Dark mode uses a dark basemap ideal for low-light environments. Light mode uses a neutral basemap for daytime use. The theme setting persists across page navigations.",
          },
        ],
      },
    ],
  },

  "Contact Support": {
    title: "Contact Support",
    intro:
      "If you encounter issues or have questions about the platform, here is how to get help.",
    sections: [
      {
        id: "support-contact",
        title: "Getting Help",
        body: [
          "This platform was developed as a GMU DAEN Capstone Project by Team Space Weather. For questions about the platform, please contact the project team or program coordinator.",
          "For space-weather data questions, refer to NOAA's Space Weather Prediction Center (SWPC) at swpc.noaa.gov.",
        ],
        subsections: [
          {
            id: "support-contact-info",
            title: "Project Contact",
            body: "Project Team: Space Weather. Program Coordinator: Professor Schmidt. GMU DAEN Program: analyticsengineering.gmu.edu",
          },
        ],
      },
    ],
  },

  // ── Analytics Dashboard ───────────────────────────────────────────────
  "Dashboard purpose": {
    title: "Dashboard Purpose",
    intro:
      "The Analytics Dashboard provides time-series charts for key space-weather indices, enabling historical analysis and real-time monitoring of solar activity.",
    sections: [
      {
        id: "analytics-purpose",
        title: "Why Use the Analytics Dashboard",
        body: [
          "While the map shows current conditions spatially, the Analytics Dashboard shows how conditions evolve over time. This is essential for understanding the progression of space-weather events and predicting near-term impacts.",
          "Charts are color-coded with NOAA scale bands so you can immediately see when a metric crosses from normal into storm-level territory.",
        ],
        subsections: [
          {
            id: "analytics-purpose-polling",
            title: "Automatic Updates",
            body: "Charts automatically poll for new data every 60 seconds, so they stay current without manual refreshing. A refresh button on each chart also allows manual data updates.",
          },
        ],
      },
    ],
  },

  "Available chart categories": {
    title: "Available Chart Categories",
    intro:
      "The Analytics Dashboard offers three chart categories, viewable individually or all at once.",
    sections: [
      {
        id: "categories-tabs",
        title: "Chart Tabs",
        body: [
          "The tab bar at the top of the Analytics page has four tabs: 'All Plots' shows all three charts stacked vertically, 'Kp Index' shows only the geomagnetic activity chart, 'X-ray Flux' shows only the solar flare chart, and 'Proton Flux' shows only the solar radiation chart.",
          "Switching tabs only fetches data for the selected chart(s), reducing load times when you only need one metric.",
        ],
        subsections: [
          {
            id: "categories-tabs-zoom",
            title: "Chart Zoom",
            body: "Each chart supports zoom via scroll wheel and pan via click-and-drag. Use the reset/refresh button to return to the default view.",
          },
        ],
      },
    ],
  },

  "KP Index": {
    title: "Kp Index Chart",
    intro:
      "The Kp index chart displays the planetary K-index, a measure of geomagnetic disturbance on a scale from 0 to 9.",
    sections: [
      {
        id: "kp-what",
        title: "What the Kp Index Measures",
        body: [
          "The Kp index quantifies disturbances in Earth's magnetic field. It is derived from ground-based magnetometer stations worldwide. Values from 0-3 indicate quiet conditions, 4 is unsettled, and 5-9 represent increasing levels of geomagnetic storm activity.",
          "The chart displays Kp values as colored bars. Each bar's color corresponds to its NOAA G-level: green for G0 (quiet), yellow-green for G1 (minor storm), yellow for G2 (moderate), orange for G3 (strong), dark orange for G4 (severe), and red for G5 (extreme).",
        ],
        subsections: [
          {
            id: "kp-what-glevel",
            title: "G-Level Background Bands",
            body: "Colored background bands divide the chart into G0 through G5 regions. When a bar enters a higher band, it means geomagnetic storm conditions have intensified to that level.",
          },
        ],
      },
      {
        id: "kp-reading",
        title: "Reading the Chart",
        body: [
          "The X-axis shows time. The Y-axis shows the Kp index value (0-9). Each bar represents a 3-hour observation period. The chart also shows an estimated running Kp value.",
          "Hover over any bar to see the exact Kp value and time tag. Use the chart's zoom and pan features to examine specific time periods in detail.",
        ],
        subsections: [
          {
            id: "kp-reading-impacts",
            title: "Operational Impacts",
            body: "Kp >= 5 (G1+) can affect power grids and high-latitude navigation. Kp >= 7 (G3+) may cause widespread voltage regulation problems and HF radio propagation issues. Kp = 9 (G5) indicates an extreme geomagnetic storm with possible grid collapse risk.",
          },
        ],
      },
    ],
  },

  "X-Ray Flux": {
    title: "X-Ray Flux Chart",
    intro:
      "The X-ray flux chart shows solar X-ray emissions measured by the GOES satellite, indicating solar flare activity.",
    sections: [
      {
        id: "xray-what",
        title: "What X-Ray Flux Measures",
        body: [
          "Solar X-ray flux is measured in watts per square meter (W/m\u00B2) by GOES satellites in geostationary orbit. Elevated X-ray flux indicates a solar flare is occurring. The chart uses a logarithmic Y-axis because flux values span many orders of magnitude.",
          "Solar flare classes are determined by peak X-ray flux: A-class (< 10\u207B\u2077), B-class (10\u207B\u2077 to 10\u207B\u2076), C-class (10\u207B\u2076 to 10\u207B\u2075), M-class (10\u207B\u2075 to 10\u207B\u2074), and X-class (> 10\u207B\u2074).",
        ],
        subsections: [
          {
            id: "xray-what-rlevel",
            title: "R-Level Background Bands",
            body: "Colored background bands on the chart correspond to NOAA R-levels (radio blackout scale): R0 (no impact) through R5 (extreme radio blackout). These thresholds help you quickly assess the severity of any X-ray flux spikes.",
          },
        ],
      },
      {
        id: "xray-reading",
        title: "Reading the Chart",
        body: [
          "The chart shows two lines: the short-wavelength (0.05-0.4 nm) and long-wavelength (0.1-0.8 nm) X-ray flux channels. Spikes in these lines indicate solar flare events.",
          "Hover over the chart to see the exact flux value and timestamp. The flare class (A, B, C, M, or X) is typically indicated on the tooltip or label.",
        ],
        subsections: [
          {
            id: "xray-reading-impacts",
            title: "Operational Impacts",
            body: "M-class and above flares (R1+) can cause HF radio blackouts on the sunlit side of Earth, affecting aviation communication. X-class flares (R3+) can cause widespread radio blackouts lasting hours, along with navigation errors.",
          },
        ],
      },
    ],
  },

  "Proton Flux": {
    title: "Proton Flux Chart",
    intro:
      "The proton flux chart shows energetic proton levels measured by the GOES satellite, indicating solar radiation storm intensity.",
    sections: [
      {
        id: "proton-what",
        title: "What Proton Flux Measures",
        body: [
          "Solar energetic protons (SEPs) are accelerated by solar flares and coronal mass ejections. They are measured in particle flux units (pfu) at various energy thresholds (e.g., >=10 MeV, >=50 MeV, >=100 MeV). The chart uses a logarithmic Y-axis.",
          "When the >=10 MeV proton flux exceeds 10 pfu, NOAA declares an S1 (minor) solar radiation storm. Higher thresholds correspond to more severe S-levels.",
        ],
        subsections: [
          {
            id: "proton-what-slevel",
            title: "S-Level Background Bands",
            body: "Colored background bands show S0 through S5 thresholds. These help you identify when proton flux levels cross into solar radiation storm territory.",
          },
        ],
      },
      {
        id: "proton-reading",
        title: "Reading the Chart",
        body: [
          "The chart displays proton flux lines for different energy channels. Sharp rises typically follow major solar flares or CME arrivals and can persist for hours to days.",
          "Hover over the chart for exact values. Look for the flux to cross the S1 threshold line (10 pfu at >=10 MeV) to identify radiation storm events.",
        ],
        subsections: [
          {
            id: "proton-reading-impacts",
            title: "Operational Impacts",
            body: "S1+ events pose radiation risks for high-altitude and polar flights. S3+ events can cause single-event upsets in satellite electronics and elevated radiation doses for passengers on transpolar routes. S5 events are rare but can be dangerous for astronauts and may damage satellite hardware.",
          },
        ],
      },
    ],
  },

  "Time-window controls": {
    title: "Time-Window Controls",
    intro:
      "The time-window controls on the Analytics Dashboard let you select the period of data displayed on all charts.",
    sections: [
      {
        id: "time-controls",
        title: "Preset Ranges",
        body: [
          "A dropdown in the tab bar offers preset time ranges: 6 hours, 1 day, 3 days (default), and 7 days. Selecting a preset immediately re-fetches data for all visible charts.",
          "The preset calculates the start time relative to the current moment. For example, '3 days' shows data from 72 hours ago to now.",
        ],
        subsections: [
          {
            id: "time-controls-custom",
            title: "Custom Range",
            body: "Select 'Custom' to specify an exact start and end date/time. This lets you investigate specific events like a solar flare that occurred on a known date.",
          },
        ],
      },
    ],
  },

  "Comparing multiple plots": {
    title: "Comparing Multiple Plots",
    intro:
      "The 'All Plots' tab displays Kp Index, X-ray Flux, and Proton Flux charts stacked vertically for easy comparison.",
    sections: [
      {
        id: "comparing-all",
        title: "Side-by-Side Analysis",
        body: [
          "When using the 'All Plots' tab, all three charts share the same time window, making it easy to correlate events. For example, you can see how an X-ray flux spike (solar flare) is followed by a proton flux increase (radiation storm), which may later coincide with an elevated Kp index (geomagnetic storm).",
          "Scroll down to move between charts. Each chart independently supports zoom and pan.",
        ],
        subsections: [
          {
            id: "comparing-all-tips",
            title: "Correlation Tips",
            body: "Solar flares appear as sudden X-ray flux spikes. The associated proton flux enhancement typically arrives minutes to hours later. Geomagnetic storm effects (elevated Kp) usually follow 1-3 days after the flare, when the associated CME arrives at Earth.",
          },
        ],
      },
    ],
  },

  "Interpreting peaks, spikes, and trends": {
    title: "Interpreting Peaks, Spikes, and Trends",
    intro:
      "Understanding chart patterns helps you identify space-weather events and their potential impacts.",
    sections: [
      {
        id: "interpreting-xray",
        title: "X-Ray Flux Patterns",
        body: [
          "A sudden sharp spike in X-ray flux indicates a solar flare. The spike's peak determines the flare class (C, M, or X). Impulsive flares rise and fall quickly (minutes), while long-duration events can last hours and are more likely to be associated with CMEs.",
          "Multiple successive spikes indicate active regions on the Sun producing a series of flares.",
        ],
        subsections: [
          {
            id: "interpreting-xray-tips",
            title: "What to Watch For",
            body: "Pay attention to M- and X-class flares (entering R1+ bands). Long-duration M-class flares are particularly important as they often drive CMEs that cause geomagnetic storms days later.",
          },
        ],
      },
      {
        id: "interpreting-proton",
        title: "Proton Flux Patterns",
        body: [
          "A gradual rise in proton flux following a solar flare indicates a solar energetic particle (SEP) event. The rise time is typically 30 minutes to several hours. The flux may remain elevated for days.",
          "A sharp initial rise suggests a well-connected flare site (magnetically connected to Earth), while a slower rise may indicate particles arriving via a CME shock.",
        ],
        subsections: [
          {
            id: "interpreting-proton-tips",
            title: "What to Watch For",
            body: "Watch for the >=10 MeV channel crossing the 10 pfu threshold (S1 level). Also monitor the higher-energy channels (>=50 MeV, >=100 MeV) as these are more biologically hazardous.",
          },
        ],
      },
      {
        id: "interpreting-kp",
        title: "Kp Index Patterns",
        body: [
          "A rising Kp index indicates increasing geomagnetic activity. Sudden jumps often correspond to the arrival of a CME or a high-speed solar wind stream. Kp tends to stay elevated for 12-48 hours during a geomagnetic storm.",
          "Recurrent patterns at ~27-day intervals suggest high-speed streams from persistent coronal holes.",
        ],
        subsections: [
          {
            id: "interpreting-kp-tips",
            title: "What to Watch For",
            body: "Kp >= 5 (G1) means potential aurora at high latitudes and minor grid impacts. Kp >= 7 (G3) means significant operational impacts for aviation and power systems.",
          },
        ],
      },
    ],
  },

  "Exporting or downloading chart views": {
    title: "Exporting or Downloading Chart Views",
    intro:
      "The Analytics Dashboard provides multiple options for exporting chart data and images.",
    sections: [
      {
        id: "export-how",
        title: "How to Export",
        body: [
          "Click the download icon in the Analytics tab bar to open the download panel. The panel shows options for exporting data in various formats.",
          "Data exports include: CSV (spreadsheet-compatible), JSON (machine-readable), HTML (web-viewable table), and XML. Image exports include PNG and PDF format.",
        ],
        subsections: [
          {
            id: "export-how-scope",
            title: "Export Scope",
            body: "The export includes data for the currently active chart tab and the currently selected time range. If you are on the 'All Plots' tab, the export covers all three metrics.",
          },
        ],
      },
      {
        id: "export-settings",
        title: "Chart Settings for Export",
        body: [
          "Before exporting, you can adjust chart appearance via the settings panel (gear icon). Available options include: background band opacity, label box size, axis label size, and line border width.",
          "These visual settings affect both the on-screen display and exported images, so you can fine-tune the look of your charts before generating a report.",
        ],
        subsections: [
          {
            id: "export-settings-print",
            title: "Printing",
            body: "The download panel also includes a print option that opens your browser's print dialog, allowing you to print the current chart view directly.",
          },
        ],
      },
    ],
  },

  // ── Space Weather Terms ───────────────────────────────────────────────
  "Solar flares": {
    title: "Solar Flares",
    intro:
      "A solar flare is a sudden, intense burst of electromagnetic radiation from the Sun's atmosphere, typically associated with active regions and sunspots.",
    sections: [
      {
        id: "flare-basics",
        title: "What Is a Solar Flare",
        body: [
          "Solar flares occur when built-up magnetic energy in the solar atmosphere is suddenly released. They emit radiation across the entire electromagnetic spectrum, from radio waves to gamma rays, with the most significant impacts coming from X-ray and extreme ultraviolet (EUV) emissions.",
          "Flares are classified by their peak X-ray flux measured by GOES satellites: A-class (weakest), B-class, C-class, M-class, and X-class (strongest). Each class is ten times more powerful than the previous one.",
        ],
        subsections: [
          {
            id: "flare-basics-duration",
            title: "Duration",
            body: "Flares typically last from minutes to hours. The impulsive phase (rapid rise) may last 5-15 minutes, followed by a gradual decay phase. Long-duration flares (lasting over an hour) are more likely to produce coronal mass ejections.",
          },
        ],
      },
      {
        id: "flare-impacts",
        title: "Impacts",
        body: [
          "The primary impact of solar flares is on radio communications. The enhanced X-ray flux ionizes the D-region of the ionosphere, causing HF radio absorption (see DRAP). This affects aviation communication on the sunlit side of Earth within minutes of the flare.",
          "Strong flares can also cause GPS signal scintillation and navigation errors. The NOAA R-scale (R1-R5) quantifies the radio blackout severity caused by flares.",
        ],
        subsections: [
          {
            id: "flare-impacts-platform",
            title: "How This Platform Shows Flares",
            body: "Solar flares appear as spikes on the X-ray Flux chart in the Analytics Dashboard. The DRAP overlay on the map shows the resulting radio absorption pattern. The R-level indicators in the sidebar show the current radio blackout severity.",
          },
        ],
      },
    ],
  },

  "Coronal mass ejections": {
    title: "Coronal Mass Ejections (CMEs)",
    intro:
      "A coronal mass ejection (CME) is a large expulsion of magnetized plasma from the Sun's corona into the solar wind.",
    sections: [
      {
        id: "cme-basics",
        title: "What Is a CME",
        body: [
          "CMEs are massive clouds of solar plasma threaded with magnetic field lines that are ejected from the Sun. They can contain billions of tons of matter and travel at speeds ranging from 250 to over 3,000 km/s. When directed toward Earth, they typically arrive in 1-3 days.",
          "CMEs are often associated with solar flares and filament eruptions, but they are distinct phenomena. Not all flares produce CMEs, and not all CMEs are associated with flares.",
        ],
        subsections: [
          {
            id: "cme-basics-structure",
            title: "CME Structure",
            body: "A CME typically has three parts: a leading shock wave that compresses the solar wind ahead of it, a dense sheath of turbulent plasma, and a magnetic flux rope (the main body). The orientation of the magnetic field in the flux rope determines the severity of the resulting geomagnetic storm.",
          },
        ],
      },
      {
        id: "cme-impacts",
        title: "Impacts on Earth",
        body: [
          "When a CME's magnetic field has a strong southward component, it can reconnect with Earth's magnetic field and trigger a geomagnetic storm. This is the primary cause of G-level (Kp index) elevations seen on this platform.",
          "CME impacts include: geomagnetic storms (affecting power grids and navigation), enhanced aurora activity, radiation belt enhancements (affecting satellites), and ionospheric disturbances (affecting GPS and communications).",
        ],
        subsections: [
          {
            id: "cme-impacts-platform",
            title: "How This Platform Shows CME Effects",
            body: "CME effects appear as elevated Kp index values on the Analytics Dashboard, expanded aurora ovals on the map, and potentially enhanced geoelectric field intensity in the geoelectric overlay.",
          },
        ],
      },
    ],
  },

  "X-ray flux": {
    title: "X-Ray Flux",
    intro:
      "X-ray flux is the intensity of X-ray radiation from the Sun, measured in watts per square meter by the GOES satellite series.",
    sections: [
      {
        id: "xray-definition",
        title: "Definition",
        body: [
          "The GOES X-ray Sensor (XRS) measures solar X-ray flux in two wavelength bands: 0.05-0.4 nm (short channel) and 0.1-0.8 nm (long channel). The long channel is the primary indicator used for solar flare classification.",
          "Background X-ray flux varies with the solar cycle. During solar maximum, the background can be at C-class levels, while during solar minimum it may drop to A or B class.",
        ],
        subsections: [
          {
            id: "xray-definition-scale",
            title: "Flare Classification",
            body: "A: < 10\u207B\u2077 W/m\u00B2, B: 10\u207B\u2077 to 10\u207B\u2076, C: 10\u207B\u2076 to 10\u207B\u2075, M: 10\u207B\u2075 to 10\u207B\u2074, X: > 10\u207B\u2074. Each class has subdivisions (e.g., M1.0 to M9.9). An X10 flare is ten times more intense than X1.",
          },
        ],
      },
      {
        id: "xray-noaa-scale",
        title: "NOAA R-Scale",
        body: [
          "The NOAA Radio Blackout scale (R1-R5) is directly tied to peak X-ray flux: R1 (M1+), R2 (M5+), R3 (X1+), R4 (X10+), R5 (X20+). These levels appear as colored background bands on the X-ray Flux chart.",
        ],
        subsections: [
          {
            id: "xray-noaa-scale-impacts",
            title: "R-Scale Impacts",
            body: "R1: minor HF radio degradation. R2: limited HF blackout. R3: wide-area HF blackout for ~1 hour. R4: HF blackout for 1-2 hours, GPS degradation. R5: complete HF blackout for several hours on the sunlit side.",
          },
        ],
      },
    ],
  },

  "Proton flux": {
    title: "Proton Flux",
    intro:
      "Proton flux measures the intensity of high-energy protons from the Sun reaching Earth, measured in particle flux units (pfu) by the GOES satellites.",
    sections: [
      {
        id: "proton-definition",
        title: "Definition",
        body: [
          "Solar energetic protons are accelerated during solar flares and CME-driven shocks. The GOES satellites measure proton flux at several energy thresholds: >=10 MeV, >=50 MeV, and >=100 MeV. Higher-energy protons are less common but more penetrating and hazardous.",
          "A solar proton event (SPE) is declared when the >=10 MeV proton flux exceeds 10 particle flux units (pfu). SPEs can last from hours to several days.",
        ],
        subsections: [
          {
            id: "proton-definition-onset",
            title: "Event Onset",
            body: "Protons from flare-accelerated events can arrive at Earth within 15-60 minutes. CME shock-accelerated events produce a more gradual onset, with proton flux building over hours as the shock approaches Earth.",
          },
        ],
      },
      {
        id: "proton-noaa-scale",
        title: "NOAA S-Scale",
        body: [
          "The NOAA Solar Radiation Storm scale (S1-S5) is based on >=10 MeV proton flux: S1 (10 pfu), S2 (100 pfu), S3 (1,000 pfu), S4 (10,000 pfu), S5 (100,000 pfu). These thresholds appear as background bands on the Proton Flux chart.",
        ],
        subsections: [
          {
            id: "proton-noaa-scale-impacts",
            title: "S-Scale Impacts",
            body: "S1: minor impacts on HF radio in polar regions. S2: infrequent satellite single-event upsets. S3: elevated radiation risk for high-altitude flights, satellite anomalies. S4: significant radiation hazard. S5: unavoidable radiation hazard for astronauts, multiple satellite problems.",
          },
        ],
      },
    ],
  },

  "KP index": {
    title: "Kp Index",
    intro:
      "The Kp index is a global measure of geomagnetic disturbance, ranging from 0 (quiet) to 9 (extreme storm).",
    sections: [
      {
        id: "kp-definition",
        title: "Definition",
        body: [
          "The planetary K-index (Kp) is derived from 3-hour measurements at 13 ground-based magnetometer stations distributed around the world. Each station measures local magnetic field variations, which are standardized and averaged to produce the global Kp value.",
          "Kp is quasi-logarithmic: each unit represents a roughly doubling of geomagnetic disturbance amplitude. The scale runs from 0 to 9 in thirds (0o, 0+, 1-, 1o, 1+, ... 9-, 9o).",
        ],
        subsections: [
          {
            id: "kp-definition-estimated",
            title: "Estimated vs. Observed Kp",
            body: "NOAA provides both estimated real-time Kp and definitive (final) Kp values. Estimated values are available within minutes; definitive values are calculated days later from full station data. This platform uses estimated values for real-time monitoring.",
          },
        ],
      },
      {
        id: "kp-noaa-scale",
        title: "NOAA G-Scale",
        body: [
          "The NOAA Geomagnetic Storm scale (G1-G5) maps directly to Kp: G1 (Kp=5), G2 (Kp=6), G3 (Kp=7), G4 (Kp=8-9), G5 (Kp=9). These appear as colored background bands on the Kp Index chart.",
        ],
        subsections: [
          {
            id: "kp-noaa-scale-impacts",
            title: "G-Scale Impacts",
            body: "G1: weak power grid fluctuations, aurora visible at high latitudes. G2: voltage alarms in power systems, aurora at ~55\u00B0 latitude. G3: voltage correction needed, GPS degradation, aurora at ~50\u00B0. G4: widespread voltage instability, GPS disrupted for hours. G5: possible grid collapse, aurora at low latitudes.",
          },
        ],
      },
    ],
  },

  "Geomagnetic storms": {
    title: "Geomagnetic Storms",
    intro:
      "A geomagnetic storm is a temporary disturbance of Earth's magnetic field caused by a CME or high-speed solar wind stream interacting with the magnetosphere.",
    sections: [
      {
        id: "geomag-basics",
        title: "What Causes Geomagnetic Storms",
        body: [
          "Geomagnetic storms occur when the interplanetary magnetic field (IMF) carried by the solar wind has a sustained southward component. This allows magnetic reconnection at Earth's dayside magnetopause, injecting energy and particles into the magnetosphere.",
          "The main drivers are: coronal mass ejections (CMEs), which produce the most intense storms, and co-rotating interaction regions (CIRs) from high-speed solar wind streams emanating from coronal holes.",
        ],
        subsections: [
          {
            id: "geomag-basics-phases",
            title: "Storm Phases",
            body: "A geomagnetic storm typically has three phases: initial phase (sudden impulse from CME shock arrival), main phase (sustained southward IMF drives energy injection, Kp rises), and recovery phase (magnetosphere returns to quiet conditions over hours to days).",
          },
        ],
      },
      {
        id: "geomag-impacts",
        title: "Infrastructure Impacts",
        body: [
          "Geomagnetic storms induce electric currents (GIC) in long conductors like power lines, pipelines, and undersea cables. These geomagnetically induced currents can saturate power transformers, causing heating, increased reactive power demand, and in extreme cases, equipment damage and blackouts.",
          "Storms also expand the aurora oval to lower latitudes, affect satellite drag and orbits, degrade GPS accuracy, and disrupt HF radio propagation.",
        ],
        subsections: [
          {
            id: "geomag-impacts-platform",
            title: "How This Platform Shows Storms",
            body: "Geomagnetic storm impacts are visible through elevated Kp index values on the Analytics Dashboard, expanded aurora regions on the map, increased geoelectric field intensity in the geoelectric overlay, and their overlap with power-grid transmission lines.",
          },
        ],
      },
    ],
  },

  "Aurora activity": {
    title: "Aurora Activity",
    intro:
      "Aurora (northern lights / southern lights) are luminous displays caused by charged particles from the magnetosphere colliding with atmospheric gases.",
    sections: [
      {
        id: "aurora-basics",
        title: "How Aurora Forms",
        body: [
          "During geomagnetic activity, energetic electrons and protons are accelerated along magnetic field lines into the upper atmosphere. When they collide with oxygen and nitrogen molecules at altitudes of 90-300 km, they excite the atoms, which then emit light as they return to their ground state.",
          "Green aurora (557.7 nm) comes from oxygen at ~100-200 km altitude. Red aurora (630.0 nm) comes from oxygen at higher altitudes (>200 km). Purple/blue aurora comes from nitrogen.",
        ],
        subsections: [
          {
            id: "aurora-basics-oval",
            title: "The Aurora Oval",
            body: "Aurora typically occurs in an oval-shaped band around the geomagnetic poles. During quiet conditions, the oval sits at ~65-70\u00B0 geomagnetic latitude. During strong storms, it expands equatorward and aurora can be visible at much lower latitudes.",
          },
        ],
      },
      {
        id: "aurora-map",
        title: "Aurora on the Map",
        body: [
          "The aurora overlay on the map shows predicted aurora probability as a percentage. Green-to-red coloring indicates low-to-high probability of visible aurora. The data comes from NOAA's 30-minute aurora forecast model.",
          "Use the settings panel to filter by aurora probability range, focusing on regions where aurora is most likely to be visible.",
        ],
        subsections: [
          {
            id: "aurora-map-significance",
            title: "Significance for Aviation",
            body: "While aurora itself is harmless, the underlying particle precipitation causes ionospheric disturbances that can affect HF radio, GPS, and compass accuracy. The aurora oval is a proxy for where these impacts are most intense.",
          },
        ],
      },
    ],
  },

  "DRAP absorption": {
    title: "DRAP Absorption",
    intro:
      "DRAP (D-Region Absorption Prediction) estimates the absorption of high-frequency (HF) radio signals caused by enhanced ionization in the lowest layer of the ionosphere.",
    sections: [
      {
        id: "drap-basics",
        title: "How DRAP Works",
        body: [
          "When solar X-rays or energetic protons hit the atmosphere, they ionize the D-region of the ionosphere (60-90 km altitude). This increased electron density absorbs HF radio waves (3-30 MHz) passing through the region, reducing or eliminating long-range HF communication.",
          "The DRAP model, produced by NOAA/SWPC, takes real-time X-ray and proton flux data as input and outputs a global map of predicted HF absorption in decibels (dB) at a reference frequency.",
        ],
        subsections: [
          {
            id: "drap-basics-measurement",
            title: "Absorption Units",
            body: "DRAP values are given in decibels (dB). Values above ~1 dB begin to degrade HF communication. Values above ~5 dB cause significant communication difficulties. Values above ~10 dB represent a near-complete HF radio blackout in the affected region.",
          },
        ],
      },
      {
        id: "drap-map",
        title: "DRAP on the Map",
        body: [
          "On the map, DRAP is displayed as a colored grid overlaid on the sunlit hemisphere. Yellow cells indicate mild absorption, while red cells indicate severe absorption. The pattern is centered on the sub-solar point and affected by the solar zenith angle.",
          "Use the settings panel slider to filter which absorption levels are displayed, and the playback panel to scrub through historical DRAP snapshots.",
        ],
        subsections: [
          {
            id: "drap-map-aviation",
            title: "Aviation Significance",
            body: "DRAP is especially critical for oceanic and polar routes where aircraft rely on HF radio as the primary or backup communication method. High DRAP values along a planned route may require rerouting or switching to satellite communication.",
          },
        ],
      },
    ],
  },

  "Geoelectric field activity": {
    title: "Geoelectric Field Activity",
    intro:
      "The geoelectric field is the electric field induced at Earth's surface by geomagnetic disturbances, measured in millivolts per kilometer (mV/km).",
    sections: [
      {
        id: "geoelectric-basics",
        title: "How Geoelectric Fields Form",
        body: [
          "Rapidly varying geomagnetic fields during geomagnetic storms induce electric fields at Earth's surface through electromagnetic induction. The intensity depends on the rate of change of the magnetic field and the electrical conductivity of the underlying geology.",
          "Regions with resistive bedrock (like the Canadian Shield) experience stronger geoelectric fields than regions with conductive sedimentary layers. Coastal regions can also have enhanced fields due to the conductivity contrast between land and ocean.",
        ],
        subsections: [
          {
            id: "geoelectric-basics-gic",
            title: "Geomagnetically Induced Currents (GIC)",
            body: "Geoelectric fields drive currents through grounded conductors like power lines, pipelines, and railway tracks. In power grids, these geomagnetically induced currents (GIC) flow through transformer windings, potentially causing half-cycle saturation, overheating, and reactive power surges.",
          },
        ],
      },
      {
        id: "geoelectric-map",
        title: "Geoelectric Field on the Map",
        body: [
          "The geoelectric field overlay displays field magnitude on a logarithmic color scale from blue (weak) to red (intense). The data comes from NOAA's geoelectric field model.",
          "Overlay this layer with the power-grid transmission lines to visualize which high-voltage lines are in regions of elevated geoelectric field. This combination helps assess GIC risk for specific grid infrastructure.",
        ],
        subsections: [
          {
            id: "geoelectric-map-filtering",
            title: "Filtering",
            body: "The settings panel provides a logarithmic magnitude slider to focus on specific field intensity ranges. The count of visible grid cells is shown in real-time as you adjust the filter.",
          },
        ],
      },
    ],
  },
};

// ---------------------------------------------------------------------------
// Build pageContent from topicContent with a fallback for missing topics
// ---------------------------------------------------------------------------
const fallbackTopic = (title) => ({
  title,
  intro: `Help content for "${title}" is coming soon.`,
  sections: [
    {
      id: "placeholder",
      title: "Overview",
      body: ["Detailed information for this topic will be added in a future update."],
      subsections: [],
    },
  ],
});

export const pageContent = Object.fromEntries(
  helpNav.flatMap((group) =>
    group.items.map((item) => [
      item,
      topicContent[item] || fallbackTopic(item),
    ]),
  ),
);

export const openGroupsInitialState = Object.fromEntries(
  helpNav.map((group) => [group.label, true]),
);
