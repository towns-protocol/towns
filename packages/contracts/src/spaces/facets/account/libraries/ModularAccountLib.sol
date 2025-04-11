// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IImplementationRegistry} from "src/factory/facets/registry/IImplementationRegistry.sol";
import {IModuleRegistry} from "src/attest/interfaces/IModuleRegistry.sol";
import {ITownsModule} from "src/attest/interfaces/ITownsModule.sol";
import {IERC6900Module} from "@erc6900/reference-implementation/interfaces/IERC6900Module.sol";
import {IERC6900Account} from "@erc6900/reference-implementation/interfaces/IERC6900Account.sol";

// libraries
import {MembershipStorage} from "src/spaces/facets/membership/MembershipStorage.sol";
import {ExecutorLib} from "src/spaces/facets/account/libraries/ExecutorLib.sol";
import {HookLib} from "src/spaces/facets/account/libraries/HookLib.sol";
import {CustomRevert} from "src/utils/libraries/CustomRevert.sol";
import {DependencyLib} from "../../DependencyLib.sol";
import {DiamondLoupeBase} from "@towns-protocol/diamond/src/facets/loupe/DiamondLoupeBase.sol";
import {LibCall} from "solady/utils/LibCall.sol";

// types
import {ExecutionManifest, ManifestExecutionFunction, ManifestExecutionHook} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";

// contracts

library ModularAccountLib {
    using CustomRevert for bytes4;

    // errors
    error UnauthorizedModule(address module);
    error InvalidModuleAddress(address module);
    error InvalidManifest(address module);
    error NotImplemented();

    // Writes
    function noop() internal pure {
        NotImplemented.selector.revertWith();
    }

    function installExecution(
        address module,
        ExecutionManifest calldata manifest,
        bytes calldata moduleInstallData
    ) internal {
        ExecutionManifest memory moduleManifest = checkManifest(module, manifest);

        // get the module group id from the module registry
        (bytes32 moduleGroupId, address[] memory clients) = getModule(module);

        uint256 clientsLength = clients.length;
        for (uint256 i; i < clientsLength; ++i) {
            ExecutorLib.grantGroupAccess(
                moduleGroupId,
                clients[i],
                0, // grantDelay
                0 // executionDelay
            );
        }
        // Set up execution functions with the same module groupId
        uint256 executionFunctionsLength = moduleManifest.executionFunctions.length;
        for (uint256 i; i < executionFunctionsLength; ++i) {
            ManifestExecutionFunction memory func = moduleManifest.executionFunctions[i];

            // check if the function is a diamond function
            if (DiamondLoupeBase.facetAddress(func.executionSelector) != address(0)) {
                UnauthorizedModule.selector.revertWith(module);
            }

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
        // revert if it fails
        if (moduleInstallData.length > 0) {
            bytes memory callData = abi.encodeCall(IERC6900Module.onInstall, (moduleInstallData));
            LibCall.callContract(module, 0, callData);
        }

        emit IERC6900Account.ExecutionInstalled(module, manifest);
    }

    function uninstallExecution(
        address module,
        ExecutionManifest calldata manifest,
        bytes calldata uninstallData
    ) internal {
        (bytes32 moduleGroupId, address[] memory clients) = getModule(module);

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
        uint256 clientsLength = clients.length;
        for (uint256 i; i < clientsLength; ++i) {
            ExecutorLib.revokeGroupAccess(moduleGroupId, clients[i]);
        }

        // Call module's onUninstall if uninstall data is provided
        // don't revert if it fails
        bool onUninstallSuccess = true;
        if (uninstallData.length > 0) {
            // solhint-disable-next-line no-empty-blocks
            try IERC6900Module(module).onUninstall(uninstallData) {} catch {
                onUninstallSuccess = false;
            }
        }

        emit IERC6900Account.ExecutionUninstalled(module, onUninstallSuccess, manifest);
    }

    // Getters
    function getModule(
        address target
    ) internal view returns (bytes32 uid, address[] memory clients) {
        address appRegistry = DependencyLib.getDependency("AppRegistry");
        uid = IModuleRegistry(appRegistry).getModuleVersion(target);
        clients = IModuleRegistry(appRegistry).getModuleClients(target);
    }

    function getImplementation(address factory, bytes32 id) internal view returns (address) {
        return IImplementationRegistry(factory).getLatestImplementation(id);
    }

    // Checks
    function checkAuthorized(address target) internal view {
        if (target == address(0)) InvalidModuleAddress.selector.revertWith();

        address factory = MembershipStorage.layout().spaceFactory;

        bytes32[] memory dependencies = new bytes32[](4);
        dependencies[0] = bytes32("RiverAirdrop");
        dependencies[1] = bytes32("SpaceOperator"); // BaseRegistry
        dependencies[2] = bytes32("ModuleRegistry");
        dependencies[3] = bytes32("AppRegistry");
        address[] memory deps = DependencyLib.getDependencies(dependencies);

        // Unauthorized targets
        if (
            target == factory ||
            target == deps[0] ||
            target == deps[1] ||
            target == deps[2] ||
            target == deps[3]
        ) {
            UnauthorizedModule.selector.revertWith(target);
        }
    }

    function checkManifest(
        address module,
        ExecutionManifest calldata manifest
    ) internal pure returns (ExecutionManifest memory moduleManifest) {
        moduleManifest = ITownsModule(module).executionManifest();

        // Hash both manifests and compare
        bytes32 manifestHash = keccak256(abi.encode(manifest));
        bytes32 moduleManifestHash = keccak256(abi.encode(moduleManifest));

        if (manifestHash != moduleManifestHash) {
            InvalidManifest.selector.revertWith(module);
        }
    }
}
