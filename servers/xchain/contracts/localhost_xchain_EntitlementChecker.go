// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package localhost_xchain

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

// LocalhostEntitlementCheckerMetaData contains all meta data concerning the LocalhostEntitlementChecker contract.
var LocalhostEntitlementCheckerMetaData = &bind.MetaData{
	ABI: "[{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"callerAddress\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"bytes32\",\"name\":\"transactionId\",\"type\":\"bytes32\"},{\"indexed\":false,\"internalType\":\"address[]\",\"name\":\"selectedNodes\",\"type\":\"address[]\"},{\"indexed\":false,\"internalType\":\"address\",\"name\":\"contractAddress\",\"type\":\"address\"}],\"name\":\"EntitlementCheckRequested\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes32\",\"name\":\"transactionId\",\"type\":\"bytes32\"},{\"indexed\":false,\"internalType\":\"enumIEntitlementCheckerEvents.NodeVoteStatus\",\"name\":\"result\",\"type\":\"uint8\"}],\"name\":\"EntitlementCheckResultPosted\",\"type\":\"event\"},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"transactionId\",\"type\":\"bytes32\"},{\"internalType\":\"address[]\",\"name\":\"selectedNodes\",\"type\":\"address[]\"}],\"name\":\"emitEntitlementCheckRequested\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"requestedNodeCount\",\"type\":\"uint256\"},{\"internalType\":\"address\",\"name\":\"requestingContract\",\"type\":\"address\"}],\"name\":\"getRandomNodes\",\"outputs\":[{\"internalType\":\"address[]\",\"name\":\"\",\"type\":\"address[]\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"nodeCount\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"name\":\"nodes\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"name\":\"nodesArray\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"registerNode\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"unregisterNode\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"}]",
}

// LocalhostEntitlementCheckerABI is the input ABI used to generate the binding from.
// Deprecated: Use LocalhostEntitlementCheckerMetaData.ABI instead.
var LocalhostEntitlementCheckerABI = LocalhostEntitlementCheckerMetaData.ABI

// LocalhostEntitlementChecker is an auto generated Go binding around an Ethereum contract.
type LocalhostEntitlementChecker struct {
	LocalhostEntitlementCheckerCaller     // Read-only binding to the contract
	LocalhostEntitlementCheckerTransactor // Write-only binding to the contract
	LocalhostEntitlementCheckerFilterer   // Log filterer for contract events
}

// LocalhostEntitlementCheckerCaller is an auto generated read-only Go binding around an Ethereum contract.
type LocalhostEntitlementCheckerCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// LocalhostEntitlementCheckerTransactor is an auto generated write-only Go binding around an Ethereum contract.
type LocalhostEntitlementCheckerTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// LocalhostEntitlementCheckerFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type LocalhostEntitlementCheckerFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// LocalhostEntitlementCheckerSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type LocalhostEntitlementCheckerSession struct {
	Contract     *LocalhostEntitlementChecker // Generic contract binding to set the session for
	CallOpts     bind.CallOpts                // Call options to use throughout this session
	TransactOpts bind.TransactOpts            // Transaction auth options to use throughout this session
}

// LocalhostEntitlementCheckerCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type LocalhostEntitlementCheckerCallerSession struct {
	Contract *LocalhostEntitlementCheckerCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts                      // Call options to use throughout this session
}

// LocalhostEntitlementCheckerTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type LocalhostEntitlementCheckerTransactorSession struct {
	Contract     *LocalhostEntitlementCheckerTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts                      // Transaction auth options to use throughout this session
}

// LocalhostEntitlementCheckerRaw is an auto generated low-level Go binding around an Ethereum contract.
type LocalhostEntitlementCheckerRaw struct {
	Contract *LocalhostEntitlementChecker // Generic contract binding to access the raw methods on
}

// LocalhostEntitlementCheckerCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type LocalhostEntitlementCheckerCallerRaw struct {
	Contract *LocalhostEntitlementCheckerCaller // Generic read-only contract binding to access the raw methods on
}

// LocalhostEntitlementCheckerTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type LocalhostEntitlementCheckerTransactorRaw struct {
	Contract *LocalhostEntitlementCheckerTransactor // Generic write-only contract binding to access the raw methods on
}

