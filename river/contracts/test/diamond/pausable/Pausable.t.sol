// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {PausableSetup} from "./PausableSetup.sol";

contract PausableTest is PausableSetup {
  function test_pause() public {
    assertFalse(pausable.paused());

    pausable.pause();

    assertTrue(pausable.paused());
  }

  function test_unpause() public {
    pausable.pause();

    assertTrue(pausable.paused());

    pausable.unpause();

    assertFalse(pausable.paused());
  }

  function test_paused() public {
    assertFalse(pausable.paused());

    pausable.pause();

    assertTrue(pausable.paused());

    pausable.unpause();

    assertFalse(pausable.paused());
  }
}
