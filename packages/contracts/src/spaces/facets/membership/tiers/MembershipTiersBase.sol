// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IMembershipTiersBase} from "./IMembershipTiers.sol";
import {IMembershipPricing} from "src/spaces/facets/membership/pricing/IMembershipPricing.sol";

// libraries
import {MembershipStorage} from "src/spaces/facets/membership/MembershipStorage.sol";
import {MembershipTiersStorage, MembershipTier} from "src/spaces/facets/membership/tiers/MembershipTiersStorage.sol";
import {MembershipPlatformUtils} from "src/spaces/facets/membership/MembershipPlatformUtils.sol";
import {IPlatformRequirements} from "src/factory/facets/platform/requirements/IPlatformRequirements.sol";
import {IPricingModules} from "src/factory/facets/architect/pricing/IPricingModules.sol";
import {CustomRevert} from "src/utils/libraries/CustomRevert.sol";

// contracts
import {MembershipBase} from "src/spaces/facets/membership/MembershipBase.sol";
import {ERC721ABase} from "src/diamond/facets/token/ERC721A/ERC721ABase.sol";

abstract contract MembershipTiersBase is MembershipBase, IMembershipTiersBase, ERC721ABase {
    using MembershipPlatformUtils for IPlatformRequirements;
    using CustomRevert for bytes4;

    function _createTier(
        MembershipTier calldata params
    ) internal returns (MembershipTier memory tier) {
        tier = _checkTier(params);
        tier.active = true;

        MembershipTiersStorage.Layout storage $ = MembershipTiersStorage.getLayout();

        uint32 tierId = ++$.tierId;
        $.tiers[tierId] = tier;

        emit MembershipTierCreated(tierId);
    }

    function _updateTier(uint32 tierId, MembershipTier calldata params) internal {
        if (tierId == 0) MembershipTier__InvalidTierId.selector.revertWith();

        MembershipTiersStorage.Layout storage $ = MembershipTiersStorage.getLayout();
        MembershipTier memory tier = $.tiers[tierId];

        if (!tier.active) MembershipTier__DoesNotExist.selector.revertWith();

        bool active = tier.active;

        tier = _checkTier(params);
        tier.maxSupply = _checkMinSupply(params.maxSupply, tier.maxSupply);
        tier.active = active;
        $.tiers[tierId] = tier;

        emit MembershipTierUpdated(tierId);
    }

    function _disableTier(uint32 tierId) internal {
        if (tierId == 0) MembershipTier__InvalidTierId.selector.revertWith();
        MembershipTiersStorage.Layout storage $ = MembershipTiersStorage.getLayout();
        MembershipTier storage tier = $.tiers[tierId];
        if (tier.pricingModule == address(0)) MembershipTier__DoesNotExist.selector.revertWith();
        if (!tier.active) MembershipTier__TierNotActive.selector.revertWith();
        tier.active = false;
        emit MembershipTierUpdated(tierId);
    }

    function _mintTier(uint32 tierId, address to, uint256 quantity, uint256 tokenId) internal {
        if (tierId == 0) return;
        MembershipTiersStorage.Layout storage $ = MembershipTiersStorage.getLayout();
        MembershipTier storage tier = $.tiers[tierId];

        _verifyTierSupplyAvailable(tierId);
        $.totalSupplyByTierId[tierId] += quantity;
        $.tierOfTokenId[tokenId] = tierId;
        emit MembershipTierMinted(tierId, to, quantity);
    }

    function _currentTierId() internal view returns (uint32) {
        return MembershipTiersStorage.getLayout().tierId;
    }

    function _getTier(uint32 tierId) internal view returns (MembershipTier memory) {
        if (tierId == 0) {
            return
                MembershipTier({
                    active: true,
                    duration: _getMembershipDuration(),
                    pricingModule: MembershipStorage.layout().pricingModule,
                    metadata: "Membership",
                    basePrice: _getMembershipPrice(_totalSupply()),
                    maxSupply: _getMembershipSupplyLimit(),
                    freeSupply: _getMembershipFreeAllocation()
                });
        }

        return MembershipTiersStorage.getLayout().tiers[tierId];
    }

    function _getTierOfTokenId(uint256 tokenId) internal view returns (uint32) {
        return MembershipTiersStorage.getLayout().tierOfTokenId[tokenId];
    }

    function _getTierPrice(uint32 tierId) internal view returns (uint256) {
        if (tierId == 0) return _getMembershipPrice(_totalSupply());

        MembershipTiersStorage.Layout storage $ = MembershipTiersStorage.getLayout();
        MembershipTier storage tier = $.tiers[tierId];
        if (tier.pricingModule != address(0)) {
            return
                IMembershipPricing(tier.pricingModule).getPrice(
                    tier.freeSupply,
                    $.totalSupplyByTierId[tierId]
                );
        } else {
            return tier.basePrice;
        }
    }

    function _verifyTierSupplyAvailable(uint32 tierId) internal view {
        if (tierId == 0) {
            // For tier 0, check against totalSupply and membership supply limit
            uint256 maxSupply = MembershipStorage.layout().membershipMaxSupply;
            if (maxSupply != 0 && _totalSupply() >= maxSupply) {
                MembershipTier__MaxSupplyReached.selector.revertWith();
            }
            return;
        }

        MembershipTiersStorage.Layout storage $ = MembershipTiersStorage.getLayout();
        MembershipTier storage t = $.tiers[tierId];
        if (!t.active) MembershipTier__TierNotActive.selector.revertWith();
        if (t.maxSupply != 0 && $.totalSupplyByTierId[tierId] >= t.maxSupply) {
            MembershipTier__MaxSupplyReached.selector.revertWith();
        }
    }

    function _checkTier(
        MembershipTier calldata params
    ) internal view returns (MembershipTier memory tier) {
        tier.maxSupply = _checkMaxSupply(params.maxSupply, _totalSupply());

        address spaceFactory = MembershipStorage.layout().spaceFactory;
        IPricingModules pricingModules = IPricingModules(spaceFactory);
        tier.pricingModule = _checkPricingModule(pricingModules, params.pricingModule);

        IPlatformRequirements platform = IPlatformRequirements(spaceFactory);
        (tier.basePrice, tier.freeSupply, tier.duration) = (
            platform.checkPrice(params.basePrice),
            platform.checkFreeAllocation(params.freeSupply),
            platform.checkDuration(params.duration)
        );
    }

    // Max Supply
    function _checkMaxSupply(uint256 limit, uint256 totalSupply) internal pure returns (uint256) {
        if (limit > totalSupply) MembershipTier__InvalidMaxSupply.selector.revertWith();
        return limit;
    }

    // Min Supply
    function _checkMinSupply(uint256 limit, uint256 totalSupply) internal pure returns (uint256) {
        if (limit < totalSupply) MembershipTier__InvalidLimit.selector.revertWith();
        return limit;
    }

    function _checkPricingModule(
        IPricingModules pricingModules,
        address pricingModule
    ) internal view returns (address) {
        if (pricingModule == address(0)) return address(0);
        if (!pricingModules.isPricingModule(pricingModule))
            MembershipTier__InvalidPricingModule.selector.revertWith();
        return pricingModule;
    }
}
