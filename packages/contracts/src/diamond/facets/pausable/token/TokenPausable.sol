// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces
import {IPausable} from "contracts/src/diamond/facets/pausable/IPausable.sol";

// libraries

// contracts
import {PausableBase} from "contracts/src/diamond/facets/pausable/PausableBase.sol";
import {TokenOwnableBase} from "contracts/src/diamond/facets/ownable/token/TokenOwnableBase.sol";

contract TokenPausable is IPausable, PausableBase, TokenOwnableBase {
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
