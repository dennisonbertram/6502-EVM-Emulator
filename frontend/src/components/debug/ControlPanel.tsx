'use client';

import React from 'react';

interface ControlPanelProps {
  isLoading: boolean;
  halted: boolean;
  onStep: () => void;
  onRun1K: () => void;
  onRun10K: () => void;
  onRun100K: () => void;
  onBoot: () => void;
  onRefresh: () => void;
}

export function ControlPanel({
  isLoading,
  halted,
  onStep,
  onRun1K,
  onRun10K,
  onRun100K,
  onBoot,
  onRefresh,
}: ControlPanelProps) {
  return (
    <div className="control-panel">
      <h3 className="panel-title">CONTROLS</h3>
      <div className="button-grid">
        <button onClick={onStep} disabled={isLoading || halted} className="ctrl-btn">
          STEP
        </button>
        <button onClick={onRun1K} disabled={isLoading || halted} className="ctrl-btn">
          RUN 1K
        </button>
        <button onClick={onRun10K} disabled={isLoading || halted} className="ctrl-btn">
          RUN 10K
        </button>
        <button onClick={onRun100K} disabled={isLoading || halted} className="ctrl-btn">
          RUN 100K
        </button>
        <button onClick={onBoot} disabled={isLoading} className="ctrl-btn boot">
          BOOT
        </button>
        <button onClick={onRefresh} disabled={isLoading} className="ctrl-btn">
          REFRESH
        </button>
      </div>
      {halted && (
        <div className="halted-indicator">
          CPU HALTED
        </div>
      )}
      <style jsx>{`
        .control-panel {
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

        .button-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        .ctrl-btn {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          font-weight: bold;
          padding: 12px;
          background: #111;
          border: 1px solid #33ff33;
          color: #33ff33;
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .ctrl-btn:hover:not(:disabled) {
          background: #1a3a1a;
          box-shadow: 0 0 10px rgba(51, 255, 51, 0.3);
        }

        .ctrl-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .ctrl-btn.boot {
          grid-column: span 2;
          background: #2a1a1a;
          border-color: #ff9933;
          color: #ff9933;
        }

        .ctrl-btn.boot:hover:not(:disabled) {
          background: #3a2a1a;
          box-shadow: 0 0 10px rgba(255, 153, 51, 0.3);
        }

        .halted-indicator {
          margin-top: 15px;
          padding: 10px;
          background: #3a1a1a;
          border: 1px solid #ff4444;
          border-radius: 4px;
          text-align: center;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          color: #ff4444;
          animation: blink 1s infinite;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
