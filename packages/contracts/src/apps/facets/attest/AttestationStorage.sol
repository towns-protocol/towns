// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {Attestation} from "@ethereum-attestation-service/eas-contracts/Common.sol";

library AttestationStorage {
    struct Layout {
        mapping(bytes32 uid => Attestation attestation) attestations;
    }

    // keccak256(abi.encode(uint256(keccak256("attestations.module.attestation.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0xb3faa0ced44596f3bee5bed62671ce37f7e9245f810f19748a1d69616f8f2b00;

    function setAttestation(bytes32 uid, Attestation memory attestation) internal {
        getLayout().attestations[uid] = attestation;
    }

    function getAttestation(bytes32 uid) internal view returns (Attestation memory) {
        return getLayout().attestations[uid];
    }

    /// @notice Returns the storage layout for the attestation module
    /// @return ds The storage layout struct
    function getLayout() internal pure returns (Layout storage ds) {
        assembly {
            ds.slot := STORAGE_SLOT
        }
    }
}
