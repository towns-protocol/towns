// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IMembershipPricing} from "../pricing/IMembershipPricing.sol";
import {IMembershipTiersBase} from "./IMembershipTiers.sol";

// libraries
import {MembershipTiersStorage, Tier} from "./MembershipTiersStorage.sol";
import {CustomRevert} from "../../../../utils/libraries/CustomRevert.sol";

// contracts
import {MembershipBase} from "../MembershipBase.sol";
import {ERC721ABase} from "../../../../diamond/facets/token/ERC721A/ERC721ABase.sol";

/// @title MembershipTiersBase
/// @notice Internal library-style abstract contract that manages tier CRUD and
///         bookkeeping. Meant to be inherited by facets that expose external
///         APIs.  No external/public functions are declared here.
/// @dev    Uses a separate storage slot defined in MembershipTiersStorage to
///         avoid touching legacy MembershipStorage.
abstract contract MembershipTiersBase is MembershipBase, IMembershipTiersBase, ERC721ABase {
    using CustomRevert for bytes4;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           TIER  CRUD                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Creates a new membership tier and returns its id.
    function _addTier(Tier memory cfg) internal returns (uint32 tierId) {
        if (cfg.pricingModule != address(0)) {
            _verifyPricingModule(cfg.pricingModule);
        }

        if (cfg.freeAllocation > 0) {
            _verifyFreeAllocation(cfg.freeAllocation);
        }

        if (cfg.basePrice > 0) {
            _verifyPrice(cfg.basePrice);
        }

        if (cfg.duration > 0) {
            _verifyDuration(cfg.duration);
        }

        MembershipTiersStorage.Layout storage $ = MembershipTiersStorage.getLayout();
        tierId = ++$.nextTierId;
        $.tiers[tierId] = cfg;

        emit TierCreated(tierId);
    }

    /// @notice Updates an existing tier.
    function _updateTier(uint32 tierId, Tier memory cfg) internal {
        if (tierId == 0) {
            // Tier 0 is virtual and cannot be updated
            Membership__InvalidTier.selector.revertWith();
        }

        MembershipTiersStorage.Layout storage $ = MembershipTiersStorage.getLayout();
        Tier storage t = $.tiers[tierId];

        if (t.duration == 0 && t.basePrice == 0 && t.maxSupply == 0 && bytes(t.name).length == 0) {
            // rough existence check – tier was never created
            Membership__InvalidTier.selector.revertWith();
        }

        if (t.disabled) Membership__TierDisabled.selector.revertWith();

        // Validate pricing module if changed
        if (cfg.pricingModule != address(0) && cfg.pricingModule != t.pricingModule) {
            _verifyPricingModule(cfg.pricingModule);
        }

        if (cfg.basePrice > 0) {
            _verifyPrice(cfg.basePrice);
        }

        if (cfg.freeAllocation > 0) {
            _verifyFreeAllocation(cfg.freeAllocation);
        }

        // Keep minted count; do not reset disabled flag
        uint256 alreadyMinted = t.totalMinted;
        bool isDisabled = t.disabled;

        $.tiers[tierId] = cfg;
        $.tiers[tierId].totalMinted = alreadyMinted;
        $.tiers[tierId].disabled = isDisabled;

        emit TierUpdated(tierId);
    }

    /// @notice Permanently disables a tier (no further mints).
    function _disableTier(uint32 tierId) internal {
        if (tierId == 0) {
            // Tier 0 is virtual and cannot be disabled
            Membership__InvalidTier.selector.revertWith();
        }

        MembershipTiersStorage.Layout storage $ = MembershipTiersStorage.getLayout();
        Tier storage t = $.tiers[tierId];

        if (t.duration == 0 && t.basePrice == 0 && t.maxSupply == 0 && bytes(t.name).length == 0) {
            Membership__InvalidTier.selector.revertWith();
        }
        if (t.disabled) return; // idempotent

        t.disabled = true;
        emit TierDisabled(tierId);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        INTERNAL HELPERS                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _getTier(uint32 tierId) internal view returns (Tier memory t) {
        if (tierId == 0) {
            t = Tier({
                name: "Membership",
                basePrice: _getMembershipPrice(_totalSupply()),
                maxSupply: _getMembershipSupplyLimit(),
                duration: _getMembershipDuration(),
                freeAllocation: _getMembershipFreeAllocation(),
                pricingModule: address(0),
                totalMinted: _totalSupply(),
                url: _getMembershipImage(),
                disabled: false
            });
        } else {
            t = MembershipTiersStorage.getLayout().tiers[tierId];
        }

        if (t.duration == 0 && t.basePrice == 0 && t.maxSupply == 0 && bytes(t.name).length == 0) {
            Membership__InvalidTier.selector.revertWith();
        }
    }

    function _tierOf(uint256 tokenId) internal view returns (uint32) {
        return MembershipTiersStorage.getLayout().tierOfToken[tokenId];
    }

    function _setTierOf(uint256 tokenId, uint32 tierId) internal {
        MembershipTiersStorage.getLayout().tierOfToken[tokenId] = tierId;
    }

    /// @dev Ensures tier is active and, if maxSupply is set, that another mint is allowed.
    function _verifyTierAvailable(uint32 tierId) internal view {
        if (tierId == 0) {
            // For tier 0, check against totalSupply and membership supply limit
            uint256 maxSupply = _getMembershipSupplyLimit();
            if (maxSupply != 0 && _totalSupply() >= maxSupply) {
                Membership__MaxSupplyReached.selector.revertWith();
            }
            return;
        }

        Tier storage t = MembershipTiersStorage.getLayout().tiers[tierId];
        if (t.disabled) Membership__TierDisabled.selector.revertWith();
        if (t.maxSupply != 0 && t.totalMinted >= t.maxSupply) {
            Membership__MaxSupplyReached.selector.revertWith();
        }
    }

    /// @dev Increments minted counter; caller MUST have verified availability first.
    /// @dev For tier 0 (virtual tier), no action is needed as minted count equals totalSupply.
    function _incrementTierMinted(uint32 tierId, uint256 amount) internal {
        Tier storage t = MembershipTiersStorage.getLayout().tiers[tierId];

        if (tierId == 0 && t.totalMinted == 0 && _totalSupply() > 0) {
            t.totalMinted = _totalSupply();
            return;
        }

        t.totalMinted += amount;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                     PRICE & DURATION HELPERS                 */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Returns membership price for a specific tier.
    /// @dev    Simplified: uses Tier.pricingModule if set, else basePrice.
    function _getTierPrice(uint32 tierId) internal view returns (uint256 price) {
        if (tierId == 0) {
            // For tier 0, always use the membership price based on totalSupply
            return _getMembershipPrice(_totalSupply());
        }

        Tier storage t = MembershipTiersStorage.getLayout().tiers[tierId];

        if (t.pricingModule != address(0)) {
            price = IMembershipPricing(t.pricingModule).getPrice(t.freeAllocation, t.totalMinted);
        } else {
            price = t.basePrice;
        }
    }

    function _getTierDuration(uint32 tierId) internal view returns (uint64 duration) {
        if (tierId == 0) {
            // For tier 0, always use the membership duration
            return _getMembershipDuration();
        }

        Tier storage t = MembershipTiersStorage.getLayout().tiers[tierId];
        duration = t.duration != 0 ? t.duration : _getMembershipDuration();
    }
}
