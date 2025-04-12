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

    function __ModuleRegistry_init() external initializer {}

    /// @notice Get the schema structure used for registering modules
    /// @return The schema structure
    function getModuleSchema() external pure returns (string memory) {
        return
            "address module, address client, address owner, bytes32[] permissions, ExecutionManifest manifest";
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
    /// @param module The module address
    /// @return att The attestation
    function getModule(address module) external view returns (Attestation memory att) {
        return ModuleRegistryLib.getModule(module);
    }

    /// @notice Get the current version (attestation UID) for a module
    /// @param module The module address
    /// @return The attestation UID representing the current version
    function getModuleVersion(address module) external view returns (bytes32) {
        return ModuleRegistryLib.getModuleVersion(module);
    }

    /// @notice Register a new module with permissions
    /// @param module The module address to register
    /// @param owner The owner address that can update/revoke the module
    /// @param clients The list of client contract addresses that will use this module
    /// @return The attestation UID of the registered module
    function registerModule(
        address module,
        address owner,
        address[] calldata clients
    ) external returns (bytes32) {
        return ModuleRegistryLib.addModule(module, owner, clients);
    }

    /// @notice Update the permissions for an existing module
    /// @param module The module address to update
    /// @param permissions The new list of permission IDs
    /// @return The new attestation UID after updating permissions
    function updateModulePermissions(
        address module,
        bytes32[] calldata permissions
    ) external returns (bytes32) {
        return ModuleRegistryLib.updatePermissions(msg.sender, module, permissions);
    }

    /// @notice Revoke a module's registration
    /// @param module The module address to revoke
    /// @dev Only the registrar can revoke a module
    /// @return The attestation UID that was revoked
    function revokeModule(address module) external returns (bytes32) {
        return ModuleRegistryLib.revokeModule(msg.sender, module);
    }

    /// @notice Remove a module from the registry
    /// @param module The module address to remove
    /// @dev Only the registrar can remove a module
    /// @return The attestation UID that was removed
    function removeModule(address module) external returns (bytes32) {
        return ModuleRegistryLib.removeModule(msg.sender, module);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        DAO functions                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Set the schema ID used for module attestations
    /// @param schemaId The new schema ID
    function adminRegisterModuleSchema(bytes32 schemaId) external onlyOwner {
        ModuleRegistryLib.setSchema(schemaId);
    }

    /// @notice Ban a module from the registry
    /// @param module The module address to ban
    /// @dev Only the owner can ban a module
    function adminBanModule(address module) external onlyOwner returns (bytes32) {
        return ModuleRegistryLib.banModule(module);
    }
}
