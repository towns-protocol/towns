export default [
  {
    "type": "function",
    "name": "__DropFacet_init",
    "inputs": [
      {
        "name": "rewardsDistribution",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "addClaimCondition",
    "inputs": [
      {
        "name": "condition",
        "type": "tuple",
        "internalType": "struct IDropFacetBase.ClaimCondition",
        "components": [
          {
            "name": "currency",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "startTimestamp",
            "type": "uint40",
            "internalType": "uint40"
          },
          {
            "name": "endTimestamp",
            "type": "uint40",
            "internalType": "uint40"
          },
          {
            "name": "penaltyBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "maxClaimableSupply",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "supplyClaimed",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "merkleRoot",
            "type": "bytes32",
            "internalType": "bytes32"
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "claimAndStake",
    "inputs": [
      {
        "name": "claim",
        "type": "tuple",
        "internalType": "struct IDropFacetBase.Claim",
        "components": [
          {
            "name": "conditionId",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "account",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "quantity",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "proof",
            "type": "bytes32[]",
            "internalType": "bytes32[]"
          }
        ]
      },
      {
        "name": "delegatee",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "deadline",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "signature",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "claimWithPenalty",
    "inputs": [
      {
        "name": "claim",
        "type": "tuple",
        "internalType": "struct IDropFacetBase.Claim",
        "components": [
          {
            "name": "conditionId",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "account",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "quantity",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "proof",
            "type": "bytes32[]",
            "internalType": "bytes32[]"
          }
        ]
      },
      {
        "name": "expectedPenaltyBps",
        "type": "uint16",
        "internalType": "uint16"
      }
    ],
    "outputs": [
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getActiveClaimConditionId",
    "inputs": [],
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
    "name": "getClaimConditionById",
    "inputs": [
      {
        "name": "conditionId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "condition",
        "type": "tuple",
        "internalType": "struct IDropFacetBase.ClaimCondition",
        "components": [
          {
            "name": "currency",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "startTimestamp",
            "type": "uint40",
            "internalType": "uint40"
          },
          {
            "name": "endTimestamp",
            "type": "uint40",
            "internalType": "uint40"
          },
          {
            "name": "penaltyBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "maxClaimableSupply",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "supplyClaimed",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "merkleRoot",
            "type": "bytes32",
            "internalType": "bytes32"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getClaimConditions",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "tuple[]",
        "internalType": "struct IDropFacetBase.ClaimCondition[]",
        "components": [
          {
            "name": "currency",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "startTimestamp",
            "type": "uint40",
            "internalType": "uint40"
          },
          {
            "name": "endTimestamp",
            "type": "uint40",
            "internalType": "uint40"
          },
          {
            "name": "penaltyBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "maxClaimableSupply",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "supplyClaimed",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "merkleRoot",
            "type": "bytes32",
            "internalType": "bytes32"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getDepositIdByWallet",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "conditionId",
        "type": "uint256",
        "internalType": "uint256"
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
    "name": "getSupplyClaimedByWallet",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "conditionId",
        "type": "uint256",
        "internalType": "uint256"
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
    "name": "setClaimConditions",
    "inputs": [
      {
        "name": "conditions",
        "type": "tuple[]",
        "internalType": "struct IDropFacetBase.ClaimCondition[]",
        "components": [
          {
            "name": "currency",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "startTimestamp",
            "type": "uint40",
            "internalType": "uint40"
          },
          {
            "name": "endTimestamp",
            "type": "uint40",
            "internalType": "uint40"
          },
          {
            "name": "penaltyBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "maxClaimableSupply",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "supplyClaimed",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "merkleRoot",
            "type": "bytes32",
            "internalType": "bytes32"
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "DropFacet_ClaimConditionAdded",
    "inputs": [
      {
        "name": "condition",
        "type": "tuple",
        "indexed": false,
        "internalType": "struct IDropFacetBase.ClaimCondition",
        "components": [
          {
            "name": "currency",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "startTimestamp",
            "type": "uint40",
            "internalType": "uint40"
          },
          {
            "name": "endTimestamp",
            "type": "uint40",
            "internalType": "uint40"
          },
          {
            "name": "penaltyBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "maxClaimableSupply",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "supplyClaimed",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "merkleRoot",
            "type": "bytes32",
            "internalType": "bytes32"
          }
        ]
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "DropFacet_ClaimConditionsUpdated",
    "inputs": [
      {
        "name": "conditions",
        "type": "tuple[]",
        "indexed": false,
        "internalType": "struct IDropFacetBase.ClaimCondition[]",
        "components": [
          {
            "name": "currency",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "startTimestamp",
            "type": "uint40",
            "internalType": "uint40"
          },
          {
            "name": "endTimestamp",
            "type": "uint40",
            "internalType": "uint40"
          },
          {
            "name": "penaltyBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "maxClaimableSupply",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "supplyClaimed",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "merkleRoot",
            "type": "bytes32",
            "internalType": "bytes32"
          }
        ]
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "DropFacet_Claimed_And_Staked",
    "inputs": [
      {
        "name": "conditionId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "claimer",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "DropFacet_Claimed_WithPenalty",
    "inputs": [
      {
        "name": "conditionId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "claimer",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
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
    "type": "error",
    "name": "DropFacet__AlreadyClaimed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "DropFacet__CannotSetClaimConditions",
    "inputs": []
  },
  {
    "type": "error",
    "name": "DropFacet__ClaimConditionsNotInAscendingOrder",
    "inputs": []
  },
  {
    "type": "error",
    "name": "DropFacet__ClaimHasEnded",
    "inputs": []
  },
  {
    "type": "error",
    "name": "DropFacet__ClaimHasNotStarted",
    "inputs": []
  },
  {
    "type": "error",
    "name": "DropFacet__CurrencyNotSet",
    "inputs": []
  },
  {
    "type": "error",
    "name": "DropFacet__ExceedsMaxClaimableSupply",
    "inputs": []
  },
  {
    "type": "error",
    "name": "DropFacet__InsufficientBalance",
    "inputs": []
  },
  {
    "type": "error",
    "name": "DropFacet__InvalidProof",
    "inputs": []
  },
  {
    "type": "error",
    "name": "DropFacet__MerkleRootNotSet",
    "inputs": []
  },
  {
    "type": "error",
    "name": "DropFacet__NoActiveClaimCondition",
    "inputs": []
  },
  {
    "type": "error",
    "name": "DropFacet__QuantityMustBeGreaterThanZero",
    "inputs": []
  },
  {
    "type": "error",
    "name": "DropFacet__RewardsDistributionNotSet",
    "inputs": []
  },
  {
    "type": "error",
    "name": "DropFacet__UnexpectedPenaltyBps",
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
  }
] as const
