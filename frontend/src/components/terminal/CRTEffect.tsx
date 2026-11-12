'use client';

import React from 'react';

interface CRTEffectProps {
  children: React.ReactNode;
  className?: string;
}

export function CRTEffect({ children, className = '' }: CRTEffectProps) {
  return (
    <div className={`crt-container ${className}`}>
      <div className="crt-screen">
        <div className="crt-overlay" />
        <div className="crt-scanlines" />
        <div className="crt-content">
          {children}
        </div>
      </div>
      <style jsx>{`
        .crt-container {
          position: relative;
          padding: 20px;
          background: #1a1a1a;
          border-radius: 20px;
          box-shadow:
            inset 0 0 80px rgba(0, 255, 0, 0.1),
            0 0 40px rgba(0, 255, 0, 0.2),
            0 0 100px rgba(0, 0, 0, 0.8);
        }

        .crt-screen {
          position: relative;
          background: #0a0a0a;
          border-radius: 15px;
          overflow: hidden;
          box-shadow:
            inset 0 0 60px rgba(0, 255, 0, 0.08),
            inset 0 0 20px rgba(0, 0, 0, 0.5);
        }

        .crt-overlay {
          position: absolute;
          inset: 0;
          background: radial-gradient(
            ellipse at center,
            transparent 0%,
            rgba(0, 0, 0, 0.2) 80%,
            rgba(0, 0, 0, 0.4) 100%
          );
          pointer-events: none;
          z-index: 3;
        }

        .crt-scanlines {
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            to bottom,
            transparent 0px,
            transparent 1px,
            rgba(0, 0, 0, 0.25) 1px,
            rgba(0, 0, 0, 0.25) 2px
          );
          pointer-events: none;
          z-index: 2;
          animation: scanlines-flicker 0.05s infinite;
        }

        @keyframes scanlines-flicker {
          0%, 100% { opacity: 0.9; }
          50% { opacity: 1; }
        }

        .crt-content {
          position: relative;
          z-index: 1;
          padding: 20px;
        }
      `}</style>
    </div>
  );
}
