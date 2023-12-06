// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {ITownArchitect, ITownArchitectBase} from "contracts/src/towns/facets/architect/ITownArchitect.sol";
import {ITokenEntitlement} from "contracts/src/towns/entitlements/token/ITokenEntitlement.sol";
import {IEntitlementsManager} from "contracts/src/towns/facets/entitlements/IEntitlementsManager.sol";
import {IOwnableBase} from "contracts/src/diamond/facets/ownable/IERC173.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC173} from "contracts/src/diamond/facets/ownable/IERC173.sol";
import {IPausableBase, IPausable} from "contracts/src/diamond/facets/pausable/IPausable.sol";
import {IGuardian} from "contracts/src/towns/facets/guardian/IGuardian.sol";
import {IERC721ABase} from "contracts/src/diamond/facets/token/ERC721A/IERC721A.sol";
import {IMembershipBase} from "contracts/src/towns/facets/membership/IMembership.sol";

// libraries

// contracts
import {TownArchitectSetup} from "./TownArchitectSetup.sol";
import {MockERC721} from "contracts/test/mocks/MockERC721.sol";

// errors
import {GateFacetService__NotAllowed} from "contracts/src/towns/facets/gate/GateService.sol";
import {Validator__InvalidStringLength} from "contracts/src/utils/Validator.sol";

contract TownArchitectTest is
  TownArchitectSetup,
  ITownArchitectBase,
  IOwnableBase,
  IPausableBase
{
  function test_createTown_only() external {
    string memory name = "Test";

    address founder = _randomAddress();

    vm.prank(founder);
    address townInstance = _createSimpleTown(name);
    address townAddress = townArchitect.getTownById(name);

    assertEq(townAddress, townInstance, "Town address mismatch");

    assertTrue(townArchitect.isTown(townAddress), "Town not registered");

    // expect owner to be founder
    assertTrue(
      IEntitlementsManager(townAddress).isEntitledToTown(founder, "Read")
    );

    // expect no one to be entitled
    assertFalse(
      IEntitlementsManager(townAddress).isEntitledToTown(
        _randomAddress(),
        "Read"
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

    assertTrue(IEntitlementsManager(newTown).isEntitledToTown(founder, "Read"));

    (address townToken, , ) = townArchitect.getTownArchitectImplementations();
    uint256 tokenId = townArchitect.getTokenIdByTownId(townId);

    vm.prank(founder);
    IGuardian(townToken).disableGuardian();

    vm.warp(IGuardian(townToken).guardianCooldown(founder));

    vm.prank(founder);
    IERC721(townToken).transferFrom(founder, buyer, tokenId);

    assertFalse(
      IEntitlementsManager(newTown).isEntitledToTown(founder, "Read")
    );

    assertTrue(IEntitlementsManager(newTown).isEntitledToTown(buyer, "Read"));
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
    address mockNFT2 = address(new MockERC721());

    assertFalse(townArchitect.isTokenGated(mockNFT), "Gate should be disabled");
    assertFalse(
      townArchitect.isTokenGated(mockNFT2),
      "Gate should be disabled"
    );

    // Enable the gate for both mock NFT contracts, with a value of 1.
    vm.startPrank(deployer);
    townArchitect.gateByToken(mockNFT, 1);
    townArchitect.gateByToken(mockNFT2, 1);
    vm.stopPrank();

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
    vm.startPrank(deployer);
    townArchitect.ungateByToken(mockNFT);
    townArchitect.ungateByToken(mockNFT2);
    vm.stopPrank();

    // Now anyone should be able to create a town, since the gate
    // has been disabled.
    vm.prank(_randomAddress());
    _createSimpleTown("test2");
  }

  function test_revertIfInvalidTownId() external {
    address founder = _randomAddress();

    vm.expectRevert(Validator__InvalidStringLength.selector);

    vm.prank(founder);
    _createSimpleTown("");
  }

  function test_revertIfNetworkIdTaken(string memory networkId) external {
    vm.assume(bytes(networkId).length > 0);

    address founder = _randomAddress();

    vm.prank(founder);
    _createSimpleTown(networkId);

    vm.expectRevert(TownArchitect__InvalidNetworkId.selector);
    vm.prank(_randomAddress());
    _createSimpleTown(networkId);
  }

  function test_revertIfNotERC721Receiver(string memory networkId) external {
    vm.assume(bytes(networkId).length > 0);

    vm.expectRevert(
      IERC721ABase.TransferToNonERC721ReceiverImplementer.selector
    );
    _createSimpleTown(networkId);
  }

  // =============================================================
  //                           Internal
  // =============================================================
  function _createSimpleTown(string memory townId) internal returns (address) {
    ITownArchitectBase.TownInfo memory townInfo = ITownArchitectBase.TownInfo({
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
          users: new address[](0)
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
