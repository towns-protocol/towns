// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IMembershipTiers} from "./IMembershipTiers.sol";

// libraries
import {MembershipTiersStorage} from "./MembershipTiersStorage.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {ReentrancyGuard} from "solady/utils/ReentrancyGuard.sol";
import {MembershipTiersBase} from "./MembershipTiersBase.sol";
import {TokenOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/token/TokenOwnableBase.sol";

/// @title MembershipTiersFacet
/// @notice Exposes external functions for managing membership tiers. Join / renew
///         entry-points will be added in a later step; this facet currently
///         focuses on CRUD and view helpers.
contract MembershipTiersFacet is
    MembershipTiersBase,
    TokenOwnableBase,
    ReentrancyGuard,
    Facet,
    IMembershipTiers
{
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                               ADMIN                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IMembershipTiers
    function createTier(
        MembershipTiersStorage.Tier memory cfg
    ) external onlyOwner returns (uint32 tierId) {
        // Copy cfg into memory to zero out mutable fields for safety
        MembershipTiersStorage.Tier memory c = cfg;
        c.minted = 0;
        c.disabled = false;
        tierId = _addTier(c);
    }

    /// @inheritdoc IMembershipTiers
    function updateTier(uint32 tierId, MembershipTiersStorage.Tier memory cfg) external onlyOwner {
        MembershipTiersStorage.Tier memory c = cfg;
        // minted/disabled handled inside _updateTier
        _updateTier(tierId, c);
    }

    /// @inheritdoc IMembershipTiers
    function disableTier(uint32 tierId) external onlyOwner {
        _disableTier(tierId);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                              VIEWS                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IMembershipTiers
    function getTier(
        uint32 tierId
    ) external view returns (MembershipTiersStorage.Tier memory tier) {
        return _getTier(tierId);
    }

    /// @inheritdoc IMembershipTiers
    function tierOf(uint256 tokenId) external view returns (uint32) {
        return _tierOf(tokenId);
    }

    /// @inheritdoc IMembershipTiers
    function tierPrice(uint32 tierId) external view returns (uint256) {
        return _getTierPrice(tierId);
    }
}
