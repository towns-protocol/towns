// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {ERC721A} from "./ERC721A.sol";

contract ERC721ANonTransferable is ERC721A {
  function _beforeTokenTransfers(
    address from,
    address to,
    uint256 startTokenId,
    uint256 quantity
  ) internal virtual override {
    if (from != address(0)) revert TransferFromIncorrectOwner();
    super._beforeTokenTransfers(from, to, startTokenId, quantity);
  }
}
