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
    /// @param rewardPerTokenAccumulated The scaled amount of rewardToken that has been accumulated
    /// per staked token
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
    event ChangeBeneficiary(uint256 indexed depositId, address indexed newBeneficiary);

    /// @notice Emitted when the withdrawal of a deposit is initiated
    /// @param owner The address of the depositor
    /// @param depositId The ID of the deposit
    /// @param amount The amount of stakeToken that will be withdrawn
    event InitiateWithdraw(address indexed owner, uint256 indexed depositId, uint96 amount);

    /// @notice Emitted when the stakeToken is withdrawn from a deposit
    /// @param depositId The ID of the deposit
    /// @param amount The amount of stakeToken that is withdrawn
    event Withdraw(uint256 indexed depositId, uint96 amount);

    /// @notice Emitted when a reward is claimed
    /// @param beneficiary The address of the beneficiary whose reward is claimed
    /// @param recipient The address of the recipient where the reward is sent
    /// @param reward The amount of rewardToken that is claimed
    event ClaimReward(address indexed beneficiary, address indexed recipient, uint256 reward);

    /// @notice Emitted when a reward is notified
    /// @param notifier The address of the notifier
    /// @param reward The amount of rewardToken that is added
    event NotifyRewardAmount(address indexed notifier, uint256 reward);

    /// @notice Emitted when space delegation rewards are swept to the operator
    /// @param space The address of the space
    /// @param operator The address of the operator
    /// @param scaledReward The scaled amount of rewardToken that is swept
    event SpaceRewardsSwept(address indexed space, address indexed operator, uint256 scaledReward);

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
    /// @param beneficiary The address of the beneficiary who is receiving the rewards
    /// @return depositId The ID of the deposit
    function stake(
        uint96 amount,
        address delegatee,
        address beneficiary
    ) external returns (uint256 depositId);

    /// @notice Approves the contract to spend the stakeToken with Permit2 and stakes the
    /// stakeToken for rewards
    /// @param amount The amount of stakeToken to stake
    /// @param delegatee The address of the delegatee
    /// @param beneficiary The address of the beneficiary who is receiving the rewards
    /// @param nonce The nonce for the permit
    /// @param deadline The deadline for the permit
    /// @param signature The signature for the permit
    /// @return depositId The ID of the deposit
    function permitAndStake(
        uint96 amount,
        address delegatee,
        address beneficiary,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external returns (uint256 depositId);

    /// @notice Stakes on behalf of a user with an EIP-712 signature
    /// @dev The caller must approve the contract to spend the stakeToken
    /// @param amount The amount of stakeToken to stake
    /// @param delegatee The address of the delegatee
    /// @param beneficiary The address of the beneficiary who is receiving the rewards
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

    /// @notice Approves the contract to spend the stakeToken with Permit2 and increases
    /// the stake of an existing deposit
    /// @dev The caller must be the owner of the deposit
    /// @param depositId The ID of the deposit
    /// @param amount The amount of stakeToken to stake
    /// @param nonce The nonce for the permit
    /// @param deadline The deadline for the permit
    /// @param signature The signature for the permit
    function permitAndIncreaseStake(
        uint256 depositId,
        uint96 amount,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external;

    /// @notice Redelegates an existing deposit to a new delegatee or reactivates a pending
    /// withdrawal
    /// @dev The caller must be the owner of the deposit
    /// @param depositId The ID of the deposit
    /// @param delegatee The address of the new delegatee
    function redelegate(uint256 depositId, address delegatee) external;

    /// @notice Changes the beneficiary of a deposit
    /// @dev The caller must be the owner of the deposit
    /// @param depositId The ID of the deposit
    /// @param newBeneficiary The address of the new beneficiary
    function changeBeneficiary(uint256 depositId, address newBeneficiary) external;

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

    /// @notice Claims accumulated rewards for a beneficiary and sends them to a recipient
    ///
    /// @dev **For Regular Users (Stakers):**
    /// - Call with `beneficiary = your_address` to claim your own staking rewards
    /// - You can send rewards to any `recipient` address (yourself or someone else)
    ///
    /// @dev **For Node Operators:**
    /// - Operators earn commission from delegated stakes and can claim their own operator rewards
    /// - Call with `beneficiary = operator_address` to claim operator commission rewards
    /// - Only the operator's designated claimer can call this function for the operator
    ///
    /// @dev **For Space Rewards:**
    /// - Spaces accumulate rewards from users who delegate to them
    /// - Only the space's current operator's claimer can claim space rewards
    /// - Call with `beneficiary = space_address` to claim rewards accumulated by the space
    /// - Space rewards are automatically transferred to the operator when claimed
    ///
    /// @dev **Authorization Rules:**
    /// 1. Self-claim: Anyone can claim their own rewards (`msg.sender == beneficiary`)
    /// 2. Authorized claimer: If you're set as the authorized claimer for a beneficiary
    /// 3. Operator claimer: Only operator's claimer can claim operator rewards
    /// 4. Space operator claimer: Only the space's operator's claimer can claim space rewards
    ///
    /// @param beneficiary The address whose rewards are being claimed (user, operator, or space)
    /// @param recipient The address where the claimed reward tokens will be sent
    /// @return reward The amount of reward tokens claimed and transferred
    function claimReward(address beneficiary, address recipient) external returns (uint256 reward);

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
    /// rewardPerTokenAccumulated The scaled amount of rewardToken that has been accumulated per
    /// staked token
    /// nextDepositId The next deposit ID that will be used
    function stakingState() external view returns (StakingState memory);

    /// @notice Returns the amount of stakeToken that is staked by a particular depositor
    /// @param depositor The address of the depositor
    /// @return amount The amount of stakeToken that is staked by the depositor
    function stakedByDepositor(address depositor) external view returns (uint96 amount);

    /// @notice Returns the deposit IDs for a particular depositor
    /// @param depositor The address of the depositor
    /// @return The deposit IDs for the depositor
    function getDepositsByDepositor(address depositor) external view returns (uint256[] memory);

    /// @notice Returns the account information for a beneficiary
    /// @param beneficiary The address of the beneficiary
    /// @return The account information for the beneficiary
    /// earningPower The amount of stakeToken that is yielding rewards
    /// rewardPerTokenAccumulated The scaled amount of rewardToken that has been accumulated per
    /// staked token
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
    function depositById(uint256 depositId) external view returns (StakingRewards.Deposit memory);

    /// @notice Returns the address of the delegation proxy for a deposit
    /// @param depositId The ID of the deposit
    /// @return The address of the delegation proxy
    function delegationProxyById(uint256 depositId) external view returns (address);

    /// @notice Returns whether a particular address is a reward notifier
    /// @param notifier The address to check
    /// @return True if the address is a reward notifier
    function isRewardNotifier(address notifier) external view returns (bool);

    /// @notice Returns the lesser of rewardEndTime and the current time
    /// @return The lesser of rewardEndTime and the current time
    function lastTimeRewardDistributed() external view returns (uint256);

    /// @notice Returns the current scaled amount of rewardToken that has been accumulated per
    /// staked token
    /// @return The current scaled amount of rewardToken that has been accumulated per staked token
    function currentRewardPerTokenAccumulated() external view returns (uint256);

    /// @notice Returns the current unclaimed reward for a beneficiary
    /// @param beneficiary The address of the beneficiary who is receiving the rewards
    /// @return The current unclaimed reward for the beneficiary
    function currentReward(address beneficiary) external view returns (uint256);

    /// @notice Returns the current unclaimed reward for an operator from delegating spaces
    /// @param operator The address of the operator
    /// @return The current unclaimed reward for the operator from delegating spaces
    function currentSpaceDelegationReward(address operator) external view returns (uint256);

    /// @notice Returns the implementation stored in the beacon
    function implementation() external view returns (address);

    /// @notice Returns the period reward amount
    function getPeriodRewardAmount() external view returns (uint256);
}
