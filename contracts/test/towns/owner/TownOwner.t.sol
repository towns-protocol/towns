// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

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
    townOwner.transferFrom(deployer, owner, tokenId);

    assertEq(townOwner.ownerOf(tokenId), owner);
  }
}
