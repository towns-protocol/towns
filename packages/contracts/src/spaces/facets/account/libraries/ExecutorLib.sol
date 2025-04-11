// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// types

import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {Time} from "@openzeppelin/contracts/utils/types/Time.sol";

// interfaces

// types
import {ExecutorTypes} from "./ExecutorTypes.sol";

// libraries

import {ExecutorStorage} from "../storage/ExecutorStorage.sol";
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
    /*                           GROUP MANAGEMENT                 */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

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
        ExecutorTypes.Group storage group = ExecutorStorage.getLayout().groups[groupId];

        newMember = group.members[account].lastAccess == 0;
        uint48 lastAccess;

        if (newMember) {
            lastAccess = Time.timestamp() + grantDelay;
            group.members[account] = ExecutorTypes.Access({
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

        emit ExecutorTypes.GroupAccessGranted(
            groupId,
            account,
            executionDelay,
            lastAccess,
            newMember
        );
        return newMember;
    }

    function revokeGroupAccess(bytes32 groupId, address account) internal returns (bool revoked) {
        ExecutorTypes.Access storage access = ExecutorStorage.getLayout().groups[groupId].members[
            account
        ];

        if (access.lastAccess == 0) {
            return false;
        }

        delete ExecutorStorage.getLayout().groups[groupId].members[account];
        return true;
    }

    function renounceGroupAccess(bytes32 groupId, address account) internal {
        if (account != msg.sender) {
            revert ExecutorTypes.UnauthorizedRenounce(account, groupId);
        }

        revokeGroupAccess(groupId, account);
    }

    function setGroupGuardian(bytes32 groupId, bytes32 guardian) internal {
        ExecutorStorage.getLayout().groups[groupId].guardian = guardian;
        emit ExecutorTypes.GroupGuardianSet(groupId, guardian);
    }

    function getGroupGuardian(bytes32 groupId) internal view returns (bytes32) {
        return ExecutorStorage.getLayout().groups[groupId].guardian;
    }

    function getGroupGrantDelay(bytes32 groupId) internal view returns (uint32) {
        return ExecutorStorage.getLayout().groups[groupId].grantDelay.get();
    }

    function setGroupGrantDelay(bytes32 groupId, uint32 grantDelay, uint32 minSetback) internal {
        if (minSetback == 0) {
            minSetback = DEFAULT_MIN_SETBACK;
        }

        uint48 effect;
        (ExecutorStorage.getLayout().groups[groupId].grantDelay, effect) = ExecutorStorage
            .getLayout()
            .groups[groupId]
            .grantDelay
            .withUpdate(grantDelay, minSetback);
        emit ExecutorTypes.GroupGrantDelaySet(groupId, grantDelay);
    }

    function hasGroupAccess(
        bytes32 groupId,
        address account
    ) internal view returns (bool isMember, uint32 executionDelay) {
        (uint48 hasRoleSince, uint32 currentDelay, , ) = getAccess(groupId, account);
        return (hasRoleSince != 0 && hasRoleSince <= Time.timestamp(), currentDelay);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           ACCESS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    function getAccess(
        bytes32 groupId,
        address account
    )
        internal
        view
        returns (uint48 since, uint32 currentDelay, uint32 pendingDelay, uint48 effect)
    {
        ExecutorTypes.Access storage access = ExecutorStorage.getLayout().groups[groupId].members[
            account
        ];
        since = access.lastAccess;
        (currentDelay, pendingDelay, effect) = access.delay.getFull();
        return (since, currentDelay, pendingDelay, effect);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       TARGET MANAGEMENT                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    function setTargetFunctionGroup(address target, bytes4 selector, bytes32 groupId) internal {
        ExecutorStorage.getLayout().targets[target].allowedGroups[selector] = groupId;
        emit ExecutorTypes.TargetFunctionGroupSet(target, selector, groupId);
    }

    function setTargetFunctionDisabled(address target, bytes4 selector, bool disabled) internal {
        ExecutorStorage.getLayout().targets[target].disabledFunctions[selector] = disabled;
        emit ExecutorTypes.TargetFunctionDisabledSet(target, selector, disabled);
    }

    function setTargetDisabled(address target, bool disabled) internal {
        ExecutorStorage.getLayout().targets[target].disabled = disabled;
        emit ExecutorTypes.TargetDisabledSet(target, disabled);
    }

    function getTargetFunctionGroupId(
        address target,
        bytes4 selector
    ) internal view returns (bytes32) {
        return ExecutorStorage.getLayout().targets[target].allowedGroups[selector];
    }

    function isTargetDisabled(address target) internal view returns (bool) {
        return ExecutorStorage.getLayout().targets[target].disabled;
    }

    function isTargetFunctionDisabled(
        address target,
        bytes4 selector
    ) internal view returns (bool) {
        return ExecutorStorage.getLayout().targets[target].disabledFunctions[selector];
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         EXECUTION                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    function scheduleExecution(
        address target,
        bytes calldata data,
        uint48 when
    ) internal returns (bytes32 operationId, uint32 nonce) {
        address caller = msg.sender;

        // Fetch restrictions that apply to the caller on the targeted function
        (, uint32 setback) = _canCallExtended(caller, target, data);

        uint48 minWhen = Time.timestamp() + setback;

        // If call with delay is not authorized, or if requested timing is too soon, revert
        if (setback == 0 || (when > 0 && when < minWhen)) {
            revert ExecutorTypes.UnauthorizedCall(caller, target, checkSelector(data));
        }

        when = uint48(Math.max(when, minWhen));

        // If caller is authorized, schedule operation
        operationId = hashOperation(caller, target, data);

        _checkNotScheduled(operationId);

        unchecked {
            // It's not feasible to overflow the nonce in less than 1000 years
            nonce = ExecutorStorage.getLayout().schedules[operationId].nonce + 1;
        }

        ExecutorStorage.getLayout().schedules[operationId] = ExecutorTypes.Schedule({
            timepoint: when,
            nonce: nonce
        });
        emit ExecutorTypes.OperationScheduled(operationId, when, nonce);
    }

    function getSchedule(bytes32 id) internal view returns (uint48) {
        uint48 timepoint = ExecutorStorage.getLayout().schedules[id].timepoint;
        return _isExpired(timepoint, 0) ? 0 : timepoint;
    }

    function consumeScheduledOp(bytes32 operationId) internal returns (uint32) {
        uint48 timepoint = ExecutorStorage.getLayout().schedules[operationId].timepoint;
        uint32 nonce = ExecutorStorage.getLayout().schedules[operationId].nonce;

        if (timepoint == 0) {
            revert ExecutorTypes.NotScheduled(operationId);
        } else if (timepoint > Time.timestamp()) {
            revert ExecutorTypes.NotReady(operationId);
        } else if (_isExpired(timepoint, 0)) {
            revert ExecutorTypes.Expired(operationId);
        }

        delete ExecutorStorage.getLayout().schedules[operationId].timepoint; // reset the timepoint,
        // keep the nonce
        emit ExecutorTypes.OperationExecuted(operationId, nonce);

        return nonce;
    }

    function execute(address target, uint256 value, bytes calldata data) internal returns (uint32) {
        address caller = msg.sender;
        bytes4 selector = checkSelector(data);

        // Fetch restrictions that apply to the caller on the targeted function
        (bool allowed, uint32 delay) = _canCallExtended(caller, target, data);

        // If call is not authorized, revert
        if (!allowed && delay == 0) {
            revert ExecutorTypes.UnauthorizedCall(caller, target, checkSelector(data));
        }

        bytes32 operationId = hashOperation(caller, target, data);
        uint32 nonce;

        // If caller is authorized, check operation was scheduled early enough
        // Consume an available schedule even if there is no currently enforced delay
        if (delay != 0 || getSchedule(operationId) != 0) {
            nonce = consumeScheduledOp(operationId);
        }

        // Run pre hooks before execution
        HookLib.executePreHooks(selector, value, data);

        // Mark the target and selector as authorized
        bytes32 executionIdBefore = ExecutorStorage.getLayout().executionId;
        ExecutorStorage.getLayout().executionId = _hashExecutionId(target, checkSelector(data));

        // Call the target
        LibCall.callContract(target, value, data);

        // Run post hooks after execution (will run even if execution fails)
        HookLib.executePostHooks(selector);

        // Reset the executionId
        ExecutorStorage.getLayout().executionId = executionIdBefore;
        return nonce;
    }

    function cancel(address caller, address target, bytes calldata data) internal returns (uint32) {
        address sender = msg.sender;
        bytes4 selector = checkSelector(data);

        bytes32 operationId = hashOperation(caller, target, data);

        ExecutorTypes.Schedule storage schedule = ExecutorStorage.getLayout().schedules[
            operationId
        ];

        // If the operation is not scheduled, revert
        if (schedule.timepoint == 0) {
            revert ExecutorTypes.NotScheduled(operationId);
        } else if (caller != sender) {
            // calls can only be canceled by the account that scheduled them, a global admin, or by
            // a guardian of the required role.
            (bool isGuardian, ) = hasGroupAccess(
                getGroupGuardian(getTargetFunctionGroupId(target, selector)),
                sender
            );
            bool isOwner = OwnableStorage.layout().owner == sender;
            if (!isGuardian && !isOwner) {
                revert ExecutorTypes.UnauthorizedCancel(sender, caller, target, selector);
            }
        }

        delete schedule.timepoint; // reset the timepoint,
        // keep the nonce
        uint32 nonce = schedule.nonce;
        emit ExecutorTypes.OperationCanceled(operationId, nonce);

        return nonce;
    }

    function canCall(
        address caller,
        address target,
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
            (bool isMember, uint32 currentDelay) = hasGroupAccess(groupId, caller);
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
        uint48 prevTimepoint = ExecutorStorage.getLayout().schedules[operationId].timepoint;
        if (prevTimepoint != 0 && !_isExpired(prevTimepoint, 0)) {
            revert ExecutorTypes.AlreadyScheduled(operationId);
        }
    }

    // Fetch restrictions that apply to the caller on the targeted function
    function _canCallExtended(
        address caller,
        address target,
        bytes calldata data
    ) private view returns (bool allowed, uint32 delay) {
        if (target == address(this)) {
            return canCallSelf(caller, data);
        } else {
            return data.length < 4 ? (false, 0) : canCall(caller, target, checkSelector(data));
        }
    }

    function canCallSelf(
        address caller,
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
        (bool isMember, uint32 currentDelay) = hasGroupAccess(groupId, caller);
        return isMember ? (currentDelay == 0, currentDelay) : (false, 0);
    }

    function _isExpired(uint48 timepoint, uint32 expiration) private view returns (bool) {
        if (expiration == 0) {
            expiration = DEFAULT_EXPIRATION;
        }
        return timepoint + expiration <= Time.timestamp();
    }

    function _isExecuting(address target, bytes4 selector) private view returns (bool) {
        return ExecutorStorage.getLayout().executionId == _hashExecutionId(target, selector);
    }

    function _hashExecutionId(address target, bytes4 selector) private pure returns (bytes32) {
        return keccak256(abi.encode(target, selector));
    }

    function checkSelector(bytes calldata data) internal pure returns (bytes4) {
        return bytes4(data[0:4]);
    }
}
