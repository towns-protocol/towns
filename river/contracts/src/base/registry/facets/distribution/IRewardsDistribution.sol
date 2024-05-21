// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
interface IRewardsDistributionBase {
  error RewardsDistribution_NoActiveOperators();
  error RewardsDistribution_NoRewardsToClaim();
  error RewardsDistribution_InsufficientRewardBalance();
  error RewardsDistribution_InvalidOperator();
  event RewardsDistributed(address operator, uint256 amount);
}

interface IRewardsDistribution is IRewardsDistributionBase {
  function getClaimableAmount(address addr) external view returns (uint256);

  function claim() external;

  function distributeRewards(address operator) external;

  function setWeeklyDistributionAmount(uint256 amount) external;

  function getWeeklyDistributionAmount() external view returns (uint256);
}
