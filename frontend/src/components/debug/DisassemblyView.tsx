'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { publicClient, EMULATOR_ABI, formatHex16, formatHex8 } from '@/lib/emulator';
import { disassemble, type DisassembledLine } from '@/lib/disassembler';
import type { Address } from 'viem';

interface DisassemblyViewProps {
  contractAddress: Address | null;
  currentPC: number;
}

export function DisassemblyView({ contractAddress, currentPC }: DisassemblyViewProps) {
  const [lines, setLines] = useState<DisassembledLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAndDisassemble = useCallback(async () => {
    if (!contractAddress) return;

    setIsLoading(true);
    try {
      // Fetch memory around PC
      const startAddr = Math.max(0, currentPC - 16);
      const memSize = 64;
      const promises: Promise<number>[] = [];

      for (let i = 0; i < memSize; i++) {
        const addr = (startAddr + i) & 0xFFFF;
        promises.push(
          publicClient.readContract({
            address: contractAddress,
            abi: EMULATOR_ABI,
            functionName: 'peek8',
            args: [addr],
          }) as Promise<number>
        );
      }

      const memory = await Promise.all(promises);
      const disassembled = disassemble(memory, startAddr, currentPC, 16);
      setLines(disassembled);
    } catch (err) {
      console.error('Failed to disassemble:', err);
    } finally {
      setIsLoading(false);
    }
  }, [contractAddress, currentPC]);

  useEffect(() => {
    fetchAndDisassemble();
  }, [fetchAndDisassemble]);

  return (
    <div className="disassembly-view">
      <h3 className="panel-title">DISASSEMBLY</h3>
      <div className="disasm-content">
        {isLoading ? (
          <div className="loading">Loading...</div>
        ) : (
          lines.map((line, i) => (
            <div
              key={i}
              className={`disasm-line ${line.isCurrentPC ? 'current' : ''}`}
            >
              <span className="addr">${formatHex16(line.address)}</span>
              <span className="bytes">
                {line.bytes.map(b => formatHex8(b)).join(' ').padEnd(8, ' ')}
              </span>
              <span className="mnemonic">{line.mnemonic}</span>
              <span className="operand">{line.operand}</span>
              {line.isCurrentPC && <span className="marker">◄</span>}
            </div>
          ))
        )}
      </div>
      <style jsx>{`
        .disassembly-view {
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

        .disasm-content {
          font-family: 'Courier New', monospace;
          font-size: 11px;
          background: #050505;
          border-radius: 4px;
          padding: 10px;
          max-height: 350px;
          overflow-y: auto;
        }

        .loading {
          color: #22aa22;
          text-align: center;
          padding: 20px;
        }

        .disasm-line {
          display: flex;
          align-items: center;
          line-height: 1.6;
          padding: 2px 5px;
          border-radius: 2px;
        }

        .disasm-line.current {
          background: rgba(51, 255, 51, 0.15);
        }

        .addr {
          color: #22aa22;
          margin-right: 10px;
          min-width: 50px;
        }

        .bytes {
          color: #666;
          margin-right: 10px;
          min-width: 80px;
          font-size: 10px;
        }

        .mnemonic {
          color: #33ff33;
          font-weight: bold;
          min-width: 35px;
          text-shadow: 0 0 3px #33ff33;
        }

        .operand {
          color: #22aa22;
          min-width: 100px;
        }

        .marker {
          color: #33ff33;
          margin-left: auto;
          animation: pulse 1s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
