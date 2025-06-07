# Variable: IRuleEntitlementV2Abi

```ts
IRuleEntitlementV2Abi: readonly [{
  inputs: readonly [];
  name: "description";
  outputs: readonly [{
     internalType: "string";
     name: "";
     type: "string";
  }];
  stateMutability: "view";
  type: "function";
}, {
  inputs: readonly [{
     components: readonly [{
        components: readonly [{
           internalType: "enum IRuleEntitlementBase.CombinedOperationType";
           name: "opType";
           type: "uint8";
         }, {
           internalType: "uint8";
           name: "index";
           type: "uint8";
        }];
        internalType: "struct IRuleEntitlementBase.Operation[]";
        name: "operations";
        type: "tuple[]";
      }, {
        components: readonly [{
           internalType: "enum IRuleEntitlementBase.CheckOperationType";
           name: "opType";
           type: "uint8";
         }, {
           internalType: "uint256";
           name: "chainId";
           type: "uint256";
         }, {
           internalType: "address";
           name: "contractAddress";
           type: "address";
         }, {
           internalType: "bytes";
           name: "params";
           type: "bytes";
        }];
        internalType: "struct IRuleEntitlementBase.CheckOperationV2[]";
        name: "checkOperations";
        type: "tuple[]";
      }, {
        components: readonly [{
           internalType: "enum IRuleEntitlementBase.LogicalOperationType";
           name: "logOpType";
           type: "uint8";
         }, {
           internalType: "uint8";
           name: "leftOperationIndex";
           type: "uint8";
         }, {
           internalType: "uint8";
           name: "rightOperationIndex";
           type: "uint8";
        }];
        internalType: "struct IRuleEntitlementBase.LogicalOperation[]";
        name: "logicalOperations";
        type: "tuple[]";
     }];
     internalType: "struct IRuleEntitlementBase.RuleDataV2";
     name: "data";
     type: "tuple";
  }];
  name: "encodeRuleData";
  outputs: readonly [{
     internalType: "bytes";
     name: "";
     type: "bytes";
  }];
  stateMutability: "pure";
  type: "function";
}, {
  inputs: readonly [{
     internalType: "uint256";
     name: "roleId";
     type: "uint256";
  }];
  name: "getEntitlementDataByRoleId";
  outputs: readonly [{
     internalType: "bytes";
     name: "";
     type: "bytes";
  }];
  stateMutability: "view";
  type: "function";
}, {
  inputs: readonly [{
     internalType: "uint256";
     name: "roleId";
     type: "uint256";
  }];
  name: "getRuleDataV2";
  outputs: readonly [{
     components: readonly [{
        components: readonly [{
           internalType: "enum IRuleEntitlementBase.CombinedOperationType";
           name: "opType";
           type: "uint8";
         }, {
           internalType: "uint8";
           name: "index";
           type: "uint8";
        }];
        internalType: "struct IRuleEntitlementBase.Operation[]";
        name: "operations";
        type: "tuple[]";
      }, {
        components: readonly [{
           internalType: "enum IRuleEntitlementBase.CheckOperationType";
           name: "opType";
           type: "uint8";
         }, {
           internalType: "uint256";
           name: "chainId";
           type: "uint256";
         }, {
           internalType: "address";
           name: "contractAddress";
           type: "address";
         }, {
           internalType: "bytes";
           name: "params";
           type: "bytes";
        }];
        internalType: "struct IRuleEntitlementBase.CheckOperationV2[]";
        name: "checkOperations";
        type: "tuple[]";
      }, {
        components: readonly [{
           internalType: "enum IRuleEntitlementBase.LogicalOperationType";
           name: "logOpType";
           type: "uint8";
         }, {
           internalType: "uint8";
           name: "leftOperationIndex";
           type: "uint8";
         }, {
           internalType: "uint8";
           name: "rightOperationIndex";
           type: "uint8";
        }];
        internalType: "struct IRuleEntitlementBase.LogicalOperation[]";
        name: "logicalOperations";
        type: "tuple[]";
     }];
     internalType: "struct IRuleEntitlementBase.RuleDataV2";
     name: "data";
     type: "tuple";
  }];
  stateMutability: "view";
  type: "function";
}, {
  inputs: readonly [{
     internalType: "address";
     name: "space";
     type: "address";
  }];
  name: "initialize";
  outputs: readonly [];
  stateMutability: "nonpayable";
  type: "function";
}, {
  inputs: readonly [];
  name: "isCrosschain";
  outputs: readonly [{
     internalType: "bool";
     name: "";
     type: "bool";
  }];
  stateMutability: "view";
  type: "function";
}, {
  inputs: readonly [{
     internalType: "bytes32";
     name: "channelId";
     type: "bytes32";
   }, {
     internalType: "address[]";
     name: "user";
     type: "address[]";
   }, {
     internalType: "bytes32";
     name: "permission";
     type: "bytes32";
  }];
  name: "isEntitled";
  outputs: readonly [{
     internalType: "bool";
     name: "";
     type: "bool";
  }];
  stateMutability: "view";
  type: "function";
}, {
  inputs: readonly [];
  name: "moduleType";
  outputs: readonly [{
     internalType: "string";
     name: "";
     type: "string";
  }];
  stateMutability: "view";
  type: "function";
}, {
  inputs: readonly [];
  name: "name";
  outputs: readonly [{
     internalType: "string";
     name: "";
     type: "string";
  }];
  stateMutability: "view";
  type: "function";
}, {
  inputs: readonly [{
     internalType: "uint256";
     name: "roleId";
     type: "uint256";
  }];
  name: "removeEntitlement";
  outputs: readonly [];
  stateMutability: "nonpayable";
  type: "function";
}, {
  inputs: readonly [{
     internalType: "uint256";
     name: "roleId";
     type: "uint256";
   }, {
     internalType: "bytes";
     name: "entitlementData";
     type: "bytes";
  }];
  name: "setEntitlement";
  outputs: readonly [];
  stateMutability: "nonpayable";
  type: "function";
}, {
  inputs: readonly [{
     internalType: "uint256";
     name: "limit";
     type: "uint256";
  }];
  name: "CheckOperationsLimitReaced";
  type: "error";
}, {
  inputs: readonly [];
  name: "Entitlement__InvalidValue";
  type: "error";
}, {
  inputs: readonly [];
  name: "Entitlement__NotAllowed";
  type: "error";
}, {
  inputs: readonly [];
  name: "Entitlement__NotMember";
  type: "error";
}, {
  inputs: readonly [];
  name: "Entitlement__ValueAlreadyExists";
  type: "error";
}, {
  inputs: readonly [{
     internalType: "uint8";
     name: "operationIndex";
     type: "uint8";
   }, {
     internalType: "uint8";
     name: "checkOperationsLength";
     type: "uint8";
  }];
  name: "InvalidCheckOperationIndex";
  type: "error";
}, {
  inputs: readonly [{
     internalType: "uint8";
     name: "leftOperationIndex";
     type: "uint8";
   }, {
     internalType: "uint8";
     name: "currentOperationIndex";
     type: "uint8";
  }];
  name: "InvalidLeftOperationIndex";
  type: "error";
}, {
  inputs: readonly [{
     internalType: "uint8";
     name: "operationIndex";
     type: "uint8";
   }, {
     internalType: "uint8";
     name: "logicalOperationsLength";
     type: "uint8";
  }];
  name: "InvalidLogicalOperationIndex";
  type: "error";
}, {
  inputs: readonly [{
     internalType: "enum IRuleEntitlementBase.CombinedOperationType";
     name: "opType";
     type: "uint8";
  }];
  name: "InvalidOperationType";
  type: "error";
}, {
  inputs: readonly [{
     internalType: "uint8";
     name: "rightOperationIndex";
     type: "uint8";
   }, {
     internalType: "uint8";
     name: "currentOperationIndex";
     type: "uint8";
  }];
  name: "InvalidRightOperationIndex";
  type: "error";
}, {
  inputs: readonly [{
     internalType: "uint256";
     name: "limit";
     type: "uint256";
  }];
  name: "LogicalOperationLimitReached";
  type: "error";
}, {
  inputs: readonly [{
     internalType: "uint256";
     name: "limit";
     type: "uint256";
  }];
  name: "OperationsLimitReached";
  type: "error";
}];
```

Defined in: [packages/web3/src/space/entitlements/RuleEntitlementV2Shim.ts:9](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/entitlements/RuleEntitlementV2Shim.ts#L9)
