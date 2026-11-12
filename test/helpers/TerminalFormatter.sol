// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Vm.sol";

/// @title TerminalFormatter - Format CharOut events as readable ASCII terminal output
/// @notice Provides utilities for displaying emulator output in a retro terminal style
library TerminalFormatter {
    // CharOut event signature
    bytes32 private constant CHAR_OUT_TOPIC = keccak256("CharOut(uint8)");

    /// @notice Extract raw bytes from CharOut event logs
    /// @param logs Array of logs from vm.getRecordedLogs()
    /// @return out Raw bytes of character output
    function collectOutput(Vm.Log[] memory logs) internal pure returns (bytes memory out) {
        for (uint256 i; i < logs.length; ++i) {
            if (logs[i].topics.length > 0 && logs[i].topics[0] == CHAR_OUT_TOPIC) {
                out = bytes.concat(out, bytes1(uint8(abi.decode(logs[i].data, (uint8)))));
            }
        }
    }

    /// @notice Format raw output bytes as readable string
    /// @param raw Raw bytes from collectOutput
    /// @return formatted Human-readable string with CR converted to newlines
    function formatOutput(bytes memory raw) internal pure returns (string memory formatted) {
        bytes memory result;
        for (uint256 i; i < raw.length; ++i) {
            uint8 c = uint8(raw[i]);
            if (c == 0x0D) {
                // CR -> newline
                result = bytes.concat(result, "\n");
            } else if (c == 0x0A) {
                // LF -> skip if after CR, otherwise newline
                if (i == 0 || uint8(raw[i - 1]) != 0x0D) {
                    result = bytes.concat(result, "\n");
                }
            } else if (c >= 0x20 && c < 0x7F) {
                // Printable ASCII
                result = bytes.concat(result, bytes1(c));
            } else if (c == 0x07) {
                // Bell -> [BEEP]
                result = bytes.concat(result, "[BEEP]");
            } else if (c == 0x08) {
                // Backspace -> [BS]
                result = bytes.concat(result, "[BS]");
            }
            // Skip other control characters
        }
        return string(result);
    }

    /// @notice Create a boxed terminal display
    /// @param title Box title
    /// @param content Content to display in box
    /// @param width Box width (default 44)
    /// @return boxed Formatted box string
    function createBox(
        string memory title,
        string memory content,
        uint256 width
    ) internal pure returns (string memory boxed) {
        if (width == 0) width = 44;

        // Top border
        bytes memory result = _horizontalLine(width, true);
        result = bytes.concat(result, "\n");

        // Title line
        result = bytes.concat(result, _centeredLine(title, width));
        result = bytes.concat(result, "\n");

        // Separator
        result = bytes.concat(result, _horizontalLine(width, false));
        result = bytes.concat(result, "\n");

        // Content lines
        bytes memory contentBytes = bytes(content);
        bytes memory line;
        for (uint256 i; i < contentBytes.length; ++i) {
            if (contentBytes[i] == 0x0A) {
                result = bytes.concat(result, _paddedLine(string(line), width));
                result = bytes.concat(result, "\n");
                line = "";
            } else {
                line = bytes.concat(line, contentBytes[i]);
            }
        }
        // Last line if no trailing newline
        if (line.length > 0) {
            result = bytes.concat(result, _paddedLine(string(line), width));
            result = bytes.concat(result, "\n");
        }

        // Bottom border
        result = bytes.concat(result, _horizontalLine(width, true));

        return string(result);
    }

    /// @notice Create a status line for CPU state
    /// @param pc Program counter
    /// @param cycles Cycle count
    /// @param steps Step count
    /// @return status Formatted status string
    function statusLine(
        uint16 pc,
        uint64 cycles,
        uint64 steps
    ) internal pure returns (string memory status) {
        return string(
            bytes.concat(
                "PC: $",
                _toHex16(pc),
                " | Cycles: ",
                _formatNumber(cycles),
                " | Steps: ",
                _formatNumber(steps)
            )
        );
    }

    // === Internal Helpers ===

    function _horizontalLine(uint256 width, bool isEdge) internal pure returns (bytes memory) {
        bytes memory result;
        if (isEdge) {
            result = bytes.concat(result, "+");
        } else {
            result = bytes.concat(result, "|");
        }
        for (uint256 i = 0; i < width - 2; ++i) {
            result = bytes.concat(result, "-");
        }
        if (isEdge) {
            result = bytes.concat(result, "+");
        } else {
            result = bytes.concat(result, "|");
        }
        return result;
    }

    function _centeredLine(string memory text, uint256 width) internal pure returns (bytes memory) {
        bytes memory textBytes = bytes(text);
        uint256 textLen = textBytes.length;
        uint256 innerWidth = width - 2; // Account for | on each side

        if (textLen >= innerWidth) {
            return bytes.concat("|", textBytes, "|");
        }

        uint256 padding = (innerWidth - textLen) / 2;
        bytes memory result = "|";
        for (uint256 i = 0; i < padding; ++i) {
            result = bytes.concat(result, " ");
        }
        result = bytes.concat(result, textBytes);
        uint256 remaining = innerWidth - padding - textLen;
        for (uint256 i = 0; i < remaining; ++i) {
            result = bytes.concat(result, " ");
        }
        result = bytes.concat(result, "|");
        return result;
    }

    function _paddedLine(string memory text, uint256 width) internal pure returns (bytes memory) {
        bytes memory textBytes = bytes(text);
        uint256 textLen = textBytes.length;
        uint256 innerWidth = width - 4; // Account for "| " and " |"

        bytes memory result = "| ";

        if (textLen > innerWidth) {
            // Truncate
            for (uint256 i = 0; i < innerWidth; ++i) {
                result = bytes.concat(result, textBytes[i]);
            }
        } else {
            result = bytes.concat(result, textBytes);
            for (uint256 i = textLen; i < innerWidth; ++i) {
                result = bytes.concat(result, " ");
            }
        }
        result = bytes.concat(result, " |");
        return result;
    }

    function _toHex16(uint16 val) internal pure returns (bytes memory) {
        bytes memory hexChars = "0123456789ABCDEF";
        bytes memory result = new bytes(4);
        result[0] = hexChars[(val >> 12) & 0xF];
        result[1] = hexChars[(val >> 8) & 0xF];
        result[2] = hexChars[(val >> 4) & 0xF];
        result[3] = hexChars[val & 0xF];
        return result;
    }

    function _formatNumber(uint64 num) internal pure returns (bytes memory) {
        if (num == 0) return "0";

        // Count digits
        uint64 temp = num;
        uint256 digits;
        while (temp > 0) {
            digits++;
            temp /= 10;
        }

        // Calculate length with commas
        uint256 commas = (digits - 1) / 3;
        uint256 len = digits + commas;

        bytes memory result = new bytes(len);
        uint256 pos = len;
        uint256 digitCount;

        while (num > 0) {
            if (digitCount > 0 && digitCount % 3 == 0) {
                pos--;
                result[pos] = ",";
            }
            pos--;
            result[pos] = bytes1(uint8(48 + (num % 10)));
            num /= 10;
            digitCount++;
        }

        return result;
    }
}
