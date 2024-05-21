// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ICustomEntitlement} from "contracts/src/spaces/entitlements/ICustomEntitlement.sol";

contract MockCustomEntitlement is ICustomEntitlement {
  mapping(bytes32 => bool) entitled;

  constructor() {}

  function setEntitled(address[] memory user, bool userIsEntitled) external {
    entitled[keccak256(abi.encode(user))] = userIsEntitled;
  }

  function isEntitled(
    address[] memory user
  ) external view override returns (bool) {
    return entitled[keccak256(abi.encode(user))];
  }
}
