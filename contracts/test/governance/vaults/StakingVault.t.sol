// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

//interfaces
import {IERC20Staking} from "contracts/src/utils/interfaces/IERC20Staking.sol";

//libraries

//contracts
import {TestUtils} from "contracts/test/utils/TestUtils.sol";
import {MockERC20} from "contracts/test/mocks/MockERC20.sol";
import {SpaceBaseSetup} from "contracts/test/spaces/SpaceBaseSetup.sol";

import {StakingVault} from "contracts/src/governance/vaults/StakingVault.sol";
import {IERC20Staking} from "contracts/src/utils/interfaces/IERC20Staking.sol";

import {console} from "forge-std/console.sol";

contract StakingVaultTest is SpaceBaseSetup {
  address internal _stakingToken;
  address internal _stakingVault;

  address internal _town;

  address internal _deployer;
  address internal _stakerOne;
  address internal _stakerTwo;

  /// @dev Reward duration in seconds. This is the time that the reward will be distributed for.
  uint256 internal _rewardDuration = 4 days;

  /// @dev Reward amount in wei. This is the amount that will be distributed.
  uint256 internal _rewardAmount = 1000 ether;

  /// @dev The period in which the reward can be claimed for
  uint256 internal _claimPeriod = block.timestamp + _rewardDuration + 7 days;

  function setUp() external {
    _deployer = _randomAddress();
    _stakerOne = _randomAddress();
    _stakerTwo = _randomAddress();

    vm.startPrank(_deployer);
    _town = createSimpleSpace();
    _stakingToken = address(new MockERC20("StakingToken", "STK"));
    _stakingVault = address(
      new StakingVault(_town, _stakingToken, _stakingToken, _claimPeriod)
    );
    vm.stopPrank();

    MockERC20(_stakingToken).mint(_stakerOne, 1000);
    MockERC20(_stakingToken).mint(_stakerTwo, 1000);
    MockERC20(_stakingToken).mint(_deployer, 1000 ether);

    vm.prank(_stakerOne);
    MockERC20(_stakingToken).approve(_stakingVault, type(uint256).max);

    vm.prank(_stakerTwo);
    MockERC20(_stakingToken).approve(_stakingVault, type(uint256).max);

    vm.startPrank(_deployer);
    MockERC20(_stakingToken).approve(_stakingVault, type(uint256).max);
    StakingVault(_stakingVault).depositRewardTokens(1000 ether);

    StakingVault(_stakingVault).setRewardDuration(_rewardDuration);
    StakingVault(_stakingVault).setRewardAmount(_rewardAmount);
    vm.stopPrank();

    assertEq(
      StakingVault(_stakingVault).getRewardTokenBalance(),
      1000 ether,
      "StakingVaultTest: reward token balance"
    );
  }

  function test_stake() external {
    // ====== first staker ======

    vm.prank(_stakerOne);
    StakingVault(_stakingVault).stake(400);

    // check balance of staked tokens
    (uint256 _amountStaked, uint256 _availableReward) = StakingVault(
      _stakingVault
    ).getStakeInfo(_stakerOne);

    // at this point the staker has no rewards available
    assertEq(_amountStaked, 400, "StakingVaultTest: staked amount");
    assertEq(_availableReward, 0, "StakingVaultTest: available reward");

    // ====== warp timestamp to calculate rewards ======
    vm.warp(StakingVault(_stakingVault).periodFinish()); // way past the periodFinish

    // // ====== second staker ======
    // vm.warp(block.timestamp + 2000); // way past the periodFinish

    vm.prank(_stakerTwo);
    StakingVault(_stakingVault).stake(200);

    // check total balance of staked tokens
    assertEq(
      StakingVault(_stakingVault).stakingTokenBalance(),
      400 + 200, // 400 from stakerOne and 200 from stakerTwo
      "StakingVaultTest: staked token balance"
    );

    // // check balance of stakerTwo tokens
    assertEq(
      MockERC20(_stakingToken).balanceOf(_stakerTwo),
      800, // 1000 - 200 staked
      "StakingVaultTest: stakerTwo balance"
    );

    // // check balance of staked tokens for stakerTwo
    (_amountStaked, _availableReward) = StakingVault(_stakingVault)
      .getStakeInfo(_stakerTwo);

    // // at this point the staker has no rewards available
    assertEq(_amountStaked, 200, "StakingVaultTest: staked amount");
    assertEq(_availableReward, 0, "StakingVaultTest: available reward");

    // // ====== warp timestamp to calculate rewards ======
    vm.warp(StakingVault(_stakingVault).periodFinish() + 1 days); // way past the periodFinish

    (, _availableReward) = StakingVault(_stakingVault).getStakeInfo(_stakerTwo);

    // // since the periodFinish is 1000, the rewards are calculated from 0 to 1000
    assertEq(_availableReward, 0 ether, "StakingVaultTest: available reward");
  }

  function test_revertStakeZeroTokens() external {
    vm.prank(_stakerOne);
    vm.expectRevert(IERC20Staking.ZeroAmount.selector);
    StakingVault(_stakingVault).stake(0);
  }

  // ===============================
  // Claim Rewards
  // ===============================
  function test_claim() external {
    vm.prank(_stakerOne);
    StakingVault(_stakingVault).stake(400);

    vm.warp(block.timestamp + 1000);

    uint256 rewardBalanceBefore = StakingVault(_stakingVault)
      .getRewardTokenBalance();

    (uint256 _amountStaked, uint256 _availableReward) = StakingVault(
      _stakingVault
    ).getStakeInfo(_stakerOne);

    vm.prank(_stakerOne);
    StakingVault(_stakingVault).claim();

    uint256 rewardBalanceAfter = StakingVault(_stakingVault)
      .getRewardTokenBalance();

    assertEq(
      rewardBalanceAfter,
      rewardBalanceBefore - _availableReward,
      "StakingVaultTest: reward token balance"
    );

    // check available rewards after claiming
    (_amountStaked, _availableReward) = StakingVault(_stakingVault)
      .getStakeInfo(_stakerOne);

    assertEq(_amountStaked, 400, "StakingVaultTest: staked amount");
    assertEq(_availableReward, 0, "StakingVaultTest: available reward");
  }

  function test_revertClaimNoRewards() external {
    vm.prank(_stakerOne);
    StakingVault(_stakingVault).stake(400);

    vm.warp(block.timestamp + 500);

    vm.startPrank(_stakerOne);
    StakingVault(_stakingVault).claim();
    StakingVault(_stakingVault).withdraw(400);
    vm.stopPrank();

    vm.warp(block.timestamp + 1000);

    vm.prank(_stakerOne);
    vm.expectRevert(
      abi.encodeWithSelector(
        IERC20Staking.InvalidAmount.selector,
        "No rewards to claim"
      )
    );
    StakingVault(_stakingVault).claim();
  }

  // ===============================
  // Staking conditions
  // ===============================
  function test_setRewardAmount() external {
    // force end of reward period
    vm.warp(block.timestamp + _rewardDuration + 1);

    vm.prank(_deployer);
    StakingVault(_stakingVault).setRewardAmount(10 ether);

    vm.prank(_stakerOne);
    StakingVault(_stakingVault).stake(400);

    (, uint256 oldRewards) = StakingVault(_stakingVault).getStakeInfo(
      _stakerOne
    );

    vm.warp(block.timestamp + _rewardDuration + 2);

    (uint256 stakedTokens, uint256 availableReward) = StakingVault(
      _stakingVault
    ).getStakeInfo(_stakerOne);

    assertEq(stakedTokens, 400, "StakingVaultTest: staked amount");
    assertTrue(
      availableReward > oldRewards,
      "StakingVaultTest: available reward"
    );
  }

  function test_setRewardDuration() external {
    // force end of period
    vm.warp(block.timestamp + _rewardDuration + 1);

    vm.startPrank(_deployer);
    StakingVault(_stakingVault).setRewardDuration(_rewardDuration + 1 days);
    StakingVault(_stakingVault).setRewardAmount(10 ether);
    vm.stopPrank();
  }

  function test_setRewardAmountNotAuthorized() external {
    vm.prank(_stakerOne);
    vm.expectRevert(IERC20Staking.NotAllowed.selector);
    StakingVault(_stakingVault).setRewardAmount(10 ether);
  }

  function test_setRewardDurationNotAuthorized() external {
    vm.prank(_stakerOne);
    vm.expectRevert(IERC20Staking.NotAllowed.selector);
    StakingVault(_stakingVault).setRewardDuration(100);
  }
}
