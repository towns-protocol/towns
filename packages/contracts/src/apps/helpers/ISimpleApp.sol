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

    /// @notice Thrown when the currency address is the zero address
    error InvalidAddressInput();

    /// @notice Thrown when the amount is zero
    error InvalidAmount();

    /// @notice Thrown when the caller is not allowed
    error InvalidCaller();

    /// @notice Thrown when the currency is invalid
    error InvalidCurrency();

    /// @notice Emitted when the app is withdrawn
    /// @param recipient The address that received the withdrawal
    /// @param amount The amount of tokens withdrawn
    event Withdrawal(address indexed recipient, uint256 amount);

    /// @notice Emitted when pricing is updated
    /// @param installPrice The new install price
    /// @param accessDuration The new access duration
    event PricingUpdated(uint256 installPrice, uint48 accessDuration);

    /// @notice Emitted when permissions are updated
    /// @param permissions The new permissions
    event PermissionsUpdated(bytes32[] permissions);

    /// @notice Emitted when the currency is sent
    /// @param recipient The address that received the currency
    /// @param currency The currency that was sent
    /// @param amount The amount of currency that was sent
    event SendCurrency(address indexed recipient, address indexed currency, uint256 amount);
}

interface ISimpleApp is ISimpleAppBase {
    /// @notice Withdraws the ETH balance of the app to the recipient
    /// @param recipient The address to withdraw the ETH to
    function withdrawETH(address recipient) external;

    /// @notice Sends the currency balance of the app to the recipient
    /// @param recipient The address to send the currency to
    /// @param currency The currency to send
    /// @param amount The amount of currency to send
    function sendCurrency(address recipient, address currency, uint256 amount) external;

    /// @notice Updates the pricing of the app
    /// @param installPrice The new install price
    /// @param accessDuration The new access duration
    function updatePricing(uint256 installPrice, uint48 accessDuration) external;

    /// @notice Updates the permissions of the app
    /// @param permissions The new permissions of the app
    function updatePermissions(bytes32[] calldata permissions) external;
}
