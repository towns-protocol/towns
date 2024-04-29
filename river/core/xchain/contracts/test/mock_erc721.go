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

// MockErc721MetaData contains all meta data concerning the MockErc721 contract.
var MockErc721MetaData = &bind.MetaData{
	ABI: "[{\"type\":\"constructor\",\"inputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"approve\",\"inputs\":[{\"name\":\"to\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"balanceOf\",\"inputs\":[{\"name\":\"owner\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"burn\",\"inputs\":[{\"name\":\"token\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"getApproved\",\"inputs\":[{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"address\",\"internalType\":\"address\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"isApprovedForAll\",\"inputs\":[{\"name\":\"owner\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"mint\",\"inputs\":[{\"name\":\"to\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"amount\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"mintTo\",\"inputs\":[{\"name\":\"to\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"name\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"string\",\"internalType\":\"string\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"ownerOf\",\"inputs\":[{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"address\",\"internalType\":\"address\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"safeTransferFrom\",\"inputs\":[{\"name\":\"from\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"to\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"safeTransferFrom\",\"inputs\":[{\"name\":\"from\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"to\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"data\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setApprovalForAll\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"approved\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"supportsInterface\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"internalType\":\"bytes4\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"symbol\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"string\",\"internalType\":\"string\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"tokenId\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"tokenURI\",\"inputs\":[{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"string\",\"internalType\":\"string\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"transferFrom\",\"inputs\":[{\"name\":\"from\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"to\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"Approval\",\"inputs\":[{\"name\":\"owner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"approved\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"ApprovalForAll\",\"inputs\":[{\"name\":\"owner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"operator\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"approved\",\"type\":\"bool\",\"indexed\":false,\"internalType\":\"bool\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Transfer\",\"inputs\":[{\"name\":\"from\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"to\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"error\",\"name\":\"ERC721IncorrectOwner\",\"inputs\":[{\"name\":\"sender\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"owner\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"ERC721InsufficientApproval\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"type\":\"error\",\"name\":\"ERC721InvalidApprover\",\"inputs\":[{\"name\":\"approver\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"ERC721InvalidOperator\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"ERC721InvalidOwner\",\"inputs\":[{\"name\":\"owner\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"ERC721InvalidReceiver\",\"inputs\":[{\"name\":\"receiver\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"ERC721InvalidSender\",\"inputs\":[{\"name\":\"sender\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"ERC721NonexistentToken\",\"inputs\":[{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]}]",
	Bin: "0x60806040523480156200001157600080fd5b5060405180604001604052806005815260200164135e53919560da1b815250604051806040016040528060048152602001631353919560e21b81525081600090816200005e91906200011d565b5060016200006d82826200011d565b505050620001e9565b634e487b7160e01b600052604160045260246000fd5b600181811c90821680620000a157607f821691505b602082108103620000c257634e487b7160e01b600052602260045260246000fd5b50919050565b601f82111562000118576000816000526020600020601f850160051c81016020861015620000f35750805b601f850160051c820191505b818110156200011457828155600101620000ff565b5050505b505050565b81516001600160401b0381111562000139576200013962000076565b62000151816200014a84546200008c565b84620000c8565b602080601f831160018114620001895760008415620001705750858301515b600019600386901b1c1916600185901b17855562000114565b600085815260208120601f198616915b82811015620001ba5788860151825594840194600190910190840162000199565b5085821015620001d95787850151600019600388901b60f8161c191681555b5050505050600190811b01905550565b61105380620001f96000396000f3fe608060405234801561001057600080fd5b506004361061010b5760003560e01c806342966c68116100a257806395d89b411161007157806395d89b4114610229578063a22cb46514610231578063b88d4fde14610244578063c87b56dd14610257578063e985e9c51461026a57600080fd5b806342966c68146101dd5780636352211e146101f057806370a0823114610203578063755edd171461021657600080fd5b806317d70f7c116100de57806317d70f7c1461018d57806323b872dd146101a457806340c10f19146101b757806342842e0e146101ca57600080fd5b806301ffc9a71461011057806306fdde0314610138578063081812fc1461014d578063095ea7b314610178575b600080fd5b61012361011e366004610cd2565b61027d565b60405190151581526020015b60405180910390f35b6101406102cf565b60405161012f9190610d3f565b61016061015b366004610d52565b610361565b6040516001600160a01b03909116815260200161012f565b61018b610186366004610d87565b61038a565b005b61019660065481565b60405190815260200161012f565b61018b6101b2366004610db1565b610399565b61018b6101c5366004610d87565b610429565b61018b6101d8366004610db1565b610462565b61018b6101eb366004610d52565b61047d565b6101606101fe366004610d52565b610489565b610196610211366004610ded565b610494565b610196610224366004610ded565b6104dc565b610140610506565b61018b61023f366004610e08565b610515565b61018b610252366004610e5a565b610520565b610140610265366004610d52565b610537565b610123610278366004610f36565b6105ac565b60006001600160e01b031982166380ac58cd60e01b14806102ae57506001600160e01b03198216635b5e139f60e01b145b806102c957506301ffc9a760e01b6001600160e01b03198316145b92915050565b6060600080546102de90610f69565b80601f016020809104026020016040519081016040528092919081815260200182805461030a90610f69565b80156103575780601f1061032c57610100808354040283529160200191610357565b820191906000526020600020905b81548152906001019060200180831161033a57829003601f168201915b5050505050905090565b600061036c826105da565b506000828152600460205260409020546001600160a01b03166102c9565b610395828233610613565b5050565b6001600160a01b0382166103c857604051633250574960e11b8152600060048201526024015b60405180910390fd5b60006103d5838333610620565b9050836001600160a01b0316816001600160a01b031614610423576040516364283d7b60e01b81526001600160a01b03808616600483015260248201849052821660448201526064016103bf565b50505050565b60005b8181101561045d5761044083600654610719565b6006805490600061045083610fa3565b909155505060010161042c565b505050565b61045d83838360405180602001604052806000815250610520565b6104868161077e565b50565b60006102c9826105da565b60006001600160a01b0382166104c0576040516322718ad960e21b8152600060048201526024016103bf565b506001600160a01b031660009081526003602052604090205490565b60068054600091826104ed83610fa3565b91905055506104fe82600654610719565b505060065490565b6060600180546102de90610f69565b6103953383836107b9565b61052b848484610399565b61042384848484610858565b6060610542826105da565b50600061055a60408051602081019091526000815290565b9050600081511161057a57604051806020016040528060008152506105a5565b8061058484610981565b604051602001610595929190610fca565b6040516020818303038152906040525b9392505050565b6001600160a01b03918216600090815260056020908152604080832093909416825291909152205460ff1690565b6000818152600260205260408120546001600160a01b0316806102c957604051637e27328960e01b8152600481018490526024016103bf565b61045d8383836001610a14565b6000828152600260205260408120546001600160a01b039081169083161561064d5761064d818486610b1a565b6001600160a01b0381161561068b5761066a600085600080610a14565b6001600160a01b038116600090815260036020526040902080546000190190555b6001600160a01b038516156106ba576001600160a01b0385166000908152600360205260409020805460010190555b60008481526002602052604080822080546001600160a01b0319166001600160a01b0389811691821790925591518793918516917fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef91a4949350505050565b6001600160a01b03821661074357604051633250574960e11b8152600060048201526024016103bf565b600061075183836000610620565b90506001600160a01b0381161561045d576040516339e3563760e11b8152600060048201526024016103bf565b600061078d6000836000610620565b90506001600160a01b03811661039557604051637e27328960e01b8152600481018390526024016103bf565b6001600160a01b0382166107eb57604051630b61174360e31b81526001600160a01b03831660048201526024016103bf565b6001600160a01b03838116600081815260056020908152604080832094871680845294825291829020805460ff191686151590811790915591519182527f17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31910160405180910390a3505050565b6001600160a01b0383163b1561042357604051630a85bd0160e11b81526001600160a01b0384169063150b7a029061089a903390889087908790600401610ff9565b6020604051808303816000875af19250505080156108d5575060408051601f3d908101601f191682019092526108d291810190611036565b60015b61093e573d808015610903576040519150601f19603f3d011682016040523d82523d6000602084013e610908565b606091505b50805160000361093657604051633250574960e11b81526001600160a01b03851660048201526024016103bf565b805181602001fd5b6001600160e01b03198116630a85bd0160e11b1461097a57604051633250574960e11b81526001600160a01b03851660048201526024016103bf565b5050505050565b6060600061098e83610b7e565b600101905060008167ffffffffffffffff8111156109ae576109ae610e44565b6040519080825280601f01601f1916602001820160405280156109d8576020820181803683370190505b5090508181016020015b600019016f181899199a1a9b1b9c1cb0b131b232b360811b600a86061a8153600a85049450846109e257509392505050565b8080610a2857506001600160a01b03821615155b15610aea576000610a38846105da565b90506001600160a01b03831615801590610a645750826001600160a01b0316816001600160a01b031614155b8015610a775750610a7581846105ac565b155b15610aa05760405163a9fbf51f60e01b81526001600160a01b03841660048201526024016103bf565b8115610ae85783856001600160a01b0316826001600160a01b03167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b92560405160405180910390a45b505b5050600090815260046020526040902080546001600160a01b0319166001600160a01b0392909216919091179055565b610b25838383610c56565b61045d576001600160a01b038316610b5357604051637e27328960e01b8152600481018290526024016103bf565b60405163177e802f60e01b81526001600160a01b0383166004820152602481018290526044016103bf565b60008072184f03e93ff9f4daa797ed6e38ed64bf6a1f0160401b8310610bbd5772184f03e93ff9f4daa797ed6e38ed64bf6a1f0160401b830492506040015b6d04ee2d6d415b85acef81000000008310610be9576d04ee2d6d415b85acef8100000000830492506020015b662386f26fc100008310610c0757662386f26fc10000830492506010015b6305f5e1008310610c1f576305f5e100830492506008015b6127108310610c3357612710830492506004015b60648310610c45576064830492506002015b600a83106102c95760010192915050565b60006001600160a01b03831615801590610cb45750826001600160a01b0316846001600160a01b03161480610c905750610c9084846105ac565b80610cb457506000828152600460205260409020546001600160a01b038481169116145b949350505050565b6001600160e01b03198116811461048657600080fd5b600060208284031215610ce457600080fd5b81356105a581610cbc565b60005b83811015610d0a578181015183820152602001610cf2565b50506000910152565b60008151808452610d2b816020860160208601610cef565b601f01601f19169290920160200192915050565b6020815260006105a56020830184610d13565b600060208284031215610d6457600080fd5b5035919050565b80356001600160a01b0381168114610d8257600080fd5b919050565b60008060408385031215610d9a57600080fd5b610da383610d6b565b946020939093013593505050565b600080600060608486031215610dc657600080fd5b610dcf84610d6b565b9250610ddd60208501610d6b565b9150604084013590509250925092565b600060208284031215610dff57600080fd5b6105a582610d6b565b60008060408385031215610e1b57600080fd5b610e2483610d6b565b915060208301358015158114610e3957600080fd5b809150509250929050565b634e487b7160e01b600052604160045260246000fd5b60008060008060808587031215610e7057600080fd5b610e7985610d6b565b9350610e8760208601610d6b565b925060408501359150606085013567ffffffffffffffff80821115610eab57600080fd5b818701915087601f830112610ebf57600080fd5b813581811115610ed157610ed1610e44565b604051601f8201601f19908116603f01168101908382118183101715610ef957610ef9610e44565b816040528281528a6020848701011115610f1257600080fd5b82602086016020830137600060208483010152809550505050505092959194509250565b60008060408385031215610f4957600080fd5b610f5283610d6b565b9150610f6060208401610d6b565b90509250929050565b600181811c90821680610f7d57607f821691505b602082108103610f9d57634e487b7160e01b600052602260045260246000fd5b50919050565b600060018201610fc357634e487b7160e01b600052601160045260246000fd5b5060010190565b60008351610fdc818460208801610cef565b835190830190610ff0818360208801610cef565b01949350505050565b6001600160a01b038581168252841660208201526040810183905260806060820181905260009061102c90830184610d13565b9695505050505050565b60006020828403121561104857600080fd5b81516105a581610cbc56",
}

