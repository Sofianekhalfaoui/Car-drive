'use client';

import dynamic from 'next/dynamic';
import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowUpRight, Camera, Check, CircleHelp, Maximize, Pause, Play, RotateCcw, Settings2, Volume2, VolumeX, Gauge, Navigation, MoveUpRight, LoaderCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { clearInput, makeSimulation, type Control, type Quality } from '@/lib/game/model';
import { Hud } from './hud';
import { TouchControls } from './touch-controls';

const Scene = dynamic(() => import('./game-scene'), { ssr: false, loading: () => <div className="scene-loading"><LoaderCircle className="loading-spinner" size={24} /><span>Preparing the city…</span></div> });

class GraphicsBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? <div className="scene-message"><h2>Let&apos;s restart the engine.</h2><p>3D graphics could not load. Try reloading or updating your browser.</p><button className="primary-action" onClick={() => window.location.reload()}>Reload game</button></div> : this.props.children; }
}

export default function DrivingGame() {
  const [sim] = useState(makeSimulation);
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(true);
  const [menu, setMenu] = useState(false);
  const [quality, setQuality] = useState<Quality>('balanced');
  const [reverse, setReverse] = useState(false);
  const [sound, setSound] = useState(false);
  const [camera, setCamera] = useState(0);
  const [notice, setNotice] = useState('');
  const [failed, setFailed] = useState(false);
  const root = useRef<HTMLElement>(null);
  const inputSources = useRef<Record<Control, Set<string>>>({ left: new Set(), right: new Set(), throttle: new Set(), brake: new Set() });
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audio = useRef<{ context: AudioContext; oscillator: OscillatorNode; gain: GainNode; filter: BiquadFilterNode } | null>(null);
  const notify = useCallback((message: string) => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice(message); noticeTimer.current = setTimeout(() => setNotice(''), 3000);
  }, []);
  const clearControls = useCallback(() => {
    clearInput(sim); Object.values(inputSources.current).forEach(sources => sources.clear());
    root.current?.querySelectorAll('[data-held]').forEach(element => element.setAttribute('data-held', 'false'));
  }, [sim]);
  const setControl = useCallback((control: Control, source: string, active: boolean) => {
    if (active && (!sim.started || sim.paused)) return;
    const sources = inputSources.current[control]; if (active) sources.add(source); else sources.delete(source);
    sim.input[control] = sources.size > 0;
  }, [sim]);
  const pauseGame = useCallback(() => { sim.paused = true; setPaused(true); clearControls(); setMenu(true); }, [sim, clearControls]);
  const resume = useCallback(() => { if (!sim.started) { setMenu(false); return; } clearControls(); sim.paused = false; setPaused(false); setMenu(false); }, [sim, clearControls]);
  const start = () => { sim.started = true; sim.paused = false; setStarted(true); setPaused(false); clearControls(); notify('Hold GAS to move. Steer with the arrows.'); };
  const toggleGear = useCallback(() => {
    if (sim.telemetry.speed > 2) { notify('Stop the car before changing direction.'); return; }
    sim.input.reverse = !sim.input.reverse; setReverse(sim.input.reverse); notify(sim.input.reverse ? 'Reverse selected' : 'Drive selected');
  }, [sim, notify]);
  const reset = useCallback(() => { sim.reset++; clearControls(); sim.input.reverse = false; setReverse(false); notify('Car recovered to Central Avenue'); }, [sim, clearControls, notify]);
  const changeCamera = useCallback(() => { sim.camera = (sim.camera + 1) % 2; setCamera(sim.camera); notify(sim.camera ? 'Hood camera' : 'Chase camera'); }, [sim, notify]);
  const onReady = useCallback(() => setReady(true), []);
  const onError = useCallback(() => { setFailed(true); sim.paused = true; setPaused(true); clearControls(); }, [sim, clearControls]);

  const toggleSound = async () => {
    try {
      if (!audio.current) {
        const context = new AudioContext(), oscillator = context.createOscillator(), gain = context.createGain(), filter = context.createBiquadFilter();
        oscillator.type = 'sawtooth'; oscillator.frequency.value = 35; filter.type = 'lowpass'; filter.frequency.value = 220; gain.gain.value = 0;
        oscillator.connect(filter); filter.connect(gain); gain.connect(context.destination); oscillator.start();
        audio.current = { context, oscillator, gain, filter };
      }
      await audio.current.context.resume(); setSound(previous => !previous);
    } catch { notify('Audio is unavailable in this browser.'); }
  };
  const fullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (root.current?.requestFullscreen) await root.current.requestFullscreen();
      else notify('For a larger view, rotate your phone sideways.');
    } catch { notify('Fullscreen unavailable here. Try landscape mode.'); }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      const engine = audio.current; if (!engine) return;
      const now = engine.context.currentTime;
      engine.gain.gain.setTargetAtTime(sound && sim.started && !sim.paused ? 0.045 : 0, now, 0.1);
      engine.oscillator.frequency.setTargetAtTime(28 + sim.telemetry.rpm * 100 + (sim.input.throttle ? 12 : 0), now, 0.15);
      engine.filter.frequency.setTargetAtTime(160 + sim.telemetry.speed * 6, now, 0.15);
    }, 100);
    return () => clearInterval(timer);
  }, [sound, sim]);
  useEffect(() => () => { if (noticeTimer.current) clearTimeout(noticeTimer.current); audio.current?.context.close(); }, []);
  useEffect(() => {
    const keyMap: Record<string, Control> = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'throttle', KeyW: 'throttle', ArrowDown: 'brake', KeyS: 'brake', Space: 'brake' };
    const down = (event: KeyboardEvent) => {
      if (event.isComposing || event.keyCode === 229 || event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
      const control = keyMap[event.code];
      if (control && sim.started && !sim.paused) { event.preventDefault(); setControl(control, `key-${event.code}`, true); }
      if (event.repeat) return;
      if (event.code === 'Escape' && sim.started && !sim.paused) pauseGame();
      if (!sim.started || sim.paused) return;
      if (event.code === 'KeyR') toggleGear();
      if (event.code === 'KeyC') changeCamera();
      if (event.code === 'KeyX') reset();
    };
    const up = (event: KeyboardEvent) => { if (keyMap[event.code]) setControl(keyMap[event.code], `key-${event.code}`, false); };
    const blur = () => { clearControls(); if (sim.started && !sim.paused) pauseGame(); };
    const visibility = () => { if (document.hidden) blur(); };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur); document.addEventListener('visibilitychange', visibility);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', visibility); };
  }, [sim, clearControls, setControl, pauseGame, toggleGear, changeCamera, reset]);

  return <main ref={root} className="driving-game font-sans" aria-label="Velocity city driving game">
    <div className="game-world"><GraphicsBoundary onError={onError}><Scene sim={sim} paused={paused} quality={quality} onReady={onReady} onContextLost={onError} /></GraphicsBoundary></div>
    <div className="scene-vignette" aria-hidden="true" />
    <header className="game-header">
      <div className="brand"><div className="brand-name"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><h1>VELOCITY<span>.</span></h1></div><span className="brand-subtitle">THE CITY IS YOURS</span></div>
      <div className="top-actions">
        <button type="button" className="icon-button sound-button" onClick={toggleSound} aria-label={sound ? 'Mute engine sound' : 'Enable engine sound'} aria-pressed={sound}>{sound ? <Volume2 /> : <VolumeX />}</button>
        <button type="button" className="icon-button" onClick={changeCamera} aria-label="Switch camera" title="Switch camera (C)"><Camera /><span className="camera-number">{camera + 1}</span></button>
        <button type="button" className="icon-button fullscreen-button" onClick={fullscreen} aria-label="Toggle fullscreen"><Maximize /></button>
        <span className="action-divider" />
        <button type="button" className="icon-button pause-button" onClick={pauseGame} aria-label={started ? 'Pause game' : 'Open game settings'}>{started ? <Pause fill="currentColor" /> : <Settings2 />}</button>
      </div>
    </header>
    <Hud sim={sim} />
    {!started && !failed && <section className="welcome-panel" aria-label="Start driving">
      <div className="welcome-eyebrow"><span className="status-dot" />OPEN WORLD / CITY DRIVE</div>
      <h2 className="text-balance">Nowhere to be.<br />Everywhere to go.</h2>
      <p>Your car. An open city. Take the wheel.</p>
      <button type="button" className="primary-action" disabled={!ready} onClick={start}>{ready ? <><span>Start driving</span><ArrowUpRight size={20} /></> : <><LoaderCircle className="loading-spinner" size={18} /><span>Loading the city</span></>}</button>
      <span className="welcome-footnote">HEADPHONES ON. WORLD OFF.</span>
    </section>}
    {started && !paused && <div className="session-actions"><button className="icon-button" onClick={reset} aria-label="Recover car" title="Recover car (X)"><RotateCcw /></button><button className="icon-button" onClick={pauseGame} aria-label="Driving help"><CircleHelp /></button></div>}
    <TouchControls disabled={!started || paused || failed} reverse={reverse} setControl={setControl} toggleGear={toggleGear} />
    <div className="bottom-caption"><span>FREE ROAM</span><span className="caption-dot" /><span>NO LIMITS. NO RUSH.</span></div>
    <div className="game-notice" role="status" aria-live="polite" data-visible={!!notice}>{notice}</div>
    <Dialog open={menu} onOpenChange={open => { if (!open) resume(); else pauseGame(); }}>
      <DialogContent className="game-menu" showCloseButton={false}>
        <DialogHeader><div className="menu-eyebrow"><Pause size={16} /> PIT STOP</div><DialogTitle>{started ? 'Take a breather.' : 'Make yourself at home.'}</DialogTitle><DialogDescription>Your city will be right here when you&apos;re ready.</DialogDescription></DialogHeader>
        <div className="menu-section"><label htmlFor="graphics"><Gauge size={18} /> Graphics quality</label><select id="graphics" value={quality} onChange={event => setQuality(event.target.value as Quality)}><option value="low">Low · less detail</option><option value="balanced">Balanced · recommended</option><option value="high">High · more detail</option></select><p>Resolution adapts to performance. Landscape gives you a wider view.</p></div>
        <div className="menu-section"><h3><Navigation size={18} /> The basics</h3><div className="help-row"><span>Steer</span><span>Left / right buttons · A / D</span></div><div className="help-row"><span>Accelerate / brake</span><span>Pedals · W / S</span></div><div className="help-row"><span>Reverse</span><span>Stop, then select R</span></div><div className="help-row"><span>Camera / recover</span><span>C / X</span></div></div>
        <div className="menu-utilities"><button className="secondary-action" onClick={toggleSound}>{sound ? <Volume2 size={18} /> : <VolumeX size={18} />}{sound ? 'Sound on' : 'Sound off'}</button><button className="secondary-action" onClick={() => { reset(); resume(); }}><RotateCcw size={18} />Recover car</button></div>
        <button className="primary-action" onClick={resume}>{started ? <Play size={18} fill="currentColor" /> : <Check size={18} />}<span>{started ? 'Back to the city' : 'All set'}</span><MoveUpRight size={18} /></button>
      </DialogContent>
    </Dialog>
  </main>;
}
