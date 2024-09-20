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

// Node is an auto generated low-level Go binding around an user-defined struct.
type Node struct {
	Status      uint8
	Url         string
	NodeAddress common.Address
	Operator    common.Address
}

// SetMiniblock is an auto generated low-level Go binding around an user-defined struct.
type SetMiniblock struct {
	StreamId          [32]byte
	PrevMiniBlockHash [32]byte
	LastMiniblockHash [32]byte
	LastMiniblockNum  uint64
	IsSealed          bool
}

// Setting is an auto generated low-level Go binding around an user-defined struct.
type Setting struct {
	Key         [32]byte
	BlockNumber uint64
	Value       []byte
}

// Stream is an auto generated low-level Go binding around an user-defined struct.
type Stream struct {
	LastMiniblockHash [32]byte
	LastMiniblockNum  uint64
	Reserved0         uint64
	Flags             uint64
	Nodes             []common.Address
}

// StreamWithId is an auto generated low-level Go binding around an user-defined struct.
type StreamWithId struct {
	Id     [32]byte
	Stream Stream
}

// MockRiverRegistryMetaData contains all meta data concerning the MockRiverRegistry contract.
var MockRiverRegistryMetaData = &bind.MetaData{
	ABI: "[{\"type\":\"constructor\",\"inputs\":[{\"name\":\"approvedOperators\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"__OperatorRegistry_init\",\"inputs\":[{\"name\":\"initialOperators\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"__RiverConfig_init\",\"inputs\":[{\"name\":\"configManagers\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"allocateStream\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"},{\"name\":\"genesisMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"genesisMiniblock\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"approveConfigurationManager\",\"inputs\":[{\"name\":\"manager\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"approveOperator\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"configurationExists\",\"inputs\":[{\"name\":\"key\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"deleteConfiguration\",\"inputs\":[{\"name\":\"key\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"deleteConfigurationOnBlock\",\"inputs\":[{\"name\":\"key\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"blockNumber\",\"type\":\"uint64\",\"internalType\":\"uint64\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"getAllConfiguration\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"tuple[]\",\"internalType\":\"structSetting[]\",\"components\":[{\"name\":\"key\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"blockNumber\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"value\",\"type\":\"bytes\",\"internalType\":\"bytes\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getAllNodeAddresses\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getAllNodes\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"tuple[]\",\"internalType\":\"structNode[]\",\"components\":[{\"name\":\"status\",\"type\":\"uint8\",\"internalType\":\"enumNodeStatus\"},{\"name\":\"url\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getAllOperators\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getAllStreamIds\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"bytes32[]\",\"internalType\":\"bytes32[]\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getAllStreams\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"tuple[]\",\"internalType\":\"structStreamWithId[]\",\"components\":[{\"name\":\"id\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"stream\",\"type\":\"tuple\",\"internalType\":\"structStream\",\"components\":[{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"reserved0\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"flags\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"}]}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getConfiguration\",\"inputs\":[{\"name\":\"key\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple[]\",\"internalType\":\"structSetting[]\",\"components\":[{\"name\":\"key\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"blockNumber\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"value\",\"type\":\"bytes\",\"internalType\":\"bytes\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getNode\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple\",\"internalType\":\"structNode\",\"components\":[{\"name\":\"status\",\"type\":\"uint8\",\"internalType\":\"enumNodeStatus\"},{\"name\":\"url\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getNodeCount\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getPaginatedStreams\",\"inputs\":[{\"name\":\"start\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"stop\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple[]\",\"internalType\":\"structStreamWithId[]\",\"components\":[{\"name\":\"id\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"stream\",\"type\":\"tuple\",\"internalType\":\"structStream\",\"components\":[{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"reserved0\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"flags\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"}]}]},{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getStream\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple\",\"internalType\":\"structStream\",\"components\":[{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"reserved0\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"flags\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getStreamByIndex\",\"inputs\":[{\"name\":\"i\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple\",\"internalType\":\"structStreamWithId\",\"components\":[{\"name\":\"id\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"stream\",\"type\":\"tuple\",\"internalType\":\"structStream\",\"components\":[{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"reserved0\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"flags\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"}]}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getStreamCount\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getStreamCountOnNode\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getStreamWithGenesis\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple\",\"internalType\":\"structStream\",\"components\":[{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"reserved0\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"flags\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"}]},{\"name\":\"\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getStreams\",\"inputs\":[{\"name\":\"streamIds\",\"type\":\"bytes32[]\",\"internalType\":\"bytes32[]\"}],\"outputs\":[{\"name\":\"foundCount\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"\",\"type\":\"tuple[]\",\"internalType\":\"structStreamWithId[]\",\"components\":[{\"name\":\"id\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"stream\",\"type\":\"tuple\",\"internalType\":\"structStream\",\"components\":[{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"reserved0\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"flags\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"}]}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getStreamsOnNode\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple[]\",\"internalType\":\"structStreamWithId[]\",\"components\":[{\"name\":\"id\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"stream\",\"type\":\"tuple\",\"internalType\":\"structStream\",\"components\":[{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"reserved0\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"flags\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"}]}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"isConfigurationManager\",\"inputs\":[{\"name\":\"manager\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"isOperator\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"placeStreamOnNode\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"registerNode\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"url\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"status\",\"type\":\"uint8\",\"internalType\":\"enumNodeStatus\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"removeConfigurationManager\",\"inputs\":[{\"name\":\"manager\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"removeNode\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"removeOperator\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"removeStreamFromNode\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setConfiguration\",\"inputs\":[{\"name\":\"key\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"blockNumber\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"value\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setStreamLastMiniblock\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"isSealed\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setStreamLastMiniblockBatch\",\"inputs\":[{\"name\":\"miniblocks\",\"type\":\"tuple[]\",\"internalType\":\"structSetMiniblock[]\",\"components\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"prevMiniBlockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"isSealed\",\"type\":\"bool\",\"internalType\":\"bool\"}]}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"updateNodeStatus\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"status\",\"type\":\"uint8\",\"internalType\":\"enumNodeStatus\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"updateNodeUrl\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"url\",\"type\":\"string\",\"internalType\":\"string\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"ConfigurationChanged\",\"inputs\":[{\"name\":\"key\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"block\",\"type\":\"uint64\",\"indexed\":false,\"internalType\":\"uint64\"},{\"name\":\"value\",\"type\":\"bytes\",\"indexed\":false,\"internalType\":\"bytes\"},{\"name\":\"deleted\",\"type\":\"bool\",\"indexed\":false,\"internalType\":\"bool\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"ConfigurationManagerAdded\",\"inputs\":[{\"name\":\"manager\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"ConfigurationManagerRemoved\",\"inputs\":[{\"name\":\"manager\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Initialized\",\"inputs\":[{\"name\":\"version\",\"type\":\"uint32\",\"indexed\":false,\"internalType\":\"uint32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceAdded\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceRemoved\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"NodeAdded\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"operator\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"url\",\"type\":\"string\",\"indexed\":false,\"internalType\":\"string\"},{\"name\":\"status\",\"type\":\"uint8\",\"indexed\":false,\"internalType\":\"enumNodeStatus\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"NodeRemoved\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"NodeStatusUpdated\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"status\",\"type\":\"uint8\",\"indexed\":false,\"internalType\":\"enumNodeStatus\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"NodeUrlUpdated\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"url\",\"type\":\"string\",\"indexed\":false,\"internalType\":\"string\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"OperatorAdded\",\"inputs\":[{\"name\":\"operatorAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"OperatorRemoved\",\"inputs\":[{\"name\":\"operatorAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"OwnershipTransferred\",\"inputs\":[{\"name\":\"previousOwner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"newOwner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"StreamAllocated\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"indexed\":false,\"internalType\":\"address[]\"},{\"name\":\"genesisMiniblockHash\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"genesisMiniblock\",\"type\":\"bytes\",\"indexed\":false,\"internalType\":\"bytes\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"StreamLastMiniblockUpdateFailed\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"indexed\":false,\"internalType\":\"uint64\"},{\"name\":\"reason\",\"type\":\"string\",\"indexed\":false,\"internalType\":\"string\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"StreamLastMiniblockUpdated\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"indexed\":false,\"internalType\":\"uint64\"},{\"name\":\"isSealed\",\"type\":\"bool\",\"indexed\":false,\"internalType\":\"bool\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"StreamPlacementUpdated\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"nodeAddress\",\"type\":\"address\",\"indexed\":false,\"internalType\":\"address\"},{\"name\":\"isAdded\",\"type\":\"bool\",\"indexed\":false,\"internalType\":\"bool\"}],\"anonymous\":false},{\"type\":\"error\",\"name\":\"Initializable_InInitializingState\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Initializable_NotInInitializingState\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_AlreadySupported\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_NotSupported\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Ownable__NotOwner\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"Ownable__ZeroAddress\",\"inputs\":[]}]",
	Bin: "0x60806040523480156200001157600080fd5b5060405162005163380380620051638339810160408190526200003491620004a6565b6200003e620000c1565b620000493362000169565b60005b8151811015620000b957620000838282815181106200006f576200006f62000578565b60200260200101516200023760201b60201c565b620000b08282815181106200009c576200009c62000578565b60200260200101516200031c60201b60201c565b6001016200004c565b5050620005df565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef520008054640100000000900460ff16156200010e576040516366008a2d60e01b815260040160405180910390fd5b805463ffffffff90811610156200016657805463ffffffff191663ffffffff90811782556040519081527fe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c9060200160405180910390a15b50565b60006200019d7f4675fa8241f86f37157864d3d49b85ad4b164352c516da28e1678a90470ae300546001600160a01b031690565b90506001600160a01b038216620001c757604051634e3ef82560e01b815260040160405180910390fd5b817f4675fa8241f86f37157864d3d49b85ad4b164352c516da28e1678a90470ae30080546001600160a01b0319166001600160a01b03928316179055604051838216918316907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e090600090a35050565b6001600160a01b038116620002865760408051808201825260078152664241445f41524760c81b6020820152905162461bcd60e51b81526200027d91906004016200058e565b60405180910390fd5b62000293600882620003e9565b15620002d757604080518082018252600e81526d414c52454144595f45584953545360901b6020820152905162461bcd60e51b81526200027d91906004016200058e565b620002e460088262000410565b506040516001600160a01b038216907fac6fa858e9350a46cec16539926e0fde25b7629f84b5a72bffaae4df888ae86d90600090a250565b6001600160a01b038116620003625760408051808201825260078152664241445f41524760c81b6020820152905162461bcd60e51b81526200027d91906004016200058e565b6200036f600d8262000410565b620003b257604080518082018252600e81526d414c52454144595f45584953545360901b6020820152905162461bcd60e51b81526200027d91906004016200058e565b6040516001600160a01b038216907f7afd798379ae2d2e5035438544cea2b60eb1dde6a8128e6d447fd2a25f8825a290600090a250565b6001600160a01b038116600090815260018301602052604081205415155b90505b92915050565b600062000407836001600160a01b03841660008181526001830160205260408120546200046a575081546001818101845560008481526020808220909301849055845484825282860190935260409020919091556200040a565b5060006200040a565b634e487b7160e01b600052604160045260246000fd5b80516001600160a01b0381168114620004a157600080fd5b919050565b60006020808385031215620004ba57600080fd5b82516001600160401b0380821115620004d257600080fd5b818501915085601f830112620004e757600080fd5b815181811115620004fc57620004fc62000473565b8060051b604051601f19603f8301168101818110858211171562000524576200052462000473565b6040529182528482019250838101850191888311156200054357600080fd5b938501935b828510156200056c576200055c8562000489565b8452938501939285019262000548565b98975050505050505050565b634e487b7160e01b600052603260045260246000fd5b60006020808352835180602085015260005b81811015620005be57858101830151858201604001528201620005a0565b506000604082860101526040601f19601f8301168501019250505092915050565b614b7480620005ef6000396000f3fe608060405234801561001057600080fd5b50600436106102325760003560e01c80639ee86d3811610130578063c87d1324116100b8578063d911c6321161007c578063d911c63214610519578063ee885b1214610521578063eecc66f414610534578063fc207c0114610547578063ff3a14ab1461055a57600080fd5b8063c87d1324146104aa578063c8fe3a01146104bd578063ca78c41a146104d2578063d4bd44a0146104f3578063d7a3158a1461050657600080fd5b8063b2b99ec9116100ff578063b2b99ec914610456578063b7f227ee14610469578063ba428b1a1461047c578063c0f220841461048f578063c179b85f1461049757600080fd5b80639ee86d3814610408578063a09449a61461041b578063a1174e7d1461042e578063ac8a584a1461044357600080fd5b8063581f8b9b116101be5780637e4465e7116101825780637e4465e71461039a578063813049ec146103ad57806386789fc6146103c05780639283ae3a146103d55780639d209048146103e857600080fd5b8063581f8b9b1461031057806368b454df146103235780636b883c39146103435780636d70f7ae1461035657806372e1a68b1461037957600080fd5b80633137451111610205578063313745111461029d57806332705ac4146102b057806339bf397e146102d05780633bd84c0c146102e65780633c2544d1146102ee57600080fd5b8063035759e114610237578063081814db1461024c5780631290abe81461026a578063242cae9f1461028a575b600080fd5b61024a610245366004613cab565b61056d565b005b6102546106e1565b6040516102619190613d14565b60405180910390f35b61027d610278366004613cab565b61094c565b6040516102619190613e2f565b61024a610298366004613e5e565b610a6e565b61024a6102ab366004613ebd565b610ab5565b6102c36102be366004613e5e565b610b46565b6040516102619190613f7f565b6102d8610df8565b604051908152602001610261565b6102c3610e09565b6103016102fc366004613cab565b610f77565b60405161026193929190613f92565b61024a61031e366004613fd6565b611148565b610336610331366004613cab565b6112e8565b6040516102619190614009565b61024a6103513660046140d1565b611414565b610369610364366004613e5e565b61167b565b6040519015158152602001610261565b61038c610387366004613ebd565b61168e565b6040516102619291906141b4565b61024a6103a83660046141cd565b611829565b61024a6103bb366004613e5e565b611a21565b6103c8611b1c565b604051610261919061421a565b6102546103e3366004613cab565b611b28565b6103fb6103f6366004613e5e565b611c8b565b60405161026191906142ea565b61024a6104163660046142fd565b611e0c565b61024a610429366004614337565b611fce565b61043661229d565b60405161026191906143bd565b61024a610451366004613e5e565b612471565b61024a610464366004613e5e565b6125d4565b61024a610477366004614421565b61279d565b61024a61048a366004613ebd565b6129ec565b6102d8612a78565b61024a6104a5366004613e5e565b612a83565b6102d86104b8366004613e5e565b612ac7565b6104c5612b75565b6040516102619190614489565b6104e56104e036600461449c565b612b81565b6040516102619291906144be565b610369610501366004613e5e565b612d71565b61024a6105143660046144f2565b612d7e565b6104c5612f01565b61024a61052f3660046142fd565b612f0d565b61024a610542366004614542565b61315a565b610369610555366004613cab565b613325565b61024a61056836600461459f565b613332565b33610579600d82613594565b6105bc5760408051808201825260088152670848288be82aaa8960c31b6020820152905162461bcd60e51b81526105b39190600401614613565b60405180910390fd5b816105c8600a826135b9565b6106035760408051808201825260098152681393d517d193d5539160ba1b6020820152905162461bcd60e51b81526105b39190600401614613565b6000838152600c602052604090205415610676576000838152600c6020526040902080548061063457610634614626565b60008281526020812060036000199093019283020181815560018101805467ffffffffffffffff191690559061066d6002830182613b56565b50509055610603565b6000838152600c6020526040812061068d91613b90565b610698600a846135d1565b50604080518481526001600160401b0360208201526080818301819052600090820152600160608201529051600080516020614b548339815191529181900360a00190a1505050565b60606000806106f0600a6135dd565b905060005b8181101561073157600061070a600a836135e7565b6000818152600c60205260409020549091506107269085614652565b9350506001016106f5565b506000826001600160401b0381111561074c5761074c61401c565b60405190808252806020026020018201604052801561079957816020015b6040805160608082018352600080835260208301529181019190915281526020019060019003908161076a5790505b50905060006107a8600a6135dd565b90506000805b828110156109415760006107c3600a836135e7565b6000818152600c6020908152604080832080548251818502810185019093528083529495509293909291849084015b828210156108d657600084815260209081902060408051606081018252600386029092018054835260018101546001600160401b0316938301939093526002830180549293929184019161084590614665565b80601f016020809104026020016040519081016040528092919081815260200182805461087190614665565b80156108be5780601f10610893576101008083540402835291602001916108be565b820191906000526020600020905b8154815290600101906020018083116108a157829003601f168201915b505050505081525050815260200190600101906107f2565b50505050905060005b8151811015610933578181815181106108fa576108fa614699565b602002602001015187868061090e906146af565b97508151811061092057610920614699565b60209081029190910101526001016108df565b5050508060010190506107ae565b509195945050505050565b6040805160a081018252600080825260208201819052918101829052606080820183905260808201529061098090836135b9565b6109bb5760408051808201825260098152681393d517d193d5539160ba1b6020820152905162461bcd60e51b81526105b39190600401614613565b600082815260026020818152604092839020835160a0810185528154815260018201546001600160401b0380821683860152600160401b8204811683880152600160801b9091041660608201529281018054855181850281018501909652808652939491936080860193830182828015610a5e57602002820191906000526020600020905b81546001600160a01b03168152600190910190602001808311610a40575b5050505050815250509050919050565b610a766135f3565b6001600160a01b0316336001600160a01b031614610aa9576040516365f4906560e01b81523360048201526024016105b3565b610ab281613621565b50565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef5200054640100000000900460ff16610aff57604051630ef4733760e31b815260040160405180910390fd5b60005b81811015610b4157610b39838383818110610b1f57610b1f614699565b9050602002016020810190610b349190613e5e565b6136f3565b600101610b02565b505050565b60606000610b53816135dd565b90506000816001600160401b03811115610b6f57610b6f61401c565b604051908082528060200260200182016040528015610b98578160200160208202803683370190505b5090506000805b83811015610c5a576000610bb381836135e7565b600081815260026020819052604082209081015492935091905b81811015610c4b57896001600160a01b0316836002018281548110610bf457610bf4614699565b6000918252602090912001546001600160a01b031603610c4357838787610c1a816146c8565b985063ffffffff1681518110610c3257610c32614699565b602002602001018181525050610c4b565b600101610bcd565b50505050806001019050610b9f565b5060008163ffffffff166001600160401b03811115610c7b57610c7b61401c565b604051908082528060200260200182016040528015610cb457816020015b610ca1613bb1565b815260200190600190039081610c995790505b50905060005b8263ffffffff16811015610dee576040518060400160405280858381518110610ce557610ce5614699565b6020026020010151815260200160006002016000878581518110610d0b57610d0b614699565b6020908102919091018101518252818101929092526040908101600020815160a0810183528154815260018201546001600160401b0380821683870152600160401b8204811683860152600160801b909104166060820152600282018054845181870281018701909552808552919492936080860193909290830182828015610dbd57602002820191906000526020600020905b81546001600160a01b03168152600190910190602001808311610d9f575b505050505081525050815250828281518110610ddb57610ddb614699565b6020908102919091010152600101610cba565b5095945050505050565b6000610e0460056135dd565b905090565b60606000610e16816135dd565b90506000816001600160401b03811115610e3257610e3261401c565b604051908082528060200260200182016040528015610e6b57816020015b610e58613bb1565b815260200190600190039081610e505790505b50905060005b82811015610f70576000610e8581836135e7565b60408051808201825282815260008381526002602081815291849020845160a0810186528154815260018201546001600160401b0380821683870152600160401b8204811683890152600160801b9091041660608201529181018054865181860281018601909752808752969750939583870195929491936080860193929190830182828015610f3e57602002820191906000526020600020905b81546001600160a01b03168152600190910190602001808311610f20575b505050505081525050815250838381518110610f5c57610f5c614699565b602090810291909101015250600101610e71565b5092915050565b6040805160a081018252600080825260208201819052918101829052606080820183905260808201819052909190610faf82856135b9565b610fea5760408051808201825260098152681393d517d193d5539160ba1b6020820152905162461bcd60e51b81526105b39190600401614613565b600084815260026020818152604080842060048352818520546003845294829020825160a0810184528254815260018301546001600160401b0380821683880152600160401b8204811683870152600160801b909104166060820152948201805484518187028101870190955280855292969591949193879360808601939192918301828280156110a457602002820191906000526020600020905b81546001600160a01b03168152600190910190602001808311611086575b50505050508152505092508080546110bb90614665565b80601f01602080910402602001604051908101604052809291908181526020018280546110e790614665565b80156111345780601f1061110957610100808354040283529160200191611134565b820191906000526020600020905b81548152906001019060200180831161111757829003601f168201915b505050505090509250925092509193909250565b6001600160a01b038083166000908152600760205260409020600201548391166111a857604080518082018252600e81526d1393d11157d393d517d193d5539160921b6020820152905162461bcd60e51b81526105b39190600401614613565b336111b4600882613594565b6111ee5760408051808201825260088152670848288be82aaa8960c31b6020820152905162461bcd60e51b81526105b39190600401614613565b6001600160a01b038085166000908152600760205260409020600301548591339116811461124c5760408051808201825260088152670848288be82aaa8960c31b6020820152905162461bcd60e51b81526105b39190600401614613565b6001600160a01b038616600090815260076020526040902080546112739060ff16876137b8565b80548690829060ff191660018360058111156112915761129161425e565b021790555060028101546040516001600160a01b03909116907f20891cc7622c7951cbd8c70c61a5201eb45625b8c00e8f6c986cfca78f3dbfa0906112d79089906146eb565b60405180910390a250505050505050565b6112f0613bb1565b60006112fb816135dd565b905080831061133b5760408051808201825260098152681393d517d193d5539160ba1b6020820152905162461bcd60e51b81526105b39190600401614613565b600061134781856135e7565b60408051808201825282815260008381526002602081815291849020845160a0810186528154815260018201546001600160401b0380821683870152600160401b8204811683890152600160801b909104166060820152918101805486518186028101860190975280875296975093958387019592949193608086019392919083018282801561140057602002820191906000526020600020905b81546001600160a01b031681526001909101906020018083116113e2575b505050919092525050509052949350505050565b336000818152600760205260409020600201546001600160a01b031661147057604080518082018252600e81526d1393d11157d393d517d193d5539160921b6020820152905162461bcd60e51b81526105b39190600401614613565b61147b6000866135b9565b156114bc57604080518082018252600e81526d414c52454144595f45584953545360901b6020820152905162461bcd60e51b81526105b39190600401614613565b835160005b81811015611541576114f98682815181106114de576114de614699565b6020026020010151600060050161359490919063ffffffff16565b61153957604080518082018252600e81526d1393d11157d393d517d193d5539160921b6020820152905162461bcd60e51b81526105b39190600401614613565b6001016114c1565b506040805160a081018252858152600060208201819052918101829052606081018290526080810187905290611577908861394b565b5060008781526002602081815260409283902084518155818501516001820180549587015160608801516001600160401b03908116600160801b0267ffffffffffffffff60801b19928216600160401b026fffffffffffffffffffffffffffffffff1990991691909416179690961795909516179093556080840151805185949361160793908501920190613bfb565b5050506000878152600360205260409020611622858261475e565b5060008781526004602052604090819020869055517f55ef7efc60ef99743e54209752c9a8e047e013917ec91572db75875069dd65bb9061166a908990899089908990614817565b60405180910390a150505050505050565b6000611688600883613594565b92915050565b600060608282816001600160401b038111156116ac576116ac61401c565b6040519080825280602002602001820160405280156116e557816020015b6116d2613bb1565b8152602001906001900390816116ca5790505b50905060005b8281101561181d57600087878381811061170757611707614699565b6020908102929092013560008181526002938490526040812093840154919450039050611735575050611815565b604080518082018252838152815160a0810183528354815260018401546001600160401b03808216602084810191909152600160401b8304821684870152600160801b9092041660608301526002850180548551818402810184019096528086529394828601948793608086019391908301828280156117de57602002820191906000526020600020905b81546001600160a01b031681526001909101906020018083116117c0575b50505091909252505050905284886117f5816146af565b99508151811061180757611807614699565b602002602001018190525050505b6001016116eb565b509150505b9250929050565b33611835600882613594565b61186f5760408051808201825260088152670848288be82aaa8960c31b6020820152905162461bcd60e51b81526105b39190600401614613565b6001600160a01b038084166000908152600760205260409020600201548491166118cf57604080518082018252600e81526d1393d11157d393d517d193d5539160921b6020820152905162461bcd60e51b81526105b39190600401614613565b6001600160a01b038085166000908152600760205260409020600301548591339116811461192d5760408051808201825260088152670848288be82aaa8960c31b6020820152905162461bcd60e51b81526105b39190600401614613565b6001600160a01b038616600090815260076020908152604091829020915161195791889101614853565b6040516020818303038152906040528051906020012081600101604051602001611981919061486f565b60405160208183030381529060405280519060200120036119d15760408051808201825260078152664241445f41524760c81b6020820152905162461bcd60e51b81526105b39190600401614613565b600181016119df878261475e565b5060028101546040516001600160a01b03909116907f4505168a8705a16fd4d0575197fd0f510db69df93a065e158ad2c0957ba12bac906112d7908990614613565b611a296135f3565b6001600160a01b0316336001600160a01b031614611a5c576040516365f4906560e01b81523360048201526024016105b3565b6001600160a01b038116611a9f5760408051808201825260078152664241445f41524760c81b6020820152905162461bcd60e51b81526105b39190600401614613565b611aaa600d82613957565b611ae55760408051808201825260098152681393d517d193d5539160ba1b6020820152905162461bcd60e51b81526105b39190600401614613565b6040516001600160a01b038216907ff9889c857e5356066b564327caa757c325ecbc001b2b47d72edf8cf9aedb1be590600090a250565b6060610e04600061396c565b606081611b36600a826135b9565b611b715760408051808201825260098152681393d517d193d5539160ba1b6020820152905162461bcd60e51b81526105b39190600401614613565b6000838152600c6020908152604080832080548251818502810185019093528083529193909284015b82821015611c7e57600084815260209081902060408051606081018252600386029092018054835260018101546001600160401b03169383019390935260028301805492939291840191611bed90614665565b80601f0160208091040260200160405190810160405280929190818152602001828054611c1990614665565b8015611c665780601f10611c3b57610100808354040283529160200191611c66565b820191906000526020600020905b815481529060010190602001808311611c4957829003601f168201915b50505050508152505081526020019060010190611b9a565b5050505091505b50919050565b611cb66040805160808101909152806000815260606020820181905260006040830181905291015290565b611cc1600583613594565b611d0157604080518082018252600e81526d1393d11157d393d517d193d5539160921b6020820152905162461bcd60e51b81526105b39190600401614613565b6001600160a01b038216600090815260076020526040908190208151608081019092528054829060ff166005811115611d3c57611d3c61425e565b6005811115611d4d57611d4d61425e565b8152602001600182018054611d6190614665565b80601f0160208091040260200160405190810160405280929190818152602001828054611d8d90614665565b8015611dda5780601f10611daf57610100808354040283529160200191611dda565b820191906000526020600020905b815481529060010190602001808311611dbd57829003601f168201915b505050918352505060028201546001600160a01b03908116602083015260039092015490911660409091015292915050565b81611e186000826135b9565b611e535760408051808201825260098152681393d517d193d5539160ba1b6020820152905162461bcd60e51b81526105b39190600401614613565b6001600160a01b03808316600090815260076020526040902060020154839116611eb357604080518082018252600e81526d1393d11157d393d517d193d5539160921b6020820152905162461bcd60e51b81526105b39190600401614613565b600084815260026020819052604082209081015490915b81811015611f4f57856001600160a01b0316836002018281548110611ef157611ef1614699565b6000918252602090912001546001600160a01b031603611f4757604080518082018252600e81526d414c52454144595f45584953545360901b6020820152905162461bcd60e51b81526105b39190600401614613565b600101611eca565b5060028201805460018082018355600092835260209283902090910180546001600160a01b0319166001600160a01b038916908117909155604080518a8152938401919091528201527faaa473c28a5fe04b6a7ecd795826e462f9d0c23f00ef9f51ec02fa6ea418806f906060015b60405180910390a1505050505050565b33611fda600d82613594565b6120145760408051808201825260088152670848288be82aaa8960c31b6020820152905162461bcd60e51b81526105b39190600401614613565b67fffffffffffffffe196001600160401b038516016120625760408051808201825260078152664241445f41524760c81b6020820152905162461bcd60e51b81526105b39190600401614613565b60008290036120a05760408051808201825260078152664241445f41524760c81b6020820152905162461bcd60e51b81526105b39190600401614613565b6120ab600a866135b9565b6120bc576120ba600a8661394b565b505b6000858152600c6020526040812054905b818110156121a3576000878152600c6020526040902080546001600160401b03881691908390811061210157612101614699565b60009182526020909120600160039092020101546001600160401b03160361219b576000878152600c602052604090208054869186918490811061214757612147614699565b906000526020600020906003020160020191826121659291906148e5565b50600080516020614b5483398151915287878787600060405161218c95949392919061499e565b60405180910390a15050612296565b6001016120cd565b506000600c0160008781526020019081526020016000206040518060600160405280888152602001876001600160401b0316815260200186868080601f0160208091040260200160405190810160405280939291908181526020018383808284376000920182905250939094525050835460018082018655948252602091829020845160039092020190815590830151938101805467ffffffffffffffff19166001600160401b0390951694909417909355506040810151909190600282019061226d908261475e565b505050600080516020614b54833981519152868686866000604051611fbe95949392919061499e565b5050505050565b606060006122ab60056135dd565b6001600160401b038111156122c2576122c261401c565b60405190808252806020026020018201604052801561231e57816020015b61230b6040805160808101909152806000815260606020820181905260006040830181905291015290565b8152602001906001900390816122e05790505b50905060005b61232e60056135dd565b811015611c8557600760006123446005846135e7565b6001600160a01b03168152602081019190915260409081016000208151608081019092528054829060ff1660058111156123805761238061425e565b60058111156123915761239161425e565b81526020016001820180546123a590614665565b80601f01602080910402602001604051908101604052809291908181526020018280546123d190614665565b801561241e5780601f106123f35761010080835404028352916020019161241e565b820191906000526020600020905b81548152906001019060200180831161240157829003601f168201915b505050918352505060028201546001600160a01b039081166020830152600390920154909116604090910152825183908390811061245e5761245e614699565b6020908102919091010152600101612324565b6124796135f3565b6001600160a01b0316336001600160a01b0316146124ac576040516365f4906560e01b81523360048201526024016105b3565b6124b7600882613594565b6124fb57604080518082018252601281527113d41154905513d497d393d517d193d5539160721b6020820152905162461bcd60e51b81526105b39190600401614613565b60005b61250860056135dd565b811015612590576001600160a01b038216600760006125286005856135e7565b6001600160a01b039081168252602082019290925260400160002060030154160361258857604080518082018252600d81526c4f55545f4f465f424f554e445360981b6020820152905162461bcd60e51b81526105b39190600401614613565b6001016124fe565b5061259c600882613957565b506040516001600160a01b038216907f80c0b871b97b595b16a7741c1b06fed0c6f6f558639f18ccbce50724325dc40d90600090a250565b6001600160a01b03808216600090815260076020526040902060030154829133911681146126325760408051808201825260088152670848288be82aaa8960c31b6020820152905162461bcd60e51b81526105b39190600401614613565b6001600160a01b038381166000908152600760205260409020600201541661269057604080518082018252600e81526d1393d11157d393d517d193d5539160921b6020820152905162461bcd60e51b81526105b39190600401614613565b60056001600160a01b03841660009081526007602052604090205460ff1660058111156126bf576126bf61425e565b146127085760408051808201825260168152751393d11157d4d510551157d393d517d0531313d5d15160521b6020820152905162461bcd60e51b81526105b39190600401614613565b612713600584613957565b506001600160a01b0383166000908152600760205260408120805460ff19168155906127426001830182613b56565b506002810180546001600160a01b03199081169091556003909101805490911690556040516001600160a01b038416907fcfc24166db4bb677e857cacabd1541fb2b30645021b27c5130419589b84db52b90600090a2505050565b336127a9600d82613594565b6127e35760408051808201825260088152670848288be82aaa8960c31b6020820152905162461bcd60e51b81526105b39190600401614613565b6000805b6000858152600c6020526040902054811015612964576000858152600c6020526040902080546001600160401b03861691908390811061282957612829614699565b60009182526020909120600160039092020101546001600160401b03160361295c576000858152600c602052604090208054612867906001906149ee565b8154811061287757612877614699565b90600052602060002090600302016000600c01600087815260200190815260200160002082815481106128ac576128ac614699565b600091825260209091208254600390920201908155600180830154908201805467ffffffffffffffff19166001600160401b039092169190911790556002808201906128fa90840182614a01565b5050506000858152600c6020526040902080548061291a5761291a614626565b60008281526020812060036000199093019283020181815560018101805467ffffffffffffffff19169055906129536002830182613b56565b50509055600191505b6001016127e7565b50806129a15760408051808201825260098152681393d517d193d5539160ba1b6020820152905162461bcd60e51b81526105b39190600401614613565b604080518581526001600160401b03851660208201526080818301819052600090820152600160608201529051600080516020614b548339815191529181900360a00190a150505050565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef5200054640100000000900460ff16612a3657604051630ef4733760e31b815260040160405180910390fd5b60005b81811015610b4157612a70838383818110612a5657612a56614699565b9050602002016020810190612a6b9190613e5e565b613621565b600101612a39565b6000610e04816135dd565b612a8b6135f3565b6001600160a01b0316336001600160a01b031614612abe576040516365f4906560e01b81523360048201526024016105b3565b610ab2816136f3565b60008080612ad4816135dd565b905060005b81811015612b6c576000612aed81836135e7565b60008181526002602052604081209192505b6002820154811015612b5e57876001600160a01b0316826002018281548110612b2a57612b2a614699565b6000918252602090912001546001600160a01b031603612b565785612b4e816146af565b965050612b5e565b600101612aff565b505050806001019050612ad9565b50909392505050565b6060610e04600561396c565b60606000828410612bc15760408051808201825260078152664241445f41524760c81b6020820152905162461bcd60e51b81526105b39190600401614613565b6000612bcc816135dd565b90506000818511612bdd5784612bdf565b815b90506000868211612bf1576000612bfb565b612bfb87836149ee565b90506000816001600160401b03811115612c1757612c1761401c565b604051908082528060200260200182016040528015612c5057816020015b612c3d613bb1565b815260200190600190039081612c355790505b50905060005b82811015612d60576000612c75612c6d838c614652565b6000906135e7565b60408051808201825282815260008381526002602081815291849020845160a0810186528154815260018201546001600160401b0380821683870152600160401b8204811683890152600160801b9091041660608201529181018054865181860281018601909752808752969750939583870195929491936080860193929190830182828015612d2e57602002820191906000526020600020905b81546001600160a01b03168152600190910190602001808311612d10575b505050505081525050815250838381518110612d4c57612d4c614699565b602090810291909101015250600101612c56565b509450505083101590509250929050565b6000611688600d83613594565b336000818152600760205260409020600201546001600160a01b0316612dda57604080518082018252600e81526d1393d11157d393d517d193d5539160921b6020820152905162461bcd60e51b81526105b39190600401614613565b612de56000876135b9565b612e205760408051808201825260098152681393d517d193d5539160ba1b6020820152905162461bcd60e51b81526105b39190600401614613565b600086815260026020526040902084815560018101805467ffffffffffffffff19166001600160401b0386161790558215612e88576001818101805467ffffffffffffffff60801b198116600160801b918290046001600160401b0316909317029190911790555b836001600160401b0316600103612eb0576000878152600360205260408120612eb091613b56565b60408051888152602081018790526001600160401b0386169181019190915283151560608201527fccc26bbb6dd655ea0bb8a40a3c30e35c6bdf42f8faf0d71bbea897af768cda8b9060800161166a565b6060610e04600861396c565b81612f196000826135b9565b612f545760408051808201825260098152681393d517d193d5539160ba1b6020820152905162461bcd60e51b81526105b39190600401614613565b6001600160a01b03808316600090815260076020526040902060020154839116612fb457604080518082018252600e81526d1393d11157d393d517d193d5539160921b6020820152905162461bcd60e51b81526105b39190600401614613565b6000848152600260208190526040822090810154909190815b818110156130cf57866001600160a01b0316846002018281548110612ff457612ff4614699565b6000918252602090912001546001600160a01b0316036130c7576002840161301d6001846149ee565b8154811061302d5761302d614699565b6000918252602090912001546002850180546001600160a01b03909216918390811061305b5761305b614699565b9060005260206000200160006101000a8154816001600160a01b0302191690836001600160a01b031602179055508360020180548061309c5761309c614626565b600082815260209020810160001990810180546001600160a01b0319169055019055600192506130cf565b600101612fcd565b508161311157604080518082018252600e81526d1393d11157d393d517d193d5539160921b6020820152905162461bcd60e51b81526105b39190600401614613565b604080518881526001600160a01b03881660208201526000918101919091527faaa473c28a5fe04b6a7ecd795826e462f9d0c23f00ef9f51ec02fa6ea418806f9060600161166a565b33613166600882613594565b6131a05760408051808201825260088152670848288be82aaa8960c31b6020820152905162461bcd60e51b81526105b39190600401614613565b6001600160a01b0384811660009081526007602052604090206002015416156131ff57604080518082018252600e81526d414c52454144595f45584953545360901b6020820152905162461bcd60e51b81526105b39190600401614613565b6000604051806080016040528084600581111561321e5761321e61425e565b8152602081018690526001600160a01b038716604082015233606090910152905061324a600586613979565b506001600160a01b03851660009081526007602052604090208151815483929190829060ff191660018360058111156132855761328561425e565b02179055506020820151600182019061329e908261475e565b506040828101516002830180546001600160a01b03199081166001600160a01b03938416179091556060909401516003909301805490941692811692909217909255905133918716907f759154d15a6aec80ceab7bc8820f46ebc53ad68bb18f47afb77483fea9dcc9ff906133169088908890614acd565b60405180910390a35050505050565b6000611688600a836135b9565b336000818152600760205260409020600201546001600160a01b031661338e57604080518082018252600e81526d1393d11157d393d517d193d5539160921b6020820152905162461bcd60e51b81526105b39190600401614613565b8160005b8181101561229657368585838181106133ad576133ad614699565b60a0029190910191506133c49050600082356135b9565b61343c577f75460fe319331413a18a82d99b07735cec53fa0c4061ada38c2141e331082afa813560408301356134006080850160608601614aef565b60408051808201825260098152681393d517d193d5539160ba1b6020820152905161342e9493929190614b0a565b60405180910390a15061358c565b8035600090815260026020526040908190209082013581556134646080830160608401614aef565b60018201805467ffffffffffffffff19166001600160401b039290921691909117905561349760a0830160808401614b38565b156134cf576001818101805467ffffffffffffffff60801b198116600160801b918290046001600160401b0316909317029190911790555b6134df6080830160608401614aef565b6001600160401b0316600103613508578135600090815260036020526040812061350891613b56565b7fccc26bbb6dd655ea0bb8a40a3c30e35c6bdf42f8faf0d71bbea897af768cda8b823560408401356135406080860160608701614aef565b61355060a0870160808801614b38565b604051613581949392919093845260208401929092526001600160401b031660408301521515606082015260800190565b60405180910390a150505b600101613392565b6001600160a01b038116600090815260018301602052604081205415155b9392505050565b600081815260018301602052604081205415156135b2565b60006135b2838361398e565b6000611688825490565b60006135b28383613a81565b7f4675fa8241f86f37157864d3d49b85ad4b164352c516da28e1678a90470ae300546001600160a01b031690565b6001600160a01b0381166136645760408051808201825260078152664241445f41524760c81b6020820152905162461bcd60e51b81526105b39190600401614613565b61366f600882613594565b156136b057604080518082018252600e81526d414c52454144595f45584953545360901b6020820152905162461bcd60e51b81526105b39190600401614613565b6136bb600882613979565b506040516001600160a01b038216907fac6fa858e9350a46cec16539926e0fde25b7629f84b5a72bffaae4df888ae86d90600090a250565b6001600160a01b0381166137365760408051808201825260078152664241445f41524760c81b6020820152905162461bcd60e51b81526105b39190600401614613565b613741600d82613979565b61378157604080518082018252600e81526d414c52454144595f45584953545360901b6020820152905162461bcd60e51b81526105b39190600401614613565b6040516001600160a01b038216907f7afd798379ae2d2e5035438544cea2b60eb1dde6a8128e6d447fd2a25f8825a290600090a250565b60008260058111156137cc576137cc61425e565b1480613820575060018260058111156137e7576137e761425e565b148015613820575060038160058111156138035761380361425e565b14806138205750600481600581111561381e5761381e61425e565b145b806138735750600282600581111561383a5761383a61425e565b148015613873575060038160058111156138565761385661425e565b1480613873575060048160058111156138715761387161425e565b145b806138c65750600482600581111561388d5761388d61425e565b1480156138c6575060038160058111156138a9576138a961425e565b14806138c6575060058160058111156138c4576138c461425e565b145b806138fe575060038260058111156138e0576138e061425e565b1480156138fe575060058160058111156138fc576138fc61425e565b145b15613907575050565b60408051808201825260168152751393d11157d4d510551157d393d517d0531313d5d15160521b6020820152905162461bcd60e51b81526105b39190600401614613565b60006135b28383613aab565b60006135b2836001600160a01b03841661398e565b606060006135b283613afa565b60006135b2836001600160a01b038416613aab565b60008181526001830160205260408120548015613a775760006139b26001836149ee565b85549091506000906139c6906001906149ee565b9050808214613a2b5760008660000182815481106139e6576139e6614699565b9060005260206000200154905080876000018481548110613a0957613a09614699565b6000918252602080832090910192909255918252600188019052604090208390555b8554869080613a3c57613a3c614626565b600190038181906000526020600020016000905590558560010160008681526020019081526020016000206000905560019350505050611688565b6000915050611688565b6000826000018281548110613a9857613a98614699565b9060005260206000200154905092915050565b6000818152600183016020526040812054613af257508154600181810184556000848152602080822090930184905584548482528286019093526040902091909155611688565b506000611688565b606081600001805480602002602001604051908101604052809291908181526020018280548015613b4a57602002820191906000526020600020905b815481526020019060010190808311613b36575b50505050509050919050565b508054613b6290614665565b6000825580601f10613b72575050565b601f016020900490600052602060002090810190610ab29190613c60565b5080546000825560030290600052602060002090810190610ab29190613c75565b604080518082019091526000815260208101613bf66040805160a081018252600080825260208201819052918101829052606080820192909252608081019190915290565b905290565b828054828255906000526020600020908101928215613c50579160200282015b82811115613c5057825182546001600160a01b0319166001600160a01b03909116178255602090920191600190910190613c1b565b50613c5c929150613c60565b5090565b5b80821115613c5c5760008155600101613c61565b80821115613c5c57600080825560018201805467ffffffffffffffff19169055613ca26002830182613b56565b50600301613c75565b600060208284031215613cbd57600080fd5b5035919050565b60005b83811015613cdf578181015183820152602001613cc7565b50506000910152565b60008151808452613d00816020860160208601613cc4565b601f01601f19169290920160200192915050565b600060208083018184528085518083526040925060408601915060408160051b87010184880160005b83811015613d9057888303603f19018552815180518452878101516001600160401b0316888501528601516060878501819052613d7c81860183613ce8565b968901969450505090860190600101613d3d565b509098975050505050505050565b600060a08301825184526020808401516001600160401b0380821660208801528060408701511660408801528060608701511660608801525050608084015160a0608087015282815180855260c088019150602083019450600092505b80831015613e245784516001600160a01b03168252938301936001929092019190830190613dfb565b509695505050505050565b6020815260006135b26020830184613d9e565b80356001600160a01b0381168114613e5957600080fd5b919050565b600060208284031215613e7057600080fd5b6135b282613e42565b60008083601f840112613e8b57600080fd5b5081356001600160401b03811115613ea257600080fd5b6020830191508360208260051b850101111561182257600080fd5b60008060208385031215613ed057600080fd5b82356001600160401b03811115613ee657600080fd5b613ef285828601613e79565b90969095509350505050565b805182526000602082015160406020850152613f1d6040850182613d9e565b949350505050565b60008282518085526020808601955060208260051b8401016020860160005b84811015613f7257601f19868403018952613f60838351613efe565b98840198925090830190600101613f44565b5090979650505050505050565b6020815260006135b26020830184613f25565b606081526000613fa56060830186613d9e565b8460208401528281036040840152613fbd8185613ce8565b9695505050505050565b803560068110613e5957600080fd5b60008060408385031215613fe957600080fd5b613ff283613e42565b915061400060208401613fc7565b90509250929050565b6020815260006135b26020830184613efe565b634e487b7160e01b600052604160045260246000fd5b604051601f8201601f191681016001600160401b038111828210171561405a5761405a61401c565b604052919050565b600082601f83011261407357600080fd5b81356001600160401b0381111561408c5761408c61401c565b61409f601f8201601f1916602001614032565b8181528460208386010111156140b457600080fd5b816020850160208301376000918101602001919091529392505050565b600080600080608085870312156140e757600080fd5b843593506020808601356001600160401b038082111561410657600080fd5b818801915088601f83011261411a57600080fd5b81358181111561412c5761412c61401c565b8060051b61413b858201614032565b918252838101850191858101908c84111561415557600080fd5b948601945b8386101561417a5761416b86613e42565b8252948601949086019061415a565b985050505060408801359450606088013592508083111561419a57600080fd5b50506141a887828801614062565b91505092959194509250565b828152604060208201526000613f1d6040830184613f25565b600080604083850312156141e057600080fd5b6141e983613e42565b915060208301356001600160401b0381111561420457600080fd5b61421085828601614062565b9150509250929050565b6020808252825182820181905260009190848201906040850190845b8181101561425257835183529284019291840191600101614236565b50909695505050505050565b634e487b7160e01b600052602160045260246000fd5b6006811061429257634e487b7160e01b600052602160045260246000fd5b9052565b6142a1828251614274565b60006020820151608060208501526142bc6080850182613ce8565b6040848101516001600160a01b03908116918701919091526060948501511693909401929092525090919050565b6020815260006135b26020830184614296565b6000806040838503121561431057600080fd5b8235915061400060208401613e42565b80356001600160401b0381168114613e5957600080fd5b6000806000806060858703121561434d57600080fd5b8435935061435d60208601614320565b925060408501356001600160401b038082111561437957600080fd5b818701915087601f83011261438d57600080fd5b81358181111561439c57600080fd5b8860208285010111156143ae57600080fd5b95989497505060200194505050565b600060208083016020845280855180835260408601915060408160051b87010192506020870160005b8281101561441457603f19888603018452614402858351614296565b945092850192908501906001016143e6565b5092979650505050505050565b6000806040838503121561443457600080fd5b8235915061400060208401614320565b60008151808452602080850194506020840160005b8381101561447e5781516001600160a01b031687529582019590820190600101614459565b509495945050505050565b6020815260006135b26020830184614444565b600080604083850312156144af57600080fd5b50508035926020909101359150565b6040815260006144d16040830185613f25565b905082151560208301529392505050565b80358015158114613e5957600080fd5b600080600080600060a0868803121561450a57600080fd5b85359450602086013593506040860135925061452860608701614320565b9150614536608087016144e2565b90509295509295909350565b60008060006060848603121561455757600080fd5b61456084613e42565b925060208401356001600160401b0381111561457b57600080fd5b61458786828701614062565b92505061459660408501613fc7565b90509250925092565b600080602083850312156145b257600080fd5b82356001600160401b03808211156145c957600080fd5b818501915085601f8301126145dd57600080fd5b8135818111156145ec57600080fd5b86602060a08302850101111561460157600080fd5b60209290920196919550909350505050565b6020815260006135b26020830184613ce8565b634e487b7160e01b600052603160045260246000fd5b634e487b7160e01b600052601160045260246000fd5b808201808211156116885761168861463c565b600181811c9082168061467957607f821691505b602082108103611c8557634e487b7160e01b600052602260045260246000fd5b634e487b7160e01b600052603260045260246000fd5b6000600182016146c1576146c161463c565b5060010190565b600063ffffffff8083168181036146e1576146e161463c565b6001019392505050565b602081016116888284614274565b601f821115610b41576000816000526020600020601f850160051c810160208610156147225750805b601f850160051c820191505b818110156147415782815560010161472e565b505050505050565b600019600383901b1c191660019190911b1790565b81516001600160401b038111156147775761477761401c565b61478b816147858454614665565b846146f9565b602080601f8311600181146147ba57600084156147a85750858301515b6147b28582614749565b865550614741565b600085815260208120601f198616915b828110156147e9578886015182559484019460019091019084016147ca565b50858210156148075787850151600019600388901b60f8161c191681555b5050505050600190811b01905550565b8481526080602082015260006148306080830186614444565b84604084015282810360608401526148488185613ce8565b979650505050505050565b60008251614865818460208701613cc4565b9190910192915050565b600080835461487d81614665565b6001828116801561489557600181146148aa576148d9565b60ff19841687528215158302870194506148d9565b8760005260208060002060005b858110156148d05781548a8201529084019082016148b7565b50505082870194505b50929695505050505050565b6001600160401b038311156148fc576148fc61401c565b6149108361490a8354614665565b836146f9565b6000601f84116001811461493e576000851561492c5750838201355b6149368682614749565b845550612296565b600083815260209020601f19861690835b8281101561496f578685013582556020948501946001909201910161494f565b508682101561498c5760001960f88860031b161c19848701351681555b505060018560011b0183555050505050565b8581526001600160401b038516602082015260806040820152826080820152828460a0830137600081840160a0908101919091529115156060820152601f909201601f1916909101019392505050565b818103818111156116885761168861463c565b818103614a0c575050565b614a168254614665565b6001600160401b03811115614a2d57614a2d61401c565b614a3b816147858454614665565b6000601f821160018114614a695760008315614a575750848201545b614a618482614749565b855550612296565b600085815260209020601f19841690600086815260209020845b83811015614aa35782860154825560019586019590910190602001614a83565b50858310156148075793015460001960f8600387901b161c19169092555050600190811b01905550565b604081526000614ae06040830185613ce8565b90506135b26020830184614274565b600060208284031215614b0157600080fd5b6135b282614320565b8481528360208201526001600160401b0383166040820152608060608201526000613fbd6080830184613ce8565b600060208284031215614b4a57600080fd5b6135b2826144e256fec01483261a841a868b99cb8802faed4ea44a1a816651c4f7ee061a96a205fe98",
}

