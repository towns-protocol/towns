//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.13;
import "forge-std/Test.sol";
import {ZionSpaceManager} from "../../contracts/spaces/ZionSpaceManager.sol";
import {Zion} from "../../contracts/governance/Zion.sol";
import {CouncilNFT} from "../../contracts/council/CouncilNFT.sol";
import {UserGrantedEntitlementModule} from "../../contracts/spaces/entitlements/UserGrantedEntitlementModule.sol";
import {DataTypes} from "../../contracts/spaces/libraries/DataTypes.sol";
import {PurchasableEntitlementModule} from "../../contracts/spaces/entitlements/PurchasableEntitlementModule.sol";
import {DataTypes} from "../../contracts/spaces/libraries/DataTypes.sol";
import "murky/Merkle.sol";
import {Constants} from "../../contracts/council/libraries/Constants.sol";

contract PurchasableEntitlementModuleTest is Test {
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

    spaceManager = new ZionSpaceManager();
    userGrantedEntitlementModule = new UserGrantedEntitlementModule(
      address(spaceManager)
    );

    purchasableEntitlementModule = new PurchasableEntitlementModule(
      address(spaceManager)
    );

    spaceManager.registerDefaultEntitlementModule(
      address(userGrantedEntitlementModule),
      "usergranted"
    );
  }

  function createTestSpaceWithUserGrantedEntitlementModule(
    string memory spaceName
  ) private returns (uint256) {
    address[] memory newEntitlementModuleAddresses = new address[](0);

    return
      spaceManager.createSpace(
        DataTypes.CreateSpaceData(spaceName, newEntitlementModuleAddresses)
      );
  }

  function testPurchaseEntitlement() public {
    string memory spaceName = "test-space";
    uint256 roomId = 0;

    // create a space with the default user granted entitlement module
    uint256 spaceId = createTestSpaceWithUserGrantedEntitlementModule(
      spaceName
    );

    DataTypes.EntitlementType[]
      memory entitlementTypes = new DataTypes.EntitlementType[](1);
    DataTypes.EntitlementType entitlementType = DataTypes
      .EntitlementType
      .Moderator;
    entitlementTypes[0] = entitlementType;

    string memory description = "Purchase the entitlement to be a moderator";
    uint256 value = .08 ether;
    string memory tag = "buy-moderator";

    // Add purchasable entitlement module to space
    spaceManager.addEntitlementModule(
      spaceId,
      address(purchasableEntitlementModule),
      "purchasable",
      entitlementTypes,
      abi.encode(description, value, tag)
    );

    // verify the purchasable entitlement module is added to the space
    address[] memory entitlements = spaceManager.getEntitlementsBySpaceId(
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
      entitlementType
    );

    assertTrue(isEntitled);

    // verify the random user isnt entitled
    bool isRandomEntitled = spaceManager.isEntitled(
      spaceId,
      roomId,
      user2,
      entitlementType
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
      entitlementType
    );

    assertFalse(isStillEntitled);

    uint256 balance = purchasableEntitlementModule.withdrawValue(spaceId);
    assertEq(balance, .08 ether);
    assertGt(address(this).balance, .07 ether);
  }

  receive() external payable {}
}
