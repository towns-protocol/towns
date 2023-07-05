// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces

// libraries

// contracts
import {Pausable} from "contracts/src/diamond/facets/pausable/Pausable.sol";

contract MockPausable is Pausable {
  function init() external {
    __Pausable_init();
  }
}
