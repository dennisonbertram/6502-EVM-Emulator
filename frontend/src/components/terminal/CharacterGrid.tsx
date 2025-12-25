'use client';

import React, { useMemo, useRef, useEffect } from 'react';

interface CharacterGridProps {
  output: Uint8Array;
  cursorVisible?: boolean;
  cols?: number;
  rows?: number;
}

export function CharacterGrid({
  output,
  cursorVisible = true,
  cols = 40,
  rows = 24
}: CharacterGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Convert output bytes to display lines
  const displayLines = useMemo(() => {
    const lines: string[] = [];
    let currentLine = '';

    for (const byte of output) {
      if (byte === 0x0D || byte === 0x0A) {
        // CR or LF - new line
        lines.push(currentLine);
        currentLine = '';
      } else if (byte >= 0x20 && byte < 0x7F) {
        // Printable ASCII
        currentLine += String.fromCharCode(byte);
        if (currentLine.length >= cols) {
          lines.push(currentLine);
          currentLine = '';
        }
      } else if (byte === 0x08) {
        // Backspace
        currentLine = currentLine.slice(0, -1);
      }
      // Skip other control characters
    }

    // Add current line if not empty
    if (currentLine) {
      lines.push(currentLine);
    }

    // Return only the last 'rows' lines, scrolling up
    const startLine = Math.max(0, lines.length - rows);
    return lines.slice(startLine).map(line => line.padEnd(cols, ' '));
  }, [output, cols, rows]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [displayLines]);

  // Fill remaining rows with empty lines
  const paddedLines = [...displayLines];
  while (paddedLines.length < rows) {
    paddedLines.push(' '.repeat(cols));
  }

  return (
    <div ref={containerRef} className="character-grid">
      <pre className="grid-content">
        {paddedLines.map((line, i) => (
          <div key={i} className="grid-line">
            {line}
            {cursorVisible && i === paddedLines.length - 1 && (
              <span className="cursor">█</span>
            )}
          </div>
        ))}
      </pre>
      <style jsx>{`
        .character-grid {
          font-family: 'Apple II', 'Courier New', monospace;
          font-size: 16px;
          line-height: 1.2;
          overflow: hidden;
        }

        .grid-content {
          margin: 0;
          padding: 0;
          color: #33ff33;
          text-shadow:
            0 0 5px #33ff33,
            0 0 10px #33ff33,
            0 0 20px #00aa00;
          white-space: pre;
          letter-spacing: 0.05em;
        }

        .grid-line {
          height: 1.2em;
        }

        .cursor {
          animation: cursor-blink 1s infinite;
          color: #33ff33;
        }

        @keyframes cursor-blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
