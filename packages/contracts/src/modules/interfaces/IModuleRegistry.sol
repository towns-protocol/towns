// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ISchemaResolver} from "@ethereum-attestation-service/eas-contracts/resolver/ISchemaResolver.sol";

// libraries
import {Attestation} from "@ethereum-attestation-service/eas-contracts/Common.sol";

// contracts

interface IModuleRegistryBase {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           ERRORS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    error ModuleAlreadyRegistered();
    error ModuleNotRegistered();
    error ModuleRevoked();
    error NotModuleOwner();
    error ModuleDoesNotImplementInterface();
    error InvalidAddressInput();
    error InvalidArrayInput();
    error BannedModule();
    error InvalidModuleId();

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           EVENTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    event ModuleRegistered(address indexed module, bytes32 uid);
    event ModuleUnregistered(address indexed module, bytes32 uid);
    event ModuleUpdated(address indexed module, bytes32 uid);
    event ModuleBanned(address indexed module, bytes32 uid);
    event ModuleSchemaSet(bytes32 uid);
}

/// @title IModuleRegistry Interface
/// @notice Interface for managing module registrations and permissions
interface IModuleRegistry is IModuleRegistryBase {
    /// @notice Get the schema structure used for registering modules
    /// @return The schema structure
    function getModuleSchema() external view returns (string memory);

    /// @notice Get the active schema ID used for module attestations
    /// @return The schema ID
    function getModuleSchemaId() external view returns (bytes32);

    /// @notice Get the attestation for a module
    /// @param moduleId The module ID
    /// @return The attestation
    function getModuleById(bytes32 moduleId) external view returns (Attestation memory);

    /// @notice Get the current version (attestation UID) for a module
    /// @param module The module address
    /// @return The attestation UID representing the current version
    function getLatestModuleId(address module) external view returns (bytes32);

    /// @notice Check if a module is banned
    /// @param module The module address
    /// @return isBanned True if the module is banned, false otherwise
    function isModuleBanned(address module) external view returns (bool);

    /// @notice Register a new module with permissions
    /// @param module The module address to register
    /// @param clients The list of client contract addresses that will use this module
    /// @return moduleId The attestation UID of the registered module
    function registerModule(
        address module,
        address[] calldata clients
    ) external payable returns (bytes32 moduleId);

    /// @notice Remove a module from the registry
    /// @param moduleId The module ID to remove
    /// @return The attestation UID that was removed
    function removeModule(bytes32 moduleId) external returns (bytes32);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Admin                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    /// @notice Set the schema ID used for module registrations
    /// @param schema The new schema
    /// @return The schema ID
    function adminRegisterModuleSchema(
        string calldata schema,
        ISchemaResolver resolver,
        bool revocable
    ) external returns (bytes32);

    /// @notice Ban a module from the registry
    /// @param module The module address to ban
    /// @return The attestation UID that was banned
    function adminBanModule(address module) external returns (bytes32);
}
