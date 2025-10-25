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
    /*                    INTERNAL CALCULATIONS                   */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Calculates base fee before hook processing
    /// @param config Fee configuration
    /// @param amount Base amount for percentage calculations
    /// @return baseFee The calculated base fee
    function _calculateBaseFee(
        FeeConfig storage config,
        uint256 amount
    ) internal view returns (uint256 baseFee) {
        if (config.method == FeeCalculationMethod.FIXED) {
            return config.fixedFee;
        } else if (config.method == FeeCalculationMethod.PERCENT) {
            return BasisPoints.calculate(amount, config.bps);
        } else if (config.method == FeeCalculationMethod.HYBRID) {
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
        address hook = $.feeHooks[feeType];
        if (hook != address(0)) {
            try IFeeHook(hook).calculateFee(feeType, user, baseFee, extraData) returns (
                FeeHookResult memory result
            ) {
                if (!result.shouldCharge) return 0;
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
        FeeManagerStorage.Layout storage $ = FeeManagerStorage.getLayout();
        FeeConfig storage config = $.feeConfigs[feeType];

        // Check if fee is configured and enabled
        if (!config.enabled) return 0;

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
                : $.protocolFeeRecipient;

            if (recipient == address(0)) FeeManager__InvalidRecipient.selector.revertWith();

            // Transfer currency
            if (currency == address(0)) {
                // Native token transfer
                CurrencyTransfer.transferCurrency(
                    CurrencyTransfer.NATIVE_TOKEN,
                    msg.sender,
                    recipient,
                    finalFee
                );
            } else {
                // ERC20 transfer from msg.sender to recipient
                CurrencyTransfer.transferCurrency(currency, msg.sender, recipient, finalFee);
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
        if (recipient == address(0)) FeeManager__InvalidRecipient.selector.revertWith();
        if (method > FeeCalculationMethod.HYBRID) FeeManager__InvalidMethod.selector.revertWith();
        if (bps > BasisPoints.MAX_BPS) FeeManager__InvalidBps.selector.revertWith();

        FeeManagerStorage.Layout storage $ = FeeManagerStorage.getLayout();

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
        FeeManagerStorage.Layout storage $ = FeeManagerStorage.getLayout();
        $.feeHooks[feeType] = hook;
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

    /// @notice Returns fee configuration
    /// @param feeType The fee type identifier
    /// @return config The fee configuration
    function _getFeeConfig(bytes32 feeType) internal view returns (FeeConfig memory config) {
        return FeeManagerStorage.getLayout().feeConfigs[feeType];
    }

    /// @notice Returns fee hook address
    /// @param feeType The fee type identifier
    /// @return hook The hook contract address
    function _getFeeHook(bytes32 feeType) internal view returns (address hook) {
        return FeeManagerStorage.getLayout().feeHooks[feeType];
    }

    /// @notice Returns protocol fee recipient
    /// @return recipient The protocol fee recipient address
    function _getProtocolFeeRecipient() internal view returns (address recipient) {
        return FeeManagerStorage.getLayout().protocolFeeRecipient;
    }
}
