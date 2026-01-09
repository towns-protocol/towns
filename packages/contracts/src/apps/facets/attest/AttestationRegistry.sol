// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

// interfaces
import {IAttestationRegistry} from "./IAttestationRegistry.sol";

// libraries
import {AttestationBase} from "./AttestationBase.sol";

// contracts

import {Attestation} from "@ethereum-attestation-service/eas-contracts/Common.sol";
import {AttestationRequest, RevocationRequest} from "@ethereum-attestation-service/eas-contracts/IEAS.sol";
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";

/// @title Attestation Registry
/// @notice A registry for attestation requests
/// @dev This contract is used for implementation reference purposes
contract AttestationRegistry is IAttestationRegistry, AttestationBase, Facet {
    /// @notice Create a new attestation
    /// @param request The attestation request data
    /// @return The UID of the created attestation
    function attest(AttestationRequest calldata request) external payable returns (bytes32) {
        return _attest(msg.sender, msg.value, request).uid;
    }

    /// @notice Revoke an existing attestation
    /// @param request The revocation request data
    function revoke(RevocationRequest calldata request) external payable {
        _revoke(request.schema, request.data, msg.sender, msg.value, true);
    }

    /// @notice Get an attestation by its UID
    /// @param uid The attestation UID
    /// @return The attestation data
    function getAttestation(bytes32 uid) external view returns (Attestation memory) {
        return _getAttestation(uid);
    }
}
