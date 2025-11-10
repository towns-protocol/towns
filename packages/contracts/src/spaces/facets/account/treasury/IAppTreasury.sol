// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces

// libraries

// contracts

interface IAppTreasuryBase {
    error AppTreasury__InvalidFlowRate();
    error AppTreasury__AppNotExecuting();
    error AppTreasury__StreamNotActive();
    error AppTreasury__InsufficientStreamBalance();
    error AppTreasury__ExceedsCircuitBreakerLimit();
    error AppTreasury__TreasuryPaused();
    error AppTreasury__VoucherLimitExceeded();
    error AppTreasury__InvalidVoucher();
    error AppTreasury__VoucherExpired();
    error AppTreasury__UnauthorizedClaim();

    event StreamConfigured(
        address indexed app,
        address indexed currency,
        uint256 flowRate,
        uint256 maxBalance
    );
    event StreamWithdrawal(address indexed app, address indexed currency, uint256 amount);

    event CircuitBreakerConfigured(
        address indexed currency,
        uint256 limit,
        uint256 windowInSeconds,
        uint256 cooldown
    );

    event CircuitBreakerTripped(address indexed currency, uint256 pausedUntil);

    event CircuitBreakerReset(address indexed currency);

    event VoucherCreated(bytes32 indexed voucherId, address indexed app, uint256 amount);

    event VoucherApproved(bytes32 indexed voucherId, address approver);
    event VoucherClaimed(bytes32 indexed voucherId, address indexed app, uint256 amount);

    event VoucherCancelled(bytes32 indexed voucherId, address indexed app, uint256 amount);
}

interface IAppTreasury {
    /// @notice Requests funds from the treasury
    /// @param currency The currency to request funds for
    /// @param amount The amount of currency to request
    /// @return voucherId The ID of the voucher
    function fundsRequest(address currency, uint256 amount) external returns (bytes32 voucherId);

    /// @notice Claims a voucher
    /// @param voucherId The ID of the voucher
    function claimVoucher(bytes32 voucherId) external;

    /// @notice Configures a stream
    /// @param app The app to configure the stream for
    /// @param currency The currency to configure the stream for
    /// @param flowRate The flow rate of the stream
    /// @param maxBalance The max balance of the stream
    function configureStream(
        address app,
        address currency,
        uint256 flowRate,
        uint256 maxBalance
    ) external;

    /// @notice Pauses a stream
    /// @param app The app to pause the stream for
    /// @param currency The currency to pause the stream for
    function pauseStream(address app, address currency) external;

    /// @notice Resumes a stream
    /// @param app The app to resume the stream for
    /// @param currency The currency to resume the stream for
    function resumeStream(address app, address currency) external;

    /// @notice Gets the balance of a stream
    /// @param app The app to get the balance for
    /// @param currency The currency to get the balance for
    /// @return balance The balance of the stream
    function getStreamBalance(address app, address currency) external view returns (uint256);

    /// @notice Approves a voucher
    /// @param voucherId The ID of the voucher
    function approveVoucher(bytes32 voucherId) external;

    /// @notice Cancels a voucher
    /// @param voucherId The ID of the voucher
    function cancelVoucher(bytes32 voucherId) external;

    /// @notice Configures a circuit breaker
    /// @param currency The currency to configure the circuit breaker for
    /// @param limit The limit of the circuit breaker
    /// @param window The window of the circuit breaker
    /// @param cooldown The cooldown of the circuit breaker
    function configureCircuitBreaker(
        address currency,
        uint256 limit,
        uint256 window,
        uint256 cooldown
    ) external;
}
