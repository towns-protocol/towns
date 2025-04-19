// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC6900ExecutionModule} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";
import {IERC6900Module} from "@erc6900/reference-implementation/interfaces/IERC6900Module.sol";

import {IERC165} from "@openzeppelin/contracts/interfaces/IERC165.sol";
import {ITownsModule} from "src/attest/interfaces/ITownsModule.sol";

// libraries
import {CustomRevert} from "../../utils/libraries/CustomRevert.sol";
import {AttestationLib} from "./AttestationLib.sol";
import {VerificationLib} from "./VerificationLib.sol";
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

    function getLayout() internal pure returns (Layout storage l) {
        assembly {
            l.slot := STORAGE_SLOT
        }
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           FUNCTIONS                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    function setSchema(bytes32 schemaId) internal {
        Layout storage db = getLayout();
        db.schemaId = schemaId;
        emit ModuleSchemaSet(schemaId);
    }

    function getSchema() internal view returns (bytes32) {
        return getLayout().schemaId;
    }

    function getLatestModuleId(address module) internal view returns (bytes32) {
        ModuleInfo storage moduleInfo = getLayout().modules[module];
        if (moduleInfo.isBanned) return EMPTY_UID;
        return moduleInfo.latestVersion;
    }

    function getModule(bytes32 moduleId) internal view returns (Attestation memory attestation) {
        Attestation memory att = AttestationLib.getAttestation(moduleId);
        if (att.uid == EMPTY_UID) ModuleNotRegistered.selector.revertWith();
        if (att.revocationTime > 0) ModuleRevoked.selector.revertWith();
        (address module, , , , ) = abi.decode(
            att.data,
            (address, address, address[], bytes32[], ExecutionManifest)
        );
        if (isBanned(module)) BannedModule.selector.revertWith();
        return att;
    }

    function isBanned(address module) internal view returns (bool) {
        return getLayout().modules[module].isBanned;
    }

    function addModule(
        address module,
        address owner,
        address[] calldata clients
    ) internal returns (bytes32 version) {
        _verifyAddModuleInputs(module, owner, clients);

        ModuleInfo storage moduleInfo = getLayout().modules[module];

        if (moduleInfo.isBanned) BannedModule.selector.revertWith();

        bytes32[] memory permissions = ITownsModule(module).requiredPermissions();
        ExecutionManifest memory manifest = ITownsModule(module).executionManifest();

        if (permissions.length == 0) InvalidArrayInput.selector.revertWith();

        AttestationRequest memory request;
        request.schema = getSchema();
        request.data.recipient = module;
        request.data.revocable = true;
        request.data.data = abi.encode(module, owner, clients, permissions, manifest);
        version = AttestationLib.attest(msg.sender, msg.value, request).uid;

        moduleInfo.latestVersion = version;
        moduleInfo.module = module;

        emit ModuleRegistered(module, version);

        return version;
    }

    function updatePermissions(
        address revoker,
        bytes32 moduleId,
        bytes32[] calldata permissions
    ) internal returns (bytes32 version) {
        Attestation memory att = AttestationLib.getAttestation(moduleId);

        if (att.uid == EMPTY_UID) ModuleNotRegistered.selector.revertWith();
        if (att.revocationTime > 0) ModuleRevoked.selector.revertWith();
        (
            address module,
            address owner,
            address[] memory clients,
            ,
            ExecutionManifest memory manifest
        ) = abi.decode(att.data, (address, address, address[], bytes32[], ExecutionManifest));

        if (revoker != owner) NotModuleOwner.selector.revertWith();
        if (getLayout().modules[module].isBanned) BannedModule.selector.revertWith();

        RevocationRequestData memory revocationRequest;
        revocationRequest.uid = moduleId;
        AttestationLib.revoke(att.schema, revocationRequest, msg.sender, 0, true);

        AttestationRequest memory request;
        request.schema = att.schema;
        request.data.revocable = true;
        request.data.refUID = moduleId;
        request.data.data = abi.encode(module, owner, clients, permissions, manifest);
        version = AttestationLib.attest(msg.sender, msg.value, request).uid;

        getLayout().modules[module].latestVersion = version;

        emit ModuleUpdated(module, version);

        return version;
    }

    function removeModule(
        address revoker,
        bytes32 moduleId
    ) internal returns (address module, bytes32 version) {
        if (moduleId == EMPTY_UID) InvalidModuleId.selector.revertWith();

        Attestation memory att = AttestationLib.getAttestation(moduleId);

        if (att.uid == EMPTY_UID) ModuleNotRegistered.selector.revertWith();
        if (att.revocationTime > 0) ModuleRevoked.selector.revertWith();
        (module, , , , ) = abi.decode(
            att.data,
            (address, address, address[], bytes32[], ExecutionManifest)
        );

        ModuleInfo storage moduleInfo = getLayout().modules[module];

        if (moduleInfo.isBanned) BannedModule.selector.revertWith();

        RevocationRequestData memory request;
        request.uid = moduleId;
        AttestationLib.revoke(att.schema, request, revoker, 0, true);

        version = moduleInfo.latestVersion;
        if (version == moduleId) {
            moduleInfo.latestVersion = EMPTY_UID;
        }

        emit ModuleUnregistered(module, moduleId);

        return (module, version);
    }

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

    function _verifyAddModuleInputs(
        address module,
        address owner,
        address[] memory clients
    ) internal view {
        if (module == address(0)) InvalidAddressInput.selector.revertWith();
        if (owner == address(0)) InvalidAddressInput.selector.revertWith();
        if (clients.length == 0) InvalidArrayInput.selector.revertWith();
        if (msg.sender != owner) NotModuleOwner.selector.revertWith();

        for (uint256 i = 0; i < clients.length; i++) {
            if (clients[i] == address(0)) InvalidAddressInput.selector.revertWith();
        }

        if (
            !IERC165(module).supportsInterface(type(IERC6900Module).interfaceId) ||
            !IERC165(module).supportsInterface(type(IERC6900ExecutionModule).interfaceId) ||
            !IERC165(module).supportsInterface(type(ITownsModule).interfaceId)
        ) {
            ModuleDoesNotImplementInterface.selector.revertWith();
        }
    }
}
