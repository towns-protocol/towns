// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {IEntitlementChecker} from "contracts/src/base/registry/facets/checker/IEntitlementChecker.sol";
import {EntitlementGated} from "contracts/src/spaces/facets/gated/EntitlementGated.sol";
import {IRuleEntitlement} from "contracts/src/spaces/entitlements/rule/IRuleEntitlement.sol";

contract MockEntitlementGated is EntitlementGated {
  constructor(IEntitlementChecker checker) {
    _setEntitlementChecker(checker);
  }

  function requestEntitlementCheck(
    IRuleEntitlement.RuleData calldata ruleData
  ) external override returns (bytes32) {
    bytes memory encodedRuleData = abi.encode(ruleData);
    bytes32 transactionId = keccak256(
      abi.encodePacked(tx.origin, block.number)
    );
    _requestEntitlementCheck(transactionId, encodedRuleData);
    return transactionId;
  }
}
