export const ROADS = [-144, -72, 0, 72, 144];
export const WORLD_EDGE = 178;
export const SPAWN = { x: 3.7, y: 0.7, z: 29 };
export type Quality = 'low' | 'balanced' | 'high';
export type Control = 'left' | 'right' | 'throttle' | 'brake';
export type InputState = Record<Control, boolean> & { reverse: boolean };
export type Telemetry = { speed: number; distance: number; x: number; z: number; heading: number; gear: string; rpm: number; collision: number };
export type Simulation = { input: InputState; paused: boolean; started: boolean; camera: number; reset: number; time: number; telemetry: Telemetry };
export function makeSimulation(): Simulation {
  return { input: { left: false, right: false, throttle: false, brake: false, reverse: false }, paused: true, started: false, camera: 0, reset: 0, time: 0, telemetry: { speed: 0, distance: 0, x: SPAWN.x, z: SPAWN.z, heading: 0, gear: 'N', rpm: 0, collision: -10 } };
}
export function clearInput(sim: Simulation) {
  sim.input.left = sim.input.right = sim.input.throttle = sim.input.brake = false;
}
export function district(x: number, z: number) {
  if (x < -45) return 'Arts Quarter';
  if (x > 75) return 'Eastside';
  if (z < -60) return 'Financial District';
  if (z > 75) return 'Garden District';
  return 'Downtown';
}
export function greenFor(axis: 'x' | 'z', time: number) {
  const phase = time % 24;
  return axis === 'z' ? phase < 10 : phase >= 12 && phase < 22;
}
export type Building = { x: number; z: number; w: number; d: number; h: number; variant: number };
export const BUILDINGS: Building[] = [];
let seed = 617;
function random() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
for (let bx = 0; bx < 4; bx++) {
  for (let bz = 0; bz < 4; bz++) {
    const cx = -108 + bx * 72, cz = -108 + bz * 72;
    for (let sx = -1; sx <= 1; sx += 2) {
      for (let sz = -1; sz <= 1; sz += 2) {
        BUILDINGS.push({ x: cx + sx * 15, z: cz + sz * 15, w: 19 + random() * 5, d: 19 + random() * 5, h: 12 + random() * (bz < 2 ? 40 : 23), variant: Math.floor(random() * 4) });
      }
    }
  }
}
