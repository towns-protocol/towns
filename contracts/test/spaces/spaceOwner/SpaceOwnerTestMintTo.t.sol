// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "contracts/test/utils/TestUtils.sol";
import {ERC721Holder} from "openzeppelin-contracts/contracts/token/ERC721/utils/ERC721Holder.sol";

import {Errors} from "contracts/src/libraries/Errors.sol";

import {SpaceOwner} from "contracts/src/core/tokens/SpaceOwner.sol";

contract SpaceOwnerTestMintTo is TestUtils, ERC721Holder {
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
