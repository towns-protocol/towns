// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IAttestationRegistry} from "./interfaces/IAttestationRegistry.sol";

// libraries
import {DataTypes} from "./DataTypes.sol";
import {AttestationLib} from "./libraries/AttestationLib.sol";

contract AttestationRegistry is IAttestationRegistry {
    function __AttestationRegistry_init() external {}

    /// @notice Create a new attestation
    /// @param request The attestation request data
    /// @return The UID of the created attestation
    function attest(DataTypes.AttestationRequest memory request)
        external
        payable
        returns (bytes32)
    {
        DataTypes.Attestation memory attestation =
            AttestationLib.attest(request.schemaId, request.data, msg.sender, msg.value, true);

        return attestation.uid;
    }

    /// @notice Revoke an existing attestation
    /// @param request The revocation request data
    function revoke(DataTypes.RevocationRequest memory request) external payable {
        AttestationLib.revoke(request.schemaId, request.data, msg.sender, msg.value, true);
    }

    /// @notice Get an attestation by its UID
    /// @param uid The attestation UID
    /// @return The attestation data
    function getAttestation(bytes32 uid) external view returns (DataTypes.Attestation memory) {
        return AttestationLib.getAttestation(uid);
    }
}
