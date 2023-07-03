// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;

// interfaces
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ISpace} from "contracts/src/spaces/interfaces/ISpace.sol";

// libraries
import {CurrencyTransfer} from "contracts/src/utils/libraries/CurrencyTransfer.sol";

// contracts
import {ERC20Staking} from "contracts/src/utils/ERC20Staking.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract StakingVault is ERC20Staking, Ownable {
  address public town;

  /// @dev Address of the ERC20 token being rewarded
  address public rewardsToken;

  /// @dev Total amount of reward tokens in the contract.
  uint256 private rewardTokenBalance;

  /// @dev Claim period
  uint256 public claimPeriod;

  constructor(
    address _town,
    address _stakingToken,
    address _rewardsToken,
    uint256 _claimPeriod
  ) ERC20Staking(_stakingToken) {
    town = _town;
    rewardsToken = _rewardsToken;
    claimPeriod = _claimPeriod;
  }

  /// @dev Admin function to deposit reward tokens.
  function depositRewardTokens(uint256 _amount) external virtual nonReentrant {
    _depositRewardTokens(_amount);
  }

  /// @dev Admin function to withdraw reward tokens.
  function withdrawRewardTokens(uint256 _amount) external virtual nonReentrant {
    _withdrawRewardTokens(_amount);
  }

  /// @notice Returns the total amount of reward tokens in the contract.
  function getRewardTokenBalance() external view returns (uint256) {
    return rewardTokenBalance;
  }

  // =============================================================
  //                           Internal
  // =============================================================

  function _earned(address _staker) internal view override returns (uint256) {
    uint256 _timeSincleLastClaimed = block.timestamp -
      stakers[_staker].lastClaimed;

    if (_timeSincleLastClaimed > claimPeriod) {
      return 0;
    }

    return super._earned(_staker);
  }

  function _withdrawRewardTokens(uint256 _amount) internal virtual {
    if (_stakeMsgSender() != owner()) revert NotAllowed();

    if (_amount == 0) revert ZeroAmount();
    if (_amount > rewardTokenBalance) revert InvalidAmount("Not enough tokens");

    rewardTokenBalance = _amount > rewardTokenBalance
      ? 0
      : rewardTokenBalance - _amount;

    CurrencyTransfer.transferCurrency(
      rewardsToken,
      address(this),
      _stakeMsgSender(),
      _amount
    );

    if (IERC20(stakingToken).balanceOf(address(this)) <= stakingTokenBalance)
      revert InvalidAmount("Not enough tokens");
  }

  function _depositRewardTokens(uint256 _amount) internal virtual {
    if (_stakeMsgSender() != owner()) revert NotAllowed();

    uint256 balanceBefore = IERC20(rewardsToken).balanceOf(address(this));

    CurrencyTransfer.transferCurrency(
      rewardsToken,
      _stakeMsgSender(),
      address(this),
      _amount
    );
    uint256 actualAmount = IERC20(rewardsToken).balanceOf(address(this)) -
      balanceBefore;

    rewardTokenBalance += actualAmount;
  }

  function _rewardTokenBalance() internal view override returns (uint256) {
    return rewardTokenBalance;
  }

  function _mintRewards(address _staker, uint256 _amount) internal override {
    if (_amount >= rewardTokenBalance)
      revert InvalidAmount("Not enough tokens");
    rewardTokenBalance -= _amount;
    CurrencyTransfer.transferCurrency(
      rewardsToken,
      address(this),
      _staker,
      _amount
    );
  }

  function _canSetStakingConditions() internal view override returns (bool) {
    return _stakeMsgSender() == owner();
  }
}
