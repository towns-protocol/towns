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
  function getClaimableAmountForOperator(
    address addr
  ) external view returns (uint256);

  function getClaimableAmountForAuthorizedClaimer(
    address addr
  ) external view returns (uint256);

  function getClaimableAmountForDelegator(
    address addr
  ) external view returns (uint256);

  function operatorClaim() external;

  function mainnetClaim() external;

  function delegatorClaim() external;

  function distributeRewards(address operator) external;

  function setPeriodDistributionAmount(uint256 amount) external;

  function getPeriodDistributionAmount() external view returns (uint256);

  function setActivePeriodLength(uint256 length) external;

  function getActivePeriodLength() external view returns (uint256);

  function getActiveOperators() external view returns (address[] memory);

  function setWithdrawalRecipient(address recipient) external;

  function getWithdrawalRecipient() external view returns (address);

  function withdraw() external;
}
