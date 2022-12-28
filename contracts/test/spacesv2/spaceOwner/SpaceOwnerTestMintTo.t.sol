// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "contracts/test/utils/TestUtils.sol";

import {Errors} from "contracts/src/spacesv2/libraries/Errors.sol";

import {SpaceOwner} from "contracts/src/spacesv2/SpaceOwner.sol";

contract SpaceOwnerTestMintTo is TestUtils {
  SpaceOwner internal spaceOwner;

  function setUp() public {
    spaceOwner = new SpaceOwner("Space Token", "ZION");
  }

  function testSetFactory() public {
    address newOwner = _randomAddress();
    spaceOwner.setFactory(newOwner);
    assertEq(spaceOwner.FACTORY_ADDRESS(), newOwner);
  }

  function testRevertMintIfNotFactory() public {
    vm.prank(_randomAddress());
    vm.expectRevert(Errors.NotAllowed.selector);
    spaceOwner.mintTo(address(this), "ipfs://QmZion");
  }

  function testMintTo() public {
    spaceOwner.setFactory(address(this));
    uint256 tokenId = spaceOwner.mintTo(address(this), "ipfs://QmZion");
    assertEq(tokenId, 0);
    assertEq(spaceOwner.tokenSupply(), 1);
  }
}
