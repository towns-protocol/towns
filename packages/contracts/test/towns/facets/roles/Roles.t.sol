// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IRole} from "contracts/src/towns/facets/roles/IRole.sol";
import {IRoleStructs} from "contracts/src/towns/facets/roles/IRole.sol";
import {IEntitlements} from "contracts/src/towns/facets/entitlements/IEntitlements.sol";
import {IChannel} from "contracts/src/towns/facets/channels/IChannel.sol";

// libraries
import {Permissions} from "contracts/src/spaces/libraries/Permissions.sol";

// contracts
import {TownTest} from "contracts/test/towns/Town.t.sol";
import {MockUserEntitlement} from "contracts/test/mocks/MockUserEntitlement.sol";
import {StdUtils} from "forge-std/StdUtils.sol";

// errors
// solhint-disable-next-line max-line-length
import {EntitlementsService__NotAllowed, EntitlementsService__InvalidEntitlementInterface, EntitlementsService__InvalidEntitlementAddress, EntitlementsService__EntitlementDoesNotExist} from "contracts/src/towns/facets/entitlements/EntitlementsService.sol";
// solhint-disable-next-line max-line-length
import {Validator__InvalidStringLength, Validator__InvalidByteLength} from "contracts/src/utils/Validator.sol";
// solhint-disable-next-line max-line-length
import {RoleService__InvalidPermission, RoleService__RoleDoesNotExist, RoleService__PermissionAlreadyExists, RoleService__PermissionDoesNotExist, RoleService__EntitlementAlreadyExists, RoleService__EntitlementDoesNotExist} from "contracts/src/towns/facets/roles/RoleService.sol";

