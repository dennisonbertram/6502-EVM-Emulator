// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {BasicRom} from "../src/BasicRom.sol";
import {Emulator6502} from "../src/Emulator6502.sol";
import {TerminalFormatter} from "./helpers/TerminalFormatter.sol";

/// @title HelloWorldTest - boots EhBASIC and runs a simple program that prints HELLO
/// @notice This test requires very high gas limit to complete
/// @dev Run with: forge test --match-test test_HelloWorld -vv --gas-limit 500000000000
contract HelloWorldTest is Test {
    Emulator6502 emu;
    BasicRom rom;

    uint64 totalSteps;

    function setUp() public {
        // Deploy ROM (EhBASIC image is in the deployed bytecode)
        rom = new BasicRom();

        // Spin up the emulator and load ROM at $C000 (top 16KB of address space)
        // EhBASIC is designed to occupy $C000-$FFFF including vectors at $FFFA-$FFFF
        emu = new Emulator6502();
        emu.loadRomFrom(address(rom), 0xC000);

        // Patch EhBASIC CHROUT soft vector ($0302/0303) to a stub at $0400
        // that stores A to IO_TTY ($F001) then RTS.
        // Using $0400+ (free RAM) instead of $F800+ which is in ROM space.
        emu.poke8(0x0400, 0x8D); // STA abs
        emu.poke8(0x0401, 0x01);
        emu.poke8(0x0402, 0xF0); // $F001
        emu.poke8(0x0403, 0x60); // RTS

        emu.poke8(0x0302, 0x00); // low byte (0x00)
        emu.poke8(0x0303, 0x04); // high byte (0x04)

        // Patch CHRIN vector ($0300/0301) to stub at $0410
        // that reads from IO_KBD ($F000) into A then RTS.
        emu.poke8(0x0410, 0xAD); // LDA abs
        emu.poke8(0x0411, 0x00);
        emu.poke8(0x0412, 0xF0); // $F000
        emu.poke8(0x0413, 0x60); // RTS

        emu.poke8(0x0300, 0x10); // low byte
        emu.poke8(0x0301, 0x04); // high byte

        // Install a minimal BRK/IRQ handler at $020D (where ROM's IRQ vector points)
        // EhBASIC uses BRK as a soft interrupt, so we need a handler that simply RTI.
        emu.poke8(0x020D, 0x40); // RTI

        // Power-on reset
        emu.boot();
    }

    function _collectOutput() internal returns (bytes memory out) {
        Vm.Log[] memory logs = vm.getRecordedLogs();
        return TerminalFormatter.collectOutput(logs);
    }

    /// @notice Display formatted terminal output with box and status
    function _displayTerminal(bytes memory rawOutput) internal {
        string memory formatted = TerminalFormatter.formatOutput(rawOutput);
        string memory boxed = TerminalFormatter.createBox("EhBASIC OUTPUT", formatted, 50);

        emit log_string("");
        emit log_string(boxed);

        (,,,, uint16 pc,,) = emu.cpu();
        string memory status = TerminalFormatter.statusLine(pc, totalSteps, totalSteps);
        emit log_string(status);
        emit log_string("");
    }

    /// @notice Full EhBASIC test - requires very high gas limit
    /// Run with: forge test --match-test test_HelloWorld -vv --gas-limit 500000000000
    function test_HelloWorld() public {
        vm.recordLogs();

        // 1. Cold start then CR at memory prompt
        emu.sendKeys("C\r\r");

        // Re-patch I/O vectors in case EhBASIC overwrote them during init
        emu.poke8(0x0302, 0x00);
        emu.poke8(0x0303, 0x04);
        emu.poke8(0x0300, 0x10);
        emu.poke8(0x0301, 0x04);

        // Re-write I/O handler code in case it was overwritten
        // CHROUT at $0400
        emu.poke8(0x0400, 0x8D); // STA abs
        emu.poke8(0x0401, 0x01);
        emu.poke8(0x0402, 0xF0); // $F001
        emu.poke8(0x0403, 0x60); // RTS
        // CHRIN at $0410
        emu.poke8(0x0410, 0xAD); // LDA abs
        emu.poke8(0x0411, 0x00);
        emu.poke8(0x0412, 0xF0); // $F000
        emu.poke8(0x0413, 0x60); // RTS

        // Send BASIC program and run it
        emu.sendKeys("10 PRINT \"HELLO\"\rRUN\r");

        // Run initial steps to see boot messages
        emu.run(1_000_000);
        totalSteps = 1_000_000;

        bytes memory out = _collectOutput();

        // Display formatted terminal output
        _displayTerminal(out);

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
        assertTrue(ok, "HELLO not found in output");
    }
}
