import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8">
      <main className="text-center">
        {/* CRT-style title */}
        <h1 className="text-5xl font-mono font-bold text-green-400 mb-4 tracking-wider"
            style={{
              textShadow: '0 0 10px #33ff33, 0 0 20px #33ff33, 0 0 40px #00aa00'
            }}>
          APPLE II VM
        </h1>
        <p className="text-green-600 font-mono text-lg mb-12">
          6502 CPU Emulator Running on Ethereum
        </p>

        {/* Decorative ASCII art */}
        <pre className="text-green-500 font-mono text-xs mb-12 opacity-60">
{`
    ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
   █                               █
   █   ████  ██████  ████  ██████  █
   █   █  █  █       █  █      █   █
   █   ████  ██████  █  █    ██    █
   █   █  █       █  █  █   █      █
   █   ████  ██████  ████  ██████  █
   █                               █
    ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
`}
        </pre>

        {/* Navigation cards */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center">
          <Link href="/terminal" className="group">
            <div className="border border-green-500 rounded-lg p-6 w-64 transition-all duration-300
                          hover:bg-green-900/20 hover:shadow-[0_0_20px_rgba(51,255,51,0.3)]">
              <div className="text-green-400 font-mono text-lg font-bold mb-2">
                ▶ TERMINAL
              </div>
              <p className="text-green-600 font-mono text-sm">
                Retro CRT terminal with keyboard input and phosphor glow
              </p>
            </div>
          </Link>

          <Link href="/debug" className="group">
            <div className="border border-green-500 rounded-lg p-6 w-64 transition-all duration-300
                          hover:bg-green-900/20 hover:shadow-[0_0_20px_rgba(51,255,51,0.3)]">
              <div className="text-green-400 font-mono text-lg font-bold mb-2">
                ⚙ DEBUG
              </div>
              <p className="text-green-600 font-mono text-sm">
                CPU registers, memory viewer, and disassembly
              </p>
            </div>
          </Link>
        </div>

        {/* Instructions */}
        <div className="mt-16 text-green-700 font-mono text-sm max-w-lg mx-auto">
          <p className="mb-4">
            <span className="text-green-500">INSTRUCTIONS:</span>
          </p>
          <ol className="text-left list-decimal list-inside space-y-2">
            <li>Start Anvil: <code className="bg-green-900/30 px-2 rounded">anvil</code></li>
            <li>Deploy: <code className="bg-green-900/30 px-2 rounded">forge script script/LoadRom.s.sol --broadcast</code></li>
            <li>Enter contract address in Terminal</li>
            <li>Type commands to interact with EhBASIC</li>
          </ol>
        </div>

        {/* Footer */}
        <footer className="mt-16 text-green-800 font-mono text-xs">
          Powered by Solidity • MOS 6502 • EhBASIC
        </footer>
      </main>
    </div>
  );
}
