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
import {IAppAccount} from "../../../spaces/facets/account/IAppAccount.sol";
import {IERC173} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";

// libraries
import {CustomRevert} from "src/utils/libraries/CustomRevert.sol";
import {BasisPoints} from "src/utils/libraries/BasisPoints.sol";
import {AppRegistryStorage} from "./AppRegistryStorage.sol";
import {LibClone} from "solady/utils/LibClone.sol";
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";
import {CurrencyTransfer} from "src/utils/libraries/CurrencyTransfer.sol";

// types
import {ExecutionManifest} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";
import {Attestation, EMPTY_UID} from "@ethereum-attestation-service/eas-contracts/Common.sol";
import {AttestationRequest, RevocationRequestData} from "@ethereum-attestation-service/eas-contracts/IEAS.sol";

// contracts
import {SchemaBase} from "../schema/SchemaBase.sol";
import {AttestationBase} from "../attest/AttestationBase.sol";

abstract contract AppRegistryBase is IAppRegistryBase, SchemaBase, AttestationBase {
    using CustomRevert for bytes4;

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
    /// @return The latest version ID, or EMPTY_UID if the app is banned
    function _getLatestAppId(address app) internal view returns (bytes32) {
        AppRegistryStorage.AppInfo storage appInfo = AppRegistryStorage.getLayout().apps[app];
        if (appInfo.isBanned) return EMPTY_UID;
        return appInfo.latestVersion;
    }

    function _getAppPrice(address app) internal view returns (uint256 price) {
        uint256 installPrice = ITownsApp(app).installPrice();
        (price, ) = _getTotalRequiredPayment(installPrice);
    }

    function _getAppById(bytes32 appId) internal view returns (App memory app) {
        Attestation memory att = _getAttestation(appId);
        if (att.uid == EMPTY_UID) return app;

        (
            address module,
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

    /// @notice Checks if a app is banned
    /// @param app The address of the app to check
    /// @return True if the app is banned, false otherwise
    function _isBanned(address app) internal view returns (bool) {
        return AppRegistryStorage.getLayout().apps[app].isBanned;
    }

    function _createApp(AppParams calldata params) internal returns (address app, bytes32 version) {
        if (bytes(params.name).length == 0) revert InvalidAppName();
        if (params.permissions.length == 0) revert InvalidArrayInput();
        if (params.clients.length == 0) revert InvalidArrayInput();

        _validatePricing(params.installPrice);

        app = LibClone.deployERC1967BeaconProxy(address(this));
        ISimpleApp(app).initialize(
            msg.sender,
            params.name,
            params.permissions,
            params.installPrice,
            params.accessDuration
        );

        version = _registerApp(app, params.clients);

        emit AppCreated(app, version);
    }

    /// @notice Registers a new app in the registry
    /// @param app The address of the app to register
    /// @param clients Array of client addresses that can use the app
    /// @return version The version ID of the registered app
    /// @dev Reverts if app is banned, inputs are invalid, or caller is not the owner
    function _registerApp(
        address app,
        address[] memory clients
    ) internal returns (bytes32 version) {
        _verifyAddAppInputs(app, clients);

        AppRegistryStorage.AppInfo storage appInfo = AppRegistryStorage.getLayout().apps[app];

        if (appInfo.isBanned) BannedApp.selector.revertWith();

        ITownsApp appContract = ITownsApp(app);

        uint256 installPrice = appContract.installPrice();
        _validatePricing(installPrice);

        bytes32[] memory permissions = appContract.requiredPermissions();
        ExecutionManifest memory manifest = appContract.executionManifest();

        if (permissions.length == 0) InvalidArrayInput.selector.revertWith();

        address owner = ITownsApp(app).moduleOwner();

        AttestationRequest memory request;
        request.schema = _getSchemaId();
        request.data.recipient = app;
        request.data.revocable = true;
        request.data.refUID = appInfo.latestVersion;
        request.data.data = abi.encode(app, owner, clients, permissions, manifest);
        version = _attest(msg.sender, msg.value, request).uid;

        appInfo.latestVersion = version;
        appInfo.app = app;

        emit AppRegistered(app, version);

        return version;
    }

    /// @notice Removes a app from the registry
    /// @param revoker The address revoking the app
    /// @param appId The version ID of the app to remove
    /// @return app The address of the removed app
    /// @return version The version ID that was removed
    /// @dev Reverts if app is not registered, revoked, or banned
    /// @dev Spaces that install this app will need to uninstall it
    function _removeApp(
        address revoker,
        bytes32 appId
    ) internal returns (address app, bytes32 version) {
        if (appId == EMPTY_UID) InvalidAppId.selector.revertWith();

        Attestation memory att = _getAttestation(appId);

        if (att.uid == EMPTY_UID) AppNotRegistered.selector.revertWith();
        if (att.revocationTime > 0) AppRevoked.selector.revertWith();
        (app, , , , ) = abi.decode(
            att.data,
            (address, address, address[], bytes32[], ExecutionManifest)
        );

        AppRegistryStorage.AppInfo storage appInfo = AppRegistryStorage.getLayout().apps[app];

        if (appInfo.isBanned) BannedApp.selector.revertWith();

        RevocationRequestData memory request;
        request.uid = appId;
        _revoke(att.schema, request, revoker, 0, true);

        version = appInfo.latestVersion;

        emit AppUnregistered(app, appId);
    }

    /// @notice Installs an app
    /// @param app The address of the app to install
    /// @param account The address of the account to install the app to
    /// @param data The data to pass to the app's onInstall function
    /// @dev Reverts if app is not registered or if the account is not a valid account
    function _installApp(address app, address account, bytes calldata data) internal {
        bytes32 appId = _getLatestAppId(app);
        if (appId == EMPTY_UID) AppNotRegistered.selector.revertWith();

        Attestation memory att = _getAttestation(appId);
        if (att.revocationTime > 0) AppRevoked.selector.revertWith();

        // Pricing logic
        uint256 installPrice = ITownsApp(app).installPrice();
        address recipient = ITownsApp(app).moduleOwner();

        _chargeForInstall(msg.sender, recipient, installPrice);

        IAppAccount(account).installApp(appId, data);

        emit AppInstalled(app, account, appId);
    }

    function _uninstallApp(address app, address account, bytes calldata data) internal {
        bytes32 appId = IAppAccount(account).getAppId(app);
        if (appId == EMPTY_UID) AppNotRegistered.selector.revertWith();

        IAppAccount(account).uninstallApp(appId, data);
        emit AppUninstalled(app, account, appId);
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

    function _chargeForInstall(address payer, address recipient, uint256 installPrice) internal {
        (uint256 totalRequired, uint256 protocolFee) = _getTotalRequiredPayment(installPrice);

        if (msg.value < totalRequired) InsufficientPayment.selector.revertWith();

        address feeRecipient = _getPlatformRequirements().getFeeRecipient();

        // Handle protocol fee first - this is always charged
        CurrencyTransfer.transferCurrency(
            CurrencyTransfer.NATIVE_TOKEN,
            msg.sender,
            feeRecipient,
            protocolFee
        );

        // Handle developer payment
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

    /// @notice Bans a app from the registry
    /// @param app The address of the app to ban
    /// @return version The version ID of the banned app
    /// @dev Reverts if app is not registered, already banned, or revoked
    function _banApp(address app) internal returns (bytes32 version) {
        if (app == address(0)) AppNotRegistered.selector.revertWith();

        AppRegistryStorage.AppInfo storage appInfo = AppRegistryStorage.getLayout().apps[app];

        if (appInfo.app == address(0)) AppNotRegistered.selector.revertWith();
        if (appInfo.isBanned) BannedApp.selector.revertWith();

        Attestation memory att = _getAttestation(appInfo.latestVersion);

        if (att.revocationTime > 0) AppRevoked.selector.revertWith();

        RevocationRequestData memory request;
        request.uid = appInfo.latestVersion;

        _revoke(att.schema, request, att.attester, 0, true);
        appInfo.isBanned = true;

        emit AppBanned(app, appInfo.latestVersion);

        return appInfo.latestVersion;
    }

    function _validatePricing(uint256 price) internal view {
        IPlatformRequirements reqs = _getPlatformRequirements();
        uint256 minPlatformFee = reqs.getMembershipFee();
        if (price > 0 && price < minPlatformFee) revert InvalidPrice();
    }

    /// @notice Verifies inputs for adding a new app
    /// @param app The app address to verify
    /// @param clients Array of client addresses to verify
    /// @dev Reverts if any input is invalid or app doesn't implement required interfaces
    function _verifyAddAppInputs(address app, address[] memory clients) internal view {
        if (app == address(0)) InvalidAddressInput.selector.revertWith();
        if (clients.length == 0) InvalidArrayInput.selector.revertWith();

        for (uint256 i = 0; i < clients.length; i++) {
            if (clients[i] == address(0)) InvalidAddressInput.selector.revertWith();
        }

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
