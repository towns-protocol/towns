// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {FeatureManager} from "./FeatureManager.sol";

// contracts

interface IFeatureManagerFacetBase {
  error InvalidThreshold();
  error InvalidTotalSupply();
  error InvalidToken();
  error ConditionNotActive();
}

interface IFeatureManagerFacet is IFeatureManagerFacetBase {
  /// @notice Sets the condition for a feature
  /// @param featureId The unique identifier for the feature
  /// @param condition The condition struct containing token, threshold, active status, and extra data
  /// @dev Only callable by the contract owner
  function setFeatureCondition(
    bytes32 featureId,
    FeatureManager.Condition memory condition
  ) external;

  /// @notice Gets the condition for a feature
  /// @param featureId The unique identifier for the feature
  /// @return The condition struct for the specified feature
  function getFeatureCondition(
    bytes32 featureId
  ) external view returns (FeatureManager.Condition memory);

  /// @notice Checks if a space meets the condition for a feature
  /// @param featureId The unique identifier for the feature
  /// @param space The address of the space to check
  /// @return True if the space meets the threshold for the feature, false otherwise
  function checkFeatureCondition(
    bytes32 featureId,
    address space
  ) external view returns (bool);
}
