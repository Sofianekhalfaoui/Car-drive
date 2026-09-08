'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { PMREMGenerator } from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { City } from './city';
import { PlayerCar } from './player-car';
import { Traffic } from './traffic';
import type { Quality, Simulation } from '@/lib/game/model';

function Reflections() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const generator = new PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const environment = generator.fromScene(room, 0.04);
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.65;
    room.dispose(); generator.dispose();
    return () => { scene.environment = null; environment.dispose(); };
  }, [gl, scene]);
  return null;
}

function Ready({ onReady }: { onReady: () => void }) {
  useEffect(() => { onReady(); }, [onReady]);
  return null;
}
function AdaptiveResolution({ quality }: { quality: Quality }) {
  const setDpr = useThree(s => s.setDpr);
  const samples = useRef({ time: 0, frames: 0, level: 1 });
  useEffect(() => {
    const dpr = Math.min(window.devicePixelRatio, quality === 'low' ? 1 : quality === 'high' ? 1.75 : 1.35);
    samples.current = { time: 0, frames: 0, level: dpr }; setDpr(dpr);
  }, [quality, setDpr]);
  useFrame((_, dt) => {
    const s = samples.current; s.time += Math.min(dt, 0.2); s.frames++;
    if (s.time < 6) return;
    if (s.frames / s.time < 26 && s.level > 0.75) { s.level = Math.max(0.75, s.level - 0.2); setDpr(s.level); }
    s.time = 0; s.frames = 0;
  });
  return null;
}
export default function GameScene({ sim, paused, quality, onReady, onContextLost }: { sim: Simulation; paused: boolean; quality: Quality; onReady: () => void; onContextLost: () => void }) {
  const [renderError, setRenderError] = useState(false);
  if (renderError) return <div className="scene-message"><p>Graphics were interrupted.</p><button className="primary-action" onClick={() => window.location.reload()}>Restart the engine</button></div>;
  return <Canvas shadows={quality !== 'low' ? 'percentage' : false} dpr={1} camera={{ position: [3.7, 6.8, 40.5], fov: 56, near: 0.15, far: 390 }} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }} onCreated={({ gl }) => {
    const canvas = gl.domElement;
    canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); setRenderError(true); onContextLost(); }, { once: true });
  }} fallback={<div className="scene-message">Your browser does not support 3D graphics. Try an up-to-date Chrome or Safari.</div>}>
    <color attach="background" args={['#c3d3db']} />
    <fog attach="fog" args={['#c3d3db', 95, 300]} />
    <hemisphereLight args={['#e0edf3', '#777768', 2.3]} />
    <directionalLight position={[-55, 85, -35]} color="#fff1d5" intensity={3} castShadow={quality !== 'low'} shadow-mapSize={quality === 'high' ? [2048, 2048] : [1024, 1024]} shadow-camera-left={-95} shadow-camera-right={95} shadow-camera-top={95} shadow-camera-bottom={-95} shadow-camera-far={250} shadow-normalBias={0.06} shadow-bias={-0.0003} />
    <Reflections />
    <AdaptiveResolution quality={quality} />
    <Suspense fallback={null}>
      <Physics paused={paused} timeStep={1 / 60} gravity={[0, -9.81, 0]} interpolate>
        <City sim={sim} />
        <PlayerCar sim={sim} />
        <Traffic sim={sim} count={quality === 'low' ? 9 : quality === 'high' ? 21 : 15} />
        <Ready onReady={onReady} />
      </Physics>
    </Suspense>
  </Canvas>;
}
