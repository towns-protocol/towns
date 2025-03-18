// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {FeatureManager} from "./FeatureManager.sol";

// contracts

library FeatureManagerStorage {
  // keccak256(abi.encode(uint256(keccak256("towns.storage.FeatureManager")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 constant STORAGE_SLOT =
    0xbf0291a9764d4152828d672b8fee3b84a943cf12027e2908bad1a29d55a8f400;

  // Internal functions
  function getLayout()
    internal
    pure
    returns (FeatureManager.Layout storage self)
  {
    assembly {
      self.slot := STORAGE_SLOT
    }
  }
}
