// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

interface IPlatformRequirementsBase {
    // Events
    event PlatformFeeRecipientSet(address indexed recipient);
    event PlatformMembershipBpsSet(uint16 bps);
    event PlatformMembershipFeeSet(uint256 fee);
    event PlatformMembershipMintLimitSet(uint256 limit);
    event PlatformMembershipDurationSet(uint256 duration);
    event PlatformMembershipMinPriceSet(uint256 minPrice);
    event PlatformSwapFeesSet(uint16 protocolBps, uint16 posterBps);
    event RouterWhitelistUpdated(address indexed router, bool whitelisted);

    // Errors
    error Platform__InvalidFeeRecipient();
    error Platform__InvalidMembershipBps();
    error Platform__InvalidMembershipMintLimit();
    error Platform__InvalidMembershipDuration();
    error Platform__InvalidMembershipMinPrice();
    error Platform__InvalidSwapFeeBps();
}

interface IPlatformRequirements is IPlatformRequirementsBase {
    /**
     * @notice Set the fee recipient address
     * @dev This is the address that will receive the platform fees
     * @param recipient The address of the fee recipient
     */
    function setFeeRecipient(address recipient) external;

    /**
     * @notice Set the membership basis points
     * @param bps The membership basis points
     */
    function setMembershipBps(uint16 bps) external;

    /**
     * @notice Set the membership flat fee
     * @param fee The membership fee
     */
    function setMembershipFee(uint256 fee) external;

    /**
     * @notice Set the membership mint limit
     * @param limit The membership mint limit
     */
    function setMembershipMintLimit(uint256 limit) external;

    /**
     * @notice Set the membership duration
     * @param duration The membership duration
     */
    function setMembershipDuration(uint64 duration) external;

    /**
     * @notice Set the minimum price for a membership
     * @param minPrice The minimum price for a membership
     */
    function setMembershipMinPrice(uint256 minPrice) external;

    /**
     * @notice Set the swap fees in basis points
     * @param protocolBps Basis points for protocol fee
     * @param posterBps Basis points for poster fee
     */
    function setSwapFees(uint16 protocolBps, uint16 posterBps) external;

    /**
     * @notice Add or remove a router from whitelist
     * @param router Address of the router
     * @param whitelisted True to whitelist, false to remove
     */
    function setRouterWhitelisted(address router, bool whitelisted) external;

    /**
     * @notice Get the fee recipient address
     * @return The address of the fee recipient
     */
    function getFeeRecipient() external view returns (address);

    /**
     * @notice Get the membership basis points
     * @dev This is the basis points that will be charged for a membership
     * @return The membership basis points
     */
    function getMembershipBps() external view returns (uint16);

    /**
     * @notice Get the membership flat fee
     * @dev This is the flat fee that will be charged for a membership
     * @return The membership fee
     */
    function getMembershipFee() external view returns (uint256);

    /**
     * @notice Get the membership mint limit
     * @dev This is the maximum number of free memberships that can be minted per space
     * @return The membership mint limit
     */
    function getMembershipMintLimit() external view returns (uint256);

    /**
     * @notice Get the membership duration
     * @dev This is the duration of a membership in seconds
     * @return The membership duration
     */
    function getMembershipDuration() external view returns (uint64);

    /**
     * @notice Get the minimum price for a membership
     * @dev This is the minimum price that can be set for a membership
     * @return The minimum price for a membership
     */
    function getMembershipMinPrice() external view returns (uint256);

    /**
     * @notice Get the swap fees in basis points
     * @return protocolBps Basis points for protocol fee
     * @return posterBps Basis points for poster fee
     */
    function getSwapFees() external view returns (uint16 protocolBps, uint16 posterBps);

    /**
     * @notice Check if a router is whitelisted
     * @param router Address of the router to check
     * @return bool True if router is whitelisted
     */
    function isRouterWhitelisted(address router) external view returns (bool);

    /**
     * @notice Get the denominator
     * @dev This is the denominator used for calculating fees
     * @return The denominator
     */
    function getDenominator() external pure returns (uint256);
}
