// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

library MembershipTiersStorage {
    // keccak256(abi.encode(uint256(keccak256("spaces.facets.membership.tiers.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0x24df5917582130a990a9cec421e9000cead8827f03fafdbdcfc370e882227800;

    struct Tier {
        string name;
        uint256 basePrice;
        uint256 maxSupply;
        uint64 duration;
        uint256 freeAllocation;
        address pricingModule;
        uint256 minted;
        string image;
        bool disabled;
    }

    struct Layout {
        uint32 nextTierId;
        mapping(uint32 => Tier) tiers; // tierId ⇒ Tier
        mapping(uint256 => uint32) tierOfToken; // tokenId ⇒ tierId
    }

    function getLayout() internal pure returns (Layout storage ds) {
        assembly {
            ds.slot := STORAGE_SLOT
        }
    }
}
