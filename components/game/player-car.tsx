'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CuboidCollider, RigidBody, useBeforePhysicsStep, useRapier, type RapierRigidBody } from '@react-three/rapier';
import { Group, Quaternion, Vector3 } from 'three';
import { Car, Wheel, WHEELS } from './car';
import { SPAWN, type Simulation } from '@/lib/game/model';

type Controller = ReturnType<ReturnType<typeof useRapier>['world']['createVehicleController']>;

export function PlayerCar({ sim }: { sim: Simulation }) {
  const body = useRef<RapierRigidBody>(null);
  const controller = useRef<Controller | null>(null);
  const wheels = useRef<(Group | null)[]>([]);
  const brakes = useRef<Group>(null);
  const { world } = useRapier();
  const resetId = useRef(0);
  const steering = useRef(0);
  const startedCamera = useRef(false);
  const vectors = useMemo(() => ({ q: new Quaternion(), offset: new Vector3(), target: new Vector3(), forward: new Vector3(), camera: new Vector3(), up: new Vector3() }), []);
  const distance = useRef(0);

  useEffect(() => {
    if (!body.current) return;
    const vehicle = world.createVehicleController(body.current);
    vehicle.indexUpAxis = 1;
    vehicle.setIndexForwardAxis = 2;
    WHEELS.forEach(([x, , z], i) => {
      vehicle.addWheel({ x, y: 0, z }, { x: 0, y: -1, z: 0 }, { x: -1, y: 0, z: 0 }, 0.38, 0.36);
      vehicle.setWheelSuspensionStiffness(i, 28);
      vehicle.setWheelSuspensionCompression(i, 4.4);
      vehicle.setWheelSuspensionRelaxation(i, 5.2);
      vehicle.setWheelMaxSuspensionTravel(i, 0.22);
      vehicle.setWheelMaxSuspensionForce(i, 14000);
      vehicle.setWheelFrictionSlip(i, 2.1);
      vehicle.setWheelSideFrictionStiffness(i, 1.15);
    });
    controller.current = vehicle;
    return () => { controller.current = null; world.removeVehicleController(vehicle); };
  }, [world]);

  useBeforePhysicsStep(() => {
    const rb = body.current, vehicle = controller.current;
    if (!rb || !vehicle || sim.paused) return;
    const dt = 1 / 60;
    const velocity = rb.linvel();
    const speed = Math.hypot(velocity.x, velocity.z);
    const input = sim.input;
    const maxSpeed = input.reverse ? 8 : 36;
    steering.current += (((Number(input.left) - Number(input.right)) * (0.48 / (1 + speed * 0.043))) - steering.current) * 0.12;
    for (let i = 0; i < 4; i++) {
      vehicle.setWheelSteering(i, i < 2 ? steering.current : 0);
      vehicle.setWheelEngineForce(i, input.throttle && speed < maxSpeed ? (input.reverse ? -1 : 1) * 1950 * (1 - speed / (maxSpeed * 1.2)) : 0);
      vehicle.setWheelBrake(i, input.brake ? 110 : !input.throttle && speed < 0.4 ? 18 : 0);
    }
    vehicle.updateVehicle(dt);
    rb.applyImpulse({ x: -velocity.x * speed * 0.46 * dt, y: 0, z: -velocity.z * speed * 0.46 * dt }, true);
    distance.current += speed * dt;
  });

  useFrame(({ camera }, rawDelta) => {
    const rb = body.current; if (!rb) return;
    const dt = Math.min(rawDelta, 0.05);
    if (resetId.current !== sim.reset) {
      resetId.current = sim.reset;
      rb.setTranslation(SPAWN, true); rb.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true); rb.setAngvel({ x: 0, y: 0, z: 0 }, true);
      steering.current = 0; startedCamera.current = false;
    }
    const p = rb.translation(), r = rb.rotation(), velocity = rb.linvel();
    const speed = Math.hypot(velocity.x, velocity.z);
    vectors.q.set(r.x, r.y, r.z, r.w);
    vectors.forward.set(0, 0, -1).applyQuaternion(vectors.q);
    const heading = Math.atan2(-vectors.forward.x, -vectors.forward.z);
    Object.assign(sim.telemetry, { speed: Math.round(speed * 3.6), x: p.x, z: p.z, heading, distance: distance.current / 1000, gear: sim.input.reverse ? 'R' : speed < 0.4 && !sim.input.throttle ? 'N' : String(Math.min(6, Math.floor(speed / 7) + 1)), rpm: speed < 0.4 ? 0.12 : 0.22 + (speed % 7) / 10 });
    if (brakes.current) brakes.current.visible = sim.input.brake;
    const vehicle = controller.current;
    wheels.current.forEach((wheel, i) => {
      if (!wheel || !vehicle) return;
      wheel.position.y = -(vehicle.wheelSuspensionLength(i) ?? 0.3);
      wheel.rotation.y = i < 2 ? steering.current : 0;
      if (wheel.children[0]) wheel.children[0].rotation.x = vehicle.wheelRotation(i) ?? 0;
    });
    if (sim.camera === 1) {
      vectors.offset.set(0, 1.65, -0.55).applyQuaternion(vectors.q);
      vectors.camera.set(p.x, p.y, p.z).add(vectors.offset);
      vectors.target.set(p.x, p.y + 1.2, p.z).addScaledVector(vectors.forward, 22);
    } else {
      vectors.offset.set(0, 4.6 + speed * 0.015, 11.5 + speed * 0.06).applyQuaternion(vectors.q);
      vectors.camera.set(p.x, Math.max(p.y, 0.6), p.z).add(vectors.offset);
      vectors.camera.y = Math.max(3, vectors.camera.y);
      vectors.target.set(p.x, p.y + 0.7, p.z).addScaledVector(vectors.forward, 0.7);
    }
    camera.position.lerp(vectors.camera, startedCamera.current ? 1 - Math.exp(-5 * dt) : 1);
    camera.lookAt(vectors.target); startedCamera.current = true;
  });

  return <RigidBody ref={body} position={[SPAWN.x, SPAWN.y, SPAWN.z]} colliders={false} linearDamping={0.1} angularDamping={2.2} ccd canSleep={false} onCollisionEnter={() => { if (sim.telemetry.speed > 12) sim.telemetry.collision = sim.time; }}>
    <CuboidCollider args={[0.93, 0.3, 2.12]} position={[0, 0.06, 0]} mass={1150} friction={0.45} restitution={0.08} />
    <Car wheels={false} brakeRef={brakes} />
    {WHEELS.map(([x, , z], i) => <group ref={el => { wheels.current[i] = el; }} key={i} position={[x, -0.3, z]}><group><Wheel side={Math.sign(x)} /></group></group>)}
  </RigidBody>;
}
