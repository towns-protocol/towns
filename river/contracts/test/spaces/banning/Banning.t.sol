// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IRolesBase} from "contracts/src/spaces/facets/roles/IRoles.sol";
import {ERC721AQueryable} from "contracts/src/diamond/facets/token/ERC721A/extensions/ERC721AQueryable.sol";
import {IMembershipBase} from "contracts/src/spaces/facets/membership/IMembership.sol";

// libraries

// contracts
import {Banning} from "contracts/src/spaces/facets/banning/Banning.sol";
import {MembershipFacet} from "contracts/src/spaces/facets/membership/MembershipFacet.sol";
import {MembershipToken} from "contracts/src/spaces/facets/membership/token/MembershipToken.sol";
import {Channels} from "contracts/src/spaces/facets/channels/Channels.sol";
import {Roles} from "contracts/src/spaces/facets/roles/Roles.sol";
import {EntitlementsManager} from "contracts/src/spaces/facets/entitlements/EntitlementsManager.sol";
import {Permissions} from "contracts/src/spaces/facets/Permissions.sol";

// helpers
import {BaseSetup} from "contracts/test/spaces/BaseSetup.sol";

contract BanningTest is BaseSetup, IRolesBase, IMembershipBase {
  Banning internal banning;
  MembershipFacet internal membership;
  MembershipToken internal membershipToken;
  Channels internal channels;
  Roles internal roles;
  EntitlementsManager internal manager;
  ERC721AQueryable internal queryable;

  function setUp() public override {
    super.setUp();

    banning = Banning(everyoneSpace);
    membership = MembershipFacet(everyoneSpace);
    membershipToken = MembershipToken(everyoneSpace);
    channels = Channels(everyoneSpace);
    roles = Roles(everyoneSpace);
    manager = EntitlementsManager(everyoneSpace);
    queryable = ERC721AQueryable(everyoneSpace);
  }

  modifier givenWalletHasJoinedSpace(address wallet) {
    vm.prank(wallet);
    membership.joinSpace(wallet);
    _;
  }

  modifier givenWalletIsBanned(address wallet) {
    uint256[] memory tokenIds = queryable.tokensOfOwner(wallet);
    uint256 tokenId = tokenIds[0];

    vm.prank(founder);
    banning.ban(tokenId);
    _;
  }

  function test_revertWhen_tokenDoesNotExist() external {
    vm.prank(founder);
    vm.expectRevert();
    banning.ban(type(uint256).max);
  }

  function test_ban(
    address wallet
  ) external assumeEOA(wallet) givenWalletHasJoinedSpace(wallet) {
    uint256[] memory tokenIds = queryable.tokensOfOwner(wallet);
    uint256 tokenId = tokenIds[0];

    vm.prank(founder);
    banning.ban(tokenId);

    assertTrue(banning.isBanned(tokenId));
    assertFalse(manager.isEntitledToSpace(wallet, Permissions.Read));
  }

  function test_unban(
    address wallet
  )
    external
    assumeEOA(wallet)
    givenWalletHasJoinedSpace(wallet)
    givenWalletIsBanned(wallet)
  {
    uint256[] memory tokenIds = queryable.tokensOfOwner(wallet);
    uint256 tokenId = tokenIds[0];

    assertTrue(banning.isBanned(tokenId));
    assertFalse(manager.isEntitledToSpace(wallet, Permissions.Read));

    vm.prank(founder);
    banning.unban(tokenId);

    assertFalse(banning.isBanned(tokenId));
    assertTrue(manager.isEntitledToSpace(wallet, Permissions.Read));
  }

  function test_revertWhen_transferBannedToken(
    address wallet,
    address recipient
  )
    external
    assumeEOA(wallet)
    assumeEOA(recipient)
    givenWalletHasJoinedSpace(wallet)
    givenWalletIsBanned(wallet)
  {
    uint256[] memory tokenIds = queryable.tokensOfOwner(wallet);
    uint256 tokenId = tokenIds[0];

    vm.prank(wallet);
    vm.expectRevert(Membership__Banned.selector);
    membershipToken.transferFrom(wallet, recipient, tokenId);
  }
}
