// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {StakingRewards} from "./StakingRewards.sol";

interface IRewardsDistributionBase {
  /// @notice The state of the staking rewards contract
  /// @param riverToken The token that is being staked and used for rewards
  /// @param totalStaked The total amount of stakeToken that is staked
  /// @param rewardDuration The duration of the reward distribution
  /// @param rewardEndTime The time at which the reward distribution ends
  /// @param lastUpdateTime The time at which the reward was last updated
  /// @param rewardRate The scaled rate of reward distributed per second
  /// @param rewardPerTokenAccumulated The scaled amount of rewardToken that has been accumulated per staked token
  /// @param nextDepositId The next deposit ID that will be used
  struct StakingState {
    address riverToken;
    uint96 totalStaked;
    uint256 rewardDuration;
    uint256 rewardEndTime;
    uint256 lastUpdateTime;
    uint256 rewardRate;
    uint256 rewardPerTokenAccumulated;
    uint256 nextDepositId;
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                       CUSTOM ERRORS                        */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  /// @dev Self-explanatory
  error RewardsDistribution__NotBeneficiary();
  error RewardsDistribution__NotClaimer();
  error RewardsDistribution__NotDepositOwner();
  error RewardsDistribution__NotRewardNotifier();
  error RewardsDistribution__NotOperatorOrSpace();
  error RewardsDistribution__NotActiveOperator();
  error RewardsDistribution__ExpiredDeadline();
  error RewardsDistribution__InvalidSignature();
  error RewardsDistribution__CannotWithdrawFromSelf();
  error RewardsDistribution__NoPendingWithdrawal();

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                           EVENTS                           */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  /// @notice Emitted when the rewards distribution facet is initialized
  /// @param stakeToken The token that is being staked
  /// @param rewardToken The token that is being distributed as rewards
  /// @param rewardDuration The duration of each reward distribution period
  event RewardsDistributionInitialized(
    address stakeToken,
    address rewardToken,
    uint256 rewardDuration
  );

  /// @notice Emitted when a delegation proxy is deployed
  /// @param depositId The ID of the deposit
  /// @param delegatee The address of the delegatee
  /// @param proxy The address of the delegation proxy
  event DelegationProxyDeployed(
    uint256 indexed depositId,
    address indexed delegatee,
    address proxy
  );

  /// @notice Emitted when a reward notifier is set
  /// @param notifier The address of the notifier
  /// @param enabled The whitelist status
  event RewardNotifierSet(address indexed notifier, bool enabled);

  /// @notice Emitted when the reward amount for a period is set
  /// @param amount The amount of rewardToken to distribute
  event PeriodRewardAmountSet(uint256 amount);

  /// @notice Emitted when a deposit is staked
  /// @param owner The address of the depositor
  /// @param delegatee The address of the delegatee
  /// @param beneficiary The address of the beneficiary
  /// @param depositId The ID of the deposit
  /// @param amount The amount of stakeToken that is staked
  event Stake(
    address indexed owner,
    address indexed delegatee,
    address indexed beneficiary,
    uint256 depositId,
    uint96 amount
  );

  /// @notice Emitted when the stake of a deposit is increased
  /// @param depositId The ID of the deposit
  /// @param amount The amount of stakeToken that is staked
  event IncreaseStake(uint256 indexed depositId, uint96 amount);

  /// @notice Emitted when a deposit is redelegated
  /// @param depositId The ID of the deposit
  /// @param delegatee The address of the delegatee
  event Redelegate(uint256 indexed depositId, address indexed delegatee);

  /// @notice Emitted when the beneficiary of a deposit is changed
  /// @param depositId The ID of the deposit
  /// @param newBeneficiary The address of the new beneficiary
  event ChangeBeneficiary(
    uint256 indexed depositId,
    address indexed newBeneficiary
  );

  /// @notice Emitted when the withdrawal of a deposit is initiated
  /// @param owner The address of the depositor
  /// @param depositId The ID of the deposit
  /// @param amount The amount of stakeToken that will be withdrawn
  event InitiateWithdraw(
    address indexed owner,
    uint256 indexed depositId,
    uint96 amount
  );

  /// @notice Emitted when the stakeToken is withdrawn from a deposit
  /// @param depositId The ID of the deposit
  /// @param amount The amount of stakeToken that is withdrawn
  event Withdraw(uint256 indexed depositId, uint96 amount);

  /// @notice Emitted when a reward is claimed
  /// @param beneficiary The address of the beneficiary
  /// @param recipient The address of the recipient
  /// @param reward The amount of rewardToken that is claimed
  event ClaimReward(
    address indexed beneficiary,
    address indexed recipient,
    uint256 reward
  );

