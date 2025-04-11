// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// libraries
import {Time} from "@openzeppelin/contracts/utils/types/Time.sol";

// contracts

library ExecutorTypes {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Types                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    // Structure that stores the details for a target contract.
    struct Target {
        // Mapping of allowed groups for this target.
        mapping(bytes4 selector => bytes32 groupId) allowedGroups;
        // Mapping of disabled functions for this target.
        mapping(bytes4 selector => bool disabled) disabledFunctions;
        // Whether the target is disabled.
        bool disabled;
    }

    struct Access {
        // Timepoint at which the user gets the permission.
        // If this is either 0 or in the future, then the role permission is not available.
        uint48 lastAccess;
        // Delay for execution. Only applies to execute() calls.
        Time.Delay delay;
    }

    struct Group {
        // Members of the group.
        mapping(address user => Access access) members;
        // Guardian Role ID who can cancel operations targeting functions that need this group.
        bytes32 guardian;
        // Delay in which the group takes effect after being granted.
        Time.Delay grantDelay;
    }

    // Structure that stores the details for a scheduled operation. This structure fits into a
    // single slot.
    struct Schedule {
        // Moment at which the operation can be executed.
        uint48 timepoint;
        // Operation nonce to allow third-party contracts to identify the operation.
        uint32 nonce;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           ERRORS                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    error CallerAlreadyRegistered();
    error CallerNotRegistered();
    error ExecutionAlreadyRegistered();
    error ExecutionNotRegistered();
    error ExecutorCallFailed();
    error ExecutionNotFound();
    error UnauthorizedCall(address caller, address target, bytes4 selector);
    error AlreadyScheduled(bytes32 operationId);
    error NotScheduled(bytes32 operationId);
    error NotReady(bytes32 operationId);
    error Expired(bytes32 operationId);
    error UnauthorizedCancel(address sender, address caller, address target, bytes4 selector);
    error UnauthorizedRenounce(address account, bytes32 groupId);
    error UnauthorizedTarget(address target);
    error ExecutionFunctionAlreadySet(bytes4 selector);
    error NullModule();
    error ExecutionHookAlreadySet(bytes32 hookId);
    error ModuleInstallCallbackFailed(address module, bytes revertReason);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           EVENTS                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    event GroupAccessGranted(
        bytes32 indexed groupId,
        address indexed account,
        uint32 delay,
        uint48 since,
        bool newMember
    );
    event GroupAccessRevoked(bytes32 indexed groupId, address indexed account);
    event GroupGuardianSet(bytes32 indexed groupId, bytes32 guardian);
    event GroupGrantDelaySet(bytes32 indexed groupId, uint32 delay);
    event TargetFunctionGroupSet(
        address indexed target,
        bytes4 indexed selector,
        bytes32 indexed groupId
    );
    event TargetFunctionDelaySet(address indexed target, uint32 newDelay, uint32 minSetback);
    event TargetFunctionDisabledSet(address indexed target, bytes4 indexed selector, bool disabled);
    event TargetDisabledSet(address indexed target, bool disabled);
    event OperationScheduled(bytes32 indexed operationId, uint48 timepoint, uint48 nonce);
    event OperationExecuted(bytes32 indexed operationId, uint32 nonce);
    event OperationCanceled(bytes32 indexed operationId, uint32 nonce);
}
