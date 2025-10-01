// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IMembershipTiersBase} from "./IMembershipTiers.sol";
import {IPlatformRequirements} from "../../../../factory/facets/platform/requirements/IPlatformRequirements.sol";

// libraries
import {CustomRevert} from "../../../../utils/libraries/CustomRevert.sol";
import {MembershipTiersStorage} from "./MembershipTiersStorage.sol";

// contracts
import {MembershipBase} from "../MembershipBase.sol";
import {ERC721ABase} from "../../../../diamond/facets/token/ERC721A/ERC721ABase.sol";

abstract contract MembershipTiersBase is IMembershipTiersBase, MembershipBase, ERC721ABase {
    using CustomRevert for bytes4;
    using MembershipTiersStorage for MembershipTiersStorage.TierState;

    uint256 internal constant MIN_METADATA_LENGTH = 1;
    uint256 internal constant MAX_METADATA_LENGTH = 100;

    function _createTier(CreateTier calldata request) internal returns (uint16) {
        _validateMetadata(request.metadata);
        _validatePrice(request.price);

        IPlatformRequirements platformReqs = _getPlatformRequirements();
        _validateDuration(request.duration, platformReqs);

        MembershipTiersStorage.Layout storage $ = MembershipTiersStorage.getLayout();
        uint16 tierId = ++$.tierId;

        MembershipTiersStorage.TierState storage tier = $.tiers[tierId];

        tier.tierId = tierId;
        tier.setTierPricing(request.price, request.duration, request.currency);
        tier.setTierMetadata(request.metadata);

        return tierId;
    }

    function _updateTier(uint16 tierId, CreateTier calldata request) internal {
        _validateMetadata(request.metadata);
        _validatePrice(request.price);

        IPlatformRequirements platformReqs = _getPlatformRequirements();
        _validateDuration(request.duration, platformReqs);

        MembershipTiersStorage.TierState storage tier = MembershipTiersStorage.getLayout().tiers[
            tierId
        ];
        if (tier.tierId == 0) MembershipTiers__TierNotFound.selector.revertWith();
        if (tier.disabled) MembershipTiers__TierDisabled.selector.revertWith();

        tier.setTierPricing(request.price, request.duration, request.currency);
        tier.setTierMetadata(request.metadata);
    }

    function _setTierStatus(uint16 tierId, bool disabled) internal {
        MembershipTiersStorage.TierState storage tier = MembershipTiersStorage.getLayout().tiers[
            tierId
        ];
        if (tier.tierId == 0) MembershipTiers__TierNotFound.selector.revertWith();
        tier.setTierStatus(disabled);
    }

    function _mintTier(uint256 tokenId, uint16 tierId) internal {
        MembershipTiersStorage.Layout storage $ = MembershipTiersStorage.getLayout();

        MembershipTiersStorage.TierState storage tier = $.tiers[tierId];
        $.tierOfTokenId[tokenId] = tierId;

        if (tier.tierId == 0 && tier.config.totalMinted == 0) {
            tier.config.totalMinted = _totalSupply();
        } else {
            tier.config.totalMinted++;
        }
    }

    function _getTier(uint16 tierId) internal view returns (Tier memory tier) {
        if (tierId == 0) return tier;
        return MembershipTiersStorage.getTier(tierId);
    }

    function _getTierDuration(uint16 tierId) internal view returns (uint64 duration) {
        if (tierId == 0) return _getMembershipDuration();
        return MembershipTiersStorage.getTier(tierId).duration;
    }

    function _getTierOfTokenId(uint256 tokenId) internal view returns (uint16 tierId) {
        if (!_exists(tokenId)) return 0;
        return MembershipTiersStorage.getLayout().tierOfTokenId[tokenId];
    }

    function _nextTierId() internal view returns (uint16) {
        return MembershipTiersStorage.nextTierId();
    }

    function _getTierPrice(uint16 tierId) internal view returns (uint256 tierPrice) {
        if (tierId == 0) return _getMembershipPrice(_totalSupply());
        tierPrice = _getTier(tierId).price;
        IPlatformRequirements platformReqs = _getPlatformRequirements();
        uint256 minPrice = platformReqs.getMembershipMinPrice();
        if (tierPrice < minPrice) return platformReqs.getMembershipFee();
        return tierPrice;
    }

    function _validatePrice(uint256 price) internal view {
        if (price == 0) MembershipTiers__InvalidPrice.selector.revertWith();

        uint256 minFee = _getPlatformRequirements().getMembershipFee();
        if (price < minFee) MembershipTiers__InvalidPrice.selector.revertWith();
    }

    function _validateMetadata(string memory metadata) internal pure {
        bytes memory metadataBytes = bytes(metadata);
        if (
            metadataBytes.length < MIN_METADATA_LENGTH || metadataBytes.length > MAX_METADATA_LENGTH
        ) MembershipTiers__InvalidMetadata.selector.revertWith();
    }

    function _validateDuration(uint64 duration, IPlatformRequirements platformReqs) internal view {
        if (duration == 0) MembershipTiers__InvalidDuration.selector.revertWith();
        if (duration > platformReqs.getMembershipDuration())
            MembershipTiers__InvalidDuration.selector.revertWith();
    }
}
