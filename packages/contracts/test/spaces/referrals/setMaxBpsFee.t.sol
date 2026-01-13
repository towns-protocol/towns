// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// utils

// interfaces

// libraries

// contracts
import {ReferralsFacetTest} from "test/spaces/referrals/Referrals.t.sol";

contract ReferralsFacet_setMaxBpsFee is ReferralsFacetTest {
    function test_setMaxBpsFee(uint256 bps) external {
        vm.assume(bps > 0);

        vm.prank(founder);
        vm.expectEmit(address(userSpace));
        emit MaxBpsFeeUpdated(bps);
        referralsFacet.setMaxBpsFee(bps);

        assertEq(referralsFacet.maxBpsFee(), bps, "Max bps fee should match");
    }
}
