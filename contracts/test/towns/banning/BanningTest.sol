// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IRolesBase} from "contracts/src/towns/facets/roles/IRoles.sol";

// libraries

// contracts
import {Banning} from "contracts/src/towns/facets/banning/Banning.sol";
import {MembershipFacet} from "contracts/src/towns/facets/membership/MembershipFacet.sol";
import {Channels} from "contracts/src/towns/facets/channels/Channels.sol";
import {Roles} from "contracts/src/towns/facets/roles/Roles.sol";
import {EntitlementsManager} from "contracts/src/towns/facets/entitlements/EntitlementsManager.sol";

// helpers
import {BaseSetup} from "contracts/test/towns/BaseSetup.sol";

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
    assertFalse(manager.isEntitledToTown(alice, "Read"));
  }

  function test_unban() external {
    address alice = _randomAddress();

    vm.prank(alice);
    uint256 tokenId = membership.joinTown(alice);

    vm.prank(founder);
    banning.ban("", tokenId);

    assertTrue(banning.isBanned("", tokenId));
    assertFalse(manager.isEntitledToTown(alice, "Read"));

    vm.prank(founder);
    banning.unban("", tokenId);

    assertFalse(banning.isBanned("", tokenId));
    assertTrue(manager.isEntitledToTown(alice, "Read"));
  }

  function test_banByChannel(string memory channelId) public {
    vm.assume(bytes(channelId).length > 2);

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
    assertTrue(manager.isEntitledToTown(alice, "Read"));
    assertFalse(manager.isEntitledToChannel(channelId, alice, "Read"));
  }

  function test_unbanByChannel(string memory channelId) external {
    vm.assume(bytes(channelId).length > 2);

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
    assertTrue(manager.isEntitledToTown(alice, "Read"));
    assertFalse(manager.isEntitledToChannel(channelId, alice, "Read"));

    // founder unbans alice from a channel
    vm.prank(founder);
    banning.unban(channelId, tokenId);

    assertFalse(banning.isBanned(channelId, tokenId));
    assertTrue(manager.isEntitledToTown(alice, "Read"));
    assertTrue(manager.isEntitledToChannel(channelId, alice, "Read"));
  }

  function _getMemberRoleId() internal view returns (uint256) {
    Role[] memory townRoles = roles.getRoles();

    // get role with member name
    uint256 memberRoleId;

    for (uint256 i = 0; i < townRoles.length; i++) {
      if (keccak256(bytes(townRoles[i].name)) == keccak256(bytes("Member"))) {
        memberRoleId = townRoles[i].id;
        break;
      }
    }

    return memberRoleId;
  }
}
