// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {ITownOwner} from "./ITownOwner.sol";

// libraries

// contracts
import {ERC721A} from "contracts/src/diamond/facets/token/ERC721A/ERC721A.sol";

import {TownOwnerBase} from "./TownOwnerBase.sol";
import {OwnableBase} from "contracts/src/diamond/facets/ownable/OwnableBase.sol";
import {GuardianBase} from "contracts/src/towns/facets/guardian/GuardianBase.sol";

contract TownOwner is
  ITownOwner,
  TownOwnerBase,
  OwnableBase,
  GuardianBase,
  ERC721A
{
  // =============================================================
  //                           Factory
  // =============================================================
  function setFactory(address factory) external onlyOwner {
    _setFactory(factory);
  }

  function getFactory() external view returns (address) {
    return _getFactory();
  }

  // =============================================================
  //                           Town
  // =============================================================
  function nextTokenId() external view returns (uint256) {
    return _nextTokenId();
  }

  function mintTown(
    string memory name,
    string memory uri,
    string memory networkId,
    address town
  ) external onlyFactory returns (uint256 tokenId) {
    tokenId = _nextTokenId();
    _mintTown(name, uri, tokenId, town, networkId);
    _mint(msg.sender, 1);
  }

  function getTownInfo(address town) external view returns (Town memory) {
    return _getTown(town);
  }

  function updateTownInfo(
    address town,
    string memory name,
    string memory uri
  ) external {
    _onlyTownOwner(town);
    _updateTown(town, name, uri);
  }

  // =============================================================
  //                           Overrides
  // =============================================================
  function approve(address to, uint256 tokenId) public payable override {
    // allow removing approvals even if guardian is enabled
    if (to != address(0) && _guardianEnabled(msg.sender)) {
      revert GuardianEnabled();
    }

    super.approve(to, tokenId);
  }

  function setApprovalForAll(address operator, bool approved) public override {
    // allow removing approvals even if guardian is enabled
    if (approved && _guardianEnabled(msg.sender)) {
      revert GuardianEnabled();
    }

    super.setApprovalForAll(operator, approved);
  }

  function _beforeTokenTransfers(
    address from,
    address to,
    uint256 startTokenId,
    uint256 quantity
  ) internal override {
    if (from != address(0) && _guardianEnabled(from)) {
      // allow transfering handle at minting time
      revert GuardianEnabled();
    }

    super._beforeTokenTransfers(from, to, startTokenId, quantity);
  }

  // =============================================================
  //                           Internal
  // =============================================================
  function _onlyTownOwner(address town) internal view {
    if (_ownerOf(_getTown(town).tokenId) != msg.sender) {
      revert TownOwner__OnlyTownOwnerAllowed();
    }
  }
}
