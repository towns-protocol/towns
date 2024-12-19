// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {NodeOperatorStatus} from "contracts/src/base/registry/facets/operator/NodeOperatorStorage.sol";

// libraries

// contracts
import {Interaction} from "contracts/scripts/common/Interaction.s.sol";
import {NodeOperatorFacet} from "contracts/src/base/registry/facets/operator/NodeOperatorFacet.sol";

// debugging
import {console} from "forge-std/console.sol";

contract InteractNodeOperators is Interaction {
  function __interact(address) internal override {
    address baseRegistry = getDeployment("baseRegistry");

    address[] memory operators = NodeOperatorFacet(baseRegistry).getOperators();

    for (uint256 i = 0; i < operators.length; i++) {
      address operator = operators[i];
      NodeOperatorStatus status = NodeOperatorFacet(baseRegistry)
        .getOperatorStatus(operator);
      console.log("Operator:", operator);
      _logStatus(status);
    }
  }

  function _logStatus(NodeOperatorStatus status) internal pure {
    if (status == NodeOperatorStatus.Exiting) {
      console.log("Exiting");
    } else if (status == NodeOperatorStatus.Standby) {
      console.log("Standby");
    } else if (status == NodeOperatorStatus.Approved) {
      console.log("Approved");
    } else if (status == NodeOperatorStatus.Active) {
      console.log("Active");
    }
  }
}
