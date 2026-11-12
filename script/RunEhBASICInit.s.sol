// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {EhBASICInit} from "../src/EhBASICInit.sol";

/// @dev Deploy EhBASICInit and call initialize() in one transaction context
/// Run with: forge script script/RunEhBASICInit.s.sol --rpc-url http://localhost:8545 --broadcast --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --gas-limit 100000000000
contract RunEhBASICInitScript is Script {
    function run() external {
        address emuAddr = vm.envOr("EMULATOR", address(0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512));

        vm.startBroadcast();

        // Deploy init helper
        EhBASICInit init = new EhBASICInit(emuAddr);

        // Run initialization in a single transaction
        init.initialize();

        vm.stopBroadcast();
    }
}
