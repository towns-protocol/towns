import type { Abi } from 'abitype'
import { Address } from './ContractTypes'

const abi: Abi = [
    {
        type: 'constructor',
        inputs: [
            {
                name: 'name',
                type: 'string',
                internalType: 'string',
            },
            {
                name: 'symbol',
                type: 'string',
                internalType: 'string',
            },
        ],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'DOMAIN_SEPARATOR',
        inputs: [],
        outputs: [
            {
                name: 'result',
                type: 'bytes32',
                internalType: 'bytes32',
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: '__ERC20_init',
        inputs: [
            {
                name: 'name_',
                type: 'string',
                internalType: 'string',
            },
            {
                name: 'symbol_',
                type: 'string',
                internalType: 'string',
            },
            {
                name: 'decimals_',
                type: 'uint8',
                internalType: 'uint8',
            },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: '__Introspection_init',
        inputs: [],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'allowance',
        inputs: [
            {
                name: 'owner',
                type: 'address',
                internalType: 'address',
            },
            {
                name: 'spender',
                type: 'address',
                internalType: 'address',
            },
        ],
        outputs: [
            {
                name: 'result',
                type: 'uint256',
                internalType: 'uint256',
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'approve',
        inputs: [
            {
                name: 'spender',
                type: 'address',
                internalType: 'address',
            },
            {
                name: 'amount',
                type: 'uint256',
                internalType: 'uint256',
            },
        ],
        outputs: [
            {
                name: '',
                type: 'bool',
                internalType: 'bool',
            },
        ],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'balanceOf',
        inputs: [
            {
                name: 'account',
                type: 'address',
                internalType: 'address',
            },
        ],
        outputs: [
            {
                name: '',
                type: 'uint256',
                internalType: 'uint256',
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'decimals',
        inputs: [],
        outputs: [
            {
                name: '',
                type: 'uint8',
                internalType: 'uint8',
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'eip712Domain',
        inputs: [],
        outputs: [
            {
                name: 'fields',
                type: 'bytes1',
                internalType: 'bytes1',
            },
            {
                name: 'name',
                type: 'string',
                internalType: 'string',
            },
            {
                name: 'version',
                type: 'string',
                internalType: 'string',
            },
            {
                name: 'chainId',
                type: 'uint256',
                internalType: 'uint256',
            },
            {
                name: 'verifyingContract',
                type: 'address',
                internalType: 'address',
            },
            {
                name: 'salt',
                type: 'bytes32',
                internalType: 'bytes32',
            },
            {
                name: 'extensions',
                type: 'uint256[]',
                internalType: 'uint256[]',
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'mint',
        inputs: [
            {
                name: 'account',
                type: 'address',
                internalType: 'address',
            },
            {
                name: 'amount',
                type: 'uint256',
                internalType: 'uint256',
            },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'name',
        inputs: [],
        outputs: [
            {
                name: '',
                type: 'string',
                internalType: 'string',
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'nonces',
        inputs: [
            {
                name: 'owner',
                type: 'address',
                internalType: 'address',
            },
        ],
        outputs: [
            {
                name: 'result',
                type: 'uint256',
                internalType: 'uint256',
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'permit',
        inputs: [
            {
                name: 'owner',
                type: 'address',
                internalType: 'address',
            },
            {
                name: 'spender',
                type: 'address',
                internalType: 'address',
            },
            {
                name: 'amount',
                type: 'uint256',
                internalType: 'uint256',
            },
            {
                name: 'deadline',
                type: 'uint256',
                internalType: 'uint256',
            },
            {
                name: 'v',
                type: 'uint8',
                internalType: 'uint8',
            },
            {
                name: 'r',
                type: 'bytes32',
                internalType: 'bytes32',
            },
            {
                name: 's',
                type: 'bytes32',
                internalType: 'bytes32',
            },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'supportsInterface',
        inputs: [
            {
                name: 'interfaceId',
                type: 'bytes4',
                internalType: 'bytes4',
            },
        ],
        outputs: [
            {
                name: '',
                type: 'bool',
                internalType: 'bool',
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'symbol',
        inputs: [],
        outputs: [
            {
                name: '',
                type: 'string',
                internalType: 'string',
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'totalSupply',
        inputs: [],
        outputs: [
            {
                name: '',
                type: 'uint256',
                internalType: 'uint256',
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'transfer',
        inputs: [
            {
                name: 'to',
                type: 'address',
                internalType: 'address',
            },
            {
                name: 'amount',
                type: 'uint256',
                internalType: 'uint256',
            },
        ],
        outputs: [
            {
                name: '',
                type: 'bool',
                internalType: 'bool',
            },
        ],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'transferFrom',
        inputs: [
            {
                name: 'from',
                type: 'address',
                internalType: 'address',
            },
            {
                name: 'to',
                type: 'address',
                internalType: 'address',
            },
            {
                name: 'amount',
                type: 'uint256',
                internalType: 'uint256',
            },
        ],
        outputs: [
            {
                name: '',
                type: 'bool',
                internalType: 'bool',
            },
        ],
        stateMutability: 'nonpayable',
    },
    {
        type: 'event',
        name: 'Approval',
        inputs: [
            {
                name: 'owner',
                type: 'address',
                indexed: true,
                internalType: 'address',
            },
            {
                name: 'spender',
                type: 'address',
                indexed: true,
                internalType: 'address',
            },
            {
                name: 'value',
                type: 'uint256',
                indexed: false,
                internalType: 'uint256',
            },
        ],
        anonymous: false,
    },
    {
        type: 'event',
        name: 'EIP712DomainChanged',
        inputs: [],
        anonymous: false,
    },
    {
        type: 'event',
        name: 'Initialized',
        inputs: [
            {
                name: 'version',
                type: 'uint32',
                indexed: false,
                internalType: 'uint32',
            },
        ],
        anonymous: false,
    },
    {
        type: 'event',
        name: 'InterfaceAdded',
        inputs: [
            {
                name: 'interfaceId',
                type: 'bytes4',
                indexed: true,
                internalType: 'bytes4',
            },
        ],
        anonymous: false,
    },
    {
        type: 'event',
        name: 'InterfaceRemoved',
        inputs: [
            {
                name: 'interfaceId',
                type: 'bytes4',
                indexed: true,
                internalType: 'bytes4',
            },
        ],
        anonymous: false,
    },
    {
        type: 'event',
        name: 'Transfer',
        inputs: [
            {
                name: 'from',
                type: 'address',
                indexed: true,
                internalType: 'address',
            },
            {
                name: 'to',
                type: 'address',
                indexed: true,
                internalType: 'address',
            },
            {
                name: 'value',
                type: 'uint256',
                indexed: false,
                internalType: 'uint256',
            },
        ],
        anonymous: false,
    },
    {
        type: 'error',
        name: 'AllowanceOverflow',
        inputs: [],
    },
    {
        type: 'error',
        name: 'AllowanceUnderflow',
        inputs: [],
    },
    {
        type: 'error',
        name: 'ECDSAInvalidSignature',
        inputs: [],
    },
    {
        type: 'error',
        name: 'ECDSAInvalidSignatureLength',
        inputs: [
            {
                name: 'length',
                type: 'uint256',
                internalType: 'uint256',
            },
        ],
    },
    {
        type: 'error',
        name: 'ECDSAInvalidSignatureS',
        inputs: [
            {
                name: 's',
                type: 'bytes32',
                internalType: 'bytes32',
            },
        ],
    },
    {
        type: 'error',
        name: 'Initializable_InInitializingState',
        inputs: [],
    },
    {
        type: 'error',
        name: 'Initializable_NotInInitializingState',
        inputs: [],
    },
    {
        type: 'error',
        name: 'InsufficientAllowance',
        inputs: [],
    },
    {
        type: 'error',
        name: 'InsufficientBalance',
        inputs: [],
    },
    {
        type: 'error',
        name: 'Introspection_AlreadySupported',
        inputs: [],
    },
    {
        type: 'error',
        name: 'Introspection_NotSupported',
        inputs: [],
    },
    {
        type: 'error',
        name: 'InvalidAccountNonce',
        inputs: [
            {
                name: 'account',
                type: 'address',
                internalType: 'address',
            },
            {
                name: 'currentNonce',
                type: 'uint256',
                internalType: 'uint256',
            },
        ],
    },
    {
        type: 'error',
        name: 'InvalidPermit',
        inputs: [],
    },
    {
        type: 'error',
        name: 'PermitExpired',
        inputs: [],
    },
    {
        type: 'error',
        name: 'TotalSupplyOverflow',
        inputs: [],
    },
]

const bytecode: Address =
    '0x60806040523480156200001157600080fd5b5060405162001a7838038062001a78833981016040819052620000349162000418565b6200003e62000054565b6200004c82826012620000fc565b5050620005de565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef520008054640100000000900460ff1615620000a1576040516366008a2d60e01b815260040160405180910390fd5b805463ffffffff9081161015620000f957805463ffffffff191663ffffffff90811782556040519081527fe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c9060200160405180910390a15b50565b6200010e6336372b0760e01b6200016f565b62000120634ec7fbed60e11b6200016f565b6200013263a219a02560e01b6200016f565b6200013f8383836200024f565b6200016a83604051806040016040528060018152602001603160f81b815250620002a860201b60201c565b505050565b6001600160e01b0319811660009081527f81088bbc801e045ea3e7620779ab349988f58afbdfba10dff983df3f33522b00602052604090205460ff161515600114620001fe576001600160e01b0319811660009081527f81088bbc801e045ea3e7620779ab349988f58afbdfba10dff983df3f33522b0060205260409020805460ff1916600117905562000217565b604051637967f77d60e11b815260040160405180910390fd5b6040516001600160e01b03198216907f78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f2290600090a250565b7f42eeb43a78e08448a75e4dd4bca52199850157e8648ba508b0c6a00addcdffbe806200027d858262000512565b50600181016200028e848262000512565b50600201805460ff191660ff929092169190911790555050565b7f3a497e775dc7c283402f0d3c39c5f0ea53870eb15ab2dddfde5a1162a84c336e620002d5838262000512565b507f3a497e775dc7c283402f0d3c39c5f0ea53870eb15ab2dddfde5a1162a84c336f62000303828262000512565b505060007f3a497e775dc7c283402f0d3c39c5f0ea53870eb15ab2dddfde5a1162a84c336c8190557f3a497e775dc7c283402f0d3c39c5f0ea53870eb15ab2dddfde5a1162a84c336d5550565b634e487b7160e01b600052604160045260246000fd5b600082601f8301126200037857600080fd5b81516001600160401b038082111562000395576200039562000350565b604051601f8301601f19908116603f01168101908282118183101715620003c057620003c062000350565b8160405283815260209250866020858801011115620003de57600080fd5b600091505b83821015620004025785820183015181830184015290820190620003e3565b6000602085830101528094505050505092915050565b600080604083850312156200042c57600080fd5b82516001600160401b03808211156200044457600080fd5b620004528683870162000366565b935060208501519150808211156200046957600080fd5b50620004788582860162000366565b9150509250929050565b600181811c908216806200049757607f821691505b602082108103620004b857634e487b7160e01b600052602260045260246000fd5b50919050565b601f8211156200016a576000816000526020600020601f850160051c81016020861015620004e95750805b601f850160051c820191505b818110156200050a57828155600101620004f5565b505050505050565b81516001600160401b038111156200052e576200052e62000350565b62000546816200053f845462000482565b84620004be565b602080601f8311600181146200057e5760008415620005655750858301515b600019600386901b1c1916600185901b1785556200050a565b600085815260208120601f198616915b82811015620005af578886015182559484019460019091019084016200058e565b5085821015620005ce5787850151600019600388901b60f8161c191681555b5050505050600190811b01905550565b61148a80620005ee6000396000f3fe608060405234801561001057600080fd5b506004361061010b5760003560e01c806370a08231116100a257806395d89b411161007157806395d89b4114610209578063a9059cbb14610211578063aa23aa0214610224578063d505accf14610237578063dd62ed3e1461024a57600080fd5b806370a08231146101c05780637ecebe00146101d357806384b0196e146101e6578063930fc8ca1461020157600080fd5b806323b872dd116100de57806323b872dd14610176578063313ce567146101895780633644e515146101a357806340c10f19146101ab57600080fd5b806301ffc9a71461011057806306fdde0314610138578063095ea7b31461014d57806318160ddd14610160575b600080fd5b61012361011e366004610f8b565b61025d565b60405190151581526020015b60405180910390f35b61014061026e565b60405161012f9190610ffb565b61012361015b36600461102a565b61027d565b610168610290565b60405190815260200161012f565b610123610184366004611054565b6102a3565b6101916102b8565b60405160ff909116815260200161012f565b6101686102e5565b6101be6101b936600461102a565b6102ef565b005b6101686101ce366004611090565b6102fd565b6101686101e1366004611090565b610317565b6101ee610354565b60405161012f97969594939291906110ab565b6101be61041c565b610140610470565b61012361021f36600461102a565b61047a565b6101be6102323660046111f8565b610486565b6101be61024536600461126c565b6104e0565b6101686102583660046112d6565b6104f8565b600061026882610517565b92915050565b606061027861055a565b905090565b6000610289838361060b565b9392505050565b60006102786805345cdf77eb68f44c5490565b60006102b084848461065e565b949350505050565b60006102787f42eeb43a78e08448a75e4dd4bca52199850157e8648ba508b0c6a00addcdffc05460ff1690565b600061027861071c565b6102f98282610726565b5050565b6387a211a2600c9081526000828152602090912054610268565b6001600160a01b03811660009081527fda5d6d87446d81938877f0ee239dac391146dd7466ea30567f72becf06773c006020526040812054610268565b60006060808280808360008051602061146a8339815191525415801561039957507f3a497e775dc7c283402f0d3c39c5f0ea53870eb15ab2dddfde5a1162a84c336d54155b6103e25760405162461bcd60e51b81526020600482015260156024820152741152540dcc4c8e88155b9a5b9a5d1a585b1a5e9959605a1b60448201526064015b60405180910390fd5b6103ea6107a5565b6103f26107c4565b60408051600080825260208201909252600f60f81b9b939a50919850469750309650945092509050565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef5200054640100000000900460ff1661046657604051630ef4733760e31b815260040160405180910390fd5b61046e6107e3565b565b60606102786107f3565b60006102898383610824565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef5200054640100000000900460ff166104d057604051630ef4733760e31b815260040160405180910390fd5b6104db83838361089f565b505050565b6104ef878787878787876108fd565b50505050505050565b6020819052637f5e9f20600c9081526000838152603490912054610289565b6001600160e01b03191660009081527f81088bbc801e045ea3e7620779ab349988f58afbdfba10dff983df3f33522b00602052604090205460ff16151560011490565b60607f42eeb43a78e08448a75e4dd4bca52199850157e8648ba508b0c6a00addcdffbe805461058890611309565b80601f01602080910402602001604051908101604052809291908181526020018280546105b490611309565b80156106015780601f106105d657610100808354040283529160200191610601565b820191906000526020600020905b8154815290600101906020018083116105e457829003601f168201915b5050505050905090565b600082602052637f5e9f20600c5233600052816034600c205581600052602c5160601c337f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b92560206000a350600192915050565b60008360601b33602052637f5e9f208117600c526034600c208054600181011561069e5780851115610698576313be252b6000526004601cfd5b84810382555b50506387a211a28117600c526020600c208054808511156106c75763f4d678b86000526004601cfd5b84810382555050836000526020600c208381540181555082602052600c5160601c8160601c7fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef602080a3505060019392505050565b6000610278610a9e565b6805345cdf77eb68f44c548181018181101561074a5763e5cfe9576000526004601cfd5b806805345cdf77eb68f44c5550506387a211a2600c52816000526020600c208181540181555080602052600c5160601c60007fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef602080a35050565b606060008051602061146a833981519152600201805461058890611309565b606060008051602061146a833981519152600301805461058890611309565b61046e6301ffc9a760e01b610b12565b60607f42eeb43a78e08448a75e4dd4bca52199850157e8648ba508b0c6a00addcdffbe600101805461058890611309565b60006387a211a2600c52336000526020600c2080548084111561084f5763f4d678b86000526004601cfd5b83810382555050826000526020600c208281540181555081602052600c5160601c337fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef602080a350600192915050565b6108af6336372b0760e01b610b12565b6108bf634ec7fbed60e11b610b12565b6108cf63a219a02560e01b610b12565b6108da838383610bb8565b6104db83604051806040016040528060018152602001603160f81b815250610c0d565b8342111561094d5760405162461bcd60e51b815260206004820152601d60248201527f45524332305065726d69743a206578706972656420646561646c696e6500000060448201526064016103d9565b60007f6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c98888886109b9836001600160a01b031660009081527fda5d6d87446d81938877f0ee239dac391146dd7466ea30567f72becf06773c006020526040902080546001810190915590565b6040805160208101969096526001600160a01b0394851690860152929091166060840152608083015260a082015260c0810186905260e0016040516020818303038152906040528051906020012090506000610a1482610c9f565b90506000610a2482878787610ccc565b9050896001600160a01b0316816001600160a01b031614610a875760405162461bcd60e51b815260206004820152601e60248201527f45524332305065726d69743a20696e76616c6964207369676e6174757265000060448201526064016103d9565b610a928a8a8a610cfa565b50505050505050505050565b60007f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f610ac9610d4d565b610ad1610db3565b60408051602081019490945283019190915260608201524660808201523060a082015260c00160405160208183030381529060405280519060200120905090565b610b1b81610517565b610b67576001600160e01b0319811660009081527f81088bbc801e045ea3e7620779ab349988f58afbdfba10dff983df3f33522b0060205260409020805460ff19166001179055610b80565b604051637967f77d60e11b815260040160405180910390fd5b6040516001600160e01b03198216907f78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f2290600090a250565b7f42eeb43a78e08448a75e4dd4bca52199850157e8648ba508b0c6a00addcdffbe80610be48582611393565b5060018101610bf38482611393565b50600201805460ff191660ff929092169190911790555050565b7f3a497e775dc7c283402f0d3c39c5f0ea53870eb15ab2dddfde5a1162a84c336e610c388382611393565b507f3a497e775dc7c283402f0d3c39c5f0ea53870eb15ab2dddfde5a1162a84c336f610c648282611393565b5050600060008051602061146a8339815191528190557f3a497e775dc7c283402f0d3c39c5f0ea53870eb15ab2dddfde5a1162a84c336d5550565b6000610268610cac61071c565b8360405161190160f01b8152600281019290925260228201526042902090565b600080600080610cde88888888610e03565b925092509250610cee8282610ed2565b50909695505050505050565b8260601b82602052637f5e9f208117600c52816034600c205581600052602c5160601c8160601c7f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b92560206000a350505050565b600080610d586107a5565b805190915015610d6f578051602090910120919050565b60008051602061146a833981519152548015610d8b5792915050565b7fc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a4709250505090565b600080610dbe6107c4565b805190915015610dd5578051602090910120919050565b7f3a497e775dc7c283402f0d3c39c5f0ea53870eb15ab2dddfde5a1162a84c336d548015610d8b5792915050565b600080807f7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0841115610e3e5750600091506003905082610ec8565b604080516000808252602082018084528a905260ff891692820192909252606081018790526080810186905260019060a0016020604051602081039080840390855afa158015610e92573d6000803e3d6000fd5b5050604051601f1901519150506001600160a01b038116610ebe57506000925060019150829050610ec8565b9250600091508190505b9450945094915050565b6000826003811115610ee657610ee6611453565b03610eef575050565b6001826003811115610f0357610f03611453565b03610f215760405163f645eedf60e01b815260040160405180910390fd5b6002826003811115610f3557610f35611453565b03610f565760405163fce698f760e01b8152600481018290526024016103d9565b6003826003811115610f6a57610f6a611453565b036102f9576040516335e2f38360e21b8152600481018290526024016103d9565b600060208284031215610f9d57600080fd5b81356001600160e01b03198116811461028957600080fd5b6000815180845260005b81811015610fdb57602081850181015186830182015201610fbf565b506000602082860101526020601f19601f83011685010191505092915050565b6020815260006102896020830184610fb5565b80356001600160a01b038116811461102557600080fd5b919050565b6000806040838503121561103d57600080fd5b6110468361100e565b946020939093013593505050565b60008060006060848603121561106957600080fd5b6110728461100e565b92506110806020850161100e565b9150604084013590509250925092565b6000602082840312156110a257600080fd5b6102898261100e565b60ff60f81b881681526000602060e060208401526110cc60e084018a610fb5565b83810360408501526110de818a610fb5565b606085018990526001600160a01b038816608086015260a0850187905284810360c08601528551808252602080880193509091019060005b8181101561113257835183529284019291840191600101611116565b50909c9b505050505050505050505050565b634e487b7160e01b600052604160045260246000fd5b600082601f83011261116b57600080fd5b813567ffffffffffffffff8082111561118657611186611144565b604051601f8301601f19908116603f011681019082821181831017156111ae576111ae611144565b816040528381528660208588010111156111c757600080fd5b836020870160208301376000602085830101528094505050505092915050565b803560ff8116811461102557600080fd5b60008060006060848603121561120d57600080fd5b833567ffffffffffffffff8082111561122557600080fd5b6112318783880161115a565b9450602086013591508082111561124757600080fd5b506112548682870161115a565b925050611263604085016111e7565b90509250925092565b600080600080600080600060e0888a03121561128757600080fd5b6112908861100e565b965061129e6020890161100e565b955060408801359450606088013593506112ba608089016111e7565b925060a0880135915060c0880135905092959891949750929550565b600080604083850312156112e957600080fd5b6112f28361100e565b91506113006020840161100e565b90509250929050565b600181811c9082168061131d57607f821691505b60208210810361133d57634e487b7160e01b600052602260045260246000fd5b50919050565b601f8211156104db576000816000526020600020601f850160051c8101602086101561136c5750805b601f850160051c820191505b8181101561138b57828155600101611378565b505050505050565b815167ffffffffffffffff8111156113ad576113ad611144565b6113c1816113bb8454611309565b84611343565b602080601f8311600181146113f657600084156113de5750858301515b600019600386901b1c1916600185901b17855561138b565b600085815260208120601f198616915b8281101561142557888601518255948401946001909101908401611406565b50858210156114435787850151600019600388901b60f8161c191681555b5050505050600190811b01905550565b634e487b7160e01b600052602160045260246000fdfe3a497e775dc7c283402f0d3c39c5f0ea53870eb15ab2dddfde5a1162a84c336c'

export const MockERC20 = {
    abi,
    bytecode,
}
