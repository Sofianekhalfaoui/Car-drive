'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { CanvasTexture, Color, InstancedMesh, Object3D, RepeatWrapping, SRGBColorSpace, type Material } from 'three';
import { BUILDINGS, ROADS, WORLD_EDGE, greenFor, type Simulation } from '@/lib/game/model';

type Box = { p: [number, number, number]; s: [number, number, number]; r?: number; color?: string };
const dummy = new Object3D();
function Boxes({ items, color, material, shadow = false }: { items: Box[]; color?: string; material?: Material; shadow?: boolean }) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    items.forEach((item, i) => {
      dummy.position.set(...item.p); dummy.scale.set(...item.s); dummy.rotation.set(0, item.r || 0, 0); dummy.updateMatrix();
      ref.current!.setMatrixAt(i, dummy.matrix);
      if (item.color) ref.current!.setColorAt(i, new Color(item.color));
    });
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [items]);
  return <instancedMesh ref={ref} args={[undefined, undefined, items.length]} castShadow={shadow} receiveShadow material={material}>
    <boxGeometry />{!material && <meshStandardMaterial color={color || '#ffffff'} roughness={0.85} />}
  </instancedMesh>;
}

function facadeTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#a7b3b8'; ctx.fillRect(0, 0, 256, 512);
  for (let row = 0; row < 18; row++) {
    for (let col = 0; col < 8; col++) {
      const x = col * 32 + 5, y = row * 28 + 5;
      ctx.fillStyle = (row * 7 + col * 3) % 11 === 0 ? '#a8b8be' : '#435862';
      ctx.fillRect(x, y, 22, 19);
      ctx.fillStyle = '#6e8691'; ctx.fillRect(x + 1, y + 1, 20, 6);
      ctx.fillStyle = '#bdc7c9'; ctx.fillRect(x - 1, y + 20, 24, 2);
      ctx.fillStyle = '#354a53'; ctx.fillRect(x + 10, y, 1, 19);
    }
    ctx.fillStyle = '#899a9f'; ctx.fillRect(0, row * 28 + 26, 256, 1);
  }
  const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace; texture.anisotropy = 4; return texture;
}
function roadTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#626a6d'; ctx.fillRect(0, 0, 128, 128);
  let seed = 31;
  for (let i = 0; i < 7000; i++) {
    seed = (seed * 16807) % 2147483647; const x = seed % 128;
    seed = (seed * 16807) % 2147483647; const y = seed % 128;
    ctx.fillStyle = i % 2 ? '#697174' : '#586164'; ctx.fillRect(x, y, 1, 1);
  }
  const texture = new CanvasTexture(canvas); texture.wrapS = texture.wrapT = RepeatWrapping; texture.repeat.set(65, 65); texture.colorSpace = SRGBColorSpace; return texture;
}

