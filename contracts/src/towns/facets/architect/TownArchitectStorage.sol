// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries
import {StringSet} from "contracts/src/utils/StringSet.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// contracts

library TownArchitectStorage {
  // solhint-disable-next-line private-vars-leading-underscore
  bytes32 internal constant SLOT_POSITION =
    keccak256("towns.contracts.storage.TownArchitect");

  struct Layout {
    StringSet.Set townIds;
    EnumerableSet.AddressSet towns;
    mapping(string townId => address townAddress) townById;
    mapping(string townId => uint256 tokenId) tokenIdByTownId;
    mapping(address townAddress => uint256 tokenId) tokenIdByTown;
    address townToken;
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
