// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {TestUtils} from "contracts/test/utils/TestUtils.sol";
import {ERC721Holder} from "openzeppelin-contracts/contracts/token/ERC721/utils/ERC721Holder.sol";
import {Errors} from "contracts/src/spaces/libraries/Errors.sol";
import {TownOwnerV1} from "contracts/src/tokens/TownOwnerV1.sol";

contract OwnerTownTestMintTo is TestUtils, ERC721Holder {
  TownOwnerV1 internal townOwner;

  function setUp() public {
    townOwner = new TownOwnerV1("Town Owner", "TOWN", address(this), 0);
  }

  function testSetFactory() public {
    address newOwner = _randomAddress();
    townOwner.setFactory(newOwner);
    assertEq(townOwner.FACTORY_ADDRESS(), newOwner);
  }

  function testRevertMintIfNotFactory() public {
    vm.prank(_randomAddress());
    vm.expectRevert("ERC721Base: caller cannot mint");
    townOwner.mintTo(address(this), "ipfs://QmZion");
  }

  function testMintTo() public {
    townOwner.setFactory(address(this));

    uint256 tokenId = townOwner.nextTokenId();
    townOwner.mintTo(address(this), "ipfs://QmZion");
    assertEq(tokenId, 0);
    assertEq(townOwner.totalSupply(), 1);
  }
}
