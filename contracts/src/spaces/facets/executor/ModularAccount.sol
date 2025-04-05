// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

import {
    ExecutionManifest,
    ManifestExecutionFunction,
    ManifestExecutionHook
} from "@erc6900/reference-implementation/src/interfaces/IERC6900ExecutionModule.sol";
import {IERC6900Module} from "@erc6900/reference-implementation/src/interfaces/IERC6900Module.sol";
import {IImplementationRegistry} from
    "contracts/src/factory/facets/registry/IImplementationRegistry.sol";

// libraries
import {ExecutorLib} from "./libraries/ExecutorLib.sol";
import {ExecutorTypes} from "./libraries/ExecutorTypes.sol";
import {HookLib} from "./libraries/HookLib.sol";
import {DiamondLoupeBase} from "@towns-protocol/diamond/src/facets/loupe/DiamondLoupeBase.sol";

import {CustomRevert} from "contracts/src/utils/libraries/CustomRevert.sol";
import {LibCall} from "solady/utils/LibCall.sol";

// contracts
import {TokenOwnableBase} from
    "@towns-protocol/diamond/src/facets/ownable/token/TokenOwnableBase.sol";
import {MembershipStorage} from "contracts/src/spaces/facets/membership/MembershipStorage.sol";

/**
 * @title ModularAccount
 * @notice A lightweight modular erc6900 compatible account
 * @dev This account is used to execute transactions on behalf of a Space
 */
contract ModularAccount is TokenOwnableBase {
    using CustomRevert for bytes4;

    bytes32 public constant MODULE_GROUP_ID = "MODULE_GROUP_ID";

    error ModuleInstallCallbackFailed(address module, bytes reason);

    event ExecutionInstalled(address module, ExecutionManifest manifest);

    /**
     * @notice Validates if the target address is allowed for delegate calls
     * @dev Prevents delegate calls to critical system contracts
     * @param target The contract address to check
     */
    modifier onlyAuthorized(address target) {
        _checkAuthorized(target);
        _;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       Installation                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    function installExecution(
        address module,
        ExecutionManifest calldata manifest,
        bytes calldata moduleInstallData
    )
        external
        onlyOwner
    {
        if (module == address(0)) ExecutorTypes.NullModule.selector.revertWith();
        _checkAuthorized(module);

        bytes32 moduleGroupId = keccak256(abi.encode(MODULE_GROUP_ID, module));

        // Grant access to the module for this group
        ExecutorLib.grantGroupAccess(
            moduleGroupId,
            module,
            0, // grantDelay
            0 // executionDelay
        );

        // Set up execution functions with the same module groupId
        uint256 executionFunctionsLength = manifest.executionFunctions.length;
        for (uint256 i; i < executionFunctionsLength; ++i) {
            ManifestExecutionFunction memory func = manifest.executionFunctions[i];
            ExecutorLib.setTargetFunctionGroup(
                module,
                func.executionSelector,
                moduleGroupId // Same groupId for all functions
            );
        }

        // Set up hooks
        uint256 executionHooksLength = manifest.executionHooks.length;
        for (uint256 i; i < executionHooksLength; ++i) {
            ManifestExecutionHook memory hook = manifest.executionHooks[i];
            HookLib.addHook(
                module, hook.executionSelector, hook.entityId, hook.isPreHook, hook.isPostHook
            );
        }

        // Call module's onInstall if it has install data using LibCall
        if (moduleInstallData.length > 0) {
            bytes memory callData = abi.encodeCall(IERC6900Module.onInstall, (moduleInstallData));
            // LibCall will automatically bubble up any revert
            LibCall.callContract(module, 0, callData);
        }

        emit ExecutionInstalled(module, manifest);
    }

    function hasGroupAccess(
        bytes32 groupId,
        address account
    )
        external
        view
        returns (bool, uint32)
    {
        (bool hasAccess, uint32 executionDelay) = ExecutorLib.hasGroupAccess(groupId, account);
        return (hasAccess, executionDelay);
    }

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
