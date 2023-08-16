export default [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "vault",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "delegate",
        "type": "address"
      }
    ],
    "name": "DelegateAlreadyExists",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Initializable_InInitializingState",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Initializable_NotInInitializingState",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Introspection_AlreadySupported",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Introspection_NotSupported",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "vault",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "delegate",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "value",
        "type": "bool"
      }
    ],
    "name": "DelegateForAll",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "version",
        "type": "uint32"
      }
    ],
    "name": "Initialized",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes4",
        "name": "interfaceId",
        "type": "bytes4"
      }
    ],
    "name": "InterfaceAdded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes4",
        "name": "interfaceId",
        "type": "bytes4"
      }
    ],
    "name": "InterfaceRemoved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "vault",
        "type": "address"
      }
    ],
    "name": "RevokeAllDelegates",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "vault",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "delegate",
        "type": "address"
      }
    ],
    "name": "RevokeDelegate",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "__Delegation_init",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "delegate",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "vault",
        "type": "address"
      }
    ],
    "name": "checkDelegateForAll",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "delegate",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "value",
        "type": "bool"
      }
    ],
    "name": "delegateForAll",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "vault",
        "type": "address"
      }
    ],
    "name": "getDelegatesForAll",
    "outputs": [
      {
        "internalType": "address[]",
        "name": "delegates",
        "type": "address[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "delegate",
        "type": "address"
      }
    ],
    "name": "getDelegationsByDelegate",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "vault",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "delegate",
            "type": "address"
          }
        ],
        "internalType": "struct IDelegationBase.DelegationInfo[]",
        "name": "info",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "revokeAllDelegates",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "delegate",
        "type": "address"
      }
    ],
    "name": "revokeDelegate",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const
