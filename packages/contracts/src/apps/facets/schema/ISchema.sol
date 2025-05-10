// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

/**
 * @title ISchemaBase Interface
 * @notice Base interface for schema management functionality
 * @dev Defines error cases for schema operations
 */
interface ISchemaBase {
    /**
     * @dev Thrown when a schema resolver does not implement the required interface
     */
    error InvalidSchemaResolver();

    /**
     * @dev Thrown when attempting to register a schema that is already registered
     */
    error SchemaAlreadyRegistered();

    /**
     * @dev Thrown when a schema string is empty or otherwise invalid
     */
    error InvalidSchema();
}
