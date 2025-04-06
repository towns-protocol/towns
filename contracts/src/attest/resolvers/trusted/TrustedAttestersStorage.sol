// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {DataTypes} from "../../types/DataTypes.sol";

import {EMPTY_UID} from "@ethereum-attestation-service/eas-contracts/Common.sol";
import {CustomRevert} from "contracts/src/utils/libraries/CustomRevert.sol";

library TrustedAttestersStorage {
    using CustomRevert for bytes4;

    // keccak256(abi.encode(uint256(keccak256("towns.facets.app.trusted.attesters.storage")) - 1)) &
    // ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0xf7c8abf756398d5b6bc8f3e1c60d6bda9e1fce0b0545bb357c6696b1787c6a00;

    struct Layout {
        mapping(address account => DataTypes.TrustedAttester trustedAttester) trustedAttesters;
        mapping(address recipient => mapping(address attester => bytes32 uid))
            attestationByAttesterByRecipient;
    }

    function saveAttestation(address recipient, address attester, bytes32 uid) internal {
        getLayout().attestationByAttesterByRecipient[recipient][attester] = uid;
    }

    function getAttestationId(
        address recipient,
        address attester
    )
        internal
        view
        returns (bytes32 uid)
    {
        uid = getLayout().attestationByAttesterByRecipient[recipient][attester];

        if (uid == EMPTY_UID) {
            DataTypes.InvalidAttestation.selector.revertWith();
        }
    }

    function getLayout() internal pure returns (Layout storage db) {
        assembly {
            db.slot := STORAGE_SLOT
        }
    }
}
