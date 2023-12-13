// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Deploy: ./scripts/deploy-river-registry.sh
// Generate bindings: ./scripts/build-town-types.sh
contract StreamRegistry {
  string public constant errAlreadyExists = "ALREADY_EXISTS";
  string public constant errNotFound = "NOT_FOUND";
  string public constant errOutOfBounds = "OUT_OF_BOUNDS";

  struct Stream {
    string streamId;
    address[] nodes;
    bytes32 genesisMiniblockHash;
  }

  Stream[] private streams;
  mapping(bytes32 => uint256) private streamIdToIndex;

  function allocateStream(Stream memory newStream) public {
    bytes32 streamIdHash = keccak256(bytes(newStream.streamId));
    require(streamIdToIndex[streamIdHash] == 0, errAlreadyExists);
    streams.push(newStream);
    // Update the mapping (array index starts from 0, so we add 1 to differentiate from the default value)
    streamIdToIndex[streamIdHash] = streams.length;
  }

  function getStream(
    string memory _streamId
  ) public view returns (Stream memory) {
    bytes32 streamIdHash = keccak256(bytes(_streamId));
    uint256 index = streamIdToIndex[streamIdHash];
    require(index != 0, errNotFound);
    // Adjust index to retrieve the correct Stream (since we added 1 in allocateStream)
    return streams[index - 1];
  }

  function getStreamsLength() public view returns (uint256) {
    return streams.length;
  }

  function getStreamByIndex(uint256 index) public view returns (Stream memory) {
    require(index < streams.length, errOutOfBounds);
    return streams[index];
  }
}
