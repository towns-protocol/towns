// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// types

import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {Time} from "@openzeppelin/contracts/utils/types/Time.sol";

// interfaces
import {IExecutorBase} from "./IExecutor.sol";

// libraries
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

    // Structure that stores the details for a target contract.
    struct Target {
        // Mapping of allowed groups for this target.
        mapping(bytes4 selector => uint64 groupId) allowedGroups;
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
        uint64 guardian;
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

    // keccak256(abi.encode(uint256(keccak256("spaces.facets.executor.storage")) - 1)) &
    // ~bytes32(uint256(0xff))
    bytes32 private constant STORAGE_SLOT =
        0xb7e2813a9de15ce5ee4c1718778708cd70fd7ee3d196d203c0f40369a8d4a600;

    struct Layout {
        mapping(address target => Target targetDetails) targets;
        mapping(uint64 groupId => Group group) groups;
        mapping(bytes32 id => Schedule schedule) schedules;
        bytes32 executionId;
    }

    function layout() internal pure returns (Layout storage l) {
        assembly {
            l.slot := STORAGE_SLOT
        }
    }

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
        uint64 groupId,
        address account,
        uint32 grantDelay,
        uint32 executionDelay
    )
        internal
        returns (bool newMember)
    {
        Group storage group = layout().groups[groupId];

        newMember = group.members[account].lastAccess == 0;
        uint48 lastAccess;

        if (newMember) {
            lastAccess = Time.timestamp() + grantDelay;
            group.members[account] =
                Access({lastAccess: lastAccess, delay: executionDelay.toDelay()});
        } else {
            // just update the access delay
            (group.members[account].delay, lastAccess) =
                group.members[account].delay.withUpdate(executionDelay, 0);
        }

        emit IExecutorBase.GroupAccessGranted(
            groupId, account, executionDelay, lastAccess, newMember
        );
        return newMember;
    }

    function revokeGroupAccess(uint64 groupId, address account) internal returns (bool revoked) {
        Access storage access = layout().groups[groupId].members[account];

        if (access.lastAccess == 0) {
            return false;
        }

        delete layout().groups[groupId].members[account];
        return true;
    }

    function renounceGroupAccess(uint64 groupId, address account) internal {
        if (account != msg.sender) {
            revert IExecutorBase.UnauthorizedRenounce(account, groupId);
        }

        revokeGroupAccess(groupId, account);
    }

    function setGroupGuardian(uint64 groupId, uint64 guardian) internal {
        layout().groups[groupId].guardian = guardian;
        emit IExecutorBase.GroupGuardianSet(groupId, guardian);
    }

    function getGroupGuardian(uint64 groupId) internal view returns (uint64) {
        return layout().groups[groupId].guardian;
    }

    function getGroupGrantDelay(uint64 groupId) internal view returns (uint32) {
        return layout().groups[groupId].grantDelay.get();
    }

    function setGroupGrantDelay(uint64 groupId, uint32 grantDelay, uint32 minSetback) internal {
        if (minSetback == 0) {
            minSetback = DEFAULT_MIN_SETBACK;
        }

        uint48 effect;
        (layout().groups[groupId].grantDelay, effect) =
            layout().groups[groupId].grantDelay.withUpdate(grantDelay, minSetback);
        emit IExecutorBase.GroupGrantDelaySet(groupId, grantDelay);
    }

    function hasGroupAccess(
        uint64 groupId,
        address account
    )
        internal
        view
        returns (bool isMember, uint32 executionDelay)
    {
        (uint48 hasRoleSince, uint32 currentDelay,,) = getAccess(groupId, account);
        return (hasRoleSince != 0 && hasRoleSince <= Time.timestamp(), currentDelay);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           ACCESS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    function getAccess(
        uint64 groupId,
        address account
    )
        internal
        view
        returns (uint48 since, uint32 currentDelay, uint32 pendingDelay, uint48 effect)
    {
        Access storage access = layout().groups[groupId].members[account];
        since = access.lastAccess;
        (currentDelay, pendingDelay, effect) = access.delay.getFull();
        return (since, currentDelay, pendingDelay, effect);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       TARGET MANAGEMENT                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    function setTargetFunctionGroup(address target, bytes4 selector, uint64 groupId) internal {
        layout().targets[target].allowedGroups[selector] = groupId;
        emit IExecutorBase.TargetFunctionGroupSet(target, selector, groupId);
    }

    function setTargetFunctionDisabled(address target, bool disabled) internal {
        layout().targets[target].disabled = disabled;
        emit IExecutorBase.TargetFunctionDisabledSet(target, disabled);
    }

    function getTargetFunctionGroupId(
        address target,
        bytes4 selector
    )
        internal
        view
        returns (uint64)
    {
        return layout().targets[target].allowedGroups[selector];
    }

    function isTargetDisabled(address target) internal view returns (bool) {
        return layout().targets[target].disabled;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         EXECUTION                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    function scheduleExecution(
        address target,
        bytes calldata data,
        uint48 when
    )
        internal
        returns (bytes32 operationId, uint32 nonce)
    {
        address caller = msg.sender;

        // Fetch restrictions that apply to the caller on the targeted function
        (, uint32 setback) = _canCallExtended(caller, target, data);

        uint48 minWhen = Time.timestamp() + setback;

        // If call with delay is not authorized, or if requested timing is too soon, revert
        if (setback == 0 || (when > 0 && when < minWhen)) {
            revert IExecutorBase.UnauthorizedCall(caller, target, checkSelector(data));
        }

        when = uint48(Math.max(when, minWhen));

        // If caller is authorized, schedule operation
        operationId = hashOperation(caller, target, data);

        _checkNotScheduled(operationId);

        unchecked {
            // It's not feasible to overflow the nonce in less than 1000 years
            nonce = layout().schedules[operationId].nonce + 1;
        }

        layout().schedules[operationId] = Schedule({timepoint: when, nonce: nonce});
        emit IExecutorBase.OperationScheduled(operationId, when, nonce);
    }

    function getSchedule(bytes32 id) internal view returns (uint48) {
        uint48 timepoint = layout().schedules[id].timepoint;
        return _isExpired(timepoint, 0) ? 0 : timepoint;
    }

    function consumeScheduledOp(bytes32 operationId) internal returns (uint32) {
        uint48 timepoint = layout().schedules[operationId].timepoint;
        uint32 nonce = layout().schedules[operationId].nonce;

        if (timepoint == 0) {
            revert IExecutorBase.NotScheduled(operationId);
        } else if (timepoint > Time.timestamp()) {
            revert IExecutorBase.NotReady(operationId);
        } else if (_isExpired(timepoint, 0)) {
            revert IExecutorBase.Expired(operationId);
        }

        delete layout().schedules[operationId].timepoint; // reset the timepoint, keep the nonce
        emit IExecutorBase.OperationExecuted(operationId, nonce);

        return nonce;
    }

    function execute(address target, bytes calldata data) internal returns (uint32) {
        address caller = msg.sender;

        // Fetch restrictions that apply to the caller on the targeted function
        (bool allowed, uint32 delay) = _canCallExtended(caller, target, data);

        // If call is not authorized, revert
        if (!allowed && delay == 0) {
            revert IExecutorBase.UnauthorizedCall(caller, target, checkSelector(data));
        }

        bytes32 operationId = hashOperation(caller, target, data);
        uint32 nonce;

        // If caller is authorized, check operation was scheduled early enough
        // Consume an available schedule even if there is no currently enforced delay
        if (delay != 0 || getSchedule(operationId) != 0) {
            nonce = consumeScheduledOp(operationId);
        }

        // Mark the target and selector as authorized
        bytes32 executionIdBefore = layout().executionId;
        layout().executionId = _hashExecutionId(target, checkSelector(data));

        // Call the target
        LibCall.callContract(target, msg.value, data);

        // Reset the executionId
        layout().executionId = executionIdBefore;
        return nonce;
    }

    function cancel(
        address caller,
        address target,
        bytes calldata data
    )
        internal
        returns (uint32)
    {
        address sender = msg.sender;
        bytes4 selector = checkSelector(data);

        bytes32 operationId = hashOperation(caller, target, data);
        if (layout().schedules[operationId].timepoint == 0) {
            revert IExecutorBase.NotScheduled(operationId);
        } else if (caller != sender) {
            // calls can only be canceled by the account that scheduled them, a global admin, or by
            // a guardian of the required role.
            (bool isGuardian,) =
                hasGroupAccess(getGroupGuardian(getTargetFunctionGroupId(target, selector)), sender);
            bool isOwner = OwnableStorage.layout().owner == sender;
            if (!isGuardian && !isOwner) {
                revert IExecutorBase.UnauthorizedCancel(sender, caller, target, selector);
            }
        }

        delete layout().schedules[operationId].timepoint; // reset the timepoint, keep the nonce
        uint32 nonce = layout().schedules[operationId].nonce;
        emit IExecutorBase.OperationCanceled(operationId, nonce);

        return nonce;
    }

    function canCall(
        address caller,
        address target,
        bytes4 selector
    )
        internal
        view
        returns (bool immediate, uint32 delay)
    {
        if (isTargetDisabled(target)) {
            return (false, 0);
        } else if (caller == address(this)) {
            // Caller is Space, this means the call was sent through {execute} and it already
            // checked
            // permissions. We verify that the call "identifier", which is set during {execute}, is
            // correct.
            return (_isExecuting(target, selector), 0);
        } else {
            uint64 groupId = getTargetFunctionGroupId(target, selector);
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
    )
        internal
        pure
        returns (bytes32)
    {
        return keccak256(abi.encode(caller, target, data));
    }

    function _checkNotScheduled(bytes32 operationId) private view {
        uint48 prevTimepoint = layout().schedules[operationId].timepoint;
        if (prevTimepoint != 0 && !_isExpired(prevTimepoint, 0)) {
            revert IExecutorBase.AlreadyScheduled(operationId);
        }
    }

    // Fetch restrictions that apply to the caller on the targeted function
    function _canCallExtended(
        address caller,
        address target,
        bytes calldata data
    )
        private
        view
        returns (bool allowed, uint32 delay)
    {
        if (target == address(this)) {
            return canCallSelf(caller, data);
        } else {
            return data.length < 4 ? (false, 0) : canCall(caller, target, checkSelector(data));
        }
    }

    function canCallSelf(
        address caller,
        bytes calldata data
    )
        internal
        view
        returns (bool immediate, uint32 delay)
    {
        if (data.length < 4) {
            return (false, 0);
        }

        if (caller == address(this)) {
            // Caller is Space, this means the call was sent through {execute} and it already
            // checked permissions. We verify that the call "identifier", which is set during
            // {execute}, is correct.
            return (_isExecuting(address(this), checkSelector(data)), 0);
        }

        if (isTargetDisabled(address(this))) {
            return (false, 0);
        }

        uint64 groupId = getTargetFunctionGroupId(address(this), checkSelector(data));
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
        return layout().executionId == _hashExecutionId(target, selector);
    }

    function _hashExecutionId(address target, bytes4 selector) private pure returns (bytes32) {
        return keccak256(abi.encode(target, selector));
    }

    function checkSelector(bytes calldata data) internal pure returns (bytes4) {
        return bytes4(data[0:4]);
    }
}
