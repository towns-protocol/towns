// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {EntitlementGated} from "contracts/src/crosschain/EntitlementGated.sol";

contract MockEntitlementGated is EntitlementGated {
  constructor(address checker) EntitlementGated(checker) {}

  function getEntitlementOperations()
    public
    pure
    override
    returns (bytes memory)
  {
    return abi.encodePacked("test");
  }
}
