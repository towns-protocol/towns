// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

// Interfaces

/// @notice Spending limits for a token
/// @param maxPerTransaction Max amount per single transaction
/// @param maxPerPeriod Max amount per time period
/// @param spentInPeriod Amount spent in current period
/// @param resetPeriod Time period in seconds (e.g., 86400 for daily)
/// @param periodStart When current period started
/// @param enabled Whether limits are enabled
struct SpendingLimits {
    uint256 maxPerTransaction;
    uint256 maxPerPeriod;
    uint256 spentInPeriod;
    uint32 resetPeriod;
    uint48 periodStart;
    bool enabled;
}

interface ITransferControlBase {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           ERRORS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    error TransferControlDisabled();
    error UnauthorizedTransferRequest();
    error SpendingLimitExceeded();
    error PeriodSpendingLimitExceeded();
    error UnsupportedToken(address token);
    error InsufficientBalance();
    error TransferFailed();
    error InvalidLimits();
    error InvalidArrayLength();

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           EVENTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    event TransferRequested(
        address indexed app,
        address indexed token,
        address indexed to,
        uint256 amount
    );
    event SpendingPeriodReset(address indexed app, address indexed token, uint48 newPeriodStart);
    event SpendingRecorded(
        address indexed app,
        address indexed token,
        uint256 amount,
        uint256 totalInPeriod,
        uint256 limit
    );

    event TransferControlEnabledSet(bool enabled);
    event SupportedTokenAdded(address indexed token, SpendingLimits limits);
    event SupportedTokenRemoved(address indexed token);
    event DefaultTokenLimitsSet(address indexed token, SpendingLimits limits);
    event AppTokenLimitsSet(address indexed app, address indexed token, SpendingLimits limits);
    event AppTokenLimitsRemoved(address indexed app, address indexed token);
}
