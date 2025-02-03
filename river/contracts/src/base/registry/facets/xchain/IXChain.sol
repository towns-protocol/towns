// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IEntitlementGatedBase} from "contracts/src/spaces/facets/gated/IEntitlementGated.sol";
import {IEntitlementCheckerBase} from "contracts/src/base/registry/facets/checker/IEntitlementChecker.sol";

// libraries

// contracts

interface IXChain is IEntitlementGatedBase, IEntitlementCheckerBase {
  /// @notice Checks if a specific entitlement check request has been completed
  /// @param transactionId The unique identifier of the transaction
  /// @param requestId The ID of the specific check request
  /// @return bool True if the check is completed, false otherwise
  function isCheckCompleted(
    bytes32 transactionId,
    uint256 requestId
  ) external view returns (bool);

  /// @notice Allows a sender to request a refund for timed-out entitlement checks
  /// @dev Will revert if no refunds are available or if the contract has insufficient funds
  function requestRefund() external;

  /// @notice Posts the result of an entitlement check from a node
  /// @param transactionId The unique identifier of the transaction being checked
  /// @param roleId The ID of the role being checked
  /// @param result The vote result from the node (PASSED, FAILED, or NOT_VOTED)
  function postEntitlementCheckResult(
    bytes32 transactionId,
    uint256 roleId,
    NodeVoteStatus result
  ) external;
}
