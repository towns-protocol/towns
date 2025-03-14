// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {UnlockConditionLib} from "./UnlockConditionLib.sol";
import {SpaceUnlockStatusLib} from "./SpaceUnlockStatusLib.sol";

library UnlockStorage {
  bytes32 internal constant STORAGE_SLOT =
    keccak256("factory.facets.unlock.storage");

  struct Layout {
    // Feature ID => UnlockCondition
    mapping(bytes32 => UnlockConditionLib.UnlockCondition) unlockConditions;
    // Feature ID => Space => UnlockStatus
    mapping(bytes32 => mapping(address => SpaceUnlockStatusLib.SpaceUnlockStatus)) spaceUnlockStatus;
    // Global grace period in seconds
    uint40 gracePeriod;
  }

  function layout() internal pure returns (Layout storage l) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      l.slot := slot
    }
  }
}
