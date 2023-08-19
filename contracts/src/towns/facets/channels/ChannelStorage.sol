// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces

// libraries
import {StringSet} from "contracts/src/utils/StringSet.sol";
import {EnumerableSet} from "openzeppelin-contracts/contracts/utils/structs/EnumerableSet.sol";

// contracts

library ChannelStorage {
  bytes32 internal constant STORAGE_SLOT =
    keccak256("towns.contracts.storage.Channel");

  struct Channel {
    string id;
    bool disabled;
    string metadata;
  }

  struct Layout {
    StringSet.Set channelIds;
    mapping(string channelId => Channel) channelById;
    mapping(string channelId => EnumerableSet.UintSet) rolesByChannelId;
  }

  function layout() internal pure returns (Layout storage ds) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      ds.slot := slot
    }
  }
}
