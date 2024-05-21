// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {NodeRegistry} from "contracts/src/river/registry/facets/node/NodeRegistry.sol";
import {OperatorRegistry} from "contracts/src/river/registry/facets/operator/OperatorRegistry.sol";
import {StreamRegistry} from "contracts/src/river/registry/facets/stream/StreamRegistry.sol";
import {RiverConfig} from "contracts/src/river/registry/facets/config/RiverConfig.sol";
import {OwnableBase} from "contracts/src/diamond/facets/ownable/OwnableBase.sol";

contract MockRiverRegistry is
  OwnableBase,
  NodeRegistry,
  OperatorRegistry,
  StreamRegistry,
  RiverConfig
{
  // =============================================================
  //                           Constructor
  // =============================================================
  // Constructor is used for tests that deploy contract directly
  // since owner is not set in this case.
  // Regular deployment scripts pass empty array to the constructor.
  constructor(address[] memory approvedOperators) {
    _transferOwnership(msg.sender);
    for (uint256 i = 0; i < approvedOperators.length; ++i) {
      _approveOperator(approvedOperators[i]);
      _approveConfigurationManager(approvedOperators[i]);
    }
  }
}
