// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IImplementationRegistry} from "src/factory/facets/registry/IImplementationRegistry.sol";
import {IModuleRegistry} from "src/attest/interfaces/IModuleRegistry.sol";
import {ITownsModule} from "src/attest/interfaces/ITownsModule.sol";
import {IERC6900Module} from "@erc6900/reference-implementation/interfaces/IERC6900Module.sol";
import {IERC6900ExecutionModule} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";
import {IERC6900Account} from "@erc6900/reference-implementation/interfaces/IERC6900Account.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IDiamondCut} from "@towns-protocol/diamond/src/facets/cut/IDiamondCut.sol";

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
import {Attestation, EMPTY_UID} from "@ethereum-attestation-service/eas-contracts/Common.sol";

library ModularAccountLib {
    using CustomRevert for bytes4;

    // errors
    error UnauthorizedModule(address module);
    error InvalidModuleAddress(address module);
    error InvalidManifest(address module);
    error NotImplemented();
    error ModuleNotRegistered(address module);
    error ModuleRevoked(address module);
    error UnauthorizedSelector();

    // Writes
    function noop() internal pure {
        NotImplemented.selector.revertWith();
    }

    function installExecution(
        address module,
        ExecutionManifest calldata manifest,
        bytes calldata moduleInstallData
    ) internal {
        if (module == address(0)) InvalidModuleAddress.selector.revertWith();

        // get the module group id from the module registry
        (
            bytes32 moduleGroupId,
            address[] memory clients,
            ,
            ExecutionManifest memory cachedManifest
        ) = getModule(module);

        verifyManifests(module, manifest, cachedManifest);

        uint256 clientsLength = clients.length;
        for (uint256 i; i < clientsLength; ++i) {
            ExecutorLib.grantGroupAccess({
                groupId: moduleGroupId,
                account: clients[i],
                grantDelay: ExecutorLib.getGroupGrantDelay(moduleGroupId),
                executionDelay: 0
            });
        }

        // Set up execution functions with the same module groupId
        uint256 executionFunctionsLength = cachedManifest.executionFunctions.length;
        for (uint256 i; i < executionFunctionsLength; ++i) {
            ManifestExecutionFunction memory func = cachedManifest.executionFunctions[i];

            // check if the function is a native function
            if (isInvalidSelector(func.executionSelector)) {
                UnauthorizedSelector.selector.revertWith();
            }

            ExecutorLib.setTargetFunctionGroup(module, func.executionSelector, moduleGroupId);

            if (!func.allowGlobalValidation) {
                ExecutorLib.setTargetFunctionDisabled(module, func.executionSelector, true);
            }
        }

        // Set up hooks
        uint256 executionHooksLength = cachedManifest.executionHooks.length;
        for (uint256 i; i < executionHooksLength; ++i) {
            ManifestExecutionHook memory hook = cachedManifest.executionHooks[i];
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
        (bytes32 moduleGroupId, address[] memory clients, , ) = getModule(module);

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
            ExecutorLib.setTargetFunctionGroup(module, func.executionSelector, EMPTY_UID);
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

    function setModuleAllowance(address module, uint256 maxEthValue) internal {
        (bytes32 moduleGroupId, , , ) = getModule(module);
        ExecutorLib.setGroupMaxEthValue(moduleGroupId, maxEthValue);
    }

    function getModuleAllowance(address module) internal view returns (uint256) {
        (bytes32 moduleGroupId, , , ) = getModule(module);
        return ExecutorLib.getGroupMaxEthValue(moduleGroupId);
    }

    // Getters
    function isEntitled(
        address module,
        address client,
        bytes32 permission
    ) internal view returns (bool) {
        (, address[] memory clients, bytes32[] memory permissions, ) = getModule(module);

        uint256 clientsLength = clients.length;
        uint256 permissionsLength = permissions.length;

        // has to be both in the clients array and the permissions array
        bool isClient = false;
        for (uint256 i; i < clientsLength; ++i) {
            if (clients[i] == client) {
                isClient = true;
                break;
            }
        }

        if (!isClient) return false;

        for (uint256 i; i < permissionsLength; ++i) {
            if (permissions[i] == permission) {
                return true;
            }
        }

        return false;
    }

    function getModule(
        address target
    )
        internal
        view
        returns (
            bytes32 uid,
            address[] memory clients,
            bytes32[] memory permissions,
            ExecutionManifest memory manifest
        )
    {
        address appRegistry = DependencyLib.getDependency("AppRegistry");
        Attestation memory att = IModuleRegistry(appRegistry).getModule(target);

        if (att.uid == EMPTY_UID) ModuleNotRegistered.selector.revertWith(target);
        if (att.revocationTime != 0) ModuleRevoked.selector.revertWith(target);

        uid = att.uid;
        (, clients, , permissions, manifest) = abi.decode(
            att.data,
            (address, address[], address, bytes32[], ExecutionManifest)
        );
    }

    function getImplementation(address factory, bytes32 id) internal view returns (address) {
        return IImplementationRegistry(factory).getLatestImplementation(id);
    }

    // Checks
    function checkAuthorized(address module) internal view {
        if (module == address(0)) InvalidModuleAddress.selector.revertWith();

        address factory = MembershipStorage.layout().spaceFactory;

        bytes32[] memory dependencies = new bytes32[](4);
        dependencies[0] = bytes32("RiverAirdrop");
        dependencies[1] = bytes32("SpaceOperator"); // BaseRegistry
        dependencies[2] = bytes32("ModuleRegistry");
        dependencies[3] = bytes32("AppRegistry");
        address[] memory deps = DependencyLib.getDependencies(dependencies);

        // Unauthorized targets
        if (
            module == factory ||
            module == deps[0] ||
            module == deps[1] ||
            module == deps[2] ||
            module == deps[3]
        ) {
            UnauthorizedModule.selector.revertWith(module);
        }
    }

    function verifyManifests(
        address module,
        ExecutionManifest calldata manifest,
        ExecutionManifest memory cachedManifest
    ) internal pure {
        ExecutionManifest memory moduleManifest = ITownsModule(module).executionManifest();

        // Hash all three manifests and compare
        bytes32 manifestHash = keccak256(abi.encode(manifest));
        bytes32 moduleManifestHash = keccak256(abi.encode(moduleManifest));
        bytes32 cachedManifestHash = keccak256(abi.encode(cachedManifest));

        if (
            manifestHash != moduleManifestHash ||
            manifestHash != cachedManifestHash ||
            moduleManifestHash != cachedManifestHash
        ) {
            InvalidManifest.selector.revertWith(module);
        }
    }

    function isInvalidSelector(bytes4 selector) internal pure returns (bool) {
        return
            selector == IERC6900Account.installExecution.selector ||
            selector == IERC6900Account.uninstallExecution.selector ||
            selector == IERC6900Account.installValidation.selector ||
            selector == IERC6900Account.uninstallValidation.selector ||
            selector == IERC6900Account.execute.selector ||
            selector == IERC6900Account.executeBatch.selector ||
            selector == IERC6900Account.executeWithRuntimeValidation.selector ||
            selector == IERC6900Account.accountId.selector ||
            selector == IERC165.supportsInterface.selector ||
            selector == IERC6900Module.moduleId.selector ||
            selector == IERC6900Module.onInstall.selector ||
            selector == IERC6900Module.onUninstall.selector ||
            selector == IERC6900ExecutionModule.executionManifest.selector ||
            selector == IDiamondCut.diamondCut.selector ||
            selector == ITownsModule.requiredPermissions.selector;
    }
}
