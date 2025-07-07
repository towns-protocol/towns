// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IExecutor} from "./IExecutor.sol";

// libraries
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {OwnableBase} from "@towns-protocol/diamond/src/facets/ownable/OwnableBase.sol";
import {ExecutorBase} from "./ExecutorBase.sol";

/**
 * @title Executor
 * @notice Facet that enables permissioned calls from a Space
 * @dev This contract is used for implementation reference purposes
 */
contract ExecutorFacet is OwnableBase, ExecutorBase, IExecutor, Facet {
    using CustomRevert for bytes4;

    /**
     * @notice Validates if the target address is allowed for calls
     * @dev Prevents calls to critical system contracts
     * @param target The contract address to check
     */
    modifier onlyAuthorized(address target) {
        _checkAuthorized(target);
        _;
    }

    /// @inheritdoc IExecutor
    function grantAccess(
        bytes32 groupId,
        address account,
        uint32 delay
    ) external onlyOwner returns (bool newMember) {
        _setGroupStatus(groupId, true);
        return _grantGroupAccess(groupId, account, _getGroupGrantDelay(groupId), delay);
    }

    /// @inheritdoc IExecutor
    function grantAccessWithExpiration(
        bytes32 groupId,
        address account,
        uint32 delay,
        uint48 expiration
    ) external onlyOwner returns (bool newMember) {
        _setGroupStatus(groupId, true, expiration);
        return _grantGroupAccess(groupId, account, _getGroupGrantDelay(groupId), delay);
    }

    /// @inheritdoc IExecutor
    function revokeAccess(bytes32 groupId, address account) external onlyOwner {
        _revokeGroupAccess(groupId, account);
    }

    /// @inheritdoc IExecutor
    function renounceAccess(bytes32 groupId, address account) external {
        _renounceGroupAccess(groupId, account);
    }

    /// @inheritdoc IExecutor
    function setGuardian(bytes32 groupId, bytes32 guardian) external onlyOwner {
        _setGroupGuardian(groupId, guardian);
    }

    /// @inheritdoc IExecutor
    function setGroupDelay(bytes32 groupId, uint32 delay) external onlyOwner {
        _setGroupGrantDelay(groupId, delay, 0);
    }

    /// @inheritdoc IExecutor
    function setGroupExpiration(bytes32 groupId, uint48 expiration) external onlyOwner {
        _setGroupExpiration(groupId, expiration);
    }

    /// @inheritdoc IExecutor
    function setTargetFunctionGroup(
        address target,
        bytes4 selector,
        bytes32 groupId
    ) external onlyAuthorized(target) onlyOwner {
        _setTargetFunctionGroup(target, selector, groupId);
    }

    /// @inheritdoc IExecutor
    function setTargetDisabled(
        address target,
        bool disabled
    ) external onlyAuthorized(target) onlyOwner {
        _setTargetDisabled(target, disabled);
    }

    /// @inheritdoc IExecutor
    function scheduleOperation(
        address target,
        bytes calldata data,
        uint48 when
    ) external payable returns (bytes32 operationId, uint32 nonce) {
        return _scheduleExecution(target, data, when);
    }

    /// @inheritdoc IExecutor
    function execute(
        address target,
        uint256 value,
        bytes calldata data
    ) external payable onlyAuthorized(target) returns (uint32 nonce) {
        (, nonce) = _execute(target, value, data);
    }

    /// @inheritdoc IExecutor
    function cancel(
        address caller,
        address target,
        bytes calldata data
    ) external returns (uint32 nonce) {
        return _cancel(caller, target, data);
    }

    /// @inheritdoc IExecutor
    function hasAccess(
        bytes32 groupId,
        address account
    ) external view returns (bool isMember, uint32 executionDelay, bool active) {
        return _hasGroupAccess(groupId, account);
    }

    /// @inheritdoc IExecutor
    function getAccess(
        bytes32 groupId,
        address account
    )
        external
        view
        returns (uint48 since, uint32 currentDelay, uint32 pendingDelay, uint48 effect)
    {
        return _getAccess(groupId, account);
    }

    /// @inheritdoc IExecutor
    function getGroupDelay(bytes32 groupId) external view returns (uint32) {
        return _getGroupGrantDelay(groupId);
    }

    /// @inheritdoc IExecutor
    function getScheduleTimepoint(bytes32 id) external view returns (uint48) {
        return _getScheduleTimepoint(id);
    }

    /// @inheritdoc IExecutor
    function onExecution(address target) external view returns (bool) {
        return _isTargetExecuting(target);
    }

    /// @inheritdoc IExecutor
    function hashOperation(
        address caller,
        address target,
        bytes calldata data
    ) external pure returns (bytes32) {
        return _hashOperation(caller, target, data);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        Internal                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @dev Internal function to get the owner
    function _getOwner() internal view virtual override returns (address) {
        return _owner();
    }

    /// @dev Internal function to check if a target is authorized
    function _checkAuthorized(address target) internal virtual {}
}
