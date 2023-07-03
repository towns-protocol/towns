// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces

// libraries

// contracts
import {PausableSetup} from "./PausableSetup.sol";
import {MockPausable} from "contracts/test/mocks/MockPausable.sol";

contract PausableTest is PausableSetup {
  function test_init() public {
    MockPausable mock = new MockPausable();
    mock.init();
    assertFalse(mock.paused());
  }

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
