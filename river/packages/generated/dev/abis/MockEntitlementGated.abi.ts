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
    "name": "__EntitlementGated_init",
    "inputs": [
      {
        "name": "entitlementChecker",
        "type": "address",
        "internalType": "contract IEntitlementChecker"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getCrossChainEntitlementData",
    "inputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "roleId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct IEntitlementDataQueryableBase.EntitlementData",
        "components": [
          {
            "name": "entitlementType",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "entitlementData",
            "type": "bytes",
            "internalType": "bytes"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getRuleData",
    "inputs": [
      {
        "name": "roleId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct IRuleEntitlementBase.RuleData",
        "components": [
          {
            "name": "operations",
            "type": "tuple[]",
            "internalType": "struct IRuleEntitlementBase.Operation[]",
            "components": [
              {
                "name": "opType",
                "type": "uint8",
                "internalType": "enum IRuleEntitlementBase.CombinedOperationType"
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
            "internalType": "struct IRuleEntitlementBase.CheckOperation[]",
            "components": [
              {
                "name": "opType",
                "type": "uint8",
                "internalType": "enum IRuleEntitlementBase.CheckOperationType"
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
            "internalType": "struct IRuleEntitlementBase.LogicalOperation[]",
            "components": [
              {
                "name": "logOpType",
                "type": "uint8",
                "internalType": "enum IRuleEntitlementBase.LogicalOperationType"
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
    "name": "getRuleData",
    "inputs": [
      {
        "name": "transactionId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "roleId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct IRuleEntitlementBase.RuleData",
        "components": [
          {
            "name": "operations",
            "type": "tuple[]",
            "internalType": "struct IRuleEntitlementBase.Operation[]",
            "components": [
              {
                "name": "opType",
                "type": "uint8",
                "internalType": "enum IRuleEntitlementBase.CombinedOperationType"
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
            "internalType": "struct IRuleEntitlementBase.CheckOperation[]",
            "components": [
              {
                "name": "opType",
                "type": "uint8",
                "internalType": "enum IRuleEntitlementBase.CheckOperationType"
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
            "internalType": "struct IRuleEntitlementBase.LogicalOperation[]",
            "components": [
              {
                "name": "logOpType",
                "type": "uint8",
                "internalType": "enum IRuleEntitlementBase.LogicalOperationType"
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
    "name": "getRuleDataV2",
    "inputs": [
      {
        "name": "roleId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct IRuleEntitlementBase.RuleDataV2",
        "components": [
          {
            "name": "operations",
            "type": "tuple[]",
            "internalType": "struct IRuleEntitlementBase.Operation[]",
            "components": [
              {
                "name": "opType",
                "type": "uint8",
                "internalType": "enum IRuleEntitlementBase.CombinedOperationType"
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
            "internalType": "struct IRuleEntitlementBase.CheckOperationV2[]",
            "components": [
              {
                "name": "opType",
                "type": "uint8",
                "internalType": "enum IRuleEntitlementBase.CheckOperationType"
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
                "name": "params",
                "type": "bytes",
                "internalType": "bytes"
              }
            ]
          },
          {
            "name": "logicalOperations",
            "type": "tuple[]",
            "internalType": "struct IRuleEntitlementBase.LogicalOperation[]",
            "components": [
              {
                "name": "logOpType",
                "type": "uint8",
                "internalType": "enum IRuleEntitlementBase.LogicalOperationType"
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
        "name": "roleId",
        "type": "uint256",
        "internalType": "uint256"
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
        "name": "roleId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "ruleData",
        "type": "tuple",
        "internalType": "struct IRuleEntitlementBase.RuleData",
        "components": [
          {
            "name": "operations",
            "type": "tuple[]",
            "internalType": "struct IRuleEntitlementBase.Operation[]",
            "components": [
              {
                "name": "opType",
                "type": "uint8",
                "internalType": "enum IRuleEntitlementBase.CombinedOperationType"
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
            "internalType": "struct IRuleEntitlementBase.CheckOperation[]",
            "components": [
              {
                "name": "opType",
                "type": "uint8",
                "internalType": "enum IRuleEntitlementBase.CheckOperationType"
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
            "internalType": "struct IRuleEntitlementBase.LogicalOperation[]",
            "components": [
              {
                "name": "logOpType",
                "type": "uint8",
                "internalType": "enum IRuleEntitlementBase.LogicalOperationType"
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
    "type": "function",
    "name": "requestEntitlementCheckV2",
    "inputs": [
      {
        "name": "roleIds",
        "type": "uint256[]",
        "internalType": "uint256[]"
      },
      {
        "name": "ruleData",
        "type": "tuple",
        "internalType": "struct IRuleEntitlementBase.RuleDataV2",
        "components": [
          {
            "name": "operations",
            "type": "tuple[]",
            "internalType": "struct IRuleEntitlementBase.Operation[]",
            "components": [
              {
                "name": "opType",
                "type": "uint8",
                "internalType": "enum IRuleEntitlementBase.CombinedOperationType"
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
            "internalType": "struct IRuleEntitlementBase.CheckOperationV2[]",
            "components": [
              {
                "name": "opType",
                "type": "uint8",
                "internalType": "enum IRuleEntitlementBase.CheckOperationType"
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
                "name": "params",
                "type": "bytes",
                "internalType": "bytes"
              }
            ]
          },
          {
            "name": "logicalOperations",
            "type": "tuple[]",
            "internalType": "struct IRuleEntitlementBase.LogicalOperation[]",
            "components": [
              {
                "name": "logOpType",
                "type": "uint8",
                "internalType": "enum IRuleEntitlementBase.LogicalOperationType"
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
    "type": "event",
    "name": "Initialized",
    "inputs": [
      {
        "name": "version",
        "type": "uint32",
        "indexed": false,
        "internalType": "uint32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "InterfaceAdded",
    "inputs": [
      {
        "name": "interfaceId",
        "type": "bytes4",
        "indexed": true,
        "internalType": "bytes4"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "InterfaceRemoved",
    "inputs": [
      {
        "name": "interfaceId",
        "type": "bytes4",
        "indexed": true,
        "internalType": "bytes4"
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
    "name": "EntitlementGated_TransactionCheckAlreadyCompleted",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EntitlementGated_TransactionCheckAlreadyRegistered",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EntitlementGated_TransactionNotRegistered",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Initializable_InInitializingState",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Initializable_NotInInitializingState",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Introspection_AlreadySupported",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Introspection_NotSupported",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Reentrancy",
    "inputs": []
  }
] as const
