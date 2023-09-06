```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IEntitlementChecker } from "../IEntitlementChecker.sol";
import { EntitlementGated } from "../EntitlementGated.sol";

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
```
