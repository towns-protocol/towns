// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// helpers
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {RewardsDistribution} from "contracts/src/base/registry/facets/distribution/RewardsDistribution.sol";

contract DeployRewardsDistribution is Deployer, FacetHelper {
  constructor() {
    addSelector(RewardsDistribution.getClaimableAmountForOperator.selector);
    addSelector(RewardsDistribution.getClaimableAmountForDelegator.selector);
    addSelector(
      RewardsDistribution.getClaimableAmountForAuthorizedClaimer.selector
    );
    addSelector(RewardsDistribution.operatorClaim.selector);
    addSelector(RewardsDistribution.delegatorClaim.selector);
    addSelector(RewardsDistribution.mainnetClaim.selector);
    addSelector(RewardsDistribution.distributeRewards.selector);
    addSelector(RewardsDistribution.setPeriodDistributionAmount.selector);
    addSelector(RewardsDistribution.getPeriodDistributionAmount.selector);
    addSelector(RewardsDistribution.setActivePeriodLength.selector);
    addSelector(RewardsDistribution.getActivePeriodLength.selector);
    addSelector(RewardsDistribution.getActiveOperators.selector);
    addSelector(RewardsDistribution.setWithdrawalRecipient.selector);
    addSelector(RewardsDistribution.getWithdrawalRecipient.selector);
    addSelector(RewardsDistribution.withdraw.selector);
  }

  function initializer() public pure override returns (bytes4) {
    // 0x8c393f4c
    return RewardsDistribution.__RewardsDistribution_init.selector;
  }

  function versionName() public pure override returns (string memory) {
    return "rewardsDistribution";
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    RewardsDistribution facet = new RewardsDistribution();
    vm.stopBroadcast();
    return address(facet);
  }
}
