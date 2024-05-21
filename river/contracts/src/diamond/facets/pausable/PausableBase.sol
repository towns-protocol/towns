// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IPausableBase} from "./IPausable.sol";

// libraries
import {PausableStorage} from "./PausableStorage.sol";

// contracts

abstract contract PausableBase is IPausableBase {
  modifier whenNotPaused() {
    if (_paused()) {
      revert Pausable__Paused();
    }
    _;
  }

  modifier whenPaused() {
    if (!_paused()) {
      revert Pausable__NotPaused();
    }
    _;
  }

  function _paused() internal view returns (bool) {
    return PausableStorage.layout().paused;
  }

  function _pause() internal {
    PausableStorage.layout().paused = true;
    emit Paused(msg.sender);
  }

  function _unpause() internal {
    PausableStorage.layout().paused = false;
    emit Unpaused(msg.sender);
  }
}
