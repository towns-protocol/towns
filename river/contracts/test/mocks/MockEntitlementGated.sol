// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {IEntitlementChecker} from "./../../src/crosschain/checker/IEntitlementChecker.sol";
import {EntitlementGated} from "contracts/src/crosschain/EntitlementGated.sol";
import {RuleEntitlementUtil} from "./../../src/crosschain/RuleEntitlementUtil.sol";
import {IRuleEntitlement} from "contracts/src/crosschain/IRuleEntitlement.sol";
import {console2} from "forge-std/console2.sol";

contract MockEntitlementGated is EntitlementGated {
  IEntitlementChecker internal _entitlementChecker;

  constructor(IEntitlementChecker checker) {
    __EntitlementGatedBase_init(address(checker));
  }

  function _onEntitlementCheckResultPosted(
    bytes32 transactionId,
    NodeVoteStatus result
  ) internal override {
    console2.log("onEntitlementCheckResultPosted");
  }

  function requestEntitlementCheck() external returns (bytes32) {
    IRuleEntitlement.RuleData memory rd = RuleEntitlementUtil
      .getMockERC721RuleData();
    bytes memory encodedRuleData = abi.encode(rd);
    return _requestEntitlementCheck(encodedRuleData);
  }
}
