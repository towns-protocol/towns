// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ISchemaResolver} from "@ethereum-attestation-service/eas-contracts/resolver/ISchemaResolver.sol";
import {IAttestationRegistryBase} from "../interfaces/IAttestationRegistry.sol";

// libraries

import {CustomRevert} from "../../utils/libraries/CustomRevert.sol";
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";

import {SchemaLib} from "./SchemaLib.sol";
import {Attestation, EMPTY_UID, NO_EXPIRATION_TIME, NotFound} from "@ethereum-attestation-service/eas-contracts/Common.sol";

import {AttestationRequest, AttestationRequestData, IEAS, RevocationRequestData} from "@ethereum-attestation-service/eas-contracts/IEAS.sol";
import {SchemaRecord} from "@ethereum-attestation-service/eas-contracts/ISchemaRegistry.sol";

// contracts

library AttestationLib {
    using CustomRevert for bytes4;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           STORAGE                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    // keccak256(abi.encode(uint256(keccak256("attestations.module.attestation.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0xb3faa0ced44596f3bee5bed62671ce37f7e9245f810f19748a1d69616f8f2b00;

    struct Layout {
        mapping(bytes32 uid => Attestation attestation) attestations;
    }

    /// @notice Returns the storage layout for the attestation module
    /// @return ds The storage layout struct
    function getLayout() internal pure returns (Layout storage ds) {
        assembly {
            ds.slot := STORAGE_SLOT
        }
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                     Internal Functions                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Creates a new attestation
    /// @param attester The address creating the attestation
    /// @param value The ETH value to send with the attestation
    /// @param request The attestation request data
    /// @return attestation The created attestation
    function attest(
        address attester,
        uint256 value,
        AttestationRequest memory request
    ) internal returns (Attestation memory attestation) {
        AttestationRequestData[] memory data = new AttestationRequestData[](1);
        data[0] = request.data;
        (, bytes32[] memory uids) = _attest(request.schema, data, attester, value, true);
        return getAttestation(uids[0]);
    }

    /// @notice Revokes an existing attestation
    /// @param schemaId The schema ID of the attestation to revoke
    /// @param request The revocation request data
    /// @param revoker The address revoking the attestation
    /// @param availableValue The available ETH value for the revocation
    /// @param last Whether this is the last revocation in a batch
    function revoke(
        bytes32 schemaId,
        RevocationRequestData memory request,
        address revoker,
        uint256 availableValue,
        bool last
    ) internal {
        RevocationRequestData[] memory requests = new RevocationRequestData[](1);
        requests[0] = request;
        _revoke(schemaId, requests, revoker, availableValue, last);
    }

    /// @notice Retrieves an attestation by its UID
    /// @param uid The unique identifier of the attestation
    /// @return The attestation data
    function getAttestation(bytes32 uid) internal view returns (Attestation memory) {
        return getLayout().attestations[uid];
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
            SchemaLib.InvalidSchema.selector.revertWith();
        }

        if (address(resolver) == address(0)) {
            if (value != 0) IAttestationRegistryBase.NotPayable.selector.revertWith();
            if (last) _refund(availableValue);
            return 0;
        }

        if (value != 0) {
            if (!resolver.isPayable()) IAttestationRegistryBase.NotPayable.selector.revertWith();
            if (value > availableValue) {
                IAttestationRegistryBase.InsufficientBalance.selector.revertWith();
            }

            unchecked {
                availableValue -= value;
            }
        }

        if (isRevocation) {
            if (!resolver.revoke{value: value}(attestation)) {
                IAttestationRegistryBase.InvalidRevocation.selector.revertWith();
            }
        } else if (!resolver.attest{value: value}(attestation)) {
            IAttestationRegistryBase.InvalidAttestation.selector.revertWith();
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
            if (!isPayable) IAttestationRegistryBase.NotPayable.selector.revertWith();
            // Ensure sufficient balance for this attestation
            if (val > availableValue)
                IAttestationRegistryBase.InsufficientBalance.selector.revertWith();
            // Safe arithmetic: subtract from available and add to total
            unchecked {
                availableValue -= val;
                totalUsedValue += val;
            }
        }

        // Process either revocation or attestation for multiple items
        if (isRevocation) {
            if (!resolver.multiRevoke{value: totalUsedValue}(attestations, values)) {
                IAttestationRegistryBase.InvalidRevocation.selector.revertWith();
            }
        } else if (!resolver.multiAttest{value: totalUsedValue}(attestations, values)) {
            IAttestationRegistryBase.InvalidAttestation.selector.revertWith();
        }

        // The 'last' parameter indicates this is the final batch in a sequence of operations.
        // When true, any remaining ETH should be refunded to the sender.
        // This is important because:
        // 1. Multiple batches might be processed in sequence
        // 2. We want to refund unused ETH only after all batches are complete
        // 3. Prevents unnecessary gas costs from multiple refunds
        if (last) _refund(availableValue);

        return totalUsedValue;
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
            if (values[i] != 0) IAttestationRegistryBase.NotPayable.selector.revertWith();
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
    function _attest(
        bytes32 schemaId,
        AttestationRequestData[] memory requests,
        address attester,
        uint256 availableValue,
        bool last
    ) private returns (uint256 usedValue, bytes32[] memory uids) {
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
                IAttestationRegistryBase.InvalidExpirationTime.selector.revertWith();
            }

            if (!schema.revocable && request.revocable) {
                IAttestationRegistryBase.Irrevocable.selector.revertWith();
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

            _checkRefUID(db.attestations[request.refUID], request.refUID);

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
    function _revoke(
        bytes32 schemaId,
        RevocationRequestData[] memory requests,
        address revoker,
        uint256 availableValue,
        bool last
    ) private returns (uint256) {
        SchemaRecord memory schema = SchemaLib.getSchema(schemaId);
        if (schema.uid == EMPTY_UID) SchemaLib.InvalidSchema.selector.revertWith();

        uint256 len = requests.length;
        Attestation[] memory attestations = new Attestation[](len);
        uint256[] memory values = new uint256[](len);

        Layout storage db = getLayout();

        for (uint256 i; i < len; ++i) {
            Attestation storage attestation = db.attestations[requests[i].uid];
            _revokeAttestation(attestation, schemaId, revoker);
            attestations[i] = attestation;
            values[i] = requests[i].value;
        }

        return _resolveAttestations(schema, attestations, values, true, availableValue, last);
    }

    function _revokeAttestation(
        Attestation storage self,
        bytes32 schemaId,
        address revoker
    ) private {
        if (self.uid == EMPTY_UID)
            IAttestationRegistryBase.InvalidAttestation.selector.revertWith();
        if (self.schema != schemaId) SchemaLib.InvalidSchema.selector.revertWith();
        if (self.attester != revoker) IAttestationRegistryBase.InvalidRevoker.selector.revertWith();
        if (!self.revocable) IAttestationRegistryBase.Irrevocable.selector.revertWith();
        if (self.revocationTime != 0)
            IAttestationRegistryBase.InvalidRevocation.selector.revertWith();

        self.revocationTime = uint64(block.timestamp);

        emit IEAS.Revoked(self.recipient, self.attester, self.uid, self.schema);
    }

    /// @notice Validates that a referenced attestation UID exists
    /// @param self The attestation to check
    /// @param refUID The reference UID to check
    function _checkRefUID(Attestation storage self, bytes32 refUID) private view {
        if (refUID != EMPTY_UID && self.uid == EMPTY_UID) {
            NotFound.selector.revertWith();
        }
    }

    /// @notice Generates a unique hash for an attestation
    /// @param self The attestation to hash
    /// @param bump Counter to handle hash collisions
    /// @return The unique hash for the attestation
    function _hashAttestation(Attestation memory self, uint32 bump) private pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    self.schema,
                    self.recipient,
                    self.attester,
                    self.time,
                    self.expirationTime,
                    self.revocable,
                    self.refUID,
                    self.data,
                    bump
                )
            );
    }

    /// @notice Refunds any remaining ETH value to the sender
    /// @param value The amount to refund
    function _refund(uint256 value) private {
        if (value > 0) {
            SafeTransferLib.safeTransferETH(msg.sender, value);
        }
    }
}
