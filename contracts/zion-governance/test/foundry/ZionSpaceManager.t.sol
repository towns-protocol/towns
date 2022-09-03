//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.13;
import "forge-std/Test.sol";

import {ZionSpaceManager} from "./../../contracts/spaces/ZionSpaceManager.sol";
import {UserGrantedEntitlementModule} from "./../../contracts/spaces/entitlements/UserGrantedEntitlementModule.sol";
import {DataTypes} from "./../../contracts/spaces/libraries/DataTypes.sol";

contract ZionSpaceManagerTest is Test {
  ZionSpaceManager internal zionSpaceManager;
  UserGrantedEntitlementModule internal userGrantedEntitlementModule;

  function setUp() public {
    zionSpaceManager = new ZionSpaceManager();

    userGrantedEntitlementModule = new UserGrantedEntitlementModule(
      address(zionSpaceManager)
    );
  }

  function testCreateSpaceWithUserGrantedEntitlement() public {
    address[] memory newEntitlementModuleAddresses = new address[](1);
    newEntitlementModuleAddresses[0] = address(userGrantedEntitlementModule);

    uint256 spaceId = zionSpaceManager.createSpace(
      DataTypes.CreateSpaceData("test", newEntitlementModuleAddresses)
    );

    DataTypes.SpaceInfo memory info = zionSpaceManager.getSpaceInfoBySpaceId(
      spaceId
    );

    address[] memory entitlements = zionSpaceManager.getEntitlementsBySpaceId(
      spaceId
    );

    DataTypes.SpaceInfo[] memory spaces = zionSpaceManager.getSpaces();

    assertEq(spaces.length, 1);
    assertEq(spaces[0].name, "test");
    assertEq(spaces[0].spaceId, spaceId);
    assertEq(info.name, "test");
    assertEq(entitlements.length, 1);
    assertEq(entitlements[0], address(userGrantedEntitlementModule));
  }

  function testCreatorIsSpaceOwner() public {
    address[] memory newEntitlementModuleAddresses = new address[](1);
    newEntitlementModuleAddresses[0] = address(userGrantedEntitlementModule);

    uint256 spaceId = zionSpaceManager.createSpace(
      DataTypes.CreateSpaceData("test", newEntitlementModuleAddresses)
    );

    address ownerAddress = zionSpaceManager.getSpaceOwnerBySpaceId(spaceId);
    assertEq(ownerAddress, address(this));
  }

  function testCreatorIsEntitledAdmin() public {
    address[] memory newEntitlementModuleAddresses = new address[](1);
    newEntitlementModuleAddresses[0] = address(userGrantedEntitlementModule);
    uint256 spaceId = zionSpaceManager.createSpace(
      DataTypes.CreateSpaceData("test", newEntitlementModuleAddresses)
    );

    assertTrue(
      zionSpaceManager.isEntitled(
        spaceId,
        0,
        address(this),
        DataTypes.EntitlementType.Administrator
      )
    );

    assertFalse(
      zionSpaceManager.isEntitled(
        spaceId,
        0,
        address(8),
        DataTypes.EntitlementType.Administrator
      )
    );
  }
}
