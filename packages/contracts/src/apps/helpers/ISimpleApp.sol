// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

interface ISimpleAppBase {
    /// @notice Thrown when the recipient address is the zero address
    error ZeroAddress();

    /// @notice Thrown when there is no balance to withdraw
    error NoBalanceToWithdraw();

    /// @notice Emitted when the app is withdrawn
    /// @param recipient The address that received the withdrawal
    /// @param amount The amount of tokens withdrawn
    event Withdrawal(address indexed recipient, uint256 amount);

    /// @notice Emitted when pricing is updated
    /// @param installPrice The new install price
    /// @param accessDuration The new access duration
    event PricingUpdated(uint256 installPrice, uint48 accessDuration);
}

interface ISimpleApp is ISimpleAppBase {
    /// @notice Withdraws the ETH balance of the app to the recipient
    /// @param recipient The address to withdraw the ETH to
    function withdrawETH(address recipient) external;

    /// @notice Updates the pricing of the app
    /// @param installPrice The new install price
    /// @param accessDuration The new access duration
    function updatePricing(uint256 installPrice, uint48 accessDuration) external;

    /// @notice Initializes the app
    /// @param owner The owner of the app
    /// @param appId The ID of the app
    /// @param permissions The permissions of the app
    /// @param installPrice The install price of the app
    /// @param accessDuration The access duration of the app
    function initialize(
        address owner,
        string calldata appId,
        bytes32[] calldata permissions,
        uint256 installPrice,
        uint48 accessDuration
    ) external;
}
