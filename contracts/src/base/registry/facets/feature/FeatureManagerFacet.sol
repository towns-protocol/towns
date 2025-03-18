// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IFeatureManagerFacet} from "./IFeatureManagerFacet.sol";

// libraries
import {FeatureManager} from "./FeatureManager.sol";
import {FeatureManagerStorage} from "./FeatureManagerStorage.sol";
// contracts
import {OwnableBase} from "@river-build/diamond/src/facets/ownable/OwnableBase.sol";
import {Facet} from "@river-build/diamond/src/facets/Facet.sol";

contract FeatureManagerFacet is IFeatureManagerFacet, OwnableBase, Facet {
  using FeatureManager for FeatureManager.Layout;

  function __FeatureManagerFacet_init() external onlyInitializing {}

  // Feature condition
  function setFeatureCondition(
    bytes32 featureId,
    FeatureManager.Condition memory condition
  ) external onlyOwner {
    FeatureManagerStorage.getLayout().setFeatureCondition(featureId, condition);
  }

  function getFeatureCondition(
    bytes32 featureId
  ) external view returns (FeatureManager.Condition memory) {
    return FeatureManagerStorage.getLayout().getFeatureCondition(featureId);
  }

  function checkFeatureCondition(
    bytes32 featureId,
    address space
  ) external view returns (bool) {
    return FeatureManagerStorage.getLayout().meetsThreshold(featureId, space);
  }
}
