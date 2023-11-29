// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IMembership} from "./IMembership.sol";

// libraries
import {Permissions} from "contracts/src/towns/facets/Permissions.sol";

// contracts
import {MembershipBase} from "./MembershipBase.sol";
import {ERC721A} from "contracts/src/diamond/facets/token/ERC721A/ERC721A.sol";
import {ERC5643Base} from "contracts/src/diamond/facets/token/ERC5643/ERC5643Base.sol";
import {ERC2771RecipientBase} from "contracts/src/diamond/facets/recipient/ERC2771RecipientBase.sol";
import {ReentrancyGuard} from "contracts/src/diamond/facets/reentrancy/ReentrancyGuard.sol";
import {Entitled} from "contracts/src/towns/facets/Entitled.sol";

contract MembershipFacet is
  IMembership,
  MembershipBase,
  ERC5643Base,
  ERC2771RecipientBase,
  ReentrancyGuard,
  ERC721A,
  Entitled
{
  function __Membership_init(
    MembershipInfo memory info,
    address townFactory,
    address forwarder
  ) external onlyInitializing {
    __MembershipBase_init(info, townFactory);
    __ERC721A_init_unchained(info.name, info.symbol);
    __ERC2771RecipientBase_init(forwarder);
  }

  // =============================================================
  //                           Minting
  // =============================================================

  /// @inheritdoc IMembership
  function joinTown(
    address receiver
  ) external payable nonReentrant returns (uint256 tokenId) {
    // TODO: should we validate the receiver or just the caller?
    _validatePermission(Permissions.JoinTown);

    // if the receiver is already a member, revert
    if (_balanceOf(receiver) > 0) revert Membership__AlreadyMember();

    // // if the membership price is 0, and we have reached the membership limit, revert
    if (
      _getMembershipSupplyLimit() != 0 &&
      _totalSupply() >= _getMembershipSupplyLimit()
    ) {
      revert Membership__MaxSupplyReached();
    }

    tokenId = _nextTokenId();

    _collectMembershipFee(receiver);
    _safeMint(receiver, 1);
    _renewSubscription(tokenId, _getMembershipDuration());
  }

  /// @inheritdoc IMembership
  function renewMembership(address receiver) external payable nonReentrant {
    if (receiver == address(0)) revert Membership__InvalidAddress();

    uint256 tokenId = _getTokenIdByMembership(receiver);

    if (!_isApprovedOrOwner(tokenId))
      revert ApprovalCallerNotOwnerNorApproved();

    _collectMembershipFee(receiver);
    _renewSubscription(tokenId, _getMembershipDuration());
  }

  /// @inheritdoc IMembership
  function cancelMembership(uint256 tokenId) external nonReentrant {
    if (!_isApprovedOrOwner(tokenId))
      revert ApprovalCallerNotOwnerNorApproved();

    _burn(tokenId);
    _cancelSubscription(tokenId);
  }

  /// @inheritdoc IMembership
  function expiresAt(uint256 tokenId) external view returns (uint256) {
    return _expiresAt(tokenId);
  }

  // =============================================================
  //                           Duration
  // =============================================================
  /// @inheritdoc IMembership
  function setMembershipDuration(uint64 newDuration) external onlyOwner {
    _setMembershipDuration(newDuration);
  }

  /// @inheritdoc IMembership
  function getMembershipDuration() external view returns (uint64) {
    return _getMembershipDuration();
  }

  // =============================================================
  //                           Pricing
  // =============================================================

  /// @inheritdoc IMembership
  function setMembershipPrice(uint256 newPrice) external onlyOwner {
    _setMembershipPrice(newPrice);
  }

  /// @inheritdoc IMembership
  function getMembershipPrice() external view returns (uint256) {
    return _getMembershipPrice();
  }

  // =============================================================
  //                    Token Max Supply Limit
  // =============================================================

  /// @inheritdoc IMembership
  function setMembershipLimit(uint256 newLimit) external onlyOwner {
    // if the new limit is less than the current total supply, revert
    if (newLimit < _totalSupply()) revert Membership__InvalidMaxSupply();

    // if the new limit is less than the current max supply, revert
    if (newLimit <= _getMembershipSupplyLimit())
      revert Membership__InvalidMaxSupply();

    _setMembershipSupplyLimit(newLimit);
  }

  /// @inheritdoc IMembership
  function getMembershipLimit() external view returns (uint256) {
    return _getMembershipSupplyLimit();
  }

  // =============================================================
  //                           Currency
  // =============================================================

  /// @inheritdoc IMembership
  function setMembershipCurrency(address newCurrency) external onlyOwner {
    _setMembershipCurrency(newCurrency);
  }

  /// @inheritdoc IMembership
  function getMembershipCurrency() external view returns (address) {
    return _getMembershipCurrency();
  }

  // =============================================================
  //                           Recipient
  // =============================================================

  /// @inheritdoc IMembership
  function setMembershipFeeRecipient(address newRecipient) external onlyOwner {
    _setMembershipFeeRecipient(newRecipient);
  }

  /// @inheritdoc IMembership
  function getMembershipFeeRecipient() external view returns (address) {
    return _getMembershipFeeRecipient();
  }

  // =============================================================
  //                           Factory
  // =============================================================

  /// @inheritdoc IMembership
  function getTownFactory() external view returns (address) {
    return _getTownFactory();
  }

  // =============================================================
  //                           Internal
  // =============================================================
  function _isApprovedOrOwner(uint256 tokenId) internal view returns (bool) {
    address owner = _ownerOf(tokenId);

    return
      (_msgSender() == owner) ||
      _isApprovedForAll(owner, _msgSender()) ||
      _getApproved(tokenId) == _msgSender();
  }

  // =============================================================
  //                           Overrides
  // =============================================================

  // ERc5643 overrides
  /// @dev only renewable if the expiration of the current membership is less than the default duration + current time. To prevent people from renewing too early.
  function _isRenewable(uint256 tokenId) internal view override returns (bool) {
    return _expiresAt(tokenId) < _getMembershipDuration() + block.timestamp;
  }

  function abs(int x) private pure returns (int) {
    return x >= 0 ? x : -x;
  }

  // ERC721A overrides
  // =============================================================
  function balanceOf(address account) public view override returns (uint256) {
    // check if expiration has been reached, return 0 if so
    if (_expiresAt(_getTokenIdByMembership(account)) <= block.timestamp) {
      return 0;
    }

    return _balanceOf(account);
  }

  function _beforeTokenTransfers(
    address from,
    address to,
    uint256 startTokenId,
    uint256 quantity
  ) internal override {
    super._beforeTokenTransfers(from, to, startTokenId, quantity);
    _setMembershipTokenId(startTokenId, to);
  }

  function _msgSenderERC721A() internal view override returns (address) {
    return _msgSender();
  }

  // Entitled overrides
  // =============================================================
  function _msgSenderEntitled() internal view override returns (address) {
    return _msgSender();
  }
}
