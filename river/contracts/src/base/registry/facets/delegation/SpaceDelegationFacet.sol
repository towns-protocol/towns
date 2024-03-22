// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {ISpaceDelegation} from "contracts/src/base/registry/facets/delegation/ISpaceDelegation.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {IMainnetDelegation} from "contracts/src/tokens/river/base/delegation/IMainnetDelegation.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {BaseRegistryErrors} from "contracts/src/base/registry/libraries/BaseRegistryErrors.sol";

// contracts
import {BaseRegistryModifiers} from "contracts/src/base/registry/libraries/BaseRegistryStorage.sol";
import {OwnableBase} from "contracts/src/diamond/facets/ownable/OwnableBase.sol";

contract SpaceDelegationFacet is
  ISpaceDelegation,
  OwnableBase,
  BaseRegistryModifiers
{
  using EnumerableSet for EnumerableSet.AddressSet;

  function addSpaceDelegation(
    address space,
    address operator
  ) external onlySpaceOwner(space) onlyValidOperator(operator) {
    if (space == address(0))
      revert BaseRegistryErrors.NodeOperator__InvalidAddress();
    if (operator == address(0))
      revert BaseRegistryErrors.NodeOperator__InvalidAddress();

    address currentOperator = ds.operatorBySpace[space];

    if (currentOperator != address(0) && currentOperator == operator)
      revert BaseRegistryErrors.NodeOperator__AlreadyDelegated(currentOperator);

    ds.operatorBySpace[space] = operator;
    ds.spacesByOperator[operator].add(space);

    emit SpaceDelegatedToOperator(space, operator);
  }

  function removeSpaceDelegation(address space) external onlySpaceOwner(space) {
    if (space == address(0))
      revert BaseRegistryErrors.NodeOperator__InvalidAddress();

    address operator = ds.operatorBySpace[space];

    if (operator == address(0)) {
      revert BaseRegistryErrors.NodeOperator__InvalidAddress();
    }

    ds.operatorBySpace[space] = address(0);
    ds.spacesByOperator[operator].remove(space);

    emit SpaceDelegatedToOperator(space, address(0));
  }

  function getSpaceDelegation(address space) external view returns (address) {
    return ds.operatorBySpace[space];
  }

  function getSpaceDelegationsByOperator(
    address operator
  ) external view returns (address[] memory) {
    return ds.spacesByOperator[operator].values();
  }

  // =============================================================
  //                           Token
  // =============================================================
  function setRiverToken(address newToken) external onlyOwner {
    if (newToken == address(0))
      revert BaseRegistryErrors.NodeOperator__InvalidAddress();

    ds.riverToken = newToken;
    emit RiverTokenChanged(newToken);
  }

  function riverToken() external view returns (address) {
    return ds.riverToken;
  }

  // =============================================================
  //                      Mainnet Delegation
  // =============================================================
  function setMainnetDelegation(address newDelegation) external onlyOwner {
    if (newDelegation == address(0))
      revert BaseRegistryErrors.NodeOperator__InvalidAddress();

    ds.mainnetDelegation = newDelegation;
    emit MainnetDelegationChanged(newDelegation);
  }

  function mainnetDelegation() external view returns (address) {
    return ds.mainnetDelegation;
  }

  // =============================================================
  //                           Stake
  // =============================================================
  function calculateStake(address operator) external view returns (uint256) {
    return _calculateStake(operator);
  }

  function setStakeRequirement(uint256 newRequirement) external onlyOwner {
    if (newRequirement == 0)
      revert BaseRegistryErrors.NodeOperator__InvalidStakeRequirement();

    ds.stakeRequirement = newRequirement;
    emit StakeRequirementChanged(newRequirement);
  }

  function stakeRequirement() external view returns (uint256) {
    return ds.stakeRequirement;
  }

  function _calculateStake(address operator) internal view returns (uint256) {
    if (ds.riverToken == address(0)) return 0;
    if (ds.mainnetDelegation == address(0)) return 0;

    uint256 delegatedStake = IMainnetDelegation(ds.mainnetDelegation)
      .getDelegatedStakeByOperator(operator);
    uint256 stake = IVotes(ds.riverToken).getVotes(operator);

    address[] memory spaces = ds.spacesByOperator[operator].values();

    for (uint256 i = 0; i < spaces.length; ) {
      stake += IVotes(ds.riverToken).getVotes(spaces[i]);

      unchecked {
        i++;
      }
    }

    return stake + delegatedStake;
  }
}
