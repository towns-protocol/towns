// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IMembership} from "./IMembership.sol";
import {IMembershipPricing} from "./pricing/IMembershipPricing.sol";

// libraries
import {CurrencyTransfer} from "contracts/src/utils/libraries/CurrencyTransfer.sol";

// contracts
import {ReentrancyGuard} from "solady/utils/ReentrancyGuard.sol";
import {MembershipJoin} from "./join/MembershipJoin.sol";
import {Facet} from "@river-build/diamond/src/facets/Facet.sol";

contract MembershipFacet is
  IMembership,
  MembershipJoin,
  ReentrancyGuard,
  Facet
{
  // =============================================================
  //                           Funds
  // =============================================================

  /// @inheritdoc IMembership
  function withdraw(address account) external onlyOwner nonReentrant {
    if (account == address(0)) revert Membership__InvalidAddress();

    // get the balance
    uint256 balance = _getCreatorBalance();

    // verify the balance is not 0
    if (balance == 0) revert Membership__InsufficientPayment();

    // reset the balance
    _setCreatorBalance(0);

    CurrencyTransfer.transferCurrency(
      _getMembershipCurrency(),
      address(this),
      account,
      balance
    );
  }

  /// @inheritdoc IMembership
  function revenue() external view returns (uint256) {
    return _getCreatorBalance();
  }

  // =============================================================
  //                           Join
  // =============================================================

  /// @inheritdoc IMembership
  function joinSpace(address receiver) external payable nonReentrant {
    ReferralTypes memory emptyReferral;
    _joinSpaceWithReferral(receiver, emptyReferral);
  }

  /// @inheritdoc IMembership
  function joinSpaceWithReferral(
    address receiver,
    ReferralTypes memory referral
  ) external payable nonReentrant {
    _joinSpaceWithReferral(receiver, referral);
  }

  // =============================================================
  //                           Renewal
  // =============================================================

  /// @inheritdoc IMembership
  function renewMembership(uint256 tokenId) external payable nonReentrant {
    address receiver = _ownerOf(tokenId);

    if (receiver == address(0)) revert Membership__InvalidAddress();

    // validate if the current expiration is 365 or more
    uint256 expiration = _expiresAt(tokenId);
    if (expiration - block.timestamp >= _getMembershipDuration())
      revert Membership__NotExpired();

    // allocate protocol and membership fees
    uint256 membershipPrice = _getMembershipRenewalPrice(
      tokenId,
      _totalSupply()
    );

    if (membershipPrice > 0) {
      uint256 protocolFee = _collectProtocolFee(receiver, membershipPrice);
      uint256 surplus = membershipPrice - protocolFee;
      if (surplus > 0) _transferIn(receiver, surplus);
    }

    _renewSubscription(tokenId, _getMembershipDuration());
  }

  /// @inheritdoc IMembership
  function expiresAt(uint256 tokenId) external view returns (uint256) {
    return _expiresAt(tokenId);
  }

  // =============================================================
  //                           Duration
  // =============================================================

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
    _verifyPrice(newPrice);
    IMembershipPricing(_getPricingModule()).setPrice(newPrice);
  }

  /// @inheritdoc IMembership
  function getMembershipPrice() external view returns (uint256) {
    return _getMembershipPrice(_totalSupply());
  }

  /// @inheritdoc IMembership
  function getMembershipRenewalPrice(
    uint256 tokenId
  ) external view returns (uint256) {
    return _getMembershipRenewalPrice(tokenId, _totalSupply());
  }

  /// @inheritdoc IMembership
  function getProtocolFee() external view returns (uint256) {
    return _getProtocolFee(_getMembershipPrice(_totalSupply()));
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
  function getMembershipCurrency() external view returns (address) {
    return _getMembershipCurrency();
  }

  // =============================================================
  //                           Image
  // =============================================================
  function setMembershipImage(string calldata newImage) external onlyOwner {
    _setMembershipImage(newImage);
  }

  function getMembershipImage() external view returns (string memory) {
    return _getMembershipImage();
  }

  // =============================================================
  //                           Factory
  // =============================================================

  /// @inheritdoc IMembership
  function getSpaceFactory() external view returns (address) {
    return _getSpaceFactory();
  }
}
