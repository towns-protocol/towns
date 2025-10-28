// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces

// libraries

// contracts

struct StreamConfig {
    uint256 flowRatePerSecond;
    uint256 lastWithdrawal;
    uint256 balance;
    uint256 maxBalance;
    bool active;
}

struct CircuitBreaker {
    uint256 limit; // max withdrawal per window
    uint256 windowInSeconds; // time window in seconds
    uint256 windowStart; // current window start time
    uint256 withdrawn; // amount withdrawn in current window
    uint256 cooldown; // pause duration when tripped
    uint256 pausedUntil; // timestamp when pause ends
}

enum VoucherStatus {
    Invalid,
    Pending,
    Approved,
    Claimed,
    Expired,
    Cancelled
}

struct Voucher {
    address app;
    address currency;
    uint256 amount;
    uint256 createdAt;
    uint256 expiresAt;
    VoucherStatus status;
    bytes32 executionId; // ties voucher to specific execution
}

struct VoucherConfig {
    mapping(address => uint256) vouchersCreatedThisPeriod;
    mapping(address => uint256) lastVoucherPeriod;
    uint256 maxVouchersPerPeriod;
    uint256 voucherPeriodDuration;
    uint256 defaultVoucherExpiry;
    uint256 voucherNonce;
}

library AppTreasuryStorage {
    // keccak256(abi.encode(uint256(keccak256("spaces.facets.account.treasury.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0x4b2685ebf0fe051af288218f3c238e3f9acdf8b8aa583b51afc79fe75d0cc100;

    // keccak256(abi.encode(uint256(keccak256("spaces.facets.account.treasury.voucher.v1")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant VOUCHER_VERSION =
        0x1a27cdc41c2498e7a82efda1ce87112e6eb47e087800bc820041c9d352a48600;

    struct Layout {
        mapping(address currency => CircuitBreaker) circuitBreakers;
        mapping(address app => mapping(address currency => StreamConfig)) streams;
        mapping(bytes32 => Voucher) vouchers;
        mapping(bytes32 => VoucherConfig) voucherConfig;
    }

    function getLayout() internal pure returns (Layout storage $) {
        assembly {
            $.slot := STORAGE_SLOT
        }
    }

    function voucherConfig() internal view returns (VoucherConfig storage $) {
        return getLayout().voucherConfig[VOUCHER_VERSION];
    }
}
