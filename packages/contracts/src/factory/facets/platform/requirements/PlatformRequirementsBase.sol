// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IPlatformRequirementsBase} from "./IPlatformRequirements.sol";

// libraries
import {PlatformRequirementsStorage} from "./PlatformRequirementsStorage.sol";
import {BasisPoints} from "src/utils/libraries/BasisPoints.sol";
import {CustomRevert} from "src/utils/libraries/CustomRevert.sol";

// contracts

abstract contract PlatformRequirementsBase is IPlatformRequirementsBase {
    using CustomRevert for bytes4;

    // Fee Recipient
    function _setFeeRecipient(address recipient) internal {
        if (recipient == address(0)) {
            Platform__InvalidFeeRecipient.selector.revertWith();
        }

        PlatformRequirementsStorage.layout().feeRecipient = recipient;

        emit PlatformFeeRecipientSet(recipient);
    }

    function _getFeeRecipient() internal view returns (address) {
        return PlatformRequirementsStorage.layout().feeRecipient;
    }

    // Membership BPS
    function _setMembershipBps(uint16 bps) internal {
        if (bps > BasisPoints.MAX_BPS) {
            Platform__InvalidMembershipBps.selector.revertWith();
        }

        PlatformRequirementsStorage.layout().membershipBps = bps;
        emit PlatformMembershipBpsSet(bps);
    }

    function _getMembershipBps() internal view returns (uint16) {
        return PlatformRequirementsStorage.layout().membershipBps;
    }

    // Membership Fee
    function _setMembershipFee(uint256 fee) internal {
        PlatformRequirementsStorage.layout().membershipFee = fee;
        emit PlatformMembershipFeeSet(fee);
    }

    function _getMembershipFee() internal view returns (uint256) {
        return PlatformRequirementsStorage.layout().membershipFee;
    }

    // Membership Mint Limit
    function _setMembershipMintLimit(uint256 limit) internal {
        if (limit == 0) Platform__InvalidMembershipMintLimit.selector.revertWith();

        PlatformRequirementsStorage.layout().membershipMintLimit = limit;
        emit PlatformMembershipMintLimitSet(limit);
    }

    function _getMembershipMintLimit() internal view returns (uint256) {
        return PlatformRequirementsStorage.layout().membershipMintLimit;
    }

    // Membership Duration
    function _setMembershipDuration(uint64 duration) internal {
        if (duration == 0) {
            Platform__InvalidMembershipDuration.selector.revertWith();
        }

        PlatformRequirementsStorage.layout().membershipDuration = duration;
        emit PlatformMembershipDurationSet(duration);
    }

    function _getMembershipDuration() internal view returns (uint64) {
        return PlatformRequirementsStorage.layout().membershipDuration;
    }

    // Membership Min Price
    function _setMembershipMinPrice(uint256 minPrice) internal {
        if (minPrice == 0) {
            Platform__InvalidMembershipMinPrice.selector.revertWith();
        }

        PlatformRequirementsStorage.layout().membershipMinPrice = minPrice;
        emit PlatformMembershipMinPriceSet(minPrice);
    }

    function _getMembershipMinPrice() internal view returns (uint256) {
        return PlatformRequirementsStorage.layout().membershipMinPrice;
    }

    function _setSwapFees(uint16 protocolBps, uint16 posterBps) internal {
        if (posterBps > BasisPoints.MAX_BPS || protocolBps > BasisPoints.MAX_BPS) {
            Platform__InvalidSwapFeeBps.selector.revertWith();
        }
        PlatformRequirementsStorage.Layout storage $ = PlatformRequirementsStorage.layout();
        ($.swapProtocolBps, $.swapPosterBps) = (protocolBps, posterBps);
        emit PlatformSwapFeesSet(protocolBps, posterBps);
    }

    function _getSwapFees() internal view returns (uint16 protocolBps, uint16 posterBps) {
        PlatformRequirementsStorage.Layout storage $ = PlatformRequirementsStorage.layout();
        return ($.swapProtocolBps, $.swapPosterBps);
    }

    function _setRouterWhitelisted(address router, bool whitelisted) internal {
        PlatformRequirementsStorage.Layout storage $ = PlatformRequirementsStorage.layout();
        $.whitelistedRouters[router] = whitelisted;
        emit RouterWhitelistUpdated(router, whitelisted);
    }

    function _isRouterWhitelisted(address router) internal view returns (bool) {
        return PlatformRequirementsStorage.layout().whitelistedRouters[router];
    }

    // Denominator
    function _getDenominator() internal pure virtual returns (uint256) {
        return 10_000;
    }
}
