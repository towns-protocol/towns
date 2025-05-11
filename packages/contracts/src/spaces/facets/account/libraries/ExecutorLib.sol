// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// types

import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {Time} from "@openzeppelin/contracts/utils/types/Time.sol";

// interfaces
import {IExecutorBase} from "../interfaces/IExecutor.sol";

// types

// libraries
import {HookLib} from "./HookLib.sol";
import {OwnableStorage} from "@towns-protocol/diamond/src/facets/ownable/OwnableStorage.sol";
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";
import {LibCall} from "solady/utils/LibCall.sol";
import {CustomRevert} from "src/utils/libraries/CustomRevert.sol";
// contracts

library ExecutorLib {
    using CustomRevert for bytes4;
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
    /*                           GROUP MANAGEMENT                 */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Creates a new group and marks it as active.
    /// @param groupId The ID of the group to create.
    function createGroup(bytes32 groupId) internal {
        Group storage group = getLayout().groups[groupId];
        group.active = true;
    }

    /// @notice Removes (deactivates) a group.
    /// @param groupId The ID of the group to remove.
    function removeGroup(bytes32 groupId) internal {
        Group storage group = getLayout().groups[groupId];
        group.active = false;
    }

    /// @notice Grants access to a group for an account.
    /// @param groupId The ID of the group.
    /// @param account The account to grant access to.
    /// @param grantDelay The delay before access becomes effective.
    /// @param executionDelay The delay for execution after access is granted.
    /// @return newMember True if the account is a new member, false otherwise.
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

        emit IExecutorBase.GroupAccessGranted(
            groupId,
            account,
            executionDelay,
            lastAccess,
            newMember
        );
        return newMember;
    }

    /// @notice Revokes group access from an account.
    /// @param groupId The ID of the group.
    /// @param account The account to revoke access from.
    /// @return revoked True if access was revoked, false otherwise.
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

    /// @notice Allows an account to renounce its own group access.
    /// @param groupId The ID of the group.
    /// @param account The account renouncing access.
    function renounceGroupAccess(bytes32 groupId, address account) internal {
        if (account != msg.sender) {
            IExecutorBase.UnauthorizedRenounce.selector.revertWith();
        }

        revokeGroupAccess(groupId, account);
    }

    /// @notice Sets the guardian for a group.
    /// @param groupId The ID of the group.
    /// @param guardian The guardian role ID.
    function setGroupGuardian(bytes32 groupId, bytes32 guardian) internal {
        getLayout().groups[groupId].guardian = guardian;
        emit IExecutorBase.GroupGuardianSet(groupId, guardian);
    }

    /// @notice Sets the ETH allowance for a group.
    /// @param groupId The ID of the group.
    /// @param allowance The new ETH allowance.
    function setGroupAllowance(bytes32 groupId, uint256 allowance) internal {
        Group storage group = getLayout().groups[groupId];
        group.allowance = allowance;
        emit IExecutorBase.GroupMaxEthValueSet(groupId, allowance);
    }

    /// @notice Gets the guardian for a group.
    /// @param groupId The ID of the group.
    /// @return The guardian role ID.
    function getGroupGuardian(bytes32 groupId) internal view returns (bytes32) {
        return getLayout().groups[groupId].guardian;
    }

    /// @notice Gets the grant delay for a group.
    /// @param groupId The ID of the group.
    /// @return The grant delay in seconds.
    function getGroupGrantDelay(bytes32 groupId) internal view returns (uint32) {
        return getLayout().groups[groupId].grantDelay.get();
    }

    /// @notice Gets the ETH allowance for a group.
    /// @param groupId The ID of the group.
    /// @return The ETH allowance.
    function getGroupAllowance(bytes32 groupId) internal view returns (uint256) {
        return getLayout().groups[groupId].allowance;
    }

    /// @notice Sets the grant delay for a group.
    /// @param groupId The ID of the group.
    /// @param grantDelay The new grant delay.
    /// @param minSetback The minimum setback for the delay.
    function setGroupGrantDelay(bytes32 groupId, uint32 grantDelay, uint32 minSetback) internal {
        if (minSetback == 0) {
            minSetback = DEFAULT_MIN_SETBACK;
        }

        uint48 effect;
        (getLayout().groups[groupId].grantDelay, effect) = getLayout()
            .groups[groupId]
            .grantDelay
            .withUpdate(grantDelay, minSetback);
        emit IExecutorBase.GroupGrantDelaySet(groupId, grantDelay);
    }

    /// @notice Checks if an account has access to a group.
    /// @param groupId The ID of the group.
    /// @param account The account to check.
    /// @return isMember True if the account is a member.
    /// @return executionDelay The execution delay for the account.
    /// @return allowance The ETH allowance for the group.
    /// @return active True if the group is active.
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

    /// @notice Checks if a group is active.
    /// @param groupId The ID of the group.
    /// @return True if the group is active.
    function isGroupActive(bytes32 groupId) internal view returns (bool) {
        return getLayout().groups[groupId].active;
    }

    /// @notice Gets access details for an account in a group.
    /// @param groupId The ID of the group.
    /// @param account The account to check.
    /// @return since The timestamp since the account has access.
    /// @return currentDelay The current execution delay.
    /// @return pendingDelay The pending delay.
    /// @return effect The effect timestamp.
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
    /// @notice Sets the group for a target function.
    /// @param target The target contract.
    /// @param selector The function selector.
    /// @param groupId The group ID.
    function setTargetFunctionGroup(address target, bytes4 selector, bytes32 groupId) internal {
        getLayout().targets[target].allowedGroups[selector] = groupId;
        emit IExecutorBase.TargetFunctionGroupSet(target, selector, groupId);
    }

    /// @notice Enables or disables a target function.
    /// @param target The target contract.
    /// @param selector The function selector.
    /// @param disabled True to disable, false to enable.
    function setTargetFunctionDisabled(address target, bytes4 selector, bool disabled) internal {
        getLayout().targets[target].disabledFunctions[selector] = disabled;
        emit IExecutorBase.TargetFunctionDisabledSet(target, selector, disabled);
    }

    /// @notice Enables or disables a target contract.
    /// @param target The target contract.
    /// @param disabled True to disable, false to enable.
    function setTargetDisabled(address target, bool disabled) internal {
        getLayout().targets[target].disabled = disabled;
        emit IExecutorBase.TargetDisabledSet(target, disabled);
    }

    /// @notice Gets the group ID for a target function.
    /// @param target The target contract.
    /// @param selector The function selector.
    /// @return The group ID.
    function getTargetFunctionGroupId(
        address target,
        bytes4 selector
    ) internal view returns (bytes32) {
        return getLayout().targets[target].allowedGroups[selector];
    }

    /// @notice Checks if a target contract is disabled.
    /// @param target The target contract.
    /// @return True if disabled.
    function isTargetDisabled(address target) internal view returns (bool) {
        return getLayout().targets[target].disabled;
    }

    /// @notice Checks if a target function is disabled.
    /// @param target The target contract.
    /// @param selector The function selector.
    /// @return True if disabled.
    function isTargetFunctionDisabled(
        address target,
        bytes4 selector
    ) internal view returns (bool) {
        return getLayout().targets[target].disabledFunctions[selector];
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         EXECUTION                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    /// @notice Schedules an execution operation.
    /// @param target The target contract.
    /// @param value The ETH value to send.
    /// @param data The calldata for the operation.
    /// @param when The earliest time the operation can be executed.
    /// @return operationId The ID of the scheduled operation.
    /// @return nonce The operation nonce.
    function scheduleExecution(
        address target,
        uint256 value,
        bytes calldata data,
        uint48 when
    ) internal returns (bytes32 operationId, uint32 nonce) {
        address caller = msg.sender;
        bytes4 selector = _getSelector(data);

        // Fetch restrictions that apply to the caller on the targeted function
        (, uint32 setback) = _canCall(caller, target, value, selector);

        uint48 minWhen = Time.timestamp() + setback;

        // If call with delay is not authorized, or if requested timing is too soon, revert
        if (setback == 0 || (when > 0 && when < minWhen)) {
            IExecutorBase.UnauthorizedCall.selector.revertWith();
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
        emit IExecutorBase.OperationScheduled(operationId, when, nonce);
    }

    /// @notice Gets the scheduled timepoint for an operation.
    /// @param id The operation ID.
    /// @return The scheduled timepoint, or 0 if expired.
    function getSchedule(bytes32 id) internal view returns (uint48) {
        uint48 timepoint = getLayout().schedules[id].timepoint;
        return _isExpired(timepoint, 0) ? 0 : timepoint;
    }

    /// @notice Consumes a scheduled operation, marking it as executed.
    /// @param operationId The operation ID.
    /// @return nonce The operation nonce.
    function consumeScheduledOp(bytes32 operationId) internal returns (uint32) {
        uint48 timepoint = getLayout().schedules[operationId].timepoint;
        uint32 nonce = getLayout().schedules[operationId].nonce;

        if (timepoint == 0) {
            IExecutorBase.NotScheduled.selector.revertWith();
        } else if (timepoint > Time.timestamp()) {
            IExecutorBase.NotReady.selector.revertWith();
        } else if (_isExpired(timepoint, 0)) {
            IExecutorBase.Expired.selector.revertWith();
        }

        Schedule storage schedule = getLayout().schedules[operationId];
        delete schedule.timepoint; // reset the timepoint, keep the nonce
        emit IExecutorBase.OperationExecuted(operationId, nonce);

        return nonce;
    }

    /// @notice Executes a scheduled or immediate operation.
    /// @param target The target contract.
    /// @param value The ETH value to send.
    /// @param data The calldata for the operation.
    /// @return result The return data from the call.
    /// @return nonce The operation nonce (if scheduled).
    function execute(
        address target,
        uint256 value,
        bytes calldata data
    ) internal returns (bytes memory result, uint32 nonce) {
        address caller = msg.sender;
        bytes4 selector = _getSelector(data);

        // Fetch restrictions that apply to the caller on the targeted function
        (bool allowed, uint32 delay) = _canCall(caller, target, value, selector);

        // If call is not authorized, revert
        if (!allowed && delay == 0) {
            IExecutorBase.UnauthorizedCall.selector.revertWith();
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
        getLayout().executionId = _hashExecutionId(target, selector);

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

    /// @notice Cancels a scheduled operation.
    /// @param caller The original caller who scheduled the operation.
    /// @param target The target contract.
    /// @param data The calldata for the operation.
    /// @return nonce The operation nonce.
    function cancel(address caller, address target, bytes calldata data) internal returns (uint32) {
        address sender = msg.sender;
        bytes4 selector = _getSelector(data);

        bytes32 operationId = hashOperation(caller, target, data);

        Schedule storage schedule = getLayout().schedules[operationId];

        // If the operation is not scheduled, revert
        if (schedule.timepoint == 0) {
            IExecutorBase.NotScheduled.selector.revertWith();
        } else if (caller != sender) {
            // calls can only be canceled by the account that scheduled them, a global admin, or by
            // a guardian of the required role.
            (bool isGuardian, , , ) = hasGroupAccess(
                getGroupGuardian(getTargetFunctionGroupId(target, selector)),
                sender
            );
            bool isOwner = OwnableStorage.layout().owner == sender;
            if (!isGuardian && !isOwner) {
                IExecutorBase.UnauthorizedCancel.selector.revertWith();
            }
        }

        delete schedule.timepoint; // reset the timepoint,
        // keep the nonce
        uint32 nonce = schedule.nonce;
        emit IExecutorBase.OperationCanceled(operationId, nonce);

        return nonce;
    }

    /// @notice Computes a unique hash for an operation.
    /// @param caller The caller address.
    /// @param target The target contract.
    /// @param data The calldata for the operation.
    /// @return The operation hash.
    function hashOperation(
        address caller,
        address target,
        bytes calldata data
    ) internal pure returns (bytes32) {
        return keccak256(abi.encode(caller, target, data));
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           PRIVATE FUNCTIONS                */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @dev Checks that an operation is not already scheduled and not expired.
    /// @param operationId The operation ID.
    function _checkNotScheduled(bytes32 operationId) private view {
        uint48 prevTimepoint = getLayout().schedules[operationId].timepoint;

        // If already scheduled and not expired, revert
        if (prevTimepoint != 0 && !_isExpired(prevTimepoint, 0)) {
            IExecutorBase.AlreadyScheduled.selector.revertWith();
        }
    }

    /// @dev Determines if a caller can invoke a function on a target, and if a delay is required.
    ///      Handles both self-calls and external calls.
    /// @param caller The address attempting the call.
    /// @param target The contract being called.
    /// @param value The ETH value sent with the call.
    /// @param selector The function selector being called.
    /// @return allowed True if the call is allowed immediately, false otherwise.
    /// @return delay The required delay before the call is allowed (0 if immediate).
    function _canCall(
        address caller,
        address target,
        uint256 value,
        bytes4 selector
    ) private view returns (bool allowed, uint32 delay) {
        // If the contract is calling itself, ensure it's during an authorized execution
        if (caller == address(this)) {
            return (_isExecuting(target, selector), 0);
        }

        // Disallow if the target or function is disabled
        if (
            isTargetDisabled(target) ||
            (target != address(this) && isTargetFunctionDisabled(target, selector))
        ) {
            return (false, 0);
        }

        // Check group permissions for the caller
        bytes32 groupId = getTargetFunctionGroupId(target, selector);
        (bool isMember, uint32 currentDelay, uint256 allowance, bool active) = hasGroupAccess(
            groupId,
            caller
        );

        // Disallow if group is inactive or allowance exceeded
        if (!active || value > allowance) {
            return (false, 0);
        }

        // Allow if member and no delay, otherwise require delay
        if (isMember) {
            return (currentDelay == 0, currentDelay);
        }

        return (false, 0);
    }

    /// @dev Checks if a timepoint is expired.
    /// @param timepoint The timepoint to check.
    /// @param expiration The expiration duration (0 for default).
    /// @return expired True if expired.
    function _isExpired(uint48 timepoint, uint32 expiration) private view returns (bool expired) {
        uint32 effectiveExpiration = expiration == 0 ? DEFAULT_EXPIRATION : expiration;
        return timepoint + effectiveExpiration <= Time.timestamp();
    }

    /// @dev Checks if the current execution context matches the given target and selector.
    /// @param target The target contract.
    /// @param selector The function selector.
    /// @return True if currently executing.
    function _isExecuting(address target, bytes4 selector) private view returns (bool) {
        return getLayout().executionId == _hashExecutionId(target, selector);
    }

    /// @dev Computes a unique hash for the execution context.
    /// @param target The target contract.
    /// @param selector The function selector.
    /// @return The execution context hash.
    function _hashExecutionId(address target, bytes4 selector) private pure returns (bytes32) {
        return keccak256(abi.encode(target, selector));
    }

    /// @dev Extracts the function selector from calldata.
    /// @param data The calldata.
    /// @return The function selector.
    function _getSelector(bytes calldata data) private pure returns (bytes4) {
        if (data.length < 4) IExecutorBase.InvalidDataLength.selector.revertWith();
        return bytes4(data[0:4]);
    }
}
