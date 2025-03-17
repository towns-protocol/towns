// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {CustomRevert} from "contracts/src/utils/libraries/CustomRevert.sol";

// contracts

library FeatureManager {
  error InvalidThreshold();

  struct FeatureCondition {
    uint256 threshold; // Amount of tokens needed
    uint40 durationRequired; // Time needed to maintain threshold (0 for instant)
    bool active; // If this feature is currently active
    bytes extraData; // Additional parameters for specific features
  }

  struct Layout {
    // Feature ID => FeatureCondition
    mapping(bytes32 => FeatureCondition) conditions;
  }

  function createFeatureCondition(
    Layout storage self,
    bytes32 featureId,
    FeatureCondition memory condition
  ) internal {
    validateFeatureCondition(condition);
    self.conditions[featureId] = condition;
  }

  // Validation
  function validateFeatureCondition(
    FeatureCondition memory condition
  ) internal pure {
    if (condition.threshold == 0)
      CustomRevert.revertWith(InvalidThreshold.selector);
  }
}
