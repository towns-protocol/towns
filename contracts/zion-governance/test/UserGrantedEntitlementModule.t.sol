// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import {ISpaceManager} from "../src/spaces/interfaces/ISpaceManager.sol";
import {ZionSpaceManager} from "../src/spaces/ZionSpaceManager.sol";
import {UserGrantedEntitlementModule} from "./../src/spaces/modules/entitlements/UserGrantedEntitlementModule.sol";
import {DataTypes} from "../src/spaces/libraries/DataTypes.sol";
import "murky/Merkle.sol";
import {ZionPermissionsRegistry} from "../src/spaces/ZionPermissionsRegistry.sol";
import {PermissionTypes} from "../src/spaces/libraries/PermissionTypes.sol";
import {ZionSpace} from "./../src/spaces/nft/ZionSpace.sol";
import {TokenEntitlementModule} from "./../src/spaces/modules/entitlements/TokenEntitlementModule.sol";
import {ZionRoleManager} from "./../src/spaces/ZionRoleManager.sol";
import {BaseSetup} from "./BaseSetup.sol";
import {SpaceTestUtils} from "./utils/SpaceTestUtils.sol";

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

    spaceManager.createChannel(
      DataTypes.CreateChannelData(spaceNetworkId, channelName, channelNetworkId)
    );

    address[] memory entitlements = spaceManager.getEntitlementModulesBySpaceId(
      spaceNetworkId
    );

    assertEq(address(entitlements[0]), address(userGrantedEntitlementModule));

    DataTypes.Permission memory permission = spaceManager.getPermissionFromMap(
      PermissionTypes.Write
    );

    assertTrue(
      spaceManager.isEntitled(spaceNetworkId, "", address(this), permission)
    );

    assertFalse(
      spaceManager.isEntitled(spaceNetworkId, "", address(0), permission)
    );

    uint256 roleId = spaceManager.createRole(spaceNetworkId, "test-role");

    spaceManager.addPermissionToRole(spaceNetworkId, roleId, permission);

    spaceManager.addRoleToEntitlementModule(
      spaceNetworkId,
      channelNetworkId,
      address(userGrantedEntitlementModule),
      roleId,
      abi.encode(address(0))
    );

    assertTrue(
      spaceManager.isEntitled(
        spaceNetworkId,
        channelNetworkId,
        address(0),
        permission
      )
    );

    uint256[] memory roles = new uint256[](1);
    roles[0] = roleId;

    spaceManager.removeEntitlement(
      spaceNetworkId,
      channelNetworkId,
      address(userGrantedEntitlementModule),
      roles,
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

    DataTypes.Permission memory permission = spaceManager.getPermissionFromMap(
      PermissionTypes.Write
    );

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
      "",
      address(userGrantedEntitlementModule),
      roleId,
      abi.encode(address(0))
    );

    assertTrue(
      spaceManager.isEntitled(spaceNetworkId, "", address(0), permission)
    );

    uint256[] memory roles = new uint256[](1);
    roles[0] = roleId;

    spaceManager.removeEntitlement(
      spaceNetworkId,
      "",
      address(userGrantedEntitlementModule),
      roles,
      abi.encode(address(0))
    );

    assertFalse(
      spaceManager.isEntitled(spaceNetworkId, "", address(0), permission)
    );
  }
}
