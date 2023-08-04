export default [
  {
    "inputs": [],
    "name": "Factory__FailedDeployment",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "GateFacetService__NotAllowed",
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
    "name": "Ownable__NotOwner",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Pausable__Paused",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ReentrancyGuard__ReentrantCall",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TownArchitectService__InvalidAddress",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TownArchitectService__InvalidNetworkId",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TownArchitectService__InvalidStringLength",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TownArchitectService__NotContract",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "Paused",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "town",
        "type": "address"
      }
    ],
    "name": "TownCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "Unpaused",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "townId",
        "type": "string"
      }
    ],
    "name": "computeTown",
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
        "components": [
          {
            "internalType": "string",
            "name": "id",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "metadata",
            "type": "string"
          },
          {
            "components": [
              {
                "internalType": "string",
                "name": "name",
                "type": "string"
              },
              {
                "internalType": "string[]",
                "name": "permissions",
                "type": "string[]"
              }
            ],
            "internalType": "struct ITownArchitectStructs.RoleInfo",
            "name": "everyoneEntitlement",
            "type": "tuple"
          },
          {
            "components": [
              {
                "components": [
                  {
                    "internalType": "string",
                    "name": "name",
                    "type": "string"
                  },
                  {
                    "internalType": "string[]",
                    "name": "permissions",
                    "type": "string[]"
                  }
                ],
                "internalType": "struct ITownArchitectStructs.RoleInfo",
                "name": "role",
                "type": "tuple"
              },
              {
                "components": [
                  {
                    "internalType": "address",
                    "name": "contractAddress",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "quantity",
                    "type": "uint256"
                  },
                  {
                    "internalType": "bool",
                    "name": "isSingleToken",
                    "type": "bool"
                  },
                  {
                    "internalType": "uint256[]",
                    "name": "tokenIds",
                    "type": "uint256[]"
                  }
                ],
                "internalType": "struct ITokenEntitlement.ExternalToken[]",
                "name": "tokens",
                "type": "tuple[]"
              },
              {
                "internalType": "address[]",
                "name": "users",
                "type": "address[]"
              }
            ],
            "internalType": "struct ITownArchitectStructs.MemberEntitlement",
            "name": "memberEntitlement",
            "type": "tuple"
          },
          {
            "components": [
              {
                "internalType": "string",
                "name": "id",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "metadata",
                "type": "string"
              }
            ],
            "internalType": "struct ITownArchitectStructs.ChannelInfo",
            "name": "channel",
            "type": "tuple"
          }
        ],
        "internalType": "struct ITownArchitectStructs.TownInfo",
        "name": "townInfo",
        "type": "tuple"
      }
    ],
    "name": "createTown",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "quantity",
        "type": "uint256"
      }
    ],
    "name": "gateByToken",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "townId",
        "type": "string"
      }
    ],
    "name": "getTokenIdByTownId",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTownArchitectImplementations",
    "outputs": [
      {
        "internalType": "address",
        "name": "townToken",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "userEntitlementImplementation",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "tokenEntitlementImplementation",
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
        "name": "townId",
        "type": "string"
      }
    ],
    "name": "getTownById",
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
        "internalType": "address",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "isTokenGated",
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
        "name": "townToken",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "userEntitlementImplementation",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "tokenEntitlementImplementation",
        "type": "address"
      }
    ],
    "name": "setTownArchitectImplementations",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "ungateByToken",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const
