// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {ExecutorTypes} from "../libraries/ExecutorTypes.sol";
// contracts

library ExecutorStorage {
    // keccak256(abi.encode(uint256(keccak256("spaces.facets.executor.storage")) - 1)) &
    // ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0xb7e2813a9de15ce5ee4c1718778708cd70fd7ee3d196d203c0f40369a8d4a600;

    struct Layout {
        mapping(address target => ExecutorTypes.Target targetDetails) targets;
        mapping(bytes32 groupId => ExecutorTypes.Group group) groups;
        mapping(bytes32 id => ExecutorTypes.Schedule schedule) schedules;
        bytes32 executionId;
    }

    function getLayout() internal pure returns (Layout storage l) {
        assembly {
            l.slot := STORAGE_SLOT
        }
    }
}
