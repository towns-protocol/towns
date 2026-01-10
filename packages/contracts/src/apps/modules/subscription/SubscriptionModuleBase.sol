// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IModularAccount, Call} from "@erc6900/reference-implementation/interfaces/IModularAccount.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IMembership} from "../../../spaces/facets/membership/IMembership.sol";
import {IBanning} from "../../../spaces/facets/banning/IBanning.sol";
import {ISubscriptionModule, ISubscriptionModuleBase} from "./ISubscriptionModule.sol";

// libraries
import {ValidationLocatorLib} from "modular-account/src/libraries/ValidationLocatorLib.sol";
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";
import {LibCall} from "solady/utils/LibCall.sol";
import {SafeCastLib} from "solady/utils/SafeCastLib.sol";
import {CurrencyTransfer} from "../../../utils/libraries/CurrencyTransfer.sol";
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";
import {Validator} from "../../../utils/libraries/Validator.sol";
import {Subscription, SubscriptionModuleStorage} from "./SubscriptionModuleStorage.sol";

/// @title Subscription Module Base
/// @notice Base contract with internal logic for subscription management
abstract contract SubscriptionModuleBase is ISubscriptionModuleBase {
    using SafeCastLib for uint256;
    using CustomRevert for bytes4;
    using EnumerableSetLib for EnumerableSetLib.Uint256Set;

    /// @dev Reasons why a renewal might be skipped
    enum SkipReason {
        NONE,
        NOT_DUE,
        INACTIVE,
        PAST_GRACE,
        MEMBERSHIP_BANNED,
        NOT_OWNER,
        RENEWAL_PRICE_CHANGED,
        INSUFFICIENT_BALANCE,
        DURATION_CHANGED,
        CURRENCY_CHANGED
    }

    uint256 public constant GRACE_PERIOD = 3 days;

    // Dynamic buffer times based on expiration proximity
    uint256 public constant BUFFER_IMMEDIATE = 2 minutes; // For expirations within 1 hour
    uint256 public constant BUFFER_SHORT = 1 hours; // For expirations within 6 hours
    uint256 public constant BUFFER_MEDIUM = 6 hours; // For expirations within 24 hours
    uint256 public constant BUFFER_LONG = 12 hours; // For expirations more than 24 hours away

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Internal                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @dev Syncs subscription state with current membership data
    /// @param sub The subscription storage to update
    /// @param membershipFacet The membership facet to query
    /// @param expiresAt The current expiration timestamp
    /// @param duration The membership duration
    function _syncSubscriptionState(
        Subscription storage sub,
        IMembership membershipFacet,
        uint256 expiresAt,
        uint64 duration
    ) internal {
        sub.active = true;
        sub.lastKnownRenewalPrice = membershipFacet.getMembershipRenewalPrice(sub.tokenId);
        sub.lastKnownExpiresAt = expiresAt;
        sub.duration = duration;
        sub.lastKnownCurrency = membershipFacet.getMembershipCurrency();
        sub.nextRenewalTime = _calculateBaseRenewalTime(expiresAt, duration);
    }

    /// @dev Processes a single subscription renewal
    /// @param sub The subscription to renew
    /// @param params The parameters for the renewal
    function _processRenewal(
        Subscription storage sub,
        ISubscriptionModule.RenewalParams calldata params,
        IMembership membershipFacet,
        uint256 actualRenewalPrice
    ) internal {
        address currency = membershipFacet.getMembershipCurrency();
        // Construct the renewal call to space contract
        bytes memory renewalCall = abi.encodeCall(IMembership.renewMembership, (sub.tokenId));

        // Create the data parameter for executeWithRuntimeValidation
        bytes memory executeData;
        if (currency == CurrencyTransfer.NATIVE_TOKEN) {
            // ETH path: single execute with value
            executeData = abi.encodeCall(
                IModularAccount.execute,
                (
                    sub.space, // target
                    actualRenewalPrice, // value
                    renewalCall // data
                )
            );
        } else {
            // ERC20 path: batch execute (approve + renewMembership)
            Call[] memory calls = new Call[](2);
            calls[0] = Call({
                target: currency,
                value: 0,
                data: abi.encodeCall(IERC20.approve, (sub.space, actualRenewalPrice))
            });
            calls[1] = Call({target: sub.space, value: 0, data: renewalCall});
            executeData = abi.encodeCall(IModularAccount.executeBatch, (calls));
        }

        // Use the proper pack function from ValidationLocatorLib
        bytes memory authorization = ValidationLocatorLib.packSignature(
            params.entityId,
            false, // selector-based
            bytes.concat(hex"ff", abi.encode(sub.space, sub.tokenId))
        );

        // Call executeWithRuntimeValidation with the correct parameters
        bytes memory runtimeValidationCall = abi.encodeCall(
            IModularAccount.executeWithRuntimeValidation,
            (
                executeData, // The execute() call data
                authorization // Authorization for validation
            )
        );

        // External call happens here
        LibCall.callContract(params.account, 0, runtimeValidationCall);

        // Get the actual new expiration time after successful renewal
        uint256 newExpiresAt = membershipFacet.expiresAt(sub.tokenId);

        // Calculate next renewal time ensuring it's strictly in the future
        uint256 duration = membershipFacet.getMembershipDuration();
        sub.nextRenewalTime = _calculateBaseRenewalTime(newExpiresAt, duration);
        sub.lastRenewalTime = block.timestamp.toUint40();
        sub.lastKnownExpiresAt = newExpiresAt;
        sub.spent += actualRenewalPrice;

        emit SubscriptionRenewed(
            params.account,
            params.entityId,
            sub.space,
            sub.tokenId,
            sub.nextRenewalTime,
            newExpiresAt
        );
        emit SubscriptionSpent(params.account, params.entityId, actualRenewalPrice, sub.spent);
    }

    function _pauseSubscription(
        Subscription storage sub,
        address account,
        uint32 entityId
    ) internal {
        sub.active = false;
        emit SubscriptionPaused(account, entityId);
    }

    function _hasEntityId(
        SubscriptionModuleStorage.Layout storage $,
        address account,
        uint32 entityId
    ) internal view returns (bool) {
        return $.entityIds[account].contains(entityId);
    }

    /// @dev Calculates the base renewal time without minimum buffer enforcement
    /// @param expirationTime The expiration timestamp of the membership
    /// @param duration The membership duration in seconds
    /// @return The base renewal time as uint40
    function _calculateBaseRenewalTime(
        uint256 expirationTime,
        uint256 duration
    ) internal view returns (uint40) {
        if (expirationTime <= block.timestamp) return block.timestamp.toUint40();

        uint256 buffer = _getRenewalBuffer(duration);
        uint256 timeUntilExpiration = expirationTime - block.timestamp;

        if (buffer >= timeUntilExpiration) {
            // If buffer is larger than time until expiration,
            // schedule for after the expiration by the same amount
            return (expirationTime + (buffer - timeUntilExpiration)).toUint40();
        }

        return (expirationTime - buffer).toUint40();
    }

    /// @dev Requires that msg.sender is the owner of the membership token
    /// @param sub The subscription storage reference
    function _requireOwnership(Subscription storage sub) internal view {
        address owner = IERC721(sub.space).ownerOf(sub.tokenId);
        if (msg.sender != owner) SubscriptionModule__InvalidCaller.selector.revertWith();
    }

    /// @dev Validates renewal eligibility and returns skip reason if any
    /// @param sub The subscription to validate
    /// @param account The account address
    /// @param actualRenewalPrice The current renewal price
    /// @param actualDuration The current membership duration
    /// @return shouldSkip Whether to skip this renewal
    /// @return shouldPause Whether to pause the subscription (only relevant if shouldSkip is true)
    /// @return reason The skip reason if shouldSkip is true
    function _validateRenewalEligibility(
        Subscription storage sub,
        address account,
        uint256 actualRenewalPrice,
        uint256 actualDuration
    ) internal view returns (bool shouldSkip, bool shouldPause, SkipReason reason) {
        // Check if renewal is due
        if (sub.nextRenewalTime > block.timestamp) {
            return (true, false, SkipReason.NOT_DUE);
        }

        // Check if subscription is active
        if (!sub.active) {
            return (true, false, SkipReason.INACTIVE);
        }

        // Check if past grace period
        if (sub.nextRenewalTime + GRACE_PERIOD < block.timestamp) {
            return (true, true, SkipReason.PAST_GRACE);
        }

        // Check if membership is banned
        if (IBanning(sub.space).isBanned(sub.tokenId)) {
            return (true, true, SkipReason.MEMBERSHIP_BANNED);
        }

        // Check if account is still the owner
        if (IERC721(sub.space).ownerOf(sub.tokenId) != account) {
            return (true, true, SkipReason.NOT_OWNER);
        }

        // Check if renewal price changed
        if (sub.lastKnownRenewalPrice != actualRenewalPrice) {
            return (true, true, SkipReason.RENEWAL_PRICE_CHANGED);
        }

        // Check if currency changed
        address actualCurrency = IMembership(sub.space).getMembershipCurrency();
        if (sub.lastKnownCurrency != actualCurrency) {
            return (true, true, SkipReason.CURRENCY_CHANGED);
        }

        // Check if account has sufficient balance (ETH or ERC20)
        if (CurrencyTransfer.balanceOf(actualCurrency, account) < actualRenewalPrice) {
            return (true, true, SkipReason.INSUFFICIENT_BALANCE);
        }

        // Check if duration changed
        if (sub.duration != actualDuration) {
            return (true, true, SkipReason.DURATION_CHANGED);
        }

        return (false, false, SkipReason.NONE);
    }

    /// @dev Determines the appropriate renewal buffer time based on membership duration
    /// @param duration The membership duration in seconds
    /// @return The appropriate buffer time in seconds before expiration
    function _getRenewalBuffer(uint256 duration) internal pure returns (uint256) {
        // For memberships shorter than 1 hour, use immediate buffer (2 minutes)
        if (duration <= 1 hours) return BUFFER_IMMEDIATE;

        // For memberships shorter than 6 hours, use short buffer (1 hour)
        if (duration <= 6 hours) return BUFFER_SHORT;

        // For memberships shorter than 24 hours, use medium buffer (6 hours)
        if (duration <= 24 hours) return BUFFER_MEDIUM;

        // For memberships longer than 24 hours, use long buffer (12 hours)
        return BUFFER_LONG;
    }

    /// @dev Converts a SkipReason enum to its string representation
    /// @param reason The skip reason to convert
    /// @return The string representation of the reason
    function _skipReasonToString(SkipReason reason) internal pure returns (string memory) {
        if (reason == SkipReason.NOT_DUE) return "NOT_DUE";
        if (reason == SkipReason.INACTIVE) return "INACTIVE";
        if (reason == SkipReason.PAST_GRACE) return "PAST_GRACE";
        if (reason == SkipReason.MEMBERSHIP_BANNED) return "MEMBERSHIP_BANNED";
        if (reason == SkipReason.NOT_OWNER) return "NOT_OWNER";
        if (reason == SkipReason.RENEWAL_PRICE_CHANGED) return "RENEWAL_PRICE_CHANGED";
        if (reason == SkipReason.INSUFFICIENT_BALANCE) return "INSUFFICIENT_BALANCE";
        if (reason == SkipReason.DURATION_CHANGED) return "DURATION_CHANGED";
        if (reason == SkipReason.CURRENCY_CHANGED) return "CURRENCY_CHANGED";
        return "";
    }
}
