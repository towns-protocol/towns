// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IAttestationRegistryBase} from "./IAttestationRegistry.sol";

// types
import {Attestation, EMPTY_UID} from "@ethereum-attestation-service/eas-contracts/Common.sol";
import {IEAS} from "@ethereum-attestation-service/eas-contracts/IEAS.sol";

// libraries
import {CustomRevert} from "src/utils/libraries/CustomRevert.sol";

// contracts

/**
 * @title AttestationLib
 * @notice Library providing utility functions for working with attestations
 * @dev Contains validation, manipulation, and utility functions for the Attestation struct
 */
library AttestationLib {
    using CustomRevert for bytes4;
    using AttestationLib for Attestation;

    /**
     * @notice Revokes an attestation
     * @dev Validates that the attestation meets the requirements for revocation and updates its state
     * @param self The attestation storage reference to revoke
     * @param schemaId The schema ID that must match the attestation's schema
     * @param revoker The address attempting to revoke the attestation, must be the original attester
     */
    function revoke(Attestation storage self, bytes32 schemaId, address revoker) internal {
        if (self.uid == EMPTY_UID)
            IAttestationRegistryBase.InvalidAttestation.selector.revertWith();
        if (self.schema != schemaId)
            IAttestationRegistryBase.InvalidAttestationSchema.selector.revertWith();
        if (self.attester != revoker) IAttestationRegistryBase.InvalidRevoker.selector.revertWith();
        if (!self.revocable) IAttestationRegistryBase.Irrevocable.selector.revertWith();
        if (self.revocationTime != 0)
            IAttestationRegistryBase.InvalidRevocation.selector.revertWith();

        self.revocationTime = uint64(block.timestamp);

        emit IEAS.Revoked(self.recipient, self.attester, self.uid, self.schema);
    }

    /**
     * @notice Validates that a referenced attestation UID exists
     * @dev Ensures that a reference to an attestation is valid when creating a new attestation
     * @param self The attestation to check
     * @param refUID The reference UID to validate
     */
    function checkRefUID(Attestation storage self, bytes32 refUID) internal view {
        if (refUID != EMPTY_UID && self.uid == EMPTY_UID) {
            IAttestationRegistryBase.InvalidAttestation.selector.revertWith();
        }
    }

    /**
     * @notice Generates a unique hash for an attestation
     * @dev Creates a deterministic UID for an attestation by hashing its contents with a nonce
     * @param self The attestation to hash
     * @param nonce The nonce to handle hash collisions
     * @return The unique hash for the attestation
     */
    function getUID(Attestation memory self, uint32 nonce) internal pure returns (bytes32) {
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
                    nonce
                )
            );
    }
}
