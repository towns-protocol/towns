// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {FeatureCondition} from "./FeatureManagerMod.sol";

interface IFeatureManager {
    /// @notice Sets the condition for a feature
    /// @param featureId The unique identifier for the feature
    /// @param condition The condition struct containing token, threshold, active status, and extra data
    /// @dev Only callable by the contract owner
    function setFeatureCondition(bytes32 featureId, FeatureCondition memory condition) external;

    /// @notice Updates the condition for a feature
    /// @param featureId The unique identifier for the feature
    /// @param condition The condition struct containing token, threshold, active status, and extra data
    /// @dev Only callable by the contract owner
    function updateFeatureCondition(bytes32 featureId, FeatureCondition memory condition) external;

    /// @notice Disables a feature condition
    /// @param featureId The unique identifier for the feature
    /// @dev Only callable by the contract owner
    function disableFeatureCondition(bytes32 featureId) external;

    /// @notice Gets the condition for a feature
    /// @param featureId The unique identifier for the feature
    /// @return The condition struct for the specified feature
    function getFeatureCondition(bytes32 featureId) external view returns (FeatureCondition memory);

    /// @notice Retrieves all feature conditions
    /// @return An array of all feature conditions
    function getFeatureConditions() external view returns (FeatureCondition[] memory);

    /// @notice Retrieves all feature conditions for a specific space
    /// @param space The address of the space to check conditions for
    /// @return An array of all feature conditions that are active for the space
    function getFeatureConditionsForSpace(
        address space
    ) external view returns (FeatureCondition[] memory);

    /// @notice Checks if a space meets the condition for a feature
    /// @param featureId The unique identifier for the feature
    /// @param space The address of the space to check
    /// @return True if the space meets the threshold for the feature, false otherwise
    function checkFeatureCondition(bytes32 featureId, address space) external view returns (bool);
}
