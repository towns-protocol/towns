// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC6900ExecutionModule} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";
import {IERC6900Module} from "@erc6900/reference-implementation/interfaces/IERC6900Module.sol";
import {IERC165} from "@openzeppelin/contracts/interfaces/IERC165.sol";
import {ITownsApp} from "../../ITownsApp.sol";
import {IAppRegistryBase} from "./IAppRegistry.sol";
import {ISchemaResolver} from "@ethereum-attestation-service/eas-contracts/resolver/ISchemaResolver.sol";
import {ISimpleApp} from "../../helpers/ISimpleApp.sol";
import {IPlatformRequirements} from "../../../factory/facets/platform/requirements/IPlatformRequirements.sol";
import {IERC173} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";
import {IAppAccount} from "../../../spaces/facets/account/IAppAccount.sol";

// libraries
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";
import {BasisPoints} from "../../../utils/libraries/BasisPoints.sol";
import {AppRegistryStorage} from "./AppRegistryStorage.sol";
import {LibClone} from "solady/utils/LibClone.sol";
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";
import {CurrencyTransfer} from "../../../utils/libraries/CurrencyTransfer.sol";

// types
import {ExecutionManifest} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";
import {Attestation, EMPTY_UID} from "@ethereum-attestation-service/eas-contracts/Common.sol";
import {AttestationRequest, RevocationRequestData} from "@ethereum-attestation-service/eas-contracts/IEAS.sol";

// contracts
import {SchemaBase} from "../schema/SchemaBase.sol";
import {AttestationBase} from "../attest/AttestationBase.sol";

