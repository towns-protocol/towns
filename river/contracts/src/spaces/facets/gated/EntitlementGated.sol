// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IEntitlementGated} from "./IEntitlementGated.sol";
import {IRuleEntitlement} from "contracts/src/spaces/entitlements/rule/IRuleEntitlement.sol";
import {IEntitlementChecker} from "contracts/src/base/registry/facets/checker/IEntitlementChecker.sol";

// libraries

// contracts
import {EntitlementGatedBase} from "./EntitlementGatedBase.sol";
import {Facet} from "contracts/src/diamond/facets/Facet.sol";

contract EntitlementGated is IEntitlementGated, EntitlementGatedBase, Facet {
  function __EntitlementGated_init(
    IEntitlementChecker entitlementChecker
  ) external onlyInitializing {
    __EntitlementGated_init_unchained(entitlementChecker);
  }

  function __EntitlementGated_init_unchained(
    IEntitlementChecker entitlementChecker
  ) internal {
    _addInterface(type(IEntitlementGated).interfaceId);
    _setEntitlementChecker(entitlementChecker);
  }

  // Called by the xchain node to post the result of the entitlement check
  // the internal function validates the transactionId and the result
  function postEntitlementCheckResult(
    bytes32 transactionId,
    NodeVoteStatus result
  ) external {
    _postEntitlementCheckResult(transactionId, result);
  }

  function getRuleData(
    bytes32 transactionId
  ) external view returns (IRuleEntitlement.RuleData memory) {
    return _getRuleData(transactionId);
  }

  function requestEntitlementCheck(
    IRuleEntitlement.RuleData calldata ruleData
  ) external virtual returns (bytes32) {}
}
