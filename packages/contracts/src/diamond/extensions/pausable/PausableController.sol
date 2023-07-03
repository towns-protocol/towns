// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IPausableEvents} from "./IPausable.sol";

// libraries
import {PausableService} from "./PausableService.sol";

// contracts

abstract contract PausableController is IPausableEvents {
  function __Pausable_init() internal {
    PausableService.unpause();
  }

  modifier whenNotPaused() {
    PausableService.requireNotPaused();
    _;
  }

  modifier whenPaused() {
    PausableService.requirePaused();
    _;
  }

  function _paused() internal view returns (bool) {
    return PausableService.paused();
  }

  function _pause() internal whenNotPaused {
    PausableService.pause();
    emit Paused(msg.sender);
  }

  function _unpause() internal whenPaused {
    PausableService.unpause();
    emit Unpaused(msg.sender);
  }
}
