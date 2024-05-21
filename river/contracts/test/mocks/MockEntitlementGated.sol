// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {IEntitlementChecker} from "contracts/src/base/registry/facets/checker/IEntitlementChecker.sol";
import {EntitlementGated} from "contracts/src/spaces/facets/gated/EntitlementGated.sol";
import {IRuleEntitlement} from "contracts/src/spaces/entitlements/rule/IRuleEntitlement.sol";

contract MockEntitlementGated is EntitlementGated {
  mapping(uint256 => IRuleEntitlement.RuleData) ruleDatasByRoleId;
  IRuleEntitlement.RuleData encodedRuleData;

  constructor(IEntitlementChecker checker) {
    _setEntitlementChecker(checker);
  }

  // This function is used to set the RuleData for the requestEntitlementCheck function
  // jamming it in here so it can be called from the test
  function getRuleData(
    uint256 roleId
  ) external view returns (IRuleEntitlement.RuleData memory) {
    return ruleDatasByRoleId[roleId];
  }

  function requestEntitlementCheck(
    uint256 roleId,
    IRuleEntitlement.RuleData calldata ruleData
  ) external returns (bytes32) {
    ruleDatasByRoleId[roleId] = ruleData;
    bytes32 transactionId = keccak256(
      abi.encodePacked(tx.origin, block.number)
    );
    _requestEntitlementCheck(transactionId, IRuleEntitlement(address(this)), 0);
    return transactionId;
  }
}
