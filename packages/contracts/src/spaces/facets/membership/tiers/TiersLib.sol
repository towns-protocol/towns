// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

library TiersLib {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           STORAGE                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    struct Tier {
        address pricingModule;
        uint256 renewalPrice;
        uint256 duration;
        bool active;
    }

    /// @custom:storage-location erc7201:spaces.facets.tiers.storage
    struct Layout {
        uint16 tierCount;
        mapping(uint16 => Tier) tiers;
        mapping(uint256 => uint16) tierByTokenId;
    }

    // keccak256(abi.encode(uint256(keccak256("spaces.facets.tiers.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0x66e7ad983570752b784043ec15c493bd88730ca3e477a71b4aa4eee809763a00;

    function getLayout() internal pure returns (Layout storage db) {
        assembly {
            db.slot := STORAGE_SLOT
        }
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           ERRORS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    error InvalidTier();
    error InactiveTier();
    error InvalidTierPrice();
    error InvalidTierDuration();
    error TierCapacityReached();
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           EVENTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    event TierCreated(uint16 indexed tierId, Tier tier);
    event TierUpdated(uint16 indexed tierId, Tier tier);
    event TierDeactivated(uint16 indexed tierId);
    event MembershipTierChanged(
        address indexed member,
        uint256 indexed tokenId,
        uint16 indexed tierId
    );
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         FUNCTIONS                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function createTier(Tier memory tier) internal returns (uint16 tierId) {
        Layout storage db = getLayout();

        if (tier.duration == 0) revert InvalidTierDuration();

        tierId = ++db.tierCount;

        Tier storage newTier = db.tiers[tierId];
        newTier.pricingModule = tier.pricingModule;
        newTier.renewalPrice = tier.renewalPrice;
        newTier.duration = tier.duration;
        newTier.active = tier.active;

        emit TierCreated(tierId, newTier);
    }

    function updateTier(uint16 tierId, Tier calldata params) internal {
        Layout storage db = getLayout();
        Tier storage tier = db.tiers[tierId];

        if (tierId == 0 || tierId > db.tierCount) {
            revert InvalidTier();
        }

        if (!tier.active) {
            revert InactiveTier();
        }

        if (params.pricingModule != address(0)) {
            tier.pricingModule = params.pricingModule;
        }

        if (params.renewalPrice > 0) {
            tier.renewalPrice = params.renewalPrice;
        }

        if (params.duration > 0) {
            tier.duration = params.duration;
        }

        if (params.active != tier.active) {
            tier.active = params.active;
        }

        emit TierUpdated(tierId, tier);
    }

    function deactivateTier(uint16 tierId) internal {
        Layout storage db = getLayout();

        if (tierId == 0 || tierId > db.tierCount) {
            revert InvalidTier();
        }

        db.tiers[tierId].active = false;
        emit TierDeactivated(tierId);
    }

    function changeMembershipTier(uint256 tokenId, uint16 tierId) internal {
        Layout storage db = getLayout();

        if (tierId == 0 || tierId > db.tierCount) {
            revert InvalidTier();
        }

        Tier storage tier = db.tiers[tierId];

        if (!tier.active) {
            revert InactiveTier();
        }

        // Assign new tier
        db.tierByTokenId[tokenId] = tierId;

        emit MembershipTierChanged(msg.sender, tokenId, tierId);
    }

    function getTier(uint16 tierId) internal view returns (Tier memory) {
        Layout storage db = getLayout();

        if (tierId == 0 || tierId > db.tierCount) {
            revert InvalidTier();
        }

        if (!db.tiers[tierId].active) {
            revert InactiveTier();
        }

        return db.tiers[tierId];
    }

    function getTierByTokenId(uint256 tokenId) internal view returns (Tier memory) {
        Layout storage db = getLayout();

        uint16 tierId = db.tierByTokenId[tokenId];
        if (tierId == 0) {
            revert InvalidTier();
        }

        return db.tiers[tierId];
    }

    function isTierActive(uint16 tierId) internal view returns (bool) {
        Layout storage db = getLayout();
        return db.tiers[tierId].active;
    }
}
