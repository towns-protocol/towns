/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { PromiseOrValue } from "../common";
import type { PrepayFacet, PrepayFacetInterface } from "../PrepayFacet";

const _abi = [
  {
    type: "function",
    name: "__PrepayFacet_init",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "calculateMembershipPrepayFee",
    inputs: [
      {
        name: "supply",
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
    name: "prepaidMembershipSupply",
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
    name: "prepayMembership",
    inputs: [
      {
        name: "supply",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "payable",
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
    name: "Prepay__Prepaid",
    inputs: [
      {
        name: "supply",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "error",
    name: "Entitlement__InvalidValue",
    inputs: [],
  },
  {
    type: "error",
    name: "Entitlement__NotAllowed",
    inputs: [],
  },
  {
    type: "error",
    name: "Entitlement__NotMember",
    inputs: [],
  },
  {
    type: "error",
    name: "Entitlement__ValueAlreadyExists",
    inputs: [],
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
    name: "Prepay__InvalidAddress",
    inputs: [],
  },
  {
    type: "error",
    name: "Prepay__InvalidAmount",
    inputs: [],
  },
  {
    type: "error",
    name: "Prepay__InvalidMembership",
    inputs: [],
  },
  {
    type: "error",
    name: "Prepay__InvalidSupplyAmount",
    inputs: [],
  },
  {
    type: "error",
    name: "Reentrancy",
    inputs: [],
  },
] as const;

const _bytecode =
  "0x6080604052348015600e575f5ffd5b5060156019565b60bd565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef520008054640100000000900460ff16156064576040516366008a2d60e01b815260040160405180910390fd5b805463ffffffff908116101560ba57805463ffffffff191663ffffffff90811782556040519081527fe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c9060200160405180910390a15b50565b6108f8806100ca5f395ff3fe60806040526004361061003e575f3560e01c806306499d7f1461004257806327bc79f114610057578063aabe967d14610088578063b6a45cd61461009c575b5f5ffd5b610055610050366004610833565b6100b0565b005b348015610062575f5ffd5b50610076610071366004610833565b6102ec565b60405190815260200160405180910390f35b348015610093575f5ffd5b506100556103d4565b3480156100a7575f5ffd5b50610076610462565b3068929eee149b4bd2126854036100ce5763ab143c065f526004601cfd5b3068929eee149b4bd2126855805f03610113576040517f305b66fd00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b7fc21004fcc619240a31f006438274d15cd813308303284436eef6055f0fdcb60654604080517f0eac306d00000000000000000000000000000000000000000000000000000000815290517fc21004fcc619240a31f006438274d15cd813308303284436eef6055f0fdcb6009273ffffffffffffffffffffffffffffffffffffffff16915f918391630eac306d9160048083019260209291908290030181865afa1580156101c3573d5f5f3e3d5ffd5b505050506040513d601f19601f820116820180604052508101906101e7919061084a565b6101f1908561088e565b905080341461022c576040517fcd27698700000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b61023584610490565b600480840154604080517f4ccb20c0000000000000000000000000000000000000000000000000000000008152905173ffffffffffffffffffffffffffffffffffffffff928316935f93871692634ccb20c092818301926020928290030181865afa1580156102a6573d5f5f3e3d5ffd5b505050506040513d601f19601f820116820180604052508101906102ca91906108ab565b90506102d882338386610500565b50505050503868929eee149b4bd212685550565b7fc21004fcc619240a31f006438274d15cd813308303284436eef6055f0fdcb60654604080517f0eac306d00000000000000000000000000000000000000000000000000000000815290515f927fc21004fcc619240a31f006438274d15cd813308303284436eef6055f0fdcb6009273ffffffffffffffffffffffffffffffffffffffff909116918291630eac306d9160048083019260209291908290030181865afa15801561039e573d5f5f3e3d5ffd5b505050506040513d601f19601f820116820180604052508101906103c2919061084a565b6103cc908561088e565b949350505050565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef5200054640100000000900460ff16610437576040517f77a399b800000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b6104607f9751b85800000000000000000000000000000000000000000000000000000000610558565b565b5f61048b7f097b4f25b64e012d0cf55f67e9b34fe5d57f15b11b95baa4ddd136b424967c005490565b905090565b7f097b4f25b64e012d0cf55f67e9b34fe5d57f15b11b95baa4ddd136b424967c008054829082905f906104c49084906108e5565b90915550506040518281527fad9b877dcdf275e10be629bbe390dc68f7b5de14e3cc5f11f1745d300bb3852e9060200160405180910390a15050565b80156105525773ffffffffffffffffffffffffffffffffffffffff841673eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee1461054857610543848484846106ad565b610552565b6105528282610741565b50505050565b7fffffffff0000000000000000000000000000000000000000000000000000000081165f9081527f81088bbc801e045ea3e7620779ab349988f58afbdfba10dff983df3f33522b00602052604090205460ff1661062c577fffffffff0000000000000000000000000000000000000000000000000000000081165f9081527f81088bbc801e045ea3e7620779ab349988f58afbdfba10dff983df3f33522b006020526040902080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0016600117905561065e565b6040517ff2cfeefa00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b6040517fffffffff000000000000000000000000000000000000000000000000000000008216907f78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22905f90a250565b8173ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff1603156105525773ffffffffffffffffffffffffffffffffffffffff831630146107205761054373ffffffffffffffffffffffffffffffffffffffff8516848484610765565b61055273ffffffffffffffffffffffffffffffffffffffff851683836107c7565b61076173ffffffffffffffffffffffffffffffffffffffff83168261081a565b5050565b60405181606052826040528360601b602c526f23b872dd000000000000000000000000600c5260205f6064601c5f895af18060015f5114166107b957803d873b1517106107b957637939f4245f526004601cfd5b505f60605260405250505050565b81601452806034526fa9059cbb0000000000000000000000005f5260205f604460105f875af18060015f51141661081057803d853b151710610810576390b8ec185f526004601cfd5b505f603452505050565b5f385f3884865af16107615763b12d13eb5f526004601cfd5b5f60208284031215610843575f5ffd5b5035919050565b5f6020828403121561085a575f5ffd5b5051919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b80820281158282048414176108a5576108a5610861565b92915050565b5f602082840312156108bb575f5ffd5b815173ffffffffffffffffffffffffffffffffffffffff811681146108de575f5ffd5b9392505050565b808201808211156108a5576108a561086156";

type PrepayFacetConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: PrepayFacetConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class PrepayFacet__factory extends ContractFactory {
  constructor(...args: PrepayFacetConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override deploy(
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<PrepayFacet> {
    return super.deploy(overrides || {}) as Promise<PrepayFacet>;
  }
  override getDeployTransaction(
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  override attach(address: string): PrepayFacet {
    return super.attach(address) as PrepayFacet;
  }
  override connect(signer: Signer): PrepayFacet__factory {
    return super.connect(signer) as PrepayFacet__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): PrepayFacetInterface {
    return new utils.Interface(_abi) as PrepayFacetInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): PrepayFacet {
    return new Contract(address, _abi, signerOrProvider) as PrepayFacet;
  }
}
