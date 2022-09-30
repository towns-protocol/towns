// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;
import "forge-std/Test.sol";

import {ZionPermissionsRegistry} from "../contracts/spaces/ZionPermissionsRegistry.sol";
import {DataTypes} from "../contracts/spaces/libraries/DataTypes.sol";
import {PermissionTypes} from "../contracts/spaces/libraries/PermissionTypes.sol";
import {Errors} from "../contracts/spaces/libraries/Errors.sol";

contract ZionPermissionRegistryTest is Test {
  ZionPermissionsRegistry internal registry;

  function setUp() public {
    registry = new ZionPermissionsRegistry();
  }

  function testGetAllPermission() public {
    DataTypes.Permission[] memory permissions = registry.getAllPermissions();
    assertEq(permissions[0].name, "Read");
  }

  function testGetPermission() public {
    DataTypes.Permission memory permission = registry
      .getPermissionByPermissionType(PermissionTypes.Read);

    assertEq(permission.name, "Read");
  }

  function testAddPermission() public {
    registry.addPermission(keccak256("Test"), DataTypes.Permission("Test"));

    DataTypes.Permission memory permissionFromRegistry = registry
      .getPermissionByPermissionType(keccak256("Test"));

    assertEq(permissionFromRegistry.name, "Test");
  }

  function testAddExistingPermission() public {
    vm.expectRevert(Errors.PermissionAlreadyExists.selector);
    registry.addPermission(
      keccak256("Read"),
      DataTypes.Permission({name: "Read"})
    );
  }
}
