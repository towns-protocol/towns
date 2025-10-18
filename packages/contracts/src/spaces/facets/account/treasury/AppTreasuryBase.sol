// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IAppTreasuryBase} from "./IAppTreasury.sol";

// libraries
import {AppTreasuryStorage} from "./AppTreasuryStorage.sol";
import {CustomRevert} from "src/utils/libraries/CustomRevert.sol";
import {CurrencyTransfer} from "src/utils/libraries/CurrencyTransfer.sol";
import {ExecutorStorage} from "../../executor/ExecutorStorage.sol";

abstract contract AppTreasuryBase is IAppTreasuryBase {
    using CustomRevert for bytes4;

    uint256 private constant DEFAULT_VOUCHER_EXPIRY = 24 hours;
    uint256 private constant DEFAULT_VOUCHER_PERIOD = 1 hours;
    uint256 private constant DEFAULT_MAX_VOUCHERS = 10;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Requests                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _requestFunds(address currency, uint256 amount) internal returns (bytes32 voucherId) {
        if (currency == address(0)) currency = CurrencyTransfer.NATIVE_TOKEN;

        uint256 streamBalance = _getStreamBalance(msg.sender, currency);

        if (streamBalance >= amount) {
            _withdrawFromStream(msg.sender, currency, amount);
            _updateCircuitBreaker(currency, amount);
            return bytes32(0); // No voucher needed
        }

        // Create voucher for the full amount
        voucherId = _createVoucher(msg.sender, currency, amount);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Streams                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _withdrawFromStream(address app, address currency, uint256 amount) internal {
        AppTreasuryStorage.Layout storage $ = AppTreasuryStorage.getLayout();
        AppTreasuryStorage.StreamConfig storage stream = $.streams[app][currency];

        if (!stream.active) AppTreasury__StreamNotActive.selector.revertWith();

        uint256 available = _calculateStreamBalance(stream);
        if (available < amount) AppTreasury__InsufficientStreamBalance.selector.revertWith();

        stream.balance = available - amount;
        stream.lastWithdrawal = block.timestamp;

        CurrencyTransfer.transferCurrency(currency, address(this), app, amount);

        emit StreamWithdrawal(app, currency, amount);
    }

    function _configureStream(address app, address currency, uint256 flowRate) internal {
        if (flowRate == 0) AppTreasury__InvalidFlowRate.selector.revertWith();

        AppTreasuryStorage.Layout storage $ = AppTreasuryStorage.getLayout();
        AppTreasuryStorage.StreamConfig storage stream = $.streams[app][currency];

        if (stream.active) stream.balance = _calculateStreamBalance(stream);

        stream.flowRatePerSecond = flowRate;
        stream.lastWithdrawal = block.timestamp;
        stream.active = true;

        emit StreamConfigured(app, currency, flowRate);
    }

    function _getStreamBalance(address app, address currency) internal view returns (uint256) {
        AppTreasuryStorage.StreamConfig memory stream = AppTreasuryStorage.getLayout().streams[app][
            currency
        ];

        if (!stream.active) return 0;
        return _calculateStreamBalance(stream);
    }

    function _pauseStream(address app, address currency) internal {
        AppTreasuryStorage.Layout storage $ = AppTreasuryStorage.getLayout();
        AppTreasuryStorage.StreamConfig storage stream = $.streams[app][currency];

        if (stream.active) {
            // Accumulate balance before pausing
            stream.balance = _calculateStreamBalance(stream);
            stream.active = false;
            stream.lastWithdrawal = block.timestamp;
        }
    }

    function _resumeStream(address app, address currency) internal {
        AppTreasuryStorage.Layout storage $ = AppTreasuryStorage.getLayout();
        AppTreasuryStorage.StreamConfig storage stream = $.streams[app][currency];

        if (stream.flowRatePerSecond > 0) {
            stream.active = true;
            stream.lastWithdrawal = block.timestamp;
            emit StreamConfigured(app, currency, stream.flowRatePerSecond);
        }
    }

    function _calculateStreamBalance(
        AppTreasuryStorage.StreamConfig memory stream
    ) internal view returns (uint256) {
        if (!stream.active) return stream.balance;

        uint256 elapsed = block.timestamp - stream.lastWithdrawal;
        uint256 accumulated = elapsed * stream.flowRatePerSecond;

        return stream.balance + accumulated;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      Circuit Breaker                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    function _configureCircuitBreaker(
        address currency,
        uint256 limit,
        uint256 window,
        uint256 cooldown
    ) internal {
        AppTreasuryStorage.Layout storage $ = AppTreasuryStorage.getLayout();
        $.circuitBreakers[currency] = AppTreasuryStorage.CircuitBreaker({
            limit: limit,
            windowInSeconds: window,
            windowStart: block.timestamp,
            withdrawn: 0,
            cooldown: cooldown,
            pausedUntil: 0
        });

        emit CircuitBreakerConfigured(currency, limit, window, cooldown);
    }

    function _updateCircuitBreaker(address currency, uint256 amount) internal {
        AppTreasuryStorage.Layout storage $ = AppTreasuryStorage.getLayout();
        AppTreasuryStorage.CircuitBreaker storage breaker = $.circuitBreakers[currency];

        if (breaker.limit == 0) return; // Not configured

        // Reset window if needed
        if (block.timestamp >= breaker.windowStart + breaker.windowInSeconds) {
            breaker.windowStart = block.timestamp;
            breaker.withdrawn = 0;
        }

        breaker.withdrawn += amount;

        // Trip if over limit
        if (breaker.withdrawn > breaker.limit) {
            breaker.pausedUntil = block.timestamp + breaker.cooldown;
            emit CircuitBreakerTripped(currency, breaker.pausedUntil);
            AppTreasury__ExceedsCircuitBreakerLimit.selector.revertWith();
        }
    }

    function _resetCircuitBreaker(address currency) internal {
        AppTreasuryStorage.Layout storage $ = AppTreasuryStorage.getLayout();
        AppTreasuryStorage.CircuitBreaker storage breaker = $.circuitBreakers[currency];

        breaker.pausedUntil = 0;
        breaker.withdrawn = 0;
        breaker.windowStart = block.timestamp;

        emit CircuitBreakerReset(currency);
    }

    function _isCircuitBreakerTripped(address currency) internal view returns (bool) {
        AppTreasuryStorage.CircuitBreaker memory breaker = AppTreasuryStorage
            .getLayout()
            .circuitBreakers[currency];

        return breaker.pausedUntil > block.timestamp;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          Vouchers                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    function _createVoucher(
        address app,
        address currency,
        uint256 amount
    ) internal returns (bytes32 voucherId) {
        AppTreasuryStorage.VoucherConfig storage $v = AppTreasuryStorage.voucherConfig();

        // Check rate limits
        if (_needsNewVoucherPeriod(app, $v)) {
            $v.lastVoucherPeriod[app] = block.timestamp;
            $v.vouchersCreatedThisPeriod[app] = 0;
        }

        uint256 maxVouchers = $v.maxVouchersPerPeriod == 0
            ? DEFAULT_MAX_VOUCHERS
            : $v.maxVouchersPerPeriod;

        if ($v.vouchersCreatedThisPeriod[app] >= maxVouchers) {
            AppTreasury__VoucherLimitExceeded.selector.revertWith();
        }

        // Generate unique ID
        voucherId = keccak256(
            abi.encodePacked(block.timestamp, app, currency, amount, $v.voucherNonce++)
        );

        uint256 expiry = $v.defaultVoucherExpiry == 0
            ? DEFAULT_VOUCHER_EXPIRY
            : $v.defaultVoucherExpiry;

        AppTreasuryStorage.Voucher storage voucher = AppTreasuryStorage.getLayout().vouchers[
            voucherId
        ];

        voucher.app = app;
        voucher.currency = currency;
        voucher.amount = amount;
        voucher.createdAt = block.timestamp;
        voucher.expiresAt = block.timestamp + expiry;
        voucher.status = AppTreasuryStorage.VoucherStatus.Pending;
        voucher.executionId = ExecutorStorage.getExecutionId();

        $v.vouchersCreatedThisPeriod[app]++;

        emit VoucherCreated(voucherId, app, amount);
    }

    function _approveVoucher(bytes32 voucherId) internal {
        AppTreasuryStorage.Layout storage $ = AppTreasuryStorage.getLayout();
        AppTreasuryStorage.Voucher storage voucher = $.vouchers[voucherId];

        if (voucher.status != AppTreasuryStorage.VoucherStatus.Pending) {
            AppTreasury__InvalidVoucher.selector.revertWith();
        }

        if (block.timestamp > voucher.expiresAt) {
            voucher.status = AppTreasuryStorage.VoucherStatus.Expired;
            AppTreasury__VoucherExpired.selector.revertWith();
        }

        voucher.status = AppTreasuryStorage.VoucherStatus.Approved;
        emit VoucherApproved(voucherId, msg.sender);
    }

    function _claimVoucher(bytes32 voucherId) internal {
        AppTreasuryStorage.Layout storage $ = AppTreasuryStorage.getLayout();
        AppTreasuryStorage.Voucher storage voucher = $.vouchers[voucherId];

        if (_isCircuitBreakerTripped(voucher.currency))
            AppTreasury__TreasuryPaused.selector.revertWith();
        if (voucher.app != msg.sender) AppTreasury__UnauthorizedClaim.selector.revertWith();
        if (voucher.status != AppTreasuryStorage.VoucherStatus.Approved)
            AppTreasury__InvalidVoucher.selector.revertWith();
        if (block.timestamp > voucher.expiresAt) {
            voucher.status = AppTreasuryStorage.VoucherStatus.Expired;
            AppTreasury__VoucherExpired.selector.revertWith();
        }

        voucher.status = AppTreasuryStorage.VoucherStatus.Claimed;

        _updateCircuitBreaker(voucher.currency, voucher.amount);

        CurrencyTransfer.transferCurrency(
            voucher.currency,
            address(this),
            voucher.app,
            voucher.amount
        );

        emit VoucherClaimed(voucherId, voucher.app, voucher.amount);
    }

    function _cancelVoucher(bytes32 voucherId) internal {
        AppTreasuryStorage.Layout storage $ = AppTreasuryStorage.getLayout();
        AppTreasuryStorage.Voucher storage voucher = $.vouchers[voucherId];

        if (
            voucher.status == AppTreasuryStorage.VoucherStatus.Pending ||
            voucher.status == AppTreasuryStorage.VoucherStatus.Approved
        ) {
            voucher.status = AppTreasuryStorage.VoucherStatus.Cancelled;
            emit VoucherCancelled(voucherId, voucher.app, voucher.amount);
        } else {
            AppTreasury__InvalidVoucher.selector.revertWith();
        }
    }

    function _needsNewVoucherPeriod(
        address app,
        AppTreasuryStorage.VoucherConfig storage $
    ) internal view returns (bool) {
        uint256 periodDuration = $.voucherPeriodDuration == 0
            ? DEFAULT_VOUCHER_PERIOD
            : $.voucherPeriodDuration;

        return block.timestamp >= $.lastVoucherPeriod[app] + periodDuration;
    }
}
