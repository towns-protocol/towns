// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IMembership} from "../membership/IMembership.sol";

// libraries

// contracts
import {EntitlementGated} from "../gated/EntitlementGated.sol";
import {MembershipJoin} from "../membership/join/MembershipJoin.sol";

/// @title SpaceEntitlementGated
/// @notice Handles entitlement-gated access to spaces and membership token issuance
/// @dev Inherits from ISpaceEntitlementGatedBase, MembershipJoin, and EntitlementGated
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
            bool shouldCharge = _shouldChargeForJoinSpace();
            if (shouldCharge) {
                uint256 payment = _getCapturedValue(transactionId);
                uint256 membershipPrice = _getMembershipPrice(_totalSupply());
                uint256 requiredAmount = _getRequiredAmount(membershipPrice);

                if (payment < requiredAmount) {
                    _rejectMembership(transactionId, receiver);
                    return;
                }

                if (transactionType == JOIN_SPACE_SELECTOR) {
                    _chargeForJoinSpace(transactionId);
                } else if (transactionType == IMembership.joinSpaceWithReferral.selector) {
                    _chargeForJoinSpaceWithReferral(transactionId);
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
