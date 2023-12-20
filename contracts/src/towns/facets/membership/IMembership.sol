// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries

// contracts

interface IMembershipBase {
  // =============================================================
  //                           Strucs
  // =============================================================
  struct MembershipInfo {
    string name;
    string symbol;
    uint256 price;
    uint256 maxSupply;
    uint64 duration;
    address currency;
    address feeRecipient;
    uint256 freeAllocation;
    address pricingModule;
  }

  // =============================================================
  //                           Errors
  // =============================================================
  error Membership__InvalidAddress();
  error Membership__InvalidPrice();
  error Membership__InvalidLimit();
  error Membership__InvalidCurrency();
  error Membership__InvalidFeeRecipient();
  error Membership__InvalidDuration();
  error Membership__InvalidMaxSupply();
  error Membership__InvalidFreeAllocation();
  error Membership__InvalidPricingModule();
  error Membership__AlreadyMember();
  error Membership__InsufficientPayment();
  error Membership__PriceTooLow();
  error Membership__MaxSupplyReached();
  error Membership__InvalidTokenId();
  error Membership__NotRenewable();
  error Membership__NotExpired();

  // =============================================================
  //                           Events
  // =============================================================
  event MembershipPriceUpdated(uint256 indexed price);
  event MembershipLimitUpdated(uint256 indexed limit);
  event MembershipCurrencyUpdated(address indexed currency);
  event MembershipFeeRecipientUpdated(address indexed recipient);
  event MembershipFreeAllocationUpdated(uint256 indexed allocation);
}

interface IMembership is IMembershipBase {
  // =============================================================
  //                           Minting
  // =============================================================
  /**
   * @notice Join a town
   * @param receiver The address of the receiver
   * @return The token id of the membership
   */
  function joinTown(address receiver) external payable returns (uint256);

  /**
   * @notice Join a town with a referral
   * @param receiver The address of the receiver
   * @param referrer The address of the referrer
   * @param referralCode The referral code
   * @return The token id of the membership
   */
  function joinTownWithReferral(
    address receiver,
    address referrer,
    uint256 referralCode
  ) external payable returns (uint256);

  /**
   * @notice Renew a town membership
   * @param receiver The address of the receiver
   */
  function renewMembership(address receiver) external payable;

  /**
   * @notice Cancel a town membership
   * @param tokenId The token id of the membership
   */
  function cancelMembership(uint256 tokenId) external;

  /**
   * @notice Return the expiration date of a membership
   * @param tokenId The token id of the membership
   */
  function expiresAt(uint256 tokenId) external view returns (uint256);

  // =============================================================
  //                           Duration
  // =============================================================
  /**
   * @notice Set the membership duration
   * @param newDuration The new membership duration
   */
  function setMembershipDuration(uint64 newDuration) external;

  /**
   * @notice Get the membership duration
   * @return The membership duration
   */
  function getMembershipDuration() external view returns (uint64);

  // =============================================================
  //                        Pricing Module
  // =============================================================
  /**
   * @notice Set the membership pricing module
   * @param pricingModule The new pricing module
   */
  function setMembershipPricingModule(address pricingModule) external;

  /**
   * @notice Get the membership pricing module
   * @return The membership pricing module
   */
  function getMembershipPricingModule() external view returns (address);

  // =============================================================
  //                           Pricing
  // =============================================================

  /**
   * @notice Set the membership price
   * @param newPrice The new membership price
   */
  function setMembershipPrice(uint256 newPrice) external;

  /**
   * @notice Get the membership price
   * @return The membership price
   */
  function getMembershipPrice() external view returns (uint256);

  /**
   * @notice Get the membership renewal price
   * @param tokenId The token id of the membership
   * @return The membership renewal price
   */
  function getMembershipRenewalPrice(
    uint256 tokenId
  ) external view returns (uint256);

  // =============================================================
  //                           Allocation
  // =============================================================
  /**
   * @notice Set the membership free allocation
   * @param newAllocation The new membership free allocation
   */
  function setMembershipFreeAllocation(uint256 newAllocation) external;

  /**
   * @notice Get the membership free allocation
   * @return The membership free allocation
   */
  function getMembershipFreeAllocation() external view returns (uint256);

  // =============================================================
  //                        Limits
  // =============================================================

  /**
   * @notice Set the membership limit
   * @param newLimit The new membership limit
   */
  function setMembershipLimit(uint256 newLimit) external;

  /**
   * @notice Get the membership limit
   * @return The membership limit
   */
  function getMembershipLimit() external view returns (uint256);

  // =============================================================
  //                           Currency
  // =============================================================

  /**
   * @notice Set the membership currency
   * @param newCurrency The new membership currency
   */
  function setMembershipCurrency(address newCurrency) external;

  /**
   * @notice Get the membership currency
   * @return The membership currency
   */
  function getMembershipCurrency() external view returns (address);

  // =============================================================
  //                           Recipient
  // =============================================================
  /**
   * @notice Set the membership fee recipient
   * @param newRecipient The new membership fee recipient
   */
  function setMembershipFeeRecipient(address newRecipient) external;

  /**
   * @notice Get the membership fee recipient
   * @return The membership fee recipient
   */
  function getMembershipFeeRecipient() external view returns (address);

  // =============================================================
  //                           Factory
  // =============================================================
  /**
   * @notice Get the town factory
   * @return The town factory
   */
  function getTownFactory() external view returns (address);
}
