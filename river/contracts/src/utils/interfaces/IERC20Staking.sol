// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// interfaces

// libraries

// contracts

interface IERC20Staking {
  // =============================================================
  //                           Events
  // =============================================================

  /// @notice Emitted when tokens are staked
  event TokenStaked(address indexed user, uint256 amount);

  /// @notice Emitted when tokens are unstaked
  event TokenUnstaked(address indexed user, uint256 amount);

  /// @notice Emitted when rewards are claimed
  event RewardsClaimed(address indexed user, uint256 amount);

  /// @notice Emitted when reward rate is updated
  event RewardRateUpdated(uint256 oldRewardRate, uint256 newRewardRate);

  /// @notice Emitted when reward duration is updated
  event RewardDurationUpdated(
    uint256 oldRewardDuration,
    uint256 newRewardDuration
  );

  event RewardTokensDeposited(address indexed user, uint256 amount);

  // =============================================================
  //                           Errors
  // =============================================================
  error ZeroAddress();
  error ZeroAmount();
  error InvalidAmount(string reason);
  error NotAllowed();

  // =============================================================
  //                           Structs
  // =============================================================
  struct Staker {
    uint256 stakedAmount;
    uint256 rewardPerTokenPaid;
    uint256 unclaimedRewards;
    uint256 lastClaimed;
  }
}
