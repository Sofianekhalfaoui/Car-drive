'use client';

import { ChevronLeft, ChevronRight, ArrowDown, ArrowUp } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Control } from '@/lib/game/model';

type Props = { disabled: boolean; reverse: boolean; setControl: (control: Control, source: string, active: boolean) => void; toggleGear: () => void };
function HoldButton({ control, label, children, className = '', disabled, setControl }: { control: Control; label: string; children: ReactNode; className?: string } & Pick<Props, 'disabled' | 'setControl'>) {
  return <button type="button" className={`drive-button ${className}`} aria-label={label} disabled={disabled} data-control={control}
    onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); event.currentTarget.dataset.held = 'true'; setControl(control, `pointer-${event.pointerId}`, true); }}
    onPointerUp={event => { event.currentTarget.dataset.held = 'false'; setControl(control, `pointer-${event.pointerId}`, false); }}
    onPointerCancel={event => { event.currentTarget.dataset.held = 'false'; setControl(control, `pointer-${event.pointerId}`, false); }}
    onLostPointerCapture={event => { event.currentTarget.dataset.held = 'false'; setControl(control, `pointer-${event.pointerId}`, false); }}
    onKeyDown={event => { if (event.code === 'Space' || event.code === 'Enter') { event.preventDefault(); setControl(control, 'button-key', true); } }}
    onKeyUp={() => setControl(control, 'button-key', false)} onBlur={() => setControl(control, 'button-key', false)}>
    {children}
  </button>;
}
export function TouchControls({ disabled, setControl, toggleGear, reverse }: Props) {
  return <div className="touch-controls" aria-label="Driving controls">
    <div className="steering-cluster">
      <div className="control-caption">STEERING <span>A / D</span></div>
      <div className="steering-buttons">
        <HoldButton control="left" label="Steer left" disabled={disabled} setControl={setControl}><ChevronLeft strokeWidth={1.8} /></HoldButton>
        <HoldButton control="right" label="Steer right" disabled={disabled} setControl={setControl}><ChevronRight strokeWidth={1.8} /></HoldButton>
      </div>
    </div>
    <div className="pedal-cluster">
      <button type="button" className="gear-selector" onClick={toggleGear} disabled={disabled} aria-label={reverse ? 'Shift to drive' : 'Shift to reverse'}><span data-selected={!reverse}>D</span><span data-selected={reverse}>R</span></button>
      <div className="pedal-buttons">
        <div className="pedal-wrap"><HoldButton control="brake" label="Brake" disabled={disabled} setControl={setControl} className="brake-pedal"><span className="pedal-grip horizontal" /><ArrowDown /></HoldButton><span className="pedal-label">BRAKE</span></div>
        <div className="pedal-wrap"><HoldButton control="throttle" label="Accelerate" disabled={disabled} setControl={setControl} className="accelerator-pedal"><span className="pedal-grip" /><ArrowUp /></HoldButton><span className="pedal-label">GAS</span></div>
      </div>
    </div>
  </div>;
}
