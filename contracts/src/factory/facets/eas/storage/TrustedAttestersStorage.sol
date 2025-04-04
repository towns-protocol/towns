// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {DataTypes} from "../DataTypes.sol";

library TrustedAttestersStorage {
    // keccak256(abi.encode(uint256(keccak256("towns.facets.app.trusted.attesters.storage")) - 1)) &
    // ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0xf7c8abf756398d5b6bc8f3e1c60d6bda9e1fce0b0545bb357c6696b1787c6a00;

    struct Layout {
        mapping(address account => DataTypes.TrustedAttester trustedAttester) trustedAttesters;
    }

    function getLayout() internal pure returns (Layout storage db) {
        assembly {
            db.slot := STORAGE_SLOT
        }
    }
}
