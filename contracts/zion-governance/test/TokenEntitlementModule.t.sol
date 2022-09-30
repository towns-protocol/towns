//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.13;
import "forge-std/Test.sol";
import {ZionSpaceManager} from "../contracts/spaces/ZionSpaceManager.sol";
import {Zion} from "../contracts/governance/Zion.sol";
import {CouncilNFT} from "../contracts/council/CouncilNFT.sol";
import {ISpaceManager} from "../contracts/spaces/interfaces/ISpaceManager.sol";
import {DataTypes} from "../contracts/spaces/libraries/DataTypes.sol";
import {TokenEntitlementModule} from "./../contracts/spaces/modules/entitlements/TokenEntitlementModule.sol";
import {UserGrantedEntitlementModule} from "./../contracts/spaces/modules/entitlements/UserGrantedEntitlementModule.sol";
import {DataTypes} from "../contracts/spaces/libraries/DataTypes.sol";
import "murky/Merkle.sol";
import {Constants} from "../contracts/council/libraries/Constants.sol";
import {ZionPermissionsRegistry} from "../contracts/spaces/ZionPermissionsRegistry.sol";
import {PermissionTypes} from "../contracts/spaces/libraries/PermissionTypes.sol";

contract TokenEntitlementModuleTest is Test {
  ZionPermissionsRegistry internal permissionsRegistry;
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

    permissionsRegistry = new ZionPermissionsRegistry();
    spaceManager = new ZionSpaceManager(address(permissionsRegistry));
    userGrantedEntitlementModule = new UserGrantedEntitlementModule(
      "User Granted Entitlement Module",
      "Allows users to grant other users access to spaces and rooms",
      address(spaceManager)
    );

    tokenEntitlementModule = new TokenEntitlementModule(
      "Token Entitlement Module",
      "Allows users to grant other users access to spaces and rooms based on tokens they hold",
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

    DataTypes.Permission memory permission = spaceManager.getPermissionFromMap(
      PermissionTypes.Read
    );
    // Create roles and add permissions
    string memory roleName = "Tester";
    uint256 ownerRoleId = spaceManager.createRole(spaceId, roleName, "#fff");
    spaceManager.addPermissionToRole(spaceId, ownerRoleId, permission);

    spaceManager.whitelistEntitlementModule(
      spaceId,
      address(tokenEntitlementModule),
      true
    );

    // Add token entitlement module to space
    spaceManager.addRoleToEntitlementModule(
      spaceId,
      address(tokenEntitlementModule),
      ownerRoleId,
      abi.encode("ziontoken", address(zion), 10)
    );

    // verify the token entitlement module is added to the space
    address[] memory entitlements = spaceManager.getEntitlementModulesBySpaceId(
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
      permission
    );

    assertTrue(isEntitled);

    bool isRandomEntitled = spaceManager.isEntitled(
      spaceId,
      roomId,
      user2,
      permission
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

    // Create roles and add permissions
    string memory roleName = "Tester";
    uint256 ownerRoleId = spaceManager.createRole(spaceId, roleName, "#fff");
    spaceManager.addPermissionToRole(
      spaceId,
      ownerRoleId,
      spaceManager.getPermissionFromMap(PermissionTypes.Read)
    );

    spaceManager.whitelistEntitlementModule(
      spaceId,
      address(tokenEntitlementModule),
      true
    );

    // Add the token entitlement module to the space
    spaceManager.addRoleToEntitlementModule(
      spaceId,
      address(tokenEntitlementModule),
      ownerRoleId,
      abi.encode("councilnft", address(councilNFT), 1)
    );

    // Verify the token entitlement module is added to the space
    address[] memory entitlements = spaceManager.getEntitlementModulesBySpaceId(
      spaceId
    );
    assertEq(entitlements.length, 2);
    assertEq(entitlements[1], address(tokenEntitlementModule));

    // Verify user1 is a moderator
    bool isEntitled = spaceManager.isEntitled(
      spaceId,
      roomId,
      user1,
      spaceManager.getPermissionFromMap(PermissionTypes.Read)
    );
    assertTrue(isEntitled);

    // Verify user2 is not a moderator
    bool isRandomEntitled = spaceManager.isEntitled(
      spaceId,
      roomId,
      user2,
      spaceManager.getPermissionFromMap(PermissionTypes.Read)
    );
    assertFalse(isRandomEntitled);
  }
}
