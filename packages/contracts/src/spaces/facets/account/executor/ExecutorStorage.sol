// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// types
import {Target, Group, Schedule} from "./IExecutor.sol";

// libraries

// contracts

library ExecutorStorage {
    // keccak256(abi.encode(uint256(keccak256("spaces.facets.executor.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0xb7e2813a9de15ce5ee4c1718778708cd70fd7ee3d196d203c0f40369a8d4a600;

    struct Layout {
        // Execution ID
        bytes32 executionId;
        // Target => Target Details
        mapping(address target => Target targetDetails) targets;
        // Group ID => Group
        mapping(bytes32 groupId => Group group) groups;
        // Schedule ID => Schedule
        mapping(bytes32 scheduleId => Schedule schedule) schedules;
    }

    function getLayout() internal pure returns (Layout storage l) {
        assembly {
            l.slot := STORAGE_SLOT
        }
    }
}
