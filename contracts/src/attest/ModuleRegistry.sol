// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IModuleRegistry} from "./interfaces/IModuleRegistry.sol";

// libraries
import {ModuleLib} from "./libraries/ModuleLib.sol";

// types
import {ExecutionManifest} from
    "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {OwnableBase} from "@towns-protocol/diamond/src/facets/ownable/OwnableBase.sol";

contract ModuleRegistry is IModuleRegistry, OwnableBase, Facet {
    using ModuleLib for ModuleLib.Layout;

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
        return ModuleLib.getSchema();
    }

    /// @notice Set the schema ID used for module attestations
    /// @param schema The new schema ID
    function setModuleSchemaId(bytes32 schema) external onlyOwner {
        ModuleLib.setSchema(schema);
    }

    /// @notice Get the current version (attestation UID) for a module
    /// @param module The module address
    /// @return The attestation UID representing the current version
    function getModuleVersion(address module) external view returns (bytes32) {
        return ModuleLib.getModuleVersion(module);
    }

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
        returns (bytes32)
    {
        return ModuleLib.addModule(module, client, owner, permissions, manifest);
    }

    /// @notice Update the permissions for an existing module
    /// @param module The module address to update
    /// @param permissions The new list of permission IDs
    /// @return The new attestation UID after updating permissions
    function updateModulePermissions(
        address module,
        bytes32[] calldata permissions
    )
        external
        returns (bytes32)
    {
        return ModuleLib.updatePermissions(module, permissions);
    }

    /// @notice Revoke a module's registration
    /// @param module The module address to revoke
    /// @dev Only the registrar can revoke a module
    /// @return The attestation UID that was revoked
    function revokeModule(address module) external returns (bytes32) {
        return ModuleLib.removeModule(module);
    }
}
