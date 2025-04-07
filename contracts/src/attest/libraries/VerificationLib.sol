// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC6900ExtensionRegistry} from "../interfaces/IERC6900ExtensionRegistry.sol";

// libraries

import {AttestationLib} from "./AttestationLib.sol";
import {SchemaLib} from "./SchemaLib.sol";
import {CustomRevert} from "contracts/src/utils/libraries/CustomRevert.sol";
import {LibSort} from "solady/utils/LibSort.sol";

// types
import {
    Attestation,
    EMPTY_UID,
    NO_EXPIRATION_TIME
} from "@ethereum-attestation-service/eas-contracts/Common.sol";

import {
    AttestationRequest,
    RevocationRequestData
} from "@ethereum-attestation-service/eas-contracts/IEAS.sol";

library VerificationLib {
    using LibSort for address[];
    using CustomRevert for bytes4;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           EVENTS                             */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    event Verified(address indexed module, bool indexed trusted);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         ERRORS                             */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    error InvalidAttestation();
    error InvalidAttesters();
    error InvalidThreshold();
    error NoTrustedAttestersFound();
    error InsufficientAttestations();
    error SchemaIdNotSet();
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         STORAGE                             */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    struct TrustedAttester {
        uint8 count; // number of attesters in the linkedList
        uint8 threshold; // minimum number of attestations required to be a trusted attester
        address attester; // the first attester in the linkedList
        mapping(address attester => mapping(address account => address linkedAttester))
            linkedAttesters; // a linkedList of attesters
    }

    // keccak256(abi.encode(uint256(keccak256("attestations.module.verification.storage")) - 1)) &
    // ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0xdb194f9572af868cd966acb7c8897390a9161f79810043f80e2b6bb7ac1bc200;

    struct Layout {
        bytes32 schemaId;
        mapping(address account => TrustedAttester trustedAttester) trustedAttesters;
        mapping(address recipient => mapping(address attester => bytes32 uid)) attestations;
    }

    function getLayout() internal pure returns (Layout storage db) {
        assembly {
            db.slot := STORAGE_SLOT
        }
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           FUNCTIONS                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function getSchemaId() internal view returns (bytes32) {
        return getLayout().schemaId;
    }

    function setSchemaId(bytes32 schemaId) internal {
        getLayout().schemaId = schemaId;
    }

    function attest(address module, address attester) internal {
        Layout storage db = getLayout();
        bytes32 schemaId = db.schemaId;

        if (schemaId == EMPTY_UID) {
            SchemaIdNotSet.selector.revertWith();
        }

        AttestationRequest memory request;
        request.schema = schemaId;
        request.data.recipient = module;
        request.data.revocable = true;
        request.data.data = abi.encode(module, true);
        bytes32 uid = AttestationLib.attest(request).uid;
        db.attestations[module][attester] = uid;

        emit Verified(module, true);
    }

    function revoke(address module, address attester) internal {
        Layout storage db = getLayout();
        bytes32 schemaId = db.schemaId;
        bytes32 uid = db.attestations[module][attester];
        if (uid == EMPTY_UID) {
            InvalidAttestation.selector.revertWith();
        }

        RevocationRequestData memory revocationRequest;
        revocationRequest.uid = uid;
        AttestationLib.revoke({
            schemaId: schemaId,
            request: revocationRequest,
            revoker: msg.sender,
            availableValue: 0,
            last: true
        });

        emit Verified(module, false);
    }

    function getAttestationId(
        address recipient,
        address attester
    )
        internal
        view
        returns (bytes32 uid)
    {
        uid = getLayout().attestations[recipient][attester];
    }

    /// @notice Stores trusted attesters and their threshold for an account
    /// @dev Attesters must be sorted and unique. The first attester is stored separately and
    /// subsequent attesters are stored in a linked list
    /// @param threshold The minimum number of attestations required from trusted attesters
    /// @param attesters Array of attester addresses, must be sorted and unique
    /// @custom:events Emits NewTrustedAttesters when attesters are successfully stored
    /// @custom:errors InvalidAttesters if attesters array is invalid (empty, too long, unsorted,
    /// non-unique, or contains zero address)
    /// @custom:errors InvalidThreshold if threshold is greater than number of attesters
    function trustAttesters(uint8 threshold, address[] calldata attesters) internal {
        uint256 len = attesters.length;

        if (!attesters.isSortedAndUniquified()) {
            InvalidAttesters.selector.revertWith();
        }

        if (len == 0 || len > type(uint8).max) {
            InvalidAttesters.selector.revertWith();
        }

        if (attesters.length != len) {
            InvalidAttesters.selector.revertWith();
        }

        if (attesters[0] == address(0)) {
            InvalidAttesters.selector.revertWith();
        }

        if (threshold > len) {
            InvalidThreshold.selector.revertWith();
        }

        Layout storage db = getLayout();
        TrustedAttester storage trustedAttester = db.trustedAttesters[msg.sender];

        (trustedAttester.count, trustedAttester.threshold, trustedAttester.attester) =
            (uint8(len), threshold, attesters[0]);

        for (uint256 i; i < len - 1; ++i) {
            address attester = attesters[i];
            trustedAttester.linkedAttesters[attester][msg.sender] = attesters[i + 1];
        }

        emit IERC6900ExtensionRegistry.NewTrustedAttesters(msg.sender);
    }

    function check(address account, address module) internal view {
        Layout storage db = getLayout();
        TrustedAttester storage trustedAttester = db.trustedAttesters[account];

        (uint8 attesterCount, uint8 threshold, address attester) =
            (trustedAttester.count, trustedAttester.threshold, trustedAttester.attester);

        if (attester == address(0) || threshold == 0) {
            NoTrustedAttestersFound.selector.revertWith();
        } else if (threshold == 1) {
            Attestation memory attestation = getAttestation(module, attester);

            if (checkValid(attestation)) return;

            for (uint256 i; i < attesterCount; ++i) {
                attester = trustedAttester.linkedAttesters[attester][account];
                attestation = getAttestation(module, attester);
                if (checkValid(attestation)) return;
            }

            InsufficientAttestations.selector.revertWith();
        } else {
            Attestation memory attestation = getAttestation(module, attester);
            if (checkValid(attestation)) return;

            for (uint256 i; i < attesterCount; ++i) {
                attester = trustedAttester.linkedAttesters[attester][account];
                attestation = getAttestation(module, attester);
                if (checkValid(attestation)) threshold--;
                if (threshold == 0) return;
            }
            if (threshold > 0) {
                InsufficientAttestations.selector.revertWith();
            }
        }
    }

    function check(address module, address[] calldata attesters, uint256 threshold) internal view {
        uint256 len = attesters.length;
        if (len == 0 || threshold == 0) {
            NoTrustedAttestersFound.selector.revertWith();
        } else if (len < threshold) {
            InsufficientAttestations.selector.revertWith();
        }

        address cache;
        for (uint256 i; i < len; ++i) {
            address attester = attesters[i];
            if (attester <= cache) InvalidAttesters.selector.revertWith();
            else cache = attester;

            Attestation memory attestation = getAttestation(module, attester);

            if (checkValid(attestation)) {
                --threshold;
                if (threshold == 0) return;
            }
        }
        InsufficientAttestations.selector.revertWith();
    }

    function findTrustedAttesters(address account)
        internal
        view
        returns (address[] memory attesters)
    {
        Layout storage db = getLayout();
        TrustedAttester storage trustedAttesters = db.trustedAttesters[account];

        uint256 len = trustedAttesters.count;
        address firstAttester = trustedAttesters.attester;

        if (len == 0) return attesters;

        attesters = new address[](len);
        attesters[0] = firstAttester;

        for (uint256 i = 1; i < len; ++i) {
            attesters[i] = trustedAttesters.linkedAttesters[attesters[i - 1]][account];
        }
    }

    function getAttestation(
        address recipient,
        address attester
    )
        internal
        view
        returns (Attestation memory)
    {
        Layout storage db = getLayout();
        bytes32 uid = db.attestations[recipient][attester];
        Attestation memory attestation = AttestationLib.getAttestation(uid);
        if (attestation.uid == EMPTY_UID) {
            InvalidAttestation.selector.revertWith();
        }
        return attestation;
    }

    function checkValid(Attestation memory attestation) internal view returns (bool) {
        (bytes32 uid, uint64 expirationTime, uint64 revocationTime) =
            (attestation.uid, attestation.expirationTime, attestation.revocationTime);

        if (uid == EMPTY_UID) {
            return false;
        }

        if (expirationTime != NO_EXPIRATION_TIME && block.timestamp > expirationTime) {
            return false;
        }

        if (revocationTime != 0) {
            return false;
        }

        return true;
    }
}
