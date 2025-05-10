// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IAttestationRegistry} from "./IAttestationRegistry.sol";

// libraries
import {AttestationBase} from "./AttestationBase.sol";

// contracts

import {Attestation} from "@ethereum-attestation-service/eas-contracts/Common.sol";
import {AttestationRequest, RevocationRequest} from "@ethereum-attestation-service/eas-contracts/IEAS.sol";
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";

/**
 * @title Attestation Registry
 * @notice A registry for creating, revoking, and retrieving attestations
 * @dev Implementation of the IAttestationRegistry interface using the diamond pattern
 * Serves as a facet in the Towns Protocol diamond architecture
 */
contract AttestationRegistry is IAttestationRegistry, AttestationBase, Facet {
    /**
     * @notice Initializes the attestation registry contract
     * @dev This function can only be called during diamond initialization
     */
    function __AttestationRegistry_init() external onlyInitializing {}

    /**
     * @notice Creates a new attestation
     * @dev Calls the internal _attest function with the sender's address and provided value
     * @param request The attestation request containing all necessary data for the attestation
     * @return The UID of the created attestation
     */
    function attest(AttestationRequest calldata request) external payable returns (bytes32) {
        return _attest(msg.sender, msg.value, request).uid;
    }

    /**
     * @notice Revokes an existing attestation
     * @dev Calls the internal _revoke function with the sender's address and provided value
     * The sender must be the original attester of the attestation
     * @param request The revocation request containing schema ID and attestation data
     */
    function revoke(RevocationRequest calldata request) external payable {
        _revoke(request.schema, request.data, msg.sender, msg.value, true);
    }

    /**
     * @notice Retrieves an attestation by its UID
     * @dev Forwards the call to the internal _getAttestation function
     * @param uid The unique identifier of the attestation to retrieve
     * @return The complete attestation data structure
     */
    function getAttestation(bytes32 uid) external view returns (Attestation memory) {
        return _getAttestation(uid);
    }
}
