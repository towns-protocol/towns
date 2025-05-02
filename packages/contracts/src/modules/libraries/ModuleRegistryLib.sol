// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC6900ExecutionModule} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";
import {IERC6900Module} from "@erc6900/reference-implementation/interfaces/IERC6900Module.sol";

import {IERC165} from "@openzeppelin/contracts/interfaces/IERC165.sol";
import {ITownsApp} from "src/modules/interfaces/ITownsApp.sol";
import {IERC173} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";

// libraries
import {CustomRevert} from "../../utils/libraries/CustomRevert.sol";
import {AttestationLib} from "./AttestationLib.sol";
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";

// types
import {ExecutionManifest} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";
import {Attestation, EMPTY_UID} from "@ethereum-attestation-service/eas-contracts/Common.sol";
import {AttestationRequest, RevocationRequestData} from "@ethereum-attestation-service/eas-contracts/IEAS.sol";

// contracts

library ModuleRegistryLib {
    using CustomRevert for bytes4;
    using EnumerableSetLib for EnumerableSetLib.Bytes32Set;

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

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           STRUCTS                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    struct ModuleInfo {
        address module;
        bool isBanned;
        bytes32 latestVersion;
    }

    struct Layout {
        // Registered schema ID
        bytes32 schemaId;
        // Module => ModuleInfo
        mapping(address => ModuleInfo) modules;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           STORAGE                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    // keccak256(abi.encode(uint256(keccak256("attestations.module.registry.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0xe1abd3beb055e0136b3111c2c34ff6e869f8c0d7540225f8056528d6eb12b500;

    /// @notice Returns the storage layout for the module registry
    /// @return l The storage layout struct
    function getLayout() internal pure returns (Layout storage l) {
        assembly {
            l.slot := STORAGE_SLOT
        }
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           FUNCTIONS                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Sets the schema ID for the module registry
    /// @param schemaId The schema ID to set
    function setSchema(bytes32 schemaId) internal {
        Layout storage db = getLayout();
        db.schemaId = schemaId;
        emit ModuleSchemaSet(schemaId);
    }

    /// @notice Retrieves the current schema ID
    /// @return The current schema ID
    function getSchema() internal view returns (bytes32) {
        return getLayout().schemaId;
    }

    /// @notice Gets the latest version ID for a module
    /// @param module The address of the module
    /// @return The latest version ID, or EMPTY_UID if the module is banned
    function getLatestModuleId(address module) internal view returns (bytes32) {
        ModuleInfo storage moduleInfo = getLayout().modules[module];
        if (moduleInfo.isBanned) return EMPTY_UID;
        return moduleInfo.latestVersion;
    }

    /// @notice Retrieves module attestation data by version ID
    /// @param versionId The version ID of the module
    /// @return attestation The attestation data for the module
    /// @dev Reverts if module is not registered, revoked, or banned
    function getModule(bytes32 versionId) internal view returns (Attestation memory attestation) {
        Attestation memory att = AttestationLib.getAttestation(versionId);
        if (att.uid == EMPTY_UID) ModuleNotRegistered.selector.revertWith();
        if (att.revocationTime > 0) ModuleRevoked.selector.revertWith();
        (address module, , , , ) = abi.decode(
            att.data,
            (address, address, address[], bytes32[], ExecutionManifest)
        );
        if (isBanned(module)) BannedModule.selector.revertWith();
        return att;
    }

    /// @notice Checks if a module is banned
    /// @param module The address of the module to check
    /// @return True if the module is banned, false otherwise
    function isBanned(address module) internal view returns (bool) {
        return getLayout().modules[module].isBanned;
    }

    /// @notice Registers a new module in the registry
    /// @param module The address of the module to register
    /// @param clients Array of client addresses that can use the module
    /// @return version The version ID of the registered module
    /// @dev Reverts if module is banned, inputs are invalid, or caller is not the owner
    function addModule(
        address module,
        address[] calldata clients
    ) internal returns (bytes32 version) {
        _verifyAddModuleInputs(module, clients);

        ModuleInfo storage moduleInfo = getLayout().modules[module];

        if (moduleInfo.isBanned) BannedModule.selector.revertWith();

        address owner = ITownsApp(module).owner();
        if (msg.sender != owner) NotModuleOwner.selector.revertWith();

        bytes32[] memory permissions = ITownsApp(module).requiredPermissions();
        ExecutionManifest memory manifest = ITownsApp(module).executionManifest();

        if (permissions.length == 0) InvalidArrayInput.selector.revertWith();

        AttestationRequest memory request;
        request.schema = getSchema();
        request.data.recipient = module;
        request.data.revocable = true;
        request.data.refUID = moduleInfo.latestVersion;
        request.data.data = abi.encode(module, owner, clients, permissions, manifest);
        version = AttestationLib.attest(msg.sender, msg.value, request).uid;

        moduleInfo.latestVersion = version;
        moduleInfo.module = module;

        emit ModuleRegistered(module, version);

        return version;
    }

    /// @notice Removes a module from the registry
    /// @param revoker The address revoking the module
    /// @param versionId The version ID of the module to remove
    /// @return module The address of the removed module
    /// @return version The version ID that was removed
    /// @dev Reverts if module is not registered, revoked, or banned
    function removeModule(
        address revoker,
        bytes32 versionId
    ) internal returns (address module, bytes32 version) {
        if (versionId == EMPTY_UID) InvalidModuleId.selector.revertWith();

        Attestation memory att = AttestationLib.getAttestation(versionId);

        if (att.uid == EMPTY_UID) ModuleNotRegistered.selector.revertWith();
        if (att.revocationTime > 0) ModuleRevoked.selector.revertWith();
        (module, , , , ) = abi.decode(
            att.data,
            (address, address, address[], bytes32[], ExecutionManifest)
        );

        ModuleInfo storage moduleInfo = getLayout().modules[module];

        if (moduleInfo.isBanned) BannedModule.selector.revertWith();

        RevocationRequestData memory request;
        request.uid = versionId;
        AttestationLib.revoke(att.schema, request, revoker, 0, true);

        version = moduleInfo.latestVersion;
        if (version == versionId) {
            moduleInfo.latestVersion = EMPTY_UID;
        }

        emit ModuleUnregistered(module, versionId);

        return (module, version);
    }

    /// @notice Bans a module from the registry
    /// @param module The address of the module to ban
    /// @return version The version ID of the banned module
    /// @dev Reverts if module is not registered, already banned, or revoked
    function banModule(address module) internal returns (bytes32 version) {
        if (module == address(0)) ModuleNotRegistered.selector.revertWith();

        ModuleInfo storage moduleInfo = getLayout().modules[module];

        if (moduleInfo.module == address(0)) ModuleNotRegistered.selector.revertWith();
        if (moduleInfo.isBanned) BannedModule.selector.revertWith();

        Attestation memory att = AttestationLib.getAttestation(moduleInfo.latestVersion);

        if (att.revocationTime > 0) ModuleRevoked.selector.revertWith();

        RevocationRequestData memory request;
        request.uid = moduleInfo.latestVersion;

        AttestationLib.revoke(att.schema, request, att.attester, 0, true);
        moduleInfo.isBanned = true;

        emit ModuleBanned(module, moduleInfo.latestVersion);

        return moduleInfo.latestVersion;
    }

    /// @notice Verifies inputs for adding a new module
    /// @param module The module address to verify
    /// @param clients Array of client addresses to verify
    /// @dev Reverts if any input is invalid or module doesn't implement required interfaces
    function _verifyAddModuleInputs(address module, address[] memory clients) internal view {
        if (module == address(0)) InvalidAddressInput.selector.revertWith();
        if (clients.length == 0) InvalidArrayInput.selector.revertWith();

        for (uint256 i = 0; i < clients.length; i++) {
            if (clients[i] == address(0)) InvalidAddressInput.selector.revertWith();
        }

        if (
            !IERC165(module).supportsInterface(type(IERC6900Module).interfaceId) ||
            !IERC165(module).supportsInterface(type(IERC6900ExecutionModule).interfaceId) ||
            !IERC165(module).supportsInterface(type(ITownsApp).interfaceId) ||
            !IERC165(module).supportsInterface(type(IERC173).interfaceId)
        ) {
            ModuleDoesNotImplementInterface.selector.revertWith();
        }
    }
}
