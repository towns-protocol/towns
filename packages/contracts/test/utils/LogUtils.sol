// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Vm} from "forge-std/Vm.sol";

abstract contract LogUtils {
    /// @dev Returns the first log that matches the topic0
    function _getFirstMatchingLog(
        Vm.Log[] memory logs,
        bytes32 topic0
    ) internal pure returns (Vm.Log memory log) {
        for (uint256 i; i < logs.length; ++i) {
            log = logs[i];
            if (log.topics.length > 0 && log.topics[0] == topic0) {
                return log;
            }
        }
        revert("Log not found");
    }

    /// @dev Returns the Nth log (zero-indexed) that matches the topic0, where N is the provided
    /// index.
    /// For example, index=0 returns the first matching log, index=1 returns the second matching
    /// log,
    /// etc.
    /// @param logs Array of logs to search through
    /// @param topic The topic0 to match against
    /// @param index The Nth occurrence to find (0-based)
    /// @return log The matching log
    function _getMatchingLogAtIndex(
        Vm.Log[] memory logs,
        bytes32 topic,
        uint256 index
    ) internal pure returns (Vm.Log memory log) {
        uint256 currentIndex;
        for (uint256 i; i < logs.length; ++i) {
            log = logs[i];
            if (log.topics[0] == topic) {
                if (currentIndex++ == index) return log;
            }
        }
        revert("Log not found at index");
    }

    /// @dev Returns the count of logs that match the topic0
    function _getMatchingLogCount(
        Vm.Log[] memory logs,
        bytes32 topic0
    ) internal pure returns (uint256 count) {
        for (uint256 i; i < logs.length; ++i) {
            Vm.Log memory log = logs[i];
            if (log.topics.length > 0 && log.topics[0] == topic0) {
                ++count;
            }
        }
    }

    /// @dev Returns an array of logs that match the topic0
    /// No alloc is done for the array. It is just an array of pointers to the existing logs.
    function _getMatchingLogs(
        Vm.Log[] memory logs,
        bytes32 topic0
    ) internal pure returns (Vm.Log[] memory matchingLogs) {
        uint256 length = logs.length;
        // allocates an array of pointers to the logs
        // similar to `matchingLogs = new Vm.Log[](length)` without the struct allocation
        assembly ("memory-safe") {
            matchingLogs := mload(0x40)
            mstore(matchingLogs, length)
            mstore(0x40, add(add(matchingLogs, shl(5, length)), 0x20))
        }
        uint256 index;
        for (uint256 i; i < length; ++i) {
            Vm.Log memory log = logs[i];
            if (log.topics.length > 0 && log.topics[0] == topic0) {
                matchingLogs[index++] = log;
            }
        }
        assembly ("memory-safe") {
            mstore(matchingLogs, index)
        }
    }
}
