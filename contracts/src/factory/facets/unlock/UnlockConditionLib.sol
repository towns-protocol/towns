// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

library UnlockConditionLib {
  struct UnlockCondition {
    uint256 threshold; // Amount of tokens needed
    uint40 durationRequired; // Time needed to maintain threshold (0 for instant)
    bool active; // If this feature is currently active
    bytes extraData; // Additional parameters for specific features
  }

  function validate(UnlockCondition storage self) internal view returns (bool) {
    return self.threshold != 0;
  }

  function isActive(UnlockCondition storage self) internal view returns (bool) {
    return self.active;
  }

  function checkThreshold(
    UnlockCondition storage self,
    uint256 currentAmount
  ) internal view returns (bool) {
    return currentAmount >= self.threshold;
  }

  function checkDuration(
    UnlockCondition storage self,
    uint40 maintainedSince
  ) internal view returns (bool) {
    if (self.durationRequired == 0) return true;
    return block.timestamp >= maintainedSince + self.durationRequired;
  }

  function shouldBeUnlocked(
    UnlockCondition storage self,
    uint256 currentAmount,
    uint40 maintainedSince
  ) internal view returns (bool) {
    return
      checkThreshold(self, currentAmount) &&
      checkDuration(self, maintainedSince);
  }
}
