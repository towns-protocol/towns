// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// contracts

library PartnerRegistryStorage {
    struct Partner {
        address recipient;
        uint256 fee; // fee in basis points
        uint256 createdAt;
        bool active;
    }

    struct PartnerSettings {
        uint256 registryFee; // fee in ether
        uint256 maxPartnerFee; // fee in basis points
    }

    struct Layout {
        EnumerableSet.AddressSet partners;
        PartnerSettings partnerSettings;
        mapping(address account => Partner) partnerByAccount;
    }

    // keccak256(abi.encode(uint256(keccak256("spaces.facets.partner.registry.storage")) - 1)) &
    // ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0x7b5ecdde71ed61c776cb15819e7e4ea6887ef4293a4dfb12ecb38ffd92c3f400;

    function layout() internal pure returns (Layout storage ds) {
        assembly {
            ds.slot := STORAGE_SLOT
        }
    }
}
