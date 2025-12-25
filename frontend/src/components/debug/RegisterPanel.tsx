'use client';

import React from 'react';
import { type CPUState, formatHex8, formatHex16, formatFlags } from '@/lib/emulator';

interface RegisterPanelProps {
  cpu: CPUState | null;
}

export function RegisterPanel({ cpu }: RegisterPanelProps) {
  return (
    <div className="register-panel">
      <h3 className="panel-title">CPU REGISTERS</h3>
      <div className="register-grid">
        <div className="register">
          <span className="reg-label">A</span>
          <span className="reg-value">${cpu ? formatHex8(cpu.A) : '--'}</span>
        </div>
        <div className="register">
          <span className="reg-label">X</span>
          <span className="reg-value">${cpu ? formatHex8(cpu.X) : '--'}</span>
        </div>
        <div className="register">
          <span className="reg-label">Y</span>
          <span className="reg-value">${cpu ? formatHex8(cpu.Y) : '--'}</span>
        </div>
        <div className="register">
          <span className="reg-label">SP</span>
          <span className="reg-value">${cpu ? formatHex8(cpu.SP) : '--'}</span>
        </div>
        <div className="register wide">
          <span className="reg-label">PC</span>
          <span className="reg-value">${cpu ? formatHex16(cpu.PC) : '----'}</span>
        </div>
      </div>
      <div className="flags-section">
        <span className="flags-label">FLAGS</span>
        <div className="flags-display">
          <span className="flag-header">N V - B D I Z C</span>
          <span className="flag-values">{cpu ? formatFlags(cpu.P) : '. . . . . . . .'}</span>
        </div>
      </div>
      <div className="cycles-section">
        <span className="cycles-label">CYCLES</span>
        <span className="cycles-value">{cpu ? cpu.cycles.toLocaleString() : '0'}</span>
      </div>
      <style jsx>{`
        .register-panel {
          background: #0a0a0a;
          border: 1px solid #33ff33;
          border-radius: 8px;
          padding: 15px;
        }

        .panel-title {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          color: #33ff33;
          margin: 0 0 15px 0;
          text-align: center;
          letter-spacing: 2px;
        }

        .register-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin-bottom: 15px;
        }

        .register {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px;
          background: #111;
          border-radius: 4px;
        }

        .register.wide {
          grid-column: span 2;
        }

        .reg-label {
          font-family: 'Courier New', monospace;
          font-size: 14px;
          color: #22aa22;
          font-weight: bold;
        }

        .reg-value {
          font-family: 'Courier New', monospace;
          font-size: 16px;
          color: #33ff33;
          text-shadow: 0 0 5px #33ff33;
        }

        .flags-section {
          background: #111;
          border-radius: 4px;
          padding: 10px;
          margin-bottom: 10px;
        }

        .flags-label {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          color: #22aa22;
          display: block;
          margin-bottom: 8px;
        }

        .flags-display {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .flag-header {
          font-family: 'Courier New', monospace;
          font-size: 11px;
          color: #22aa22;
          letter-spacing: 2px;
        }

        .flag-values {
          font-family: 'Courier New', monospace;
          font-size: 14px;
          color: #33ff33;
          letter-spacing: 2px;
          text-shadow: 0 0 5px #33ff33;
        }

        .cycles-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #111;
          border-radius: 4px;
          padding: 10px;
        }

        .cycles-label {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          color: #22aa22;
        }

        .cycles-value {
          font-family: 'Courier New', monospace;
          font-size: 14px;
          color: #33ff33;
        }
      `}</style>
    </div>
  );
}
