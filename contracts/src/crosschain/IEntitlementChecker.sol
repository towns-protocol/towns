// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IEntitlementCheckerEvents} from "./IEntitlementCheckerEvents.sol";

interface IEntitlementChecker {
  function registerNode() external returns (bool);

  function unregisterNode() external returns (bool);

  function nodeCount() external view returns (uint256);

  function getRandomNodes(
    uint requestedNodeCount,
    address requestingContract
  ) external view returns (address[] memory);

  function emitEntitlementCheckRequested(
    bytes32 transactionId,
    address[] memory selectedNodes
  ) external;
}
