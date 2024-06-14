// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

import {ISpaceDelegation} from "contracts/src/base/registry/facets/delegation/ISpaceDelegation.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {IMainnetDelegation} from "contracts/src/tokens/river/base/delegation/IMainnetDelegation.sol";
import {IERC173} from "contracts/src/diamond/facets/ownable/IERC173.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IVotesEnumerable} from "contracts/src/diamond/facets/governance/votes/enumerable/IVotesEnumerable.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {SpaceDelegationStorage} from "contracts/src/base/registry/facets/delegation/SpaceDelegationStorage.sol";

// contracts
import {OwnableBase} from "contracts/src/diamond/facets/ownable/OwnableBase.sol";
import {Facet} from "contracts/src/diamond/facets/Facet.sol";

contract SpaceDelegationFacet is ISpaceDelegation, OwnableBase, Facet {
  using EnumerableSet for EnumerableSet.AddressSet;

  function __SpaceDelegation_init(
    address riverToken_
  ) external onlyInitializing {
    SpaceDelegationStorage.Layout storage ds = SpaceDelegationStorage.layout();
    ds.riverToken = riverToken_;
  }

  modifier onlySpaceOwner(address space) {
    if (!_isValidSpaceOwner(space)) {
      revert SpaceDelegation__InvalidSpace();
    }
    _;
  }

  function addSpaceDelegation(
    address space,
    address operator
  ) external onlySpaceOwner(space) {
    if (space == address(0)) revert SpaceDelegation__InvalidAddress();
    if (operator == address(0)) revert SpaceDelegation__InvalidAddress();

    SpaceDelegationStorage.Layout storage ds = SpaceDelegationStorage.layout();

    address currentOperator = ds.operatorBySpace[space];

    if (currentOperator != address(0) && currentOperator == operator)
      revert SpaceDelegation__AlreadyDelegated(currentOperator);

    //remove the space from the current operator
    ds.spacesByOperator[currentOperator].remove(space);

    //overwrite the operator for this space
    ds.operatorBySpace[space] = operator;
    //add the space to this new operator array
    ds.spacesByOperator[operator].add(space);
    ds.spaceDelegationTime[space] = block.timestamp;

    emit SpaceDelegatedToOperator(space, operator);
  }

  function removeSpaceDelegation(address space) external onlySpaceOwner(space) {
    if (space == address(0)) revert SpaceDelegation__InvalidAddress();

    SpaceDelegationStorage.Layout storage ds = SpaceDelegationStorage.layout();

    address operator = ds.operatorBySpace[space];

    if (operator == address(0)) {
      revert SpaceDelegation__InvalidAddress();
    }

    ds.operatorBySpace[space] = address(0);
    ds.spacesByOperator[operator].remove(space);
    ds.spaceDelegationTime[space] = 0;

    emit SpaceDelegatedToOperator(space, address(0));
  }

  function getSpaceDelegation(address space) external view returns (address) {
    SpaceDelegationStorage.Layout storage ds = SpaceDelegationStorage.layout();
    return ds.operatorBySpace[space];
  }

  function getSpaceDelegationsByOperator(
    address operator
  ) external view returns (address[] memory) {
    SpaceDelegationStorage.Layout storage ds = SpaceDelegationStorage.layout();
    return ds.spacesByOperator[operator].values();
  }

  // =============================================================
  //                           Token
  // =============================================================
  function setRiverToken(address newToken) external onlyOwner {
    if (newToken == address(0)) revert SpaceDelegation__InvalidAddress();

    SpaceDelegationStorage.Layout storage ds = SpaceDelegationStorage.layout();

    ds.riverToken = newToken;
    emit RiverTokenChanged(newToken);
  }

  function riverToken() external view returns (address) {
    SpaceDelegationStorage.Layout storage ds = SpaceDelegationStorage.layout();
    return ds.riverToken;
  }

  // =============================================================
  //                      Mainnet Delegation
  // =============================================================
  function setMainnetDelegation(address newDelegation) external onlyOwner {
    if (newDelegation == address(0)) revert SpaceDelegation__InvalidAddress();

    SpaceDelegationStorage.layout().mainnetDelegation = newDelegation;
    emit MainnetDelegationChanged(newDelegation);
  }

  function mainnetDelegation() external view returns (address) {
    return SpaceDelegationStorage.layout().mainnetDelegation;
  }

  // =============================================================
  //                           Stake
  // =============================================================
  function getTotalDelegation(
    address operator
  ) external view returns (uint256) {
    return _getTotalDelegation(operator);
  }

  function setStakeRequirement(uint256 newRequirement) external onlyOwner {
    if (newRequirement == 0) revert SpaceDelegation__InvalidStakeRequirement();

    SpaceDelegationStorage.layout().stakeRequirement = newRequirement;
    emit StakeRequirementChanged(newRequirement);
  }

  function stakeRequirement() external view returns (uint256) {
    return SpaceDelegationStorage.layout().stakeRequirement;
  }

  function _getTotalDelegation(
    address operator
  ) internal view returns (uint256) {
    SpaceDelegationStorage.Layout storage ds = SpaceDelegationStorage.layout();
    if (ds.riverToken == address(0)) return 0;

    if (ds.mainnetDelegation == address(0)) return 0;
    uint256 delegation = 0;
    //get the delegation from the base delegation
    address[] memory baseDelegators = IVotesEnumerable(ds.riverToken)
      .getDelegatorsByDelegatee(operator);
    for (uint256 i = 0; i < baseDelegators.length; i++) {
      delegation += IERC20(ds.riverToken).balanceOf(baseDelegators[i]);
    }

    // get the delegation from the mainnet delegation
    delegation += IMainnetDelegation(ds.mainnetDelegation)
      .getDelegatedStakeByOperator(operator);

    address[] memory spaces = ds.spacesByOperator[operator].values();

    for (uint256 i = 0; i < spaces.length; ) {
      address[] memory usersDelegatingToSpace = IVotesEnumerable(ds.riverToken)
        .getDelegatorsByDelegatee(spaces[i]);

      for (uint256 j = 0; j < usersDelegatingToSpace.length; j++) {
        delegation += IERC20(ds.riverToken).balanceOf(
          usersDelegatingToSpace[j]
        );
      }

      unchecked {
        i++;
      }
    }

    return delegation;
  }

  function _isValidSpaceOwner(address space) internal view returns (bool) {
    return IERC173(space).owner() == msg.sender;
  }
}
