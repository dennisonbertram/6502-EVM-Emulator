// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {Emulator6502} from "../src/Emulator6502.sol";

/// @title BcdTest - Test BCD ADC/SBC operations focusing on carry flag edge cases
/// @notice These tests target NMOS 6502 BCD behavior, particularly carry flag handling
contract BcdTest is Test {
    Emulator6502 private emu;

    function setUp() public {
        emu = new Emulator6502();

        // Set up a minimal ROM with reset vector
        emu.poke8(0xFFFC, 0x00);
        emu.poke8(0xFFFD, 0x04);
        emu.boot();
    }

    /// @notice Test BCD ADC carry flag edge cases
    /// The key insight: In BCD mode, carry should be set if EITHER:
    /// 1. The high nibble sum > 0x09 (decimal carry)
    /// 2. The high nibble sum > 0x0F (binary carry)
    function test_BcdAdc_CarryFlagEdgeCases() public {
        // Test case 1: $09 + $01 = $10 (with carry clear initially)
        // Expected: A=$10, C=0 (no carry out since result < $A0)
        _testBcdAdd(0x09, 0x01, false, 0x10, false, "09+01");

        // Test case 2: $50 + $50 = $00 with carry
        // Expected: A=$00, C=1 (carry out since result would be $100)
        _testBcdAdd(0x50, 0x50, false, 0x00, true, "50+50");

        // Test case 3: $99 + $01 = $00 with carry
        // Expected: A=$00, C=1
        _testBcdAdd(0x99, 0x01, false, 0x00, true, "99+01");

        // Test case 4: $90 + $10 = $00 with carry
        // Expected: A=$00, C=1
        _testBcdAdd(0x90, 0x10, false, 0x00, true, "90+10");

        // Test case 5: $89 + $01 = $90 with no carry
        // Expected: A=$90, C=0
        _testBcdAdd(0x89, 0x01, false, 0x90, false, "89+01");

        // Test case 6: Low nibble overflow: $05 + $05 = $10
        // Expected: A=$10, C=0
        _testBcdAdd(0x05, 0x05, false, 0x10, false, "05+05");

        // Test case 7: High nibble exactly $A0: $50 + $50 = $00 with carry
        _testBcdAdd(0x50, 0x50, false, 0x00, true, "50+50 exact");

        // Test case 8: High nibble exactly $90: $45 + $45 = $90 with no carry
        _testBcdAdd(0x45, 0x45, false, 0x90, false, "45+45");

        // Test case 9: With carry in: $99 + $00 + C = $00 with carry
        _testBcdAdd(0x99, 0x00, true, 0x00, true, "99+00+C");

        // Test case 10: Minimal carry case: $00 + $00 + C = $01 with no carry
        _testBcdAdd(0x00, 0x00, true, 0x01, false, "00+00+C");
    }

    /// @notice Test specific Klaus test failure case
    /// The test traps at $34E6 with A=$01 (carry flag after AND #$01)
    /// This suggests we're producing carry=1 when we should produce carry=0
    function test_BcdAdc_KlausFailureCase() public {
        // Common edge case that might cause the issue:
        // Adding two values where high nibble sum is exactly $90 after adjustment

        // Case: $45 + $45 = $90 (no carry expected)
        // High nibble: 4 + 4 = 8, no carry from low nibble
        // Result should be $90 with C=0
        _testBcdAdd(0x45, 0x45, false, 0x90, false, "Klaus edge case 1");

        // Case: $49 + $41 = $90 (no carry expected)
        _testBcdAdd(0x49, 0x41, false, 0x90, false, "Klaus edge case 2");

        // Case: $40 + $50 = $90 (no carry expected)
        _testBcdAdd(0x40, 0x50, false, 0x90, false, "Klaus edge case 3");
    }

    /// @notice Test that binary flag behavior is correct for BCD
    /// NMOS 6502 sets N/Z/V based on BINARY result, not BCD result
    function test_BcdAdc_BinaryFlags() public {
        // $09 + $01 in BCD = $10
        // But binary sum is $0A, so Z should be 0, N should be 0
        emu.testSetA(0x09);
        emu.testSetFlag(3, true); // Set decimal mode
        emu.testSetFlag(0, false); // Clear carry

        // Write: LDA #$09, SED, CLC, ADC #$01
        emu.poke8(0x0400, 0xA9); // LDA immediate
        emu.poke8(0x0401, 0x09);
        emu.poke8(0x0402, 0xF8); // SED
        emu.poke8(0x0403, 0x18); // CLC
        emu.poke8(0x0404, 0x69); // ADC immediate
        emu.poke8(0x0405, 0x01);

        emu.testSetPC(0x0400);
        emu.step(); // LDA
        emu.step(); // SED
        emu.step(); // CLC
        emu.step(); // ADC

        (uint8 a,,,,,uint8 p,) = emu.cpu();

        // Result should be $10 (BCD)
        assertEq(a, 0x10, "BCD result should be $10");

        // But N/Z should be based on binary sum $0A
        bool z = (p & 0x02) != 0;
        bool n = (p & 0x80) != 0;

        assertFalse(z, "Zero flag should be clear (binary $0A != 0)");
        assertFalse(n, "Negative flag should be clear (binary $0A bit 7 = 0)");
    }

    function _testBcdAdd(
        uint8 a,
        uint8 value,
        bool carryIn,
        uint8 expectedA,
        bool expectedCarry,
        string memory testName
    ) internal {
        // Set up registers
        emu.testSetA(a);
        emu.testSetFlag(3, true); // Set decimal mode (D flag)
        emu.testSetFlag(0, carryIn); // Set/clear carry flag

        // Write ADC immediate instruction
        emu.poke8(0x0400, 0x69); // ADC immediate
        emu.poke8(0x0401, value);

        // Reset PC and execute
        emu.testSetPC(0x0400);
        emu.step();

        // Check results
        (uint8 resultA,,,,,uint8 p,) = emu.cpu();
        bool resultCarry = (p & 0x01) != 0;

        string memory msg = string.concat("BCD ADC test failed: ", testName);
        assertEq(resultA, expectedA, string.concat(msg, " - wrong accumulator"));
        assertEq(resultCarry, expectedCarry, string.concat(msg, " - wrong carry flag"));
    }

    /// @notice Test SBC decimal mode as well
    function test_BcdSbc_BasicCases() public {
        // $50 - $25 with borrow=0 (carry=1) = $25
        _testBcdSub(0x50, 0x25, true, 0x25, true, "50-25");

        // $25 - $50 with borrow=0 (carry=1) = $75 with borrow (carry=0)
        _testBcdSub(0x25, 0x50, true, 0x75, false, "25-50");

        // $00 - $01 with borrow=0 (carry=1) = $99 with borrow (carry=0)
        _testBcdSub(0x00, 0x01, true, 0x99, false, "00-01");
    }

    function _testBcdSub(
        uint8 a,
        uint8 value,
        bool carryIn,
        uint8 expectedA,
        bool expectedCarry,
        string memory testName
    ) internal {
        // Set up registers
        emu.testSetA(a);
        emu.testSetFlag(3, true); // Set decimal mode (D flag)
        emu.testSetFlag(0, carryIn); // Set/clear carry flag

        // Write SBC immediate instruction
        emu.poke8(0x0400, 0xE9); // SBC immediate
        emu.poke8(0x0401, value);

        // Reset PC and execute
        emu.testSetPC(0x0400);
        emu.step();

        // Check results
        (uint8 resultA,,,,,uint8 p,) = emu.cpu();
        bool resultCarry = (p & 0x01) != 0;

        string memory msg = string.concat("BCD SBC test failed: ", testName);
        assertEq(resultA, expectedA, string.concat(msg, " - wrong accumulator"));
        assertEq(resultCarry, expectedCarry, string.concat(msg, " - wrong carry flag"));
    }
}
