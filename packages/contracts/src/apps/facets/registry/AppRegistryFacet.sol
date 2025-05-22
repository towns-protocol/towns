// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IAppRegistry} from "./IAppRegistry.sol";
import {ISchemaResolver} from "@ethereum-attestation-service/eas-contracts/resolver/ISchemaResolver.sol";

// types
import {Attestation} from "@ethereum-attestation-service/eas-contracts/Common.sol";

// contracts
import {AppRegistryBase} from "./AppRegistryBase.sol";
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {ReentrancyGuard} from "solady/utils/ReentrancyGuard.sol";
import {OwnableBase} from "@towns-protocol/diamond/src/facets/ownable/OwnableBase.sol";
import {SimpleApp} from "../../helpers/SimpleApp.sol";

// libraries
import {LibClone} from "solady/utils/LibClone.sol";

contract AppRegistryFacet is IAppRegistry, AppRegistryBase, OwnableBase, ReentrancyGuard, Facet {
    function __AppRegistry_init(
        address beacon,
        string calldata schema,
        ISchemaResolver resolver
    ) external onlyInitializing {
        __AppRegistry_init_unchained(beacon, schema, resolver);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        DAO functions                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Set the schema ID used for app attestations
    /// @param schema The new schema
    function adminRegisterAppSchema(
        string calldata schema,
        ISchemaResolver resolver,
        bool revocable
    ) external onlyOwner returns (bytes32 schemaId) {
        schemaId = _registerSchema(schema, resolver, revocable);
        _setSchemaId(schemaId);
    }

    /// @notice Ban a app from the registry
    /// @param app The app address to ban
    /// @dev Only the owner can ban a app
    /// @return The attestation UID that was banned
    function adminBanApp(address app) external onlyOwner returns (bytes32) {
        return _banApp(app);
    }

    /// @notice Register a beacon for creating upgradeable apps
    /// @param beacon The address of the beacon to register
    function adminRegisterAppBeacon(address beacon) external onlyOwner {
        _registerBeacon(beacon);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           App Functions                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Register a new app with permissions
    /// @param app The app address to register
    /// @param clients The list of client addresses that will make calls from this app
    /// @return versionId The version ID of the registered app
    function registerApp(
        address app,
        address[] calldata clients
    ) external payable nonReentrant returns (bytes32 versionId) {
        return _registerApp(app, clients);
    }

    /// @notice Remove a app from the registry
    /// @param versionId The app ID to remove
    /// @dev Only the owner of the app can remove it
    /// @return version The version ID that was removed
    function removeApp(bytes32 versionId) external nonReentrant returns (bytes32 version) {
        (, version) = _removeApp(msg.sender, versionId);
    }

    /// @notice Create an upgradeable simple app contract
    /// @param params The parameters of the app
    function createApp(
        AppParams calldata params
    ) external payable nonReentrant returns (address app, bytes32 versionId) {
        return _createApp(params);
    }

    /// @notice Get the schema structure used for registering modules
    /// @return The schema structure
    function getAppSchema() external view returns (string memory) {
        return _getSchema(_getSchemaId()).schema;
    }

    /// @notice Get the active schema ID used for app attestations
    /// @return The schema ID
    function getAppSchemaId() external view returns (bytes32) {
        return _getSchemaId();
    }

    /// @notice Get the attestation for a app
    /// @param versionId The app ID
    /// @return attestation The attestation
    function getAppById(bytes32 versionId) external view returns (Attestation memory attestation) {
        return _getApp(versionId);
    }

    /// @notice Get the latest version ID for a app
    /// @param app The app address
    /// @return versionId The version ID of the registered app
    function getLatestAppId(address app) external view returns (bytes32) {
        return _getLatestAppId(app);
    }

    /// @notice Check if a app is banned
    /// @param app The app address
    /// @return isBanned True if the app is banned, false otherwise
    function isAppBanned(address app) external view returns (bool) {
        return _isBanned(app);
    }
}
