// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {UnlockConditionLib} from "./UnlockConditionLib.sol";

library SpaceUnlockStatusLib {
  struct SpaceUnlockStatus {
    uint40 thresholdMaintainedSince; // When space first hit threshold
    bool isUnlocked; // If feature is currently unlocked
    uint40 graceStartTime; // When grace period started (0 if not in grace)
  }

  function updateStatus(
    SpaceUnlockStatus storage self,
    UnlockConditionLib.UnlockCondition storage condition,
    uint256 currentStake,
    uint40 gracePeriod
  ) internal returns (bool statusChanged) {
    uint40 currentTime = uint40(block.timestamp);
    bool meetsThreshold = condition.threshold <= currentStake;

    // Update threshold maintenance tracking
    if (meetsThreshold) {
      if (self.thresholdMaintainedSince == 0) {
        self.thresholdMaintainedSince = currentTime;
      }
      self.graceStartTime = 0;
    } else if (self.thresholdMaintainedSince != 0) {
      if (self.graceStartTime == 0) {
        self.graceStartTime = currentTime;
      }
      // Reset maintenance tracking if grace period expired
      if (_isGracePeriodExpired(self.graceStartTime, gracePeriod)) {
        self.thresholdMaintainedSince = 0;
        self.graceStartTime = 0;
      }
    }

    // Check if should be unlocked based on condition requirements
    bool shouldBeUnlocked = meetsThreshold &&
      (condition.durationRequired == 0 ||
        currentTime >=
        self.thresholdMaintainedSince + condition.durationRequired);

    // Check grace period if currently unlocked but not meeting requirements
    if (!shouldBeUnlocked && self.isUnlocked) {
      shouldBeUnlocked = _isInGracePeriod(self.graceStartTime, gracePeriod);
    }

    // Update status and return if it changed
    statusChanged = shouldBeUnlocked != self.isUnlocked;
    self.isUnlocked = shouldBeUnlocked;
  }

  function _isInGracePeriod(
    uint40 graceStartTime,
    uint40 gracePeriod
  ) private view returns (bool) {
    return
      graceStartTime != 0 && block.timestamp <= graceStartTime + gracePeriod;
  }

  function _isGracePeriodExpired(
    uint40 graceStartTime,
    uint40 gracePeriod
  ) private view returns (bool) {
    return
      graceStartTime != 0 && block.timestamp > graceStartTime + gracePeriod;
  }
}
