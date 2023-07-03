// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces
import {IPausable} from "./IPausable.sol";

// libraries

// contracts
import {PausableController} from "./PausableController.sol";
import {OwnableController} from "contracts/src/diamond/extensions/ownable/OwnableController.sol";

contract Pausable is IPausable, PausableController, OwnableController {
  function paused() external view returns (bool) {
    return _paused();
  }

  function pause() external onlyOwner {
    _pause();
  }

  function unpause() external onlyOwner {
    _unpause();
  }
}
