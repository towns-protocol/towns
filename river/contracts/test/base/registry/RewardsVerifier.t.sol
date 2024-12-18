// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IRewardsDistributionBase} from "contracts/src/base/registry/facets/distribution/v2/IRewardsDistribution.sol";

// libraries
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";
import {StakingRewards} from "contracts/src/base/registry/facets/distribution/v2/StakingRewards.sol";

// contracts
import {StdAssertions} from "forge-std/StdAssertions.sol";
import {River} from "contracts/src/tokens/river/base/River.sol";
import {RewardsDistribution} from "contracts/src/base/registry/facets/distribution/v2/RewardsDistribution.sol";

abstract contract RewardsVerifier is StdAssertions, IRewardsDistributionBase {
  using FixedPointMathLib for uint256;

  River internal river;
  RewardsDistribution internal rewardsDistributionFacet;

  function verifyStake(
    address depositor,
    uint256 depositId,
    uint96 amount,
    address delegatee,
    uint256 commissionRate,
    address beneficiary
  ) internal view {
    if (depositor != address(rewardsDistributionFacet)) {
      assertEq(
        rewardsDistributionFacet.stakedByDepositor(depositor),
        amount,
        "stakedByDepositor"
      );
    }

    StakingRewards.Deposit memory deposit = rewardsDistributionFacet
      .depositById(depositId);
    assertEq(deposit.amount, amount, "amount");
    assertEq(deposit.owner, depositor, "owner");
    assertEq(deposit.delegatee, delegatee, "delegatee");
    assertEq(deposit.pendingWithdrawal, 0, "pendingWithdrawal");
    assertEq(deposit.beneficiary, beneficiary, "beneficiary");
    assertApproxEqAbs(
      deposit.commissionEarningPower,
      (amount * commissionRate) / 10000,
      1,
      "commissionEarningPower"
    );

    assertEq(
      deposit.commissionEarningPower +
        rewardsDistributionFacet
          .treasureByBeneficiary(beneficiary)
          .earningPower,
      amount,
      "earningPower"
    );

    assertEq(
      rewardsDistributionFacet.treasureByBeneficiary(delegatee).earningPower,
      deposit.commissionEarningPower,
      "commissionEarningPower"
    );

    address proxy = rewardsDistributionFacet.delegationProxyById(depositId);
    if (proxy != address(0)) {
      assertEq(river.delegates(proxy), delegatee, "proxy delegatee");
      assertEq(river.getVotes(delegatee), amount, "votes");
    }
  }

  function verifyWithdraw(
    address depositor,
    uint256 depositId,
    uint96 pendingWithdrawal,
    uint96 withdrawAmount,
    address operator,
    address beneficiary
  ) internal view {
    assertEq(
      rewardsDistributionFacet.stakedByDepositor(depositor),
      0,
      "stakedByDepositor"
    );
    assertEq(river.balanceOf(depositor), withdrawAmount, "withdrawAmount");

    StakingRewards.Deposit memory deposit = rewardsDistributionFacet
      .depositById(depositId);
    assertEq(deposit.amount, 0, "depositAmount");
    assertEq(deposit.owner, depositor, "owner");
    assertEq(deposit.commissionEarningPower, 0, "commissionEarningPower");
    assertEq(deposit.delegatee, address(0), "delegatee");
    assertEq(deposit.pendingWithdrawal, pendingWithdrawal, "pendingWithdrawal");
    assertEq(deposit.beneficiary, beneficiary, "beneficiary");

    assertEq(
      rewardsDistributionFacet.treasureByBeneficiary(beneficiary).earningPower,
      0,
      "earningPower"
    );

    assertEq(
      rewardsDistributionFacet.treasureByBeneficiary(operator).earningPower,
      0,
      "commissionEarningPower"
    );

    assertEq(
      river.delegates(rewardsDistributionFacet.delegationProxyById(depositId)),
      address(0),
      "proxy delegatee"
    );
    assertEq(river.getVotes(operator), 0, "votes");
  }

  function verifyClaim(
    address beneficiary,
    address claimer,
    uint256 reward,
    uint256 currentReward,
    uint256 timeLapse
  ) internal view {
    assertEq(reward, currentReward, "reward");
    assertEq(river.balanceOf(claimer), reward, "reward balance");

    StakingState memory state = rewardsDistributionFacet.stakingState();
    uint256 earningPower = rewardsDistributionFacet
      .treasureByBeneficiary(beneficiary)
      .earningPower;

    assertEq(
      state.rewardRate.fullMulDiv(timeLapse, state.totalStaked).fullMulDiv(
        earningPower,
        StakingRewards.SCALE_FACTOR
      ),
      reward,
      "expected reward"
    );
  }

  function verifySweep(
    address space,
    address operator,
    uint256 amount,
    uint256 commissionRate,
    uint256 timeLapse
  ) internal view {
    StakingState memory state = rewardsDistributionFacet.stakingState();
    StakingRewards.Treasure memory spaceTreasure = rewardsDistributionFacet
      .treasureByBeneficiary(space);

    assertEq(spaceTreasure.earningPower, (amount * commissionRate) / 10000);
    assertEq(
      spaceTreasure.rewardPerTokenAccumulated,
      state.rewardPerTokenAccumulated
    );
    assertEq(spaceTreasure.unclaimedRewardSnapshot, 0);

    assertEq(
      rewardsDistributionFacet
        .treasureByBeneficiary(operator)
        .unclaimedRewardSnapshot,
      spaceTreasure.earningPower *
        state.rewardRate.fullMulDiv(timeLapse, state.totalStaked)
    );
  }
}