  /// @notice Emitted when a reward is notified
  /// @param notifier The address of the notifier
  /// @param reward The amount of rewardToken that is added
  event NotifyRewardAmount(address indexed notifier, uint256 reward);

  /// @notice Emitted when space delegation rewards are swept to the operator
  /// @param space The address of the space
  /// @param operator The address of the operator
  /// @param scaledReward The scaled amount of rewardToken that is swept
  event SpaceRewardsSwept(
    address indexed space,
    address indexed operator,
    uint256 scaledReward
  );
}

/// @title IRewardsDistribution
/// @notice The interface for the rewards distribution facet
interface IRewardsDistribution is IRewardsDistributionBase {
  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                       ADMIN FUNCTIONS                      */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  /// @notice Upgrades the delegation proxy implementation in the beacon
  /// @dev Only the owner can call this function
  /// @param newImplementation The address of the new implementation
  function upgradeDelegationProxy(address newImplementation) external;

  /// @notice Sets whitelist status for reward notifiers
  /// @dev Only the owner can call this function
  /// @param notifier The address of the notifier
  /// @param enabled The whitelist status
  function setRewardNotifier(address notifier, bool enabled) external;

  /// @notice Sets the reward amount for a period
  /// @dev Only the owner can call this function
  /// @param amount The amount of rewardToken to distribute
  function setPeriodRewardAmount(uint256 amount) external;

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                       STATE MUTATING                       */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  /// @notice Stakes the stakeToken for rewards
  /// @dev The caller must approve the contract to spend the stakeToken
  /// @param amount The amount of stakeToken to stake
  /// @param delegatee The address of the delegatee
  /// @param beneficiary The address of the beneficiary
  /// @return depositId The ID of the deposit
  function stake(
    uint96 amount,
    address delegatee,
    address beneficiary
  ) external returns (uint256 depositId);

