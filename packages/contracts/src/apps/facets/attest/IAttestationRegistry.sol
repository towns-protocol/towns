// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

import {Attestation} from "@ethereum-attestation-service/eas-contracts/Common.sol";
import {AttestationRequest, RevocationRequest} from "@ethereum-attestation-service/eas-contracts/IEAS.sol";
// libraries

// contracts

/**
 * @title IAttestationRegistryBase Interface
 * @notice Base interface defining errors for attestation operations
 * @dev Contains error definitions that can be thrown during attestation operations
 */
interface IAttestationRegistryBase {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           ERRORS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /**
     * @dev Thrown when ETH is sent to a function that doesn't accept payments
     */
    error NotPayable();

    /**
     * @dev Thrown when there's insufficient ETH balance for an operation
     */
    error InsufficientBalance();

    /**
     * @dev Thrown when an invalid revocation attempt is made
     */
    error InvalidRevocation();

    /**
     * @dev Thrown when referencing an attestation that doesn't exist
     */
    error InvalidAttestation();

    /**
     * @dev Thrown when an attestation schema is invalid or doesn't exist
     */
    error InvalidAttestationSchema();

    /**
     * @dev Thrown when an attestation has an invalid expiration time
     */
    error InvalidExpirationTime();

    /**
     * @dev Thrown when trying to revoke an irrevocable attestation
     */
    error Irrevocable();

    /**
     * @dev Thrown when the revoker is not authorized to revoke an attestation
     */
    error InvalidRevoker();
}

/**
 * @title IAttestationRegistry Interface
 * @notice Interface for creating, revoking, and retrieving attestations
 * @dev Extends the base interface with core attestation functionality
 */
interface IAttestationRegistry is IAttestationRegistryBase {
    /**
     * @notice Creates a new attestation
     * @dev May accept ETH payments if the attestation's schema has a payable resolver
     * @param request The attestation request containing schema ID and attestation data
     * @return The UID of the created attestation
     */
    function attest(AttestationRequest calldata request) external payable returns (bytes32);

    /**
     * @notice Revokes an existing attestation
     * @dev Only the original attester can revoke their attestations
     * May accept ETH payments if the attestation's schema has a payable resolver
     * @param request The revocation request containing schema ID and attestation data
     */
    function revoke(RevocationRequest calldata request) external payable;

    /**
     * @notice Retrieves an attestation by its UID
     * @dev Returns the full attestation data structure
     * @param uid The unique identifier of the attestation
     * @return The attestation data structure
     */
    function getAttestation(bytes32 uid) external view returns (Attestation memory);
}
