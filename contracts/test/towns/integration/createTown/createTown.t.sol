// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IERC173} from "contracts/src/diamond/facets/ownable/IERC173.sol";
import {IChannel} from "contracts/src/towns/facets/channels/IChannel.sol";
import {IChannel} from "contracts/src/towns/facets/channels/IChannel.sol";
import {IEntitlementsManager} from "contracts/src/towns/facets/entitlements/IEntitlementsManager.sol";
import {ITokenEntitlement} from "contracts/src/towns/entitlements/token/ITokenEntitlement.sol";
import {IRoles} from "contracts/src/towns/facets/roles/IRoles.sol";
import {IRolesBase} from "contracts/src/towns/facets/roles/IRoles.sol";
import {ITownArchitect} from "contracts/src/towns/facets/architect/ITownArchitect.sol";
import {ITownArchitectBase} from "contracts/src/towns/facets/architect/ITownArchitect.sol";
import {IMembership} from "contracts/src/towns/facets/membership/IMembership.sol";
import {IERC721A} from "contracts/src/diamond/facets/token/ERC721A/IERC721A.sol";
import {IMembershipBase} from "contracts/src/towns/facets/membership/IMembership.sol";
import {IEntitlementRule} from "contracts/src/crosschain/IEntitlementRule.sol";

// libraries
import {Permissions} from "contracts/src/towns/facets/Permissions.sol";

// contracts
import {BaseSetup} from "contracts/test/towns/BaseSetup.sol";

import {TownArchitect} from "contracts/src/towns/facets/architect/TownArchitect.sol";

contract Integration_CreateTown is BaseSetup, IRolesBase, ITownArchitectBase {
  TownArchitect public townArchitect;

  function setUp() public override {
    super.setUp();

    townArchitect = TownArchitect(diamond);
  }

  function test_create_town_with_default_channel() external {
    string memory townId = "Test";

    address founder = _randomAddress();

    vm.prank(founder);
    address newTown = _createSimpleTown(townId);

    assertEq(founder, IERC173(newTown).owner());

    IChannel.Channel[] memory channels = IChannel(newTown).getChannels();

    assertEq(channels.length, 1);
  }

  function test_create_town_with_separate_channel() external {
    string memory townId = "test";

    address founder = _randomAddress();
    address member = _randomAddress();

    // create town

    vm.prank(founder);
    address newTown = _createSimpleTown(townId);

    // look for user entitlement
    IEntitlementsManager.Entitlement[]
      memory entitlements = IEntitlementsManager(newTown).getEntitlements();

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
    permissions[0] = "Write";

    // create which entitlements have access to this role
    address[] memory users = new address[](1);
    users[0] = member;

    CreateEntitlement[] memory roleEntitlements = new CreateEntitlement[](1);

    // create entitlement adding users and user entitlement
    roleEntitlements[0] = CreateEntitlement({
      module: userEntitlement,
      data: abi.encode(users)
    });

    // create role with permissions and entitlements attached to it
    vm.prank(founder);
    uint256 roleId = IRoles(newTown).createRole({
      roleName: "Member",
      permissions: permissions,
      entitlements: roleEntitlements
    });

    // create channel with no roles attached to it
    vm.prank(founder);
    IChannel(newTown).createChannel({
      channelId: "test2",
      metadata: "test2",
      roleIds: new uint256[](0)
    });

    // members can access the town
    assertTrue(
      IEntitlementsManager(newTown).isEntitledToTown({
        user: member,
        permission: "Write"
      })
    );

    // however they cannot access the channel
    assertFalse(
      IEntitlementsManager(newTown).isEntitledToChannel({
        channelId: "test2",
        user: member,
        permission: "Write"
      })
    );

    // add role to channel to allow access
    vm.prank(founder);
    IChannel(newTown).addRoleToChannel({channelId: "test2", roleId: roleId});

    // members can access the channel now
    assertTrue(
      IEntitlementsManager(newTown).isEntitledToChannel(
        "test2",
        member,
        "Write"
      )
    );
  }

  // =============================================================
  //                           Users
  // =============================================================
  function test_createTown_with_users() external {
    string memory townId = "test";

    address founder = _randomAddress();
    address bob = _randomAddress();

    TownInfo memory townInfo = TownInfo({
      id: townId,
      name: "test",
      uri: "ipfs://test",
      membership: Membership({
        settings: IMembershipBase.MembershipInfo({
          name: "Member",
          symbol: "MEM",
          price: 0,
          maxSupply: 0,
          duration: 0,
          currency: address(0),
          feeRecipient: address(0),
          freeAllocation: 0,
          pricingModule: address(0)
        }),
        requirements: MembershipRequirements({
          everyone: false,
          tokens: new ITokenEntitlement.ExternalToken[](0),
          users: new address[](1),
          rule: IEntitlementRule(address(0))
        }),
        permissions: new string[](1)
      }),
      channel: ChannelInfo({metadata: "ipfs://test", id: "test"})
    });

    townInfo.membership.permissions[0] = "Read";
    townInfo.membership.requirements.users[0] = bob;

    vm.prank(founder);
    address newTown = ITownArchitect(diamond).createTown(townInfo);

    assertTrue(
      IEntitlementsManager(newTown).isEntitledToTown(bob, "JoinTown"),
      "Bob should be entitled to mint membership"
    );

    vm.prank(bob);
    IMembership(newTown).joinTown(bob);

    assertEq(
      IERC721A(newTown).balanceOf(bob),
      1,
      "Bob should have 1 membership token"
    );

    assertTrue(
      IEntitlementsManager(newTown).isEntitledToTown(bob, "Read"),
      "Bob should be entitled to read"
    );
  }

  // =============================================================
  //                           Helpers
  // =============================================================
  function _createSimpleTown(string memory townId) internal returns (address) {
    ITownArchitectBase.TownInfo memory townInfo = ITownArchitectBase.TownInfo({
      id: townId,
      name: "test",
      uri: "ipfs://test",
      membership: ITownArchitectBase.Membership({
        settings: IMembershipBase.MembershipInfo({
          name: "Member",
          symbol: "MEM",
          price: 0,
          maxSupply: 0,
          duration: 0,
          currency: address(0),
          feeRecipient: address(0),
          freeAllocation: 0,
          pricingModule: address(0)
        }),
        requirements: ITownArchitectBase.MembershipRequirements({
          everyone: false,
          tokens: new ITokenEntitlement.ExternalToken[](0),
          users: new address[](0),
          rule: IEntitlementRule(address(0))
        }),
        permissions: new string[](0)
      }),
      channel: ITownArchitectBase.ChannelInfo({
        id: "test",
        metadata: "ipfs://test"
      })
    });

    return townArchitect.createTown(townInfo);
  }
}
