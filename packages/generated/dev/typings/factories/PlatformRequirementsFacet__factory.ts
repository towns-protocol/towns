/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { PromiseOrValue } from "../common";
import type {
  PlatformRequirementsFacet,
  PlatformRequirementsFacetInterface,
} from "../PlatformRequirementsFacet";

const _abi = [
  {
    type: "function",
    name: "__PlatformRequirements_init",
    inputs: [
      {
        name: "feeRecipient",
        type: "address",
        internalType: "address",
      },
      {
        name: "membershipBps",
        type: "uint16",
        internalType: "uint16",
      },
      {
        name: "membershipFee",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "membershipMintLimit",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "membershipDuration",
        type: "uint64",
        internalType: "uint64",
      },
      {
        name: "membershipMinPrice",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getDenominator",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "pure",
  },
  {
    type: "function",
    name: "getFeeRecipient",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMembershipBps",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint16",
        internalType: "uint16",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMembershipDuration",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint64",
        internalType: "uint64",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMembershipFee",
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
    name: "getMembershipMinPrice",
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
    name: "getMembershipMintLimit",
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
    name: "setFeeRecipient",
    inputs: [
      {
        name: "recipient",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setMembershipBps",
    inputs: [
      {
        name: "bps",
        type: "uint16",
        internalType: "uint16",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setMembershipDuration",
    inputs: [
      {
        name: "duration",
        type: "uint64",
        internalType: "uint64",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setMembershipFee",
    inputs: [
      {
        name: "fee",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setMembershipMinPrice",
    inputs: [
      {
        name: "minPrice",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setMembershipMintLimit",
    inputs: [
      {
        name: "limit",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "Initialized",
    inputs: [
      {
        name: "version",
        type: "uint32",
        indexed: false,
        internalType: "uint32",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "InterfaceAdded",
    inputs: [
      {
        name: "interfaceId",
        type: "bytes4",
        indexed: true,
        internalType: "bytes4",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "InterfaceRemoved",
    inputs: [
      {
        name: "interfaceId",
        type: "bytes4",
        indexed: true,
        internalType: "bytes4",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "OwnershipTransferred",
    inputs: [
      {
        name: "previousOwner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "newOwner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "PlatformFeeRecipientSet",
    inputs: [
      {
        name: "recipient",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "PlatformMembershipBpsSet",
    inputs: [
      {
        name: "bps",
        type: "uint16",
        indexed: false,
        internalType: "uint16",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "PlatformMembershipDurationSet",
    inputs: [
      {
        name: "duration",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "PlatformMembershipFeeSet",
    inputs: [
      {
        name: "fee",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "PlatformMembershipMinPriceSet",
    inputs: [
      {
        name: "minPrice",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "PlatformMembershipMintLimitSet",
    inputs: [
      {
        name: "limit",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "error",
    name: "Initializable_InInitializingState",
    inputs: [],
  },
  {
    type: "error",
    name: "Initializable_NotInInitializingState",
    inputs: [],
  },
  {
    type: "error",
    name: "Introspection_AlreadySupported",
    inputs: [],
  },
  {
    type: "error",
    name: "Introspection_NotSupported",
    inputs: [],
  },
  {
    type: "error",
    name: "Ownable__NotOwner",
    inputs: [
      {
        name: "account",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "Ownable__ZeroAddress",
    inputs: [],
  },
  {
    type: "error",
    name: "Platform__InvalidFeeRecipient",
    inputs: [],
  },
  {
    type: "error",
    name: "Platform__InvalidMembershipBps",
    inputs: [],
  },
  {
    type: "error",
    name: "Platform__InvalidMembershipDuration",
    inputs: [],
  },
  {
    type: "error",
    name: "Platform__InvalidMembershipMinPrice",
    inputs: [],
  },
  {
    type: "error",
    name: "Platform__InvalidMembershipMintLimit",
    inputs: [],
  },
] as const;

const _bytecode =
  "0x6080604052348015600e575f5ffd5b5060156019565b60bd565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef520008054640100000000900460ff16156064576040516366008a2d60e01b815260040160405180910390fd5b805463ffffffff908116101560ba57805463ffffffff191663ffffffff90811782556040519081527fe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c9060200160405180910390a15b50565b610d78806100ca5f395ff3fe608060405234801561000f575f5ffd5b50600436106100e5575f3560e01c806383f3f0dc11610088578063ce8221b611610063578063ce8221b61461023a578063e74b981b1461024d578063edd436de14610260578063f025796414610273575f5ffd5b806383f3f0dc146101bb5780639f6542aa146101ce578063c60b2f8214610227575f5ffd5b80631b159e2e116100c35780631b159e2e146101215780632cbb9d13146101295780634ccb20c0146101315780638120f0ba1461015e575f5ffd5b806304777bca146100e95780630eac306d146100fe578063190eaaba14610119575b5f5ffd5b6100fc6100f7366004610cb2565b610286565b005b610106610350565b6040519081526020015b60405180910390f35b612710610106565b61010661037e565b6101066103a7565b6101396103d0565b60405173ffffffffffffffffffffffffffffffffffffffff9091168152602001610110565b7fb29a817dd0719f30ad87abc8dff26e6354077e5b46bf38f34d5ac48732860d025474010000000000000000000000000000000000000000900467ffffffffffffffff1660405167ffffffffffffffff9091168152602001610110565b6100fc6101c9366004610d0f565b61040f565b7fb29a817dd0719f30ad87abc8dff26e6354077e5b46bf38f34d5ac48732860d02547c0100000000000000000000000000000000000000000000000000000000900461ffff1660405161ffff9091168152602001610110565b6100fc610235366004610d2f565b610492565b6100fc610248366004610d46565b61050d565b6100fc61025b366004610d5f565b610588565b6100fc61026e366004610d2f565b610603565b6100fc610281366004610d2f565b61067e565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef5200054640100000000900460ff166102e9576040517f77a399b800000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b6103127f03422273000000000000000000000000000000000000000000000000000000006106f9565b61031b8661084e565b61032485610928565b61032d84610a12565b61033683610a65565b61033f82610af1565b61034881610bd5565b505050505050565b5f6103797fb29a817dd0719f30ad87abc8dff26e6354077e5b46bf38f34d5ac48732860d005490565b905090565b5f6103797fb29a817dd0719f30ad87abc8dff26e6354077e5b46bf38f34d5ac48732860d035490565b5f6103797fb29a817dd0719f30ad87abc8dff26e6354077e5b46bf38f34d5ac48732860d015490565b5f6103797fb29a817dd0719f30ad87abc8dff26e6354077e5b46bf38f34d5ac48732860d025473ffffffffffffffffffffffffffffffffffffffff1690565b7f4675fa8241f86f37157864d3d49b85ad4b164352c516da28e1678a90470ae3005473ffffffffffffffffffffffffffffffffffffffff163314610486576040517f65f490650000000000000000000000000000000000000000000000000000000081523360048201526024015b60405180910390fd5b61048f81610af1565b50565b7f4675fa8241f86f37157864d3d49b85ad4b164352c516da28e1678a90470ae3005473ffffffffffffffffffffffffffffffffffffffff163314610504576040517f65f4906500000000000000000000000000000000000000000000000000000000815233600482015260240161047d565b61048f81610a12565b7f4675fa8241f86f37157864d3d49b85ad4b164352c516da28e1678a90470ae3005473ffffffffffffffffffffffffffffffffffffffff16331461057f576040517f65f4906500000000000000000000000000000000000000000000000000000000815233600482015260240161047d565b61048f81610928565b7f4675fa8241f86f37157864d3d49b85ad4b164352c516da28e1678a90470ae3005473ffffffffffffffffffffffffffffffffffffffff1633146105fa576040517f65f4906500000000000000000000000000000000000000000000000000000000815233600482015260240161047d565b61048f8161084e565b7f4675fa8241f86f37157864d3d49b85ad4b164352c516da28e1678a90470ae3005473ffffffffffffffffffffffffffffffffffffffff163314610675576040517f65f4906500000000000000000000000000000000000000000000000000000000815233600482015260240161047d565b61048f81610bd5565b7f4675fa8241f86f37157864d3d49b85ad4b164352c516da28e1678a90470ae3005473ffffffffffffffffffffffffffffffffffffffff1633146106f0576040517f65f4906500000000000000000000000000000000000000000000000000000000815233600482015260240161047d565b61048f81610a65565b7fffffffff0000000000000000000000000000000000000000000000000000000081165f9081527f81088bbc801e045ea3e7620779ab349988f58afbdfba10dff983df3f33522b00602052604090205460ff166107cd577fffffffff0000000000000000000000000000000000000000000000000000000081165f9081527f81088bbc801e045ea3e7620779ab349988f58afbdfba10dff983df3f33522b006020526040902080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff001660011790556107ff565b6040517ff2cfeefa00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b6040517fffffffff000000000000000000000000000000000000000000000000000000008216907f78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22905f90a250565b73ffffffffffffffffffffffffffffffffffffffff811661089b576040517f83e3352100000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b7fb29a817dd0719f30ad87abc8dff26e6354077e5b46bf38f34d5ac48732860d0280547fffffffffffffffffffffffff00000000000000000000000000000000000000001673ffffffffffffffffffffffffffffffffffffffff83169081179091556040517f3cc0ae1aeb9c9f264efea06a56cdd51909ff08984601a60572e90b520105f66b905f90a250565b6127108161ffff161115610968576040517f365c949400000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b807fb29a817dd0719f30ad87abc8dff26e6354077e5b46bf38f34d5ac48732860d0060020180547fffff0000ffffffffffffffffffffffffffffffffffffffffffffffffffffffff167c010000000000000000000000000000000000000000000000000000000061ffff9384160217905560405190821681527f3b56f95d00baee21935a9ae0b495b827b894967975bed5ad55f4cde35386492d906020015b60405180910390a150565b807fb29a817dd0719f30ad87abc8dff26e6354077e5b46bf38f34d5ac48732860d00556040518181527fd586b88b974ccf090a61851ce0b8c6ba390e3e97db43513cc42b0b6f155a440d90602001610a07565b805f03610a9d576040517e951ce300000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b7fb29a817dd0719f30ad87abc8dff26e6354077e5b46bf38f34d5ac48732860d018190556040518181527f333d71c9d6dfea817be074bc8d0cd09737726b9d29a6cfe42f2ff95f82a222b190602001610a07565b8067ffffffffffffffff165f03610b34576040517fe8decb2700000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b807fb29a817dd0719f30ad87abc8dff26e6354077e5b46bf38f34d5ac48732860d0060020180547fffffffff0000000000000000ffffffffffffffffffffffffffffffffffffffff167401000000000000000000000000000000000000000067ffffffffffffffff9384160217905560405190821681527f93f329d9b419a1dbbb08ec1d29d6fcc68e2926b743dc2a665f1b70b30eb542de90602001610a07565b805f03610c0e576040517f3131934a00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b7fb29a817dd0719f30ad87abc8dff26e6354077e5b46bf38f34d5ac48732860d038190556040518181527f82ea03a29fda4754fc4ebb678ee41f834ad7bfede7d8cd39094ad6de82cd17ad90602001610a07565b803573ffffffffffffffffffffffffffffffffffffffff81168114610c85575f5ffd5b919050565b803561ffff81168114610c85575f5ffd5b803567ffffffffffffffff81168114610c85575f5ffd5b5f5f5f5f5f5f60c08789031215610cc7575f5ffd5b610cd087610c62565b9550610cde60208801610c8a565b94506040870135935060608701359250610cfa60808801610c9b565b9598949750929591949360a090920135925050565b5f60208284031215610d1f575f5ffd5b610d2882610c9b565b9392505050565b5f60208284031215610d3f575f5ffd5b5035919050565b5f60208284031215610d56575f5ffd5b610d2882610c8a565b5f60208284031215610d6f575f5ffd5b610d2882610c6256";

type PlatformRequirementsFacetConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: PlatformRequirementsFacetConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class PlatformRequirementsFacet__factory extends ContractFactory {
  constructor(...args: PlatformRequirementsFacetConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override deploy(
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<PlatformRequirementsFacet> {
    return super.deploy(overrides || {}) as Promise<PlatformRequirementsFacet>;
  }
  override getDeployTransaction(
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  override attach(address: string): PlatformRequirementsFacet {
    return super.attach(address) as PlatformRequirementsFacet;
  }
  override connect(signer: Signer): PlatformRequirementsFacet__factory {
    return super.connect(signer) as PlatformRequirementsFacet__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): PlatformRequirementsFacetInterface {
    return new utils.Interface(_abi) as PlatformRequirementsFacetInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): PlatformRequirementsFacet {
    return new Contract(
      address,
      _abi,
      signerOrProvider
    ) as PlatformRequirementsFacet;
  }
}