// MockErc721ABI is the input ABI used to generate the binding from.
// Deprecated: Use MockErc721MetaData.ABI instead.
var MockErc721ABI = MockErc721MetaData.ABI

// MockErc721Bin is the compiled bytecode used for deploying new contracts.
// Deprecated: Use MockErc721MetaData.Bin instead.
var MockErc721Bin = MockErc721MetaData.Bin

// DeployMockErc721 deploys a new Ethereum contract, binding an instance of MockErc721 to it.
func DeployMockErc721(auth *bind.TransactOpts, backend bind.ContractBackend) (common.Address, *types.Transaction, *MockErc721, error) {
	parsed, err := MockErc721MetaData.GetAbi()
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	if parsed == nil {
		return common.Address{}, nil, nil, errors.New("GetABI returned nil")
	}

	address, tx, contract, err := bind.DeployContract(auth, *parsed, common.FromHex(MockErc721Bin), backend)
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	return address, tx, &MockErc721{MockErc721Caller: MockErc721Caller{contract: contract}, MockErc721Transactor: MockErc721Transactor{contract: contract}, MockErc721Filterer: MockErc721Filterer{contract: contract}}, nil
}

// MockErc721 is an auto generated Go binding around an Ethereum contract.
type MockErc721 struct {
	MockErc721Caller     // Read-only binding to the contract
	MockErc721Transactor // Write-only binding to the contract
	MockErc721Filterer   // Log filterer for contract events
}

