export const TOPBAR_HEIGHT = 68;
export const LEFT_SIDEBAR_WIDTH = 320;
export const RIGHT_SIDEBAR_WIDTH = 320;

const lorem =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.";
const lorem2 =
  "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";

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

export const pageContent = Object.fromEntries(
  helpNav.flatMap((group) =>
    group.items.map((item) => [
      item,
      {
        title: item,
        intro: `${lorem} ${lorem2}`,
        sections: [
          {
            id: "overview",
            title: "Overview",
            body: [`${lorem} ${lorem2}`, `${lorem2} ${lorem}`],
            subsections: [
              {
                id: "overview-purpose",
                title: "Purpose",
                body: `${lorem} ${lorem2}`,
              },
            ],
          },
          {
            id: "how-it-works",
            title: "How It Works",
            body: [`${lorem} ${lorem2}`, `${lorem} ${lorem}`],
            subsections: [
              {
                id: "how-it-works-flow",
                title: "Workflow",
                body: `${lorem2} ${lorem}`,
              },
            ],
          },
          {
            id: "setup-instructions",
            title: "Setup Instructions",
            body: [`${lorem2} ${lorem}`, `${lorem} ${lorem2}`],
            list: [
              "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
              "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
              "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
            ],
            subsections: [
              {
                id: "setup-prerequisites",
                title: "Prerequisites",
                body: `${lorem} ${lorem2}`,
              },
            ],
          },
          {
            id: "configuration",
            title: "Configuration",
            body: [`${lorem} ${lorem}`, `${lorem2} ${lorem2}`],
            note: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
            subsections: [
              {
                id: "configuration-defaults",
                title: "Defaults",
                body: `${lorem2} ${lorem}`,
              },
            ],
          },
          {
            id: "usage-tips",
            title: "Usage Tips",
            body: [`${lorem} ${lorem2}`, `${lorem2} ${lorem}`],
            subsections: [
              {
                id: "usage-tips-navigation",
                title: "Navigation",
                body: `${lorem2} ${lorem}`,
              },
            ],
          },
          {
            id: "troubleshooting",
            title: "Troubleshooting",
            body: [`${lorem2} ${lorem}`, `${lorem} ${lorem2}`],
            subsections: [
              {
                id: "troubleshooting-common-issues",
                title: "Common Issues",
                body: `${lorem} ${lorem2}`,
              },
            ],
          },
        ],
      },
    ]),
  ),
);

export const openGroupsInitialState = Object.fromEntries(helpNav.map((group) => [group.label, true]));