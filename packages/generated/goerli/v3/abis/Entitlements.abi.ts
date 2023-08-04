export default [
  {
    "inputs": [],
    "name": "EntitlementsService__EntitlementAlreadyExists",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "EntitlementsService__EntitlementDoesNotExist",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "EntitlementsService__ImmutableEntitlement",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "EntitlementsService__InvalidEntitlementAddress",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "EntitlementsService__InvalidEntitlementInterface",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "TokenOwnable__NotOwner",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "entitlement",
        "type": "address"
      }
    ],
    "name": "addEntitlement",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address[]",
        "name": "entitlements",
        "type": "address[]"
      }
    ],
    "name": "addImmutableEntitlements",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "entitlement",
        "type": "address"
      }
    ],
    "name": "getEntitlement",
    "outputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "name",
            "type": "string"
          },
          {
            "internalType": "address",
            "name": "moduleAddress",
            "type": "address"
          },
          {
            "internalType": "string",
            "name": "moduleType",
            "type": "string"
          },
          {
            "internalType": "bool",
            "name": "isImmutable",
            "type": "bool"
          }
        ],
        "internalType": "struct IEntitlementsStructs.Entitlement",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getEntitlements",
    "outputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "name",
            "type": "string"
          },
          {
            "internalType": "address",
            "name": "moduleAddress",
            "type": "address"
          },
          {
            "internalType": "string",
            "name": "moduleType",
            "type": "string"
          },
          {
            "internalType": "bool",
            "name": "isImmutable",
            "type": "bool"
          }
        ],
        "internalType": "struct IEntitlementsStructs.Entitlement[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "channelId",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "permission",
        "type": "string"
      }
    ],
    "name": "isEntitledToChannel",
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
        "name": "user",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "permission",
        "type": "string"
      }
    ],
    "name": "isEntitledToTown",
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
        "name": "entitlement",
        "type": "address"
      }
    ],
    "name": "removeEntitlement",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const
