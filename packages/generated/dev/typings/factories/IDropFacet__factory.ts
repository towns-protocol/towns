/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Signer, utils } from "ethers";
import type { Provider } from "@ethersproject/providers";
import type { IDropFacet, IDropFacetInterface } from "../IDropFacet";

const _abi = [
  {
    type: "function",
    name: "addClaimCondition",
    inputs: [
      {
        name: "condition",
        type: "tuple",
        internalType: "struct DropGroup.ClaimCondition",
        components: [
          {
            name: "currency",
            type: "address",
            internalType: "address",
          },
          {
            name: "startTimestamp",
            type: "uint40",
            internalType: "uint40",
          },
          {
            name: "endTimestamp",
            type: "uint40",
            internalType: "uint40",
          },
          {
            name: "penaltyBps",
            type: "uint16",
            internalType: "uint16",
          },
          {
            name: "maxClaimableSupply",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "supplyClaimed",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "merkleRoot",
            type: "bytes32",
            internalType: "bytes32",
          },
        ],
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claimAndStake",
    inputs: [
      {
        name: "req",
        type: "tuple",
        internalType: "struct DropClaim.Claim",
        components: [
          {
            name: "conditionId",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "account",
            type: "address",
            internalType: "address",
          },
          {
            name: "recipient",
            type: "address",
            internalType: "address",
          },
          {
            name: "quantity",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "points",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "proof",
            type: "bytes32[]",
            internalType: "bytes32[]",
          },
        ],
      },
      {
        name: "delegatee",
        type: "address",
        internalType: "address",
      },
      {
        name: "deadline",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "signature",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claimWithPenalty",
    inputs: [
      {
        name: "req",
        type: "tuple",
        internalType: "struct DropClaim.Claim",
        components: [
          {
            name: "conditionId",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "account",
            type: "address",
            internalType: "address",
          },
          {
            name: "recipient",
            type: "address",
            internalType: "address",
          },
          {
            name: "quantity",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "points",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "proof",
            type: "bytes32[]",
            internalType: "bytes32[]",
          },
        ],
      },
      {
        name: "expectedPenaltyBps",
        type: "uint16",
        internalType: "uint16",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getActiveClaimConditionId",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getClaimConditionById",
    inputs: [
      {
        name: "conditionId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct DropGroup.ClaimCondition",
        components: [
          {
            name: "currency",
            type: "address",
            internalType: "address",
          },
          {
            name: "startTimestamp",
            type: "uint40",
            internalType: "uint40",
          },
          {
            name: "endTimestamp",
            type: "uint40",
            internalType: "uint40",
          },
          {
            name: "penaltyBps",
            type: "uint16",
            internalType: "uint16",
          },
          {
            name: "maxClaimableSupply",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "supplyClaimed",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "merkleRoot",
            type: "bytes32",
            internalType: "bytes32",
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getClaimConditions",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        internalType: "struct DropGroup.ClaimCondition[]",
        components: [
          {
            name: "currency",
            type: "address",
            internalType: "address",
          },
          {
            name: "startTimestamp",
            type: "uint40",
            internalType: "uint40",
          },
          {
            name: "endTimestamp",
            type: "uint40",
            internalType: "uint40",
          },
          {
            name: "penaltyBps",
            type: "uint16",
            internalType: "uint16",
          },
          {
            name: "maxClaimableSupply",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "supplyClaimed",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "merkleRoot",
            type: "bytes32",
            internalType: "bytes32",
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getDepositIdByWallet",
    inputs: [
      {
        name: "account",
        type: "address",
        internalType: "address",
      },
      {
        name: "conditionId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getSupplyClaimedByWallet",
    inputs: [
      {
        name: "account",
        type: "address",
        internalType: "address",
      },
      {
        name: "conditionId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "setClaimConditions",
    inputs: [
      {
        name: "conditions",
        type: "tuple[]",
        internalType: "struct DropGroup.ClaimCondition[]",
        components: [
          {
            name: "currency",
            type: "address",
            internalType: "address",
          },
          {
            name: "startTimestamp",
            type: "uint40",
            internalType: "uint40",
          },
          {
            name: "endTimestamp",
            type: "uint40",
            internalType: "uint40",
          },
          {
            name: "penaltyBps",
            type: "uint16",
            internalType: "uint16",
          },
          {
            name: "maxClaimableSupply",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "supplyClaimed",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "merkleRoot",
            type: "bytes32",
            internalType: "bytes32",
          },
        ],
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "DropFacet_ClaimConditionAdded",
    inputs: [
      {
        name: "conditionId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "condition",
        type: "tuple",
        indexed: false,
        internalType: "struct DropGroup.ClaimCondition",
        components: [
          {
            name: "currency",
            type: "address",
            internalType: "address",
          },
          {
            name: "startTimestamp",
            type: "uint40",
            internalType: "uint40",
          },
          {
            name: "endTimestamp",
            type: "uint40",
            internalType: "uint40",
          },
          {
            name: "penaltyBps",
            type: "uint16",
            internalType: "uint16",
          },
          {
            name: "maxClaimableSupply",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "supplyClaimed",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "merkleRoot",
            type: "bytes32",
            internalType: "bytes32",
          },
        ],
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "DropFacet_ClaimConditionsUpdated",
    inputs: [
      {
        name: "conditionId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "conditions",
        type: "tuple[]",
        indexed: false,
        internalType: "struct DropGroup.ClaimCondition[]",
        components: [
          {
            name: "currency",
            type: "address",
            internalType: "address",
          },
          {
            name: "startTimestamp",
            type: "uint40",
            internalType: "uint40",
          },
          {
            name: "endTimestamp",
            type: "uint40",
            internalType: "uint40",
          },
          {
            name: "penaltyBps",
            type: "uint16",
            internalType: "uint16",
          },
          {
            name: "maxClaimableSupply",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "supplyClaimed",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "merkleRoot",
            type: "bytes32",
            internalType: "bytes32",
          },
        ],
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "DropFacet_Claimed_And_Staked",
    inputs: [
      {
        name: "conditionId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "claimer",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "account",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "DropFacet_Claimed_WithPenalty",
    inputs: [
      {
        name: "conditionId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "claimer",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "account",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "error",
    name: "DropFacet__AlreadyClaimed",
    inputs: [],
  },
  {
    type: "error",
    name: "DropFacet__CannotSetClaimConditions",
    inputs: [],
  },
  {
    type: "error",
    name: "DropFacet__ClaimConditionsNotInAscendingOrder",
    inputs: [],
  },
  {
    type: "error",
    name: "DropFacet__ClaimHasEnded",
    inputs: [],
  },
  {
    type: "error",
    name: "DropFacet__ClaimHasNotStarted",
    inputs: [],
  },
  {
    type: "error",
    name: "DropFacet__CurrencyNotSet",
    inputs: [],
  },
  {
    type: "error",
    name: "DropFacet__ExceedsMaxClaimableSupply",
    inputs: [],
  },
  {
    type: "error",
    name: "DropFacet__InsufficientBalance",
    inputs: [],
  },
  {
    type: "error",
    name: "DropFacet__InvalidProof",
    inputs: [],
  },
  {
    type: "error",
    name: "DropFacet__InvalidRecipient",
    inputs: [],
  },
  {
    type: "error",
    name: "DropFacet__MerkleRootNotSet",
    inputs: [],
  },
  {
    type: "error",
    name: "DropFacet__NoActiveClaimCondition",
    inputs: [],
  },
  {
    type: "error",
    name: "DropFacet__NotClaimingAccount",
    inputs: [],
  },
  {
    type: "error",
    name: "DropFacet__QuantityMustBeGreaterThanZero",
    inputs: [],
  },
  {
    type: "error",
    name: "DropFacet__RewardsDistributionNotSet",
    inputs: [],
  },
  {
    type: "error",
    name: "DropFacet__UnexpectedPenaltyBps",
    inputs: [],
  },
] as const;

export class IDropFacet__factory {
  static readonly abi = _abi;
  static createInterface(): IDropFacetInterface {
    return new utils.Interface(_abi) as IDropFacetInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): IDropFacet {
    return new Contract(address, _abi, signerOrProvider) as IDropFacet;
  }
}
