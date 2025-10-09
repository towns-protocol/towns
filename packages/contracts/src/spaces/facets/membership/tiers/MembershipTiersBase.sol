// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IMembershipTiersBase} from "./IMembershipTiers.sol";

// libraries
import {CustomRevert} from "../../../../utils/libraries/CustomRevert.sol";
import {MembershipTiersStorage} from "./MembershipTiersStorage.sol";
import {MembershipTiersMapper} from "./MembershipTiersMapper.sol";

// contracts
import {MembershipBase} from "../MembershipBase.sol";
import {ERC721ABase} from "../../../../diamond/facets/token/ERC721A/ERC721ABase.sol";

abstract contract MembershipTiersBase is IMembershipTiersBase, MembershipBase, ERC721ABase {
    using CustomRevert for bytes4;
    using MembershipTiersMapper for MembershipTiersStorage.TierState;
    using MembershipTiersMapper for IMembershipTiersBase.TierRequest;

    uint256 internal constant MIN_METADATA_LENGTH = 1;
    uint256 internal constant MAX_METADATA_LENGTH = 100;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           GETTERS                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    function _nextTierId() internal view returns (uint16) {
        return MembershipTiersStorage.nextTierId();
    }

    function _getTier(uint16 tierId) internal view returns (TierResponse memory tier) {
        MembershipTiersStorage.Layout storage $ = MembershipTiersStorage.getLayout();
        MembershipTiersStorage.TierState storage tierState = $.tiers[tierId];

        if (tierId == 0) {
            uint256 totalSupply = tierState.config.totalMinted > 0
                ? tierState.config.totalMinted
                : _totalSupply();

            uint256 price = _getMembershipPrice(totalSupply);
            (uint256 amountDue, ) = _getTotalMembershipPayment(price);

            return
                TierResponse({
                    metadata: _name(),
                    price: price,
                    amountDue: amountDue,
                    duration: _getMembershipDuration(),
                    currency: _getMembershipCurrency(),
                    totalSupply: totalSupply
                });
        } else {
            if (tierState.tierId == 0) return tier;
            tier = tierState.toResponse();
            (tier.amountDue, ) = _getTotalMembershipPayment(tier.price);
            return tier;
        }
    }

    function _getTierDuration(uint16 tierId) internal view returns (uint64 duration) {
        return _getTier(tierId).duration;
    }

    function _getTierOfTokenId(uint256 tokenId) internal view returns (uint16 tierId) {
        return MembershipTiersStorage.getLayout().tierOfTokenId[tokenId];
    }

    function _getTierPrice(uint16 tierId) internal view returns (uint256 tierPrice) {
        return _getTier(tierId).price;
    }

    function _getTierTotalPayment(uint16 tierId) internal view returns (uint256 totalPayment) {
        uint256 tierPrice = _getTierPrice(tierId);
        (totalPayment, ) = _getTotalMembershipPayment(tierPrice);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           SETTERS                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _createTier(TierRequest calldata request) internal returns (uint16) {
        _validateMetadata(request.metadata);
        _validatePrice(request.price);
        _verifyDuration(request.duration);

        MembershipTiersStorage.Layout storage $ = MembershipTiersStorage.getLayout();
        uint16 tierId = ++$.tierId;

        MembershipTiersStorage.TierState storage tier = request.fromRequest(tierId);

        return tier.tierId;
    }

    function _updateTier(uint16 tierId, TierRequest calldata request) internal {
        _validateTierId(tierId);
        _validateMetadata(request.metadata);
        _validatePrice(request.price);
        _verifyDuration(request.duration);

        MembershipTiersStorage.TierState storage tier = MembershipTiersStorage.getLayout().tiers[
            tierId
        ];
        if (tier.tierId == 0) MembershipTiers__TierNotFound.selector.revertWith();
        if (tier.disabled) MembershipTiers__TierDisabled.selector.revertWith();

        request.fromRequest(tierId);
    }

    function _setTierStatus(uint16 tierId, bool disabled) internal {
        MembershipTiersStorage.TierState storage tier = MembershipTiersStorage.getLayout().tiers[
            tierId
        ];
        if (tier.tierId == 0) MembershipTiers__TierNotFound.selector.revertWith();
        tier.disabled = disabled;
    }

    function _setTierOfTokenId(uint256 tokenId, uint16 tierId) internal {
        _validateTierId(tierId);

        MembershipTiersStorage.Layout storage $ = MembershipTiersStorage.getLayout();
        MembershipTiersStorage.TierState storage tier = $.tiers[tierId];
        $.tierOfTokenId[tokenId] = tierId;

        if (tier.tierId == 0 && tier.config.totalMinted == 0) {
            tier.config.totalMinted = _totalSupply();
        } else {
            tier.config.totalMinted++;
        }
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         VALIDATION                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    function _validateTierId(uint16 tierId) internal view {
        uint256 nextTierId = _nextTierId();
        if (tierId >= nextTierId) MembershipTiers__InvalidTierId.selector.revertWith();
    }

    function _validatePrice(uint256 price) internal pure {
        if (price == 0) MembershipTiers__InvalidPrice.selector.revertWith();
    }

    function _validateMetadata(string memory metadata) internal pure {
        bytes memory metadataBytes = bytes(metadata);
        if (
            metadataBytes.length < MIN_METADATA_LENGTH || metadataBytes.length > MAX_METADATA_LENGTH
        ) MembershipTiers__InvalidMetadata.selector.revertWith();
    }
}
