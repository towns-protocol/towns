// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

// interfaces
import {ISchemaResolver} from "@ethereum-attestation-service/eas-contracts/resolver/ISchemaResolver.sol";
import {IAttestationRegistryBase} from "./IAttestationRegistry.sol";

// libraries
import {CustomRevert} from "src/utils/libraries/CustomRevert.sol";
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";
import {AttestationLib} from "./AttestationLib.sol";
import {AttestationStorage} from "./AttestationStorage.sol";

// types
import {SchemaStorage} from "../schema/SchemaStorage.sol";
import {Attestation, EMPTY_UID, NO_EXPIRATION_TIME} from "@ethereum-attestation-service/eas-contracts/Common.sol";
import {AttestationRequest, AttestationRequestData, IEAS, RevocationRequestData} from "@ethereum-attestation-service/eas-contracts/IEAS.sol";
import {SchemaRecord} from "@ethereum-attestation-service/eas-contracts/ISchemaRegistry.sol";

// contracts

abstract contract AttestationBase is IAttestationRegistryBase {
    using CustomRevert for bytes4;
    using AttestationLib for Attestation;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                     Internal Functions                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Creates a new attestation
    /// @param attester The address creating the attestation
    /// @param value The ETH value to send with the attestation
    /// @param request The attestation request data
    /// @return attestation The created attestation
    function _attest(
        address attester,
        uint256 value,
        AttestationRequest memory request
    ) internal returns (Attestation memory attestation) {
        AttestationRequestData[] memory data = new AttestationRequestData[](1);
        data[0] = request.data;
        (, bytes32[] memory uids) = _attestMultiple(request.schema, data, attester, value, true);
        return _getAttestation(uids[0]);
    }

    /// @notice Revokes an existing attestation
    /// @param schemaId The schema ID of the attestation to revoke
    /// @param request The revocation request data
    /// @param revoker The address revoking the attestation
    /// @param availableValue The available ETH value for the revocation
    /// @param last Whether this is the last revocation in a batch
    function _revoke(
        bytes32 schemaId,
        RevocationRequestData memory request,
        address revoker,
        uint256 availableValue,
        bool last
    ) internal {
        RevocationRequestData[] memory requests = new RevocationRequestData[](1);
        requests[0] = request;
        _revokeMultiple(schemaId, requests, revoker, availableValue, last);
    }

    /// @notice Retrieves an attestation by its UID
    /// @param uid The unique identifier of the attestation
    /// @return The attestation data
    function _getAttestation(bytes32 uid) internal view returns (Attestation memory) {
        return AttestationStorage.getAttestation(uid);
    }

    /// @notice Resolves a new attestation or revocation through its resolver
    /// @param schema The schema record of the attestation
    /// @param attestation The attestation data
    /// @param value The ETH value to send to the resolver
    /// @param isRevocation Whether this is a revocation
    /// @param availableValue The total available ETH value
    /// @param last Whether this is the last attestation/revocation in a batch
    /// @return The amount of ETH value used
    function _resolveAttestation(
        SchemaRecord memory schema,
        Attestation memory attestation,
        uint256 value,
        bool isRevocation,
        uint256 availableValue,
        bool last
    ) private returns (uint256) {
        ISchemaResolver resolver = ISchemaResolver(schema.resolver);

        if (schema.uid == EMPTY_UID) {
            InvalidAttestationSchema.selector.revertWith();
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

    /// @notice Resolves multiple attestations or revocations through their resolver
    /// @param schema The schema record
    /// @param attestations Array of attestations to resolve
    /// @param values Array of ETH values for each attestation
    /// @param isRevocation Whether these are revocations
    /// @param availableValue Total available ETH value
    /// @param last Whether this is the last batch
    /// @return totalUsedValue Total ETH value used in the resolution
    function _resolveAttestations(
        SchemaRecord memory schema,
        Attestation[] memory attestations,
        uint256[] memory values,
        bool isRevocation,
        uint256 availableValue,
        bool last
    ) private returns (uint256 totalUsedValue) {
        // Get the total number of attestations to process
        uint256 len = attestations.length;
        // Optimization: If only one attestation, use the single attestation resolver
        if (len == 1) {
            return
                _resolveAttestation(
                    schema,
                    attestations[0],
                    values[0],
                    isRevocation,
                    availableValue,
                    last
                );
        }

        // Get the resolver contract for this schema
        ISchemaResolver resolver = ISchemaResolver(schema.resolver);

        // If no resolver is set, handle zero-value case and refund if this is the last batch
        if (address(resolver) == address(0)) {
            _refundIfZeroValue(values, availableValue, last);
            return 0;
        }

        // Check if the resolver accepts ETH payments
        bool isPayable = resolver.isPayable();

        // Calculate total value needed and validate each attestation's value
        for (uint256 i; i < len; ++i) {
            uint256 val = values[i];
            if (val == 0) continue; // Skip zero-value attestations
            // Ensure resolver accepts payments if value is non-zero
            if (!isPayable) NotPayable.selector.revertWith();
            // Ensure sufficient balance for this attestation
            if (val > availableValue) InsufficientBalance.selector.revertWith();
            // Safe arithmetic: subtract from available and add to total
            unchecked {
                availableValue -= val;
                totalUsedValue += val;
            }
        }

        // The 'last' parameter indicates this is the final batch in a sequence of operations.
        // When true, any remaining ETH should be refunded to the sender.
        // This is important because:
        // 1. Multiple batches might be processed in sequence
        // 2. We want to refund unused ETH only after all batches are complete
        // 3. Prevents unnecessary gas costs from multiple refunds
        if (last) _refund(availableValue);

        // Process either revocation or attestation for multiple items
        if (isRevocation) {
            if (!resolver.multiRevoke{value: totalUsedValue}(attestations, values)) {
                InvalidRevocation.selector.revertWith();
            }
        } else if (!resolver.multiAttest{value: totalUsedValue}(attestations, values)) {
            InvalidAttestation.selector.revertWith();
        }
    }

    /// @notice Refunds any remaining ETH value if no value was used
    /// @param values Array of values to check
    /// @param availableValue Total available ETH value
    /// @param last Whether this is the last operation
    function _refundIfZeroValue(
        uint256[] memory values,
        uint256 availableValue,
        bool last
    ) private {
        uint256 len = values.length;
        for (uint256 i; i < len; ++i) {
            if (values[i] != 0) NotPayable.selector.revertWith();
        }
        if (last) _refund(availableValue);
    }

    /// @notice Creates multiple attestations
    /// @param schemaId The schema ID for the attestations
    /// @param requests Array of attestation requests
    /// @param attester The address creating the attestations
    /// @param availableValue Total available ETH value
    /// @param last Whether this is the last batch
    /// @return usedValue Amount of ETH value used
    /// @return uids Array of created attestation UIDs
    function _attestMultiple(
        bytes32 schemaId,
        AttestationRequestData[] memory requests,
        address attester,
        uint256 availableValue,
        bool last
    ) private returns (uint256 usedValue, bytes32[] memory uids) {
        SchemaRecord memory schema = SchemaStorage.getSchema(schemaId);
        if (schema.uid == EMPTY_UID) InvalidAttestationSchema.selector.revertWith();

        uint64 timeNow = uint64(block.timestamp);
        uint256 len = requests.length;
        uids = new bytes32[](len);

        Attestation[] memory attestations = new Attestation[](len);
        uint256[] memory values = new uint256[](len);

        AttestationStorage.Layout storage db = AttestationStorage.getLayout();

        for (uint256 i; i < len; ++i) {
            AttestationRequestData memory request = requests[i];
            // Ensure that either no expiration time was set or that it was set in the future.
            if (
                request.expirationTime != NO_EXPIRATION_TIME && request.expirationTime < timeNow + 1
            ) {
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
                attestationUID = attestation.getUID(bump);
                if (db.attestations[attestationUID].uid == EMPTY_UID) {
                    break;
                }
                unchecked {
                    ++bump;
                }
            }

            attestation.uid = attestationUID;
            db.attestations[attestationUID] = attestation;

            AttestationLib.checkRefUID(db.attestations[request.refUID], request.refUID);

            attestations[i] = attestation;
            values[i] = request.value;
            uids[i] = attestationUID;

            emit IEAS.Attested(
                attestation.recipient,
                attestation.attester,
                attestation.uid,
                attestation.schema
            );
        }

        usedValue = _resolveAttestations(schema, attestations, values, false, availableValue, last);
    }

    /// @notice Revokes multiple attestations
    /// @param schemaId The schema ID of the attestations
    /// @param requests Array of revocation requests
    /// @param revoker The address performing the revocations
    /// @param availableValue Total available ETH value
    /// @param last Whether this is the last batch
    /// @return Returns the total ETH value used
    function _revokeMultiple(
        bytes32 schemaId,
        RevocationRequestData[] memory requests,
        address revoker,
        uint256 availableValue,
        bool last
    ) private returns (uint256) {
        SchemaRecord memory schema = SchemaStorage.getSchema(schemaId);
        if (schema.uid == EMPTY_UID) InvalidAttestationSchema.selector.revertWith();

        uint256 len = requests.length;
        Attestation[] memory attestations = new Attestation[](len);
        uint256[] memory values = new uint256[](len);

        AttestationStorage.Layout storage db = AttestationStorage.getLayout();

        for (uint256 i; i < len; ++i) {
            Attestation storage attestation = db.attestations[requests[i].uid];
            attestation.revoke(schemaId, revoker);
            attestations[i] = attestation;
            values[i] = requests[i].value;
        }

        return _resolveAttestations(schema, attestations, values, true, availableValue, last);
    }

    /// @notice Refunds any remaining ETH value to the sender
    /// @param value The amount to refund
    function _refund(uint256 value) private {
        if (value > 0) {
            SafeTransferLib.safeTransferETH(msg.sender, value);
        }
    }
}
