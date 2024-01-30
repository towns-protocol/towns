// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IGuardian} from "contracts/src/towns/facets/guardian/IGuardian.sol";
import {IOwnableBase} from "contracts/src/diamond/facets/ownable/IERC173.sol";
import {ITownOwnerBase} from "contracts/src/towns/facets/owner/ITownOwner.sol";
import {Validator__InvalidStringLength, Validator__InvalidByteLength, Validator__InvalidAddress} from "contracts/src/utils/Validator.sol";

// libraries

// contracts
import {BaseSetup} from "contracts/test/towns/BaseSetup.sol";
import {TownOwner} from "contracts/src/towns/facets/owner/TownOwner.sol";

contract TownOwnerTest is ITownOwnerBase, IOwnableBase, BaseSetup {
  string internal name = "Awesome Town";
  string internal uri = "ipfs://town-name";
  string internal networkId = "1";

  TownOwner _townOwnerNFT;

  function setUp() public override {
    super.setUp();
    _townOwnerNFT = TownOwner(townOwner);
  }

  // ------------ mintTown ------------
  function test_mintTown() external {
    address townAddress = _randomAddress();
    address alice = _randomAddress();
    address bob = _randomAddress();

    vm.startPrank(townFactory);
    uint256 tokenId = _townOwnerNFT.mintTown(name, uri, networkId, townAddress);
    _townOwnerNFT.transferFrom(townFactory, alice, tokenId);
    vm.stopPrank();

    vm.prank(alice);
    IGuardian(townOwner).disableGuardian();

    vm.warp(IGuardian(townOwner).guardianCooldown(alice));

    vm.prank(alice);
    _townOwnerNFT.transferFrom(alice, bob, tokenId);

    assertEq(_townOwnerNFT.ownerOf(tokenId), bob);
  }

  function test_mintTown_revert_notFactory() external {
    address townAddress = _randomAddress();

    vm.prank(_randomAddress());
    vm.expectRevert(TownOwner__OnlyFactoryAllowed.selector);
    _townOwnerNFT.mintTown(name, uri, networkId, townAddress);
  }

  function test_mintTown_revert_invalidName() external {
    address townAddress = _randomAddress();

    vm.prank(townFactory);
    vm.expectRevert(Validator__InvalidStringLength.selector);
    _townOwnerNFT.mintTown("", uri, networkId, townAddress);
  }

  function test_mintTown_revert_invalidNetworkId() external {
    address townAddress = _randomAddress();

    vm.prank(townFactory);
    vm.expectRevert(Validator__InvalidStringLength.selector);
    _townOwnerNFT.mintTown(name, uri, "", townAddress);
  }

  function test_mintTown_revert_invalidAddress() external {
    vm.prank(townFactory);
    vm.expectRevert(Validator__InvalidAddress.selector);
    _townOwnerNFT.mintTown(name, uri, networkId, address(0));
  }

  // ------------ updateTown ------------

  function test_updateTownInfo() external {
    address townAddress = _randomAddress();

    vm.prank(townFactory);
    _townOwnerNFT.mintTown(name, uri, networkId, townAddress);

    vm.prank(townFactory);
    _townOwnerNFT.updateTownInfo(townAddress, "New Name", "ipfs://new-name");

    Town memory town = _townOwnerNFT.getTownInfo(townAddress);

    assertEq(town.name, "New Name");
    assertEq(town.uri, "ipfs://new-name");
  }

  function test_updateTown_revert_notTownOwner() external {
    address townAddress = _randomAddress();
    address alice = _randomAddress();

    vm.startPrank(townFactory);
    uint256 tokenId = _townOwnerNFT.mintTown(name, uri, networkId, townAddress);
    _townOwnerNFT.transferFrom(townFactory, alice, tokenId);
    vm.stopPrank();

    vm.prank(alice);
    IGuardian(townOwner).disableGuardian();

    vm.warp(IGuardian(townOwner).guardianCooldown(alice));

    vm.prank(_randomAddress());
    vm.expectRevert(TownOwner__OnlyTownOwnerAllowed.selector);
    _townOwnerNFT.updateTownInfo(townAddress, "New Name", "ipfs://new-name");
  }

  function test_updateTown_revert_invalidName() external {
    address townAddress = _randomAddress();

    vm.prank(townFactory);
    _townOwnerNFT.mintTown(name, uri, networkId, townAddress);

    vm.prank(townFactory);
    vm.expectRevert(Validator__InvalidStringLength.selector);
    _townOwnerNFT.updateTownInfo(townAddress, "", "ipfs://new-name");
  }

  function test_updateTown_revert_invalidUri() external {
    address townAddress = _randomAddress();

    vm.prank(townFactory);
    _townOwnerNFT.mintTown(name, uri, networkId, townAddress);

    vm.prank(townFactory);
    vm.expectRevert(Validator__InvalidStringLength.selector);
    _townOwnerNFT.updateTownInfo(townAddress, "New Name", "");
  }

  // ------------ setFactory ------------

  function test_setFactory() external {
    address factory = _randomAddress();

    vm.prank(deployer);
    _townOwnerNFT.setFactory(factory);

    assertEq(_townOwnerNFT.getFactory(), factory);
  }

  function test_setFactory_revert_notOwner() external {
    address notFactory = _randomAddress();

    vm.prank(notFactory);
    vm.expectRevert(
      abi.encodeWithSelector(Ownable__NotOwner.selector, notFactory)
    );
    _townOwnerNFT.setFactory(notFactory);
  }

  function test_setFactory_revert_invalidAddress() external {
    vm.prank(deployer);
    vm.expectRevert(Validator__InvalidAddress.selector);
    _townOwnerNFT.setFactory(address(0));
  }

  function test_getVotes() external {
    assertEq(_townOwnerNFT.getVotes(deployer), 0);

    vm.prank(townFactory);
    _townOwnerNFT.mintTown(name, "", networkId, _randomAddress());

    vm.prank(townFactory);
    _townOwnerNFT.delegate(deployer);

    assertEq(_townOwnerNFT.getVotes(deployer), 1);
  }
}
