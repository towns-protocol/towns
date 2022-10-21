// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import {ISpaceManager} from "../src/spaces/interfaces/ISpaceManager.sol";
import {ZionSpaceManager} from "../src/spaces/ZionSpaceManager.sol";
import {UserGrantedEntitlementModule} from "./../src/spaces/modules/entitlements/UserGrantedEntitlementModule.sol";
import {DataTypes} from "../src/spaces/libraries/DataTypes.sol";
import "murky/Merkle.sol";
import {Constants} from "../src/council/libraries/Constants.sol";
import {ZionPermissionsRegistry} from "../src/spaces/ZionPermissionsRegistry.sol";
import {PermissionTypes} from "../src/spaces/libraries/PermissionTypes.sol";

contract UserGrantedEntitlemtModuleTest is Test {
  ZionPermissionsRegistry internal _permissionsRegistry;
  ZionSpaceManager internal _spaceManager;
  UserGrantedEntitlementModule internal _userGranted;

  function setUp() public {
    _permissionsRegistry = new ZionPermissionsRegistry();
    _spaceManager = new ZionSpaceManager(address(_permissionsRegistry));

    _userGranted = new UserGrantedEntitlementModule(
      "User Granted Entitlement Module",
      "Allows users to grant other users access to spaces and rooms",
      address(_spaceManager)
    );

    _spaceManager.setDefaultEntitlementModule(address(_userGranted));
  }

  function testEntitlementWithChannel() public {
    string memory spaceName = "test-space";
    string memory spaceNetworkId = "test-network-id";

    string memory channelName = "test-channel";
    string memory channelNetworkId = "test-channel-network-id";

    _spaceManager.createSpace(
      DataTypes.CreateSpaceData(spaceName, spaceNetworkId)
    );

    DataTypes.CreateRoleData memory role;

    _spaceManager.createChannel(
      DataTypes.CreateChannelData(
        spaceNetworkId,
        channelName,
        channelNetworkId
      ),
      role
    );

    address[] memory entitlements = _spaceManager
      .getEntitlementModulesBySpaceId(spaceNetworkId);

    assertEq(address(entitlements[0]), address(_userGranted));

    DataTypes.Permission memory permission = _spaceManager.getPermissionFromMap(
      PermissionTypes.Write
    );

    assertTrue(
      _spaceManager.isEntitled(spaceNetworkId, "", address(this), permission)
    );

    assertFalse(
      _spaceManager.isEntitled(spaceNetworkId, "", address(0), permission)
    );

    uint256 roleId = _spaceManager.createRole(spaceNetworkId, "test-role");

    _spaceManager.addPermissionToRole(spaceNetworkId, roleId, permission);

    _spaceManager.addRoleToEntitlementModule(
      spaceNetworkId,
      channelNetworkId,
      address(_userGranted),
      roleId,
      abi.encode(address(0))
    );

    assertTrue(
      _spaceManager.isEntitled(
        spaceNetworkId,
        channelNetworkId,
        address(0),
        permission
      )
    );

    uint256[] memory roles = new uint256[](1);
    roles[0] = roleId;

    _spaceManager.removeEntitlement(
      spaceNetworkId,
      channelNetworkId,
      address(_userGranted),
      roles,
      abi.encode(address(0))
    );

    assertFalse(
      _spaceManager.isEntitled(
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

    _spaceManager.createSpace(
      DataTypes.CreateSpaceData(spaceName, spaceNetworkId)
    );

    address[] memory entitlements = _spaceManager
      .getEntitlementModulesBySpaceId(spaceNetworkId);

    assertEq(address(entitlements[0]), address(_userGranted));

    DataTypes.Permission memory permission = _spaceManager.getPermissionFromMap(
      PermissionTypes.Write
    );

    assertTrue(
      _spaceManager.isEntitled(spaceNetworkId, "", address(this), permission)
    );

    assertFalse(
      _spaceManager.isEntitled(spaceNetworkId, "", address(0), permission)
    );

    uint256 roleId = _spaceManager.createRole(spaceNetworkId, "test-role");

    _spaceManager.addPermissionToRole(spaceNetworkId, roleId, permission);

    _spaceManager.addRoleToEntitlementModule(
      spaceNetworkId,
      "",
      address(_userGranted),
      roleId,
      abi.encode(address(0))
    );

    assertTrue(
      _spaceManager.isEntitled(spaceNetworkId, "", address(0), permission)
    );

    uint256[] memory roles = new uint256[](1);
    roles[0] = roleId;

    _spaceManager.removeEntitlement(
      spaceNetworkId,
      "",
      address(_userGranted),
      roles,
      abi.encode(address(0))
    );

    assertFalse(
      _spaceManager.isEntitled(spaceNetworkId, "", address(0), permission)
    );
  }
}
