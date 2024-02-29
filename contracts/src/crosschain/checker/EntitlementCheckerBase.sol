// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IEntitlementCheckerBase} from "./IEntitlementChecker.sol";

// libraries
import {EnumerableSet} from "openzeppelin-contracts/contracts/utils/structs/EnumerableSet.sol";
import {EntitlementCheckerStorage} from "./EntitlementCheckerStorage.sol";

// contracts

contract EntitlementCheckerBase is IEntitlementCheckerBase {
  using EnumerableSet for EnumerableSet.AddressSet;

  function _getRandomNumber(
    uint upperLimit,
    address contractAddress
  ) internal view returns (uint256 randomNum) {
    // WARNING: This is NOT a secure source of randomness and should not be used for any significant randomness in production.
    randomNum =
      uint(
        keccak256(
          abi.encodePacked(
            block.prevrandao,
            block.timestamp,
            tx.origin,
            contractAddress
          )
        )
      ) %
      upperLimit;
  }

  /*
    //Old version that copied the array and removed the index from the copy
    function _removeIndex(
        address[] memory array,
        uint index
    ) private pure returns (address[] memory) {
        address[] memory randomNodes = new address[](array.length - 1);
        for (uint i = 0; i < array.length; i++) {
            if (i == index) {
                continue;
            } else {
                if (i > index) {
                    randomNodes[i - 1] = array[i];
                } else {
                    randomNodes[i] = array[i];
                }
            }
        }
        return randomNodes;
    }

    function getRandomNodes(
        uint requestedNodeCount
    ) public view returns (address[] memory) {
        require(
            nodesArray.length >= requestedNodeCount,
            "Insufficient number of Nodes"
        );
        address[] memory randomNodes = new address[](requestedNodeCount);
        address[] memory nodesCopy = nodesArray;

        for (uint i = 0; i < requestedNodeCount; i++) {
            uint randomIndex = _getRandomNumber(nodesCopy.length);
            randomNodes[i] = nodesCopy[randomIndex];
            nodesCopy = _removeIndex(nodesCopy, randomIndex);
        }
        return randomNodes;
    }
    */

  function _getRandomNodes(
    uint256 nodeCount,
    address contractAddress
  ) internal view returns (address[] memory randomNodes) {
    EntitlementCheckerStorage.Layout storage ds = EntitlementCheckerStorage
      .layout();

    if (ds.nodes.length() < nodeCount)
      revert EntitlementChecker_InsufficientNumberOfNodes();

    randomNodes = new address[](nodeCount);
    for (uint256 i = 0; i < nodeCount; i++) {
      randomNodes[i] = ds.nodes.at(i);
    }

    for (uint256 i = nodeCount; i < ds.nodes.length(); i++) {
      uint256 j = _getRandomNumber(i + 1, contractAddress);
      if (j < nodeCount) {
        randomNodes[j] = ds.nodes.at(i);
      }
    }
  }

  function _setNode(address node, bool value) internal {
    EntitlementCheckerStorage.Layout storage ds = EntitlementCheckerStorage
      .layout();

    if (value) {
      if (ds.nodes.contains(node))
        revert EntitlementChecker_NodeAlreadyRegistered();
      ds.nodes.add(node);
      emit NodeRegistered(node);
    } else {
      if (!ds.nodes.contains(node))
        revert EntitlementChecker_NodeNotRegistered();
      ds.nodes.remove(node);
      emit NodeUnregistered(node);
    }
  }

  function _getNodeCount() internal view returns (uint256) {
    return EntitlementCheckerStorage.layout().nodes.length();
  }

  function _requestEntitlementCheck(
    bytes32 transactionId,
    address[] memory nodes
  ) internal {
    emit EntitlementCheckRequested(tx.origin, transactionId, nodes, msg.sender);
  }
}
