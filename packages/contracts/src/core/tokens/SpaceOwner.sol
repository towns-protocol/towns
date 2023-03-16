// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;

import {Errors} from "contracts/src/libraries/Errors.sol";

import {ERC721URIStorage, ERC721} from "openzeppelin-contracts/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";

/**
 * @title SpaceOwner
 * @dev SpaceOwner contract
 */
contract SpaceOwner is Ownable, ERC721URIStorage {
  address public FACTORY_ADDRESS;

  uint256 public tokenSupply;

  modifier onlyFactory() {
    if (_msgSender() != FACTORY_ADDRESS) revert Errors.NotAllowed();
    _;
  }

  constructor(
    string memory _name,
    string memory _symbol
  ) ERC721(_name, _symbol) {}

  function mintTo(
    address to,
    string calldata tokenURI
  ) external onlyFactory returns (uint256) {
    uint256 tokenId = tokenSupply;

    _safeMint(to, tokenId);
    _setTokenURI(tokenId, tokenURI);
    tokenSupply++;

    return tokenId;
  }

  function setFactory(address _factory) external onlyOwner {
    FACTORY_ADDRESS = _factory;
  }
}
