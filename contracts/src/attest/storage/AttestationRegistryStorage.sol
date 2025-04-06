// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Attestation} from "@ethereum-attestation-service/eas-contracts/Common.sol";

library AttestationRegistryStorage {
    // keccak256(abi.encode(uint256(keccak256("towns.facets.app.attestation.registry.storage")) -
    // 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0xfc0e1c85b553f209fb54896ddd4c6d453ebe8ec305bb40d481b6440167132e00;

    struct Layout {
        mapping(bytes32 uid => Attestation attestation) attestations;
    }

    function getLayout() internal pure returns (Layout storage ds) {
        assembly {
            ds.slot := STORAGE_SLOT
        }
    }
}
