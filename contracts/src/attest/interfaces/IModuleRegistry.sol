// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ExecutionManifest} from
    "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";
import {ISchemaResolver} from
    "@ethereum-attestation-service/eas-contracts/resolver/ISchemaResolver.sol";

// libraries

// contracts

/// @title IModuleRegistry Interface
/// @notice Interface for managing module registrations and permissions
interface IModuleRegistry {
    /// @notice Get the active schema ID used for module attestations
    /// @return The schema ID
    function getModuleSchemaId() external view returns (bytes32);

    /// @notice Set the schema ID used for module attestations
    /// @param schema The new schema ID
    function registerModuleSchema(
        string calldata schema,
        ISchemaResolver resolver,
        bool revocable
    )
        external;

    /// @notice Get the current version (attestation UID) for a module
    /// @param module The module address
    /// @return The attestation UID representing the current version
    function getModuleVersion(address module) external view returns (bytes32);

    /// @notice Register a new module with permissions
    /// @param module The module address to register
    /// @param client The client contract address that will use this module
    /// @param owner The owner address that can update/revoke the module
    /// @param permissions The list of permission IDs granted to this module
    /// @return The attestation UID of the registered module
    function registerModule(
        address module,
        address client,
        address owner,
        bytes32[] calldata permissions,
        ExecutionManifest calldata manifest
    )
        external
        returns (bytes32);

    /// @notice Update the permissions for an existing module
    /// @param module The module address to update
    /// @param permissions The new list of permission IDs
    /// @return The new attestation UID after updating permissions
    function updateModulePermissions(
        address module,
        bytes32[] calldata permissions
    )
        external
        returns (bytes32);

    /// @notice Revoke a module's registration
    /// @param module The module address to revoke
    /// @return The attestation UID that was revoked
    function revokeModule(address module) external returns (bytes32);
}
