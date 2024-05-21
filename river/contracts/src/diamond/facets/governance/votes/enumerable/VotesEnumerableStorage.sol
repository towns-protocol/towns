// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// contracts

library VotesEnumerableStorage {
  bytes32 internal constant STORAGE_SLOT =
    keccak256("diamond.facets.governance.votes.enumerable.storage");

  struct Layout {
    EnumerableSet.AddressSet delegators;
    mapping(address => EnumerableSet.AddressSet) delegatorsByDelegatee;
    mapping(address => uint256) delegationTimeForDelegator;
  }

  function layout() internal pure returns (Layout storage l) {
    bytes32 position = STORAGE_SLOT;
    assembly {
      l.slot := position
    }
  }
}
