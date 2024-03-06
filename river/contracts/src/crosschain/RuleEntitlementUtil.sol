// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {IRuleEntitlement} from "./IRuleEntitlement.sol";

library RuleEntitlementUtil {
  function getNoopRuleData()
    internal
    pure
    returns (IRuleEntitlement.RuleData memory data)
  {
    data = IRuleEntitlement.RuleData({
      operations: new IRuleEntitlement.Operation[](1),
      checkOperations: new IRuleEntitlement.CheckOperation[](0),
      logicalOperations: new IRuleEntitlement.LogicalOperation[](0)
    });
    IRuleEntitlement.Operation memory noop = IRuleEntitlement.Operation({
      opType: IRuleEntitlement.CombinedOperationType.NONE,
      index: 0
    });

    data.operations[0] = noop;
  }
}
