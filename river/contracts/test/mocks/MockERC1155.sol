// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract MockERC1155 is ERC1155 {
  uint256 public constant GOLD = 1;
  uint256 public constant SILVER = 2;
  uint256 public constant BRONZE = 3;

  uint256 public constant AMOUNT = 1;

  constructor() ERC1155("MockERC1155") {}

  function mintGold(address account) external {
    _mint(account, GOLD, AMOUNT, "");
  }

  function mintSilver(address account) external {
    _mint(account, SILVER, AMOUNT, "");
  }

  function mintBronze(address account) external {
    _mint(account, BRONZE, AMOUNT, "");
  }
}