// MockErc721Caller is an auto generated read-only Go binding around an Ethereum contract.
type MockErc721Caller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// MockErc721Transactor is an auto generated write-only Go binding around an Ethereum contract.
type MockErc721Transactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// MockErc721Filterer is an auto generated log filtering Go binding around an Ethereum contract events.
type MockErc721Filterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// MockErc721Session is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type MockErc721Session struct {
	Contract     *MockErc721       // Generic contract binding to set the session for
	CallOpts     bind.CallOpts     // Call options to use throughout this session
	TransactOpts bind.TransactOpts // Transaction auth options to use throughout this session
}

// MockErc721CallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type MockErc721CallerSession struct {
	Contract *MockErc721Caller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts     // Call options to use throughout this session
}

// MockErc721TransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type MockErc721TransactorSession struct {
	Contract     *MockErc721Transactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts     // Transaction auth options to use throughout this session
}

// MockErc721Raw is an auto generated low-level Go binding around an Ethereum contract.
type MockErc721Raw struct {
	Contract *MockErc721 // Generic contract binding to access the raw methods on
}

// MockErc721CallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type MockErc721CallerRaw struct {
	Contract *MockErc721Caller // Generic read-only contract binding to access the raw methods on
}

// MockErc721TransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type MockErc721TransactorRaw struct {
	Contract *MockErc721Transactor // Generic write-only contract binding to access the raw methods on
}

