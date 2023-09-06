// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IEntitlementGated} from "./IEntitlementGated.sol";

// libraries

// contracts
import {EntitlementGatedBase} from "./EntitlementGatedBase.sol";

abstract contract EntitlementGated is IEntitlementGated, EntitlementGatedBase {
  constructor(address checker) {
    __EntitlementGatedBase_init(checker);
  }

  function getEntitlementOperations()
    external
    view
    virtual
    returns (bytes memory);

  function requestEntitlementCheck() external {
    _requestEntitlementCheck();
  }

  function postEntitlementCheckResult(
    bytes32 transactionId,
    NodeVoteStatus result
  ) external {
    _postEntitlementCheckResult(transactionId, result);
  }

  function removeTransaction(bytes32 transactionId) external {
    _removeTransaction(transactionId);
  }
}
