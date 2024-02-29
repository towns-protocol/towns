// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.23;

import {ERC1155} from "openzeppelin-contracts/contracts/token/ERC1155/ERC1155.sol";

contract MockERC1155 is ERC1155 {
  uint256 public tokenId;

  constructor() ERC1155("ipfs://hash") {}

  function mintTo(address to, uint256 tokenType) external returns (uint256) {
    tokenId++;
    _mint(to, tokenId, tokenType, "");
    return tokenId;
  }
}
