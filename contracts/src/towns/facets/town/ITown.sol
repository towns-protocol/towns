// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries

// contracts

interface ITownBase {
  struct Info {
    string networkId;
    uint256 createdAt;
  }
}

interface ITown is ITownBase {
  function info() external view returns (Info memory);
}