// NewMockErc721 creates a new instance of MockErc721, bound to a specific deployed contract.
func NewMockErc721(address common.Address, backend bind.ContractBackend) (*MockErc721, error) {
	contract, err := bindMockErc721(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &MockErc721{MockErc721Caller: MockErc721Caller{contract: contract}, MockErc721Transactor: MockErc721Transactor{contract: contract}, MockErc721Filterer: MockErc721Filterer{contract: contract}}, nil
}

// NewMockErc721Caller creates a new read-only instance of MockErc721, bound to a specific deployed contract.
func NewMockErc721Caller(address common.Address, caller bind.ContractCaller) (*MockErc721Caller, error) {
	contract, err := bindMockErc721(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &MockErc721Caller{contract: contract}, nil
}

// NewMockErc721Transactor creates a new write-only instance of MockErc721, bound to a specific deployed contract.
func NewMockErc721Transactor(address common.Address, transactor bind.ContractTransactor) (*MockErc721Transactor, error) {
	contract, err := bindMockErc721(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &MockErc721Transactor{contract: contract}, nil
}

// NewMockErc721Filterer creates a new log filterer instance of MockErc721, bound to a specific deployed contract.
func NewMockErc721Filterer(address common.Address, filterer bind.ContractFilterer) (*MockErc721Filterer, error) {
	contract, err := bindMockErc721(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &MockErc721Filterer{contract: contract}, nil
}

// bindMockErc721 binds a generic wrapper to an already deployed contract.
func bindMockErc721(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := MockErc721MetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_MockErc721 *MockErc721Raw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _MockErc721.Contract.MockErc721Caller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_MockErc721 *MockErc721Raw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _MockErc721.Contract.MockErc721Transactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_MockErc721 *MockErc721Raw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _MockErc721.Contract.MockErc721Transactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_MockErc721 *MockErc721CallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _MockErc721.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_MockErc721 *MockErc721TransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _MockErc721.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_MockErc721 *MockErc721TransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _MockErc721.Contract.contract.Transact(opts, method, params...)
}

// BalanceOf is a free data retrieval call binding the contract method 0x70a08231.
//
// Solidity: function balanceOf(address owner) view returns(uint256)
func (_MockErc721 *MockErc721Caller) BalanceOf(opts *bind.CallOpts, owner common.Address) (*big.Int, error) {
	var out []interface{}
	err := _MockErc721.contract.Call(opts, &out, "balanceOf", owner)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// BalanceOf is a free data retrieval call binding the contract method 0x70a08231.
//
// Solidity: function balanceOf(address owner) view returns(uint256)
func (_MockErc721 *MockErc721Session) BalanceOf(owner common.Address) (*big.Int, error) {
	return _MockErc721.Contract.BalanceOf(&_MockErc721.CallOpts, owner)
}

// BalanceOf is a free data retrieval call binding the contract method 0x70a08231.
//
// Solidity: function balanceOf(address owner) view returns(uint256)
func (_MockErc721 *MockErc721CallerSession) BalanceOf(owner common.Address) (*big.Int, error) {
	return _MockErc721.Contract.BalanceOf(&_MockErc721.CallOpts, owner)
}

// GetApproved is a free data retrieval call binding the contract method 0x081812fc.
//
// Solidity: function getApproved(uint256 tokenId) view returns(address)
func (_MockErc721 *MockErc721Caller) GetApproved(opts *bind.CallOpts, tokenId *big.Int) (common.Address, error) {
	var out []interface{}
	err := _MockErc721.contract.Call(opts, &out, "getApproved", tokenId)

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// GetApproved is a free data retrieval call binding the contract method 0x081812fc.
//
// Solidity: function getApproved(uint256 tokenId) view returns(address)
func (_MockErc721 *MockErc721Session) GetApproved(tokenId *big.Int) (common.Address, error) {
	return _MockErc721.Contract.GetApproved(&_MockErc721.CallOpts, tokenId)
}

// GetApproved is a free data retrieval call binding the contract method 0x081812fc.
//
// Solidity: function getApproved(uint256 tokenId) view returns(address)
func (_MockErc721 *MockErc721CallerSession) GetApproved(tokenId *big.Int) (common.Address, error) {
	return _MockErc721.Contract.GetApproved(&_MockErc721.CallOpts, tokenId)
}

// IsApprovedForAll is a free data retrieval call binding the contract method 0xe985e9c5.
//
// Solidity: function isApprovedForAll(address owner, address operator) view returns(bool)
func (_MockErc721 *MockErc721Caller) IsApprovedForAll(opts *bind.CallOpts, owner common.Address, operator common.Address) (bool, error) {
	var out []interface{}
	err := _MockErc721.contract.Call(opts, &out, "isApprovedForAll", owner, operator)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsApprovedForAll is a free data retrieval call binding the contract method 0xe985e9c5.
//
// Solidity: function isApprovedForAll(address owner, address operator) view returns(bool)
func (_MockErc721 *MockErc721Session) IsApprovedForAll(owner common.Address, operator common.Address) (bool, error) {
	return _MockErc721.Contract.IsApprovedForAll(&_MockErc721.CallOpts, owner, operator)
}

// IsApprovedForAll is a free data retrieval call binding the contract method 0xe985e9c5.
//
// Solidity: function isApprovedForAll(address owner, address operator) view returns(bool)
func (_MockErc721 *MockErc721CallerSession) IsApprovedForAll(owner common.Address, operator common.Address) (bool, error) {
	return _MockErc721.Contract.IsApprovedForAll(&_MockErc721.CallOpts, owner, operator)
}

// Name is a free data retrieval call binding the contract method 0x06fdde03.
//
// Solidity: function name() view returns(string)
func (_MockErc721 *MockErc721Caller) Name(opts *bind.CallOpts) (string, error) {
	var out []interface{}
	err := _MockErc721.contract.Call(opts, &out, "name")

	if err != nil {
		return *new(string), err
	}

	out0 := *abi.ConvertType(out[0], new(string)).(*string)

	return out0, err

}

// Name is a free data retrieval call binding the contract method 0x06fdde03.
//
// Solidity: function name() view returns(string)
func (_MockErc721 *MockErc721Session) Name() (string, error) {
	return _MockErc721.Contract.Name(&_MockErc721.CallOpts)
}

// Name is a free data retrieval call binding the contract method 0x06fdde03.
//
// Solidity: function name() view returns(string)
func (_MockErc721 *MockErc721CallerSession) Name() (string, error) {
	return _MockErc721.Contract.Name(&_MockErc721.CallOpts)
}

// OwnerOf is a free data retrieval call binding the contract method 0x6352211e.
//
// Solidity: function ownerOf(uint256 tokenId) view returns(address)
func (_MockErc721 *MockErc721Caller) OwnerOf(opts *bind.CallOpts, tokenId *big.Int) (common.Address, error) {
	var out []interface{}
	err := _MockErc721.contract.Call(opts, &out, "ownerOf", tokenId)

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// OwnerOf is a free data retrieval call binding the contract method 0x6352211e.
//
// Solidity: function ownerOf(uint256 tokenId) view returns(address)
func (_MockErc721 *MockErc721Session) OwnerOf(tokenId *big.Int) (common.Address, error) {
	return _MockErc721.Contract.OwnerOf(&_MockErc721.CallOpts, tokenId)
}

// OwnerOf is a free data retrieval call binding the contract method 0x6352211e.
//
// Solidity: function ownerOf(uint256 tokenId) view returns(address)
func (_MockErc721 *MockErc721CallerSession) OwnerOf(tokenId *big.Int) (common.Address, error) {
	return _MockErc721.Contract.OwnerOf(&_MockErc721.CallOpts, tokenId)
}

// SupportsInterface is a free data retrieval call binding the contract method 0x01ffc9a7.
//
// Solidity: function supportsInterface(bytes4 interfaceId) view returns(bool)
func (_MockErc721 *MockErc721Caller) SupportsInterface(opts *bind.CallOpts, interfaceId [4]byte) (bool, error) {
	var out []interface{}
	err := _MockErc721.contract.Call(opts, &out, "supportsInterface", interfaceId)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// SupportsInterface is a free data retrieval call binding the contract method 0x01ffc9a7.
//
// Solidity: function supportsInterface(bytes4 interfaceId) view returns(bool)
func (_MockErc721 *MockErc721Session) SupportsInterface(interfaceId [4]byte) (bool, error) {
	return _MockErc721.Contract.SupportsInterface(&_MockErc721.CallOpts, interfaceId)
}

// SupportsInterface is a free data retrieval call binding the contract method 0x01ffc9a7.
//
// Solidity: function supportsInterface(bytes4 interfaceId) view returns(bool)
func (_MockErc721 *MockErc721CallerSession) SupportsInterface(interfaceId [4]byte) (bool, error) {
	return _MockErc721.Contract.SupportsInterface(&_MockErc721.CallOpts, interfaceId)
}

// Symbol is a free data retrieval call binding the contract method 0x95d89b41.
//
// Solidity: function symbol() view returns(string)
func (_MockErc721 *MockErc721Caller) Symbol(opts *bind.CallOpts) (string, error) {
	var out []interface{}
	err := _MockErc721.contract.Call(opts, &out, "symbol")

	if err != nil {
		return *new(string), err
	}

	out0 := *abi.ConvertType(out[0], new(string)).(*string)

	return out0, err

}

// Symbol is a free data retrieval call binding the contract method 0x95d89b41.
//
// Solidity: function symbol() view returns(string)
func (_MockErc721 *MockErc721Session) Symbol() (string, error) {
	return _MockErc721.Contract.Symbol(&_MockErc721.CallOpts)
}

// Symbol is a free data retrieval call binding the contract method 0x95d89b41.
//
// Solidity: function symbol() view returns(string)
func (_MockErc721 *MockErc721CallerSession) Symbol() (string, error) {
	return _MockErc721.Contract.Symbol(&_MockErc721.CallOpts)
}

// TokenId is a free data retrieval call binding the contract method 0x17d70f7c.
//
// Solidity: function tokenId() view returns(uint256)
func (_MockErc721 *MockErc721Caller) TokenId(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _MockErc721.contract.Call(opts, &out, "tokenId")

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// TokenId is a free data retrieval call binding the contract method 0x17d70f7c.
//
// Solidity: function tokenId() view returns(uint256)
func (_MockErc721 *MockErc721Session) TokenId() (*big.Int, error) {
	return _MockErc721.Contract.TokenId(&_MockErc721.CallOpts)
}

// TokenId is a free data retrieval call binding the contract method 0x17d70f7c.
//
// Solidity: function tokenId() view returns(uint256)
func (_MockErc721 *MockErc721CallerSession) TokenId() (*big.Int, error) {
	return _MockErc721.Contract.TokenId(&_MockErc721.CallOpts)
}

// TokenURI is a free data retrieval call binding the contract method 0xc87b56dd.
//
// Solidity: function tokenURI(uint256 tokenId) view returns(string)
func (_MockErc721 *MockErc721Caller) TokenURI(opts *bind.CallOpts, tokenId *big.Int) (string, error) {
	var out []interface{}
	err := _MockErc721.contract.Call(opts, &out, "tokenURI", tokenId)

	if err != nil {
		return *new(string), err
	}

	out0 := *abi.ConvertType(out[0], new(string)).(*string)

	return out0, err

}

// TokenURI is a free data retrieval call binding the contract method 0xc87b56dd.
//
// Solidity: function tokenURI(uint256 tokenId) view returns(string)
func (_MockErc721 *MockErc721Session) TokenURI(tokenId *big.Int) (string, error) {
	return _MockErc721.Contract.TokenURI(&_MockErc721.CallOpts, tokenId)
}

// TokenURI is a free data retrieval call binding the contract method 0xc87b56dd.
//
// Solidity: function tokenURI(uint256 tokenId) view returns(string)
func (_MockErc721 *MockErc721CallerSession) TokenURI(tokenId *big.Int) (string, error) {
	return _MockErc721.Contract.TokenURI(&_MockErc721.CallOpts, tokenId)
}

// Approve is a paid mutator transaction binding the contract method 0x095ea7b3.
//
// Solidity: function approve(address to, uint256 tokenId) returns()
func (_MockErc721 *MockErc721Transactor) Approve(opts *bind.TransactOpts, to common.Address, tokenId *big.Int) (*types.Transaction, error) {
	return _MockErc721.contract.Transact(opts, "approve", to, tokenId)
}

// Approve is a paid mutator transaction binding the contract method 0x095ea7b3.
//
// Solidity: function approve(address to, uint256 tokenId) returns()
func (_MockErc721 *MockErc721Session) Approve(to common.Address, tokenId *big.Int) (*types.Transaction, error) {
	return _MockErc721.Contract.Approve(&_MockErc721.TransactOpts, to, tokenId)
}

// Approve is a paid mutator transaction binding the contract method 0x095ea7b3.
//
// Solidity: function approve(address to, uint256 tokenId) returns()
func (_MockErc721 *MockErc721TransactorSession) Approve(to common.Address, tokenId *big.Int) (*types.Transaction, error) {
	return _MockErc721.Contract.Approve(&_MockErc721.TransactOpts, to, tokenId)
}

// Burn is a paid mutator transaction binding the contract method 0x42966c68.
//
// Solidity: function burn(uint256 token) returns()
func (_MockErc721 *MockErc721Transactor) Burn(opts *bind.TransactOpts, token *big.Int) (*types.Transaction, error) {
	return _MockErc721.contract.Transact(opts, "burn", token)
}

// Burn is a paid mutator transaction binding the contract method 0x42966c68.
//
// Solidity: function burn(uint256 token) returns()
func (_MockErc721 *MockErc721Session) Burn(token *big.Int) (*types.Transaction, error) {
	return _MockErc721.Contract.Burn(&_MockErc721.TransactOpts, token)
}

// Burn is a paid mutator transaction binding the contract method 0x42966c68.
//
// Solidity: function burn(uint256 token) returns()
func (_MockErc721 *MockErc721TransactorSession) Burn(token *big.Int) (*types.Transaction, error) {
	return _MockErc721.Contract.Burn(&_MockErc721.TransactOpts, token)
}

// Mint is a paid mutator transaction binding the contract method 0x40c10f19.
//
// Solidity: function mint(address to, uint256 amount) returns()
func (_MockErc721 *MockErc721Transactor) Mint(opts *bind.TransactOpts, to common.Address, amount *big.Int) (*types.Transaction, error) {
	return _MockErc721.contract.Transact(opts, "mint", to, amount)
}

// Mint is a paid mutator transaction binding the contract method 0x40c10f19.
//
// Solidity: function mint(address to, uint256 amount) returns()
func (_MockErc721 *MockErc721Session) Mint(to common.Address, amount *big.Int) (*types.Transaction, error) {
	return _MockErc721.Contract.Mint(&_MockErc721.TransactOpts, to, amount)
}

// Mint is a paid mutator transaction binding the contract method 0x40c10f19.
//
// Solidity: function mint(address to, uint256 amount) returns()
func (_MockErc721 *MockErc721TransactorSession) Mint(to common.Address, amount *big.Int) (*types.Transaction, error) {
	return _MockErc721.Contract.Mint(&_MockErc721.TransactOpts, to, amount)
}

// MintTo is a paid mutator transaction binding the contract method 0x755edd17.
//
// Solidity: function mintTo(address to) returns(uint256)
func (_MockErc721 *MockErc721Transactor) MintTo(opts *bind.TransactOpts, to common.Address) (*types.Transaction, error) {
	return _MockErc721.contract.Transact(opts, "mintTo", to)
}

// MintTo is a paid mutator transaction binding the contract method 0x755edd17.
//
// Solidity: function mintTo(address to) returns(uint256)
func (_MockErc721 *MockErc721Session) MintTo(to common.Address) (*types.Transaction, error) {
	return _MockErc721.Contract.MintTo(&_MockErc721.TransactOpts, to)
}

// MintTo is a paid mutator transaction binding the contract method 0x755edd17.
//
// Solidity: function mintTo(address to) returns(uint256)
func (_MockErc721 *MockErc721TransactorSession) MintTo(to common.Address) (*types.Transaction, error) {
	return _MockErc721.Contract.MintTo(&_MockErc721.TransactOpts, to)
}

// SafeTransferFrom is a paid mutator transaction binding the contract method 0x42842e0e.
//
// Solidity: function safeTransferFrom(address from, address to, uint256 tokenId) returns()
func (_MockErc721 *MockErc721Transactor) SafeTransferFrom(opts *bind.TransactOpts, from common.Address, to common.Address, tokenId *big.Int) (*types.Transaction, error) {
	return _MockErc721.contract.Transact(opts, "safeTransferFrom", from, to, tokenId)
}

// SafeTransferFrom is a paid mutator transaction binding the contract method 0x42842e0e.
//
// Solidity: function safeTransferFrom(address from, address to, uint256 tokenId) returns()
func (_MockErc721 *MockErc721Session) SafeTransferFrom(from common.Address, to common.Address, tokenId *big.Int) (*types.Transaction, error) {
	return _MockErc721.Contract.SafeTransferFrom(&_MockErc721.TransactOpts, from, to, tokenId)
}

// SafeTransferFrom is a paid mutator transaction binding the contract method 0x42842e0e.
//
// Solidity: function safeTransferFrom(address from, address to, uint256 tokenId) returns()
func (_MockErc721 *MockErc721TransactorSession) SafeTransferFrom(from common.Address, to common.Address, tokenId *big.Int) (*types.Transaction, error) {
	return _MockErc721.Contract.SafeTransferFrom(&_MockErc721.TransactOpts, from, to, tokenId)
}

// SafeTransferFrom0 is a paid mutator transaction binding the contract method 0xb88d4fde.
//
// Solidity: function safeTransferFrom(address from, address to, uint256 tokenId, bytes data) returns()
func (_MockErc721 *MockErc721Transactor) SafeTransferFrom0(opts *bind.TransactOpts, from common.Address, to common.Address, tokenId *big.Int, data []byte) (*types.Transaction, error) {
	return _MockErc721.contract.Transact(opts, "safeTransferFrom0", from, to, tokenId, data)
}

// SafeTransferFrom0 is a paid mutator transaction binding the contract method 0xb88d4fde.
//
// Solidity: function safeTransferFrom(address from, address to, uint256 tokenId, bytes data) returns()
func (_MockErc721 *MockErc721Session) SafeTransferFrom0(from common.Address, to common.Address, tokenId *big.Int, data []byte) (*types.Transaction, error) {
	return _MockErc721.Contract.SafeTransferFrom0(&_MockErc721.TransactOpts, from, to, tokenId, data)
}

// SafeTransferFrom0 is a paid mutator transaction binding the contract method 0xb88d4fde.
//
// Solidity: function safeTransferFrom(address from, address to, uint256 tokenId, bytes data) returns()
func (_MockErc721 *MockErc721TransactorSession) SafeTransferFrom0(from common.Address, to common.Address, tokenId *big.Int, data []byte) (*types.Transaction, error) {
	return _MockErc721.Contract.SafeTransferFrom0(&_MockErc721.TransactOpts, from, to, tokenId, data)
}

// SetApprovalForAll is a paid mutator transaction binding the contract method 0xa22cb465.
//
// Solidity: function setApprovalForAll(address operator, bool approved) returns()
func (_MockErc721 *MockErc721Transactor) SetApprovalForAll(opts *bind.TransactOpts, operator common.Address, approved bool) (*types.Transaction, error) {
	return _MockErc721.contract.Transact(opts, "setApprovalForAll", operator, approved)
}

// SetApprovalForAll is a paid mutator transaction binding the contract method 0xa22cb465.
//
// Solidity: function setApprovalForAll(address operator, bool approved) returns()
func (_MockErc721 *MockErc721Session) SetApprovalForAll(operator common.Address, approved bool) (*types.Transaction, error) {
	return _MockErc721.Contract.SetApprovalForAll(&_MockErc721.TransactOpts, operator, approved)
}

// SetApprovalForAll is a paid mutator transaction binding the contract method 0xa22cb465.
//
// Solidity: function setApprovalForAll(address operator, bool approved) returns()
func (_MockErc721 *MockErc721TransactorSession) SetApprovalForAll(operator common.Address, approved bool) (*types.Transaction, error) {
	return _MockErc721.Contract.SetApprovalForAll(&_MockErc721.TransactOpts, operator, approved)
}

// TransferFrom is a paid mutator transaction binding the contract method 0x23b872dd.
//
// Solidity: function transferFrom(address from, address to, uint256 tokenId) returns()
func (_MockErc721 *MockErc721Transactor) TransferFrom(opts *bind.TransactOpts, from common.Address, to common.Address, tokenId *big.Int) (*types.Transaction, error) {
	return _MockErc721.contract.Transact(opts, "transferFrom", from, to, tokenId)
}

// TransferFrom is a paid mutator transaction binding the contract method 0x23b872dd.
//
// Solidity: function transferFrom(address from, address to, uint256 tokenId) returns()
func (_MockErc721 *MockErc721Session) TransferFrom(from common.Address, to common.Address, tokenId *big.Int) (*types.Transaction, error) {
	return _MockErc721.Contract.TransferFrom(&_MockErc721.TransactOpts, from, to, tokenId)
}

// TransferFrom is a paid mutator transaction binding the contract method 0x23b872dd.
//
// Solidity: function transferFrom(address from, address to, uint256 tokenId) returns()
func (_MockErc721 *MockErc721TransactorSession) TransferFrom(from common.Address, to common.Address, tokenId *big.Int) (*types.Transaction, error) {
	return _MockErc721.Contract.TransferFrom(&_MockErc721.TransactOpts, from, to, tokenId)
}

// MockErc721ApprovalIterator is returned from FilterApproval and is used to iterate over the raw logs and unpacked data for Approval events raised by the MockErc721 contract.
type MockErc721ApprovalIterator struct {
	Event *MockErc721Approval // Event containing the contract specifics and raw log

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
func (it *MockErc721ApprovalIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockErc721Approval)
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
		it.Event = new(MockErc721Approval)
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
func (it *MockErc721ApprovalIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockErc721ApprovalIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockErc721Approval represents a Approval event raised by the MockErc721 contract.
type MockErc721Approval struct {
	Owner    common.Address
	Approved common.Address
	TokenId  *big.Int
	Raw      types.Log // Blockchain specific contextual infos
}

// FilterApproval is a free log retrieval operation binding the contract event 0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925.
//
// Solidity: event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)
func (_MockErc721 *MockErc721Filterer) FilterApproval(opts *bind.FilterOpts, owner []common.Address, approved []common.Address, tokenId []*big.Int) (*MockErc721ApprovalIterator, error) {

	var ownerRule []interface{}
	for _, ownerItem := range owner {
		ownerRule = append(ownerRule, ownerItem)
	}
	var approvedRule []interface{}
	for _, approvedItem := range approved {
		approvedRule = append(approvedRule, approvedItem)
	}
	var tokenIdRule []interface{}
	for _, tokenIdItem := range tokenId {
		tokenIdRule = append(tokenIdRule, tokenIdItem)
	}

	logs, sub, err := _MockErc721.contract.FilterLogs(opts, "Approval", ownerRule, approvedRule, tokenIdRule)
	if err != nil {
		return nil, err
	}
	return &MockErc721ApprovalIterator{contract: _MockErc721.contract, event: "Approval", logs: logs, sub: sub}, nil
}

// WatchApproval is a free log subscription operation binding the contract event 0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925.
//
// Solidity: event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)
func (_MockErc721 *MockErc721Filterer) WatchApproval(opts *bind.WatchOpts, sink chan<- *MockErc721Approval, owner []common.Address, approved []common.Address, tokenId []*big.Int) (event.Subscription, error) {

	var ownerRule []interface{}
	for _, ownerItem := range owner {
		ownerRule = append(ownerRule, ownerItem)
	}
	var approvedRule []interface{}
	for _, approvedItem := range approved {
		approvedRule = append(approvedRule, approvedItem)
	}
	var tokenIdRule []interface{}
	for _, tokenIdItem := range tokenId {
		tokenIdRule = append(tokenIdRule, tokenIdItem)
	}

	logs, sub, err := _MockErc721.contract.WatchLogs(opts, "Approval", ownerRule, approvedRule, tokenIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockErc721Approval)
				if err := _MockErc721.contract.UnpackLog(event, "Approval", log); err != nil {
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
// Solidity: event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)
func (_MockErc721 *MockErc721Filterer) ParseApproval(log types.Log) (*MockErc721Approval, error) {
	event := new(MockErc721Approval)
	if err := _MockErc721.contract.UnpackLog(event, "Approval", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockErc721ApprovalForAllIterator is returned from FilterApprovalForAll and is used to iterate over the raw logs and unpacked data for ApprovalForAll events raised by the MockErc721 contract.
type MockErc721ApprovalForAllIterator struct {
	Event *MockErc721ApprovalForAll // Event containing the contract specifics and raw log

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
func (it *MockErc721ApprovalForAllIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockErc721ApprovalForAll)
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
		it.Event = new(MockErc721ApprovalForAll)
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
func (it *MockErc721ApprovalForAllIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockErc721ApprovalForAllIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockErc721ApprovalForAll represents a ApprovalForAll event raised by the MockErc721 contract.
type MockErc721ApprovalForAll struct {
	Owner    common.Address
	Operator common.Address
	Approved bool
	Raw      types.Log // Blockchain specific contextual infos
}

// FilterApprovalForAll is a free log retrieval operation binding the contract event 0x17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31.
//
// Solidity: event ApprovalForAll(address indexed owner, address indexed operator, bool approved)
func (_MockErc721 *MockErc721Filterer) FilterApprovalForAll(opts *bind.FilterOpts, owner []common.Address, operator []common.Address) (*MockErc721ApprovalForAllIterator, error) {

	var ownerRule []interface{}
	for _, ownerItem := range owner {
		ownerRule = append(ownerRule, ownerItem)
	}
	var operatorRule []interface{}
	for _, operatorItem := range operator {
		operatorRule = append(operatorRule, operatorItem)
	}

	logs, sub, err := _MockErc721.contract.FilterLogs(opts, "ApprovalForAll", ownerRule, operatorRule)
	if err != nil {
		return nil, err
	}
	return &MockErc721ApprovalForAllIterator{contract: _MockErc721.contract, event: "ApprovalForAll", logs: logs, sub: sub}, nil
}

// WatchApprovalForAll is a free log subscription operation binding the contract event 0x17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31.
//
// Solidity: event ApprovalForAll(address indexed owner, address indexed operator, bool approved)
func (_MockErc721 *MockErc721Filterer) WatchApprovalForAll(opts *bind.WatchOpts, sink chan<- *MockErc721ApprovalForAll, owner []common.Address, operator []common.Address) (event.Subscription, error) {

	var ownerRule []interface{}
	for _, ownerItem := range owner {
		ownerRule = append(ownerRule, ownerItem)
	}
	var operatorRule []interface{}
	for _, operatorItem := range operator {
		operatorRule = append(operatorRule, operatorItem)
	}

	logs, sub, err := _MockErc721.contract.WatchLogs(opts, "ApprovalForAll", ownerRule, operatorRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockErc721ApprovalForAll)
				if err := _MockErc721.contract.UnpackLog(event, "ApprovalForAll", log); err != nil {
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

// ParseApprovalForAll is a log parse operation binding the contract event 0x17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31.
//
// Solidity: event ApprovalForAll(address indexed owner, address indexed operator, bool approved)
func (_MockErc721 *MockErc721Filterer) ParseApprovalForAll(log types.Log) (*MockErc721ApprovalForAll, error) {
	event := new(MockErc721ApprovalForAll)
	if err := _MockErc721.contract.UnpackLog(event, "ApprovalForAll", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockErc721TransferIterator is returned from FilterTransfer and is used to iterate over the raw logs and unpacked data for Transfer events raised by the MockErc721 contract.
type MockErc721TransferIterator struct {
	Event *MockErc721Transfer // Event containing the contract specifics and raw log

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
func (it *MockErc721TransferIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockErc721Transfer)
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
		it.Event = new(MockErc721Transfer)
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
func (it *MockErc721TransferIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockErc721TransferIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockErc721Transfer represents a Transfer event raised by the MockErc721 contract.
type MockErc721Transfer struct {
	From    common.Address
	To      common.Address
	TokenId *big.Int
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterTransfer is a free log retrieval operation binding the contract event 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef.
//
// Solidity: event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
func (_MockErc721 *MockErc721Filterer) FilterTransfer(opts *bind.FilterOpts, from []common.Address, to []common.Address, tokenId []*big.Int) (*MockErc721TransferIterator, error) {

	var fromRule []interface{}
	for _, fromItem := range from {
		fromRule = append(fromRule, fromItem)
	}
	var toRule []interface{}
	for _, toItem := range to {
		toRule = append(toRule, toItem)
	}
	var tokenIdRule []interface{}
	for _, tokenIdItem := range tokenId {
		tokenIdRule = append(tokenIdRule, tokenIdItem)
	}

	logs, sub, err := _MockErc721.contract.FilterLogs(opts, "Transfer", fromRule, toRule, tokenIdRule)
	if err != nil {
		return nil, err
	}
	return &MockErc721TransferIterator{contract: _MockErc721.contract, event: "Transfer", logs: logs, sub: sub}, nil
}

// WatchTransfer is a free log subscription operation binding the contract event 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef.
//
// Solidity: event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
func (_MockErc721 *MockErc721Filterer) WatchTransfer(opts *bind.WatchOpts, sink chan<- *MockErc721Transfer, from []common.Address, to []common.Address, tokenId []*big.Int) (event.Subscription, error) {

	var fromRule []interface{}
	for _, fromItem := range from {
		fromRule = append(fromRule, fromItem)
	}
	var toRule []interface{}
	for _, toItem := range to {
		toRule = append(toRule, toItem)
	}
	var tokenIdRule []interface{}
	for _, tokenIdItem := range tokenId {
		tokenIdRule = append(tokenIdRule, tokenIdItem)
	}

	logs, sub, err := _MockErc721.contract.WatchLogs(opts, "Transfer", fromRule, toRule, tokenIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockErc721Transfer)
				if err := _MockErc721.contract.UnpackLog(event, "Transfer", log); err != nil {
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
// Solidity: event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
func (_MockErc721 *MockErc721Filterer) ParseTransfer(log types.Log) (*MockErc721Transfer, error) {
	event := new(MockErc721Transfer)
	if err := _MockErc721.contract.UnpackLog(event, "Transfer", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