export function City({ sim }: { sim: Simulation }) {
  const facade = useMemo(facadeTexture, []);
  const asphalt = useMemo(roadTexture, []);
  useEffect(() => () => { facade.dispose(); asphalt.dispose(); }, [facade, asphalt]);
  const parts = useMemo(() => {
    const sidewalks: Box[] = [], stripes: Box[] = [], yellow: Box[] = [], poles: Box[] = [], lamps: Box[] = [], trunks: Box[] = [], roofs: Box[] = [], shops: Box[] = [];
    const trees: [number, number, number][] = [];
    for (let x = -108; x <= 108; x += 72) for (let z = -108; z <= 108; z += 72) {
      sidewalks.push({ p: [x, 0.11, z], s: [55, 0.22, 55] });
      for (const side of [-1, 1]) for (const offset of [-18, 0, 18]) {
        trees.push([x + side * 25, 3.8, z + offset]);
        trunks.push({ p: [x + side * 25, 1.45, z + offset], s: [0.25, 2.5, 0.25] });
        poles.push({ p: [x + offset, 3.7, z + side * 26], s: [0.13, 7.2, 0.13] });
        poles.push({ p: [x + offset, 7.2, z + side * 27], s: [0.12, 0.12, 2.2] });
        lamps.push({ p: [x + offset, 7.15, z + side * 28], s: [0.45, 0.12, 1] });
      }
    }
    for (const road of ROADS) {
      for (let t = -172; t < 176; t += 6) {
        if (ROADS.some(r => Math.abs(r - t) < 10)) continue;
        for (const axis of [0, 1]) {
          const place = (offset: number, width: number, length: number, target: Box[]) => target.push({ p: axis ? [t, 0.022, road + offset] : [road + offset, 0.022, t], s: axis ? [length, 0.015, width] : [width, 0.015, length] });
          place(0.12, 0.08, 5.8, yellow); place(-0.12, 0.08, 5.8, yellow);
          place(7.3, 0.12, 6, stripes); place(-7.3, 0.12, 6, stripes);
          place(3.6, 0.1, 2.7, stripes); place(-3.6, 0.1, 2.7, stripes);
        }
      }
      for (const cross of ROADS) for (const side of [-1, 1]) for (let i = -6; i <= 6; i += 1.6) {
        stripes.push({ p: [road + i, 0.035, cross + side * 10], s: [0.8, 0.02, 2.3] });
        stripes.push({ p: [road + side * 10, 0.035, cross + i], s: [2.3, 0.02, 0.8] });
      }
    }
    BUILDINGS.forEach(b => {
      roofs.push({ p: [b.x, b.h + 0.18, b.z], s: [b.w + 0.5, 0.4, b.d + 0.5] });
      roofs.push({ p: [b.x + 2, b.h + 1, b.z], s: [3, 1.5, 4] });
      shops.push({ p: [b.x, 1.5, b.z], s: [b.w + 0.1, 2.5, b.d + 0.1] });
    });
    return { sidewalks, stripes, yellow, poles, lamps, trunks, roofs, shops, trees };
  }, []);
  return <>
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[WORLD_EDGE, 0.5, WORLD_EDGE]} position={[0, -0.5, 0]} friction={1} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[WORLD_EDGE * 2, WORLD_EDGE * 2]} /><meshStandardMaterial map={asphalt} roughness={1} /></mesh>
      {parts.sidewalks.map((b, i) => <CuboidCollider key={i} position={b.p} args={[b.s[0] / 2, 0.11, b.s[2] / 2]} />)}
      {BUILDINGS.map((b, i) => <CuboidCollider key={`b${i}`} position={[b.x, b.h / 2, b.z]} args={[b.w / 2, b.h / 2, b.d / 2]} />)}
      {[-1, 1].map(s => <group key={s}><CuboidCollider position={[s * WORLD_EDGE, 3, 0]} args={[1, 3, WORLD_EDGE]} /><CuboidCollider position={[0, 3, s * WORLD_EDGE]} args={[WORLD_EDGE, 3, 1]} /></group>)}
    </RigidBody>
    <Boxes items={parts.sidewalks} color="#b0b4b1" />
    <Boxes items={parts.stripes} color="#e2e2d7" />
    <Boxes items={parts.yellow} color="#cfc496" />
    <BuildingMeshes texture={facade} />
    <Boxes items={parts.roofs} color="#b9bdba" shadow />
    <Boxes items={parts.shops} color="#42565d" />
    <Boxes items={parts.poles} color="#4e5d60" shadow />
    <Boxes items={parts.lamps} color="#d5d5c0" />
    <Boxes items={parts.trunks} color="#727362" />
    <TreeCrowns positions={parts.trees} />
    <Signals sim={sim} />
    <Boxes items={[-1, 1].flatMap(s => [{ p: [s * WORLD_EDGE, 0.5, 0] as [number, number, number], s: [1, 1, WORLD_EDGE * 2] as [number, number, number] }, { p: [0, 0.5, s * WORLD_EDGE] as [number, number, number], s: [WORLD_EDGE * 2, 1, 1] as [number, number, number] }])} color="#aaaead" />
  </>;
}

