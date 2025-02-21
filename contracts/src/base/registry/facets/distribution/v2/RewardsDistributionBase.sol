// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {IRewardsDistributionBase} from "./IRewardsDistribution.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";
import {LibClone} from "solady/utils/LibClone.sol";
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";
import {SignatureCheckerLib} from "solady/utils/SignatureCheckerLib.sol";
import {CustomRevert} from "contracts/src/utils/libraries/CustomRevert.sol";
import {NodeOperatorStorage, NodeOperatorStatus} from "contracts/src/base/registry/facets/operator/NodeOperatorStorage.sol";
import {SpaceDelegationStorage} from "contracts/src/base/registry/facets/delegation/SpaceDelegationStorage.sol";
import {StakingRewards} from "./StakingRewards.sol";
import {RewardsDistributionStorage} from "./RewardsDistributionStorage.sol";

// contracts
import {DelegationProxy} from "./DelegationProxy.sol";

abstract contract RewardsDistributionBase is IRewardsDistributionBase {
  using EnumerableSet for EnumerableSet.AddressSet;
  using EnumerableSet for EnumerableSet.UintSet;
  using SafeTransferLib for address;
  using StakingRewards for StakingRewards.Layout;

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                           STAKING                          */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  function _stake(
    uint96 amount,
    address delegatee,
    address beneficiary,
    address owner
  ) internal returns (uint256 depositId) {
    _revertIfNotOperatorOrSpace(delegatee);

    RewardsDistributionStorage.Layout storage ds = RewardsDistributionStorage
      .layout();
    depositId = ds.staking.stake(
      owner,
      amount,
      delegatee,
      beneficiary,
      _getCommissionRate(delegatee)
    );

    _sweepSpaceRewardsIfNecessary(delegatee);

    if (owner != address(this)) {
      address proxy = _deployDelegationProxy(depositId, delegatee);
      ds.staking.stakeToken.safeTransferFrom(msg.sender, proxy, amount);
    }
    ds.depositsByDepositor[owner].add(depositId);

    emit Stake(owner, delegatee, beneficiary, depositId, amount);
  }

  function _increaseStake(uint256 depositId, uint96 amount) internal {
    RewardsDistributionStorage.Layout storage ds = RewardsDistributionStorage
      .layout();
    StakingRewards.Deposit storage deposit = ds.staking.depositById[depositId];
    address owner = deposit.owner;
    _revertIfNotDepositOwner(owner);

    address delegatee = deposit.delegatee;
    _revertIfNotOperatorOrSpace(delegatee);

    ds.staking.increaseStake(
      deposit,
      owner,
      amount,
      delegatee,
      deposit.beneficiary,
      _getCommissionRate(delegatee)
    );

    _sweepSpaceRewardsIfNecessary(delegatee);

    if (owner != address(this)) {
      address proxy = ds.proxyById[depositId];
      ds.staking.stakeToken.safeTransferFrom(msg.sender, proxy, amount);
    }

    emit IncreaseStake(depositId, amount);
  }

  /// @dev Calls the `permit` function of the stake token
  function _permitStakeToken(
    uint96 amount,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) internal {
    address stakeToken = RewardsDistributionStorage.layout().staking.stakeToken;

    bytes4 selector = IERC20Permit.permit.selector;
    assembly ("memory-safe") {
      let fmp := mload(0x40)
      mstore(fmp, selector)
      mstore(add(fmp, 0x04), caller())
      mstore(add(fmp, 0x24), address())
      mstore(add(fmp, 0x44), amount)
      mstore(add(fmp, 0x64), deadline)
      mstore(add(fmp, 0x84), v)
      mstore(add(fmp, 0xa4), r)
      mstore(add(fmp, 0xc4), s)
      if iszero(call(gas(), stakeToken, 0, fmp, 0xe4, 0, 0)) {
        returndatacopy(0, 0, returndatasize())
        revert(0, returndatasize())
      }
    }
  }

  /// @dev Deploys a beacon proxy for the delegation
  function _deployDelegationProxy(
    uint256 depositId,
    address delegatee
  ) internal returns (address proxy) {
    RewardsDistributionStorage.Layout storage ds = RewardsDistributionStorage
      .layout();
    proxy = LibClone.deployDeterministicERC1967BeaconProxy(
      address(this),
      bytes32(depositId)
    );
    ds.proxyById[depositId] = proxy;
    DelegationProxy(proxy).initialize(ds.staking.stakeToken, delegatee);

    emit DelegationProxyDeployed(depositId, delegatee, proxy);
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                          OPERATOR                          */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  /// @dev Returns the commission rate of the operator or space
  function _getCommissionRate(
    address delegatee
  ) internal view returns (uint256) {
    // if the delegatee is a space, get the active operator or revert
    if (_isSpace(delegatee)) {
      delegatee = _getActiveOperatorOrRevert(delegatee);
    }
    NodeOperatorStorage.Layout storage nos = NodeOperatorStorage.layout();
    return nos.commissionByOperator[delegatee];
  }

  /// @dev Checks if the delegatee is an operator
  function _isOperator(address delegatee) internal view returns (bool) {
    NodeOperatorStorage.Layout storage nos = NodeOperatorStorage.layout();
    return nos.operators.contains(delegatee);
  }

  /// @dev Checks if the delegatee is an active operator
  function _isActiveOperator(address delegatee) internal view returns (bool) {
    NodeOperatorStorage.Layout storage nos = NodeOperatorStorage.layout();
    if (!nos.operators.contains(delegatee)) return false;
    return nos.statusByOperator[delegatee] == NodeOperatorStatus.Active;
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                      SPACE DELEGATION                      */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  /// @dev Sweeps the rewards in the space delegation to the operator if necessary
  /// @dev Must be called after `StakingRewards.updateGlobalReward`
  function _sweepSpaceRewardsIfNecessary(address space) internal {
    address operator = _getOperatorBySpace(space);
    if (operator == address(0)) return;

    StakingRewards.Layout storage staking = RewardsDistributionStorage
      .layout()
      .staking;
    StakingRewards.Treasure storage spaceTreasure = staking
      .treasureByBeneficiary[space];
    staking.updateReward(spaceTreasure);

    uint256 scaledReward = spaceTreasure.unclaimedRewardSnapshot;
    if (scaledReward == 0) return;

    StakingRewards.Treasure storage operatorTreasure = staking
      .treasureByBeneficiary[operator];

    operatorTreasure.unclaimedRewardSnapshot += scaledReward;
    spaceTreasure.unclaimedRewardSnapshot = 0;

    emit SpaceRewardsSwept(space, operator, scaledReward);
  }

  /// @dev Checks if the delegatee is a space
  function _isSpace(address delegatee) internal view returns (bool) {
    return _getOperatorBySpace(delegatee) != address(0);
  }

  /// @dev Returns the operator of the space
  function _getOperatorBySpace(
    address space
  ) internal view returns (address operator) {
    SpaceDelegationStorage.Layout storage sd = SpaceDelegationStorage.layout();
    operator = sd.operatorBySpace[space];
  }

  /// @dev Returns the active operator of the space or reverts
  function _getActiveOperatorOrRevert(
    address space
  ) internal view returns (address operator) {
    operator = _getOperatorBySpace(space);
    if (!_isActiveOperator(operator)) {
      CustomRevert.revertWith(RewardsDistribution__NotActiveOperator.selector);
    }
  }

  function _currentSpaceDelegationReward(
    address operator
  ) internal view returns (uint256 total) {
    StakingRewards.Layout storage staking = RewardsDistributionStorage
      .layout()
      .staking;
    address[] memory spaces = SpaceDelegationStorage
      .layout()
      .spacesByOperator[operator]
      .values();

    uint256 currentRewardPerTokenAccumulated = staking
      .currentRewardPerTokenAccumulated();
    uint256 rewardPerTokenGrowth;
    for (uint256 i; i < spaces.length; ++i) {
      StakingRewards.Treasure storage treasure = staking.treasureByBeneficiary[
        spaces[i]
      ];
      unchecked {
        rewardPerTokenGrowth =
          currentRewardPerTokenAccumulated -
          treasure.rewardPerTokenAccumulated;
      }
      total +=
        treasure.unclaimedRewardSnapshot +
        (uint256(treasure.earningPower) * rewardPerTokenGrowth);
    }
    total /= StakingRewards.SCALE_FACTOR;
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                        SANITY CHECKS                       */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  /// @dev Reverts if the delegatee is not an operator or space
  function _revertIfNotOperatorOrSpace(address delegatee) internal view {
    if (_isSpace(delegatee)) return;
    if (!_isActiveOperator(delegatee)) {
      CustomRevert.revertWith(RewardsDistribution__NotOperatorOrSpace.selector);
    }
  }

  /// @dev Reverts if the caller is not the owner of the deposit
  function _revertIfNotDepositOwner(address owner) internal view {
    if (msg.sender != owner) {
      CustomRevert.revertWith(RewardsDistribution__NotDepositOwner.selector);
    }
  }

  /// @dev Checks if the caller is the claimer of the operator
  function _revertIfNotOperatorClaimer(address operator) internal view {
    NodeOperatorStorage.Layout storage nos = NodeOperatorStorage.layout();
    address claimer = nos.claimerByOperator[operator];
    if (msg.sender != claimer) {
      CustomRevert.revertWith(RewardsDistribution__NotClaimer.selector);
    }
  }

  function _revertIfPastDeadline(uint256 deadline) internal view {
    if (block.timestamp > deadline) {
      CustomRevert.revertWith(RewardsDistribution__ExpiredDeadline.selector);
    }
  }

  function _revertIfSignatureIsNotValidNow(
    address signer,
    bytes32 hash,
    bytes calldata signature
  ) internal view {
    if (
      !SignatureCheckerLib.isValidSignatureNowCalldata(signer, hash, signature)
    ) {
      CustomRevert.revertWith(RewardsDistribution__InvalidSignature.selector);
    }
  }
}
