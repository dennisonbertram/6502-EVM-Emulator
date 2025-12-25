// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {BasicRom} from "../src/BasicRom.sol";
import {Emulator6502} from "../src/Emulator6502.sol";

/// @title HelloWorldTest – boots EhBASIC and runs a simple program that prints HELLO
contract HelloWorldTest is Test {
    Emulator6502 emu;
    BasicRom rom;

    function setUp() public {
        // Deploy ROM (EhBASIC image is in the deployed bytecode)
        rom = new BasicRom();

        // Spin up the emulator and load ROM at $A000
        emu = new Emulator6502();
        emu.loadRomFrom(address(rom), 0xA000);

        // Set reset vector to $A000
        emu.poke8(0xFFFC, 0x00);
        emu.poke8(0xFFFD, 0xA0);

        // Patch EhBASIC CHROUT soft vector ($0302/0303) to a stub at $F800
        // that stores A to IO_TTY ($F001) then RTS.
        // IMPORTANT: Use $F800+ range, NOT $F000-$F0FF which is I/O space!
        emu.poke8(0xF800, 0x8D); // STA abs
        emu.poke8(0xF801, 0x01);
        emu.poke8(0xF802, 0xF0); // $F001
        emu.poke8(0xF803, 0x60); // RTS

        emu.poke8(0x0302, 0x00); // low byte (0x00)
        emu.poke8(0x0303, 0xF8); // high byte (0xF8)

        // Patch CHRIN vector ($0300/0301) to stub at $F810
        // that reads from IO_KBD ($F000) into A then RTS.
        emu.poke8(0xF810, 0xAD); // LDA abs
        emu.poke8(0xF811, 0x00);
        emu.poke8(0xF812, 0xF0); // $F000
        emu.poke8(0xF813, 0x60); // RTS

        emu.poke8(0x0300, 0x10); // low byte
        emu.poke8(0x0301, 0xF8); // high byte

        // Power‑on reset
        emu.boot();

        // Install a minimal BRK/IRQ handler that simply RTI so that EhBASIC's
        // use of BRK as a soft interrupt does not crash into uninitialised
        // vector memory during early startup.  Vector at $FFFE/$FFFF → $F820.
        emu.poke8(0xF820, 0x40); // RTI
        emu.poke8(0xFFFE, 0x20); // low byte of $F820
        emu.poke8(0xFFFF, 0xF8); // high byte

        // Enable PC tracing so we can see where the interpreter executes
        emu.setPCTrace(true);
    }

    function _collectOutput() internal returns (bytes memory out) {
        Vm.Log[] memory logs = vm.getRecordedLogs();
        bytes32 topic0 = keccak256("CharOut(uint8)");
        for (uint i; i < logs.length; ++i) {
            if (logs[i].topics[0] == topic0) {
                out = bytes.concat(out, bytes1(uint8(abi.decode(logs[i].data, (uint8)))));
            }
        }
    }

    function _collectTrace() internal returns (uint16[] memory addrs) {
        Vm.Log[] memory logs = vm.getRecordedLogs();
        bytes32 topic0 = keccak256("TraceJSR(uint16)");
        uint count;
        // first pass count
        for (uint i; i < logs.length; ++i) {
            if (logs[i].topics[0] == topic0) {
                count += 1;
            }
        }
        addrs = new uint16[](count);
        uint idx;
        for (uint i; i < logs.length; ++i) {
            if (logs[i].topics[0] == topic0) {
                addrs[idx] = abi.decode(logs[i].data, (uint16));
                idx += 1;
            }
        }
    }

    function _collectPC() internal returns (uint16[] memory pcs) {
        Vm.Log[] memory logs = vm.getRecordedLogs();
        bytes32 topic0 = keccak256("TracePC(uint16)");
        uint count;
        for (uint i; i < logs.length; ++i) {
            if (logs[i].topics[0] == topic0) {
                count += 1;
            }
        }
        pcs = new uint16[](count);
        uint idx;
        for (uint i; i < logs.length; ++i) {
            if (logs[i].topics[0] == topic0) {
                pcs[idx] = abi.decode(logs[i].data, (uint16));
                idx += 1;
            }
        }
    }

    function test_HelloWorld() public {
        vm.recordLogs();

        // 1. Cold start then CR at memory prompt
        emu.sendKeys("C\r\r");

        // Re‑patch CHROUT vector in case EhBASIC overwrote it during init
        emu.poke8(0x0302, 0x00);
        emu.poke8(0x0303, 0xF8);

        // Re‑patch CHRIN vector as well
        emu.poke8(0x0300, 0x10);
        emu.poke8(0x0301, 0xF8);

        // Re-write I/O handler code in case it was overwritten
        // CHROUT at $F800
        emu.poke8(0xF800, 0x8D); // STA abs
        emu.poke8(0xF801, 0x01);
        emu.poke8(0xF802, 0xF0); // $F001
        emu.poke8(0xF803, 0x60); // RTS
        // CHRIN at $F810
        emu.poke8(0xF810, 0xAD); // LDA abs
        emu.poke8(0xF811, 0x00);
        emu.poke8(0xF812, 0xF0); // $F000
        emu.poke8(0xF813, 0x60); // RTS

        // Send BASIC program and run it
        emu.sendKeys("10 PRINT \"HELLO\"\rRUN\r");

        // Run generous step budget (~50M) – BASIC needs ~20M at 1 MHz
        emu.run(50_000_000);

        bytes memory out = _collectOutput();
        uint16[] memory trace = _collectTrace();
        for (uint i = 0; i < trace.length; ++i) {
            emit log_named_uint("TraceJSR", trace[i]);
        }

        uint len = emu.pcTraceCount();
        for (uint i = 0; i < len && i < 40; ++i) {
            emit log_named_uint("PC", emu.pcTraceBuf(i));
        }

        // Check that output contains substring "HELLO"
        bytes memory target = "HELLO";
        bool ok;
        if (out.length >= target.length) {
            for (uint i = 0; i <= out.length - target.length && !ok; ++i) {
                bool matchAll = true;
                for (uint j = 0; j < target.length; ++j) {
                    if (out[i + j] != target[j]) {
                        matchAll = false;
                        break;
                    }
                }
                if (matchAll) ok = true;
            }
        }
        if (!ok) {
            emit log_string(string(out));
        }
        assertTrue(ok, "HELLO not found in output");
    }
} 