function BuildingMeshes({ texture }: { texture: CanvasTexture }) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const colors = ['#bbc0be', '#96a8b3', '#c7b9a5', '#97a1a0'];
    BUILDINGS.forEach((b, i) => {
      dummy.position.set(b.x, b.h / 2, b.z); dummy.scale.set(b.w, b.h, b.d); dummy.rotation.set(0, 0, 0); dummy.updateMatrix();
      ref.current!.setMatrixAt(i, dummy.matrix); ref.current!.setColorAt(i, new Color(colors[b.variant]));
    });
    ref.current!.instanceMatrix.needsUpdate = true; ref.current!.computeBoundingSphere();
  }, []);
  return <instancedMesh ref={ref} args={[undefined, undefined, BUILDINGS.length]} castShadow receiveShadow><boxGeometry /><meshStandardMaterial map={texture} roughness={0.62} metalness={0.12} /></instancedMesh>;
}
function TreeCrowns({ positions }: { positions: [number, number, number][] }) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    positions.forEach((p, i) => {
      dummy.position.set(...p); dummy.scale.set(1.7, 2.5 + (i % 3) * 0.3, 1.7); dummy.rotation.set(0, i, 0); dummy.updateMatrix();
      ref.current!.setMatrixAt(i, dummy.matrix); ref.current!.setColorAt(i, new Color(i % 3 === 0 ? '#75805a' : '#5e775f'));
    }); ref.current!.instanceMatrix.needsUpdate = true; ref.current!.computeBoundingSphere();
  }, [positions]);
  return <instancedMesh ref={ref} args={[undefined, undefined, positions.length]} castShadow><icosahedronGeometry args={[1, 1]} /><meshStandardMaterial roughness={1} /></instancedMesh>;
}
function Signals({ sim }: { sim: Simulation }) {
  const lights = useRef<InstancedMesh>(null);
  const data = useMemo(() => ROADS.flatMap(x => ROADS.flatMap(z => [{ p: [x + 8.5, 4.1, z + 8.5] as [number, number, number], axis: 'z' as const }, { p: [x - 8.5, 4.1, z - 8.5] as [number, number, number], axis: 'z' as const }, { p: [x - 8.5, 4.1, z + 8.5] as [number, number, number], axis: 'x' as const }, { p: [x + 8.5, 4.1, z - 8.5] as [number, number, number], axis: 'x' as const } ])), []);
  const poles = useMemo(() => data.flatMap(d => [{ p: [d.p[0], 2, d.p[2]] as [number, number, number], s: [0.1, 4, 0.1] as [number, number, number] }, { p: d.p, s: [0.3, 0.8, 0.3] as [number, number, number] }]), [data]);
  const green = useMemo(() => new Color('#83cbbc'), []), red = useMemo(() => new Color('#ed865d'), []);
  const previous = useRef(-1);
  useFrame(() => {
    const phase = Math.floor(sim.time);
    if (!lights.current || previous.current === phase) return;
    previous.current = phase;
    data.forEach((d, i) => {
      dummy.position.set(...d.p); dummy.scale.setScalar(0.15); dummy.rotation.set(0, 0, 0); dummy.updateMatrix();
      lights.current!.setMatrixAt(i, dummy.matrix); lights.current!.setColorAt(i, greenFor(d.axis, sim.time) ? green : red);
    });
    lights.current.instanceMatrix.needsUpdate = true;
    if (lights.current.instanceColor) lights.current.instanceColor.needsUpdate = true;
    lights.current.computeBoundingSphere();
  });
  return <><Boxes items={poles} color="#394c53" /><instancedMesh ref={lights} args={[undefined, undefined, data.length]}><sphereGeometry args={[1, 8, 6]} /><meshBasicMaterial /></instancedMesh></>;
}
