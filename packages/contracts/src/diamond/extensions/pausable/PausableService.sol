// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries
import {PausableStorage} from "./PausableStorage.sol";

// contracts

error Pausable_NotPaused();
error Pausable_Paused();

library PausableService {
  function pause() internal {
    PausableStorage.layout().paused = true;
  }

  function unpause() internal {
    PausableStorage.layout().paused = false;
  }

  function paused() internal view returns (bool) {
    return PausableStorage.layout().paused;
  }

  function requireNotPaused() internal view {
    if (paused()) {
      revert Pausable_Paused();
    }
  }

  function requirePaused() internal view {
    if (!paused()) {
      revert Pausable_NotPaused();
    }
  }
}
