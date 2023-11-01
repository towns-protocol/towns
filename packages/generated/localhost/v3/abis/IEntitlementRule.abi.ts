export default [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "limit",
        "type": "uint256"
      }
    ],
    "name": "CheckOperationsLimitReaced",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint8",
        "name": "operationIndex",
        "type": "uint8"
      },
      {
        "internalType": "uint8",
        "name": "checkOperationsLength",
        "type": "uint8"
      }
    ],
    "name": "InvalidCheckOperationIndex",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint8",
        "name": "leftOperationIndex",
        "type": "uint8"
      },
      {
        "internalType": "uint8",
        "name": "currentOperationIndex",
        "type": "uint8"
      }
    ],
    "name": "InvalidLeftOperationIndex",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint8",
        "name": "operationIndex",
        "type": "uint8"
      },
      {
        "internalType": "uint8",
        "name": "logicalOperationsLength",
        "type": "uint8"
      }
    ],
    "name": "InvalidLogicalOperationIndex",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "enum IEntitlementRule.CombinedOperationType",
        "name": "opType",
        "type": "uint8"
      }
    ],
    "name": "InvalidOperationType",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint8",
        "name": "rightOperationIndex",
        "type": "uint8"
      },
      {
        "internalType": "uint8",
        "name": "currentOperationIndex",
        "type": "uint8"
      }
    ],
    "name": "InvalidRightOperationIndex",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "limit",
        "type": "uint256"
      }
    ],
    "name": "LogicalOperationLimitReached",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "limit",
        "type": "uint256"
      }
    ],
    "name": "OperationsLimitReached",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "getCheckOperations",
    "outputs": [
      {
        "components": [
          {
            "internalType": "enum IEntitlementRule.CheckOperationType",
            "name": "opType",
            "type": "uint8"
          },
          {
            "internalType": "uint256",
            "name": "chainId",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "contractAddress",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "threshold",
            "type": "uint256"
          }
        ],
        "internalType": "struct IEntitlementRule.CheckOperation[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getLogicalOperations",
    "outputs": [
      {
        "components": [
          {
            "internalType": "enum IEntitlementRule.LogicalOperationType",
            "name": "logOpType",
            "type": "uint8"
          },
          {
            "internalType": "uint8",
            "name": "leftOperationIndex",
            "type": "uint8"
          },
          {
            "internalType": "uint8",
            "name": "rightOperationIndex",
            "type": "uint8"
          }
        ],
        "internalType": "struct IEntitlementRule.LogicalOperation[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getOperations",
    "outputs": [
      {
        "components": [
          {
            "internalType": "enum IEntitlementRule.CombinedOperationType",
            "name": "opType",
            "type": "uint8"
          },
          {
            "internalType": "uint8",
            "name": "index",
            "type": "uint8"
          }
        ],
        "internalType": "struct IEntitlementRule.Operation[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const
