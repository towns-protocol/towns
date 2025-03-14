// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {UnlockConditionLib} from "./UnlockConditionLib.sol";
import {SpaceUnlockStatusLib} from "./SpaceUnlockStatusLib.sol";

/// @title IUnlockBase
/// @notice Base interface containing events and errors for the Unlock system
interface IUnlockBase {
  // =============================================================
  //                            Events
  // =============================================================
  /// @notice Emitted when a feature becomes unlocked for a space
  /// @param featureId The identifier of the feature that was unlocked
  /// @param space The address of the space where the feature was unlocked
  /// @param totalStake The total stake amount at the time of unlocking
  event FeatureUnlocked(
    bytes32 indexed featureId,
    address indexed space,
    uint256 totalStake
  );

  /// @notice Emitted when a feature becomes locked for a space
  /// @param featureId The identifier of the feature that was locked
  /// @param space The address of the space where the feature was locked
  /// @param totalStake The total stake amount at the time of locking
  event FeatureLocked(
    bytes32 indexed featureId,
    address indexed space,
    uint256 totalStake
  );

  /// @notice Emitted when unlock conditions are set for a feature
  /// @param featureId The identifier of the feature
  /// @param condition The new unlock condition parameters
  event UnlockConditionSet(
    bytes32 indexed featureId,
    UnlockConditionLib.UnlockCondition condition
  );

  /// @notice Emitted when the global grace period is updated
  /// @param newGracePeriod The new grace period duration in seconds
  event GracePeriodSet(uint40 newGracePeriod);

  // =============================================================
  //                            Errors
  // =============================================================
  /// @notice Thrown when an invalid threshold is set for a feature
  error Unlock__InvalidThreshold();
  /// @notice Thrown when attempting to use a feature that is not active
  error Unlock__FeatureNotActive();
  /// @notice Thrown when attempting to set an invalid grace period
  error Unlock__InvalidGracePeriod();
  /// @notice Thrown when attempting to check a feature with no unlock condition set
  error Unlock__ConditionNotSet();
}

/// @title IUnlock
/// @notice Main interface for the Unlock system that manages feature access based on staking conditions
interface IUnlock is IUnlockBase {
  /// @notice Sets the unlock condition for a specific feature
  /// @param featureId The identifier of the feature to set conditions for
  /// @param condition The unlock condition parameters
  function setUnlockCondition(
    bytes32 featureId,
    UnlockConditionLib.UnlockCondition calldata condition
  ) external;

  /// @notice Sets the global grace period for all features
  /// @param newGracePeriod The new grace period duration in seconds
  function setGracePeriod(uint40 newGracePeriod) external;

  /// @notice Checks and updates the unlock status for a feature in a space
  /// @dev This function is called by other facets (e.g., TippingFacet, RewardsDistributionFacet)
  ///      when they need to verify if a space has access to their feature
  /// @param space The address of the space to check
  /// @param featureId The identifier of the feature to check
  /// @return unlocked True if the feature is unlocked for the space
  function checkAndUpdateUnlockStatus(
    address space,
    bytes32 featureId
  ) external returns (bool unlocked);

  /// @notice Checks if a feature is currently unlocked for a space without updating its status
  /// @dev This function is called by other facets (e.g., TippingFacet, RewardsDistributionFacet)
  ///      to check if a space has access to a feature without updating its status.
  ///      For status updates, use checkAndUpdateUnlockStatus instead.
  /// @param featureId The identifier of the feature to check (COMMUNITY_REWARDS, EXTENDED_STAKING, or ERC20_TIPPING)
  /// @param space The address of the space to check
  /// @return True if the feature is unlocked for the space
  function isFeatureUnlocked(
    bytes32 featureId,
    address space
  ) external view returns (bool);

  /// @notice Gets the current unlock status for a feature in a space
  /// @param space The address of the space to check
  /// @param featureId The identifier of the feature to check
  /// @return The current unlock status including stake amount and timing information
  function getSpaceUnlockStatus(
    address space,
    bytes32 featureId
  ) external view returns (SpaceUnlockStatusLib.SpaceUnlockStatus memory);
}
