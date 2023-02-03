// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "contracts/src/libraries/DataTypes.sol";
import {Errors} from "contracts/src/libraries/Errors.sol";
import {Permissions} from "contracts/src/libraries/Permissions.sol";

import {SpaceBaseSetup} from "contracts/test/spaces/SpaceBaseSetup.sol";
import {Space} from "contracts/src/core/spaces/Space.sol";

contract SetOwnerRoleIdTest is SpaceBaseSetup {
  function setUp() public {
    SpaceBaseSetup.init();
  }

  function testRevertIfNotOwner() external {
    address _space = createSimpleSpace();

    uint256 _newRoleId = _randomUint256();

    vm.prank(_randomAddress());
    vm.expectRevert(Errors.NotAllowed.selector);
    Space(_space).setOwnerRoleId(_newRoleId);
  }

  function testRevertIfNotValidRoleId() external {
    address _space = createSimpleSpace();

    uint256 _invalidRoleId = _randomUint256();

    vm.expectRevert(Errors.RoleDoesNotExist.selector);
    Space(_space).setOwnerRoleId(_invalidRoleId);
  }

  function testRevertIfMissingOwnerPermission() external {
    address _space = createSimpleSpace();

    string memory _roleName = "NewOwner";
    string[] memory _permissions = new string[](1);
    _permissions[0] = "Vote";

    DataTypes.Entitlement[]
      memory _roleEntitlements = new DataTypes.Entitlement[](1);
    _roleEntitlements[0] = DataTypes.Entitlement({
      module: address(0),
      data: ""
    });

    uint256 _newRoleId = Space(_space).createRole(
      _roleName,
      _permissions,
      _roleEntitlements
    );

    vm.expectRevert(Errors.MissingOwnerPermission.selector);
    Space(_space).setOwnerRoleId(_newRoleId);
  }

  function testSetOwnerRoleId() external {
    address _space = createSimpleSpace();

    string memory _roleName = "NewOwner";
    string[] memory _permissions = spaceFactory.getOwnerPermissions();

    DataTypes.Entitlement[]
      memory _roleEntitlements = new DataTypes.Entitlement[](1);
    _roleEntitlements[0] = DataTypes.Entitlement({
      module: address(0),
      data: ""
    });

    vm.expectRevert(Errors.OwnerPermissionNotAllowed.selector);
    Space(_space).createRole(_roleName, _permissions, _roleEntitlements);
  }
}
