export default [
  {
    "type": "function",
    "name": "expiresAt",
    "inputs": [
      {
        "name": "tokenId",
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
    "name": "getMembershipCurrency",
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
    "name": "getMembershipDuration",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getMembershipFreeAllocation",
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
    "name": "getMembershipImage",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "string",
        "internalType": "string"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getMembershipLimit",
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
    "name": "getMembershipPrice",
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
    "name": "getMembershipPricingModule",
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
    "name": "getMembershipRenewalPrice",
    "inputs": [
      {
        "name": "tokenId",
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
    "name": "getProtocolFee",
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
    "name": "joinSpace",
    "inputs": [
      {
        "name": "action",
        "type": "uint8",
        "internalType": "enum IMembershipBase.JoinType"
      },
      {
        "name": "data",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "joinSpace",
    "inputs": [
      {
        "name": "receiver",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "joinSpaceWithReferral",
    "inputs": [
      {
        "name": "receiver",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "referral",
        "type": "tuple",
        "internalType": "struct IMembershipBase.ReferralTypes",
        "components": [
          {
            "name": "partner",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "userReferral",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "referralCode",
            "type": "string",
            "internalType": "string"
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "renewMembership",
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "revenue",
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
    "name": "setMembershipDuration",
    "inputs": [
      {
        "name": "duration",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setMembershipFreeAllocation",
    "inputs": [
      {
        "name": "newAllocation",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setMembershipImage",
    "inputs": [
      {
        "name": "newImage",
        "type": "string",
        "internalType": "string"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setMembershipLimit",
    "inputs": [
      {
        "name": "newLimit",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setMembershipPrice",
    "inputs": [
      {
        "name": "newPrice",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setMembershipPricingModule",
    "inputs": [
      {
        "name": "pricingModule",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "Approval",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "approved",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ApprovalForAll",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "operator",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "approved",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ConsecutiveTransfer",
    "inputs": [
      {
        "name": "fromTokenId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "toTokenId",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "from",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "to",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "DefaultBpsFeeUpdated",
    "inputs": [
      {
        "name": "defaultBpsFee",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
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
    "name": "MaxBpsFeeUpdated",
    "inputs": [
      {
        "name": "maxBpsFee",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MaxPartnerFeeSet",
    "inputs": [
      {
        "name": "fee",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MembershipCurrencyUpdated",
    "inputs": [
      {
        "name": "currency",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MembershipFeeRecipientUpdated",
    "inputs": [
      {
        "name": "recipient",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MembershipFreeAllocationUpdated",
    "inputs": [
      {
        "name": "allocation",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MembershipLimitUpdated",
    "inputs": [
      {
        "name": "limit",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MembershipPriceUpdated",
    "inputs": [
      {
        "name": "price",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MembershipTokenIssued",
    "inputs": [
      {
        "name": "recipient",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MembershipTokenRejected",
    "inputs": [
      {
        "name": "recipient",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MembershipWithdrawal",
    "inputs": [
      {
        "name": "recipient",
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
    "name": "PartnerRegistered",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PartnerRemoved",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PartnerUpdated",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PermissionsAddedToChannelRole",
    "inputs": [
      {
        "name": "updater",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "roleId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "channelId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PermissionsRemovedFromChannelRole",
    "inputs": [
      {
        "name": "updater",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "roleId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "channelId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PermissionsUpdatedForChannelRole",
    "inputs": [
      {
        "name": "updater",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "roleId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "channelId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Prepay__Prepaid",
    "inputs": [
      {
        "name": "supply",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ReferralRegistered",
    "inputs": [
      {
        "name": "referralCode",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      },
      {
        "name": "basisPoints",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "recipient",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ReferralRemoved",
    "inputs": [
      {
        "name": "referralCode",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ReferralUpdated",
    "inputs": [
      {
        "name": "referralCode",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      },
      {
        "name": "basisPoints",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "recipient",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RegistryFeeSet",
    "inputs": [
      {
        "name": "fee",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RoleCreated",
    "inputs": [
      {
        "name": "creator",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "roleId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RoleRemoved",
    "inputs": [
      {
        "name": "remover",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "roleId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RoleUpdated",
    "inputs": [
      {
        "name": "updater",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "roleId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "SubscriptionUpdate",
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "expiration",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Transfer",
    "inputs": [
      {
        "name": "from",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "to",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "ApprovalCallerNotOwnerNorApproved",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ApprovalQueryForNonexistentToken",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BalanceQueryForZeroAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Dispatcher__TransactionAlreadyExists",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ERC5643__DurationZero",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ERC5643__InvalidTokenId",
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "ERC5643__NotApprovedOrOwner",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ERC5643__SubscriptionNotRenewable",
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "EntitlementGated_InvalidAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EntitlementGated_InvalidEntitlement",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EntitlementGated_InvalidValue",
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
    "name": "EntitlementGated_OnlyEntitlementChecker",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EntitlementGated_RequestIdNotFound",
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
    "name": "Entitlement__NotMember",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Entitlement__ValueAlreadyExists",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Initializable_InInitializingState",
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
    "name": "Membership__AlreadyMember",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Membership__Banned",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Membership__InsufficientAllowance",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Membership__InsufficientPayment",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Membership__InvalidAction",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Membership__InvalidAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Membership__InvalidCurrency",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Membership__InvalidDuration",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Membership__InvalidFeeRecipient",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Membership__InvalidFreeAllocation",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Membership__InvalidLimit",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Membership__InvalidMaxSupply",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Membership__InvalidPayment",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Membership__InvalidPrice",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Membership__InvalidPricingModule",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Membership__InvalidTokenId",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Membership__InvalidTransactionType",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Membership__MaxSupplyReached",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Membership__NotExpired",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Membership__PriceTooLow",
    "inputs": []
  },
  {
    "type": "error",
    "name": "MintERC2309QuantityExceedsLimit",
    "inputs": []
  },
  {
    "type": "error",
    "name": "MintToZeroAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "MintZeroQuantity",
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
    "name": "OwnerQueryForNonexistentToken",
    "inputs": []
  },
  {
    "type": "error",
    "name": "OwnershipNotInitializedForExtraData",
    "inputs": []
  },
  {
    "type": "error",
    "name": "PartnerRegistry__InvalidPartnerFee",
    "inputs": [
      {
        "name": "fee",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "PartnerRegistry__InvalidRecipient",
    "inputs": []
  },
  {
    "type": "error",
    "name": "PartnerRegistry__NotPartnerAccount",
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
    "name": "PartnerRegistry__PartnerAlreadyRegistered",
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
    "name": "PartnerRegistry__PartnerNotActive",
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
    "name": "PartnerRegistry__PartnerNotRegistered",
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
    "name": "PartnerRegistry__RegistryFeeNotPaid",
    "inputs": [
      {
        "name": "fee",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "Prepay__InvalidAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Prepay__InvalidAmount",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Prepay__InvalidMembership",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Prepay__InvalidSupplyAmount",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Reentrancy",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Referrals__InvalidBasisPoints",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Referrals__InvalidBpsFee",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Referrals__InvalidRecipient",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Referrals__InvalidReferralCode",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Referrals__ReferralAlreadyExists",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Roles__EntitlementAlreadyExists",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Roles__EntitlementDoesNotExist",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Roles__InvalidEntitlementAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Roles__InvalidPermission",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Roles__PermissionAlreadyExists",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Roles__PermissionDoesNotExist",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Roles__RoleDoesNotExist",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Roles__RoleIsImmutable",
    "inputs": []
  },
  {
    "type": "error",
    "name": "TransferCallerNotOwnerNorApproved",
    "inputs": []
  },
  {
    "type": "error",
    "name": "TransferFromIncorrectOwner",
    "inputs": []
  },
  {
    "type": "error",
    "name": "TransferToNonERC721ReceiverImplementer",
    "inputs": []
  },
  {
    "type": "error",
    "name": "TransferToZeroAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "URIQueryForNonexistentToken",
    "inputs": []
  }
] as const
