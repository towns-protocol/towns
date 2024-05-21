// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IVotesEnumerable} from "contracts/src/diamond/facets/governance/votes/enumerable/IVotesEnumerable.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {VotesEnumerableStorage} from "./VotesEnumerableStorage.sol";

// contracts
abstract contract VotesEnumerable is IVotesEnumerable {
  using EnumerableSet for EnumerableSet.AddressSet;

  function getDelegators() external view returns (address[] memory) {
    return VotesEnumerableStorage.layout().delegators.values();
  }

  function getDelegatorsByDelegatee(
    address account
  ) external view returns (address[] memory) {
    return
      VotesEnumerableStorage.layout().delegatorsByDelegatee[account].values();
  }

  function getDelegationTimeForDelegator(
    address account
  ) external view returns (uint256) {
    return VotesEnumerableStorage.layout().delegationTimeForDelegator[account];
  }

  function _setDelegators(
    address account,
    address newDelegatee,
    address currentDelegatee
  ) internal virtual {
    VotesEnumerableStorage.Layout storage ds = VotesEnumerableStorage.layout();

    ds.delegators.remove(account);
    ds.delegatorsByDelegatee[currentDelegatee].remove(account);

    // if the delegatee is not address(0) then add the account and is not already a delegator then add it
    if (newDelegatee != address(0)) {
      ds.delegators.add(account);
      ds.delegatorsByDelegatee[newDelegatee].add(account);
      ds.delegationTimeForDelegator[account] = block.timestamp;
    }
  }
}
