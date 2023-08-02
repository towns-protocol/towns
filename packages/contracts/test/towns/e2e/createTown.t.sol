// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces
import {ITownArchitectStructs, ITownArchitectEvents} from "contracts/src/towns/facets/architect/ITownArchitect.sol";
import {ITownArchitect} from "contracts/src/towns/facets/architect/ITownArchitect.sol";
import {IDiamond} from "contracts/src/diamond/IDiamond.sol";
import {IDiamondCut} from "contracts/src/diamond/facets/cut/IDiamondCut.sol";

import {ITokenEntitlement} from "contracts/src/towns/entitlements/token/ITokenEntitlement.sol";
import {IChannel} from "contracts/src/towns/facets/channels/IChannel.sol";
import {IEntitlements} from "contracts/src/towns/facets/entitlements/IEntitlements.sol";
import {IRoles} from "contracts/src/towns/facets/roles/IRoles.sol";
import {IRolesStructs} from "contracts/src/towns/facets/roles/IRoles.sol";

// libraries
import {Permissions} from "contracts/src/spaces/libraries/Permissions.sol";

// contracts
import {Initializable_AlreadyInitialized} from "contracts/src/diamond/facets/initializable/Initializable.sol";

import {MockFacetHelper} from "contracts/test/mocks/MockFacet.sol";
import {TownFactory} from "contracts/src/towns/TownFactory.sol";
import {MockERC20} from "contracts/test/mocks/MockERC20.sol";
import {MockERC721} from "contracts/test/mocks/MockERC721.sol";
import {MockERC1155} from "contracts/test/mocks/MockERC1155.sol";

import {TownFactoryTest} from "contracts/test/towns/TownFactory.t.sol";
import {TownArchitect} from "contracts/src/towns/facets/architect/TownArchitect.sol";

