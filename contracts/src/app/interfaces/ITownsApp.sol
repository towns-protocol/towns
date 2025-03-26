// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

interface ITownsApp {
  struct Metadata {
    string name;
    string symbol;
    string version;
    address treasury;
  }

  function metadata() external view returns (Metadata memory);

  function permissions() external view returns (string[] memory);
}
