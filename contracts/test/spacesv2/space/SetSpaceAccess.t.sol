// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "contracts/src/spacesv2/libraries/DataTypes.sol";
import {Errors} from "contracts/src/spacesv2/libraries/Errors.sol";
import {Permissions} from "contracts/src/spacesv2/libraries/Permissions.sol";

import {SpaceBaseSetup} from "contracts/test/spacesv2/SpaceBaseSetup.sol";
import {Space} from "contracts/src/spacesv2/Space.sol";

import {console} from "forge-std/console.sol";

contract SetSpaceAccessTest is SpaceBaseSetup {
  function setUp() public {
    SpaceBaseSetup.init();
  }

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

    Space(_space).transferOwnership(_randomAddress());

    vm.expectRevert(Errors.NotAllowed.selector);
    Space(_space).setEntitlement(_randomAddress(), true);
  }
}
