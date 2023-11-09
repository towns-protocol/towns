// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract StreamRegistry {
  // Mapping from string to an array of strings (the set)
  mapping(string => string[]) private streamNodesStorage;

  // Function to add a value to the set for a given key
  function addNodeToStream(
    string memory streamIdHash,
    string memory newNodeId
  ) public {
    require(
      !valueExists(streamIdHash, newNodeId),
      "Value already exists in the set"
    );
    streamNodesStorage[streamIdHash].push(newNodeId);
  }

  function addNodesToStream(
    string memory streamIdHash,
    string[] memory newNodeIds
  ) public {
    for (uint256 i = 0; i < newNodeIds.length; i++) {
      addNodeToStream(streamIdHash, newNodeIds[i]);
    }
  }

  // Function to remove a value from the set for a given key
  function removeNodeFromStream(
    string memory streamIdHash,
    string memory nodeId
  ) public {
    require(
      valueExists(streamIdHash, nodeId),
      "Value does not exist in the set"
    );
    string[] storage values = streamNodesStorage[streamIdHash];
    for (uint256 i = 0; i < values.length; i++) {
      if (keccak256(bytes(values[i])) == keccak256(bytes(nodeId))) {
        for (uint256 j = i; j < values.length - 1; j++) {
          values[j] = values[j + 1];
        }
        values.pop();
        break;
      }
    }
  }

  // Function to check if a value exists in the set for a given key
  function valueExists(
    string memory streamIdHash,
    string memory nodeId
  ) public view returns (bool) {
    string[] storage values = streamNodesStorage[streamIdHash];
    for (uint256 i = 0; i < values.length; i++) {
      if (keccak256(bytes(values[i])) == keccak256(bytes(nodeId))) {
        return true;
      }
    }
    return false;
  }

  // Function to get all values in the set for a given key
  function getStreamNodes(
    string memory streamIdHash
  ) public view returns (string[] memory) {
    return streamNodesStorage[streamIdHash];
  }
}

//Notes:
//Generate stubs for the contract with script
//DeployRegistry.sh
//deploy zion governance contrct
