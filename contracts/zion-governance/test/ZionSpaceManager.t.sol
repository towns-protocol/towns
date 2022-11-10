//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.13;
import "forge-std/Test.sol";

import {ZionSpaceManager} from "./../src/spaces/ZionSpaceManager.sol";
import {ISpaceManager} from "../src/spaces/interfaces/ISpaceManager.sol";
import {DataTypes} from "./../src/spaces/libraries/DataTypes.sol";
import {CouncilNFT} from "../src/council/CouncilNFT.sol";
import {MerkleHelper} from "./utils/MerkleHelper.sol";
import "murky/Merkle.sol";
import "openzeppelin-contracts/contracts/token/ERC721/IERC721Receiver.sol";
import {Events} from "./../src/spaces/libraries/Events.sol";
import {Errors} from "./../src/spaces/libraries/Errors.sol";
import {TokenEntitlementModule} from "./../src/spaces/modules/entitlements/TokenEntitlementModule.sol";
import {UserGrantedEntitlementModule} from "./../src/spaces/modules/entitlements/UserGrantedEntitlementModule.sol";
import {ZionPermissionsRegistry} from "./../src/spaces/ZionPermissionsRegistry.sol";
import {ZionRoleManager} from "./../src/spaces/ZionRoleManager.sol";
import {PermissionTypes} from "./../src/spaces/libraries/PermissionTypes.sol";
import {ZionSpace} from "./../src/spaces/nft/ZionSpace.sol";
import {BaseSetup} from "./BaseSetup.sol";
import {SpaceTestUtils} from "./utils/SpaceTestUtils.sol";
import {Constants} from "./../src/spaces/libraries/Constants.sol";

