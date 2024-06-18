export default [
  {
    "type": "function",
    "name": "getClaimAddressForOperator",
    "inputs": [
      {
        "name": "operator",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getCommissionRate",
    "inputs": [
      {
        "name": "operator",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getOperatorStatus",
    "inputs": [
      {
        "name": "operator",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "enum NodeOperatorStatus"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isOperator",
    "inputs": [
      {
        "name": "operator",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "registerOperator",
    "inputs": [
      {
        "name": "claimer",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setClaimAddressForOperator",
    "inputs": [
      {
        "name": "claimer",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "operator",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setCommissionRate",
    "inputs": [
      {
        "name": "commission",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setOperatorStatus",
    "inputs": [
      {
        "name": "operator",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "newStatus",
        "type": "uint8",
        "internalType": "enum NodeOperatorStatus"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "OperatorClaimAddressChanged",
    "inputs": [
      {
        "name": "operator",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "claimAddress",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OperatorCommissionChanged",
    "inputs": [
      {
        "name": "operator",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "commission",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OperatorRegistered",
    "inputs": [
      {
        "name": "operator",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OperatorStatusChanged",
    "inputs": [
      {
        "name": "operator",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newStatus",
        "type": "uint8",
        "indexed": true,
        "internalType": "enum NodeOperatorStatus"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "NodeOperator__AlreadyDelegated",
    "inputs": [
      {
        "name": "operator",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "NodeOperator__AlreadyRegistered",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NodeOperator__ClaimAddressNotChanged",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NodeOperator__InvalidAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NodeOperator__InvalidCommissionRate",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NodeOperator__InvalidOperator",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NodeOperator__InvalidSpace",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NodeOperator__InvalidStakeRequirement",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NodeOperator__InvalidStatusTransition",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NodeOperator__NotClaimer",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NodeOperator__NotEnoughStake",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NodeOperator__NotRegistered",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NodeOperator__NotTransferable",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NodeOperator__StatusNotChanged",
    "inputs": []
  }
] as const
