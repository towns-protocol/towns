// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ISchemaRegistry} from "@ethereum-attestation-service/eas-contracts/ISchemaRegistry.sol";
import {ISchemaResolver} from "@ethereum-attestation-service/eas-contracts/resolver/ISchemaResolver.sol";

// libraries

// types
import {SchemaRecord} from "@ethereum-attestation-service/eas-contracts/ISchemaRegistry.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {OwnableBase} from "@towns-protocol/diamond/src/facets/ownable/OwnableBase.sol";
import {SchemaBase} from "./SchemaBase.sol";

/**
 * @title SchemaRegistry
 * @notice A registry for managing schema records within the diamond architecture
 * @dev Implements the ISchemaRegistry interface and integrates with the diamond pattern
 * Includes ownership controls for schema registration
 */
contract SchemaRegistry is ISchemaRegistry, SchemaBase, OwnableBase, Facet {
    /**
     * @notice Initializes the schema registry facet
     * @dev Can only be called during diamond initialization
     */
    function __SchemaRegistry_init() external onlyInitializing {}

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                     Schema Management                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /**
     * @notice Returns the full semantic version of the contract
     * @return Semver contract version as a string
     */
    function version() external pure returns (string memory) {
        return "1.0.0";
    }

    /**
     * @notice Register a new schema in the registry
     * @dev Only the owner can register schemas
     * @param schema The schema to register (e.g., "(address plugin,string pluginType,bool audited)")
     * @param resolver A contract that will validate attestations for this schema
     * @param revocable Whether attestations using this schema can be revoked
     * @return The UID of the registered schema
     */
    function register(
        string calldata schema,
        ISchemaResolver resolver,
        bool revocable
    ) external onlyOwner returns (bytes32) {
        return _registerSchema(schema, resolver, revocable);
    }

    /**
     * @notice Get the schema record for a given schema UID
     * @param uid The UID of the schema to retrieve
     * @return The complete schema record
     */
    function getSchema(bytes32 uid) external view returns (SchemaRecord memory) {
        return _getSchema(uid);
    }
}
