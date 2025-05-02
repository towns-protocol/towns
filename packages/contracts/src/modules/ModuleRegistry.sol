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
import {ReentrancyGuard} from "@towns-protocol/diamond/src/facets/reentrancy/ReentrancyGuard.sol";

contract ModuleRegistry is IModuleRegistry, OwnableBase, ReentrancyGuard, Facet {
    using ModuleRegistryLib for ModuleRegistryLib.Layout;

    function __ModuleRegistry_init(
        string calldata schema,
        ISchemaResolver resolver
    ) external initializer {
        bytes32 schemaId = SchemaLib.registerSchema(schema, resolver, true);
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
    /// @param versionId The module ID
    /// @return attestation The attestation
    function getModuleById(
        bytes32 versionId
    ) external view returns (Attestation memory attestation) {
        return ModuleRegistryLib.getModule(versionId);
    }

    /// @notice Get the latest version ID for a module
    /// @param module The module address
    /// @return versionId The version ID of the registered module
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
    /// @param clients The list of client addresses that will make calls from this module
    /// @return versionId The version ID of the registered module
    function registerModule(
        address module,
        address[] calldata clients
    ) external payable nonReentrant returns (bytes32 versionId) {
        return ModuleRegistryLib.addModule(module, clients);
    }

    /// @notice Update the permissions for an existing module
    /// @param versionId The module ID to update
    /// @param permissions The new list of permission IDs
    /// @return newVersionId The new version ID after updating permissions
    function updateModulePermissions(
        bytes32 versionId,
        bytes32[] calldata permissions
    ) external returns (bytes32 newVersionId) {
        return ModuleRegistryLib.updatePermissions(msg.sender, versionId, permissions);
    }

    /// @notice Remove a module from the registry
    /// @param versionId The module ID to remove
    /// @dev Only the owner of the module can remove it
    /// @return The version ID that was removed
    function removeModule(bytes32 versionId) external returns (bytes32) {
        (, bytes32 version) = ModuleRegistryLib.removeModule(msg.sender, versionId);
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
