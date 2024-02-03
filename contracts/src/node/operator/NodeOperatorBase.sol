// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {INodeOperatorBase} from "./INodeOperator.sol";

// libraries
import {NodeOperatorStorage} from "./NodeOperatorStorage.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// contracts

abstract contract NodeOperatorBase is INodeOperatorBase {
  using EnumerableSet for EnumerableSet.AddressSet;

  function _setOperatorStatus(
    address operator,
    NodeOperatorStatus newStatus
  ) internal {
    NodeOperatorStorage.Layout storage ds = NodeOperatorStorage.layout();

    ds.operatorStatus[operator] = newStatus;

    if (newStatus == NodeOperatorStatus.Approved) {
      ds.approvedOperators.add(operator);
    } else if (newStatus == NodeOperatorStatus.Exiting) {
      ds.approvedOperators.remove(operator);
    }
  }

  function _operatorStatus(
    address operator
  ) internal view returns (NodeOperatorStatus) {
    NodeOperatorStorage.Layout storage ds = NodeOperatorStorage.layout();
    return ds.operatorStatus[operator];
  }

  function _approvedOperators() internal view returns (address[] memory) {
    NodeOperatorStorage.Layout storage ds = NodeOperatorStorage.layout();
    return ds.approvedOperators.values();
  }
}
