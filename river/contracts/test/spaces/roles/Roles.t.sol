// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces
import {IRoles, IRolesBase} from "contracts/src/spaces/facets/roles/IRoles.sol";
import {IChannel} from "contracts/src/spaces/facets/channels/IChannel.sol";
import {IEntitlementsManager} from "contracts/src/spaces/facets/entitlements/IEntitlementsManager.sol";
import {IEntitlementBase} from "contracts/src/spaces/entitlements/IEntitlement.sol";
import {IEntitlement} from "contracts/src/spaces/entitlements/IEntitlement.sol";

// libraries

import {Permissions} from "contracts/src/spaces/facets/Permissions.sol";

// contracts
import {BaseSetup} from "contracts/test/spaces/BaseSetup.sol";
import {Roles} from "contracts/src/spaces/facets/roles/Roles.sol";

// errors
// solhint-disable-next-line max-line-length
import {EntitlementsService__InvalidEntitlementInterface, EntitlementsService__InvalidEntitlementAddress, EntitlementsService__EntitlementDoesNotExist} from "contracts/src/spaces/facets/entitlements/EntitlementsManagerService.sol";
// solhint-disable-next-line max-line-length
import {Validator__InvalidStringLength, Validator__InvalidByteLength} from "contracts/src/utils/Validator.sol";
// solhint-disable-next-line max-line-length

// mocks
import {MockUserEntitlement} from "contracts/test/mocks/MockUserEntitlement.sol";

contract RolesTest is BaseSetup, IRolesBase, IEntitlementBase {
  function getRandomAddresses(
    uint256 N
  ) internal view returns (address[] memory) {
    address[] memory data = new address[](N);
    for (uint256 i = 0; i < N; i++) {
      data[i] = _randomAddress();
    }
    return data;
  }

  MockUserEntitlement internal mockEntitlement;
  Roles internal roles;

  function setUp() public override {
    super.setUp();

    mockEntitlement = new MockUserEntitlement();
    mockEntitlement.initialize(everyoneSpace);

    roles = Roles(everyoneSpace);
  }

  function test_createRole_only(string memory roleName) external {
    vm.assume(bytes(roleName).length > 2);

    address[] memory data = getRandomAddresses(4);

    string[] memory permissions = new string[](1);
    permissions[0] = Permissions.Read;

    vm.prank(founder);
    IEntitlementsManager(everyoneSpace).addEntitlementModule(
      address(mockEntitlement)
    );

    IRoles.CreateEntitlement[]
      memory entitlements = new IRoles.CreateEntitlement[](1);

    entitlements[0] = CreateEntitlement({
      module: mockEntitlement,
      data: abi.encode(data)
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

    entitlements[0] = CreateEntitlement({module: mockEntitlement, data: data});

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

    entitlements[0] = CreateEntitlement({module: mockEntitlement, data: ""});

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
    address[] memory users = new address[](1);
    users[0] = _randomAddress();

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
    permissions[0] = Permissions.Read;
    permissions[1] = Permissions.Write;

    // create a new set of permissions to update to
    string[] memory newPermissions = new string[](1);
    newPermissions[0] = Permissions.Ping;

    // create an initial set of entitlements
    IRoles.CreateEntitlement[]
      memory entitlements = new IRoles.CreateEntitlement[](1);
    entitlements[0] = CreateEntitlement({
      module: mockEntitlement,
      data: abi.encode(users)
    });

    // create a new set of entitlements to update to
    IRoles.CreateEntitlement[]
      memory newEntitlements = new IRoles.CreateEntitlement[](1);
    newEntitlements[0] = CreateEntitlement({
      module: (newMockEntitlement),
      data: abi.encode(users)
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
    assertEq(address(roleData.entitlements[0]), address(newMockEntitlement));
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
      module: IEntitlement(address(this)),
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
    bytes32 channelId1 = "channel1";
    bytes32 channelId2 = "channel2";

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
    bytes32 channelId
  ) external {
    vm.assume(bytes(roleName).length > 2);

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

    CreateEntitlement[] memory entitlements = new CreateEntitlement[](1);

    address[] memory users = new address[](1);
    users[0] = _randomAddress();
    entitlements[0] = CreateEntitlement({
      module: mockEntitlement,
      data: abi.encode(users)
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
    assertEq(address(roleData.entitlements[0]), address(mockEntitlement));

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
    permissions[0] = Permissions.Write;

    // create a roles
    vm.prank(founder);
    uint256 roleId = roles.createRole(
      roleName,
      permissions,
      new IRoles.CreateEntitlement[](0)
    );

    permissions[0] = Permissions.Read;

    // add permissions to the roles
    vm.prank(founder);
    roles.addPermissionsToRole(roleId, permissions);

    // get the roles data
    IRoles.Role memory roleData = roles.getRoleById(roleId);

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
    permissions[0] = Permissions.Write;
    permissions[1] = Permissions.Read;

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

    address[] memory users = new address[](4);
    users[0] = _randomAddress();
    users[1] = _randomAddress();
    users[2] = _randomAddress();
    users[3] = _randomAddress();

    IRoles.CreateEntitlement memory entitlement = CreateEntitlement({
      module: mockEntitlement,
      data: abi.encode(users)
    });

    // add roles to entitlement
    vm.prank(founder);
    roles.addRoleToEntitlement(roleId, entitlement);

    // get the roles
    IRoles.Role memory roleData = roles.getRoleById(roleId);

    assertEq(roleData.entitlements.length, 1);
    assertEq(address(roleData.entitlements[0]), address(mockEntitlement));
  }

  function test_addRoleToEntitlement_revert_when_invalid_role() external {
    vm.prank(founder);
    IEntitlementsManager(everyoneSpace).addEntitlementModule(
      address(mockEntitlement)
    );

    IRoles.CreateEntitlement memory entitlement = CreateEntitlement({
      module: mockEntitlement,
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
      module: mockEntitlement,
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

    address[] memory users = new address[](1);
    users[0] = _randomAddress();

    IRoles.CreateEntitlement memory entitlement = CreateEntitlement({
      module: mockEntitlement,
      data: abi.encode(users)
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

    address[] memory users = new address[](4);
    users[0] = _randomAddress();
    users[1] = _randomAddress();
    users[2] = _randomAddress();
    users[3] = _randomAddress();
    IRoles.CreateEntitlement memory entitlement = CreateEntitlement({
      module: mockEntitlement,
      data: abi.encode(users)
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

    address[] memory users = new address[](1);
    users[0] = _randomAddress();

    IRoles.CreateEntitlement memory entitlement = CreateEntitlement({
      module: mockEntitlement,
      data: abi.encode(users)
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

    address[] memory users = new address[](1);
    users[0] = _randomAddress();
    IRoles.CreateEntitlement memory entitlement = CreateEntitlement({
      module: mockEntitlement,
      data: abi.encode(users)
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

    address[] memory users = new address[](1);
    users[0] = _randomAddress();
    IRoles.CreateEntitlement memory entitlement = CreateEntitlement({
      module: mockEntitlement,
      data: abi.encode(users)
    });

    // remove roles from entitlement
    vm.prank(founder);
    vm.expectRevert(Roles__EntitlementDoesNotExist.selector);
    roles.removeRoleFromEntitlement(roleId, entitlement);
  }
}
