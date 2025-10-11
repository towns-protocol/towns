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

    event StreamConfigured(address indexed app, address indexed currency, uint256 flowRate);
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
    function requestFunds(address currency, uint256 amount) external returns (bytes32 voucherId);

    function configureStream(address app, address currency, uint256 flowRate) external;

    function pauseStream(address app, address currency) external;

    function resumeStream(address app, address currency) external;

    function getStreamBalance(address app, address currency) external view returns (uint256);
}
