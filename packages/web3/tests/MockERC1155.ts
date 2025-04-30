import type { Abi } from 'abitype'
import { Hex } from 'viem'

const abi: Abi = [
    {
        type: 'constructor',
        inputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'AMOUNT',
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
        name: 'BRONZE',
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
        name: 'GOLD',
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
        name: 'SILVER',
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
        name: 'balanceOf',
        inputs: [
            {
                name: 'account',
                type: 'address',
                internalType: 'address',
            },
            {
                name: 'id',
                type: 'uint256',
                internalType: 'uint256',
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
        name: 'balanceOfBatch',
        inputs: [
            {
                name: 'accounts',
                type: 'address[]',
                internalType: 'address[]',
            },
            {
                name: 'ids',
                type: 'uint256[]',
                internalType: 'uint256[]',
            },
        ],
        outputs: [
            {
                name: '',
                type: 'uint256[]',
                internalType: 'uint256[]',
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'isApprovedForAll',
        inputs: [
            {
                name: 'account',
                type: 'address',
                internalType: 'address',
            },
            {
                name: 'operator',
                type: 'address',
                internalType: 'address',
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
        name: 'mintBronze',
        inputs: [
            {
                name: 'account',
                type: 'address',
                internalType: 'address',
            },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'mintGold',
        inputs: [
            {
                name: 'account',
                type: 'address',
                internalType: 'address',
            },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'mintSilver',
        inputs: [
            {
                name: 'account',
                type: 'address',
                internalType: 'address',
            },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'safeBatchTransferFrom',
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
                name: 'ids',
                type: 'uint256[]',
                internalType: 'uint256[]',
            },
            {
                name: 'values',
                type: 'uint256[]',
                internalType: 'uint256[]',
            },
            {
                name: 'data',
                type: 'bytes',
                internalType: 'bytes',
            },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'safeTransferFrom',
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
                name: 'id',
                type: 'uint256',
                internalType: 'uint256',
            },
            {
                name: 'value',
                type: 'uint256',
                internalType: 'uint256',
            },
            {
                name: 'data',
                type: 'bytes',
                internalType: 'bytes',
            },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'setApprovalForAll',
        inputs: [
            {
                name: 'operator',
                type: 'address',
                internalType: 'address',
            },
            {
                name: 'approved',
                type: 'bool',
                internalType: 'bool',
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
        name: 'uri',
        inputs: [
            {
                name: '',
                type: 'uint256',
                internalType: 'uint256',
            },
        ],
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
        type: 'event',
        name: 'ApprovalForAll',
        inputs: [
            {
                name: 'account',
                type: 'address',
                indexed: true,
                internalType: 'address',
            },
            {
                name: 'operator',
                type: 'address',
                indexed: true,
                internalType: 'address',
            },
            {
                name: 'approved',
                type: 'bool',
                indexed: false,
                internalType: 'bool',
            },
        ],
        anonymous: false,
    },
    {
        type: 'event',
        name: 'TransferBatch',
        inputs: [
            {
                name: 'operator',
                type: 'address',
                indexed: true,
                internalType: 'address',
            },
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
                name: 'ids',
                type: 'uint256[]',
                indexed: false,
                internalType: 'uint256[]',
            },
            {
                name: 'values',
                type: 'uint256[]',
                indexed: false,
                internalType: 'uint256[]',
            },
        ],
        anonymous: false,
    },
    {
        type: 'event',
        name: 'TransferSingle',
        inputs: [
            {
                name: 'operator',
                type: 'address',
                indexed: true,
                internalType: 'address',
            },
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
                name: 'id',
                type: 'uint256',
                indexed: false,
                internalType: 'uint256',
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
        name: 'URI',
        inputs: [
            {
                name: 'value',
                type: 'string',
                indexed: false,
                internalType: 'string',
            },
            {
                name: 'id',
                type: 'uint256',
                indexed: true,
                internalType: 'uint256',
            },
        ],
        anonymous: false,
    },
    {
        type: 'error',
        name: 'ERC1155InsufficientBalance',
        inputs: [
            {
                name: 'sender',
                type: 'address',
                internalType: 'address',
            },
            {
                name: 'balance',
                type: 'uint256',
                internalType: 'uint256',
            },
            {
                name: 'needed',
                type: 'uint256',
                internalType: 'uint256',
            },
            {
                name: 'tokenId',
                type: 'uint256',
                internalType: 'uint256',
            },
        ],
    },
    {
        type: 'error',
        name: 'ERC1155InvalidApprover',
        inputs: [
            {
                name: 'approver',
                type: 'address',
                internalType: 'address',
            },
        ],
    },
    {
        type: 'error',
        name: 'ERC1155InvalidArrayLength',
        inputs: [
            {
                name: 'idsLength',
                type: 'uint256',
                internalType: 'uint256',
            },
            {
                name: 'valuesLength',
                type: 'uint256',
                internalType: 'uint256',
            },
        ],
    },
    {
        type: 'error',
        name: 'ERC1155InvalidOperator',
        inputs: [
            {
                name: 'operator',
                type: 'address',
                internalType: 'address',
            },
        ],
    },
    {
        type: 'error',
        name: 'ERC1155InvalidReceiver',
        inputs: [
            {
                name: 'receiver',
                type: 'address',
                internalType: 'address',
            },
        ],
    },
    {
        type: 'error',
        name: 'ERC1155InvalidSender',
        inputs: [
            {
                name: 'sender',
                type: 'address',
                internalType: 'address',
            },
        ],
    },
    {
        type: 'error',
        name: 'ERC1155MissingApprovalForAll',
        inputs: [
            {
                name: 'operator',
                type: 'address',
                internalType: 'address',
            },
            {
                name: 'owner',
                type: 'address',
                internalType: 'address',
            },
        ],
    },
] as const

const bytecode: Hex =
    '0x60806040523480156200001157600080fd5b5060408051808201909152600b81526a4d6f636b4552433131353560a81b60208201526200003f8162000046565b50620001cb565b6002620000548282620000ff565b5050565b634e487b7160e01b600052604160045260246000fd5b600181811c908216806200008357607f821691505b602082108103620000a457634e487b7160e01b600052602260045260246000fd5b50919050565b601f821115620000fa576000816000526020600020601f850160051c81016020861015620000d55750805b601f850160051c820191505b81811015620000f657828155600101620000e1565b5050505b505050565b81516001600160401b038111156200011b576200011b62000058565b62000133816200012c84546200006e565b84620000aa565b602080601f8311600181146200016b5760008415620001525750858301515b600019600386901b1c1916600185901b178555620000f6565b600085815260208120601f198616915b828110156200019c578886015182559484019460019091019084016200017b565b5085821015620001bb5787850151600019600388901b60f8161c191681555b5050505050600190811b01905550565b6111fa80620001db6000396000f3fe608060405234801561001057600080fd5b50600436106100f45760003560e01c80634e1273f411610097578063e00fd54311610066578063e00fd543146101eb578063e3e55f08146101f3578063e985e9c5146101fb578063f242432a1461020e57600080fd5b80634e1273f4146101a55780635fa3c619146101c5578063a22cb465146101d8578063d17891761461019d57600080fd5b80631fb33b06116100d35780631fb33b06146101625780632eb2c2d6146101775780632ecda3391461018a5780633e4bee381461019d57600080fd5b8062fdd58e146100f957806301ffc9a71461011f5780630e89341c14610142575b600080fd5b61010c610107366004610bd3565b610221565b6040519081526020015b60405180910390f35b61013261012d366004610c13565b610249565b6040519015158152602001610116565b610155610150366004610c37565b610299565b6040516101169190610c96565b610175610170366004610ca9565b61032d565b005b610175610185366004610e0e565b61034c565b610175610198366004610ca9565b6103b8565b61010c600181565b6101b86101b3366004610eb8565b6103d5565b6040516101169190610fb4565b6101756101d3366004610ca9565b6104a2565b6101756101e6366004610fc7565b6104bf565b61010c600381565b61010c600281565b610132610209366004611003565b6104ce565b61017561021c366004611036565b6104fc565b6000818152602081815260408083206001600160a01b03861684529091529020545b92915050565b60006001600160e01b03198216636cdb3d1360e11b148061027a57506001600160e01b031982166303a24d0760e21b145b8061024357506301ffc9a760e01b6001600160e01b0319831614610243565b6060600280546102a89061109b565b80601f01602080910402602001604051908101604052809291908181526020018280546102d49061109b565b80156103215780601f106102f657610100808354040283529160200191610321565b820191906000526020600020905b81548152906001019060200180831161030457829003601f168201915b50505050509050919050565b610349816001806040518060200160405280600081525061055b565b50565b336001600160a01b038616811480159061036d575061036b86826104ce565b155b156103a35760405163711bec9160e11b81526001600160a01b038083166004830152871660248201526044015b60405180910390fd5b6103b086868686866105b8565b505050505050565b61034981600260016040518060200160405280600081525061055b565b606081518351146104065781518351604051635b05999160e01b81526004810192909252602482015260440161039a565b6000835167ffffffffffffffff81111561042257610422610cc4565b60405190808252806020026020018201604052801561044b578160200160208202803683370190505b50905060005b845181101561049a5760208082028601015161047590602080840287010151610221565b828281518110610487576104876110d5565b6020908102919091010152600101610451565b509392505050565b61034981600360016040518060200160405280600081525061055b565b6104ca33838361061f565b5050565b6001600160a01b03918216600090815260016020908152604080832093909416825291909152205460ff1690565b336001600160a01b038616811480159061051d575061051b86826104ce565b155b1561054e5760405163711bec9160e11b81526001600160a01b0380831660048301528716602482015260440161039a565b6103b086868686866106b5565b6001600160a01b03841661058557604051632bfa23e760e11b81526000600482015260240161039a565b604080516001808252602082018690528183019081526060820185905260808201909252906103b0600087848487610743565b6001600160a01b0384166105e257604051632bfa23e760e11b81526000600482015260240161039a565b6001600160a01b03851661060b57604051626a0d4560e21b81526000600482015260240161039a565b6106188585858585610743565b5050505050565b6001600160a01b0382166106485760405162ced3e160e81b81526000600482015260240161039a565b6001600160a01b03838116600081815260016020908152604080832094871680845294825291829020805460ff191686151590811790915591519182527f17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31910160405180910390a3505050565b6001600160a01b0384166106df57604051632bfa23e760e11b81526000600482015260240161039a565b6001600160a01b03851661070857604051626a0d4560e21b81526000600482015260240161039a565b6040805160018082526020820186905281830190815260608201859052608082019092529061073a8787848487610743565b50505050505050565b61074f85858585610796565b6001600160a01b03841615610618578251339060010361078857602084810151908401516107818389898585896109aa565b50506103b0565b6103b0818787878787610ace565b80518251146107c55781518151604051635b05999160e01b81526004810192909252602482015260440161039a565b3360005b83518110156108cb576020818102858101820151908501909101516001600160a01b0388161561087c576000828152602081815260408083206001600160a01b038c16845290915290205481811015610855576040516303dee4c560e01b81526001600160a01b038a16600482015260248101829052604481018390526064810184905260840161039a565b6000838152602081815260408083206001600160a01b038d16845290915290209082900390555b6001600160a01b038716156108c1576000828152602081815260408083206001600160a01b038b168452909152812080548392906108bb9084906110eb565b90915550505b50506001016107c9565b50825160010361094c5760208301516000906020840151909150856001600160a01b0316876001600160a01b0316846001600160a01b03167fc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62858560405161093d929190918252602082015260400190565b60405180910390a45050610618565b836001600160a01b0316856001600160a01b0316826001600160a01b03167f4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb868660405161099b92919061110c565b60405180910390a45050505050565b6001600160a01b0384163b156103b05760405163f23a6e6160e01b81526001600160a01b0385169063f23a6e61906109ee908990899088908890889060040161113a565b6020604051808303816000875af1925050508015610a29575060408051601f3d908101601f19168201909252610a269181019061117f565b60015b610a92573d808015610a57576040519150601f19603f3d011682016040523d82523d6000602084013e610a5c565b606091505b508051600003610a8a57604051632bfa23e760e11b81526001600160a01b038616600482015260240161039a565b805181602001fd5b6001600160e01b0319811663f23a6e6160e01b1461073a57604051632bfa23e760e11b81526001600160a01b038616600482015260240161039a565b6001600160a01b0384163b156103b05760405163bc197c8160e01b81526001600160a01b0385169063bc197c8190610b12908990899088908890889060040161119c565b6020604051808303816000875af1925050508015610b4d575060408051601f3d908101601f19168201909252610b4a9181019061117f565b60015b610b7b573d808015610a57576040519150601f19603f3d011682016040523d82523d6000602084013e610a5c565b6001600160e01b0319811663bc197c8160e01b1461073a57604051632bfa23e760e11b81526001600160a01b038616600482015260240161039a565b80356001600160a01b0381168114610bce57600080fd5b919050565b60008060408385031215610be657600080fd5b610bef83610bb7565b946020939093013593505050565b6001600160e01b03198116811461034957600080fd5b600060208284031215610c2557600080fd5b8135610c3081610bfd565b9392505050565b600060208284031215610c4957600080fd5b5035919050565b6000815180845260005b81811015610c7657602081850181015186830182015201610c5a565b506000602082860101526020601f19601f83011685010191505092915050565b602081526000610c306020830184610c50565b600060208284031215610cbb57600080fd5b610c3082610bb7565b634e487b7160e01b600052604160045260246000fd5b604051601f8201601f1916810167ffffffffffffffff81118282101715610d0357610d03610cc4565b604052919050565b600067ffffffffffffffff821115610d2557610d25610cc4565b5060051b60200190565b600082601f830112610d4057600080fd5b81356020610d55610d5083610d0b565b610cda565b8083825260208201915060208460051b870101935086841115610d7757600080fd5b602086015b84811015610d935780358352918301918301610d7c565b509695505050505050565b600082601f830112610daf57600080fd5b813567ffffffffffffffff811115610dc957610dc9610cc4565b610ddc601f8201601f1916602001610cda565b818152846020838601011115610df157600080fd5b816020850160208301376000918101602001919091529392505050565b600080600080600060a08688031215610e2657600080fd5b610e2f86610bb7565b9450610e3d60208701610bb7565b9350604086013567ffffffffffffffff80821115610e5a57600080fd5b610e6689838a01610d2f565b94506060880135915080821115610e7c57600080fd5b610e8889838a01610d2f565b93506080880135915080821115610e9e57600080fd5b50610eab88828901610d9e565b9150509295509295909350565b60008060408385031215610ecb57600080fd5b823567ffffffffffffffff80821115610ee357600080fd5b818501915085601f830112610ef757600080fd5b81356020610f07610d5083610d0b565b82815260059290921b84018101918181019089841115610f2657600080fd5b948201945b83861015610f4b57610f3c86610bb7565b82529482019490820190610f2b565b96505086013592505080821115610f6157600080fd5b50610f6e85828601610d2f565b9150509250929050565b60008151808452602080850194506020840160005b83811015610fa957815187529582019590820190600101610f8d565b509495945050505050565b602081526000610c306020830184610f78565b60008060408385031215610fda57600080fd5b610fe383610bb7565b915060208301358015158114610ff857600080fd5b809150509250929050565b6000806040838503121561101657600080fd5b61101f83610bb7565b915061102d60208401610bb7565b90509250929050565b600080600080600060a0868803121561104e57600080fd5b61105786610bb7565b945061106560208701610bb7565b93506040860135925060608601359150608086013567ffffffffffffffff81111561108f57600080fd5b610eab88828901610d9e565b600181811c908216806110af57607f821691505b6020821081036110cf57634e487b7160e01b600052602260045260246000fd5b50919050565b634e487b7160e01b600052603260045260246000fd5b8082018082111561024357634e487b7160e01b600052601160045260246000fd5b60408152600061111f6040830185610f78565b82810360208401526111318185610f78565b95945050505050565b6001600160a01b03868116825285166020820152604081018490526060810183905260a06080820181905260009061117490830184610c50565b979650505050505050565b60006020828403121561119157600080fd5b8151610c3081610bfd565b6001600160a01b0386811682528516602082015260a0604082018190526000906111c890830186610f78565b82810360608401526111da8186610f78565b905082810360808401526111ee8185610c50565b9897505050505050505056'

export const MockERC1155 = {
    abi,
    bytecode,
}
