// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

interface IRewardsDistribution {
  error RewardsDistribution_NoActiveOperators();
  error RewardsDistribution_NoRewardsToClaim();
  error RewardsDistribution_InsufficientRewardBalance();
  error RewardsDistribution_InvalidOperator();
  event RewardsDistributed(address operator, uint256 amount);

  function getClaimableAmount(address addr) external view returns (uint256);

  function claim() external;

  function distributeRewards(address operator) external;

  function setWeeklyDistributionAmount(uint256 amount) external;

  function getWeeklyDistributionAmount() external view returns (uint256);
}
