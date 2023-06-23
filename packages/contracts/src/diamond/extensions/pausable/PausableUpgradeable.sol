// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IPausableEvents} from "./IPausable.sol";

// libraries
import {PausableService} from "./PausableService.sol";

// contracts

abstract contract PausableUpgradeable is IPausableEvents {
  modifier whenNotPaused() {
    PausableService.requireNotPaused();
    _;
  }

  modifier whenPaused() {
    PausableService.requirePaused();
    _;
  }

  function __Pausable_init() internal {
    PausableService.unpause();
  }

  function _paused() external view returns (bool) {
    return PausableService.paused();
  }

  function _pause() external whenNotPaused {
    PausableService.pause();
    emit Paused(msg.sender);
  }

  function _unpause() external whenPaused {
    PausableService.unpause();
    emit Unpaused(msg.sender);
  }
}
