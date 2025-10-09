// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// base setup
import {MembershipBaseSetup} from "../MembershipBaseSetup.sol";

// interfaces

contract MembershipTiersTest is MembershipBaseSetup {
    function test_defaultTier() external {
        TierResponse memory tier = membershipTiers.getTier(0);
        emit log_named_string("tier.metadata", tier.metadata);
        emit log_named_uint("tier.price", tier.price);
        emit log_named_uint("tier.duration", tier.duration);
        emit log_named_address("tier.currency", tier.currency);
        emit log_named_uint("tier.totalSupply", tier.totalSupply);
        emit log_named_uint("tier.amountDue", tier.amountDue);
    }

    function test_createSingleTier(uint256 price, uint64 duration) external {
        uint64 platformDuration = platformReqs.getMembershipDuration();
        uint256 platformPrice = platformReqs.getMembershipMinPrice();
        price = uint256(bound(price, 1, platformPrice));
        duration = uint64(bound(duration, 1, platformDuration));
        string memory metadata = "test";

        TierRequest memory tier = TierRequest({
            metadata: metadata,
            price: price,
            duration: duration,
            currency: address(0)
        });

        _createTier(tier);
    }

    function test_createTier_revertWhen_metadataIsEmpty() external {
        TierRequest memory tier = TierRequest({
            metadata: "",
            price: 1 ether,
            duration: 30 days,
            currency: address(0)
        });

        vm.prank(founder);
        vm.expectRevert();
        membershipTiers.createTier(tier);
    }

    function test_createTier_succeedsWhen_metadataIsVeryLong() external {
        // Create a very long metadata string (1000 characters)
        string memory longMetadata = new string(1000);
        bytes memory metadataBytes = bytes(longMetadata);
        for (uint256 i = 0; i < 1000; i++) {
            metadataBytes[i] = bytes1(uint8(65 + (i % 26))); // Fill with A-Z pattern
        }

        TierRequest memory tier = TierRequest({
            metadata: string(metadataBytes),
            price: 1 ether,
            duration: 30 days,
            currency: address(0)
        });

        vm.prank(founder);
        vm.expectRevert(MembershipTiers__InvalidMetadata.selector);
        membershipTiers.createTier(tier);
    }

    function test_createTier_revertWhen_priceIsZero() external {
        TierRequest memory tier = TierRequest({
            metadata: "Premium Tier",
            price: 0,
            duration: 30 days,
            currency: address(0)
        });

        vm.prank(founder);
        vm.expectRevert(abi.encodeWithSelector(MembershipTiers__InvalidPrice.selector));
        membershipTiers.createTier(tier);
    }

    function test_createTier_revertWhen_durationIsZero() external {
        TierRequest memory tier = TierRequest({
            metadata: "Premium Tier",
            price: 1 ether,
            duration: 0,
            currency: address(0)
        });

        vm.prank(founder);
        vm.expectRevert(abi.encodeWithSelector(Membership__InvalidDuration.selector));
        membershipTiers.createTier(tier);
    }

    function test_createTier_revertWhen_durationExceedsPlatformMaximum() external {
        uint64 platformDuration = platformReqs.getMembershipDuration();
        uint64 invalidDuration = platformDuration + 1;

        TierRequest memory tier = TierRequest({
            metadata: "Premium Tier",
            price: 1 ether,
            duration: invalidDuration,
            currency: address(0)
        });

        vm.prank(founder);
        vm.expectRevert(abi.encodeWithSelector(Membership__InvalidDuration.selector));
        membershipTiers.createTier(tier);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                            Internal                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _createTier(TierRequest memory tier) internal {
        uint16 tierId = membershipTiers.nextTierId();

        vm.prank(founder);
        vm.expectEmit(address(membershipTiers));
        emit TierCreated(tierId);
        membershipTiers.createTier(tier);
    }
}
