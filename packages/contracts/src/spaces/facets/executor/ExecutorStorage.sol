// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// types

// libraries

// types
import {Group, Schedule, Target} from "./IExecutor.sol";
import {HookConfig} from "./hooks/IHookBase.sol";
import {GroupLib} from "./GroupLib.sol";

// contracts

library ExecutorStorage {
    using GroupLib for Group;

    struct Layout {
        // Execution ID
        bytes32 executionId;
        // Target => Target Details
        mapping(address target => Target targetDetails) targets;
        // Group ID => Group
        mapping(bytes32 groupId => Group group) groups;
        // Schedule ID => Schedule
        mapping(bytes32 scheduleId => Schedule schedule) schedules;
        // Hook Config ID => Hook Config
        mapping(bytes32 configId => HookConfig config) hooks;
    }

    // keccak256(abi.encode(uint256(keccak256("spaces.facets.executor.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0xb7e2813a9de15ce5ee4c1718778708cd70fd7ee3d196d203c0f40369a8d4a600;

    // keccak256(abi.encode(uint256(keccak256("spaces.facets.executor.transient.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant TRANSIENT_STORAGE_SLOT =
        0x50b382cc42d5e85c7df990b4496d41f5c12a6bb29194f1db29e58a2d7a053600;

    function getLayout() internal pure returns (Layout storage l) {
        assembly {
            l.slot := STORAGE_SLOT
        }
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        Group Access                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    function getGroup(bytes32 groupId) internal view returns (Group storage) {
        return getLayout().groups[groupId];
    }

    function hasGroupAccess(
        bytes32 groupId,
        address account
    ) internal view returns (bool isMember, uint32 executionDelay, bool active) {
        Group storage group = getGroup(groupId);
        (isMember, executionDelay) = group.hasAccess(account);

        // Check both active status and expiration
        active = group.active && (group.expiration == 0 || group.expiration > block.timestamp);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   Transient Execution Id                   */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function getExecutionId() internal view returns (bytes32 id) {
        assembly {
            id := tload(TRANSIENT_STORAGE_SLOT)
        }
    }

    function setExecutionId(bytes32 id) internal {
        assembly {
            tstore(TRANSIENT_STORAGE_SLOT, id)
        }
    }

    function getTargetExecutionId(address target) internal view returns (bytes32 id) {
        assembly {
            id := tload(target)
        }
    }

    function setTargetExecutionId(address target, bytes32 id) internal {
        assembly {
            tstore(target, id)
        }
    }

    function clearExecutionId(address target) internal {
        assembly {
            tstore(TRANSIENT_STORAGE_SLOT, 0)
            tstore(target, 0)
        }
    }

    function clearTargetExecutionId(address target) internal {
        assembly {
            tstore(target, 0)
        }
    }
}
