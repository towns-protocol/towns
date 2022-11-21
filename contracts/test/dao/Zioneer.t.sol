// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "forge-std/Test.sol";

import {Zioneer} from "contracts/src/dao/Zioneer.sol";

contract ZioneerTest is Test {
  using stdStorage for StdStorage;

  address bob = address(0x1);
  address alice = address(0x2);

  Zioneer private nft;

  function setUp() public {
    nft = new Zioneer("Zioneer", "ZNE", "https://zioneer.io/");
  }

  function testMint() public {
    vm.expectRevert(Zioneer.NotAllowed.selector);
    nft.mintTo(bob);

    nft.setAllowed(address(this), true);
    nft.mintTo(bob);
    assertEq(nft.balanceOf(bob), 1);
  }

  function testMaxSupplyReached() public {
    nft.setAllowed(address(this), true);

    uint256 slot = stdstore.target(address(nft)).sig("currentTokenId()").find();
    bytes32 loc = bytes32(slot);
    bytes32 mockedCurrentTokenId = bytes32(abi.encode(10000));
    vm.store(address(nft), loc, mockedCurrentTokenId);

    vm.expectRevert(Zioneer.MaxSupplyReached.selector);
    nft.mintTo(bob);
  }

  function testMintZeroAddress() public {
    nft.setAllowed(address(this), true);
    vm.expectRevert(Zioneer.NotAllowed.selector);
    nft.mintTo(address(0));
  }
}
