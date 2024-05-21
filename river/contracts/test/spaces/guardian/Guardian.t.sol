// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IGuardianBase} from "contracts/src/spaces/facets/guardian/IGuardian.sol";

// libraries

// contracts
import {GuardianSetup} from "./GuardianSetup.sol";

contract GuardianTest is GuardianSetup, IGuardianBase {
  // guardian is enabled by default
  function test_isGuardianEnabled() external {
    address wallet = _randomAddress();
    assertTrue(guardian.isGuardianEnabled(wallet));
  }

  function test_disableGuardian() external {
    address wallet = _randomAddress();

    vm.prank(wallet);
    guardian.disableGuardian();

    assertTrue(guardian.isGuardianEnabled(wallet));

    // wait for the cooldown to pass
    vm.warp(guardian.guardianCooldown(wallet));

    assertFalse(guardian.isGuardianEnabled(wallet));
  }

  function test_enableGuardian() external {
    address wallet = _randomAddress();

    vm.prank(wallet);
    guardian.disableGuardian();

    // wait for the cooldown to pass
    vm.warp(guardian.guardianCooldown(wallet));

    assertFalse(guardian.isGuardianEnabled(wallet));

    vm.prank(wallet);
    guardian.enableGuardian();

    assertTrue(guardian.isGuardianEnabled(wallet));
  }

  function test_revert_disableGuardian_notEOA() external {
    vm.prank(address(this));
    vm.expectRevert(NotExternalAccount.selector);
    guardian.disableGuardian();
  }

  function test_revert_enableGuardian_notEOA() external {
    address wallet = _randomAddress();

    vm.prank(wallet);
    guardian.disableGuardian();

    vm.prank(address(this));
    vm.expectRevert(NotExternalAccount.selector);
    guardian.enableGuardian();
  }

  function test_revert_disableGuardian_alreadyDisabled() external {
    address wallet = _randomAddress();

    vm.prank(wallet);
    guardian.disableGuardian();

    vm.prank(wallet);
    vm.expectRevert(AlreadyDisabled.selector);
    guardian.disableGuardian();
  }

  function test_revert_enableGuardian_alreadyEnabled() external {
    address wallet = _randomAddress();

    vm.prank(wallet);
    vm.expectRevert(AlreadyEnabled.selector);
    guardian.enableGuardian();
  }
}
