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
import {AppAccountStorage} from "./AppAccountStorage.sol";
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";

// contracts
import {ExecutorBase} from "../executor/ExecutorBase.sol";
import {HookBase} from "../executor/hooks/HookBase.sol";
import {TokenOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/token/TokenOwnableBase.sol";

// types
import {ExecutionManifest, ManifestExecutionFunction, ManifestExecutionHook} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";
import {Attestation, EMPTY_UID} from "@ethereum-attestation-service/eas-contracts/Common.sol";

abstract contract AppAccountBase is IAppAccountBase, TokenOwnableBase, ExecutorBase {
    using CustomRevert for bytes4;
    using DependencyLib for MembershipStorage.Layout;
    using EnumerableSetLib for EnumerableSetLib.AddressSet;

    function _installApp(
        address module,
        Delays calldata delays,
        bytes calldata postInstallData
    ) internal {
        if (module == address(0)) InvalidAppAddress.selector.revertWith();

        // get the latest app
        App memory app = _getLatestApp(module);

        // verify if already installed
        if (_isGroupActive(app.appId)) AppAlreadyInstalled.selector.revertWith();

        // check if a version of the app is already installed
        bytes32 appId = _getAppId(module);
        if (appId != EMPTY_UID && _isGroupActive(appId)) {
            AppAlreadyInstalled.selector.revertWith();
        }

        _verifyManifests(module, app.manifest);
        _setGroupStatus(app.appId, true);
        _addApp(module, app.appId);

        uint256 clientsLength = app.clients.length;
        for (uint256 i; i < clientsLength; ++i) {
            _grantGroupAccess({
                groupId: app.appId,
                account: app.clients[i],
                grantDelay: delays.grantDelay > 0
                    ? delays.grantDelay
                    : _getGroupGrantDelay(app.appId),
                executionDelay: delays.executionDelay > 0 ? delays.executionDelay : 0
            });
        }

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
                _setTargetFunctionDisabled(module, func.executionSelector, true);
            }
        }

        // Call module's onInstall if it has install data using LibCall
        // revert if it fails
        if (postInstallData.length > 0) {
            bytes memory callData = abi.encodeCall(IERC6900Module.onInstall, (postInstallData));
            LibCall.callContract(module, 0, callData);
        }

        emit IERC6900Account.ExecutionInstalled(app.module, app.manifest);
    }

    function _uninstallApp(address module, bytes calldata uninstallData) internal {
        App memory app = _getApp(module);

        _removeApp(module);

        // Remove function _group mappings
        uint256 executionFunctionsLength = app.manifest.executionFunctions.length;
        for (uint256 i; i < executionFunctionsLength; ++i) {
            ManifestExecutionFunction memory func = app.manifest.executionFunctions[i];
            // Set the group to 0 to remove the mapping
            _setTargetFunctionGroup(app.module, func.executionSelector, EMPTY_UID);
        }

        // Revoke module's group access
        uint256 clientsLength = app.clients.length;
        for (uint256 i; i < clientsLength; ++i) {
            _revokeGroupAccess(app.appId, app.clients[i]);
        }

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

    function _addApp(address module, bytes32 appId) internal {
        AppAccountStorage.getLayout().installedApps.add(module);
        AppAccountStorage.getLayout().appIdByApp[module] = appId;
    }

    function _removeApp(address module) internal {
        AppAccountStorage.getLayout().installedApps.remove(module);
        delete AppAccountStorage.getLayout().appIdByApp[module];
    }

    function _disableApp(address app) internal {
        bytes32 appId = _getAppId(app);
        if (appId == EMPTY_UID) AppNotRegistered.selector.revertWith();
        _setGroupStatus(appId, false);
    }

    // Getters
    function _isEntitled(
        address module,
        address client,
        bytes32 permission
    ) internal view returns (bool) {
        App memory app = _getApp(module);
        address[] memory clients = app.clients;
        bytes32[] memory permissions = app.permissions;

        // has to be both in the clients array and the permissions array
        bool isClient = false;
        uint256 clientsLength = clients.length;
        for (uint256 i; i < clientsLength; ++i) {
            if (clients[i] == client) {
                isClient = true;
                break;
            }
        }

        if (!isClient) return false;

        uint256 permissionsLength = permissions.length;
        for (uint256 i; i < permissionsLength; ++i) {
            if (permissions[i] == permission) {
                return true;
            }
        }

        return false;
    }

    function _getApp(address module) internal view returns (App memory app) {
        bytes32 appId = _getAppId(module);
        if (appId == EMPTY_UID) InvalidAppId.selector.revertWith();

        Attestation memory att = _getAttestation(appId);
        if (att.uid == EMPTY_UID) AppNotRegistered.selector.revertWith();
        if (att.revocationTime != 0) AppRevoked.selector.revertWith();

        (
            ,
            address owner,
            address[] memory clients,
            bytes32[] memory permissions,
            ExecutionManifest memory manifest
        ) = abi.decode(att.data, (address, address, address[], bytes32[], ExecutionManifest));

        app = App({
            appId: att.uid,
            module: module,
            owner: owner,
            clients: clients,
            permissions: permissions,
            manifest: manifest
        });
    }

    function _getLatestApp(address module) internal view returns (App memory app) {
        Attestation memory att = _getLatestAttestation(module);

        if (att.uid == EMPTY_UID) InvalidAppId.selector.revertWith();
        if (att.revocationTime != 0) AppRevoked.selector.revertWith();

        (
            ,
            address owner,
            address[] memory clients,
            bytes32[] memory permissions,
            ExecutionManifest memory manifest
        ) = abi.decode(att.data, (address, address, address[], bytes32[], ExecutionManifest));

        app = App({
            appId: att.uid,
            module: module,
            owner: owner,
            clients: clients,
            permissions: permissions,
            manifest: manifest
        });
    }

    // Checks
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

    function _getAttestation(bytes32 appId) internal view returns (Attestation memory) {
        MembershipStorage.Layout storage ms = MembershipStorage.layout();
        address appRegistry = ms.getDependency("AppRegistry");
        return IAppRegistry(appRegistry).getAttestation(appId);
    }

    function _getLatestAttestation(address module) internal view returns (Attestation memory) {
        MembershipStorage.Layout storage ms = MembershipStorage.layout();
        address appRegistry = ms.getDependency("AppRegistry");
        bytes32 appId = IAppRegistry(appRegistry).getLatestAppId(module);

        return IAppRegistry(appRegistry).getAttestation(appId);
    }

    function _getApps() internal view returns (address[] memory) {
        return AppAccountStorage.getLayout().installedApps.values();
    }

    function _getAppId(address module) internal view returns (bytes32) {
        return AppAccountStorage.getLayout().appIdByApp[module];
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Hooks                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

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
