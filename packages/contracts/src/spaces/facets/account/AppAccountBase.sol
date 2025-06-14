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
import {IPlatformRequirements} from "../../../factory/facets/platform/requirements/IPlatformRequirements.sol";
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
    using DependencyLib for MembershipStorage.Layout;
    using EnumerableSetLib for EnumerableSetLib.AddressSet;

    // Constants for dependency names
    bytes32 private constant RIVER_AIRDROP = bytes32("RiverAirdrop");
    bytes32 private constant SPACE_OPERATOR = bytes32("SpaceOperator"); // BaseRegistry
    bytes32 private constant SPACE_OWNER = bytes32("Space Owner");
    bytes32 private constant APP_REGISTRY = bytes32("AppRegistry");

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

        _verifyManifests(app.module, app.manifest);

        // set the group status to active
        _setGroupStatus(app.appId, true);
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

    // Internal Functions
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
        bytes32 appId = _getInstalledAppId(app);
        if (appId == EMPTY_UID) AppNotRegistered.selector.revertWith();
        _setGroupStatus(appId, true);
    }

    function _disableApp(address app) internal {
        bytes32 appId = _getInstalledAppId(app);
        if (appId == EMPTY_UID) AppNotRegistered.selector.revertWith();
        _setGroupStatus(appId, false);
    }

    function _isEntitled(
        address module,
        address client,
        bytes32 permission
    ) internal view returns (bool) {
        bytes32 appId = _getInstalledAppId(module);
        if (appId == EMPTY_UID) return false;

        App memory app = _getApp(module);

        bytes32[] memory permissions = app.permissions;

        if (app.client != client) {
            return false;
        }

        uint256 permissionsLength = permissions.length;
        for (uint256 i; i < permissionsLength; ++i) {
            if (permissions[i] == permission) {
                return true;
            }
        }

        return false;
    }

    function _getApp(address module) internal view returns (App memory app) {
        bytes32 appId = _getInstalledAppId(module);
        if (appId == EMPTY_UID) return app;
        return _getAppRegistry().getAppById(appId);
    }

    function _getPlatformRequirements() private view returns (IPlatformRequirements) {
        MembershipStorage.Layout storage ms = MembershipStorage.layout();
        return IPlatformRequirements(ms.spaceFactory);
    }

    function _getAppRegistry() private view returns (IAppRegistry) {
        MembershipStorage.Layout storage ms = MembershipStorage.layout();
        return IAppRegistry(ms.getDependency(APP_REGISTRY));
    }

    function _getApps() internal view returns (address[] memory) {
        return AppAccountStorage.getLayout().installedApps.values();
    }

    function _getInstalledAppId(address module) internal view returns (bytes32) {
        return AppAccountStorage.getLayout().appIdByApp[module];
    }

    function _isAppInstalled(address module) internal view returns (bool) {
        return AppAccountStorage.getLayout().installedApps.contains(module);
    }

    function _checkAuthorized(address module) internal view {
        if (module == address(0)) InvalidAppAddress.selector.revertWith();

        MembershipStorage.Layout storage ms = MembershipStorage.layout();
        address factory = ms.spaceFactory;

        bytes32[] memory dependencies = new bytes32[](4);
        dependencies[0] = RIVER_AIRDROP;
        dependencies[1] = SPACE_OPERATOR;
        dependencies[2] = SPACE_OWNER;
        dependencies[3] = APP_REGISTRY;
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
            module == factory ||
            module == deps[0] || // RiverAirdrop
            module == deps[1] || // SpaceOperator
            module == deps[2] || // SpaceOwner
            module == deps[3]; // AppRegistry
    }

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

    function _executePreHooks(
        address target,
        bytes4 selector,
        uint256 value,
        bytes calldata data
    ) internal virtual override {}

    function _executePostHooks(address target, bytes4 selector) internal virtual override {}
}
