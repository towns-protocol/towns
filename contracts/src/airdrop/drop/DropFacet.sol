// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDropFacet} from "contracts/src/airdrop/drop/IDropFacet.sol";
import {IRewardsDistribution} from "contracts/src/base/registry/facets/distribution/v2/IRewardsDistribution.sol";

// libraries
import {SafeCastLib} from "solady/utils/SafeCastLib.sol";
import {CustomRevert} from "contracts/src/utils/libraries/CustomRevert.sol";
import {DropStorage} from "contracts/src/airdrop/drop/DropStorage.sol";
import {CurrencyTransfer} from "contracts/src/utils/libraries/CurrencyTransfer.sol";

// contracts
import {Facet} from "@river-build/diamond/src/facets/Facet.sol";
import {OwnableBase} from "@river-build/diamond/src/facets/ownable/OwnableBase.sol";
import {DropFacetBase} from "contracts/src/airdrop/drop/DropFacetBase.sol";

contract DropFacet is IDropFacet, DropFacetBase, OwnableBase, Facet {
  using DropStorage for DropStorage.Layout;

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                       ADMIN FUNCTIONS                      */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  function __DropFacet_init(
    address rewardsDistribution,
    uint48 minLockDuration,
    uint48 maxLockDuration
  ) external onlyInitializing {
    __DropFacet_init_unchained(
      rewardsDistribution,
      minLockDuration,
      maxLockDuration
    );
  }

  function __DropFacet_init_unchained(
    address rewardsDistribution,
    uint48 minLockDuration,
    uint48 maxLockDuration
  ) internal {
    if (rewardsDistribution == address(0)) {
      CustomRevert.revertWith(DropFacet__RewardsDistributionNotSet.selector);
    }

    DropStorage.Layout storage ds = DropStorage.layout();
    (ds.rewardsDistribution, ds.minLockDuration, ds.maxLockDuration) = (
      rewardsDistribution,
      minLockDuration,
      maxLockDuration
    );
  }

  /// @inheritdoc IDropFacet
  function setClaimConditions(
    ClaimCondition[] calldata conditions
  ) external onlyOwner {
    DropStorage.Layout storage ds = DropStorage.layout();
    _setClaimConditions(ds, conditions);
  }

  /// @inheritdoc IDropFacet
  function addClaimCondition(
    ClaimCondition calldata condition
  ) external onlyOwner {
    DropStorage.Layout storage ds = DropStorage.layout();
    _addClaimCondition(ds, condition);
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                            CLAIM                           */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  /// @inheritdoc IDropFacet
  // TODO: rename
  function claimWithPenalty(
    Claim calldata claim,
    uint16 expectedPenaltyBps
  ) external returns (uint256 amount) {
    DropStorage.Layout storage ds = DropStorage.layout();
    ClaimCondition storage condition = ds.getClaimConditionById(
      claim.conditionId
    );
    DropStorage.SupplyClaim storage claimed = ds.getSupplyClaimedByWallet(
      claim.conditionId,
      claim.account
    );

    _verifyClaim(condition, claimed, claim);

    amount = _verifyPenaltyBps(condition, claim.quantity, expectedPenaltyBps);

    _updateClaim(condition, claimed, amount);

    CurrencyTransfer.safeTransferERC20(
      condition.currency,
      address(this),
      claim.account,
      amount
    );

    emit DropFacet_Claimed_WithPenalty(
      claim.conditionId,
      msg.sender,
      claim.account,
      amount
    );
  }

  /// @inheritdoc IDropFacet
  function claimAndStake(
    Claim calldata claim,
    address delegatee,
    uint48 lockDuration
  ) external returns (uint256 amount) {
    DropStorage.Layout storage ds = DropStorage.layout();
    _verifyLockDuration(ds, lockDuration);

    ClaimCondition storage condition = ds.getClaimConditionById(
      claim.conditionId
    );
    DropStorage.SupplyClaim storage claimed = ds.getSupplyClaimedByWallet(
      claim.conditionId,
      claim.account
    );

    amount = claim.quantity;
    uint16 penaltyBps = condition.penaltyBps;
    // linear decrease of penaltyBps according to lockDuration
    uint48 maxLockDuration = ds.maxLockDuration;
    penaltyBps = uint16(
      (uint256(penaltyBps) * (maxLockDuration - lockDuration)) / maxLockDuration
    );

    uint256 remaining = amount;
    if (penaltyBps != 0) {
      unchecked {
        uint256 penaltyAmount = BasisPoints.calculate(amount, penaltyBps);
        remaining = amount - penaltyAmount;
      }
    }
    // store timestamp of claim and lockDuration
    ds.claimById[claim.conditionId].timestamp = block.timestamp;
    ds.claimById[claim.conditionId].lockDuration = lockDuration;

    _verifyClaim(condition, claimed, claim);
    _updateClaim(condition, claimed, remaining);
    _approveClaimToken(ds, condition, remaining);

    uint256 depositId = IRewardsDistribution(ds.rewardsDistribution)
      .stakeOnBehalf(
        SafeCastLib.toUint96(remaining),
        delegatee,
        claim.account,
        address(this),
        0,
        ""
      );

    _updateDepositId(claimed, depositId);

    emit DropFacet_Claimed_And_Staked(
      claim.conditionId,
      msg.sender,
      claim.account,
      remaining
    );
  }

  function claimPrincipal(
    Claim calldata claim,
    address delegatee
  ) external returns (uint256 amount) {
    DropStorage.Layout storage ds = DropStorage.layout();
    
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                          GETTERS                           */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  /// @inheritdoc IDropFacet
  function getActiveClaimConditionId() external view returns (uint256) {
    return _getActiveConditionId(DropStorage.layout());
  }

  /// @inheritdoc IDropFacet
  function getClaimConditions()
    external
    view
    returns (ClaimCondition[] memory)
  {
    return _getClaimConditions(DropStorage.layout());
  }

  /// @inheritdoc IDropFacet
  function getClaimConditionById(
    uint256 conditionId
  ) external view returns (ClaimCondition memory condition) {
    assembly ("memory-safe") {
      // By default, memory has been implicitly allocated for `condition`.
      // But we don't need this implicitly allocated memory.
      // So we just set the free memory pointer to what it was before `condition` has been allocated.
      mstore(0x40, condition)
    }
    condition = DropStorage.layout().getClaimConditionById(conditionId);
  }

  /// @inheritdoc IDropFacet
  function getSupplyClaimedByWallet(
    address account,
    uint256 conditionId
  ) external view returns (uint256) {
    return
      DropStorage
        .layout()
        .getSupplyClaimedByWallet(conditionId, account)
        .claimed;
  }

  /// @inheritdoc IDropFacet
  function getDepositIdByWallet(
    address account,
    uint256 conditionId
  ) external view returns (uint256) {
    return
      DropStorage
        .layout()
        .getSupplyClaimedByWallet(conditionId, account)
        .depositId;
  }
}
