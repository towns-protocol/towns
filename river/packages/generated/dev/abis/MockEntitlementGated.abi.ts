export default [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "checker",
        "type": "address",
        "internalType": "contract IEntitlementChecker"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getRuleData",
    "inputs": [
      {
        "name": "transactionId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct IRuleEntitlement.RuleData",
        "components": [
          {
            "name": "operations",
            "type": "tuple[]",
            "internalType": "struct IRuleEntitlement.Operation[]",
            "components": [
              {
                "name": "opType",
                "type": "uint8",
                "internalType": "enum IRuleEntitlement.CombinedOperationType"
              },
              {
                "name": "index",
                "type": "uint8",
                "internalType": "uint8"
              }
            ]
          },
          {
            "name": "checkOperations",
            "type": "tuple[]",
            "internalType": "struct IRuleEntitlement.CheckOperation[]",
            "components": [
              {
                "name": "opType",
                "type": "uint8",
                "internalType": "enum IRuleEntitlement.CheckOperationType"
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
          },
          {
            "name": "logicalOperations",
            "type": "tuple[]",
            "internalType": "struct IRuleEntitlement.LogicalOperation[]",
            "components": [
              {
                "name": "logOpType",
                "type": "uint8",
                "internalType": "enum IRuleEntitlement.LogicalOperationType"
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
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "postEntitlementCheckResult",
    "inputs": [
      {
        "name": "transactionId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "result",
        "type": "uint8",
        "internalType": "enum IEntitlementGatedBase.NodeVoteStatus"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "requestEntitlementCheck",
    "inputs": [
      {
        "name": "ruleData",
        "type": "tuple",
        "internalType": "struct IRuleEntitlement.RuleData",
        "components": [
          {
            "name": "operations",
            "type": "tuple[]",
            "internalType": "struct IRuleEntitlement.Operation[]",
            "components": [
              {
                "name": "opType",
                "type": "uint8",
                "internalType": "enum IRuleEntitlement.CombinedOperationType"
              },
              {
                "name": "index",
                "type": "uint8",
                "internalType": "uint8"
              }
            ]
          },
          {
            "name": "checkOperations",
            "type": "tuple[]",
            "internalType": "struct IRuleEntitlement.CheckOperation[]",
            "components": [
              {
                "name": "opType",
                "type": "uint8",
                "internalType": "enum IRuleEntitlement.CheckOperationType"
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
          },
          {
            "name": "logicalOperations",
            "type": "tuple[]",
            "internalType": "struct IRuleEntitlement.LogicalOperation[]",
            "components": [
              {
                "name": "logOpType",
                "type": "uint8",
                "internalType": "enum IRuleEntitlement.LogicalOperationType"
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
        ]
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "EntitlementCheckResultPosted",
    "inputs": [
      {
        "name": "transactionId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "result",
        "type": "uint8",
        "indexed": false,
        "internalType": "enum IEntitlementGatedBase.NodeVoteStatus"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "EntitlementGated_InvalidAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EntitlementGated_NodeAlreadyVoted",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EntitlementGated_NodeNotFound",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EntitlementGated_TransactionAlreadyCompleted",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EntitlementGated_TransactionAlreadyRegistered",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EntitlementGated_TransactionNotRegistered",
    "inputs": []
  }
] as const
