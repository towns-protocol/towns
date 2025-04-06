// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ISchemaResolver} from
    "@ethereum-attestation-service/eas-contracts/resolver/ISchemaResolver.sol";

// libraries

import {CurrencyTransfer} from "../../utils/libraries/CurrencyTransfer.sol";
import {CustomRevert} from "../../utils/libraries/CustomRevert.sol";
import {DataTypes} from "../types/DataTypes.sol";

import {AttestationRegistryStorage} from "../storage/AttestationRegistryStorage.sol";

import {SchemaLib} from "./SchemaLib.sol";
import {
    Attestation,
    EMPTY_UID,
    NO_EXPIRATION_TIME
} from "@ethereum-attestation-service/eas-contracts/Common.sol";

import {
    AttestationRequestData,
    IEAS,
    RevocationRequestData
} from "@ethereum-attestation-service/eas-contracts/IEAS.sol";
import {SchemaRecord} from "@ethereum-attestation-service/eas-contracts/ISchemaRegistry.sol";

// contracts

library AttestationLib {
    using CustomRevert for bytes4;

    /// @dev Resolves a new attestation or a revocation of an existing attestation.
    /// @param schema The schema of the attestation.
    /// @param attestation The data of the attestation to make/revoke
    /// @param value An explicit ETH amount to send to the resolver.
    /// @param isRevocation Whether the attestation is a revocation.
    function resolveAttestation(
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
            DataTypes.InvalidSchema.selector.revertWith();
        }

        if (address(resolver) == address(0)) {
            if (value != 0) DataTypes.NotPayable.selector.revertWith();
            if (last) refund(availableValue);
            return 0;
        }

        if (value != 0) {
            if (!resolver.isPayable()) DataTypes.NotPayable.selector.revertWith();
            if (value > availableValue) {
                DataTypes.InsufficientBalance.selector.revertWith();
            }

            unchecked {
                availableValue -= value;
            }
        }

        if (isRevocation) {
            if (!resolver.revoke{value: value}(attestation)) {
                DataTypes.InvalidRevocation.selector.revertWith();
            }
        } else if (!resolver.attest{value: value}(attestation)) {
            DataTypes.InvalidAttestation.selector.revertWith();
        }

        if (last) refund(availableValue);

        return value;
    }

    function attest(
        bytes32 schemaId,
        AttestationRequestData memory request,
        address attester,
        uint256 availableValue,
        bool last
    )
        internal
        returns (Attestation memory attestation)
    {
        SchemaRecord memory schema = SchemaLib.getSchema(schemaId);
        if (schema.uid == EMPTY_UID) {
            DataTypes.InvalidSchema.selector.revertWith();
        }

        uint64 timeNow = uint64(block.timestamp);

        if (request.expirationTime != NO_EXPIRATION_TIME && request.expirationTime <= timeNow) {
            DataTypes.InvalidExpirationTime.selector.revertWith();
        }

        // If the schema is not revocable, the attestation cannot be revoked
        if (!schema.revocable && request.revocable) {
            DataTypes.Irrevocable.selector.revertWith();
        }

        attestation = Attestation({
            uid: EMPTY_UID,
            schema: schemaId,
            time: timeNow,
            expirationTime: request.expirationTime,
            revocationTime: 0,
            refUID: request.refUID,
            recipient: request.recipient,
            attester: attester,
            revocable: request.revocable,
            data: request.data
        });

        AttestationRegistryStorage.Layout storage db = AttestationRegistryStorage.getLayout();

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

        if (request.refUID != EMPTY_UID) {
            if (!isValidAttestation(request.refUID)) {
                DataTypes.NotFound.selector.revertWith();
            }
        }

        emit IEAS.Attested(
            attestation.recipient, attestation.attester, attestation.uid, attestation.schema
        );

        resolveAttestation({
            schema: schema,
            attestation: attestation,
            value: request.value,
            isRevocation: false,
            availableValue: availableValue,
            last: last
        });

        return attestation;
    }

    function revoke(
        bytes32 schemaId,
        RevocationRequestData memory request,
        address revoker,
        uint256 availableValue,
        bool last
    )
        internal
        returns (Attestation memory)
    {
        SchemaRecord memory schema = SchemaLib.getSchema(schemaId);
        if (schema.uid == EMPTY_UID) {
            DataTypes.InvalidSchema.selector.revertWith();
        }

        Attestation memory attestation = getAttestation(request.uid);

        if (attestation.uid == EMPTY_UID) {
            DataTypes.InvalidAttestation.selector.revertWith();
        }

        if (attestation.schema != schemaId) {
            DataTypes.InvalidSchema.selector.revertWith();
        }

        if (attestation.attester != revoker) {
            DataTypes.InvalidRevoker.selector.revertWith();
        }

        if (!attestation.revocable) {
            DataTypes.Irrevocable.selector.revertWith();
        }

        if (attestation.revocationTime != 0) {
            DataTypes.InvalidRevocation.selector.revertWith();
        }

        AttestationRegistryStorage.Layout storage db = AttestationRegistryStorage.getLayout();

        db.attestations[attestation.uid].revocationTime = uint64(block.timestamp);

        emit IEAS.Revoked(
            attestation.recipient, attestation.attester, attestation.uid, attestation.schema
        );

        resolveAttestation({
            schema: schema,
            attestation: attestation,
            value: request.value,
            isRevocation: true,
            availableValue: availableValue,
            last: last
        });

        return attestation;
    }

    function getAttestation(bytes32 uid) internal view returns (Attestation memory) {
        return AttestationRegistryStorage.getLayout().attestations[uid];
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                     Validator Checks                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

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

    function refund(uint256 value) internal {
        if (value > 0) {
            CurrencyTransfer.safeTransferNativeToken(msg.sender, value);
        }
    }

    function isValidAttestation(bytes32 uid) internal view returns (bool) {
        return getAttestation(uid).uid != EMPTY_UID;
    }
}
