// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// contracts

library ChannelStorage {
  // keccak256(abi.encode(uint256(keccak256("spaces.facets.channel.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 internal constant STORAGE_SLOT =
    0x804ad633258ac9b908ae115a2763b3f6e04be3b1165402c872b25af518504300;

  struct Channel {
    bytes32 id;
    bool disabled;
    string metadata;
  }

  struct Layout {
    EnumerableSet.Bytes32Set channelIds;
    mapping(bytes32 channelId => Channel) channelById;
    mapping(bytes32 channelId => EnumerableSet.UintSet) rolesByChannelId;
  }

  function layout() internal pure returns (Layout storage ds) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      ds.slot := slot
    }
  }
}
