// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package dev

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
	ABI: "[{\"type\":\"constructor\",\"inputs\":[{\"name\":\"name\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"symbol\",\"type\":\"string\",\"internalType\":\"string\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"DOMAIN_SEPARATOR\",\"inputs\":[],\"outputs\":[{\"name\":\"result\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"__ERC20_init\",\"inputs\":[{\"name\":\"name_\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"symbol_\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"decimals_\",\"type\":\"uint8\",\"internalType\":\"uint8\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"__Introspection_init\",\"inputs\":[],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"allowance\",\"inputs\":[{\"name\":\"owner\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"spender\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"result\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"approve\",\"inputs\":[{\"name\":\"spender\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"amount\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"balanceOf\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"decimals\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint8\",\"internalType\":\"uint8\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"eip712Domain\",\"inputs\":[],\"outputs\":[{\"name\":\"fields\",\"type\":\"bytes1\",\"internalType\":\"bytes1\"},{\"name\":\"name\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"version\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"chainId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"verifyingContract\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"salt\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"extensions\",\"type\":\"uint256[]\",\"internalType\":\"uint256[]\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"mint\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"amount\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"name\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"string\",\"internalType\":\"string\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"nonces\",\"inputs\":[{\"name\":\"owner\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"result\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"permit\",\"inputs\":[{\"name\":\"owner\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"spender\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"amount\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"deadline\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"v\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"r\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"s\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"supportsInterface\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"internalType\":\"bytes4\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"symbol\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"string\",\"internalType\":\"string\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"totalSupply\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"transfer\",\"inputs\":[{\"name\":\"to\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"amount\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"transferFrom\",\"inputs\":[{\"name\":\"from\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"to\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"amount\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"Approval\",\"inputs\":[{\"name\":\"owner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"spender\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"value\",\"type\":\"uint256\",\"indexed\":false,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"EIP712DomainChanged\",\"inputs\":[],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Initialized\",\"inputs\":[{\"name\":\"version\",\"type\":\"uint32\",\"indexed\":false,\"internalType\":\"uint32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceAdded\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceRemoved\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Transfer\",\"inputs\":[{\"name\":\"from\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"to\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"value\",\"type\":\"uint256\",\"indexed\":false,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"error\",\"name\":\"AllowanceOverflow\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"AllowanceUnderflow\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"ECDSAInvalidSignature\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"ECDSAInvalidSignatureLength\",\"inputs\":[{\"name\":\"length\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"type\":\"error\",\"name\":\"ECDSAInvalidSignatureS\",\"inputs\":[{\"name\":\"s\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}]},{\"type\":\"error\",\"name\":\"Initializable_InInitializingState\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Initializable_NotInInitializingState\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"InsufficientAllowance\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"InsufficientBalance\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_AlreadySupported\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_NotSupported\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"InvalidAccountNonce\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"currentNonce\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"type\":\"error\",\"name\":\"InvalidPermit\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"PermitExpired\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"TotalSupplyOverflow\",\"inputs\":[]}]",
	Bin: "0x60806040523480156200001157600080fd5b5060405162001a7838038062001a78833981016040819052620000349162000418565b6200003e62000054565b6200004c82826012620000fc565b5050620005de565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef520008054640100000000900460ff1615620000a1576040516366008a2d60e01b815260040160405180910390fd5b805463ffffffff9081161015620000f957805463ffffffff191663ffffffff90811782556040519081527fe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c9060200160405180910390a15b50565b6200010e6336372b0760e01b6200016f565b62000120634ec7fbed60e11b6200016f565b6200013263a219a02560e01b6200016f565b6200013f8383836200024f565b6200016a83604051806040016040528060018152602001603160f81b815250620002a860201b60201c565b505050565b6001600160e01b0319811660009081527f81088bbc801e045ea3e7620779ab349988f58afbdfba10dff983df3f33522b00602052604090205460ff161515600114620001fe576001600160e01b0319811660009081527f81088bbc801e045ea3e7620779ab349988f58afbdfba10dff983df3f33522b0060205260409020805460ff1916600117905562000217565b604051637967f77d60e11b815260040160405180910390fd5b6040516001600160e01b03198216907f78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f2290600090a250565b7f42eeb43a78e08448a75e4dd4bca52199850157e8648ba508b0c6a00addcdffbe806200027d858262000512565b50600181016200028e848262000512565b50600201805460ff191660ff929092169190911790555050565b7f3a497e775dc7c283402f0d3c39c5f0ea53870eb15ab2dddfde5a1162a84c336e620002d5838262000512565b507f3a497e775dc7c283402f0d3c39c5f0ea53870eb15ab2dddfde5a1162a84c336f62000303828262000512565b505060007f3a497e775dc7c283402f0d3c39c5f0ea53870eb15ab2dddfde5a1162a84c336c8190557f3a497e775dc7c283402f0d3c39c5f0ea53870eb15ab2dddfde5a1162a84c336d5550565b634e487b7160e01b600052604160045260246000fd5b600082601f8301126200037857600080fd5b81516001600160401b038082111562000395576200039562000350565b604051601f8301601f19908116603f01168101908282118183101715620003c057620003c062000350565b8160405283815260209250866020858801011115620003de57600080fd5b600091505b83821015620004025785820183015181830184015290820190620003e3565b6000602085830101528094505050505092915050565b600080604083850312156200042c57600080fd5b82516001600160401b03808211156200044457600080fd5b620004528683870162000366565b935060208501519150808211156200046957600080fd5b50620004788582860162000366565b9150509250929050565b600181811c908216806200049757607f821691505b602082108103620004b857634e487b7160e01b600052602260045260246000fd5b50919050565b601f8211156200016a576000816000526020600020601f850160051c81016020861015620004e95750805b601f850160051c820191505b818110156200050a57828155600101620004f5565b505050505050565b81516001600160401b038111156200052e576200052e62000350565b62000546816200053f845462000482565b84620004be565b602080601f8311600181146200057e5760008415620005655750858301515b600019600386901b1c1916600185901b1785556200050a565b600085815260208120601f198616915b82811015620005af578886015182559484019460019091019084016200058e565b5085821015620005ce5787850151600019600388901b60f8161c191681555b5050505050600190811b01905550565b61148a80620005ee6000396000f3fe608060405234801561001057600080fd5b506004361061010b5760003560e01c806370a08231116100a257806395d89b411161007157806395d89b4114610209578063a9059cbb14610211578063aa23aa0214610224578063d505accf14610237578063dd62ed3e1461024a57600080fd5b806370a08231146101c05780637ecebe00146101d357806384b0196e146101e6578063930fc8ca1461020157600080fd5b806323b872dd116100de57806323b872dd14610176578063313ce567146101895780633644e515146101a357806340c10f19146101ab57600080fd5b806301ffc9a71461011057806306fdde0314610138578063095ea7b31461014d57806318160ddd14610160575b600080fd5b61012361011e366004610f8b565b61025d565b60405190151581526020015b60405180910390f35b61014061026e565b60405161012f9190610ffb565b61012361015b36600461102a565b61027d565b610168610290565b60405190815260200161012f565b610123610184366004611054565b6102a3565b6101916102b8565b60405160ff909116815260200161012f565b6101686102e5565b6101be6101b936600461102a565b6102ef565b005b6101686101ce366004611090565b6102fd565b6101686101e1366004611090565b610317565b6101ee610354565b60405161012f97969594939291906110ab565b6101be61041c565b610140610470565b61012361021f36600461102a565b61047a565b6101be6102323660046111f8565b610486565b6101be61024536600461126c565b6104e0565b6101686102583660046112d6565b6104f8565b600061026882610517565b92915050565b606061027861055a565b905090565b6000610289838361060b565b9392505050565b60006102786805345cdf77eb68f44c5490565b60006102b084848461065e565b949350505050565b60006102787f42eeb43a78e08448a75e4dd4bca52199850157e8648ba508b0c6a00addcdffc05460ff1690565b600061027861071c565b6102f98282610726565b5050565b6387a211a2600c9081526000828152602090912054610268565b6001600160a01b03811660009081527fda5d6d87446d81938877f0ee239dac391146dd7466ea30567f72becf06773c006020526040812054610268565b60006060808280808360008051602061146a8339815191525415801561039957507f3a497e775dc7c283402f0d3c39c5f0ea53870eb15ab2dddfde5a1162a84c336d54155b6103e25760405162461bcd60e51b81526020600482015260156024820152741152540dcc4c8e88155b9a5b9a5d1a585b1a5e9959605a1b60448201526064015b60405180910390fd5b6103ea6107a5565b6103f26107c4565b60408051600080825260208201909252600f60f81b9b939a50919850469750309650945092509050565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef5200054640100000000900460ff1661046657604051630ef4733760e31b815260040160405180910390fd5b61046e6107e3565b565b60606102786107f3565b60006102898383610824565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef5200054640100000000900460ff166104d057604051630ef4733760e31b815260040160405180910390fd5b6104db83838361089f565b505050565b6104ef878787878787876108fd565b50505050505050565b6020819052637f5e9f20600c9081526000838152603490912054610289565b6001600160e01b03191660009081527f81088bbc801e045ea3e7620779ab349988f58afbdfba10dff983df3f33522b00602052604090205460ff16151560011490565b60607f42eeb43a78e08448a75e4dd4bca52199850157e8648ba508b0c6a00addcdffbe805461058890611309565b80601f01602080910402602001604051908101604052809291908181526020018280546105b490611309565b80156106015780601f106105d657610100808354040283529160200191610601565b820191906000526020600020905b8154815290600101906020018083116105e457829003601f168201915b5050505050905090565b600082602052637f5e9f20600c5233600052816034600c205581600052602c5160601c337f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b92560206000a350600192915050565b60008360601b33602052637f5e9f208117600c526034600c208054600181011561069e5780851115610698576313be252b6000526004601cfd5b84810382555b50506387a211a28117600c526020600c208054808511156106c75763f4d678b86000526004601cfd5b84810382555050836000526020600c208381540181555082602052600c5160601c8160601c7fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef602080a3505060019392505050565b6000610278610a9e565b6805345cdf77eb68f44c548181018181101561074a5763e5cfe9576000526004601cfd5b806805345cdf77eb68f44c5550506387a211a2600c52816000526020600c208181540181555080602052600c5160601c60007fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef602080a35050565b606060008051602061146a833981519152600201805461058890611309565b606060008051602061146a833981519152600301805461058890611309565b61046e6301ffc9a760e01b610b12565b60607f42eeb43a78e08448a75e4dd4bca52199850157e8648ba508b0c6a00addcdffbe600101805461058890611309565b60006387a211a2600c52336000526020600c2080548084111561084f5763f4d678b86000526004601cfd5b83810382555050826000526020600c208281540181555081602052600c5160601c337fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef602080a350600192915050565b6108af6336372b0760e01b610b12565b6108bf634ec7fbed60e11b610b12565b6108cf63a219a02560e01b610b12565b6108da838383610bb8565b6104db83604051806040016040528060018152602001603160f81b815250610c0d565b8342111561094d5760405162461bcd60e51b815260206004820152601d60248201527f45524332305065726d69743a206578706972656420646561646c696e6500000060448201526064016103d9565b60007f6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c98888886109b9836001600160a01b031660009081527fda5d6d87446d81938877f0ee239dac391146dd7466ea30567f72becf06773c006020526040902080546001810190915590565b6040805160208101969096526001600160a01b0394851690860152929091166060840152608083015260a082015260c0810186905260e0016040516020818303038152906040528051906020012090506000610a1482610c9f565b90506000610a2482878787610ccc565b9050896001600160a01b0316816001600160a01b031614610a875760405162461bcd60e51b815260206004820152601e60248201527f45524332305065726d69743a20696e76616c6964207369676e6174757265000060448201526064016103d9565b610a928a8a8a610cfa565b50505050505050505050565b60007f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f610ac9610d4d565b610ad1610db3565b60408051602081019490945283019190915260608201524660808201523060a082015260c00160405160208183030381529060405280519060200120905090565b610b1b81610517565b610b67576001600160e01b0319811660009081527f81088bbc801e045ea3e7620779ab349988f58afbdfba10dff983df3f33522b0060205260409020805460ff19166001179055610b80565b604051637967f77d60e11b815260040160405180910390fd5b6040516001600160e01b03198216907f78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f2290600090a250565b7f42eeb43a78e08448a75e4dd4bca52199850157e8648ba508b0c6a00addcdffbe80610be48582611393565b5060018101610bf38482611393565b50600201805460ff191660ff929092169190911790555050565b7f3a497e775dc7c283402f0d3c39c5f0ea53870eb15ab2dddfde5a1162a84c336e610c388382611393565b507f3a497e775dc7c283402f0d3c39c5f0ea53870eb15ab2dddfde5a1162a84c336f610c648282611393565b5050600060008051602061146a8339815191528190557f3a497e775dc7c283402f0d3c39c5f0ea53870eb15ab2dddfde5a1162a84c336d5550565b6000610268610cac61071c565b8360405161190160f01b8152600281019290925260228201526042902090565b600080600080610cde88888888610e03565b925092509250610cee8282610ed2565b50909695505050505050565b8260601b82602052637f5e9f208117600c52816034600c205581600052602c5160601c8160601c7f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b92560206000a350505050565b600080610d586107a5565b805190915015610d6f578051602090910120919050565b60008051602061146a833981519152548015610d8b5792915050565b7fc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a4709250505090565b600080610dbe6107c4565b805190915015610dd5578051602090910120919050565b7f3a497e775dc7c283402f0d3c39c5f0ea53870eb15ab2dddfde5a1162a84c336d548015610d8b5792915050565b600080807f7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0841115610e3e5750600091506003905082610ec8565b604080516000808252602082018084528a905260ff891692820192909252606081018790526080810186905260019060a0016020604051602081039080840390855afa158015610e92573d6000803e3d6000fd5b5050604051601f1901519150506001600160a01b038116610ebe57506000925060019150829050610ec8565b9250600091508190505b9450945094915050565b6000826003811115610ee657610ee6611453565b03610eef575050565b6001826003811115610f0357610f03611453565b03610f215760405163f645eedf60e01b815260040160405180910390fd5b6002826003811115610f3557610f35611453565b03610f565760405163fce698f760e01b8152600481018290526024016103d9565b6003826003811115610f6a57610f6a611453565b036102f9576040516335e2f38360e21b8152600481018290526024016103d9565b600060208284031215610f9d57600080fd5b81356001600160e01b03198116811461028957600080fd5b6000815180845260005b81811015610fdb57602081850181015186830182015201610fbf565b506000602082860101526020601f19601f83011685010191505092915050565b6020815260006102896020830184610fb5565b80356001600160a01b038116811461102557600080fd5b919050565b6000806040838503121561103d57600080fd5b6110468361100e565b946020939093013593505050565b60008060006060848603121561106957600080fd5b6110728461100e565b92506110806020850161100e565b9150604084013590509250925092565b6000602082840312156110a257600080fd5b6102898261100e565b60ff60f81b881681526000602060e060208401526110cc60e084018a610fb5565b83810360408501526110de818a610fb5565b606085018990526001600160a01b038816608086015260a0850187905284810360c08601528551808252602080880193509091019060005b8181101561113257835183529284019291840191600101611116565b50909c9b505050505050505050505050565b634e487b7160e01b600052604160045260246000fd5b600082601f83011261116b57600080fd5b813567ffffffffffffffff8082111561118657611186611144565b604051601f8301601f19908116603f011681019082821181831017156111ae576111ae611144565b816040528381528660208588010111156111c757600080fd5b836020870160208301376000602085830101528094505050505092915050565b803560ff8116811461102557600080fd5b60008060006060848603121561120d57600080fd5b833567ffffffffffffffff8082111561122557600080fd5b6112318783880161115a565b9450602086013591508082111561124757600080fd5b506112548682870161115a565b925050611263604085016111e7565b90509250925092565b600080600080600080600060e0888a03121561128757600080fd5b6112908861100e565b965061129e6020890161100e565b955060408801359450606088013593506112ba608089016111e7565b925060a0880135915060c0880135905092959891949750929550565b600080604083850312156112e957600080fd5b6112f28361100e565b91506113006020840161100e565b90509250929050565b600181811c9082168061131d57607f821691505b60208210810361133d57634e487b7160e01b600052602260045260246000fd5b50919050565b601f8211156104db576000816000526020600020601f850160051c8101602086101561136c5750805b601f850160051c820191505b8181101561138b57828155600101611378565b505050505050565b815167ffffffffffffffff8111156113ad576113ad611144565b6113c1816113bb8454611309565b84611343565b602080601f8311600181146113f657600084156113de5750858301515b600019600386901b1c1916600185901b17855561138b565b600085815260208120601f198616915b8281101561142557888601518255948401946001909101908401611406565b50858210156114435787850151600019600388901b60f8161c191681555b5050505050600190811b01905550565b634e487b7160e01b600052602160045260246000fdfe3a497e775dc7c283402f0d3c39c5f0ea53870eb15ab2dddfde5a1162a84c336c",
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
