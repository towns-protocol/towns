// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package deploy

import (
	"errors"
	"math/big"
	"strings"

	ethereum "github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/event"
)

// Reference imports to suppress errors if they are not otherwise used.
var (
	_ = errors.New
	_ = big.NewInt
	_ = strings.NewReader
	_ = ethereum.NotFound
	_ = bind.Bind
	_ = common.Big1
	_ = types.BloomLookup
	_ = event.NewSubscription
	_ = abi.ConvertType
)

// MockErc20MetaData contains all meta data concerning the MockErc20 contract.
var MockErc20MetaData = &bind.MetaData{
	ABI: "[{\"type\":\"constructor\",\"inputs\":[{\"name\":\"name\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"symbol\",\"type\":\"string\",\"internalType\":\"string\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"DOMAIN_SEPARATOR\",\"inputs\":[],\"outputs\":[{\"name\":\"result\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"__ERC20_init\",\"inputs\":[{\"name\":\"name_\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"symbol_\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"decimals_\",\"type\":\"uint8\",\"internalType\":\"uint8\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"__Introspection_init\",\"inputs\":[],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"allowance\",\"inputs\":[{\"name\":\"owner\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"spender\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"result\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"approve\",\"inputs\":[{\"name\":\"spender\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"amount\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"balanceOf\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"decimals\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint8\",\"internalType\":\"uint8\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"eip712Domain\",\"inputs\":[],\"outputs\":[{\"name\":\"fields\",\"type\":\"bytes1\",\"internalType\":\"bytes1\"},{\"name\":\"name\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"version\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"chainId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"verifyingContract\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"salt\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"extensions\",\"type\":\"uint256[]\",\"internalType\":\"uint256[]\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"mint\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"amount\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"name\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"string\",\"internalType\":\"string\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"nonces\",\"inputs\":[{\"name\":\"owner\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"result\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"permit\",\"inputs\":[{\"name\":\"owner\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"spender\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"amount\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"deadline\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"v\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"r\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"s\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"supportsInterface\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"internalType\":\"bytes4\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"symbol\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"string\",\"internalType\":\"string\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"totalSupply\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"transfer\",\"inputs\":[{\"name\":\"to\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"amount\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"transferFrom\",\"inputs\":[{\"name\":\"from\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"to\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"amount\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"Approval\",\"inputs\":[{\"name\":\"owner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"spender\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"value\",\"type\":\"uint256\",\"indexed\":false,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"EIP712DomainChanged\",\"inputs\":[],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Initialized\",\"inputs\":[{\"name\":\"version\",\"type\":\"uint32\",\"indexed\":false,\"internalType\":\"uint32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceAdded\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceRemoved\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Transfer\",\"inputs\":[{\"name\":\"from\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"to\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"value\",\"type\":\"uint256\",\"indexed\":false,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"error\",\"name\":\"ECDSAInvalidSignature\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"ECDSAInvalidSignatureLength\",\"inputs\":[{\"name\":\"length\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"type\":\"error\",\"name\":\"ECDSAInvalidSignatureS\",\"inputs\":[{\"name\":\"s\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}]},{\"type\":\"error\",\"name\":\"ERC20InsufficientAllowance\",\"inputs\":[{\"name\":\"spender\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"allowance\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"needed\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"type\":\"error\",\"name\":\"ERC20InsufficientBalance\",\"inputs\":[{\"name\":\"sender\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"balance\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"needed\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"type\":\"error\",\"name\":\"ERC20InvalidReceiver\",\"inputs\":[{\"name\":\"receiver\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"Initializable_InInitializingState\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Initializable_NotInInitializingState\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_AlreadySupported\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_NotSupported\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"InvalidAccountNonce\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"currentNonce\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"type\":\"error\",\"name\":\"InvalidPermit\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"PermitExpired\",\"inputs\":[]}]",
	Bin: "0x60806040523480156200001157600080fd5b5060405162001afe38038062001afe833981016040819052620000349162000419565b6200003e62000054565b6200004c82826012620000fc565b5050620005e0565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef520008054640100000000900460ff1615620000a1576040516366008a2d60e01b815260040160405180910390fd5b805463ffffffff9081161015620000f957805463ffffffff191663ffffffff90811782556040519081527fe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c9060200160405180910390a15b50565b6200010e6336372b0760e01b620001ce565b62000120634ec7fbed60e11b620001ce565b6200013263a219a02560e01b620001ce565b7f75807d58f669e9353223f5da7969ad5cf5c08f899e1a3ffa65554aaa556cbc007f75807d58f669e9353223f5da7969ad5cf5c08f899e1a3ffa65554aaa556cbc0362000180858262000514565b506004810162000191848262000514565b5060058101805460ff191660ff84161790556040805180820190915260018152603160f81b6020820152620001c8908590620002a9565b50505050565b6001600160e01b0319811660009081527f81088bbc801e045ea3e7620779ab349988f58afbdfba10dff983df3f33522b00602052604090205460ff1662000258576001600160e01b0319811660009081527f81088bbc801e045ea3e7620779ab349988f58afbdfba10dff983df3f33522b0060205260409020805460ff1916600117905562000271565b604051637967f77d60e11b815260040160405180910390fd5b6040516001600160e01b03198216907f78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f2290600090a250565b7f3a497e775dc7c283402f0d3c39c5f0ea53870eb15ab2dddfde5a1162a84c336e620002d6838262000514565b507f3a497e775dc7c283402f0d3c39c5f0ea53870eb15ab2dddfde5a1162a84c336f62000304828262000514565b505060007f3a497e775dc7c283402f0d3c39c5f0ea53870eb15ab2dddfde5a1162a84c336c8190557f3a497e775dc7c283402f0d3c39c5f0ea53870eb15ab2dddfde5a1162a84c336d5550565b634e487b7160e01b600052604160045260246000fd5b600082601f8301126200037957600080fd5b81516001600160401b038082111562000396576200039662000351565b604051601f8301601f19908116603f01168101908282118183101715620003c157620003c162000351565b8160405283815260209250866020858801011115620003df57600080fd5b600091505b83821015620004035785820183015181830184015290820190620003e4565b6000602085830101528094505050505092915050565b600080604083850312156200042d57600080fd5b82516001600160401b03808211156200044557600080fd5b620004538683870162000367565b935060208501519150808211156200046a57600080fd5b50620004798582860162000367565b9150509250929050565b600181811c908216806200049857607f821691505b602082108103620004b957634e487b7160e01b600052602260045260246000fd5b50919050565b601f8211156200050f576000816000526020600020601f850160051c81016020861015620004ea5750805b601f850160051c820191505b818110156200050b57828155600101620004f6565b5050505b505050565b81516001600160401b0381111562000530576200053062000351565b620005488162000541845462000483565b84620004bf565b602080601f831160018114620005805760008415620005675750858301515b600019600386901b1c1916600185901b1785556200050b565b600085815260208120601f198616915b82811015620005b15788860151825594840194600190910190840162000590565b5085821015620005d05787850151600019600388901b60f8161c191681555b5050505050600190811b01905550565b61150e80620005f06000396000f3fe608060405234801561001057600080fd5b506004361061010b5760003560e01c806370a08231116100a257806395d89b411161007157806395d89b411461023e578063a9059cbb14610246578063aa23aa0214610259578063d505accf1461026c578063dd62ed3e1461027f57600080fd5b806370a08231146101f55780637ecebe001461020857806384b0196e1461021b578063930fc8ca1461023657600080fd5b806323b872dd116100de57806323b872dd14610191578063313ce567146101a45780633644e515146101d857806340c10f19146101e057600080fd5b806301ffc9a71461011057806306fdde0314610138578063095ea7b31461014d57806318160ddd14610160575b600080fd5b61012361011e366004610fd6565b610292565b60405190151581526020015b60405180910390f35b6101406102a3565b60405161012f9190611046565b61012361015b366004611075565b610346565b7f75807d58f669e9353223f5da7969ad5cf5c08f899e1a3ffa65554aaa556cbc02545b60405190815260200161012f565b61012361019f36600461109f565b61036a565b7f75807d58f669e9353223f5da7969ad5cf5c08f899e1a3ffa65554aaa556cbc055460405160ff909116815260200161012f565b610183610390565b6101f36101ee366004611075565b61039f565b005b6101836102033660046110db565b6103bc565b6101836102163660046110db565b6103d6565b610223610413565b60405161012f97969594939291906110f6565b6101f36104db565b61014061052f565b610123610254366004611075565b61054e565b6101f3610267366004611243565b610569565b6101f361027a3660046112b7565b6105c3565b61018361028d366004611321565b6105db565b600061029d8261061c565b92915050565b60606000805160206114ce8339815191525b60030180546102c390611354565b80601f01602080910402602001604051908101604052809291908181526020018280546102ef90611354565b801561033c5780601f106103115761010080835404028352916020019161033c565b820191906000526020600020905b81548152906001019060200180831161031f57829003601f168201915b5050505050905090565b60006103616000805160206114ce833981519152848461065a565b50600192915050565b60006103866000805160206114ce833981519152858585610666565b5060019392505050565b600061039a610684565b905090565b6103b86000805160206114ce833981519152838361068e565b5050565b600061029d6000805160206114ce83398151915283610726565b6001600160a01b03811660009081527fda5d6d87446d81938877f0ee239dac391146dd7466ea30567f72becf06773c00602052604081205461029d565b6000606080828080836000805160206114ee8339815191525415801561045857507f3a497e775dc7c283402f0d3c39c5f0ea53870eb15ab2dddfde5a1162a84c336d54155b6104a15760405162461bcd60e51b81526020600482015260156024820152741152540dcc4c8e88155b9a5b9a5d1a585b1a5e9959605a1b60448201526064015b60405180910390fd5b6104a961073a565b6104b1610759565b60408051600080825260208201909252600f60f81b9b939a50919850469750309650945092509050565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef5200054640100000000900460ff1661052557604051630ef4733760e31b815260040160405180910390fd5b61052d61076f565b565b60606000805160206114ce83398151915260040180546102c390611354565b60006103616000805160206114ce833981519152848461077f565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef5200054640100000000900460ff166105b357604051630ef4733760e31b815260040160405180910390fd5b6105be83838361078b565b505050565b6105d287878787878787610839565b50505050505050565b60008281527f75807d58f669e9353223f5da7969ad5cf5c08f899e1a3ffa65554aaa556cbc01602090815260408083209091528282528120545b9392505050565b6001600160e01b03191660009081527f81088bbc801e045ea3e7620779ab349988f58afbdfba10dff983df3f33522b00602052604090205460ff1690565b6105be833384846109e9565b61067284843384610a5a565b61067e84848484610ac8565b50505050565b600061039a610b19565b6001600160a01b0382166106b85760405163ec442f0560e01b815260006004820152602401610498565b808360020160008282546106cc919061138e565b9091555050600082815260208481526040808320805485019055805184815290516001600160a01b03861693927fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef928290030190a3505050565b600081815260208390526040812054610615565b60606000805160206114ee83398151915260020180546102c390611354565b60606000805160206114ee8339815191526102b5565b61052d6301ffc9a760e01b610b8d565b6105be83338484610ac8565b61079b6336372b0760e01b610b8d565b6107ab634ec7fbed60e11b610b8d565b6107bb63a219a02560e01b610b8d565b6000805160206114ce8339815191527f75807d58f669e9353223f5da7969ad5cf5c08f899e1a3ffa65554aaa556cbc036107f585826113f7565b506004810161080484826113f7565b5060058101805460ff191660ff84161790556040805180820190915260018152603160f81b602082015261067e908590610c33565b834211156108895760405162461bcd60e51b815260206004820152601d60248201527f45524332305065726d69743a206578706972656420646561646c696e650000006044820152606401610498565b60007f6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c98888886108f5836001600160a01b031660009081527fda5d6d87446d81938877f0ee239dac391146dd7466ea30567f72becf06773c006020526040902080546001810190915590565b6040805160208101969096526001600160a01b0394851690860152929091166060840152608083015260a082015260c0810186905260e001604051602081830303815290604052805190602001209050600061095082610cc5565b9050600061096082878787610cf2565b9050896001600160a01b0316816001600160a01b0316146109c35760405162461bcd60e51b815260206004820152601e60248201527f45524332305065726d69743a20696e76616c6964207369676e617475726500006044820152606401610498565b6109dd6000805160206114ce8339815191528b8b8b6109e9565b50505050505050505050565b600083815260018501602090815260408083209091528382529020819055816001600160a01b0316836001600160a01b03167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b92583604051610a4c91815260200190565b60405180910390a350505050565b60008381526001850160209081526040808320909152838252902080546000198114610ac05782811015610aba57604051637dc7a0d960e11b81526001600160a01b03851660048201526024810182905260448101849052606401610498565b82810382555b505050505050565b610ad484848484610d20565b816001600160a01b0316836001600160a01b03167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef83604051610a4c91815260200190565b60007f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f610b44610d44565b610b4c610daa565b60408051602081019490945283019190915260608201524660808201523060a082015260c00160405160208183030381529060405280519060200120905090565b610b968161061c565b610be2576001600160e01b0319811660009081527f81088bbc801e045ea3e7620779ab349988f58afbdfba10dff983df3f33522b0060205260409020805460ff19166001179055610bfb565b604051637967f77d60e11b815260040160405180910390fd5b6040516001600160e01b03198216907f78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f2290600090a250565b7f3a497e775dc7c283402f0d3c39c5f0ea53870eb15ab2dddfde5a1162a84c336e610c5e83826113f7565b507f3a497e775dc7c283402f0d3c39c5f0ea53870eb15ab2dddfde5a1162a84c336f610c8a82826113f7565b505060006000805160206114ee8339815191528190557f3a497e775dc7c283402f0d3c39c5f0ea53870eb15ab2dddfde5a1162a84c336d5550565b600061029d610cd2610684565b8360405161190160f01b8152600281019290925260228201526042902090565b600080600080610d0488888888610dfa565b925092509250610d148282610ec9565b50909695505050505050565b610d2b848483610f82565b600082815260208590526040902080548201905561067e565b600080610d4f61073a565b805190915015610d66578051602090910120919050565b6000805160206114ee833981519152548015610d825792915050565b7fc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a4709250505090565b600080610db5610759565b805190915015610dcc578051602090910120919050565b7f3a497e775dc7c283402f0d3c39c5f0ea53870eb15ab2dddfde5a1162a84c336d548015610d825792915050565b600080807f7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0841115610e355750600091506003905082610ebf565b604080516000808252602082018084528a905260ff891692820192909252606081018790526080810186905260019060a0016020604051602081039080840390855afa158015610e89573d6000803e3d6000fd5b5050604051601f1901519150506001600160a01b038116610eb557506000925060019150829050610ebf565b9250600091508190505b9450945094915050565b6000826003811115610edd57610edd6114b7565b03610ee6575050565b6001826003811115610efa57610efa6114b7565b03610f185760405163f645eedf60e01b815260040160405180910390fd5b6002826003811115610f2c57610f2c6114b7565b03610f4d5760405163fce698f760e01b815260048101829052602401610498565b6003826003811115610f6157610f616114b7565b036103b8576040516335e2f38360e21b815260048101829052602401610498565b6000828152602084905260409020805482811015610fcc5760405163391434e360e21b81526001600160a01b03851660048201526024810182905260448101849052606401610498565b9190910390555050565b600060208284031215610fe857600080fd5b81356001600160e01b03198116811461061557600080fd5b6000815180845260005b818110156110265760208185018101518683018201520161100a565b506000602082860101526020601f19601f83011685010191505092915050565b6020815260006106156020830184611000565b80356001600160a01b038116811461107057600080fd5b919050565b6000806040838503121561108857600080fd5b61109183611059565b946020939093013593505050565b6000806000606084860312156110b457600080fd5b6110bd84611059565b92506110cb60208501611059565b9150604084013590509250925092565b6000602082840312156110ed57600080fd5b61061582611059565b60ff60f81b881681526000602060e0602084015261111760e084018a611000565b8381036040850152611129818a611000565b606085018990526001600160a01b038816608086015260a0850187905284810360c08601528551808252602080880193509091019060005b8181101561117d57835183529284019291840191600101611161565b50909c9b505050505050505050505050565b634e487b7160e01b600052604160045260246000fd5b600082601f8301126111b657600080fd5b813567ffffffffffffffff808211156111d1576111d161118f565b604051601f8301601f19908116603f011681019082821181831017156111f9576111f961118f565b8160405283815286602085880101111561121257600080fd5b836020870160208301376000602085830101528094505050505092915050565b803560ff8116811461107057600080fd5b60008060006060848603121561125857600080fd5b833567ffffffffffffffff8082111561127057600080fd5b61127c878388016111a5565b9450602086013591508082111561129257600080fd5b5061129f868287016111a5565b9250506112ae60408501611232565b90509250925092565b600080600080600080600060e0888a0312156112d257600080fd5b6112db88611059565b96506112e960208901611059565b9550604088013594506060880135935061130560808901611232565b925060a0880135915060c0880135905092959891949750929550565b6000806040838503121561133457600080fd5b61133d83611059565b915061134b60208401611059565b90509250929050565b600181811c9082168061136857607f821691505b60208210810361138857634e487b7160e01b600052602260045260246000fd5b50919050565b8082018082111561029d57634e487b7160e01b600052601160045260246000fd5b601f8211156105be576000816000526020600020601f850160051c810160208610156113d85750805b601f850160051c820191505b81811015610ac0578281556001016113e4565b815167ffffffffffffffff8111156114115761141161118f565b6114258161141f8454611354565b846113af565b602080601f83116001811461145a57600084156114425750858301515b600019600386901b1c1916600185901b178555610ac0565b600085815260208120601f198616915b828110156114895788860151825594840194600190910190840161146a565b50858210156114a75787850151600019600388901b60f8161c191681555b5050505050600190811b01905550565b634e487b7160e01b600052602160045260246000fdfe75807d58f669e9353223f5da7969ad5cf5c08f899e1a3ffa65554aaa556cbc003a497e775dc7c283402f0d3c39c5f0ea53870eb15ab2dddfde5a1162a84c336c",
}

