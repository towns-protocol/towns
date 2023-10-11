// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IGuardian} from "contracts/src/towns/facets/guardian/IGuardian.sol";
import {IOwnableBase} from "contracts/src/diamond/facets/ownable/IERC173.sol";
import {ITownOwnerBase} from "contracts/src/towns/facets/owner/ITownOwner.sol";
import {Validator__InvalidStringLength, Validator__InvalidByteLength, Validator__InvalidAddress} from "contracts/src/utils/Validator.sol";

// libraries

// contracts
import {TownOwnerSetup} from "./TownOwnerSetup.sol";

contract TownOwnerTest is ITownOwnerBase, IOwnableBase, TownOwnerSetup {
  string name = "Town Name";
  string uri = "ipfs://town-name";
  string networkId = "1";

  // ------------ mintTown ------------
  function test_mintTown() external {
    address townAddress = _randomAddress();
    address owner = _randomAddress();

    vm.prank(deployer);
    uint256 tokenId = townOwner.mintTown(name, "", networkId, townAddress);

    vm.prank(deployer);
    IGuardian(diamond).disableGuardian();
    vm.warp(IGuardian(diamond).guardianCooldown(deployer));

    vm.prank(deployer);
    townOwner.transferFrom(deployer, owner, tokenId);

    assertEq(townOwner.ownerOf(tokenId), owner);
  }

  function test_mintTown_revert_notFactory() external {
    address townAddress = _randomAddress();

    vm.prank(_randomAddress());
    vm.expectRevert(TownOwner__OnlyFactoryAllowed.selector);
    townOwner.mintTown(name, uri, networkId, townAddress);
  }

  function test_mintTown_revert_invalidName() external {
    address townAddress = _randomAddress();

    vm.prank(deployer);
    vm.expectRevert(Validator__InvalidStringLength.selector);
    townOwner.mintTown("", uri, networkId, townAddress);
  }

  function test_mintTown_revert_invalidNetworkId() external {
    address townAddress = _randomAddress();

    vm.prank(deployer);
    vm.expectRevert(Validator__InvalidStringLength.selector);
    townOwner.mintTown(name, uri, "", townAddress);
  }

  function test_mintTown_revert_invalidAddress() external {
    vm.prank(deployer);
    vm.expectRevert(Validator__InvalidAddress.selector);
    townOwner.mintTown(name, uri, networkId, address(0));
  }

  // ------------ updateTown ------------

  function test_updateTownInfo() external {
    address townAddress = _randomAddress();

    vm.prank(deployer);
    townOwner.mintTown(name, uri, networkId, townAddress);

    vm.prank(deployer);
    townOwner.updateTownInfo(townAddress, "New Name", "ipfs://new-name");

    Town memory town = townOwner.getTownInfo(townAddress);

    assertEq(town.name, "New Name");
    assertEq(town.uri, "ipfs://new-name");
  }

  function test_updateTown_revert_notTownOwner() external {
    address townAddress = _randomAddress();
    address townOwnerAddress = _randomAddress();

    vm.startPrank(deployer);
    uint256 tokenId = townOwner.mintTown(name, uri, networkId, townAddress);

    IGuardian(diamond).disableGuardian();
    vm.warp(IGuardian(diamond).guardianCooldown(deployer));

    townOwner.transferFrom(deployer, townOwnerAddress, tokenId);
    vm.stopPrank();

    vm.prank(_randomAddress());
    vm.expectRevert(TownOwner__OnlyTownOwnerAllowed.selector);
    townOwner.updateTownInfo(townAddress, "New Name", "ipfs://new-name");
  }

  function test_updateTown_revert_invalidName() external {
    address townAddress = _randomAddress();

    vm.prank(deployer);
    townOwner.mintTown(name, uri, networkId, townAddress);

    vm.prank(deployer);
    vm.expectRevert(Validator__InvalidStringLength.selector);
    townOwner.updateTownInfo(townAddress, "", "ipfs://new-name");
  }

  function test_updateTown_revert_invalidUri() external {
    address townAddress = _randomAddress();

    vm.prank(deployer);
    townOwner.mintTown(name, uri, networkId, townAddress);

    vm.prank(deployer);
    vm.expectRevert(Validator__InvalidStringLength.selector);
    townOwner.updateTownInfo(townAddress, "New Name", "");
  }

  // ------------ setFactory ------------

  function test_setFactory() external {
    address factory = _randomAddress();

    vm.prank(deployer);
    townOwner.setFactory(factory);

    assertEq(townOwner.getFactory(), factory);
  }

  function test_setFactory_revert_notOwner() external {
    address notFactory = _randomAddress();

    vm.prank(notFactory);
    vm.expectRevert(
      abi.encodeWithSelector(Ownable__NotOwner.selector, notFactory)
    );
    townOwner.setFactory(notFactory);
  }

  function test_setFactory_revert_invalidAddress() external {
    vm.prank(deployer);
    vm.expectRevert(Validator__InvalidAddress.selector);
    townOwner.setFactory(address(0));
  }

  function test_getVotes() external {
    assertEq(townOwner.getVotes(deployer), 0);

    vm.prank(deployer);
    townOwner.mintTown(name, "", networkId, _randomAddress());

    vm.prank(deployer);
    townOwner.delegate(deployer);

    assertEq(townOwner.getVotes(deployer), 1);
  }
}
