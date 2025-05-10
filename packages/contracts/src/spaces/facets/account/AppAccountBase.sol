// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IAppAccountBase} from "./IAppAccount.sol";
import {IAppRegistry} from "src/apps/facets/registry/AppRegistryFacet.sol";
import {ITownsApp} from "src/apps/ITownsApp.sol";
import {IERC6900Module} from "@erc6900/reference-implementation/interfaces/IERC6900Module.sol";
import {IERC6900ExecutionModule} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";
import {IERC6900Account} from "@erc6900/reference-implementation/interfaces/IERC6900Account.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IDiamondCut} from "@towns-protocol/diamond/src/facets/cut/IDiamondCut.sol";

// libraries
import {MembershipStorage} from "src/spaces/facets/membership/MembershipStorage.sol";
import {CustomRevert} from "src/utils/libraries/CustomRevert.sol";
import {DependencyLib} from "../DependencyLib.sol";
import {LibCall} from "solady/utils/LibCall.sol";

import {ExecutorBase} from "../executor/ExecutorBase.sol";
import {HookBase} from "../executor/hooks/HookBase.sol";
// types
import {ExecutionManifest, ManifestExecutionFunction, ManifestExecutionHook} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";
import {Attestation, EMPTY_UID} from "@ethereum-attestation-service/eas-contracts/Common.sol";

/**
 * @title AppAccountBase
 * @notice Base implementation for app account functionality
 * @dev This abstract contract extends ExecutorBase and HookBase to provide the core
 *      implementation for installing, uninstalling, and managing apps within the Towns Protocol
 *      It follows ERC6900 patterns for app/module management with Towns-specific extensions
 */
