// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

import {IERC6900Account} from "@erc6900/reference-implementation/interfaces/IERC6900Account.sol";
import {ExecutionManifest, ManifestExecutionFunction, ManifestExecutionHook} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";
import {IERC6900Module} from "@erc6900/reference-implementation/interfaces/IERC6900Module.sol";
import {IImplementationRegistry} from "src/factory/facets/registry/IImplementationRegistry.sol";
import {IModuleRegistry} from "src/attest/interfaces/IModuleRegistry.sol";
import {ITownsModule} from "src/attest/interfaces/ITownsModule.sol";
// libraries
import {ExecutorLib} from "./libraries/ExecutorLib.sol";
import {ExecutorTypes} from "./libraries/ExecutorTypes.sol";
import {HookLib} from "./libraries/HookLib.sol";
import {DiamondLoupeBase} from "@towns-protocol/diamond/src/facets/loupe/DiamondLoupeBase.sol";
import {DependencyLib} from "../DependencyLib.sol";
import {CustomRevert} from "src/utils/libraries/CustomRevert.sol";
import {LibCall} from "solady/utils/LibCall.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {TokenOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/token/TokenOwnableBase.sol";
import {MembershipStorage} from "src/spaces/facets/membership/MembershipStorage.sol";

/**
 * @title ModularAccount
 * @notice A lightweight modular erc6900 compatible account
 * @dev This account is used to execute transactions on behalf of a Space
 */
