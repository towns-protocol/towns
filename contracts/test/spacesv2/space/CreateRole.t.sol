// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "contracts/src/spacesv2/libraries/DataTypes.sol";
import {Errors} from "contracts/src/spacesv2/libraries/Errors.sol";
import {Permissions} from "contracts/src/spacesv2/libraries/Permissions.sol";

import {SpaceBaseSetup} from "contracts/test/spacesv2/SpaceBaseSetup.sol";
import {Space} from "contracts/src/spacesv2/Space.sol";
import {MockEntitlement} from "contracts/test/spacesv2/mocks/MockEntitlement.sol";

contract CreateRoleTest is SpaceBaseSetup {
  MockEntitlement public mockEntitlement;

  function setUp() external {
    SpaceBaseSetup.init();
    mockEntitlement = new MockEntitlement();
  }

  function testCreateRoleOwnerPermissionNotAllowed() external {
    address _moderator = _randomAddress();

    address[] memory _users = new address[](1);
    _users[0] = _moderator;

    string[] memory _spacePermissions = new string[](1);
    _spacePermissions[0] = Permissions.ModifySpacePermissions;

    DataTypes.CreateSpaceExtraEntitlements memory _entitlementData = DataTypes
      .CreateSpaceExtraEntitlements({
        roleName: "Moderator",
        permissions: _spacePermissions,
        users: _users,
        tokens: new DataTypes.ExternalToken[](0)
      });

    address _space = createSpaceWithEntitlements(_entitlementData);

    assertTrue(
      Space(_space).isEntitledToSpace(
        _moderator,
        Permissions.ModifySpacePermissions
      )
    );

    string memory _roleName = "Hacker";
    string[] memory _permissions = new string[](1);
    _permissions[0] = "Owner";

    DataTypes.Entitlement[] memory _entitlements = new DataTypes.Entitlement[](
      1
    );
    _entitlements[0] = DataTypes.Entitlement({module: address(0), data: ""});

    vm.prank(_moderator);
    vm.expectRevert(Errors.OwnerPermissionNotAllowed.selector);
    Space(_space).createRole(_roleName, _permissions, _entitlements);
  }

  function testCreateRoleNotAllowed() external {
    address _space = createSimpleSpace();

    string memory _roleName = "Member";
    string[] memory _permissions = new string[](1);
    _permissions[0] = "Vote";

    DataTypes.Entitlement[] memory _entitlements = new DataTypes.Entitlement[](
      1
    );
    _entitlements[0] = DataTypes.Entitlement({module: address(0), data: ""});

    vm.prank(_randomAddress());
    vm.expectRevert(Errors.NotAllowed.selector);
    Space(_space).createRole(_roleName, _permissions, _entitlements);
  }

  function testCreateRoleWithEntitlements() external {
    address _space = createSimpleSpace();

    string memory _roleName = "Entitled";
    string[] memory _permissions = new string[](1);
    _permissions[0] = "Vote";

    DataTypes.Entitlement[] memory _entitlements = new DataTypes.Entitlement[](
      1
    );
    _entitlements[0] = DataTypes.Entitlement({
      module: _randomAddress(),
      data: abi.encodePacked("data")
    });

    vm.expectRevert(Errors.EntitlementNotWhitelisted.selector);
    Space(_space).createRole(_roleName, _permissions, _entitlements);

    // whitelist new entitlement
    Space(_space).setEntitlement(address(mockEntitlement), true);

    _entitlements[0] = DataTypes.Entitlement({
      module: address(mockEntitlement),
      data: abi.encodePacked("data")
    });

    uint256 _roleId = Space(_space).createRole(
      _roleName,
      _permissions,
      _entitlements
    );

    DataTypes.Role memory _role = Space(_space).getRoleById(_roleId);

    bytes32[] memory entitlementIds = Space(_space).getEntitlementIdsByRoleId(
      _roleId
    );

    bytes32 _entitlementId = keccak256(
      abi.encodePacked(_roleId, abi.encodePacked("data"))
    );

    assertEq(_role.roleId, _roleId);
    assertEq(_role.name, _roleName);
    assertEq(entitlementIds[0], _entitlementId);
  }

  function testCreateRoleOnly() external {
    address _space = createSimpleSpace();

    string memory _roleName = "Member";
    string[] memory _permissions = new string[](1);
    _permissions[0] = "Vote";

    DataTypes.Entitlement[] memory _entitlements = new DataTypes.Entitlement[](
      1
    );
    _entitlements[0] = DataTypes.Entitlement({module: address(0), data: ""});

    uint256 _roleId = Space(_space).createRole(
      _roleName,
      _permissions,
      _entitlements
    );

    DataTypes.Role memory _role = Space(_space).getRoleById(_roleId);
    bytes32[] memory _rolePermissions = Space(_space).getPermissionsByRoleId(
      _roleId
    );

    assertEq(_role.roleId, _roleId);
    assertEq(_role.name, _roleName);
    for (uint256 i = 0; i < _rolePermissions.length; i++) {
      assertEq(_rolePermissions[i], bytes32(abi.encodePacked(_permissions[i])));
    }
  }
}
