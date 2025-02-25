// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDelegateRegistry} from "contracts/src/factory/facets/wallet-link/interfaces/IDelegateRegistry.sol";

// libraries

// contracts

contract MockDelegationRegistry is IDelegateRegistry {
  function checkDelegateForAll(
    address,
    address,
    bytes32
  ) external pure returns (bool) {
    return true;
  }

  function getIncomingDelegations(
    address
  ) external pure returns (Delegation[] memory delegations) {
    return delegations;
  }
}