// MockRiverRegistryABI is the input ABI used to generate the binding from.
// Deprecated: Use MockRiverRegistryMetaData.ABI instead.
var MockRiverRegistryABI = MockRiverRegistryMetaData.ABI

// MockRiverRegistryBin is the compiled bytecode used for deploying new contracts.
// Deprecated: Use MockRiverRegistryMetaData.Bin instead.
var MockRiverRegistryBin = MockRiverRegistryMetaData.Bin

// DeployMockRiverRegistry deploys a new Ethereum contract, binding an instance of MockRiverRegistry to it.
func DeployMockRiverRegistry(auth *bind.TransactOpts, backend bind.ContractBackend, approvedOperators []common.Address) (common.Address, *types.Transaction, *MockRiverRegistry, error) {
	parsed, err := MockRiverRegistryMetaData.GetAbi()
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	if parsed == nil {
		return common.Address{}, nil, nil, errors.New("GetABI returned nil")
	}

	address, tx, contract, err := bind.DeployContract(auth, *parsed, common.FromHex(MockRiverRegistryBin), backend, approvedOperators)
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	return address, tx, &MockRiverRegistry{MockRiverRegistryCaller: MockRiverRegistryCaller{contract: contract}, MockRiverRegistryTransactor: MockRiverRegistryTransactor{contract: contract}, MockRiverRegistryFilterer: MockRiverRegistryFilterer{contract: contract}}, nil
}

