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

/// @title Schema Registry
/// @notice A registry for schema records
/// @dev This contract is used for implementation reference purposes
contract SchemaRegistry is ISchemaRegistry, SchemaBase, OwnableBase, Facet {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                     Schema Management                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Register a schema
    /// @param schema The schema to register e.g. "(address plugin,string pluginType,bool audited)"
    /// @param resolver A contract that will validate the schema whenever someone attests to it
    /// @param revocable Whether the schema is revocable
    /// @return schemaId The UID of the schema
    function register(
        string calldata schema,
        ISchemaResolver resolver,
        bool revocable
    ) external onlyOwner returns (bytes32) {
        return _registerSchema(schema, resolver, revocable);
    }

    /// @notice Get the schema record for a given schemaId
    /// @param uid The schemaId of the schema
    /// @return The schema record
    function getSchema(bytes32 uid) external view returns (SchemaRecord memory) {
        return _getSchema(uid);
    }

    /// @notice Returns the full semver contract version.
    /// @return Semver contract version as a string.
    function version() external pure returns (string memory) {
        return "1.0.0";
    }
}
