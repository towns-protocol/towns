// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

//interfaces
import {IRoles, IRolesBase} from "contracts/src/towns/facets/roles/IRoles.sol";
import {IChannel} from "contracts/src/towns/facets/channels/IChannel.sol";
import {IEntitlementsManager} from "contracts/src/towns/facets/entitlements/IEntitlementsManager.sol";
import {IEntitlementBase} from "contracts/src/towns/entitlements/IEntitlement.sol";

// libraries

// contracts
import {BaseSetup} from "contracts/test/towns/BaseSetup.sol";
import {Roles} from "contracts/src/towns/facets/roles/Roles.sol";

// errors
// solhint-disable-next-line max-line-length
import {EntitlementsService__InvalidEntitlementInterface, EntitlementsService__InvalidEntitlementAddress, EntitlementsService__EntitlementDoesNotExist} from "contracts/src/towns/facets/entitlements/EntitlementsManagerService.sol";
// solhint-disable-next-line max-line-length
import {Validator__InvalidStringLength, Validator__InvalidByteLength} from "contracts/src/utils/Validator.sol";
// solhint-disable-next-line max-line-length

// mocks
import {MockUserEntitlement} from "contracts/test/mocks/MockUserEntitlement.sol";

contract RolesTest is BaseSetup, IRolesBase, IEntitlementBase {
  MockUserEntitlement internal mockEntitlement;
  Roles internal roles;

  function setUp() public override {
    super.setUp();

    mockEntitlement = new MockUserEntitlement();
    mockEntitlement.initialize(everyoneSpace);

    roles = Roles(everyoneSpace);
  }

  function test_createRole_only(
    string memory roleName,
    bytes memory data
  ) external {
    vm.assume(bytes(roleName).length > 2);
    vm.assume(data.length > 2);

    string[] memory permissions = new string[](1);
    permissions[0] = "Read";

    vm.prank(founder);
    IEntitlementsManager(everyoneSpace).addEntitlementModule(
      address(mockEntitlement)
    );

    IRoles.CreateEntitlement[]
      memory entitlements = new IRoles.CreateEntitlement[](1);

    entitlements[0] = CreateEntitlement({
      module: address(mockEntitlement),
      data: data
    });

    vm.prank(founder);
    uint256 roleId = roles.createRole(roleName, permissions, entitlements);

    // check roles
    IRoles.Role memory roleData = roles.getRoleById(roleId);
    assertEq(roleData.id, roleId);
    assertEq(roleData.name, roleName);
    assertEq(roleData.permissions.length, permissions.length);
    assertEq(roleData.entitlements.length, entitlements.length);
  }

  function test_createRole_not_overwritten() external {
    string memory role1 = "role1";
    string memory role2 = "role2";
    string memory role3 = "role3";

    vm.startPrank(founder);
    roles.createRole(role1, new string[](0), new IRoles.CreateEntitlement[](0));

    uint256 roleId2 = roles.createRole(
      role2,
      new string[](0),
      new IRoles.CreateEntitlement[](0)
    );

    uint256 roleId3 = roles.createRole(
      role3,
      new string[](0),
      new IRoles.CreateEntitlement[](0)
    );

    roles.removeRole(roleId2);

    uint256 roleId4 = roles.createRole(
      role2,
      new string[](0),
      new IRoles.CreateEntitlement[](0)
    );

    assertEq(roleId4, 6);

    IRoles.Role memory roleData = roles.getRoleById(roleId3);

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

    vm.prank(founder);
    uint256 roleId = roles.createRole(
      roleName,
      permissions,
      new IRoles.CreateEntitlement[](0)
    );

    // check roles
    IRoles.Role memory roleData = roles.getRoleById(roleId);
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

    vm.prank(founder);
    vm.expectRevert(Roles__InvalidPermission.selector);
    roles.createRole(roleName, permissions, new IRoles.CreateEntitlement[](0));
  }

  function test_createRole_revert_when_not_entitled(
    string memory roleName
  ) external {
    vm.assume(bytes(roleName).length > 2);

    address nonEntitled = _randomAddress();

    vm.prank(nonEntitled);
    vm.expectRevert(Entitlement__NotAllowed.selector);
    roles.createRole(
      roleName,
      new string[](0),
      new IRoles.CreateEntitlement[](0)
    );
  }

  function test_createRole_revert_when_empty_name() external {
    vm.prank(founder);
    vm.expectRevert(Validator__InvalidStringLength.selector);
    roles.createRole("", new string[](0), new IRoles.CreateEntitlement[](0));
  }

  function test_createRole_revert_when_invalid_entitlement_address(
    string memory roleName
  ) external {
    vm.assume(bytes(roleName).length > 2);
    vm.prank(founder);
    vm.expectRevert(EntitlementsService__InvalidEntitlementAddress.selector);
    roles.createRole(
      roleName,
      new string[](0),
      new IRoles.CreateEntitlement[](1)
    );
  }

  function test_createRole_revert_when_entitlement_does_not_exist(
    string memory roleName,
    bytes memory data
  ) external {
    vm.assume(bytes(roleName).length > 2);
    vm.assume(data.length > 2);

    IRoles.CreateEntitlement[]
      memory entitlements = new IRoles.CreateEntitlement[](1);

    entitlements[0] = CreateEntitlement({
      module: address(mockEntitlement),
      data: data
    });

    vm.prank(founder);
    vm.expectRevert(EntitlementsService__EntitlementDoesNotExist.selector);
    roles.createRole(roleName, new string[](0), entitlements);
  }

  function test_createRole_revert_when_entitlement_data_empty(
    string memory roleName,
    string memory permission
  ) external {
    vm.assume(bytes(roleName).length > 2);
    vm.assume(bytes(permission).length > 2);

    string[] memory permissions = new string[](1);
    permissions[0] = permission;

    vm.prank(founder);
    IEntitlementsManager(everyoneSpace).addEntitlementModule(
      address(mockEntitlement)
    );

    IRoles.CreateEntitlement[]
      memory entitlements = new IRoles.CreateEntitlement[](1);

    entitlements[0] = CreateEntitlement({
      module: address(mockEntitlement),
      data: ""
    });

    vm.prank(founder);
    vm.expectRevert(Validator__InvalidByteLength.selector);
    roles.createRole(roleName, permissions, entitlements);
  }

  // =============================================================
  //                           Get Roles
  // =============================================================
  function test_getRoles_only(
    string memory roleName1,
    string memory roleName2
  ) external {
    vm.assume(bytes(roleName1).length > 2);
    vm.assume(bytes(roleName2).length > 2);

    IRoles.Role[] memory currentRoles = roles.getRoles();

    vm.prank(founder);
    roles.createRole(
      roleName1,
      new string[](0),
      new IRoles.CreateEntitlement[](0)
    );

    vm.prank(founder);
    roles.createRole(
      roleName2,
      new string[](0),
      new IRoles.CreateEntitlement[](0)
    );

    IRoles.Role[] memory allRoles = roles.getRoles();

    assertEq(currentRoles.length, allRoles.length - 2);
  }

  function test_getRoles_default_roles() external {
    IRoles.Role[] memory allRoles = roles.getRoles();
    assertEq(allRoles.length, 2);
  }

  // =============================================================
  //                           Get Role
  // =============================================================

  function test_getRoleById(string memory roleName) external {
    vm.assume(bytes(roleName).length > 2);

    vm.prank(founder);
    uint256 roleId = roles.createRole(
      roleName,
      new string[](0),
      new IRoles.CreateEntitlement[](0)
    );

    IRoles.Role memory roleData = roles.getRoleById(roleId);

    assertEq(roleData.name, roleName);
    assertEq(roleData.id, roleId);
  }

  function test_getRoleById_revert_when_role_does_not_exist() external {
    vm.prank(founder);
    vm.expectRevert(Roles__RoleDoesNotExist.selector);
    roles.getRoleById(0);
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

    // create a new mock entitlement and initialize it with the everyoneSpace
    MockUserEntitlement newMockEntitlement = new MockUserEntitlement();
    newMockEntitlement.initialize(address(everyoneSpace));

    // add both entitlements to everyoneSpace
    vm.startPrank(founder);
    IEntitlementsManager(everyoneSpace).addEntitlementModule(
      address(mockEntitlement)
    );
    IEntitlementsManager(everyoneSpace).addEntitlementModule(
      address(newMockEntitlement)
    );
    vm.stopPrank();

    // create an initial set of permissions
    string[] memory permissions = new string[](2);
    permissions[0] = "Read";
    permissions[1] = "Write";

    // create a new set of permissions to update to
    string[] memory newPermissions = new string[](1);
    newPermissions[0] = "Ping";

    // create an initial set of entitlements
    IRoles.CreateEntitlement[]
      memory entitlements = new IRoles.CreateEntitlement[](1);
    entitlements[0] = CreateEntitlement({
      module: address(mockEntitlement),
      data: abi.encodePacked("test")
    });

    // create a new set of entitlements to update to
    IRoles.CreateEntitlement[]
      memory newEntitlements = new IRoles.CreateEntitlement[](1);
    newEntitlements[0] = CreateEntitlement({
      module: address(newMockEntitlement),
      data: abi.encodePacked("test")
    });

    // create the roles with the initial permissions and entitlements
    vm.prank(founder);
    uint256 roleId = roles.createRole(roleName, permissions, entitlements);

    // update the roles with the new permissions and entitlements
    vm.prank(founder);
    roles.updateRole(roleId, newRoleName, newPermissions, newEntitlements);

    // get the roles data
    IRoles.Role memory roleData = roles.getRoleById(roleId);

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
    permissions[0] = "Read";
    permissions[1] = "Write";

    // create a new set of permissions to update to
    string[] memory newPermissions = new string[](1);
    newPermissions[0] = "Ping";

    // create the roles with the initial permissions and entitlements
    vm.prank(founder);
    uint256 roleId = roles.createRole(
      roleName,
      permissions,
      new IRoles.CreateEntitlement[](0)
    );

    // update the roles with the new permissions no entitlements
    vm.prank(founder);
    roles.updateRole(
      roleId,
      newRoleName,
      newPermissions,
      new IRoles.CreateEntitlement[](0)
    );

    // get the roles data
    IRoles.Role memory roleData = roles.getRoleById(roleId);

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

    vm.prank(founder);
    vm.expectRevert(Roles__RoleDoesNotExist.selector);
    roles.updateRole(
      0,
      roleName,
      new string[](0),
      new IRoles.CreateEntitlement[](0)
    );
  }

  function test_updateRole_revert_when_invalid_permissions(
    string memory roleName
  ) external {
    vm.assume(bytes(roleName).length > 2);

    vm.prank(founder);
    uint256 roleId = roles.createRole(
      roleName,
      new string[](0),
      new IRoles.CreateEntitlement[](0)
    );

    vm.prank(founder);
    vm.expectRevert(Roles__InvalidPermission.selector);
    roles.updateRole(
      roleId,
      roleName,
      new string[](3),
      new IRoles.CreateEntitlement[](0)
    );
  }

  function test_updateRole_revert_when_invalid_entitlement_address(
    string memory roleName
  ) external {
    vm.assume(bytes(roleName).length > 2);

    vm.prank(founder);
    uint256 roleId = roles.createRole(
      roleName,
      new string[](0),
      new IRoles.CreateEntitlement[](0)
    );

    vm.prank(founder);
    vm.expectRevert(EntitlementsService__InvalidEntitlementAddress.selector);
    roles.updateRole(
      roleId,
      roleName,
      new string[](0),
      new IRoles.CreateEntitlement[](1)
    );
  }

  function test_updateRole_revert_when_invalid_entitlement_interface(
    string memory roleName
  ) external {
    vm.assume(bytes(roleName).length > 2);

    vm.prank(founder);
    uint256 roleId = roles.createRole(
      roleName,
      new string[](0),
      new IRoles.CreateEntitlement[](0)
    );

    IRoles.CreateEntitlement[]
      memory entitlements = new IRoles.CreateEntitlement[](1);

    entitlements[0] = CreateEntitlement({
      module: address(this),
      data: abi.encodePacked("test")
    });

    vm.prank(founder);
    vm.expectRevert(EntitlementsService__InvalidEntitlementInterface.selector);
    roles.updateRole(roleId, roleName, new string[](0), entitlements);
  }

  // =============================================================
  //                           Delete Role
  // =============================================================

  function test_removeRole(string memory roleName) external {
    vm.assume(bytes(roleName).length > 2);

    vm.prank(founder);
    uint256 roleId = roles.createRole(
      roleName,
      new string[](0),
      new IRoles.CreateEntitlement[](0)
    );

    vm.prank(founder);
    roles.removeRole(roleId);

    vm.prank(founder);
    vm.expectRevert(Roles__RoleDoesNotExist.selector);
    roles.getRoleById(roleId);
  }

  function test_removeRole_revert_when_invalid_role() external {
    vm.prank(founder);
    vm.expectRevert(Roles__RoleDoesNotExist.selector);
    roles.removeRole(0);
  }

  function test_removeRole_with_channels_already_created() external {
    string memory roleName1 = "role1";
    string memory channelId1 = "channel1";
    string memory channelId2 = "channel2";

    vm.prank(founder);
    uint256 roleId = roles.createRole(
      roleName1,
      new string[](0),
      new IRoles.CreateEntitlement[](0)
    );

    // create a channel
    uint256[] memory roleIds = new uint256[](1);
    roleIds[0] = roleId;

    vm.startPrank(founder);
    IChannel(everyoneSpace).createChannel(
      channelId1,
      "ipfs://test",
      new uint256[](0)
    );
    IChannel(everyoneSpace).createChannel(channelId2, "ipfs://test", roleIds);
    vm.stopPrank();

    vm.prank(founder);
    roles.removeRole(roleId);

    // verify that role was removed from channel
    IChannel.Channel memory channel = IChannel(everyoneSpace).getChannel(
      channelId2
    );
    assertEq(channel.roleIds.length, 0);
  }

  function test_removeRole_with_channels(
    string memory roleName,
    string memory channelId
  ) external {
    vm.assume(bytes(roleName).length > 2);
    vm.assume(bytes(channelId).length > 2);

    // create a roles
    vm.prank(founder);
    uint256 roleId = roles.createRole(
      roleName,
      new string[](0),
      new IRoles.CreateEntitlement[](0)
    );

    // create a channel
    uint256[] memory roleIds = new uint256[](1);
    roleIds[0] = roleId;

    vm.prank(founder);
    IChannel(everyoneSpace).createChannel(channelId, "ipfs://test", roleIds);

    // get the channel info
    IChannel.Channel memory channel = IChannel(everyoneSpace).getChannel(
      channelId
    );

    assertEq(channel.roleIds.length, 1);
    assertEq(channel.roleIds[0], roleId);

    // remove the roles
    vm.prank(founder);
    roles.removeRole(roleId);

    // // get the channel data
    channel = IChannel(everyoneSpace).getChannel(channelId);

    assertEq(channel.roleIds.length, 0);

    vm.expectRevert(Roles__RoleDoesNotExist.selector);
    roles.getRoleById(roleId);
  }

  function test_removeRole_with_entitlements(string memory roleName) external {
    vm.assume(bytes(roleName).length > 2);

    vm.prank(founder);
    IEntitlementsManager(everyoneSpace).addEntitlementModule(
      address(mockEntitlement)
    );

    IRoles.CreateEntitlement[]
      memory entitlements = new IRoles.CreateEntitlement[](1);

    entitlements[0] = CreateEntitlement({
      module: address(mockEntitlement),
      data: abi.encode("test")
    });

    // create a roles
    vm.prank(founder);
    uint256 roleId = roles.createRole(roleName, new string[](0), entitlements);

    // create a channel
    uint256[] memory roleIds = new uint256[](1);
    roleIds[0] = roleId;

    vm.prank(founder);
    IChannel(everyoneSpace).createChannel("testing", "testing", roleIds);

    // get the roles data
    IRoles.Role memory roleData = roles.getRoleById(roleId);

    assertEq(roleData.entitlements.length, 1);
    assertEq(roleData.entitlements[0], address(mockEntitlement));

    // remove the roles
    vm.prank(founder);
    roles.removeRole(roleId);

    vm.expectRevert(Roles__RoleDoesNotExist.selector);
    roles.getRoleById(roleId);
  }

  // =============================================================
  //                      Add Permissions
  // =============================================================

  function test_addPermissionsToRole(string memory roleName) external {
    vm.assume(bytes(roleName).length > 2);

    string[] memory permissions = new string[](1);
    permissions[0] = "Write";

    // create a roles
    vm.prank(founder);
    uint256 roleId = roles.createRole(
      roleName,
      permissions,
      new IRoles.CreateEntitlement[](0)
    );

    permissions[0] = "Read";

    // add permissions to the roles
    vm.prank(founder);
    roles.addPermissionsToRole(roleId, permissions);

    // get the roles data
    IRoles.Role memory roleData = roles.getRoleById(roleId);

    assertEq(roleData.permissions.length, 2);
    assertEq(roleData.permissions[0], "Write");
    assertEq(roleData.permissions[1], "Read");
  }

  function test_addPermissionsToRole_revert_when_duplicate_permissions(
    string memory permission
  ) external {
    vm.assume(bytes(permission).length > 2);

    string[] memory permissions = new string[](1);
    permissions[0] = permission;

    // create a roles
    vm.prank(founder);
    uint256 roleId = roles.createRole(
      "test",
      permissions,
      new IRoles.CreateEntitlement[](0)
    );

    // add permissions to the roles
    vm.prank(founder);
    vm.expectRevert(Roles__PermissionAlreadyExists.selector);
    roles.addPermissionsToRole(roleId, permissions);
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

    vm.prank(founder);
    vm.expectRevert(Roles__RoleDoesNotExist.selector);
    roles.addPermissionsToRole(0, permissions);
  }

  // =============================================================
  //                      Remove Permissions
  // =============================================================

  function test_removePermissionsFromRole(string memory roleName) external {
    vm.assume(bytes(roleName).length > 2);

    string[] memory permissions = new string[](2);
    permissions[0] = "Write";
    permissions[1] = "Read";

    // create a roles
    vm.prank(founder);
    uint256 roleId = roles.createRole(
      roleName,
      permissions,
      new IRoles.CreateEntitlement[](0)
    );

    // remove permissions from the roles
    vm.prank(founder);
    roles.removePermissionsFromRole(roleId, permissions);

    // get the roles data
    IRoles.Role memory roleData = roles.getRoleById(roleId);

    assertEq(roleData.permissions.length, 0);
  }

  function test_removePermissionsFromRole_revert_when_invalid_permission(
    string memory permission
  ) external {
    vm.assume(bytes(permission).length > 2);

    string[] memory permissions = new string[](1);
    permissions[0] = permission;

    // create a roles
    vm.prank(founder);
    uint256 roleId = roles.createRole(
      "test",
      permissions,
      new IRoles.CreateEntitlement[](0)
    );

    permissions[0] = "invalid";

    // remove permissions from the roles
    vm.prank(founder);
    vm.expectRevert(Roles__PermissionDoesNotExist.selector);
    roles.removePermissionsFromRole(roleId, permissions);
  }

  function test_removePermissionsFromRole_revert_when_invalid_role(
    string memory permission
  ) external {
    vm.assume(bytes(permission).length > 2);

    string[] memory permissions = new string[](1);
    permissions[0] = permission;

    vm.prank(founder);
    vm.expectRevert(Roles__RoleDoesNotExist.selector);
    roles.removePermissionsFromRole(0, permissions);
  }

  // =============================================================
  //                      Add Entitlements
  // =============================================================

  function test_addRoleToEntitlement(string memory roleName) external {
    vm.assume(bytes(roleName).length > 2);

    vm.prank(founder);
    IEntitlementsManager(everyoneSpace).addEntitlementModule(
      address(mockEntitlement)
    );

    // create a roles
    vm.prank(founder);
    uint256 roleId = roles.createRole(
      roleName,
      new string[](0),
      new IRoles.CreateEntitlement[](0)
    );

    IRoles.CreateEntitlement memory entitlement = CreateEntitlement({
      module: address(mockEntitlement),
      data: abi.encode("test")
    });

    // add roles to entitlement
    vm.prank(founder);
    roles.addRoleToEntitlement(roleId, entitlement);

    // get the roles
    IRoles.Role memory roleData = roles.getRoleById(roleId);

    assertEq(roleData.entitlements.length, 1);
    assertEq(roleData.entitlements[0], address(mockEntitlement));
  }

  function test_addRoleToEntitlement_revert_when_invalid_role() external {
    vm.prank(founder);
    IEntitlementsManager(everyoneSpace).addEntitlementModule(
      address(mockEntitlement)
    );

    IRoles.CreateEntitlement memory entitlement = CreateEntitlement({
      module: address(mockEntitlement),
      data: abi.encode("test")
    });

    // add roles to entitlement
    vm.prank(founder);
    vm.expectRevert(Roles__RoleDoesNotExist.selector);
    roles.addRoleToEntitlement(0, entitlement);
  }

  function test_addRoleToEntitlement_revert_when_invalid_entitlement()
    external
  {
    // create a roles
    vm.prank(founder);
    uint256 roleId = roles.createRole(
      "test",
      new string[](0),
      new IRoles.CreateEntitlement[](0)
    );

    IRoles.CreateEntitlement memory entitlement = CreateEntitlement({
      module: address(mockEntitlement),
      data: abi.encode("test")
    });

    // add roles to entitlement
    vm.prank(founder);
    vm.expectRevert(EntitlementsService__EntitlementDoesNotExist.selector);
    roles.addRoleToEntitlement(roleId, entitlement);
  }

  function test_addRoleToEntitlement_revert_when_entitlement_already_exists_in_role(
    string memory roleName
  ) external {
    vm.assume(bytes(roleName).length > 2);

    vm.prank(founder);
    IEntitlementsManager(everyoneSpace).addEntitlementModule(
      address(mockEntitlement)
    );

    // create a roles
    vm.prank(founder);
    uint256 roleId = roles.createRole(
      roleName,
      new string[](0),
      new IRoles.CreateEntitlement[](0)
    );

    IRoles.CreateEntitlement memory entitlement = CreateEntitlement({
      module: address(mockEntitlement),
      data: abi.encode("test")
    });

    // add roles to entitlement
    vm.prank(founder);
    roles.addRoleToEntitlement(roleId, entitlement);

    // add roles to entitlement
    vm.prank(founder);
    vm.expectRevert(Roles__EntitlementAlreadyExists.selector);
    roles.addRoleToEntitlement(roleId, entitlement);
  }

  // =============================================================
  //                      Remove Entitlements
  // =============================================================

  function test_removeRoleFromEntitlement(string memory roleName) external {
    vm.assume(bytes(roleName).length > 2);

    vm.prank(founder);
    IEntitlementsManager(everyoneSpace).addEntitlementModule(
      address(mockEntitlement)
    );

    // create a role
    vm.prank(founder);
    uint256 roleId = roles.createRole(
      roleName,
      new string[](0),
      new IRoles.CreateEntitlement[](0)
    );

    IRoles.CreateEntitlement memory entitlement = CreateEntitlement({
      module: address(mockEntitlement),
      data: abi.encode("test")
    });

    // add roles to entitlement
    vm.prank(founder);
    roles.addRoleToEntitlement(roleId, entitlement);

    // get the roles
    IRoles.Role memory roleData = roles.getRoleById(roleId);
    assertEq(roleData.entitlements.length, 1);

    // remove role from entitlement
    vm.prank(founder);
    roles.removeRoleFromEntitlement(roleId, entitlement);

    // get the roles
    roleData = roles.getRoleById(roleId);

    assertEq(roleData.entitlements.length, 0);
  }

  function test_removeRoleFromEntitlement_revert_when_invalid_role() external {
    vm.prank(founder);
    IEntitlementsManager(everyoneSpace).addEntitlementModule(
      address(mockEntitlement)
    );

    IRoles.CreateEntitlement memory entitlement = CreateEntitlement({
      module: address(mockEntitlement),
      data: abi.encode("test")
    });

    // remove roles from entitlement
    vm.prank(founder);
    vm.expectRevert(Roles__RoleDoesNotExist.selector);
    roles.removeRoleFromEntitlement(0, entitlement);
  }

  function test_removeRoleFromEntitlement_revert_when_invalid_entitlement()
    external
  {
    // create a roles
    vm.prank(founder);
    uint256 roleId = roles.createRole(
      "test",
      new string[](0),
      new IRoles.CreateEntitlement[](0)
    );

    IRoles.CreateEntitlement memory entitlement = CreateEntitlement({
      module: address(mockEntitlement),
      data: abi.encode("test")
    });

    // remove roles from entitlement
    vm.prank(founder);
    vm.expectRevert(EntitlementsService__EntitlementDoesNotExist.selector);
    roles.removeRoleFromEntitlement(roleId, entitlement);
  }

  function test_removeRoleFromEntitlement_revert_when_entitlement_does_not_exist_in_role(
    string memory roleName
  ) external {
    vm.assume(bytes(roleName).length > 2);

    vm.prank(founder);
    IEntitlementsManager(everyoneSpace).addEntitlementModule(
      address(mockEntitlement)
    );

    // create a roles
    vm.prank(founder);
    uint256 roleId = roles.createRole(
      roleName,
      new string[](0),
      new IRoles.CreateEntitlement[](0)
    );

    IRoles.CreateEntitlement memory entitlement = CreateEntitlement({
      module: address(mockEntitlement),
      data: abi.encode("test")
    });

    // remove roles from entitlement
    vm.prank(founder);
    vm.expectRevert(Roles__EntitlementDoesNotExist.selector);
    roles.removeRoleFromEntitlement(roleId, entitlement);
  }
}