// MockErc20ABI is the input ABI used to generate the binding from.
// Deprecated: Use MockErc20MetaData.ABI instead.
var MockErc20ABI = MockErc20MetaData.ABI

// MockErc20Bin is the compiled bytecode used for deploying new contracts.
// Deprecated: Use MockErc20MetaData.Bin instead.
var MockErc20Bin = MockErc20MetaData.Bin

// DeployMockErc20 deploys a new Ethereum contract, binding an instance of MockErc20 to it.
func DeployMockErc20(auth *bind.TransactOpts, backend bind.ContractBackend, name string, symbol string) (common.Address, *types.Transaction, *MockErc20, error) {
	parsed, err := MockErc20MetaData.GetAbi()
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	if parsed == nil {
		return common.Address{}, nil, nil, errors.New("GetABI returned nil")
	}

	address, tx, contract, err := bind.DeployContract(auth, *parsed, common.FromHex(MockErc20Bin), backend, name, symbol)
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	return address, tx, &MockErc20{MockErc20Caller: MockErc20Caller{contract: contract}, MockErc20Transactor: MockErc20Transactor{contract: contract}, MockErc20Filterer: MockErc20Filterer{contract: contract}}, nil
}

// MockErc20 is an auto generated Go binding around an Ethereum contract.
type MockErc20 struct {
	MockErc20Caller     // Read-only binding to the contract
	MockErc20Transactor // Write-only binding to the contract
	MockErc20Filterer   // Log filterer for contract events
}

