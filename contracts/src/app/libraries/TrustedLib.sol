// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC6900ExtensionRegistry} from "../interfaces/IERC6900ExtensionRegistry.sol";
// libraries

import {TrustedAttestersStorage} from "../storage/TrustedAttestersStorage.sol";
import {DataTypes} from "../types/DataTypes.sol";
import {AttestationLib} from "./AttestationLib.sol";
import {CustomRevert} from "contracts/src/utils/libraries/CustomRevert.sol";
import {LibSort} from "solady/utils/LibSort.sol";

// contracts

/// @title TrustedLib
/// @notice Library for managing trusted attesters and verifying attestations
/// @dev Provides functionality to store and verify trusted attesters for accounts
library TrustedLib {
    using LibSort for address[];
    using CustomRevert for bytes4;

    /// @notice Stores trusted attesters and their threshold for an account
    /// @dev Attesters must be sorted and unique. The first attester is stored separately and
    /// subsequent attesters are stored in a linked list
    /// @param threshold The minimum number of attestations required from trusted attesters
    /// @param attesters Array of attester addresses, must be sorted and unique
    /// @custom:events Emits NewTrustedAttesters when attesters are successfully stored
    /// @custom:errors InvalidAttesters if attesters array is invalid (empty, too long, unsorted,
    /// non-unique, or contains zero address)
    /// @custom:errors InvalidThreshold if threshold is greater than number of attesters
    function trustAttesters(uint8 threshold, address[] calldata attesters) internal {
        uint256 len = attesters.length;

        if (!attesters.isSortedAndUniquified()) {
            DataTypes.InvalidAttesters.selector.revertWith();
        }

        if (len == 0 || len > type(uint8).max) {
            DataTypes.InvalidAttesters.selector.revertWith();
        }

        if (attesters.length != len) {
            DataTypes.InvalidAttesters.selector.revertWith();
        }

        if (attesters[0] == address(0)) {
            DataTypes.InvalidAttesters.selector.revertWith();
        }

        if (threshold > len) {
            DataTypes.InvalidThreshold.selector.revertWith();
        }

        TrustedAttestersStorage.Layout storage db = TrustedAttestersStorage.getLayout();
        DataTypes.TrustedAttester storage trustedAttester = db.trustedAttesters[msg.sender];

        (trustedAttester.count, trustedAttester.threshold, trustedAttester.attester) =
            (uint8(len), threshold, attesters[0]);

        for (uint256 i; i < len - 1; ++i) {
            address attester = attesters[i];
            trustedAttester.linkedAttesters[attester][msg.sender] = attesters[i + 1];
        }

        emit IERC6900ExtensionRegistry.NewTrustedAttesters(msg.sender);
    }

    function check(address account, address module) internal view {
        TrustedAttestersStorage.Layout storage db = TrustedAttestersStorage.getLayout();

        DataTypes.TrustedAttester storage trustedAttester = db.trustedAttesters[account];

        (uint8 attesterCount, uint8 threshold, address attester) =
            (trustedAttester.count, trustedAttester.threshold, trustedAttester.attester);

        if (attester == address(0) || threshold == 0) {
            DataTypes.NoTrustedAttestersFound.selector.revertWith();
        } else if (threshold == 1) {
            DataTypes.Attestation memory attestation =
                AttestationLib.getAttestation(module, attester);

            if (AttestationLib.checkValid(attestation)) return;

            for (uint256 i; i < attesterCount; ++i) {
                attester = trustedAttester.linkedAttesters[attester][account];
                attestation = AttestationLib.getAttestation(module, attester);
                if (AttestationLib.checkValid(attestation)) return;
            }

            DataTypes.InsufficientAttestations.selector.revertWith();
        } else {
            DataTypes.Attestation memory attestation =
                AttestationLib.getAttestation(module, attester);
            if (AttestationLib.checkValid(attestation)) return;

            for (uint256 i; i < attesterCount; ++i) {
                attester = trustedAttester.linkedAttesters[attester][account];
                attestation = AttestationLib.getAttestation(module, attester);
                if (AttestationLib.checkValid(attestation)) threshold--;
                if (threshold == 0) return;
            }
            if (threshold > 0) {
                DataTypes.InsufficientAttestations.selector.revertWith();
            }
        }
    }

    function check(address module, address[] calldata attesters, uint256 threshold) internal view {
        uint256 len = attesters.length;
        if (len == 0 || threshold == 0) {
            DataTypes.NoTrustedAttestersFound.selector.revertWith();
        } else if (len < threshold) {
            DataTypes.InsufficientAttestations.selector.revertWith();
        }

        address cache;
        for (uint256 i; i < len; ++i) {
            address attester = attesters[i];
            if (attester <= cache) DataTypes.InvalidAttesters.selector.revertWith();
            else cache = attester;

            DataTypes.Attestation memory attestation =
                AttestationLib.getAttestation(module, attester);

            if (AttestationLib.checkValid(attestation)) {
                --threshold;
                if (threshold == 0) return;
            }
        }
        DataTypes.InsufficientAttestations.selector.revertWith();
    }

    function findTrustedAttesters(address account)
        internal
        view
        returns (address[] memory attesters)
    {
        TrustedAttestersStorage.Layout storage db = TrustedAttestersStorage.getLayout();

        DataTypes.TrustedAttester storage trustedAttesters = db.trustedAttesters[account];

        uint256 len = trustedAttesters.count;
        address firstAttester = trustedAttesters.attester;

        if (len == 0) return attesters;

        attesters = new address[](len);
        attesters[0] = firstAttester;

        for (uint256 i = 1; i < len; ++i) {
            attesters[i] = trustedAttesters.linkedAttesters[attesters[i - 1]][account];
        }
    }
}
