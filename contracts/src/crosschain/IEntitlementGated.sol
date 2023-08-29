// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IEntitlementCheckerEvents} from "./IEntitlementCheckerEvents.sol";

interface IEntitlementGated {
  function requestEntitlementCheck() external returns (bool);

  function postEntitlementCheckResult(
    bytes32 transactionId,
    IEntitlementCheckerEvents.NodeVoteStatus result
  ) external returns (bool);

  function deleteTransaction(bytes32 transactionId) external returns (bool);
}