// MockErc20Caller is an auto generated read-only Go binding around an Ethereum contract.
type MockErc20Caller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// MockErc20Transactor is an auto generated write-only Go binding around an Ethereum contract.
type MockErc20Transactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// MockErc20Filterer is an auto generated log filtering Go binding around an Ethereum contract events.
type MockErc20Filterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// MockErc20Session is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type MockErc20Session struct {
	Contract     *MockErc20        // Generic contract binding to set the session for
	CallOpts     bind.CallOpts     // Call options to use throughout this session
	TransactOpts bind.TransactOpts // Transaction auth options to use throughout this session
}

// MockErc20CallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type MockErc20CallerSession struct {
	Contract *MockErc20Caller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts    // Call options to use throughout this session
}

// MockErc20TransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type MockErc20TransactorSession struct {
	Contract     *MockErc20Transactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts    // Transaction auth options to use throughout this session
}

// MockErc20Raw is an auto generated low-level Go binding around an Ethereum contract.
type MockErc20Raw struct {
	Contract *MockErc20 // Generic contract binding to access the raw methods on
}

// MockErc20CallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type MockErc20CallerRaw struct {
	Contract *MockErc20Caller // Generic read-only contract binding to access the raw methods on
}

// MockErc20TransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type MockErc20TransactorRaw struct {
	Contract *MockErc20Transactor // Generic write-only contract binding to access the raw methods on
}

