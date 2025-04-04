// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {DataTypes} from "./DataTypes.sol";
import {IAttestationRegistry} from "./interfaces/IAttestationRegistry.sol";
import {IERC6900ExtensionRegistry} from "./interfaces/IERC6900ExtensionRegistry.sol";
import {AttestationLib} from "./libraries/AttestationLib.sol";
import {TrustedLib} from "./libraries/TrustedLib.sol";

contract AttestationRegistry is IAttestationRegistry, IERC6900ExtensionRegistry {
    function __AttestationRegistry_init() external {}

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*            IERC6900ExtensionRegistry Implementation        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IERC6900ExtensionRegistry
    function trustAttesters(uint8 threshold, address[] calldata attesters) external {
        TrustedLib.trustAttesters(threshold, attesters);
    }

    /// @inheritdoc IERC6900ExtensionRegistry
    function check(address module) external view {
        TrustedLib.check(msg.sender, module);
    }

    /// @inheritdoc IERC6900ExtensionRegistry
    function checkForAccount(address account, address module) external view {
        TrustedLib.check(account, module);
    }

    /// @inheritdoc IERC6900ExtensionRegistry
    function check(address module, address[] calldata attesters, uint256 threshold) external view {
        TrustedLib.check(module, attesters, threshold);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                     Attestation Management                   */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

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
