export default [
  {
    "type": "function",
    "name": "getCheckOperations",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "tuple[]",
        "internalType": "struct IEntitlementRule.CheckOperation[]",
        "components": [
          {
            "name": "opType",
            "type": "uint8",
            "internalType": "enum IEntitlementRule.CheckOperationType"
          },
          {
            "name": "chainId",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "contractAddress",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "threshold",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getLogicalOperations",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "tuple[]",
        "internalType": "struct IEntitlementRule.LogicalOperation[]",
        "components": [
          {
            "name": "logOpType",
            "type": "uint8",
            "internalType": "enum IEntitlementRule.LogicalOperationType"
          },
          {
            "name": "leftOperationIndex",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "rightOperationIndex",
            "type": "uint8",
            "internalType": "uint8"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getOperations",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "tuple[]",
        "internalType": "struct IEntitlementRule.Operation[]",
        "components": [
          {
            "name": "opType",
            "type": "uint8",
            "internalType": "enum IEntitlementRule.CombinedOperationType"
          },
          {
            "name": "index",
            "type": "uint8",
            "internalType": "uint8"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "error",
    "name": "CheckOperationsLimitReaced",
    "inputs": [
      {
        "name": "limit",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "InvalidCheckOperationIndex",
    "inputs": [
      {
        "name": "operationIndex",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "checkOperationsLength",
        "type": "uint8",
        "internalType": "uint8"
      }
    ]
  },
  {
    "type": "error",
    "name": "InvalidLeftOperationIndex",
    "inputs": [
      {
        "name": "leftOperationIndex",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "currentOperationIndex",
        "type": "uint8",
        "internalType": "uint8"
      }
    ]
  },
  {
    "type": "error",
    "name": "InvalidLogicalOperationIndex",
    "inputs": [
      {
        "name": "operationIndex",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "logicalOperationsLength",
        "type": "uint8",
        "internalType": "uint8"
      }
    ]
  },
  {
    "type": "error",
    "name": "InvalidOperationType",
    "inputs": [
      {
        "name": "opType",
        "type": "uint8",
        "internalType": "enum IEntitlementRule.CombinedOperationType"
      }
    ]
  },
  {
    "type": "error",
    "name": "InvalidRightOperationIndex",
    "inputs": [
      {
        "name": "rightOperationIndex",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "currentOperationIndex",
        "type": "uint8",
        "internalType": "uint8"
      }
    ]
  },
  {
    "type": "error",
    "name": "LogicalOperationLimitReached",
    "inputs": [
      {
        "name": "limit",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "OperationsLimitReached",
    "inputs": [
      {
        "name": "limit",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  }
] as const
