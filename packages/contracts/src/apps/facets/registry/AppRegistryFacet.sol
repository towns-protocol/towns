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

/**
 * @title AppRegistryFacet
 * @notice A facet for managing app registrations within the diamond architecture
 * @dev Implements the IAppRegistry interface and integrates with the diamond pattern
 * Includes reentrancy protection and ownership controls
 */
contract AppRegistryFacet is IAppRegistry, AppRegistryBase, OwnableBase, ReentrancyGuard, Facet {
    /**
     * @notice Initializes the app registry facet
     * @dev Can only be called during diamond initialization
     * @param schema The schema structure for app registrations
     * @param resolver The resolver contract for the schema
     */
    function __AppRegistry_init(
        string calldata schema,
        ISchemaResolver resolver
    ) external onlyInitializing {
        __AppRegistry_init_unchained(schema, resolver);
    }

    /**
     * @inheritdoc IAppRegistry
     */
    function getAppSchema() external view returns (string memory) {
        return _getSchema(_getSchema()).schema;
    }

    /**
     * @inheritdoc IAppRegistry
     */
    function getAppSchemaId() external view returns (bytes32) {
        return _getSchema();
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           App Functions                 */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /**
     * @inheritdoc IAppRegistry
     */
    function getAppById(bytes32 versionId) external view returns (Attestation memory attestation) {
        return _getApp(versionId);
    }

    /**
     * @inheritdoc IAppRegistry
     */
    function getLatestAppId(address app) external view returns (bytes32) {
        return _getLatestAppId(app);
    }

    /**
     * @inheritdoc IAppRegistry
     */
    function isAppBanned(address app) external view returns (bool) {
        return _isBanned(app);
    }

    /**
     * @inheritdoc IAppRegistry
     */
    function registerApp(
        address app,
        address[] calldata clients
    ) external payable nonReentrant returns (bytes32 versionId) {
        return _registerApp(app, clients);
    }

    /**
     * @inheritdoc IAppRegistry
     */
    function removeApp(bytes32 versionId) external nonReentrant returns (bytes32) {
        (, bytes32 version) = _removeApp(msg.sender, versionId);
        return version;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        DAO functions                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /**
     * @inheritdoc IAppRegistry
     */
    function adminRegisterAppSchema(
        string calldata schema,
        ISchemaResolver resolver,
        bool revocable
    ) external onlyOwner returns (bytes32) {
        bytes32 schemaId = _registerSchema(schema, resolver, revocable);
        _setSchema(schemaId);
        return schemaId;
    }

    /**
     * @inheritdoc IAppRegistry
     */
    function adminBanApp(address app) external onlyOwner returns (bytes32) {
        return _banApp(app);
    }
}
