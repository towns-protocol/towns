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

// libraries
import {MembershipStorage} from "src/spaces/facets/membership/MembershipStorage.sol";
import {CustomRevert} from "src/utils/libraries/CustomRevert.sol";
import {DependencyLib} from "../DependencyLib.sol";
import {LibCall} from "solady/utils/LibCall.sol";
import {AppAccountStorage} from "./AppAccountStorage.sol";
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";
import {BasisPoints} from "../../../utils/libraries/BasisPoints.sol";
import {CurrencyTransfer} from "../../../utils/libraries/CurrencyTransfer.sol";
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";

// contracts
import {ExecutorBase} from "../executor/ExecutorBase.sol";
import {TokenOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/token/TokenOwnableBase.sol";

// types
import {ExecutionManifest, ManifestExecutionFunction} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";
import {Attestation, EMPTY_UID} from "@ethereum-attestation-service/eas-contracts/Common.sol";

abstract contract AppAccountBase is IAppAccountBase, TokenOwnableBase, ExecutorBase {
    using CustomRevert for bytes4;
    using DependencyLib for MembershipStorage.Layout;
    using EnumerableSetLib for EnumerableSetLib.AddressSet;

    // Constants for dependency names
    bytes32 private constant RIVER_AIRDROP = bytes32("RiverAirdrop");
    bytes32 private constant SPACE_OPERATOR = bytes32("SpaceOperator"); // BaseRegistry
    bytes32 private constant SPACE_OWNER = bytes32("Space Owner");
    bytes32 private constant APP_REGISTRY = bytes32("AppRegistry");

    // External Functions
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

        // set the group status to active
        _chargeForInstall(msg.sender, app.owner, app.installPrice);
        _setGroupStatusWithExpiration(app.appId, true, app.accessDuration);
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

    function _chargeForInstall(address payer, address recipient, uint256 installPrice) internal {
        if (recipient == address(0)) InvalidRecipient.selector.revertWith();

        // Get the protocol fee - will be at least the membership fee
        uint256 protocolFee = _getProtocolFee(installPrice);

        // For free apps, we only need to cover protocol fee
        uint256 totalRequired = _getTotalPrice(protocolFee, installPrice);
        if (msg.value < totalRequired) revert InsufficientPayment();

        // Handle protocol fee first - this is always charged
        CurrencyTransfer.transferCurrency(
            CurrencyTransfer.NATIVE_TOKEN,
            payer,
            _getPlatformRequirements().getFeeRecipient(),
            protocolFee
        );

        // Handle recipient payment
        uint256 ownerProceeds = installPrice == 0 ? 0 : totalRequired - protocolFee;
        if (ownerProceeds > 0) {
            CurrencyTransfer.transferCurrency(
                CurrencyTransfer.NATIVE_TOKEN,
                payer,
                recipient,
                ownerProceeds
            );
        }

        // Refund excess
        uint256 excess = msg.value - totalRequired;
        if (excess > 0) {
            CurrencyTransfer.transferCurrency(
                CurrencyTransfer.NATIVE_TOKEN,
                address(this),
                payer,
                excess
            );
        }
    }

    function _enableApp(address app) internal {
        bytes32 appId = _getAppId(app);
        if (appId == EMPTY_UID) AppNotRegistered.selector.revertWith();
        _setGroupStatus(appId, true);
    }

    function _disableApp(address app) internal {
        bytes32 appId = _getAppId(app);
        if (appId == EMPTY_UID) AppNotRegistered.selector.revertWith();
        _setGroupStatus(appId, false);
    }

    // Internal View Functions
    function _getProtocolFee(uint256 installPrice) internal view returns (uint256) {
        IPlatformRequirements platform = _getPlatformRequirements();
        uint256 baseFee = platform.getMembershipFee();
        if (installPrice == 0) return baseFee;
        uint256 bpsFee = BasisPoints.calculate(installPrice, platform.getMembershipBps());
        return FixedPointMathLib.max(bpsFee, baseFee);
    }

    function _getTotalPrice(
        uint256 protocolFee,
        uint256 installPrice
    ) internal pure returns (uint256) {
        if (installPrice == 0) return protocolFee;
        return installPrice + protocolFee;
    }

    function _getTotalRequiredPayment(address app) internal view returns (uint256 totalRequired) {
        uint256 installPrice = ITownsApp(app).installPrice();
        uint256 protocolFee = _getProtocolFee(installPrice);
        return _getTotalPrice(protocolFee, installPrice);
    }

    function _isEntitled(
        address module,
        address client,
        bytes32 permission
    ) internal view returns (bool) {
        bytes32 appId = _getAppId(module);
        if (appId == EMPTY_UID) return false;

        App memory app = _getAppFromAttestation(module, _getAttestation(appId));

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
        return _getAppFromAttestation(module, _getAttestation(appId));
    }

    function _getLatestApp(address module) internal view returns (App memory app) {
        return _getAppFromAttestation(module, _getLatestAttestation(module));
    }

    function _getAppFromAttestation(
        address module,
        Attestation memory att
    ) private view returns (App memory app) {
        if (att.uid == EMPTY_UID) InvalidAppId.selector.revertWith();
        if (att.revocationTime != 0) AppRevoked.selector.revertWith();

        (
            ,
            address owner,
            address[] memory clients,
            bytes32[] memory permissions,
            ExecutionManifest memory manifest
        ) = abi.decode(att.data, (address, address, address[], bytes32[], ExecutionManifest));

        uint256 installPrice = ITownsApp(module).installPrice();
        uint64 accessDuration = ITownsApp(module).accessDuration();

        app = App({
            appId: att.uid,
            module: module,
            owner: owner,
            clients: clients,
            permissions: permissions,
            manifest: manifest,
            installPrice: installPrice,
            accessDuration: accessDuration
        });
    }

    function _getPlatformRequirements() private view returns (IPlatformRequirements) {
        MembershipStorage.Layout storage ms = MembershipStorage.layout();
        return IPlatformRequirements(ms.spaceFactory);
    }

    function _getAppRegistry() private view returns (IAppRegistry) {
        MembershipStorage.Layout storage ms = MembershipStorage.layout();
        return IAppRegistry(ms.getDependency("AppRegistry"));
    }

    function _getAttestation(bytes32 appId) internal view returns (Attestation memory) {
        return _getAppRegistry().getAttestation(appId);
    }

    function _getLatestAttestation(address module) internal view returns (Attestation memory) {
        IAppRegistry registry = _getAppRegistry();
        bytes32 appId = registry.getLatestAppId(module);
        return registry.getAttestation(appId);
    }

    function _getApps() internal view returns (address[] memory) {
        return AppAccountStorage.getLayout().installedApps.values();
    }

    function _getAppId(address module) internal view returns (bytes32) {
        return AppAccountStorage.getLayout().appIdByApp[module];
    }

    function _getClients(address app) internal view returns (address[] memory) {
        bytes32 appId = _getAppId(app);
        if (appId == EMPTY_UID) InvalidAppId.selector.revertWith();
        return _getAppFromAttestation(app, _getAttestation(appId)).clients;
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
