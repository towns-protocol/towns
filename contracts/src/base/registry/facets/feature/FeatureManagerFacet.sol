// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IFeatureManagerFacet} from "./IFeatureManagerFacet.sol";

// libraries
import {FeatureManagerLib, ConditionLib} from "./FeatureManagerLib.sol";

// contracts
import {OwnableBase} from "@towns-protocol/diamond/src/facets/ownable/OwnableBase.sol";
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";

/// @title FeatureManagerFacet
/// @notice Manages feature conditions and checks for spaces
/// @dev This facet is responsible for managing feature conditions and checking if a space meets the condition for a feature to be enabled
contract FeatureManagerFacet is IFeatureManagerFacet, OwnableBase, Facet {
  using FeatureManagerLib for FeatureManagerLib.Layout;
  using ConditionLib for ConditionLib.Condition;

  function __FeatureManagerFacet_init() external onlyInitializing {}

  /// @inheritdoc IFeatureManagerFacet
  function setFeatureCondition(
    bytes32 featureId,
    ConditionLib.Condition calldata condition
  ) external onlyOwner {
    FeatureManagerLib.getLayout().setFeatureCondition(featureId, condition);
    emit FeatureConditionSet(featureId, condition);
  }

  /// @inheritdoc IFeatureManagerFacet
  function getFeatureCondition(
    bytes32 featureId
  ) external view returns (ConditionLib.Condition memory) {
    return FeatureManagerLib.getLayout().getFeatureCondition(featureId);
  }

  /// @inheritdoc IFeatureManagerFacet
  function getFeatureConditions()
    external
    view
    returns (ConditionLib.Condition[] memory)
  {
    return FeatureManagerLib.getLayout().getFeatureConditions();
  }

  /// @inheritdoc IFeatureManagerFacet
  function getFeatureConditionsForSpace(
    address space
  ) external view returns (ConditionLib.Condition[] memory) {
    return FeatureManagerLib.getLayout().getFeatureConditionsForSpace(space);
  }

  /// @inheritdoc IFeatureManagerFacet
  function disableFeatureCondition(bytes32 featureId) external onlyOwner {
    FeatureManagerLib.getLayout().disableFeatureCondition(featureId);
    emit FeatureConditionDisabled(featureId);
  }

  /// @inheritdoc IFeatureManagerFacet
  function checkFeatureCondition(
    bytes32 featureId,
    address space
  ) external view returns (bool) {
    ConditionLib.Condition storage condition = FeatureManagerLib
      .getLayout()
      .conditions[featureId];
    if (!condition.isValid()) return false;
    uint256 votes = condition.getVotes(space);
    return condition.meetsThreshold(votes);
  }
}