// MockRiverRegistry is an auto generated Go binding around an Ethereum contract.
type MockRiverRegistry struct {
	MockRiverRegistryCaller     // Read-only binding to the contract
	MockRiverRegistryTransactor // Write-only binding to the contract
	MockRiverRegistryFilterer   // Log filterer for contract events
}

// MockRiverRegistryCaller is an auto generated read-only Go binding around an Ethereum contract.
type MockRiverRegistryCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// MockRiverRegistryTransactor is an auto generated write-only Go binding around an Ethereum contract.
type MockRiverRegistryTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// MockRiverRegistryFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type MockRiverRegistryFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// MockRiverRegistrySession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type MockRiverRegistrySession struct {
	Contract     *MockRiverRegistry // Generic contract binding to set the session for
	CallOpts     bind.CallOpts      // Call options to use throughout this session
	TransactOpts bind.TransactOpts  // Transaction auth options to use throughout this session
}

// MockRiverRegistryCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type MockRiverRegistryCallerSession struct {
	Contract *MockRiverRegistryCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts            // Call options to use throughout this session
}

// MockRiverRegistryTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type MockRiverRegistryTransactorSession struct {
	Contract     *MockRiverRegistryTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts            // Transaction auth options to use throughout this session
}

// MockRiverRegistryRaw is an auto generated low-level Go binding around an Ethereum contract.
type MockRiverRegistryRaw struct {
	Contract *MockRiverRegistry // Generic contract binding to access the raw methods on
}

// MockRiverRegistryCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type MockRiverRegistryCallerRaw struct {
	Contract *MockRiverRegistryCaller // Generic read-only contract binding to access the raw methods on
}

// MockRiverRegistryTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type MockRiverRegistryTransactorRaw struct {
	Contract *MockRiverRegistryTransactor // Generic write-only contract binding to access the raw methods on
}

