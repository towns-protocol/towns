// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IFeatureManagerFacetBase} from "./IFeatureManagerFacet.sol";

// libraries
import {CustomRevert} from "contracts/src/utils/libraries/CustomRevert.sol";

// debuggging

// contracts

library FeatureManager {
  struct Condition {
    address token; // token to be used to check the threshold
    uint256 threshold; // Amount of tokens needed
    bool active; // If this feature is currently active
    bytes extraData; // Additional parameters for specific features
  }

  struct Layout {
    // Feature ID => Condition
    mapping(bytes32 => Condition) conditions;
  }

  function setFeatureCondition(
    Layout storage self,
    bytes32 featureId,
    Condition memory condition
  ) internal {
    uint256 totalSupply = IERC20(condition.token).totalSupply();

    // validate interface ids

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

  function getFeatureCondition(
    Layout storage self,
    bytes32 featureId
  ) internal view returns (Condition memory) {
    return self.conditions[featureId];
  }

  function disableFeatureCondition(
    Layout storage self,
    bytes32 featureId
  ) internal {
    self.conditions[featureId].active = false;
  }

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
}
