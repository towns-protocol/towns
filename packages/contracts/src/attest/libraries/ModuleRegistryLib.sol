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
import {Attestation} from "@ethereum-attestation-service/eas-contracts/Common.sol";
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
        bytes32 uid;
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

    function getModuleVersion(address module) internal view returns (bytes32 version) {
        return getLayout().modules[module].uid;
    }

    function getModule(address module) internal view returns (Attestation memory att) {
        return AttestationLib.getAttestation(getModuleVersion(module));
    }

    function addModule(
        address module,
        address owner,
        address[] calldata clients
    ) internal returns (bytes32 version) {
        _verifyAddModuleInputs(module, owner, clients);

        bytes32[] memory permissions = ITownsModule(module).requiredPermissions();
        ExecutionManifest memory manifest = ITownsModule(module).executionManifest();

        if (permissions.length == 0) InvalidArrayInput.selector.revertWith();

        Layout storage db = getLayout();
        ModuleInfo storage info = db.modules[module];

        if (info.uid != bytes32(0)) ModuleAlreadyRegistered.selector.revertWith();

        AttestationRequest memory request;
        request.schema = db.schemaId;
        request.data.recipient = module;
        request.data.revocable = true;
        request.data.data = abi.encode(module, clients, owner, permissions, manifest);
        info.uid = AttestationLib.attest(msg.sender, msg.value, request).uid;

        emit ModuleRegistered(module, info.uid);

        return info.uid;
    }

    function updatePermissions(
        address revoker,
        address module,
        bytes32[] calldata permissions
    ) internal returns (bytes32 version) {
        Layout storage db = getLayout();
        ModuleInfo storage info = db.modules[module];

        if (info.uid == bytes32(0)) ModuleNotRegistered.selector.revertWith();

        Attestation memory att = AttestationLib.getAttestation(info.uid);
        if (att.revocationTime > 0) ModuleRevoked.selector.revertWith();
        (, address client, address owner, , ExecutionManifest memory manifest) = abi.decode(
            att.data,
            (address, address, address, bytes32[], ExecutionManifest)
        );

        if (revoker != owner) NotModuleOwner.selector.revertWith();

        RevocationRequestData memory revocationRequest;
        revocationRequest.uid = info.uid;
        AttestationLib.revoke(db.schemaId, revocationRequest, msg.sender, 0, true);

        AttestationRequest memory request;
        request.schema = db.schemaId;
        request.data.revocable = true;
        request.data.refUID = info.uid;
        request.data.data = abi.encode(module, client, owner, permissions, manifest);
        info.uid = AttestationLib.attest(msg.sender, msg.value, request).uid;

        emit ModuleUpdated(module, info.uid);

        return info.uid;
    }

    function removeModule(address revoker, address module) internal returns (bytes32 version) {
        Layout storage db = getLayout();
        bytes32 uidToRevoke = db.modules[module].uid;

        if (uidToRevoke == bytes32(0)) ModuleNotRegistered.selector.revertWith();

        RevocationRequestData memory request;
        request.uid = uidToRevoke;

        AttestationLib.revoke(db.schemaId, request, revoker, 0, true);

        db.modules[module].uid = bytes32(0);
        delete db.modules[module];

        emit ModuleUnregistered(module, uidToRevoke);

        return uidToRevoke;
    }

    function banModule(address module) internal returns (bytes32 version) {
        Layout storage db = getLayout();
        bytes32 uidToBan = db.modules[module].uid;

        if (uidToBan == bytes32(0)) ModuleNotRegistered.selector.revertWith();

        Attestation memory att = AttestationLib.getAttestation(uidToBan);
        if (att.revocationTime > 0) ModuleRevoked.selector.revertWith();

        RevocationRequestData memory request;
        request.uid = uidToBan;

        AttestationLib.revoke(db.schemaId, request, att.attester, 0, true);

        db.modules[module].uid = bytes32(0);
        delete db.modules[module];

        emit ModuleBanned(module, uidToBan);

        return uidToBan;
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
