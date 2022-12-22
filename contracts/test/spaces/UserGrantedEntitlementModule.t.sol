// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {BaseSetup} from "contracts/test/spaces/BaseSetup.sol";
import {DataTypes} from "contracts/src/spaces/libraries/DataTypes.sol";
import {Errors} from "contracts/src/spaces/libraries/Errors.sol";
import {ISpaceManager} from "contracts/src/spaces/interfaces/ISpaceManager.sol";
import {Merkle} from "murky/Merkle.sol";
import {PermissionTypes} from "contracts/src/spaces/libraries/PermissionTypes.sol";
import {SpaceTestUtils} from "contracts/test/spaces/SpaceTestUtils.sol";
import {TokenEntitlementModule} from "contracts/src/spaces/modules/entitlements/TokenEntitlementModule.sol";
import {UserGrantedEntitlementModule} from "contracts/src/spaces/modules/entitlements/UserGrantedEntitlementModule.sol";
import {ZionPermissionsRegistry} from "contracts/src/spaces/ZionPermissionsRegistry.sol";
import {ZionRoleManager} from "contracts/src/spaces/ZionRoleManager.sol";
import {ZionSpace} from "contracts/src/spaces/nft/ZionSpace.sol";
import {ZionSpaceManager} from "contracts/src/spaces/ZionSpaceManager.sol";

contract UserGrantedEntitlemtModuleTest is BaseSetup, SpaceTestUtils {
  function setUp() public virtual override {
    BaseSetup.setUp();
  }

  function testEntitlementWithChannel() public {
    string memory spaceName = "test-space";
    string memory spaceNetworkId = "test-network-id";

    string memory channelName = "test-channel";
    string memory channelNetworkId = "test-channel-network-id";

    createSimpleSpace(spaceName, spaceNetworkId, spaceManager);

    uint256[] memory emptyRoleIds = new uint256[](0);

    spaceManager.createChannel(
      DataTypes.CreateChannelData(
        spaceNetworkId,
        channelName,
        channelNetworkId,
        emptyRoleIds
      )
    );

    address[] memory entitlements = spaceManager.getEntitlementModulesBySpaceId(
      spaceNetworkId
    );

    assertEq(
      address(entitlements[0]),
      address(userGrantedEntitlementModule),
      "0th entitlement module should be usergranted address"
    );

    DataTypes.Permission memory permission = permissionsRegistry
      .getPermissionByPermissionType(PermissionTypes.Write);

    assertTrue(
      spaceManager.isEntitled(spaceNetworkId, "", address(this), permission),
      "user should be entitled to write"
    );

    assertFalse(
      spaceManager.isEntitled(spaceNetworkId, "", address(0), permission),
      "address0 user should not be entitled to write"
    );

    uint256 roleId = spaceManager.createRole(spaceNetworkId, "test-role");

    spaceManager.addPermissionToRole(spaceNetworkId, roleId, permission);

    spaceManager.addRoleToEntitlementModule(
      spaceNetworkId,
      address(userGrantedEntitlementModule),
      roleId,
      abi.encode(address(0))
    );

    uint256[] memory roleIds = new uint256[](1);
    roleIds[0] = roleId;
    spaceManager.addRoleIdsToChannel(spaceNetworkId, channelNetworkId, roleIds);

    vm.expectRevert(Errors.RoleAlreadyExists.selector);
    spaceManager.addRoleIdsToChannel(spaceNetworkId, channelNetworkId, roleIds);

    assertTrue(
      spaceManager.isEntitled(spaceNetworkId, "", address(0), permission),
      "address0 user should be entitled to write to space"
    );

    assertTrue(
      spaceManager.isEntitled(
        spaceNetworkId,
        channelNetworkId,
        address(0),
        permission
      ),
      "address0 user should now be entitled to write to channel"
    );

    spaceManager.removeEntitlement(
      spaceNetworkId,
      address(userGrantedEntitlementModule),
      roleId,
      abi.encode(address(0))
    );

    assertFalse(
      spaceManager.isEntitled(
        spaceNetworkId,
        channelNetworkId,
        address(0),
        permission
      )
    );
  }

  function testEntitlement() public {
    string memory spaceName = "test-space";
    string memory spaceNetworkId = "test-network-id";

    createSimpleSpace(spaceName, spaceNetworkId, spaceManager);

    address[] memory entitlements = spaceManager.getEntitlementModulesBySpaceId(
      spaceNetworkId
    );

    assertEq(
      address(entitlements[0]),
      address(userGrantedEntitlementModule),
      "First entitlement module should be user granted"
    );

    DataTypes.Permission memory permission = permissionsRegistry
      .getPermissionByPermissionType(PermissionTypes.Write);

    assertTrue(
      spaceManager.isEntitled(spaceNetworkId, "", address(this), permission),
      "User should be entitled to write"
    );

    assertFalse(
      spaceManager.isEntitled(spaceNetworkId, "", address(0), permission),
      "Zero User should not be entitled to write"
    );

    uint256 roleId = spaceManager.createRole(spaceNetworkId, "test-role");

    spaceManager.addPermissionToRole(spaceNetworkId, roleId, permission);

    spaceManager.addRoleToEntitlementModule(
      spaceNetworkId,
      address(userGrantedEntitlementModule),
      roleId,
      abi.encode(address(0))
    );

    assertTrue(
      spaceManager.isEntitled(spaceNetworkId, "", address(0), permission)
    );

    spaceManager.removeEntitlement(
      spaceNetworkId,
      address(userGrantedEntitlementModule),
      roleId,
      abi.encode(address(0))
    );

    assertFalse(
      spaceManager.isEntitled(spaceNetworkId, "", address(0), permission)
    );
  }

  function testCreateRoleWithEntitlementData() public {
    string memory spaceName = "test-space";
    string memory spaceNetworkId = "test-network-id";
    DataTypes.ExternalTokenEntitlement[] memory tokenEntitlements =
      new DataTypes.ExternalTokenEntitlement[](0);

    createSimpleSpace(spaceName, spaceNetworkId, spaceManager);

    address[] memory entitlements = spaceManager.getEntitlementModulesBySpaceId(
      spaceNetworkId
    );

    assertEq(
      address(entitlements[0]),
      address(userGrantedEntitlementModule),
      "First entitlement module should be user granted"
    );

    DataTypes.Permission memory permission = permissionsRegistry
      .getPermissionByPermissionType(PermissionTypes.Write);
    DataTypes.Permission[] memory permissions = SpaceTestUtils.convertToPermissionArray(permission);

    assertTrue(
      spaceManager.isEntitled(spaceNetworkId, "", address(this), permission),
      "User should be entitled to write"
    );

    assertFalse(
      spaceManager.isEntitled(spaceNetworkId, "", address(0), permission),
      "Zero User should not be entitled to write"
    );

    address[] memory users = new address[](1);
    users[0] = address(0);
    uint256 roleId = spaceManager.createRoleWithEntitlementData(
      spaceNetworkId,
      "test-role",
      permissions,
      tokenEntitlements,
      users
    );

    assertTrue(
      spaceManager.isEntitled(spaceNetworkId, "", address(0), permission),
      "isEntitled should return true for address(0)"
    );

    spaceManager.removeEntitlement(
      spaceNetworkId,
      address(userGrantedEntitlementModule),
      roleId,
      abi.encode(address(0))
    );

    assertFalse(
      spaceManager.isEntitled(spaceNetworkId, "", address(0), permission)
    );
  }
}
