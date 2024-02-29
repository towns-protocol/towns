// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {RiverRegistry} from "contracts/src/river/registry/RiverRegistry.sol";

contract MockRiverRegistry is RiverRegistry {
  // =============================================================
  //                           Constructor
  // =============================================================
  // Constructor is used for tests that deploy contract directly
  // since owner is not set in this case.
  // Regular deployment scripts pass empty array to the constructor.
  constructor(address[] memory approvedOperators) {
    _initImpl(approvedOperators);
    _transferOwnership(msg.sender);
  }
}