contract CreateTownTest is TownFactoryTest, ITownArchitectEvents {
  ITownArchitect internal townArchitect;

  function setUp() public override {
    super.setUp();
    townArchitect = ITownArchitect(townFactory);
  }

  function test_create_town_with_default_channel(
    string memory townId
  ) external {
    vm.assume(bytes(townId).length > 0);

    address founder = _randomAddress();

    vm.prank(founder);
    address newTown = _createSimpleTown(townId);

    IChannel.Channel[] memory channels = IChannel(newTown).getChannels();
    assertEq(channels.length, 1, "Channel count mismatch");
  }

  function test_create_town_with_separate_channel() external {
    string memory townId = "test";

    address founder = _randomAddress();
    address member = _randomAddress();

    // create town

    vm.prank(founder);
    address newTown = _createSimpleTown(townId);

    // look for user entitlement
    IEntitlements.Entitlement[] memory entitlements = IEntitlements(newTown)
      .getEntitlements();

    address userEntitlement;

    for (uint256 i = 0; i < entitlements.length; i++) {
      if (
        keccak256(abi.encodePacked(entitlements[i].moduleType)) ==
        keccak256(abi.encodePacked("UserEntitlement"))
      ) {
        userEntitlement = entitlements[i].moduleAddress;
        break;
      }
    }

    if (userEntitlement == address(0)) {
      revert("User entitlement not found");
    }

    // create permissions for entitlement
    string[] memory permissions = new string[](1);
    permissions[0] = Permissions.Write;

    // create which entitlements have access to this role
    address[] memory users = new address[](1);
    users[0] = member;

    IRolesStructs.CreateEntitlement[]
      memory roleEntitlements = new IRolesStructs.CreateEntitlement[](1);

    // create entitlement adding users and user entitlement
    roleEntitlements[0] = IRolesStructs.CreateEntitlement({
      module: userEntitlement,
      data: abi.encode(users)
    });

    // create role with permissions and entitlements attached to it
    vm.prank(founder);
    uint256 roleId = IRoles(newTown).createRole(
      "Member",
      permissions,
      roleEntitlements
    );

    // create channel with no roles attached to it
    vm.prank(founder);
    IChannel(newTown).createChannel("test2", "test2", new uint256[](0));

    // members can access the town
    assertTrue(
      IEntitlements(newTown).isEntitledToTown(member, Permissions.Write)
    );

    // however they cannot access the channel
    assertFalse(
      IEntitlements(newTown).isEntitledToChannel(
        "test2",
        member,
        Permissions.Write
      )
    );

    // add role to channel to allow access
    vm.prank(founder);
    IChannel(newTown).addRoleToChannel("test2", roleId);

    // members can access the channel now
    assertTrue(
      IEntitlements(newTown).isEntitledToChannel(
        "test2",
        member,
        Permissions.Write
      )
    );
  }

  // =============================================================
  //                           Users
  // =============================================================
  function test_createTown_with_users() external {
    // vm.assume(bytes(townId).length > 0);

    string memory townId = "test";

    address founder = _randomAddress();
    address bob = _randomAddress();

    ITownArchitectStructs.TownInfo memory townInfo = ITownArchitectStructs
      .TownInfo({
        id: townId,
        metadata: "",
        everyoneEntitlement: ITownArchitectStructs.RoleInfo({
          name: "Everyone",
          permissions: new string[](0)
        }),
        memberEntitlement: ITownArchitectStructs.MemberEntitlement({
          role: ITownArchitectStructs.RoleInfo({
            name: "Member",
            permissions: new string[](1)
          }),
          tokens: new ITokenEntitlement.ExternalToken[](0),
          users: new address[](1)
        }),
        channel: ITownArchitectStructs.ChannelInfo({
          metadata: "ipfs://test",
          id: "test"
        })
      });

    townInfo.memberEntitlement.role.permissions[0] = Permissions.Read;
    townInfo.memberEntitlement.users[0] = bob;

    vm.prank(founder);
    address newTown = townArchitect.createTown(townInfo);

    assertTrue(
      IEntitlements(newTown).isEntitledToTown(bob, Permissions.Read),
      "Bob should be entitled to read"
    );
  }

  // =============================================================
  //                           ERC20
  // =============================================================

  function test_createTown_with_erc20(string memory townId) external {
    vm.assume(bytes(townId).length > 0);

    string[] memory memberPermissions = new string[](1);
    memberPermissions[0] = Permissions.Read;

    MockERC20 token = new MockERC20("test", "test");

    ITokenEntitlement.ExternalToken[]
      memory tokens = new ITokenEntitlement.ExternalToken[](1);

    tokens[0] = ITokenEntitlement.ExternalToken({
      contractAddress: address(token),
      quantity: 100,
      isSingleToken: false,
      tokenIds: new uint256[](0)
    });

    ITownArchitectStructs.TownInfo memory townInfo = ITownArchitectStructs
      .TownInfo({
        id: townId,
        metadata: "test",
        everyoneEntitlement: ITownArchitectStructs.RoleInfo({
          name: "Everyone",
          permissions: new string[](0)
        }),
        memberEntitlement: ITownArchitectStructs.MemberEntitlement({
          role: ITownArchitectStructs.RoleInfo({
            name: "test",
            permissions: memberPermissions
          }),
          tokens: tokens,
          users: new address[](0)
        }),
        channel: ITownArchitectStructs.ChannelInfo({
          metadata: "ipfs://test",
          id: "test"
        })
      });

    address founder = _randomAddress();

    vm.prank(founder);
    address newTown = townArchitect.createTown(townInfo);

    address member = _randomAddress();
    address notMember = _randomAddress();

    token.mintTo(member, 100);

    bool isEntitled = IEntitlements(newTown).isEntitledToTown(
      member,
      Permissions.Read
    );
    assertTrue(isEntitled, "Member should be entitled to read");

    isEntitled = IEntitlements(newTown).isEntitledToTown(
      notMember,
      Permissions.Read
    );

    assertFalse(isEntitled, "Non-member should not be entitled to read");

    assertTrue(
      IEntitlements(newTown).isEntitledToChannel(
        "test",
        member,
        Permissions.Read
      )
    );
  }

  function test_createTown_not_allowed_when_invalid_erc20_singleToken(
    string memory townId
  ) external {
    vm.assume(bytes(townId).length > 0);

    address founder = _randomAddress();
    address member = _randomAddress();

    MockERC20 token = new MockERC20("test", "test");
    token.mintTo(member, 100);

    string[] memory memberPermissions = new string[](1);
    memberPermissions[0] = Permissions.Read;

    ITokenEntitlement.ExternalToken[]
      memory tokens = new ITokenEntitlement.ExternalToken[](1);

    tokens[0] = ITokenEntitlement.ExternalToken({
      contractAddress: address(token),
      quantity: 100,
      isSingleToken: true,
      tokenIds: new uint256[](0)
    });

    ITownArchitectStructs.TownInfo memory townInfo = ITownArchitectStructs
      .TownInfo({
        id: townId,
        metadata: "test",
        everyoneEntitlement: ITownArchitectStructs.RoleInfo({
          name: "Everyone",
          permissions: new string[](0)
        }),
        memberEntitlement: ITownArchitectStructs.MemberEntitlement({
          role: ITownArchitectStructs.RoleInfo({
            name: "test",
            permissions: memberPermissions
          }),
          tokens: tokens,
          users: new address[](0)
        }),
        channel: ITownArchitectStructs.ChannelInfo({
          metadata: "ipfs://test",
          id: "test"
        })
      });

    vm.prank(founder);
    address newTown = townArchitect.createTown(townInfo);

    bool isEntitled = IEntitlements(newTown).isEntitledToTown(
      member,
      Permissions.Read
    );
    assertFalse(isEntitled, "Member should not be entitled to read");
  }

  function test_createTown_not_allowed_when_invalid_erc20_tokenIds(
    string memory townId
  ) external {
    vm.assume(bytes(townId).length > 0);

    address founder = _randomAddress();
    address member = _randomAddress();

    MockERC20 token = new MockERC20("test", "test");
    token.mintTo(member, 100);

    string[] memory memberPermissions = new string[](1);
    memberPermissions[0] = Permissions.Read;

    ITokenEntitlement.ExternalToken[]
      memory tokens = new ITokenEntitlement.ExternalToken[](1);

    tokens[0] = ITokenEntitlement.ExternalToken({
      contractAddress: address(token),
      quantity: 100,
      isSingleToken: false,
      tokenIds: new uint256[](1)
    });

    ITownArchitectStructs.TownInfo memory townInfo = ITownArchitectStructs
      .TownInfo({
        id: townId,
        metadata: "test",
        everyoneEntitlement: ITownArchitectStructs.RoleInfo({
          name: "Everyone",
          permissions: new string[](0)
        }),
        memberEntitlement: ITownArchitectStructs.MemberEntitlement({
          role: ITownArchitectStructs.RoleInfo({
            name: "test",
            permissions: memberPermissions
          }),
          tokens: tokens,
          users: new address[](0)
        }),
        channel: ITownArchitectStructs.ChannelInfo({
          metadata: "ipfs://test",
          id: "test"
        })
      });

    vm.prank(founder);
    address newTown = townArchitect.createTown(townInfo);

    bool isEntitled = IEntitlements(newTown).isEntitledToTown(
      member,
      Permissions.Read
    );
    assertFalse(isEntitled, "Member should not be entitled to read");
  }

  // =============================================================
  //                           NFT
  // =============================================================

  function test_createTown_with_nft(string memory townId) external {
    vm.assume(bytes(townId).length > 0);

    MockERC721 nft = new MockERC721();

    address founder = _randomAddress();
    address bob = _randomAddress();
    address alice = _randomAddress();

    nft.mintTo(alice);
    uint256 tokenId = nft.mintTo(bob);

    uint256[] memory tokenIds = new uint256[](1);
    tokenIds[0] = tokenId;

    ITownArchitectStructs.TownInfo memory townInfo = ITownArchitectStructs
      .TownInfo({
        id: townId,
        metadata: "",
        everyoneEntitlement: ITownArchitectStructs.RoleInfo({
          name: "Everyone",
          permissions: new string[](0)
        }),
        memberEntitlement: ITownArchitectStructs.MemberEntitlement({
          role: ITownArchitectStructs.RoleInfo({
            name: "Member",
            permissions: new string[](1)
          }),
          tokens: new ITokenEntitlement.ExternalToken[](1),
          users: new address[](0)
        }),
        channel: ITownArchitectStructs.ChannelInfo({
          metadata: "ipfs://test",
          id: "test"
        })
      });

    townInfo.memberEntitlement.role.permissions[0] = Permissions.Read;
    townInfo.memberEntitlement.tokens[0] = ITokenEntitlement.ExternalToken({
      contractAddress: address(nft),
      quantity: 1,
      isSingleToken: true,
      tokenIds: tokenIds
    });

    vm.prank(founder);
    address newTown = townArchitect.createTown(townInfo);

    assertTrue(
      IEntitlements(newTown).isEntitledToTown(bob, Permissions.Read),
      "Bob should be entitled to read"
    );

    assertFalse(
      IEntitlements(newTown).isEntitledToTown(alice, Permissions.Read),
      "Alice should not be entitled to read"
    );
  }

  function test_createTown_with_nft_and_users(string memory townId) external {
    vm.assume(bytes(townId).length > 0);

    MockERC721 nft = new MockERC721();

    address founder = _randomAddress();
    address bob = _randomAddress();
    address alice = _randomAddress();

    ITownArchitectStructs.TownInfo memory townInfo = ITownArchitectStructs
      .TownInfo({
        id: townId,
        metadata: "",
        everyoneEntitlement: ITownArchitectStructs.RoleInfo({
          name: "Everyone",
          permissions: new string[](0)
        }),
        memberEntitlement: ITownArchitectStructs.MemberEntitlement({
          role: ITownArchitectStructs.RoleInfo({
            name: "Member",
            permissions: new string[](1)
          }),
          tokens: new ITokenEntitlement.ExternalToken[](1),
          users: new address[](1)
        }),
        channel: ITownArchitectStructs.ChannelInfo({
          metadata: "ipfs://test",
          id: "test"
        })
      });

    townInfo.memberEntitlement.role.permissions[0] = Permissions.Read;
    townInfo.memberEntitlement.users[0] = bob;
    townInfo.memberEntitlement.tokens[0] = ITokenEntitlement.ExternalToken({
      contractAddress: address(nft),
      quantity: 1,
      isSingleToken: false,
      tokenIds: new uint256[](0)
    });

    vm.prank(founder);
    address newTown = townArchitect.createTown(townInfo);

    assertTrue(
      IEntitlements(newTown).isEntitledToTown(bob, Permissions.Read),
      "Bob should be entitled to read"
    );

    assertFalse(
      IEntitlements(newTown).isEntitledToTown(alice, Permissions.Read),
      "Alice should not be entitled to read"
    );

    nft.mintTo(alice);

    assertTrue(
      IEntitlements(newTown).isEntitledToTown(alice, Permissions.Read),
      "Alice should be entitled to read"
    );

    assertFalse(
      IEntitlements(newTown).isEntitledToTown(alice, Permissions.Write),
      "Alice should not be entitled to write"
    );

    assertFalse(
      IEntitlements(newTown).isEntitledToTown(bob, Permissions.Write),
      "Bob should not be entitled to write"
    );
  }

  // =============================================================
  //                           1155
  // =============================================================

  function test_createTown_with_erc1155() external {
    MockERC1155 nft = new MockERC1155();

    address founder = _randomAddress();
    address alice = _randomAddress();
    address bob = _randomAddress();
    address charlie = _randomAddress();

    nft.mintTo(alice, 1);
    nft.mintTo(bob, 2);
    nft.mintTo(charlie, 3);

    uint256[] memory tokenTypes = new uint256[](2);
    tokenTypes[0] = 1;
    tokenTypes[1] = 2;

    ITownArchitectStructs.TownInfo memory townInfo = ITownArchitectStructs
      .TownInfo({
        id: "test",
        metadata: "",
        everyoneEntitlement: ITownArchitectStructs.RoleInfo({
          name: "Everyone",
          permissions: new string[](0)
        }),
        memberEntitlement: ITownArchitectStructs.MemberEntitlement({
          role: ITownArchitectStructs.RoleInfo({
            name: "Member",
            permissions: new string[](1)
          }),
          tokens: new ITokenEntitlement.ExternalToken[](1),
          users: new address[](0)
        }),
        channel: ITownArchitectStructs.ChannelInfo({
          metadata: "ipfs://test",
          id: "test"
        })
      });

    townInfo.memberEntitlement.role.permissions[0] = Permissions.Read;
    townInfo.memberEntitlement.tokens[0] = ITokenEntitlement.ExternalToken({
      contractAddress: address(nft),
      quantity: 1,
      isSingleToken: false,
      tokenIds: tokenTypes
    });

    vm.prank(founder);
    address newTown = townArchitect.createTown(townInfo);

    assertTrue(
      IEntitlements(newTown).isEntitledToTown(bob, Permissions.Read),
      "Bob should be entitled to read"
    );

    assertTrue(
      IEntitlements(newTown).isEntitledToTown(alice, Permissions.Read),
      "Alice should be entitled to read"
    );

    assertFalse(
      IEntitlements(newTown).isEntitledToTown(charlie, Permissions.Read),
      "Charlie should not be entitled to read"
    );
  }

  // ======================= Reverts =======================

  function test_revert_not_town_owner(
    string memory townId1,
    string memory townId2
  ) external {
    vm.assume(bytes(townId1).length > 0);
    vm.assume(bytes(townId2).length > 0);
    vm.assume(
      keccak256(abi.encodePacked(townId1)) !=
        keccak256(abi.encodePacked(townId2))
    );

    address founder1 = _randomAddress();
    address founder2 = _randomAddress();

    vm.prank(founder1);
    address town1 = _createSimpleTown(townId1);

    vm.prank(founder2);
    address town2 = _createSimpleTown(townId2);

    assertTrue(
      IEntitlements(town1).isEntitledToTown(founder1, Permissions.Read)
    );

    assertFalse(
      IEntitlements(town1).isEntitledToTown(founder2, Permissions.Read)
    );

    assertTrue(
      IEntitlements(town2).isEntitledToTown(founder2, Permissions.Read)
    );

    assertFalse(
      IEntitlements(town2).isEntitledToTown(founder1, Permissions.Read)
    );
  }

  function test_revertIfTryingtoReinitializeFactory() external {
    MockFacetHelper mockFacetHelper = new MockFacetHelper();

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
    cuts[0] = mockFacetHelper.makeCut(IDiamond.FacetCutAction.Add);

    (address initAddress, bytes memory initPayload) = _makeFactoryInitData();

    vm.prank(deployer);
    vm.expectRevert(
      abi.encodeWithSelector(Initializable_AlreadyInitialized.selector, 1)
    );
    IDiamondCut(townFactory).diamondCut(cuts, initAddress, initPayload);
  }
}