// NewMockErc20 creates a new instance of MockErc20, bound to a specific deployed contract.
func NewMockErc20(address common.Address, backend bind.ContractBackend) (*MockErc20, error) {
	contract, err := bindMockErc20(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &MockErc20{MockErc20Caller: MockErc20Caller{contract: contract}, MockErc20Transactor: MockErc20Transactor{contract: contract}, MockErc20Filterer: MockErc20Filterer{contract: contract}}, nil
}

// NewMockErc20Caller creates a new read-only instance of MockErc20, bound to a specific deployed contract.
func NewMockErc20Caller(address common.Address, caller bind.ContractCaller) (*MockErc20Caller, error) {
	contract, err := bindMockErc20(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &MockErc20Caller{contract: contract}, nil
}

// NewMockErc20Transactor creates a new write-only instance of MockErc20, bound to a specific deployed contract.
func NewMockErc20Transactor(address common.Address, transactor bind.ContractTransactor) (*MockErc20Transactor, error) {
	contract, err := bindMockErc20(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &MockErc20Transactor{contract: contract}, nil
}

// NewMockErc20Filterer creates a new log filterer instance of MockErc20, bound to a specific deployed contract.
func NewMockErc20Filterer(address common.Address, filterer bind.ContractFilterer) (*MockErc20Filterer, error) {
	contract, err := bindMockErc20(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &MockErc20Filterer{contract: contract}, nil
}

// bindMockErc20 binds a generic wrapper to an already deployed contract.
func bindMockErc20(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := MockErc20MetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_MockErc20 *MockErc20Raw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _MockErc20.Contract.MockErc20Caller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_MockErc20 *MockErc20Raw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _MockErc20.Contract.MockErc20Transactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_MockErc20 *MockErc20Raw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _MockErc20.Contract.MockErc20Transactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_MockErc20 *MockErc20CallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _MockErc20.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_MockErc20 *MockErc20TransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _MockErc20.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_MockErc20 *MockErc20TransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _MockErc20.Contract.contract.Transact(opts, method, params...)
}

// DOMAINSEPARATOR is a free data retrieval call binding the contract method 0x3644e515.
//
// Solidity: function DOMAIN_SEPARATOR() view returns(bytes32 result)
func (_MockErc20 *MockErc20Caller) DOMAINSEPARATOR(opts *bind.CallOpts) ([32]byte, error) {
	var out []interface{}
	err := _MockErc20.contract.Call(opts, &out, "DOMAIN_SEPARATOR")

	if err != nil {
		return *new([32]byte), err
	}

	out0 := *abi.ConvertType(out[0], new([32]byte)).(*[32]byte)

	return out0, err

}

// DOMAINSEPARATOR is a free data retrieval call binding the contract method 0x3644e515.
//
// Solidity: function DOMAIN_SEPARATOR() view returns(bytes32 result)
func (_MockErc20 *MockErc20Session) DOMAINSEPARATOR() ([32]byte, error) {
	return _MockErc20.Contract.DOMAINSEPARATOR(&_MockErc20.CallOpts)
}

// DOMAINSEPARATOR is a free data retrieval call binding the contract method 0x3644e515.
//
// Solidity: function DOMAIN_SEPARATOR() view returns(bytes32 result)
func (_MockErc20 *MockErc20CallerSession) DOMAINSEPARATOR() ([32]byte, error) {
	return _MockErc20.Contract.DOMAINSEPARATOR(&_MockErc20.CallOpts)
}

// Allowance is a free data retrieval call binding the contract method 0xdd62ed3e.
//
// Solidity: function allowance(address owner, address spender) view returns(uint256 result)
func (_MockErc20 *MockErc20Caller) Allowance(opts *bind.CallOpts, owner common.Address, spender common.Address) (*big.Int, error) {
	var out []interface{}
	err := _MockErc20.contract.Call(opts, &out, "allowance", owner, spender)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// Allowance is a free data retrieval call binding the contract method 0xdd62ed3e.
//
// Solidity: function allowance(address owner, address spender) view returns(uint256 result)
func (_MockErc20 *MockErc20Session) Allowance(owner common.Address, spender common.Address) (*big.Int, error) {
	return _MockErc20.Contract.Allowance(&_MockErc20.CallOpts, owner, spender)
}

// Allowance is a free data retrieval call binding the contract method 0xdd62ed3e.
//
// Solidity: function allowance(address owner, address spender) view returns(uint256 result)
func (_MockErc20 *MockErc20CallerSession) Allowance(owner common.Address, spender common.Address) (*big.Int, error) {
	return _MockErc20.Contract.Allowance(&_MockErc20.CallOpts, owner, spender)
}

// BalanceOf is a free data retrieval call binding the contract method 0x70a08231.
//
// Solidity: function balanceOf(address account) view returns(uint256)
func (_MockErc20 *MockErc20Caller) BalanceOf(opts *bind.CallOpts, account common.Address) (*big.Int, error) {
	var out []interface{}
	err := _MockErc20.contract.Call(opts, &out, "balanceOf", account)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// BalanceOf is a free data retrieval call binding the contract method 0x70a08231.
//
// Solidity: function balanceOf(address account) view returns(uint256)
func (_MockErc20 *MockErc20Session) BalanceOf(account common.Address) (*big.Int, error) {
	return _MockErc20.Contract.BalanceOf(&_MockErc20.CallOpts, account)
}

// BalanceOf is a free data retrieval call binding the contract method 0x70a08231.
//
// Solidity: function balanceOf(address account) view returns(uint256)
func (_MockErc20 *MockErc20CallerSession) BalanceOf(account common.Address) (*big.Int, error) {
	return _MockErc20.Contract.BalanceOf(&_MockErc20.CallOpts, account)
}

// Decimals is a free data retrieval call binding the contract method 0x313ce567.
//
// Solidity: function decimals() view returns(uint8)
func (_MockErc20 *MockErc20Caller) Decimals(opts *bind.CallOpts) (uint8, error) {
	var out []interface{}
	err := _MockErc20.contract.Call(opts, &out, "decimals")

	if err != nil {
		return *new(uint8), err
	}

	out0 := *abi.ConvertType(out[0], new(uint8)).(*uint8)

	return out0, err

}

// Decimals is a free data retrieval call binding the contract method 0x313ce567.
//
// Solidity: function decimals() view returns(uint8)
func (_MockErc20 *MockErc20Session) Decimals() (uint8, error) {
	return _MockErc20.Contract.Decimals(&_MockErc20.CallOpts)
}

// Decimals is a free data retrieval call binding the contract method 0x313ce567.
//
// Solidity: function decimals() view returns(uint8)
func (_MockErc20 *MockErc20CallerSession) Decimals() (uint8, error) {
	return _MockErc20.Contract.Decimals(&_MockErc20.CallOpts)
}

// Eip712Domain is a free data retrieval call binding the contract method 0x84b0196e.
//
// Solidity: function eip712Domain() view returns(bytes1 fields, string name, string version, uint256 chainId, address verifyingContract, bytes32 salt, uint256[] extensions)
func (_MockErc20 *MockErc20Caller) Eip712Domain(opts *bind.CallOpts) (struct {
	Fields            [1]byte
	Name              string
	Version           string
	ChainId           *big.Int
	VerifyingContract common.Address
	Salt              [32]byte
	Extensions        []*big.Int
}, error) {
	var out []interface{}
	err := _MockErc20.contract.Call(opts, &out, "eip712Domain")

	outstruct := new(struct {
		Fields            [1]byte
		Name              string
		Version           string
		ChainId           *big.Int
		VerifyingContract common.Address
		Salt              [32]byte
		Extensions        []*big.Int
	})
	if err != nil {
		return *outstruct, err
	}

	outstruct.Fields = *abi.ConvertType(out[0], new([1]byte)).(*[1]byte)
	outstruct.Name = *abi.ConvertType(out[1], new(string)).(*string)
	outstruct.Version = *abi.ConvertType(out[2], new(string)).(*string)
	outstruct.ChainId = *abi.ConvertType(out[3], new(*big.Int)).(**big.Int)
	outstruct.VerifyingContract = *abi.ConvertType(out[4], new(common.Address)).(*common.Address)
	outstruct.Salt = *abi.ConvertType(out[5], new([32]byte)).(*[32]byte)
	outstruct.Extensions = *abi.ConvertType(out[6], new([]*big.Int)).(*[]*big.Int)

	return *outstruct, err

}

// Eip712Domain is a free data retrieval call binding the contract method 0x84b0196e.
//
// Solidity: function eip712Domain() view returns(bytes1 fields, string name, string version, uint256 chainId, address verifyingContract, bytes32 salt, uint256[] extensions)
func (_MockErc20 *MockErc20Session) Eip712Domain() (struct {
	Fields            [1]byte
	Name              string
	Version           string
	ChainId           *big.Int
	VerifyingContract common.Address
	Salt              [32]byte
	Extensions        []*big.Int
}, error) {
	return _MockErc20.Contract.Eip712Domain(&_MockErc20.CallOpts)
}

// Eip712Domain is a free data retrieval call binding the contract method 0x84b0196e.
//
// Solidity: function eip712Domain() view returns(bytes1 fields, string name, string version, uint256 chainId, address verifyingContract, bytes32 salt, uint256[] extensions)
func (_MockErc20 *MockErc20CallerSession) Eip712Domain() (struct {
	Fields            [1]byte
	Name              string
	Version           string
	ChainId           *big.Int
	VerifyingContract common.Address
	Salt              [32]byte
	Extensions        []*big.Int
}, error) {
	return _MockErc20.Contract.Eip712Domain(&_MockErc20.CallOpts)
}

// Name is a free data retrieval call binding the contract method 0x06fdde03.
//
// Solidity: function name() view returns(string)
func (_MockErc20 *MockErc20Caller) Name(opts *bind.CallOpts) (string, error) {
	var out []interface{}
	err := _MockErc20.contract.Call(opts, &out, "name")

	if err != nil {
		return *new(string), err
	}

	out0 := *abi.ConvertType(out[0], new(string)).(*string)

	return out0, err

}

// Name is a free data retrieval call binding the contract method 0x06fdde03.
//
// Solidity: function name() view returns(string)
func (_MockErc20 *MockErc20Session) Name() (string, error) {
	return _MockErc20.Contract.Name(&_MockErc20.CallOpts)
}

// Name is a free data retrieval call binding the contract method 0x06fdde03.
//
// Solidity: function name() view returns(string)
func (_MockErc20 *MockErc20CallerSession) Name() (string, error) {
	return _MockErc20.Contract.Name(&_MockErc20.CallOpts)
}

// Nonces is a free data retrieval call binding the contract method 0x7ecebe00.
//
// Solidity: function nonces(address owner) view returns(uint256 result)
func (_MockErc20 *MockErc20Caller) Nonces(opts *bind.CallOpts, owner common.Address) (*big.Int, error) {
	var out []interface{}
	err := _MockErc20.contract.Call(opts, &out, "nonces", owner)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// Nonces is a free data retrieval call binding the contract method 0x7ecebe00.
//
// Solidity: function nonces(address owner) view returns(uint256 result)
func (_MockErc20 *MockErc20Session) Nonces(owner common.Address) (*big.Int, error) {
	return _MockErc20.Contract.Nonces(&_MockErc20.CallOpts, owner)
}

// Nonces is a free data retrieval call binding the contract method 0x7ecebe00.
//
// Solidity: function nonces(address owner) view returns(uint256 result)
func (_MockErc20 *MockErc20CallerSession) Nonces(owner common.Address) (*big.Int, error) {
	return _MockErc20.Contract.Nonces(&_MockErc20.CallOpts, owner)
}

// SupportsInterface is a free data retrieval call binding the contract method 0x01ffc9a7.
//
// Solidity: function supportsInterface(bytes4 interfaceId) view returns(bool)
func (_MockErc20 *MockErc20Caller) SupportsInterface(opts *bind.CallOpts, interfaceId [4]byte) (bool, error) {
	var out []interface{}
	err := _MockErc20.contract.Call(opts, &out, "supportsInterface", interfaceId)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// SupportsInterface is a free data retrieval call binding the contract method 0x01ffc9a7.
//
// Solidity: function supportsInterface(bytes4 interfaceId) view returns(bool)
func (_MockErc20 *MockErc20Session) SupportsInterface(interfaceId [4]byte) (bool, error) {
	return _MockErc20.Contract.SupportsInterface(&_MockErc20.CallOpts, interfaceId)
}

// SupportsInterface is a free data retrieval call binding the contract method 0x01ffc9a7.
//
// Solidity: function supportsInterface(bytes4 interfaceId) view returns(bool)
func (_MockErc20 *MockErc20CallerSession) SupportsInterface(interfaceId [4]byte) (bool, error) {
	return _MockErc20.Contract.SupportsInterface(&_MockErc20.CallOpts, interfaceId)
}

// Symbol is a free data retrieval call binding the contract method 0x95d89b41.
//
// Solidity: function symbol() view returns(string)
func (_MockErc20 *MockErc20Caller) Symbol(opts *bind.CallOpts) (string, error) {
	var out []interface{}
	err := _MockErc20.contract.Call(opts, &out, "symbol")

	if err != nil {
		return *new(string), err
	}

	out0 := *abi.ConvertType(out[0], new(string)).(*string)

	return out0, err

}

// Symbol is a free data retrieval call binding the contract method 0x95d89b41.
//
// Solidity: function symbol() view returns(string)
func (_MockErc20 *MockErc20Session) Symbol() (string, error) {
	return _MockErc20.Contract.Symbol(&_MockErc20.CallOpts)
}

// Symbol is a free data retrieval call binding the contract method 0x95d89b41.
//
// Solidity: function symbol() view returns(string)
func (_MockErc20 *MockErc20CallerSession) Symbol() (string, error) {
	return _MockErc20.Contract.Symbol(&_MockErc20.CallOpts)
}

// TotalSupply is a free data retrieval call binding the contract method 0x18160ddd.
//
// Solidity: function totalSupply() view returns(uint256)
func (_MockErc20 *MockErc20Caller) TotalSupply(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _MockErc20.contract.Call(opts, &out, "totalSupply")

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// TotalSupply is a free data retrieval call binding the contract method 0x18160ddd.
//
// Solidity: function totalSupply() view returns(uint256)
func (_MockErc20 *MockErc20Session) TotalSupply() (*big.Int, error) {
	return _MockErc20.Contract.TotalSupply(&_MockErc20.CallOpts)
}

// TotalSupply is a free data retrieval call binding the contract method 0x18160ddd.
//
// Solidity: function totalSupply() view returns(uint256)
func (_MockErc20 *MockErc20CallerSession) TotalSupply() (*big.Int, error) {
	return _MockErc20.Contract.TotalSupply(&_MockErc20.CallOpts)
}

// ERC20Init is a paid mutator transaction binding the contract method 0xaa23aa02.
//
// Solidity: function __ERC20_init(string name_, string symbol_, uint8 decimals_) returns()
func (_MockErc20 *MockErc20Transactor) ERC20Init(opts *bind.TransactOpts, name_ string, symbol_ string, decimals_ uint8) (*types.Transaction, error) {
	return _MockErc20.contract.Transact(opts, "__ERC20_init", name_, symbol_, decimals_)
}

// ERC20Init is a paid mutator transaction binding the contract method 0xaa23aa02.
//
// Solidity: function __ERC20_init(string name_, string symbol_, uint8 decimals_) returns()
func (_MockErc20 *MockErc20Session) ERC20Init(name_ string, symbol_ string, decimals_ uint8) (*types.Transaction, error) {
	return _MockErc20.Contract.ERC20Init(&_MockErc20.TransactOpts, name_, symbol_, decimals_)
}

// ERC20Init is a paid mutator transaction binding the contract method 0xaa23aa02.
//
// Solidity: function __ERC20_init(string name_, string symbol_, uint8 decimals_) returns()
func (_MockErc20 *MockErc20TransactorSession) ERC20Init(name_ string, symbol_ string, decimals_ uint8) (*types.Transaction, error) {
	return _MockErc20.Contract.ERC20Init(&_MockErc20.TransactOpts, name_, symbol_, decimals_)
}

// IntrospectionInit is a paid mutator transaction binding the contract method 0x930fc8ca.
//
// Solidity: function __Introspection_init() returns()
func (_MockErc20 *MockErc20Transactor) IntrospectionInit(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _MockErc20.contract.Transact(opts, "__Introspection_init")
}

// IntrospectionInit is a paid mutator transaction binding the contract method 0x930fc8ca.
//
// Solidity: function __Introspection_init() returns()
func (_MockErc20 *MockErc20Session) IntrospectionInit() (*types.Transaction, error) {
	return _MockErc20.Contract.IntrospectionInit(&_MockErc20.TransactOpts)
}

// IntrospectionInit is a paid mutator transaction binding the contract method 0x930fc8ca.
//
// Solidity: function __Introspection_init() returns()
func (_MockErc20 *MockErc20TransactorSession) IntrospectionInit() (*types.Transaction, error) {
	return _MockErc20.Contract.IntrospectionInit(&_MockErc20.TransactOpts)
}

// Approve is a paid mutator transaction binding the contract method 0x095ea7b3.
//
// Solidity: function approve(address spender, uint256 amount) returns(bool)
func (_MockErc20 *MockErc20Transactor) Approve(opts *bind.TransactOpts, spender common.Address, amount *big.Int) (*types.Transaction, error) {
	return _MockErc20.contract.Transact(opts, "approve", spender, amount)
}

// Approve is a paid mutator transaction binding the contract method 0x095ea7b3.
//
// Solidity: function approve(address spender, uint256 amount) returns(bool)
func (_MockErc20 *MockErc20Session) Approve(spender common.Address, amount *big.Int) (*types.Transaction, error) {
	return _MockErc20.Contract.Approve(&_MockErc20.TransactOpts, spender, amount)
}

// Approve is a paid mutator transaction binding the contract method 0x095ea7b3.
//
// Solidity: function approve(address spender, uint256 amount) returns(bool)
func (_MockErc20 *MockErc20TransactorSession) Approve(spender common.Address, amount *big.Int) (*types.Transaction, error) {
	return _MockErc20.Contract.Approve(&_MockErc20.TransactOpts, spender, amount)
}

// Mint is a paid mutator transaction binding the contract method 0x40c10f19.
//
// Solidity: function mint(address account, uint256 amount) returns()
func (_MockErc20 *MockErc20Transactor) Mint(opts *bind.TransactOpts, account common.Address, amount *big.Int) (*types.Transaction, error) {
	return _MockErc20.contract.Transact(opts, "mint", account, amount)
}

// Mint is a paid mutator transaction binding the contract method 0x40c10f19.
//
// Solidity: function mint(address account, uint256 amount) returns()
func (_MockErc20 *MockErc20Session) Mint(account common.Address, amount *big.Int) (*types.Transaction, error) {
	return _MockErc20.Contract.Mint(&_MockErc20.TransactOpts, account, amount)
}

// Mint is a paid mutator transaction binding the contract method 0x40c10f19.
//
// Solidity: function mint(address account, uint256 amount) returns()
func (_MockErc20 *MockErc20TransactorSession) Mint(account common.Address, amount *big.Int) (*types.Transaction, error) {
	return _MockErc20.Contract.Mint(&_MockErc20.TransactOpts, account, amount)
}

// Permit is a paid mutator transaction binding the contract method 0xd505accf.
//
// Solidity: function permit(address owner, address spender, uint256 amount, uint256 deadline, uint8 v, bytes32 r, bytes32 s) returns()
func (_MockErc20 *MockErc20Transactor) Permit(opts *bind.TransactOpts, owner common.Address, spender common.Address, amount *big.Int, deadline *big.Int, v uint8, r [32]byte, s [32]byte) (*types.Transaction, error) {
	return _MockErc20.contract.Transact(opts, "permit", owner, spender, amount, deadline, v, r, s)
}

// Permit is a paid mutator transaction binding the contract method 0xd505accf.
//
// Solidity: function permit(address owner, address spender, uint256 amount, uint256 deadline, uint8 v, bytes32 r, bytes32 s) returns()
func (_MockErc20 *MockErc20Session) Permit(owner common.Address, spender common.Address, amount *big.Int, deadline *big.Int, v uint8, r [32]byte, s [32]byte) (*types.Transaction, error) {
	return _MockErc20.Contract.Permit(&_MockErc20.TransactOpts, owner, spender, amount, deadline, v, r, s)
}

// Permit is a paid mutator transaction binding the contract method 0xd505accf.
//
// Solidity: function permit(address owner, address spender, uint256 amount, uint256 deadline, uint8 v, bytes32 r, bytes32 s) returns()
func (_MockErc20 *MockErc20TransactorSession) Permit(owner common.Address, spender common.Address, amount *big.Int, deadline *big.Int, v uint8, r [32]byte, s [32]byte) (*types.Transaction, error) {
	return _MockErc20.Contract.Permit(&_MockErc20.TransactOpts, owner, spender, amount, deadline, v, r, s)
}

// Transfer is a paid mutator transaction binding the contract method 0xa9059cbb.
//
// Solidity: function transfer(address to, uint256 amount) returns(bool)
func (_MockErc20 *MockErc20Transactor) Transfer(opts *bind.TransactOpts, to common.Address, amount *big.Int) (*types.Transaction, error) {
	return _MockErc20.contract.Transact(opts, "transfer", to, amount)
}

// Transfer is a paid mutator transaction binding the contract method 0xa9059cbb.
//
// Solidity: function transfer(address to, uint256 amount) returns(bool)
func (_MockErc20 *MockErc20Session) Transfer(to common.Address, amount *big.Int) (*types.Transaction, error) {
	return _MockErc20.Contract.Transfer(&_MockErc20.TransactOpts, to, amount)
}

// Transfer is a paid mutator transaction binding the contract method 0xa9059cbb.
//
// Solidity: function transfer(address to, uint256 amount) returns(bool)
func (_MockErc20 *MockErc20TransactorSession) Transfer(to common.Address, amount *big.Int) (*types.Transaction, error) {
	return _MockErc20.Contract.Transfer(&_MockErc20.TransactOpts, to, amount)
}

// TransferFrom is a paid mutator transaction binding the contract method 0x23b872dd.
//
// Solidity: function transferFrom(address from, address to, uint256 amount) returns(bool)
func (_MockErc20 *MockErc20Transactor) TransferFrom(opts *bind.TransactOpts, from common.Address, to common.Address, amount *big.Int) (*types.Transaction, error) {
	return _MockErc20.contract.Transact(opts, "transferFrom", from, to, amount)
}

// TransferFrom is a paid mutator transaction binding the contract method 0x23b872dd.
//
// Solidity: function transferFrom(address from, address to, uint256 amount) returns(bool)
func (_MockErc20 *MockErc20Session) TransferFrom(from common.Address, to common.Address, amount *big.Int) (*types.Transaction, error) {
	return _MockErc20.Contract.TransferFrom(&_MockErc20.TransactOpts, from, to, amount)
}

// TransferFrom is a paid mutator transaction binding the contract method 0x23b872dd.
//
// Solidity: function transferFrom(address from, address to, uint256 amount) returns(bool)
func (_MockErc20 *MockErc20TransactorSession) TransferFrom(from common.Address, to common.Address, amount *big.Int) (*types.Transaction, error) {
	return _MockErc20.Contract.TransferFrom(&_MockErc20.TransactOpts, from, to, amount)
}

// MockErc20ApprovalIterator is returned from FilterApproval and is used to iterate over the raw logs and unpacked data for Approval events raised by the MockErc20 contract.
type MockErc20ApprovalIterator struct {
	Event *MockErc20Approval // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *MockErc20ApprovalIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockErc20Approval)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(MockErc20Approval)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *MockErc20ApprovalIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockErc20ApprovalIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockErc20Approval represents a Approval event raised by the MockErc20 contract.
type MockErc20Approval struct {
	Owner   common.Address
	Spender common.Address
	Value   *big.Int
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterApproval is a free log retrieval operation binding the contract event 0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925.
//
// Solidity: event Approval(address indexed owner, address indexed spender, uint256 value)
func (_MockErc20 *MockErc20Filterer) FilterApproval(opts *bind.FilterOpts, owner []common.Address, spender []common.Address) (*MockErc20ApprovalIterator, error) {

	var ownerRule []interface{}
	for _, ownerItem := range owner {
		ownerRule = append(ownerRule, ownerItem)
	}
	var spenderRule []interface{}
	for _, spenderItem := range spender {
		spenderRule = append(spenderRule, spenderItem)
	}

	logs, sub, err := _MockErc20.contract.FilterLogs(opts, "Approval", ownerRule, spenderRule)
	if err != nil {
		return nil, err
	}
	return &MockErc20ApprovalIterator{contract: _MockErc20.contract, event: "Approval", logs: logs, sub: sub}, nil
}

// WatchApproval is a free log subscription operation binding the contract event 0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925.
//
// Solidity: event Approval(address indexed owner, address indexed spender, uint256 value)
func (_MockErc20 *MockErc20Filterer) WatchApproval(opts *bind.WatchOpts, sink chan<- *MockErc20Approval, owner []common.Address, spender []common.Address) (event.Subscription, error) {

	var ownerRule []interface{}
	for _, ownerItem := range owner {
		ownerRule = append(ownerRule, ownerItem)
	}
	var spenderRule []interface{}
	for _, spenderItem := range spender {
		spenderRule = append(spenderRule, spenderItem)
	}

	logs, sub, err := _MockErc20.contract.WatchLogs(opts, "Approval", ownerRule, spenderRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockErc20Approval)
				if err := _MockErc20.contract.UnpackLog(event, "Approval", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseApproval is a log parse operation binding the contract event 0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925.
//
// Solidity: event Approval(address indexed owner, address indexed spender, uint256 value)
func (_MockErc20 *MockErc20Filterer) ParseApproval(log types.Log) (*MockErc20Approval, error) {
	event := new(MockErc20Approval)
	if err := _MockErc20.contract.UnpackLog(event, "Approval", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockErc20EIP712DomainChangedIterator is returned from FilterEIP712DomainChanged and is used to iterate over the raw logs and unpacked data for EIP712DomainChanged events raised by the MockErc20 contract.
type MockErc20EIP712DomainChangedIterator struct {
	Event *MockErc20EIP712DomainChanged // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *MockErc20EIP712DomainChangedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockErc20EIP712DomainChanged)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(MockErc20EIP712DomainChanged)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *MockErc20EIP712DomainChangedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockErc20EIP712DomainChangedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockErc20EIP712DomainChanged represents a EIP712DomainChanged event raised by the MockErc20 contract.
type MockErc20EIP712DomainChanged struct {
	Raw types.Log // Blockchain specific contextual infos
}

// FilterEIP712DomainChanged is a free log retrieval operation binding the contract event 0x0a6387c9ea3628b88a633bb4f3b151770f70085117a15f9bf3787cda53f13d31.
//
// Solidity: event EIP712DomainChanged()
func (_MockErc20 *MockErc20Filterer) FilterEIP712DomainChanged(opts *bind.FilterOpts) (*MockErc20EIP712DomainChangedIterator, error) {

	logs, sub, err := _MockErc20.contract.FilterLogs(opts, "EIP712DomainChanged")
	if err != nil {
		return nil, err
	}
	return &MockErc20EIP712DomainChangedIterator{contract: _MockErc20.contract, event: "EIP712DomainChanged", logs: logs, sub: sub}, nil
}

// WatchEIP712DomainChanged is a free log subscription operation binding the contract event 0x0a6387c9ea3628b88a633bb4f3b151770f70085117a15f9bf3787cda53f13d31.
//
// Solidity: event EIP712DomainChanged()
func (_MockErc20 *MockErc20Filterer) WatchEIP712DomainChanged(opts *bind.WatchOpts, sink chan<- *MockErc20EIP712DomainChanged) (event.Subscription, error) {

	logs, sub, err := _MockErc20.contract.WatchLogs(opts, "EIP712DomainChanged")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockErc20EIP712DomainChanged)
				if err := _MockErc20.contract.UnpackLog(event, "EIP712DomainChanged", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseEIP712DomainChanged is a log parse operation binding the contract event 0x0a6387c9ea3628b88a633bb4f3b151770f70085117a15f9bf3787cda53f13d31.
//
// Solidity: event EIP712DomainChanged()
func (_MockErc20 *MockErc20Filterer) ParseEIP712DomainChanged(log types.Log) (*MockErc20EIP712DomainChanged, error) {
	event := new(MockErc20EIP712DomainChanged)
	if err := _MockErc20.contract.UnpackLog(event, "EIP712DomainChanged", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockErc20InitializedIterator is returned from FilterInitialized and is used to iterate over the raw logs and unpacked data for Initialized events raised by the MockErc20 contract.
type MockErc20InitializedIterator struct {
	Event *MockErc20Initialized // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *MockErc20InitializedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockErc20Initialized)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(MockErc20Initialized)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *MockErc20InitializedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockErc20InitializedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockErc20Initialized represents a Initialized event raised by the MockErc20 contract.
type MockErc20Initialized struct {
	Version uint32
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterInitialized is a free log retrieval operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_MockErc20 *MockErc20Filterer) FilterInitialized(opts *bind.FilterOpts) (*MockErc20InitializedIterator, error) {

	logs, sub, err := _MockErc20.contract.FilterLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return &MockErc20InitializedIterator{contract: _MockErc20.contract, event: "Initialized", logs: logs, sub: sub}, nil
}

// WatchInitialized is a free log subscription operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_MockErc20 *MockErc20Filterer) WatchInitialized(opts *bind.WatchOpts, sink chan<- *MockErc20Initialized) (event.Subscription, error) {

	logs, sub, err := _MockErc20.contract.WatchLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockErc20Initialized)
				if err := _MockErc20.contract.UnpackLog(event, "Initialized", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseInitialized is a log parse operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_MockErc20 *MockErc20Filterer) ParseInitialized(log types.Log) (*MockErc20Initialized, error) {
	event := new(MockErc20Initialized)
	if err := _MockErc20.contract.UnpackLog(event, "Initialized", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockErc20InterfaceAddedIterator is returned from FilterInterfaceAdded and is used to iterate over the raw logs and unpacked data for InterfaceAdded events raised by the MockErc20 contract.
type MockErc20InterfaceAddedIterator struct {
	Event *MockErc20InterfaceAdded // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *MockErc20InterfaceAddedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockErc20InterfaceAdded)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(MockErc20InterfaceAdded)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *MockErc20InterfaceAddedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockErc20InterfaceAddedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockErc20InterfaceAdded represents a InterfaceAdded event raised by the MockErc20 contract.
type MockErc20InterfaceAdded struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceAdded is a free log retrieval operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_MockErc20 *MockErc20Filterer) FilterInterfaceAdded(opts *bind.FilterOpts, interfaceId [][4]byte) (*MockErc20InterfaceAddedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _MockErc20.contract.FilterLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &MockErc20InterfaceAddedIterator{contract: _MockErc20.contract, event: "InterfaceAdded", logs: logs, sub: sub}, nil
}

// WatchInterfaceAdded is a free log subscription operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_MockErc20 *MockErc20Filterer) WatchInterfaceAdded(opts *bind.WatchOpts, sink chan<- *MockErc20InterfaceAdded, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _MockErc20.contract.WatchLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockErc20InterfaceAdded)
				if err := _MockErc20.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseInterfaceAdded is a log parse operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_MockErc20 *MockErc20Filterer) ParseInterfaceAdded(log types.Log) (*MockErc20InterfaceAdded, error) {
	event := new(MockErc20InterfaceAdded)
	if err := _MockErc20.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockErc20InterfaceRemovedIterator is returned from FilterInterfaceRemoved and is used to iterate over the raw logs and unpacked data for InterfaceRemoved events raised by the MockErc20 contract.
type MockErc20InterfaceRemovedIterator struct {
	Event *MockErc20InterfaceRemoved // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *MockErc20InterfaceRemovedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockErc20InterfaceRemoved)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(MockErc20InterfaceRemoved)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *MockErc20InterfaceRemovedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockErc20InterfaceRemovedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockErc20InterfaceRemoved represents a InterfaceRemoved event raised by the MockErc20 contract.
type MockErc20InterfaceRemoved struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceRemoved is a free log retrieval operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_MockErc20 *MockErc20Filterer) FilterInterfaceRemoved(opts *bind.FilterOpts, interfaceId [][4]byte) (*MockErc20InterfaceRemovedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _MockErc20.contract.FilterLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &MockErc20InterfaceRemovedIterator{contract: _MockErc20.contract, event: "InterfaceRemoved", logs: logs, sub: sub}, nil
}

// WatchInterfaceRemoved is a free log subscription operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_MockErc20 *MockErc20Filterer) WatchInterfaceRemoved(opts *bind.WatchOpts, sink chan<- *MockErc20InterfaceRemoved, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _MockErc20.contract.WatchLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockErc20InterfaceRemoved)
				if err := _MockErc20.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseInterfaceRemoved is a log parse operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_MockErc20 *MockErc20Filterer) ParseInterfaceRemoved(log types.Log) (*MockErc20InterfaceRemoved, error) {
	event := new(MockErc20InterfaceRemoved)
	if err := _MockErc20.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockErc20TransferIterator is returned from FilterTransfer and is used to iterate over the raw logs and unpacked data for Transfer events raised by the MockErc20 contract.
type MockErc20TransferIterator struct {
	Event *MockErc20Transfer // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *MockErc20TransferIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockErc20Transfer)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(MockErc20Transfer)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *MockErc20TransferIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockErc20TransferIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockErc20Transfer represents a Transfer event raised by the MockErc20 contract.
type MockErc20Transfer struct {
	From  common.Address
	To    common.Address
	Value *big.Int
	Raw   types.Log // Blockchain specific contextual infos
}

// FilterTransfer is a free log retrieval operation binding the contract event 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef.
//
// Solidity: event Transfer(address indexed from, address indexed to, uint256 value)
func (_MockErc20 *MockErc20Filterer) FilterTransfer(opts *bind.FilterOpts, from []common.Address, to []common.Address) (*MockErc20TransferIterator, error) {

	var fromRule []interface{}
	for _, fromItem := range from {
		fromRule = append(fromRule, fromItem)
	}
	var toRule []interface{}
	for _, toItem := range to {
		toRule = append(toRule, toItem)
	}

	logs, sub, err := _MockErc20.contract.FilterLogs(opts, "Transfer", fromRule, toRule)
	if err != nil {
		return nil, err
	}
	return &MockErc20TransferIterator{contract: _MockErc20.contract, event: "Transfer", logs: logs, sub: sub}, nil
}

// WatchTransfer is a free log subscription operation binding the contract event 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef.
//
// Solidity: event Transfer(address indexed from, address indexed to, uint256 value)
func (_MockErc20 *MockErc20Filterer) WatchTransfer(opts *bind.WatchOpts, sink chan<- *MockErc20Transfer, from []common.Address, to []common.Address) (event.Subscription, error) {

	var fromRule []interface{}
	for _, fromItem := range from {
		fromRule = append(fromRule, fromItem)
	}
	var toRule []interface{}
	for _, toItem := range to {
		toRule = append(toRule, toItem)
	}

	logs, sub, err := _MockErc20.contract.WatchLogs(opts, "Transfer", fromRule, toRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockErc20Transfer)
				if err := _MockErc20.contract.UnpackLog(event, "Transfer", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseTransfer is a log parse operation binding the contract event 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef.
//
// Solidity: event Transfer(address indexed from, address indexed to, uint256 value)
func (_MockErc20 *MockErc20Filterer) ParseTransfer(log types.Log) (*MockErc20Transfer, error) {
	event := new(MockErc20Transfer)
	if err := _MockErc20.contract.UnpackLog(event, "Transfer", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
