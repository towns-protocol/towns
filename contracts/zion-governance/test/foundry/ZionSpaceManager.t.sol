//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.13;
import "forge-std/Test.sol";

import {ZionSpaceManager} from "./../../contracts/spaces/ZionSpaceManager.sol";
import {UserGrantedEntitlementModule} from "./../../contracts/spaces/entitlements/UserGrantedEntitlementModule.sol";
import {DataTypes} from "./../../contracts/spaces/libraries/DataTypes.sol";
import {TokenEntitlementModule} from "./../../contracts/spaces/entitlements/TokenEntitlementModule.sol";
import {CouncilNFT} from "../../contracts/council/CouncilNFT.sol";
import {MerkleHelper} from "./utils/MerkleHelper.sol";
import "murky/Merkle.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract ZionSpaceManagerTest is Test, MerkleHelper {
  ZionSpaceManager internal zionSpaceManager;
  UserGrantedEntitlementModule internal userGrantedEntitlementModule;

  function setUp() public {
    zionSpaceManager = new ZionSpaceManager();

    userGrantedEntitlementModule = new UserGrantedEntitlementModule(
      address(zionSpaceManager)
    );

    zionSpaceManager.registerDefaultEntitlementModule(
      address(userGrantedEntitlementModule),
      "usergranted"
    );
  }

  function testCreateSpaceWithTokenEntitlement() public {
    //initialize the test data
    _initPositionsAllowances();
    bytes32[] memory allowlistData = _generateAllowlistData();

    //generate a merkle root from the allowlisted users test data
    Merkle merkle = new Merkle();
    bytes32 root = merkle.getRoot(allowlistData);

    //deploy the nft
    CouncilNFT nft = new CouncilNFT("Zion", "zion", "baseUri", root);

    address receiver = address(1);

    TokenEntitlementModule tokenEntitlementModule = new TokenEntitlementModule(
      address(zionSpaceManager)
    );

    DataTypes.EntitlementType[]
      memory entitlementTypes = new DataTypes.EntitlementType[](1);
    DataTypes.EntitlementType entitlementType = DataTypes.EntitlementType.Join;
    entitlementTypes[0] = entitlementType;

    vm.prank(address(receiver));
    uint256 spaceId = zionSpaceManager.createSpace(
      DataTypes.CreateSpaceData("test", "matrix-id"),
      DataTypes.CreateSpaceTokenEntitlementData(
        address(tokenEntitlementModule),
        address(nft),
        1,
        "Council NFT",
        entitlementTypes
      )
    );

    address[] memory entitlements = zionSpaceManager.getEntitlementsBySpaceId(
      spaceId
    );

    bool isUserGrantEntitled = zionSpaceManager.isEntitled(
      spaceId,
      0,
      address(receiver),
      DataTypes.EntitlementType.Administrator
    );

    assertTrue(isUserGrantEntitled);

    nft.startPublicMint();

    vm.startPrank(address(receiver));
    vm.deal(address(receiver), 1 ether);
    nft.mint{value: 0.08 ether}(address(receiver));
    vm.stopPrank();

    bool isTokenEntitled = zionSpaceManager.isEntitled(
      spaceId,
      1,
      address(receiver),
      DataTypes.EntitlementType.Join
    );

    assertTrue(isTokenEntitled);

    assertEq(entitlements.length, 2);
    assertEq(entitlements[0], address(userGrantedEntitlementModule));
    assertEq(entitlements[1], address(tokenEntitlementModule));
  }

  function testCreateSpaceWithUserGrantedEntitlement() public {
    uint256 spaceId = zionSpaceManager.createSpace(
      DataTypes.CreateSpaceData("test", "matrix-id")
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
    uint256 spaceId = zionSpaceManager.createSpace(
      DataTypes.CreateSpaceData("test", "matrix-id")
    );

    address ownerAddress = zionSpaceManager.getSpaceOwnerBySpaceId(spaceId);
    assertEq(ownerAddress, address(this));
  }

  function testCreatorIsEntitledAdmin() public {
    uint256 spaceId = zionSpaceManager.createSpace(
      DataTypes.CreateSpaceData("test", "matrix-id")
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
