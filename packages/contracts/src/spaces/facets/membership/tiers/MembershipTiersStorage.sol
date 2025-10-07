// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IMembershipTiersBase} from "./IMembershipTiers.sol";

// libraries
import {CurrencyTransfer} from "../../../../utils/libraries/CurrencyTransfer.sol";

// contracts

library MembershipTiersStorage {
    // keccak256(abi.encode(uint256(keccak256("spaces.facets.membership.tiers.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0x24df5917582130a990a9cec421e9000cead8827f03fafdbdcfc370e882227800;

    struct TierPricing {
        uint256 price;
        uint64 duration;
        address currency;
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

    function getTier(uint16 tierId) internal view returns (IMembershipTiersBase.Tier memory tier) {
        TierState storage tierState = getLayout().tiers[tierId];
        if (tierState.tierId == 0) return tier;
        return
            IMembershipTiersBase.Tier({
                metadata: string(abi.encodePacked(tierState.config.metadataHash)),
                price: tierState.pricing[0].price,
                duration: tierState.pricing[0].duration,
                currency: tierState.pricing[0].currency,
                totalSupply: tierState.config.totalMinted
            });
    }

    function setTierStatus(TierState storage tier, bool disabled) internal {
        tier.disabled = disabled;
    }

    function setTierPricing(
        TierState storage tier,
        uint256 price,
        uint64 duration,
        address currency
    ) internal {
        if (currency == address(0)) currency = CurrencyTransfer.NATIVE_TOKEN;

        TierPricing memory pricing = TierPricing({
            price: price,
            duration: duration,
            currency: currency
        });

        if (tier.pricing.length > 0) tier.pricing.pop();

        tier.pricing.push(pricing);
        emit IMembershipTiersBase.TierPricingUpdated(tier.tierId, price, duration, currency);
    }

    function setTierMetadata(TierState storage tier, string calldata metadata) internal {
        tier.config.metadataHash = keccak256(bytes(metadata));
        emit IMembershipTiersBase.TierMetadataUpdated(tier.tierId, metadata);
    }
}
