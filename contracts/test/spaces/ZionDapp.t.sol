//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.13;

import {BaseSetup} from "contracts/test/spaces/BaseSetup.sol";
import {CouncilNFT} from "contracts/src/council/CouncilNFT.sol";
import {DataTypes} from "contracts/src/spaces/libraries/DataTypes.sol";
import {Errors} from "contracts/src/spaces/libraries/Errors.sol";
import {IPermissionRegistry} from "contracts/src/spaces/interfaces/IPermissionRegistry.sol";
import {Merkle} from "murky/Merkle.sol";
import {PermissionTypes} from "contracts/src/spaces/libraries/PermissionTypes.sol";
import {SpaceTestUtils} from "contracts/test/spaces/SpaceTestUtils.sol";
import {Zion} from "contracts/src/governance/Zion.sol";

contract ZionDappTest is BaseSetup, SpaceTestUtils {
  Zion internal zion;
  CouncilNFT internal councilNFT;
  address userWithNft; // has CouncilNFT
  address userWithoutNft; // does not have CouncilNFT

  function setUp() public virtual override {
    BaseSetup.setUp();
    zion = new Zion();
    userWithNft = address(0x1111);
    userWithoutNft = address(0x2222);
    bytes32[] memory data = new bytes32[](4);
    data[0] = keccak256(abi.encodePacked(userWithNft, "1"));
    Merkle m = new Merkle();
    bytes32 root = m.getRoot(data);
    councilNFT = new CouncilNFT("Zion", "zion", "baseURI", root);
    councilNFT.startPublicMint();
    // Transfer nft to user1
    councilNFT.mint{value: councilNFT.MINT_PRICE()}(userWithNft);
  }

  function getTestExternalToken(
    address contractAddress,
    uint256 quantity,
    bool isSingleToken,
    uint256 tokenId
  ) internal pure returns (DataTypes.ExternalToken memory) {
    DataTypes.ExternalToken memory externalToken = DataTypes.ExternalToken(
      contractAddress,
      quantity,
      isSingleToken,
      tokenId
    );

    return externalToken;
  }

  function transferZionToken(address _to, uint256 quantity) private {
    zion.transfer(_to, quantity);
  }

  function testCreateRoleWithEntitlementData() public {
    /* Arrange */
    string memory networkId = "!7evmpuHDDgkady9u:localhost";
    createSimpleSpace("test", networkId, spaceManager);

    /* Act */
    // Create role and add permissions
    string memory roleName = "TestRole";
    DataTypes.ExternalTokenEntitlement[] memory tokenEntitlements =
      new DataTypes.ExternalTokenEntitlement[](0);
    DataTypes.Permission[] memory testPermissions = new DataTypes.Permission[](2);
    testPermissions[0] = DataTypes.Permission("TestPermission1");
    testPermissions[1] = DataTypes.Permission("TestPermission2");
    uint256 roleId = spaceManager.createRoleWithEntitlementData(
      networkId,
      roleName,
      testPermissions,
      tokenEntitlements,
      new address[](0)
    );

    /* Assert */
    DataTypes.Permission[] memory permissions = roleManager
      .getPermissionsBySpaceIdByRoleId(
        spaceManager.getSpaceIdByNetworkId(networkId),
        roleId
    );
    assertEq(permissions.length, 2);
    assertEq(permissions[0].name, "TestPermission1");
    assertEq(permissions[1].name, "TestPermission2");
  }

  // Modify role and add a new permission
  function testModifyRoleAddPermission() public {
    /* Arrange */
    string memory networkId = "!7evmpuHDDgkady9u:localhost";
    createSimpleSpace("test", networkId, spaceManager);
    // Create role and add permissions
    string memory roleName = "TestRole";
    DataTypes.ExternalTokenEntitlement[] memory tokenEntitlements =
      new DataTypes.ExternalTokenEntitlement[](0);
    DataTypes.Permission[] memory permissions = new DataTypes.Permission[](1);
    permissions[0] = DataTypes.Permission("TestPermission1");
    uint256 roleId = spaceManager.createRoleWithEntitlementData(
      networkId,
      roleName,
      permissions,
      tokenEntitlements,
      new address[](0)
    );

    /* Act */
    permissions = new DataTypes.Permission[](2);
    permissions[0] = DataTypes.Permission("TestPermission1");
    permissions[1] = DataTypes.Permission("TestPermission2");
    spaceManager.modifyRoleWithEntitlementData(
      networkId,
      roleId,
      roleName,
      permissions,
      new DataTypes.ExternalTokenEntitlement[](0),
      new address[](0)
    );

    /* Assert */
    DataTypes.Permission[] memory actualPermissions = roleManager
      .getPermissionsBySpaceIdByRoleId(
        spaceManager.getSpaceIdByNetworkId(networkId),
        roleId
      );
    assertEq(actualPermissions.length, 2);
    assertEq(actualPermissions[0].name, "TestPermission1");
    assertEq(actualPermissions[1].name, "TestPermission2");
  }

  // Modify role and replace permission with another.
  function testModifyRoleReplacePermission() public {
    /* Arrange */
    string memory networkId = "!7evmpuHDDgkady9u:localhost";
    createSimpleSpace("test", networkId, spaceManager);
    // Create role and add permissions
    string memory roleName = "TestRole";
    address[] memory users = new address[](0);
    DataTypes.ExternalTokenEntitlement[] memory tokenEntitlements =
      new DataTypes.ExternalTokenEntitlement[](0);
    DataTypes.Permission[] memory permissions = new DataTypes.Permission[](1);
    permissions[0] = permissionsRegistry
      .getPermissionByPermissionType(PermissionTypes.Ban);
    uint256 roleId = spaceManager.createRoleWithEntitlementData(
      networkId,
      roleName,
      permissions,
      tokenEntitlements,
      users
    );

    /* Act */
    permissions[0] = DataTypes.Permission("TestPermission2");
    spaceManager.modifyRoleWithEntitlementData(
      networkId,
      roleId,
      roleName,
      permissions,
      new DataTypes.ExternalTokenEntitlement[](0),
      new address[](0)
    );

    /* Assert */
    DataTypes.Permission[] memory actualPermissions = roleManager
      .getPermissionsBySpaceIdByRoleId(
        spaceManager.getSpaceIdByNetworkId(networkId),
        roleId
      );
    assertEq(actualPermissions.length, 1);
    assertEq(actualPermissions[0].name, "TestPermission2");
  }

  // Modify role and change the name
  function testModifyRoleChangeName() public {
    /* Arrange */
    string memory networkId = "!7evmpuHDDgkady9u:localhost";
    createSimpleSpace("test", networkId, spaceManager);
    // Create role and add permissions
    string memory roleName = "TestRole";
    DataTypes.ExternalTokenEntitlement[] memory tokenEntitlements =
      new DataTypes.ExternalTokenEntitlement[](0);
    DataTypes.Permission[] memory permissions = new DataTypes.Permission[](1);
    permissions[0] = DataTypes.Permission("TestPermission");
    uint256 roleId = spaceManager.createRoleWithEntitlementData(
      networkId,
      roleName,
      permissions,
      tokenEntitlements,
      new address[](0)
    );

    /* Act */
    string memory newRoleName = "TestRole2";
    spaceManager.modifyRoleWithEntitlementData(
      networkId,
      roleId,
      newRoleName,
      permissions,
      new DataTypes.ExternalTokenEntitlement[](0),
      new address[](0)
    );

    /* Assert */
    uint256 spaceId = spaceManager.getSpaceIdByNetworkId(networkId);
    DataTypes.Role memory actualRole = roleManager
      .getRoleBySpaceIdByRoleId(
        spaceId,
        roleId
      );
    assertEq(actualRole.name, newRoleName);
  }

  // Modify role name to Owner should be rejected
  // Modify role and change the name
  function testModifyRoleChangeOwnerName() public {
    /* Arrange */
    string memory networkId = "!7evmpuHDDgkady9u:localhost";
    createSimpleSpace("test", networkId, spaceManager);
    // Create role and add permissions
    string memory roleName = "TestRole";
    DataTypes.ExternalTokenEntitlement[] memory tokenEntitlements =
      new DataTypes.ExternalTokenEntitlement[](0);
    DataTypes.Permission[] memory permissions = new DataTypes.Permission[](1);
    permissions[0] = DataTypes.Permission("TestPermission");
    uint256 roleId = spaceManager.createRoleWithEntitlementData(
      networkId,
      roleName,
      permissions,
      tokenEntitlements,
      new address[](0)
    );

    /* Act */
    string memory ownerRoleName = "Owner";
    vm.expectRevert(Errors.InvalidParameters.selector);
    spaceManager.modifyRoleWithEntitlementData(
      networkId,
      roleId,
      ownerRoleName,
      permissions,
      new DataTypes.ExternalTokenEntitlement[](0),
      new address[](0)
    );

    /* Assert */
    uint256 spaceId = spaceManager.getSpaceIdByNetworkId(networkId);
    DataTypes.Role memory actualRole = roleManager
      .getRoleBySpaceIdByRoleId(
        spaceId,
        roleId
      );
    // original name has not changed
    assertEq(actualRole.name, roleName);
  }

  // Modify role and change the token entitlement data
  function testModifyRoleTokenEntitlement() public {
    /* Arrange */
    // Create a space
    string memory spaceName = "test-space";
    string memory networkId = "test-network-id";
    string memory roomId = "";
    createSimpleSpace(spaceName, networkId, spaceManager);

    // Create role, permissions, and entitlements
    string memory roleName = "Tester";
    DataTypes.Permission memory permission = permissionsRegistry
      .getPermissionByPermissionType(PermissionTypes.Ban);
    DataTypes.Permission[] memory permissions = new DataTypes.Permission[](1);
    permissions[0] = permission;

    // Set up a gate for the Zion token
    DataTypes.ExternalToken memory zionTokenGate = getTestExternalToken(
      address(zion),
      100,
      false,
      0
    );
    DataTypes.ExternalToken[]
      memory externalTokens = new DataTypes.ExternalToken[](1);
    externalTokens[0] = zionTokenGate;
    DataTypes.ExternalTokenEntitlement
      memory externalTokenEntitlement = DataTypes.ExternalTokenEntitlement(
        externalTokens
      );
    DataTypes.ExternalTokenEntitlement[]
      memory tokenEntitlements = new DataTypes
        .ExternalTokenEntitlement[](1);
    tokenEntitlements[0] = externalTokenEntitlement;
    uint256 roleId = spaceManager.createRoleWithEntitlementData(
      networkId,
      roleName,
      permissions,
      tokenEntitlements,
      new address[](0)
    );

    /* Act */
    // Verify user is not yet a moderator
    bool isEntitledFalse = spaceManager.isEntitled(
      networkId,
      roomId,
      userWithNft, // user has a CouncilNFT, and not a Zion token
      permission
    );
    assertFalse(
      isEntitledFalse,
      "User should not have access because token does not match"
    );

    // Replace the token for that role with the CouncilNFT
    DataTypes.ExternalToken memory councilNFTGate = getTestExternalToken(
      address(councilNFT),
      1,
      false,
      0
    );
    externalTokens[0] = councilNFTGate;
    spaceManager.modifyRoleWithEntitlementData(
      networkId,
      roleId,
      roleName,
      permissions,
      tokenEntitlements,
      new address[](0)
    );

    /* Assert */
    // Verify user is now a moderator
    bool isEntitled = spaceManager.isEntitled(
      networkId,
      roomId,
      userWithNft,
      permission
    );
    assertTrue(isEntitled, "User should have access because of NFT");
  }

  // Modify role and change the user entitlement data
  function testModifyRoleUserEntitlement() public {
    /* Arrange */
    // Create a space
    string memory spaceName = "test-space";
    string memory spaceNetworkId = "test-network-id";
    string memory roleName = "Test Role";
    string memory roomId = "";
    createSimpleSpace(spaceName, spaceNetworkId, spaceManager);

    // Create role, permissions, and entitlements
    DataTypes.Permission memory permission = permissionsRegistry
      .getPermissionByPermissionType(PermissionTypes.Read);
    DataTypes.Permission[] memory permissions = new DataTypes.Permission[](1);
    permissions[0] = permission;
    DataTypes.ExternalTokenEntitlement[]
      memory tokenEntitlements = new DataTypes
        .ExternalTokenEntitlement[](0);
    address[] memory users = new address[](1);
    // Add a different user to the user entitlement list
    users[0] = userWithoutNft;
    uint256 roleId = spaceManager.createRoleWithEntitlementData(
      spaceNetworkId,
      roleName,
      permissions,
      tokenEntitlements,
      users
    );

    /* Act */
    // Verify user is not entitled
    bool isEntitledFalse = spaceManager.isEntitled(
      spaceNetworkId,
      roomId,
      userWithNft, // user is not in the user entitlement list
      permission
    );
    assertFalse(
      isEntitledFalse,
      "User should not be entitled because he is not in the user entitlement list"
    );

    // Modify the role to add the user to the user entitlement list
    users[0] = userWithNft;
    spaceManager.modifyRoleWithEntitlementData(
      spaceNetworkId,
      roleId,
      roleName,
      permissions,
      tokenEntitlements,
      users
    );

    /* Assert */
    bool isEntitled = spaceManager.isEntitled(
      spaceNetworkId,
      roomId,
      userWithNft, // now the user is in the user entitlement list
      permission
    );
    assertTrue(
      isEntitled,
      "User should be entitled because he is in the user entitlement list"
    );
  }
}