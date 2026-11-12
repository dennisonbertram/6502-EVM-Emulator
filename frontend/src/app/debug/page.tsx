'use client';

import React, { useState } from 'react';
import { RegisterPanel } from '@/components/debug/RegisterPanel';
import { MemoryViewer } from '@/components/debug/MemoryViewer';
import { DisassemblyView } from '@/components/debug/DisassemblyView';
import { ControlPanel } from '@/components/debug/ControlPanel';
import { useEmulatorStore } from '@/hooks/useEmulator';
import Link from 'next/link';

export default function DebugPage() {
  const {
    contractAddress,
    cpu,
    halted,
    isConnected,
    isLoading,
    error,
    connect,
    step,
    run,
    boot,
    refreshState,
  } = useEmulatorStore();

  const [addressInput, setAddressInput] = useState('');

  const handleConnect = async () => {
    if (addressInput) {
      await connect(addressInput as `0x${string}`);
    }
  };

  return (
    <div className="debug-page">
      <header className="debug-header">
        <Link href="/" className="back-link">◄ HOME</Link>
        <h1 className="page-title">DEBUG DASHBOARD</h1>
        <div className="connection-status">
          {isConnected ? (
            <span className="connected">● CONNECTED</span>
          ) : (
            <span className="disconnected">○ DISCONNECTED</span>
          )}
        </div>
      </header>

      {!isConnected ? (
        <div className="connect-section">
          <div className="connect-box">
            <h2>Connect to Emulator</h2>
            <div className="connect-form">
              <input
                type="text"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                placeholder="Contract Address (0x...)"
                className="connect-input"
              />
              <button onClick={handleConnect} className="connect-button" disabled={isLoading}>
                {isLoading ? 'CONNECTING...' : 'CONNECT'}
              </button>
            </div>
            {error && <p className="error-msg">{error}</p>}
          </div>
        </div>
      ) : (
        <div className="debug-grid">
          <div className="left-column">
            <RegisterPanel cpu={cpu} />
            <ControlPanel
              isLoading={isLoading}
              halted={halted}
              onStep={step}
              onRun1K={() => run(1000n)}
              onRun10K={() => run(10000n)}
              onRun100K={() => run(100000n)}
              onBoot={boot}
              onRefresh={refreshState}
            />
          </div>
          <div className="center-column">
            <DisassemblyView
              contractAddress={contractAddress}
              currentPC={cpu?.PC ?? 0}
            />
          </div>
          <div className="right-column">
            <MemoryViewer
              contractAddress={contractAddress}
              highlightPC={cpu?.PC}
            />
          </div>
        </div>
      )}

      <style jsx>{`
        .debug-page {
          min-height: 100vh;
          background: #000;
          padding: 20px;
        }

        .debug-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1px solid #22aa22;
        }

        .back-link {
          font-family: 'Courier New', monospace;
          font-size: 14px;
          color: #33ff33;
          text-decoration: none;
        }

        .back-link:hover {
          text-shadow: 0 0 10px #33ff33;
        }

        .page-title {
          font-family: 'Courier New', monospace;
          font-size: 24px;
          color: #33ff33;
          text-shadow: 0 0 10px #33ff33;
          margin: 0;
        }

        .connection-status {
          font-family: 'Courier New', monospace;
          font-size: 12px;
        }

        .connected {
          color: #33ff33;
        }

        .disconnected {
          color: #666;
        }

        .connect-section {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 60vh;
        }

        .connect-box {
          background: #0a0a0a;
          border: 1px solid #33ff33;
          border-radius: 12px;
          padding: 40px;
          text-align: center;
        }

        .connect-box h2 {
          font-family: 'Courier New', monospace;
          font-size: 18px;
          color: #33ff33;
          margin: 0 0 20px 0;
        }

        .connect-form {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .connect-input {
          font-family: 'Courier New', monospace;
          font-size: 14px;
          padding: 12px;
          width: 400px;
          background: #111;
          border: 1px solid #22aa22;
          color: #33ff33;
          outline: none;
        }

        .connect-input:focus {
          border-color: #33ff33;
          box-shadow: 0 0 10px rgba(51, 255, 51, 0.3);
        }

        .connect-button {
          font-family: 'Courier New', monospace;
          font-size: 14px;
          font-weight: bold;
          padding: 12px;
          background: #1a3a1a;
          border: 1px solid #33ff33;
          color: #33ff33;
          cursor: pointer;
        }

        .connect-button:hover:not(:disabled) {
          background: #2a4a2a;
          box-shadow: 0 0 15px rgba(51, 255, 51, 0.4);
        }

        .connect-button:disabled {
          opacity: 0.5;
        }

        .error-msg {
          color: #ff4444;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          margin-top: 15px;
        }

        .debug-grid {
          display: grid;
          grid-template-columns: 250px 1fr 400px;
          gap: 20px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .left-column {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .center-column {
          min-width: 0;
        }

        .right-column {
          min-width: 0;
        }

        @media (max-width: 1200px) {
          .debug-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
