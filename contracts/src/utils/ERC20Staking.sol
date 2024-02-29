// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.23;

// interfaces
import {IERC20Staking} from "./interfaces/IERC20Staking.sol";

// libraries
import {CurrencyTransfer} from "./libraries/CurrencyTransfer.sol";

// contracts
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

abstract contract ERC20Staking is ReentrancyGuard, IERC20Staking {
  /// @dev Address of the ERC20 token being staked
  address public stakingToken;

  /// @dev Total amount of staked tokens
  uint256 public stakingTokenBalance;

  /// @dev Staking conditions
  uint256 public rewardDuration;
  uint256 public rewardRate;
  uint256 public lastUpdateTime;
  uint256 public periodFinish;
  uint256 public rewardPerTokenStored;

  /// @dev Stakers
  mapping(address => Staker) public stakers;

  constructor(address _stakingToken) ReentrancyGuard() {
    if (_stakingToken == address(0)) revert ZeroAddress();
    stakingToken = _stakingToken;
  }

  // =============================================================
  //                           External
  // =============================================================
  function stake(uint256 amount) external nonReentrant {
    _stake(amount);
  }

  function withdraw(uint256 amount) external nonReentrant {
    _withdraw(amount);
  }

  function claim() external nonReentrant {
    _claim();
  }

  function exit() external {
    _withdraw(stakers[_stakeMsgSender()].stakedAmount);
    _claim();
  }

  function setRewardDuration(uint256 _rewardDuration) external {
    if (!_canSetStakingConditions()) revert NotAllowed();

    if (_rewardDuration == 0) revert ZeroAmount();
    if (block.timestamp < periodFinish)
      revert InvalidAmount("Current reward duration is not yet finished");

    if (_rewardDuration == rewardDuration) return;

    uint256 _oldRewardDuration = rewardDuration;
    rewardDuration = _rewardDuration;

    emit RewardDurationUpdated(_oldRewardDuration, _rewardDuration);
  }

  function setRewardAmount(uint256 _rewardAmount) external {
    if (!_canSetStakingConditions()) revert NotAllowed();

    _calculateRewards(address(0));

    if (block.timestamp >= periodFinish) {
      rewardRate = _rewardAmount / rewardDuration;
    } else {
      uint256 _remaining = periodFinish - block.timestamp;
      uint256 _leftover = _remaining * rewardRate;
      rewardRate = (_rewardAmount + _leftover) / rewardDuration;
    }

    // Ensure that the provided reward rate is not more than the balance in the contract.
    // This keeps the reward rate in the right range, preventing overflows due to
    // very high values of rewardRate in the earned and rewardsPerToken functions;
    // Reward + leftover must be less than 2^256 / 10^18 to avoid overflow.
    uint256 _balance = _rewardTokenBalance();

    if (rewardRate > _balance / rewardDuration)
      revert InvalidAmount("Reward rate is too high");

    lastUpdateTime = block.timestamp;
    periodFinish = block.timestamp + rewardDuration;

    emit RewardRateUpdated(0, rewardRate);
  }

  /// @dev View available rewards for a user.
  function getStakeInfo(
    address _staker
  ) external view virtual returns (uint256 _tokensStaked, uint256 _rewards) {
    _tokensStaked = stakers[_staker].stakedAmount;
    _rewards = _availableRewards(_staker);
  }

  // =============================================================
  //                           Internal
  // =============================================================
  /// @dev View available rewards for a user.
  function _availableRewards(
    address _staker
  ) internal view virtual returns (uint256 _rewards) {
    if (stakers[_staker].stakedAmount == 0) {
      _rewards = stakers[_staker].unclaimedRewards;
    } else {
      _rewards = _earned(_staker);
    }
  }

  function _claim() internal virtual {
    address _staker = _stakeMsgSender();
    _calculateRewards(_staker);

    uint256 _unclaimedRewards = stakers[_staker].unclaimedRewards;

    if (_unclaimedRewards > 0) {
      stakers[_staker].unclaimedRewards = 0;
      stakers[_staker].lastClaimed = block.timestamp;
      _mintRewards(_staker, _unclaimedRewards);
      emit RewardsClaimed(_staker, _unclaimedRewards);
    } else {
      revert InvalidAmount("No rewards to claim");
    }
  }

  function _withdraw(uint256 amount) internal virtual {
    // Check that staker is withdrawing a non-zero amount
    if (amount == 0) revert ZeroAmount();

    // Calculate rewards
    address _staker = _stakeMsgSender();
    _calculateRewards(_staker);

    // Check that staker has enough staked tokens
    if (stakers[_staker].stakedAmount < amount)
      revert InvalidAmount("Not enough staked tokens");

    // Update the total supply
    stakingTokenBalance -= amount;

    // Update the staker's balance
    stakers[_staker].stakedAmount -= amount;

    // Transfer the staking token from this contract to the staker
    CurrencyTransfer.transferCurrency(
      stakingToken,
      address(this),
      _staker,
      amount
    );

    // Emit the TokenUnstaked event
    emit TokenUnstaked(_staker, amount);
  }

  function _stake(uint256 amount) internal virtual {
    if (amount == 0) revert ZeroAmount();

    address _staker = _stakeMsgSender();
    _calculateRewards(_staker);

    // Update the total supply
    stakingTokenBalance += amount;

    // Update the staker's balance
    stakers[_staker].stakedAmount += amount;

    // Transfer the staking token from the staker to this contract
    CurrencyTransfer.transferCurrency(
      stakingToken,
      _staker,
      address(this),
      amount
    );

    // Emit the TokenStaked event
    emit TokenStaked(_staker, amount);
  }

  /// @dev Calculate last time reward is applicable
  function _lastTimeRewardApplicable() internal view returns (uint256) {
    return block.timestamp < periodFinish ? block.timestamp : periodFinish;
  }

  /// @dev Calculates the reward per token for a staking contract
  /// taking into account the total number of tokens staked, the time elapsed since the last update of the reward rate, and the current reward rate
  function _rewardPerToken() internal view returns (uint256) {
    if (stakingTokenBalance == 0) {
      return rewardPerTokenStored;
    }

    return
      rewardPerTokenStored +
      ((_lastTimeRewardApplicable() - lastUpdateTime) * rewardRate * 1e18) /
      stakingTokenBalance;
  }

  function _earned(address _staker) internal view virtual returns (uint256) {
    return
      (stakers[_staker].stakedAmount *
        (_rewardPerToken() - stakers[_staker].rewardPerTokenPaid)) /
      1e18 +
      stakers[_staker].unclaimedRewards;
  }

  /// @dev Calculate rewards for a staker
  /// @param _staker Address of the staker
  function _calculateRewards(address _staker) internal virtual {
    rewardPerTokenStored = _rewardPerToken();
    lastUpdateTime = _lastTimeRewardApplicable();
    if (_staker != address(0)) {
      stakers[_staker].unclaimedRewards = _earned(_staker);
      stakers[_staker].rewardPerTokenPaid = rewardPerTokenStored;
    }
  }

  // =============================================================
  //                           Hooks
  // =============================================================

  /// @dev Export ability to override msg.sender
  /// @return Address of the message sender
  function _stakeMsgSender() internal view virtual returns (address) {
    return msg.sender;
  }

  /// @dev View total rewards available in the contract
  /// @return Total rewards available in the contract
  function _rewardTokenBalance() internal view virtual returns (uint256);

  /// @dev Mint/Transfer ERC20 rewards to the staker. Must override
  /// @param _staker Address of the staker
  /// @param _amount Amount of rewards to mint/transfer
  function _mintRewards(address _staker, uint256 _amount) internal virtual;

  /// @dev Returns whether staking conditions can be set
  /// @return True if staking conditions can be set
  function _canSetStakingConditions() internal view virtual returns (bool);
}
