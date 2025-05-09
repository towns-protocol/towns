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

contract AppRegistryFacet is IAppRegistry, AppRegistryBase, OwnableBase, ReentrancyGuard, Facet {
    function __AppRegistry_init(
        string calldata schema,
        ISchemaResolver resolver
    ) external onlyInitializing {
        __AppRegistry_init_unchained(schema, resolver);
    }

    /// @notice Get the schema structure used for registering modules
    /// @return The schema structure
    function getAppSchema() external view returns (string memory) {
        return _getSchema(_getSchema()).schema;
    }

    /// @notice Get the active schema ID used for app attestations
    /// @return The schema ID
    function getAppSchemaId() external view returns (bytes32) {
        return _getSchema();
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           App Functions                 */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

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
    /// @return The version ID that was removed
    function removeApp(bytes32 versionId) external nonReentrant returns (bytes32) {
        (, bytes32 version) = _removeApp(msg.sender, versionId);
        return version;
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
    ) external onlyOwner returns (bytes32) {
        bytes32 schemaId = _registerSchema(schema, resolver, revocable);
        _setSchema(schemaId);
        return schemaId;
    }

    /// @notice Ban a app from the registry
    /// @param app The app address to ban
    /// @dev Only the owner can ban a app
    /// @return The attestation UID that was banned
    function adminBanApp(address app) external onlyOwner returns (bytes32) {
        return _banApp(app);
    }
}
