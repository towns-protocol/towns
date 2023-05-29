// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

//interfaces

//libraries

//contracts
import {TestUtils} from "contracts/test/utils/TestUtils.sol";
import {AirdropERC721} from "contracts/src/utils/AirdropERC721.sol";
import {IAirdropERC721} from "contracts/src/utils/interfaces/IAirdropERC721.sol";
import {Mock721} from "contracts/test/mocks/MockToken.sol";
import {console} from "forge-std/console.sol";

contract AirdropERC721Test is TestUtils {
  AirdropERC721 private _airdropERC721;
  Mock721 private _mock721;
  address private _deployer;

  IAirdropERC721.Airdrop[] private _airdrops;

  function setUp() external {
    _deployer = _randomAddress();

    vm.startPrank(_deployer);
    _mock721 = new Mock721();
    _airdropERC721 = new AirdropERC721();

    _mock721.mint(_deployer, 1000);

    _mock721.setApprovalForAll(address(_airdropERC721), true);

    vm.stopPrank();

    for (uint256 i = 0; i < 1000; i++) {
      _airdrops.push(
        IAirdropERC721.Airdrop({
          tokenAddress: address(_mock721),
          tokenOwner: _deployer,
          recipient: _randomAddress(),
          tokenId: i
        })
      );
    }
  }

  function test_airdrop() external {
    // console.log(_mock721.balanceOf(_deployer));

    vm.prank(_deployer);
    _airdropERC721.addAirdropRecipients(_airdrops);

    _airdropERC721.airdrop(1000);

    for (uint256 i = 0; i < 1000; i++) {
      assertEq(_mock721.ownerOf(i), _airdrops[i].recipient);
    }
  }
}
