// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ISpaceOwner} from "./ISpaceOwner.sol";

// libraries

// contracts
import {ERC721A} from "contracts/src/diamond/facets/token/ERC721A/ERC721A.sol";

import {SpaceOwnerBase} from "./SpaceOwnerBase.sol";
import {OwnableBase} from "contracts/src/diamond/facets/ownable/OwnableBase.sol";
import {GuardianBase} from "contracts/src/spaces/facets/guardian/GuardianBase.sol";
import {Votes} from "contracts/src/diamond/facets/governance/votes/Votes.sol";
import {SpaceOwnerUriBase} from "./SpaceOwnerUriBase.sol";

contract SpaceOwner is
  ISpaceOwner,
  SpaceOwnerBase,
  SpaceOwnerUriBase,
  OwnableBase,
  GuardianBase,
  Votes,
  ERC721A
{
  function __SpaceOwner_init(
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

  /// @inheritdoc ISpaceOwner
  function setFactory(address factory) external onlyOwner {
    _setFactory(factory);
  }

  /// @inheritdoc ISpaceOwner
  function getFactory() external view returns (address) {
    return _getFactory();
  }

  // =============================================================
  //                           Space
  // =============================================================

  /// @inheritdoc ISpaceOwner
  function nextTokenId() external view returns (uint256) {
    return _nextTokenId();
  }

  /// @inheritdoc ISpaceOwner
  function mintSpace(
    string memory name,
    string memory uri,
    address space
  ) external onlyFactory returns (uint256 tokenId) {
    tokenId = _nextTokenId();
    _mintSpace(name, uri, tokenId, space);
    _mint(msg.sender, 1);
  }

  /// @inheritdoc ISpaceOwner
  function getSpaceInfo(address space) external view returns (Space memory) {
    return _getSpace(space);
  }

  /// @inheritdoc ISpaceOwner
  function updateSpaceInfo(
    address space,
    string memory name,
    string memory uri
  ) external {
    _onlySpaceOwner(space);
    _updateSpace(space, name, uri);
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
  function _onlySpaceOwner(address space) internal view {
    if (_ownerOf(_getSpace(space).tokenId) != msg.sender) {
      revert SpaceOwner__OnlySpaceOwnerAllowed();
    }
  }
}
