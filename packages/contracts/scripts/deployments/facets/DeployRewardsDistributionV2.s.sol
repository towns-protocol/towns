// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";
import {IRewardsDistribution} from "src/base/registry/facets/distribution/v2/IRewardsDistribution.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";
import {DynamicArrayLib} from "solady/utils/DynamicArrayLib.sol";

// contracts
import {RewardsDistributionV2} from "src/base/registry/facets/distribution/v2/RewardsDistributionV2.sol";

library DeployRewardsDistributionV2 {
    using DynamicArrayLib for DynamicArrayLib.DynamicArray;

    function selectors() internal pure returns (bytes4[] memory res) {
        DynamicArrayLib.DynamicArray memory arr = DynamicArrayLib.p().reserve(27);
        arr.p(IRewardsDistribution.upgradeDelegationProxy.selector);
        arr.p(IRewardsDistribution.setRewardNotifier.selector);
        arr.p(IRewardsDistribution.setPeriodRewardAmount.selector);
        arr.p(IRewardsDistribution.stake.selector);
        arr.p(IRewardsDistribution.permitAndStake.selector);
        arr.p(IRewardsDistribution.stakeOnBehalf.selector);
        arr.p(IRewardsDistribution.increaseStake.selector);
        arr.p(IRewardsDistribution.permitAndIncreaseStake.selector);
        arr.p(IRewardsDistribution.redelegate.selector);
        arr.p(IRewardsDistribution.changeBeneficiary.selector);
        arr.p(IRewardsDistribution.initiateWithdraw.selector);
        arr.p(IRewardsDistribution.withdraw.selector);
        arr.p(IRewardsDistribution.claimReward.selector);
        arr.p(IRewardsDistribution.notifyRewardAmount.selector);
        arr.p(IRewardsDistribution.stakingState.selector);
        arr.p(IRewardsDistribution.stakedByDepositor.selector);
        arr.p(IRewardsDistribution.getDepositsByDepositor.selector);
        arr.p(IRewardsDistribution.treasureByBeneficiary.selector);
        arr.p(IRewardsDistribution.depositById.selector);
        arr.p(IRewardsDistribution.delegationProxyById.selector);
        arr.p(IRewardsDistribution.isRewardNotifier.selector);
        arr.p(IRewardsDistribution.lastTimeRewardDistributed.selector);
        arr.p(IRewardsDistribution.currentRewardPerTokenAccumulated.selector);
        arr.p(IRewardsDistribution.currentReward.selector);
        arr.p(IRewardsDistribution.currentSpaceDelegationReward.selector);
        arr.p(IRewardsDistribution.implementation.selector);
        arr.p(IRewardsDistribution.getPeriodRewardAmount.selector);

        bytes32[] memory selectors_ = arr.asBytes32Array();
        assembly ("memory-safe") {
            res := selectors_
        }
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return IDiamond.FacetCut(facetAddress, action, selectors());
    }

    function makeInitData(
        address stakeToken,
        address rewardToken,
        uint256 rewardDuration
    ) internal pure returns (bytes memory) {
        return
            abi.encodeCall(
                RewardsDistributionV2.__RewardsDistribution_init,
                (stakeToken, rewardToken, rewardDuration)
            );
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("RewardsDistributionV2.sol", "");
    }
}
