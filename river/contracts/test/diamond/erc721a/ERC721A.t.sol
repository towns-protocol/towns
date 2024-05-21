// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces
import {IERC165} from "contracts/src/diamond/facets/introspection/IERC165.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

//libraries

//contracts
import {ERC721ASetup} from "./ERC721ASetup.sol";

contract ERC721ATest is ERC721ASetup {
  function test_supportsInterface() external {
    assertTrue(
      IERC165(address(erc721a)).supportsInterface(type(IERC721).interfaceId)
    );
  }

  function test_mintTo() external {
    address user = _randomAddress();

    uint256 tokenId = erc721a.mintTo(user);

    assertEq(erc721a.balanceOf(user), 1);
    assertEq(erc721a.totalSupply(), 1);
    assertEq(erc721a.ownerOf(tokenId), user);
  }

  function test_burn() external {
    address user = _randomAddress();

    uint256 tokenId = erc721a.mintTo(user);

    erc721a.burn(tokenId);

    assertEq(erc721a.balanceOf(user), 0);
    assertEq(erc721a.totalSupply(), 0);
  }

  function test_approve() external {
    address user = _randomAddress();
    address operator = _randomAddress();

    uint256 tokenId = erc721a.mintTo(user);

    vm.prank(user);
    erc721a.approve(operator, tokenId);

    assertEq(erc721a.getApproved(tokenId), operator);
  }

  function test_setApprovalForAll() external {
    address user = _randomAddress();
    address operator = _randomAddress();

    vm.prank(user);
    erc721a.setApprovalForAll(operator, true);

    assertTrue(erc721a.isApprovedForAll(user, operator));
  }

  function test_transferFrom() external {
    address user = _randomAddress();
    address to = _randomAddress();

    uint256 tokenId = erc721a.mintTo(user);

    vm.prank(user);
    erc721a.transferFrom(user, to, tokenId);

    assertEq(erc721a.balanceOf(user), 0);
    assertEq(erc721a.balanceOf(to), 1);
    assertEq(erc721a.ownerOf(tokenId), to);
  }

  function test_safeTransferFrom() external {
    address user = _randomAddress();
    address to = _randomAddress();

    uint256 tokenId = erc721a.mintTo(user);

    vm.prank(user);
    erc721a.safeTransferFrom(user, to, tokenId);

    assertEq(erc721a.balanceOf(user), 0);
    assertEq(erc721a.balanceOf(to), 1);
    assertEq(erc721a.ownerOf(tokenId), to);
  }

  function test_safeTransferFrom_withData() external {
    address user = _randomAddress();
    address to = _randomAddress();

    uint256 tokenId = erc721a.mintTo(user);

    vm.prank(user);
    erc721a.safeTransferFrom(user, to, tokenId, "0x");

    assertEq(erc721a.balanceOf(user), 0);
    assertEq(erc721a.balanceOf(to), 1);
    assertEq(erc721a.ownerOf(tokenId), to);
  }
}
