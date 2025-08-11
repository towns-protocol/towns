// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {MembershipBaseSetup} from "../MembershipBaseSetup.sol";
import {MembershipTiersStorage} from "src/spaces/facets/membership/tiers/MembershipTiersStorage.sol";

contract MembershipTiersTest is MembershipBaseSetup {
    function test_getTier() external {
        uint32 tierId;

        MembershipTiersStorage.Tier memory tierCfg = MembershipTiersStorage.Tier({
            name: "Test Tier",
            basePrice: 1 ether,
            maxSupply: 100,
            duration: 365 days,
            freeAllocation: 0,
            pricingModule: address(0),
            minted: 0,
            image: "",
            disabled: false
        });

        vm.startPrank(founder);
        tierId = membershipTiers.createTier(tierCfg);
        vm.stopPrank();

        MembershipTiersStorage.Tier memory tier = membershipTiers.getTier(tierId);
        assertEq(tier.name, "Test Tier");
        assertEq(tier.basePrice, 1 ether);
        assertEq(tier.maxSupply, 100);
        assertEq(tier.duration, 365 days);
        assertEq(tier.freeAllocation, 0);
    }
}
