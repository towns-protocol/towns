// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IRolesBase} from "contracts/src/spaces/facets/roles/IRoles.sol";

// libraries

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

  address alice;

  function setUp() public override {
    super.setUp();
    alice = _randomAddress();
    banning = Banning(everyoneSpace);
    membership = MembershipFacet(everyoneSpace);
    channels = Channels(everyoneSpace);
    roles = Roles(everyoneSpace);
    manager = EntitlementsManager(everyoneSpace);
  }

  function test_revertWhen_tokenDoesNotExist(uint256 tokenId) external {
    vm.assume(tokenId != membership.getTokenIdByMembership(founder));

    vm.prank(founder);
    vm.expectRevert();
    banning.ban(tokenId);
  }

  modifier givenAliceHasJoinedSpace() {
    vm.prank(alice);
    uint256 tokenId = membership.joinSpace(alice);
    _;
  }

  function test_ban() public givenAliceHasJoinedSpace {
    uint256 tokenId = membership.getTokenIdByMembership(alice);

    vm.prank(founder);
    banning.ban(tokenId);

    assertTrue(banning.isBanned(tokenId));
    assertFalse(manager.isEntitledToSpace(alice, "Read"));
  }

  modifier givenAliceIsBanned() {
    uint256 tokenId = membership.getTokenIdByMembership(alice);
    vm.prank(founder);
    banning.ban(tokenId);
    _;
  }

  function test_unban() external givenAliceHasJoinedSpace givenAliceIsBanned {
    uint256 tokenId = membership.getTokenIdByMembership(alice);

    assertTrue(banning.isBanned(tokenId));
    assertFalse(manager.isEntitledToSpace(alice, "Read"));

    vm.prank(founder);
    banning.unban(tokenId);

    assertFalse(banning.isBanned(tokenId));
    assertTrue(manager.isEntitledToSpace(alice, "Read"));
  }
}
