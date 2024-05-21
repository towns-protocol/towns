// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

interface IVotesEnumerable {
  function getDelegators() external view returns (address[] memory);

  function getDelegatorsByDelegatee(
    address account
  ) external view returns (address[] memory);

  function getDelegationTimeForDelegator(
    address account
  ) external view returns (uint256);
}
