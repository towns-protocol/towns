// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IGuardian} from "contracts/src/towns/facets/guardian/IGuardian.sol";

// libraries

// contracts
import {TownOwnerSetup} from "./TownOwnerSetup.sol";

contract TownOwnerTest is TownOwnerSetup {
  function test_mintTown() external {
    string memory name = "Town Name";
    string memory uri = "ipfs://town-name";
    string memory networkId = "1";
    address townAddress = _randomAddress();
    address owner = _randomAddress();

    vm.prank(deployer);
    uint256 tokenId = townOwner.mintTown(name, uri, networkId, townAddress);

    vm.prank(deployer);
    IGuardian(diamond).disableGuardian();
    vm.warp(IGuardian(diamond).guardianCooldown(deployer));

    vm.prank(deployer);
    townOwner.transferFrom(deployer, owner, tokenId);

    assertEq(townOwner.ownerOf(tokenId), owner);
  }

  function test_setFactory() external {
    address factory = _randomAddress();

    vm.prank(deployer);
    townOwner.setFactory(factory);

    assertEq(townOwner.getFactory(), factory);
  }
}
