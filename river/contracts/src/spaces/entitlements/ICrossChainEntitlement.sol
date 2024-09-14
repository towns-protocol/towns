// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
interface ICrossChainEntitlement {
  struct Parameter {
    string name;
    string primitive;
    string description;
  }

  function isEntitled(
    address[] calldata users,
    bytes calldata parameters
  ) external view returns (bool);

  function parameters() external view returns (Parameter[] memory);
}
