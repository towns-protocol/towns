// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IMembershipBase} from "src/spaces/facets/membership/IMembership.sol";
import {IMembershipPricing} from "src/spaces/facets/membership/pricing/IMembershipPricing.sol";

// libraries
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";
import {IPlatformRequirements} from "src/factory/facets/platform/requirements/IPlatformRequirements.sol";
import {CustomRevert} from "src/utils/libraries/CustomRevert.sol";

// contracts
// debuggging
import {console} from "forge-std/console.sol";

library MembershipPlatformUtils {
    using CustomRevert for bytes4;

    /// @notice Validates and returns the free allocation amount for memberships
    /// @dev Checks if the requested allocation is within platform limits
    /// @param platform The platform requirements contract to check against
    /// @param allocation The requested free allocation amount
    /// @param totalSupply The current total supply of memberships
    /// @return The validated free allocation amount
    /// @custom:throws Membership__InvalidFreeAllocation if allocation exceeds platform limits
    function checkFreeAllocation(
        IPlatformRequirements platform,
        uint256 allocation,
        uint256 totalSupply
    ) internal view returns (uint256) {
        if (allocation == 0) return allocation;

        uint256 maxAllocation = platform.getMembershipMintLimit();
        if (totalSupply > 0) maxAllocation = maxAllocation - totalSupply;

        if (allocation > maxAllocation)
            IMembershipBase.Membership__InvalidFreeAllocation.selector.revertWith();
        return allocation;
    }

    // Pricing
    function checkPrice(
        IPlatformRequirements platform,
        uint256 price
    ) internal view returns (uint256) {
        uint256 membershipFee = platform.getMembershipFee();

        if (price == 0) return membershipFee;
        if (price < membershipFee) IMembershipBase.Membership__PriceTooLow.selector.revertWith();
        return price;
    }

    // Duration
    function checkDuration(
        IPlatformRequirements platform,
        uint64 duration
    ) internal view returns (uint64) {
        uint256 maxDuration = platform.getMembershipDuration();
        if (duration == 0) IMembershipBase.Membership__InvalidDuration.selector.revertWith();
        if (duration > maxDuration)
            IMembershipBase.Membership__InvalidDuration.selector.revertWith();
        return duration;
    }

    function getMembershipPrice(
        IPlatformRequirements platform,
        uint256 freeAllocation,
        address pricingModule,
        uint256 totalSupply
    ) internal view returns (uint256 membershipPrice) {
        if (pricingModule == address(0)) return platform.getMembershipFee();

        membershipPrice = IMembershipPricing(pricingModule).getPrice(freeAllocation, totalSupply);
        uint256 minPrice = platform.getMembershipMinPrice();
        if (membershipPrice < minPrice) return platform.getMembershipFee();
    }
}
