// ── Page layout ──────────────────────────────────────────────────────────────
export const TOTAL_SECTIONS = 2; // number of fullpage sections
export const TRANSITION_MS = 700; // section crossfade duration (ms)

// ── Mission canvas — Sun & rays ───────────────────────────────────────────────
export const SUN_X_FRAC = 1.08; // sun X as fraction of canvas width (>1 = off-screen right)
export const SUN_Y_FRAC = -0.08; // sun Y as fraction of canvas height (<0 = off-screen top)
export const RAY_COUNT = 9; // number of solar ray ribbons
export const RAY_SPREAD = 0.3; // total angular spread of rays (radians)
export const RAY_LEN_FRAC = 0.9; // ray length as fraction of canvas width
export const RAY_OPACITY_BASE = 0.04; // base opacity of rays
export const RAY_OPACITY_PULSE = 0.025; // oscillation amplitude

// ── Mission canvas — Earth ────────────────────────────────────────────────────
export const EARTH_X_FRAC = 0.32; // Earth centre X fraction
export const EARTH_Y_FRAC = 0.52; // Earth centre Y fraction
export const EARTH_R_FRAC = 0.21; // Earth radius as fraction of min(W,H)

// ── Mission canvas — Vehicles ─────────────────────────────────────────────────
export const VEHICLE_TRAIL_LEN = 160; // frames of contrail history
export const VEHICLE_PLANE_SPEED = 1.0; // multiplier on all plane angSpeeds
export const VEHICLE_SAT_SPEED = 1.0; // multiplier on all satellite angSpeeds
export const VEHICLE_CAM_ELEV = 0.52; // camera elevation tilt in radians (~30°)
export const VEHICLE_PLANE_ORBIT = 1.22; // plane orbit radius as multiple of earthR
export const VEHICLE_SAT_ORBIT_MIN = 1.58; // innermost satellite orbit
export const VEHICLE_SAT_ORBIT_MAX = 1.9; // outermost satellite orbit

// ── Mission canvas — Particles (solar wind streaks) ───────────────────────────
export const PARTICLE_COUNT = 120; // Earth-directed solar wind streaks
export const PARTICLE_FREE_COUNT = 30; // omnidirectional free particles
export const PARTICLE_SPEED_MIN = 0.0004;
export const PARTICLE_SPEED_MAX = 0.0012;

// ── Mission canvas — Parallax ────────────────────────────────────────────────
export const PARALLAX_STAR_STR = 12; // px stars move per 0.5 cursor offset
export const PARALLAX_MID_STR = 5; // px sun/corona move
export const PARALLAX_NEAR_STR = 2; // px Earth+vehicles move

// ── Mission canvas — Stars ────────────────────────────────────────────────────
export const STAR_COUNT = 280;

// ── Team section — Particle field ────────────────────────────────────────────
export const PARTICLE_FIELD_COUNT = 360; // total particles
export const PARTICLE_FIELD_SOLAR_RATIO = 0.38; // fraction that are orange (solar data)
export const PARTICLE_FIELD_BG = "#010308"; // background colour
export const PARTICLE_FIELD_ATTRACT = 0.0012; // pull strength toward centre
export const PARTICLE_FIELD_REPEL_RADIUS = 140; // px radius of cursor repulsion
export const PARTICLE_FIELD_REPEL_STR = 0.3; // repulsion force strength
export const PARTICLE_FIELD_CONNECT_DIST = 100; // px — max distance for connection lines

// ── Cards ─────────────────────────────────────────────────────────────────────
export const CARD_FLIP_DURATION_MS = 600; // card Y-axis flip duration
export const CARD_STAGGER_DELAY_MS = 70; // ms between each card's entry animation
export const CARD_SUPERVISOR_HEIGHT = 220; // px — fixed card height for supervisors
export const CARD_DEVELOPER_HEIGHT = 192; // px — fixed card height for developers

export const SUPERVISORS = [
  {
    id: 1,
    name: "Prof. Bernard Schmidt",
    title: "Project Supervisor",
    description: "To Be Added.",
    image:
      "https://ui-avatars.com/api/?name=Bernard+Schmidt&background=1976d2&color=fff&size=300",
    github: "https://github.com",
    linkedin: "https://linkedin.com",
  },
  {
    id: 2,
    name: "Prof. Edward J. Oughton",
    title: "Project Supervisor",
    description: "To Be Added.",
    image:
      "https://ui-avatars.com/api/?name=Edward+Oughton&background=1976d2&color=fff&size=300",
    github: "https://github.com",
    linkedin: "https://linkedin.com",
  },
  {
    id: 3,
    name: "Prof. Lance Sherry",
    title: "Project Supervisor",
    description: "To Be Added.",
    image:
      "https://ui-avatars.com/api/?name=Lance+Sherry&background=1976d2&color=fff&size=300",
    github: "https://github.com",
    linkedin: "https://linkedin.com",
  },
];

export const DEVELOPERS = [
  {
    id: 1,
    name: "Akshay Kumar Vengala",
    title: "Developer",
    description: "To Be Added.",
    image:
      "https://ui-avatars.com/api/?name=Akshay+Vengala&background=1976d2&color=fff&size=300",
    github: "https://github.com",
    linkedin: "https://linkedin.com",
  },
  {
    id: 2,
    name: "Cheng Hsun Hsu",
    title: "Developer",
    description: "To Be Added.",
    image:
      "https://ui-avatars.com/api/?name=Cheng+Hsun+Hsu&background=1976d2&color=fff&size=300",
    github: "https://github.com",
    linkedin: "https://linkedin.com",
  },
  {
    id: 3,
    name: "Phong Nguyen",
    title: "Developer",
    description: "To Be Added.",
    image:
      "https://ui-avatars.com/api/?name=Phong+Nguyen&background=1976d2&color=fff&size=300",
    github: "https://github.com",
    linkedin: "https://linkedin.com",
  },
  {
    id: 4,
    name: "Rohit Annepu",
    title: "Developer",
    description: "To Be Added.",
    image:
      "https://ui-avatars.com/api/?name=Rohit+Annepu&background=1976d2&color=fff&size=300",
    github: "https://github.com",
    linkedin: "https://linkedin.com",
  },
  {
    id: 5,
    name: "Tarundeep KrishnaKumar",
    title: "Developer",
    description: "To Be Added.",
    image:
      "https://ui-avatars.com/api/?name=Tarundeep+KrishnaKumar&background=1976d2&color=fff&size=300",
    github: "https://github.com",
    linkedin: "https://linkedin.com",
  },
  {
    id: 6,
    name: "Varsha Ponnaganti",
    title: "Developer",
    description: "To Be Added.",
    image:
      "https://ui-avatars.com/api/?name=Varsha+Ponnaganti&background=1976d2&color=fff&size=300",
    github: "https://github.com",
    linkedin: "https://linkedin.com",
  },
];
