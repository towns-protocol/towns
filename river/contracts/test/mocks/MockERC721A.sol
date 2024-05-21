// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {ERC721A} from "contracts/src/diamond/facets/token/ERC721A/ERC721A.sol";

contract MockERC721A is ERC721A {
  function mintTo(address to) external returns (uint256 tokenId) {
    tokenId = _nextTokenId();
    _mint(to, 1);
  }

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }

  function burn(uint256 token) external {
    _burn(token);
  }
}
