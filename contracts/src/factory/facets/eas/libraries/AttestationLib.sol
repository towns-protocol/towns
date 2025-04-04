// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ISchemaResolver} from "../interfaces/ISchemaResolver.sol";

// libraries

import {CurrencyTransfer} from "../../../../utils/libraries/CurrencyTransfer.sol";
import {CustomRevert} from "../../../../utils/libraries/CustomRevert.sol";
import {DataTypes} from "../DataTypes.sol";
import {AttestationRegistryStorage} from "../storage/AttestationRegistryStorage.sol";
import {SchemaLib} from "./SchemaLib.sol";

// contracts

library AttestationLib {
    using CustomRevert for bytes4;

    /// @dev Resolves a new attestation or a revocation of an existing attestation.
    /// @param schema The schema of the attestation.
    /// @param attestation The data of the attestation to make/revoke
    /// @param value An explicit ETH amount to send to the resolver.
    /// @param isRevocation Whether the attestation is a revocation.
    function resolveAttestation(
        DataTypes.Schema memory schema,
        DataTypes.Attestation memory attestation,
        uint256 value,
        bool isRevocation,
        uint256 availableValue,
        bool last
    )
        internal
        returns (uint256)
    {
        ISchemaResolver resolver = ISchemaResolver(schema.resolver);

        if (schema.uid == DataTypes.EMPTY_UID) {
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
        DataTypes.AttestationRequestData memory request,
        address attester,
        uint256 availableValue,
        bool last
    )
        internal
        returns (DataTypes.Attestation memory)
    {
        DataTypes.Schema memory schema = SchemaLib.getSchema(schemaId);
        if (schema.uid == DataTypes.EMPTY_UID) {
            DataTypes.InvalidSchema.selector.revertWith();
        }

        uint64 timeNow = time();

        if (
            request.expirationTime != DataTypes.NO_EXPIRATION_TIME
                && request.expirationTime <= timeNow
        ) {
            DataTypes.InvalidExpirationTime.selector.revertWith();
        }

        // If the schema is not revocable, the attestation cannot be revoked
        if (!schema.revocable && request.revocable) {
            DataTypes.Irrevocable.selector.revertWith();
        }

        DataTypes.Attestation memory attestation = DataTypes.Attestation({
            uid: DataTypes.EMPTY_UID,
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
            attestationUID = hashAttestation(attestation, bump);
            if (db.attestations[attestationUID].uid == DataTypes.EMPTY_UID) {
                break;
            }
            unchecked {
                ++bump;
            }
        }

        attestation.uid = attestationUID;
        db.attestations[attestationUID] = attestation;
        db.moduleToAttesterToAttestation[attestation.recipient][attestation.attester] =
            attestationUID;

        if (request.refUID != DataTypes.EMPTY_UID) {
            if (!isValidAttestation(request.refUID)) {
                DataTypes.NotFound.selector.revertWith();
            }
        }

        emit DataTypes.AttestationCreated(
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
        DataTypes.RevocationRequestData memory request,
        address revoker,
        uint256 availableValue,
        bool last
    )
        internal
        returns (DataTypes.Attestation memory)
    {
        DataTypes.Schema memory schema = SchemaLib.getSchema(schemaId);
        if (schema.uid == DataTypes.EMPTY_UID) {
            DataTypes.InvalidSchema.selector.revertWith();
        }

        DataTypes.Attestation memory attestation = getAttestation(request.uid);

        if (attestation.uid == DataTypes.EMPTY_UID) {
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

        db.attestations[attestation.uid].revocationTime = time();
        db.moduleToAttesterToAttestation[attestation.recipient][attestation.attester] =
            attestation.uid;

        emit DataTypes.AttestationRevoked(
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

    function getAttestation(bytes32 uid) internal view returns (DataTypes.Attestation memory) {
        return AttestationRegistryStorage.getLayout().attestations[uid];
    }

    function getAttestation(
        address recipient,
        address attester
    )
        internal
        view
        returns (DataTypes.Attestation memory)
    {
        bytes32 uid = AttestationRegistryStorage.getLayout().moduleToAttesterToAttestation[recipient][attester];

        if (uid == DataTypes.EMPTY_UID) {
            DataTypes.InvalidAttestation.selector.revertWith();
        }

        return getAttestation(uid);
    }
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                     Validator Checks                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function checkValid(DataTypes.Attestation memory attestation) internal view returns (bool) {
        (bytes32 uid, uint64 expirationTime, uint64 revocationTime) =
            (attestation.uid, attestation.expirationTime, attestation.revocationTime);

        if (uid == DataTypes.EMPTY_UID) {
            return false;
        }

        if (expirationTime != DataTypes.NO_EXPIRATION_TIME && block.timestamp > expirationTime) {
            return false;
        }

        if (revocationTime != 0) {
            return false;
        }

        return true;
    }

    function hashAttestation(
        DataTypes.Attestation memory attestation,
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

    function time() internal view returns (uint64) {
        return uint64(block.timestamp);
    }

    function refund(uint256 value) internal {
        if (value > 0) {
            CurrencyTransfer.safeTransferNativeToken(msg.sender, value);
        }
    }

    function isValidAttestation(bytes32 uid) internal view returns (bool) {
        return getAttestation(uid).uid != DataTypes.EMPTY_UID;
    }
}
