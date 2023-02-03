// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import {ERC721} from "openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {Strings} from "openzeppelin-contracts/contracts/utils/Strings.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/contracts/security/ReentrancyGuard.sol";

contract Zioneer is ERC721, Ownable, ReentrancyGuard {
  using Strings for uint256;

  error NotAllowed();
  error NonExistentTokenURI();
  error MaxSupplyReached();
  error InsufficientBalance();

  string public baseURI;
  uint256 public currentTokenId;
  uint256 public constant TOTAL_SUPPLY = 10_000;

  uint256 public mintReward = 0.1 ether;

  // keep track of who can mint new tokens
  mapping(address => bool) public allowed;

  // a public array of the allowed addresses
  address[] public allowedAddressesList;

  // keep track of token URIs
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
  function mintTo(
    address to
  ) external onlyAllowed nonReentrant returns (uint256) {
    if (to == address(0)) revert NotAllowed();

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

  function allowedAddressesListLength() external view returns (uint256) {
    return allowedAddressesList.length;
  }

  // set allowed addresses
  function setAllowed(address user, bool allow) external onlyOwner {
    if (user == address(0)) revert NotAllowed();

    if (allowed[user] == allow) {
      // if no change is necessary, do nothing

      // otherwise we would push the same address twice,
      // or enter the loop for no reason
      return;
    }

    allowed[user] = allow;

    if (allow) {
      allowedAddressesList.push(user);
    } else {
      // remove the address from the array
      // by swapping it with the last element
      // and then popping the last element
      for (uint256 i = 0; i < allowedAddressesList.length; i++) {
        if (allowedAddressesList[i] == user) {
          allowedAddressesList[i] = allowedAddressesList[
            allowedAddressesList.length - 1
          ];
          allowedAddressesList.pop();
          break;
        }
      }
    }
  }
}
