// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {ITownArchitect, ITownArchitectBase} from "contracts/src/towns/facets/architect/ITownArchitect.sol";
import {ITokenEntitlement} from "contracts/src/towns/entitlements/token/ITokenEntitlement.sol";
import {IEntitlements} from "contracts/src/towns/facets/entitlements/IEntitlements.sol";
import {IOwnableBase} from "contracts/src/diamond/facets/ownable/IERC173.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IPausableBase, IPausable} from "contracts/src/diamond/facets/pausable/IPausable.sol";

// libraries

// contracts
import {TownArchitectSetup} from "./TownArchitectSetup.sol";
import {MockERC721} from "contracts/test/mocks/MockERC721.sol";

// errors
import {GateFacetService__NotAllowed} from "contracts/src/towns/facets/gate/GateService.sol";
import {TownArchitectService__InvalidStringLength, TownArchitectService__InvalidNetworkId} from "contracts/src/towns/facets/architect/TownArchitectService.sol";

contract TownArchitectTest is
  TownArchitectSetup,
  ITownArchitectBase,
  IOwnableBase,
  IPausableBase
{
  function test_createTown() external {
    string memory name = "Test";

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
    assertTrue(IEntitlements(townAddress).isEntitledToTown(founder, "Read"));

    // expect no one to be entitled
    assertFalse(
      IEntitlements(townAddress).isEntitledToTown(_randomAddress(), "Read")
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
    address newTownToken = address(new MockERC721());
    address newUserEntitlement = address(new MockERC721());
    address newTokenEntitlement = address(new MockERC721());

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

    assertTrue(IEntitlements(newTown).isEntitledToTown(founder, "Read"));

    (address townToken, , ) = townArchitect.getTownArchitectImplementations();
    uint256 tokenId = townArchitect.getTokenIdByTownId(townId);

    vm.prank(founder);
    IERC721(townToken).transferFrom(founder, buyer, tokenId);

    assertFalse(IEntitlements(newTown).isEntitledToTown(founder, "Read"));

    assertTrue(IEntitlements(newTown).isEntitledToTown(buyer, "Read"));
  }

  function test_createTown_revert_when_paused(string memory name) external {
    vm.assume(bytes(name).length > 0);

    vm.prank(deployer);
    IPausable(address(townArchitect)).pause();

    address founder = _randomAddress();

    vm.prank(founder);
    vm.expectRevert(Pausable__Paused.selector);
    _createSimpleTown(name);

    vm.prank(deployer);
    IPausable(address(townArchitect)).unpause();

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

  // =============================================================
  //                           Internal
  // =============================================================
  function _createSimpleTown(string memory townId) internal returns (address) {
    ITownArchitectBase.TownInfo memory townInfo = ITownArchitectBase.TownInfo({
      id: townId,
      metadata: "test",
      everyoneEntitlement: ITownArchitectBase.RoleInfo({
        name: "Everyone",
        permissions: new string[](0)
      }),
      memberEntitlement: ITownArchitectBase.MemberEntitlement({
        role: ITownArchitectBase.RoleInfo({
          name: "test",
          permissions: new string[](0)
        }),
        tokens: new ITokenEntitlement.ExternalToken[](0),
        users: new address[](0)
      }),
      channel: ITownArchitectBase.ChannelInfo({
        id: "test",
        metadata: "ipfs://test"
      })
    });

    return townArchitect.createTown(townInfo);
  }
}