contract ZionSpaceManagerTest is BaseSetup, MerkleHelper, SpaceTestUtils {
  function setUp() public virtual override {
    BaseSetup.setUp();
  }

  function compareStringsbyBytes(
    string memory s1,
    string memory s2
  ) public pure returns (bool) {
    return keccak256(abi.encodePacked(s1)) == keccak256(abi.encodePacked(s2));
  }

  function testGetEntitlementsInfoBySpaceId() public {
    string memory networkId = "!7evmpuHDDgkady9u:localhost";

    createSimpleSpace("test", networkId, spaceManager);

    DataTypes.EntitlementModuleInfo[] memory entitlementsInfo = spaceManager
      .getEntitlementsInfoBySpaceId(networkId);

    assertEq(entitlementsInfo.length, 2);

    assertEq(entitlementsInfo[0].addr, address(userGrantedEntitlementModule));
    assertEq(entitlementsInfo[1].addr, address(tokenEntitlementModule));
  }

  function testCreateSpace() public {
    string memory networkId = "!7evmpuHDDgkady9u:localhost";

    uint256 spaceId = createSimpleSpace("test", networkId, spaceManager);

    DataTypes.SpaceInfo memory info = spaceManager.getSpaceInfoBySpaceId(
      networkId
    );

    address[] memory entitlements = spaceManager.getEntitlementModulesBySpaceId(
      networkId
    );

    DataTypes.SpaceInfo[] memory spaces = spaceManager.getSpaces();
    address ownerAddress = spaceManager.getSpaceOwnerBySpaceId(networkId);

    assertEq(spaces.length, 1, "There should be 1 space");
    assertEq(spaces[0].name, "test", "The space name should be test");
    assertEq(spaces[0].spaceId, spaceId, "The space id should match");
    assertEq(info.name, "test", "The metadata space name should be test");
    assertEq(entitlements.length, 2, "There should be 2 entitlements");
    assertEq(
      entitlements[0],
      address(userGrantedEntitlementModule),
      "The first entitlement should be the user granted entitlement"
    );
    assertEq(
      ownerAddress,
      address(this),
      "The owner address should be the test contract"
    );

    DataTypes.Permission memory readPermission = permissionsRegistry
      .getPermissionByPermissionType(PermissionTypes.Read);

    bool isEveryoneReadEntitled = spaceManager.isEntitled(
      networkId,
      "",
      address(5),
      readPermission
    );

    assertEq(
      isEveryoneReadEntitled,
      false,
      "Everyone should not be read entitled"
    );
  }

  function testCreateSpaceWithEveryonePermissions() public {
    string memory networkId = "!7evmpuHDDgkady9u:localhost";
    DataTypes.Permission memory readPermission = permissionsRegistry
      .getPermissionByPermissionType(PermissionTypes.Read);
    DataTypes.Permission[] memory permissions = new DataTypes.Permission[](1);
    permissions[0] = readPermission;

    createSimpleSpaceWithEveryonePermissions(
      "test",
      networkId,
      permissions,
      spaceManager
    );

    DataTypes.SpaceInfo[] memory spaces = spaceManager.getSpaces();

    assertEq(spaces.length, 1, "There should be 1 space");
    assertEq(spaces[0].name, "test", "The space name should be test");

    bool isEveryoneReadEntitled = spaceManager.isEntitled(
      networkId,
      "",
      address(5),
      readPermission
    );

    assertEq(isEveryoneReadEntitled, true, "Everyone should be read entitled");

    DataTypes.Permission memory writePermission = permissionsRegistry
      .getPermissionByPermissionType(PermissionTypes.Write);
    bool isEveryoneWriteEntitled = spaceManager.isEntitled(
      networkId,
      "",
      address(5),
      writePermission
    );

    assertEq(
      isEveryoneWriteEntitled,
      false,
      "Everyone should not be write entitled"
    );
  }

  function testCreateChannel() public {
    string memory spaceNetwork = "!space:localhost";
    string memory channelNetwork = "!channel:localhost";

    DataTypes.Permission[] memory permissions = new DataTypes.Permission[](1);
    permissions[0] = permissionsRegistry.getPermissionByPermissionType(
      PermissionTypes.Read
    );

    uint spaceId = createSimpleSpaceWithEveryonePermissions(
      "space-name",
      spaceNetwork,
      permissions,
      spaceManager
    );

    // get all roles
    DataTypes.Role[] memory existingSpaceRoles = roleManager.getRolesBySpaceId(
      spaceId
    );

    DataTypes.CreateRoleEntitlementData[]
      memory roles = new DataTypes.CreateRoleEntitlementData[](1);

    // get the space owner role
    for (uint256 i = 0; i < existingSpaceRoles.length; i++) {
      if (compareStringsbyBytes(existingSpaceRoles[i].name, "Everyone")) {
        roles[0] = DataTypes.CreateRoleEntitlementData({
          roleId: existingSpaceRoles[i].roleId,
          entitlementModule: address(userGrantedEntitlementModule),
          entitlementData: abi.encode(Constants.EVERYONE_ADDRESS)
        });
      }
    }

    uint256 channelId = spaceManager.createChannel(
      DataTypes.CreateChannelData(spaceNetwork, "channel-name", channelNetwork),
      roles
    );

    bool isEveryoneReadEntitled = spaceManager.isEntitled(
      spaceNetwork,
      channelNetwork,
      address(8),
      permissionsRegistry.getPermissionByPermissionType(PermissionTypes.Read)
    );

    DataTypes.ChannelInfo memory info = spaceManager.getChannelInfoByChannelId(
      spaceNetwork,
      channelNetwork
    );

    assertTrue(isEveryoneReadEntitled);
    assertEq(info.channelId, channelId);
    assertEq(info.name, "channel-name");
    assertEq(info.networkId, channelNetwork);

    DataTypes.Channels memory channels = spaceManager.getChannelsBySpaceId(
      spaceNetwork
    );

    assertEq(channels.channels.length, 1);
    assertEq(channels.channels[0].networkId, channelNetwork);
    assertEq(channels.channels[0].name, "channel-name");
  }

  function testCreateSpaceWithTokenEntitlement() public {
    //initialize the test data
    _initPositionsAllowances();
    bytes32[] memory allowlistData = _generateAllowlistData();

    //generate a merkle root from the allowlisted users test data
    Merkle merkle = new Merkle();
    bytes32 root = merkle.getRoot(allowlistData);

    //deploy the nft
    CouncilNFT councilNFT = new CouncilNFT("Zion", "zion", "baseUri", root);

    //Generate the data to create a space
    //Permissinos
    DataTypes.Permission memory readPermission = permissionsRegistry
      .getPermissionByPermissionType(PermissionTypes.Read);
    DataTypes.Permission[] memory permissions = new DataTypes.Permission[](1);
    permissions[0] = readPermission;

    //metadata
    string memory networkId = "!7evmpuHDDgkady9u:localhost";
    string memory roleName = "TestTokenHolder";

    //Additional token entitlement using a test nft entitlement from the council NFT
    DataTypes.ExternalTokenEntitlement[]
      memory externalTokenEntitlements = new DataTypes.ExternalTokenEntitlement[](
        1
      );
    externalTokenEntitlements[0] = getTestNFTEntitlement(address(councilNFT));

    DataTypes.CreateSpaceEntitlementData
      memory entitlementData = getCreateSpaceEntitlementData(
        roleName,
        permissions,
        externalTokenEntitlements,
        new address[](0)
      );

    //Actually create the space
    spaceManager.createSpace(
      DataTypes.CreateSpaceData("test", networkId),
      entitlementData,
      new DataTypes.Permission[](0)
    );

    address[] memory entitlementModules = spaceManager
      .getEntitlementModulesBySpaceId(networkId);

    address receiver = address(1);
    bool isReceiverEntitledInitial = spaceManager.isEntitled(
      networkId,
      "",
      address(receiver),
      readPermission
    );

    assertFalse(
      isReceiverEntitledInitial,
      "Receiver should not be initially entitled to read"
    );

    councilNFT.startPublicMint();

    vm.startPrank(address(receiver));
    vm.deal(address(receiver), 1 ether);
    councilNFT.mint{value: 0.08 ether}(address(receiver));
    vm.stopPrank();

    bool isReceiverEntitled = spaceManager.isEntitled(
      networkId,
      "",
      address(receiver),
      readPermission
    );

    assertTrue(isReceiverEntitled, "The receiver should be entitled");

    assertEq(
      entitlementModules.length,
      2,
      "There should be 2 entitlement modules"
    );
    assertEq(
      entitlementModules[0],
      address(userGrantedEntitlementModule),
      "The first entitlement module should be the user granted entitlement module"
    );
    assertEq(
      entitlementModules[1],
      address(tokenEntitlementModule),
      "The second entitlement module should be the token entitlement module"
    );
  }

  function testVerifyNetworkIdAndSpaceId() public {
    string memory networkId = "initial-network-id";

    uint256 spaceId = createSimpleSpace("test", networkId, spaceManager);

    uint256 spaceIdByNetworkId = spaceManager.getSpaceIdByNetworkId(networkId);

    assertEq(spaceIdByNetworkId, spaceId);
  }

  function testSetDefaultEntitlementModule() public {
    vm.expectEmit(true, false, false, false);
    emit Events.DefaultEntitlementSet(address(userGrantedEntitlementModule));

    spaceManager.setDefaultUserEntitlementModule(
      address(userGrantedEntitlementModule)
    );
    spaceManager.setDefaultTokenEntitlementModule(
      address(tokenEntitlementModule)
    );
  }

  function testWhitelistEntitlementModule() public {
    string memory networkId = "!7evmpuHDDgkady9u:localhost";

    createSimpleSpace("test", networkId, spaceManager);

    TokenEntitlementModule newTokenEntitlementModule = new TokenEntitlementModule(
        "New Token Entitlement Module",
        "Allows users to grant other users access to spaces and rooms based on tokens they hold",
        "NewTokenEntitlementModule",
        address(spaceManager),
        address(roleManager),
        address(permissionsRegistry)
      );

    spaceManager.whitelistEntitlementModule(
      networkId,
      address(newTokenEntitlementModule),
      true
    );
    address[] memory entitlements = spaceManager.getEntitlementModulesBySpaceId(
      networkId
    );
    assertEq(entitlements.length, 3);
    assertEq(entitlements[0], address(userGrantedEntitlementModule));
    assertEq(entitlements[1], address(tokenEntitlementModule));
    assertEq(entitlements[2], address(newTokenEntitlementModule));
    assertTrue(
      spaceManager.isEntitlementModuleWhitelisted(
        networkId,
        address(newTokenEntitlementModule)
      )
    );
  }

  function testRegisterEntitlementModuleWithoutWhitelist() public {
    //deploy the nft
    CouncilNFT councilNFT = new CouncilNFT("Zion", "zion", "baseUri", "");

    string memory networkId = "!7evmpuHDDgkady9u:localhost";

    createSimpleSpace("test", networkId, spaceManager);

    DataTypes.Permission memory joinPermission = permissionsRegistry
      .getPermissionByPermissionType(PermissionTypes.Read);
    // Create roles and add permissions
    string memory roleName = "Joiner";
    uint256 roleId = spaceManager.createRole(networkId, roleName);
    spaceManager.addPermissionToRole(networkId, roleId, joinPermission);

    TokenEntitlementModule newTokenEntitlementModule = new TokenEntitlementModule(
        "New Token Entitlement Module",
        "Allows users to grant other users access to spaces and rooms based on tokens they hold",
        "NewTokenEntitlementModule",
        address(spaceManager),
        address(roleManager),
        address(permissionsRegistry)
      );

    DataTypes.ExternalToken memory councilNFTGate = DataTypes.ExternalToken(
      address(councilNFT),
      1,
      false,
      0
    );

    DataTypes.ExternalToken[]
      memory externalTokens = new DataTypes.ExternalToken[](1);
    externalTokens[0] = councilNFTGate;

    DataTypes.ExternalTokenEntitlement
      memory externalTokenEntitlement = DataTypes.ExternalTokenEntitlement(
        "Council NFT Gate",
        externalTokens
      );

    vm.expectRevert(Errors.EntitlementNotWhitelisted.selector);
    spaceManager.addRoleToEntitlementModule(
      networkId,
      "",
      address(newTokenEntitlementModule),
      roleId,
      abi.encode(externalTokenEntitlement)
    );

    spaceManager.whitelistEntitlementModule(
      networkId,
      address(newTokenEntitlementModule),
      true
    );

    spaceManager.addRoleToEntitlementModule(
      networkId,
      "",
      address(newTokenEntitlementModule),
      roleId,
      abi.encode(externalTokenEntitlement)
    );

    address[] memory entitlementsBySpaceId = spaceManager
      .getEntitlementModulesBySpaceId(networkId);

    //2 from here, 1 from space creation
    assertEq(entitlementsBySpaceId.length, 3);
  }

  function testAddingEntitlementModuleThatIsAlreadyWhitelist() public {
    string memory networkId = "!7evmpuHDDgkady9u:localhost";

    createSimpleSpace("test", networkId, spaceManager);

    DataTypes.Permission memory joinPermission = permissionsRegistry
      .getPermissionByPermissionType(PermissionTypes.Read);
    // Create roles and add permissions
    string memory roleName = "Joiner";
    uint256 ownerRoleId = spaceManager.createRole(networkId, roleName);
    spaceManager.addPermissionToRole(networkId, ownerRoleId, joinPermission);

    vm.expectRevert(Errors.EntitlementAlreadyWhitelisted.selector);
    spaceManager.whitelistEntitlementModule(
      networkId,
      address(userGrantedEntitlementModule),
      true
    );
  }

  function testRemoveRole() public {
    string memory networkId = "!7evmpuHDDgkady9u:localhost";

    createSimpleSpace("test", networkId, spaceManager);

    // Create roles and add permissions
    string memory roleName = "Reader";
    uint256 readerRoleId = spaceManager.createRole(networkId, roleName);

    spaceManager.addPermissionToRole(
      networkId,
      readerRoleId,
      permissionsRegistry.getPermissionByPermissionType(PermissionTypes.Read)
    );

    DataTypes.Role[] memory roles = roleManager.getRolesBySpaceId(
      spaceManager.getSpaceIdByNetworkId(networkId)
    );

    assertEq(roles.length, 3);

    spaceManager.removeRole(networkId, readerRoleId);

    roles = roleManager.getRolesBySpaceId(
      spaceManager.getSpaceIdByNetworkId(networkId)
    );

    assertEq(roles.length, 2);
  }

  function testRemovePermissionFromRole() public {
    string memory networkId = "!7evmpuHDDgkady9u:localhost";

    createSimpleSpace("test", networkId, spaceManager);

    uint256 roleId = spaceManager.createRole(networkId, "TestRole");

    spaceManager.addPermissionToRole(
      networkId,
      roleId,
      DataTypes.Permission("TestPermission")
    );

    spaceManager.addPermissionToRole(
      networkId,
      roleId,
      DataTypes.Permission("TestPermission2")
    );

    DataTypes.Permission[] memory permissions = roleManager
      .getPermissionsBySpaceIdByRoleId(
        spaceManager.getSpaceIdByNetworkId(networkId),
        roleId
      );

    assertEq(permissions.length, 2);

    spaceManager.removePermissionFromRole(
      networkId,
      roleId,
      DataTypes.Permission("TestPermission")
    );

    permissions = roleManager.getPermissionsBySpaceIdByRoleId(
      spaceManager.getSpaceIdByNetworkId(networkId),
      roleId
    );

    assertEq(permissions.length, 1);
    assertEq(permissions[0].name, "TestPermission2");
  }

  function testDisableSpace() public {
    string memory networkId = "!7evmpuHDDgkady9u:localhost";

    createSimpleSpace("test", networkId, spaceManager);

    spaceManager.setSpaceAccess(networkId, true);

    DataTypes.SpaceInfo memory space = spaceManager.getSpaceInfoBySpaceId(
      networkId
    );

    assertEq(space.name, "test");
    assertEq(space.networkId, networkId);
    assertEq(space.disabled, true);
  }

  function testDisableChannel() public {
    string memory networkId = "!7evmpuHDDgkady9u:localhost";
    string memory channelNetworkId = "!7evmpuHDDgkady9u:localhost:channel";

    createSimpleSpace("test", networkId, spaceManager);

    spaceManager.createChannel(
      DataTypes.CreateChannelData(networkId, "channel-name", channelNetworkId),
      new DataTypes.CreateRoleEntitlementData[](0)
    );

    uint256 roleId = spaceManager.createRole(networkId, "TestRole");
    spaceManager.addPermissionToRole(
      networkId,
      roleId,
      permissionsRegistry.getPermissionByPermissionType(PermissionTypes.Read)
    );

    DataTypes.Role memory testRole = roleManager.getRoleBySpaceIdByRoleId(
      spaceManager.getSpaceIdByNetworkId(networkId),
      roleId
    );

    assertEq(testRole.name, "TestRole");

    spaceManager.addRoleToEntitlementModule(
      networkId,
      channelNetworkId,
      address(userGrantedEntitlementModule),
      roleId,
      abi.encode(address(2))
    );

    spaceManager.setChannelAccess(networkId, channelNetworkId, true);

    DataTypes.ChannelInfo memory channel = spaceManager
      .getChannelInfoByChannelId(networkId, channelNetworkId);

    assertEq(channel.name, "channel-name");
    assertEq(channel.networkId, channelNetworkId);
    assertEq(channel.disabled, true);
  }

  function testSpaceOwnerModifier() public {
    address notSpaceOwner = address(1);
    string memory networkId = "!7evmpuHDDgkady9u:localhost";
    userGrantedEntitlementModule = new UserGrantedEntitlementModule(
      "User Granted Entitlement Module",
      "Allows users to grant other users access to spaces and rooms",
      "UserGrantedEntitlementModule",
      address(spaceManager),
      address(roleManager),
      address(permissionsRegistry)
    );
    createSimpleSpace("test", networkId, spaceManager);

    vm.prank(notSpaceOwner);
    vm.expectRevert(Errors.NotAllowed.selector);
    spaceManager.whitelistEntitlementModule(
      networkId,
      address(tokenEntitlementModule),
      true
    );

    string memory roleName = "Joiner";
    DataTypes.Permission memory joinPermission = permissionsRegistry
      .getPermissionByPermissionType(PermissionTypes.Read);
    uint256 ownerRoleId = spaceManager.createRole(networkId, roleName);
    vm.prank(notSpaceOwner);
    vm.expectRevert(Errors.NotAllowed.selector);
    spaceManager.addPermissionToRole(networkId, ownerRoleId, joinPermission);

    DataTypes.ExternalToken memory testTokenGate = DataTypes.ExternalToken(
      address(1),
      1,
      false,
      0
    );

    vm.prank(notSpaceOwner);
    vm.expectRevert(Errors.NotAllowed.selector);
    spaceManager.addRoleToEntitlementModule(
      networkId,
      "",
      address(tokenEntitlementModule),
      ownerRoleId,
      abi.encode(testTokenGate)
    );
  }
}
