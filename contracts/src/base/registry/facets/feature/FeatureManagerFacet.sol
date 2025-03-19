// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IFeatureManagerFacet} from "./IFeatureManagerFacet.sol";

// libraries
import {FeatureManager} from "./FeatureManager.sol";

// contracts
import {OwnableBase} from "@river-build/diamond/src/facets/ownable/OwnableBase.sol";
import {Facet} from "@river-build/diamond/src/facets/Facet.sol";

contract FeatureManagerFacet is IFeatureManagerFacet, OwnableBase, Facet {
  using FeatureManager for FeatureManager.Layout;

  function __FeatureManagerFacet_init() external onlyInitializing {}

  /// @inheritdoc IFeatureManagerFacet
  function setFeatureCondition(
    bytes32 featureId,
    FeatureManager.Condition memory condition
  ) external onlyOwner {
    FeatureManager.getLayout().setFeatureCondition(featureId, condition);
    emit FeatureConditionSet(featureId, condition);
  }

  /// @inheritdoc IFeatureManagerFacet
  function disableFeatureCondition(bytes32 featureId) external onlyOwner {
    FeatureManager.getLayout().disableFeatureCondition(featureId);
    emit FeatureConditionDisabled(featureId);
  }

  /// @inheritdoc IFeatureManagerFacet
  function getFeatureCondition(
    bytes32 featureId
  ) external view returns (FeatureManager.Condition memory) {
    return FeatureManager.getLayout().getFeatureCondition(featureId);
  }

  /// @inheritdoc IFeatureManagerFacet
  function checkFeatureCondition(
    bytes32 featureId,
    address space
  ) external view returns (bool) {
    return FeatureManager.getLayout().meetsThreshold(featureId, space);
  }
}
