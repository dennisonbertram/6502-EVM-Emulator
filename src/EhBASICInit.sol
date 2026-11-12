// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Emulator6502} from "./Emulator6502.sol";

/// @title EhBASICInit - Initialize EhBASIC in a single transaction
/// @dev Call `initialize()` after deployment to set up and run EhBASIC
contract EhBASICInit {
    Emulator6502 public immutable emu;

    event InitComplete(uint64 cyclesRun);

    constructor(address _emulator) {
        emu = Emulator6502(_emulator);
    }

    /// @notice Initialize and run EhBASIC in a single transaction
    /// @dev This matches the sequence in HelloWorld.t.sol test
    function initialize() external {
        // 1. Cold start keys
        emu.sendKeys("C\r\r");

        // 2. Re-patch I/O vectors (EhBASIC may overwrite during init)
        emu.poke8(0x0302, 0x00); // CHROUT low
        emu.poke8(0x0303, 0x04); // CHROUT high -> $0400

        emu.poke8(0x0300, 0x10); // CHRIN low
        emu.poke8(0x0301, 0x04); // CHRIN high -> $0410

        // Re-write I/O handler code
        // CHROUT at $0400: STA $F001; RTS
        emu.poke8(0x0400, 0x8D);
        emu.poke8(0x0401, 0x01);
        emu.poke8(0x0402, 0xF0);
        emu.poke8(0x0403, 0x60);

        // CHRIN at $0410: LDA $F000; RTS
        emu.poke8(0x0410, 0xAD);
        emu.poke8(0x0411, 0x00);
        emu.poke8(0x0412, 0xF0);
        emu.poke8(0x0413, 0x60);

        // 3. Send BASIC program
        emu.sendKeys("10 PRINT \"HELLO\"\rRUN\r");

        // 4. Run 1M cycles - this should emit CharOut events
        emu.run(1_000_000);

        emit InitComplete(1_000_000);
    }
}
