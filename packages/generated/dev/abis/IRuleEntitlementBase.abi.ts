export default [
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
        "internalType": "enum IRuleEntitlementBase.CombinedOperationType"
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
