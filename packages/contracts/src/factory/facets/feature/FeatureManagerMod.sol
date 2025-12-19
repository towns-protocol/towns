// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IRewardsDistribution} from "../../../base/registry/facets/distribution/v2/IRewardsDistribution.sol";

// libraries
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";
import {LibCall} from "solady/utils/LibCall.sol";
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";

// types
using EnumerableSetLib for EnumerableSetLib.Bytes32Set;
using CustomRevert for bytes4;

/// @notice Emitted when a feature condition is set or updated
/// @param featureId The unique identifier for the feature whose condition was set
/// @param condition The condition parameters that were set for the feature
event FeatureConditionSet(bytes32 indexed featureId, FeatureCondition condition);

/// @notice Emitted when a feature condition is disabled
/// @param featureId The unique identifier for the feature whose condition was disabled
event FeatureConditionDisabled(bytes32 indexed featureId);

/// @notice Error thrown when a threshold exceeds the token's total supply
error InvalidThreshold();

/// @notice Error thrown when a token has zero total supply
error InvalidTotalSupply();

/// @notice Error thrown when an invalid token address is provided (e.g., zero address)
error InvalidToken();

/// @notice Error thrown when the token does not implement the required interfaces (e.g., IVotes and ERC20 totalSupply)
error InvalidInterface();

/// @notice Error thrown when a feature condition is not active
error FeatureNotActive();

/// @notice Error thrown when a feature condition already exists
error FeatureAlreadyExists();

/// @notice Error thrown when an invalid condition type is provided
error InvalidConditionType();

/// @notice The type of condition for a feature
/// @param VotingPower The condition is based on voting power
/// @param StakingPower The condition is based on staking power
enum ConditionType {
    VotingPower,
    StakingPower
}

/// @notice Represents a condition for feature activation
/// @dev Used to determine if a feature should be enabled based on token voting power
/// @param checker The address of the checker used for voting (must implement IVotes)
/// @param threshold The minimum voting power (votes) required to activate the feature
/// @param active Whether the condition is currently active
/// @param extraData Additional data that might be used for specialized condition logic
struct FeatureCondition {
    address checker;
    bool active;
    uint256 threshold;
    bytes extraData;
    ConditionType conditionType;
}

// keccak256(abi.encode(uint256(keccak256("factory.facets.feature.manager.storage")) - 1)) & ~bytes32(uint256(0xff))
bytes32 constant STORAGE_SLOT = 0x20c456a8ea15fcf7965033c954321ffd9dc82a2c65f686a77e2a67da65c29000;

/// @notice Storage layout for the FeatureManager
/// @dev Maps feature IDs to their activation conditions
/// @custom:storage-location erc7201:factory.facets.feature.manager.storage
struct Layout {
    // Feature IDs
    EnumerableSetLib.Bytes32Set featureIds;
    // Feature ID => Condition
    mapping(bytes32 featureId => FeatureCondition condition) conditions;
}

function getStorage() pure returns (Layout storage $) {
    assembly {
        $.slot := STORAGE_SLOT
    }
}

function getSelf() view returns (address self) {
    assembly {
        self := address()
    }
}

/// @notice Creates or updates a feature condition based on the create flag
/// @dev Validates token interface compliance before storing the condition
/// @param featureId The unique identifier for the feature
/// @param condition The condition struct containing token, threshold, active status, and extra data
/// @param writeIfNotExists True to write the condition if it does not exist, false to revert if it does not exist
function upsertFeatureCondition(
    bytes32 featureId,
    FeatureCondition calldata condition,
    bool writeIfNotExists
) {
    if (condition.conditionType == ConditionType.VotingPower) {
        validateVotingInterface(condition);
    } else if (condition.conditionType == ConditionType.StakingPower) {
        validateStakingInterface(condition);
    } else {
        InvalidConditionType.selector.revertWith();
    }

    Layout storage $ = getStorage();
    if (!writeIfNotExists) {
        if (!$.featureIds.contains(featureId)) FeatureNotActive.selector.revertWith();
    } else {
        if (!$.featureIds.add(featureId)) FeatureAlreadyExists.selector.revertWith();
    }

    $.conditions[featureId] = condition;
    emit FeatureConditionSet(featureId, condition);
}

/// @notice Disables a feature by setting its active flag to false
/// @dev This does not delete the condition, only deactivates it
/// @param featureId The unique identifier for the feature to disable
function disableFeatureCondition(bytes32 featureId) {
    FeatureCondition storage condition = getFeatureCondition(featureId);
    if (!condition.active) FeatureNotActive.selector.revertWith();
    condition.active = false;
    emit FeatureConditionDisabled(featureId);
}

