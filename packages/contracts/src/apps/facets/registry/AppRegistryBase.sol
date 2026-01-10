// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IExecutionModule} from "@erc6900/reference-implementation/interfaces/IExecutionModule.sol";
import {IModule} from "@erc6900/reference-implementation/interfaces/IModule.sol";
import {IERC165} from "@openzeppelin/contracts/interfaces/IERC165.sol";
import {ITownsApp} from "../../ITownsApp.sol";
import {IAppRegistryBase} from "./IAppRegistry.sol";
import {ISchemaResolver} from "@ethereum-attestation-service/eas-contracts/resolver/ISchemaResolver.sol";
import {IPlatformRequirements} from "../../../factory/facets/platform/requirements/IPlatformRequirements.sol";
import {IAppAccount} from "../../../spaces/facets/account/IAppAccount.sol";
import {IEntitlementsManager} from "../../../spaces/facets/entitlements/IEntitlementsManager.sol";

// libraries
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";
import {BasisPoints} from "../../../utils/libraries/BasisPoints.sol";
import {AppRegistryStorage, ClientInfo, AppInfo} from "./AppRegistryStorage.sol";
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";
import {CurrencyTransfer} from "../../../utils/libraries/CurrencyTransfer.sol";
import {LibAppRegistry} from "./LibAppRegistry.sol";

// types
import {ExecutionManifest} from "@erc6900/reference-implementation/interfaces/IExecutionModule.sol";
import {Attestation, EMPTY_UID} from "@ethereum-attestation-service/eas-contracts/Common.sol";
import {AttestationRequest, RevocationRequestData} from "@ethereum-attestation-service/eas-contracts/IEAS.sol";
import {Permissions} from "../../../spaces/facets/Permissions.sol";

// contracts
import {SchemaBase} from "../schema/SchemaBase.sol";
import {AttestationBase} from "../attest/AttestationBase.sol";

