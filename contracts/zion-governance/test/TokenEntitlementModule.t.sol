//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.13;
import "forge-std/Test.sol";
import {ZionSpaceManager} from "../src/spaces/ZionSpaceManager.sol";
import {Zion} from "../src/governance/Zion.sol";
import {CouncilNFT} from "../src/council/CouncilNFT.sol";
import {ISpaceManager} from "../src/spaces/interfaces/ISpaceManager.sol";
import {TokenEntitlementModule} from "./../src/spaces/modules/entitlements/TokenEntitlementModule.sol";
import {UserGrantedEntitlementModule} from "./../src/spaces/modules/entitlements/UserGrantedEntitlementModule.sol";
import {DataTypes} from "../src/spaces/libraries/DataTypes.sol";
import {PermissionTypes} from "../src/spaces/libraries/PermissionTypes.sol";
import {IPermissionRegistry} from "../src/spaces/interfaces/IPermissionRegistry.sol";
import {ZionSpace} from "../src/spaces/nft/ZionSpace.sol";
import {SpaceTestUtils} from "./utils/SpaceTestUtils.sol";
import {BaseSetup} from "./BaseSetup.sol";
import "murky/Merkle.sol";

contract TokenEntitlementModuleTest is BaseSetup, SpaceTestUtils {
  Zion internal zion;
  CouncilNFT internal councilNFT;

  address user1;
  address user2;

  function setUp() public virtual override {
    BaseSetup.setUp();
    zion = new Zion();

    user1 = address(2);
    user2 = address(0x1234);
    bytes32[] memory data = new bytes32[](4);
    data[0] = keccak256(abi.encodePacked(user1, "1"));
    Merkle m = new Merkle();
    bytes32 root = m.getRoot(data);

    councilNFT = new CouncilNFT("Zion", "zion", "baseURI", root);
    councilNFT.startPublicMint();
  }

  function transferZionToken(address _to, uint256 quantity) private {
    zion.transfer(_to, quantity);
  }

  function testERC20TokenEntitlement() public {
    string memory spaceName = "test-space";
    string memory networkId = "test-network-id";
    string memory roomId = "";
    // create a space with the default user granted entitlement module
    createSimpleSpace(spaceName, networkId, spaceManager);

    DataTypes.Permission memory permission = permissionsRegistry
      .getPermissionByPermissionType(PermissionTypes.Ban);
    // Create roles and add permissions
    string memory roleName = "Tester";
    uint256 testerRoleId = spaceManager.createRole(networkId, roleName);
    spaceManager.addPermissionToRole(networkId, testerRoleId, permission);

    DataTypes.ExternalTokenEntitlement
      memory externalTokenEntitlement = getTestExternalTokenEntitlement(
        "Zion 100 Token Gate",
        address(zion),
        100,
        false,
        0
      );

    // Add token entitlement module to space
    spaceManager.addRoleToEntitlementModule(
      networkId,
      roomId,
      address(tokenEntitlementModule),
      testerRoleId,
      abi.encode(externalTokenEntitlement)
    );

    // verify the token entitlement module is added to the space
    address[] memory entitlements = spaceManager.getEntitlementModulesBySpaceId(
      networkId
    );
    assertEq(entitlements.length, 2);
    assertEq(entitlements[1], address(tokenEntitlementModule));

    //Verify the user is not entitled prior to receiving the tokens
    bool isEntitledPrior = spaceManager.isEntitled(
      networkId,
      roomId,
      user1,
      permission
    );

    assertFalse(isEntitledPrior);

    // transfer tokens
    transferZionToken(user1, 100);

    bool isEntitled = spaceManager.isEntitled(
      networkId,
      roomId,
      user1,
      permission
    );

    assertTrue(isEntitled);

    bool isRandomEntitled = spaceManager.isEntitled(
      networkId,
      roomId,
      user2,
      permission
    );

    assertFalse(isRandomEntitled);
  }

  function testERC721TokenEntitlement() public {
    // Create a space with the user granted entitlement module
    string memory spaceName = "test-space";
    string memory networkId = "test-network-id";
    string memory roomId = "";
    DataTypes.Permission memory permission = permissionsRegistry
      .getPermissionByPermissionType(PermissionTypes.Ban);

    createSimpleSpace(spaceName, networkId, spaceManager);

    // Create roles and add permissions
    string memory roleName = "Tester";
    uint256 roleId = spaceManager.createRole(networkId, roleName);
    spaceManager.addPermissionToRole(networkId, roleId, permission);

    DataTypes.ExternalTokenEntitlement
      memory externalTokenEntitlement = getTestExternalTokenEntitlement(
        "Council NFT Gate",
        address(councilNFT),
        1,
        false,
        0
      );

    // Add the token entitlement module to the space
    spaceManager.addRoleToEntitlementModule(
      networkId,
      roomId,
      address(tokenEntitlementModule),
      roleId,
      abi.encode(externalTokenEntitlement)
    );

    // Verify the token entitlement module is added to the space
    address[] memory entitlements = spaceManager.getEntitlementModulesBySpaceId(
      networkId
    );
    assertEq(entitlements.length, 2);
    assertEq(entitlements[1], address(tokenEntitlementModule));

    //Verify user is not entitled prior to minting the NFT
    bool isEntitledPre = spaceManager.isEntitled(
      networkId,
      roomId,
      user1,
      permission
    );
    assertFalse(isEntitledPre);

    // Transfer token to user1
    councilNFT.mint{value: councilNFT.MINT_PRICE()}(user1);

    // Verify user1 is a moderator
    bool isEntitled = spaceManager.isEntitled(
      networkId,
      roomId,
      user1,
      permission
    );
    assertTrue(isEntitled);

    // Verify user2 is not a moderator
    bool isRandomEntitled = spaceManager.isEntitled(
      networkId,
      roomId,
      user2,
      permission
    );
    assertFalse(isRandomEntitled);
  }

  function testMultipleTokenEntitlement() public {
    // Create a space with the user granted entitlement module
    string memory spaceName = "test-space";
    string memory networkId = "test-network-id";
    string memory roomId = "";
    DataTypes.Permission memory permission = permissionsRegistry
      .getPermissionByPermissionType(PermissionTypes.Ban);

    createSimpleSpace(spaceName, networkId, spaceManager);

    // Create roles and add permissions

    string memory roleName = "Tester";
    uint256 roleId = spaceManager.createRole(networkId, roleName);
    spaceManager.addPermissionToRole(networkId, roleId, permission);

    DataTypes.ExternalToken memory councilNFTGate = getTestExternalToken(
      address(councilNFT),
      1,
      false,
      0
    );
    DataTypes.ExternalToken memory zionTokenGate = getTestExternalToken(
      address(zion),
      100,
      false,
      0
    );

    DataTypes.ExternalToken[]
      memory externalTokens = new DataTypes.ExternalToken[](2);
    externalTokens[0] = councilNFTGate;
    externalTokens[1] = zionTokenGate;

    DataTypes.ExternalTokenEntitlement
      memory externalTokenEntitlement = DataTypes.ExternalTokenEntitlement(
        "Multiple Token Gate",
        externalTokens
      );

    // Add the token entitlement module to the space
    spaceManager.addRoleToEntitlementModule(
      networkId,
      roomId,
      address(tokenEntitlementModule),
      roleId,
      abi.encode(externalTokenEntitlement)
    );

    // Verify the token entitlement module is added to the space
    address[] memory entitlements = spaceManager.getEntitlementModulesBySpaceId(
      networkId
    );
    assertEq(entitlements.length, 2);
    assertEq(entitlements[1], address(tokenEntitlementModule));

    // Verify user1 is not yet a moderator
    bool isEntitledPre = spaceManager.isEntitled(
      networkId,
      roomId,
      user1,
      permission
    );
    assertFalse(isEntitledPre);

    // Transfer nft to user1
    councilNFT.mint{value: councilNFT.MINT_PRICE()}(user1);

    // Verify user1 is STILL not yet a moderator after receiving just one of the tokens
    bool isEntitledOneToken = spaceManager.isEntitled(
      networkId,
      roomId,
      user1,
      permission
    );
    assertFalse(isEntitledOneToken);

    // transfer tokens
    transferZionToken(user1, 100);

    // Verify user1 is a moderator
    bool isEntitled = spaceManager.isEntitled(
      networkId,
      roomId,
      user1,
      permission
    );
    assertTrue(isEntitled);
  }

  function getTestExternalTokenEntitlement(
    string memory entitlementTag,
    address contractAddress,
    uint256 quantity,
    bool isSingleToken,
    uint256 tokenId
  ) public pure returns (DataTypes.ExternalTokenEntitlement memory) {
    DataTypes.ExternalToken[]
      memory externalTokens = new DataTypes.ExternalToken[](1);
    externalTokens[0] = getTestExternalToken(
      contractAddress,
      quantity,
      isSingleToken,
      tokenId
    );

    DataTypes.ExternalTokenEntitlement
      memory externalTokenEntitlement = DataTypes.ExternalTokenEntitlement(
        entitlementTag,
        externalTokens
      );

    return externalTokenEntitlement;
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
}