abstract contract AppAccountBase is IAppAccountBase, ExecutorBase, HookBase {
    using CustomRevert for bytes4;
    using DependencyLib for MembershipStorage.Layout;



    /**
     * @notice Install an app in the account
     * @dev Sets up the app's hooks, permissions, and allowance
     * @param appId The unique identifier of the app to install
     * @param grantDelay The delay before the app can be granted access to the group
     * @param executionDelay The delay before the app can execute a transaction
     * @param allowance The maximum amount of ETH that can be spent by the app
     * @param postInstallData Additional data to pass to the app's onInstall function
     */
    function _installApp(
        bytes32 appId,
        uint32 grantDelay,
        uint32 executionDelay,
        uint256 allowance,
        bytes calldata postInstallData
    ) internal {
        if (appId == EMPTY_UID) InvalidAppId.selector.revertWith();

        // get the module group id from the module registry
        (
            address module,
            ,
            address[] memory clients,
            ,
            ExecutionManifest memory cachedManifest
        ) = _getApp(appId);

        // verify if already installed
        if (_isGroupActive(appId)) AppAlreadyInstalled.selector.revertWith();

        _verifyManifests(module, cachedManifest);
        _createGroup(appId);

        uint256 clientsLength = clients.length;
        for (uint256 i; i < clientsLength; ++i) {
            _grantGroupAccess({
                groupId: appId,
                account: clients[i],
                grantDelay: grantDelay > 0 ? grantDelay : _getGroupGrantDelay(appId),
                executionDelay: executionDelay > 0 ? executionDelay : 0
            });
        }

        // Set up execution functions with the same module groupId
        uint256 executionFunctionsLength = cachedManifest.executionFunctions.length;
        for (uint256 i; i < executionFunctionsLength; ++i) {
            ManifestExecutionFunction memory func = cachedManifest.executionFunctions[i];

            // check if the function is a native function
            if (_isInvalidSelector(func.executionSelector)) {
                UnauthorizedSelector.selector.revertWith();
            }

            _setTargetFunctionGroup(module, func.executionSelector, appId);

            if (!func.allowGlobalValidation) {
                _setTargetFunctionDisabled(module, func.executionSelector, true);
            }
        }

        // Set up hooks
        uint256 executionHooksLength = cachedManifest.executionHooks.length;
        for (uint256 i; i < executionHooksLength; ++i) {
            ManifestExecutionHook memory hook = cachedManifest.executionHooks[i];
            _addHook(
                module,
                hook.executionSelector,
                hook.entityId,
                hook.isPreHook,
                hook.isPostHook
            );
        }

        // Set the allowance for the module group
        if (allowance > 0) {
            if (address(this).balance < allowance) NotEnoughEth.selector.revertWith();
            _setGroupAllowance(appId, allowance);
        }

        // Call module's onInstall if it has install data using LibCall
        // revert if it fails
        if (postInstallData.length > 0) {
            bytes memory callData = abi.encodeCall(IERC6900Module.onInstall, (postInstallData));
            LibCall.callContract(module, 0, callData);
        }

        emit IERC6900Account.ExecutionInstalled(module, cachedManifest);
    }

    /**
     * @notice Uninstall an app from the account
     * @dev Removes the app's hooks, permissions, and calls its onUninstall function
     * @param appId The unique identifier of the app to uninstall
     * @param uninstallData Additional data to pass to the app's onUninstall function
     */
    function _uninstallApp(bytes32 appId, bytes calldata uninstallData) internal {
        (address module, , address[] memory clients, , ExecutionManifest memory manifest) = _getApp(
            appId
        );

        // Remove hooks first
        uint256 executionHooksLength = manifest.executionHooks.length;
        for (uint256 i; i < executionHooksLength; ++i) {
            ManifestExecutionHook memory hook = manifest.executionHooks[i];
            _removeHook(module, hook.executionSelector, hook.entityId);
        }

        // Remove function _group mappings
        uint256 executionFunctionsLength = manifest.executionFunctions.length;
        for (uint256 i; i < executionFunctionsLength; ++i) {
            ManifestExecutionFunction memory func = manifest.executionFunctions[i];
            // Set the group to 0 to remove the mapping
            _setTargetFunctionGroup(module, func.executionSelector, EMPTY_UID);
        }

        // Revoke module's group access
        uint256 clientsLength = clients.length;
        for (uint256 i; i < clientsLength; ++i) {
            _revokeGroupAccess(appId, clients[i]);
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

    /**
     * @notice Set the maximum amount of ETH that an app can spend
     * @dev Updates the allowance for the specified app
     * @param appId The unique identifier of the app
     * @param allowance The new allowance value
     */
    function _setAppAllowance(bytes32 appId, uint256 allowance) internal {
        if (appId == EMPTY_UID) InvalidAppId.selector.revertWith();
        if (!_isGroupActive(appId)) AppNotInstalled.selector.revertWith();
        _setGroupAllowance(appId, allowance);
    }

    /**
     * @notice Get the current ETH allowance for an app
     * @dev Returns the maximum amount of ETH the app can spend
     * @param appId The unique identifier of the app
     * @return The current allowance value
     */
    function _getAppAllowance(bytes32 appId) internal view returns (uint256) {
        if (appId == EMPTY_UID) InvalidAppId.selector.revertWith();
        if (!_isGroupActive(appId)) AppNotInstalled.selector.revertWith();
        return _getGroupAllowance(appId);
    }

    /**
     * @notice Check if a client is entitled to a specific permission for an app
     * @dev Verifies if the client has the specified permission for the given app
     * @param appId The unique identifier of the app
     * @param client The address of the client to check
     * @param permission The permission to check for
     * @return True if the client has the permission, false otherwise
     */
    function _isEntitled(
        bytes32 appId,
        address client,
        bytes32 permission
    ) internal view returns (bool) {
        (, , address[] memory clients, bytes32[] memory permissions, ) = _getApp(appId);

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

    /**
     * @notice Get app details from the app registry
     * @dev Retrieves and decodes the app data from the registry
     * @param appId The unique identifier of the app
     * @return module The address of the app's module contract
     * @return owner The address of the app's owner
     * @return clients Array of client addresses that can use the app
     * @return permissions Array of permissions the app has
     * @return manifest The execution manifest for the app
     */
    function _getApp(
        bytes32 appId
    )
        internal
        view
        returns (
            address module,
            address owner,
            address[] memory clients,
            bytes32[] memory permissions,
            ExecutionManifest memory manifest
        )
    {
        MembershipStorage.Layout storage ms = MembershipStorage.layout();
        address appRegistry = ms.getDependency("AppRegistry");
        Attestation memory att = IAppRegistry(appRegistry).getAppById(appId);

        if (att.uid == EMPTY_UID) AppNotRegistered.selector.revertWith();
        if (att.revocationTime != 0) AppRevoked.selector.revertWith();

        (module, owner, clients, permissions, manifest) = abi.decode(
            att.data,
            (address, address, address[], bytes32[], ExecutionManifest)
        );
    }

    /**
     * @notice Check if a module address is authorized for execution
     * @dev Verifies the module is not a system contract and is not banned
     * @param module The address of the module to check
     */
    function _checkAuthorized(address module) internal view {
        if (module == address(0)) InvalidAppAddress.selector.revertWith();

        MembershipStorage.Layout storage ms = MembershipStorage.layout();
        address factory = ms.spaceFactory;

        bytes32[] memory dependencies = new bytes32[](4);
        dependencies[0] = bytes32("RiverAirdrop");
        dependencies[1] = bytes32("SpaceOperator"); // BaseRegistry
        dependencies[2] = bytes32("ModuleRegistry");
        dependencies[3] = bytes32("AppRegistry");
        address[] memory deps = ms.getDependencies(dependencies);

        if (IAppRegistry(deps[3]).isAppBanned(module)) {
            UnauthorizedApp.selector.revertWith(module);
        }

        // Unauthorized targets
        if (
            module == factory ||
            module == deps[0] ||
            module == deps[1] ||
            module == deps[2] ||
            module == deps[3]
        ) {
            UnauthorizedApp.selector.revertWith(module);
        }
    }

    /**
     * @notice Verify that the module's manifest matches the cached manifest
     * @dev Compares the hash of both manifests to ensure they match
     * @param module The address of the module
     * @param cachedManifest The cached execution manifest
     */
    function _verifyManifests(
        address module,
        ExecutionManifest memory cachedManifest
    ) internal pure {
        ExecutionManifest memory moduleManifest = ITownsApp(module).executionManifest();

        // Hash all cached and latest manifests and compare
        bytes32 moduleManifestHash = keccak256(abi.encode(moduleManifest));
        bytes32 cachedManifestHash = keccak256(abi.encode(cachedManifest));

        if (moduleManifestHash != cachedManifestHash) {
            InvalidManifest.selector.revertWith(module);
        }
    }

    /**
     * @notice Check if a function selector is a protected system selector
     * @dev Returns true for ERC6900 and other system selectors that should not be overridden
     * @param selector The function selector to check
     * @return True if the selector is protected, false otherwise
     */
    function _isInvalidSelector(bytes4 selector) internal pure returns (bool) {
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
            selector == ITownsApp.requiredPermissions.selector;
    }

    /**
     * @notice Execute pre-execution hooks
     * @dev Overrides the ExecutorBase implementation to use HookBase's hook system
     * @param target The address of the target contract
     * @param selector The function selector being called
     * @param value The amount of ETH being sent
     * @param data The calldata being sent
     */
    function _executePreHooks(
        address target,
        bytes4 selector,
        uint256 value,
        bytes calldata data
    ) internal virtual override {
        _callPreHooks(target, selector, value, data);
    }

    /**
     * @notice Execute post-execution hooks
     * @dev Overrides the ExecutorBase implementation to use HookBase's hook system
     * @param target The address of the target contract
     * @param selector The function selector being called
     */
    function _executePostHooks(address target, bytes4 selector) internal virtual override {
        _callPostHooks(target, selector);
    }
}
