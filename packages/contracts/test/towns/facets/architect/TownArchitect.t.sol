// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces
import {ITownArchitectEvents} from "contracts/src/towns/facets/architect/ITownArchitect.sol";
import {ITownArchitect} from "contracts/src/towns/facets/architect/ITownArchitect.sol";
import {IPausable} from "contracts/src/diamond/extensions/pausable/IPausable.sol";
import {IEntitlements} from "contracts/src/towns/facets/entitlements/IEntitlements.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

// libraries
import {Permissions} from "contracts/src/spaces/libraries/Permissions.sol";

// contracts
import {TownArchitectService__InvalidStringLength, TownArchitectService__InvalidNetworkId} from "contracts/src/towns/facets/architect/TownArchitectService.sol";

import {Pausable__Paused} from "contracts/src/diamond/extensions/pausable/PausableService.sol";
import {Ownable__NotOwner} from "contracts/src/diamond/extensions/ownable/OwnableService.sol";
import {GateFacetService__NotAllowed} from "contracts/src/towns/facets/gate/GateService.sol";

import {MockDiamond} from "contracts/test/mocks/MockDiamond.sol";
import {TownFactory} from "contracts/src/towns/TownFactory.sol";
import {MockERC721} from "contracts/test/mocks/MockERC721.sol";

import {TownFactoryTest} from "contracts/test/towns/TownFactory.t.sol";
import {TownArchitect} from "contracts/src/towns/facets/architect/TownArchitect.sol";

contract TownArchitectTest is TownFactoryTest, ITownArchitectEvents {
  ITownArchitect internal townArchitect;

  function setUp() public override {
    super.setUp();
    townArchitect = ITownArchitect(townFactory);
  }

  function test_createTown(string memory name) external {
    vm.assume(bytes(name).length > 0);

    address founder = _randomAddress();

    vm.startPrank(founder);
    address possibleTown = townArchitect.computeTown(name);

    // expect town to be created
    vm.expectEmit(true, true, true, true, address(townArchitect));
    emit TownCreated(possibleTown);

    address townInstance = _createSimpleTown(name);
    vm.stopPrank();

    assertEq(townInstance, possibleTown, "Town address mismatch");

    address townAddress = townArchitect.getTownById(name);

    assertEq(townAddress, townInstance, "Town address mismatch");

    // expect owner to be founder
    // townAddress

    // expect no one to be entitled
    assertFalse(
      IEntitlements(townAddress).isEntitledToTown(
        _randomAddress(),
        Permissions.Read
      )
    );
  }

  function test_getImplementations() external {
    (
      address townTokenAddress,
      address userEntitlementAddress,
      address tokenEntitlementAddress
    ) = townArchitect.getTownArchitectImplementations();

    assertEq(townToken, townTokenAddress);
    assertEq(userEntitlement, userEntitlementAddress);
    assertEq(tokenEntitlement, tokenEntitlementAddress);
  }

  function test_setImplementations() external {
    address newTownToken = address(new MockDiamond());
    address newUserEntitlement = address(new MockDiamond());
    address newTokenEntitlement = address(new MockDiamond());

    address user = _randomAddress();

    vm.prank(user);
    vm.expectRevert(abi.encodeWithSelector(Ownable__NotOwner.selector, user));
    townArchitect.setTownArchitectImplementations(
      newTownToken,
      newUserEntitlement,
      newTokenEntitlement
    );

    vm.prank(deployer);
    townArchitect.setTownArchitectImplementations(
      newTownToken,
      newUserEntitlement,
      newTokenEntitlement
    );

    (
      address townTokenAddress,
      address userEntitlementAddress,
      address tokenEntitlementAddress
    ) = townArchitect.getTownArchitectImplementations();

    assertEq(newTownToken, townTokenAddress);
    assertEq(newUserEntitlement, userEntitlementAddress);
    assertEq(newTokenEntitlement, tokenEntitlementAddress);
  }

  function test_transfer_town_ownership(string memory townId) external {
    vm.assume(bytes(townId).length > 0);

    address founder = _randomAddress();
    address buyer = _randomAddress();

    vm.prank(founder);
    address newTown = _createSimpleTown(townId);

    assertTrue(
      IEntitlements(newTown).isEntitledToTown(founder, Permissions.Read)
    );

    (address townToken, , ) = townArchitect.getTownArchitectImplementations();
    uint256 tokenId = townArchitect.getTokenIdByTownId(townId);

    vm.prank(founder);
    IERC721(townToken).transferFrom(founder, buyer, tokenId);

    assertFalse(
      IEntitlements(newTown).isEntitledToTown(founder, Permissions.Read)
    );

    assertTrue(
      IEntitlements(newTown).isEntitledToTown(buyer, Permissions.Read)
    );
  }

  // ======================= Reverts =======================

  function test_createTown_revert_when_paused(string memory name) external {
    vm.assume(bytes(name).length > 0);

    vm.prank(deployer);
    IPausable(payable(townFactory)).pause();

    address founder = _randomAddress();

    vm.prank(founder);
    vm.expectRevert(Pausable__Paused.selector);
    _createSimpleTown(name);

    vm.prank(deployer);
    IPausable(payable(townFactory)).unpause();

    vm.prank(founder);
    _createSimpleTown(name);
  }

  function test_revertIfGatingEnabled() external {
    // We need to set up a mock ERC721 contract, and get its address
    // so that we can pass it to the TownArchitect contract.
    address founder = _randomAddress();

    // Create a mock NFT contract.
    address mockNFT = address(new MockERC721());

    assertFalse(townArchitect.isTokenGated(mockNFT), "Gate should be disabled");

    // Enable the gate for the mock NFT contract, with a value of 1.
    vm.prank(deployer);
    townArchitect.gateByToken(mockNFT, 1);

    // Founder should not be allowed to create a town, since they don't own
    // any tokens for the mock NFT contract.
    vm.expectRevert(GateFacetService__NotAllowed.selector);
    vm.prank(founder);
    _createSimpleTown("test");

    // Mint a token for the mock NFT contract, and give it to the founder.
    MockERC721(mockNFT).mint(founder, 1);

    // Now the founder should be able to create a town.
    vm.prank(founder);
    _createSimpleTown("test");

    // Disable the gate for the mock NFT contract.
    vm.prank(deployer);
    townArchitect.ungateByToken(mockNFT);

    // Now anyone should be able to create a town, since the gate
    // has been disabled.
    vm.prank(_randomAddress());
    _createSimpleTown("test2");
  }

  function test_revertIfInvalidTownId() external {
    address founder = _randomAddress();

    vm.expectRevert(TownArchitectService__InvalidStringLength.selector);

    vm.prank(founder);
    _createSimpleTown("");
  }

  function test_revertIfNetworkIdTaken(string memory networkId) external {
    vm.assume(bytes(networkId).length > 0);

    _createSimpleTown(networkId);

    vm.expectRevert(TownArchitectService__InvalidNetworkId.selector);
    vm.prank(_randomAddress());
    _createSimpleTown(networkId);
  }
}
