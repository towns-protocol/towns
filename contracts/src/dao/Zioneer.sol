// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {ERC721} from "openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {Strings} from "openzeppelin-contracts/contracts/utils/Strings.sol";

contract Zioneer is ERC721, Ownable {
  using Strings for uint256;

  error NotAllowed();
  error NonExistentTokenURI();
  error MaxSupplyReached();

  string public baseURI;
  uint256 public currentTokenId;
  uint256 public constant TOTAL_SUPPLY = 10_000;

  // keep track of who can mint new tokens
  mapping(address => bool) internal allowed;

  modifier onlyAllowed() {
    if (!allowed[msg.sender]) revert NotAllowed();
    _;
  }

  constructor(
    string memory name_,
    string memory symbol_,
    string memory baseURI_
  ) ERC721(name_, symbol_) {
    baseURI = baseURI_;
  }

  // mint a new token
  function mintTo(address to) external onlyAllowed returns (uint256) {
    if (to == address(0)) revert NotAllowed();

    uint256 newTokenId = ++currentTokenId;

    if (newTokenId > TOTAL_SUPPLY) revert MaxSupplyReached();

    _mint(to, newTokenId);

    return newTokenId;
  }

  function tokenURI(
    uint256 tokenId
  ) public view virtual override returns (string memory) {
    if (ownerOf(tokenId) == address(0)) {
      revert NonExistentTokenURI();
    }
    return
      bytes(baseURI).length > 0
        ? string(abi.encodePacked(baseURI, tokenId.toString()))
        : "";
  }

  // set allowed addresses
  function setAllowed(address user, bool allow) external onlyOwner {
    if (user == address(0)) revert NotAllowed();
    allowed[user] = allow;
  }
}
