// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

// Interfaces
import {IEntitlement} from "contracts/src/spacesv2/interfaces/IEntitlement.sol";

// Libraries
import {Errors} from "contracts/src/spacesv2/libraries/Errors.sol";
import {DataTypes} from "contracts/src/spacesv2/libraries/DataTypes.sol";
import {Permissions} from "contracts/src/spacesv2/libraries/Permissions.sol";

// Contracts
import {Space} from "contracts/src/spacesv2/Space.sol";
import {SpaceBaseSetup} from "contracts/test/spacesv2/SpaceBaseSetup.sol";
import {TokenEntitlement} from "contracts/src/spacesv2/entitlements/TokenEntitlement.sol";
import {ERC1967Proxy} from "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {Mock721, Mock1155, MockERC20} from "contracts/test/spacesv2/mocks/MockToken.sol";

import {console} from "forge-std/console.sol";

contract TokenEntitlementTest is SpaceBaseSetup {
  address internal entitlementAddress;
  TokenEntitlement internal implementation;
  TokenEntitlement internal tokenEntitlement;
  Mock721 mockToken = new Mock721();
  Mock1155 mockToken2 = new Mock1155();
  MockERC20 mockToken3 = new MockERC20();

  function setUp() public {
    SpaceBaseSetup.init();
    implementation = new TokenEntitlement();
    entitlementAddress = address(
      new ERC1967Proxy(
        address(implementation),
        abi.encodeCall(TokenEntitlement.initialize, ())
      )
    );
    tokenEntitlement = TokenEntitlement(entitlementAddress);
    tokenEntitlement.setSpace(address(this));
  }

  function testUpgradeTo() external {
    TokenEntitlementv2 implementation2 = new TokenEntitlementv2();

    TokenEntitlement(entitlementAddress).upgradeTo(address(implementation2));

    assertEq(
      TokenEntitlementv2(entitlementAddress).name(),
      "Token Entitlement"
    );
  }

  function testSupportInterface() external {
    bytes4 interfaceId = type(IEntitlement).interfaceId;
    assertTrue(tokenEntitlement.supportsInterface(interfaceId));
  }

  function testGetEntitlementDataByRoleId() external {
    address _space = createSimpleSpace();
    address _tokenEntitlement = getSpaceTokenEntitlement(_space);
    uint256 _ownerRoleId = Space(_space).ownerRoleId();
    address _spaceToken = spaceFactory.SPACE_TOKEN_ADDRESS();

    bytes[] memory entitlementData = IEntitlement(_tokenEntitlement)
      .getEntitlementDataByRoleId(_ownerRoleId);

    for (uint256 i = 0; i < entitlementData.length; i++) {
      DataTypes.ExternalToken[] memory externalTokens = abi.decode(
        entitlementData[i],
        (DataTypes.ExternalToken[])
      );

      assertEq(externalTokens.length, 1);
      assertEq(externalTokens[0].contractAddress, _spaceToken);
    }
  }

  function testRevertIfAddRoleToChannel() external {
    uint256 roleId = _randomUint256();
    string memory channelId = "some-channel";

    tokenEntitlement.addRoleIdToChannel(channelId, roleId);

    vm.expectRevert(Errors.RoleAlreadyExists.selector);
    tokenEntitlement.addRoleIdToChannel(channelId, roleId);
  }

  function testRemoveRoleIdFromChannel() external {
    string memory channelId = "some-channel";

    uint256 roleId = _randomUint256();
    uint256 roleId2 = _randomUint256();

    tokenEntitlement.addRoleIdToChannel(channelId, roleId);

    tokenEntitlement.addRoleIdToChannel(channelId, roleId2);
    tokenEntitlement.removeRoleIdFromChannel(channelId, roleId2);
  }

  function testRevertIfNoTokenQuantity() external {
    uint256 roleId = _randomUint256();

    DataTypes.ExternalToken[] memory tokens = new DataTypes.ExternalToken[](1);

    tokens[0] = DataTypes.ExternalToken({
      contractAddress: address(mockToken),
      quantity: 0,
      isSingleToken: false,
      tokenIds: new uint256[](0)
    });

    vm.expectRevert(Errors.QuantityNotFound.selector);
    tokenEntitlement.setEntitlement(roleId, abi.encode(tokens));
  }

  function testRevertIfNotContractAddress() external {
    uint256 roleId = _randomUint256();

    DataTypes.ExternalToken[] memory tokens = new DataTypes.ExternalToken[](1);

    tokens[0] = DataTypes.ExternalToken({
      contractAddress: address(0),
      quantity: 1,
      isSingleToken: false,
      tokenIds: new uint256[](0)
    });

    vm.expectRevert(Errors.AddressNotFound.selector);
    tokenEntitlement.setEntitlement(roleId, abi.encode(tokens));
  }

  function testRevertIfNoTokensSet() external {
    uint256 roleId = _randomUint256();

    vm.expectRevert(Errors.EntitlementNotFound.selector);
    tokenEntitlement.setEntitlement(
      roleId,
      abi.encode(new DataTypes.ExternalToken[](0))
    );
  }

  function testGetUserRoles() external {
    address _creator = _randomAddress();

    vm.prank(_creator);
    address _space = createSimpleSpace();
    address _tokenEntitlement = getSpaceTokenEntitlement(_space);

    DataTypes.Role[] memory roles = IEntitlement(_tokenEntitlement)
      .getUserRoles(_creator);

    assertEq(roles.length, 1);
  }

  function testInvalidRoleIds() external {
    address _space = createSimpleSpace();
    address _tokenEntitlement = getSpaceTokenEntitlement(_space);

    IEntitlement(_tokenEntitlement).isEntitled(
      "",
      _randomAddress(),
      bytes32(abi.encodePacked("NonExistentPermission"))
    );
  }

  function testSet1155EntitlementSingle() external {
    address _bob = _randomAddress();

    DataTypes.ExternalToken[] memory tokens = new DataTypes.ExternalToken[](1);

    string[] memory permissions = new string[](1);
    permissions[0] = Permissions.Read;

    uint256 tokenType = 1;
    mockToken2.mintTo(_bob, tokenType);

    uint256[] memory tokenTypes = new uint256[](1);
    tokenTypes[0] = tokenType;

    tokens[0] = DataTypes.ExternalToken({
      contractAddress: address(mockToken2),
      quantity: 1,
      isSingleToken: true,
      tokenIds: tokenTypes
    });

    DataTypes.CreateSpaceExtraEntitlements memory _entitlementData = DataTypes
      .CreateSpaceExtraEntitlements({
        roleName: "Moderator",
        permissions: permissions,
        users: new address[](0),
        tokens: tokens
      });

    address _space = createSpaceWithEntitlements(_entitlementData);

    address _tokenEntitlement = getSpaceTokenEntitlement(_space);

    assertTrue(
      IEntitlement(_tokenEntitlement).isEntitled(
        "",
        _bob,
        bytes32(abi.encodePacked(Permissions.Read))
      )
    );

    assertFalse(
      IEntitlement(_tokenEntitlement).isEntitled(
        "some-channel",
        _bob,
        bytes32(abi.encodePacked(Permissions.Read))
      )
    );
  }

  function testMultipleTokens() external {
    address owner = _randomAddress();
    address collector = _randomAddress();
    address hodler = _randomAddress();

    string memory roleName = "Member";
    string memory permission = Permissions.Read;

    DataTypes.CreateSpaceExtraEntitlements memory _entitlementData = DataTypes
      .CreateSpaceExtraEntitlements({
        roleName: roleName,
        permissions: new string[](1),
        tokens: new DataTypes.ExternalToken[](2),
        users: new address[](0)
      });

    _entitlementData.permissions[0] = permission;
    _entitlementData.tokens[0] = DataTypes.ExternalToken({
      contractAddress: address(mockToken),
      quantity: 1,
      isSingleToken: false,
      tokenIds: new uint256[](0)
    });
    _entitlementData.tokens[1] = DataTypes.ExternalToken({
      contractAddress: address(mockToken3),
      quantity: 100,
      isSingleToken: false,
      tokenIds: new uint256[](0)
    });

    vm.prank(owner);
    address _space = createSpaceWithEntitlements(_entitlementData);

    // collector doesn't have anything yet
    assertFalse(Space(_space).isEntitledToSpace(collector, Permissions.Read));

    // mint nft to collector
    mockToken.mintTo(collector);

    // collector should not be entitled yet
    assertFalse(Space(_space).isEntitledToSpace(collector, Permissions.Read));

    // mint 100 tokens to collector
    mockToken3.mint(collector, 100);

    // collector should be entitled now
    assertTrue(Space(_space).isEntitledToSpace(collector, Permissions.Read));

    address _tokenEntitlement = getSpaceTokenEntitlement(_space);

    // create another role with the same permission
    DataTypes.ExternalToken[]
      memory _externalTokens = new DataTypes.ExternalToken[](1);
    _externalTokens[0] = DataTypes.ExternalToken({
      contractAddress: address(mockToken),
      quantity: 1,
      isSingleToken: false,
      tokenIds: new uint256[](0)
    });

    DataTypes.Entitlement[] memory _entitlements = new DataTypes.Entitlement[](
      1
    );
    _entitlements[0] = DataTypes.Entitlement({
      module: address(_tokenEntitlement),
      data: abi.encode(_externalTokens)
    });

    string[] memory _permissions = new string[](1);
    _permissions[0] = "OnlyCollector";

    vm.prank(owner);
    Space(_space).createRole("Member2", _permissions, _entitlements);

    // collector should be entitled to the new permission because the nft is owned
    assertTrue(Space(_space).isEntitledToSpace(collector, "OnlyCollector"));

    assertFalse(Space(_space).isEntitledToSpace(hodler, "OnlyCollector"));

    // mint nft to hodler
    mockToken.mintTo(hodler);
    assertTrue(Space(_space).isEntitledToSpace(hodler, "OnlyCollector"));
    // should not be read
    assertFalse(Space(_space).isEntitledToSpace(hodler, Permissions.Read));
  }

  function testSet1155EntitlementAny() external {
    address _bob = _randomAddress();

    DataTypes.ExternalToken[] memory tokens = new DataTypes.ExternalToken[](1);

    string[] memory permissions = new string[](1);
    permissions[0] = Permissions.Read;

    uint256 tokenType = 1;
    mockToken2.mintTo(_bob, tokenType);

    uint256[] memory tokenIds = new uint256[](1);
    tokenIds[0] = tokenType;

    tokens[0] = DataTypes.ExternalToken({
      contractAddress: address(mockToken2),
      quantity: 1,
      isSingleToken: false,
      tokenIds: tokenIds
    });

    DataTypes.CreateSpaceExtraEntitlements memory _entitlementData = DataTypes
      .CreateSpaceExtraEntitlements({
        roleName: "Moderator",
        permissions: permissions,
        users: new address[](0),
        tokens: tokens
      });

    address _space = createSpaceWithEntitlements(_entitlementData);

    assertTrue(Space(_space).isEntitledToSpace(_bob, Permissions.Read));
  }

  function testRemoveEntitlement() external {
    uint256 roleId = _randomUint256();

    DataTypes.ExternalToken[] memory tokens = new DataTypes.ExternalToken[](1);

    tokens[0] = DataTypes.ExternalToken({
      contractAddress: address(mockToken),
      quantity: 1,
      isSingleToken: false,
      tokenIds: new uint256[](0)
    });

    DataTypes.ExternalToken[] memory tokens2 = new DataTypes.ExternalToken[](1);

    tokens2[0] = DataTypes.ExternalToken({
      contractAddress: address(mockToken),
      quantity: 10,
      isSingleToken: false,
      tokenIds: new uint256[](0)
    });

    tokenEntitlement.setEntitlement(roleId, abi.encode(tokens2));
    tokenEntitlement.setEntitlement(roleId, abi.encode(tokens));

    tokenEntitlement.getEntitlementDataByRoleId(roleId);

    tokenEntitlement.removeEntitlement(roleId, abi.encode(tokens));
  }
}

contract TokenEntitlementv2 is TokenEntitlement {}
