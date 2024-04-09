// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IEntitlementGated} from "./IEntitlementGated.sol";

// libraries

// contracts
import {EntitlementGatedBase} from "./EntitlementGatedBase.sol";

abstract contract EntitlementGated is IEntitlementGated, EntitlementGatedBase {
  // Called by the xchain node to post the result of the entitlement check
  // the internal function validates the transactionId and the result
  function postEntitlementCheckResult(
    bytes32 transactionId,
    NodeVoteStatus result
  ) external {
    _postEntitlementCheckResult(transactionId, result);
  }

  // must be implemented by the derived contract
  // to handle the result of the entitlement check
  // the caller is verified to be an enrolled xchain node
  function _onEntitlementCheckResultPosted(
    bytes32 transactionId,
    NodeVoteStatus result
  ) internal virtual override;
}
