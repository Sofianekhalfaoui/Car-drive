'use client';

import { useMemo } from 'react';
import { BufferGeometry, Float32BufferAttribute, type Group } from 'three';
import type { Ref } from 'react';

type Slice = [number, number, number, number];
function loft(slices: Slice[]) {
  const vertices: number[] = [];
  const points = slices.map(([z, width, bottom, top]) => [[-width, bottom, z], [width, bottom, z], [width, top, z], [-width, top, z]]);
  const quad = (a: number[], b: number[], c: number[], d: number[]) => vertices.push(...a, ...b, ...c, ...a, ...c, ...d);
  for (let i = 0; i < points.length - 1; i++) for (let j = 0; j < 4; j++) quad(points[i][j], points[i][(j + 1) % 4], points[i + 1][(j + 1) % 4], points[i + 1][j]);
  quad(points[0][3], points[0][2], points[0][1], points[0][0]);
  const end = points[points.length - 1]; quad(end[0], end[1], end[2], end[3]);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals(); return geometry;
}

export const WHEELS = [[-0.96, 0, -1.42], [0.96, 0, -1.42], [-0.96, 0, 1.39], [0.96, 0, 1.39]] as const;

export function Wheel({ side = 1, detailed = true }: { side?: number; detailed?: boolean }) {
  if (!detailed) return <group rotation={[0, 0, Math.PI / 2]}><mesh><cylinderGeometry args={[0.36, 0.36, 0.27, 10]} /><meshStandardMaterial color="#172027" roughness={0.9} /></mesh><mesh position={[0, side * -0.145, 0]}><cylinderGeometry args={[0.24, 0.24, 0.02, 10]} /><meshStandardMaterial color="#a4b0b6" metalness={0.6} roughness={0.4} /></mesh></group>;
  return <group rotation={[0, 0, Math.PI / 2]}>
    <mesh castShadow><cylinderGeometry args={[0.36, 0.36, 0.27, 16]} /><meshStandardMaterial color="#172027" roughness={0.95} /></mesh>
    <mesh position={[0, side * -0.142, 0]}><cylinderGeometry args={[0.265, 0.265, 0.02, 16]} /><meshStandardMaterial color="#87949c" metalness={0.85} roughness={0.25} /></mesh>
    <mesh position={[0, side * -0.156, 0]}><cylinderGeometry args={[0.21, 0.21, 0.025, 16]} /><meshStandardMaterial color="#26333c" metalness={0.6} roughness={0.4} /></mesh>
    {[0, 1, 2, 3, 4].map(i => <mesh key={i} position={[0, side * -0.174, 0]} rotation={[0, i * Math.PI / 5, 0]}><boxGeometry args={[0.045, 0.02, 0.46]} /><meshStandardMaterial color="#ced7dc" metalness={0.8} roughness={0.25} /></mesh>)}
    <mesh position={[0, side * -0.186, 0]}><cylinderGeometry args={[0.065, 0.065, 0.015, 12]} /><meshStandardMaterial color="#27343c" metalness={0.8} /></mesh>
  </group>;
}

export function Car({ color = '#287baf', wheels = true, bodyRef, brakeRef, detailed = true }: { color?: string; wheels?: boolean; bodyRef?: Ref<Group>; brakeRef?: Ref<Group>; detailed?: boolean }) {
  const body = useMemo(() => loft([[-2.3, 0.82, -0.18, 0.15], [-1.8, 1.02, -0.22, 0.33], [-0.9, 1.01, -0.22, 0.4], [1.5, 1.02, -0.22, 0.38], [2.25, 0.91, -0.12, 0.22]]), []);
  const glass = useMemo(() => loft([[-1.1, 0.84, 0.37, 0.4], [-0.35, 0.76, 0.4, 0.99], [0.8, 0.76, 0.4, 0.99], [1.5, 0.83, 0.37, 0.43]]), []);
  return <group ref={bodyRef}>
    <mesh geometry={body} castShadow receiveShadow><meshStandardMaterial color={color} metalness={0.4} roughness={0.23} /></mesh>
    <mesh geometry={glass} castShadow><meshStandardMaterial color="#20343f" metalness={0.65} roughness={0.14} /></mesh>
    <mesh position={[0, 1, 0.23]} castShadow><boxGeometry args={[1.54, 0.045, 1.22]} /><meshStandardMaterial color={color} metalness={0.7} roughness={0.25} /></mesh>
    <mesh position={[0, -0.1, -2.3]}><boxGeometry args={[1.3, 0.17, 0.04]} /><meshStandardMaterial color="#152029" /></mesh>
    <mesh position={[0, -0.13, 2.25]}><boxGeometry args={[1.55, 0.16, 0.06]} /><meshStandardMaterial color="#18232c" metalness={0.3} /></mesh>
    {[-1, 1].map(side => <group key={side}>
      <mesh position={[side * 0.66, 0.14, -2.245]} rotation={[0, side * -0.1, 0]}><boxGeometry args={[0.42, 0.075, 0.06]} /><meshStandardMaterial color="#e7f4f7" emissive="#d6edfa" emissiveIntensity={1.5} /></mesh>
      <mesh position={[side * 0.62, 0.14, 2.23]}><boxGeometry args={[0.57, 0.065, 0.055]} /><meshStandardMaterial color="#cf5446" emissive="#e95033" emissiveIntensity={0.8} /></mesh>
      <mesh position={[side * 1.055, 0.46, -0.65]} castShadow><boxGeometry args={[0.23, 0.13, 0.3]} /><meshStandardMaterial color={color} metalness={0.65} roughness={0.3} /></mesh>
      <mesh position={[side * 0.79, 0.7, 0.3]}><boxGeometry args={[0.045, 0.56, 0.065]} /><meshStandardMaterial color="#18242e" /></mesh>
      <mesh position={[side * 1.015, -0.13, 0]}><boxGeometry args={[0.045, 0.12, 2.7]} /><meshStandardMaterial color="#25333c" /></mesh>
      {detailed && <><mesh position={[side * 1.015, 0.24, 0.25]}><boxGeometry args={[0.025, 0.035, 0.22]} /><meshStandardMaterial color="#c5d0d5" metalness={0.9} /></mesh><mesh position={[side * 0.62, -0.21, 2.3]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.085, 0.085, 0.16, 12]} /><meshStandardMaterial color="#697780" metalness={0.9} /></mesh></>}
    </group>)}
    <mesh position={[0, 0.07, 2.295]}><boxGeometry args={[0.48, 0.12, 0.02]} /><meshStandardMaterial color="#d7dce0" /></mesh>
    <group ref={brakeRef} visible={false}>
      <mesh position={[0, 0.55, 1.42]}><boxGeometry args={[0.6, 0.04, 0.05]} /><meshBasicMaterial color="#ff593b" /></mesh>
      {[-0.62, 0.62].map(x => <mesh key={x} position={[x, 0.145, 2.27]}><boxGeometry args={[0.57, 0.07, 0.01]} /><meshBasicMaterial color="#ff593b" /></mesh>)}
    </group>
    {wheels && WHEELS.map(([x, , z], i) => <group key={i} position={[x, -0.24, z]}><Wheel side={Math.sign(x)} detailed={detailed} /></group>)}
  </group>;
}
