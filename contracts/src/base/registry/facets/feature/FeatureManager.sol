// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IFeatureManagerFacetBase} from "./IFeatureManagerFacet.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

// libraries
import {CustomRevert} from "contracts/src/utils/libraries/CustomRevert.sol";

/// @title FeatureManager
/// @author Towns Protocol
/// @notice Library for managing feature conditions and their activation thresholds
/// @dev Follows diamond storage pattern and implements token-based feature gating
/// @custom:security-contact security@towns.com
library FeatureManager {
  // keccak256(abi.encode(uint256(keccak256("towns.storage.FeatureManager")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 constant STORAGE_SLOT =
    0xbf0291a9764d4152828d672b8fee3b84a943cf12027e2908bad1a29d55a8f400;

  /// @notice Condition struct for feature conditions
  /// @param token The token to be used to check the threshold
  /// @param threshold The amount of tokens needed to activate the feature
  /// @param active If this feature is currently active
  /// @param extraData Additional parameters for specific features
  struct Condition {
    address token;
    uint256 threshold;
    bool active;
    bytes extraData;
  }

  /// @notice Storage layout for the FeatureManager
  /// @dev Maps feature IDs to their activation conditions
  /// @custom:storage-location erc7201:towns.storage.FeatureManager
  struct Layout {
    // Feature ID => Condition
    mapping(bytes32 featureId => Condition condition) conditions;
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
    Condition memory condition
  ) internal {
    if (condition.token == address(0))
      CustomRevert.revertWith(IFeatureManagerFacetBase.InvalidToken.selector);

    if (!IERC165(condition.token).supportsInterface(type(IVotes).interfaceId))
      CustomRevert.revertWith(
        IFeatureManagerFacetBase.InvalidInterface.selector
      );

    uint256 totalSupply = IERC20(condition.token).totalSupply();

    if (totalSupply == 0)
      CustomRevert.revertWith(
        IFeatureManagerFacetBase.InvalidTotalSupply.selector
      );

    if (condition.threshold > totalSupply)
      CustomRevert.revertWith(
        IFeatureManagerFacetBase.InvalidThreshold.selector
      );

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
  ) internal view returns (Condition memory) {
    return self.conditions[featureId];
  }

  /// @notice Disables a feature by setting its active flag to false
  /// @dev This does not delete the condition, only deactivates it
  /// @param self The storage layout pointer
  /// @param featureId The unique identifier for the feature to disable
  function disableFeatureCondition(
    Layout storage self,
    bytes32 featureId
  ) internal {
    Condition memory condition = self.conditions[featureId];
    if (!condition.active)
      CustomRevert.revertWith(
        IFeatureManagerFacetBase.FeatureNotActive.selector
      );
    self.conditions[featureId].active = false;
  }

  /// @notice Checks if a space meets the threshold for a specific feature
  /// @dev Evaluates token voting power against the required threshold
  /// @param self The storage layout pointer
  /// @param featureId The unique identifier for the feature
  /// @param space The address of the space to check for threshold
  /// @return bool True if the space meets the threshold, false otherwise
  function meetsThreshold(
    Layout storage self,
    bytes32 featureId,
    address space
  ) internal view returns (bool) {
    Condition memory condition = self.conditions[featureId];
    if (!condition.active) return false;
    if (condition.threshold == 0) return true;
    return IVotes(condition.token).getVotes(space) >= condition.threshold;
  }

  /// @notice Returns the layout for the FeatureManager
  /// @dev This is accessed by the facet contract
  /// @return self The layout storage pointer
  function getLayout() internal pure returns (Layout storage self) {
    assembly {
      self.slot := STORAGE_SLOT
    }
  }
}
