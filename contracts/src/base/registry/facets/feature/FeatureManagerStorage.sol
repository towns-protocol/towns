// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {FeatureManager} from "./FeatureManager.sol";
// contracts

library FeatureManagerStorage {
  // keccak256(abi.encode(uint256(keccak256("base.registry.facets.feature.manager.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 constant STORAGE_SLOT =
    0xf272e760cd685bcdbbfb402f9e88b4094614cd4d33ce331129e4bfa1be6e5000;

  function layout() internal pure returns (FeatureManager.Layout storage self) {
    assembly {
      self.slot := STORAGE_SLOT
    }
  }
}
