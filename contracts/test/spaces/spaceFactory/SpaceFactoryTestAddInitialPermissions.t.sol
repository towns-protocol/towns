// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {Errors} from "contracts/src/spaces/libraries/Errors.sol";
import {SpaceBaseSetup} from "contracts/test/spaces/SpaceBaseSetup.sol";

contract SpaceFactoryTestAddPermissions is SpaceBaseSetup {
  function setUp() external {
    spaceFactory.setPaused(true);
  }

  function testRevertPermissionAlreadyExists() external {
    string[] memory _permissions = new string[](1);
    _permissions[0] = "Vote";

    spaceFactory.addOwnerPermissions(_permissions);

    vm.expectRevert(Errors.PermissionAlreadyExists.selector);
    spaceFactory.addOwnerPermissions(_permissions);
  }

  function testAddInitialPermissions() external {
    string[] memory _permissions = new string[](1);
    _permissions[0] = "Vote";

    spaceFactory.addOwnerPermissions(_permissions);

    string[] memory initialPermissions = spaceFactory.getOwnerPermissions();
    string memory exists;

    for (uint256 i = 0; i < initialPermissions.length; i++) {
      if (
        keccak256(bytes(initialPermissions[i])) ==
        keccak256(bytes(_permissions[0]))
      ) {
        exists = initialPermissions[i];
      }
    }

    assertEq(exists, _permissions[0]);
  }
}
