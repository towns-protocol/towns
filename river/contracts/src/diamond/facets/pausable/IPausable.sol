// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

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
