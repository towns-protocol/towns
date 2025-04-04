// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {DataTypes} from "./DataTypes.sol";
import {ISchemaRegistry} from "./interfaces/ISchemaRegistry.sol";
import {ISchemaResolver} from "./interfaces/ISchemaResolver.sol";
import {SchemaLib} from "./libraries/SchemaLib.sol";

contract SchemaRegistry is ISchemaRegistry {
    function __SchemaRegistry_init() external {}

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
