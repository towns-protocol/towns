//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.13;
import "forge-std/Test.sol";
import {ZionSpaceManager} from "../contracts/spaces/ZionSpaceManager.sol";
import {Zion} from "../contracts/governance/Zion.sol";
import {ISpaceManager} from "../contracts/spaces/interfaces/ISpaceManager.sol";
import {CouncilNFT} from "../contracts/council/CouncilNFT.sol";
import {UserGrantedEntitlementModule} from "../contracts/spaces/modules/entitlements/UserGrantedEntitlementModule.sol";
import {PurchasableEntitlementModule} from "../contracts/spaces/modules/entitlements/PurchasableEntitlementModule.sol";
import {DataTypes} from "../contracts/spaces/libraries/DataTypes.sol";
import {Constants} from "../contracts/council/libraries/Constants.sol";
import {ZionPermissionsRegistry} from "../contracts/spaces/ZionPermissionsRegistry.sol";
import {PermissionTypes} from "../contracts/spaces/libraries/PermissionTypes.sol";
import "murky/Merkle.sol";

contract PurchasableEntitlementModuleTest is Test {
  ZionPermissionsRegistry internal permissionsRegistry;
  ZionSpaceManager internal spaceManager;
  Zion internal zion;
  UserGrantedEntitlementModule internal userGrantedEntitlementModule;
  PurchasableEntitlementModule internal purchasableEntitlementModule;
  CouncilNFT internal councilNFT;

  address payable user1;
  address user2;

  function setUp() public {
    zion = new Zion();

    user1 = payable(address(2));
    user2 = address(0x1234);

    permissionsRegistry = new ZionPermissionsRegistry();
    spaceManager = new ZionSpaceManager(address(permissionsRegistry));
    userGrantedEntitlementModule = new UserGrantedEntitlementModule(
      "User Granted Entitlement Module",
      "Allows users to grant other users access to spaces and rooms",
      address(spaceManager)
    );

    purchasableEntitlementModule = new PurchasableEntitlementModule(
      "Purchasable Entitlement Module",
      "Allows users to grant other users access to spaces and rooms based on payments made to the space",
      address(spaceManager)
    );

    spaceManager.registerDefaultEntitlementModule(
      address(userGrantedEntitlementModule)
    );
  }

  function createTestSpaceWithUserGrantedEntitlementModule(
    string memory spaceName
  ) private returns (uint256) {
    return
      spaceManager.createSpace(
        DataTypes.CreateSpaceData(spaceName, "network-id")
      );
  }

  function testPurchaseEntitlement() public {
    string memory spaceName = "test-space";
    uint256 roomId = 0;

    // create a space with the default user granted entitlement module
    uint256 spaceId = createTestSpaceWithUserGrantedEntitlementModule(
      spaceName
    );

    DataTypes.Permission memory allPermission = spaceManager
      .getPermissionFromMap(PermissionTypes.Read);

    // Create roles and add permissions
    string memory roleName = "Tester";
    uint256 ownerRoleId = spaceManager.createRole(spaceId, roleName, "#fff");
    spaceManager.addPermissionToRole(spaceId, ownerRoleId, allPermission);

    string memory description = "Purchase the entitlement to be a moderator";
    uint256 value = .08 ether;
    string memory tag = "buy-moderator";

    spaceManager.whitelistEntitlementModule(
      spaceId,
      address(purchasableEntitlementModule),
      true
    );

    // Add purchasable entitlement module to space
    spaceManager.addRoleToEntitlementModule(
      spaceId,
      address(purchasableEntitlementModule),
      ownerRoleId,
      abi.encode(description, value, tag)
    );

    // verify the purchasable entitlement module is added to the space
    address[] memory entitlements = spaceManager.getEntitlementModulesBySpaceId(
      spaceId
    );
    assertEq(entitlements.length, 2);
    assertEq(entitlements[1], address(purchasableEntitlementModule));

    // purchase the entitlement
    vm.startPrank(user1);
    vm.deal(user1, 5 ether);
    purchasableEntitlementModule.purchaseEntitlement{value: .08 ether}(
      spaceId,
      "buy-moderator"
    );
    vm.stopPrank();

    // verify the user tht has the entitelment is entitled
    bool isEntitled = spaceManager.isEntitled(
      spaceId,
      roomId,
      user1,
      allPermission
    );

    assertTrue(isEntitled);

    // verify the random user isnt entitled
    bool isRandomEntitled = spaceManager.isEntitled(
      spaceId,
      roomId,
      user2,
      allPermission
    );

    assertFalse(isRandomEntitled);

    //disable the entitlement and verify the user is now no longer entitled
    purchasableEntitlementModule.disablePurchasableEntitlement(
      spaceId,
      "buy-moderator"
    );
    bool isStillEntitled = spaceManager.isEntitled(
      spaceId,
      roomId,
      user1,
      allPermission
    );

    assertFalse(isStillEntitled);

    uint256 balance = purchasableEntitlementModule.withdrawValue(spaceId);
    assertEq(balance, .08 ether);
    assertGt(address(this).balance, .07 ether);
  }

  receive() external payable {}
}
