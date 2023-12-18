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
import {ReentrancyGuard} from "contracts/src/diamond/facets/reentrancy/ReentrancyGuard.sol";
import {Entitled} from "contracts/src/towns/facets/Entitled.sol";
import {MembershipReferralBase} from "./referral/MembershipReferralBase.sol";

contract MembershipFacet is
  IMembership,
  MembershipBase,
  MembershipReferralBase,
  ERC5643Base,
  ReentrancyGuard,
  ERC721A,
  Entitled
{
  function __Membership_init(
    MembershipInfo memory info,
    address townFactory
  ) external onlyInitializing {
    __MembershipBase_init(info, townFactory);
    __ERC721A_init_unchained(info.name, info.symbol);
  }

  // =============================================================
  //                           Minting
  // =============================================================
  function _validateJoinTown(address receiver) internal view {
    if (receiver == address(0)) revert Membership__InvalidAddress();
    if (_balanceOf(msg.sender) > 0) revert Membership__AlreadyMember();
    if (_balanceOf(receiver) > 0) revert Membership__AlreadyMember();
    if (
      _getMembershipSupplyLimit() != 0 &&
      _totalSupply() >= _getMembershipSupplyLimit()
    ) revert Membership__MaxSupplyReached();

    // validate the receiver is allowed to join the town
    _validatePermission(Permissions.JoinTown, receiver);
  }

  /// @inheritdoc IMembership
  function joinTown(
    address receiver
  ) external payable nonReentrant returns (uint256 tokenId) {
    _validateJoinTown(receiver);

    // allocate protocol and membership fees
    uint256 membershipPrice = _getMembershipPrice(_totalMinted());
    if (membershipPrice > 0) {
      uint256 protocolFee = _collectProtocolFee(receiver, membershipPrice);
      uint256 surplus = membershipPrice - protocolFee;
      if (surplus > 0)
        _transferOut(receiver, _getMembershipFeeRecipient(), surplus);
    }

    // mint membership
    tokenId = _nextTokenId();
    _safeMint(receiver, 1);

    // set expiration of membership
    _renewSubscription(tokenId, _getMembershipDuration());
  }

  /// @inheritdoc IMembership
  function joinTownWithReferral(
    address receiver,
    address referrer,
    uint256 referralCode
  ) external payable nonReentrant returns (uint256 tokenId) {
    _validateJoinTown(receiver);

    // allocate protocol, membership and referral fees
    uint256 membershipPrice = _getMembershipPrice(_totalMinted());
    if (membershipPrice > 0) {
      uint256 protocolFee = _collectProtocolFee(receiver, membershipPrice);
      uint256 netMembershipPrice = membershipPrice - protocolFee;

      if (netMembershipPrice > 0) {
        // calculate referral fee from net membership price
        uint256 referralFee = _calculateReferralAmount(
          netMembershipPrice,
          referralCode
        );
        _transferOut(receiver, referrer, referralFee);

        // transfer remaining amount to fee recipient
        uint256 recipientFee = netMembershipPrice - referralFee;
        if (recipientFee > 0)
          _transferOut(receiver, _getMembershipFeeRecipient(), recipientFee);
      }
    }

    // mint membership
    tokenId = _nextTokenId();
    _safeMint(receiver, 1);

    // set expiration of membership
    _renewSubscription(tokenId, _getMembershipDuration());
  }

  /// @inheritdoc IMembership
  function renewMembership(address receiver) external payable nonReentrant {
    if (receiver == address(0)) revert Membership__InvalidAddress();
    if (_balanceOf(receiver) == 0) revert Membership__InvalidAddress();

    uint256 tokenId = _getTokenIdByMembership(receiver);

    // allocate protocol and membership fees
    uint256 membershipPrice = _getMembershipPrice(_totalMinted()); // _getRenewalPrice(tokenId);
    if (membershipPrice > 0) {
      uint256 protocolFee = _collectProtocolFee(receiver, membershipPrice);
      uint256 netPrice = membershipPrice - protocolFee;
      if (netPrice > 0)
        _transferOut(receiver, _getMembershipFeeRecipient(), netPrice);
    }

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
    _verifyDuration(newDuration);
    _setMembershipDuration(newDuration);
  }

  /// @inheritdoc IMembership
  function getMembershipDuration() external view returns (uint64) {
    return _getMembershipDuration();
  }

  // =============================================================
  //                        Pricing Module
  // =============================================================
  /// @inheritdoc IMembership
  function setMembershipPricingModule(
    address pricingModule
  ) external onlyOwner {
    if (pricingModule == address(0)) revert Membership__InvalidPricingModule();
    _verifyPricingModule(pricingModule);
    _setPricingModule(pricingModule);
  }

  /// @inheritdoc IMembership
  function getMembershipPricingModule() external view returns (address) {
    return _getPricingModule();
  }

  // =============================================================
  //                           Pricing
  // =============================================================

  /// @inheritdoc IMembership
  function setMembershipPrice(uint256 newPrice) external onlyOwner {
    _verifyCurrency(_getMembershipCurrency());
    _verifyPrice(newPrice);
    _setMembershipPrice(newPrice);
  }

  /// @inheritdoc IMembership
  function getMembershipPrice() external view returns (uint256) {
    return _getMembershipPrice(_totalMinted());
  }

  // =============================================================
  //                           Allocation
  // =============================================================
  /// @inheritdoc IMembership
  function setMembershipFreeAllocation(
    uint256 newAllocation
  ) external onlyOwner {
    // get current supply limit
    uint256 currentSupplyLimit = _getMembershipSupplyLimit();

    // verify newLimit is not more than the max supply limit
    if (currentSupplyLimit != 0 && newAllocation > currentSupplyLimit)
      revert Membership__InvalidFreeAllocation();

    // verify newLimit is not more than the allowed platform limit
    _verifyFreeAllocation(newAllocation);
    _setMembershipFreeAllocation(newAllocation);
  }

  /// @inheritdoc IMembership
  function getMembershipFreeAllocation() external view returns (uint256) {
    return _getMembershipFreeAllocation();
  }

  // =============================================================
  //                    Token Max Supply Limit
  // =============================================================

  /// @inheritdoc IMembership
  function setMembershipLimit(uint256 newLimit) external onlyOwner {
    _verifyMaxSupply(newLimit, _totalSupply());
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
    _verifyCurrency(newCurrency);
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
    _verifyRecipient(newRecipient);
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
    address sender = msg.sender;

    return
      (sender == owner) ||
      _isApprovedForAll(owner, sender) ||
      _getApproved(tokenId) == sender;
  }

  // =============================================================
  //                           Overrides
  // =============================================================

  // ERC5643 overrides
  /// @dev only renewable if the expiration of the current membership is less than the default duration + current time. To prevent people from renewing too early.
  function _isRenewable(uint256 tokenId) internal view override returns (bool) {
    return _expiresAt(tokenId) < _getMembershipDuration() + block.timestamp;
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
}
