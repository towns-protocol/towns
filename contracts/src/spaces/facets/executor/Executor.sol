// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IExecutor} from "./interfaces/IExecutor.sol";
import {IImplementationRegistry} from
    "contracts/src/factory/facets/registry/IImplementationRegistry.sol";

// libraries

import {ExecutorLib} from "./libraries/ExecutorLib.sol";
import {ExecutorTypes} from "./libraries/ExecutorTypes.sol";
import {DiamondLoupeBase} from "@towns-protocol/diamond/src/facets/loupe/DiamondLoupeBase.sol";

// contracts
import {TokenOwnableBase} from
    "@towns-protocol/diamond/src/facets/ownable/token/TokenOwnableBase.sol";
import {MembershipStorage} from "contracts/src/spaces/facets/membership/MembershipStorage.sol";

/**
 * @title Executor
 * @notice Facet that enables permissioned delegate calls from a Space
 * @dev This facet must be carefully controlled as delegate calls can be dangerous
 */
contract Executor is TokenOwnableBase, IExecutor {
    /**
     * @notice Validates if the target address is allowed for delegate calls
     * @dev Prevents delegate calls to critical system contracts
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
    )
        external
        onlyOwner
        returns (bool newMember)
    {
        return ExecutorLib.grantGroupAccess(
            groupId, account, ExecutorLib.getGroupGrantDelay(groupId), delay
        );
    }

    /// @inheritdoc IExecutor
    function hasAccess(
        bytes32 groupId,
        address account
    )
        external
        view
        returns (bool isMember, uint32 executionDelay)
    {
        return ExecutorLib.hasGroupAccess(groupId, account);
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
        return ExecutorLib.getAccess(groupId, account);
    }

    /// @inheritdoc IExecutor
    function revokeAccess(bytes32 groupId, address account) external onlyOwner {
        ExecutorLib.revokeGroupAccess(groupId, account);
    }

    /// @inheritdoc IExecutor
    function renounceAccess(bytes32 groupId, address account) external {
        ExecutorLib.renounceGroupAccess(groupId, account);
    }

    /// @inheritdoc IExecutor
    function setGuardian(bytes32 groupId, bytes32 guardian) external onlyOwner {
        ExecutorLib.setGroupGuardian(groupId, guardian);
    }

    /// @inheritdoc IExecutor
    function setGroupDelay(bytes32 groupId, uint32 delay) external onlyOwner {
        ExecutorLib.setGroupGrantDelay(groupId, delay, 0);
    }

    function getGroupDelay(bytes32 groupId) external view returns (uint32) {
        return ExecutorLib.getGroupGrantDelay(groupId);
    }

    /// @inheritdoc IExecutor
    function setTargetFunctionGroup(
        address target,
        bytes4 selector,
        bytes32 groupId
    )
        external
        onlyAuthorized(target)
        onlyOwner
    {
        // Disallow setting any diamond functions
        if (target == DiamondLoupeBase.facetAddress(selector)) {
            revert ExecutorTypes.UnauthorizedTarget(target);
        }
        ExecutorLib.setTargetFunctionGroup(target, selector, groupId);
    }

    /// @inheritdoc IExecutor
    function setTargetFunctionDisabled(
        address target,
        bool disabled
    )
        external
        onlyAuthorized(target)
        onlyOwner
    {
        ExecutorLib.setTargetFunctionDisabled(target, disabled);
    }

    /// @inheritdoc IExecutor
    function getSchedule(bytes32 id) external view returns (uint48) {
        return ExecutorLib.getSchedule(id);
    }

    /// @inheritdoc IExecutor
    function scheduleOperation(
        address target,
        bytes calldata data,
        uint48 when
    )
        external
        payable
        returns (bytes32 operationId, uint32 nonce)
    {
        return ExecutorLib.scheduleExecution(target, data, when);
    }

    /// @inheritdoc IExecutor
    function hashOperation(
        address caller,
        address target,
        bytes calldata data
    )
        external
        pure
        returns (bytes32)
    {
        return ExecutorLib.hashOperation(caller, target, data);
    }

    /// @inheritdoc IExecutor
    function execute(
        address target,
        uint256 value,
        bytes calldata data
    )
        external
        payable
        onlyAuthorized(target)
        returns (uint32 nonce)
    {
        return ExecutorLib.execute(target, value, data);
    }

    /// @inheritdoc IExecutor
    function cancel(
        address caller,
        address target,
        bytes calldata data
    )
        external
        returns (uint32 nonce)
    {
        return ExecutorLib.cancel(caller, target, data);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        Internal                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _getImplementation(address factory, bytes32 id) internal view returns (address) {
        return IImplementationRegistry(factory).getLatestImplementation(id);
    }

    function _checkAuthorized(address target) internal virtual {
        address factory = MembershipStorage.layout().spaceFactory;

        // Unauthorized targets
        if (
            target == factory || target == _getImplementation(factory, bytes32("RiverAirdrop"))
                || target == _getImplementation(factory, bytes32("SpaceOperator"))
        ) {
            revert ExecutorTypes.UnauthorizedTarget(target);
        }
    }
}