// NewMockRiverRegistry creates a new instance of MockRiverRegistry, bound to a specific deployed contract.
func NewMockRiverRegistry(address common.Address, backend bind.ContractBackend) (*MockRiverRegistry, error) {
	contract, err := bindMockRiverRegistry(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &MockRiverRegistry{MockRiverRegistryCaller: MockRiverRegistryCaller{contract: contract}, MockRiverRegistryTransactor: MockRiverRegistryTransactor{contract: contract}, MockRiverRegistryFilterer: MockRiverRegistryFilterer{contract: contract}}, nil
}

// NewMockRiverRegistryCaller creates a new read-only instance of MockRiverRegistry, bound to a specific deployed contract.
func NewMockRiverRegistryCaller(address common.Address, caller bind.ContractCaller) (*MockRiverRegistryCaller, error) {
	contract, err := bindMockRiverRegistry(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &MockRiverRegistryCaller{contract: contract}, nil
}

// NewMockRiverRegistryTransactor creates a new write-only instance of MockRiverRegistry, bound to a specific deployed contract.
func NewMockRiverRegistryTransactor(address common.Address, transactor bind.ContractTransactor) (*MockRiverRegistryTransactor, error) {
	contract, err := bindMockRiverRegistry(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &MockRiverRegistryTransactor{contract: contract}, nil
}

// NewMockRiverRegistryFilterer creates a new log filterer instance of MockRiverRegistry, bound to a specific deployed contract.
func NewMockRiverRegistryFilterer(address common.Address, filterer bind.ContractFilterer) (*MockRiverRegistryFilterer, error) {
	contract, err := bindMockRiverRegistry(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &MockRiverRegistryFilterer{contract: contract}, nil
}

// bindMockRiverRegistry binds a generic wrapper to an already deployed contract.
func bindMockRiverRegistry(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := MockRiverRegistryMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_MockRiverRegistry *MockRiverRegistryRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _MockRiverRegistry.Contract.MockRiverRegistryCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_MockRiverRegistry *MockRiverRegistryRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.MockRiverRegistryTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_MockRiverRegistry *MockRiverRegistryRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.MockRiverRegistryTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_MockRiverRegistry *MockRiverRegistryCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _MockRiverRegistry.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_MockRiverRegistry *MockRiverRegistryTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_MockRiverRegistry *MockRiverRegistryTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.contract.Transact(opts, method, params...)
}

// ConfigurationExists is a free data retrieval call binding the contract method 0xfc207c01.
//
// Solidity: function configurationExists(bytes32 key) view returns(bool)
func (_MockRiverRegistry *MockRiverRegistryCaller) ConfigurationExists(opts *bind.CallOpts, key [32]byte) (bool, error) {
	var out []interface{}
	err := _MockRiverRegistry.contract.Call(opts, &out, "configurationExists", key)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// ConfigurationExists is a free data retrieval call binding the contract method 0xfc207c01.
//
// Solidity: function configurationExists(bytes32 key) view returns(bool)
func (_MockRiverRegistry *MockRiverRegistrySession) ConfigurationExists(key [32]byte) (bool, error) {
	return _MockRiverRegistry.Contract.ConfigurationExists(&_MockRiverRegistry.CallOpts, key)
}

// ConfigurationExists is a free data retrieval call binding the contract method 0xfc207c01.
//
// Solidity: function configurationExists(bytes32 key) view returns(bool)
func (_MockRiverRegistry *MockRiverRegistryCallerSession) ConfigurationExists(key [32]byte) (bool, error) {
	return _MockRiverRegistry.Contract.ConfigurationExists(&_MockRiverRegistry.CallOpts, key)
}

// GetAllConfiguration is a free data retrieval call binding the contract method 0x081814db.
//
// Solidity: function getAllConfiguration() view returns((bytes32,uint64,bytes)[])
func (_MockRiverRegistry *MockRiverRegistryCaller) GetAllConfiguration(opts *bind.CallOpts) ([]Setting, error) {
	var out []interface{}
	err := _MockRiverRegistry.contract.Call(opts, &out, "getAllConfiguration")

	if err != nil {
		return *new([]Setting), err
	}

	out0 := *abi.ConvertType(out[0], new([]Setting)).(*[]Setting)

	return out0, err

}

// GetAllConfiguration is a free data retrieval call binding the contract method 0x081814db.
//
// Solidity: function getAllConfiguration() view returns((bytes32,uint64,bytes)[])
func (_MockRiverRegistry *MockRiverRegistrySession) GetAllConfiguration() ([]Setting, error) {
	return _MockRiverRegistry.Contract.GetAllConfiguration(&_MockRiverRegistry.CallOpts)
}

// GetAllConfiguration is a free data retrieval call binding the contract method 0x081814db.
//
// Solidity: function getAllConfiguration() view returns((bytes32,uint64,bytes)[])
func (_MockRiverRegistry *MockRiverRegistryCallerSession) GetAllConfiguration() ([]Setting, error) {
	return _MockRiverRegistry.Contract.GetAllConfiguration(&_MockRiverRegistry.CallOpts)
}

// GetAllNodeAddresses is a free data retrieval call binding the contract method 0xc8fe3a01.
//
// Solidity: function getAllNodeAddresses() view returns(address[])
func (_MockRiverRegistry *MockRiverRegistryCaller) GetAllNodeAddresses(opts *bind.CallOpts) ([]common.Address, error) {
	var out []interface{}
	err := _MockRiverRegistry.contract.Call(opts, &out, "getAllNodeAddresses")

	if err != nil {
		return *new([]common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new([]common.Address)).(*[]common.Address)

	return out0, err

}

// GetAllNodeAddresses is a free data retrieval call binding the contract method 0xc8fe3a01.
//
// Solidity: function getAllNodeAddresses() view returns(address[])
func (_MockRiverRegistry *MockRiverRegistrySession) GetAllNodeAddresses() ([]common.Address, error) {
	return _MockRiverRegistry.Contract.GetAllNodeAddresses(&_MockRiverRegistry.CallOpts)
}

// GetAllNodeAddresses is a free data retrieval call binding the contract method 0xc8fe3a01.
//
// Solidity: function getAllNodeAddresses() view returns(address[])
func (_MockRiverRegistry *MockRiverRegistryCallerSession) GetAllNodeAddresses() ([]common.Address, error) {
	return _MockRiverRegistry.Contract.GetAllNodeAddresses(&_MockRiverRegistry.CallOpts)
}

// GetAllNodes is a free data retrieval call binding the contract method 0xa1174e7d.
//
// Solidity: function getAllNodes() view returns((uint8,string,address,address)[])
func (_MockRiverRegistry *MockRiverRegistryCaller) GetAllNodes(opts *bind.CallOpts) ([]Node, error) {
	var out []interface{}
	err := _MockRiverRegistry.contract.Call(opts, &out, "getAllNodes")

	if err != nil {
		return *new([]Node), err
	}

	out0 := *abi.ConvertType(out[0], new([]Node)).(*[]Node)

	return out0, err

}

// GetAllNodes is a free data retrieval call binding the contract method 0xa1174e7d.
//
// Solidity: function getAllNodes() view returns((uint8,string,address,address)[])
func (_MockRiverRegistry *MockRiverRegistrySession) GetAllNodes() ([]Node, error) {
	return _MockRiverRegistry.Contract.GetAllNodes(&_MockRiverRegistry.CallOpts)
}

// GetAllNodes is a free data retrieval call binding the contract method 0xa1174e7d.
//
// Solidity: function getAllNodes() view returns((uint8,string,address,address)[])
func (_MockRiverRegistry *MockRiverRegistryCallerSession) GetAllNodes() ([]Node, error) {
	return _MockRiverRegistry.Contract.GetAllNodes(&_MockRiverRegistry.CallOpts)
}

// GetAllOperators is a free data retrieval call binding the contract method 0xd911c632.
//
// Solidity: function getAllOperators() view returns(address[])
func (_MockRiverRegistry *MockRiverRegistryCaller) GetAllOperators(opts *bind.CallOpts) ([]common.Address, error) {
	var out []interface{}
	err := _MockRiverRegistry.contract.Call(opts, &out, "getAllOperators")

	if err != nil {
		return *new([]common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new([]common.Address)).(*[]common.Address)

	return out0, err

}

// GetAllOperators is a free data retrieval call binding the contract method 0xd911c632.
//
// Solidity: function getAllOperators() view returns(address[])
func (_MockRiverRegistry *MockRiverRegistrySession) GetAllOperators() ([]common.Address, error) {
	return _MockRiverRegistry.Contract.GetAllOperators(&_MockRiverRegistry.CallOpts)
}

// GetAllOperators is a free data retrieval call binding the contract method 0xd911c632.
//
// Solidity: function getAllOperators() view returns(address[])
func (_MockRiverRegistry *MockRiverRegistryCallerSession) GetAllOperators() ([]common.Address, error) {
	return _MockRiverRegistry.Contract.GetAllOperators(&_MockRiverRegistry.CallOpts)
}

// GetAllStreamIds is a free data retrieval call binding the contract method 0x86789fc6.
//
// Solidity: function getAllStreamIds() view returns(bytes32[])
func (_MockRiverRegistry *MockRiverRegistryCaller) GetAllStreamIds(opts *bind.CallOpts) ([][32]byte, error) {
	var out []interface{}
	err := _MockRiverRegistry.contract.Call(opts, &out, "getAllStreamIds")

	if err != nil {
		return *new([][32]byte), err
	}

	out0 := *abi.ConvertType(out[0], new([][32]byte)).(*[][32]byte)

	return out0, err

}

// GetAllStreamIds is a free data retrieval call binding the contract method 0x86789fc6.
//
// Solidity: function getAllStreamIds() view returns(bytes32[])
func (_MockRiverRegistry *MockRiverRegistrySession) GetAllStreamIds() ([][32]byte, error) {
	return _MockRiverRegistry.Contract.GetAllStreamIds(&_MockRiverRegistry.CallOpts)
}

// GetAllStreamIds is a free data retrieval call binding the contract method 0x86789fc6.
//
// Solidity: function getAllStreamIds() view returns(bytes32[])
func (_MockRiverRegistry *MockRiverRegistryCallerSession) GetAllStreamIds() ([][32]byte, error) {
	return _MockRiverRegistry.Contract.GetAllStreamIds(&_MockRiverRegistry.CallOpts)
}

// GetAllStreams is a free data retrieval call binding the contract method 0x3bd84c0c.
//
// Solidity: function getAllStreams() view returns((bytes32,(bytes32,uint64,uint64,uint64,address[]))[])
func (_MockRiverRegistry *MockRiverRegistryCaller) GetAllStreams(opts *bind.CallOpts) ([]StreamWithId, error) {
	var out []interface{}
	err := _MockRiverRegistry.contract.Call(opts, &out, "getAllStreams")

	if err != nil {
		return *new([]StreamWithId), err
	}

	out0 := *abi.ConvertType(out[0], new([]StreamWithId)).(*[]StreamWithId)

	return out0, err

}

// GetAllStreams is a free data retrieval call binding the contract method 0x3bd84c0c.
//
// Solidity: function getAllStreams() view returns((bytes32,(bytes32,uint64,uint64,uint64,address[]))[])
func (_MockRiverRegistry *MockRiverRegistrySession) GetAllStreams() ([]StreamWithId, error) {
	return _MockRiverRegistry.Contract.GetAllStreams(&_MockRiverRegistry.CallOpts)
}

// GetAllStreams is a free data retrieval call binding the contract method 0x3bd84c0c.
//
// Solidity: function getAllStreams() view returns((bytes32,(bytes32,uint64,uint64,uint64,address[]))[])
func (_MockRiverRegistry *MockRiverRegistryCallerSession) GetAllStreams() ([]StreamWithId, error) {
	return _MockRiverRegistry.Contract.GetAllStreams(&_MockRiverRegistry.CallOpts)
}

// GetConfiguration is a free data retrieval call binding the contract method 0x9283ae3a.
//
// Solidity: function getConfiguration(bytes32 key) view returns((bytes32,uint64,bytes)[])
func (_MockRiverRegistry *MockRiverRegistryCaller) GetConfiguration(opts *bind.CallOpts, key [32]byte) ([]Setting, error) {
	var out []interface{}
	err := _MockRiverRegistry.contract.Call(opts, &out, "getConfiguration", key)

	if err != nil {
		return *new([]Setting), err
	}

	out0 := *abi.ConvertType(out[0], new([]Setting)).(*[]Setting)

	return out0, err

}

// GetConfiguration is a free data retrieval call binding the contract method 0x9283ae3a.
//
// Solidity: function getConfiguration(bytes32 key) view returns((bytes32,uint64,bytes)[])
func (_MockRiverRegistry *MockRiverRegistrySession) GetConfiguration(key [32]byte) ([]Setting, error) {
	return _MockRiverRegistry.Contract.GetConfiguration(&_MockRiverRegistry.CallOpts, key)
}

// GetConfiguration is a free data retrieval call binding the contract method 0x9283ae3a.
//
// Solidity: function getConfiguration(bytes32 key) view returns((bytes32,uint64,bytes)[])
func (_MockRiverRegistry *MockRiverRegistryCallerSession) GetConfiguration(key [32]byte) ([]Setting, error) {
	return _MockRiverRegistry.Contract.GetConfiguration(&_MockRiverRegistry.CallOpts, key)
}

// GetNode is a free data retrieval call binding the contract method 0x9d209048.
//
// Solidity: function getNode(address nodeAddress) view returns((uint8,string,address,address))
func (_MockRiverRegistry *MockRiverRegistryCaller) GetNode(opts *bind.CallOpts, nodeAddress common.Address) (Node, error) {
	var out []interface{}
	err := _MockRiverRegistry.contract.Call(opts, &out, "getNode", nodeAddress)

	if err != nil {
		return *new(Node), err
	}

	out0 := *abi.ConvertType(out[0], new(Node)).(*Node)

	return out0, err

}

// GetNode is a free data retrieval call binding the contract method 0x9d209048.
//
// Solidity: function getNode(address nodeAddress) view returns((uint8,string,address,address))
func (_MockRiverRegistry *MockRiverRegistrySession) GetNode(nodeAddress common.Address) (Node, error) {
	return _MockRiverRegistry.Contract.GetNode(&_MockRiverRegistry.CallOpts, nodeAddress)
}

// GetNode is a free data retrieval call binding the contract method 0x9d209048.
//
// Solidity: function getNode(address nodeAddress) view returns((uint8,string,address,address))
func (_MockRiverRegistry *MockRiverRegistryCallerSession) GetNode(nodeAddress common.Address) (Node, error) {
	return _MockRiverRegistry.Contract.GetNode(&_MockRiverRegistry.CallOpts, nodeAddress)
}

// GetNodeCount is a free data retrieval call binding the contract method 0x39bf397e.
//
// Solidity: function getNodeCount() view returns(uint256)
func (_MockRiverRegistry *MockRiverRegistryCaller) GetNodeCount(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _MockRiverRegistry.contract.Call(opts, &out, "getNodeCount")

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// GetNodeCount is a free data retrieval call binding the contract method 0x39bf397e.
//
// Solidity: function getNodeCount() view returns(uint256)
func (_MockRiverRegistry *MockRiverRegistrySession) GetNodeCount() (*big.Int, error) {
	return _MockRiverRegistry.Contract.GetNodeCount(&_MockRiverRegistry.CallOpts)
}

// GetNodeCount is a free data retrieval call binding the contract method 0x39bf397e.
//
// Solidity: function getNodeCount() view returns(uint256)
func (_MockRiverRegistry *MockRiverRegistryCallerSession) GetNodeCount() (*big.Int, error) {
	return _MockRiverRegistry.Contract.GetNodeCount(&_MockRiverRegistry.CallOpts)
}

// GetPaginatedStreams is a free data retrieval call binding the contract method 0xca78c41a.
//
// Solidity: function getPaginatedStreams(uint256 start, uint256 stop) view returns((bytes32,(bytes32,uint64,uint64,uint64,address[]))[], bool)
func (_MockRiverRegistry *MockRiverRegistryCaller) GetPaginatedStreams(opts *bind.CallOpts, start *big.Int, stop *big.Int) ([]StreamWithId, bool, error) {
	var out []interface{}
	err := _MockRiverRegistry.contract.Call(opts, &out, "getPaginatedStreams", start, stop)

	if err != nil {
		return *new([]StreamWithId), *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new([]StreamWithId)).(*[]StreamWithId)
	out1 := *abi.ConvertType(out[1], new(bool)).(*bool)

	return out0, out1, err

}

// GetPaginatedStreams is a free data retrieval call binding the contract method 0xca78c41a.
//
// Solidity: function getPaginatedStreams(uint256 start, uint256 stop) view returns((bytes32,(bytes32,uint64,uint64,uint64,address[]))[], bool)
func (_MockRiverRegistry *MockRiverRegistrySession) GetPaginatedStreams(start *big.Int, stop *big.Int) ([]StreamWithId, bool, error) {
	return _MockRiverRegistry.Contract.GetPaginatedStreams(&_MockRiverRegistry.CallOpts, start, stop)
}

// GetPaginatedStreams is a free data retrieval call binding the contract method 0xca78c41a.
//
// Solidity: function getPaginatedStreams(uint256 start, uint256 stop) view returns((bytes32,(bytes32,uint64,uint64,uint64,address[]))[], bool)
func (_MockRiverRegistry *MockRiverRegistryCallerSession) GetPaginatedStreams(start *big.Int, stop *big.Int) ([]StreamWithId, bool, error) {
	return _MockRiverRegistry.Contract.GetPaginatedStreams(&_MockRiverRegistry.CallOpts, start, stop)
}

// GetStream is a free data retrieval call binding the contract method 0x1290abe8.
//
// Solidity: function getStream(bytes32 streamId) view returns((bytes32,uint64,uint64,uint64,address[]))
func (_MockRiverRegistry *MockRiverRegistryCaller) GetStream(opts *bind.CallOpts, streamId [32]byte) (Stream, error) {
	var out []interface{}
	err := _MockRiverRegistry.contract.Call(opts, &out, "getStream", streamId)

	if err != nil {
		return *new(Stream), err
	}

	out0 := *abi.ConvertType(out[0], new(Stream)).(*Stream)

	return out0, err

}

// GetStream is a free data retrieval call binding the contract method 0x1290abe8.
//
// Solidity: function getStream(bytes32 streamId) view returns((bytes32,uint64,uint64,uint64,address[]))
func (_MockRiverRegistry *MockRiverRegistrySession) GetStream(streamId [32]byte) (Stream, error) {
	return _MockRiverRegistry.Contract.GetStream(&_MockRiverRegistry.CallOpts, streamId)
}

// GetStream is a free data retrieval call binding the contract method 0x1290abe8.
//
// Solidity: function getStream(bytes32 streamId) view returns((bytes32,uint64,uint64,uint64,address[]))
func (_MockRiverRegistry *MockRiverRegistryCallerSession) GetStream(streamId [32]byte) (Stream, error) {
	return _MockRiverRegistry.Contract.GetStream(&_MockRiverRegistry.CallOpts, streamId)
}

// GetStreamByIndex is a free data retrieval call binding the contract method 0x68b454df.
//
// Solidity: function getStreamByIndex(uint256 i) view returns((bytes32,(bytes32,uint64,uint64,uint64,address[])))
func (_MockRiverRegistry *MockRiverRegistryCaller) GetStreamByIndex(opts *bind.CallOpts, i *big.Int) (StreamWithId, error) {
	var out []interface{}
	err := _MockRiverRegistry.contract.Call(opts, &out, "getStreamByIndex", i)

	if err != nil {
		return *new(StreamWithId), err
	}

	out0 := *abi.ConvertType(out[0], new(StreamWithId)).(*StreamWithId)

	return out0, err

}

// GetStreamByIndex is a free data retrieval call binding the contract method 0x68b454df.
//
// Solidity: function getStreamByIndex(uint256 i) view returns((bytes32,(bytes32,uint64,uint64,uint64,address[])))
func (_MockRiverRegistry *MockRiverRegistrySession) GetStreamByIndex(i *big.Int) (StreamWithId, error) {
	return _MockRiverRegistry.Contract.GetStreamByIndex(&_MockRiverRegistry.CallOpts, i)
}

// GetStreamByIndex is a free data retrieval call binding the contract method 0x68b454df.
//
// Solidity: function getStreamByIndex(uint256 i) view returns((bytes32,(bytes32,uint64,uint64,uint64,address[])))
func (_MockRiverRegistry *MockRiverRegistryCallerSession) GetStreamByIndex(i *big.Int) (StreamWithId, error) {
	return _MockRiverRegistry.Contract.GetStreamByIndex(&_MockRiverRegistry.CallOpts, i)
}

// GetStreamCount is a free data retrieval call binding the contract method 0xc0f22084.
//
// Solidity: function getStreamCount() view returns(uint256)
func (_MockRiverRegistry *MockRiverRegistryCaller) GetStreamCount(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _MockRiverRegistry.contract.Call(opts, &out, "getStreamCount")

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// GetStreamCount is a free data retrieval call binding the contract method 0xc0f22084.
//
// Solidity: function getStreamCount() view returns(uint256)
func (_MockRiverRegistry *MockRiverRegistrySession) GetStreamCount() (*big.Int, error) {
	return _MockRiverRegistry.Contract.GetStreamCount(&_MockRiverRegistry.CallOpts)
}

// GetStreamCount is a free data retrieval call binding the contract method 0xc0f22084.
//
// Solidity: function getStreamCount() view returns(uint256)
func (_MockRiverRegistry *MockRiverRegistryCallerSession) GetStreamCount() (*big.Int, error) {
	return _MockRiverRegistry.Contract.GetStreamCount(&_MockRiverRegistry.CallOpts)
}

// GetStreamCountOnNode is a free data retrieval call binding the contract method 0xc87d1324.
//
// Solidity: function getStreamCountOnNode(address nodeAddress) view returns(uint256)
func (_MockRiverRegistry *MockRiverRegistryCaller) GetStreamCountOnNode(opts *bind.CallOpts, nodeAddress common.Address) (*big.Int, error) {
	var out []interface{}
	err := _MockRiverRegistry.contract.Call(opts, &out, "getStreamCountOnNode", nodeAddress)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// GetStreamCountOnNode is a free data retrieval call binding the contract method 0xc87d1324.
//
// Solidity: function getStreamCountOnNode(address nodeAddress) view returns(uint256)
func (_MockRiverRegistry *MockRiverRegistrySession) GetStreamCountOnNode(nodeAddress common.Address) (*big.Int, error) {
	return _MockRiverRegistry.Contract.GetStreamCountOnNode(&_MockRiverRegistry.CallOpts, nodeAddress)
}

// GetStreamCountOnNode is a free data retrieval call binding the contract method 0xc87d1324.
//
// Solidity: function getStreamCountOnNode(address nodeAddress) view returns(uint256)
func (_MockRiverRegistry *MockRiverRegistryCallerSession) GetStreamCountOnNode(nodeAddress common.Address) (*big.Int, error) {
	return _MockRiverRegistry.Contract.GetStreamCountOnNode(&_MockRiverRegistry.CallOpts, nodeAddress)
}

// GetStreamWithGenesis is a free data retrieval call binding the contract method 0x3c2544d1.
//
// Solidity: function getStreamWithGenesis(bytes32 streamId) view returns((bytes32,uint64,uint64,uint64,address[]), bytes32, bytes)
func (_MockRiverRegistry *MockRiverRegistryCaller) GetStreamWithGenesis(opts *bind.CallOpts, streamId [32]byte) (Stream, [32]byte, []byte, error) {
	var out []interface{}
	err := _MockRiverRegistry.contract.Call(opts, &out, "getStreamWithGenesis", streamId)

	if err != nil {
		return *new(Stream), *new([32]byte), *new([]byte), err
	}

	out0 := *abi.ConvertType(out[0], new(Stream)).(*Stream)
	out1 := *abi.ConvertType(out[1], new([32]byte)).(*[32]byte)
	out2 := *abi.ConvertType(out[2], new([]byte)).(*[]byte)

	return out0, out1, out2, err

}

// GetStreamWithGenesis is a free data retrieval call binding the contract method 0x3c2544d1.
//
// Solidity: function getStreamWithGenesis(bytes32 streamId) view returns((bytes32,uint64,uint64,uint64,address[]), bytes32, bytes)
func (_MockRiverRegistry *MockRiverRegistrySession) GetStreamWithGenesis(streamId [32]byte) (Stream, [32]byte, []byte, error) {
	return _MockRiverRegistry.Contract.GetStreamWithGenesis(&_MockRiverRegistry.CallOpts, streamId)
}

// GetStreamWithGenesis is a free data retrieval call binding the contract method 0x3c2544d1.
//
// Solidity: function getStreamWithGenesis(bytes32 streamId) view returns((bytes32,uint64,uint64,uint64,address[]), bytes32, bytes)
func (_MockRiverRegistry *MockRiverRegistryCallerSession) GetStreamWithGenesis(streamId [32]byte) (Stream, [32]byte, []byte, error) {
	return _MockRiverRegistry.Contract.GetStreamWithGenesis(&_MockRiverRegistry.CallOpts, streamId)
}

// GetStreams is a free data retrieval call binding the contract method 0x72e1a68b.
//
// Solidity: function getStreams(bytes32[] streamIds) view returns(uint256 foundCount, (bytes32,(bytes32,uint64,uint64,uint64,address[]))[])
func (_MockRiverRegistry *MockRiverRegistryCaller) GetStreams(opts *bind.CallOpts, streamIds [][32]byte) (*big.Int, []StreamWithId, error) {
	var out []interface{}
	err := _MockRiverRegistry.contract.Call(opts, &out, "getStreams", streamIds)

	if err != nil {
		return *new(*big.Int), *new([]StreamWithId), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)
	out1 := *abi.ConvertType(out[1], new([]StreamWithId)).(*[]StreamWithId)

	return out0, out1, err

}

// GetStreams is a free data retrieval call binding the contract method 0x72e1a68b.
//
// Solidity: function getStreams(bytes32[] streamIds) view returns(uint256 foundCount, (bytes32,(bytes32,uint64,uint64,uint64,address[]))[])
func (_MockRiverRegistry *MockRiverRegistrySession) GetStreams(streamIds [][32]byte) (*big.Int, []StreamWithId, error) {
	return _MockRiverRegistry.Contract.GetStreams(&_MockRiverRegistry.CallOpts, streamIds)
}

// GetStreams is a free data retrieval call binding the contract method 0x72e1a68b.
//
// Solidity: function getStreams(bytes32[] streamIds) view returns(uint256 foundCount, (bytes32,(bytes32,uint64,uint64,uint64,address[]))[])
func (_MockRiverRegistry *MockRiverRegistryCallerSession) GetStreams(streamIds [][32]byte) (*big.Int, []StreamWithId, error) {
	return _MockRiverRegistry.Contract.GetStreams(&_MockRiverRegistry.CallOpts, streamIds)
}

// GetStreamsOnNode is a free data retrieval call binding the contract method 0x32705ac4.
//
// Solidity: function getStreamsOnNode(address nodeAddress) view returns((bytes32,(bytes32,uint64,uint64,uint64,address[]))[])
func (_MockRiverRegistry *MockRiverRegistryCaller) GetStreamsOnNode(opts *bind.CallOpts, nodeAddress common.Address) ([]StreamWithId, error) {
	var out []interface{}
	err := _MockRiverRegistry.contract.Call(opts, &out, "getStreamsOnNode", nodeAddress)

	if err != nil {
		return *new([]StreamWithId), err
	}

	out0 := *abi.ConvertType(out[0], new([]StreamWithId)).(*[]StreamWithId)

	return out0, err

}

// GetStreamsOnNode is a free data retrieval call binding the contract method 0x32705ac4.
//
// Solidity: function getStreamsOnNode(address nodeAddress) view returns((bytes32,(bytes32,uint64,uint64,uint64,address[]))[])
func (_MockRiverRegistry *MockRiverRegistrySession) GetStreamsOnNode(nodeAddress common.Address) ([]StreamWithId, error) {
	return _MockRiverRegistry.Contract.GetStreamsOnNode(&_MockRiverRegistry.CallOpts, nodeAddress)
}

// GetStreamsOnNode is a free data retrieval call binding the contract method 0x32705ac4.
//
// Solidity: function getStreamsOnNode(address nodeAddress) view returns((bytes32,(bytes32,uint64,uint64,uint64,address[]))[])
func (_MockRiverRegistry *MockRiverRegistryCallerSession) GetStreamsOnNode(nodeAddress common.Address) ([]StreamWithId, error) {
	return _MockRiverRegistry.Contract.GetStreamsOnNode(&_MockRiverRegistry.CallOpts, nodeAddress)
}

// IsConfigurationManager is a free data retrieval call binding the contract method 0xd4bd44a0.
//
// Solidity: function isConfigurationManager(address manager) view returns(bool)
func (_MockRiverRegistry *MockRiverRegistryCaller) IsConfigurationManager(opts *bind.CallOpts, manager common.Address) (bool, error) {
	var out []interface{}
	err := _MockRiverRegistry.contract.Call(opts, &out, "isConfigurationManager", manager)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsConfigurationManager is a free data retrieval call binding the contract method 0xd4bd44a0.
//
// Solidity: function isConfigurationManager(address manager) view returns(bool)
func (_MockRiverRegistry *MockRiverRegistrySession) IsConfigurationManager(manager common.Address) (bool, error) {
	return _MockRiverRegistry.Contract.IsConfigurationManager(&_MockRiverRegistry.CallOpts, manager)
}

// IsConfigurationManager is a free data retrieval call binding the contract method 0xd4bd44a0.
//
// Solidity: function isConfigurationManager(address manager) view returns(bool)
func (_MockRiverRegistry *MockRiverRegistryCallerSession) IsConfigurationManager(manager common.Address) (bool, error) {
	return _MockRiverRegistry.Contract.IsConfigurationManager(&_MockRiverRegistry.CallOpts, manager)
}

// IsOperator is a free data retrieval call binding the contract method 0x6d70f7ae.
//
// Solidity: function isOperator(address operator) view returns(bool)
func (_MockRiverRegistry *MockRiverRegistryCaller) IsOperator(opts *bind.CallOpts, operator common.Address) (bool, error) {
	var out []interface{}
	err := _MockRiverRegistry.contract.Call(opts, &out, "isOperator", operator)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsOperator is a free data retrieval call binding the contract method 0x6d70f7ae.
//
// Solidity: function isOperator(address operator) view returns(bool)
func (_MockRiverRegistry *MockRiverRegistrySession) IsOperator(operator common.Address) (bool, error) {
	return _MockRiverRegistry.Contract.IsOperator(&_MockRiverRegistry.CallOpts, operator)
}

// IsOperator is a free data retrieval call binding the contract method 0x6d70f7ae.
//
// Solidity: function isOperator(address operator) view returns(bool)
func (_MockRiverRegistry *MockRiverRegistryCallerSession) IsOperator(operator common.Address) (bool, error) {
	return _MockRiverRegistry.Contract.IsOperator(&_MockRiverRegistry.CallOpts, operator)
}

// OperatorRegistryInit is a paid mutator transaction binding the contract method 0xba428b1a.
//
// Solidity: function __OperatorRegistry_init(address[] initialOperators) returns()
func (_MockRiverRegistry *MockRiverRegistryTransactor) OperatorRegistryInit(opts *bind.TransactOpts, initialOperators []common.Address) (*types.Transaction, error) {
	return _MockRiverRegistry.contract.Transact(opts, "__OperatorRegistry_init", initialOperators)
}

// OperatorRegistryInit is a paid mutator transaction binding the contract method 0xba428b1a.
//
// Solidity: function __OperatorRegistry_init(address[] initialOperators) returns()
func (_MockRiverRegistry *MockRiverRegistrySession) OperatorRegistryInit(initialOperators []common.Address) (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.OperatorRegistryInit(&_MockRiverRegistry.TransactOpts, initialOperators)
}

// OperatorRegistryInit is a paid mutator transaction binding the contract method 0xba428b1a.
//
// Solidity: function __OperatorRegistry_init(address[] initialOperators) returns()
func (_MockRiverRegistry *MockRiverRegistryTransactorSession) OperatorRegistryInit(initialOperators []common.Address) (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.OperatorRegistryInit(&_MockRiverRegistry.TransactOpts, initialOperators)
}

// RiverConfigInit is a paid mutator transaction binding the contract method 0x31374511.
//
// Solidity: function __RiverConfig_init(address[] configManagers) returns()
func (_MockRiverRegistry *MockRiverRegistryTransactor) RiverConfigInit(opts *bind.TransactOpts, configManagers []common.Address) (*types.Transaction, error) {
	return _MockRiverRegistry.contract.Transact(opts, "__RiverConfig_init", configManagers)
}

// RiverConfigInit is a paid mutator transaction binding the contract method 0x31374511.
//
// Solidity: function __RiverConfig_init(address[] configManagers) returns()
func (_MockRiverRegistry *MockRiverRegistrySession) RiverConfigInit(configManagers []common.Address) (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.RiverConfigInit(&_MockRiverRegistry.TransactOpts, configManagers)
}

// RiverConfigInit is a paid mutator transaction binding the contract method 0x31374511.
//
// Solidity: function __RiverConfig_init(address[] configManagers) returns()
func (_MockRiverRegistry *MockRiverRegistryTransactorSession) RiverConfigInit(configManagers []common.Address) (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.RiverConfigInit(&_MockRiverRegistry.TransactOpts, configManagers)
}

// AllocateStream is a paid mutator transaction binding the contract method 0x6b883c39.
//
// Solidity: function allocateStream(bytes32 streamId, address[] nodes, bytes32 genesisMiniblockHash, bytes genesisMiniblock) returns()
func (_MockRiverRegistry *MockRiverRegistryTransactor) AllocateStream(opts *bind.TransactOpts, streamId [32]byte, nodes []common.Address, genesisMiniblockHash [32]byte, genesisMiniblock []byte) (*types.Transaction, error) {
	return _MockRiverRegistry.contract.Transact(opts, "allocateStream", streamId, nodes, genesisMiniblockHash, genesisMiniblock)
}

// AllocateStream is a paid mutator transaction binding the contract method 0x6b883c39.
//
// Solidity: function allocateStream(bytes32 streamId, address[] nodes, bytes32 genesisMiniblockHash, bytes genesisMiniblock) returns()
func (_MockRiverRegistry *MockRiverRegistrySession) AllocateStream(streamId [32]byte, nodes []common.Address, genesisMiniblockHash [32]byte, genesisMiniblock []byte) (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.AllocateStream(&_MockRiverRegistry.TransactOpts, streamId, nodes, genesisMiniblockHash, genesisMiniblock)
}

// AllocateStream is a paid mutator transaction binding the contract method 0x6b883c39.
//
// Solidity: function allocateStream(bytes32 streamId, address[] nodes, bytes32 genesisMiniblockHash, bytes genesisMiniblock) returns()
func (_MockRiverRegistry *MockRiverRegistryTransactorSession) AllocateStream(streamId [32]byte, nodes []common.Address, genesisMiniblockHash [32]byte, genesisMiniblock []byte) (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.AllocateStream(&_MockRiverRegistry.TransactOpts, streamId, nodes, genesisMiniblockHash, genesisMiniblock)
}

// ApproveConfigurationManager is a paid mutator transaction binding the contract method 0xc179b85f.
//
// Solidity: function approveConfigurationManager(address manager) returns()
func (_MockRiverRegistry *MockRiverRegistryTransactor) ApproveConfigurationManager(opts *bind.TransactOpts, manager common.Address) (*types.Transaction, error) {
	return _MockRiverRegistry.contract.Transact(opts, "approveConfigurationManager", manager)
}

// ApproveConfigurationManager is a paid mutator transaction binding the contract method 0xc179b85f.
//
// Solidity: function approveConfigurationManager(address manager) returns()
func (_MockRiverRegistry *MockRiverRegistrySession) ApproveConfigurationManager(manager common.Address) (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.ApproveConfigurationManager(&_MockRiverRegistry.TransactOpts, manager)
}

// ApproveConfigurationManager is a paid mutator transaction binding the contract method 0xc179b85f.
//
// Solidity: function approveConfigurationManager(address manager) returns()
func (_MockRiverRegistry *MockRiverRegistryTransactorSession) ApproveConfigurationManager(manager common.Address) (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.ApproveConfigurationManager(&_MockRiverRegistry.TransactOpts, manager)
}

// ApproveOperator is a paid mutator transaction binding the contract method 0x242cae9f.
//
// Solidity: function approveOperator(address operator) returns()
func (_MockRiverRegistry *MockRiverRegistryTransactor) ApproveOperator(opts *bind.TransactOpts, operator common.Address) (*types.Transaction, error) {
	return _MockRiverRegistry.contract.Transact(opts, "approveOperator", operator)
}

// ApproveOperator is a paid mutator transaction binding the contract method 0x242cae9f.
//
// Solidity: function approveOperator(address operator) returns()
func (_MockRiverRegistry *MockRiverRegistrySession) ApproveOperator(operator common.Address) (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.ApproveOperator(&_MockRiverRegistry.TransactOpts, operator)
}

// ApproveOperator is a paid mutator transaction binding the contract method 0x242cae9f.
//
// Solidity: function approveOperator(address operator) returns()
func (_MockRiverRegistry *MockRiverRegistryTransactorSession) ApproveOperator(operator common.Address) (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.ApproveOperator(&_MockRiverRegistry.TransactOpts, operator)
}

// DeleteConfiguration is a paid mutator transaction binding the contract method 0x035759e1.
//
// Solidity: function deleteConfiguration(bytes32 key) returns()
func (_MockRiverRegistry *MockRiverRegistryTransactor) DeleteConfiguration(opts *bind.TransactOpts, key [32]byte) (*types.Transaction, error) {
	return _MockRiverRegistry.contract.Transact(opts, "deleteConfiguration", key)
}

// DeleteConfiguration is a paid mutator transaction binding the contract method 0x035759e1.
//
// Solidity: function deleteConfiguration(bytes32 key) returns()
func (_MockRiverRegistry *MockRiverRegistrySession) DeleteConfiguration(key [32]byte) (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.DeleteConfiguration(&_MockRiverRegistry.TransactOpts, key)
}

// DeleteConfiguration is a paid mutator transaction binding the contract method 0x035759e1.
//
// Solidity: function deleteConfiguration(bytes32 key) returns()
func (_MockRiverRegistry *MockRiverRegistryTransactorSession) DeleteConfiguration(key [32]byte) (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.DeleteConfiguration(&_MockRiverRegistry.TransactOpts, key)
}

// DeleteConfigurationOnBlock is a paid mutator transaction binding the contract method 0xb7f227ee.
//
// Solidity: function deleteConfigurationOnBlock(bytes32 key, uint64 blockNumber) returns()
func (_MockRiverRegistry *MockRiverRegistryTransactor) DeleteConfigurationOnBlock(opts *bind.TransactOpts, key [32]byte, blockNumber uint64) (*types.Transaction, error) {
	return _MockRiverRegistry.contract.Transact(opts, "deleteConfigurationOnBlock", key, blockNumber)
}

// DeleteConfigurationOnBlock is a paid mutator transaction binding the contract method 0xb7f227ee.
//
// Solidity: function deleteConfigurationOnBlock(bytes32 key, uint64 blockNumber) returns()
func (_MockRiverRegistry *MockRiverRegistrySession) DeleteConfigurationOnBlock(key [32]byte, blockNumber uint64) (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.DeleteConfigurationOnBlock(&_MockRiverRegistry.TransactOpts, key, blockNumber)
}

// DeleteConfigurationOnBlock is a paid mutator transaction binding the contract method 0xb7f227ee.
//
// Solidity: function deleteConfigurationOnBlock(bytes32 key, uint64 blockNumber) returns()
func (_MockRiverRegistry *MockRiverRegistryTransactorSession) DeleteConfigurationOnBlock(key [32]byte, blockNumber uint64) (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.DeleteConfigurationOnBlock(&_MockRiverRegistry.TransactOpts, key, blockNumber)
}

// PlaceStreamOnNode is a paid mutator transaction binding the contract method 0x9ee86d38.
//
// Solidity: function placeStreamOnNode(bytes32 streamId, address nodeAddress) returns()
func (_MockRiverRegistry *MockRiverRegistryTransactor) PlaceStreamOnNode(opts *bind.TransactOpts, streamId [32]byte, nodeAddress common.Address) (*types.Transaction, error) {
	return _MockRiverRegistry.contract.Transact(opts, "placeStreamOnNode", streamId, nodeAddress)
}

// PlaceStreamOnNode is a paid mutator transaction binding the contract method 0x9ee86d38.
//
// Solidity: function placeStreamOnNode(bytes32 streamId, address nodeAddress) returns()
func (_MockRiverRegistry *MockRiverRegistrySession) PlaceStreamOnNode(streamId [32]byte, nodeAddress common.Address) (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.PlaceStreamOnNode(&_MockRiverRegistry.TransactOpts, streamId, nodeAddress)
}

// PlaceStreamOnNode is a paid mutator transaction binding the contract method 0x9ee86d38.
//
// Solidity: function placeStreamOnNode(bytes32 streamId, address nodeAddress) returns()
func (_MockRiverRegistry *MockRiverRegistryTransactorSession) PlaceStreamOnNode(streamId [32]byte, nodeAddress common.Address) (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.PlaceStreamOnNode(&_MockRiverRegistry.TransactOpts, streamId, nodeAddress)
}

// RegisterNode is a paid mutator transaction binding the contract method 0xeecc66f4.
//
// Solidity: function registerNode(address nodeAddress, string url, uint8 status) returns()
func (_MockRiverRegistry *MockRiverRegistryTransactor) RegisterNode(opts *bind.TransactOpts, nodeAddress common.Address, url string, status uint8) (*types.Transaction, error) {
	return _MockRiverRegistry.contract.Transact(opts, "registerNode", nodeAddress, url, status)
}

// RegisterNode is a paid mutator transaction binding the contract method 0xeecc66f4.
//
// Solidity: function registerNode(address nodeAddress, string url, uint8 status) returns()
func (_MockRiverRegistry *MockRiverRegistrySession) RegisterNode(nodeAddress common.Address, url string, status uint8) (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.RegisterNode(&_MockRiverRegistry.TransactOpts, nodeAddress, url, status)
}

// RegisterNode is a paid mutator transaction binding the contract method 0xeecc66f4.
//
// Solidity: function registerNode(address nodeAddress, string url, uint8 status) returns()
func (_MockRiverRegistry *MockRiverRegistryTransactorSession) RegisterNode(nodeAddress common.Address, url string, status uint8) (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.RegisterNode(&_MockRiverRegistry.TransactOpts, nodeAddress, url, status)
}

// RemoveConfigurationManager is a paid mutator transaction binding the contract method 0x813049ec.
//
// Solidity: function removeConfigurationManager(address manager) returns()
func (_MockRiverRegistry *MockRiverRegistryTransactor) RemoveConfigurationManager(opts *bind.TransactOpts, manager common.Address) (*types.Transaction, error) {
	return _MockRiverRegistry.contract.Transact(opts, "removeConfigurationManager", manager)
}

// RemoveConfigurationManager is a paid mutator transaction binding the contract method 0x813049ec.
//
// Solidity: function removeConfigurationManager(address manager) returns()
func (_MockRiverRegistry *MockRiverRegistrySession) RemoveConfigurationManager(manager common.Address) (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.RemoveConfigurationManager(&_MockRiverRegistry.TransactOpts, manager)
}

// RemoveConfigurationManager is a paid mutator transaction binding the contract method 0x813049ec.
//
// Solidity: function removeConfigurationManager(address manager) returns()
func (_MockRiverRegistry *MockRiverRegistryTransactorSession) RemoveConfigurationManager(manager common.Address) (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.RemoveConfigurationManager(&_MockRiverRegistry.TransactOpts, manager)
}

// RemoveNode is a paid mutator transaction binding the contract method 0xb2b99ec9.
//
// Solidity: function removeNode(address nodeAddress) returns()
func (_MockRiverRegistry *MockRiverRegistryTransactor) RemoveNode(opts *bind.TransactOpts, nodeAddress common.Address) (*types.Transaction, error) {
	return _MockRiverRegistry.contract.Transact(opts, "removeNode", nodeAddress)
}

// RemoveNode is a paid mutator transaction binding the contract method 0xb2b99ec9.
//
// Solidity: function removeNode(address nodeAddress) returns()
func (_MockRiverRegistry *MockRiverRegistrySession) RemoveNode(nodeAddress common.Address) (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.RemoveNode(&_MockRiverRegistry.TransactOpts, nodeAddress)
}

// RemoveNode is a paid mutator transaction binding the contract method 0xb2b99ec9.
//
// Solidity: function removeNode(address nodeAddress) returns()
func (_MockRiverRegistry *MockRiverRegistryTransactorSession) RemoveNode(nodeAddress common.Address) (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.RemoveNode(&_MockRiverRegistry.TransactOpts, nodeAddress)
}

// RemoveOperator is a paid mutator transaction binding the contract method 0xac8a584a.
//
// Solidity: function removeOperator(address operator) returns()
func (_MockRiverRegistry *MockRiverRegistryTransactor) RemoveOperator(opts *bind.TransactOpts, operator common.Address) (*types.Transaction, error) {
	return _MockRiverRegistry.contract.Transact(opts, "removeOperator", operator)
}

// RemoveOperator is a paid mutator transaction binding the contract method 0xac8a584a.
//
// Solidity: function removeOperator(address operator) returns()
func (_MockRiverRegistry *MockRiverRegistrySession) RemoveOperator(operator common.Address) (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.RemoveOperator(&_MockRiverRegistry.TransactOpts, operator)
}

// RemoveOperator is a paid mutator transaction binding the contract method 0xac8a584a.
//
// Solidity: function removeOperator(address operator) returns()
func (_MockRiverRegistry *MockRiverRegistryTransactorSession) RemoveOperator(operator common.Address) (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.RemoveOperator(&_MockRiverRegistry.TransactOpts, operator)
}

// RemoveStreamFromNode is a paid mutator transaction binding the contract method 0xee885b12.
//
// Solidity: function removeStreamFromNode(bytes32 streamId, address nodeAddress) returns()
func (_MockRiverRegistry *MockRiverRegistryTransactor) RemoveStreamFromNode(opts *bind.TransactOpts, streamId [32]byte, nodeAddress common.Address) (*types.Transaction, error) {
	return _MockRiverRegistry.contract.Transact(opts, "removeStreamFromNode", streamId, nodeAddress)
}

// RemoveStreamFromNode is a paid mutator transaction binding the contract method 0xee885b12.
//
// Solidity: function removeStreamFromNode(bytes32 streamId, address nodeAddress) returns()
func (_MockRiverRegistry *MockRiverRegistrySession) RemoveStreamFromNode(streamId [32]byte, nodeAddress common.Address) (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.RemoveStreamFromNode(&_MockRiverRegistry.TransactOpts, streamId, nodeAddress)
}

// RemoveStreamFromNode is a paid mutator transaction binding the contract method 0xee885b12.
//
// Solidity: function removeStreamFromNode(bytes32 streamId, address nodeAddress) returns()
func (_MockRiverRegistry *MockRiverRegistryTransactorSession) RemoveStreamFromNode(streamId [32]byte, nodeAddress common.Address) (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.RemoveStreamFromNode(&_MockRiverRegistry.TransactOpts, streamId, nodeAddress)
}

// SetConfiguration is a paid mutator transaction binding the contract method 0xa09449a6.
//
// Solidity: function setConfiguration(bytes32 key, uint64 blockNumber, bytes value) returns()
func (_MockRiverRegistry *MockRiverRegistryTransactor) SetConfiguration(opts *bind.TransactOpts, key [32]byte, blockNumber uint64, value []byte) (*types.Transaction, error) {
	return _MockRiverRegistry.contract.Transact(opts, "setConfiguration", key, blockNumber, value)
}

// SetConfiguration is a paid mutator transaction binding the contract method 0xa09449a6.
//
// Solidity: function setConfiguration(bytes32 key, uint64 blockNumber, bytes value) returns()
func (_MockRiverRegistry *MockRiverRegistrySession) SetConfiguration(key [32]byte, blockNumber uint64, value []byte) (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.SetConfiguration(&_MockRiverRegistry.TransactOpts, key, blockNumber, value)
}

// SetConfiguration is a paid mutator transaction binding the contract method 0xa09449a6.
//
// Solidity: function setConfiguration(bytes32 key, uint64 blockNumber, bytes value) returns()
func (_MockRiverRegistry *MockRiverRegistryTransactorSession) SetConfiguration(key [32]byte, blockNumber uint64, value []byte) (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.SetConfiguration(&_MockRiverRegistry.TransactOpts, key, blockNumber, value)
}

// SetStreamLastMiniblock is a paid mutator transaction binding the contract method 0xd7a3158a.
//
// Solidity: function setStreamLastMiniblock(bytes32 streamId, bytes32 , bytes32 lastMiniblockHash, uint64 lastMiniblockNum, bool isSealed) returns()
func (_MockRiverRegistry *MockRiverRegistryTransactor) SetStreamLastMiniblock(opts *bind.TransactOpts, streamId [32]byte, arg1 [32]byte, lastMiniblockHash [32]byte, lastMiniblockNum uint64, isSealed bool) (*types.Transaction, error) {
	return _MockRiverRegistry.contract.Transact(opts, "setStreamLastMiniblock", streamId, arg1, lastMiniblockHash, lastMiniblockNum, isSealed)
}

// SetStreamLastMiniblock is a paid mutator transaction binding the contract method 0xd7a3158a.
//
// Solidity: function setStreamLastMiniblock(bytes32 streamId, bytes32 , bytes32 lastMiniblockHash, uint64 lastMiniblockNum, bool isSealed) returns()
func (_MockRiverRegistry *MockRiverRegistrySession) SetStreamLastMiniblock(streamId [32]byte, arg1 [32]byte, lastMiniblockHash [32]byte, lastMiniblockNum uint64, isSealed bool) (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.SetStreamLastMiniblock(&_MockRiverRegistry.TransactOpts, streamId, arg1, lastMiniblockHash, lastMiniblockNum, isSealed)
}

// SetStreamLastMiniblock is a paid mutator transaction binding the contract method 0xd7a3158a.
//
// Solidity: function setStreamLastMiniblock(bytes32 streamId, bytes32 , bytes32 lastMiniblockHash, uint64 lastMiniblockNum, bool isSealed) returns()
func (_MockRiverRegistry *MockRiverRegistryTransactorSession) SetStreamLastMiniblock(streamId [32]byte, arg1 [32]byte, lastMiniblockHash [32]byte, lastMiniblockNum uint64, isSealed bool) (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.SetStreamLastMiniblock(&_MockRiverRegistry.TransactOpts, streamId, arg1, lastMiniblockHash, lastMiniblockNum, isSealed)
}

// SetStreamLastMiniblockBatch is a paid mutator transaction binding the contract method 0xff3a14ab.
//
// Solidity: function setStreamLastMiniblockBatch((bytes32,bytes32,bytes32,uint64,bool)[] miniblocks) returns()
func (_MockRiverRegistry *MockRiverRegistryTransactor) SetStreamLastMiniblockBatch(opts *bind.TransactOpts, miniblocks []SetMiniblock) (*types.Transaction, error) {
	return _MockRiverRegistry.contract.Transact(opts, "setStreamLastMiniblockBatch", miniblocks)
}

// SetStreamLastMiniblockBatch is a paid mutator transaction binding the contract method 0xff3a14ab.
//
// Solidity: function setStreamLastMiniblockBatch((bytes32,bytes32,bytes32,uint64,bool)[] miniblocks) returns()
func (_MockRiverRegistry *MockRiverRegistrySession) SetStreamLastMiniblockBatch(miniblocks []SetMiniblock) (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.SetStreamLastMiniblockBatch(&_MockRiverRegistry.TransactOpts, miniblocks)
}

// SetStreamLastMiniblockBatch is a paid mutator transaction binding the contract method 0xff3a14ab.
//
// Solidity: function setStreamLastMiniblockBatch((bytes32,bytes32,bytes32,uint64,bool)[] miniblocks) returns()
func (_MockRiverRegistry *MockRiverRegistryTransactorSession) SetStreamLastMiniblockBatch(miniblocks []SetMiniblock) (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.SetStreamLastMiniblockBatch(&_MockRiverRegistry.TransactOpts, miniblocks)
}

// UpdateNodeStatus is a paid mutator transaction binding the contract method 0x581f8b9b.
//
// Solidity: function updateNodeStatus(address nodeAddress, uint8 status) returns()
func (_MockRiverRegistry *MockRiverRegistryTransactor) UpdateNodeStatus(opts *bind.TransactOpts, nodeAddress common.Address, status uint8) (*types.Transaction, error) {
	return _MockRiverRegistry.contract.Transact(opts, "updateNodeStatus", nodeAddress, status)
}

// UpdateNodeStatus is a paid mutator transaction binding the contract method 0x581f8b9b.
//
// Solidity: function updateNodeStatus(address nodeAddress, uint8 status) returns()
func (_MockRiverRegistry *MockRiverRegistrySession) UpdateNodeStatus(nodeAddress common.Address, status uint8) (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.UpdateNodeStatus(&_MockRiverRegistry.TransactOpts, nodeAddress, status)
}

// UpdateNodeStatus is a paid mutator transaction binding the contract method 0x581f8b9b.
//
// Solidity: function updateNodeStatus(address nodeAddress, uint8 status) returns()
func (_MockRiverRegistry *MockRiverRegistryTransactorSession) UpdateNodeStatus(nodeAddress common.Address, status uint8) (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.UpdateNodeStatus(&_MockRiverRegistry.TransactOpts, nodeAddress, status)
}

// UpdateNodeUrl is a paid mutator transaction binding the contract method 0x7e4465e7.
//
// Solidity: function updateNodeUrl(address nodeAddress, string url) returns()
func (_MockRiverRegistry *MockRiverRegistryTransactor) UpdateNodeUrl(opts *bind.TransactOpts, nodeAddress common.Address, url string) (*types.Transaction, error) {
	return _MockRiverRegistry.contract.Transact(opts, "updateNodeUrl", nodeAddress, url)
}

// UpdateNodeUrl is a paid mutator transaction binding the contract method 0x7e4465e7.
//
// Solidity: function updateNodeUrl(address nodeAddress, string url) returns()
func (_MockRiverRegistry *MockRiverRegistrySession) UpdateNodeUrl(nodeAddress common.Address, url string) (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.UpdateNodeUrl(&_MockRiverRegistry.TransactOpts, nodeAddress, url)
}

// UpdateNodeUrl is a paid mutator transaction binding the contract method 0x7e4465e7.
//
// Solidity: function updateNodeUrl(address nodeAddress, string url) returns()
func (_MockRiverRegistry *MockRiverRegistryTransactorSession) UpdateNodeUrl(nodeAddress common.Address, url string) (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.UpdateNodeUrl(&_MockRiverRegistry.TransactOpts, nodeAddress, url)
}

// MockRiverRegistryConfigurationChangedIterator is returned from FilterConfigurationChanged and is used to iterate over the raw logs and unpacked data for ConfigurationChanged events raised by the MockRiverRegistry contract.
type MockRiverRegistryConfigurationChangedIterator struct {
	Event *MockRiverRegistryConfigurationChanged // Event containing the contract specifics and raw log

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
func (it *MockRiverRegistryConfigurationChangedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockRiverRegistryConfigurationChanged)
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
		it.Event = new(MockRiverRegistryConfigurationChanged)
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
func (it *MockRiverRegistryConfigurationChangedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockRiverRegistryConfigurationChangedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockRiverRegistryConfigurationChanged represents a ConfigurationChanged event raised by the MockRiverRegistry contract.
type MockRiverRegistryConfigurationChanged struct {
	Key     [32]byte
	Block   uint64
	Value   []byte
	Deleted bool
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterConfigurationChanged is a free log retrieval operation binding the contract event 0xc01483261a841a868b99cb8802faed4ea44a1a816651c4f7ee061a96a205fe98.
//
// Solidity: event ConfigurationChanged(bytes32 key, uint64 block, bytes value, bool deleted)
func (_MockRiverRegistry *MockRiverRegistryFilterer) FilterConfigurationChanged(opts *bind.FilterOpts) (*MockRiverRegistryConfigurationChangedIterator, error) {

	logs, sub, err := _MockRiverRegistry.contract.FilterLogs(opts, "ConfigurationChanged")
	if err != nil {
		return nil, err
	}
	return &MockRiverRegistryConfigurationChangedIterator{contract: _MockRiverRegistry.contract, event: "ConfigurationChanged", logs: logs, sub: sub}, nil
}

// WatchConfigurationChanged is a free log subscription operation binding the contract event 0xc01483261a841a868b99cb8802faed4ea44a1a816651c4f7ee061a96a205fe98.
//
// Solidity: event ConfigurationChanged(bytes32 key, uint64 block, bytes value, bool deleted)
func (_MockRiverRegistry *MockRiverRegistryFilterer) WatchConfigurationChanged(opts *bind.WatchOpts, sink chan<- *MockRiverRegistryConfigurationChanged) (event.Subscription, error) {

	logs, sub, err := _MockRiverRegistry.contract.WatchLogs(opts, "ConfigurationChanged")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockRiverRegistryConfigurationChanged)
				if err := _MockRiverRegistry.contract.UnpackLog(event, "ConfigurationChanged", log); err != nil {
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

// ParseConfigurationChanged is a log parse operation binding the contract event 0xc01483261a841a868b99cb8802faed4ea44a1a816651c4f7ee061a96a205fe98.
//
// Solidity: event ConfigurationChanged(bytes32 key, uint64 block, bytes value, bool deleted)
func (_MockRiverRegistry *MockRiverRegistryFilterer) ParseConfigurationChanged(log types.Log) (*MockRiverRegistryConfigurationChanged, error) {
	event := new(MockRiverRegistryConfigurationChanged)
	if err := _MockRiverRegistry.contract.UnpackLog(event, "ConfigurationChanged", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockRiverRegistryConfigurationManagerAddedIterator is returned from FilterConfigurationManagerAdded and is used to iterate over the raw logs and unpacked data for ConfigurationManagerAdded events raised by the MockRiverRegistry contract.
type MockRiverRegistryConfigurationManagerAddedIterator struct {
	Event *MockRiverRegistryConfigurationManagerAdded // Event containing the contract specifics and raw log

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
func (it *MockRiverRegistryConfigurationManagerAddedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockRiverRegistryConfigurationManagerAdded)
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
		it.Event = new(MockRiverRegistryConfigurationManagerAdded)
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
func (it *MockRiverRegistryConfigurationManagerAddedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockRiverRegistryConfigurationManagerAddedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockRiverRegistryConfigurationManagerAdded represents a ConfigurationManagerAdded event raised by the MockRiverRegistry contract.
type MockRiverRegistryConfigurationManagerAdded struct {
	Manager common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterConfigurationManagerAdded is a free log retrieval operation binding the contract event 0x7afd798379ae2d2e5035438544cea2b60eb1dde6a8128e6d447fd2a25f8825a2.
//
// Solidity: event ConfigurationManagerAdded(address indexed manager)
func (_MockRiverRegistry *MockRiverRegistryFilterer) FilterConfigurationManagerAdded(opts *bind.FilterOpts, manager []common.Address) (*MockRiverRegistryConfigurationManagerAddedIterator, error) {

	var managerRule []interface{}
	for _, managerItem := range manager {
		managerRule = append(managerRule, managerItem)
	}

	logs, sub, err := _MockRiverRegistry.contract.FilterLogs(opts, "ConfigurationManagerAdded", managerRule)
	if err != nil {
		return nil, err
	}
	return &MockRiverRegistryConfigurationManagerAddedIterator{contract: _MockRiverRegistry.contract, event: "ConfigurationManagerAdded", logs: logs, sub: sub}, nil
}

// WatchConfigurationManagerAdded is a free log subscription operation binding the contract event 0x7afd798379ae2d2e5035438544cea2b60eb1dde6a8128e6d447fd2a25f8825a2.
//
// Solidity: event ConfigurationManagerAdded(address indexed manager)
func (_MockRiverRegistry *MockRiverRegistryFilterer) WatchConfigurationManagerAdded(opts *bind.WatchOpts, sink chan<- *MockRiverRegistryConfigurationManagerAdded, manager []common.Address) (event.Subscription, error) {

	var managerRule []interface{}
	for _, managerItem := range manager {
		managerRule = append(managerRule, managerItem)
	}

	logs, sub, err := _MockRiverRegistry.contract.WatchLogs(opts, "ConfigurationManagerAdded", managerRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockRiverRegistryConfigurationManagerAdded)
				if err := _MockRiverRegistry.contract.UnpackLog(event, "ConfigurationManagerAdded", log); err != nil {
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

// ParseConfigurationManagerAdded is a log parse operation binding the contract event 0x7afd798379ae2d2e5035438544cea2b60eb1dde6a8128e6d447fd2a25f8825a2.
//
// Solidity: event ConfigurationManagerAdded(address indexed manager)
func (_MockRiverRegistry *MockRiverRegistryFilterer) ParseConfigurationManagerAdded(log types.Log) (*MockRiverRegistryConfigurationManagerAdded, error) {
	event := new(MockRiverRegistryConfigurationManagerAdded)
	if err := _MockRiverRegistry.contract.UnpackLog(event, "ConfigurationManagerAdded", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockRiverRegistryConfigurationManagerRemovedIterator is returned from FilterConfigurationManagerRemoved and is used to iterate over the raw logs and unpacked data for ConfigurationManagerRemoved events raised by the MockRiverRegistry contract.
type MockRiverRegistryConfigurationManagerRemovedIterator struct {
	Event *MockRiverRegistryConfigurationManagerRemoved // Event containing the contract specifics and raw log

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
func (it *MockRiverRegistryConfigurationManagerRemovedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockRiverRegistryConfigurationManagerRemoved)
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
		it.Event = new(MockRiverRegistryConfigurationManagerRemoved)
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
func (it *MockRiverRegistryConfigurationManagerRemovedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockRiverRegistryConfigurationManagerRemovedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockRiverRegistryConfigurationManagerRemoved represents a ConfigurationManagerRemoved event raised by the MockRiverRegistry contract.
type MockRiverRegistryConfigurationManagerRemoved struct {
	Manager common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterConfigurationManagerRemoved is a free log retrieval operation binding the contract event 0xf9889c857e5356066b564327caa757c325ecbc001b2b47d72edf8cf9aedb1be5.
//
// Solidity: event ConfigurationManagerRemoved(address indexed manager)
func (_MockRiverRegistry *MockRiverRegistryFilterer) FilterConfigurationManagerRemoved(opts *bind.FilterOpts, manager []common.Address) (*MockRiverRegistryConfigurationManagerRemovedIterator, error) {

	var managerRule []interface{}
	for _, managerItem := range manager {
		managerRule = append(managerRule, managerItem)
	}

	logs, sub, err := _MockRiverRegistry.contract.FilterLogs(opts, "ConfigurationManagerRemoved", managerRule)
	if err != nil {
		return nil, err
	}
	return &MockRiverRegistryConfigurationManagerRemovedIterator{contract: _MockRiverRegistry.contract, event: "ConfigurationManagerRemoved", logs: logs, sub: sub}, nil
}

// WatchConfigurationManagerRemoved is a free log subscription operation binding the contract event 0xf9889c857e5356066b564327caa757c325ecbc001b2b47d72edf8cf9aedb1be5.
//
// Solidity: event ConfigurationManagerRemoved(address indexed manager)
func (_MockRiverRegistry *MockRiverRegistryFilterer) WatchConfigurationManagerRemoved(opts *bind.WatchOpts, sink chan<- *MockRiverRegistryConfigurationManagerRemoved, manager []common.Address) (event.Subscription, error) {

	var managerRule []interface{}
	for _, managerItem := range manager {
		managerRule = append(managerRule, managerItem)
	}

	logs, sub, err := _MockRiverRegistry.contract.WatchLogs(opts, "ConfigurationManagerRemoved", managerRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockRiverRegistryConfigurationManagerRemoved)
				if err := _MockRiverRegistry.contract.UnpackLog(event, "ConfigurationManagerRemoved", log); err != nil {
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

// ParseConfigurationManagerRemoved is a log parse operation binding the contract event 0xf9889c857e5356066b564327caa757c325ecbc001b2b47d72edf8cf9aedb1be5.
//
// Solidity: event ConfigurationManagerRemoved(address indexed manager)
func (_MockRiverRegistry *MockRiverRegistryFilterer) ParseConfigurationManagerRemoved(log types.Log) (*MockRiverRegistryConfigurationManagerRemoved, error) {
	event := new(MockRiverRegistryConfigurationManagerRemoved)
	if err := _MockRiverRegistry.contract.UnpackLog(event, "ConfigurationManagerRemoved", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockRiverRegistryInitializedIterator is returned from FilterInitialized and is used to iterate over the raw logs and unpacked data for Initialized events raised by the MockRiverRegistry contract.
type MockRiverRegistryInitializedIterator struct {
	Event *MockRiverRegistryInitialized // Event containing the contract specifics and raw log

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
func (it *MockRiverRegistryInitializedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockRiverRegistryInitialized)
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
		it.Event = new(MockRiverRegistryInitialized)
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
func (it *MockRiverRegistryInitializedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockRiverRegistryInitializedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockRiverRegistryInitialized represents a Initialized event raised by the MockRiverRegistry contract.
type MockRiverRegistryInitialized struct {
	Version uint32
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterInitialized is a free log retrieval operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_MockRiverRegistry *MockRiverRegistryFilterer) FilterInitialized(opts *bind.FilterOpts) (*MockRiverRegistryInitializedIterator, error) {

	logs, sub, err := _MockRiverRegistry.contract.FilterLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return &MockRiverRegistryInitializedIterator{contract: _MockRiverRegistry.contract, event: "Initialized", logs: logs, sub: sub}, nil
}

// WatchInitialized is a free log subscription operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_MockRiverRegistry *MockRiverRegistryFilterer) WatchInitialized(opts *bind.WatchOpts, sink chan<- *MockRiverRegistryInitialized) (event.Subscription, error) {

	logs, sub, err := _MockRiverRegistry.contract.WatchLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockRiverRegistryInitialized)
				if err := _MockRiverRegistry.contract.UnpackLog(event, "Initialized", log); err != nil {
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
func (_MockRiverRegistry *MockRiverRegistryFilterer) ParseInitialized(log types.Log) (*MockRiverRegistryInitialized, error) {
	event := new(MockRiverRegistryInitialized)
	if err := _MockRiverRegistry.contract.UnpackLog(event, "Initialized", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockRiverRegistryInterfaceAddedIterator is returned from FilterInterfaceAdded and is used to iterate over the raw logs and unpacked data for InterfaceAdded events raised by the MockRiverRegistry contract.
type MockRiverRegistryInterfaceAddedIterator struct {
	Event *MockRiverRegistryInterfaceAdded // Event containing the contract specifics and raw log

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
func (it *MockRiverRegistryInterfaceAddedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockRiverRegistryInterfaceAdded)
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
		it.Event = new(MockRiverRegistryInterfaceAdded)
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
func (it *MockRiverRegistryInterfaceAddedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockRiverRegistryInterfaceAddedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockRiverRegistryInterfaceAdded represents a InterfaceAdded event raised by the MockRiverRegistry contract.
type MockRiverRegistryInterfaceAdded struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceAdded is a free log retrieval operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_MockRiverRegistry *MockRiverRegistryFilterer) FilterInterfaceAdded(opts *bind.FilterOpts, interfaceId [][4]byte) (*MockRiverRegistryInterfaceAddedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _MockRiverRegistry.contract.FilterLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &MockRiverRegistryInterfaceAddedIterator{contract: _MockRiverRegistry.contract, event: "InterfaceAdded", logs: logs, sub: sub}, nil
}

// WatchInterfaceAdded is a free log subscription operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_MockRiverRegistry *MockRiverRegistryFilterer) WatchInterfaceAdded(opts *bind.WatchOpts, sink chan<- *MockRiverRegistryInterfaceAdded, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _MockRiverRegistry.contract.WatchLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockRiverRegistryInterfaceAdded)
				if err := _MockRiverRegistry.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
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
func (_MockRiverRegistry *MockRiverRegistryFilterer) ParseInterfaceAdded(log types.Log) (*MockRiverRegistryInterfaceAdded, error) {
	event := new(MockRiverRegistryInterfaceAdded)
	if err := _MockRiverRegistry.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockRiverRegistryInterfaceRemovedIterator is returned from FilterInterfaceRemoved and is used to iterate over the raw logs and unpacked data for InterfaceRemoved events raised by the MockRiverRegistry contract.
type MockRiverRegistryInterfaceRemovedIterator struct {
	Event *MockRiverRegistryInterfaceRemoved // Event containing the contract specifics and raw log

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
func (it *MockRiverRegistryInterfaceRemovedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockRiverRegistryInterfaceRemoved)
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
		it.Event = new(MockRiverRegistryInterfaceRemoved)
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
func (it *MockRiverRegistryInterfaceRemovedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockRiverRegistryInterfaceRemovedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockRiverRegistryInterfaceRemoved represents a InterfaceRemoved event raised by the MockRiverRegistry contract.
type MockRiverRegistryInterfaceRemoved struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceRemoved is a free log retrieval operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_MockRiverRegistry *MockRiverRegistryFilterer) FilterInterfaceRemoved(opts *bind.FilterOpts, interfaceId [][4]byte) (*MockRiverRegistryInterfaceRemovedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _MockRiverRegistry.contract.FilterLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &MockRiverRegistryInterfaceRemovedIterator{contract: _MockRiverRegistry.contract, event: "InterfaceRemoved", logs: logs, sub: sub}, nil
}

// WatchInterfaceRemoved is a free log subscription operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_MockRiverRegistry *MockRiverRegistryFilterer) WatchInterfaceRemoved(opts *bind.WatchOpts, sink chan<- *MockRiverRegistryInterfaceRemoved, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _MockRiverRegistry.contract.WatchLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockRiverRegistryInterfaceRemoved)
				if err := _MockRiverRegistry.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
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
func (_MockRiverRegistry *MockRiverRegistryFilterer) ParseInterfaceRemoved(log types.Log) (*MockRiverRegistryInterfaceRemoved, error) {
	event := new(MockRiverRegistryInterfaceRemoved)
	if err := _MockRiverRegistry.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockRiverRegistryNodeAddedIterator is returned from FilterNodeAdded and is used to iterate over the raw logs and unpacked data for NodeAdded events raised by the MockRiverRegistry contract.
type MockRiverRegistryNodeAddedIterator struct {
	Event *MockRiverRegistryNodeAdded // Event containing the contract specifics and raw log

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
func (it *MockRiverRegistryNodeAddedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockRiverRegistryNodeAdded)
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
		it.Event = new(MockRiverRegistryNodeAdded)
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
func (it *MockRiverRegistryNodeAddedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockRiverRegistryNodeAddedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockRiverRegistryNodeAdded represents a NodeAdded event raised by the MockRiverRegistry contract.
type MockRiverRegistryNodeAdded struct {
	NodeAddress common.Address
	Operator    common.Address
	Url         string
	Status      uint8
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterNodeAdded is a free log retrieval operation binding the contract event 0x759154d15a6aec80ceab7bc8820f46ebc53ad68bb18f47afb77483fea9dcc9ff.
//
// Solidity: event NodeAdded(address indexed nodeAddress, address indexed operator, string url, uint8 status)
func (_MockRiverRegistry *MockRiverRegistryFilterer) FilterNodeAdded(opts *bind.FilterOpts, nodeAddress []common.Address, operator []common.Address) (*MockRiverRegistryNodeAddedIterator, error) {

	var nodeAddressRule []interface{}
	for _, nodeAddressItem := range nodeAddress {
		nodeAddressRule = append(nodeAddressRule, nodeAddressItem)
	}
	var operatorRule []interface{}
	for _, operatorItem := range operator {
		operatorRule = append(operatorRule, operatorItem)
	}

	logs, sub, err := _MockRiverRegistry.contract.FilterLogs(opts, "NodeAdded", nodeAddressRule, operatorRule)
	if err != nil {
		return nil, err
	}
	return &MockRiverRegistryNodeAddedIterator{contract: _MockRiverRegistry.contract, event: "NodeAdded", logs: logs, sub: sub}, nil
}

// WatchNodeAdded is a free log subscription operation binding the contract event 0x759154d15a6aec80ceab7bc8820f46ebc53ad68bb18f47afb77483fea9dcc9ff.
//
// Solidity: event NodeAdded(address indexed nodeAddress, address indexed operator, string url, uint8 status)
func (_MockRiverRegistry *MockRiverRegistryFilterer) WatchNodeAdded(opts *bind.WatchOpts, sink chan<- *MockRiverRegistryNodeAdded, nodeAddress []common.Address, operator []common.Address) (event.Subscription, error) {

	var nodeAddressRule []interface{}
	for _, nodeAddressItem := range nodeAddress {
		nodeAddressRule = append(nodeAddressRule, nodeAddressItem)
	}
	var operatorRule []interface{}
	for _, operatorItem := range operator {
		operatorRule = append(operatorRule, operatorItem)
	}

	logs, sub, err := _MockRiverRegistry.contract.WatchLogs(opts, "NodeAdded", nodeAddressRule, operatorRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockRiverRegistryNodeAdded)
				if err := _MockRiverRegistry.contract.UnpackLog(event, "NodeAdded", log); err != nil {
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

// ParseNodeAdded is a log parse operation binding the contract event 0x759154d15a6aec80ceab7bc8820f46ebc53ad68bb18f47afb77483fea9dcc9ff.
//
// Solidity: event NodeAdded(address indexed nodeAddress, address indexed operator, string url, uint8 status)
func (_MockRiverRegistry *MockRiverRegistryFilterer) ParseNodeAdded(log types.Log) (*MockRiverRegistryNodeAdded, error) {
	event := new(MockRiverRegistryNodeAdded)
	if err := _MockRiverRegistry.contract.UnpackLog(event, "NodeAdded", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockRiverRegistryNodeRemovedIterator is returned from FilterNodeRemoved and is used to iterate over the raw logs and unpacked data for NodeRemoved events raised by the MockRiverRegistry contract.
type MockRiverRegistryNodeRemovedIterator struct {
	Event *MockRiverRegistryNodeRemoved // Event containing the contract specifics and raw log

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
func (it *MockRiverRegistryNodeRemovedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockRiverRegistryNodeRemoved)
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
		it.Event = new(MockRiverRegistryNodeRemoved)
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
func (it *MockRiverRegistryNodeRemovedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockRiverRegistryNodeRemovedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockRiverRegistryNodeRemoved represents a NodeRemoved event raised by the MockRiverRegistry contract.
type MockRiverRegistryNodeRemoved struct {
	NodeAddress common.Address
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterNodeRemoved is a free log retrieval operation binding the contract event 0xcfc24166db4bb677e857cacabd1541fb2b30645021b27c5130419589b84db52b.
//
// Solidity: event NodeRemoved(address indexed nodeAddress)
func (_MockRiverRegistry *MockRiverRegistryFilterer) FilterNodeRemoved(opts *bind.FilterOpts, nodeAddress []common.Address) (*MockRiverRegistryNodeRemovedIterator, error) {

	var nodeAddressRule []interface{}
	for _, nodeAddressItem := range nodeAddress {
		nodeAddressRule = append(nodeAddressRule, nodeAddressItem)
	}

	logs, sub, err := _MockRiverRegistry.contract.FilterLogs(opts, "NodeRemoved", nodeAddressRule)
	if err != nil {
		return nil, err
	}
	return &MockRiverRegistryNodeRemovedIterator{contract: _MockRiverRegistry.contract, event: "NodeRemoved", logs: logs, sub: sub}, nil
}

// WatchNodeRemoved is a free log subscription operation binding the contract event 0xcfc24166db4bb677e857cacabd1541fb2b30645021b27c5130419589b84db52b.
//
// Solidity: event NodeRemoved(address indexed nodeAddress)
func (_MockRiverRegistry *MockRiverRegistryFilterer) WatchNodeRemoved(opts *bind.WatchOpts, sink chan<- *MockRiverRegistryNodeRemoved, nodeAddress []common.Address) (event.Subscription, error) {

	var nodeAddressRule []interface{}
	for _, nodeAddressItem := range nodeAddress {
		nodeAddressRule = append(nodeAddressRule, nodeAddressItem)
	}

	logs, sub, err := _MockRiverRegistry.contract.WatchLogs(opts, "NodeRemoved", nodeAddressRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockRiverRegistryNodeRemoved)
				if err := _MockRiverRegistry.contract.UnpackLog(event, "NodeRemoved", log); err != nil {
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

// ParseNodeRemoved is a log parse operation binding the contract event 0xcfc24166db4bb677e857cacabd1541fb2b30645021b27c5130419589b84db52b.
//
// Solidity: event NodeRemoved(address indexed nodeAddress)
func (_MockRiverRegistry *MockRiverRegistryFilterer) ParseNodeRemoved(log types.Log) (*MockRiverRegistryNodeRemoved, error) {
	event := new(MockRiverRegistryNodeRemoved)
	if err := _MockRiverRegistry.contract.UnpackLog(event, "NodeRemoved", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockRiverRegistryNodeStatusUpdatedIterator is returned from FilterNodeStatusUpdated and is used to iterate over the raw logs and unpacked data for NodeStatusUpdated events raised by the MockRiverRegistry contract.
type MockRiverRegistryNodeStatusUpdatedIterator struct {
	Event *MockRiverRegistryNodeStatusUpdated // Event containing the contract specifics and raw log

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
func (it *MockRiverRegistryNodeStatusUpdatedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockRiverRegistryNodeStatusUpdated)
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
		it.Event = new(MockRiverRegistryNodeStatusUpdated)
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
func (it *MockRiverRegistryNodeStatusUpdatedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockRiverRegistryNodeStatusUpdatedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockRiverRegistryNodeStatusUpdated represents a NodeStatusUpdated event raised by the MockRiverRegistry contract.
type MockRiverRegistryNodeStatusUpdated struct {
	NodeAddress common.Address
	Status      uint8
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterNodeStatusUpdated is a free log retrieval operation binding the contract event 0x20891cc7622c7951cbd8c70c61a5201eb45625b8c00e8f6c986cfca78f3dbfa0.
//
// Solidity: event NodeStatusUpdated(address indexed nodeAddress, uint8 status)
func (_MockRiverRegistry *MockRiverRegistryFilterer) FilterNodeStatusUpdated(opts *bind.FilterOpts, nodeAddress []common.Address) (*MockRiverRegistryNodeStatusUpdatedIterator, error) {

	var nodeAddressRule []interface{}
	for _, nodeAddressItem := range nodeAddress {
		nodeAddressRule = append(nodeAddressRule, nodeAddressItem)
	}

	logs, sub, err := _MockRiverRegistry.contract.FilterLogs(opts, "NodeStatusUpdated", nodeAddressRule)
	if err != nil {
		return nil, err
	}
	return &MockRiverRegistryNodeStatusUpdatedIterator{contract: _MockRiverRegistry.contract, event: "NodeStatusUpdated", logs: logs, sub: sub}, nil
}

// WatchNodeStatusUpdated is a free log subscription operation binding the contract event 0x20891cc7622c7951cbd8c70c61a5201eb45625b8c00e8f6c986cfca78f3dbfa0.
//
// Solidity: event NodeStatusUpdated(address indexed nodeAddress, uint8 status)
func (_MockRiverRegistry *MockRiverRegistryFilterer) WatchNodeStatusUpdated(opts *bind.WatchOpts, sink chan<- *MockRiverRegistryNodeStatusUpdated, nodeAddress []common.Address) (event.Subscription, error) {

	var nodeAddressRule []interface{}
	for _, nodeAddressItem := range nodeAddress {
		nodeAddressRule = append(nodeAddressRule, nodeAddressItem)
	}

	logs, sub, err := _MockRiverRegistry.contract.WatchLogs(opts, "NodeStatusUpdated", nodeAddressRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockRiverRegistryNodeStatusUpdated)
				if err := _MockRiverRegistry.contract.UnpackLog(event, "NodeStatusUpdated", log); err != nil {
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

// ParseNodeStatusUpdated is a log parse operation binding the contract event 0x20891cc7622c7951cbd8c70c61a5201eb45625b8c00e8f6c986cfca78f3dbfa0.
//
// Solidity: event NodeStatusUpdated(address indexed nodeAddress, uint8 status)
func (_MockRiverRegistry *MockRiverRegistryFilterer) ParseNodeStatusUpdated(log types.Log) (*MockRiverRegistryNodeStatusUpdated, error) {
	event := new(MockRiverRegistryNodeStatusUpdated)
	if err := _MockRiverRegistry.contract.UnpackLog(event, "NodeStatusUpdated", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockRiverRegistryNodeUrlUpdatedIterator is returned from FilterNodeUrlUpdated and is used to iterate over the raw logs and unpacked data for NodeUrlUpdated events raised by the MockRiverRegistry contract.
type MockRiverRegistryNodeUrlUpdatedIterator struct {
	Event *MockRiverRegistryNodeUrlUpdated // Event containing the contract specifics and raw log

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
func (it *MockRiverRegistryNodeUrlUpdatedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockRiverRegistryNodeUrlUpdated)
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
		it.Event = new(MockRiverRegistryNodeUrlUpdated)
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
func (it *MockRiverRegistryNodeUrlUpdatedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockRiverRegistryNodeUrlUpdatedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockRiverRegistryNodeUrlUpdated represents a NodeUrlUpdated event raised by the MockRiverRegistry contract.
type MockRiverRegistryNodeUrlUpdated struct {
	NodeAddress common.Address
	Url         string
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterNodeUrlUpdated is a free log retrieval operation binding the contract event 0x4505168a8705a16fd4d0575197fd0f510db69df93a065e158ad2c0957ba12bac.
//
// Solidity: event NodeUrlUpdated(address indexed nodeAddress, string url)
func (_MockRiverRegistry *MockRiverRegistryFilterer) FilterNodeUrlUpdated(opts *bind.FilterOpts, nodeAddress []common.Address) (*MockRiverRegistryNodeUrlUpdatedIterator, error) {

	var nodeAddressRule []interface{}
	for _, nodeAddressItem := range nodeAddress {
		nodeAddressRule = append(nodeAddressRule, nodeAddressItem)
	}

	logs, sub, err := _MockRiverRegistry.contract.FilterLogs(opts, "NodeUrlUpdated", nodeAddressRule)
	if err != nil {
		return nil, err
	}
	return &MockRiverRegistryNodeUrlUpdatedIterator{contract: _MockRiverRegistry.contract, event: "NodeUrlUpdated", logs: logs, sub: sub}, nil
}

// WatchNodeUrlUpdated is a free log subscription operation binding the contract event 0x4505168a8705a16fd4d0575197fd0f510db69df93a065e158ad2c0957ba12bac.
//
// Solidity: event NodeUrlUpdated(address indexed nodeAddress, string url)
func (_MockRiverRegistry *MockRiverRegistryFilterer) WatchNodeUrlUpdated(opts *bind.WatchOpts, sink chan<- *MockRiverRegistryNodeUrlUpdated, nodeAddress []common.Address) (event.Subscription, error) {

	var nodeAddressRule []interface{}
	for _, nodeAddressItem := range nodeAddress {
		nodeAddressRule = append(nodeAddressRule, nodeAddressItem)
	}

	logs, sub, err := _MockRiverRegistry.contract.WatchLogs(opts, "NodeUrlUpdated", nodeAddressRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockRiverRegistryNodeUrlUpdated)
				if err := _MockRiverRegistry.contract.UnpackLog(event, "NodeUrlUpdated", log); err != nil {
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

// ParseNodeUrlUpdated is a log parse operation binding the contract event 0x4505168a8705a16fd4d0575197fd0f510db69df93a065e158ad2c0957ba12bac.
//
// Solidity: event NodeUrlUpdated(address indexed nodeAddress, string url)
func (_MockRiverRegistry *MockRiverRegistryFilterer) ParseNodeUrlUpdated(log types.Log) (*MockRiverRegistryNodeUrlUpdated, error) {
	event := new(MockRiverRegistryNodeUrlUpdated)
	if err := _MockRiverRegistry.contract.UnpackLog(event, "NodeUrlUpdated", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockRiverRegistryOperatorAddedIterator is returned from FilterOperatorAdded and is used to iterate over the raw logs and unpacked data for OperatorAdded events raised by the MockRiverRegistry contract.
type MockRiverRegistryOperatorAddedIterator struct {
	Event *MockRiverRegistryOperatorAdded // Event containing the contract specifics and raw log

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
func (it *MockRiverRegistryOperatorAddedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockRiverRegistryOperatorAdded)
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
		it.Event = new(MockRiverRegistryOperatorAdded)
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
func (it *MockRiverRegistryOperatorAddedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockRiverRegistryOperatorAddedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockRiverRegistryOperatorAdded represents a OperatorAdded event raised by the MockRiverRegistry contract.
type MockRiverRegistryOperatorAdded struct {
	OperatorAddress common.Address
	Raw             types.Log // Blockchain specific contextual infos
}

// FilterOperatorAdded is a free log retrieval operation binding the contract event 0xac6fa858e9350a46cec16539926e0fde25b7629f84b5a72bffaae4df888ae86d.
//
// Solidity: event OperatorAdded(address indexed operatorAddress)
func (_MockRiverRegistry *MockRiverRegistryFilterer) FilterOperatorAdded(opts *bind.FilterOpts, operatorAddress []common.Address) (*MockRiverRegistryOperatorAddedIterator, error) {

	var operatorAddressRule []interface{}
	for _, operatorAddressItem := range operatorAddress {
		operatorAddressRule = append(operatorAddressRule, operatorAddressItem)
	}

	logs, sub, err := _MockRiverRegistry.contract.FilterLogs(opts, "OperatorAdded", operatorAddressRule)
	if err != nil {
		return nil, err
	}
	return &MockRiverRegistryOperatorAddedIterator{contract: _MockRiverRegistry.contract, event: "OperatorAdded", logs: logs, sub: sub}, nil
}

// WatchOperatorAdded is a free log subscription operation binding the contract event 0xac6fa858e9350a46cec16539926e0fde25b7629f84b5a72bffaae4df888ae86d.
//
// Solidity: event OperatorAdded(address indexed operatorAddress)
func (_MockRiverRegistry *MockRiverRegistryFilterer) WatchOperatorAdded(opts *bind.WatchOpts, sink chan<- *MockRiverRegistryOperatorAdded, operatorAddress []common.Address) (event.Subscription, error) {

	var operatorAddressRule []interface{}
	for _, operatorAddressItem := range operatorAddress {
		operatorAddressRule = append(operatorAddressRule, operatorAddressItem)
	}

	logs, sub, err := _MockRiverRegistry.contract.WatchLogs(opts, "OperatorAdded", operatorAddressRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockRiverRegistryOperatorAdded)
				if err := _MockRiverRegistry.contract.UnpackLog(event, "OperatorAdded", log); err != nil {
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

// ParseOperatorAdded is a log parse operation binding the contract event 0xac6fa858e9350a46cec16539926e0fde25b7629f84b5a72bffaae4df888ae86d.
//
// Solidity: event OperatorAdded(address indexed operatorAddress)
func (_MockRiverRegistry *MockRiverRegistryFilterer) ParseOperatorAdded(log types.Log) (*MockRiverRegistryOperatorAdded, error) {
	event := new(MockRiverRegistryOperatorAdded)
	if err := _MockRiverRegistry.contract.UnpackLog(event, "OperatorAdded", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockRiverRegistryOperatorRemovedIterator is returned from FilterOperatorRemoved and is used to iterate over the raw logs and unpacked data for OperatorRemoved events raised by the MockRiverRegistry contract.
type MockRiverRegistryOperatorRemovedIterator struct {
	Event *MockRiverRegistryOperatorRemoved // Event containing the contract specifics and raw log

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
func (it *MockRiverRegistryOperatorRemovedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockRiverRegistryOperatorRemoved)
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
		it.Event = new(MockRiverRegistryOperatorRemoved)
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
func (it *MockRiverRegistryOperatorRemovedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockRiverRegistryOperatorRemovedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockRiverRegistryOperatorRemoved represents a OperatorRemoved event raised by the MockRiverRegistry contract.
type MockRiverRegistryOperatorRemoved struct {
	OperatorAddress common.Address
	Raw             types.Log // Blockchain specific contextual infos
}

// FilterOperatorRemoved is a free log retrieval operation binding the contract event 0x80c0b871b97b595b16a7741c1b06fed0c6f6f558639f18ccbce50724325dc40d.
//
// Solidity: event OperatorRemoved(address indexed operatorAddress)
func (_MockRiverRegistry *MockRiverRegistryFilterer) FilterOperatorRemoved(opts *bind.FilterOpts, operatorAddress []common.Address) (*MockRiverRegistryOperatorRemovedIterator, error) {

	var operatorAddressRule []interface{}
	for _, operatorAddressItem := range operatorAddress {
		operatorAddressRule = append(operatorAddressRule, operatorAddressItem)
	}

	logs, sub, err := _MockRiverRegistry.contract.FilterLogs(opts, "OperatorRemoved", operatorAddressRule)
	if err != nil {
		return nil, err
	}
	return &MockRiverRegistryOperatorRemovedIterator{contract: _MockRiverRegistry.contract, event: "OperatorRemoved", logs: logs, sub: sub}, nil
}

// WatchOperatorRemoved is a free log subscription operation binding the contract event 0x80c0b871b97b595b16a7741c1b06fed0c6f6f558639f18ccbce50724325dc40d.
//
// Solidity: event OperatorRemoved(address indexed operatorAddress)
func (_MockRiverRegistry *MockRiverRegistryFilterer) WatchOperatorRemoved(opts *bind.WatchOpts, sink chan<- *MockRiverRegistryOperatorRemoved, operatorAddress []common.Address) (event.Subscription, error) {

	var operatorAddressRule []interface{}
	for _, operatorAddressItem := range operatorAddress {
		operatorAddressRule = append(operatorAddressRule, operatorAddressItem)
	}

	logs, sub, err := _MockRiverRegistry.contract.WatchLogs(opts, "OperatorRemoved", operatorAddressRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockRiverRegistryOperatorRemoved)
				if err := _MockRiverRegistry.contract.UnpackLog(event, "OperatorRemoved", log); err != nil {
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

// ParseOperatorRemoved is a log parse operation binding the contract event 0x80c0b871b97b595b16a7741c1b06fed0c6f6f558639f18ccbce50724325dc40d.
//
// Solidity: event OperatorRemoved(address indexed operatorAddress)
func (_MockRiverRegistry *MockRiverRegistryFilterer) ParseOperatorRemoved(log types.Log) (*MockRiverRegistryOperatorRemoved, error) {
	event := new(MockRiverRegistryOperatorRemoved)
	if err := _MockRiverRegistry.contract.UnpackLog(event, "OperatorRemoved", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockRiverRegistryOwnershipTransferredIterator is returned from FilterOwnershipTransferred and is used to iterate over the raw logs and unpacked data for OwnershipTransferred events raised by the MockRiverRegistry contract.
type MockRiverRegistryOwnershipTransferredIterator struct {
	Event *MockRiverRegistryOwnershipTransferred // Event containing the contract specifics and raw log

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
func (it *MockRiverRegistryOwnershipTransferredIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockRiverRegistryOwnershipTransferred)
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
		it.Event = new(MockRiverRegistryOwnershipTransferred)
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
func (it *MockRiverRegistryOwnershipTransferredIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockRiverRegistryOwnershipTransferredIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockRiverRegistryOwnershipTransferred represents a OwnershipTransferred event raised by the MockRiverRegistry contract.
type MockRiverRegistryOwnershipTransferred struct {
	PreviousOwner common.Address
	NewOwner      common.Address
	Raw           types.Log // Blockchain specific contextual infos
}

// FilterOwnershipTransferred is a free log retrieval operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_MockRiverRegistry *MockRiverRegistryFilterer) FilterOwnershipTransferred(opts *bind.FilterOpts, previousOwner []common.Address, newOwner []common.Address) (*MockRiverRegistryOwnershipTransferredIterator, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _MockRiverRegistry.contract.FilterLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return &MockRiverRegistryOwnershipTransferredIterator{contract: _MockRiverRegistry.contract, event: "OwnershipTransferred", logs: logs, sub: sub}, nil
}

// WatchOwnershipTransferred is a free log subscription operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_MockRiverRegistry *MockRiverRegistryFilterer) WatchOwnershipTransferred(opts *bind.WatchOpts, sink chan<- *MockRiverRegistryOwnershipTransferred, previousOwner []common.Address, newOwner []common.Address) (event.Subscription, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _MockRiverRegistry.contract.WatchLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockRiverRegistryOwnershipTransferred)
				if err := _MockRiverRegistry.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
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

// ParseOwnershipTransferred is a log parse operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_MockRiverRegistry *MockRiverRegistryFilterer) ParseOwnershipTransferred(log types.Log) (*MockRiverRegistryOwnershipTransferred, error) {
	event := new(MockRiverRegistryOwnershipTransferred)
	if err := _MockRiverRegistry.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockRiverRegistryStreamAllocatedIterator is returned from FilterStreamAllocated and is used to iterate over the raw logs and unpacked data for StreamAllocated events raised by the MockRiverRegistry contract.
type MockRiverRegistryStreamAllocatedIterator struct {
	Event *MockRiverRegistryStreamAllocated // Event containing the contract specifics and raw log

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
func (it *MockRiverRegistryStreamAllocatedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockRiverRegistryStreamAllocated)
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
		it.Event = new(MockRiverRegistryStreamAllocated)
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
func (it *MockRiverRegistryStreamAllocatedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockRiverRegistryStreamAllocatedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockRiverRegistryStreamAllocated represents a StreamAllocated event raised by the MockRiverRegistry contract.
type MockRiverRegistryStreamAllocated struct {
	StreamId             [32]byte
	Nodes                []common.Address
	GenesisMiniblockHash [32]byte
	GenesisMiniblock     []byte
	Raw                  types.Log // Blockchain specific contextual infos
}

// FilterStreamAllocated is a free log retrieval operation binding the contract event 0x55ef7efc60ef99743e54209752c9a8e047e013917ec91572db75875069dd65bb.
//
// Solidity: event StreamAllocated(bytes32 streamId, address[] nodes, bytes32 genesisMiniblockHash, bytes genesisMiniblock)
func (_MockRiverRegistry *MockRiverRegistryFilterer) FilterStreamAllocated(opts *bind.FilterOpts) (*MockRiverRegistryStreamAllocatedIterator, error) {

	logs, sub, err := _MockRiverRegistry.contract.FilterLogs(opts, "StreamAllocated")
	if err != nil {
		return nil, err
	}
	return &MockRiverRegistryStreamAllocatedIterator{contract: _MockRiverRegistry.contract, event: "StreamAllocated", logs: logs, sub: sub}, nil
}

// WatchStreamAllocated is a free log subscription operation binding the contract event 0x55ef7efc60ef99743e54209752c9a8e047e013917ec91572db75875069dd65bb.
//
// Solidity: event StreamAllocated(bytes32 streamId, address[] nodes, bytes32 genesisMiniblockHash, bytes genesisMiniblock)
func (_MockRiverRegistry *MockRiverRegistryFilterer) WatchStreamAllocated(opts *bind.WatchOpts, sink chan<- *MockRiverRegistryStreamAllocated) (event.Subscription, error) {

	logs, sub, err := _MockRiverRegistry.contract.WatchLogs(opts, "StreamAllocated")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockRiverRegistryStreamAllocated)
				if err := _MockRiverRegistry.contract.UnpackLog(event, "StreamAllocated", log); err != nil {
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

// ParseStreamAllocated is a log parse operation binding the contract event 0x55ef7efc60ef99743e54209752c9a8e047e013917ec91572db75875069dd65bb.
//
// Solidity: event StreamAllocated(bytes32 streamId, address[] nodes, bytes32 genesisMiniblockHash, bytes genesisMiniblock)
func (_MockRiverRegistry *MockRiverRegistryFilterer) ParseStreamAllocated(log types.Log) (*MockRiverRegistryStreamAllocated, error) {
	event := new(MockRiverRegistryStreamAllocated)
	if err := _MockRiverRegistry.contract.UnpackLog(event, "StreamAllocated", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockRiverRegistryStreamLastMiniblockUpdateFailedIterator is returned from FilterStreamLastMiniblockUpdateFailed and is used to iterate over the raw logs and unpacked data for StreamLastMiniblockUpdateFailed events raised by the MockRiverRegistry contract.
type MockRiverRegistryStreamLastMiniblockUpdateFailedIterator struct {
	Event *MockRiverRegistryStreamLastMiniblockUpdateFailed // Event containing the contract specifics and raw log

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
func (it *MockRiverRegistryStreamLastMiniblockUpdateFailedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockRiverRegistryStreamLastMiniblockUpdateFailed)
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
		it.Event = new(MockRiverRegistryStreamLastMiniblockUpdateFailed)
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
func (it *MockRiverRegistryStreamLastMiniblockUpdateFailedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockRiverRegistryStreamLastMiniblockUpdateFailedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockRiverRegistryStreamLastMiniblockUpdateFailed represents a StreamLastMiniblockUpdateFailed event raised by the MockRiverRegistry contract.
type MockRiverRegistryStreamLastMiniblockUpdateFailed struct {
	StreamId          [32]byte
	LastMiniblockHash [32]byte
	LastMiniblockNum  uint64
	Reason            string
	Raw               types.Log // Blockchain specific contextual infos
}

// FilterStreamLastMiniblockUpdateFailed is a free log retrieval operation binding the contract event 0x75460fe319331413a18a82d99b07735cec53fa0c4061ada38c2141e331082afa.
//
// Solidity: event StreamLastMiniblockUpdateFailed(bytes32 streamId, bytes32 lastMiniblockHash, uint64 lastMiniblockNum, string reason)
func (_MockRiverRegistry *MockRiverRegistryFilterer) FilterStreamLastMiniblockUpdateFailed(opts *bind.FilterOpts) (*MockRiverRegistryStreamLastMiniblockUpdateFailedIterator, error) {

	logs, sub, err := _MockRiverRegistry.contract.FilterLogs(opts, "StreamLastMiniblockUpdateFailed")
	if err != nil {
		return nil, err
	}
	return &MockRiverRegistryStreamLastMiniblockUpdateFailedIterator{contract: _MockRiverRegistry.contract, event: "StreamLastMiniblockUpdateFailed", logs: logs, sub: sub}, nil
}

// WatchStreamLastMiniblockUpdateFailed is a free log subscription operation binding the contract event 0x75460fe319331413a18a82d99b07735cec53fa0c4061ada38c2141e331082afa.
//
// Solidity: event StreamLastMiniblockUpdateFailed(bytes32 streamId, bytes32 lastMiniblockHash, uint64 lastMiniblockNum, string reason)
func (_MockRiverRegistry *MockRiverRegistryFilterer) WatchStreamLastMiniblockUpdateFailed(opts *bind.WatchOpts, sink chan<- *MockRiverRegistryStreamLastMiniblockUpdateFailed) (event.Subscription, error) {

	logs, sub, err := _MockRiverRegistry.contract.WatchLogs(opts, "StreamLastMiniblockUpdateFailed")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockRiverRegistryStreamLastMiniblockUpdateFailed)
				if err := _MockRiverRegistry.contract.UnpackLog(event, "StreamLastMiniblockUpdateFailed", log); err != nil {
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

// ParseStreamLastMiniblockUpdateFailed is a log parse operation binding the contract event 0x75460fe319331413a18a82d99b07735cec53fa0c4061ada38c2141e331082afa.
//
// Solidity: event StreamLastMiniblockUpdateFailed(bytes32 streamId, bytes32 lastMiniblockHash, uint64 lastMiniblockNum, string reason)
func (_MockRiverRegistry *MockRiverRegistryFilterer) ParseStreamLastMiniblockUpdateFailed(log types.Log) (*MockRiverRegistryStreamLastMiniblockUpdateFailed, error) {
	event := new(MockRiverRegistryStreamLastMiniblockUpdateFailed)
	if err := _MockRiverRegistry.contract.UnpackLog(event, "StreamLastMiniblockUpdateFailed", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockRiverRegistryStreamLastMiniblockUpdatedIterator is returned from FilterStreamLastMiniblockUpdated and is used to iterate over the raw logs and unpacked data for StreamLastMiniblockUpdated events raised by the MockRiverRegistry contract.
type MockRiverRegistryStreamLastMiniblockUpdatedIterator struct {
	Event *MockRiverRegistryStreamLastMiniblockUpdated // Event containing the contract specifics and raw log

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
func (it *MockRiverRegistryStreamLastMiniblockUpdatedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockRiverRegistryStreamLastMiniblockUpdated)
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
		it.Event = new(MockRiverRegistryStreamLastMiniblockUpdated)
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
func (it *MockRiverRegistryStreamLastMiniblockUpdatedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockRiverRegistryStreamLastMiniblockUpdatedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockRiverRegistryStreamLastMiniblockUpdated represents a StreamLastMiniblockUpdated event raised by the MockRiverRegistry contract.
type MockRiverRegistryStreamLastMiniblockUpdated struct {
	StreamId          [32]byte
	LastMiniblockHash [32]byte
	LastMiniblockNum  uint64
	IsSealed          bool
	Raw               types.Log // Blockchain specific contextual infos
}

// FilterStreamLastMiniblockUpdated is a free log retrieval operation binding the contract event 0xccc26bbb6dd655ea0bb8a40a3c30e35c6bdf42f8faf0d71bbea897af768cda8b.
//
// Solidity: event StreamLastMiniblockUpdated(bytes32 streamId, bytes32 lastMiniblockHash, uint64 lastMiniblockNum, bool isSealed)
func (_MockRiverRegistry *MockRiverRegistryFilterer) FilterStreamLastMiniblockUpdated(opts *bind.FilterOpts) (*MockRiverRegistryStreamLastMiniblockUpdatedIterator, error) {

	logs, sub, err := _MockRiverRegistry.contract.FilterLogs(opts, "StreamLastMiniblockUpdated")
	if err != nil {
		return nil, err
	}
	return &MockRiverRegistryStreamLastMiniblockUpdatedIterator{contract: _MockRiverRegistry.contract, event: "StreamLastMiniblockUpdated", logs: logs, sub: sub}, nil
}

// WatchStreamLastMiniblockUpdated is a free log subscription operation binding the contract event 0xccc26bbb6dd655ea0bb8a40a3c30e35c6bdf42f8faf0d71bbea897af768cda8b.
//
// Solidity: event StreamLastMiniblockUpdated(bytes32 streamId, bytes32 lastMiniblockHash, uint64 lastMiniblockNum, bool isSealed)
func (_MockRiverRegistry *MockRiverRegistryFilterer) WatchStreamLastMiniblockUpdated(opts *bind.WatchOpts, sink chan<- *MockRiverRegistryStreamLastMiniblockUpdated) (event.Subscription, error) {

	logs, sub, err := _MockRiverRegistry.contract.WatchLogs(opts, "StreamLastMiniblockUpdated")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockRiverRegistryStreamLastMiniblockUpdated)
				if err := _MockRiverRegistry.contract.UnpackLog(event, "StreamLastMiniblockUpdated", log); err != nil {
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

// ParseStreamLastMiniblockUpdated is a log parse operation binding the contract event 0xccc26bbb6dd655ea0bb8a40a3c30e35c6bdf42f8faf0d71bbea897af768cda8b.
//
// Solidity: event StreamLastMiniblockUpdated(bytes32 streamId, bytes32 lastMiniblockHash, uint64 lastMiniblockNum, bool isSealed)
func (_MockRiverRegistry *MockRiverRegistryFilterer) ParseStreamLastMiniblockUpdated(log types.Log) (*MockRiverRegistryStreamLastMiniblockUpdated, error) {
	event := new(MockRiverRegistryStreamLastMiniblockUpdated)
	if err := _MockRiverRegistry.contract.UnpackLog(event, "StreamLastMiniblockUpdated", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockRiverRegistryStreamPlacementUpdatedIterator is returned from FilterStreamPlacementUpdated and is used to iterate over the raw logs and unpacked data for StreamPlacementUpdated events raised by the MockRiverRegistry contract.
type MockRiverRegistryStreamPlacementUpdatedIterator struct {
	Event *MockRiverRegistryStreamPlacementUpdated // Event containing the contract specifics and raw log

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
func (it *MockRiverRegistryStreamPlacementUpdatedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockRiverRegistryStreamPlacementUpdated)
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
		it.Event = new(MockRiverRegistryStreamPlacementUpdated)
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
func (it *MockRiverRegistryStreamPlacementUpdatedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockRiverRegistryStreamPlacementUpdatedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockRiverRegistryStreamPlacementUpdated represents a StreamPlacementUpdated event raised by the MockRiverRegistry contract.
type MockRiverRegistryStreamPlacementUpdated struct {
	StreamId    [32]byte
	NodeAddress common.Address
	IsAdded     bool
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterStreamPlacementUpdated is a free log retrieval operation binding the contract event 0xaaa473c28a5fe04b6a7ecd795826e462f9d0c23f00ef9f51ec02fa6ea418806f.
//
// Solidity: event StreamPlacementUpdated(bytes32 streamId, address nodeAddress, bool isAdded)
func (_MockRiverRegistry *MockRiverRegistryFilterer) FilterStreamPlacementUpdated(opts *bind.FilterOpts) (*MockRiverRegistryStreamPlacementUpdatedIterator, error) {

	logs, sub, err := _MockRiverRegistry.contract.FilterLogs(opts, "StreamPlacementUpdated")
	if err != nil {
		return nil, err
	}
	return &MockRiverRegistryStreamPlacementUpdatedIterator{contract: _MockRiverRegistry.contract, event: "StreamPlacementUpdated", logs: logs, sub: sub}, nil
}

// WatchStreamPlacementUpdated is a free log subscription operation binding the contract event 0xaaa473c28a5fe04b6a7ecd795826e462f9d0c23f00ef9f51ec02fa6ea418806f.
//
// Solidity: event StreamPlacementUpdated(bytes32 streamId, address nodeAddress, bool isAdded)
func (_MockRiverRegistry *MockRiverRegistryFilterer) WatchStreamPlacementUpdated(opts *bind.WatchOpts, sink chan<- *MockRiverRegistryStreamPlacementUpdated) (event.Subscription, error) {

	logs, sub, err := _MockRiverRegistry.contract.WatchLogs(opts, "StreamPlacementUpdated")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockRiverRegistryStreamPlacementUpdated)
				if err := _MockRiverRegistry.contract.UnpackLog(event, "StreamPlacementUpdated", log); err != nil {
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

// ParseStreamPlacementUpdated is a log parse operation binding the contract event 0xaaa473c28a5fe04b6a7ecd795826e462f9d0c23f00ef9f51ec02fa6ea418806f.
//
// Solidity: event StreamPlacementUpdated(bytes32 streamId, address nodeAddress, bool isAdded)
func (_MockRiverRegistry *MockRiverRegistryFilterer) ParseStreamPlacementUpdated(log types.Log) (*MockRiverRegistryStreamPlacementUpdated, error) {
	event := new(MockRiverRegistryStreamPlacementUpdated)
	if err := _MockRiverRegistry.contract.UnpackLog(event, "StreamPlacementUpdated", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
