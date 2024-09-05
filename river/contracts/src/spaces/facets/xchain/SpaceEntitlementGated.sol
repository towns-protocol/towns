// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {EntitlementGated} from "contracts/src/spaces/facets/gated/EntitlementGated.sol";
import {MembershipJoin} from "contracts/src/spaces/facets/membership/join/MembershipJoin.sol";
import {IMembership} from "contracts/src/spaces/facets/membership/IMembership.sol";

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
    bytes memory data = _getCapturedData(transactionId);

    if (data.length == 0) {
      return;
    }

    (bytes4 transactionType, address sender, address receiver, ) = abi.decode(
      data,
      (bytes4, address, address, bytes)
    );

    if (result == NodeVoteStatus.PASSED) {
      bool shouldCharge = _shouldChargeForJoinSpace();
      if (shouldCharge) {
        if (transactionType == IMembership.joinSpaceWithReferral.selector) {
          _chargeForJoinSpaceWithReferral(transactionId);
        } else if (transactionType == IMembership.joinSpace.selector) {
          _chargeForJoinSpace(transactionId);
        }
      } else {
        _refundBalance(transactionId, sender);
      }

      _issueToken(receiver);
    } else {
      _captureData(transactionId, "");
      _refundBalance(transactionId, sender);

      emit MembershipTokenRejected(receiver);
    }
  }
}