/// @notice Retrieves the condition for a specific feature
/// @dev Returns the complete condition struct with all parameters
/// @param featureId The unique identifier for the feature
/// @return The complete condition configuration for the feature
function getFeatureCondition(bytes32 featureId) view returns (FeatureCondition storage) {
    return getStorage().conditions[featureId];
}

/// @notice Retrieves all feature conditions
/// @dev Returns an array of all feature conditions
/// @return conditions An array of all feature conditions
function getFeatureConditions() view returns (FeatureCondition[] memory conditions) {
    Layout storage $ = getStorage();
    // Use values() over at() for full iteration - avoids bounds checking overhead
    bytes32[] memory ids = $.featureIds.values();
    uint256 featureCount = ids.length;

    conditions = new FeatureCondition[](featureCount);
    for (uint256 i; i < featureCount; ++i) {
        conditions[i] = $.conditions[ids[i]];
    }
}

/// @notice Retrieves all feature conditions for a specific addr
/// @dev Returns an array of all feature conditions that are active for the addr
/// @return conditions An array of all feature conditions that are active for the addr
function getFeatureConditionsForAddress(
    address addr
) view returns (FeatureCondition[] memory conditions) {
    Layout storage $ = getStorage();
    // Use values() over at() for full iteration - avoids bounds checking overhead
    bytes32[] memory ids = $.featureIds.values();
    uint256 featureCount = ids.length;

    // Gas optimization: Allocate full array then resize (memory cheaper than storage reads)
    conditions = new FeatureCondition[](featureCount);
    uint256 index;

    for (uint256 i; i < featureCount; ++i) {
        FeatureCondition storage cond = $.conditions[ids[i]];

        if (isValidCondition(cond, addr)) {
            conditions[index++] = cond;
        }
    }

    // Resize array to actual number of valid conditions
    assembly ("memory-safe") {
        mstore(conditions, index)
    }
}

function validateVotingInterface(FeatureCondition calldata condition) view {
    if (condition.checker == address(0)) InvalidToken.selector.revertWith();

    address self = getSelf();

    // Check if the token implements IVotes.getVotes with proper return data
    (bool success, bool exceededMaxCopy, bytes memory data) = LibCall.tryStaticCall(
        condition.checker,
        gasleft(),
        32,
        abi.encodeCall(IVotes.getVotes, (self))
    );

    if (!success || exceededMaxCopy || data.length != 32) InvalidInterface.selector.revertWith();

    // Check if the token implements ERC20.totalSupply with proper return data
    (success, exceededMaxCopy, data) = LibCall.tryStaticCall(
        condition.checker,
        gasleft(),
        32,
        abi.encodeCall(IERC20.totalSupply, ())
    );

    if (!success || exceededMaxCopy || data.length != 32) InvalidInterface.selector.revertWith();

    uint256 totalSupply = abi.decode(data, (uint256));
    if (totalSupply == 0) InvalidTotalSupply.selector.revertWith();
    if (condition.threshold > totalSupply) InvalidThreshold.selector.revertWith();
}

function validateStakingInterface(FeatureCondition calldata condition) view {
    if (condition.checker == address(0)) InvalidToken.selector.revertWith();
    if (condition.threshold > type(uint96).max) InvalidThreshold.selector.revertWith();

    address self = getSelf();
    (bool success, bool exceededMaxCopy, bytes memory data) = LibCall.tryStaticCall(
        condition.checker,
        gasleft(),
        32,
        abi.encodeCall(IRewardsDistribution.stakedByDepositor, (self))
    );

    if (!success || exceededMaxCopy || data.length != 32) InvalidInterface.selector.revertWith();
}

/// @notice Checks if a condition should be included for a given address
/// @dev Returns true if the condition is active, has a valid token, and meets the threshold
/// @param condition The condition to check
/// @param addr The address to check against
/// @return True if the condition should be included, false otherwise
function isValidCondition(FeatureCondition storage condition, address addr) view returns (bool) {
    if (!condition.active) return false;
    if (condition.checker == address(0)) return false;
    if (condition.conditionType == ConditionType.VotingPower) {
        uint256 votes = IVotes(condition.checker).getVotes(addr);
        return votes >= condition.threshold;
    } else if (condition.conditionType == ConditionType.StakingPower) {
        uint96 staked = IRewardsDistribution(condition.checker).stakedByDepositor(addr);
        return staked >= condition.threshold;
    } else {
        return false;
    }
}
