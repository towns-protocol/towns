// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "contracts/src/spaces/libraries/DataTypes.sol";
import {Errors} from "contracts/src/spaces/libraries/Errors.sol";
import {Permissions} from "contracts/src/spaces/libraries/Permissions.sol";

import {SpaceBaseSetup} from "contracts/test/spaces/SpaceBaseSetup.sol";
import {Space} from "contracts/src/spaces/Space.sol";

contract UpdateRoleTest is SpaceBaseSetup {
  function setUp() external {}

  function testAllowUpdateRole() external {
    address _space = createSimpleSpace();

    // create a random user
    address[] memory _randomUsers = new address[](1);
    _randomUsers[0] = _randomAddress();

    // create a role variable with a permission of ModifySpaceSettings
    string memory _roleName = "ModifySettingRole";
    string[] memory _permissions = new string[](1);
    _permissions[0] = Permissions.ModifySpaceSettings;

    // get the user entitlement module from the space
    address userEntitlement = getSpaceUserEntitlement(_space);

    // add the random user to the user entitlement module
    DataTypes.Entitlement[] memory _entitlements = new DataTypes.Entitlement[](
      1
    );
    _entitlements[0] = DataTypes.Entitlement({
      module: userEntitlement,
      data: abi.encode(_randomUsers)
    });

    // create the role
    uint256 _roleId = Space(_space).createRole(
      _roleName,
      _permissions,
      _entitlements
    );

    // check if the random user is entitled to the permission
    assertTrue(
      Space(_space).isEntitledToSpace(
        _randomUsers[0],
        Permissions.ModifySpaceSettings
      )
    );

    assertFalse(
      Space(_space).isEntitledToSpace(_randomUsers[0], Permissions.PinMessage)
    );

    // act as the random user
    vm.prank(_randomUsers[0]);

    // update the role
    Space(_space).updateRole(_roleId, "new-role-name");

    // check if rolename is updated
    DataTypes.Role memory _role = Space(_space).getRoleById(_roleId);
    assertEq(_role.name, "new-role-name");
  }

  function testUpdateRole() external {
    address _space = createSimpleSpace();
    uint256 _roleId = createSimpleRoleWithPermission(_space);

    Space(_space).updateRole(_roleId, "new-role-name");

    DataTypes.Role memory _role = Space(_space).getRoleById(_roleId);
    assertEq(_role.name, "new-role-name");
  }

  function testRevertIfNotAllowed() external {
    address _space = createSimpleSpace();
    uint256 _roleId = createSimpleRoleWithPermission(_space);

    vm.prank(_randomAddress());
    vm.expectRevert(Errors.NotAllowed.selector);
    Space(_space).updateRole(_roleId, "new-role-name");
  }

  function testRevertIfOwnerRole() external {
    address _space = createSimpleSpace();
    uint256 _ownerRoleId = Space(_space).ownerRoleId();

    vm.expectRevert(Errors.NotAllowed.selector);
    Space(_space).updateRole(_ownerRoleId, "new-role-name");
  }

  function testRevertIfRoleNotExists() external {
    address _space = createSimpleSpace();

    vm.expectRevert(Errors.RoleDoesNotExist.selector);
    Space(_space).updateRole(_randomUint256(), "new-role-name");
  }

  function testRevertIfNameIsEmpty() external {
    address _space = createSimpleSpace();
    uint256 _roleId = createSimpleRoleWithPermission(_space);

    vm.expectRevert(Errors.NameLengthInvalid.selector);
    Space(_space).updateRole(_roleId, "");
  }
}
