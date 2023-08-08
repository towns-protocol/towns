// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces

// libraries

// contracts

interface IPausableBase {
  error Pausable__NotPaused();
  error Pausable__Paused();

  event Paused(address account);
  event Unpaused(address account);
}

interface IPausable is IPausableBase {
  function paused() external view returns (bool);

  function pause() external;

  function unpause() external;
}
