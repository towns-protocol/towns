// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// types

import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {Time} from "@openzeppelin/contracts/utils/types/Time.sol";

// interfaces

// types

// libraries
import {HookLib} from "./HookLib.sol";
import {OwnableStorage} from "@towns-protocol/diamond/src/facets/ownable/OwnableStorage.sol";
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";
import {LibCall} from "solady/utils/LibCall.sol";
// contracts

library ExecutorLib {
    using EnumerableSetLib for EnumerableSetLib.Uint256Set;
    using Time for Time.Delay;
    using Time for uint32;

    uint32 private constant DEFAULT_EXPIRATION = 1 weeks;
    uint32 private constant DEFAULT_MIN_SETBACK = 5 days;

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
        // Address of the module that created the group.
        address module;
        // Members of the group.
        mapping(address user => Access access) members;
        // Guardian Role ID who can cancel operations targeting functions that need this group.
        bytes32 guardian;
        // Delay in which the group takes effect after being granted.
        Time.Delay grantDelay;
        // Allowed value of ETH that can be spent by the group.
        uint256 allowance;
        // Whether the group is active.
        bool active;
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
    /*                           STORAGE                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    // keccak256(abi.encode(uint256(keccak256("spaces.facets.executor.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0xb7e2813a9de15ce5ee4c1718778708cd70fd7ee3d196d203c0f40369a8d4a600;

    struct Layout {
        mapping(address target => Target targetDetails) targets;
        mapping(bytes32 groupId => Group group) groups;
        mapping(bytes32 id => Schedule schedule) schedules;
        bytes32 executionId;
    }

    function getLayout() internal pure returns (Layout storage l) {
        assembly {
            l.slot := STORAGE_SLOT
        }
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
    error InvalidDataLength();
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
    event GroupMaxEthValueSet(bytes32 indexed groupId, uint256 allowance);
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

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           GROUP MANAGEMENT                 */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function createGroup(bytes32 groupId, address module) internal {
        if (module == address(0)) revert NullModule();
        Group storage group = getLayout().groups[groupId];
        group.module = module;
        group.active = true;
    }

    function removeGroup(bytes32 groupId) internal {
        Group storage group = getLayout().groups[groupId];
        group.module = address(0);
        group.active = false;
    }

    /// @dev Grants access to a group for an account
    /// @param groupId The ID of the group
    /// @param account The account to grant access to
    /// @param grantDelay The delay at which the access will take effect
    /// @param executionDelay The delay for the access
    /// @return newMember Whether the account is a new member of the group
    function grantGroupAccess(
        bytes32 groupId,
        address account,
        uint32 grantDelay,
        uint32 executionDelay
    ) internal returns (bool newMember) {
        Group storage group = getLayout().groups[groupId];

        newMember = group.members[account].lastAccess == 0;
        uint48 lastAccess;

        if (newMember) {
            lastAccess = Time.timestamp() + grantDelay;
            group.members[account] = Access({
                lastAccess: lastAccess,
                delay: executionDelay.toDelay()
            });
        } else {
            // just update the access delay
            (group.members[account].delay, lastAccess) = group.members[account].delay.withUpdate(
                executionDelay,
                0
            );
        }

        emit GroupAccessGranted(groupId, account, executionDelay, lastAccess, newMember);
        return newMember;
    }

    function revokeGroupAccess(bytes32 groupId, address account) internal returns (bool revoked) {
        Group storage group = getLayout().groups[groupId];
        Access storage access = group.members[account];

        if (access.lastAccess == 0) {
            return false;
        }

        group.module = address(0);
        group.active = false;

        // delete the access
        delete group.members[account];
        return true;
    }

    function renounceGroupAccess(bytes32 groupId, address account) internal {
        if (account != msg.sender) {
            revert UnauthorizedRenounce(account, groupId);
        }

        revokeGroupAccess(groupId, account);
    }

    function setGroupGuardian(bytes32 groupId, bytes32 guardian) internal {
        getLayout().groups[groupId].guardian = guardian;
        emit GroupGuardianSet(groupId, guardian);
    }

    function setGroupAllowance(bytes32 groupId, uint256 allowance) internal {
        Group storage group = getLayout().groups[groupId];
        group.allowance = allowance;
        emit GroupMaxEthValueSet(groupId, allowance);
    }

    function getGroupGuardian(bytes32 groupId) internal view returns (bytes32) {
        return getLayout().groups[groupId].guardian;
    }

    function getGroupGrantDelay(bytes32 groupId) internal view returns (uint32) {
        return getLayout().groups[groupId].grantDelay.get();
    }

    function getGroupAllowance(bytes32 groupId) internal view returns (uint256) {
        return getLayout().groups[groupId].allowance;
    }

    function setGroupGrantDelay(bytes32 groupId, uint32 grantDelay, uint32 minSetback) internal {
        if (minSetback == 0) {
            minSetback = DEFAULT_MIN_SETBACK;
        }

        uint48 effect;
        (getLayout().groups[groupId].grantDelay, effect) = getLayout()
            .groups[groupId]
            .grantDelay
            .withUpdate(grantDelay, minSetback);
        emit GroupGrantDelaySet(groupId, grantDelay);
    }

    function hasGroupAccess(
        bytes32 groupId,
        address account
    ) internal view returns (bool isMember, uint32 executionDelay, uint256 allowance, bool active) {
        (uint48 hasRoleSince, uint32 currentDelay, , ) = getAccess(groupId, account);
        return (
            hasRoleSince != 0 && hasRoleSince <= Time.timestamp(),
            currentDelay,
            getGroupAllowance(groupId),
            isGroupActive(groupId)
        );
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           ACCESS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function isGroupActive(bytes32 groupId) internal view returns (bool) {
        return getLayout().groups[groupId].active;
    }

    function getAccess(
        bytes32 groupId,
        address account
    )
        internal
        view
        returns (uint48 since, uint32 currentDelay, uint32 pendingDelay, uint48 effect)
    {
        Access storage access = getLayout().groups[groupId].members[account];
        since = access.lastAccess;
        (currentDelay, pendingDelay, effect) = access.delay.getFull();
        return (since, currentDelay, pendingDelay, effect);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       TARGET MANAGEMENT                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    function setTargetFunctionGroup(address target, bytes4 selector, bytes32 groupId) internal {
        getLayout().targets[target].allowedGroups[selector] = groupId;
        emit TargetFunctionGroupSet(target, selector, groupId);
    }

    function setTargetFunctionDisabled(address target, bytes4 selector, bool disabled) internal {
        getLayout().targets[target].disabledFunctions[selector] = disabled;
        emit TargetFunctionDisabledSet(target, selector, disabled);
    }

    function setTargetDisabled(address target, bool disabled) internal {
        getLayout().targets[target].disabled = disabled;
        emit TargetDisabledSet(target, disabled);
    }

    function getTargetFunctionGroupId(
        address target,
        bytes4 selector
    ) internal view returns (bytes32) {
        return getLayout().targets[target].allowedGroups[selector];
    }

    function isTargetDisabled(address target) internal view returns (bool) {
        return getLayout().targets[target].disabled;
    }

    function isTargetFunctionDisabled(
        address target,
        bytes4 selector
    ) internal view returns (bool) {
        return getLayout().targets[target].disabledFunctions[selector];
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         EXECUTION                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    function scheduleExecution(
        address target,
        uint256 value,
        bytes calldata data,
        uint48 when
    ) internal returns (bytes32 operationId, uint32 nonce) {
        address caller = msg.sender;

        // Fetch restrictions that apply to the caller on the targeted function
        (, uint32 setback) = _canCallExtended(caller, target, value, data);

        uint48 minWhen = Time.timestamp() + setback;

        // If call with delay is not authorized, or if requested timing is too soon, revert
        if (setback == 0 || (when > 0 && when < minWhen)) {
            revert UnauthorizedCall(caller, target, checkSelector(data));
        }

        when = uint48(Math.max(when, minWhen));

        // If caller is authorized, schedule operation
        operationId = hashOperation(caller, target, data);

        _checkNotScheduled(operationId);

        unchecked {
            // It's not feasible to overflow the nonce in less than 1000 years
            nonce = getLayout().schedules[operationId].nonce + 1;
        }

        getLayout().schedules[operationId] = Schedule({timepoint: when, nonce: nonce});
        emit OperationScheduled(operationId, when, nonce);
    }

    function getSchedule(bytes32 id) internal view returns (uint48) {
        uint48 timepoint = getLayout().schedules[id].timepoint;
        return _isExpired(timepoint, 0) ? 0 : timepoint;
    }

    function consumeScheduledOp(bytes32 operationId) internal returns (uint32) {
        uint48 timepoint = getLayout().schedules[operationId].timepoint;
        uint32 nonce = getLayout().schedules[operationId].nonce;

        if (timepoint == 0) {
            revert NotScheduled(operationId);
        } else if (timepoint > Time.timestamp()) {
            revert NotReady(operationId);
        } else if (_isExpired(timepoint, 0)) {
            revert Expired(operationId);
        }

        Schedule storage schedule = getLayout().schedules[operationId];
        delete schedule.timepoint; // reset the timepoint, keep the nonce
        emit OperationExecuted(operationId, nonce);

        return nonce;
    }

    function execute(
        address target,
        uint256 value,
        bytes calldata data
    ) internal returns (bytes memory result, uint32 nonce) {
        address caller = msg.sender;
        bytes4 selector = checkSelector(data);

        // Fetch restrictions that apply to the caller on the targeted function
        (bool allowed, uint32 delay) = _canCallExtended(caller, target, value, data);

        // If call is not authorized, revert
        if (!allowed && delay == 0) {
            revert UnauthorizedCall(caller, target, checkSelector(data));
        }

        bytes32 operationId = hashOperation(caller, target, data);

        // If caller is authorized, check operation was scheduled early enough
        // Consume an available schedule even if there is no currently enforced delay
        if (delay != 0 || getSchedule(operationId) != 0) {
            nonce = consumeScheduledOp(operationId);
        }

        // Run pre hooks before execution
        HookLib.executePreHooks(selector, value, data);

        // Mark the target and selector as authorized
        bytes32 executionIdBefore = getLayout().executionId;
        getLayout().executionId = _hashExecutionId(target, checkSelector(data));

        // Reduce the allowance of the group before external call
        bytes32 groupId = getTargetFunctionGroupId(target, selector);
        getLayout().groups[groupId].allowance -= value;

        // Call the target
        result = LibCall.callContract(target, value, data);

        // Run post hooks after execution (will run even if execution fails)
        HookLib.executePostHooks(selector);

        // Reset the executionId
        getLayout().executionId = executionIdBefore;

        return (result, nonce);
    }

    function cancel(address caller, address target, bytes calldata data) internal returns (uint32) {
        address sender = msg.sender;
        bytes4 selector = checkSelector(data);

        bytes32 operationId = hashOperation(caller, target, data);

        Schedule storage schedule = getLayout().schedules[operationId];

        // If the operation is not scheduled, revert
        if (schedule.timepoint == 0) {
            revert NotScheduled(operationId);
        } else if (caller != sender) {
            // calls can only be canceled by the account that scheduled them, a global admin, or by
            // a guardian of the required role.
            (bool isGuardian, , , ) = hasGroupAccess(
                getGroupGuardian(getTargetFunctionGroupId(target, selector)),
                sender
            );
            bool isOwner = OwnableStorage.layout().owner == sender;
            if (!isGuardian && !isOwner) {
                revert UnauthorizedCancel(sender, caller, target, selector);
            }
        }

        delete schedule.timepoint; // reset the timepoint,
        // keep the nonce
        uint32 nonce = schedule.nonce;
        emit OperationCanceled(operationId, nonce);

        return nonce;
    }

    function canCall(
        address caller,
        address target,
        uint256 value,
        bytes4 selector
    ) internal view returns (bool immediate, uint32 delay) {
        if (isTargetDisabled(target)) {
            return (false, 0);
        } else if (isTargetFunctionDisabled(target, selector)) {
            return (false, 0);
        } else if (caller == address(this)) {
            // Caller is Space, this means the call was sent through {execute} and it already
            // checked
            // permissions. We verify that the call "identifier", which is set during {execute}, is
            // correct.
            return (_isExecuting(target, selector), 0);
        } else {
            bytes32 groupId = getTargetFunctionGroupId(target, selector);
            (bool isMember, uint32 currentDelay, uint256 allowance, bool active) = hasGroupAccess(
                groupId,
                caller
            );
            if (!active) return (false, 0);
            if (value > allowance) return (false, 0);
            return isMember ? (currentDelay == 0, currentDelay) : (false, 0);
        }
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           PRIVATE FUNCTIONS                */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    function hashOperation(
        address caller,
        address target,
        bytes calldata data
    ) internal pure returns (bytes32) {
        return keccak256(abi.encode(caller, target, data));
    }

    function _checkNotScheduled(bytes32 operationId) private view {
        uint48 prevTimepoint = getLayout().schedules[operationId].timepoint;
        if (prevTimepoint != 0 && !_isExpired(prevTimepoint, 0)) {
            revert AlreadyScheduled(operationId);
        }
    }

    // Fetch restrictions that apply to the caller on the targeted function
    function _canCallExtended(
        address caller,
        address target,
        uint256 value,
        bytes calldata data
    ) private view returns (bool allowed, uint32 delay) {
        if (target == address(this)) {
            return canCallSelf(caller, value, data);
        } else {
            return
                data.length < 4 ? (false, 0) : canCall(caller, target, value, checkSelector(data));
        }
    }

    function canCallSelf(
        address caller,
        uint256 value,
        bytes calldata data
    ) internal view returns (bool immediate, uint32 delay) {
        if (data.length < 4) {
            return (false, 0);
        }

        if (caller == address(this)) {
            // Caller is itself, this means the call was sent through {execute} and it already
            // checked permissions. We verify that the call "identifier", which is set during
            // {execute}, is correct.
            return (_isExecuting(address(this), checkSelector(data)), 0);
        }

        if (isTargetDisabled(address(this))) {
            return (false, 0);
        }

        bytes32 groupId = getTargetFunctionGroupId(address(this), checkSelector(data));
        (bool isMember, uint32 currentDelay, uint256 allowance, bool active) = hasGroupAccess(
            groupId,
            caller
        );
        if (!active) return (false, 0);
        if (value > allowance) return (false, 0);
        return isMember ? (currentDelay == 0, currentDelay) : (false, 0);
    }

    function _isExpired(uint48 timepoint, uint32 expiration) private view returns (bool) {
        if (expiration == 0) {
            expiration = DEFAULT_EXPIRATION;
        }
        return timepoint + expiration <= Time.timestamp();
    }

    function _isExecuting(address target, bytes4 selector) private view returns (bool) {
        return getLayout().executionId == _hashExecutionId(target, selector);
    }

    function _hashExecutionId(address target, bytes4 selector) private pure returns (bytes32) {
        return keccak256(abi.encode(target, selector));
    }

    function checkSelector(bytes calldata data) internal pure returns (bytes4) {
        if (data.length < 4) revert InvalidDataLength();
        return bytes4(data[0:4]);
    }
}