  /// @notice Approves the contract to spend the stakeToken with an EIP-2612 permit and stakes the
  /// stakeToken for rewards
  /// @param amount The amount of stakeToken to stake
  /// @param delegatee The address of the delegatee
  /// @param beneficiary The address of the beneficiary
  /// @param deadline The deadline for the permit
  /// @param v The recovery byte of the permit
  /// @param r The R signature of the permit
  /// @param s The S signature of the permit
  /// @return depositId The ID of the deposit
  function permitAndStake(
    uint96 amount,
    address delegatee,
    address beneficiary,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external returns (uint256 depositId);

  /// @notice Stakes on behalf of a user with an EIP-712 signature
  /// @dev The caller must approve the contract to spend the stakeToken
  /// @param amount The amount of stakeToken to stake
  /// @param delegatee The address of the delegatee
  /// @param beneficiary The address of the beneficiary
  /// @param owner The address of the deposit owner
  /// @return depositId The ID of the deposit
  function stakeOnBehalf(
    uint96 amount,
    address delegatee,
    address beneficiary,
    address owner,
    uint256,
    bytes calldata
  ) external returns (uint256 depositId);

  /// @notice Increases the stake of an existing deposit
  /// @dev The caller must be the owner of the deposit
  /// @dev The caller must approve the contract to spend the stakeToken
  /// @param depositId The ID of the deposit
  /// @param amount The amount of stakeToken to stake
  function increaseStake(uint256 depositId, uint96 amount) external;

  /// @notice Redelegates an existing deposit to a new delegatee or reactivates a pending withdrawal
  /// @dev The caller must be the owner of the deposit
  /// @param depositId The ID of the deposit
  /// @param delegatee The address of the new delegatee
  function redelegate(uint256 depositId, address delegatee) external;

  /// @notice Changes the beneficiary of a deposit
  /// @dev The caller must be the owner of the deposit
  /// @param depositId The ID of the deposit
  /// @param newBeneficiary The address of the new beneficiary
  function changeBeneficiary(
    uint256 depositId,
    address newBeneficiary
  ) external;

  /// @notice Initiates the withdrawal of a deposit, subject to the lockup period
  /// @dev The caller must be the owner of the deposit
  /// @param depositId The ID of the deposit
  /// @return amount The amount of stakeToken that will be withdrawn
  function initiateWithdraw(uint256 depositId) external returns (uint96 amount);

  /// @notice Withdraws the stakeToken from a deposit
  /// @dev The caller must be the owner of the deposit
  /// @param depositId The ID of the deposit
  /// @return amount The amount of stakeToken that is withdrawn
  function withdraw(uint256 depositId) external returns (uint96 amount);

  /// @notice Claims the reward for a beneficiary
  /// @dev The beneficiary may be the caller.
  /// @dev If not, the caller may be the authorized claimer of the beneficiary.
  /// @dev If not, the beneficiary must be a space or operator while the caller must be the authorized claimer.
  /// @param beneficiary The address of the beneficiary
  /// @param recipient The address of the recipient
  /// @return reward The amount of rewardToken that is claimed
  function claimReward(
    address beneficiary,
    address recipient
  ) external returns (uint256 reward);

  /// @notice Notifies the contract of an incoming reward
  /// @dev The caller must be a reward notifier
  /// @param reward The amount of rewardToken that has been added
  function notifyRewardAmount(uint256 reward) external;

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                          GETTERS                           */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  /// @notice Returns the current state of the staking rewards contract
  /// @return Staking state variables
  /// riverToken The token that is being staked and used for rewards
  /// totalStaked The total amount of stakeToken that is staked
  /// rewardDuration The duration of the reward distribution
  /// rewardEndTime The time at which the reward distribution ends
  /// lastUpdateTime The time at which the reward was last updated
  /// rewardRate The scaled rate of reward distributed per second
  /// rewardPerTokenAccumulated The scaled amount of rewardToken that has been accumulated per staked token
  /// nextDepositId The next deposit ID that will be used
  function stakingState() external view returns (StakingState memory);

  /// @notice Returns the amount of stakeToken that is staked by a particular depositor
  /// @param depositor The address of the depositor
  /// @return amount The amount of stakeToken that is staked by the depositor
  function stakedByDepositor(
    address depositor
  ) external view returns (uint96 amount);

  /// @notice Returns the deposit IDs for a particular depositor
  /// @param depositor The address of the depositor
  /// @return The deposit IDs for the depositor
  function getDepositsByDepositor(
    address depositor
  ) external view returns (uint256[] memory);

  /// @notice Returns the account information for a beneficiary
  /// @param beneficiary The address of the beneficiary
  /// @return The account information for the beneficiary
  /// earningPower The amount of stakeToken that is yielding rewards
  /// rewardPerTokenAccumulated The scaled amount of rewardToken that has been accumulated per staked token
  /// unclaimedRewardSnapshot The snapshot of the unclaimed reward scaled
  function treasureByBeneficiary(
    address beneficiary
  ) external view returns (StakingRewards.Treasure memory);

  /// @notice Returns the information for a deposit
  /// @param depositId The ID of the deposit
  /// @return The information for the deposit
  /// amount The amount of stakeToken that is staked
  /// owner The address of the depositor
  /// commissionEarningPower The amount of stakeToken assigned to the commission
  /// delegatee The address of the delegatee
  /// pendingWithdrawal The amount of stakeToken that is pending withdrawal
  /// beneficiary The address of the beneficiary
  function depositById(
    uint256 depositId
  ) external view returns (StakingRewards.Deposit memory);

  /// @notice Returns the address of the delegation proxy for a deposit
  /// @param depositId The ID of the deposit
  /// @return The address of the delegation proxy
  function delegationProxyById(
    uint256 depositId
  ) external view returns (address);

  /// @notice Returns whether a particular address is a reward notifier
  /// @param notifier The address to check
  /// @return True if the address is a reward notifier
  function isRewardNotifier(address notifier) external view returns (bool);

  /// @notice Returns the lesser of rewardEndTime and the current time
  /// @return The lesser of rewardEndTime and the current time
  function lastTimeRewardDistributed() external view returns (uint256);

  /// @notice Returns the current scaled amount of rewardToken that has been accumulated per staked token
  /// @return The current scaled amount of rewardToken that has been accumulated per staked token
  function currentRewardPerTokenAccumulated() external view returns (uint256);

  /// @notice Returns the current unclaimed reward for a beneficiary
  /// @param beneficiary The address of the beneficiary
  /// @return The current unclaimed reward for the beneficiary
  function currentReward(address beneficiary) external view returns (uint256);

  /// @notice Returns the current unclaimed reward for an operator from delegating spaces
  /// @param operator The address of the operator
  /// @return The current unclaimed reward for the operator from delegating spaces
  function currentSpaceDelegationReward(
    address operator
  ) external view returns (uint256);

  /// @notice Returns the implementation stored in the beacon
  function implementation() external view returns (address);

  /// @notice Returns the period reward amount
  function getPeriodRewardAmount() external view returns (uint256);
}
