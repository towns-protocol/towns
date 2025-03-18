// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IFeatureFacet} from "./IFeatureFacet.sol";

// libraries
import {FeatureManager} from "./FeatureManager.sol";
import {FeatureStorage} from "./FeatureStorage.sol";

// contracts
import {OwnableBase} from "@river-build/diamond/src/facets/ownable/OwnableBase.sol";
import {Facet} from "@river-build/diamond/src/facets/Facet.sol";

contract FeatureFacet is IFeatureFacet, OwnableBase, Facet {
  using FeatureManager for FeatureManager.Layout;

  function __FeatureFacet_init() external onlyInitializing {}

  // Feature condition
  function setFeatureCondition(
    bytes32 featureId,
    FeatureManager.Condition memory condition
  ) external {
    FeatureStorage.layout().setFeatureCondition(featureId, condition);
  }

  function getFeatureCondition(
    bytes32 featureId
  ) external view returns (FeatureManager.Condition memory) {
    return FeatureStorage.layout().getFeatureCondition(featureId);
  }

  function checkFeatureCondition(
    bytes32 featureId,
    address space
  ) external view returns (bool) {
    return FeatureStorage.layout().meetsThreshold(featureId, space);
  }
}
