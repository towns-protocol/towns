// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {MembershipBaseSetup} from "../MembershipBaseSetup.sol";
import {MembershipTiersStorage, MembershipTier} from "src/spaces/facets/membership/tiers/MembershipTiersStorage.sol";

contract MembershipTiersTest is MembershipBaseSetup {
    function test_createTier() external {
        MembershipTier memory tier = MembershipTier({
            metadata: "Test Tier",
            basePrice: 1 ether,
            duration: 365 days,
            pricingModule: address(0),
            maxSupply: 20,
            freeSupply: 10,
            active: true
        });

        vm.prank(founder);
        membershipTiers.createTier(tier);
    }
}
