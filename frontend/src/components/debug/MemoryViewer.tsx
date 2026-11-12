'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { publicClient, EMULATOR_ABI, formatHex8, formatHex16 } from '@/lib/emulator';
import type { Address } from 'viem';

interface MemoryViewerProps {
  contractAddress: Address | null;
  highlightPC?: number;
}

const PRESETS = [
  { name: 'Zero Page', start: 0x0000, end: 0x00FF },
  { name: 'Stack', start: 0x0100, end: 0x01FF },
  { name: 'I/O', start: 0xF000, end: 0xF0FF },
  { name: 'ROM Start', start: 0xC000, end: 0xC0FF },
  { name: 'Vectors', start: 0xFFF0, end: 0xFFFF },
];

export function MemoryViewer({ contractAddress, highlightPC }: MemoryViewerProps) {
  const [startAddr, setStartAddr] = useState(0x0000);
  const [memory, setMemory] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activePreset, setActivePreset] = useState<string>('Zero Page');

  const fetchMemory = useCallback(async (start: number, count: number = 256) => {
    if (!contractAddress) return;

    setIsLoading(true);
    try {
      const promises: Promise<number>[] = [];
      for (let i = 0; i < count; i++) {
        const addr = (start + i) & 0xFFFF;
        promises.push(
          publicClient.readContract({
            address: contractAddress,
            abi: EMULATOR_ABI,
            functionName: 'peek8',
            args: [addr],
          }) as Promise<number>
        );
      }

      const results = await Promise.all(promises);
      setMemory(results);
      setStartAddr(start);
    } catch (err) {
      console.error('Failed to fetch memory:', err);
    } finally {
      setIsLoading(false);
    }
  }, [contractAddress]);

  // Initial load
  useEffect(() => {
    if (contractAddress) {
      fetchMemory(startAddr);
    }
  }, [contractAddress, fetchMemory, startAddr]);

  const handlePresetClick = (preset: typeof PRESETS[0]) => {
    setActivePreset(preset.name);
    fetchMemory(preset.start);
  };

  const handleAddressSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const input = (e.currentTarget.elements.namedItem('address') as HTMLInputElement).value;
    const addr = parseInt(input, 16);
    if (!isNaN(addr) && addr >= 0 && addr <= 0xFFFF) {
      setActivePreset('');
      fetchMemory(addr);
    }
  };

  // Render hex dump
  const renderHexDump = () => {
    const rows: React.ReactElement[] = [];
    const bytesPerRow = 16;

    for (let row = 0; row < memory.length / bytesPerRow; row++) {
      const rowAddr = startAddr + row * bytesPerRow;
      const rowBytes = memory.slice(row * bytesPerRow, (row + 1) * bytesPerRow);

      const hexCells = rowBytes.map((byte, i) => {
        const addr = rowAddr + i;
        const isHighlighted = highlightPC !== undefined && addr === highlightPC;
        return (
          <span
            key={i}
            className={`hex-byte ${isHighlighted ? 'highlighted' : ''}`}
          >
            {formatHex8(byte)}
          </span>
        );
      });

      const asciiChars = rowBytes.map((byte, i) => {
        const char = byte >= 0x20 && byte < 0x7F ? String.fromCharCode(byte) : '.';
        return (
          <span key={i} className="ascii-char">
            {char}
          </span>
        );
      });

      rows.push(
        <div key={row} className="hex-row">
          <span className="hex-addr">{formatHex16(rowAddr & 0xFFFF)}</span>
          <div className="hex-bytes">{hexCells}</div>
          <div className="ascii-chars">{asciiChars}</div>
        </div>
      );
    }

    return rows;
  };

  return (
    <div className="memory-viewer">
      <h3 className="panel-title">MEMORY VIEWER</h3>

      {/* Preset buttons */}
      <div className="preset-bar">
        {PRESETS.map((preset) => (
          <button
            key={preset.name}
            onClick={() => handlePresetClick(preset)}
            className={`preset-btn ${activePreset === preset.name ? 'active' : ''}`}
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* Address input */}
      <form onSubmit={handleAddressSubmit} className="address-form">
        <span className="addr-label">$</span>
        <input
          type="text"
          name="address"
          defaultValue={formatHex16(startAddr)}
          placeholder="0000"
          className="addr-input"
          maxLength={4}
        />
        <button type="submit" className="addr-btn" disabled={isLoading}>
          GO
        </button>
      </form>

      {/* Hex dump display */}
      <div className="hex-dump">
        {isLoading ? (
          <div className="loading">Loading...</div>
        ) : (
          renderHexDump()
        )}
      </div>

      <style jsx>{`
        .memory-viewer {
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

        .preset-bar {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin-bottom: 10px;
        }

        .preset-btn {
          font-family: 'Courier New', monospace;
          font-size: 10px;
          padding: 5px 8px;
          background: #111;
          border: 1px solid #22aa22;
          color: #22aa22;
          cursor: pointer;
          border-radius: 3px;
          transition: all 0.2s;
        }

        .preset-btn:hover, .preset-btn.active {
          background: #1a3a1a;
          color: #33ff33;
          border-color: #33ff33;
        }

        .address-form {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-bottom: 10px;
        }

        .addr-label {
          font-family: 'Courier New', monospace;
          font-size: 14px;
          color: #33ff33;
        }

        .addr-input {
          font-family: 'Courier New', monospace;
          font-size: 14px;
          width: 60px;
          padding: 5px;
          background: #111;
          border: 1px solid #22aa22;
          color: #33ff33;
          text-transform: uppercase;
        }

        .addr-btn {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          padding: 5px 10px;
          background: #1a3a1a;
          border: 1px solid #33ff33;
          color: #33ff33;
          cursor: pointer;
        }

        .addr-btn:disabled {
          opacity: 0.5;
        }

        .hex-dump {
          font-family: 'Courier New', monospace;
          font-size: 11px;
          background: #050505;
          border-radius: 4px;
          padding: 10px;
          max-height: 300px;
          overflow-y: auto;
        }

        .loading {
          color: #22aa22;
          text-align: center;
          padding: 20px;
        }

        .hex-row {
          display: flex;
          align-items: center;
          line-height: 1.5;
        }

        .hex-addr {
          color: #22aa22;
          margin-right: 10px;
          min-width: 40px;
        }

        .hex-bytes {
          display: flex;
          gap: 5px;
          margin-right: 15px;
        }

        .hex-byte {
          color: #33ff33;
        }

        .hex-byte.highlighted {
          background: #33ff33;
          color: #000;
          padding: 0 2px;
        }

        .ascii-chars {
          color: #22aa22;
          letter-spacing: 1px;
        }

        .ascii-char {
          display: inline-block;
          width: 8px;
        }
      `}</style>
    </div>
  );
}
