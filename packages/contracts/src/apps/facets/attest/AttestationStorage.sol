// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {Attestation} from "@ethereum-attestation-service/eas-contracts/Common.sol";

/**
 * @title AttestationStorage
 * @notice Storage contract for attestation data
 * @dev Uses a dedicated storage slot pattern to ensure storage safety in the diamond pattern
 */
library AttestationStorage {
    // keccak256(abi.encode(uint256(keccak256("attestations.module.attestation.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0xb3faa0ced44596f3bee5bed62671ce37f7e9245f810f19748a1d69616f8f2b00;

    /**
     * @dev Storage layout for attestation data
     * @custom:storage-location Diamond storage pattern struct
     */
    struct Layout {
        /// @notice Mapping from attestation UID to attestation data
        mapping(bytes32 uid => Attestation attestation) attestations;
    }

    /**
     * @notice Returns the storage layout for the attestation module
     * @dev Uses assembly to access the specific storage slot
     * @return ds The storage layout struct
     */
    function getLayout() internal pure returns (Layout storage ds) {
        assembly {
            ds.slot := STORAGE_SLOT
        }
    }

    /**
     * @notice Retrieves an attestation by its UID
     * @param uid The unique identifier of the attestation to retrieve
     * @return The attestation data associated with the provided UID
     */
    function getAttestation(bytes32 uid) internal view returns (Attestation memory) {
        return getLayout().attestations[uid];
    }

    /**
     * @notice Stores an attestation in the contract storage
     * @param uid The unique identifier for the attestation
     * @param attestation The attestation data to store
     */
    function setAttestation(bytes32 uid, Attestation memory attestation) internal {
        getLayout().attestations[uid] = attestation;
    }
}
