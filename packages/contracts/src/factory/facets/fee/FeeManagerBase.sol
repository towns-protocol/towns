// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IFeeHook, FeeHookResult} from "./IFeeHook.sol";
import {IFeeManagerBase} from "./IFeeManager.sol";

// libraries
import {BasisPoints} from "src/utils/libraries/BasisPoints.sol";
import {CurrencyTransfer} from "src/utils/libraries/CurrencyTransfer.sol";
import {CustomRevert} from "src/utils/libraries/CustomRevert.sol";
import {FeeCalculationMethod, FeeConfig, FeeManagerStorage} from "./FeeManagerStorage.sol";
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";

/// @title FeeManagerBase
/// @notice Base contract with internal fee management logic
abstract contract FeeManagerBase is IFeeManagerBase {
    using CustomRevert for bytes4;
    using FeeManagerStorage for FeeManagerStorage.Layout;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    INTERNAL STATE-CHANGING                 */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Charges fee and transfers it (state-changing)
    /// @dev Calls hook's onChargeFee if configured, then transfers currency
    /// @dev Note: `user` is metadata for hooks/events. Actual payment comes from msg.sender.
    /// @dev Hook failures fall back to base fee (consistent with calculateFee behavior)
    /// @param feeType The type of fee to charge
    /// @param user The address for whom the fee is being charged (for hooks/events)
    /// @param amount The base amount for percentage calculations
    /// @param currency The currency contract (address(0) for native token)
    /// @param context Additional context passed to hooks
    /// @return finalFee The actual fee charged
    function _chargeFee(
        bytes32 feeType,
        address user,
        uint256 amount,
        address currency,
        uint256 maxFee,
        bytes calldata context
    ) internal virtual returns (uint256 finalFee) {
        FeeManagerStorage.Layout storage $ = FeeManagerStorage.getLayout();
        FeeConfig storage config = _getFeeConfig(feeType);

        // Check if fee is configured and enabled
        if (!config.enabled) return 0;

        // Calculate base fee
        uint256 baseFee = _calculateBaseFee(config, amount);

        // Apply hook if configured, with fallback to base fee on failure
        address hook = config.hook;
        if (hook != address(0)) {
            try IFeeHook(hook).onChargeFee(feeType, user, baseFee, context) returns (
                FeeHookResult memory result
            ) {
                finalFee = result.finalFee;
            } catch {
                // If hook fails, fall back to base fee (consistent with calculateFee)
                finalFee = baseFee;
            }
        } else {
            finalFee = baseFee;
        }

        // Enforce slippage protection
        if (finalFee > maxFee) FeeManager__ExceedsMaxFee.selector.revertWith();

        // Determine recipient (fallback to protocol recipient if not set)
        address recipient = config.recipient;
        if (recipient == address(0)) recipient = $.protocolFeeRecipient;

        // Emit event before external calls (checks-effects-interactions pattern)
        if (finalFee > 0) {
            emit FeeCharged(feeType, user, currency, finalFee, recipient);
        }

        // Transfer fee and/or refund excess if maxFee > 0
        if (maxFee > 0) {
            // Convert address(0) to NATIVE_TOKEN for CurrencyTransfer library
            address feeCurrency = currency == address(0) ? CurrencyTransfer.NATIVE_TOKEN : currency;

            // For native token, validate msg.value matches maxFee
            if (feeCurrency == CurrencyTransfer.NATIVE_TOKEN && msg.value != maxFee) {
                CurrencyTransfer.MsgValueMismatch.selector.revertWith();
            }

            CurrencyTransfer.transferFeeWithRefund(
                feeCurrency,
                msg.sender,
                recipient,
                finalFee,
                maxFee
            );
        }
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   INTERNAL CONFIGURATION                   */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Sets fee configuration
    /// @param feeType The fee type identifier
    /// @param recipient Fee recipient (zero address = use protocol fee recipient)
    /// @param method Calculation method
    /// @param bps Basis points (1-10000)
    /// @param fixedFee Fixed fee amount
    /// @param enabled Whether the fee is active
    function _setFeeConfig(
        bytes32 feeType,
        address recipient,
        FeeCalculationMethod method,
        uint16 bps,
        uint128 fixedFee,
        bool enabled
    ) internal {
        // Allow zero address recipient to fallback to protocol fee recipient
        // Validation that protocol fee recipient is set happens at initialization
        if (bps > BasisPoints.MAX_BPS) FeeManager__InvalidBps.selector.revertWith();

        FeeConfig storage config = _getFeeConfig(feeType);
        config.recipient = recipient;
        config.lastUpdated = uint48(block.timestamp);
        config.bps = bps;
        config.method = method;
        config.enabled = enabled;
        config.fixedFee = fixedFee;

        emit FeeConfigured(feeType, recipient, method, bps, fixedFee, enabled);
    }

    /// @notice Sets fee hook
    /// @param feeType The fee type identifier
    /// @param hook Address of the hook contract (zero to remove)
    function _setFeeHook(bytes32 feeType, address hook) internal {
        FeeConfig storage config = _getFeeConfig(feeType);
        config.hook = hook;
        emit FeeHookSet(feeType, hook);
    }

    /// @notice Sets protocol fee recipient
    /// @param recipient New protocol fee recipient
    function _setProtocolFeeRecipient(address recipient) internal {
        if (recipient == address(0)) FeeManager__InvalidRecipient.selector.revertWith();
        FeeManagerStorage.Layout storage $ = FeeManagerStorage.getLayout();
        $.protocolFeeRecipient = recipient;
        emit ProtocolFeeRecipientSet(recipient);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                     INTERNAL GETTERS                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Calculates base fee before hook processing
    /// @param config Fee configuration
    /// @param amount Base amount for percentage calculations
    /// @return baseFee The calculated base fee
    function _calculateBaseFee(
        FeeConfig storage config,
        uint256 amount
    ) internal view returns (uint256 baseFee) {
        FeeCalculationMethod method = config.method;
        if (method == FeeCalculationMethod.FIXED) {
            return config.fixedFee;
        } else if (method == FeeCalculationMethod.PERCENT) {
            return BasisPoints.calculate(amount, config.bps);
        } else if (method == FeeCalculationMethod.HYBRID) {
            uint256 percentFee = BasisPoints.calculate(amount, config.bps);
            return FixedPointMathLib.max(percentFee, config.fixedFee);
        }
        return 0;
    }

    /// @notice Calculates fee for estimation (view function)
    /// @dev Does not modify state, calls hook's calculateFee if configured
    /// @param feeType The type of fee to calculate
    /// @param user The address that would be charged
    /// @param amount The base amount for percentage calculations
    /// @param extraData Additional data passed to hooks
    /// @return finalFee The calculated fee amount
    function _calculateFee(
        bytes32 feeType,
        address user,
        uint256 amount,
        bytes calldata extraData
    ) internal view returns (uint256 finalFee) {
        FeeManagerStorage.Layout storage $ = FeeManagerStorage.getLayout();
        FeeConfig storage config = $.feeConfigs[feeType];

        // Check if fee is configured and enabled
        if (!config.enabled) return 0;

        // Calculate base fee
        uint256 baseFee = _calculateBaseFee(config, amount);

        // Apply hook if configured
        address hook = config.hook;
        if (hook != address(0)) {
            try IFeeHook(hook).calculateFee(feeType, user, baseFee, extraData) returns (
                FeeHookResult memory result
            ) {
                return result.finalFee;
            } catch {
                // If hook fails, fall back to base fee
                return baseFee;
            }
        }

        return baseFee;
    }

    /// @notice Returns fee configuration
    /// @param feeType The fee type identifier
    /// @return config The fee configuration
    function _getFeeConfig(bytes32 feeType) internal view returns (FeeConfig storage config) {
        return FeeManagerStorage.getLayout().feeConfigs[feeType];
    }

    /// @notice Returns fee hook address
    /// @param feeType The fee type identifier
    /// @return hook The hook contract address
    function _getFeeHook(bytes32 feeType) internal view returns (address hook) {
        FeeConfig storage config = _getFeeConfig(feeType);
        return config.hook;
    }

    /// @notice Returns protocol fee recipient
    /// @return recipient The protocol fee recipient address
    function _getProtocolFeeRecipient() internal view returns (address recipient) {
        return FeeManagerStorage.getLayout().protocolFeeRecipient;
    }
}
