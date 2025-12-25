'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { CRTEffect } from './CRTEffect';
import { CharacterGrid } from './CharacterGrid';
import { useEmulatorStore } from '@/hooks/useEmulator';
import { formatHex16 } from '@/lib/emulator';

interface TerminalProps {
  className?: string;
}

export function Terminal({ className = '' }: TerminalProps) {
  const {
    contractAddress,
    cpu,
    output,
    isConnected,
    isLoading,
    error,
    connect,
    sendKeys,
    run,
    boot,
    refreshState
  } = useEmulatorStore();

  const [addressInput, setAddressInput] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Play keyboard click sound
  const playKeyClick = useCallback(() => {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'square';
    gainNode.gain.value = 0.05;
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.05);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.05);
  }, []);

  // Play boot beep
  const playBootBeep = useCallback(() => {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 1000;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.1;
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  }, []);

  // Handle keyboard input
  const handleKeyDown = useCallback(async (e: React.KeyboardEvent) => {
    if (!isConnected || isLoading) return;

    let char = '';
    if (e.key.length === 1) {
      char = e.key;
    } else if (e.key === 'Enter') {
      char = '\r';
    } else if (e.key === 'Backspace') {
      char = '\b';
    } else if (e.key === 'Escape') {
      char = '\x1b';
    }

    if (char) {
      playKeyClick();
      await sendKeys(char);
      await run(10000n);
    }
  }, [isConnected, isLoading, sendKeys, run, playKeyClick]);

  // Connect to contract
  const handleConnect = async () => {
    if (addressInput) {
      await connect(addressInput as `0x${string}`);
    }
  };

  // Boot and run
  const handleBoot = async () => {
    playBootBeep();
    await boot();
    await run(100000n);
  };

  // Focus input when clicking terminal
  const handleTerminalClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div className={`terminal-wrapper ${className}`} onClick={handleTerminalClick}>
      <CRTEffect>
        {!isConnected ? (
          <div className="connect-screen">
            <div className="connect-title">APPLE II VM</div>
            <div className="connect-subtitle">6502 Emulator on Ethereum</div>
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
            {error && <div className="error-message">{error}</div>}
          </div>
        ) : (
          <div className="terminal-content">
            <CharacterGrid output={output} />
            {/* Hidden input for keyboard capture */}
            <input
              ref={inputRef}
              type="text"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="hidden-input"
              autoFocus
            />
          </div>
        )}
      </CRTEffect>

      {isConnected && (
        <div className="control-bar">
          <div className="status-bar">
            <span className="status-item">PC: ${cpu ? formatHex16(cpu.PC) : '----'}</span>
            <span className="status-item">A: ${cpu ? cpu.A.toString(16).padStart(2, '0').toUpperCase() : '--'}</span>
            <span className="status-item">X: ${cpu ? cpu.X.toString(16).padStart(2, '0').toUpperCase() : '--'}</span>
            <span className="status-item">Y: ${cpu ? cpu.Y.toString(16).padStart(2, '0').toUpperCase() : '--'}</span>
            <span className="status-item">SP: ${cpu ? cpu.SP.toString(16).padStart(2, '0').toUpperCase() : '--'}</span>
          </div>
          <div className="button-bar">
            <button onClick={handleBoot} disabled={isLoading} className="control-button">
              BOOT
            </button>
            <button onClick={() => run(1000n)} disabled={isLoading} className="control-button">
              RUN 1K
            </button>
            <button onClick={() => run(100000n)} disabled={isLoading} className="control-button">
              RUN 100K
            </button>
            <button onClick={refreshState} disabled={isLoading} className="control-button">
              REFRESH
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .terminal-wrapper {
          max-width: 720px;
          margin: 0 auto;
          cursor: text;
        }

        .connect-screen {
          text-align: center;
          padding: 40px 20px;
        }

        .connect-title {
          font-family: 'Courier New', monospace;
          font-size: 32px;
          font-weight: bold;
          color: #33ff33;
          text-shadow:
            0 0 10px #33ff33,
            0 0 20px #33ff33,
            0 0 40px #00aa00;
          margin-bottom: 10px;
        }

        .connect-subtitle {
          font-family: 'Courier New', monospace;
          font-size: 14px;
          color: #22aa22;
          margin-bottom: 40px;
        }

        .connect-form {
          display: flex;
          flex-direction: column;
          gap: 15px;
          max-width: 400px;
          margin: 0 auto;
        }

        .connect-input {
          font-family: 'Courier New', monospace;
          font-size: 14px;
          padding: 12px 15px;
          background: #0a0a0a;
          border: 1px solid #33ff33;
          color: #33ff33;
          outline: none;
        }

        .connect-input:focus {
          box-shadow: 0 0 10px rgba(51, 255, 51, 0.3);
        }

        .connect-button {
          font-family: 'Courier New', monospace;
          font-size: 14px;
          font-weight: bold;
          padding: 12px 20px;
          background: #1a3a1a;
          border: 1px solid #33ff33;
          color: #33ff33;
          cursor: pointer;
          transition: all 0.2s;
        }

        .connect-button:hover:not(:disabled) {
          background: #2a4a2a;
          box-shadow: 0 0 15px rgba(51, 255, 51, 0.4);
        }

        .connect-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .error-message {
          color: #ff4444;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          margin-top: 20px;
        }

        .terminal-content {
          min-height: 400px;
          position: relative;
        }

        .hidden-input {
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }

        .control-bar {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 15px;
          padding: 15px;
          background: #1a1a1a;
          border-radius: 10px;
        }

        .status-bar {
          display: flex;
          gap: 20px;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          color: #33ff33;
          justify-content: center;
        }

        .status-item {
          opacity: 0.8;
        }

        .button-bar {
          display: flex;
          gap: 10px;
          justify-content: center;
        }

        .control-button {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          font-weight: bold;
          padding: 8px 16px;
          background: #1a3a1a;
          border: 1px solid #33ff33;
          color: #33ff33;
          cursor: pointer;
          transition: all 0.2s;
        }

        .control-button:hover:not(:disabled) {
          background: #2a4a2a;
          box-shadow: 0 0 10px rgba(51, 255, 51, 0.3);
        }

        .control-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