abstract contract AppRegistryBase is IAppRegistryBase, SchemaBase, AttestationBase {
    using CustomRevert for bytes4;

    uint48 private constant MAX_DURATION = 365 days;

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

    /// @notice Retrieves the current schema ID
    /// @return The current schema ID
    function _getSchemaId() internal view returns (bytes32) {
        return AppRegistryStorage.getLayout().schemaId;
    }

    /// @notice Gets the latest version ID for a app
    /// @param app The address of the app
    /// @return The latest version ID
    function _getLatestAppId(address app) internal view returns (bytes32) {
        AppRegistryStorage.AppInfo storage appInfo = AppRegistryStorage.getLayout().apps[app];
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
            return _validateDuration(accessDuration);
        } catch {
            return MAX_DURATION;
        }
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

    /// @notice Creates a new app with the specified parameters
    /// @param params The parameters for creating the app
    /// @return app The address of the created app
    /// @return version The version ID of the registered app
    /// @dev Validates inputs, deploys app contract, and registers it
    function _createApp(AppParams calldata params) internal returns (address app, bytes32 version) {
        // Validate basic parameters
        if (bytes(params.name).length == 0) InvalidAppName.selector.revertWith();
        if (params.permissions.length == 0) InvalidArrayInput.selector.revertWith();
        if (params.client == address(0)) InvalidAddressInput.selector.revertWith();

        uint48 duration = _validateDuration(params.accessDuration);

        app = LibClone.deployERC1967BeaconProxy(address(this));
        ISimpleApp(app).initialize(
            msg.sender,
            params.name,
            params.permissions,
            params.installPrice,
            duration
        );

        version = _registerApp(app, params.client);
        emit AppCreated(app, version);
    }

    /// @notice Registers a new app in the registry
    /// @param app The address of the app to register
    /// @param client The client address that can use the app
    /// @return version The version ID of the registered app
    /// @dev Reverts if app is banned, inputs are invalid, or caller is not the owner
    function _registerApp(address app, address client) internal returns (bytes32 version) {
        _verifyAddAppInputs(app, client);

        AppRegistryStorage.Layout storage $ = AppRegistryStorage.getLayout();
        AppRegistryStorage.AppInfo storage appInfo = $.apps[app];
        AppRegistryStorage.ClientInfo storage clientInfo = $.client[client];

        if (clientInfo.app != address(0)) ClientAlreadyRegistered.selector.revertWith();
        if (appInfo.isBanned) BannedApp.selector.revertWith();

        ITownsApp appContract = ITownsApp(app);

        uint256 installPrice = appContract.installPrice();
        _validatePricing(installPrice);

        uint48 accessDuration = appContract.accessDuration();
        uint48 duration = _validateDuration(accessDuration);

        bytes32[] memory permissions = appContract.requiredPermissions();
        if (permissions.length == 0) InvalidArrayInput.selector.revertWith();

        address owner = appContract.moduleOwner();
        if (owner == address(0)) InvalidAddressInput.selector.revertWith();

        ExecutionManifest memory manifest = appContract.executionManifest();

        App memory appData = App({
            appId: EMPTY_UID,
            module: app,
            owner: owner,
            client: client,
            permissions: permissions,
            manifest: manifest,
            duration: duration
        });

        AttestationRequest memory request;
        request.schema = _getSchemaId();
        request.data.recipient = app;
        request.data.revocable = true;
        request.data.refUID = appInfo.latestVersion;
        request.data.data = abi.encode(appData);
        version = _attest(msg.sender, msg.value, request).uid;

        appInfo.latestVersion = version;
        appInfo.app = app;
        clientInfo.app = app;

        emit AppRegistered(app, version);
    }

    /// @notice Removes a app from the registry
    /// @param revoker The address revoking the app
    /// @param appId The version ID of the app to remove
    /// @dev Reverts if app is not registered, revoked, or banned
    /// @dev Spaces that install this app will need to uninstall it
    function _removeApp(address revoker, bytes32 appId) internal {
        if (appId == EMPTY_UID) InvalidAppId.selector.revertWith();

        Attestation memory att = _getAttestation(appId);

        if (att.uid == EMPTY_UID) AppNotRegistered.selector.revertWith();
        if (att.revocationTime > 0) AppRevoked.selector.revertWith();

        App memory appData = abi.decode(att.data, (App));

        AppRegistryStorage.AppInfo storage appInfo = AppRegistryStorage.getLayout().apps[
            appData.module
        ];

        if (appInfo.isBanned) BannedApp.selector.revertWith();

        RevocationRequestData memory request;
        request.uid = appId;
        _revoke(att.schema, request, revoker, 0, true);

        AppRegistryStorage.ClientInfo storage clientInfo = AppRegistryStorage.getLayout().client[
            appData.client
        ];
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

        App memory appData = abi.decode(att.data, (App));

        ITownsApp appContract = ITownsApp(app);
        uint256 installPrice = appContract.installPrice();

        _chargeForInstall(msg.sender, appData.owner, installPrice);

        IAppAccount(account).onInstallApp(appId, data);

        emit AppInstalled(app, address(account), appId);
    }

    function _uninstallApp(address app, address account, bytes calldata data) internal {
        bytes32 appId = IAppAccount(account).getAppId(app);
        if (appId == EMPTY_UID) AppNotRegistered.selector.revertWith();
        IAppAccount(account).onUninstallApp(appId, data);
        emit AppUninstalled(app, address(account), appId);
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

    function _onlyAllowed(address account) internal view {
        if (IERC173(account).owner() != msg.sender) NotAllowed.selector.revertWith();
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
        if (installPrice == 0) return (protocolFee, protocolFee);
        return (installPrice + protocolFee, protocolFee);
    }

    /// @notice Charges for app installation including protocol fees and developer payment
    /// @param payer The address paying for the installation
    /// @param recipient The address receiving the developer payment
    /// @param installPrice The base price of the app
    /// @dev Handles protocol fee, developer payment, and excess refund
    function _chargeForInstall(address payer, address recipient, uint256 installPrice) internal {
        (uint256 totalRequired, uint256 protocolFee) = _getTotalRequiredPayment(installPrice);

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

        AppRegistryStorage.AppInfo storage appInfo = AppRegistryStorage.getLayout().apps[app];

        if (appInfo.app == address(0)) AppNotRegistered.selector.revertWith();
        if (appInfo.isBanned) BannedApp.selector.revertWith();

        appInfo.isBanned = true;

        emit AppBanned(app, appInfo.latestVersion);

        return appInfo.latestVersion;
    }

    function _validatePricing(uint256 price) internal view {
        IPlatformRequirements reqs = _getPlatformRequirements();
        uint256 minPlatformFee = reqs.getMembershipFee();
        if (price > 0 && price < minPlatformFee) InvalidPrice.selector.revertWith();
    }

    function _validateDuration(uint48 duration) internal pure returns (uint48) {
        if (duration > MAX_DURATION) InvalidDuration.selector.revertWith();
        if (duration == 0) duration = MAX_DURATION;
        return duration;
    }

    /// @notice Verifies inputs for adding a new app
    /// @param app The app address to verify
    /// @param client The client address to verify
    /// @dev Reverts if any input is invalid or app doesn't implement required interfaces
    function _verifyAddAppInputs(address app, address client) internal view {
        if (app == address(0)) InvalidAddressInput.selector.revertWith();
        if (client == address(0)) InvalidAddressInput.selector.revertWith();

        if (
            !IERC165(app).supportsInterface(type(IERC6900Module).interfaceId) ||
            !IERC165(app).supportsInterface(type(IERC6900ExecutionModule).interfaceId) ||
            !IERC165(app).supportsInterface(type(ITownsApp).interfaceId)
        ) {
            AppDoesNotImplementInterface.selector.revertWith();
        }
    }

    function _getPlatformRequirements() internal view returns (IPlatformRequirements) {
        return IPlatformRequirements(AppRegistryStorage.getLayout().spaceFactory);
    }
}
