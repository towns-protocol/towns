// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "contracts/src/spaces/libraries/DataTypes.sol";
import {Errors} from "contracts/src/spaces/libraries/Errors.sol";
import {Permissions} from "contracts/src/spaces/libraries/Permissions.sol";

import {SpaceBaseSetup} from "contracts/test/spaces/SpaceBaseSetup.sol";
import {Space} from "contracts/src/spaces/Space.sol";

import {console} from "forge-std/console.sol";

contract SetSpaceAccessTest is SpaceBaseSetup {
  function setUp() public {}

  function testRevertIfNotAllowed() external {
    address _space = createSimpleSpace();

    vm.prank(_randomAddress());
    vm.expectRevert(Errors.NotAllowed.selector);
    Space(_space).setSpaceAccess(true);
  }

  function testSetAccess() external {
    address _space = createSimpleSpace();

    Space(_space).setSpaceAccess(false);
    assertFalse(Space(_space).disabled());

    Space(_space).setSpaceAccess(true);
    assertTrue(Space(_space).disabled());

    vm.prank(_randomAddress());
    vm.expectRevert(Errors.NotAllowed.selector);
    Space(_space).setEntitlementModule(_randomAddress(), true);
  }
}
