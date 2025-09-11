// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {Tier} from "./MembershipTiersStorage.sol";

// libraries

// contracts

interface IMembershipTiersBase {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           ERRORS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    error Membership__InvalidTier();
    error Membership__TierDisabled();

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           EVENTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    event TierCreated(uint32 indexed tierId);
    event TierUpdated(uint32 indexed tierId);
    event TierDisabled(uint32 indexed tierId);
}

interface IMembershipTiers is IMembershipTiersBase {
    /// @notice Get a tier by its ID.
    /// @param tierId The ID of the tier to get.
    /// @return The tier.
    function getTier(uint32 tierId) external view returns (Tier memory);

    /// @notice Get the tier of a token.
    /// @param tokenId The ID of the token to get the tier of.
    /// @return The tier of the token.
    function tierOf(uint256 tokenId) external view returns (uint32);

    /// @notice Get the price of a tier.
    /// @param tierId The ID of the tier to get the price of.
    /// @return The price of the tier.
    function tierPrice(uint32 tierId) external view returns (uint256);

    /// @notice Create a new tier.
    /// @param cfg The configuration of the tier to create.
    /// @return tierId The ID of the newly created tier.
    function createTier(Tier memory cfg) external returns (uint32 tierId);

    /// @notice Update a tier.
    /// @param tierId The ID of the tier to update.
    /// @param cfg The configuration of the tier to update.
    function updateTier(uint32 tierId, Tier memory cfg) external;

    /// @notice Disable a tier.
    /// @param tierId The ID of the tier to disable.
    function disableTier(uint32 tierId) external;
}
