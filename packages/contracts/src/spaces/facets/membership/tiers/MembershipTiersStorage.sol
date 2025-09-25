// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces

// libraries

// contracts

struct MembershipTier {
    bool active;
    uint64 duration;
    address pricingModule;
    string metadata;
    uint256 basePrice;
    uint256 maxSupply;
    uint256 freeSupply; // REMOVE
}

library MembershipTiersStorage {
    // keccak256(abi.encode(uint256(keccak256("spaces.facets.membership.tiers.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0x24df5917582130a990a9cec421e9000cead8827f03fafdbdcfc370e882227800;

    struct Layout {
        uint32 tierId;
        mapping(uint32 => uint256) totalSupplyByTierId;
        mapping(uint32 => MembershipTier) tiers;
        mapping(uint256 => uint32) tierOfTokenId;
    }

    function getLayout() internal pure returns (Layout storage l) {
        assembly {
            l.slot := STORAGE_SLOT
        }
    }
}
