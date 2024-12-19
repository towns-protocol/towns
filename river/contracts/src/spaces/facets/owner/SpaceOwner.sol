// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC4906} from "@openzeppelin/contracts/interfaces/IERC4906.sol";
import {ISpaceOwner} from "./ISpaceOwner.sol";
import {IMembershipMetadata} from "contracts/src/spaces/facets/membership/metadata/IMembershipMetadata.sol";

// libraries

// contracts
import {ERC721A} from "contracts/src/diamond/facets/token/ERC721A/ERC721A.sol";
import {SpaceOwnerBase} from "./SpaceOwnerBase.sol";
import {OwnableBase} from "@river-build/diamond/src/facets/ownable/OwnableBase.sol";
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
    address space,
    string memory shortDescription,
    string memory longDescription
  ) external onlyFactory returns (uint256 tokenId) {
    tokenId = _nextTokenId();
    _mintSpace(name, uri, tokenId, space, shortDescription, longDescription);
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
    string memory uri,
    string memory shortDescription,
    string memory longDescription
  ) external {
    _onlySpaceOwner(space);
    _updateSpace(space, name, uri, shortDescription, longDescription);

    IMembershipMetadata(space).refreshMetadata();

    emit IERC4906.MetadataUpdate(_getTokenId(space));
  }

  function nonces(address owner) external view returns (uint256 result) {
    return _latestNonce(owner);
  }

  function DOMAIN_SEPARATOR() external view returns (bytes32 result) {
    return _domainSeparatorV4();
  }

  // =============================================================
  //                           Uri
  // =============================================================

  /// @inheritdoc ISpaceOwner
  function setDefaultUri(string memory uri) external onlyOwner {
    _setDefaultUri(uri);
  }

  /// @inheritdoc ISpaceOwner
  function getDefaultUri() external view returns (string memory) {
    return _getDefaultUri();
  }

  function tokenURI(
    uint256 tokenId
  ) public view virtual override returns (string memory) {
    if (!_exists(tokenId)) revert URIQueryForNonexistentToken();

    return _render(tokenId);
  }

  // =============================================================
  //                           Overrides
  // =============================================================
  function approve(address to, uint256 tokenId) public payable override {
    // allow removing approvals even if guardian is enabled
    if (to != address(0) && _guardianEnabled(msg.sender)) {
      revert Guardian_Enabled();
    }

    super.approve(to, tokenId);
  }

  function setApprovalForAll(address operator, bool approved) public override {
    // allow removing approvals even if guardian is enabled
    if (approved && _guardianEnabled(msg.sender)) {
      revert Guardian_Enabled();
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
      // allow transferring handle at minting time
      revert Guardian_Enabled();
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
    if (_ownerOf(_getTokenId(space)) != msg.sender) {
      revert SpaceOwner__OnlySpaceOwnerAllowed();
    }
  }
}
