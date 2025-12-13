// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IMembershipPricing} from "../pricing/IMembershipPricing.sol";

// libraries
import {CurrencyTransfer} from "../../../../utils/libraries/CurrencyTransfer.sol";
import {CustomRevert} from "../../../../utils/libraries/CustomRevert.sol";
import {PrepayStorage} from "./PrepayStorage.sol";

// contracts
import {MembershipBase} from "../MembershipBase.sol";

/// @title PrepayBase
/// @notice Handles prepayment of membership seats for a space
/// @dev Allows space owners to prepay for future memberships, covering both
/// the membership price and protocol fees upfront. Prepaid seats can then be
/// claimed by users without additional payment.
abstract contract PrepayBase is MembershipBase {
    using CustomRevert for bytes4;

    /// @notice Prepays for a number of membership seats
    /// @dev Calculates total cost using incremental pricing based on current supply,
    /// then transfers protocol fees to platform and keeps membership revenue in contract.
    /// @param seats Number of membership seats to prepay
    /// @param currentSupply Current total supply of memberships (used for price calculation)
    function _prepayMembership(uint256 seats, uint256 currentSupply) internal {
        if (seats == 0) Membership__InvalidSupplyAmount.selector.revertWith();

        uint256 prepaidSeats = PrepayStorage.getPrepaidSeats();

        // check supply limit (0 means unlimited)
        // include existing prepaid seats since they will become minted tokens
        uint256 supplyLimit = _getMembershipSupplyLimit();
        if (supplyLimit != 0 && currentSupply + prepaidSeats + seats > supplyLimit) {
            Membership__MaxSupplyReached.selector.revertWith();
        }

        (uint256 totalMembershipCost, uint256 totalProtocolFee) = _calculatePrepayFee(
            seats,
            currentSupply + prepaidSeats
        );

        uint256 totalCost = totalMembershipCost + totalProtocolFee;
        // TODO: ERC20
        if (msg.value != totalCost) Membership__InvalidPayment.selector.revertWith();

        PrepayStorage.addPrepay(seats);

        // transfer protocol fee to platform
        if (totalProtocolFee != 0) {
            CurrencyTransfer.transferCurrency(
                _getMembershipCurrency(),
                msg.sender,
                _getPlatformRequirements().getFeeRecipient(),
                totalProtocolFee
            );
        }

        // keep membership revenue in contract for space owner
        if (totalMembershipCost != 0) _transferIn(msg.sender, totalMembershipCost);

        emit MembershipPrepaid(seats);
    }

    /// @notice Calculates the total fee for prepaying membership seats
    /// @dev Uses incremental pricing - each seat is priced at its supply level.
    /// For example, prepaying 3 seats when currentSupply=100 calculates prices at
    /// supply levels 100, 101, and 102 respectively.
    /// @param seats Number of membership seats to prepay
    /// @param currentSupply Current total supply of memberships
    /// @return totalMembershipCost Sum of membership prices for all prepaid seats
    /// @return totalProtocolFee Protocol fee (flat fee per seat × number of seats)
    function _calculatePrepayFee(
        uint256 seats,
        uint256 currentSupply
    ) internal view returns (uint256 totalMembershipCost, uint256 totalProtocolFee) {
        IMembershipPricing pricingModule = IMembershipPricing(_getPricingModule());
        // a free town
        if (address(pricingModule) == address(0)) return (0, 0);

        // freeAllocation: Number of memberships that are free (no membership price).
        // Memberships minted when totalSupply < freeAllocation have zero membership cost.
        // This allows spaces to offer initial free memberships before paid tiers begin.
        uint256 freeAllocation = _getMembershipFreeAllocation();

        // calculate membership cost for each seat using incremental pricing
        for (uint256 i; i < seats; ++i) {
            uint256 supplyAtMint = currentSupply + i;
            if (supplyAtMint >= freeAllocation) {
                totalMembershipCost += pricingModule.getPrice(freeAllocation, supplyAtMint);
            }
        }

        // protocol fee is charged for all seats regardless of free allocation
        totalProtocolFee = _getPlatformRequirements().getMembershipFee() * seats;
    }
}
