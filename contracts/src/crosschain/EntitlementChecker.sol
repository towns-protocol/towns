// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {console2} from "forge-std/console2.sol";
import {IEntitlementChecker} from "./IEntitlementChecker.sol";
import {IEntitlementCheckerEvents} from "./IEntitlementCheckerEvents.sol";
import {Bytes32ToHexString} from "../utils/Bytes32ToHexString.sol";

contract EntitlementChecker is IEntitlementChecker, IEntitlementCheckerEvents {
  function _getRandomNumber(
    uint upperLimit,
    address requestingContract
  ) private view returns (uint) {
    // WARNING: This is NOT a secure source of randomness and should not be used for any significant randomness in production.
    uint randomNum = uint(
      keccak256(
        abi.encodePacked(
          block.prevrandao,
          block.timestamp,
          tx.origin,
          requestingContract
        )
      )
    ) % upperLimit;
    return randomNum;
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

  // Implementation of Reservoir Sampling algorithm
  function getRandomNodes(
    uint requestedNodeCount,
    address requestingContract
  ) external view returns (address[] memory) {
    require(
      nodesArray.length >= requestedNodeCount,
      "Insufficient number of Nodes"
    );

    address[] memory randomNodes = new address[](requestedNodeCount);
    for (uint256 i = 0; i < requestedNodeCount; i++) {
      randomNodes[i] = nodesArray[i];
    }

    for (uint256 i = requestedNodeCount; i < nodesArray.length; i++) {
      uint256 j = _getRandomNumber(i + 1, requestingContract);
      if (j < requestedNodeCount) {
        randomNodes[j] = nodesArray[i];
      }
    }

    return randomNodes;
  }

  mapping(address => address) public nodes;
  address[] public nodesArray;

  function registerNode() external returns (bool) {
    require(nodes[msg.sender] != msg.sender, "Node already registered");

    nodes[msg.sender] = msg.sender;
    nodesArray.push(nodes[msg.sender]);

    return true;
  }

  function nodeCount() external view returns (uint256) {
    return nodesArray.length;
  }

  function unregisterNode() external returns (bool) {
    require(nodes[msg.sender] == msg.sender, "Node does not exist");

    uint256 indexToBeDeleted;
    bool found = false;

    // find the index of the item
    for (uint256 i = 0; i < nodesArray.length; i++) {
      if (nodesArray[i] == msg.sender) {
        indexToBeDeleted = i;
        found = true;
        break;
      }
    }

    require(found, "Node not found");

    // Move the last element to the spot of the one to delete
    nodesArray[indexToBeDeleted] = nodesArray[nodesArray.length - 1];

    // Remove the last element
    nodesArray.pop();
    delete nodes[msg.sender];

    console2.log("Node unregistered", msg.sender);

    return true;
  }

  function emitEntitlementCheckRequested(
    bytes32 transactionId,
    address[] memory selectedNodes
  ) external {
    console2.log(
      "emitEntitlementCheckRequested",
      Bytes32ToHexString.bytes32ToHexString(transactionId),
      block.number
    );
    emit IEntitlementCheckerEvents.EntitlementCheckRequested(
      tx.origin,
      transactionId,
      selectedNodes,
      msg.sender
    );
  }
}
