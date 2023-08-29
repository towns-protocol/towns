// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IEntitlementCheckerEvents {
  enum NodeVoteStatus {
    NOT_VOTED,
    PASSED,
    FAILED
  }

  event EntitlementCheckRequested(
    address indexed callerAddress,
    bytes32 transactionId,
    address[] selectedNodes,
    address contractAddress
  );

  event EntitlementCheckResultPosted(
    bytes32 indexed transactionId,
    NodeVoteStatus result
  );
}
