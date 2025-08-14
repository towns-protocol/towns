// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IFeatureManagerFacetBase} from "./IFeatureManagerFacet.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// libraries
import {FeatureManagerStorage} from "./FeatureManagerStorage.sol";
import {FeatureCondition} from "./IFeatureManagerFacet.sol";
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";

// contracts

abstract contract FeatureManagerBase is IFeatureManagerFacetBase {
    using EnumerableSetLib for EnumerableSetLib.Bytes32Set;
    using CustomRevert for bytes4;

    function _setFeatureCondition(bytes32 featureId, FeatureCondition calldata condition) internal {
        if (condition.token == address(0)) InvalidToken.selector.revertWith();

        _validateGetVotes(condition);

        FeatureManagerStorage.Layout storage $ = FeatureManagerStorage.getLayout();
        if (!$.featureIds.add(featureId)) FeatureAlreadyExists.selector.revertWith();
        $.conditions[featureId] = condition;
    }

    function _updateFeatureCondition(
        bytes32 featureId,
        FeatureCondition calldata condition
    ) internal {
        FeatureManagerStorage.Layout storage $ = FeatureManagerStorage.getLayout();
        if (!$.featureIds.contains(featureId)) FeatureNotActive.selector.revertWith();
        $.conditions[featureId] = condition;
    }

    /// @notice Retrieves the condition for a specific feature
    /// @dev Returns the complete condition struct with all parameters
    /// @param featureId The unique identifier for the feature
    /// @return FeatureCondition memory The complete condition configuration for the feature
    function _getFeatureCondition(
        bytes32 featureId
    ) internal view returns (FeatureCondition memory) {
        return FeatureManagerStorage.getLayout().conditions[featureId];
    }

    /// @notice Retrieves all feature conditions
    /// @dev Returns an array of all feature conditions
    /// @return FeatureCondition[] An array of all feature conditions
    function _getFeatureConditions() internal view returns (FeatureCondition[] memory) {
        FeatureManagerStorage.Layout storage $ = FeatureManagerStorage.getLayout();
        uint256 featureCount = $.featureIds.length();

        FeatureCondition[] memory conditions = new FeatureCondition[](featureCount);
        for (uint256 i; i < featureCount; ++i) {
            conditions[i] = $.conditions[$.featureIds.at(i)];
        }
        return conditions;
    }

    /// @notice Retrieves all feature conditions for a specific space
    /// @dev Returns an array of all feature conditions that are active for the space
    /// @return FeatureCondition[] An array of all feature conditions that are active for the space
    function _getFeatureConditionsForSpace(
        address space
    ) internal view returns (FeatureCondition[] memory) {
        FeatureManagerStorage.Layout storage $ = FeatureManagerStorage.getLayout();
        uint256 featureCount = $.featureIds.length();

        FeatureCondition[] memory conditions = new FeatureCondition[](featureCount);
        uint256 index;

        for (uint256 i; i < featureCount; ++i) {
            bytes32 id = $.featureIds.at(i);
            FeatureCondition storage cond = $.conditions[id];
            if (!cond.active) continue;

            address token = cond.token;
            if (token == address(0)) continue;

            uint256 threshold = cond.threshold;
            if (threshold == 0) {
                conditions[index++] = cond;
                continue;
            }

            uint256 votes = IVotes(token).getVotes(space);
            if (votes >= threshold) conditions[index++] = cond;
        }

        assembly ("memory-safe") {
            mstore(conditions, index)
        }

        return conditions;
    }

    /// @notice Disables a feature by setting its active flag to false
    /// @dev This does not delete the condition, only deactivates it
    /// @param featureId The unique identifier for the feature to disable
    function _disableFeatureCondition(bytes32 featureId) internal {
        FeatureCondition storage condition = FeatureManagerStorage.getLayout().conditions[
            featureId
        ];
        if (!condition.active) FeatureNotActive.selector.revertWith();
        condition.active = false;
    }

    function _validateGetVotes(FeatureCondition calldata condition) internal view {
        if (condition.token.code.length == 0) InvalidInterface.selector.revertWith();
        (bool ok, ) = condition.token.staticcall(
            abi.encodeWithSelector(IVotes.getVotes.selector, address(this))
        );
        if (!ok) InvalidInterface.selector.revertWith();

        try IERC20(condition.token).totalSupply() returns (uint256 totalSupply) {
            if (totalSupply == 0) InvalidTotalSupply.selector.revertWith();
            if (condition.threshold > totalSupply) InvalidThreshold.selector.revertWith();
        } catch {
            InvalidInterface.selector.revertWith();
        }
    }

    function isValid(FeatureCondition memory condition) internal pure returns (bool) {
        return condition.active && condition.token != address(0);
    }

    /// @notice Checks if the given number of votes meets the condition's threshold
    /// @dev Returns false if condition is inactive, true if threshold is 0, otherwise compares
    /// votes to threshold
    /// @param condition The condition containing the threshold and active status
    /// @param votes The number of votes to check against the threshold
    /// @return True if the condition is met, false otherwise
    function _meetsThreshold(
        FeatureCondition memory condition,
        uint256 votes
    ) internal pure returns (bool) {
        if (!isValid(condition)) return false;
        uint256 threshold = condition.threshold;
        if (threshold == 0) return true;
        return votes >= threshold;
    }
}
