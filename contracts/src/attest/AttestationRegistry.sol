// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IAttestationRegistry} from "./interfaces/IAttestationRegistry.sol";

// libraries
import {AttestationLib} from "./libraries/AttestationLib.sol";
import {DataTypes} from "./types/DataTypes.sol";

// contracts

import {Attestation} from "@ethereum-attestation-service/eas-contracts/Common.sol";
import {
    AttestationRequest,
    AttestationRequestData,
    RevocationRequest,
    RevocationRequestData
} from "@ethereum-attestation-service/eas-contracts/IEAS.sol";
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";

contract AttestationRegistry is IAttestationRegistry, Facet {
    function __AttestationRegistry_init() external onlyInitializing {}

    /// @notice Create a new attestation
    /// @param request The attestation request data
    /// @return The UID of the created attestation
    function attest(AttestationRequest memory request) external payable returns (bytes32) {
        Attestation memory attestation =
            AttestationLib.attest(request.schema, request.data, msg.sender, msg.value, true);

        return attestation.uid;
    }

    /// @notice Revoke an existing attestation
    /// @param request The revocation request data
    function revoke(RevocationRequest memory request) external payable {
        AttestationLib.revoke(request.schema, request.data, msg.sender, msg.value, true);
    }

    /// @notice Get an attestation by its UID
    /// @param uid The attestation UID
    /// @return The attestation data
    function getAttestation(bytes32 uid) external view returns (Attestation memory) {
        return AttestationLib.getAttestation(uid);
    }
}
