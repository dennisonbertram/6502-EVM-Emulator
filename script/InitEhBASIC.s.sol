// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {Emulator6502} from "../src/Emulator6502.sol";

/// @dev Initialize EhBASIC: send keys, patch I/O, run cycles, emit CharOut events
/// @notice Run with: forge script script/InitEhBASIC.s.sol --rpc-url http://localhost:8545 --broadcast --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --gas-limit 100000000000
contract InitEhBASICScript is Script {
    function run() external {
        // Get emulator address from env or use default
        address emuAddr = vm.envOr("EMULATOR", address(0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512));
        Emulator6502 emu = Emulator6502(emuAddr);

        vm.startBroadcast();

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

        vm.stopBroadcast();
    }
}
