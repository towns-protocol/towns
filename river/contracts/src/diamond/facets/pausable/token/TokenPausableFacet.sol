// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IPausable} from "contracts/src/diamond/facets/pausable/IPausable.sol";

// libraries

// contracts
import {Facet} from "contracts/src/diamond/facets/Facet.sol";
import {PausableBase} from "contracts/src/diamond/facets/pausable/PausableBase.sol";
import {TokenOwnableBase} from "contracts/src/diamond/facets/ownable/token/TokenOwnableBase.sol";

contract TokenPausableFacet is
  IPausable,
  PausableBase,
  TokenOwnableBase,
  Facet
{
  function __Pausable_init() external onlyInitializing {
    _unpause();
  }

  function paused() external view returns (bool) {
    return _paused();
  }

  function pause() external onlyOwner whenNotPaused {
    _pause();
  }

  function unpause() external onlyOwner whenPaused {
    _unpause();
  }
}
