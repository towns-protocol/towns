// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ExecutionManifest} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";
import {ISchemaResolver} from "@ethereum-attestation-service/eas-contracts/resolver/ISchemaResolver.sol";

// libraries

// contracts

/// @title IModuleRegistry Interface
/// @notice Interface for managing module registrations and permissions
interface IModuleRegistry {
    /// @notice Get the active schema ID used for module attestations
    /// @return The schema ID
    function getModuleSchemaId() external view returns (bytes32);

    /// @notice Get the current version (attestation UID) for a module
    /// @param module The module address
    /// @return The attestation UID representing the current version
    function getModuleVersion(address module) external view returns (bytes32);

    /// @notice Get the client address for a module
    /// @param module The module address
    /// @return The list of client addresses
    function getModuleClients(address module) external view returns (address[] memory);

    /// @notice Register a new module with permissions
    /// @param module The module address to register
    /// @param owner The owner address that can update/revoke the module
    /// @param clients The list of client contract addresses that will use this module
    /// @return The attestation UID of the registered module
    function registerModule(
        address module,
        address owner,
        address[] calldata clients
    ) external returns (bytes32);

    /// @notice Update the permissions for an existing module
    /// @param module The module address to update
    /// @param permissions The new list of permission IDs
    /// @return The new attestation UID after updating permissions
    function updateModulePermissions(
        address module,
        bytes32[] calldata permissions
    ) external returns (bytes32);

    /// @notice Revoke a module's registration
    /// @param module The module address to revoke
    /// @return The attestation UID that was revoked
    function revokeModule(address module) external returns (bytes32);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Admin                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    /// @notice Set the schema ID used for module attestations
    /// @param schemaId The new schema ID
    function adminRegisterModuleSchema(bytes32 schemaId) external;

    /// @notice Ban a module from the registry
    /// @param module The module address to ban
    /// @return The attestation UID that was banned
    function adminBanModule(address module) external returns (bytes32);
}
