// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

interface IMembershipPricing {
  function name() external view returns (string memory);

  function description() external view returns (string memory);

  function setPrice(uint256 price) external;

  function getPrice(
    uint256 freeAllocation,
    uint256 totalMinted
  ) external view returns (uint256);
}
