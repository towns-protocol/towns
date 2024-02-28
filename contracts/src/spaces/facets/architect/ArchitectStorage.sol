// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries
import {StringSet} from "contracts/src/utils/StringSet.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// contracts

library ArchitectStorage {
  // solhint-disable-next-line private-vars-leading-underscore
  bytes32 internal constant SLOT_POSITION =
    keccak256("river.spaces.facets.architect.storage");

  struct Space {
    address space;
    uint256 tokenId;
  }

  struct Layout {
    StringSet.Set spaceIds;
    EnumerableSet.AddressSet spaces;
    mapping(string spaceId => Space) spaceById;
    mapping(address spaceAddress => uint256 tokenId) tokenIdBySpace;
    address spaceToken;
    address userEntitlement;
    address tokenEntitlement;
  }

  function layout() internal pure returns (Layout storage ds) {
    bytes32 position = SLOT_POSITION;

    // solhint-disable-next-line no-inline-assembly
    assembly {
      ds.slot := position
    }
  }
}
