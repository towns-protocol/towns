// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {DataTypes} from "../types/DataTypes.sol";
import {ISchemaResolver} from "./ISchemaResolver.sol";

// libraries

// contracts

interface ISchemaRegistry {
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
        returns (bytes32);

    /// @notice Get the schema record for a given schemaId
    /// @param schemaId The schemaId of the schema
    /// @return The schema record
    function getSchema(bytes32 schemaId) external view returns (DataTypes.Schema memory);
}
