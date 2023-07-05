// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces
import {IPausable} from "./IPausable.sol";

// libraries

// contracts
import {PausableBase} from "./PausableBase.sol";
import {OwnableBase} from "contracts/src/diamond/facets/ownable/OwnableBase.sol";

contract Pausable is IPausable, PausableBase, OwnableBase {
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
