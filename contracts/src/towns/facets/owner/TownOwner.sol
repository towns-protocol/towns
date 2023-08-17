// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {ITownOwner} from "./ITownOwner.sol";

// libraries

// contracts
import {ERC721A} from "contracts/src/diamond/facets/token/ERC721A/ERC721A.sol";
import {TownOwnerBase} from "./TownOwnerBase.sol";
import {OwnableBase} from "contracts/src/diamond/facets/ownable/OwnableBase.sol";

contract TownOwner is ITownOwner, TownOwnerBase, OwnableBase, ERC721A {
  function __TownOwner__init(
    string memory name,
    string memory symbol
  ) external onlyInitializing {
    __ERC721A_init(name, symbol);
  }

  function setFactory(address factory) external onlyOwner {
    _setFactory(factory);
  }

  function nextTokenId() external view returns (uint256) {
    return _nextTokenId();
  }

  function mintTown(
    string memory name,
    string memory uri,
    string memory networkId,
    address townAddress
  ) external onlyFactory returns (uint256 tokenId) {
    tokenId = _nextTokenId();
    _createTown(name, uri, tokenId, townAddress, networkId);
    _safeMint(msg.sender, 1);
  }

  function getTownInfo(
    address townAddress
  ) external view returns (Town memory) {
    return _getTown(townAddress);
  }
}
