// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IVotesEnumerable} from "contracts/src/diamond/facets/governance/votes/enumerable/IVotesEnumerable.sol"; // make this into interface
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IRewardsDistribution} from "contracts/src/base/registry/facets/distribution/IRewardsDistribution.sol";
import {MainnetDelegationBase} from "contracts/src/tokens/river/base/delegation/MainnetDelegationBase.sol";
import {OwnableBase} from "contracts/src/diamond/facets/ownable/OwnableBase.sol";
import {NodeOperatorStorage, NodeOperatorStatus} from "contracts/src/base/registry/facets/operator/NodeOperatorStorage.sol";
import {RewardsDistributionStorage} from "contracts/src/base/registry/facets/distribution/RewardsDistributionStorage.sol";
import {SpaceDelegationStorage} from "contracts/src/base/registry/facets/delegation/SpaceDelegationStorage.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {CurrencyTransfer} from "contracts/src/utils/libraries/CurrencyTransfer.sol";

// contracts
import {Facet} from "contracts/src/diamond/facets/Facet.sol";
import {ERC721ABase} from "contracts/src/diamond/facets/token/ERC721A/ERC721ABase.sol";

contract RewardsDistribution is
  IRewardsDistribution,
  ERC721ABase,
  MainnetDelegationBase,
  OwnableBase,
  Facet
{
  using EnumerableSet for EnumerableSet.AddressSet;

  function __RewardsDistribution_init() external onlyInitializing {
    _addInterface(type(IRewardsDistribution).interfaceId);
  }

  function getClaimableAmount(address claimer) public view returns (uint256) {
    RewardsDistributionStorage.Layout storage ds = RewardsDistributionStorage
      .layout();

    uint256 totalClaimableAmount = 0;

    address[] memory delegatorsForClaimer = _getDelegatorsByAuthorizedClaimer(
      claimer
    );
    for (uint256 i = 0; i < delegatorsForClaimer.length; i++) {
      totalClaimableAmount += ds.distributionByDelegator[
        delegatorsForClaimer[i]
      ];
    }

    NodeOperatorStorage.Layout storage nos = NodeOperatorStorage.layout();
    address[] memory operatorsForClaimer = nos
      .operatorsByClaimer[claimer]
      .values();
    for (uint256 i = 0; i < operatorsForClaimer.length; i++) {
      totalClaimableAmount += ds.distributionByOperator[operatorsForClaimer[i]];
    }

    totalClaimableAmount += ds.distributionByDelegator[claimer];

    return totalClaimableAmount;
  }

  function claim() external {
    uint256 amount = getClaimableAmount(msg.sender);
    if (amount == 0) revert RewardsDistribution_NoRewardsToClaim();

    SpaceDelegationStorage.Layout storage sd = SpaceDelegationStorage.layout();
    if (IERC20(sd.riverToken).balanceOf(address(this)) < amount)
      revert RewardsDistribution_InsufficientRewardBalance();

    RewardsDistributionStorage.Layout storage ds = RewardsDistributionStorage
      .layout();

    //clear all this claimers own rewards
    ds.distributionByDelegator[msg.sender] = 0;
    ds.distributionByOperator[msg.sender] = 0;

    //clear all the delegators rewards for this claimer
    address[] memory delegatorsForClaimer = _getDelegatorsByAuthorizedClaimer(
      msg.sender
    );
    for (uint256 i = 0; i < delegatorsForClaimer.length; i++) {
      ds.distributionByDelegator[delegatorsForClaimer[i]] = 0;
    }

    //clear all the opeartor rewards for this claimer
    NodeOperatorStorage.Layout storage nos = NodeOperatorStorage.layout();
    address[] memory operatorsForClaimer = nos
      .operatorsByClaimer[msg.sender]
      .values();
    for (uint256 i = 0; i < operatorsForClaimer.length; i++) {
      ds.distributionByOperator[operatorsForClaimer[i]] = 0;
    }

    CurrencyTransfer.transferCurrency(
      sd.riverToken,
      address(this),
      msg.sender,
      amount
    );
  }

  function distributeRewards(address operator) external onlyOwner {
    address[] memory activeOperators = _getActiveOperators();
    uint256 totalActiveOperators = activeOperators.length;

    if (totalActiveOperators == 0)
      revert RewardsDistribution_NoActiveOperators();

    bool isActiveOperator = false;
    for (uint256 i = 0; i < totalActiveOperators; i++) {
      if (operator == activeOperators[i]) {
        isActiveOperator = true;
        break;
      }
    }

    if (!isActiveOperator) revert RewardsDistribution_InvalidOperator();

    RewardsDistributionStorage.Layout storage ds = RewardsDistributionStorage
      .layout();

    SpaceDelegationStorage.Layout storage sd = SpaceDelegationStorage.layout();

    //Rewards are distributed equally amongst all active node operators
    uint256 amountPerOperator = ds.weeklyDistributionAmount /
      totalActiveOperators;

    uint256 operatorClaimAmount = _calculateOperatorDistribution(
      operator,
      amountPerOperator
    );
    //set that amount to the operator distribution
    ds.distributionByOperator[operator] += operatorClaimAmount;
    emit RewardsDistributed(operator, operatorClaimAmount);

    //distribute the remainder across the delgators to this operator
    uint256 delegatorClaimAmount = amountPerOperator - operatorClaimAmount;
    _distributeDelegatorsRewards(sd, operator, delegatorClaimAmount);
  }

  function setWeeklyDistributionAmount(uint256 amount) external onlyOwner {
    RewardsDistributionStorage.layout().weeklyDistributionAmount = amount;
  }

  function getWeeklyDistributionAmount() public view returns (uint256) {
    return RewardsDistributionStorage.layout().weeklyDistributionAmount;
  }

  // =============================================================
  //                           Internal
  // =============================================================

  function _calculateOperatorDistribution(
    address operator,
    uint256 amountPerOperator
  ) internal view returns (uint256) {
    NodeOperatorStorage.Layout storage nos = NodeOperatorStorage.layout();
    uint256 commission = nos.commissionByOperator[operator];
    uint256 operatorClaimAmount = (commission * amountPerOperator) / 100;
    return operatorClaimAmount;
  }

  function _distributeDelegatorsRewards(
    SpaceDelegationStorage.Layout storage sd,
    address operator,
    uint256 delegatorsClaimAmount
  ) internal {
    //Get all the RVR delegators from the Base token
    address[] memory delegators = IVotesEnumerable(sd.riverToken)
      .getDelegatorsByDelegatee(operator);

    //Get all the spaces delegating to this operator
    address[] memory spaceDelegators = sd.spacesByOperator[operator].values();
    uint256 spaceDelegatorsLen = spaceDelegators.length;

    uint256 totalLength = delegators.length;

    //get all the delegators delegating to those spaces
    for (uint256 i = 0; i < spaceDelegatorsLen; i++) {
      totalLength += IVotesEnumerable(sd.riverToken)
        .getDelegatorsByDelegatee(spaceDelegators[i])
        .length;
    }

    //get all the delegators delegating to the operator on the mainnet
    Delegation[] memory mainnetDelegations = _getDelegationsByOperator(
      operator
    );
    totalLength += mainnetDelegations.length;

    //build new array to hold all individual user delegators
    address[] memory combinedDelegators = new address[](totalLength);
    uint256 count = 0;
    uint256 totalDelegation = 0;

    //iterate through each of the categories of delegation and build an array of all the delegator addresses
    //and the sum of their combined delegations

    // Copy elements from the Base delegators
    for (uint256 i = 0; i < delegators.length; i++) {
      combinedDelegators[count++] = delegators[i];
      //balance is retrieved from the Base token directly
      totalDelegation += IERC20(sd.riverToken).balanceOf(delegators[i]);
    }

    // Copy elements from the space delegators
    for (uint256 i = 0; i < spaceDelegatorsLen; i++) {
      //get all the spaces delegating to this operator
      address[] memory spaceDelegatorDelegators = IVotesEnumerable(
        sd.riverToken
      ).getDelegatorsByDelegatee(spaceDelegators[i]);

      //for each space, get all the users delegating to it
      for (uint256 j = 0; j < spaceDelegatorDelegators.length; j++) {
        combinedDelegators[count++] = spaceDelegatorDelegators[j];
        //get their balance from the Base token since Spaces live on Base
        totalDelegation += IERC20(sd.riverToken).balanceOf(
          spaceDelegatorDelegators[j]
        );
      }
    }

    // Copy elements from the mainnet delegations
    for (uint256 i = 0; i < mainnetDelegations.length; i++) {
      combinedDelegators[count++] = mainnetDelegations[i].delegator;
      totalDelegation += mainnetDelegations[i].quantity;
    }

    uint256 delegatorsLen = combinedDelegators.length;

    RewardsDistributionStorage.Layout storage ds = RewardsDistributionStorage
      .layout();

    for (uint256 i = 0; i < delegatorsLen; i++) {
      address delegator = combinedDelegators[i];

      //all the delegations are done on the Base token except the mainnet delegations
      uint256 amount = IERC20(sd.riverToken).balanceOf(delegator);
      //if this user has no token delegated, then we assume that they are a mainnet delegation
      if (amount == 0) {
        amount = _getDelegationByDelegator(delegator).quantity;
      }
      uint256 delegatorProRata = (amount * delegatorsClaimAmount) /
        totalDelegation;
      ds.distributionByDelegator[delegator] += delegatorProRata;
    }
  }

  function _getActiveOperators() internal view returns (address[] memory) {
    uint256 totalOperators = _totalSupply();
    uint256 totalActiveOperators = 0;

    address[] memory expectedOperators = new address[](totalOperators);
    for (uint256 i = 0; i < totalOperators; i++) {
      address operator = _ownerOf(i);

      NodeOperatorStorage.Layout storage nos = NodeOperatorStorage.layout();
      NodeOperatorStatus currentStatus = nos.statusByOperator[operator];

      if (currentStatus == NodeOperatorStatus.Approved) {
        expectedOperators[i] = operator;
        totalActiveOperators++;
      }
    }

    // trim the array
    assembly {
      mstore(expectedOperators, totalActiveOperators)
    }
    return expectedOperators;
  }

  function _getOperatorDelegatee(
    address delegator
  ) internal view returns (address) {
    SpaceDelegationStorage.Layout storage sd = SpaceDelegationStorage.layout();

    // get the delegatee that the delegator is voting for
    address delegatee = IVotes(SpaceDelegationStorage.layout().riverToken)
      .delegates(delegator);
    // if the delegatee is a space, get the operator that the space is delegating to
    address spaceDelegatee = sd.operatorBySpace[delegatee];
    address actualOperator = spaceDelegatee != address(0)
      ? spaceDelegatee
      : delegatee;
    return actualOperator;
  }

  function _isActiveSinceLastCycle(
    uint256 delegationTime
  ) internal view returns (bool) {
    return delegationTime < (block.timestamp - 7 days);
  }
}
