export default [
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
  }
] as const
