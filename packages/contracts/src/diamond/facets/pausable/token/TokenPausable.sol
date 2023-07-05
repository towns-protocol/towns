// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces
import {IPausable} from "contracts/src/diamond/facets/pausable/IPausable.sol";

// libraries

// contracts
import {PausableController} from "contracts/src/diamond/facets/pausable/PausableController.sol";
import {TokenOwnableController} from "contracts/src/diamond/facets/ownable/token/TokenOwnableController.sol";

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
