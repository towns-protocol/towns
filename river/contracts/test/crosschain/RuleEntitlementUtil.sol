// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {IRuleEntitlement} from "contracts/src/spaces/entitlements/rule/IRuleEntitlement.sol";

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

  function getMockERC721RuleData()
    internal
    pure
    returns (IRuleEntitlement.RuleData memory data)
  {
    data = IRuleEntitlement.RuleData({
      operations: new IRuleEntitlement.Operation[](1),
      checkOperations: new IRuleEntitlement.CheckOperation[](1),
      logicalOperations: new IRuleEntitlement.LogicalOperation[](0)
    });
    IRuleEntitlement.CheckOperation memory checkOp = IRuleEntitlement
      .CheckOperation({
        opType: IRuleEntitlement.CheckOperationType.ERC721,
        chainId: 11155111,
        contractAddress: address(0xb088b3f2b35511A611bF2aaC13fE605d491D6C19),
        threshold: 1
      });
    IRuleEntitlement.Operation memory op = IRuleEntitlement.Operation({
      opType: IRuleEntitlement.CombinedOperationType.CHECK,
      index: 0
    });

    data.operations[0] = op;
    data.checkOperations[0] = checkOp;
  }

  function getMockERC20RuleData()
    internal
    pure
    returns (IRuleEntitlement.RuleData memory data)
  {
    data = IRuleEntitlement.RuleData({
      operations: new IRuleEntitlement.Operation[](1),
      checkOperations: new IRuleEntitlement.CheckOperation[](1),
      logicalOperations: new IRuleEntitlement.LogicalOperation[](0)
    });
    IRuleEntitlement.CheckOperation memory checkOp = IRuleEntitlement
      .CheckOperation({
        opType: IRuleEntitlement.CheckOperationType.ERC20,
        chainId: 31337,
        contractAddress: address(0x11),
        threshold: 100
      });
    IRuleEntitlement.Operation memory op = IRuleEntitlement.Operation({
      opType: IRuleEntitlement.CombinedOperationType.CHECK,
      index: 0
    });
    data.operations[0] = op;
    data.checkOperations[0] = checkOp;
  }

  function getMockERC1155RuleData()
    internal
    pure
    returns (IRuleEntitlement.RuleData memory data)
  {
    data = IRuleEntitlement.RuleData({
      operations: new IRuleEntitlement.Operation[](1),
      checkOperations: new IRuleEntitlement.CheckOperation[](1),
      logicalOperations: new IRuleEntitlement.LogicalOperation[](0)
    });
    IRuleEntitlement.CheckOperation memory checkOp = IRuleEntitlement
      .CheckOperation({
        opType: IRuleEntitlement.CheckOperationType.ERC1155,
        chainId: 31341,
        contractAddress: address(0x55),
        threshold: 500
      });
    IRuleEntitlement.Operation memory op = IRuleEntitlement.Operation({
      opType: IRuleEntitlement.CombinedOperationType.CHECK,
      index: 0
    });
    data.operations[0] = op;
    data.checkOperations[0] = checkOp;
  }
}
