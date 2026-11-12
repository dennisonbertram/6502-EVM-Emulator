// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {BasicRom} from "../src/BasicRom.sol";
import {Emulator6502} from "../src/Emulator6502.sol";

/// @dev Example script: deploys cartridge + emulator and loads ROM at $8000.
contract LoadRomScript is Script {
    function run() external {
        // 1. Resolve base address from env (defaults to 0x8000)
        uint256 baseAddr;
        try vm.envUint("BASE_ADDR") returns (uint256 v) {
            baseAddr = v;
        } catch {
            baseAddr = 0x8000;
        }

        // Optional: instruction budget after boot for quick smoke (default 0)
        uint256 initialSteps;
        try vm.envUint("RUN_STEPS") returns (uint256 s) {
            initialSteps = s;
        } catch {
            initialSteps = 0;
        }

        vm.startBroadcast();

        // Deploy cartridge contract (replace with real ROM bytes in BasicRom)
        BasicRom rom = new BasicRom();

        // Deploy emulator
        Emulator6502 emu = new Emulator6502();

        // Load ROM into emulator at specified base address
        emu.loadRomFrom(address(rom), uint16(baseAddr));

        // NOTE: Do NOT patch RESET/IRQ/BRK vectors!
        // The ROM at $C000-$FFFF contains correct vectors:
        // - RESET at $FFFC-$FFFD points to EhBASIC entry point ($FF00)
        // - IRQ/BRK at $FFFE-$FFFF points to ROM's BRK handler
        // EhBASIC uses BRK as a soft interrupt, so we must not override these.
        // We only install an RTI handler at $020D for the ROM's IRQ vector.

        // Patch EhBASIC I/O vectors for terminal output
        // CHROUT stub at $0400: STA $F001; RTS
        emu.poke8(0x0400, 0x8D); // STA abs
        emu.poke8(0x0401, 0x01);
        emu.poke8(0x0402, 0xF0); // $F001 (IO_TTY)
        emu.poke8(0x0403, 0x60); // RTS

        // Patch CHROUT vector at $0302/$0303
        emu.poke8(0x0302, 0x00); // low byte
        emu.poke8(0x0303, 0x04); // high byte -> $0400

        // CHRIN stub at $0410: LDA $F000; RTS
        emu.poke8(0x0410, 0xAD); // LDA abs
        emu.poke8(0x0411, 0x00);
        emu.poke8(0x0412, 0xF0); // $F000 (IO_KBD)
        emu.poke8(0x0413, 0x60); // RTS

        // Patch CHRIN vector at $0300/$0301
        emu.poke8(0x0300, 0x10); // low byte
        emu.poke8(0x0301, 0x04); // high byte -> $0410

        // Install minimal BRK/IRQ handler at $020D
        emu.poke8(0x020D, 0x40); // RTI

        // Boot CPU
        emu.boot();

        // Optionally run some steps to reach prompt
        if (initialSteps > 0) {
            emu.run(uint64(initialSteps));
        }

        vm.stopBroadcast();
    }
} 