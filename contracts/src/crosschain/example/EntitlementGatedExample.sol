// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {EntitlementChecker} from "../EntitlementChecker.sol";
import {IEntitlementChecker} from "../IEntitlementChecker.sol";
import {IEntitlementCheckerEvents} from "../IEntitlementCheckerEvents.sol";
import {IEntitlementGated} from "../IEntitlementGated.sol";
import {EntitlementGated} from "../EntitlementGated.sol";

contract EntitlementGatedExample is EntitlementGated {
  bytes public constant test = abi.encodePacked("test");

  constructor(
    IEntitlementChecker assignedEntitlementChecker
  ) EntitlementGated(assignedEntitlementChecker) {}

  function getEntitlementOperations()
    public
    pure
    override
    returns (bytes memory)
  {
    return test;
  }
}
