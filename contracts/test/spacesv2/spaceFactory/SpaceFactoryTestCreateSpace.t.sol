// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {Errors} from "contracts/src/spacesv2/libraries/Errors.sol";
import {DataTypes} from "contracts/src/spacesv2/libraries/DataTypes.sol";
import {Permissions} from "contracts/src/spacesv2/libraries/Permissions.sol";

import {SpaceFactory} from "contracts/src/spacesv2/SpaceFactory.sol";
import {Space} from "contracts/src/spacesv2/Space.sol";
import {BaseSetup} from "contracts/test/spacesv2/BaseSetup.sol";

import {Mock721} from "contracts/test/spacesv2/mocks/MockToken.sol";

import {console} from "forge-std/console.sol";

contract SpaceFactoryTestCreateSpace is BaseSetup {
  function setUp() external {
    BaseSetup.init();
  }

  function testUpdateImplementation() external {
    address space = _randomAddress();
    address tokenEntitlement = _randomAddress();
    address userEntitlement = _randomAddress();

    spaceFactory.updateImplementations(
      space,
      tokenEntitlement,
      userEntitlement
    );

    assertEq(spaceFactory.SPACE_IMPLEMENTATION_ADDRESS(), space);
    assertEq(spaceFactory.TOKEN_IMPLEMENTATION_ADDRESS(), tokenEntitlement);
    assertEq(spaceFactory.USER_IMPLEMENTATION_ADDRESS(), userEntitlement);
  }

  function testCreateSimpleSpace() external {
    address spaceAddress = createSimpleSpace();
    bytes32 spaceHash = keccak256(bytes("!7evmpuHDDgkady9u:goerli"));
    assertEq(spaceFactory.spaceByHash(spaceHash), spaceAddress);
  }

  function testRevertIfInvalidNameLength() external {
    DataTypes.CreateSpaceExtraEntitlements memory _extraEntitlements = DataTypes
      .CreateSpaceExtraEntitlements({
        roleName: "",
        permissions: new string[](0),
        tokens: new DataTypes.ExternalToken[](0),
        users: new address[](0)
      });

    string[] memory _permissions = new string[](0);

    vm.expectRevert(Errors.NameLengthInvalid.selector);
    spaceFactory.createSpace(
      "z",
      "!7evmpuHDDgkady9u:goerli",
      "ipfs://QmZion",
      _permissions,
      _extraEntitlements
    );
  }

  function testRevertIfSpaceNameInvalid() external {
    DataTypes.CreateSpaceExtraEntitlements memory _extraEntitlements = DataTypes
      .CreateSpaceExtraEntitlements({
        roleName: "",
        permissions: new string[](0),
        tokens: new DataTypes.ExternalToken[](0),
        users: new address[](0)
      });

    string[] memory _everyonePermissions = new string[](0);

    vm.expectRevert(Errors.NameContainsInvalidCharacters.selector);
    spaceFactory.createSpace(
      "Crzy_Sp@ce_N@m3",
      "!7evmpuHDDgkady9u:goerli",
      "ipfs://QmZion",
      _everyonePermissions,
      _extraEntitlements
    );
  }

  function testRevertIfSpaceAlreadyRegistered() external {
    createSimpleSpace();

    vm.expectRevert(Errors.SpaceAlreadyRegistered.selector);
    createSimpleSpace();
  }

  function testNFTWasMinted() external {
    createSimpleSpace();

    // grab token id of new space
    bytes32 spaceHash = keccak256(bytes("!7evmpuHDDgkady9u:goerli"));
    uint256 tokenId = spaceFactory.tokenByHash(spaceHash);

    assertEq(spaceToken.ownerOf(tokenId), address(this));
  }

  function testEntitlementModulesDeployed() external {
    createSimpleSpace();

    bytes32 spaceHash = keccak256(bytes("!7evmpuHDDgkady9u:goerli"));
    address spaceAddress = spaceFactory.spaceByHash(spaceHash);

    address[] memory entitlements = Space(spaceAddress).getEntitlements();

    assertEq(entitlements.length, 2);
  }

  function testOwnerEntitlement() external {
    address creator = _randomAddress();

    vm.prank(creator);
    address spaceAddress = createSimpleSpace();

    assertTrue(Space(spaceAddress).isEntitledToSpace(creator, Permissions.Owner));
  }

  function testEveryoneEntitlement() external {
    address creator = _randomAddress();

    string[] memory _permissions = new string[](1);
    _permissions[0] = Permissions.Read;

    vm.prank(creator);
    address spaceAddress = createSpaceWithEveryonePermissions(_permissions);

    assertTrue(
      Space(spaceAddress).isEntitledToSpace(_randomAddress(), Permissions.Read)
    );
  }

  function testExtraEntitlementsWithTokenAndUser() external {
    Mock721 mockToken = new Mock721();

    address creator = _randomAddress();
    address bob = _randomAddress();
    address alice = _randomAddress();

    DataTypes.CreateSpaceExtraEntitlements memory _extraEntitlements = DataTypes
      .CreateSpaceExtraEntitlements({
        roleName: "Custom Role",
        permissions: new string[](1),
        tokens: new DataTypes.ExternalToken[](1),
        users: new address[](1)
      });

    _extraEntitlements.permissions[0] = Permissions.Read;
    _extraEntitlements.users[0] = bob;
    _extraEntitlements.tokens[0] = DataTypes.ExternalToken({
      contractAddress: address(mockToken),
      quantity: 1,
      isSingleToken: false,
      tokenIds: new uint256[](0)
    });

    mockToken.mintTo(alice);

    vm.prank(creator);
    address spaceAddress = createSpaceWithEntitlements(_extraEntitlements);

    assertTrue(Space(spaceAddress).isEntitledToSpace(creator, Permissions.Owner));

    assertTrue(Space(spaceAddress).isEntitledToSpace(bob, Permissions.Read));
    assertTrue(Space(spaceAddress).isEntitledToSpace(alice, Permissions.Read));

    assertFalse(Space(spaceAddress).isEntitledToSpace(bob, Permissions.Write));
    assertFalse(Space(spaceAddress).isEntitledToSpace(alice, Permissions.Write));
  }

  function testOwnershipTransferred() external {
    address creator = _randomAddress();

    vm.prank(creator);
    address spaceAddress = createSimpleSpace();

    assertEq(Space(spaceAddress).owner(), creator);
  }
}
