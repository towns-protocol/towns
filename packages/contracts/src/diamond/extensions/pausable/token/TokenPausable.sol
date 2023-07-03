// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IPausable} from "contracts/src/diamond/extensions/pausable/IPausable.sol";

// libraries

// contracts
import {PausableController} from "contracts/src/diamond/extensions/pausable/PausableController.sol";
import {TokenOwnableController} from "contracts/src/diamond/extensions/ownable/token/TokenOwnableController.sol";

contract TokenPausable is
  IPausable,
  PausableController,
  TokenOwnableController
{
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
