// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {Emulator6502} from "../src/Emulator6502.sol";

/// @title RunLoopTest – verifies boot() and run() halt behaviour
/// @notice Uses HLT ($02) opcode for clean halting. BRK ($00) is a software
///         interrupt that continues execution, not a halt instruction.
contract RunLoopTest is Test {
    Emulator6502 emu;

    // Test program: single HLT instruction at $0800
    uint16 constant RESET_VECTOR = 0x0800;

    function setUp() public {
        emu = new Emulator6502();

        // Write HLT opcode ($02) at reset vector target
        emu.poke8(RESET_VECTOR, 0x02);

        // Point RESET vector ($FFFC/$FFFD) to 0x0800 little endian
        emu.poke8(0xFFFC, uint8(RESET_VECTOR & 0x00FF));
        emu.poke8(0xFFFD, uint8(RESET_VECTOR >> 8));

        // Boot CPU so it reads new RESET vector
        emu.boot();
    }

    function testRunHaltsOnHLT() public {
        vm.expectEmit(false, false, false, true);
        emit Emulator6502.ProgramHalted(1);

        emu.run(10);

        // Ensure halted flag is true
        assertTrue(emu.halted(), "CPU should halt after HLT");
    }
}
