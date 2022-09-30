//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.13;
import "forge-std/Test.sol";

import {ZionSpaceManager} from "./../contracts/spaces/ZionSpaceManager.sol";
import {ISpaceManager} from "../contracts/spaces/interfaces/ISpaceManager.sol";
import {DataTypes} from "./../contracts/spaces/libraries/DataTypes.sol";
import {CouncilNFT} from "../contracts/council/CouncilNFT.sol";
import {MerkleHelper} from "./utils/MerkleHelper.sol";
import "murky/Merkle.sol";
import "openzeppelin-contracts/contracts/token/ERC721/IERC721Receiver.sol";
import {Events} from "./../contracts/spaces/libraries/Events.sol";
import {Errors} from "./../contracts/spaces/libraries/Errors.sol";
import {TokenEntitlementModule} from "./../contracts/spaces/modules/entitlements/TokenEntitlementModule.sol";
import {UserGrantedEntitlementModule} from "./../contracts/spaces/modules/entitlements/UserGrantedEntitlementModule.sol";
import {ZionPermissionsRegistry} from "./../contracts/spaces/ZionPermissionsRegistry.sol";
import {PermissionTypes} from "./../contracts/spaces/libraries/PermissionTypes.sol";

contract ZionSpaceManagerTest is Test, MerkleHelper {
  ZionSpaceManager internal spaceManager;
  ZionPermissionsRegistry internal permissionsRegistry;
  UserGrantedEntitlementModule internal userGrantedEntitlementModule;

  function setUp() public {
    permissionsRegistry = new ZionPermissionsRegistry();
    spaceManager = new ZionSpaceManager(address(permissionsRegistry));

    userGrantedEntitlementModule = new UserGrantedEntitlementModule(
      "User Granted Entitlement Module",
      "Allows users to grant other users access to spaces and rooms",
      address(spaceManager)
    );

    spaceManager.registerDefaultEntitlementModule(
      address(userGrantedEntitlementModule)
    );
  }

  function testCreateSpaceWithUserGrantedEntitlement() public {
    uint256 spaceId = spaceManager.createSpace(
      DataTypes.CreateSpaceData("test", "matrix-id")
    );

    DataTypes.SpaceInfo memory info = spaceManager.getSpaceInfoBySpaceId(
      spaceId
    );

    address[] memory entitlements = spaceManager.getEntitlementModulesBySpaceId(
      spaceId
    );

    DataTypes.SpaceInfo[] memory spaces = spaceManager.getSpaces();
    address ownerAddress = spaceManager.getSpaceOwnerBySpaceId(spaceId);

    assertEq(spaces.length, 1);
    assertEq(spaces[0].name, "test");
    assertEq(spaces[0].spaceId, spaceId);
    assertEq(info.name, "test");
    assertEq(entitlements.length, 1);
    assertEq(entitlements[0], address(userGrantedEntitlementModule));
    assertEq(ownerAddress, address(this));
    assertEq(spaceManager.getSpaceIdByNetworkId("matrix-id"), spaceId);
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
      address(spaceManager)
    );

    DataTypes.Permission memory joinPermission = spaceManager
      .getPermissionFromMap(PermissionTypes.Read);

    string[] memory permissions = new string[](1);
    permissions[0] = joinPermission.name;

    vm.prank(address(receiver));
    uint256 spaceId = spaceManager.createSpaceWithTokenEntitlement(
      DataTypes.CreateSpaceData("test", "matrix-id"),
      DataTypes.CreateSpaceTokenEntitlementData(
        address(tokenEntitlementModule),
        address(nft),
        1,
        "Council NFT",
        permissions
      )
    );

    address[] memory entitlementModules = spaceManager
      .getEntitlementModulesBySpaceId(spaceId);

    bool isUserGrantEntitled = spaceManager.isEntitled(
      spaceId,
      0,
      address(receiver),
      joinPermission
    );

    assertTrue(isUserGrantEntitled);

    nft.startPublicMint();

    vm.startPrank(address(receiver));
    vm.deal(address(receiver), 1 ether);
    nft.mint{value: 0.08 ether}(address(receiver));
    vm.stopPrank();

    bool isTokenEntitled = spaceManager.isEntitled(
      spaceId,
      1,
      address(receiver),
      joinPermission
    );

    assertTrue(isTokenEntitled);

    assertEq(entitlementModules.length, 2);
    assertEq(entitlementModules[0], address(userGrantedEntitlementModule));
    assertEq(entitlementModules[1], address(tokenEntitlementModule));
  }

  function testSetNetworkIdToSpaceId() public {
    uint256 spaceId = spaceManager.createSpace(
      DataTypes.CreateSpaceData("test", "initial-network-id")
    );

    uint256 spaceIdByNetworkId = spaceManager.getSpaceIdByNetworkId(
      "initial-network-id"
    );

    assertEq(spaceIdByNetworkId, spaceId);
  }

  function testRegisterDefaultEntitlementModule() public {
    vm.expectEmit(true, false, false, false);
    emit Events.DefaultEntitlementSet(address(userGrantedEntitlementModule));

    spaceManager.registerDefaultEntitlementModule(
      address(userGrantedEntitlementModule)
    );
  }

  function testWhitelistEntitlementModule() public {
    uint256 spaceId = spaceManager.createSpace(
      DataTypes.CreateSpaceData("test", "initial-network-id")
    );
    TokenEntitlementModule tokenEntitlementModule = new TokenEntitlementModule(
      "Token Entitlement Module",
      "Allows users to grant other users access to spaces and rooms based on tokens they hold",
      address(spaceManager)
    );
    spaceManager.whitelistEntitlementModule(
      spaceId,
      address(tokenEntitlementModule),
      true
    );
    address[] memory entitlements = spaceManager.getEntitlementModulesBySpaceId(
      spaceId
    );
    assertEq(entitlements.length, 2);
    assertEq(entitlements[0], address(userGrantedEntitlementModule));
    assertEq(entitlements[1], address(tokenEntitlementModule));
    assertTrue(
      spaceManager.isEntitlementModuleWhitelisted(
        spaceId,
        address(tokenEntitlementModule)
      )
    );
  }

  function testRegisterEntitlementModuleWithoutWhitelist() public {
    //deploy the nft
    CouncilNFT nft = new CouncilNFT("Zion", "zion", "baseUri", "");

    uint256 spaceId = spaceManager.createSpace(
      DataTypes.CreateSpaceData("test", "initial-network-id")
    );

    TokenEntitlementModule tokenEntitlementModule = new TokenEntitlementModule(
      "Token Entitlement Module",
      "Allows users to grant other users access to spaces and rooms based on tokens they hold",
      address(spaceManager)
    );

    DataTypes.Permission memory joinPermission = spaceManager
      .getPermissionFromMap(PermissionTypes.Read);
    // Create roles and add permissions
    string memory roleName = "Joiner";
    uint256 ownerRoleId = spaceManager.createRole(spaceId, roleName, "#fff");
    spaceManager.addPermissionToRole(spaceId, ownerRoleId, joinPermission);

    vm.expectRevert(Errors.EntitlementNotWhitelisted.selector);
    spaceManager.addRoleToEntitlementModule(
      spaceId,
      address(tokenEntitlementModule),
      ownerRoleId,
      abi.encode("sample description", address(nft), 1)
    );

    spaceManager.whitelistEntitlementModule(
      spaceId,
      address(tokenEntitlementModule),
      true
    );

    spaceManager.addRoleToEntitlementModule(
      spaceId,
      address(tokenEntitlementModule),
      ownerRoleId,
      abi.encode("sample description", address(nft), 1)
    );

    address[] memory entitlementsBySpaceId = spaceManager
      .getEntitlementModulesBySpaceId(spaceId);

    assertEq(entitlementsBySpaceId.length, 2);
  }

  function testAddingEntitlementModuleThatIsAlreadyWhitelist() public {
    uint256 spaceId = spaceManager.createSpace(
      DataTypes.CreateSpaceData("test", "matrix-id")
    );

    DataTypes.Permission memory joinPermission = spaceManager
      .getPermissionFromMap(PermissionTypes.ZeroPermission);
    // Create roles and add permissions
    string memory roleName = "Joiner";
    uint256 ownerRoleId = spaceManager.createRole(spaceId, roleName, "#fff");
    spaceManager.addPermissionToRole(spaceId, ownerRoleId, joinPermission);

    vm.expectRevert(Errors.EntitlementAlreadyWhitelisted.selector);
    spaceManager.whitelistEntitlementModule(
      spaceId,
      address(userGrantedEntitlementModule),
      true
    );
  }
}
