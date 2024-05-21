// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// utils
import {MembershipBaseSetup} from "../MembershipBaseSetup.sol";

//interfaces

//libraries

//contracts

contract MembershipDurationTest is MembershipBaseSetup {
  function test_getMembershipDuration() public {
    uint256 duration = membership.getMembershipDuration();
    assertEq(duration, platformReqs.getMembershipDuration());
  }
}
