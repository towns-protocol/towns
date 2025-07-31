// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
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
contract MembershipTiersFacet is MembershipTiersBase, TokenOwnableBase, ReentrancyGuard, Facet {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                               ADMIN                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Create a new tier.
    /// @param cfg Tier configuration; `minted` and `disabled` are ignored.
    /// @return tierId The newly created tier identifier.
    function addTier(
        MembershipTiersStorage.Tier memory cfg
    ) external onlyOwner returns (uint32 tierId) {
        // Copy cfg into memory to zero out mutable fields for safety
        MembershipTiersStorage.Tier memory c = cfg;
        c.minted = 0;
        c.disabled = false;
        tierId = _addTier(c);
    }

    /// @notice Update all mutable fields of an existing tier.
    function updateTier(uint32 tierId, MembershipTiersStorage.Tier memory cfg) external onlyOwner {
        MembershipTiersStorage.Tier memory c = cfg;
        // minted/disabled handled inside _updateTier
        _updateTier(tierId, c);
    }

    /// @notice Disable a tier permanently so no further mints can occur.
    function disableTier(uint32 tierId) external onlyOwner {
        _disableTier(tierId);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                              VIEWS                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function getTier(
        uint32 tierId
    ) external view returns (MembershipTiersStorage.Tier memory tier) {
        return _getTier(tierId);
    }

    function tierOf(uint256 tokenId) external view returns (uint32) {
        return _tierOf(tokenId);
    }

    /// @notice Returns the current price for a tier (including dynamic module logic if any).
    function tierPrice(uint32 tierId) external view returns (uint256) {
        return _getTierPrice(tierId);
    }
}
