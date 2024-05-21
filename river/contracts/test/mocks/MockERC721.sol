// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MockERC721 is ERC721 {
  uint256 public tokenId;

  constructor() ERC721("MyNFT", "MNFT") {}

  function mintTo(address to) external returns (uint256) {
    tokenId++;
    _mint(to, tokenId);
    return tokenId;
  }

  function mint(address to, uint256 amount) external {
    for (uint256 i = 0; i < amount; i++) {
      _mint(to, tokenId);
      tokenId++;
    }
  }

  function burn(uint256 token) external {
    _burn(token);
  }
}
