// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;

// interfaces

// libraries

// contracts
import {ERC721Base} from "contracts/src/tokens/base/ERC721Base.sol";

interface ITownOwnerV1 {
  function setFactory(address _factory) external;

  function setTokenURI(uint256 _tokenId, string memory _tokenURI) external;
}

contract TownOwnerV1 is ERC721Base, ITownOwnerV1 {
  address public FACTORY_ADDRESS;

  constructor(
    string memory _name,
    string memory _symbol,
    address _royaltyReceiver,
    uint256 _royaltyAmount
  ) ERC721Base(_name, _symbol, _royaltyReceiver, _royaltyAmount) {}

  function setFactory(address _factory) external onlyOwner {
    FACTORY_ADDRESS = _factory;
  }

  function setTokenURI(
    uint256 _tokenId,
    string memory _tokenURI
  ) external onlyOwner {
    _setTokenURI(_tokenId, _tokenURI);
  }

  function _canMint() internal view override returns (bool) {
    return _msgSender() == FACTORY_ADDRESS;
  }
}