contract ModularAccount is TokenOwnableBase, Facet {
    using CustomRevert for bytes4;

    bytes32 public constant MODULE_GROUP_ID = "MODULE_GROUP_ID";

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
    /*                        Target Management                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    function setTargetDisabled(
        address target,
        bool disabled
    ) external onlyOwner onlyAuthorized(target) {
        ExecutorLib.setTargetDisabled(target, disabled);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       Group Management                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function setGuardian(bytes32 groupId, bytes32 guardian) external onlyOwner {
        ExecutorLib.setGroupGuardian(groupId, guardian);
    }

    function setGroupDelay(bytes32 groupId, uint32 delay) external onlyOwner {
        ExecutorLib.setGroupGrantDelay(groupId, delay, 0);
    }

    function revokeAccess(bytes32 groupId, address account) external onlyOwner {
        ExecutorLib.revokeGroupAccess(groupId, account);
    }

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

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    Operation Management                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function cancel(
        address caller,
        address target,
        bytes calldata data
    ) external returns (uint32 nonce) {
        return ExecutorLib.cancel(caller, target, data);
    }

    function getSchedule(bytes32 id) external view returns (uint48) {
        return ExecutorLib.getSchedule(id);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       Installation                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    function installExecution(
        address module,
        ExecutionManifest calldata manifest,
        bytes calldata moduleInstallData
    ) external onlyOwner {
        _checkAuthorized(module);
        ExecutionManifest memory moduleManifest = _checkManifest(module, manifest);

        // we will change this to be the attestation uid from our attestation contract
        bytes32 moduleGroupId = _getModule(module);

        // Grant access to the module for this group
        ExecutorLib.grantGroupAccess(
            moduleGroupId,
            module,
            0, // grantDelay
            0 // executionDelay
        );

        // Set up execution functions with the same module groupId
        uint256 executionFunctionsLength = moduleManifest.executionFunctions.length;
        for (uint256 i; i < executionFunctionsLength; ++i) {
            ManifestExecutionFunction memory func = moduleManifest.executionFunctions[i];
            ExecutorLib.setTargetFunctionGroup(module, func.executionSelector, moduleGroupId);

            if (!func.allowGlobalValidation) {
                ExecutorLib.setTargetFunctionDisabled(module, func.executionSelector, true);
            }
        }

        // Set up hooks
        uint256 executionHooksLength = moduleManifest.executionHooks.length;
        for (uint256 i; i < executionHooksLength; ++i) {
            ManifestExecutionHook memory hook = moduleManifest.executionHooks[i];
            HookLib.addHook(
                module,
                hook.executionSelector,
                hook.entityId,
                hook.isPreHook,
                hook.isPostHook
            );
        }

        // Call module's onInstall if it has install data using LibCall
        if (moduleInstallData.length > 0) {
            bytes memory callData = abi.encodeCall(IERC6900Module.onInstall, (moduleInstallData));
            // LibCall will automatically bubble up any revert
            LibCall.callContract(module, 0, callData);
        }

        emit IERC6900Account.ExecutionInstalled(module, manifest);
    }

    function uninstallExecution(
        address module,
        ExecutionManifest calldata manifest,
        bytes calldata uninstallData
    ) external onlyOwner {
        _checkAuthorized(module);

        bytes32 moduleGroupId = keccak256(abi.encode(MODULE_GROUP_ID, module));

        // Remove hooks first
        uint256 executionHooksLength = manifest.executionHooks.length;
        for (uint256 i; i < executionHooksLength; ++i) {
            ManifestExecutionHook memory hook = manifest.executionHooks[i];
            HookLib.removeHook(module, hook.executionSelector, hook.entityId);
        }

        // Remove function group mappings
        uint256 executionFunctionsLength = manifest.executionFunctions.length;
        for (uint256 i; i < executionFunctionsLength; ++i) {
            ManifestExecutionFunction memory func = manifest.executionFunctions[i];
            // Set the group to 0 to remove the mapping
            ExecutorLib.setTargetFunctionGroup(module, func.executionSelector, bytes32(0));
        }

        // Revoke module's group access
        ExecutorLib.revokeGroupAccess(moduleGroupId, module);

        // Call module's onUninstall if uninstall data is provided
        bool onUninstallSuccess = true;
        if (uninstallData.length > 0) {
            // Clear the module storage for the account.
            // solhint-disable-next-line no-empty-blocks
            try IERC6900Module(module).onUninstall(uninstallData) {} catch {
                onUninstallSuccess = false;
            }
        }

        emit IERC6900Account.ExecutionUninstalled(module, onUninstallSuccess, manifest);
    }

    function hasGroupAccess(bytes32 groupId, address account) external view returns (bool, uint32) {
        (bool hasAccess, uint32 executionDelay) = ExecutorLib.hasGroupAccess(groupId, account);
        return (hasAccess, executionDelay);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      Execution                             */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    function execute(
        address target,
        uint256 value,
        bytes calldata data
    ) external payable onlyAuthorized(target) returns (uint32 nonce) {
        return ExecutorLib.execute(target, value, data);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        Internal                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    function _getModule(address target) internal view returns (bytes32 uid) {
        address appRegistry = DependencyLib.getDependency("AppRegistry");
        uid = IModuleRegistry(appRegistry).getModuleVersion(target);
    }

    function _checkAuthorized(address target) internal virtual {
        if (target == address(0)) ExecutorTypes.NullModule.selector.revertWith();

        address factory = MembershipStorage.layout().spaceFactory;

        bytes32[] memory dependencies = new bytes32[](3);
        dependencies[0] = bytes32("RiverAirdrop");
        dependencies[1] = bytes32("SpaceOperator");
        dependencies[2] = bytes32("ModuleRegistry");
        address[] memory deps = DependencyLib.getDependencies(dependencies);

        // Unauthorized targets
        if (target == factory || target == deps[0] || target == deps[1]) {
            ExecutorTypes.UnauthorizedTarget.selector.revertWith(target);
        }
    }

    function _checkManifest(
        address module,
        ExecutionManifest calldata manifest
    ) internal pure returns (ExecutionManifest memory moduleManifest) {
        moduleManifest = ITownsModule(module).executionManifest();

        // Hash both manifests and compare
        bytes32 manifestHash = keccak256(abi.encode(manifest));
        bytes32 moduleManifestHash = keccak256(abi.encode(moduleManifest));

        if (manifestHash != moduleManifestHash) {
            CustomRevert.revertWith("Invalid manifest");
        }
    }
}
