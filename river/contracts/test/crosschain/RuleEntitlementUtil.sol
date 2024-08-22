// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {IRuleEntitlementBase} from "contracts/src/spaces/entitlements/rule/IRuleEntitlement.sol";

library RuleEntitlementUtil {
  function getLegacyNoopRuleData()
    internal
    pure
    returns (IRuleEntitlementBase.RuleData memory data)
  {
    data = IRuleEntitlementBase.RuleData({
      operations: new IRuleEntitlementBase.Operation[](1),
      checkOperations: new IRuleEntitlementBase.CheckOperation[](0),
      logicalOperations: new IRuleEntitlementBase.LogicalOperation[](0)
    });
    IRuleEntitlementBase.Operation memory noop = IRuleEntitlementBase
      .Operation({
        opType: IRuleEntitlementBase.CombinedOperationType.NONE,
        index: 0
      });

    data.operations[0] = noop;
  }

  function getNoopRuleData()
    internal
    pure
    returns (IRuleEntitlementBase.RuleDataV2 memory data)
  {
    data = IRuleEntitlementBase.RuleDataV2({
      operations: new IRuleEntitlementBase.Operation[](1),
      checkOperations: new IRuleEntitlementBase.CheckOperationV2[](0),
      logicalOperations: new IRuleEntitlementBase.LogicalOperation[](0)
    });
    IRuleEntitlementBase.Operation memory noop = IRuleEntitlementBase
      .Operation({
        opType: IRuleEntitlementBase.CombinedOperationType.NONE,
        index: 0
      });

    data.operations[0] = noop;
  }

  function getMockERC721RuleData()
    internal
    pure
    returns (IRuleEntitlementBase.RuleDataV2 memory data)
  {
    data = IRuleEntitlementBase.RuleDataV2({
      operations: new IRuleEntitlementBase.Operation[](1),
      checkOperations: new IRuleEntitlementBase.CheckOperationV2[](1),
      logicalOperations: new IRuleEntitlementBase.LogicalOperation[](0)
    });
    IRuleEntitlementBase.CheckOperationV2 memory checkOp = IRuleEntitlementBase
      .CheckOperationV2({
        opType: IRuleEntitlementBase.CheckOperationType.ERC721,
        chainId: 11155111,
        contractAddress: address(0xb088b3f2b35511A611bF2aaC13fE605d491D6C19),
        params: abi.encodePacked(uint256(1))
      });
    IRuleEntitlementBase.Operation memory op = IRuleEntitlementBase.Operation({
      opType: IRuleEntitlementBase.CombinedOperationType.CHECK,
      index: 0
    });

    data.operations[0] = op;
    data.checkOperations[0] = checkOp;
  }

  function getMockERC20RuleData()
    internal
    pure
    returns (IRuleEntitlementBase.RuleDataV2 memory data)
  {
    data = IRuleEntitlementBase.RuleDataV2({
      operations: new IRuleEntitlementBase.Operation[](1),
      checkOperations: new IRuleEntitlementBase.CheckOperationV2[](1),
      logicalOperations: new IRuleEntitlementBase.LogicalOperation[](0)
    });
    IRuleEntitlementBase.CheckOperationV2 memory checkOp = IRuleEntitlementBase
      .CheckOperationV2({
        opType: IRuleEntitlementBase.CheckOperationType.ERC20,
        chainId: 31337,
        contractAddress: address(0x11),
        params: abi.encodePacked(uint256(100))
      });
    IRuleEntitlementBase.Operation memory op = IRuleEntitlementBase.Operation({
      opType: IRuleEntitlementBase.CombinedOperationType.CHECK,
      index: 0
    });
    data.operations[0] = op;
    data.checkOperations[0] = checkOp;
  }

  function getMockERC1155RuleData()
    internal
    pure
    returns (IRuleEntitlementBase.RuleDataV2 memory data)
  {
    data = IRuleEntitlementBase.RuleDataV2({
      operations: new IRuleEntitlementBase.Operation[](1),
      checkOperations: new IRuleEntitlementBase.CheckOperationV2[](1),
      logicalOperations: new IRuleEntitlementBase.LogicalOperation[](0)
    });
    IRuleEntitlementBase.CheckOperationV2 memory checkOp = IRuleEntitlementBase
      .CheckOperationV2({
        opType: IRuleEntitlementBase.CheckOperationType.ERC1155,
        chainId: 31341,
        contractAddress: address(0x55),
        params: abi.encodePacked(uint256(500))
      });
    IRuleEntitlementBase.Operation memory op = IRuleEntitlementBase.Operation({
      opType: IRuleEntitlementBase.CombinedOperationType.CHECK,
      index: 0
    });
    data.operations[0] = op;
    data.checkOperations[0] = checkOp;
  }
}
