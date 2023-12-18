export default [
  {
    "type": "function",
    "name": "addEntitlementModule",
    "inputs": [
      {
        "name": "entitlement",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "addImmutableEntitlements",
    "inputs": [
      {
        "name": "entitlements",
        "type": "address[]",
        "internalType": "address[]"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getEntitlement",
    "inputs": [
      {
        "name": "entitlement",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct IEntitlementsManagerBase.Entitlement",
        "components": [
          {
            "name": "name",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "moduleAddress",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "moduleType",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "isImmutable",
            "type": "bool",
            "internalType": "bool"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getEntitlements",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "tuple[]",
        "internalType": "struct IEntitlementsManagerBase.Entitlement[]",
        "components": [
          {
            "name": "name",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "moduleAddress",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "moduleType",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "isImmutable",
            "type": "bool",
            "internalType": "bool"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isEntitledToChannel",
    "inputs": [
      {
        "name": "channelId",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "user",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "permission",
        "type": "string",
        "internalType": "string"
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
    "name": "isEntitledToTown",
    "inputs": [
      {
        "name": "user",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "permission",
        "type": "string",
        "internalType": "string"
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
    "name": "removeEntitlementModule",
    "inputs": [
      {
        "name": "entitlement",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "OwnershipTransferred",
    "inputs": [
      {
        "name": "previousOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Paused",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Unpaused",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "Entitlement__InvalidValue",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Entitlement__NotAllowed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Entitlement__ValueAlreadyExists",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EntitlementsService__EntitlementAlreadyExists",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EntitlementsService__EntitlementDoesNotExist",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EntitlementsService__ImmutableEntitlement",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EntitlementsService__InvalidEntitlementAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EntitlementsService__InvalidEntitlementInterface",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Ownable__NotOwner",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "Ownable__ZeroAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Pausable__NotPaused",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Pausable__Paused",
    "inputs": []
  }
] as const
