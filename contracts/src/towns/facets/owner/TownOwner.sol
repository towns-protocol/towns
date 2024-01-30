// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {ITownOwner} from "./ITownOwner.sol";

// libraries

// contracts
import {ERC721A} from "contracts/src/diamond/facets/token/ERC721A/ERC721A.sol";

import {TownOwnerBase} from "./TownOwnerBase.sol";
import {OwnableBase} from "contracts/src/diamond/facets/ownable/OwnableBase.sol";
import {GuardianBase} from "contracts/src/towns/facets/guardian/GuardianBase.sol";
import {Votes} from "contracts/src/diamond/facets/governance/votes/Votes.sol";
import {TownOwnerUriBase} from "./uri/TownOwnerUriBase.sol";

contract TownOwner is
  ITownOwner,
  TownOwnerBase,
  TownOwnerUriBase,
  OwnableBase,
  GuardianBase,
  Votes,
  ERC721A
{
  function __TownOwner_init(
    string memory name,
    string memory symbol,
    string memory version
  ) external initializer {
    __ERC721A_init_unchained(name, symbol);
    __EIP712_init(name, version);
  }

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

  function nonces(address owner) external view returns (uint256 result) {
    return _latestNonce(owner);
  }

  function DOMAIN_SEPARATOR() external view returns (bytes32 result) {
    return _domainSeparatorV4();
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

  function tokenURI(
    uint256 tokenId
  ) public view virtual override returns (string memory) {
    if (!_exists(tokenId)) revert URIQueryForNonexistentToken();

    return _render(tokenId);
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

  function _afterTokenTransfers(
    address from,
    address to,
    uint256 firstTokenId,
    uint256 batchSize
  ) internal virtual override {
    _transferVotingUnits(from, to, batchSize);
    super._afterTokenTransfers(from, to, firstTokenId, batchSize);
  }

  function _getVotingUnits(
    address account
  ) internal view virtual override returns (uint256) {
    return balanceOf(account);
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
