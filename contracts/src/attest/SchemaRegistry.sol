// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ISchemaRegistry} from "./interfaces/ISchemaRegistry.sol";
import {ISchemaResolver} from "./interfaces/ISchemaResolver.sol";

// libraries
import {SchemaLib} from "./libraries/SchemaLib.sol";

// types
import {DataTypes} from "./types/DataTypes.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";

contract SchemaRegistry is ISchemaRegistry, Facet {
    function __SchemaRegistry_init() external onlyInitializing {}

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
    )
        external
        returns (bytes32)
    {
        return SchemaLib.registerSchema(schema, resolver, revocable);
    }

    /// @notice Get the schema record for a given schemaId
    /// @param uid The schemaId of the schema
    /// @return The schema record
    function getSchema(bytes32 uid) external view returns (DataTypes.Schema memory) {
        return SchemaLib.getSchema(uid);
    }
}
