// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {FeatureCondition} from "./FeatureConditionLib.sol";

// contracts

/// @title IFeatureManagerFacetBase
/// @notice Base interface for the FeatureManager facet defining errors and events
/// @dev Used by the FeatureManager facet and any other facets that need to access feature conditions
interface IFeatureManagerFacetBase {
    /// @notice Error thrown when a threshold exceeds the token's total supply
    error InvalidThreshold();

    /// @notice Error thrown when a token has zero total supply
    error InvalidTotalSupply();

    /// @notice Error thrown when an invalid token address is provided (zero address or non-IVotes token)
    error InvalidToken();

    /// @notice Error thrown when an invalid token interface is provided
    error InvalidInterface();

    /// @notice Error thrown when a feature condition is not active
    error FeatureNotActive();

    /// @notice Emitted when a feature condition is set or updated
    /// @param featureId The unique identifier for the feature whose condition was set
    /// @param condition The condition parameters that were set for the feature
    event FeatureConditionSet(bytes32 indexed featureId, FeatureCondition condition);

    /// @notice Emitted when a feature condition is disabled
    /// @param featureId The unique identifier for the feature whose condition was disabled
    event FeatureConditionDisabled(bytes32 indexed featureId);
}

interface IFeatureManagerFacet is IFeatureManagerFacetBase {
    /// @notice Sets the condition for a feature
    /// @param featureId The unique identifier for the feature
    /// @param condition The condition struct containing token, threshold, active status, and extra data
    /// @dev Only callable by the contract owner
    function setFeatureCondition(bytes32 featureId, FeatureCondition memory condition) external;

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

    /// @notice Disables a feature condition
    /// @param featureId The unique identifier for the feature
    /// @dev Only callable by the contract owner
    function disableFeatureCondition(bytes32 featureId) external;

    /// @notice Checks if a space meets the condition for a feature
    /// @param featureId The unique identifier for the feature
    /// @param space The address of the space to check
    /// @return True if the space meets the threshold for the feature, false otherwise
    function checkFeatureCondition(bytes32 featureId, address space) external view returns (bool);
}
