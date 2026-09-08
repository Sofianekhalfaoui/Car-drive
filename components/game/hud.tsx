'use client';

import { useEffect, useRef, useState } from 'react';
import { Compass, Navigation, Route, CircleGauge } from 'lucide-react';
import { BUILDINGS, ROADS, district, type Simulation } from '@/lib/game/model';

export function Hud({ sim }: { sim: Simulation }) {
  const [data, setData] = useState({ ...sim.telemetry });
  useEffect(() => { const timer = setInterval(() => setData({ ...sim.telemetry }), 100); return () => clearInterval(timer); }, [sim]);
  return <>
    <div className="location-indicator"><span className="status-dot" /><span>FREE ROAM</span><span className="location-divider" /><span className="district-name">{district(data.x, data.z)}</span></div>
    <div className="world-caption"><span className="world-caption-line" /><span>NO DESTINATION. JUST DRIVE.</span></div>
    <section className="minimap-panel" aria-label={`City minimap. Current district: ${district(data.x, data.z)}`}>
      <div className="map-label"><Navigation size={14} /><span>{district(data.x, data.z)}</span><span className="north">N</span></div>
      <Minimap sim={sim} />
      <div className="map-footer"><span className="status-dot" />LIVE TRAFFIC<Compass size={14} /></div>
    </section>
    <section className="speedometer" aria-label="Vehicle instruments" data-x={data.x.toFixed(2)} data-z={data.z.toFixed(2)} data-heading={data.heading.toFixed(3)}>
      <div className="rpm-track" aria-hidden="true">{Array.from({ length: 26 }, (_, i) => <i key={i} className={i < data.rpm * 26 ? 'lit' : ''} />)}</div>
      <div className="speed-readout"><span className="speed-value font-mono" data-testid="speed">{String(data.speed).padStart(2, '0')}</span><div className="speed-unit"><span>KM/H</span><span className="gear-value font-mono">{data.gear}<small>GEAR</small></span></div></div>
      <div className="speed-bottom"><span><Route size={14} /><span data-testid="distance">{data.distance.toFixed(2)}</span> km</span><span><CircleGauge size={14} />AUTOMATIC</span></div>
    </section>
    <div className="drive-status"><span className="status-dot" /><span>{sim.time - data.collision < 1.5 ? 'Collision · brake and recover' : 'CITY DRIVE'}</span></div>
  </>;
}

function Minimap({ sim }: { sim: Simulation }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const draw = () => {
      const size = 300, scale = 0.75;
      ctx.clearRect(0, 0, size, size); ctx.fillStyle = '#15232d'; ctx.fillRect(0, 0, size, size);
      ctx.save(); ctx.translate(size / 2, size / 2);
      ctx.scale(scale, scale); ctx.translate(-sim.telemetry.x, -sim.telemetry.z);
      ctx.fillStyle = '#25343e';
      BUILDINGS.forEach(b => ctx.fillRect(b.x - b.w / 2, b.z - b.d / 2, b.w, b.d));
      ctx.strokeStyle = '#50616c'; ctx.lineWidth = 11;
      ROADS.forEach(r => { ctx.beginPath(); ctx.moveTo(r, -178); ctx.lineTo(r, 178); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-178, r); ctx.lineTo(178, r); ctx.stroke(); });
      ctx.strokeStyle = '#7d919d'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
      ROADS.forEach(r => { ctx.beginPath(); ctx.moveTo(r, -178); ctx.lineTo(r, 178); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-178, r); ctx.lineTo(178, r); ctx.stroke(); });
      ctx.restore(); ctx.save(); ctx.translate(size / 2, size / 2); ctx.rotate(-sim.telemetry.heading);
      ctx.shadowColor = '#50c9f5'; ctx.shadowBlur = 16; ctx.fillStyle = '#50c9f5'; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(9, 10); ctx.lineTo(0, 6); ctx.lineTo(-9, 10); ctx.closePath(); ctx.fill(); ctx.restore();
    };
    draw(); const timer = setInterval(draw, 120); return () => clearInterval(timer);
  }, [sim]);
  return <canvas ref={ref} width={300} height={300} className="minimap-canvas" aria-hidden="true" />;
}
