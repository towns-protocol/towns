// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IRolesBase} from "contracts/src/spaces/facets/roles/IRoles.sol";
import {ERC721AQueryable} from "contracts/src/diamond/facets/token/ERC721A/extensions/ERC721AQueryable.sol";

// libraries

// contracts
import {Banning} from "contracts/src/spaces/facets/banning/Banning.sol";
import {MembershipFacet} from "contracts/src/spaces/facets/membership/MembershipFacet.sol";
import {Channels} from "contracts/src/spaces/facets/channels/Channels.sol";
import {Roles} from "contracts/src/spaces/facets/roles/Roles.sol";
import {EntitlementsManager} from "contracts/src/spaces/facets/entitlements/EntitlementsManager.sol";
import {Permissions} from "contracts/src/spaces/facets/Permissions.sol";

// helpers
import {BaseSetup} from "contracts/test/spaces/BaseSetup.sol";

contract BanningTest is BaseSetup, IRolesBase {
  Banning internal banning;
  MembershipFacet internal membership;
  Channels internal channels;
  Roles internal roles;
  EntitlementsManager internal manager;
  ERC721AQueryable internal queryable;

  address alice;

  function setUp() public override {
    super.setUp();
    alice = _randomAddress();
    banning = Banning(everyoneSpace);
    membership = MembershipFacet(everyoneSpace);
    channels = Channels(everyoneSpace);
    roles = Roles(everyoneSpace);
    manager = EntitlementsManager(everyoneSpace);
    queryable = ERC721AQueryable(everyoneSpace);
  }

  function test_revertWhen_tokenDoesNotExist() external {
    vm.prank(founder);
    vm.expectRevert();
    banning.ban(type(uint256).max);
  }

  modifier givenAliceHasJoinedSpace() {
    vm.prank(alice);
    membership.joinSpace(alice);
    _;
  }

  function test_ban() public givenAliceHasJoinedSpace {
    uint256[] memory tokenIds = queryable.tokensOfOwner(alice);
    uint256 tokenId = tokenIds[0];

    vm.prank(founder);
    banning.ban(tokenId);

    assertTrue(banning.isBanned(tokenId));
    assertFalse(manager.isEntitledToSpace(alice, Permissions.Read));
  }

  modifier givenAliceIsBanned() {
    uint256[] memory tokenIds = queryable.tokensOfOwner(alice);
    uint256 tokenId = tokenIds[0];

    vm.prank(founder);
    banning.ban(tokenId);
    _;
  }

  function test_unban() external givenAliceHasJoinedSpace givenAliceIsBanned {
    uint256[] memory tokenIds = queryable.tokensOfOwner(alice);
    uint256 tokenId = tokenIds[0];

    assertTrue(banning.isBanned(tokenId));
    assertFalse(manager.isEntitledToSpace(alice, Permissions.Read));

    vm.prank(founder);
    banning.unban(tokenId);

    assertFalse(banning.isBanned(tokenId));
    assertTrue(manager.isEntitledToSpace(alice, Permissions.Read));
  }
}