contract RolesTest is TownTest, StdUtils {
  IRole internal role;
  MockUserEntitlement internal mockEntitlement;

  function setUp() public override {
    super.setUp();
    role = IRole(town);
    mockEntitlement = new MockUserEntitlement();
    mockEntitlement.initialize(town);
  }

  // =============================================================
  //                           Create Role
  // =============================================================

  function test_createRole(string memory roleName, bytes memory data) external {
    vm.assume(bytes(roleName).length > 2);
    vm.assume(data.length > 2);

    string[] memory permissions = new string[](1);
    permissions[0] = Permissions.Read;

    vm.prank(townOwner);
    IEntitlements(town).addEntitlement(address(mockEntitlement));

    IRole.CreateEntitlement[]
      memory entitlements = new IRole.CreateEntitlement[](1);

    entitlements[0] = IRoleStructs.CreateEntitlement({
      module: address(mockEntitlement),
      data: data
    });

    vm.prank(townOwner);
    uint256 roleId = role.createRole(roleName, permissions, entitlements);

    // check role
    IRole.Role memory roleData = role.getRoleById(roleId);
    assertEq(roleData.id, roleId);
    assertEq(roleData.name, roleName);
    assertEq(roleData.permissions.length, permissions.length);
    assertEq(roleData.entitlements.length, entitlements.length);
  }

  function test_createRole_not_overwritten() external {
    string memory role1 = "role1";
    string memory role2 = "role2";
    string memory role3 = "role3";

    vm.startPrank(townOwner);
    uint256 roleId1 = role.createRole(
      role1,
      new string[](0),
      new IRole.CreateEntitlement[](0)
    );

    uint256 roleId2 = role.createRole(
      role2,
      new string[](0),
      new IRole.CreateEntitlement[](0)
    );

    uint256 roleId3 = role.createRole(
      role3,
      new string[](0),
      new IRole.CreateEntitlement[](0)
    );

    assertEq(roleId1, 1);
    assertEq(roleId2, 2);
    assertEq(roleId3, 3);

    role.removeRole(roleId2);

    uint256 roleId4 = role.createRole(
      role2,
      new string[](0),
      new IRole.CreateEntitlement[](0)
    );

    assertEq(roleId4, 4);

    IRole.Role memory roleData = role.getRoleById(roleId3);

    assertEq(roleData.id, roleId3);

    vm.stopPrank();
  }

  function test_createRole_with_permissions(
    string memory roleName,
    string memory permission
  ) external {
    vm.assume(bytes(roleName).length > 2);
    vm.assume(bytes(permission).length > 2);

    string[] memory permissions = new string[](1);
    permissions[0] = permission;

    vm.prank(townOwner);
    uint256 roleId = role.createRole(
      roleName,
      permissions,
      new IRole.CreateEntitlement[](0)
    );

    // check role
    IRole.Role memory roleData = role.getRoleById(roleId);
    assertEq(roleData.id, roleId);
    assertEq(roleData.name, roleName);
    assertEq(roleData.permissions.length, permissions.length);
    assertEq(roleData.entitlements.length, 0);
  }

  function test_createRole_revert_when_invalid_permission(
    string memory roleName
  ) external {
    vm.assume(bytes(roleName).length > 2);

    string[] memory permissions = new string[](1);
    permissions[0] = "";

    vm.prank(townOwner);
    vm.expectRevert(RoleService__InvalidPermission.selector);
    role.createRole(roleName, permissions, new IRole.CreateEntitlement[](0));
  }

  function test_createRole_revert_when_not_entitled(
    string memory roleName
  ) external {
    vm.assume(bytes(roleName).length > 2);

    address nonEntitled = _randomAddress();

    vm.prank(nonEntitled);
    vm.expectRevert(EntitlementsService__NotAllowed.selector);
    role.createRole(
      roleName,
      new string[](0),
      new IRole.CreateEntitlement[](0)
    );
  }

  function test_createRole_revert_when_empty_name() external {
    vm.prank(townOwner);
    vm.expectRevert(Validator__InvalidStringLength.selector);
    role.createRole("", new string[](0), new IRole.CreateEntitlement[](0));
  }

  function test_createRole_revert_when_invalid_entitlement_address(
    string memory roleName
  ) external {
    vm.assume(bytes(roleName).length > 2);
    vm.prank(townOwner);
    vm.expectRevert(EntitlementsService__InvalidEntitlementAddress.selector);
    role.createRole(
      roleName,
      new string[](0),
      new IRole.CreateEntitlement[](1)
    );
  }

  function test_createRole_revert_when_entitlement_does_not_exist(
    string memory roleName,
    bytes memory data
  ) external {
    vm.assume(bytes(roleName).length > 2);

    IRole.CreateEntitlement[]
      memory entitlements = new IRole.CreateEntitlement[](1);

    entitlements[0] = IRoleStructs.CreateEntitlement({
      module: address(mockEntitlement),
      data: data
    });

    vm.prank(townOwner);
    vm.expectRevert(EntitlementsService__EntitlementDoesNotExist.selector);
    role.createRole(roleName, new string[](0), entitlements);
  }

  function test_createRole_revert_when_entitlement_data_empty(
    string memory roleName,
    string memory permission
  ) external {
    vm.assume(bytes(roleName).length > 2);
    vm.assume(bytes(permission).length > 2);

    string[] memory permissions = new string[](1);
    permissions[0] = permission;

    vm.prank(townOwner);
    IEntitlements(town).addEntitlement(address(mockEntitlement));

    IRole.CreateEntitlement[]
      memory entitlements = new IRole.CreateEntitlement[](1);

    entitlements[0] = IRoleStructs.CreateEntitlement({
      module: address(mockEntitlement),
      data: ""
    });

    vm.prank(townOwner);
    vm.expectRevert(Validator__InvalidByteLength.selector);
    role.createRole(roleName, permissions, entitlements);
  }

  // =============================================================
  //                           Get Roles
  // =============================================================
  function test_getRoles(
    string memory roleName1,
    string memory roleName2
  ) external {
    vm.assume(bytes(roleName1).length > 2);
    vm.assume(bytes(roleName2).length > 2);

    vm.prank(townOwner);
    uint256 roleId1 = role.createRole(
      roleName1,
      new string[](0),
      new IRole.CreateEntitlement[](0)
    );

    vm.prank(townOwner);
    uint256 roleId2 = role.createRole(
      roleName2,
      new string[](0),
      new IRole.CreateEntitlement[](0)
    );

    IRole.Role[] memory roles = role.getRoles();

    assertEq(roles.length, 2);
    assertEq(roles[0].name, roleName1);
    assertEq(roles[0].id, roleId1);
    assertEq(roles[1].name, roleName2);
    assertEq(roles[1].id, roleId2);
  }

  function test_getRoles_when_no_roles() external {
    IRole.Role[] memory roles = role.getRoles();
    assertEq(roles.length, 0);
  }

  // =============================================================
  //                           Get Role
  // =============================================================

  function test_getRoleById(string memory roleName) external {
    vm.assume(bytes(roleName).length > 2);

    vm.prank(townOwner);
    uint256 roleId = role.createRole(
      roleName,
      new string[](0),
      new IRole.CreateEntitlement[](0)
    );

    IRole.Role memory roleData = role.getRoleById(roleId);

    assertEq(roleData.name, roleName);
    assertEq(roleData.id, roleId);
  }

  function test_getRoleById_revert_when_role_does_not_exist() external {
    vm.prank(townOwner);
    vm.expectRevert(RoleService__RoleDoesNotExist.selector);
    role.getRoleById(0);
  }

  // =============================================================
  //                           Update Role
  // =============================================================
  function test_updateRole(
    string memory roleName,
    string memory newRoleName
  ) external {
    vm.assume(bytes(roleName).length > 2);
    vm.assume(bytes(newRoleName).length > 2);

    // create a new mock entitlement and initialize it with the town
    MockUserEntitlement newMockEntitlement = new MockUserEntitlement();
    newMockEntitlement.initialize(address(town));

    // add both entitlements to town
    vm.startPrank(townOwner);
    IEntitlements(town).addEntitlement(address(mockEntitlement));
    IEntitlements(town).addEntitlement(address(newMockEntitlement));
    vm.stopPrank();

    // create an initial set of permissions
    string[] memory permissions = new string[](2);
    permissions[0] = Permissions.Read;
    permissions[1] = Permissions.Write;

    // create a new set of permissions to update to
    string[] memory newPermissions = new string[](1);
    newPermissions[0] = Permissions.Ping;

    // create an initial set of entitlements
    IRole.CreateEntitlement[]
      memory entitlements = new IRole.CreateEntitlement[](1);
    entitlements[0] = IRoleStructs.CreateEntitlement({
      module: address(mockEntitlement),
      data: abi.encodePacked("test")
    });

    // create a new set of entitlements to update to
    IRole.CreateEntitlement[]
      memory newEntitlements = new IRole.CreateEntitlement[](1);
    newEntitlements[0] = IRoleStructs.CreateEntitlement({
      module: address(newMockEntitlement),
      data: abi.encodePacked("test")
    });

    // create the role with the initial permissions and entitlements
    vm.prank(townOwner);
    uint256 roleId = role.createRole(roleName, permissions, entitlements);

    // update the role with the new permissions and entitlements
    vm.prank(townOwner);
    role.updateRole(roleId, newRoleName, newPermissions, newEntitlements);

    // get the role data
    IRole.Role memory roleData = role.getRoleById(roleId);

    assertEq(roleData.name, newRoleName);
    assertEq(roleData.id, roleId);
    assertEq(roleData.permissions.length, 1);
    assertEq(roleData.permissions[0], newPermissions[0]);
    assertEq(roleData.entitlements.length, 1);
    assertEq(roleData.entitlements[0], address(newMockEntitlement));
  }

  function test_updateRole_only_permissions(
    string memory roleName,
    string memory newRoleName
  ) external {
    vm.assume(bytes(roleName).length > 2);
    vm.assume(bytes(newRoleName).length > 2);

    // create an initial set of permissions
    string[] memory permissions = new string[](2);
    permissions[0] = Permissions.Read;
    permissions[1] = Permissions.Write;

    // create a new set of permissions to update to
    string[] memory newPermissions = new string[](1);
    newPermissions[0] = Permissions.Ping;

    // create the role with the initial permissions and entitlements
    vm.prank(townOwner);
    uint256 roleId = role.createRole(
      roleName,
      permissions,
      new IRole.CreateEntitlement[](0)
    );

    // update the role with the new permissions no entitlements
    vm.prank(townOwner);
    role.updateRole(
      roleId,
      newRoleName,
      newPermissions,
      new IRole.CreateEntitlement[](0)
    );

    // get the role data
    IRole.Role memory roleData = role.getRoleById(roleId);

    assertEq(roleData.name, newRoleName);
    assertEq(roleData.id, roleId);
    assertEq(roleData.permissions.length, 1);
    assertEq(roleData.permissions[0], newPermissions[0]);
    assertEq(roleData.entitlements.length, 0);
  }

  function test_updateRole_revert_when_invalid_role(
    string memory roleName
  ) external {
    vm.assume(bytes(roleName).length > 2);

    vm.prank(townOwner);
    vm.expectRevert(RoleService__RoleDoesNotExist.selector);
    role.updateRole(
      0,
      roleName,
      new string[](0),
      new IRole.CreateEntitlement[](0)
    );
  }

  function test_updateRole_revert_when_invalid_permissions(
    string memory roleName
  ) external {
    vm.assume(bytes(roleName).length > 2);

    vm.prank(townOwner);
    uint256 roleId = role.createRole(
      roleName,
      new string[](0),
      new IRole.CreateEntitlement[](0)
    );

    vm.prank(townOwner);
    vm.expectRevert(RoleService__InvalidPermission.selector);
    role.updateRole(
      roleId,
      roleName,
      new string[](3),
      new IRole.CreateEntitlement[](0)
    );
  }

  function test_updateRole_revert_when_invalid_entitlement_address(
    string memory roleName
  ) external {
    vm.assume(bytes(roleName).length > 2);

    vm.prank(townOwner);
    uint256 roleId = role.createRole(
      roleName,
      new string[](0),
      new IRole.CreateEntitlement[](0)
    );

    vm.prank(townOwner);
    vm.expectRevert(EntitlementsService__InvalidEntitlementAddress.selector);
    role.updateRole(
      roleId,
      roleName,
      new string[](0),
      new IRole.CreateEntitlement[](1)
    );
  }

  function test_updateRole_revert_when_invalid_entitlement_interface(
    string memory roleName
  ) external {
    vm.assume(bytes(roleName).length > 2);

    vm.prank(townOwner);
    uint256 roleId = role.createRole(
      roleName,
      new string[](0),
      new IRole.CreateEntitlement[](0)
    );

    IRole.CreateEntitlement[]
      memory entitlements = new IRole.CreateEntitlement[](1);

    entitlements[0] = IRoleStructs.CreateEntitlement({
      module: address(this),
      data: abi.encodePacked("test")
    });

    vm.prank(townOwner);
    vm.expectRevert(EntitlementsService__InvalidEntitlementInterface.selector);
    role.updateRole(roleId, roleName, new string[](0), entitlements);
  }

  // =============================================================
  //                           Delete Role
  // =============================================================

  function test_removeRole(string memory roleName) external {
    vm.assume(bytes(roleName).length > 2);

    vm.prank(townOwner);
    uint256 roleId = role.createRole(
      roleName,
      new string[](0),
      new IRole.CreateEntitlement[](0)
    );

    vm.prank(townOwner);
    role.removeRole(roleId);

    vm.prank(townOwner);
    vm.expectRevert(RoleService__RoleDoesNotExist.selector);
    role.getRoleById(roleId);
  }

  function test_removeRole_revert_when_invalid_role() external {
    vm.prank(townOwner);
    vm.expectRevert(RoleService__RoleDoesNotExist.selector);
    role.removeRole(0);
  }

  function test_removeRole_with_channels(
    string memory roleName,
    string memory channelId
  ) external {
    vm.assume(bytes(roleName).length > 2);
    vm.assume(bytes(channelId).length > 2);

    // create a role
    vm.prank(townOwner);
    uint256 roleId = role.createRole(
      roleName,
      new string[](0),
      new IRole.CreateEntitlement[](0)
    );

    // create a channel
    uint256[] memory roleIds = new uint256[](1);
    roleIds[0] = roleId;

    vm.prank(townOwner);
    IChannel(town).createChannel(channelId, "ipfs://test", roleIds);

    // get the channel info
    IChannel.Channel memory channel = IChannel(town).getChannel(channelId);

    assertEq(channel.roleIds.length, 1);
    assertEq(channel.roleIds[0], roleId);

    // remove the role
    vm.prank(townOwner);
    role.removeRole(roleId);

    // // get the channel data
    channel = IChannel(town).getChannel(channelId);

    assertEq(channel.roleIds.length, 0);

    vm.expectRevert(RoleService__RoleDoesNotExist.selector);
    role.getRoleById(roleId);
  }

  function test_removeRole_with_entitlements(string memory roleName) external {
    vm.assume(bytes(roleName).length > 2);

    vm.prank(townOwner);
    IEntitlements(town).addEntitlement(address(mockEntitlement));

    IRole.CreateEntitlement[]
      memory entitlements = new IRole.CreateEntitlement[](1);

    entitlements[0] = IRoleStructs.CreateEntitlement({
      module: address(mockEntitlement),
      data: abi.encode("test")
    });

    // create a role
    vm.prank(townOwner);
    uint256 roleId = role.createRole(roleName, new string[](0), entitlements);

    // create a channel
    uint256[] memory roleIds = new uint256[](1);
    roleIds[0] = roleId;

    vm.prank(townOwner);
    IChannel(town).createChannel("test", "test", roleIds);

    // get the role data
    IRole.Role memory roleData = role.getRoleById(roleId);

    assertEq(roleData.entitlements.length, 1);
    assertEq(roleData.entitlements[0], address(mockEntitlement));

    // remove the role
    vm.prank(townOwner);
    role.removeRole(roleId);

    vm.expectRevert(RoleService__RoleDoesNotExist.selector);
    role.getRoleById(roleId);
  }

  // =============================================================
  //                      Add Permissions
  // =============================================================

  function test_addPermissionsToRole(string memory roleName) external {
    vm.assume(bytes(roleName).length > 2);

    string[] memory permissions = new string[](1);
    permissions[0] = Permissions.Write;

    // create a role
    vm.prank(townOwner);
    uint256 roleId = role.createRole(
      roleName,
      permissions,
      new IRole.CreateEntitlement[](0)
    );

    permissions[0] = Permissions.Read;

    // add permissions to the role
    vm.prank(townOwner);
    role.addPermissionsToRole(roleId, permissions);

    // get the role data
    IRole.Role memory roleData = role.getRoleById(roleId);

    assertEq(roleData.permissions.length, 2);
    assertEq(roleData.permissions[0], Permissions.Write);
    assertEq(roleData.permissions[1], Permissions.Read);
  }

  function test_addPermissionsToRole_revert_when_duplicate_permissions(
    string memory permission
  ) external {
    vm.assume(bytes(permission).length > 2);

    string[] memory permissions = new string[](1);
    permissions[0] = permission;

    // create a role
    vm.prank(townOwner);
    uint256 roleId = role.createRole(
      "test",
      permissions,
      new IRole.CreateEntitlement[](0)
    );

    // add permissions to the role
    vm.prank(townOwner);
    vm.expectRevert(RoleService__PermissionAlreadyExists.selector);
    role.addPermissionsToRole(roleId, permissions);
  }

  function test_addPermissionsToRole_revert_when_invalid_role(
    string memory permission,
    string memory permission2
  ) external {
    vm.assume(bytes(permission).length > 2);
    vm.assume(bytes(permission2).length > 2);

    string[] memory permissions = new string[](2);
    permissions[0] = permission;
    permissions[1] = permission2;

    vm.prank(townOwner);
    vm.expectRevert(RoleService__RoleDoesNotExist.selector);
    role.addPermissionsToRole(0, permissions);
  }

  // =============================================================
  //                      Remove Permissions
  // =============================================================

  function test_removePermissionsFromRole(string memory roleName) external {
    vm.assume(bytes(roleName).length > 2);

    string[] memory permissions = new string[](2);
    permissions[0] = Permissions.Write;
    permissions[1] = Permissions.Read;

    // create a role
    vm.prank(townOwner);
    uint256 roleId = role.createRole(
      roleName,
      permissions,
      new IRole.CreateEntitlement[](0)
    );

    // remove permissions from the role
    vm.prank(townOwner);
    role.removePermissionsFromRole(roleId, permissions);

    // get the role data
    IRole.Role memory roleData = role.getRoleById(roleId);

    assertEq(roleData.permissions.length, 0);
  }

  function test_removePermissionsFromRole_revert_when_invalid_permission(
    string memory permission
  ) external {
    vm.assume(bytes(permission).length > 2);

    string[] memory permissions = new string[](1);
    permissions[0] = permission;

    // create a role
    vm.prank(townOwner);
    uint256 roleId = role.createRole(
      "test",
      permissions,
      new IRole.CreateEntitlement[](0)
    );

    permissions[0] = "invalid";

    // remove permissions from the role
    vm.prank(townOwner);
    vm.expectRevert(RoleService__PermissionDoesNotExist.selector);
    role.removePermissionsFromRole(roleId, permissions);
  }

  function test_removePermissionsFromRole_revert_when_invalid_role(
    string memory permission
  ) external {
    vm.assume(bytes(permission).length > 2);

    string[] memory permissions = new string[](1);
    permissions[0] = permission;

    vm.prank(townOwner);
    vm.expectRevert(RoleService__RoleDoesNotExist.selector);
    role.removePermissionsFromRole(0, permissions);
  }

  // =============================================================
  //                      Add Entitlements
  // =============================================================

  function test_addRoleToEntitlement(string memory roleName) external {
    vm.assume(bytes(roleName).length > 2);

    vm.prank(townOwner);
    IEntitlements(town).addEntitlement(address(mockEntitlement));

    // create a role
    vm.prank(townOwner);
    uint256 roleId = role.createRole(
      roleName,
      new string[](0),
      new IRole.CreateEntitlement[](0)
    );

    IRole.CreateEntitlement memory entitlement = IRoleStructs
      .CreateEntitlement({
        module: address(mockEntitlement),
        data: abi.encode("test")
      });

    // add role to entitlement
    vm.prank(townOwner);
    role.addRoleToEntitlement(roleId, entitlement);

    // get the role
    IRole.Role memory roleData = role.getRoleById(roleId);

    assertEq(roleData.entitlements.length, 1);
    assertEq(roleData.entitlements[0], address(mockEntitlement));
  }

  function test_addRoleToEntitlement_revert_when_invalid_role() external {
    vm.prank(townOwner);
    IEntitlements(town).addEntitlement(address(mockEntitlement));

    IRole.CreateEntitlement memory entitlement = IRoleStructs
      .CreateEntitlement({
        module: address(mockEntitlement),
        data: abi.encode("test")
      });

    // add role to entitlement
    vm.prank(townOwner);
    vm.expectRevert(RoleService__RoleDoesNotExist.selector);
    role.addRoleToEntitlement(0, entitlement);
  }

  function test_addRoleToEntitlement_revert_when_invalid_entitlement()
    external
  {
    // create a role
    vm.prank(townOwner);
    uint256 roleId = role.createRole(
      "test",
      new string[](0),
      new IRole.CreateEntitlement[](0)
    );

    IRole.CreateEntitlement memory entitlement = IRoleStructs
      .CreateEntitlement({
        module: address(mockEntitlement),
        data: abi.encode("test")
      });

    // add role to entitlement
    vm.prank(townOwner);
    vm.expectRevert(EntitlementsService__EntitlementDoesNotExist.selector);
    role.addRoleToEntitlement(roleId, entitlement);
  }

  function test_addRoleToEntitlement_revert_when_entitlement_already_exists_in_role(
    string memory roleName
  ) external {
    vm.assume(bytes(roleName).length > 2);

    vm.prank(townOwner);
    IEntitlements(town).addEntitlement(address(mockEntitlement));

    // create a role
    vm.prank(townOwner);
    uint256 roleId = role.createRole(
      roleName,
      new string[](0),
      new IRole.CreateEntitlement[](0)
    );

    IRole.CreateEntitlement memory entitlement = IRoleStructs
      .CreateEntitlement({
        module: address(mockEntitlement),
        data: abi.encode("test")
      });

    // add role to entitlement
    vm.prank(townOwner);
    role.addRoleToEntitlement(roleId, entitlement);

    // add role to entitlement
    vm.prank(townOwner);
    vm.expectRevert(RoleService__EntitlementAlreadyExists.selector);
    role.addRoleToEntitlement(roleId, entitlement);
  }

  // =============================================================
  //                      Remove Entitlements
  // =============================================================

  function test_removeRoleFromEntitlement(string memory roleName) external {
    vm.assume(bytes(roleName).length > 2);

    vm.prank(townOwner);
    IEntitlements(town).addEntitlement(address(mockEntitlement));

    // create a role
    vm.prank(townOwner);
    uint256 roleId = role.createRole(
      roleName,
      new string[](0),
      new IRole.CreateEntitlement[](0)
    );

    IRole.CreateEntitlement memory entitlement = IRoleStructs
      .CreateEntitlement({
        module: address(mockEntitlement),
        data: abi.encode("test")
      });

    // add role to entitlement
    vm.prank(townOwner);
    role.addRoleToEntitlement(roleId, entitlement);

    // get the role
    IRole.Role memory roleData = role.getRoleById(roleId);

    assertEq(roleData.entitlements.length, 1);

    // remove role from entitlement
    vm.prank(townOwner);
    role.removeRoleFromEntitlement(roleId, entitlement);

    // get the role
    roleData = role.getRoleById(roleId);

    assertEq(roleData.entitlements.length, 0);
  }

  function test_removeRoleFromEntitlement_revert_when_invalid_role() external {
    vm.prank(townOwner);
    IEntitlements(town).addEntitlement(address(mockEntitlement));

    IRole.CreateEntitlement memory entitlement = IRoleStructs
      .CreateEntitlement({
        module: address(mockEntitlement),
        data: abi.encode("test")
      });

    // remove role from entitlement
    vm.prank(townOwner);
    vm.expectRevert(RoleService__RoleDoesNotExist.selector);
    role.removeRoleFromEntitlement(0, entitlement);
  }

  function test_removeRoleFromEntitlement_revert_when_invalid_entitlement()
    external
  {
    // create a role
    vm.prank(townOwner);
    uint256 roleId = role.createRole(
      "test",
      new string[](0),
      new IRole.CreateEntitlement[](0)
    );

    IRole.CreateEntitlement memory entitlement = IRoleStructs
      .CreateEntitlement({
        module: address(mockEntitlement),
        data: abi.encode("test")
      });

    // remove role from entitlement
    vm.prank(townOwner);
    vm.expectRevert(EntitlementsService__EntitlementDoesNotExist.selector);
    role.removeRoleFromEntitlement(roleId, entitlement);
  }

  function test_removeRoleFromEntitlement_revert_when_entitlement_does_not_exist_in_role(
    string memory roleName
  ) external {
    vm.assume(bytes(roleName).length > 2);

    vm.prank(townOwner);
    IEntitlements(town).addEntitlement(address(mockEntitlement));

    // create a role
    vm.prank(townOwner);
    uint256 roleId = role.createRole(
      roleName,
      new string[](0),
      new IRole.CreateEntitlement[](0)
    );

    IRole.CreateEntitlement memory entitlement = IRoleStructs
      .CreateEntitlement({
        module: address(mockEntitlement),
        data: abi.encode("test")
      });

    // remove role from entitlement
    vm.prank(townOwner);
    vm.expectRevert(RoleService__EntitlementDoesNotExist.selector);
    role.removeRoleFromEntitlement(roleId, entitlement);
  }
}
