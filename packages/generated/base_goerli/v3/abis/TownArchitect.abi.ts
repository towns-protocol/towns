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
    "name": "Ownable__ZeroAddress",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Pausable__NotPaused",
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
    "name": "TownArchitect__InvalidAddress",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TownArchitect__InvalidNetworkId",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TownArchitect__InvalidStringLength",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TownArchitect__NotContract",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Validator__InvalidAddress",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Validator__InvalidStringLength",
    "type": "error"
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
        "name": "townCreator",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "townId",
        "type": "uint256"
      },
      {
        "indexed": false,
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
        "internalType": "address",
        "name": "townOwner",
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
      },
      {
        "internalType": "address",
        "name": "trustedForwarder",
        "type": "address"
      }
    ],
    "name": "__TownArchitect_init",
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
                "internalType": "string",
                "name": "symbol",
                "type": "string"
              },
              {
                "internalType": "uint256",
                "name": "price",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "limit",
                "type": "uint256"
              },
              {
                "internalType": "uint64",
                "name": "duration",
                "type": "uint64"
              },
              {
                "internalType": "address",
                "name": "currency",
                "type": "address"
              },
              {
                "internalType": "address",
                "name": "feeRecipient",
                "type": "address"
              }
            ],
            "internalType": "struct IMembershipBase.MembershipInfo",
            "name": "settings",
            "type": "tuple"
          },
          {
            "components": [
              {
                "internalType": "bool",
                "name": "everyone",
                "type": "bool"
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
            "internalType": "struct ITownArchitectBase.MembershipRequirements",
            "name": "requirements",
            "type": "tuple"
          },
          {
            "internalType": "string[]",
            "name": "permissions",
            "type": "string[]"
          }
        ],
        "internalType": "struct ITownArchitectBase.Membership",
        "name": "membership",
        "type": "tuple"
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
            "name": "name",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "uri",
            "type": "string"
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
                    "internalType": "string",
                    "name": "symbol",
                    "type": "string"
                  },
                  {
                    "internalType": "uint256",
                    "name": "price",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "limit",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint64",
                    "name": "duration",
                    "type": "uint64"
                  },
                  {
                    "internalType": "address",
                    "name": "currency",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "feeRecipient",
                    "type": "address"
                  }
                ],
                "internalType": "struct IMembershipBase.MembershipInfo",
                "name": "settings",
                "type": "tuple"
              },
              {
                "components": [
                  {
                    "internalType": "bool",
                    "name": "everyone",
                    "type": "bool"
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
                "internalType": "struct ITownArchitectBase.MembershipRequirements",
                "name": "requirements",
                "type": "tuple"
              },
              {
                "internalType": "string[]",
                "name": "permissions",
                "type": "string[]"
              }
            ],
            "internalType": "struct ITownArchitectBase.Membership",
            "name": "membership",
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
            "internalType": "struct ITownArchitectBase.ChannelInfo",
            "name": "channel",
            "type": "tuple"
          }
        ],
        "internalType": "struct ITownArchitectBase.TownInfo",
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
