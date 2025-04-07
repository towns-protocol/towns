// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC6900ExecutionModule} from
    "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";
import {IERC6900Module} from "@erc6900/reference-implementation/interfaces/IERC6900Module.sol";

import {IERC165} from "@openzeppelin/contracts/interfaces/IERC165.sol";
import {ITownsModule} from "contracts/src/attest/interfaces/ITownsModule.sol";

// libraries
import {CustomRevert} from "../../utils/libraries/CustomRevert.sol";
import {AttestationLib} from "./AttestationLib.sol";

import {VerificationLib} from "./VerificationLib.sol";
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";

// types

import {ExecutionManifest} from
    "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";
import {Attestation} from "@ethereum-attestation-service/eas-contracts/Common.sol";
import {
    AttestationRequest,
    RevocationRequestData
} from "@ethereum-attestation-service/eas-contracts/IEAS.sol";

// contracts

library ModuleLib {
    using CustomRevert for bytes4;
    using EnumerableSetLib for EnumerableSetLib.Bytes32Set;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           ERRORS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    error ModuleAlreadyRegistered();
    error ModuleNotRegistered();
    error ModuleRevoked();
    error ModuleNotOwner();
    error ModuleDoesNotImplementInterface();
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           EVENTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    event ModuleRegistered(address indexed module, bytes32 uid);
    event ModuleUnregistered(address indexed module, bytes32 uid);
    event ModuleUpdated(address indexed module, bytes32 uid);
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           STRUCTS                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    struct ModuleInfo {
        bytes32 uid;
    }

    struct Layout {
        // Registered schema ID
        bytes32 schema;
        // Module => ModuleInfo
        mapping(address => ModuleInfo) modules;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           STORAGE                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    // keccak256(abi.encode(uint256(keccak256("attestations.module.registry.storage")) - 1)) &
    // ~bytes32(uint256(0xff))
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
        db.schema = schemaId;
    }

    function getSchema() internal view returns (bytes32) {
        return getLayout().schema;
    }

    function getModuleVersion(address module) internal view returns (bytes32 version) {
        return getLayout().modules[module].uid;
    }

    function addModule(
        address module,
        address client,
        address owner,
        bytes32[] calldata permissions,
        ExecutionManifest calldata manifest
    )
        internal
        returns (bytes32 version)
    {
        _verifyModuleInterfaces(module);

        Layout storage db = getLayout();
        ModuleInfo storage info = db.modules[module];

        if (info.uid != bytes32(0)) ModuleAlreadyRegistered.selector.revertWith();

        AttestationRequest memory request;
        request.schema = db.schema;
        request.data.recipient = module;
        request.data.revocable = true;
        request.data.data = abi.encode(module, client, owner, permissions, manifest);
        info.uid = AttestationLib.attest(request).uid;

        emit ModuleRegistered(module, info.uid);

        return info.uid;
    }

    function updatePermissions(
        address module,
        bytes32[] calldata permissions
    )
        internal
        returns (bytes32 version)
    {
        Layout storage db = getLayout();
        ModuleInfo storage info = db.modules[module];

        if (info.uid == bytes32(0)) ModuleNotRegistered.selector.revertWith();

        Attestation memory att = AttestationLib.getAttestation(info.uid);
        if (att.revocationTime > 0) ModuleRevoked.selector.revertWith();
        (, address client, address owner,, ExecutionManifest memory manifest) =
            abi.decode(att.data, (address, address, address, bytes32[], ExecutionManifest));

        if (msg.sender != owner) ModuleNotOwner.selector.revertWith();

        RevocationRequestData memory revocationRequest;
        revocationRequest.uid = info.uid;
        AttestationLib.revoke(db.schema, revocationRequest, msg.sender, 0, true);

        AttestationRequest memory request;
        request.schema = db.schema;
        request.data.revocable = true;
        request.data.refUID = info.uid;
        request.data.data = abi.encode(module, client, owner, permissions, manifest);
        info.uid = AttestationLib.attest(request).uid;

        emit ModuleUpdated(module, info.uid);

        return info.uid;
    }

    function removeModule(address module) internal returns (bytes32 version) {
        Layout storage db = getLayout();
        ModuleInfo storage info = db.modules[module];

        if (info.uid == bytes32(0)) ModuleNotRegistered.selector.revertWith();

        RevocationRequestData memory request;
        request.uid = info.uid;

        AttestationLib.revoke(db.schema, request, msg.sender, 0, true);

        emit ModuleUnregistered(module, info.uid);

        return info.uid;
    }

    function _verifyModuleInterfaces(address module) internal view {
        if (
            !IERC165(module).supportsInterface(type(IERC6900Module).interfaceId)
                || !IERC165(module).supportsInterface(type(IERC6900ExecutionModule).interfaceId)
                || !IERC165(module).supportsInterface(type(ITownsModule).interfaceId)
        ) {
            ModuleDoesNotImplementInterface.selector.revertWith();
        }
    }
}
