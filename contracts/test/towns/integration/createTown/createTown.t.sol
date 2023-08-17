// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IERC173} from "contracts/src/diamond/facets/ownable/IERC173.sol";
import {IChannel} from "contracts/src/towns/facets/channels/IChannel.sol";
import {IChannel} from "contracts/src/towns/facets/channels/IChannel.sol";
import {IEntitlements} from "contracts/src/towns/facets/entitlements/IEntitlements.sol";
import {ITokenEntitlement} from "contracts/src/towns/entitlements/token/ITokenEntitlement.sol";
import {IRoles, IRolesBase} from "contracts/src/towns/facets/roles/IRoles.sol";
import {ITownArchitect, ITownArchitectBase} from "contracts/src/towns/facets/architect/ITownArchitect.sol";

// libraries
import {Permissions} from "contracts/src/towns/facets/Permissions.sol";

// contracts
import {IntegrationSetup} from "contracts/test/towns/integration/Integration.t.sol";

contract Integration_CreateTown is
  IntegrationSetup,
  IRolesBase,
  ITownArchitectBase
{
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
      IEntitlements(newTown).isEntitledToTown({
        user: member,
        permission: Permissions.Write
      })
    );

    // however they cannot access the channel
    assertFalse(
      IEntitlements(newTown).isEntitledToChannel({
        channelId: "test2",
        user: member,
        permission: Permissions.Write
      })
    );

    // add role to channel to allow access
    vm.prank(founder);
    IChannel(newTown).addRoleToChannel({channelId: "test2", roleId: roleId});

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
    string memory townId = "test";

    address founder = _randomAddress();
    address bob = _randomAddress();

    TownInfo memory townInfo = TownInfo({
      id: townId,
      name: "test",
      uri: "ipfs://test",
      everyoneEntitlement: RoleInfo({
        name: "Everyone",
        permissions: new string[](0)
      }),
      memberEntitlement: MemberEntitlement({
        role: RoleInfo({name: "Member", permissions: new string[](1)}),
        tokens: new ITokenEntitlement.ExternalToken[](0),
        users: new address[](1)
      }),
      channel: ChannelInfo({metadata: "ipfs://test", id: "test"})
    });

    townInfo.memberEntitlement.role.permissions[0] = Permissions.Read;
    townInfo.memberEntitlement.users[0] = bob;

    vm.prank(founder);
    address newTown = ITownArchitect(diamond).createTown(townInfo);

    assertTrue(
      IEntitlements(newTown).isEntitledToTown(bob, Permissions.Read),
      "Bob should be entitled to read"
    );
  }
}
