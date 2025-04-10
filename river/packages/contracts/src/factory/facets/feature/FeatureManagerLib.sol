// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

import {IFeatureManagerFacetBase} from "./IFeatureManagerFacet.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

// libraries

import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";
import {FeatureCondition, FeatureConditionLib} from "./FeatureConditionLib.sol";
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";

/// @title FeatureManager
library FeatureManagerLib {
    using EnumerableSetLib for EnumerableSetLib.Bytes32Set;
    using FeatureConditionLib for FeatureCondition;

    // keccak256(abi.encode(uint256(keccak256("factory.facets.feature.manager.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 constant DEFAULT_STORAGE_SLOT =
        0x20c456a8ea15fcf7965033c954321ffd9dc82a2c65f686a77e2a67da65c29000;

    /// @notice Storage layout for the FeatureManager
    /// @dev Maps feature IDs to their activation conditions
    /// @custom:storage-location erc7201:towns.storage.FeatureManager
    struct Layout {
        // Feature IDs
        EnumerableSetLib.Bytes32Set featureIds;
        // Feature ID => Condition
        mapping(bytes32 featureId => FeatureCondition condition) conditions;
    }

    /// @notice Sets the condition for a specific feature
    /// @dev Validates token, threshold, and total supply to ensure proper configuration
    /// @param self The storage layout pointer
    /// @param featureId The unique identifier for the feature
    /// @param condition The condition parameters for feature activation
    /// @custom:error InvalidToken Thrown when token is address(0) or doesn't support IVotes
    /// @custom:error InvalidTotalSupply Thrown when token total supply is 0
    /// @custom:error InvalidThreshold Thrown when threshold exceeds total supply
    function setFeatureCondition(
        Layout storage self,
        bytes32 featureId,
        FeatureCondition calldata condition
    ) internal {
        if (condition.token == address(0)) {
            CustomRevert.revertWith(IFeatureManagerFacetBase.InvalidToken.selector);
        }

        _validateGetVotes(condition);

        // Check totalSupply directly
        try IERC20(condition.token).totalSupply() returns (uint256 totalSupply) {
            if (totalSupply == 0) {
                CustomRevert.revertWith(IFeatureManagerFacetBase.InvalidTotalSupply.selector);
            }

            if (condition.threshold > totalSupply) {
                CustomRevert.revertWith(IFeatureManagerFacetBase.InvalidThreshold.selector);
            }
        } catch {
            CustomRevert.revertWith(IFeatureManagerFacetBase.InvalidToken.selector);
        }

        self.featureIds.add(featureId);
        self.conditions[featureId] = condition;
    }

    /// @notice Retrieves the condition for a specific feature
    /// @dev Returns the complete condition struct with all parameters
    /// @param self The storage layout pointer
    /// @param featureId The unique identifier for the feature
    /// @return Condition memory The complete condition configuration for the feature
    function getFeatureCondition(
        Layout storage self,
        bytes32 featureId
    ) internal view returns (FeatureCondition memory) {
        return self.conditions[featureId];
    }

    /// @notice Retrieves all feature conditions
    /// @dev Returns an array of all feature conditions
    /// @param self The storage layout pointer
    /// @return Condition[] An array of all feature conditions
    function getFeatureConditions(
        Layout storage self
    ) internal view returns (FeatureCondition[] memory) {
        uint256 featureCount = self.featureIds.length();

        FeatureCondition[] memory conditions = new FeatureCondition[](featureCount);
        for (uint256 i; i < featureCount; ++i) {
            conditions[i] = self.conditions[self.featureIds.at(i)];
        }
        return conditions;
    }

    /// @notice Retrieves all feature conditions for a specific space
    /// @dev Returns an array of all feature conditions that are active for the space
    /// @param self The storage layout pointer
    /// @param space The address of the space to check conditions for
    /// @return Condition[] An array of all feature conditions that are active for the space
    function getFeatureConditionsForSpace(
        Layout storage self,
        address space
    ) internal view returns (FeatureCondition[] memory) {
        uint256 featureCount = self.featureIds.length();

        FeatureCondition[] memory conditions = new FeatureCondition[](featureCount);
        uint256 index;

        for (uint256 i; i < featureCount; ++i) {
            FeatureCondition storage condition = self.conditions[self.featureIds.at(i)];
            uint256 votes = condition.getVotes(space);

            if (condition.meetsThreshold(votes)) {
                conditions[index++] = condition;
            }
        }

        assembly ("memory-safe") {
            mstore(conditions, index)
        }

        return conditions;
    }

    /// @notice Disables a feature by setting its active flag to false
    /// @dev This does not delete the condition, only deactivates it
    /// @param self The storage layout pointer
    /// @param featureId The unique identifier for the feature to disable
    function disableFeatureCondition(Layout storage self, bytes32 featureId) internal {
        FeatureCondition storage condition = self.conditions[featureId];
        if (!condition.active) {
            CustomRevert.revertWith(IFeatureManagerFacetBase.FeatureNotActive.selector);
        }
        condition.active = false;
    }

    function _validateGetVotes(FeatureCondition calldata condition) internal view {
        // Check IVotes support by attempting to call getVotes
        try IVotes(condition.token).getVotes(address(this)) returns (uint256) {
            // If we get here, getVotes is supported
            return;
        } catch {
            CustomRevert.revertWith(IFeatureManagerFacetBase.InvalidInterface.selector);
        }
    }

    /// @notice Retrieves the layout for the FeatureManager at the default storage slot
    /// @dev This is accessed by the facet contract
    /// @return $ The layout storage pointer
    function getLayout() internal pure returns (Layout storage $) {
        return getLayout(DEFAULT_STORAGE_SLOT);
    }

    /// @notice Retrieves the layout for the FeatureManager at a custom storage slot
    /// @dev This function is used to access the storage layout for a given slot
    /// @param slot The storage slot to retrieve the layout for
    /// @return $ The layout storage pointer
    function getLayout(bytes32 slot) internal pure returns (Layout storage $) {
        assembly {
            $.slot := slot
        }
    }
}
