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

    address[] memory newEntitlementModuleAddresses = new address[](0);

    uint256 spaceId = zionSpaceManager.createSpace(
      DataTypes.CreateSpaceData("test", newEntitlementModuleAddresses)
    );

    TokenEntitlementModule tokenEntitlementModule = new TokenEntitlementModule(
      address(zionSpaceManager)
    );

    DataTypes.EntitlementType[]
      memory entitlementTypes = new DataTypes.EntitlementType[](1);
    DataTypes.EntitlementType entitlementType = DataTypes
      .EntitlementType
      .Administrator;
    entitlementTypes[0] = entitlementType;

    zionSpaceManager.addTokenEntitlement(
      spaceId,
      address(tokenEntitlementModule),
      address(nft),
      1,
      "Council NFT",
      entitlementTypes
    );

    address[] memory entitlements = zionSpaceManager.getEntitlementsBySpaceId(
      spaceId
    );

    assertEq(entitlements.length, 2);
    assertEq(entitlements[0], address(userGrantedEntitlementModule));
    assertEq(entitlements[1], address(tokenEntitlementModule));
  }

  function testCreateSpaceWithUserGrantedEntitlement() public {
    address[] memory newEntitlementModuleAddresses = new address[](0);

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
    address[] memory newEntitlementModuleAddresses = new address[](0);

    uint256 spaceId = zionSpaceManager.createSpace(
      DataTypes.CreateSpaceData("test", newEntitlementModuleAddresses)
    );

    address ownerAddress = zionSpaceManager.getSpaceOwnerBySpaceId(spaceId);
    assertEq(ownerAddress, address(this));
  }

  function testCreatorIsEntitledAdmin() public {
    address[] memory newEntitlementModuleAddresses = new address[](0);

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
