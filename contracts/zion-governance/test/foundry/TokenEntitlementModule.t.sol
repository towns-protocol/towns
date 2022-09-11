//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.13;
import "forge-std/Test.sol";
import {ZionSpaceManager} from "../../contracts/spaces/ZionSpaceManager.sol";
import {Zion} from "../../contracts/governance/Zion.sol";
import {CouncilNFT} from "../../contracts/council/CouncilNFT.sol";
import {UserGrantedEntitlementModule} from "../../contracts/spaces/entitlements/UserGrantedEntitlementModule.sol";
import {DataTypes} from "../../contracts/spaces/libraries/DataTypes.sol";
import {TokenEntitlementModule} from "../../contracts/spaces/entitlements/TokenEntitlementModule.sol";
import {DataTypes} from "../../contracts/spaces/libraries/DataTypes.sol";
import "murky/Merkle.sol";
import {Constants} from "../../contracts/council/libraries/Constants.sol";

contract TokenEntitlementModuleTest is Test {
  ZionSpaceManager internal spaceManager;
  Zion internal zion;
  UserGrantedEntitlementModule internal userGrantedEntitlementModule;
  TokenEntitlementModule internal tokenEntitlementModule;
  CouncilNFT internal councilNFT;

  address user1;
  address user2;

  function setUp() public {
    zion = new Zion();

    user1 = address(2);
    user2 = address(0x1234);
    bytes32[] memory data = new bytes32[](4);
    data[0] = keccak256(abi.encodePacked(user1, "1"));
    Merkle m = new Merkle();
    bytes32 root = m.getRoot(data);

    councilNFT = new CouncilNFT("Zion", "zion", "baseURI", root);
    councilNFT.startPublicMint();

    spaceManager = new ZionSpaceManager();
    userGrantedEntitlementModule = new UserGrantedEntitlementModule(
      address(spaceManager)
    );
    tokenEntitlementModule = new TokenEntitlementModule(address(spaceManager));

    spaceManager.registerDefaultEntitlementModule(
      address(userGrantedEntitlementModule),
      "usergranted"
    );
  }

  function createTestSpaceWithUserGrantedEntitlementModule(
    string memory spaceName
  ) private returns (uint256) {
    return
      spaceManager.createSpace(
        DataTypes.CreateSpaceData(spaceName, "matrix-id")
      );
  }

  function transferZionToken(address _to, uint256 quantity) private {
    zion.transfer(_to, quantity);
  }

  function testERC20TokenEntitlement() public {
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

    // add token entitlement so zion token holders to be mods
    address[] memory tokens = new address[](1);
    tokens[0] = address(zion);

    uint256[] memory quantities = new uint256[](1);
    quantities[0] = 10;

    // Add token entitlement module to space
    spaceManager.addEntitlement(
      spaceId,
      address(tokenEntitlementModule),
      "token",
      entitlementTypes,
      abi.encode("ziontoken", tokens, quantities)
    );

    // verify the token entitlement module is added to the space
    address[] memory entitlements = spaceManager.getEntitlementsBySpaceId(
      spaceId
    );
    assertEq(entitlements.length, 2);
    assertEq(entitlements[1], address(tokenEntitlementModule));

    // transfer tokens
    transferZionToken(user1, 100);

    bool isEntitled = spaceManager.isEntitled(
      spaceId,
      roomId,
      user1,
      entitlementType
    );

    assertTrue(isEntitled);

    bool isRandomEntitled = spaceManager.isEntitled(
      spaceId,
      roomId,
      user2,
      entitlementType
    );

    assertFalse(isRandomEntitled);
  }

  function testERC721TokenEntitlement() public {
    // Create a space with the user granted entitlement module
    string memory spaceName = "test-space";
    uint256 roomId = 0;
    uint256 spaceId = createTestSpaceWithUserGrantedEntitlementModule(
      spaceName
    );

    // Transfer token to user1
    councilNFT.mint{value: Constants.MINT_PRICE}(user1);

    // Add token entitlement so zion token holders to be mods
    address[] memory tokens = new address[](1);
    tokens[0] = address(councilNFT);

    uint256[] memory quantities = new uint256[](1);
    quantities[0] = 1;

    DataTypes.EntitlementType[]
      memory entitlementTypes = new DataTypes.EntitlementType[](1);
    DataTypes.EntitlementType entitlementType = DataTypes
      .EntitlementType
      .Moderator;
    entitlementTypes[0] = entitlementType;

    // Add the token entitlement module to the space
    spaceManager.addEntitlement(
      spaceId,
      address(tokenEntitlementModule),
      "token",
      entitlementTypes,
      abi.encode("councilnft", tokens, quantities)
    );

    // Verify the token entitlement module is added to the space
    address[] memory entitlements = spaceManager.getEntitlementsBySpaceId(
      spaceId
    );
    assertEq(entitlements.length, 2);
    assertEq(entitlements[1], address(tokenEntitlementModule));

    // Verify user1 is a moderator
    bool isEntitled = spaceManager.isEntitled(
      spaceId,
      roomId,
      user1,
      entitlementType
    );
    assertTrue(isEntitled);

    // Verify user2 is not a moderator
    bool isRandomEntitled = spaceManager.isEntitled(
      spaceId,
      roomId,
      user2,
      entitlementType
    );
    assertFalse(isRandomEntitled);
  }
}
