// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;

import {ERC721} from "openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {Strings} from "openzeppelin-contracts/contracts/utils/Strings.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/contracts/security/ReentrancyGuard.sol";

/**
 * @title Pioneer
 * @dev Pioneer contract
 */
contract Pioneer is ERC721, Ownable, ReentrancyGuard {
  using Strings for uint256;

  event SetAllowed(address indexed user, bool allow);

  error NotAllowed();
  error NonExistentTokenURI();
  error MaxSupplyReached();
  error InsufficientBalance();
  error AlreadyAllowed();
  error AlreadyMinted();

  string public baseURI;
  uint256 public currentTokenId;
  uint256 public constant TOTAL_SUPPLY = 10_000;

  uint256 public mintReward = 0.1 ether;

  // keep track of who can mint new tokens
  mapping(address => bool) public allowed;

  // keep track of token URIs
  modifier onlyAllowed() {
    if (!allowed[_msgSender()]) revert NotAllowed();
    _;
  }

  constructor(
    string memory name_,
    string memory symbol_,
    string memory baseURI_
  ) ERC721(name_, symbol_) {
    baseURI = baseURI_;
    allowed[_msgSender()] = true;
  }

  // mint a new token
  function mintTo(
    address to
  ) external onlyAllowed nonReentrant returns (uint256) {
    if (to == address(0)) revert NotAllowed();
    if (balanceOf(to) > 0) revert AlreadyMinted();

    uint256 newTokenId = ++currentTokenId;

    if (newTokenId > TOTAL_SUPPLY) revert MaxSupplyReached();

    _mint(to, newTokenId);

    if (mintReward > 0) {
      _sendEth(to, mintReward);
    }

    return newTokenId;
  }

  receive() external payable {}

  fallback() external payable {}

  function withdraw(address to) external onlyOwner {
    _sendEth(to, address(this).balance);
  }

  function _sendEth(address to, uint256 amount) internal {
    if (amount > address(this).balance) revert InsufficientBalance();
    (bool success, ) = to.call{value: amount}("");
    require(success, "Transfer failed.");
  }

  function setMintReward(uint256 _mintReward) external onlyOwner {
    mintReward = _mintReward;
  }

  function setBaseURI(string memory _baseURI) external onlyOwner {
    baseURI = _baseURI;
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
    if (user == address(0)) {
      revert NotAllowed();
    }

    if (allowed[user] == allow) {
      revert AlreadyAllowed();
    }

    allowed[user] = allow;
    emit SetAllowed(user, allow);
  }
}
