// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ITransferControlBase, SpendingLimits} from "./ITransferControl.sol";
import {CurrencyTransfer} from "../../../../utils/libraries/CurrencyTransfer.sol";

// libraries
import {TransferControlStorage} from "./TransferControlStorage.sol";
import {CustomRevert} from "../../../../utils/libraries/CustomRevert.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {TransferControlBase} from "./TransferControlBase.sol";
import {TokenOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/token/TokenOwnableBase.sol";

/**
 * @title TransferControlFacet
 * @notice Management interface for transfer control settings
 * @dev Allows space owners to configure spending limits and supported tokens
 */
contract TransferControlFacet is
    ITransferControlBase,
    TransferControlBase,
    TokenOwnableBase,
    Facet
{
    using CustomRevert for bytes4;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       GLOBAL SETTINGS                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Enable or disable transfer control system
    /// @param enabled Whether transfer control should be enabled
    function setTransferControlEnabled(bool enabled) external onlyOwner {
        TransferControlStorage.getLayout().transferControlEnabled = enabled;
        emit TransferControlEnabledSet(enabled);
    }

    /// @notice Check if transfer control is enabled
    /// @return enabled Whether transfer control is enabled
    function isTransferControlEnabled() external view returns (bool enabled) {
        return TransferControlStorage.getLayout().transferControlEnabled;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       TOKEN MANAGEMENT                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Add a supported token with default limits
    /// @param token Token address (NATIVE_TOKEN for ETH)
    /// @param defaultLimits Default spending limits for this token
    function addSupportedToken(
        address token,
        SpendingLimits calldata defaultLimits
    ) external onlyOwner {
        _validateLimits(defaultLimits);

        TransferControlStorage.Layout storage $ = TransferControlStorage.getLayout();

        // Normalize token address
        address normalizedToken = token == address(0) ? CurrencyTransfer.NATIVE_TOKEN : token;

        $.allowedTokens[normalizedToken] = true;
        $.limitsByToken[normalizedToken] = defaultLimits;

        emit SupportedTokenAdded(normalizedToken, defaultLimits);
    }

    /// @notice Remove a supported token
    /// @param token Token address to remove
    function removeSupportedToken(address token) external onlyOwner {
        TransferControlStorage.Layout storage $ = TransferControlStorage.getLayout();

        address normalizedToken = token == address(0) ? CurrencyTransfer.NATIVE_TOKEN : token;

        $.allowedTokens[normalizedToken] = false;
        delete $.limitsByToken[normalizedToken];

        emit SupportedTokenRemoved(normalizedToken);
    }

    /// @notice Update default limits for a supported token
    /// @param token Token address
    /// @param defaultLimits New default limits
    function setDefaultTokenLimits(
        address token,
        SpendingLimits calldata defaultLimits
    ) external onlyOwner {
        _validateLimits(defaultLimits);

        TransferControlStorage.Layout storage $ = TransferControlStorage.getLayout();
        address normalizedToken = token == address(0) ? CurrencyTransfer.NATIVE_TOKEN : token;

        if (!$.allowedTokens[normalizedToken]) {
            UnsupportedToken.selector.revertWith(normalizedToken);
        }

        $.limitsByToken[normalizedToken] = defaultLimits;
        emit DefaultTokenLimitsSet(normalizedToken, defaultLimits);
    }

    /// @notice Check if a token is supported
    /// @param token Token address to check
    /// @return supported Whether the token is supported
    function isSupportedToken(address token) external view returns (bool supported) {
        address normalizedToken = token == address(0) ? CurrencyTransfer.NATIVE_TOKEN : token;
        return TransferControlStorage.getLayout().allowedTokens[normalizedToken];
    }

    /// @notice Get default limits for a token
    /// @param token Token address
    /// @return limits Default spending limits for the token
    function getDefaultTokenLimits(
        address token
    ) external view returns (SpendingLimits memory limits) {
        address normalizedToken = token == address(0) ? CurrencyTransfer.NATIVE_TOKEN : token;
        return TransferControlStorage.getLayout().limitsByToken[normalizedToken];
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       APP LIMITS MANAGEMENT                */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Set custom spending limits for an app on a specific token
    /// @param app App address
    /// @param token Token address
    /// @param limits Custom spending limits
    function setAppTokenLimits(
        address app,
        address token,
        SpendingLimits calldata limits
    ) external onlyOwner {
        _validateLimits(limits);

        TransferControlStorage.Layout storage $ = TransferControlStorage.getLayout();
        address normalizedToken = token == address(0) ? CurrencyTransfer.NATIVE_TOKEN : token;

        if (!$.allowedTokens[normalizedToken]) {
            UnsupportedToken.selector.revertWith(normalizedToken);
        }

        $.limitsByApp[app][normalizedToken] = limits;
        emit AppTokenLimitsSet(app, normalizedToken, limits);
    }

    /// @notice Set custom spending limits for an app across multiple tokens
    /// @param app App address
    /// @param tokens Array of token addresses
    /// @param limits Array of spending limits (must match tokens length)
    function setAppTokenLimitsBatch(
        address app,
        address[] calldata tokens,
        SpendingLimits[] calldata limits
    ) external onlyOwner {
        if (tokens.length != limits.length) {
            InvalidArrayLength.selector.revertWith();
        }

        for (uint256 i; i < tokens.length; ++i) {
            _validateLimits(limits[i]);

            address normalizedToken = tokens[i] == address(0)
                ? CurrencyTransfer.NATIVE_TOKEN
                : tokens[i];

            TransferControlStorage.Layout storage $ = TransferControlStorage.getLayout();
            if (!$.allowedTokens[normalizedToken]) {
                UnsupportedToken.selector.revertWith(normalizedToken);
            }

            $.limitsByApp[app][normalizedToken] = limits[i];
            emit AppTokenLimitsSet(app, normalizedToken, limits[i]);
        }
    }

    /// @notice Remove custom limits for an app on a token (falls back to defaults)
    /// @param app App address
    /// @param token Token address
    function removeAppTokenLimits(address app, address token) external onlyOwner {
        address normalizedToken = token == address(0) ? CurrencyTransfer.NATIVE_TOKEN : token;
        delete TransferControlStorage.getLayout().limitsByApp[app][normalizedToken];
        emit AppTokenLimitsRemoved(app, normalizedToken);
    }

    /// @notice Get effective spending limits for an app on a token
    /// @param app App address
    /// @param token Token address
    /// @return limits Effective spending limits (custom or default)
    function getAppTokenLimits(
        address app,
        address token
    ) external view returns (SpendingLimits memory limits) {
        TransferControlStorage.Layout storage $ = TransferControlStorage.getLayout();
        address normalizedToken = token == address(0) ? CurrencyTransfer.NATIVE_TOKEN : token;

        SpendingLimits memory appLimits = $.limitsByApp[app][normalizedToken];

        // If app has custom limits
        if (appLimits.enabled || appLimits.maxPerTransaction > 0) {
            return appLimits;
        }

        // Return default limits
        return $.limitsByToken[normalizedToken];
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       SPENDING STATUS                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Get current spending status for an app on a token
    /// @param app App address
    /// @param token Token address
    /// @return limits Current effective limits
    /// @return spentInPeriod Amount spent in current period
    /// @return periodStart When current period started
    /// @return remainingInPeriod Amount remaining in period
    /// @return periodEnd When current period ends
    function getAppSpendingStatus(
        address app,
        address token
    )
        external
        view
        returns (
            SpendingLimits memory limits,
            uint256 spentInPeriod,
            uint48 periodStart,
            uint256 remainingInPeriod,
            uint48 periodEnd
        )
    {
        TransferControlStorage.Layout storage $ = TransferControlStorage.getLayout();
        address normalizedToken = token == address(0) ? CurrencyTransfer.NATIVE_TOKEN : token;

        // Get effective limits
        SpendingLimits memory appLimits = $.limitsByApp[app][normalizedToken];
        if (appLimits.enabled || appLimits.maxPerTransaction > 0) {
            limits = appLimits;
        } else {
            limits = $.limitsByToken[normalizedToken];
        }

        // Get current spending tracker
        SpendingLimits memory tracker = $.limitsByApp[app][normalizedToken];
        spentInPeriod = tracker.spentInPeriod;
        periodStart = tracker.periodStart;

        // Calculate remaining and period end
        if (spentInPeriod <= limits.maxPerPeriod) {
            remainingInPeriod = limits.maxPerPeriod - spentInPeriod;
        } else {
            remainingInPeriod = 0;
        }

        if (periodStart > 0) {
            periodEnd = periodStart + limits.resetPeriod;
        } else {
            periodEnd = uint48(block.timestamp) + limits.resetPeriod;
        }
    }

    /// @notice Reset spending period for an app on a token (emergency function)
    /// @param app App address
    /// @param token Token address
    function resetAppSpendingPeriod(address app, address token) external onlyOwner {
        address normalizedToken = token == address(0) ? CurrencyTransfer.NATIVE_TOKEN : token;

        TransferControlStorage.Layout storage $ = TransferControlStorage.getLayout();
        SpendingLimits storage tracker = $.limitsByApp[app][normalizedToken];

        tracker.spentInPeriod = 0;
        tracker.periodStart = uint48(block.timestamp);

        emit SpendingPeriodReset(app, normalizedToken, uint48(block.timestamp));
    }
}
