// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Time} from "@openzeppelin/contracts/utils/types/Time.sol";

/*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
/*                           STRUCTS                          */
/*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

/// @notice Structure that stores the details for a target contract
/// @param allowedGroups Mapping of allowed groups for this target
/// @param disabledFunctions Mapping of disabled functions for this target
/// @param disabled Whether the target is disabled
/// @param executionId Execution ID for the target
struct Target {
    mapping(bytes4 selector => bytes32 groupId) allowedGroups;
    mapping(bytes4 selector => bool disabled) disabledFunctions;
    bool disabled;
    bytes32 executionId;
}

/// @notice Structure that stores the details for an access
/// @param lastAccess Timepoint at which the user gets the permission
/// @param delay Delay for execution. Only applies to execute() calls
struct Access {
    uint48 lastAccess;
    Time.Delay delay;
}

/// @notice Structure that stores the details for a group
/// @param module Address of the module that created the group
/// @param members Mapping of members of the group
/// @param guardian Guardian Role ID who can cancel operations targeting functions that need this group
/// @param grantDelay Delay in which the group takes effect after being granted
/// @param active Whether the group is active
/// @param expiration Timepoint at which the group becomes inactive
struct Group {
    address module;
    mapping(address user => Access access) members;
    bytes32 guardian;
    Time.Delay grantDelay;
    bool active;
    uint48 expiration;
}

/// @notice Structure that stores the details for a scheduled operation
/// @param timepoint Moment at which the operation can be executed
/// @param nonce Operation nonce to allow third-party contracts to identify the operation
struct Schedule {
    uint48 timepoint;
    uint32 nonce;
}

interface IExecutorBase {
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
    event GroupAccessRevoked(bytes32 indexed groupId, address indexed account, bool revoked);
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
    event OperationScheduled(bytes32 indexed operationId, uint48 timepoint, uint32 nonce);
    event OperationExecuted(bytes32 indexed operationId, uint32 nonce);
    event OperationCanceled(bytes32 indexed operationId, uint32 nonce);
    event GroupStatusSet(bytes32 indexed groupId, bool active);
    event GroupExpirationSet(bytes32 indexed groupId, uint48 expiration);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           ERRORS                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    error CallerAlreadyRegistered();
    error CallerNotRegistered();
    error ExecutionAlreadyRegistered();
    error ExecutionNotRegistered();
    error ExecutorCallFailed();
    error ExecutionNotFound();
    error UnauthorizedCall();
    error AlreadyScheduled();
    error NotScheduled();
    error NotReady();
    error Expired();
    error UnauthorizedCancel();
    error UnauthorizedRenounce();
    error UnauthorizedTarget();
    error ExecutionFunctionAlreadySet();
    error NullModule();
    error ExecutionHookAlreadySet();
    error ModuleInstallCallbackFailed();
    error InvalidDataLength();
    error InvalidExpiration();
}

interface IExecutor is IExecutorBase {
    /**
     * @notice Grants access to a group for an account with a delay
     * @param groupId The group ID
     * @param account The account to grant access to
     * @param delay The delay for the access to be effective
     * @return newMember Whether the account is a new member of the group
     */
    function grantAccess(
        bytes32 groupId,
        address account,
        uint32 delay
    ) external returns (bool newMember);

    /**
     * @notice Grants access to a group for an account with a delay and expiration
     * @param groupId The group ID
     * @param account The account to grant access to
     * @param delay The delay for the access to be effective
     * @param expiration The expiration timepoint for the access
     * @return newMember Whether the account is a new member of the group
     */
    function grantAccessWithExpiration(
        bytes32 groupId,
        address account,
        uint32 delay,
        uint48 expiration
    ) external returns (bool newMember);

    /**
     * @notice Revokes access to a group for an account
     * @param groupId The group ID
     * @param account The account to revoke access from
     */
    function revokeAccess(bytes32 groupId, address account) external;

    /**
     * @notice Renounces access to a group for an account
     * @param groupId The group ID
     * @param account The account to renounce access from
     */
    function renounceAccess(bytes32 groupId, address account) external;

    /**
     * @notice Sets the guardian role for a group
     * @param groupId The group ID
     * @param guardian The guardian role ID
     */
    function setGuardian(bytes32 groupId, bytes32 guardian) external;

    /**
     * @notice Sets the grant delay for a group
     * @param groupId The group ID
     * @param delay The delay for granting access
     */
    function setGroupDelay(bytes32 groupId, uint32 delay) external;

    /**
     * @notice Sets the expiration for a group
     * @param groupId The group ID
     * @param expiration The expiration timestamp
     */
    function setGroupExpiration(bytes32 groupId, uint48 expiration) external;

    /**
     * @notice Sets the group ID for a target function
     * @param target The target contract address
     * @param selector The function selector
     * @param groupId The group ID
     */
    function setTargetFunctionGroup(address target, bytes4 selector, bytes32 groupId) external;

    /**
     * @notice Disables or enables a target contract
     * @param target The target contract address
     * @param disabled Whether the target should be disabled
     */
    function setTargetDisabled(address target, bool disabled) external;

    /**
     * @notice Schedules an operation for future execution
     * @param target The target contract address
     * @param data The calldata for the operation
     * @param when The timestamp when the operation can be executed
     * @return operationId The unique identifier for the operation
     * @return nonce The operation nonce
     */
    function scheduleOperation(
        address target,
        bytes calldata data,
        uint48 when
    ) external payable returns (bytes32 operationId, uint32 nonce);

    /**
     * @notice Executes an operation immediately or after delay
     * @param target The target contract address
     * @param value The value for the operation
     * @param data The calldata for the operation
     * @return nonce The operation nonce if scheduled, 0 if immediate
     */
    function execute(
        address target,
        uint256 value,
        bytes calldata data
    ) external payable returns (uint32 nonce);

    /**
     * @notice Cancels a scheduled operation
     * @param caller The account that scheduled the operation
     * @param target The target contract address
     * @param data The calldata for the operation
     * @return nonce The operation nonce
     */
    function cancel(
        address caller,
        address target,
        bytes calldata data
    ) external returns (uint32 nonce);

    /**
     * @notice Checks if an account has access to a group
     * @param groupId The group ID
     * @param account The account to check access for
     * @return isMember Whether the account is a member of the group
     * @return executionDelay The delay for the access to be effective
     * @return active Whether the group is active
     */
    function hasAccess(
        bytes32 groupId,
        address account
    ) external view returns (bool isMember, uint32 executionDelay, bool active);

    /**
     * @notice Gets the access information for an account in a group
     * @param groupId The group ID
     * @param account The account to get access information for
     * @return since The timestamp when the access was granted
     * @return currentDelay The current delay for the access
     * @return pendingDelay The pending delay for the access
     * @return effect The effect of the access
     */
    function getAccess(
        bytes32 groupId,
        address account
    ) external view returns (uint48 since, uint32 currentDelay, uint32 pendingDelay, uint48 effect);

    /**
     * @notice Gets the grant delay for a group
     * @param groupId The group ID
     * @return The grant delay
     */
    function getGroupDelay(bytes32 groupId) external view returns (uint32);

    /**
     * @notice Gets the scheduled timepoint for an operation
     * @param id The operation ID
     * @return The scheduled timepoint, or 0 if not scheduled or expired
     */
    function getScheduleTimepoint(bytes32 id) external view returns (uint48);

    /**
     * @notice Checks if a target is currently executing
     * @param target The target contract address
     * @return True if the target is currently executing
     */
    function onExecution(address target) external view returns (bool);

    /**
     * @notice Hashes an operation
     * @param caller The caller address
     * @param target The target contract address
     * @param data The calldata for the operation
     * @return The hash of the operation
     */
    function hashOperation(
        address caller,
        address target,
        bytes calldata data
    ) external pure returns (bytes32);
}
