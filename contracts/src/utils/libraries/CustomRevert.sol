// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title Library for reverting with custom errors efficiently
/// @notice Contains functions for reverting with custom errors with different argument types
/// efficiently
/// @dev To use this library, declare `using CustomRevert for bytes4;` and replace `revert
/// CustomError()` with
/// `CustomError.selector.revertWith()`
/// @dev The functions may tamper with the free memory pointer but it is fine since the call context
/// is exited immediately
library CustomRevert {
    /// @dev Reverts with the selector of a custom error in the scratch space
    function revertWith(bytes4 selector) internal pure {
        assembly ("memory-safe") {
            mstore(0, selector)
            revert(0, 0x04)
        }
    }

    /// @dev Reverts with a custom error with a uint256 argument in the scratch space
    function revertWith(bytes4 selector, uint256 value) internal pure {
        assembly ("memory-safe") {
            mstore(0, selector)
            mstore(0x04, value)
            revert(0, 0x24)
        }
    }

    /// @dev Reverts with a custom error with an address argument in the scratch space
    function revertWith(bytes4 selector, address addr) internal pure {
        assembly ("memory-safe") {
            mstore(0, selector)
            mstore(0x04, and(addr, 0xffffffffffffffffffffffffffffffffffffffff))
            revert(0, 0x24)
        }
    }

    /// @dev Reverts with the legacy error message without additional allocation
    function revertWith(string memory message) internal pure {
        assembly ("memory-safe") {
            mstore(sub(message, 0x40), 0x08c379a0) // Error(string)
            mstore(sub(message, 0x20), 0x20) // abi encoding offset
            // round up to multiple of 32
            let len := and(add(mload(message), 0x1f), not(0x1f))
            revert(sub(message, 0x24), add(len, 0x44))
        }
    }
}
