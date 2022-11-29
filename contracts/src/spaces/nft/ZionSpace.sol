//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {ERC721URIStorage, ERC721} from "openzeppelin-contracts/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {ISpace} from "../interfaces/ISpace.sol";
import {ISpaceManager} from "../interfaces/ISpaceManager.sol";

contract ZionSpace is ERC721URIStorage, ISpace {
  address internal _manager;

  constructor(
    string memory name_,
    string memory symbol_,
    address spaceManager_
  ) ERC721(name_, symbol_) {
    _manager = spaceManager_;
  }

  modifier onlySpaceManager() {
    require(msg.sender == _manager, "ZionSpace: only space manager");
    _;
  }

  function mintBySpaceId(
    uint256 _spaceId,
    address _spaceOwner,
    string calldata _tokenURI
  ) external onlySpaceManager {
    _mint(_spaceOwner, _spaceId);
    _setTokenURI(_spaceId, _tokenURI);
  }

  function getOwnerBySpaceId(uint256 spaceId) external view returns (address) {
    return ownerOf(spaceId);
  }
}
