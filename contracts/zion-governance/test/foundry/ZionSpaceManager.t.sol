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
import {Events} from "./../../contracts/spaces/libraries/Events.sol";
import {Errors} from "./../../contracts/spaces/libraries/Errors.sol";

contract ZionSpaceManagerTest is Test, MerkleHelper {
  ZionSpaceManager internal zionSpaceManager;
  UserGrantedEntitlementModule internal userGrantedEntitlementModule;

  function setUp() public {
    zionSpaceManager = new ZionSpaceManager();

    userGrantedEntitlementModule = new UserGrantedEntitlementModule(
      "User Granted Entitlement Module",
      "Allows users to grant other users access to spaces and rooms",
      address(zionSpaceManager)
    );

    zionSpaceManager.registerDefaultEntitlementModule(
      address(userGrantedEntitlementModule)
    );
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
    address ownerAddress = zionSpaceManager.getSpaceOwnerBySpaceId(spaceId);

    assertEq(spaces.length, 1);
    assertEq(spaces[0].name, "test");
    assertEq(spaces[0].spaceId, spaceId);
    assertEq(info.name, "test");
    assertEq(entitlements.length, 1);
    assertEq(entitlements[0], address(userGrantedEntitlementModule));
    assertEq(ownerAddress, address(this));
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
      "Token Entitlement Module",
      "Allows users to grant other users access to spaces and rooms based on tokens they hold",
      address(zionSpaceManager)
    );

    DataTypes.EntitlementType[]
      memory entitlementTypes = new DataTypes.EntitlementType[](1);
    entitlementTypes[0] = DataTypes.EntitlementType.Join;

    vm.prank(address(receiver));
    uint256 spaceId = zionSpaceManager.createSpaceWithTokenEntitlement(
      DataTypes.CreateSpaceData("test", "matrix-id"),
      DataTypes.CreateSpaceTokenEntitlementData(
        address(tokenEntitlementModule),
        address(nft),
        1,
        "Council NFT",
        entitlementTypes
      )
    );

    // address[] memory entitlements = zionSpaceManager.getEntitlementsBySpaceId(
    //   spaceId
    // );

    DataTypes.EntitlementModuleInfo[] memory entitlements = zionSpaceManager
      .getEntitlementsInfoBySpaceId(spaceId);

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
    assertEq(
      entitlements[0].entitlementAddress,
      address(userGrantedEntitlementModule)
    );
    assertEq(
      entitlements[1].entitlementAddress,
      address(tokenEntitlementModule)
    );
  }

  function testSetNetworkIdToSpaceId() public {
    uint256 spaceId = zionSpaceManager.createSpace(
      DataTypes.CreateSpaceData("test", "initial-network-id")
    );

    zionSpaceManager.setNetworkIdToSpaceId(spaceId, "test-network-id");

    uint256 spaceIdByNetworkId = zionSpaceManager.getSpaceIdByNetworkId(
      "test-network-id"
    );

    assertEq(spaceIdByNetworkId, spaceId);
  }

  function testRegisterDefaultEntitlementModule() public {
    vm.expectEmit(true, false, false, false);
    emit Events.DefaultEntitlementSet(address(userGrantedEntitlementModule));

    zionSpaceManager.registerDefaultEntitlementModule(
      address(userGrantedEntitlementModule)
    );
  }

  function testWhitelistEntitlementModule() public {
    uint256 spaceId = zionSpaceManager.createSpace(
      DataTypes.CreateSpaceData("test", "initial-network-id")
    );

    TokenEntitlementModule tokenEntitlementModule = new TokenEntitlementModule(
      "Token Entitlement Module",
      "Allows users to grant other users access to spaces and rooms based on tokens they hold",
      address(zionSpaceManager)
    );

    zionSpaceManager.whitelistEntitlementModule(
      spaceId,
      address(tokenEntitlementModule)
    );

    address[] memory entitlements = zionSpaceManager.getEntitlementsBySpaceId(
      spaceId
    );

    assertEq(entitlements.length, 2);
    assertEq(entitlements[0], address(userGrantedEntitlementModule));
    assertEq(entitlements[1], address(tokenEntitlementModule));
    assertTrue(
      zionSpaceManager.isEntitlementModuleWhitelisted(
        spaceId,
        address(tokenEntitlementModule)
      )
    );
  }

  function testRegisterEntitlementModuleWithoutWhitelist() public {
    //deploy the nft
    CouncilNFT nft = new CouncilNFT("Zion", "zion", "baseUri", "");

    uint256 spaceId = zionSpaceManager.createSpace(
      DataTypes.CreateSpaceData("test", "initial-network-id")
    );

    TokenEntitlementModule tokenEntitlementModule = new TokenEntitlementModule(
      "Token Entitlement Module",
      "Allows users to grant other users access to spaces and rooms based on tokens they hold",
      address(zionSpaceManager)
    );

    DataTypes.EntitlementType[]
      memory entitlements = new DataTypes.EntitlementType[](1);
    entitlements[0] = DataTypes.EntitlementType.Join;

    address[] memory tokens = new address[](1);
    uint256[] memory quantities = new uint256[](1);

    tokens[0] = address(nft);
    quantities[0] = 1;

    vm.expectRevert(Errors.EntitlementNotWhitelisted.selector);
    zionSpaceManager.registerEntitlementWithEntitlementModule(
      spaceId,
      address(tokenEntitlementModule),
      entitlements,
      abi.encode("sample description", tokens, quantities)
    );

    zionSpaceManager.whitelistEntitlementModule(
      spaceId,
      address(tokenEntitlementModule)
    );

    zionSpaceManager.registerEntitlementWithEntitlementModule(
      spaceId,
      address(tokenEntitlementModule),
      entitlements,
      abi.encode("sample description", tokens, quantities)
    );

    address[] memory entitlementsBySpaceId = zionSpaceManager
      .getEntitlementsBySpaceId(spaceId);

    assertEq(entitlementsBySpaceId.length, 2);
  }

  function testAddingEntitlementModuleThatIsAlreadyWhitelist() public {
    uint256 spaceId = zionSpaceManager.createSpace(
      DataTypes.CreateSpaceData("test", "matrix-id")
    );

    DataTypes.EntitlementType[]
      memory entitlementTypes = new DataTypes.EntitlementType[](1);
    entitlementTypes[0] = DataTypes.EntitlementType.Administrator;

    vm.expectRevert(Errors.EntitlementAlreadyRegistered.selector);
    zionSpaceManager.addEntitlement(
      spaceId,
      address(userGrantedEntitlementModule),
      entitlementTypes,
      abi.encode(address(this))
    );
  }
}
