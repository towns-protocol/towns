// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IEntitlementChecker} from "./IEntitlementChecker.sol";

// libraries

// contracts
import {EntitlementCheckerBase} from "./EntitlementCheckerBase.sol";

contract EntitlementChecker is IEntitlementChecker, EntitlementCheckerBase {
  function registerNode() external {
    _setNode(msg.sender, true);
  }

  function unregisterNode() external {
    _setNode(msg.sender, false);
  }

  function nodeCount() external view returns (uint256) {
    return _getNodeCount();
  }

  function getRandomNodes(
    uint256 requestedNodeCount,
    address requestingContract
  ) external view returns (address[] memory) {
    return _getRandomNodes(requestedNodeCount, requestingContract);
  }

  function emitEntitlementCheckRequested(
    bytes32 transactionId,
    address[] memory selectedNodes
  ) external {
    emit EntitlementCheckRequested(
      tx.origin,
      transactionId,
      selectedNodes,
      msg.sender
    );
  }
}
