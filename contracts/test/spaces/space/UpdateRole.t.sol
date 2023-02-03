// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "contracts/src/libraries/DataTypes.sol";
import {Errors} from "contracts/src/libraries/Errors.sol";
import {Permissions} from "contracts/src/libraries/Permissions.sol";

import {SpaceBaseSetup} from "contracts/test/spaces/SpaceBaseSetup.sol";
import {Space} from "contracts/src/core/spaces/Space.sol";

contract UpdateRoleTest is SpaceBaseSetup {
  function setUp() external {
    SpaceBaseSetup.init();
  }

  function testUpdateRole() external {
    address _space = createSimpleSpace();
    uint256 _roleId = createSimpleRoleWithPermission(_space);

    Space(_space).updateRole(_roleId, "newRoleName");

    DataTypes.Role memory _role = Space(_space).getRoleById(_roleId);
    assertEq(_role.name, "newRoleName");
  }

  function testRevertIfNotAllowed() external {
    address _space = createSimpleSpace();
    uint256 _roleId = createSimpleRoleWithPermission(_space);

    vm.prank(_randomAddress());
    vm.expectRevert(Errors.NotAllowed.selector);
    Space(_space).updateRole(_roleId, "newRoleName");
  }

  function testRevertIfOwnerRole() external {
    address _space = createSimpleSpace();
    uint256 _ownerRoleId = Space(_space).ownerRoleId();

    vm.expectRevert(Errors.NotAllowed.selector);
    Space(_space).updateRole(_ownerRoleId, "newRoleName");
  }

  function testRevertIfRoleNotExists() external {
    address _space = createSimpleSpace();

    vm.expectRevert(Errors.RoleDoesNotExist.selector);
    Space(_space).updateRole(_randomUint256(), "newRoleName");
  }

  function testRevertIfNameIsEmpty() external {
    address _space = createSimpleSpace();
    uint256 _roleId = createSimpleRoleWithPermission(_space);

    vm.expectRevert(Errors.InvalidParameters.selector);
    Space(_space).updateRole(_roleId, "");
  }
}
