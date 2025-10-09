// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces

// libraries

// contracts

interface IMembershipTiersBase {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           STRUCTS                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    struct TierRequest {
        string metadata;
        uint256 price;
        uint64 duration;
        address currency;
    }

    struct TierResponse {
        string metadata;
        uint256 price;
        uint256 amountDue;
        uint64 duration;
        address currency;
        uint256 totalSupply;
    }
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           ERRORS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    error MembershipTiers__TierNotFound();
    error MembershipTiers__InvalidPrice();
    error MembershipTiers__InvalidCurrency();
    error MembershipTiers__InvalidMetadata();
    error MembershipTiers__TierDisabled();
    error MembershipTiers__InvalidTierId();

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           EVENTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    event TierCreated(uint16 indexed tierId);
    event TierUpdated(uint16 indexed tierId);
    event TierMetadataUpdated(uint16 indexed tierId, string metadata);
    event TierPricingUpdated(
        uint16 indexed tierId,
        uint256 price,
        uint64 duration,
        address currency
    );
    event TierStatusUpdated(uint16 indexed tierId, bool disabled);
    event TierAssignedToTokenId(uint256 indexed tokenId, uint16 indexed tierId);
}

interface IMembershipTiers is IMembershipTiersBase {
    function nextTierId() external view returns (uint16);

    function createTier(TierRequest calldata tier) external returns (uint16);

    function getTier(uint16 tierId) external view returns (TierResponse memory);
}
