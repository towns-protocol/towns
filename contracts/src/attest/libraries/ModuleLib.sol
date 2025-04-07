// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {CustomRevert} from "../../utils/libraries/CustomRevert.sol";
import {AttestationLib} from "./AttestationLib.sol";
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";

// types
import {Attestation} from "@ethereum-attestation-service/eas-contracts/Common.sol";
import {AttestationRequest} from "@ethereum-attestation-service/eas-contracts/IEAS.sol";

// contracts

library ModuleLib {
    using CustomRevert for bytes4;
    using EnumerableSetLib for EnumerableSetLib.Bytes32Set;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           ERRORS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    error ModuleAlreadyRegistered();
    error ModuleNotRegistered();

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           EVENTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    event ModuleRegistered(address indexed module, address indexed client, address indexed owner);
    event ModuleUnregistered(address indexed module);
    event ModuleClientUpdated(
        address indexed module, address indexed oldClient, address indexed newClient
    );

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           STRUCTS                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    struct ModuleInfo {
        address owner;
        address client;
        bool active;
    }

    struct Layout {
        // Registered schema ID
        bytes32 activeSchemaId;
        // Module => ModuleInfo
        mapping(address => ModuleInfo) modules;
        // Module => Permission => UID
        mapping(address => mapping(bytes32 => bytes32)) permissionToUid;
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
    function setActiveSchema(bytes32 schemaId) internal {
        Layout storage db = getLayout();
        db.activeSchemaId = schemaId;
    }

    function registerModule(
        address module,
        address client,
        address owner,
        bytes32[] calldata permissions
    )
        internal
    {
        Layout storage db = getLayout();
        ModuleInfo storage info = db.modules[module];

        if (info.active) ModuleAlreadyRegistered.selector.revertWith();

        uint256 len = permissions.length;
        bytes32 activeSchemaId = db.activeSchemaId;

        for (uint256 i; i < len; ++i) {
            AttestationRequest memory request;
            request.schema = activeSchemaId;
            request.data.revocable = true;
            request.data.data = abi.encode(module, permissions[i]);
            bytes32 uid = AttestationLib.attest(request).uid;
            db.permissionToUid[module][permissions[i]] = uid;
        }

        emit ModuleRegistered(module, client, owner);
    }

    function updateModuleClient(
        address module,
        address client
    )
        internal
        returns (address oldClient)
    {
        Layout storage db = getLayout();
        ModuleInfo storage moduleInfo = db.modules[module];
        if (!moduleInfo.active) ModuleNotRegistered.selector.revertWith();
        oldClient = moduleInfo.client;
        moduleInfo.client = client;
        emit ModuleClientUpdated(module, oldClient, client);
    }

    function isAuthorizedCaller(address module, address client) internal view returns (bool) {
        Layout storage db = getLayout();
        ModuleInfo storage info = db.modules[module];
        if (!info.active) return false;
        return client == info.owner || client == info.client;
    }

    function hasPermission(address module, bytes32 permission) internal view returns (bool) {
        Layout storage db = getLayout();

        if (!db.modules[module].active) return false;

        Attestation memory attestation =
            AttestationLib.getAttestation(db.permissionToUid[module][permission]);
        if (attestation.revocationTime != 0) return false;

        return true;
    }
}
