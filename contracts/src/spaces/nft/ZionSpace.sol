//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "solmate/tokens/ERC721.sol";
import {ISpace} from "../interfaces/ISpace.sol";
import {ISpaceManager} from "../interfaces/ISpaceManager.sol";

contract ZionSpace is ERC721, ISpace {
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
    uint256 spaceId,
    address spaceOwner
  ) external onlySpaceManager {
    _mint(spaceOwner, spaceId);
  }

  function getOwnerBySpaceId(uint256 spaceId) external view returns (address) {
    return ownerOf(spaceId);
  }

  function tokenURI(uint256 id) public pure override returns (string memory) {
    if (id > 0) {
      return "https://zion.xyz";
    }
    return "";
  }
}
