// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

interface IRewardsDistribution {
  error RewardsDistribution_NoActiveOperators();
  error RewardsDistribution_NoRewardsToClaim();
  error RewardsDistribution_InsufficientRewardBalance();

  event RewardsDistributed(uint256 amount);
}
