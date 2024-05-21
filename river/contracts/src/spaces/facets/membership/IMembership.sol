// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

interface IMembershipBase {
  // =============================================================
  //                           Strucs
  // =============================================================
  struct Membership {
    string name;
    string symbol;
    uint256 price;
    uint256 maxSupply;
    uint64 duration; // remove
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
  error Membership__NotExpired();
  error Membership__InsufficientAllowance();

  // =============================================================
  //                           Events
  // =============================================================
  event MembershipPriceUpdated(uint256 indexed price);
  event MembershipLimitUpdated(uint256 indexed limit);
  event MembershipCurrencyUpdated(address indexed currency);
  event MembershipFeeRecipientUpdated(address indexed recipient);
  event MembershipFreeAllocationUpdated(uint256 indexed allocation);
  event MembershipWithdrawal(address indexed recipient, uint256 amount);
  event MembershipTokenIssued(
    address indexed recipient,
    uint256 indexed tokenId
  );
  event MembershipTokenRejected(address indexed recipient);
}

interface IMembership is IMembershipBase {
  // =============================================================
  //                           Funds
  // =============================================================
  function withdraw(address receiver) external;

  // =============================================================
  //                           Minting
  // =============================================================
  /**
   * @notice Join a space
   * @param receiver The address of the receiver
   */
  function joinSpace(address receiver) external payable;

  /**
   * @notice Join a space with a referral
   * @param receiver The address of the receiver
   * @param referrer The address of the referrer
   * @param referralCode The referral code
   */
  function joinSpaceWithReferral(
    address receiver,
    address referrer,
    uint256 referralCode
  ) external payable;

  /**
   * @notice Renew a space membership
   * @param tokenId The token id of the membership
   */
  function renewMembership(uint256 tokenId) external payable;

  /**
   * @notice Return the expiration date of a membership
   * @param tokenId The token id of the membership
   */
  function expiresAt(uint256 tokenId) external view returns (uint256);

  // =============================================================
  //                           Duration
  // =============================================================

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
   * @notice Get the membership currency
   * @return The membership currency
   */
  function getMembershipCurrency() external view returns (address);

  // =============================================================
  //                           Image
  // =============================================================
  /**
   * @notice Set the membership image
   * @param image The new membership image
   */
  function setMembershipImage(string calldata image) external;

  /**
   * @notice Get the membership image
   * @return The membership image
   */
  function getMembershipImage() external view returns (string memory);

  // =============================================================
  //                           Factory
  // =============================================================
  /**
   * @notice Get the space factory
   * @return The space factory
   */
  function getSpaceFactory() external view returns (address);
}
