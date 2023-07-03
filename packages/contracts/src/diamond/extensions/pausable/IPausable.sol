// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces

// libraries

// contracts

interface IPausableEvents {
  event Paused(address account);
  event Unpaused(address account);
}

interface IPausable {
  function paused() external view returns (bool);

  function pause() external;

  function unpause() external;
}
