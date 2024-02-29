// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IRolesBase} from "contracts/src/spaces/facets/roles/IRoles.sol";

// libraries
import {Permissions} from "contracts/src/spaces/facets/Permissions.sol";

// contracts
import {Banning} from "contracts/src/spaces/facets/banning/Banning.sol";
import {MembershipFacet} from "contracts/src/spaces/facets/membership/MembershipFacet.sol";
import {Channels} from "contracts/src/spaces/facets/channels/Channels.sol";
import {Roles} from "contracts/src/spaces/facets/roles/Roles.sol";
import {EntitlementsManager} from "contracts/src/spaces/facets/entitlements/EntitlementsManager.sol";

// helpers
import {BaseSetup} from "contracts/test/spaces/BaseSetup.sol";

contract BanningTest is BaseSetup, IRolesBase {
  Banning internal banning;
  MembershipFacet internal membership;
  Channels internal channels;
  Roles internal roles;
  EntitlementsManager internal manager;

  function setUp() public override {
    super.setUp();
    banning = Banning(everyoneSpace);
    membership = MembershipFacet(everyoneSpace);
    channels = Channels(everyoneSpace);
    roles = Roles(everyoneSpace);
    manager = EntitlementsManager(everyoneSpace);
  }

  function test_ban() public {
    address alice = _randomAddress();

    vm.prank(alice);
    uint256 tokenId = membership.joinTown(alice);

    vm.prank(founder);
    banning.ban("", tokenId);

    assertTrue(banning.isBanned("", tokenId));
    assertFalse(manager.isEntitledToSpace(alice, Permissions.Read));
  }

  function test_unban() external {
    address alice = _randomAddress();

    vm.prank(alice);
    uint256 tokenId = membership.joinTown(alice);

    vm.prank(founder);
    banning.ban("", tokenId);

    assertTrue(banning.isBanned("", tokenId));
    assertFalse(manager.isEntitledToSpace(alice, Permissions.Read));

    vm.prank(founder);
    banning.unban("", tokenId);

    assertFalse(banning.isBanned("", tokenId));
    assertTrue(manager.isEntitledToSpace(alice, Permissions.Read));
  }

  function test_banByChannel() public {
    string memory channelId = "channelId";
    vm.assume(bytes(channelId).length > 2);

    address alice = _randomAddress();

    // get role id with member name
    uint256[] memory roleIds = new uint256[](1);
    uint256 memberRoleId = _getMemberRoleId();
    roleIds[0] = memberRoleId;

    // create a channel with member role ids
    vm.prank(founder);
    channels.createChannel(channelId, "", roleIds);

    // alice joins town
    vm.prank(alice);
    uint256 tokenId = membership.joinTown(alice);

    // founder bans alice from a channel
    vm.prank(founder);
    banning.ban(channelId, tokenId);

    assertTrue(banning.isBanned(channelId, tokenId));
    assertTrue(manager.isEntitledToSpace(alice, Permissions.Read));
    assertFalse(
      manager.isEntitledToChannel(channelId, alice, Permissions.Read)
    );
  }

  function test_unbanByChannel() external {
    string memory channelId = "channelId";

    address alice = _randomAddress();

    // get role id with member name
    uint256[] memory roleIds = new uint256[](1);
    roleIds[0] = _getMemberRoleId();

    // create a channel with member role ids
    vm.prank(founder);
    channels.createChannel(channelId, "", roleIds);

    // alice joins town
    vm.prank(alice);
    uint256 tokenId = membership.joinTown(alice);

    // founder bans alice from a channel
    vm.prank(founder);
    banning.ban(channelId, tokenId);

    assertTrue(banning.isBanned(channelId, tokenId));
    assertTrue(manager.isEntitledToSpace(alice, Permissions.Read));
    assertFalse(
      manager.isEntitledToChannel(channelId, alice, Permissions.Read)
    );
  }

  function _getMemberRoleId() internal returns (uint256) {
    Role[] memory townRoles = roles.getRoles();

    // get role with member name
    uint256 memberRoleId;
    bool found = false;

    for (uint256 i = 0; i < townRoles.length; i++) {
      if (keccak256(bytes(townRoles[i].name)) == keccak256(bytes("Member"))) {
        memberRoleId = townRoles[i].id;
        found = true;
        break;
      }
    }
    assertTrue(found, "Member role not found");

    return memberRoleId;
  }
}
