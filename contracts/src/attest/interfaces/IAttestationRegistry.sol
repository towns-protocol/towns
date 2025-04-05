// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {DataTypes} from "../types/DataTypes.sol";

// libraries

// contracts

/// @title IAttestationRegistry Interface
/// @notice Interface for managing attestations in the registry
interface IAttestationRegistry {
    /// @notice Creates a new attestation
    /// @param request The attestation request containing schema ID and attestation data
    /// @return The UID of the created attestation
    function attest(DataTypes.AttestationRequest calldata request)
        external
        payable
        returns (bytes32);

    /// @notice Revokes an existing attestation
    /// @param request The revocation request containing schema ID and attestation data
    function revoke(DataTypes.RevocationRequest calldata request) external payable;

    /// @notice Retrieves an attestation by its UID
    /// @param uid The unique identifier of the attestation
    /// @return The attestation data structure
    function getAttestation(bytes32 uid) external view returns (DataTypes.Attestation memory);
}
