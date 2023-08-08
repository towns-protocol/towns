// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {Errors} from "contracts/src/spaces/libraries/Errors.sol";
import {Permissions} from "contracts/src/spaces/libraries/Permissions.sol";
import {DataTypes} from "contracts/src/spaces/libraries/DataTypes.sol";

import {SpaceFactory} from "contracts/src/spaces/SpaceFactory.sol";
import {Space} from "contracts/src/spaces/Space.sol";
import {SpaceBaseSetup} from "contracts/test/spaces/SpaceBaseSetup.sol";

import {Mock721, MockERC20} from "contracts/test/mocks/MockToken.sol";

import {console} from "forge-std/console.sol";

contract SpaceFactoryTestCreateSpace is SpaceBaseSetup {
  function setUp() external {}

  function testUpdateImplementation() external {
    address space = _randomAddress();
    address tokenEntitlement = _randomAddress();
    address userEntitlement = _randomAddress();
    address gateToken = _randomAddress();
    address spaceUpgrade = _randomAddress();

    spaceFactory.setPaused(true);

    spaceFactory.updateImplementations(
      space,
      tokenEntitlement,
      userEntitlement,
      gateToken,
      spaceUpgrade
    );

    assertEq(spaceFactory.SPACE_IMPLEMENTATION_ADDRESS(), space);
    assertEq(spaceFactory.TOKEN_IMPLEMENTATION_ADDRESS(), tokenEntitlement);
    assertEq(spaceFactory.USER_IMPLEMENTATION_ADDRESS(), userEntitlement);
    assertEq(spaceFactory.GATE_TOKEN_ADDRESS(), gateToken);
  }

  function testRevertIfNoSpaceNetworkId() external {
    vm.expectRevert(Errors.InvalidParameters.selector);
    spaceFactory.createSpace(
      DataTypes.CreateSpaceData(
        "zion",
        "",
        "ipfs://QmZion",
        "general",
        "!8evmpuHDDgkady6u:goerli"
      ),
      new string[](0),
      DataTypes.CreateSpaceExtraEntitlements({
        roleName: "",
        permissions: new string[](0),
        tokens: new DataTypes.ExternalToken[](0),
        users: new address[](0)
      })
    );
  }

  function test_createSpaceWithDefaultChannel() external {
    address spaceOwner = makeAddr("spaceOwner");

    vm.prank(spaceOwner);
    address spaceAddress = createSimpleSpace();

    Space space = Space(spaceAddress);

    bytes32[] memory channels = space.getChannels();

    assertEq(channels.length, 1);

    for (uint256 i = 0; i < channels.length; i++) {
      bytes32 channelHash = channels[i];
      DataTypes.Channel memory channel = space.getChannelByHash(channelHash);

      assertTrue(_isEqual(channel.name, "general"));
    }
  }

  function testCreateSpaceWithERC20Token() external {
    address spaceOwner1 = _randomAddress();
    address spaceOwner2 = _randomAddress();
    address hodler = _randomAddress();
    string memory permission = "TokenHodler";
    string memory roleName = "hodler";

    MockERC20 token = new MockERC20();
    DataTypes.CreateSpaceExtraEntitlements memory _entitlementData = DataTypes
      .CreateSpaceExtraEntitlements({
        roleName: roleName,
        permissions: new string[](1),
        tokens: new DataTypes.ExternalToken[](1),
        users: new address[](0)
      });

    _entitlementData.permissions[0] = permission;
    _entitlementData.tokens[0] = DataTypes.ExternalToken({
      contractAddress: address(token),
      quantity: 100,
      isSingleToken: false,
      tokenIds: new uint256[](0)
    });

    vm.prank(spaceOwner1);
    address space1 = createFuzzySpace(
      "space1",
      "space1networkId",
      "ipfs://",
      "general",
      "!8evmpuHDDgkady6u:goerli"
    );

    vm.prank(spaceOwner2);
    address space2 = createSpaceWithEntitlements(_entitlementData);

    assertTrue(Space(space2).isEntitledToSpace(spaceOwner2, Permissions.Owner));
    assertTrue(
      Space(space2).isEntitledToSpace(
        address(spaceUpgrades),
        Permissions.Upgrade
      )
    );
    assertFalse(
      Space(space2).isEntitledToSpace(spaceOwner1, Permissions.Owner)
    );
    assertFalse(Space(space2).isEntitledToSpace(hodler, permission));

    token.mint(hodler, 100);

    assertTrue(Space(space2).isEntitledToSpace(hodler, permission));
    assertFalse(Space(space1).isEntitledToSpace(hodler, permission));
  }

  function testRevertIfInvalidSpaceOwner() external {
    address spaceOwner1 = _randomAddress();
    address spaceOwner2 = _randomAddress();

    vm.prank(spaceOwner1);
    address space1 = createFuzzySpace(
      "space1",
      "space1networkId",
      "ipfs://",
      "general",
      "!8evmpuHDDgkady6u:goerli"
    );

    vm.prank(spaceOwner2);
    address space2 = createFuzzySpace(
      "space2",
      "space2networkId",
      "ipfs://",
      "general",
      "!8evmpuHDDgkady6u:goerli"
    );

    assertTrue(Space(space1).isEntitledToSpace(spaceOwner1, Permissions.Owner));
    assertFalse(
      Space(space1).isEntitledToSpace(spaceOwner2, Permissions.Owner)
    );
    assertTrue(Space(space2).isEntitledToSpace(spaceOwner2, Permissions.Owner));
    assertFalse(
      Space(space2).isEntitledToSpace(spaceOwner1, Permissions.Owner)
    );
  }

  function testRevertIfCreateSimpleSpaceWithoutNFT() external {
    DataTypes.CreateSpaceExtraEntitlements memory _entitlementData = DataTypes
      .CreateSpaceExtraEntitlements({
        roleName: "",
        permissions: new string[](0),
        tokens: new DataTypes.ExternalToken[](0),
        users: new address[](0)
      });

    string[] memory _permissions = new string[](0);

    spaceFactory.setPaused(true);
    spaceFactory.setGatingEnabled(true);
    spaceFactory.setPaused(false);

    vm.expectRevert(Errors.NotAllowed.selector);
    vm.prank(_randomAddress());
    spaceFactory.createSpace(
      DataTypes.CreateSpaceData(
        "zion",
        "!7evmpuHDDgkady9u:goerli",
        "ipfs://QmZion",
        "general",
        "!8evmpuHDDgkady6u:goerli"
      ),
      _permissions,
      _entitlementData
    );
  }

  function testRevertCreateSimpleSpaceIfPaused() external {
    spaceFactory.setPaused(true);

    vm.expectRevert("Pausable: paused");
    address spaceAddress = createSimpleSpace();
    bytes32 spaceHash = keccak256(bytes("!7evmpuHDDgkady9u:goerli"));
    assertEq(spaceFactory.spaceByHash(spaceHash), spaceAddress);
  }

  function testCreateSimpleSpace() external {
    address spaceAddress = createSimpleSpace();
    bytes32 spaceHash = keccak256(bytes("!7evmpuHDDgkady9u:goerli"));
    assertEq(spaceFactory.spaceByHash(spaceHash), spaceAddress);
  }

  function testCreateSimpleSpaceWithGatingEnabled() external {
    spaceFactory.setPaused(true);
    spaceFactory.setGatingEnabled(true);
    spaceFactory.setPaused(false);

    pioneer.mintTo(address(this));

    address spaceAddress = createSimpleSpace();
    bytes32 spaceHash = keccak256(bytes("!7evmpuHDDgkady9u:goerli"));
    assertEq(spaceFactory.spaceByHash(spaceHash), spaceAddress);
  }

  function testGetTokenIdByNetworkId() external {
    createSimpleSpace();
    uint256 tokenId = spaceFactory.getTokenIdByNetworkId(
      "!7evmpuHDDgkady9u:goerli"
    );

    assertEq(tokenId, 0);
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
      DataTypes.CreateSpaceData(
        "z",
        "!7evmpuHDDgkady9u:goerli",
        "ipfs://QmZion",
        "general",
        "!8evmpuHDDgkady6u:goerli"
      ),
      _permissions,
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

    DataTypes.EntitlementModule[] memory entitlements = Space(spaceAddress)
      .getEntitlementModules();

    assertEq(entitlements.length, 2);
  }

  function testOwnerEntitlement() external {
    address creator = _randomAddress();

    vm.prank(creator);
    address spaceAddress = createSimpleSpace();

    assertTrue(
      Space(spaceAddress).isEntitledToSpace(creator, Permissions.Owner)
    );
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
        roleName: "custom-role",
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

    assertTrue(
      Space(spaceAddress).isEntitledToSpace(creator, Permissions.Owner)
    );

    assertTrue(Space(spaceAddress).isEntitledToSpace(bob, Permissions.Read));
    assertTrue(Space(spaceAddress).isEntitledToSpace(alice, Permissions.Read));

    assertFalse(Space(spaceAddress).isEntitledToSpace(bob, Permissions.Write));
    assertFalse(
      Space(spaceAddress).isEntitledToSpace(alice, Permissions.Write)
    );
  }

  function testUpgradeEntitlement() external {
    address creator = _randomAddress();

    vm.prank(creator);
    address spaceAddress = createSimpleSpace();

    assertTrue(
      Space(spaceAddress).isEntitledToSpace(
        address(spaceUpgrades),
        Permissions.Upgrade
      )
    );
  }

  function testOwnershipTransferred() external {
    address creator = _randomAddress();

    vm.prank(creator);
    address spaceAddress = createSimpleSpace();

    assertTrue(
      Space(spaceAddress).isEntitledToSpace(creator, Permissions.Owner)
    );
  }

  function test_setSpaceToken() external {
    address spaceToken = _randomAddress();

    spaceFactory.setPaused(true);
    spaceFactory.setSpaceToken(address(spaceToken));
    spaceFactory.setPaused(false);

    assertEq(spaceFactory.SPACE_TOKEN_ADDRESS(), address(spaceToken));
  }
}
