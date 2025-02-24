// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {UnlockConditionLib} from "./UnlockConditionLib.sol";
import {SpaceUnlockStatusLib} from "./SpaceUnlockStatusLib.sol";

interface IUnlockBase {
  // =============================================================
  //                            Events
  // =============================================================
  event FeatureUnlocked(
    bytes32 indexed featureId,
    address indexed space,
    uint256 totalStake
  );

  event FeatureLocked(
    bytes32 indexed featureId,
    address indexed space,
    uint256 totalStake
  );

  event UnlockConditionSet(
    bytes32 indexed featureId,
    UnlockConditionLib.UnlockCondition condition
  );

  event GracePeriodSet(uint40 newGracePeriod);

  // =============================================================
  //                            Errors
  // =============================================================
  error Unlock__InvalidThreshold();
  error Unlock__FeatureNotActive();
  error Unlock__InvalidGracePeriod();
  error Unlock__ConditionNotSet();
}

interface IUnlock is IUnlockBase {
  // =============================================================
  //                           Functions
  // =============================================================
  function setUnlockCondition(
    bytes32 featureId,
    UnlockConditionLib.UnlockCondition calldata condition
  ) external;

  function setGracePeriod(uint40 newGracePeriod) external;

  function checkAndUpdateUnlockStatus(
    address space,
    bytes32 featureId
  ) external returns (bool unlocked);

  function isFeatureUnlocked(
    bytes32 featureId,
    address space
  ) external view returns (bool);

  function getSpaceUnlockStatus(
    address space,
    bytes32 featureId
  ) external view returns (SpaceUnlockStatusLib.SpaceUnlockStatus memory);
}
