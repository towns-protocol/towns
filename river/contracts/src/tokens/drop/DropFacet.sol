// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDropFacet} from "contracts/src/tokens/drop/IDropFacet.sol";
import {IRewardsDistribution} from "contracts/src/base/registry/facets/distribution/v2/IRewardsDistribution.sol";

// libraries
import {DropStorage} from "contracts/src/tokens/drop/DropStorage.sol";
import {CurrencyTransfer} from "contracts/src/utils/libraries/CurrencyTransfer.sol";

import {SafeCastLib} from "solady/utils/SafeCastLib.sol";

// contracts
import {Facet} from "contracts/src/diamond/facets/Facet.sol";
import {DropFacetBase} from "contracts/src/tokens/drop/DropFacetBase.sol";
import {OwnableBase} from "contracts/src/diamond/facets/ownable/OwnableBase.sol";

contract DropFacet is IDropFacet, DropFacetBase, OwnableBase, Facet {
  using DropStorage for DropStorage.Layout;

  function __DropFacet_init(
    address rewardsDistribution
  ) external onlyInitializing {
    _addInterface(type(IDropFacet).interfaceId);
    __DropFacet_init_unchained(rewardsDistribution);
  }

  function __DropFacet_init_unchained(address rewardsDistribution) internal {
    _setRewardsDistribution(DropStorage.layout(), rewardsDistribution);
  }

  ///@inheritdoc IDropFacet
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

    amount = _verifyPenaltyBps(condition, claim, expectedPenaltyBps);

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

    return amount;
  }

  function claimAndStake(
    Claim calldata claim,
    address delegatee,
    uint256 deadline,
    bytes calldata signature
  ) external returns (uint256) {
    DropStorage.Layout storage ds = DropStorage.layout();
    ClaimCondition storage condition = ds.getClaimConditionById(
      claim.conditionId
    );
    DropStorage.SupplyClaim storage claimed = ds.getSupplyClaimedByWallet(
      claim.conditionId,
      claim.account
    );

    _verifyClaim(condition, claimed, claim);
    _updateClaim(condition, claimed, claim.quantity);
    _approveClaimToken(ds, condition, claim.quantity);

    uint256 depositId = IRewardsDistribution(ds.rewardsDistribution)
      .stakeOnBehalf(
        SafeCastLib.toUint96(claim.quantity),
        delegatee,
        claim.account,
        claim.account,
        deadline,
        signature
      );

    _updateDepositId(claimed, depositId);

    emit DropFacet_Claimed_And_Staked(
      claim.conditionId,
      msg.sender,
      claim.account,
      claim.quantity
    );

    return claim.quantity;
  }

  ///@inheritdoc IDropFacet
  function setClaimConditions(
    ClaimCondition[] calldata conditions
  ) external onlyOwner {
    DropStorage.Layout storage ds = DropStorage.layout();
    _setClaimConditions(ds, conditions);
  }

  ///@inheritdoc IDropFacet
  function addClaimCondition(
    ClaimCondition calldata condition
  ) external onlyOwner {
    DropStorage.Layout storage ds = DropStorage.layout();
    _addClaimCondition(ds, condition);
  }

  ///@inheritdoc IDropFacet
  function getActiveClaimConditionId() external view returns (uint256) {
    return _getActiveConditionId(DropStorage.layout());
  }

  ///@inheritdoc IDropFacet
  function getClaimConditions()
    external
    view
    returns (ClaimCondition[] memory)
  {
    return _getClaimConditions(DropStorage.layout());
  }

  ///@inheritdoc IDropFacet
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

  ///@inheritdoc IDropFacet
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

  ///@inheritdoc IDropFacet
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
