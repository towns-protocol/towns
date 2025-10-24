// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {FeeCalculationMethod, FeeConfig, FeeManagerStorage} from "./FeeManagerStorage.sol";
import {IFeeHook, FeeHookResult} from "./IFeeHook.sol";
import {IFeeManagerBase} from "./IFeeManager.sol";
import {BasisPoints} from "src/utils/libraries/BasisPoints.sol";
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";

/// @title FeeManagerBase
/// @notice Base contract with internal fee management logic
abstract contract FeeManagerBase is IFeeManagerBase {
    using FeeManagerStorage for FeeManagerStorage.Layout;

    uint16 internal constant MAX_BPS = 10_000;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    INTERNAL CALCULATIONS                   */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Calculates base fee before hook processing
    /// @param config Fee configuration
    /// @param amount Base amount for percentage calculations
    /// @return baseFee The calculated base fee
    function _calculateBaseFee(
        FeeConfig memory config,
        uint256 amount
    ) internal pure returns (uint256 baseFee) {
        if (config.method == FeeCalculationMethod.FIXED) {
            return config.fixedFee;
        } else if (config.method == FeeCalculationMethod.PERCENT) {
            return BasisPoints.calculate(amount, config.bps);
        } else if (config.method == FeeCalculationMethod.HYBRID) {
            uint256 percentFee = BasisPoints.calculate(amount, config.bps);
            return percentFee > config.fixedFee ? percentFee : config.fixedFee;
        }
        return 0;
    }

    /// @notice Calculates fee for estimation (view function)
    /// @dev Does not modify state, calls hook's calculateFee if configured
    /// @param feeType The type of fee to calculate
    /// @param user The address that would be charged
    /// @param amount The base amount for percentage calculations
    /// @param context Additional context passed to hooks
    /// @return finalFee The calculated fee amount
    function _calculateFee(
        bytes32 feeType,
        address user,
        uint256 amount,
        bytes calldata context
    ) internal view returns (uint256 finalFee) {
        FeeManagerStorage.Layout storage $ = FeeManagerStorage.layout();
        FeeConfig memory config = $.feeConfigs[feeType];

        // Check if fee is configured and enabled
        if (!config.enabled) {
            return 0;
        }

        // Calculate base fee
        uint256 baseFee = _calculateBaseFee(config, amount);

        // Apply hook if configured
        address hook = $.feeHooks[feeType];
        if (hook != address(0)) {
            try IFeeHook(hook).calculateFee(feeType, user, baseFee, context) returns (
                FeeHookResult memory result
            ) {
                if (!result.shouldCharge) {
                    return 0;
                }
                return result.finalFee;
            } catch {
                // If hook fails, fall back to base fee
                return baseFee;
            }
        }

        return baseFee;
    }

    /// @notice Charges fee and transfers it (state-changing)
    /// @dev Calls hook's onChargeFee if configured, then transfers currency
    /// @dev Note: `user` is metadata for hooks/events. Actual payment comes from msg.sender.
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
        bytes calldata context
    ) internal virtual returns (uint256 finalFee) {
        FeeManagerStorage.Layout storage $ = FeeManagerStorage.layout();
        FeeConfig memory config = $.feeConfigs[feeType];

        // Check if fee is configured and enabled
        if (!config.enabled) {
            return 0;
        }

        // Calculate base fee
        uint256 baseFee = _calculateBaseFee(config, amount);

        // Apply hook if configured
        address hook = $.feeHooks[feeType];
        bool shouldCharge = true;

        if (hook != address(0)) {
            FeeHookResult memory result = IFeeHook(hook).onChargeFee(
                feeType,
                user,
                baseFee,
                context
            );

            shouldCharge = result.shouldCharge;
            finalFee = result.finalFee;
        } else {
            finalFee = baseFee;
        }

        // Transfer fee if applicable
        if (shouldCharge && finalFee > 0) {
            address recipient = config.recipient != address(0)
                ? config.recipient
                : $.globalFeeRecipient;

            if (recipient == address(0)) revert FeeManager__InvalidRecipient();

            // Transfer currency
            if (currency == address(0)) {
                // Native token transfer
                SafeTransferLib.safeTransferETH(recipient, finalFee);
            } else {
                // ERC20 transfer from msg.sender to recipient
                SafeTransferLib.safeTransferFrom(currency, msg.sender, recipient, finalFee);
            }

            emit FeeCharged(feeType, user, finalFee, recipient, currency);
        } else {
            finalFee = 0;
        }

        return finalFee;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   INTERNAL CONFIGURATION                   */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Sets fee configuration
    /// @param feeType The fee type identifier
    /// @param recipient Fee recipient (uses global if zero address)
    /// @param method Calculation method
    /// @param bps Basis points (1-10000)
    /// @param fixedFee Fixed fee amount
    /// @param enabled Whether the fee is active
    function _setFeeConfig(
        bytes32 feeType,
        address recipient,
        FeeCalculationMethod method,
        uint16 bps,
        uint160 fixedFee,
        bool enabled
    ) internal {
        if (bps > MAX_BPS) revert FeeManager__InvalidBps();

        FeeManagerStorage.Layout storage $ = FeeManagerStorage.layout();

        $.feeConfigs[feeType] = FeeConfig({
            recipient: recipient,
            lastUpdated: uint48(block.timestamp),
            bps: bps,
            method: method,
            enabled: enabled,
            fixedFee: fixedFee
        });

        emit FeeConfigured(feeType, recipient, method, bps, fixedFee, enabled);
    }

    /// @notice Sets fee hook
    /// @param feeType The fee type identifier
    /// @param hook Address of the hook contract (zero to remove)
    function _setFeeHook(bytes32 feeType, address hook) internal {
        FeeManagerStorage.Layout storage $ = FeeManagerStorage.layout();
        $.feeHooks[feeType] = hook;
        emit FeeHookSet(feeType, hook);
    }

    /// @notice Sets global fee recipient
    /// @param recipient New global fee recipient
    function _setGlobalFeeRecipient(address recipient) internal {
        if (recipient == address(0)) revert FeeManager__InvalidRecipient();
        FeeManagerStorage.Layout storage $ = FeeManagerStorage.layout();
        $.globalFeeRecipient = recipient;
        emit GlobalFeeRecipientSet(recipient);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                     INTERNAL GETTERS                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Returns fee configuration
    /// @param feeType The fee type identifier
    /// @return config The fee configuration
    function _getFeeConfig(bytes32 feeType) internal view returns (FeeConfig memory config) {
        return FeeManagerStorage.layout().feeConfigs[feeType];
    }

    /// @notice Returns fee hook address
    /// @param feeType The fee type identifier
    /// @return hook The hook contract address
    function _getFeeHook(bytes32 feeType) internal view returns (address hook) {
        return FeeManagerStorage.layout().feeHooks[feeType];
    }

    /// @notice Returns global fee recipient
    /// @return recipient The global fee recipient address
    function _getGlobalFeeRecipient() internal view returns (address recipient) {
        return FeeManagerStorage.layout().globalFeeRecipient;
    }
}
