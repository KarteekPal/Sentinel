// server/mockData.ts
// Rowan University shuttle routes with realistic waypoints

export interface MockShuttle {
  id: string;
  name: string;
  route: string;
  color: string;
  waypoints: [number, number][];
  speed: number; // seconds per waypoint
}

export const MOCK_SHUTTLES: MockShuttle[] = [
  {
    id: "mock-1",
    name: "Blue Route",
    route: "Blue",
    color: "#00e5ff",
    speed: 8,
    waypoints: [
      [39.7107, -75.1263],
      [39.7115, -75.1255],
      [39.7122, -75.1240],
      [39.7130, -75.1228],
      [39.7125, -75.1215],
      [39.7118, -75.1220],
      [39.7110, -75.1235],
      [39.7098, -75.1248],
      [39.7090, -75.1260],
      [39.7095, -75.1272],
      [39.7105, -75.1275],
      [39.7107, -75.1263],
    ],
  },
  {
    id: "mock-2",
    name: "Gold Route",
    route: "Gold",
    color: "#ffd700",
    speed: 10,
    waypoints: [
      [39.7095, -75.1280],
      [39.7085, -75.1268],
      [39.7078, -75.1255],
      [39.7082, -75.1240],
      [39.7092, -75.1232],
      [39.7102, -75.1238],
      [39.7112, -75.1250],
      [39.7108, -75.1265],
      [39.7098, -75.1275],
      [39.7095, -75.1280],
    ],
  },
  {
    id: "mock-3",
    name: "Green Route",
    route: "Green",
    color: "#00ff88",
    speed: 12,
    waypoints: [
      [39.7120, -75.1290],
      [39.7128, -75.1278],
      [39.7135, -75.1265],
      [39.7140, -75.1250],
      [39.7135, -75.1235],
      [39.7125, -75.1230],
      [39.7115, -75.1242],
      [39.7110, -75.1258],
      [39.7115, -75.1275],
      [39.7120, -75.1290],
    ],
  },
];

export interface ShuttleState {
  id: string;
  name: string;
  route: string;
  color: string;
  lat: number;
  lon: number;
  waypointIndex: number;
  ticksSinceLastMove: number;
}

export function initMockState(): ShuttleState[] {
  return MOCK_SHUTTLES.map((s, i) => ({
    id: s.id,
    name: s.name,
    route: s.route,
    color: s.color,
    lat: s.waypoints[0][0],
    lon: s.waypoints[0][1],
    waypointIndex: i * 3,
    ticksSinceLastMove: 0,
  }));
}

export function tickMockShuttles(
  states: ShuttleState[],
  tick: number
): ShuttleState[] {
  return states.map((state, i) => {
    const shuttle = MOCK_SHUTTLES[i];
    const shouldMove = tick % shuttle.speed === 0;

    if (!shouldMove) {
      return { ...state, ticksSinceLastMove: state.ticksSinceLastMove + 1 };
    }

    const nextIndex = (state.waypointIndex + 1) % shuttle.waypoints.length;
    const [lat, lon] = shuttle.waypoints[nextIndex];

    const jitter = () => (Math.random() - 0.5) * 0.0001;

    return {
      ...state,
      lat: lat + jitter(),
      lon: lon + jitter(),
      waypointIndex: nextIndex,
      ticksSinceLastMove: 0,
    };
  });
}