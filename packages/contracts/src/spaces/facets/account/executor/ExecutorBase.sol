// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// types

import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {Time} from "@openzeppelin/contracts/utils/types/Time.sol";

// interfaces
import {IExecutorBase} from "./IExecutor.sol";

// types
import {Target, Group, Access, Schedule} from "./IExecutor.sol";

// libraries
import {ExecutorStorage} from "./ExecutorStorage.sol";
import {GroupLib} from "./libraries/GroupLib.sol";
import {HookLib} from "../hooks/HookLib.sol";
import {OwnableStorage} from "@towns-protocol/diamond/src/facets/ownable/OwnableStorage.sol";
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";
import {LibCall} from "solady/utils/LibCall.sol";
import {CustomRevert} from "src/utils/libraries/CustomRevert.sol";

// contracts

abstract contract ExecutorBase {
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
    function _createGroup(bytes32 groupId) internal {
        ExecutorStorage.Layout storage l = ExecutorStorage.getLayout();
        Group storage group = l.groups[groupId];
        group.createGroup();
    }

    /// @notice Removes (deactivates) a group.
    /// @param groupId The ID of the group to remove.
    function _removeGroup(bytes32 groupId) internal {
        ExecutorStorage.Layout storage l = ExecutorStorage.getLayout();
        Group storage group = l.groups[groupId];
        group.removeGroup();
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
        Group storage group = ExecutorStorage.getLayout().groups[groupId];

        (bool newMember, uint48 lastAccess) = group.grantAccess(
            account,
            grantDelay,
            executionDelay
        );

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
    function _revokeGroupAccess(bytes32 groupId, address account) internal returns (bool revoked) {
        Group storage group = ExecutorStorage.getLayout().groups[groupId];
        revoked = group.revokeAccess(account);

        emit IExecutorBase.GroupAccessRevoked(groupId, account, revoked);
    }

    /// @notice Allows an account to renounce its own group access.
    /// @param groupId The ID of the group.
    /// @param account The account renouncing access.
    function _renounceGroupAccess(bytes32 groupId, address account) internal {
        if (account != msg.sender) {
            IExecutorBase.UnauthorizedRenounce.selector.revertWith();
        }

        _revokeGroupAccess(groupId, account);
    }

    /// @notice Sets the guardian for a group.
    /// @param groupId The ID of the group.
    /// @param guardian The guardian role ID.
    function _setGroupGuardian(bytes32 groupId, bytes32 guardian) internal {
        ExecutorStorage.Layout storage l = ExecutorStorage.getLayout();
        l.groups[groupId].setGuardian(guardian);
        emit IExecutorBase.GroupGuardianSet(groupId, guardian);
    }

    /// @notice Sets the ETH allowance for a group.
    /// @param groupId The ID of the group.
    /// @param allowance The new ETH allowance.
    function _setGroupAllowance(bytes32 groupId, uint256 allowance) internal {
        ExecutorStorage.Layout storage l = ExecutorStorage.getLayout();
        l.groups[groupId].setAllowance(allowance);
        emit IExecutorBase.GroupMaxEthValueSet(groupId, allowance);
    }

    /// @notice Gets the guardian for a group.
    /// @param groupId The ID of the group.
    /// @return The guardian role ID.
    function _getGroupGuardian(bytes32 groupId) internal view returns (bytes32) {
        return ExecutorStorage.getLayout().groups[groupId].getGuardian();
    }

    /// @notice Gets the grant delay for a group.
    /// @param groupId The ID of the group.
    /// @return The grant delay in seconds.
    function _getGroupGrantDelay(bytes32 groupId) internal view returns (uint32) {
        return ExecutorStorage.getLayout().groups[groupId].getGrantDelay();
    }

    /// @notice Gets the ETH allowance for a group.
    /// @param groupId The ID of the group.
    /// @return The ETH allowance.
    function _getGroupAllowance(bytes32 groupId) internal view returns (uint256) {
        return ExecutorStorage.getLayout().groups[groupId].getAllowance();
    }

    /// @notice Sets the grant delay for a group.
    /// @param groupId The ID of the group.
    /// @param grantDelay The new grant delay.
    /// @param minSetback The minimum setback for the delay.
    function _setGroupGrantDelay(bytes32 groupId, uint32 grantDelay, uint32 minSetback) internal {
        if (minSetback == 0) {
            minSetback = DEFAULT_MIN_SETBACK;
        }

        ExecutorStorage.getLayout().groups[groupId].setGrantDelay(grantDelay, minSetback);
        emit IExecutorBase.GroupGrantDelaySet(groupId, grantDelay);
    }

    /// @notice Checks if an account has access to a group.
    /// @param groupId The ID of the group.
    /// @param account The account to check.
    /// @return isMember True if the account is a member.
    /// @return executionDelay The execution delay for the account.
    /// @return allowance The ETH allowance for the group.
    /// @return active True if the group is active.
    function _hasGroupAccess(
        bytes32 groupId,
        address account
    ) internal view returns (bool isMember, uint32 executionDelay, uint256 allowance, bool active) {
        Group storage group = ExecutorStorage.getLayout().groups[groupId];
        (isMember, executionDelay, allowance, active) = group.hasAccess(account);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           ACCESS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Checks if a group is active.
    /// @param groupId The ID of the group.
    /// @return True if the group is active.
    function _isGroupActive(bytes32 groupId) internal view returns (bool) {
        return ExecutorStorage.getLayout().groups[groupId].isActive();
    }

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
        Group storage group = ExecutorStorage.getLayout().groups[groupId];
        return group.getAccess(account);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       TARGET MANAGEMENT                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    /// @notice Sets the group for a target function.
    /// @param target The target contract.
    /// @param selector The function _selector.
    /// @param groupId The group ID.
    function _setTargetFunctionGroup(address target, bytes4 selector, bytes32 groupId) internal {
        ExecutorStorage.getLayout().targets[target].allowedGroups[selector] = groupId;
        emit IExecutorBase.TargetFunctionGroupSet(target, selector, groupId);
    }

    /// @notice Enables or disables a target function.
    /// @param target The target contract.
    /// @param selector The function _selector.
    /// @param disabled True to disable, false to enable.
    function _setTargetFunctionDisabled(address target, bytes4 selector, bool disabled) internal {
        ExecutorStorage.getLayout().targets[target].disabledFunctions[selector] = disabled;
        emit IExecutorBase.TargetFunctionDisabledSet(target, selector, disabled);
    }

    /// @notice Enables or disables a target contract.
    /// @param target The target contract.
    /// @param disabled True to disable, false to enable.
    function _setTargetDisabled(address target, bool disabled) internal {
        ExecutorStorage.getLayout().targets[target].disabled = disabled;
        emit IExecutorBase.TargetDisabledSet(target, disabled);
    }

    /// @notice Gets the group ID for a target function.
    /// @param target The target contract.
    /// @param selector The function _selector.
    /// @return The group ID.
    function _getTargetFunctionGroupId(
        address target,
        bytes4 selector
    ) internal view returns (bytes32) {
        return ExecutorStorage.getLayout().targets[target].allowedGroups[selector];
    }

    /// @notice Checks if a target contract is disabled.
    /// @param target The target contract.
    /// @return True if disabled.
    function _isTargetDisabled(address target) internal view returns (bool) {
        return ExecutorStorage.getLayout().targets[target].disabled;
    }

    /// @notice Checks if a target function _is disabled.
    /// @param target The target contract.
    /// @param selector The function _selector.
    /// @return True if disabled.
    function _isTargetFunctionDisabled(
        address target,
        bytes4 selector
    ) internal view returns (bool) {
        return ExecutorStorage.getLayout().targets[target].disabledFunctions[selector];
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
    function _scheduleExecution(
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
        operationId = _hashOperation(caller, target, data);

        _checkNotScheduled(operationId);

        unchecked {
            // It's not feasible to overflow the nonce in less than 1000 years
            nonce = ExecutorStorage.getLayout().schedules[operationId].nonce + 1;
        }

        ExecutorStorage.getLayout().schedules[operationId] = Schedule({
            timepoint: when,
            nonce: nonce
        });
        emit IExecutorBase.OperationScheduled(operationId, when, nonce);
    }

    /// @notice Gets the scheduled timepoint for an operation.
    /// @param id The operation ID.
    /// @return The scheduled timepoint, or 0 if expired.
    function _getSchedule(bytes32 id) internal view returns (uint48) {
        uint48 timepoint = ExecutorStorage.getLayout().schedules[id].timepoint;
        return _isExpired(timepoint, 0) ? 0 : timepoint;
    }

    /// @notice Consumes a scheduled operation, marking it as executed.
    /// @param operationId The operation ID.
    /// @return nonce The operation nonce.
    function _consumeScheduledOp(bytes32 operationId) internal returns (uint32) {
        uint48 timepoint = ExecutorStorage.getLayout().schedules[operationId].timepoint;
        uint32 nonce = ExecutorStorage.getLayout().schedules[operationId].nonce;

        if (timepoint == 0) {
            IExecutorBase.NotScheduled.selector.revertWith();
        } else if (timepoint > Time.timestamp()) {
            IExecutorBase.NotReady.selector.revertWith();
        } else if (_isExpired(timepoint, 0)) {
            IExecutorBase.Expired.selector.revertWith();
        }

        Schedule storage schedule = ExecutorStorage.getLayout().schedules[operationId];
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
    function _execute(
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

        bytes32 operationId = _hashOperation(caller, target, data);

        // If caller is authorized, check operation was scheduled early enough
        // Consume an available schedule even if there is no currently enforced delay
        if (delay != 0 || _getSchedule(operationId) != 0) {
            nonce = _consumeScheduledOp(operationId);
        }

        // Run pre hooks before execution
        HookLib.executePreHooks(target, selector, value, data);

        // Mark the target and selector as authorized
        bytes32 executionIdBefore = ExecutorStorage.getLayout().executionId;
        ExecutorStorage.getLayout().executionId = _hashExecutionId(target, selector);

        // Reduce the allowance of the group before external call
        bytes32 groupId = _getTargetFunctionGroupId(target, selector);
        ExecutorStorage.getLayout().groups[groupId].allowance -= value;

        // Call the target
        result = LibCall.callContract(target, value, data);

        // Run post hooks after execution (will run even if execution fails)
        HookLib.executePostHooks(target, selector);

        // Reset the executionId
        ExecutorStorage.getLayout().executionId = executionIdBefore;

        return (result, nonce);
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
    ) internal returns (uint32) {
        address sender = msg.sender;
        bytes4 selector = _getSelector(data);

        bytes32 operationId = _hashOperation(caller, target, data);

        Schedule storage schedule = ExecutorStorage.getLayout().schedules[operationId];

        // If the operation is not scheduled, revert
        if (schedule.timepoint == 0) {
            IExecutorBase.NotScheduled.selector.revertWith();
        } else if (caller != sender) {
            // calls can only be canceled by the account that scheduled them, a global admin, or by
            // a guardian of the required role.
            (bool isGuardian, , , ) = _hasGroupAccess(
                _getGroupGuardian(_getTargetFunctionGroupId(target, selector)),
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
    function _hashOperation(
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
        uint48 prevTimepoint = ExecutorStorage.getLayout().schedules[operationId].timepoint;

        // If already scheduled and not expired, revert
        if (prevTimepoint != 0 && !_isExpired(prevTimepoint, 0)) {
            IExecutorBase.AlreadyScheduled.selector.revertWith();
        }
    }

    /// @dev Determines if a caller can invoke a function _on a target, and if a delay is required.
    ///      Handles both self-calls and external calls.
    /// @param caller The address attempting the call.
    /// @param target The contract being called.
    /// @param value The ETH value sent with the call.
    /// @param selector The function _selector being called.
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
            _isTargetDisabled(target) ||
            (target != address(this) && _isTargetFunctionDisabled(target, selector))
        ) {
            return (false, 0);
        }

        // Check group permissions for the caller
        bytes32 groupId = _getTargetFunctionGroupId(target, selector);
        (bool isMember, uint32 currentDelay, uint256 allowance, bool active) = _hasGroupAccess(
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
        return ExecutorStorage.getLayout().executionId == _hashExecutionId(target, selector);
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
