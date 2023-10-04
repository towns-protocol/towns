export default [
  {
    "inputs": [],
    "name": "EntitlementChecker_InsufficientNumberOfNodes",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "EntitlementChecker_NodeAlreadyRegistered",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "EntitlementChecker_NodeNotRegistered",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "EntitlementGated_InvalidAddress",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "EntitlementGated_NodeAlreadyVoted",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "EntitlementGated_NodeNotFound",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "EntitlementGated_TransactionAlreadyCompleted",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "EntitlementGated_TransactionAlreadyRegistered",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "EntitlementGated_TransactionNotRegistered",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "callerAddress",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "transactionId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "address[]",
        "name": "selectedNodes",
        "type": "address[]"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "contractAddress",
        "type": "address"
      }
    ],
    "name": "EntitlementCheckRequested",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "transactionId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "enum IEntitlementGatedBase.NodeVoteStatus",
        "name": "result",
        "type": "uint8"
      }
    ],
    "name": "EntitlementCheckResultPosted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "string",
        "name": "err",
        "type": "string"
      }
    ],
    "name": "Log",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "value",
        "type": "address"
      }
    ],
    "name": "LogAddress",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address[]",
        "name": "value",
        "type": "address[]"
      }
    ],
    "name": "LogArray",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "bool[]",
        "name": "value",
        "type": "bool[]"
      }
    ],
    "name": "LogArray",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "bytes32[]",
        "name": "value",
        "type": "bytes32[]"
      }
    ],
    "name": "LogArray",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "int256[]",
        "name": "value",
        "type": "int256[]"
      }
    ],
    "name": "LogArray",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "string[]",
        "name": "value",
        "type": "string[]"
      }
    ],
    "name": "LogArray",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256[]",
        "name": "value",
        "type": "uint256[]"
      }
    ],
    "name": "LogArray",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "bytes",
        "name": "value",
        "type": "bytes"
      }
    ],
    "name": "LogBytes",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "value",
        "type": "bytes32"
      }
    ],
    "name": "LogBytes32",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "int256",
        "name": "value",
        "type": "int256"
      }
    ],
    "name": "LogInt256",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "string",
        "name": "key",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "value",
        "type": "address"
      }
    ],
    "name": "LogNamedAddress",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "string",
        "name": "key",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "address[]",
        "name": "value",
        "type": "address[]"
      }
    ],
    "name": "LogNamedArray",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "string",
        "name": "key",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "bool[]",
        "name": "value",
        "type": "bool[]"
      }
    ],
    "name": "LogNamedArray",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "string",
        "name": "key",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "bytes32[]",
        "name": "value",
        "type": "bytes32[]"
      }
    ],
    "name": "LogNamedArray",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "string",
        "name": "key",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "int256[]",
        "name": "value",
        "type": "int256[]"
      }
    ],
    "name": "LogNamedArray",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "string",
        "name": "key",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string[]",
        "name": "value",
        "type": "string[]"
      }
    ],
    "name": "LogNamedArray",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "string",
        "name": "key",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256[]",
        "name": "value",
        "type": "uint256[]"
      }
    ],
    "name": "LogNamedArray",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "string",
        "name": "key",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "bytes",
        "name": "value",
        "type": "bytes"
      }
    ],
    "name": "LogNamedBytes",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "string",
        "name": "key",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "value",
        "type": "bytes32"
      }
    ],
    "name": "LogNamedBytes32",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "string",
        "name": "key",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "int256",
        "name": "value",
        "type": "int256"
      }
    ],
    "name": "LogNamedInt256",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "string",
        "name": "key",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "value",
        "type": "string"
      }
    ],
    "name": "LogNamedString",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "string",
        "name": "key",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "LogNamedUint256",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "string",
        "name": "value",
        "type": "string"
      }
    ],
    "name": "LogString",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "LogUint256",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "nodeAddress",
        "type": "address"
      }
    ],
    "name": "NodeRegistered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "nodeAddress",
        "type": "address"
      }
    ],
    "name": "NodeUnregistered",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "IS_TEST",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "NATIVE_TOKEN",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "s1",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "s2",
        "type": "string"
      }
    ],
    "name": "_isEqual",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "s1",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "s2",
        "type": "bytes32"
      }
    ],
    "name": "_isEqual",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "checker",
    "outputs": [
      {
        "internalType": "contract IEntitlementChecker",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "failed",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "gated",
    "outputs": [
      {
        "internalType": "contract MockEntitlementGated",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "nodeKeys",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "setUp",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "test_deleteTransaction",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "test_postEntitlementCheckResult_failing",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "test_postEntitlementCheckResult_passing",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "test_postEntitlementCheckResult_revert_nodeAlreadyVoted",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "test_postEntitlementCheckResult_revert_nodeNotFound",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "test_postEntitlementCheckResult_revert_transactionNotRegistered",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "test_requestEntitlementCheck",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "test_requestEntitlementCheck_revert_alreadyRegistered",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const
