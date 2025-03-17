// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {FeatureManager} from "./FeatureManager.sol";
import {FeatureSettings} from "./FeatureSettings.sol";
// contracts

library FeatureStorage {
  // keccak256(abi.encode(uint256(keccak256("base.facets.feature.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 constant STORAGE_SLOT =
    0x4db766a152b44ca1b06c255217c80ffe82b4d84659a2a9cc46df4788e7d78300;

  struct Layout {
    FeatureManager.Layout featureManager;
    FeatureSettings.Layout featureSettings;
  }

  function layout() internal pure returns (Layout storage self) {
    assembly {
      self.slot := STORAGE_SLOT
    }
  }
}
