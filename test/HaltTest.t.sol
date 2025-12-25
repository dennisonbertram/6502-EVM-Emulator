// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {Emulator6502} from "../src/Emulator6502.sol";

/// @title HaltTest – test the HLT ($02) opcode for stopping CPU execution
/// @notice HLT is an undefined 6502 opcode commonly used as HALT/KIL/JAM.
///         We use it to cleanly stop the CPU without the interrupt semantics of BRK.
contract HaltTest is Test {
    Emulator6502 private emu;

    function setUp() public {
        emu = new Emulator6502();
    }

    function test_HLT_StopsExecution() public {
        // Program: LDA #$42, HLT
        // $0800: A9 42    LDA #$42
        // $0802: 02       HLT
        emu.poke8(0x0800, 0xA9); // LDA immediate
        emu.poke8(0x0801, 0x42); // #$42
        emu.poke8(0x0802, 0x02); // HLT

        // Set RESET vector to $0800
        emu.poke8(0xFFFC, 0x00);
        emu.poke8(0xFFFD, 0x08);
        emu.boot();

        // Run for up to 100 steps - should halt after 2 (LDA + HLT)
        emu.run(100);

        // Verify halted
        assertTrue(emu.halted(), "CPU should be halted after HLT");
    }

    function test_HLT_HaltedEventEmitted() public {
        // Just HLT at reset vector
        emu.poke8(0x0800, 0x02); // HLT

        emu.poke8(0xFFFC, 0x00);
        emu.poke8(0xFFFD, 0x08);
        emu.boot();

        vm.expectEmit(false, false, false, true);
        emit Emulator6502.ProgramHalted(1);

        emu.run(10);
    }

    function test_HLT_StepDoesNotAdvancePC() public {
        // HLT at $0800
        emu.poke8(0x0800, 0x02);

        emu.poke8(0xFFFC, 0x00);
        emu.poke8(0xFFFD, 0x08);
        emu.boot();

        // Step once to execute HLT
        emu.step();
        assertTrue(emu.halted(), "CPU should be halted after step");

        // PC should stay at $0801 (after fetching HLT)
        (,,,, uint16 pc,,) = emu.cpu();
        assertEq(pc, 0x0801, "PC should be at $0801 after HLT");
    }

    function test_BRK_StillWorksAsInterrupt() public {
        // BRK should NOT halt - it's a software interrupt
        // Set up: BRK at $0800, handler at $0900 with RTI
        emu.poke8(0x0800, 0x00); // BRK (2-byte instruction)
        emu.poke8(0x0801, 0xEA); // Padding byte (NOP, ignored by BRK)
        emu.poke8(0x0802, 0x02); // HLT - executed after RTI returns

        // IRQ vector points to $0900
        emu.poke8(0xFFFE, 0x00);
        emu.poke8(0xFFFF, 0x09);

        // Handler: RTI
        emu.poke8(0x0900, 0x40); // RTI

        // RESET vector
        emu.poke8(0xFFFC, 0x00);
        emu.poke8(0xFFFD, 0x08);
        emu.boot();

        // Run - BRK -> handler -> RTI -> HLT
        emu.run(10);

        // Should halt on the HLT after RTI returns from BRK handler
        assertTrue(emu.halted(), "CPU should halt on HLT after BRK handler returns");
    }
}
