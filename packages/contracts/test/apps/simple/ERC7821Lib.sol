// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {ERC7821} from "solady/accounts/ERC7821.sol";

/// @title ERC7821Lib
/// @notice Library providing helpers for ERC-7821 batch execution modes
/// @dev Provides constants and encoding utilities for the three supported execution modes:
///      1. Single batch without opData support
///      2. Single batch with opData support
///      3. Batch of batches
library ERC7821Lib {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          CONSTANTS                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @dev Mode: Single batch without optional opData support
    /// Bytes Layout:
    /// - [0]      ( 1 byte )  `0x01` for batch call
    /// - [1]      ( 1 byte )  `0x00` for revert on any failure
    /// - [2..5]   ( 4 bytes)  Reserved by ERC7579
    /// - [6..9]   ( 4 bytes)  `0x00000000`
    /// - [10..31] (22 bytes)  Unused
    bytes32 internal constant MODE_SINGLE_BATCH =
        bytes32(uint256(0x0100000000000000000000000000000000000000000000000000000000000000));

    /// @dev Mode: Single batch with optional opData support
    /// Bytes Layout:
    /// - [0]      ( 1 byte )  `0x01` for batch call
    /// - [1]      ( 1 byte )  `0x00` for revert on any failure
    /// - [2..5]   ( 4 bytes)  Reserved by ERC7579
    /// - [6..9]   ( 4 bytes)  `0x78210001`
    /// - [10..31] (22 bytes)  Unused
    bytes32 internal constant MODE_SINGLE_BATCH_WITH_OPDATA =
        bytes32(uint256(0x0100000000007821000100000000000000000000000000000000000000000000));

    /// @dev Mode: Batch of batches
    /// Each batch in the array will be recursively executed with MODE_SINGLE_BATCH_WITH_OPDATA
    /// Bytes Layout:
    /// - [0]      ( 1 byte )  `0x01` for batch call
    /// - [1]      ( 1 byte )  `0x00` for revert on any failure
    /// - [2..5]   ( 4 bytes)  Reserved by ERC7579
    /// - [6..9]   ( 4 bytes)  `0x78210002`
    /// - [10..31] (22 bytes)  Unused
    bytes32 internal constant MODE_BATCH_OF_BATCHES =
        bytes32(uint256(0x0100000000007821000200000000000000000000000000000000000000000000));

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      CALL CONSTRUCTION                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @dev Creates a single Call struct
    /// @param to Target address (use address(0) for self-calls, will be replaced with address(this))
    /// @param value Amount of native currency to send
    /// @param data Calldata for the call
    /// @return call The constructed Call struct
    function makeCall(
        address to,
        uint256 value,
        bytes memory data
    ) internal pure returns (ERC7821.Call memory call) {
        call = ERC7821.Call({to: to, value: value, data: data});
    }

    /// @dev Creates a Call array with a single call
    /// @param to Target address
    /// @param value Amount of native currency to send
    /// @param data Calldata for the call
    /// @return calls Array containing a single Call
    function makeCalls(
        address to,
        uint256 value,
        bytes memory data
    ) internal pure returns (ERC7821.Call[] memory calls) {
        calls = new ERC7821.Call[](1);
        calls[0] = makeCall(to, value, data);
    }

    /// @dev Creates a Call array with two calls
    function makeCalls(
        address to1,
        uint256 value1,
        bytes memory data1,
        address to2,
        uint256 value2,
        bytes memory data2
    ) internal pure returns (ERC7821.Call[] memory calls) {
        calls = new ERC7821.Call[](2);
        calls[0] = makeCall(to1, value1, data1);
        calls[1] = makeCall(to2, value2, data2);
    }

    /// @dev Creates a Call array with three calls
    function makeCalls(
        address to1,
        uint256 value1,
        bytes memory data1,
        address to2,
        uint256 value2,
        bytes memory data2,
        address to3,
        uint256 value3,
        bytes memory data3
    ) internal pure returns (ERC7821.Call[] memory calls) {
        calls = new ERC7821.Call[](3);
        calls[0] = makeCall(to1, value1, data1);
        calls[1] = makeCall(to2, value2, data2);
        calls[2] = makeCall(to3, value3, data3);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    EXECUTION DATA ENCODING                 */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @dev Encodes execution data for a single batch without opData
    /// @param calls Array of calls to execute
    /// @return executionData Encoded execution data
    function encodeSingleBatch(
        ERC7821.Call[] memory calls
    ) internal pure returns (bytes memory executionData) {
        executionData = abi.encode(calls);
    }

    /// @dev Encodes execution data for a single batch with opData
    /// @param calls Array of calls to execute
    /// @param opData Optional operation data (signatures, paymaster data, etc.)
    /// @return executionData Encoded execution data
    function encodeSingleBatchWithOpData(
        ERC7821.Call[] memory calls,
        bytes memory opData
    ) internal pure returns (bytes memory executionData) {
        executionData = abi.encode(calls, opData);
    }

    /// @dev Encodes execution data for a batch of batches
    /// @param batches Array of encoded execution data for individual batches
    /// @return executionData Encoded execution data
    function encodeBatchOfBatches(
        bytes[] memory batches
    ) internal pure returns (bytes memory executionData) {
        executionData = abi.encode(batches);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    COMPLETE CALL ENCODING                  */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @dev Encodes a complete execute call for a single batch without opData
    /// @param calls Array of calls to execute
    /// @return encoded Complete calldata for the execute function
    function encodeExecute(
        ERC7821.Call[] memory calls
    ) internal pure returns (bytes memory encoded) {
        encoded = abi.encodeCall(ERC7821.execute, (MODE_SINGLE_BATCH, encodeSingleBatch(calls)));
    }

    /// @dev Encodes a complete execute call for a single batch with opData
    /// @param calls Array of calls to execute
    /// @param opData Optional operation data
    /// @return encoded Complete calldata for the execute function
    function encodeExecuteWithOpData(
        ERC7821.Call[] memory calls,
        bytes memory opData
    ) internal pure returns (bytes memory encoded) {
        encoded = abi.encodeCall(
            ERC7821.execute,
            (MODE_SINGLE_BATCH_WITH_OPDATA, encodeSingleBatchWithOpData(calls, opData))
        );
    }

    /// @dev Encodes a complete execute call for a batch of batches
    /// @param batches Array of encoded execution data for individual batches
    /// @return encoded Complete calldata for the execute function
    function encodeExecuteBatchOfBatches(
        bytes[] memory batches
    ) internal pure returns (bytes memory encoded) {
        encoded = abi.encodeCall(
            ERC7821.execute,
            (MODE_BATCH_OF_BATCHES, encodeBatchOfBatches(batches))
        );
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      CONVENIENCE HELPERS                   */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @dev Convenience function to encode a single call execution
    /// @param to Target address
    /// @param value Amount of native currency to send
    /// @param data Calldata for the call
    /// @return encoded Complete calldata for the execute function
    function encodeExecuteSingle(
        address to,
        uint256 value,
        bytes memory data
    ) internal pure returns (bytes memory encoded) {
        ERC7821.Call[] memory calls = makeCalls(to, value, data);
        return encodeExecute(calls);
    }

    /// @dev Convenience function to encode a two-call execution
    function encodeExecuteDouble(
        address to1,
        uint256 value1,
        bytes memory data1,
        address to2,
        uint256 value2,
        bytes memory data2
    ) internal pure returns (bytes memory encoded) {
        ERC7821.Call[] memory calls = makeCalls(to1, value1, data1, to2, value2, data2);
        return encodeExecute(calls);
    }

    /// @dev Convenience function to encode a three-call execution
    function encodeExecuteTriple(
        address to1,
        uint256 value1,
        bytes memory data1,
        address to2,
        uint256 value2,
        bytes memory data2,
        address to3,
        uint256 value3,
        bytes memory data3
    ) internal pure returns (bytes memory encoded) {
        ERC7821.Call[] memory calls = makeCalls(
            to1,
            value1,
            data1,
            to2,
            value2,
            data2,
            to3,
            value3,
            data3
        );
        return encodeExecute(calls);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      MODE VALIDATION                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @dev Checks if a mode is valid
    /// @param mode The execution mode to check
    /// @return valid True if the mode is one of the three supported modes
    function isValidMode(bytes32 mode) internal pure returns (bool valid) {
        return
            mode == MODE_SINGLE_BATCH ||
            mode == MODE_SINGLE_BATCH_WITH_OPDATA ||
            mode == MODE_BATCH_OF_BATCHES;
    }

    /// @dev Gets the mode type ID
    /// @param mode The execution mode
    /// @return id 0: invalid, 1: single batch, 2: single batch with opData, 3: batch of batches
    function getModeId(bytes32 mode) internal pure returns (uint256 id) {
        if (mode == MODE_SINGLE_BATCH) return 1;
        if (mode == MODE_SINGLE_BATCH_WITH_OPDATA) return 2;
        if (mode == MODE_BATCH_OF_BATCHES) return 3;
        return 0;
    }

    /// @dev Checks if a mode supports opData
    /// @param mode The execution mode to check
    /// @return supported True if the mode supports opData
    function supportsOpData(bytes32 mode) internal pure returns (bool supported) {
        return mode == MODE_SINGLE_BATCH_WITH_OPDATA || mode == MODE_BATCH_OF_BATCHES;
    }
}
