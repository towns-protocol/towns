// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IModuleRegistry} from "./interfaces/IModuleRegistry.sol";
import {ISchemaResolver} from "@ethereum-attestation-service/eas-contracts/resolver/ISchemaResolver.sol";

// libraries
import {ModuleRegistryLib} from "./libraries/ModuleRegistryLib.sol";
import {SchemaLib} from "./libraries/SchemaLib.sol";

// types
import {ExecutionManifest} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";
import {Attestation} from "@ethereum-attestation-service/eas-contracts/Common.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {OwnableBase} from "@towns-protocol/diamond/src/facets/ownable/OwnableBase.sol";

contract ModuleRegistry is IModuleRegistry, OwnableBase, Facet {
    using ModuleRegistryLib for ModuleRegistryLib.Layout;

    function __ModuleRegistry_init(
        string calldata schema,
        ISchemaResolver resolver,
        bool revocable
    ) external initializer {
        bytes32 schemaId = SchemaLib.registerSchema(schema, resolver, revocable);
        ModuleRegistryLib.setSchema(schemaId);
    }

    /// @notice Get the schema structure used for registering modules
    /// @return The schema structure
    function getModuleSchema() external view returns (string memory) {
        return SchemaLib.getSchema(ModuleRegistryLib.getSchema()).schema;
    }

    /// @notice Get the active schema ID used for module attestations
    /// @return The schema ID
    function getModuleSchemaId() external view returns (bytes32) {
        return ModuleRegistryLib.getSchema();
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Module Functions                 */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Get the attestation for a module
    /// @param moduleId The module ID
    /// @return attestation The attestation
    function getModuleById(
        bytes32 moduleId
    ) external view returns (Attestation memory attestation) {
        return ModuleRegistryLib.getModule(moduleId);
    }

    /// @notice Get the latest module ID for a module
    /// @param module The module address
    /// @return moduleId The attestation UID of the registered module
    function getLatestModuleId(address module) external view returns (bytes32) {
        return ModuleRegistryLib.getLatestModuleId(module);
    }

    /// @notice Check if a module is banned
    /// @param module The module address
    /// @return isBanned True if the module is banned, false otherwise
    function isModuleBanned(address module) external view returns (bool) {
        return ModuleRegistryLib.isBanned(module);
    }

    /// @notice Register a new module with permissions
    /// @param module The module address to register
    /// @param owner The owner address that can update/revoke the module
    /// @param clients The list of client contract addresses that will use this module
    /// @return moduleId The attestation UID of the registered module
    function registerModule(
        address module,
        address owner,
        address[] calldata clients
    ) external returns (bytes32 moduleId) {
        return ModuleRegistryLib.addModule(module, owner, clients);
    }

    /// @notice Update the permissions for an existing module
    /// @param moduleId The module ID to update
    /// @param permissions The new list of permission IDs
    /// @return newModuleId The new attestation UID after updating permissions
    function updateModulePermissions(
        bytes32 moduleId,
        bytes32[] calldata permissions
    ) external returns (bytes32 newModuleId) {
        return ModuleRegistryLib.updatePermissions(msg.sender, moduleId, permissions);
    }

    /// @notice Remove a module from the registry
    /// @param moduleId The module ID to remove
    /// @dev Only the registrar can remove a module
    /// @return The attestation UID that was removed
    function removeModule(bytes32 moduleId) external returns (bytes32) {
        (, bytes32 version) = ModuleRegistryLib.removeModule(msg.sender, moduleId);
        return version;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        DAO functions                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Set the schema ID used for module attestations
    /// @param schema The new schema
    function adminRegisterModuleSchema(
        string calldata schema,
        ISchemaResolver resolver,
        bool revocable
    ) external onlyOwner returns (bytes32) {
        bytes32 schemaId = SchemaLib.registerSchema(schema, resolver, revocable);
        ModuleRegistryLib.setSchema(schemaId);
        return schemaId;
    }

    /// @notice Ban a module from the registry
    /// @param module The module address to ban
    /// @dev Only the owner can ban a module
    /// @return The attestation UID that was banned
    function adminBanModule(address module) external onlyOwner returns (bytes32) {
        return ModuleRegistryLib.banModule(module);
    }
}
