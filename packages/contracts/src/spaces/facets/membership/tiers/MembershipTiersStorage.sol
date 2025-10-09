// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

library MembershipTiersStorage {
    // keccak256(abi.encode(uint256(keccak256("spaces.facets.membership.tiers.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0x24df5917582130a990a9cec421e9000cead8827f03fafdbdcfc370e882227800;

    struct TierPricing {
        uint256 price;
        uint64 duration;
        address currency;
        address pricingModule;
    }

    struct TierConfig {
        bytes32 metadataHash;
        uint256 maxSupply;
        uint256 totalMinted;
    }

    struct TierState {
        TierConfig config;
        TierPricing[] pricing;
        uint16 tierId;
        bool disabled;
    }

    struct Layout {
        uint16 tierId;
        mapping(uint16 tierId => TierState) tiers;
        mapping(uint256 tokenId => uint16 tierId) tierOfTokenId;
    }

    function getLayout() internal pure returns (Layout storage $) {
        assembly {
            $.slot := STORAGE_SLOT
        }
    }

    function nextTierId() internal view returns (uint16) {
        uint16 tierId = getLayout().tierId;
        return ++tierId;
    }
}