abstract contract AppRegistryBase is IAppRegistryBase, SchemaBase, AttestationBase {
    using CustomRevert for bytes4;

    /// @notice Modifier to check if the caller is allowed to interact with the app registry
    /// @dev Only the owner of the space or modular account can interact
    modifier onlyAllowed(IAppAccount account) {
        if (
            address(account) != msg.sender &&
            !IEntitlementsManager(address(account)).isEntitledToSpace(
                msg.sender,
                Permissions.ModifyAppSettings
            )
        ) {
            NotAllowed.selector.revertWith();
        }
        _;
    }

    function __AppRegistry_init_unchained(
        address spaceFactory,
        string calldata schema,
        ISchemaResolver resolver
    ) internal {
        bytes32 schemaId = _registerSchema(schema, resolver, true);
        _setSchemaId(schemaId);
        _setSpaceFactory(spaceFactory);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           FUNCTIONS                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _setSpaceFactory(address spaceFactory) internal {
        if (spaceFactory == address(0)) InvalidAddressInput.selector.revertWith();
        AppRegistryStorage.Layout storage $ = AppRegistryStorage.getLayout();
        $.spaceFactory = spaceFactory;
    }

    /// @notice Sets the schema ID for the app registry
    /// @param schemaId The schema ID to set
    function _setSchemaId(bytes32 schemaId) internal {
        AppRegistryStorage.Layout storage db = AppRegistryStorage.getLayout();
        db.schemaId = schemaId;
        emit AppSchemaSet(schemaId);
    }

    function _upgradeApp(
        ITownsApp app,
        address client,
        bytes32 versionId
    ) internal returns (bytes32 newVersionId) {
        if (versionId == EMPTY_UID) InvalidAppId.selector.revertWith();

        (
            address owner,
            bytes32[] memory permissions,
            ExecutionManifest memory manifest,
            uint48 duration
        ) = _validateApp(app, client);

        if (msg.sender != owner) NotAllowed.selector.revertWith();

        address appAddress = address(app);

        AppRegistryStorage.Layout storage $ = AppRegistryStorage.getLayout();
        AppInfo storage appInfo = $.apps[appAddress];
        if (appInfo.isBanned) BannedApp.selector.revertWith();
        if (appInfo.latestVersion != versionId) InvalidAppId.selector.revertWith();

        ClientInfo storage clientInfo = $.client[client];
        if (clientInfo.app == address(0)) ClientNotRegistered.selector.revertWith();

        App memory appData = App({
            appId: versionId,
            module: appAddress,
            owner: owner,
            client: client,
            permissions: permissions,
            manifest: manifest,
            duration: duration
        });

        newVersionId = _attestApp(appData);

        appInfo.latestVersion = newVersionId;
        emit AppUpgraded(appAddress, versionId, newVersionId);
    }

    /// @notice Registers a new app in the registry
    /// @param app The address of the app to register
    /// @param client The client address that can use the app
    /// @return version The version ID of the registered app
    /// @dev Reverts if app is banned, inputs are invalid, or caller is not the owner
    function _registerApp(ITownsApp app, address client) internal returns (bytes32 version) {
        (
            address owner,
            bytes32[] memory permissions,
            ExecutionManifest memory manifest,
            uint48 duration
        ) = _validateApp(app, client);

        address appAddress = address(app);

        AppRegistryStorage.Layout storage $ = AppRegistryStorage.getLayout();
        AppInfo storage appInfo = $.apps[appAddress];
        ClientInfo storage clientInfo = $.client[client];

        if (appInfo.isBanned) BannedApp.selector.revertWith();
        if (clientInfo.app != address(0)) ClientAlreadyRegistered.selector.revertWith();

        App memory appData = App({
            appId: EMPTY_UID,
            module: appAddress,
            owner: owner,
            client: client,
            permissions: permissions,
            manifest: manifest,
            duration: duration
        });

        version = _attestApp(appData);
        appInfo.latestVersion = version;
        appInfo.app = appAddress;
        clientInfo.app = appAddress;

        emit AppRegistered(appAddress, version);
    }

    /// @notice Removes a app from the registry
    /// @param appId The version ID of the app to remove
    /// @dev Reverts if app is not registered, revoked, or banned
    /// @dev Spaces that install this app will need to uninstall it
    function _removeApp(bytes32 appId) internal {
        if (appId == EMPTY_UID) InvalidAppId.selector.revertWith();

        Attestation memory att = _getAttestation(appId);

        if (att.uid == EMPTY_UID) AppNotRegistered.selector.revertWith();
        if (att.revocationTime > 0) AppRevoked.selector.revertWith();

        App memory appData = abi.decode(att.data, (App));
        if (appData.owner != msg.sender) NotAllowed.selector.revertWith();

        AppInfo storage appInfo = AppRegistryStorage.getLayout().apps[appData.module];

        if (appInfo.isBanned) BannedApp.selector.revertWith();

        RevocationRequestData memory request;
        request.uid = appId;
        _revoke(att.schema, request, msg.sender, 0, true);

        ClientInfo storage clientInfo = AppRegistryStorage.getLayout().client[appData.client];
        clientInfo.app = address(0);

        emit AppUnregistered(appData.module, appId);
    }

    /// @notice Installs an app to a specified account
    /// @param app The address of the app to install
    /// @param account The address of the account to install the app to
    /// @param data The data to pass to the app's onInstall function
    /// @dev Handles validation, payment, and installation process
    function _installApp(address app, address account, bytes calldata data) internal {
        bytes32 appId = _getLatestAppId(app);
        if (appId == EMPTY_UID) AppNotRegistered.selector.revertWith();
        if (_isBanned(app)) BannedApp.selector.revertWith();

        Attestation memory att = _getAttestation(appId);
        if (att.revocationTime > 0) AppRevoked.selector.revertWith();

        ITownsApp appContract = ITownsApp(app);
        uint256 installPrice = appContract.installPrice();
        _chargeForInstall(msg.sender, app, installPrice);

        IAppAccount(account).onInstallApp(appId, data);

        emit AppInstalled(app, address(account), appId);
    }

    function _uninstallApp(address app, address account, bytes calldata data) internal {
        bytes32 appId = IAppAccount(account).getAppId(app);
        if (appId == EMPTY_UID) AppNotRegistered.selector.revertWith();
        IAppAccount(account).onUninstallApp(appId, data);
        emit AppUninstalled(app, address(account), appId);
    }

    function _updateApp(address app, address space) internal {
        if (_isBanned(app)) BannedApp.selector.revertWith();

        bytes32 appId = _getLatestAppId(app);
        if (appId == EMPTY_UID) AppNotInstalled.selector.revertWith();

        Attestation memory att = _getAttestation(appId);
        if (att.uid == EMPTY_UID) AppNotRegistered.selector.revertWith();
        if (att.revocationTime > 0) AppRevoked.selector.revertWith();

        IAppAccount(space).onUpdateApp(appId, abi.encode(app));
        emit AppUpdated(app, space, appId);
    }

    function _renewApp(address app, address account, bytes calldata data) internal {
        bytes32 appId = IAppAccount(account).getAppId(app);
        if (appId == EMPTY_UID) AppNotInstalled.selector.revertWith();
        if (_isBanned(app)) BannedApp.selector.revertWith();

        Attestation memory att = _getAttestation(appId);
        if (att.uid == EMPTY_UID) AppNotRegistered.selector.revertWith();
        if (att.revocationTime > 0) AppRevoked.selector.revertWith();

        App memory appData = abi.decode(att.data, (App));

        ITownsApp appContract = ITownsApp(app);
        uint256 installPrice = appContract.installPrice();

        _chargeForInstall(msg.sender, appData.owner, installPrice);

        IAppAccount(account).onRenewApp(appId, data);

        emit AppRenewed(app, account, appId);
    }

    /// @notice Charges for app installation including protocol fees and developer payment
    /// @param payer The address paying for the installation
    /// @param recipient The address receiving the developer payment
    /// @param installPrice The base price of the app
    /// @dev Handles protocol fee, developer payment, and excess refund
    function _chargeForInstall(address payer, address recipient, uint256 installPrice) internal {
        (uint256 totalRequired, uint256 protocolFee) = _getTotalRequiredPayment(installPrice);

        if (totalRequired == 0 && msg.value != 0) UnexpectedETH.selector.revertWith();
        if (totalRequired == 0) return;

        if (msg.value < totalRequired) InsufficientPayment.selector.revertWith();

        // Cache platform requirements to avoid multiple storage reads
        IPlatformRequirements platform = _getPlatformRequirements();
        address feeRecipient = platform.getFeeRecipient();

        // Handle protocol fee first - this is always charged
        CurrencyTransfer.transferCurrency(
            CurrencyTransfer.NATIVE_TOKEN,
            payer,
            feeRecipient,
            protocolFee
        );

        // Transfer developer payment if applicable
        if (totalRequired > protocolFee) {
            uint256 ownerProceeds = totalRequired - protocolFee;
            CurrencyTransfer.transferCurrency(
                CurrencyTransfer.NATIVE_TOKEN,
                payer,
                recipient,
                ownerProceeds
            );
        }

        // Refund excess payment if any
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

    /// @notice Bans a app from the registry
    /// @param app The address of the app to ban
    /// @return version The version ID of the banned app
    /// @dev Reverts if app is not registered, already banned, or revoked
    function _banApp(address app) internal returns (bytes32 version) {
        if (app == address(0)) AppNotRegistered.selector.revertWith();

        AppInfo storage appInfo = AppRegistryStorage.getLayout().apps[app];

        if (appInfo.app == address(0)) AppNotRegistered.selector.revertWith();
        if (appInfo.isBanned) BannedApp.selector.revertWith();

        appInfo.isBanned = true;

        emit AppBanned(app, appInfo.latestVersion);

        return appInfo.latestVersion;
    }

    function _attestApp(App memory appData) internal returns (bytes32 newVersionId) {
        AttestationRequest memory request;
        request.schema = _getSchemaId();
        request.data.recipient = appData.module;
        request.data.revocable = true;
        request.data.refUID = appData.appId;
        request.data.data = abi.encode(appData);
        newVersionId = _attest(msg.sender, msg.value, request).uid;
    }

    /// @notice Retrieves the current schema ID
    /// @return The current schema ID
    function _getSchemaId() internal view returns (bytes32) {
        return AppRegistryStorage.getLayout().schemaId;
    }

    /// @notice Gets the latest version ID for a app
    /// @param app The address of the app
    /// @return The latest version ID
    function _getLatestAppId(address app) internal view returns (bytes32) {
        AppInfo storage appInfo = AppRegistryStorage.getLayout().apps[app];
        return appInfo.latestVersion;
    }

    /// @notice Checks if an app is banned
    /// @param app The address of the app to check
    /// @return True if the app is banned, false otherwise
    function _isBanned(address app) internal view returns (bool) {
        return AppRegistryStorage.getLayout().apps[app].isBanned;
    }

    function _getAppPrice(address app) internal view returns (uint256 price) {
        try ITownsApp(app).installPrice() returns (uint256 installPrice) {
            (price, ) = _getTotalRequiredPayment(installPrice);
        } catch {
            (price, ) = _getTotalRequiredPayment(0);
        }
    }

    function _getAppDuration(address app) internal view returns (uint48 duration) {
        try ITownsApp(app).accessDuration() returns (uint48 accessDuration) {
            duration = LibAppRegistry.validateDuration(accessDuration);
        } catch {
            duration = LibAppRegistry.validateDuration(0);
        }
        return duration;
    }

    /// @notice Retrieves detailed information about an app by its ID
    /// @param appId The unique identifier of the app
    /// @return appData A struct containing all app information including module, owner, clients, permissions, and manifest
    /// @dev Returns an empty app struct if the appId is not found
    function _getAppById(bytes32 appId) internal view returns (App memory appData) {
        Attestation memory att = _getAttestation(appId);
        if (att.uid == EMPTY_UID) return appData;
        appData = abi.decode(att.data, (App));
        appData.appId = att.uid;
    }

    /// @notice Retrieves the app address associated with a client
    /// @param client The client address
    /// @return The app address associated with the client
    function _getAppByClient(address client) internal view returns (address) {
        return AppRegistryStorage.getLayout().client[client].app;
    }

    function _getProtocolFee(uint256 installPrice) internal view returns (uint256) {
        IPlatformRequirements platform = _getPlatformRequirements();
        uint256 baseFee = platform.getMembershipFee();
        if (installPrice == 0) return baseFee;
        uint256 bpsFee = BasisPoints.calculate(installPrice, platform.getMembershipBps());
        return FixedPointMathLib.max(bpsFee, baseFee);
    }

    function _getTotalRequiredPayment(
        uint256 installPrice
    ) internal view returns (uint256 totalRequired, uint256 protocolFee) {
        protocolFee = _getProtocolFee(installPrice);
        if (installPrice == 0) return (0, protocolFee);
        return (installPrice + protocolFee, protocolFee);
    }

    /// @notice Validates inputs for adding a new app
    /// @param appContract The app contract to verify
    /// @param client The client address to verify
    /// @dev Reverts if any input is invalid or app doesn't implement required interfaces
    /// @return owner The owner of the app
    /// @return permissions The permissions of the app
    /// @return manifest The manifest of the app
    /// @return duration The duration of the app
    function _validateApp(
        ITownsApp appContract,
        address client
    ) internal view returns (address, bytes32[] memory, ExecutionManifest memory, uint48) {
        address appAddress = address(appContract);
        if (appAddress == address(0)) InvalidAddressInput.selector.revertWith();
        if (client == address(0)) InvalidAddressInput.selector.revertWith();

        (
            uint256 installPrice,
            uint48 accessDuration,
            bytes32[] memory permissions,
            address owner,
            ExecutionManifest memory manifest
        ) = (
                appContract.installPrice(),
                appContract.accessDuration(),
                appContract.requiredPermissions(),
                appContract.moduleOwner(),
                appContract.executionManifest()
            );

        if (permissions.length == 0) InvalidArrayInput.selector.revertWith();
        if (owner == address(0)) InvalidAddressInput.selector.revertWith();

        installPrice = LibAppRegistry.validatePricing(_getPlatformRequirements(), installPrice);
        accessDuration = LibAppRegistry.validateDuration(accessDuration);

        if (
            !IERC165(appAddress).supportsInterface(type(IModule).interfaceId) ||
            !IERC165(appAddress).supportsInterface(type(IExecutionModule).interfaceId) ||
            !IERC165(appAddress).supportsInterface(type(ITownsApp).interfaceId)
        ) {
            AppDoesNotImplementInterface.selector.revertWith();
        }

        return (owner, permissions, manifest, accessDuration);
    }

    function _getPlatformRequirements() internal view returns (IPlatformRequirements) {
        return IPlatformRequirements(AppRegistryStorage.getLayout().spaceFactory);
    }
}
