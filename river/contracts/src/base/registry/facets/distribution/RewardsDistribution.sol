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

  function getClaimableAmountForOperator(
    address operator
  ) public view returns (uint256) {
    RewardsDistributionStorage.Layout storage ds = RewardsDistributionStorage
      .layout();
    return ds.distributionByOperator[operator];
  }

  function getClaimableAmountForDelegator(
    address delegator
  ) public view returns (uint256) {
    RewardsDistributionStorage.Layout storage ds = RewardsDistributionStorage
      .layout();
    return ds.distributionByDelegator[delegator];
  }

  function getClaimableAmountForAuthorizedClaimer(
    address claimer
  ) public view returns (uint256) {
    RewardsDistributionStorage.Layout storage ds = RewardsDistributionStorage
      .layout();
    address[] memory delegatorsForClaimer = _getDelegatorsByAuthorizedClaimer(
      claimer
    );
    uint256 totalClaimableAmount = 0;
    for (uint256 i = 0; i < delegatorsForClaimer.length; i++) {
      totalClaimableAmount += ds.distributionByDelegator[
        delegatorsForClaimer[i]
      ];
    }
    return totalClaimableAmount;
  }

  function operatorClaim() external {
    RewardsDistributionStorage.Layout storage ds = RewardsDistributionStorage
      .layout();

    NodeOperatorStorage.Layout storage nos = NodeOperatorStorage.layout();
    address[] memory operatorsForClaimer = nos
      .operatorsByClaimer[msg.sender]
      .values();

    uint256 amount = 0;
    for (uint256 i = 0; i < operatorsForClaimer.length; i++) {
      amount += getClaimableAmountForOperator(operatorsForClaimer[i]);

      ds.distributionByOperator[operatorsForClaimer[i]] = 0;
    }

    if (amount == 0) revert RewardsDistribution_NoRewardsToClaim();

    SpaceDelegationStorage.Layout storage sd = SpaceDelegationStorage.layout();
    if (IERC20(sd.riverToken).balanceOf(address(this)) < amount)
      revert RewardsDistribution_InsufficientRewardBalance();

    CurrencyTransfer.transferCurrency(
      sd.riverToken,
      address(this),
      msg.sender,
      amount
    );
  }

  function mainnetClaim() external {
    RewardsDistributionStorage.Layout storage ds = RewardsDistributionStorage
      .layout();
    address[] memory delegatorsForClaimer = _getDelegatorsByAuthorizedClaimer(
      msg.sender
    );
    uint256 totalClaimableAmount = 0;
    for (uint256 i = 0; i < delegatorsForClaimer.length; i++) {
      totalClaimableAmount += ds.distributionByDelegator[
        delegatorsForClaimer[i]
      ];
      ds.distributionByDelegator[delegatorsForClaimer[i]] = 0;
    }

    if (totalClaimableAmount == 0)
      revert RewardsDistribution_NoRewardsToClaim();

    SpaceDelegationStorage.Layout storage sd = SpaceDelegationStorage.layout();
    if (IERC20(sd.riverToken).balanceOf(address(this)) < totalClaimableAmount)
      revert RewardsDistribution_InsufficientRewardBalance();

    CurrencyTransfer.transferCurrency(
      sd.riverToken,
      address(this),
      msg.sender,
      totalClaimableAmount
    );
  }

  function delegatorClaim() external {
    uint256 amount = getClaimableAmountForDelegator(msg.sender);
    if (amount == 0) revert RewardsDistribution_NoRewardsToClaim();

    SpaceDelegationStorage.Layout storage sd = SpaceDelegationStorage.layout();
    if (IERC20(sd.riverToken).balanceOf(address(this)) < amount)
      revert RewardsDistribution_InsufficientRewardBalance();

    RewardsDistributionStorage.Layout storage ds = RewardsDistributionStorage
      .layout();

    ds.distributionByDelegator[msg.sender] = 0;

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
    uint256 amountPerOperator = ds.periodDistributionAmount /
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

  function setPeriodDistributionAmount(uint256 amount) external onlyOwner {
    RewardsDistributionStorage.layout().periodDistributionAmount = amount;
  }

  function getPeriodDistributionAmount() public view returns (uint256) {
    return RewardsDistributionStorage.layout().periodDistributionAmount;
  }

  function setActivePeriodLength(uint256 length) external onlyOwner {
    RewardsDistributionStorage.layout().activePeriodLength = length;
  }

  function getActivePeriodLength() public view returns (uint256) {
    return RewardsDistributionStorage.layout().activePeriodLength;
  }

  function getActiveOperators() public view returns (address[] memory) {
    return _getActiveOperators();
  }

  function setWithdrawalRecipient(address recipient) external onlyOwner {
    RewardsDistributionStorage.layout().withdrawalRecipient = recipient;
  }

  function getWithdrawalRecipient() public view returns (address) {
    return RewardsDistributionStorage.layout().withdrawalRecipient;
  }

  function withdraw() external onlyOwner {
    CurrencyTransfer.transferCurrency(
      SpaceDelegationStorage.layout().riverToken,
      address(this),
      RewardsDistributionStorage.layout().withdrawalRecipient,
      IERC20(SpaceDelegationStorage.layout().riverToken).balanceOf(
        address(this)
      )
    );
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
    uint256 operatorClaimAmount = (commission * amountPerOperator) / 10000;
    return operatorClaimAmount;
  }

  function _distributeDelegatorsRewards(
    SpaceDelegationStorage.Layout storage sd,
    address operator,
    uint256 delegatorsClaimAmount
  ) internal {
    //Get all the RVR delegators from the Base token
    address[] memory delegators = _getValidDelegators(sd, operator);

    //Get all the spaces delegating to this operator
    address[] memory delegatingSpaces = _getValidDelegatingSpaces(sd, operator);
    uint256 spaceDelegatorsLen = delegatingSpaces.length;

    uint256 totalLength = delegators.length;

    //get all the delegators delegating to those spaces
    for (uint256 i = 0; i < spaceDelegatorsLen; i++) {
      totalLength += _getValidDelegators(sd, delegatingSpaces[i]).length;
    }

    //get all the delegators delegating to the operator on the mainnet
    Delegation[]
      memory mainnetDelegations = _getValidMainnetDelegationsByOperator(
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
      address[] memory spaceDelegatorDelegators = _getValidDelegators(
        sd,
        delegatingSpaces[i]
      );

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

    //allocate the rewards to the delegators
    _allocateDelegatorRewards(
      sd,
      combinedDelegators,
      operator,
      totalDelegation,
      delegatorsClaimAmount
    );
  }

  function _allocateDelegatorRewards(
    SpaceDelegationStorage.Layout storage sd,
    address[] memory combinedDelegators,
    address operator,
    uint256 totalDelegation,
    uint256 delegatorsClaimAmount
  ) internal {
    uint256 delegatorsLen = combinedDelegators.length;

    RewardsDistributionStorage.Layout storage ds = RewardsDistributionStorage
      .layout();

    address[] memory seenAddresses = new address[](delegatorsLen);
    for (uint256 i = 0; i < delegatorsLen; i++) {
      //check if this address has already been distributed since it could be in here twice
      //from a Base and Mainnet delegation and the calculation already takes both into account
      bool seen;
      for (uint256 j = 0; j < seenAddresses.length; j++) {
        if (seenAddresses[j] == combinedDelegators[i]) {
          seen = true;
          break;
        }
      }
      if (seen == true) {
        continue;
      }

      uint256 amount = 0;
      //check if this user is delegating to the operator on Base
      if (IVotes(sd.riverToken).delegates(combinedDelegators[i]) == operator) {
        amount = IERC20(sd.riverToken).balanceOf(combinedDelegators[i]);
      }
      //check if this user is delegating to the operator on the Spaces
      address spaceDelegatee = sd.operatorBySpace[
        IVotes(sd.riverToken).delegates(combinedDelegators[i])
      ];
      if (spaceDelegatee == operator) {
        amount += IERC20(sd.riverToken).balanceOf(combinedDelegators[i]);
      }
      //check if this user is delegating to the operator on the mainnet
      if (
        _getDelegationByDelegator(combinedDelegators[i]).operator == operator
      ) {
        amount += _getDelegationByDelegator(combinedDelegators[i]).quantity;
      }

      seenAddresses[i] = combinedDelegators[i];

      uint256 delegatorProRata = (amount * delegatorsClaimAmount) /
        totalDelegation;
      ds.distributionByDelegator[combinedDelegators[i]] += delegatorProRata;
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

      if (
        currentStatus == NodeOperatorStatus.Active &&
        _isActiveSinceLastCycle(nos.approvalTimeByOperator[operator])
      ) {
        expectedOperators[totalActiveOperators] = operator;
        totalActiveOperators++;
      }
    }

    // trim the array
    assembly {
      mstore(expectedOperators, totalActiveOperators)
    }
    return expectedOperators;
  }

  function _getValidDelegators(
    SpaceDelegationStorage.Layout storage sd,
    address operator
  ) internal view returns (address[] memory) {
    address[] memory delegators = IVotesEnumerable(sd.riverToken)
      .getDelegatorsByDelegatee(operator);
    address[] memory validDelegators = new address[](delegators.length);
    uint256 activeDelegators = 0;
    for (uint256 i = 0; i < delegators.length; i++) {
      if (
        _isActiveSinceLastCycle(
          IVotesEnumerable(sd.riverToken).getDelegationTimeForDelegator(
            delegators[i]
          )
        )
      ) {
        validDelegators[activeDelegators] = delegators[i];
        activeDelegators++;
      }
    }
    return validDelegators;
  }

  function _getValidDelegatingSpaces(
    SpaceDelegationStorage.Layout storage sd,
    address operator
  ) internal view returns (address[] memory) {
    address[] memory delegatingSpaces = sd.spacesByOperator[operator].values();
    address[] memory validDelegatingSpaces = new address[](
      delegatingSpaces.length
    );
    for (uint256 i = 0; i < delegatingSpaces.length; i++) {
      if (
        _isActiveSinceLastCycle(sd.spaceDelegationTime[delegatingSpaces[i]])
      ) {
        validDelegatingSpaces[i] = delegatingSpaces[i];
      }
    }
    return validDelegatingSpaces;
  }

  function _getValidMainnetDelegationsByOperator(
    address operator
  ) internal view returns (Delegation[] memory) {
    //get all the delegators delegating to the operator on the mainnet
    Delegation[] memory mainnetDelegations = _getMainnetDelegationsByOperator(
      operator
    );
    Delegation[] memory validMainnetDelegations = new Delegation[](
      mainnetDelegations.length
    );
    for (uint256 i = 0; i < mainnetDelegations.length; i++) {
      if (_isActiveSinceLastCycle(mainnetDelegations[i].delegationTime)) {
        validMainnetDelegations[i] = mainnetDelegations[i];
      }
    }

    return validMainnetDelegations;
  }

  function _getOperatorDelegatee(
    address delegator
  ) internal view returns (address) {
    SpaceDelegationStorage.Layout storage sd = SpaceDelegationStorage.layout();

    // get the delegatee that the delegator is voting for
    address delegatee = IVotes(sd.riverToken).delegates(delegator);
    // if the delegatee is a space, get the operator that the space is delegating to
    address spaceDelegatee = sd.operatorBySpace[delegatee];
    address actualOperator = spaceDelegatee != address(0)
      ? spaceDelegatee
      : delegatee;
    return actualOperator;
  }

  function _isActiveSinceLastCycle(
    uint256 startTime
  ) internal view returns (bool) {
    return startTime < (block.timestamp - getActivePeriodLength());
  }
}
