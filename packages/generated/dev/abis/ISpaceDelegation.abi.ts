export default [
  {
    "type": "function",
    "name": "addSpaceDelegation",
    "inputs": [
      {
        "name": "space",
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
    "name": "getSpaceDelegation",
    "inputs": [
      {
        "name": "space",
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
    "name": "getSpaceDelegationsByOperator",
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
        "type": "address[]",
        "internalType": "address[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getSpaceFactory",
    "inputs": [],
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
    "name": "getTotalDelegation",
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
    "name": "removeSpaceDelegation",
    "inputs": [
      {
        "name": "space",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setSpaceFactory",
    "inputs": [
      {
        "name": "spaceFactory",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "RiverTokenChanged",
    "inputs": [
      {
        "name": "riverToken",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "SpaceDelegatedToOperator",
    "inputs": [
      {
        "name": "space",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
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
    "name": "SpaceFactoryChanged",
    "inputs": [
      {
        "name": "spaceFactory",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "SpaceDelegation__AlreadyDelegated",
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
    "name": "SpaceDelegation__InvalidAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SpaceDelegation__InvalidOperator",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SpaceDelegation__InvalidSpace",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SpaceDelegation__InvalidStakeRequirement",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SpaceDelegation__NotDelegated",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SpaceDelegation__NotSpaceMember",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SpaceDelegation__NotSpaceOwner",
    "inputs": []
  }
] as const
