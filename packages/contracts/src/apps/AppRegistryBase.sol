// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC6900ExecutionModule} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";
import {IERC6900Module} from "@erc6900/reference-implementation/interfaces/IERC6900Module.sol";
import {IERC165} from "@openzeppelin/contracts/interfaces/IERC165.sol";
import {ITownsApp} from "./interfaces/ITownsApp.sol";
import {IERC173} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";
import {IAppRegistryBase} from "./IAppRegistry.sol";

// libraries
import {CustomRevert} from "../utils/libraries/CustomRevert.sol";
import {AttestationLib} from "./libraries/AttestationLib.sol";
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";
import {AppRegistryStorage} from "./AppRegistryStorage.sol";

// types
import {ExecutionManifest} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";
import {Attestation, EMPTY_UID} from "@ethereum-attestation-service/eas-contracts/Common.sol";
import {AttestationRequest, RevocationRequestData} from "@ethereum-attestation-service/eas-contracts/IEAS.sol";

// contracts

abstract contract AppRegistryBase is IAppRegistryBase {
    using CustomRevert for bytes4;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           FUNCTIONS                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Sets the schema ID for the app registry
    /// @param schemaId The schema ID to set
    function _setSchema(bytes32 schemaId) internal {
        AppRegistryStorage.Layout storage db = AppRegistryStorage.getLayout();
        db.schemaId = schemaId;
        emit AppSchemaSet(schemaId);
    }

    /// @notice Retrieves the current schema ID
    /// @return The current schema ID
    function _getSchema() internal view returns (bytes32) {
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

    /// @notice Retrieves app attestation data by version ID
    /// @param appId The version ID of the app
    /// @return attestation The attestation data for the app
    /// @dev Reverts if app is not registered, revoked, or banned
    function _getApp(bytes32 appId) internal view returns (Attestation memory attestation) {
        Attestation memory att = AttestationLib.getAttestation(appId);
        if (att.uid == EMPTY_UID) AppNotRegistered.selector.revertWith();
        if (att.revocationTime > 0) AppRevoked.selector.revertWith();
        (address app, , , , ) = abi.decode(
            att.data,
            (address, address, address[], bytes32[], ExecutionManifest)
        );
        if (_isBanned(app)) BannedApp.selector.revertWith();
        return att;
    }

    /// @notice Checks if a app is banned
    /// @param app The address of the app to check
    /// @return True if the app is banned, false otherwise
    function _isBanned(address app) internal view returns (bool) {
        return AppRegistryStorage.getLayout().apps[app].isBanned;
    }

    /// @notice Registers a new app in the registry
    /// @param app The address of the app to register
    /// @param clients Array of client addresses that can use the app
    /// @return version The version ID of the registered app
    /// @dev Reverts if app is banned, inputs are invalid, or caller is not the owner
    function _registerApp(
        address app,
        address[] calldata clients
    ) internal returns (bytes32 version) {
        _verifyAddAppInputs(app, clients);

        AppRegistryStorage.AppInfo storage appInfo = AppRegistryStorage.getLayout().apps[app];

        if (appInfo.isBanned) BannedApp.selector.revertWith();

        address owner = ITownsApp(app).owner();
        if (msg.sender != owner) NotAppOwner.selector.revertWith();

        bytes32[] memory permissions = ITownsApp(app).requiredPermissions();
        ExecutionManifest memory manifest = ITownsApp(app).executionManifest();

        if (permissions.length == 0) InvalidArrayInput.selector.revertWith();

        AttestationRequest memory request;
        request.schema = _getSchema();
        request.data.recipient = app;
        request.data.revocable = true;
        request.data.refUID = appInfo.latestVersion;
        request.data.data = abi.encode(app, owner, clients, permissions, manifest);
        version = AttestationLib.attest(msg.sender, msg.value, request).uid;

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
    function _removeApp(
        address revoker,
        bytes32 appId
    ) internal returns (address app, bytes32 version) {
        if (appId == EMPTY_UID) InvalidAppId.selector.revertWith();

        Attestation memory att = AttestationLib.getAttestation(appId);

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
        AttestationLib.revoke(att.schema, request, revoker, 0, true);

        version = appInfo.latestVersion;
        if (version == appId) {
            appInfo.latestVersion = EMPTY_UID;
        }

        emit AppUnregistered(app, appId);

        return (app, version);
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

        Attestation memory att = AttestationLib.getAttestation(appInfo.latestVersion);

        if (att.revocationTime > 0) AppRevoked.selector.revertWith();

        RevocationRequestData memory request;
        request.uid = appInfo.latestVersion;

        AttestationLib.revoke(att.schema, request, att.attester, 0, true);
        appInfo.isBanned = true;

        emit AppBanned(app, appInfo.latestVersion);

        return appInfo.latestVersion;
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
            !IERC165(app).supportsInterface(type(ITownsApp).interfaceId) ||
            !IERC165(app).supportsInterface(type(IERC173).interfaceId)
        ) {
            AppDoesNotImplementInterface.selector.revertWith();
        }
    }
}
