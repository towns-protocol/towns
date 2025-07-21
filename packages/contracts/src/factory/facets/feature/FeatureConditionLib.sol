// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";

/// @notice Represents a condition for feature activation
/// @dev Used to determine if a feature should be enabled based on token voting power
/// @param token The address of the token used for voting (must implement IVotes)
/// @param threshold The minimum number of delegations required to activate the feature
/// @param active Whether the condition is currently active
/// @param extraData Additional data that might be used for specialized condition logic
struct FeatureCondition {
    address token;
    bool active;
    uint256 threshold;
    bytes extraData;
}

/// @title FeatureConditionLib
library FeatureConditionLib {
    function isValid(FeatureCondition storage condition) internal view returns (bool) {
        return condition.active && condition.token != address(0);
    }

    /// @notice Gets the voting power of a space for the condition's token
    /// @dev Calls the getVotes function on the token contract
    /// @param condition The condition containing the token address
    /// @param space The address of the space to check votes for
    /// @return The number of votes the space has with the token
    function getVotes(
        FeatureCondition storage condition,
        address space
    ) internal view returns (uint256) {
        return IVotes(condition.token).getVotes(space);
    }

    /// @notice Checks if the given number of votes meets the condition's threshold
    /// @dev Returns false if condition is inactive, true if threshold is 0, otherwise compares
    /// votes to threshold
    /// @param condition The condition containing the threshold and active status
    /// @param votes The number of votes to check against the threshold
    /// @return True if the condition is met, false otherwise
    function meetsThreshold(
        FeatureCondition storage condition,
        uint256 votes
    ) internal view returns (bool) {
        if (!isValid(condition)) return false;
        uint256 threshold = condition.threshold;
        if (threshold == 0) return true;
        return votes >= threshold;
    }
}
