// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
interface IRewardsDistributionBase {
    event RewardsDistributed(address operator, uint256 amount);

    error RewardsDistribution_NoActiveOperators();
    error RewardsDistribution_NoRewardsToClaim();
    error RewardsDistribution_InsufficientRewardBalance();
    error RewardsDistribution_InvalidOperator();
    error RewardsDistribution_UnauthorizedClaimer(address delegator, address claimer);
    error RewardsDistribution_UnauthorizedOperatorClaimer(address operator, address claimer);
}

interface IRewardsDistribution is IRewardsDistributionBase {
    function operatorClaim() external;

    function mainnetClaim() external;

    function delegatorClaim() external;

    function distributeRewards(address operator) external;

    function setPeriodDistributionAmount(uint256 amount) external;

    function setActivePeriodLength(uint256 length) external;

    function setWithdrawalRecipient(address recipient) external;

    function withdraw() external;

    function getClaimableAmountForOperator(address addr) external view returns (uint256);

    function getClaimableAmountForAuthorizedClaimer(address addr) external view returns (uint256);

    function getClaimableAmountForDelegator(address addr) external view returns (uint256);

    function getPeriodDistributionAmount() external view returns (uint256);

    function getActivePeriodLength() external view returns (uint256);

    function getActiveOperators() external view returns (address[] memory);

    function getWithdrawalRecipient() external view returns (address);
}