// NewLocalhostEntitlementChecker creates a new instance of LocalhostEntitlementChecker, bound to a specific deployed contract.
func NewLocalhostEntitlementChecker(address common.Address, backend bind.ContractBackend) (*LocalhostEntitlementChecker, error) {
	contract, err := bindLocalhostEntitlementChecker(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &LocalhostEntitlementChecker{LocalhostEntitlementCheckerCaller: LocalhostEntitlementCheckerCaller{contract: contract}, LocalhostEntitlementCheckerTransactor: LocalhostEntitlementCheckerTransactor{contract: contract}, LocalhostEntitlementCheckerFilterer: LocalhostEntitlementCheckerFilterer{contract: contract}}, nil
}

// NewLocalhostEntitlementCheckerCaller creates a new read-only instance of LocalhostEntitlementChecker, bound to a specific deployed contract.
func NewLocalhostEntitlementCheckerCaller(address common.Address, caller bind.ContractCaller) (*LocalhostEntitlementCheckerCaller, error) {
	contract, err := bindLocalhostEntitlementChecker(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &LocalhostEntitlementCheckerCaller{contract: contract}, nil
}

// NewLocalhostEntitlementCheckerTransactor creates a new write-only instance of LocalhostEntitlementChecker, bound to a specific deployed contract.
func NewLocalhostEntitlementCheckerTransactor(address common.Address, transactor bind.ContractTransactor) (*LocalhostEntitlementCheckerTransactor, error) {
	contract, err := bindLocalhostEntitlementChecker(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &LocalhostEntitlementCheckerTransactor{contract: contract}, nil
}

// NewLocalhostEntitlementCheckerFilterer creates a new log filterer instance of LocalhostEntitlementChecker, bound to a specific deployed contract.
func NewLocalhostEntitlementCheckerFilterer(address common.Address, filterer bind.ContractFilterer) (*LocalhostEntitlementCheckerFilterer, error) {
	contract, err := bindLocalhostEntitlementChecker(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &LocalhostEntitlementCheckerFilterer{contract: contract}, nil
}

// bindLocalhostEntitlementChecker binds a generic wrapper to an already deployed contract.
func bindLocalhostEntitlementChecker(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := LocalhostEntitlementCheckerMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_LocalhostEntitlementChecker *LocalhostEntitlementCheckerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _LocalhostEntitlementChecker.Contract.LocalhostEntitlementCheckerCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_LocalhostEntitlementChecker *LocalhostEntitlementCheckerRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _LocalhostEntitlementChecker.Contract.LocalhostEntitlementCheckerTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_LocalhostEntitlementChecker *LocalhostEntitlementCheckerRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _LocalhostEntitlementChecker.Contract.LocalhostEntitlementCheckerTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_LocalhostEntitlementChecker *LocalhostEntitlementCheckerCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _LocalhostEntitlementChecker.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_LocalhostEntitlementChecker *LocalhostEntitlementCheckerTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _LocalhostEntitlementChecker.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_LocalhostEntitlementChecker *LocalhostEntitlementCheckerTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _LocalhostEntitlementChecker.Contract.contract.Transact(opts, method, params...)
}

// GetRandomNodes is a free data retrieval call binding the contract method 0x20f36dae.
//
// Solidity: function getRandomNodes(uint256 requestedNodeCount, address requestingContract) view returns(address[])
func (_LocalhostEntitlementChecker *LocalhostEntitlementCheckerCaller) GetRandomNodes(opts *bind.CallOpts, requestedNodeCount *big.Int, requestingContract common.Address) ([]common.Address, error) {
	var out []interface{}
	err := _LocalhostEntitlementChecker.contract.Call(opts, &out, "getRandomNodes", requestedNodeCount, requestingContract)

	if err != nil {
		return *new([]common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new([]common.Address)).(*[]common.Address)

	return out0, err

}

// GetRandomNodes is a free data retrieval call binding the contract method 0x20f36dae.
//
// Solidity: function getRandomNodes(uint256 requestedNodeCount, address requestingContract) view returns(address[])
func (_LocalhostEntitlementChecker *LocalhostEntitlementCheckerSession) GetRandomNodes(requestedNodeCount *big.Int, requestingContract common.Address) ([]common.Address, error) {
	return _LocalhostEntitlementChecker.Contract.GetRandomNodes(&_LocalhostEntitlementChecker.CallOpts, requestedNodeCount, requestingContract)
}

// GetRandomNodes is a free data retrieval call binding the contract method 0x20f36dae.
//
// Solidity: function getRandomNodes(uint256 requestedNodeCount, address requestingContract) view returns(address[])
func (_LocalhostEntitlementChecker *LocalhostEntitlementCheckerCallerSession) GetRandomNodes(requestedNodeCount *big.Int, requestingContract common.Address) ([]common.Address, error) {
	return _LocalhostEntitlementChecker.Contract.GetRandomNodes(&_LocalhostEntitlementChecker.CallOpts, requestedNodeCount, requestingContract)
}

// NodeCount is a free data retrieval call binding the contract method 0x6da49b83.
//
// Solidity: function nodeCount() view returns(uint256)
func (_LocalhostEntitlementChecker *LocalhostEntitlementCheckerCaller) NodeCount(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _LocalhostEntitlementChecker.contract.Call(opts, &out, "nodeCount")

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// NodeCount is a free data retrieval call binding the contract method 0x6da49b83.
//
// Solidity: function nodeCount() view returns(uint256)
func (_LocalhostEntitlementChecker *LocalhostEntitlementCheckerSession) NodeCount() (*big.Int, error) {
	return _LocalhostEntitlementChecker.Contract.NodeCount(&_LocalhostEntitlementChecker.CallOpts)
}

// NodeCount is a free data retrieval call binding the contract method 0x6da49b83.
//
// Solidity: function nodeCount() view returns(uint256)
func (_LocalhostEntitlementChecker *LocalhostEntitlementCheckerCallerSession) NodeCount() (*big.Int, error) {
	return _LocalhostEntitlementChecker.Contract.NodeCount(&_LocalhostEntitlementChecker.CallOpts)
}

// Nodes is a free data retrieval call binding the contract method 0x189a5a17.
//
// Solidity: function nodes(address ) view returns(address)
func (_LocalhostEntitlementChecker *LocalhostEntitlementCheckerCaller) Nodes(opts *bind.CallOpts, arg0 common.Address) (common.Address, error) {
	var out []interface{}
	err := _LocalhostEntitlementChecker.contract.Call(opts, &out, "nodes", arg0)

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// Nodes is a free data retrieval call binding the contract method 0x189a5a17.
//
// Solidity: function nodes(address ) view returns(address)
func (_LocalhostEntitlementChecker *LocalhostEntitlementCheckerSession) Nodes(arg0 common.Address) (common.Address, error) {
	return _LocalhostEntitlementChecker.Contract.Nodes(&_LocalhostEntitlementChecker.CallOpts, arg0)
}

// Nodes is a free data retrieval call binding the contract method 0x189a5a17.
//
// Solidity: function nodes(address ) view returns(address)
func (_LocalhostEntitlementChecker *LocalhostEntitlementCheckerCallerSession) Nodes(arg0 common.Address) (common.Address, error) {
	return _LocalhostEntitlementChecker.Contract.Nodes(&_LocalhostEntitlementChecker.CallOpts, arg0)
}

// NodesArray is a free data retrieval call binding the contract method 0xc4e10a14.
//
// Solidity: function nodesArray(uint256 ) view returns(address)
func (_LocalhostEntitlementChecker *LocalhostEntitlementCheckerCaller) NodesArray(opts *bind.CallOpts, arg0 *big.Int) (common.Address, error) {
	var out []interface{}
	err := _LocalhostEntitlementChecker.contract.Call(opts, &out, "nodesArray", arg0)

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// NodesArray is a free data retrieval call binding the contract method 0xc4e10a14.
//
// Solidity: function nodesArray(uint256 ) view returns(address)
func (_LocalhostEntitlementChecker *LocalhostEntitlementCheckerSession) NodesArray(arg0 *big.Int) (common.Address, error) {
	return _LocalhostEntitlementChecker.Contract.NodesArray(&_LocalhostEntitlementChecker.CallOpts, arg0)
}

// NodesArray is a free data retrieval call binding the contract method 0xc4e10a14.
//
// Solidity: function nodesArray(uint256 ) view returns(address)
func (_LocalhostEntitlementChecker *LocalhostEntitlementCheckerCallerSession) NodesArray(arg0 *big.Int) (common.Address, error) {
	return _LocalhostEntitlementChecker.Contract.NodesArray(&_LocalhostEntitlementChecker.CallOpts, arg0)
}

// EmitEntitlementCheckRequested is a paid mutator transaction binding the contract method 0xf22f8d2e.
//
// Solidity: function emitEntitlementCheckRequested(bytes32 transactionId, address[] selectedNodes) returns()
func (_LocalhostEntitlementChecker *LocalhostEntitlementCheckerTransactor) EmitEntitlementCheckRequested(opts *bind.TransactOpts, transactionId [32]byte, selectedNodes []common.Address) (*types.Transaction, error) {
	return _LocalhostEntitlementChecker.contract.Transact(opts, "emitEntitlementCheckRequested", transactionId, selectedNodes)
}

// EmitEntitlementCheckRequested is a paid mutator transaction binding the contract method 0xf22f8d2e.
//
// Solidity: function emitEntitlementCheckRequested(bytes32 transactionId, address[] selectedNodes) returns()
func (_LocalhostEntitlementChecker *LocalhostEntitlementCheckerSession) EmitEntitlementCheckRequested(transactionId [32]byte, selectedNodes []common.Address) (*types.Transaction, error) {
	return _LocalhostEntitlementChecker.Contract.EmitEntitlementCheckRequested(&_LocalhostEntitlementChecker.TransactOpts, transactionId, selectedNodes)
}

// EmitEntitlementCheckRequested is a paid mutator transaction binding the contract method 0xf22f8d2e.
//
// Solidity: function emitEntitlementCheckRequested(bytes32 transactionId, address[] selectedNodes) returns()
func (_LocalhostEntitlementChecker *LocalhostEntitlementCheckerTransactorSession) EmitEntitlementCheckRequested(transactionId [32]byte, selectedNodes []common.Address) (*types.Transaction, error) {
	return _LocalhostEntitlementChecker.Contract.EmitEntitlementCheckRequested(&_LocalhostEntitlementChecker.TransactOpts, transactionId, selectedNodes)
}

// RegisterNode is a paid mutator transaction binding the contract method 0x1680b35c.
//
// Solidity: function registerNode() returns(bool)
func (_LocalhostEntitlementChecker *LocalhostEntitlementCheckerTransactor) RegisterNode(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _LocalhostEntitlementChecker.contract.Transact(opts, "registerNode")
}

// RegisterNode is a paid mutator transaction binding the contract method 0x1680b35c.
//
// Solidity: function registerNode() returns(bool)
func (_LocalhostEntitlementChecker *LocalhostEntitlementCheckerSession) RegisterNode() (*types.Transaction, error) {
	return _LocalhostEntitlementChecker.Contract.RegisterNode(&_LocalhostEntitlementChecker.TransactOpts)
}

// RegisterNode is a paid mutator transaction binding the contract method 0x1680b35c.
//
// Solidity: function registerNode() returns(bool)
func (_LocalhostEntitlementChecker *LocalhostEntitlementCheckerTransactorSession) RegisterNode() (*types.Transaction, error) {
	return _LocalhostEntitlementChecker.Contract.RegisterNode(&_LocalhostEntitlementChecker.TransactOpts)
}

// UnregisterNode is a paid mutator transaction binding the contract method 0x3d385cf5.
//
// Solidity: function unregisterNode() returns(bool)
func (_LocalhostEntitlementChecker *LocalhostEntitlementCheckerTransactor) UnregisterNode(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _LocalhostEntitlementChecker.contract.Transact(opts, "unregisterNode")
}

// UnregisterNode is a paid mutator transaction binding the contract method 0x3d385cf5.
//
// Solidity: function unregisterNode() returns(bool)
func (_LocalhostEntitlementChecker *LocalhostEntitlementCheckerSession) UnregisterNode() (*types.Transaction, error) {
	return _LocalhostEntitlementChecker.Contract.UnregisterNode(&_LocalhostEntitlementChecker.TransactOpts)
}

// UnregisterNode is a paid mutator transaction binding the contract method 0x3d385cf5.
//
// Solidity: function unregisterNode() returns(bool)
func (_LocalhostEntitlementChecker *LocalhostEntitlementCheckerTransactorSession) UnregisterNode() (*types.Transaction, error) {
	return _LocalhostEntitlementChecker.Contract.UnregisterNode(&_LocalhostEntitlementChecker.TransactOpts)
}

// LocalhostEntitlementCheckerEntitlementCheckRequestedIterator is returned from FilterEntitlementCheckRequested and is used to iterate over the raw logs and unpacked data for EntitlementCheckRequested events raised by the LocalhostEntitlementChecker contract.
type LocalhostEntitlementCheckerEntitlementCheckRequestedIterator struct {
	Event *LocalhostEntitlementCheckerEntitlementCheckRequested // Event containing the contract specifics and raw log

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
func (it *LocalhostEntitlementCheckerEntitlementCheckRequestedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(LocalhostEntitlementCheckerEntitlementCheckRequested)
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
		it.Event = new(LocalhostEntitlementCheckerEntitlementCheckRequested)
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
func (it *LocalhostEntitlementCheckerEntitlementCheckRequestedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *LocalhostEntitlementCheckerEntitlementCheckRequestedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// LocalhostEntitlementCheckerEntitlementCheckRequested represents a EntitlementCheckRequested event raised by the LocalhostEntitlementChecker contract.
type LocalhostEntitlementCheckerEntitlementCheckRequested struct {
	CallerAddress   common.Address
	TransactionId   [32]byte
	SelectedNodes   []common.Address
	ContractAddress common.Address
	Raw             types.Log // Blockchain specific contextual infos
}

// FilterEntitlementCheckRequested is a free log retrieval operation binding the contract event 0x58529d9ba9cbe2a11e905b3c701769d5265641ce084d196095a7692839481a4b.
//
// Solidity: event EntitlementCheckRequested(address indexed callerAddress, bytes32 transactionId, address[] selectedNodes, address contractAddress)
func (_LocalhostEntitlementChecker *LocalhostEntitlementCheckerFilterer) FilterEntitlementCheckRequested(opts *bind.FilterOpts, callerAddress []common.Address) (*LocalhostEntitlementCheckerEntitlementCheckRequestedIterator, error) {

	var callerAddressRule []interface{}
	for _, callerAddressItem := range callerAddress {
		callerAddressRule = append(callerAddressRule, callerAddressItem)
	}

	logs, sub, err := _LocalhostEntitlementChecker.contract.FilterLogs(opts, "EntitlementCheckRequested", callerAddressRule)
	if err != nil {
		return nil, err
	}
	return &LocalhostEntitlementCheckerEntitlementCheckRequestedIterator{contract: _LocalhostEntitlementChecker.contract, event: "EntitlementCheckRequested", logs: logs, sub: sub}, nil
}

// WatchEntitlementCheckRequested is a free log subscription operation binding the contract event 0x58529d9ba9cbe2a11e905b3c701769d5265641ce084d196095a7692839481a4b.
//
// Solidity: event EntitlementCheckRequested(address indexed callerAddress, bytes32 transactionId, address[] selectedNodes, address contractAddress)
func (_LocalhostEntitlementChecker *LocalhostEntitlementCheckerFilterer) WatchEntitlementCheckRequested(opts *bind.WatchOpts, sink chan<- *LocalhostEntitlementCheckerEntitlementCheckRequested, callerAddress []common.Address) (event.Subscription, error) {

	var callerAddressRule []interface{}
	for _, callerAddressItem := range callerAddress {
		callerAddressRule = append(callerAddressRule, callerAddressItem)
	}

	logs, sub, err := _LocalhostEntitlementChecker.contract.WatchLogs(opts, "EntitlementCheckRequested", callerAddressRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(LocalhostEntitlementCheckerEntitlementCheckRequested)
				if err := _LocalhostEntitlementChecker.contract.UnpackLog(event, "EntitlementCheckRequested", log); err != nil {
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

// ParseEntitlementCheckRequested is a log parse operation binding the contract event 0x58529d9ba9cbe2a11e905b3c701769d5265641ce084d196095a7692839481a4b.
//
// Solidity: event EntitlementCheckRequested(address indexed callerAddress, bytes32 transactionId, address[] selectedNodes, address contractAddress)
func (_LocalhostEntitlementChecker *LocalhostEntitlementCheckerFilterer) ParseEntitlementCheckRequested(log types.Log) (*LocalhostEntitlementCheckerEntitlementCheckRequested, error) {
	event := new(LocalhostEntitlementCheckerEntitlementCheckRequested)
	if err := _LocalhostEntitlementChecker.contract.UnpackLog(event, "EntitlementCheckRequested", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// LocalhostEntitlementCheckerEntitlementCheckResultPostedIterator is returned from FilterEntitlementCheckResultPosted and is used to iterate over the raw logs and unpacked data for EntitlementCheckResultPosted events raised by the LocalhostEntitlementChecker contract.
type LocalhostEntitlementCheckerEntitlementCheckResultPostedIterator struct {
	Event *LocalhostEntitlementCheckerEntitlementCheckResultPosted // Event containing the contract specifics and raw log

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
func (it *LocalhostEntitlementCheckerEntitlementCheckResultPostedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(LocalhostEntitlementCheckerEntitlementCheckResultPosted)
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
		it.Event = new(LocalhostEntitlementCheckerEntitlementCheckResultPosted)
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
func (it *LocalhostEntitlementCheckerEntitlementCheckResultPostedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *LocalhostEntitlementCheckerEntitlementCheckResultPostedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// LocalhostEntitlementCheckerEntitlementCheckResultPosted represents a EntitlementCheckResultPosted event raised by the LocalhostEntitlementChecker contract.
type LocalhostEntitlementCheckerEntitlementCheckResultPosted struct {
	TransactionId [32]byte
	Result        uint8
	Raw           types.Log // Blockchain specific contextual infos
}

// FilterEntitlementCheckResultPosted is a free log retrieval operation binding the contract event 0xb9d6ce397e562841871d119aaf77469c60a3b5bf8b99a5d9851656015015c633.
//
// Solidity: event EntitlementCheckResultPosted(bytes32 indexed transactionId, uint8 result)
func (_LocalhostEntitlementChecker *LocalhostEntitlementCheckerFilterer) FilterEntitlementCheckResultPosted(opts *bind.FilterOpts, transactionId [][32]byte) (*LocalhostEntitlementCheckerEntitlementCheckResultPostedIterator, error) {

	var transactionIdRule []interface{}
	for _, transactionIdItem := range transactionId {
		transactionIdRule = append(transactionIdRule, transactionIdItem)
	}

	logs, sub, err := _LocalhostEntitlementChecker.contract.FilterLogs(opts, "EntitlementCheckResultPosted", transactionIdRule)
	if err != nil {
		return nil, err
	}
	return &LocalhostEntitlementCheckerEntitlementCheckResultPostedIterator{contract: _LocalhostEntitlementChecker.contract, event: "EntitlementCheckResultPosted", logs: logs, sub: sub}, nil
}

// WatchEntitlementCheckResultPosted is a free log subscription operation binding the contract event 0xb9d6ce397e562841871d119aaf77469c60a3b5bf8b99a5d9851656015015c633.
//
// Solidity: event EntitlementCheckResultPosted(bytes32 indexed transactionId, uint8 result)
func (_LocalhostEntitlementChecker *LocalhostEntitlementCheckerFilterer) WatchEntitlementCheckResultPosted(opts *bind.WatchOpts, sink chan<- *LocalhostEntitlementCheckerEntitlementCheckResultPosted, transactionId [][32]byte) (event.Subscription, error) {

	var transactionIdRule []interface{}
	for _, transactionIdItem := range transactionId {
		transactionIdRule = append(transactionIdRule, transactionIdItem)
	}

	logs, sub, err := _LocalhostEntitlementChecker.contract.WatchLogs(opts, "EntitlementCheckResultPosted", transactionIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(LocalhostEntitlementCheckerEntitlementCheckResultPosted)
				if err := _LocalhostEntitlementChecker.contract.UnpackLog(event, "EntitlementCheckResultPosted", log); err != nil {
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

// ParseEntitlementCheckResultPosted is a log parse operation binding the contract event 0xb9d6ce397e562841871d119aaf77469c60a3b5bf8b99a5d9851656015015c633.
//
// Solidity: event EntitlementCheckResultPosted(bytes32 indexed transactionId, uint8 result)
func (_LocalhostEntitlementChecker *LocalhostEntitlementCheckerFilterer) ParseEntitlementCheckResultPosted(log types.Log) (*LocalhostEntitlementCheckerEntitlementCheckResultPosted, error) {
	event := new(LocalhostEntitlementCheckerEntitlementCheckResultPosted)
	if err := _LocalhostEntitlementChecker.contract.UnpackLog(event, "EntitlementCheckResultPosted", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
