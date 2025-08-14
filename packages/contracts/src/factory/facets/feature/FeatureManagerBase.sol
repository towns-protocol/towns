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
import {LibCall} from "solady/utils/LibCall.sol";

// contracts

abstract contract FeatureManagerBase is IFeatureManagerFacetBase {
    using EnumerableSetLib for EnumerableSetLib.Bytes32Set;
    using CustomRevert for bytes4;

    function _upsertFeatureCondition(
        bytes32 featureId,
        FeatureCondition calldata condition,
        bool create
    ) internal {
        _validateToken(condition);

        FeatureManagerStorage.Layout storage $ = FeatureManagerStorage.getLayout();
        if (create && !$.featureIds.add(featureId)) {
            FeatureAlreadyExists.selector.revertWith();
        } else if (!create && !$.featureIds.contains(featureId)) {
            FeatureNotActive.selector.revertWith();
        }

        $.conditions[featureId] = condition;
    }

    /// @notice Retrieves the condition for a specific feature
    /// @dev Returns the complete condition struct with all parameters
    /// @param featureId The unique identifier for the feature
    /// @return result The complete condition configuration for the feature
    function _getFeatureCondition(
        bytes32 featureId
    ) internal view returns (FeatureCondition memory result) {
        FeatureManagerStorage.Layout storage $ = FeatureManagerStorage.getLayout();
        assembly ("memory-safe") {
            mstore(0x40, result)
        }
        result = $.conditions[featureId];
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

            if (_isValidCondition(cond, space)) {
                conditions[index++] = cond;
            }
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

    /// @notice Sets a feature condition (wrapper for upsert with create=true)
    /// @param featureId The unique identifier for the feature
    /// @param condition The condition struct containing token, threshold, active status, and extra data
    function _setFeatureCondition(bytes32 featureId, FeatureCondition calldata condition) internal {
        _upsertFeatureCondition(featureId, condition, true);
    }

    /// @notice Updates a feature condition (wrapper for upsert with create=false)
    /// @param featureId The unique identifier for the feature
    /// @param condition The condition struct containing token, threshold, active status, and extra data
    function _updateFeatureCondition(
        bytes32 featureId,
        FeatureCondition calldata condition
    ) internal {
        _upsertFeatureCondition(featureId, condition, false);
    }

    function _validateToken(FeatureCondition calldata condition) internal view {
        if (condition.token == address(0)) InvalidToken.selector.revertWith();

        // Check if the token implements IVotes.getVotes with proper return data
        (bool success, bool exceededMaxCopy, bytes memory data) = LibCall.tryStaticCall(
            condition.token,
            gasleft(),
            32,
            abi.encodeCall(IVotes.getVotes, (address(this)))
        );

        if (!success || exceededMaxCopy || data.length != 32)
            InvalidInterface.selector.revertWith();

        // Check if the token implements ERC20.totalSupply with proper return data
        (success, exceededMaxCopy, data) = LibCall.tryStaticCall(
            condition.token,
            gasleft(),
            32,
            abi.encodeCall(IERC20.totalSupply, ())
        );

        if (!success || exceededMaxCopy || data.length != 32)
            InvalidInterface.selector.revertWith();

        uint256 totalSupply = abi.decode(data, (uint256));
        if (totalSupply == 0) InvalidTotalSupply.selector.revertWith();
        if (condition.threshold > totalSupply) InvalidThreshold.selector.revertWith();
    }

    /// @notice Checks if a condition should be included for a given space
    /// @dev Returns true if the condition is active, has a valid token, and meets the threshold
    /// @param condition The condition to check
    /// @param space The space address to check against
    /// @return True if the condition should be included, false otherwise
    function _isValidCondition(
        FeatureCondition memory condition,
        address space
    ) internal view returns (bool) {
        if (!condition.active) return false;
        if (condition.token == address(0)) return false;
        uint256 votes = IVotes(condition.token).getVotes(space);
        return votes >= condition.threshold;
    }
}
