// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Mock721 is ERC721 {
  uint256 public tokenId;

  constructor() ERC721("MyNFT", "MNFT") {}

  function mintTo(address to) external {
    tokenId++;
    _mint(to, tokenId);
  }

  function mint(address to, uint256 amount) external {
    for (uint256 i = 0; i < amount; i++) {
      _mint(to, tokenId);
      tokenId++;
    }
  }
}

contract Mock1155 is ERC1155 {
  uint256 public tokenId;

  constructor() ERC1155("ipfs://hash") {}

  function mintTo(address to, uint256 tokenType) external returns (uint256) {
    tokenId++;
    _mint(to, tokenId, tokenType, "");
    return tokenId;
  }
}

contract MockERC20 is ERC20 {
  constructor() ERC20("MockERC20", "MERC20") {}

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}
