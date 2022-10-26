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
import {PermissionTypes} from "./../src/spaces/libraries/PermissionTypes.sol";
import {ZionSpace} from "./../src/spaces/nft/ZionSpace.sol";

contract ZionSpaceManagerTest is Test, MerkleHelper {
  ZionSpaceManager internal spaceManager;
  ZionPermissionsRegistry internal permissionsRegistry;
  UserGrantedEntitlementModule internal userGrantedEntitlementModule;
  TokenEntitlementModule internal tokenEntitlementModule;
  ZionSpace internal zionSpaceNFT;

  function setUp() public {
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

    zionSpaceNFT = new ZionSpace("Zion Space", "ZSNFT", address(spaceManager));

    spaceManager.setDefaultUserEntitlementModule(
      address(userGrantedEntitlementModule)
    );
    spaceManager.setDefaultTokenEntitlementModule(
      address(tokenEntitlementModule)
    );
    spaceManager.setSpaceNFT(address(zionSpaceNFT));
  }

  function testGetEntitlementsInfoBySpaceId() public {
    string memory spaceNetworkId = "!7evmpuHDDgkady9u:localhost";

    spaceManager.createSpace(DataTypes.CreateSpaceData("test", spaceNetworkId));

    DataTypes.EntitlementModuleInfo[] memory entitlementsInfo = spaceManager
      .getEntitlementsInfoBySpaceId(spaceNetworkId);

    assertEq(entitlementsInfo.length, 2);

    assertEq(entitlementsInfo[0].addr, address(userGrantedEntitlementModule));
    assertEq(entitlementsInfo[1].addr, address(tokenEntitlementModule));
  }

  function testCreateSpaceWithUserGrantedEntitlement() public {
    string memory networkId = "!7evmpuHDDgkady9u:localhost";

    uint256 spaceId = spaceManager.createSpace(
      DataTypes.CreateSpaceData("test", networkId)
    );

    DataTypes.SpaceInfo memory info = spaceManager.getSpaceInfoBySpaceId(
      networkId
    );

    address[] memory entitlements = spaceManager.getEntitlementModulesBySpaceId(
      networkId
    );

    DataTypes.SpaceInfo[] memory spaces = spaceManager.getSpaces();
    address ownerAddress = spaceManager.getSpaceOwnerBySpaceId(networkId);

    assertEq(spaces.length, 1);
    assertEq(spaces[0].name, "test");
    assertEq(spaces[0].spaceId, spaceId);
    assertEq(info.name, "test");
    assertEq(entitlements.length, 2);
    assertEq(entitlements[0], address(userGrantedEntitlementModule));
    assertEq(ownerAddress, address(this));

    DataTypes.Permission memory readPermission = spaceManager
      .getPermissionFromMap(PermissionTypes.Read);
    DataTypes.Permission memory writePermission = spaceManager
      .getPermissionFromMap(PermissionTypes.Write);

    bool isEveryoneReadEntitled = spaceManager.isEntitled(
      networkId,
      "",
      address(5),
      readPermission
    );

    assertEq(isEveryoneReadEntitled, true);

    bool isEveryoneWriteEntitled = spaceManager.isEntitled(
      networkId,
      "",
      address(5),
      writePermission
    );
    assertEq(isEveryoneWriteEntitled, false);
  }

  function testCreateChannel() public {
    string memory spaceNetwork = "!space:localhost";
    string memory channelNetwork = "!channel:localhost";

    spaceManager.createSpace(
      DataTypes.CreateSpaceData("space-name", spaceNetwork)
    );

    DataTypes.Permission[] memory permissions = new DataTypes.Permission[](2);
    permissions[0] = spaceManager.getPermissionFromMap(PermissionTypes.Read);
    permissions[1] = spaceManager.getPermissionFromMap(PermissionTypes.Write);

    uint256 channelId = spaceManager.createChannel(
      DataTypes.CreateChannelData(spaceNetwork, "channel-name", channelNetwork)
    );

    DataTypes.ChannelInfo memory info = spaceManager.getChannelInfoByChannelId(
      spaceNetwork,
      channelNetwork
    );

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

  function getTestNFTEntitlement(address nftAddress)
    internal
    pure
    returns (DataTypes.ExternalTokenEntitlement memory)
  {
    address tokenAddress = address(nftAddress);
    uint256 quantity = 1;
    bool isSingleToken = false;
    uint256 tokenId = 0;

    DataTypes.ExternalToken memory externalToken = DataTypes.ExternalToken(
      tokenAddress,
      quantity,
      isSingleToken,
      tokenId
    );

    DataTypes.ExternalToken[]
      memory externalTokens = new DataTypes.ExternalToken[](1);
    externalTokens[0] = externalToken;

    DataTypes.ExternalTokenEntitlement
      memory externalTokenEntitlement = DataTypes.ExternalTokenEntitlement(
        "Test Token Gate",
        externalTokens
      );
    return externalTokenEntitlement;
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

    DataTypes.Permission memory readPermission = spaceManager
      .getPermissionFromMap(PermissionTypes.Read);

    string[] memory permissions = new string[](1);
    permissions[0] = readPermission.name;

    vm.prank(address(receiver));
    string memory networkId = "!7evmpuHDDgkady9u:localhost";

    string memory roleName = "TestTokenHolder";
    spaceManager.createSpaceWithTokenEntitlement(
      DataTypes.CreateSpaceData("test", networkId),
      DataTypes.CreateSpaceTokenEntitlementData(
        permissions,
        roleName,
        getTestNFTEntitlement(address(nft))
      )
    );

    address[] memory entitlementModules = spaceManager
      .getEntitlementModulesBySpaceId(networkId);

    bool isUserGrantEntitled = spaceManager.isEntitled(
      networkId,
      "",
      address(receiver),
      readPermission
    );

    assertTrue(isUserGrantEntitled);

    nft.startPublicMint();

    vm.startPrank(address(receiver));
    vm.deal(address(receiver), 1 ether);
    nft.mint{value: 0.08 ether}(address(receiver));
    vm.stopPrank();

    bool isTokenEntitled = spaceManager.isEntitled(
      networkId,
      "",
      address(receiver),
      readPermission
    );

    assertTrue(isTokenEntitled);

    assertEq(entitlementModules.length, 2);
    assertEq(entitlementModules[0], address(userGrantedEntitlementModule));
    assertEq(entitlementModules[1], address(tokenEntitlementModule));
  }

  function testVerifyNetworkIdAndSpaceId() public {
    string memory networkId = "initial-network-id";

    uint256 spaceId = spaceManager.createSpace(
      DataTypes.CreateSpaceData("test", networkId)
    );

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

    spaceManager.createSpace(DataTypes.CreateSpaceData("test", networkId));

    TokenEntitlementModule newTokenEntitlementModule = new TokenEntitlementModule(
        "New Token Entitlement Module",
        "Allows users to grant other users access to spaces and rooms based on tokens they hold",
        address(spaceManager)
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
    CouncilNFT nft = new CouncilNFT("Zion", "zion", "baseUri", "");

    string memory networkId = "!7evmpuHDDgkady9u:localhost";

    spaceManager.createSpace(DataTypes.CreateSpaceData("test", networkId));

    DataTypes.Permission memory joinPermission = spaceManager
      .getPermissionFromMap(PermissionTypes.Read);
    // Create roles and add permissions
    string memory roleName = "Joiner";
    uint256 roleId = spaceManager.createRole(networkId, roleName);
    spaceManager.addPermissionToRole(networkId, roleId, joinPermission);

    TokenEntitlementModule newTokenEntitlementModule = new TokenEntitlementModule(
        "New Token Entitlement Module",
        "Allows users to grant other users access to spaces and rooms based on tokens they hold",
        address(spaceManager)
      );

    DataTypes.ExternalToken memory councilNFT = DataTypes.ExternalToken(
      address(nft),
      1,
      false,
      0
    );

    DataTypes.ExternalToken[]
      memory externalTokens = new DataTypes.ExternalToken[](1);
    externalTokens[0] = councilNFT;

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

    spaceManager.createSpace(DataTypes.CreateSpaceData("test", networkId));

    DataTypes.Permission memory joinPermission = spaceManager
      .getPermissionFromMap(PermissionTypes.Read);
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

    spaceManager.createSpace(DataTypes.CreateSpaceData("test", networkId));

    // Create roles and add permissions
    string memory roleName = "Reader";
    uint256 readerRoleId = spaceManager.createRole(networkId, roleName);

    spaceManager.addPermissionToRole(
      networkId,
      readerRoleId,
      spaceManager.getPermissionFromMap(PermissionTypes.Read)
    );

    DataTypes.Role[] memory roles = spaceManager.getRolesBySpaceId(networkId);

    assertEq(roles.length, 3);

    spaceManager.removeRole(networkId, readerRoleId);

    vm.expectRevert(stdError.indexOOBError);
    DataTypes.Role memory role = spaceManager.getRoleBySpaceIdByRoleId(
      networkId,
      readerRoleId
    );

    DataTypes.Permission[] memory permissions = spaceManager
      .getPermissionsBySpaceIdByRoleId(networkId, readerRoleId);

    assertEq(role.name, "");
    assertEq(permissions.length, 0);
  }

  function testRemovePermissionFromRole() public {
    string memory networkId = "!7evmpuHDDgkady9u:localhost";

    spaceManager.createSpace(DataTypes.CreateSpaceData("test", networkId));

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

    DataTypes.Permission[] memory permissions = spaceManager
      .getPermissionsBySpaceIdByRoleId(networkId, roleId);

    assertEq(permissions.length, 2);

    spaceManager.removePermissionFromRole(
      networkId,
      roleId,
      DataTypes.Permission("TestPermission")
    );

    permissions = spaceManager.getPermissionsBySpaceIdByRoleId(
      networkId,
      roleId
    );

    assertEq(permissions.length, 1);
    assertEq(permissions[0].name, "TestPermission2");
  }

  function testDisableSpace() public {
    string memory networkId = "!7evmpuHDDgkady9u:localhost";

    spaceManager.createSpace(DataTypes.CreateSpaceData("test", networkId));

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

    spaceManager.createSpace(DataTypes.CreateSpaceData("test", networkId));

    spaceManager.createChannel(
      DataTypes.CreateChannelData(networkId, "channel-name", channelNetworkId)
    );

    uint256 roleId = spaceManager.createRole(networkId, "TestRole");
    spaceManager.addPermissionToRole(
      networkId,
      roleId,
      spaceManager.getPermissionFromMap(PermissionTypes.Read)
    );

    DataTypes.Role memory testRole = spaceManager.getRoleBySpaceIdByRoleId(
      networkId,
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
      address(spaceManager)
    );
    spaceManager.createSpace(DataTypes.CreateSpaceData("test", networkId));

    vm.prank(notSpaceOwner);
    vm.expectRevert(Errors.NotAllowed.selector);
    spaceManager.whitelistEntitlementModule(
      networkId,
      address(tokenEntitlementModule),
      true
    );

    string memory roleName = "Joiner";
    DataTypes.Permission memory joinPermission = spaceManager
      .getPermissionFromMap(PermissionTypes.Read);
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
