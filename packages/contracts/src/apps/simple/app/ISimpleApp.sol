// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces

// libraries

// contracts

interface ISimpleAppBase {
    /// @notice Thrown when the recipient address is the zero address
    error SimpleApp__ZeroAddress();

    /// @notice Thrown when there is no balance to withdraw
    error SimpleApp__NoBalanceToWithdraw();

    /// @notice Thrown when the currency address is the zero address
    error SimpleApp__InvalidAddressInput();

    /// @notice Thrown when the amount is zero
    error SimpleApp__InvalidAmount();

    /// @notice Thrown when the caller is not allowed
    error SimpleApp__InvalidCaller();

    /// @notice Thrown when the currency is invalid
    error SimpleApp__InvalidCurrency();

    /// @notice Emitted when the app is initialized
    /// @param owner The owner of the app
    /// @param client The client of the app
    event SimpleAppInitialized(address indexed owner, address indexed client);

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

    /// @notice Updates the pricing of the app
    /// @param installPrice The new install price
    /// @param accessDuration The new access duration
    function updatePricing(uint256 installPrice, uint48 accessDuration) external;

    /// @notice Updates the permissions of the app
    /// @param permissions The new permissions of the app
    function updatePermissions(bytes32[] calldata permissions) external;
}
