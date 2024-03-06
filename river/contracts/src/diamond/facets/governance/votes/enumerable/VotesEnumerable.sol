// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {VotesEnumerableStorage} from "./VotesEnumerableStorage.sol";

// contracts
abstract contract VotesEnumerable {
  using EnumerableSet for EnumerableSet.AddressSet;

  function getDelegators() external view returns (address[] memory) {
    return VotesEnumerableStorage.layout().delegators.values();
  }

  function _setDelegators(address account, address delegatee) internal virtual {
    VotesEnumerableStorage.Layout storage ds = VotesEnumerableStorage.layout();

    ds.delegators.remove(account);

    // if the delegatee is not address(0) then add the account and is not already a delegator then add it
    if (delegatee != address(0)) {
      ds.delegators.add(account);
    }
  }
}
