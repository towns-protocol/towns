// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IMembership} from "../membership/IMembership.sol";

// contracts
import {EntitlementGated} from "../gated/EntitlementGated.sol";
import {MembershipJoin} from "../membership/join/MembershipJoin.sol";

/// @title SpaceEntitlementGated
/// @notice Handles entitlement-gated access to spaces and membership token issuance
contract SpaceEntitlementGated is MembershipJoin, EntitlementGated {
    /// @notice Processes the result of an entitlement check
    /// @dev This function is called when the result of an entitlement check is posted
    /// @param transactionId The unique identifier for the transaction
    /// @param result The result of the entitlement check (PASSED or FAILED)
    function _onEntitlementCheckResultPosted(
        bytes32 transactionId,
        NodeVoteStatus result
    ) internal override {
        bytes storage data = _getCapturedData(transactionId);

        if (data.length == 0) return;

        (bytes4 transactionType, , address receiver, ) = abi.decode(
            data,
            (bytes4, address, address, bytes)
        );

        if (result == NodeVoteStatus.PASSED) {
            // Re-validate supply cap before minting to prevent over-minting from
            // concurrent crosschain join requests that were all accepted when under
            // the cap but would exceed it if all finalized
            uint256 membershipSupplyLimit = _getMembershipSupplyLimit();
            if (membershipSupplyLimit != 0 && _totalSupply() >= membershipSupplyLimit) {
                _rejectMembership(transactionId, receiver);
                return;
            }

            PricingDetails memory joinDetails = _getPricingDetails();

            if (!joinDetails.shouldCharge) {
                _afterChargeForJoinSpace(transactionId, receiver, 0);
            } else {
                uint256 payment = _getCapturedValue(transactionId);

                if (payment < joinDetails.amountDue) {
                    _rejectMembership(transactionId, receiver);
                    return;
                }

                if (transactionType == JOIN_SPACE_SELECTOR) {
                    _chargeForJoinSpace(transactionId, joinDetails);
                } else if (transactionType == IMembership.joinSpaceWithReferral.selector) {
                    _chargeForJoinSpaceWithReferral(transactionId, joinDetails);
                } else {
                    _rejectMembership(transactionId, receiver);
                    return;
                }
            }

            _refundBalance(transactionId, receiver);
            _issueToken(receiver);
            return;
        }

        _rejectMembership(transactionId, receiver);
    }
}
