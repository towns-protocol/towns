// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries

// contracts
import {Pausable} from "contracts/src/diamond/extensions/pausable/Pausable.sol";

contract MockPausable is Pausable {
  function init() external {
    __Pausable_init();
  }
}
