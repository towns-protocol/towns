// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {MembershipBaseSetup} from "../MembershipBaseSetup.sol";
import {MembershipTiersStorage, MembershipTier} from "src/spaces/facets/membership/tiers/MembershipTiersStorage.sol";

// interfaces
import {IPricingModules} from "src/factory/facets/architect/pricing/IPricingModules.sol";

contract MembershipTiersTest is MembershipBaseSetup {
    function test_createSingleTier() external {
        MembershipTier memory tier = MembershipTier({
            metadata: "Test Tier",
            basePrice: 1 ether,
            duration: 365 days,
            pricingModule: address(0),
            maxSupply: 20,
            freeSupply: 10,
            active: true
        });

        _createTier(tier, 1);
    }

    function test_createTier_revertWhen_invalidPricingModule(
        address invalidPricingModule
    ) external {
        vm.assume(invalidPricingModule != address(0));
        vm.assume(!IPricingModules(spaceFactory).isPricingModule(invalidPricingModule));

        MembershipTier memory tier = MembershipTier({
            metadata: "Test Tier",
            basePrice: 1 ether,
            duration: 365 days,
            pricingModule: invalidPricingModule,
            maxSupply: 20,
            freeSupply: 10,
            active: true
        });

        vm.prank(founder);
        vm.expectRevert(MembershipTier__InvalidPricingModule.selector);
        membershipTiers.createTier(tier);
    }

    function test_createTier_revertWhen_invalidBasePrice(uint256 invalidPrice) external {
        uint256 validPrice = platformReqs.getMembershipFee();
        invalidPrice = bound(invalidPrice, 1, validPrice - 1);

        MembershipTier memory tier = MembershipTier({
            metadata: "Test Tier",
            basePrice: invalidPrice,
            duration: 365 days,
            pricingModule: address(0),
            maxSupply: 20,
            freeSupply: 10,
            active: true
        });

        vm.prank(founder);
        vm.expectRevert(Membership__PriceTooLow.selector);
        membershipTiers.createTier(tier);
    }

    function test_createTier_revertWhen_invalidDurationZero() external {
        MembershipTier memory tier = MembershipTier({
            metadata: "Test Tier",
            basePrice: 1 ether,
            duration: 0,
            pricingModule: address(0),
            maxSupply: 20,
            freeSupply: 10,
            active: true
        });

        vm.prank(founder);
        vm.expectRevert(Membership__InvalidDuration.selector);
        membershipTiers.createTier(tier);
    }

    function test_createTier_revertWhen_invalidDurationGreaterThanMax(
        uint256 invalidDuration
    ) external {
        uint256 validDuration = platformReqs.getMembershipDuration();
        invalidDuration = bound(invalidDuration, validDuration + 1, validDuration + 100);

        MembershipTier memory tier = MembershipTier({
            metadata: "Test Tier",
            basePrice: 1 ether,
            duration: uint64(invalidDuration),
            pricingModule: address(0),
            maxSupply: 20,
            freeSupply: 10,
            active: true
        });

        vm.prank(founder);
        vm.expectRevert(Membership__InvalidDuration.selector);
        membershipTiers.createTier(tier);
    }

    function test_createTier_revertWhen_invalidFreeSupply(uint256 invalidFreeSupply) external {
        uint256 validMaxSupply = platformReqs.getMembershipMintLimit();
        invalidFreeSupply = bound(invalidFreeSupply, validMaxSupply + 1, validMaxSupply + 100);

        MembershipTier memory tier = MembershipTier({
            metadata: "Test Tier",
            basePrice: 1 ether,
            duration: 365 days,
            pricingModule: address(0),
            maxSupply: 20,
            freeSupply: invalidFreeSupply,
            active: true
        });

        vm.prank(founder);
        vm.expectRevert(Membership__InvalidFreeAllocation.selector);
        membershipTiers.createTier(tier);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                            Internal                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _createTier(MembershipTier memory tier, uint32 tierId) internal {
        vm.prank(founder);
        vm.expectEmit(address(membershipTiers));
        emit MembershipTierCreated(tierId);
        membershipTiers.createTier(tier);
    }
}
