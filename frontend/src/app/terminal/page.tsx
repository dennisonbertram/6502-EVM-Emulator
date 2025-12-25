'use client';

import { Terminal } from '@/components/terminal/Terminal';

export default function TerminalPage() {
  return (
    <main className="terminal-page">
      <Terminal />
      <style jsx>{`
        .terminal-page {
          min-height: 100vh;
          background: #000;
          padding: 40px 20px;
        }
      `}</style>
    </main>
  );
}
