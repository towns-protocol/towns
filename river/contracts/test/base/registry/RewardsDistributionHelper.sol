// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries

// helpers
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {RewardsDistribution} from "contracts/src/base/registry/facets/distribution/RewardsDistribution.sol";

contract RewardsDistributionHelper is FacetHelper {
  constructor() {
    addSelector(RewardsDistribution.getClaimableAmount.selector);
    addSelector(RewardsDistribution.claim.selector);
    addSelector(RewardsDistribution.distributeRewards.selector);
    addSelector(RewardsDistribution.setWeeklyDistributionAmount.selector);
    addSelector(RewardsDistribution.getWeeklyDistributionAmount.selector);
  }

  function facet() public pure override returns (address) {
    return address(0);
  }

  function selectors() public view override returns (bytes4[] memory) {
    return functionSelectors;
  }

  function initializer() public pure override returns (bytes4) {
    return RewardsDistribution.__RewardsDistribution_init.selector;
  }
}
