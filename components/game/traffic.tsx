'use client';

import { useMemo, useRef } from 'react';
import { CuboidCollider, RigidBody, useBeforePhysicsStep, type RapierRigidBody } from '@react-three/rapier';
import { Quaternion, Vector3 } from 'three';
import { Car } from './car';
import { ROADS, greenFor, type Simulation } from '@/lib/game/model';

type TrafficCar = { x: number; z: number; angle: number; speed: number; progress: number; route: number; offset: number };
const COLORS = ['#d6d9d6', '#6a818e', '#c4b4a0', '#304753', '#9ca6a5', '#bdb8a6'];
const ROUTES = [
  [[-68.4, 68.4], [-68.4, -68.4], [68.4, -68.4], [68.4, 68.4]],
  [[3.6, 140.4], [3.6, -140.4], [140.4, -140.4], [140.4, 140.4]],
  [[-140.4, 3.6], [-140.4, -140.4], [-3.6, -140.4], [-3.6, 3.6]],
];
function routePoint(routeIndex: number, progress: number) {
  const route = ROUTES[routeIndex];
  const lengths = route.map((p, i) => Math.hypot(route[(i + 1) % 4][0] - p[0], route[(i + 1) % 4][1] - p[1]));
  let remaining = ((progress % lengths.reduce((a, b) => a + b, 0)) + lengths.reduce((a, b) => a + b, 0)) % lengths.reduce((a, b) => a + b, 0);
  for (let i = 0; i < 4; i++) {
    if (remaining <= lengths[i]) {
      const p = route[i], next = route[(i + 1) % 4], t = remaining / lengths[i];
      return { x: p[0] + (next[0] - p[0]) * t, z: p[1] + (next[1] - p[1]) * t, angle: Math.atan2(-(next[0] - p[0]), -(next[1] - p[1])), corner: lengths[i] - remaining };
    } remaining -= lengths[i];
  }
  return { x: route[0][0], z: route[0][1], angle: 0, corner: 100 };
}

export function Traffic({ sim, count }: { sim: Simulation; count: number }) {
  const bodies = useRef<(RapierRigidBody | null)[]>([]);
  const cars = useMemo<TrafficCar[]>(() => Array.from({ length: count }, (_, i) => {
    const route = i % 3, progress = Math.floor(i / 3) * 110 + 32 + route * 20;
    return { ...routePoint(route, progress), progress, route, offset: i, speed: 0 };
  }), [count]);
  const quaternion = useMemo(() => new Quaternion(), []);
  const up = useMemo(() => new Vector3(0, 1, 0), []);
  useBeforePhysicsStep(() => {
    if (sim.paused) return;
    sim.time += 1 / 60;
    cars.forEach((car, i) => {
      const rb = bodies.current[i]; if (!rb) return;
      const dx = -Math.sin(car.angle), dz = -Math.cos(car.angle);
      const axis = Math.abs(dx) > 0.5 ? 'x' : 'z';
      const along = axis === 'x' ? car.x : car.z;
      const direction = axis === 'x' ? dx : dz;
      let targetSpeed = 7 + (i % 4) * 0.7;
      if (!greenFor(axis, sim.time)) {
        const ahead = ROADS.map(r => (r - along) * direction).filter(d => d > 9 && d < 26);
        if (ahead.length) targetSpeed = Math.min(targetSpeed, Math.max(0, (Math.min(...ahead) - 13) * 0.7));
      }
      const avoid = (x: number, z: number) => {
        const along = (x - car.x) * dx + (z - car.z) * dz;
        const across = Math.abs((x - car.x) * -dz + (z - car.z) * dx);
        if (along > 0 && along < 17 && across < 2.7) targetSpeed = Math.min(targetSpeed, Math.max(0, (along - 6.5) * 0.8));
      };
      avoid(sim.telemetry.x, sim.telemetry.z);
      cars.forEach((other, j) => { if (j !== i) avoid(other.x, other.z); });
      const point = routePoint(car.route, car.progress);
      if (point.corner < 10) targetSpeed = Math.min(targetSpeed, 4);
      car.speed += Math.max(-0.12, Math.min(0.04, targetSpeed - car.speed));
      car.progress += car.speed / 60;
      const next = routePoint(car.route, car.progress);
      car.x = next.x; car.z = next.z;
      const difference = Math.atan2(Math.sin(next.angle - car.angle), Math.cos(next.angle - car.angle));
      car.angle += difference * 0.07;
      rb.setNextKinematicTranslation({ x: car.x, y: 0.61, z: car.z });
      quaternion.setFromAxisAngle(up, car.angle); rb.setNextKinematicRotation(quaternion);
    });
  });
  return <>{cars.map((car, i) => <RigidBody key={i} ref={el => { bodies.current[i] = el; }} type="kinematicPosition" colliders={false} position={[car.x, 0.61, car.z]} rotation={[0, car.angle, 0]}>
    <CuboidCollider args={[1, 0.5, 2.25]} position={[0, 0.1, 0]} friction={0.5} restitution={0.05} />
    <Car color={COLORS[i % COLORS.length]} detailed={false} />
  </RigidBody>)}</>;
}
