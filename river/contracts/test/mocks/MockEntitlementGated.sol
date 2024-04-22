// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {IEntitlementChecker} from "contracts/src/crosschain/checker/IEntitlementChecker.sol";
import {EntitlementGated} from "contracts/src/crosschain/EntitlementGated.sol";
import {IRuleEntitlement} from "contracts/src/crosschain/IRuleEntitlement.sol";
import {console2} from "forge-std/console2.sol";

contract MockEntitlementGated is EntitlementGated {
  IEntitlementChecker internal _entitlementChecker;

  constructor(IEntitlementChecker checker) {
    __EntitlementGatedBase_init(address(checker));
  }

  function _onEntitlementCheckResultPosted(
    bytes32,
    NodeVoteStatus
  ) internal pure override {
    console2.log("onEntitlementCheckResultPosted");
  }

  function requestEntitlementCheck(
    IRuleEntitlement.RuleData calldata ruleData
  ) external returns (bytes32) {
    bytes memory encodedRuleData = abi.encode(ruleData);
    return _requestEntitlementCheck(encodedRuleData);
  }
}
