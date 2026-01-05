// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface IMembershipBase {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           ENUMS                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice JoinType enum for unified membership join dispatch
    /// @dev To encode data for each action:
    ///   switch (action) {
    ///     case JoinType.Basic:
    ///       data = abi.encode(address receiver);
    ///     case JoinType.WithReferral:
    ///       data = abi.encode(address receiver, ReferralTypes memory referral);
    ///   }
    enum JoinType {
        Basic, // Basic join with just receiver address
        WithReferral // Join with referral information
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           STRUCTS                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    struct Membership {
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

    struct ReferralTypes {
        address partner;
        address userReferral;
        string referralCode;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           ERRORS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    error Membership__InvalidAddress();
    error Membership__InvalidDuration();
    error Membership__InvalidMaxSupply();
    error Membership__InvalidFreeAllocation();
    error Membership__InvalidPricingModule();
    error Membership__InsufficientPayment();
    error Membership__MaxSupplyReached();
    error Membership__InvalidPayment();
    error Membership__InvalidTransactionType();
    error Membership__Banned();
    error Membership__InvalidAction();
    error Membership__CannotSetFreeAllocationOnPaidSpace();

    /// @notice Error thrown when ETH is sent for ERC20 payment
    error Membership__UnexpectedValue();

    /// @notice Error thrown when currency is not supported for fees
    error Membership__UnsupportedCurrency();

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           EVENTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    event MembershipPriceUpdated(uint256 indexed price);
    event MembershipLimitUpdated(uint256 indexed limit);
    event MembershipCurrencyUpdated(address indexed currency);
    event MembershipFeeRecipientUpdated(address indexed recipient);
    event MembershipFreeAllocationUpdated(uint256 indexed allocation);
    event MembershipWithdrawal(address indexed currency, address indexed recipient, uint256 amount);
    event MembershipTokenIssued(address indexed recipient, uint256 indexed tokenId);
    /// @notice Emitted when a membership payment is processed (new membership or renewal)
    /// @param currency The currency used for payment (address(0) for ETH)
    /// @param price The base membership price paid
    /// @param protocolFee The protocol fee paid
    event MembershipPaid(
        address indexed currency,
        uint256 price,
        uint256 protocolFee
    );
    event MembershipTokenRejected(address indexed recipient);
}

interface IMembership is IMembershipBase {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           MINTING                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Unified entry point for joining spaces with different configurations
    /// @param action The type of join action to perform
    /// @param data ABI-encoded data for the specific action type
    function joinSpace(JoinType action, bytes calldata data) external payable;

    /// @notice Join a space
    /// @param receiver The address of the receiver
    function joinSpace(address receiver) external payable;

    /// @notice Join a space with a referral
    /// @param receiver The address of the receiver
    /// @param referral The referral data
    function joinSpaceWithReferral(
        address receiver,
        ReferralTypes calldata referral
    ) external payable;

    /// @notice Renew a space membership
    /// @param tokenId The token id of the membership
    function renewMembership(uint256 tokenId) external payable;

    /// @notice Return the expiration date of a membership
    /// @param tokenId The token id of the membership
    function expiresAt(uint256 tokenId) external view returns (uint256);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         DURATION                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Get the membership duration
    /// @return The membership duration
    function getMembershipDuration() external view returns (uint64);

    /// @notice Set the membership duration
    /// @param duration The new membership duration in seconds
    function setMembershipDuration(uint64 duration) external;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       PRICING MODULE                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Set the membership pricing module
    /// @param pricingModule The new pricing module
    function setMembershipPricingModule(address pricingModule) external;

    /// @notice Get the membership pricing module
    /// @return The membership pricing module
    function getMembershipPricingModule() external view returns (address);

    /// @notice Get the protocol fee
    /// @return The protocol fee
    function getProtocolFee() external view returns (uint256);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          PRICING                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Set the membership price
    /// @param newPrice The new membership price
    function setMembershipPrice(uint256 newPrice) external;

    /// @notice Get the membership price
    /// @return The membership price
    function getMembershipPrice() external view returns (uint256);

    /// @notice Get the membership renewal price
    /// @param tokenId The token id of the membership
    /// @return The membership renewal price
    function getMembershipRenewalPrice(uint256 tokenId) external view returns (uint256);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         ALLOCATION                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Set the membership free allocation
    /// @param newAllocation The new membership free allocation
    function setMembershipFreeAllocation(uint256 newAllocation) external;

    /// @notice Get the membership free allocation
    /// @return The membership free allocation
    function getMembershipFreeAllocation() external view returns (uint256);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          LIMITS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Set the membership limit
    /// @param newLimit The new membership limit
    function setMembershipLimit(uint256 newLimit) external;

    /// @notice Get the membership limit
    /// @return The membership limit
    function getMembershipLimit() external view returns (uint256);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           IMAGE                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Set the membership image
    /// @param image The new membership image
    function setMembershipImage(string calldata image) external;

    /// @notice Get the membership image
    /// @return The membership image
    function getMembershipImage() external view returns (string memory);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          GETTERS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Get the membership currency
    /// @return The membership currency
    function getMembershipCurrency() external view returns (address);

    /// @notice Set the membership currency
    /// @param currency The new membership currency address
    function setMembershipCurrency(address currency) external;

    /// @notice Get the space factory
    /// @return The space factory
    function getSpaceFactory() external view returns (address);

    /// @notice Get the current balance of funds held by the space
    /// @return The current balance of funds held by the space
    function revenue() external view returns (uint256);
}
