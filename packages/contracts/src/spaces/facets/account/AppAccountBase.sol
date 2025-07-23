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
import {IAppRegistryBase} from "src/apps/facets/registry/IAppRegistry.sol";

// libraries
import {MembershipStorage} from "src/spaces/facets/membership/MembershipStorage.sol";
import {CustomRevert} from "src/utils/libraries/CustomRevert.sol";
import {DependencyLib} from "../DependencyLib.sol";
import {LibCall} from "solady/utils/LibCall.sol";
import {AppAccountStorage} from "./AppAccountStorage.sol";
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";

// contracts
import {ExecutorBase} from "../executor/ExecutorBase.sol";
import {TokenOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/token/TokenOwnableBase.sol";

// types
import {ExecutionManifest, ManifestExecutionFunction} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";
import {Attestation, EMPTY_UID} from "@ethereum-attestation-service/eas-contracts/Common.sol";

abstract contract AppAccountBase is
    IAppAccountBase,
    IAppRegistryBase,
    TokenOwnableBase,
    ExecutorBase
{
    using CustomRevert for bytes4;
    using EnumerableSetLib for EnumerableSetLib.AddressSet;
    using DependencyLib for MembershipStorage.Layout;

    uint48 private constant DEFAULT_DURATION = 365 days;

    // External Functions
    function _onlyRegistry() internal view {
        if (msg.sender != address(_getAppRegistry())) InvalidCaller.selector.revertWith();
    }

    function _installApp(bytes32 appId, bytes calldata postInstallData) internal {
        if (appId == EMPTY_UID) InvalidAppId.selector.revertWith();

        // get the app
        App memory app = _getAppRegistry().getAppById(appId);

        if (app.appId == EMPTY_UID) AppNotRegistered.selector.revertWith();

        // verify if already installed
        if (_isAppInstalled(app.module)) AppAlreadyInstalled.selector.revertWith();

        // set the group status to active
        _setGroupStatus(app.appId, true, _getAppExpiration(app.appId, app.duration));
        _addApp(app.module, app.appId);
        _grantGroupAccess({
            groupId: app.appId,
            account: app.client,
            grantDelay: _getGroupGrantDelay(app.appId),
            executionDelay: 0
        });

        // Set up execution functions with the same module groupId
        uint256 executionFunctionsLength = app.manifest.executionFunctions.length;
        for (uint256 i; i < executionFunctionsLength; ++i) {
            ManifestExecutionFunction memory func = app.manifest.executionFunctions[i];

            // check if the function is a native function
            if (_isInvalidSelector(func.executionSelector)) {
                UnauthorizedSelector.selector.revertWith();
            }

            _setTargetFunctionGroup(app.module, func.executionSelector, app.appId);

            if (!func.allowGlobalValidation) {
                _setTargetFunctionDisabled(app.module, func.executionSelector, true);
            }
        }

        // Call module's onInstall if it has install data using LibCall
        // revert if it fails
        if (postInstallData.length > 0) {
            bytes memory callData = abi.encodeCall(IERC6900Module.onInstall, (postInstallData));
            LibCall.callContract(app.module, 0, callData);
        }

        emit IERC6900Account.ExecutionInstalled(app.module, app.manifest);
    }

    function _uninstallApp(bytes32 appId, bytes calldata uninstallData) internal {
        if (appId == EMPTY_UID) InvalidAppId.selector.revertWith();

        App memory app = _getAppRegistry().getAppById(appId);

        if (app.appId == EMPTY_UID) AppNotRegistered.selector.revertWith();
        if (!_isAppInstalled(app.module)) AppNotInstalled.selector.revertWith();

        _removeApp(app.module);

        // Remove function _group mappings
        uint256 executionFunctionsLength = app.manifest.executionFunctions.length;
        for (uint256 i; i < executionFunctionsLength; ++i) {
            ManifestExecutionFunction memory func = app.manifest.executionFunctions[i];
            // Set the group to 0 to remove the mapping
            _setTargetFunctionGroup(app.module, func.executionSelector, EMPTY_UID);
        }

        // Revoke module's group access
        _revokeGroupAccess(app.appId, app.client);

        // Call module's onUninstall if uninstall data is provided
        // don't revert if it fails
        bool onUninstallSuccess = true;
        if (uninstallData.length > 0) {
            // solhint-disable-next-line no-empty-blocks
            try IERC6900Module(app.module).onUninstall(uninstallData) {} catch {
                onUninstallSuccess = false;
            }
        }

        emit IERC6900Account.ExecutionUninstalled(app.module, onUninstallSuccess, app.manifest);
    }

    function _onRenewApp(bytes32 appId, bytes calldata /* data */) internal {
        // Get the app data to determine the duration
        App memory app = _getAppRegistry().getAppById(appId);
        if (app.appId == EMPTY_UID) AppNotRegistered.selector.revertWith();

        // Calculate the new expiration time (extends current expiration by app duration)
        uint48 newExpiration = _getAppExpiration(app.appId, app.duration);

        // Update the group expiration
        _setGroupExpiration(app.appId, newExpiration);
    }

    function _onExecute(
        address target,
        uint256,
        bytes calldata data
    ) internal returns (bytes memory result) {
        _checkAuthorized(target);
        (result, ) = _execute(target, 0, data);
    }

    // Internal Functions
    function _getAppExpiration(
        bytes32 appId,
        uint48 duration
    ) internal view returns (uint48 expiration) {
        uint48 currentExpiration = _getGroupExpiration(appId);
        if (currentExpiration > block.timestamp) {
            expiration = currentExpiration + duration;
        } else {
            expiration = uint48(block.timestamp) + duration;
        }
    }

    function _addApp(address module, bytes32 appId) internal {
        AppAccountStorage.Layout storage $ = AppAccountStorage.getLayout();
        $.installedApps.add(module);
        $.appIdByApp[module] = appId;
    }

    function _removeApp(address module) internal {
        AppAccountStorage.getLayout().installedApps.remove(module);
        delete AppAccountStorage.getLayout().appIdByApp[module];
    }

    function _enableApp(address app) internal {
        bytes32 appId = AppAccountStorage.getInstalledAppId(app);
        if (appId == EMPTY_UID) AppNotRegistered.selector.revertWith();
        _setGroupStatus(appId, true);
    }

    function _disableApp(address app) internal {
        bytes32 appId = AppAccountStorage.getInstalledAppId(app);
        if (appId == EMPTY_UID) AppNotRegistered.selector.revertWith();
        _setGroupStatus(appId, false);
    }

    function _isAppEntitled(
        address module,
        address client,
        bytes32 permission
    ) internal view returns (bool) {
        return AppAccountStorage.isAppEntitled(module, client, permission);
    }

    function _getInstalledAppId(address module) internal view returns (bytes32) {
        return AppAccountStorage.getInstalledAppId(module);
    }

    function _getApp(address module) internal view returns (App memory app) {
        return AppAccountStorage.getApp(module);
    }

    function _getAppRegistry() internal view returns (IAppRegistry) {
        return DependencyLib.getAppRegistry();
    }

    function _getApps() internal view returns (address[] memory) {
        return AppAccountStorage.getLayout().installedApps.values();
    }

    function _isAppInstalled(address module) internal view returns (bool) {
        return AppAccountStorage.getLayout().installedApps.contains(module);
    }

    function _checkAuthorized(address module) internal view {
        if (module == address(0)) InvalidAppAddress.selector.revertWith();

        MembershipStorage.Layout storage ms = MembershipStorage.layout();
        address factory = ms.spaceFactory;

        bytes32[] memory dependencies = new bytes32[](4);
        dependencies[0] = DependencyLib.RIVER_AIRDROP;
        dependencies[1] = DependencyLib.SPACE_OPERATOR;
        dependencies[2] = DependencyLib.SPACE_OWNER;
        dependencies[3] = DependencyLib.APP_REGISTRY;
        address[] memory deps = ms.getDependencies(dependencies);

        // Check if app is banned
        if (IAppRegistry(deps[3]).isAppBanned(module)) {
            UnauthorizedApp.selector.revertWith(module);
        }

        // Check against unauthorized targets
        if (_isUnauthorizedTarget(module, factory, deps)) {
            UnauthorizedApp.selector.revertWith(module);
        }
    }

    function _isUnauthorizedTarget(
        address module,
        address factory,
        address[] memory deps
    ) private pure returns (bool) {
        return
            module == factory || // SpaceFactory
            module == deps[0] || // RiverAirdrop
            module == deps[1] || // BaseRegistry
            module == deps[2] || // SpaceOwner
            module == deps[3]; // AppRegistry
    }

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

    // Override Functions
    function _getOwner() internal view virtual override returns (address) {
        return _owner();
    }
}
