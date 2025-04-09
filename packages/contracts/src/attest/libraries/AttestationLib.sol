// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ISchemaResolver} from
    "@ethereum-attestation-service/eas-contracts/resolver/ISchemaResolver.sol";

// libraries

import {CustomRevert} from "../../utils/libraries/CustomRevert.sol";
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";

import {SchemaLib} from "./SchemaLib.sol";
import {
    Attestation,
    EMPTY_UID,
    NO_EXPIRATION_TIME,
    NotFound
} from "@ethereum-attestation-service/eas-contracts/Common.sol";

import {
    AttestationRequest,
    AttestationRequestData,
    IEAS,
    RevocationRequestData
} from "@ethereum-attestation-service/eas-contracts/IEAS.sol";
import {SchemaRecord} from "@ethereum-attestation-service/eas-contracts/ISchemaRegistry.sol";

// contracts

library AttestationLib {
    using CustomRevert for bytes4;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           STORAGE                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    // keccak256(abi.encode(uint256(keccak256("attestations.module.attestation.storage")) - 1)) &
    // ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0xb3faa0ced44596f3bee5bed62671ce37f7e9245f810f19748a1d69616f8f2b00;

    struct Layout {
        mapping(bytes32 uid => Attestation attestation) attestations;
    }

    function getLayout() internal pure returns (Layout storage ds) {
        assembly {
            ds.slot := STORAGE_SLOT
        }
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           ERRORS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    error NotPayable();
    error InsufficientBalance();
    error InvalidRevocation();
    error InvalidAttestation();
    error InvalidExpirationTime();
    error Irrevocable();
    error InvalidRevoker();

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                     Internal Functions                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    function attest(AttestationRequest memory request)
        internal
        returns (Attestation memory attestation)
    {
        AttestationRequestData[] memory data = new AttestationRequestData[](1);
        data[0] = request.data;
        (, bytes32[] memory uids) = _attest(request.schema, data, msg.sender, msg.value, true);
        return getAttestation(uids[0]);
    }

    function revoke(
        bytes32 schemaId,
        RevocationRequestData memory request,
        address revoker,
        uint256 availableValue,
        bool last
    )
        internal
    {
        RevocationRequestData[] memory requests = new RevocationRequestData[](1);
        requests[0] = request;
        _revoke(schemaId, requests, revoker, availableValue, last);
    }

    function getAttestation(bytes32 uid) internal view returns (Attestation memory) {
        return getLayout().attestations[uid];
    }

    /// @dev Resolves a new attestation or a revocation of an existing attestation.
    /// @param schema The schema of the attestation.
    /// @param attestation The data of the attestation to make/revoke
    /// @param value An explicit ETH amount to send to the resolver.
    /// @param isRevocation Whether the attestation is a revocation.
    function _resolveAttestation(
        SchemaRecord memory schema,
        Attestation memory attestation,
        uint256 value,
        bool isRevocation,
        uint256 availableValue,
        bool last
    )
        internal
        returns (uint256)
    {
        ISchemaResolver resolver = ISchemaResolver(schema.resolver);

        if (schema.uid == EMPTY_UID) {
            SchemaLib.InvalidSchema.selector.revertWith();
        }

        if (address(resolver) == address(0)) {
            if (value != 0) NotPayable.selector.revertWith();
            if (last) _refund(availableValue);
            return 0;
        }

        if (value != 0) {
            if (!resolver.isPayable()) NotPayable.selector.revertWith();
            if (value > availableValue) {
                InsufficientBalance.selector.revertWith();
            }

            unchecked {
                availableValue -= value;
            }
        }

        if (isRevocation) {
            if (!resolver.revoke{value: value}(attestation)) {
                InvalidRevocation.selector.revertWith();
            }
        } else if (!resolver.attest{value: value}(attestation)) {
            InvalidAttestation.selector.revertWith();
        }

        if (last) _refund(availableValue);

        return value;
    }

    function _resolveAttestations(
        SchemaRecord memory schema,
        Attestation[] memory attestations,
        uint256[] memory values,
        bool isRevocation,
        uint256 availableValue,
        bool last
    )
        internal
        returns (uint256 totalUsedValue)
    {
        uint256 len = attestations.length;
        if (len == 1) {
            return _resolveAttestation(
                schema, attestations[0], values[0], isRevocation, availableValue, last
            );
        }

        ISchemaResolver resolver = ISchemaResolver(schema.resolver);
        if (address(resolver) == address(0)) {
            _refundIfZeroValue(values, availableValue, last);
            return 0;
        }

        bool isPayable = resolver.isPayable();

        for (uint256 i; i < len; ++i) {
            uint256 val = values[i];
            if (val == 0) continue;
            if (!isPayable) NotPayable.selector.revertWith();
            if (val > availableValue) InsufficientBalance.selector.revertWith();
            unchecked {
                availableValue -= val;
                totalUsedValue += val;
            }
        }

        if (isRevocation) {
            if (!resolver.multiRevoke{value: totalUsedValue}(attestations, values)) {
                InvalidRevocation.selector.revertWith();
            }
        } else if (!resolver.multiAttest{value: totalUsedValue}(attestations, values)) {
            InvalidAttestation.selector.revertWith();
        }

        if (last) _refund(availableValue);

        return totalUsedValue;
    }

    function _refundIfZeroValue(
        uint256[] memory values,
        uint256 availableValue,
        bool last
    )
        internal
    {
        uint256 len = values.length;
        for (uint256 i; i < len; ++i) {
            if (values[i] != 0) NotPayable.selector.revertWith();
            if (last) _refund(availableValue);
        }
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                     Internal Functions                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    function _attest(
        bytes32 schemaId,
        AttestationRequestData[] memory requests,
        address attester,
        uint256 availableValue,
        bool last
    )
        internal
        returns (uint256 usedValue, bytes32[] memory uids)
    {
        SchemaRecord memory schema = SchemaLib.getSchema(schemaId);
        if (schema.uid == EMPTY_UID) SchemaLib.InvalidSchema.selector.revertWith();

        uint64 timeNow = uint64(block.timestamp);
        uint256 len = requests.length;
        uids = new bytes32[](len);

        Attestation[] memory attestations = new Attestation[](len);
        uint256[] memory values = new uint256[](len);

        Layout storage db = getLayout();

        for (uint256 i; i < len; ++i) {
            AttestationRequestData memory request = requests[i];
            // Ensure that either no expiration time was set or that it was set in the future.
            if (request.expirationTime != NO_EXPIRATION_TIME && request.expirationTime <= timeNow) {
                InvalidExpirationTime.selector.revertWith();
            }

            if (!schema.revocable && request.revocable) {
                Irrevocable.selector.revertWith();
            }

            Attestation memory attestation;
            attestation.schema = schemaId;
            attestation.refUID = request.refUID;
            attestation.time = timeNow;
            attestation.expirationTime = request.expirationTime;
            attestation.revocable = request.revocable;
            attestation.recipient = request.recipient;
            attestation.attester = attester;
            attestation.data = request.data;

            bytes32 attestationUID;
            uint32 bump;
            while (true) {
                attestationUID = _hashAttestation(attestation, bump);
                if (db.attestations[attestationUID].uid == EMPTY_UID) {
                    break;
                }
                unchecked {
                    ++bump;
                }
            }

            attestation.uid = attestationUID;
            db.attestations[attestationUID] = attestation;

            _checkRefUID(db, request.refUID);

            attestations[i] = attestation;
            values[i] = request.value;
            uids[i] = attestationUID;

            emit IEAS.Attested(
                attestation.recipient, attestation.attester, attestation.uid, attestation.schema
            );
        }

        usedValue = _resolveAttestations(schema, attestations, values, false, availableValue, last);
    }

    function _revoke(
        bytes32 schemaId,
        RevocationRequestData[] memory requests,
        address revoker,
        uint256 availableValue,
        bool last
    )
        internal
        returns (uint256)
    {
        SchemaRecord memory schema = SchemaLib.getSchema(schemaId);
        if (schema.uid == EMPTY_UID) SchemaLib.InvalidSchema.selector.revertWith();

        uint256 len = requests.length;
        Attestation[] memory attestations = new Attestation[](len);
        uint256[] memory values = new uint256[](len);

        Layout storage db = getLayout();

        for (uint256 i; i < len; ++i) {
            Attestation storage attestation = db.attestations[requests[i].uid];
            if (attestation.uid == EMPTY_UID) InvalidAttestation.selector.revertWith();
            if (attestation.schema != schemaId) SchemaLib.InvalidSchema.selector.revertWith();
            if (attestation.attester != revoker) InvalidRevoker.selector.revertWith();
            if (!attestation.revocable) Irrevocable.selector.revertWith();
            if (attestation.revocationTime != 0) InvalidRevocation.selector.revertWith();
            attestation.revocationTime = uint64(block.timestamp);
            attestations[i] = attestation;
            values[i] = requests[i].value;

            emit IEAS.Revoked(
                attestation.recipient, attestation.attester, attestation.uid, attestation.schema
            );
        }

        return _resolveAttestations(schema, attestations, values, true, availableValue, last);
    }

    function _checkRefUID(Layout storage db, bytes32 refUID) internal view {
        if (refUID != EMPTY_UID) {
            if (db.attestations[refUID].uid == EMPTY_UID) {
                NotFound.selector.revertWith();
            }
        }
    }

    function _hashAttestation(
        Attestation memory attestation,
        uint32 bump
    )
        internal
        pure
        returns (bytes32)
    {
        return keccak256(
            abi.encodePacked(
                attestation.schema,
                attestation.recipient,
                attestation.attester,
                attestation.time,
                attestation.expirationTime,
                attestation.revocable,
                attestation.refUID,
                attestation.data,
                bump
            )
        );
    }

    function _refund(uint256 value) internal {
        if (value > 0) {
            SafeTransferLib.safeTransferETH(msg.sender, value);
        }
    }

    function isValidAttestation(bytes32 uid) internal view returns (bool) {
        return getAttestation(uid).uid != EMPTY_UID;
    }
}
