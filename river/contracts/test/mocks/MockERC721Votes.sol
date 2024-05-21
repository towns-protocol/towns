// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {ERC721A} from "contracts/src/diamond/facets/token/ERC721A/ERC721A.sol";
import {Votes} from "contracts/src/diamond/facets/governance/votes/Votes.sol";

contract MockERC721Votes is Votes, ERC721A {
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

  /**
   * @dev See {ERC721-_afterTokenTransfer}. Adjusts votes when tokens are transferred.
   *
   * Emits a {IVotes-DelegateVotesChanged} event.
   */
  function _afterTokenTransfers(
    address from,
    address to,
    uint256 firstTokenId,
    uint256 batchSize
  ) internal virtual override {
    _transferVotingUnits(from, to, batchSize);
    super._afterTokenTransfers(from, to, firstTokenId, batchSize);
  }

  /**
   * @dev Returns the balance of `account`.
   */
  function _getVotingUnits(
    address account
  ) internal view virtual override returns (uint256) {
    return balanceOf(account);
  }
}
