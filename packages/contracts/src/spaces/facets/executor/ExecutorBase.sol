// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// Standard and external types
import {Time} from "@openzeppelin/contracts/utils/types/Time.sol";

// Interfaces
import {IExecutorBase, Group, Schedule, Target} from "./IExecutor.sol";

// Internal libraries
import {ExecutorStorage} from "./ExecutorStorage.sol";
import {GroupLib} from "./GroupLib.sol";
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";

// External libraries
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";
import {LibCall} from "solady/utils/LibCall.sol";
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";

abstract contract ExecutorBase is IExecutorBase {
    using CustomRevert for bytes4;
    using EnumerableSetLib for EnumerableSetLib.Uint256Set;
    using Time for Time.Delay;
    using Time for uint32;
    using GroupLib for Group;

    uint32 private constant DEFAULT_EXPIRATION = 1 weeks;
    uint32 private constant DEFAULT_MIN_SETBACK = 5 days;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           GROUP MANAGEMENT                 */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Creates a new group and marks it as active.
    /// @param groupId The ID of the group to create.
    /// @param status The status to set (active/inactive).
    /// @param expiration Optional timestamp when the group should expire (0 for no expiration).
    function _setGroupStatus(bytes32 groupId, bool status, uint48 expiration) internal {
        Group storage group = _getGroup(groupId);
        group.setStatus(status);
        if (status && expiration > 0) {
            if (expiration <= block.timestamp) revert InvalidExpiration();
            group.expiration = expiration;
        }
        emit GroupStatusSet(groupId, status);
    }

    /// @notice Creates a new group and marks it as active without expiration.
    /// @param groupId The ID of the group to create.
    /// @param status The status to set (active/inactive).
    function _setGroupStatus(bytes32 groupId, bool status) internal {
        _setGroupStatus(groupId, status, 0);
    }

    /// @notice Sets or extends the expiration for a group.
    /// @param groupId The ID of the group.
    /// @param expiration The new expiration timestamp.
    function _setGroupExpiration(bytes32 groupId, uint48 expiration) internal {
        if (expiration <= block.timestamp) revert InvalidExpiration();
        Group storage group = _getGroup(groupId);
        group.expiration = expiration;
        emit GroupExpirationSet(groupId, expiration);
    }

    /// @notice Grants access to a group for an account.
    /// @param groupId The ID of the group.
    /// @param account The account to grant access to.
    /// @param grantDelay The delay before access becomes effective.
    /// @param executionDelay The delay for execution after access is granted.
    /// @return newMember True if the account is a new member, false otherwise.
    function _grantGroupAccess(
        bytes32 groupId,
        address account,
        uint32 grantDelay,
        uint32 executionDelay
    ) internal returns (bool) {
        Group storage group = _getGroup(groupId);
        (bool newMember, uint48 lastAccess) = group.grantAccess(
            account,
            grantDelay,
            executionDelay
        );

        emit GroupAccessGranted(groupId, account, executionDelay, lastAccess, newMember);
        return newMember;
    }

    /// @notice Revokes group access from an account.
    /// @param groupId The ID of the group.
    /// @param account The account to revoke access from.
    /// @return revoked True if access was revoked, false otherwise.
    function _revokeGroupAccess(bytes32 groupId, address account) internal returns (bool revoked) {
        revoked = _getGroup(groupId).revokeAccess(account);

        emit GroupAccessRevoked(groupId, account, revoked);
    }

    /// @notice Allows an account to renounce its own group access.
    /// @param groupId The ID of the group.
    /// @param account The account renouncing access.
    function _renounceGroupAccess(bytes32 groupId, address account) internal {
        if (account != msg.sender) {
            UnauthorizedRenounce.selector.revertWith();
        }

        _revokeGroupAccess(groupId, account);
    }

    /// @notice Sets the guardian for a group.
    /// @param groupId The ID of the group.
    /// @param guardian The guardian role ID.
    function _setGroupGuardian(bytes32 groupId, bytes32 guardian) internal {
        _getGroup(groupId).setGuardian(guardian);
        emit GroupGuardianSet(groupId, guardian);
    }

    /// @notice Sets the grant delay for a group.
    /// @param groupId The ID of the group.
    /// @param grantDelay The new grant delay.
    /// @param minSetback The minimum setback for the delay.
    function _setGroupGrantDelay(bytes32 groupId, uint32 grantDelay, uint32 minSetback) internal {
        if (minSetback == 0) {
            minSetback = DEFAULT_MIN_SETBACK;
        }

        _getGroup(groupId).setGrantDelay(grantDelay, minSetback);
        emit GroupGrantDelaySet(groupId, grantDelay);
    }

    /// @notice Gets the group configuration for a group ID.
    /// @param groupId The ID of the group.
    /// @return The group configuration.
    function _getGroup(bytes32 groupId) internal view returns (Group storage) {
        return ExecutorStorage.getLayout().groups[groupId];
    }

    function _getGroupExpiration(bytes32 groupId) internal view returns (uint48) {
        return _getGroup(groupId).expiration;
    }

    /// @notice Gets the guardian for a group.
    /// @param groupId The ID of the group.
    /// @return The guardian role ID.
    function _getGroupGuardian(bytes32 groupId) internal view returns (bytes32) {
        return _getGroup(groupId).getGuardian();
    }

    /// @notice Gets the grant delay for a group.
    /// @param groupId The ID of the group.
    /// @return The grant delay in seconds.
    function _getGroupGrantDelay(bytes32 groupId) internal view returns (uint32) {
        return _getGroup(groupId).getGrantDelay();
    }

    /// @notice Checks if a group is active and not expired.
    /// @param groupId The ID of the group.
    /// @return True if the group is active and not expired.
    function _isGroupActive(bytes32 groupId) internal view returns (bool) {
        Group storage group = _getGroup(groupId);
        if (!group.active) return false;
        if (group.expiration == 0) return true;
        return group.expiration > block.timestamp;
    }

    /// @notice Checks if an account has access to a group.
    /// @param groupId The ID of the group.
    /// @param account The account to check.
    /// @return isMember True if the account is a member.
    /// @return executionDelay The execution delay for the account.
    /// @return active True if the group is active and not expired.
    function _hasGroupAccess(
        bytes32 groupId,
        address account
    ) internal view returns (bool isMember, uint32 executionDelay, bool active) {
        return ExecutorStorage.hasGroupAccess(groupId, account);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           ACCESS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Gets access details for an account in a group.
    /// @param groupId The ID of the group.
    /// @param account The account to check.
    /// @return since The timestamp since the account has access.
    /// @return currentDelay The current execution delay.
    /// @return pendingDelay The pending delay.
    /// @return effect The effect timestamp.
    function _getAccess(
        bytes32 groupId,
        address account
    )
        internal
        view
        returns (uint48 since, uint32 currentDelay, uint32 pendingDelay, uint48 effect)
    {
        return _getGroup(groupId).getAccess(account);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       TARGET MANAGEMENT                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Gets the target configuration for a contract.
    /// @param target The target contract.
    /// @return The target configuration.
    function _getTarget(address target) internal view returns (Target storage) {
        return ExecutorStorage.getLayout().targets[target];
    }

    /// @notice Sets the group for a target function.
    /// @param target The target contract.
    /// @param selector The function selector.
    /// @param groupId The group ID.
    function _setTargetFunctionGroup(address target, bytes4 selector, bytes32 groupId) internal {
        _getTarget(target).allowedGroups[selector] = groupId;
        emit TargetFunctionGroupSet(target, selector, groupId);
    }

    /// @notice Enables or disables a target function.
    /// @param target The target contract.
    /// @param selector The function selector.
    /// @param disabled True to disable, false to enable.
    function _setTargetFunctionDisabled(address target, bytes4 selector, bool disabled) internal {
        _getTarget(target).disabledFunctions[selector] = disabled;
        emit TargetFunctionDisabledSet(target, selector, disabled);
    }

    /// @notice Enables or disables a target contract.
    /// @param target The target contract.
    /// @param disabled True to disable, false to enable.
    function _setTargetDisabled(address target, bool disabled) internal {
        _getTarget(target).disabled = disabled;
        emit TargetDisabledSet(target, disabled);
    }

    /// @notice Gets the group ID for a target function.
    /// @param target The target contract.
    /// @param selector The function selector.
    /// @return The group ID.
    function _getTargetFunctionGroupId(
        address target,
        bytes4 selector
    ) internal view returns (bytes32) {
        return _getTarget(target).allowedGroups[selector];
    }

    /// @notice Checks if a target contract is disabled.
    /// @param target The target contract.
    /// @return True if disabled.
    function _isTargetDisabled(address target) internal view returns (bool) {
        return _getTarget(target).disabled;
    }

    /// @notice Checks if a target function is disabled.
    /// @param target The target contract.
    /// @param selector The function selector.
    /// @return True if disabled.
    function _isTargetFunctionDisabled(
        address target,
        bytes4 selector
    ) internal view returns (bool) {
        return _getTarget(target).disabledFunctions[selector];
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         EXECUTION                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Gets the schedule for an operation by its id.
    /// @param operationId The operation ID.
    /// @return The schedule storage for the operation.
    function _getSchedule(bytes32 operationId) internal view returns (Schedule storage) {
        return ExecutorStorage.getLayout().schedules[operationId];
    }

    /// @notice Schedules an execution operation.
    /// @param target The target contract.
    /// @param data The calldata for the operation.
    /// @param when The earliest time the operation can be executed.
    /// @return operationId The ID of the scheduled operation.
    /// @return nonce The operation nonce.
    function _scheduleExecution(
        address target,
        bytes calldata data,
        uint48 when
    ) internal returns (bytes32 operationId, uint32 nonce) {
        address caller = msg.sender;
        bytes4 selector = _getSelector(data);

        // Fetch restrictions that apply to the caller on the targeted function
        (, uint32 setback) = _canCall(caller, target, selector);

        uint48 minWhen = Time.timestamp() + setback;

        // If call with delay is not authorized, or if requested timing is too soon, revert
        if (setback == 0 || (when > 0 && when < minWhen)) {
            UnauthorizedCall.selector.revertWith();
        }

        when = uint48(FixedPointMathLib.max(when, minWhen));

        // If caller is authorized, schedule operation
        operationId = _hashOperation(caller, target, data);

        _checkNotScheduled(operationId);

        Schedule storage schedule = _getSchedule(operationId);
        unchecked {
            // It's not feasible to overflow the nonce in less than 1000 years
            nonce = schedule.nonce + 1;
        }

        (schedule.timepoint, schedule.nonce) = (when, nonce);
        emit OperationScheduled(operationId, when, nonce);
    }

    /// @notice Consumes a scheduled operation, marking it as executed.
    /// @param operationId The operation ID.
    /// @return nonce The operation nonce.
    function _consumeScheduledOp(bytes32 operationId) internal returns (uint32 nonce) {
        Schedule storage schedule = _getSchedule(operationId);
        uint48 timepoint = schedule.timepoint;
        nonce = schedule.nonce;

        if (timepoint == 0) {
            NotScheduled.selector.revertWith();
        } else if (timepoint > Time.timestamp()) {
            NotReady.selector.revertWith();
        } else if (_isExpired(timepoint, 0)) {
            Expired.selector.revertWith();
        }

        delete schedule.timepoint; // reset the timepoint, keep the nonce
        emit OperationExecuted(operationId, nonce);
    }

    /// @notice Cancels a scheduled operation.
    /// @param caller The original caller who scheduled the operation.
    /// @param target The target contract.
    /// @param data The calldata for the operation.
    /// @return nonce The operation nonce.
    function _cancel(
        address caller,
        address target,
        bytes calldata data
    ) internal returns (uint32 nonce) {
        address sender = msg.sender;
        bytes4 selector = _getSelector(data);

        bytes32 operationId = _hashOperation(caller, target, data);

        Schedule storage schedule = _getSchedule(operationId);

        // If the operation is not scheduled, revert
        if (schedule.timepoint == 0) {
            NotScheduled.selector.revertWith();
        } else if (caller != sender) {
            // calls can only be canceled by the account that scheduled them, a global admin, or by
            // a guardian of the required role.
            (bool isGuardian, , ) = _hasGroupAccess(
                _getGroupGuardian(_getTargetFunctionGroupId(target, selector)),
                sender
            );
            bool isOwner = _getOwner() == sender;
            if (!isGuardian && !isOwner) {
                UnauthorizedCancel.selector.revertWith();
            }
        }

        delete schedule.timepoint; // reset the timepoint, keep the nonce
        nonce = schedule.nonce;
        emit OperationCanceled(operationId, nonce);
    }

    /// @notice Executes a scheduled or immediate operation.
    /// @param target The target contract.
    /// @param value The ETH value to send.
    /// @param data The calldata for the operation.
    /// @return result The return data from the call.
    /// @return nonce The operation nonce (if scheduled).
    function _execute(
        address target,
        uint256 value,
        bytes calldata data
    ) internal returns (bytes memory result, uint32 nonce) {
        bytes4 selector = _getSelector(data);

        nonce = _validateExecution(target, selector, data);

        // Get storage layout
        ExecutorStorage.Layout storage $ = ExecutorStorage.getLayout();

        // Run pre hooks before execution
        _executePreHooks($, target, selector, value, data);

        // Set the executionId for the target and selector using transient storage
        bytes32 executionIdBefore = ExecutorStorage.getExecutionId();
        bytes32 executionId = _hashExecutionId(target, selector);
        ExecutorStorage.setExecutionId(executionId);
        ExecutorStorage.setTargetExecutionId(target, executionId);

        // Call the target
        result = LibCall.callContract(target, value, data);

        // Run post hooks after execution (will run even if execution fails)
        _executePostHooks($, target, selector);

        // Clear transient storage to prevent composability issues
        ExecutorStorage.setExecutionId(executionIdBefore);
        ExecutorStorage.clearTargetExecutionId(target);
    }

    /// @notice Gets the scheduled timepoint for an operation.
    /// @param id The operation ID.
    /// @return The scheduled timepoint, or 0 if expired.
    function _getScheduleTimepoint(bytes32 id) internal view returns (uint48) {
        uint48 timepoint = _getSchedule(id).timepoint;
        return _isExpired(timepoint, 0) ? 0 : timepoint;
    }

    /// @dev Checks if the current execution context matches the given only target.
    /// @param target The target contract.
    /// @return True if currently executing.
    function _isTargetExecuting(address target) internal view returns (bool) {
        bytes32 globalId = ExecutorStorage.getExecutionId();
        bytes32 targetId = ExecutorStorage.getTargetExecutionId(target);
        return globalId != 0 && targetId == globalId;
    }

    /// @notice Computes a unique hash for an operation.
    /// @param caller The caller address.
    /// @param target The target contract.
    /// @param data The calldata for the operation.
    /// @return The operation hash.
    function _hashOperation(
        address caller,
        address target,
        bytes calldata data
    ) internal pure returns (bytes32) {
        return keccak256(abi.encode(caller, target, data));
    }

    /// @dev Checks that an operation is not already scheduled and not expired.
    /// @param operationId The operation ID.
    function _checkNotScheduled(bytes32 operationId) private view {
        uint48 prevTimepoint = _getSchedule(operationId).timepoint;

        // If already scheduled and not expired, revert
        if (prevTimepoint != 0 && !_isExpired(prevTimepoint, 0)) {
            AlreadyScheduled.selector.revertWith();
        }
    }

    function _validateExecution(
        address target,
        bytes4 selector,
        bytes calldata data
    ) private returns (uint32 nonce) {
        // Fetch restrictions that apply to the caller on the targeted function
        (bool allowed, uint32 delay) = _canCall(msg.sender, target, selector);

        if (!allowed && delay == 0) UnauthorizedCall.selector.revertWith();

        bytes32 operationId = _hashOperation(msg.sender, target, data);
        uint48 scheduleTimepoint = _getScheduleTimepoint(operationId);

        if (delay != 0 && scheduleTimepoint == 0) NotScheduled.selector.revertWith();

        // Consume scheduled operation if one exists
        if (scheduleTimepoint != 0) nonce = _consumeScheduledOp(operationId);
    }

    /// @dev Determines if a caller can invoke a function on a target, and if a delay is required.
    ///      Handles both self-calls and external calls.
    /// @param caller The address attempting the call.
    /// @param target The contract being called.
    /// @param selector The function selector being called.
    /// @return allowed True if the call is allowed immediately, false otherwise.
    /// @return delay The required delay before the call is allowed (0 if immediate).
    function _canCall(
        address caller,
        address target,
        bytes4 selector
    ) private view returns (bool allowed, uint32 delay) {
        // Disallow if the target or function is disabled
        if (_isTargetDisabled(target)) {
            return (false, 0);
        }

        if ((target != address(this) && _isTargetFunctionDisabled(target, selector))) {
            return (false, 0);
        }

        // Check group permissions for the caller
        bytes32 groupId = _getTargetFunctionGroupId(target, selector);
        (bool isMember, uint32 currentDelay, bool active) = _hasGroupAccess(groupId, caller);

        // Disallow if group is inactive or allowance exceeded
        if (!active) {
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
        return ExecutorStorage.getExecutionId() == _hashExecutionId(target, selector);
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
        if (data.length < 4) InvalidDataLength.selector.revertWith();
        return bytes4(data[0:4]);
    }

    /// @dev Internal function to get the owner
    function _getOwner() internal view virtual returns (address);

    /// @dev Internal function to execute pre hooks
    function _executePreHooks(
        ExecutorStorage.Layout storage $,
        address target,
        bytes4 selector,
        uint256 value,
        bytes calldata data
    ) internal virtual {}

    /// @dev Internal function to execute post hooks
    function _executePostHooks(
        ExecutorStorage.Layout storage $,
        address target,
        bytes4 selector
    ) internal virtual {}
}
