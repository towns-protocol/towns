// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

import {Checkpoints} from "./Checkpoints.sol";

// contracts

library VotesStorage {
  bytes32 internal constant STORAGE_SLOT =
    keccak256("diamond.facets.governance.votes.storage");

  struct Layout {
    mapping(address => address) _delegation;
    mapping(address => Checkpoints.Trace224) _delegateCheckpoints;
    Checkpoints.Trace224 _totalCheckpoints;
  }

  function layout() internal pure returns (Layout storage l) {
    bytes32 position = STORAGE_SLOT;
    assembly {
      l.slot := position
    }
  }
}
