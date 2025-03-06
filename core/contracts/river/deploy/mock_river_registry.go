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
	ABI: "[{\"type\":\"constructor\",\"inputs\":[{\"name\":\"approvedOperators\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"__OperatorRegistry_init\",\"inputs\":[{\"name\":\"initialOperators\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"__RiverConfig_init\",\"inputs\":[{\"name\":\"configManagers\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"addStream\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"genesisMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"stream\",\"type\":\"tuple\",\"internalType\":\"structStream\",\"components\":[{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"reserved0\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"flags\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"}]}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"allocateStream\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"},{\"name\":\"genesisMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"genesisMiniblock\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"approveConfigurationManager\",\"inputs\":[{\"name\":\"manager\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"approveOperator\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"configurationExists\",\"inputs\":[{\"name\":\"key\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"deleteConfiguration\",\"inputs\":[{\"name\":\"key\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"deleteConfigurationOnBlock\",\"inputs\":[{\"name\":\"key\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"blockNumber\",\"type\":\"uint64\",\"internalType\":\"uint64\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"getAllConfiguration\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"tuple[]\",\"internalType\":\"structSetting[]\",\"components\":[{\"name\":\"key\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"blockNumber\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"value\",\"type\":\"bytes\",\"internalType\":\"bytes\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getAllNodeAddresses\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getAllNodes\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"tuple[]\",\"internalType\":\"structNode[]\",\"components\":[{\"name\":\"status\",\"type\":\"uint8\",\"internalType\":\"enumNodeStatus\"},{\"name\":\"url\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getAllOperators\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getConfiguration\",\"inputs\":[{\"name\":\"key\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple[]\",\"internalType\":\"structSetting[]\",\"components\":[{\"name\":\"key\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"blockNumber\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"value\",\"type\":\"bytes\",\"internalType\":\"bytes\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getNode\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple\",\"internalType\":\"structNode\",\"components\":[{\"name\":\"status\",\"type\":\"uint8\",\"internalType\":\"enumNodeStatus\"},{\"name\":\"url\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getNodeCount\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getPaginatedStreams\",\"inputs\":[{\"name\":\"start\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"stop\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple[]\",\"internalType\":\"structStreamWithId[]\",\"components\":[{\"name\":\"id\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"stream\",\"type\":\"tuple\",\"internalType\":\"structStream\",\"components\":[{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"reserved0\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"flags\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"}]}]},{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getPaginatedStreamsOnNode\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"start\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"stop\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"streams\",\"type\":\"tuple[]\",\"internalType\":\"structStreamWithId[]\",\"components\":[{\"name\":\"id\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"stream\",\"type\":\"tuple\",\"internalType\":\"structStream\",\"components\":[{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"reserved0\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"flags\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"}]}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getStream\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"stream\",\"type\":\"tuple\",\"internalType\":\"structStream\",\"components\":[{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"reserved0\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"flags\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getStreamCount\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getStreamCountOnNode\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"count\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getStreamWithGenesis\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"stream\",\"type\":\"tuple\",\"internalType\":\"structStream\",\"components\":[{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"reserved0\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"flags\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"}]},{\"name\":\"\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"isConfigurationManager\",\"inputs\":[{\"name\":\"manager\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"isNode\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"isOperator\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"isStream\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"placeStreamOnNode\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"registerNode\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"url\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"status\",\"type\":\"uint8\",\"internalType\":\"enumNodeStatus\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"removeConfigurationManager\",\"inputs\":[{\"name\":\"manager\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"removeNode\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"removeOperator\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"removeStreamFromNode\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setConfiguration\",\"inputs\":[{\"name\":\"key\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"blockNumber\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"value\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setStreamLastMiniblock\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"isSealed\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setStreamLastMiniblockBatch\",\"inputs\":[{\"name\":\"miniblocks\",\"type\":\"tuple[]\",\"internalType\":\"structSetMiniblock[]\",\"components\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"prevMiniBlockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"isSealed\",\"type\":\"bool\",\"internalType\":\"bool\"}]}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"syncNodesOnStreams\",\"inputs\":[{\"name\":\"start\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"stop\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"updateNodeStatus\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"status\",\"type\":\"uint8\",\"internalType\":\"enumNodeStatus\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"updateNodeUrl\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"url\",\"type\":\"string\",\"internalType\":\"string\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"ConfigurationChanged\",\"inputs\":[{\"name\":\"key\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"block\",\"type\":\"uint64\",\"indexed\":false,\"internalType\":\"uint64\"},{\"name\":\"value\",\"type\":\"bytes\",\"indexed\":false,\"internalType\":\"bytes\"},{\"name\":\"deleted\",\"type\":\"bool\",\"indexed\":false,\"internalType\":\"bool\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"ConfigurationManagerAdded\",\"inputs\":[{\"name\":\"manager\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"ConfigurationManagerRemoved\",\"inputs\":[{\"name\":\"manager\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Initialized\",\"inputs\":[{\"name\":\"version\",\"type\":\"uint32\",\"indexed\":false,\"internalType\":\"uint32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceAdded\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceRemoved\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"NodeAdded\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"operator\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"url\",\"type\":\"string\",\"indexed\":false,\"internalType\":\"string\"},{\"name\":\"status\",\"type\":\"uint8\",\"indexed\":false,\"internalType\":\"enumNodeStatus\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"NodeRemoved\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"NodeStatusUpdated\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"status\",\"type\":\"uint8\",\"indexed\":false,\"internalType\":\"enumNodeStatus\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"NodeUrlUpdated\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"url\",\"type\":\"string\",\"indexed\":false,\"internalType\":\"string\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"OperatorAdded\",\"inputs\":[{\"name\":\"operatorAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"OperatorRemoved\",\"inputs\":[{\"name\":\"operatorAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"OwnershipTransferred\",\"inputs\":[{\"name\":\"previousOwner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"newOwner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"StreamAllocated\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"indexed\":false,\"internalType\":\"address[]\"},{\"name\":\"genesisMiniblockHash\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"genesisMiniblock\",\"type\":\"bytes\",\"indexed\":false,\"internalType\":\"bytes\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"StreamCreated\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"genesisMiniblockHash\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"stream\",\"type\":\"tuple\",\"indexed\":false,\"internalType\":\"structStream\",\"components\":[{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"reserved0\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"flags\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"}]}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"StreamLastMiniblockUpdateFailed\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"indexed\":false,\"internalType\":\"uint64\"},{\"name\":\"reason\",\"type\":\"string\",\"indexed\":false,\"internalType\":\"string\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"StreamLastMiniblockUpdated\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"indexed\":false,\"internalType\":\"uint64\"},{\"name\":\"isSealed\",\"type\":\"bool\",\"indexed\":false,\"internalType\":\"bool\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"StreamPlacementUpdated\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"nodeAddress\",\"type\":\"address\",\"indexed\":false,\"internalType\":\"address\"},{\"name\":\"isAdded\",\"type\":\"bool\",\"indexed\":false,\"internalType\":\"bool\"}],\"anonymous\":false},{\"type\":\"error\",\"name\":\"Initializable_InInitializingState\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Initializable_NotInInitializingState\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_AlreadySupported\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_NotSupported\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Ownable__NotOwner\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"Ownable__ZeroAddress\",\"inputs\":[]}]",
	Bin: "0x60806040523480156200001157600080fd5b5060405162005028380380620050288339810160408190526200003491620004a6565b6200003e620000c1565b620000493362000169565b60005b8151811015620000b957620000838282815181106200006f576200006f62000578565b60200260200101516200023760201b60201c565b620000b08282815181106200009c576200009c62000578565b60200260200101516200031c60201b60201c565b6001016200004c565b5050620005df565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef520008054640100000000900460ff16156200010e576040516366008a2d60e01b815260040160405180910390fd5b805463ffffffff90811610156200016657805463ffffffff191663ffffffff90811782556040519081527fe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c9060200160405180910390a15b50565b60006200019d7f4675fa8241f86f37157864d3d49b85ad4b164352c516da28e1678a90470ae300546001600160a01b031690565b90506001600160a01b038216620001c757604051634e3ef82560e01b815260040160405180910390fd5b817f4675fa8241f86f37157864d3d49b85ad4b164352c516da28e1678a90470ae30080546001600160a01b0319166001600160a01b03928316179055604051838216918316907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e090600090a35050565b6001600160a01b038116620002865760408051808201825260078152664241445f41524760c81b6020820152905162461bcd60e51b81526200027d91906004016200058e565b60405180910390fd5b62000293600882620003e9565b15620002d757604080518082018252600e81526d414c52454144595f45584953545360901b6020820152905162461bcd60e51b81526200027d91906004016200058e565b620002e460088262000410565b506040516001600160a01b038216907fac6fa858e9350a46cec16539926e0fde25b7629f84b5a72bffaae4df888ae86d90600090a250565b6001600160a01b038116620003625760408051808201825260078152664241445f41524760c81b6020820152905162461bcd60e51b81526200027d91906004016200058e565b6200036f600d8262000410565b620003b257604080518082018252600e81526d414c52454144595f45584953545360901b6020820152905162461bcd60e51b81526200027d91906004016200058e565b6040516001600160a01b038216907f7afd798379ae2d2e5035438544cea2b60eb1dde6a8128e6d447fd2a25f8825a290600090a250565b6001600160a01b038116600090815260018301602052604081205415155b90505b92915050565b600062000407836001600160a01b03841660008181526001830160205260408120546200046a575081546001818101845560008481526020808220909301849055845484825282860190935260409020919091556200040a565b5060006200040a565b634e487b7160e01b600052604160045260246000fd5b80516001600160a01b0381168114620004a157600080fd5b919050565b60006020808385031215620004ba57600080fd5b82516001600160401b0380821115620004d257600080fd5b818501915085601f830112620004e757600080fd5b815181811115620004fc57620004fc62000473565b8060051b604051601f19603f8301168101818110858211171562000524576200052462000473565b6040529182528482019250838101850191888311156200054357600080fd5b938501935b828510156200056c576200055c8562000489565b8452938501939285019262000548565b98975050505050505050565b634e487b7160e01b600052603260045260246000fd5b60006020808352835180602085015260005b81811015620005be57858101830151858201604001528201620005a0565b506000604082860101526040601f19601f8301168501019250505092915050565b614a3980620005ef6000396000f3fe608060405234801561001057600080fd5b50600436106102325760003560e01c8063a1174e7d11610130578063c8fe3a01116100b8578063d911c6321161007c578063d911c63214610521578063ee885b1214610529578063eecc66f41461053c578063fc207c011461054f578063ff3a14ab1461056257600080fd5b8063c8fe3a01146104b2578063ca78c41a146104c7578063d0c27c4f146104e8578063d4bd44a0146104fb578063d7a3158a1461050e57600080fd5b8063b7f227ee116100ff578063b7f227ee1461045e578063ba428b1a14610471578063c0f2208414610484578063c179b85f1461048c578063c87d13241461049f57600080fd5b8063a1174e7d14610410578063ac8a584a14610425578063b2b99ec914610438578063b2e76b8e1461044b57600080fd5b80633c2544d1116101be578063813049ec11610182578063813049ec146103a45780639283ae3a146103b75780639d209048146103ca5780639ee86d38146103ea578063a09449a6146103fd57600080fd5b80633c2544d114610336578063581f8b9b146103585780636b883c391461036b5780636d70f7ae1461037e5780637e4465e71461039157600080fd5b80631290abe8116102055780631290abe8146102ba57806322bbda64146102da578063242cae9f146102fa578063313745111461030d57806339bf397e1461032057600080fd5b80630175015214610237578063035759e11461027d57806303cc879314610292578063081814db146102a5575b600080fd5b61026861024536600461391a565b6001600160a01b0390811660009081526007602052604090206002015416151590565b60405190151581526020015b60405180910390f35b61029061028b366004613937565b610575565b005b6102906102a0366004613950565b6106e9565b6102ad6107aa565b60405161027491906139c2565b6102cd6102c8366004613937565b610a15565b6040516102749190613add565b6102ed6102e8366004613af0565b610af9565b6040516102749190613b91565b61029061030836600461391a565b610c8b565b61029061031b366004613be8565b610cd2565b610328610d5e565b604051908152602001610274565b610349610344366004613937565b610d6f565b60405161027493929190613c29565b610290610366366004613c72565b610f01565b610290610379366004613ce8565b6110a1565b61026861038c36600461391a565b6111d3565b61029061039f366004613e0c565b6111e6565b6102906103b236600461391a565b6113de565b6102ad6103c5366004613937565b6114d9565b6103dd6103d836600461391a565b61163c565b6040516102749190613ee7565b6102906103f8366004613efa565b6117bd565b61029061040b366004613f3f565b61195a565b610418611c33565b6040516102749190613f9a565b61029061043336600461391a565b611e07565b61029061044636600461391a565b611f6a565b610290610459366004613ffe565b612133565b61029061046c366004614054565b612232565b61029061047f366004613be8565b612481565b61032861250d565b61029061049a36600461391a565b612518565b6103286104ad36600461391a565b61255c565b6104ba61257d565b6040516102749190614079565b6104da6104d5366004613950565b612589565b6040516102749291906140c6565b6102686104f6366004613937565b612708565b61026861050936600461391a565b612714565b61029061051c3660046140fa565b612721565b6104ba6128b6565b610290610537366004613efa565b6128c2565b61029061054a36600461414c565b612af2565b61026861055d366004613937565b612cbd565b6102906105703660046141ab565b612cca565b33610581600d82613023565b6105c45760408051808201825260088152670848288be82aaa8960c31b6020820152905162461bcd60e51b81526105bb919060040161421f565b60405180910390fd5b816105d0600a82613048565b61060b5760408051808201825260098152681393d517d193d5539160ba1b6020820152905162461bcd60e51b81526105bb919060040161421f565b6000838152600c60205260409020541561067e576000838152600c6020526040902080548061063c5761063c614232565b60008281526020812060036000199093019283020181815560018101805467ffffffffffffffff191690559061067560028301826137b2565b5050905561060b565b6000838152600c60205260408120610695916137ec565b6106a0600a84613060565b50604080518481526001600160401b0360208201526080818301819052600090820152600160608201529051600080516020614a198339815191529181900360a00190a1505050565b6000806106f58161306c565b838118908411028318848111908590030284019150505b808310156107a55760006107208185613076565b600081815260026020819052604082209081018054939450909290915b818110156107955761078c856000600f01600086858154811061076257610762614248565b60009182526020808320909101546001600160a01b03168352820192909252604001902090613082565b5060010161073d565b505050505082600101925061070c565b505050565b60606000806107b9600a61306c565b905060005b818110156107fa5760006107d3600a83613076565b6000818152600c60205260409020549091506107ef9085614274565b9350506001016107be565b506000826001600160401b0381111561081557610815613d6a565b60405190808252806020026020018201604052801561086257816020015b604080516060808201835260008083526020830152918101919091528152602001906001900390816108335790505b5090506000610871600a61306c565b90506000805b82811015610a0a57600061088c600a83613076565b6000818152600c6020908152604080832080548251818502810185019093528083529495509293909291849084015b8282101561099f57600084815260209081902060408051606081018252600386029092018054835260018101546001600160401b0316938301939093526002830180549293929184019161090e90614287565b80601f016020809104026020016040519081016040528092919081815260200182805461093a90614287565b80156109875780601f1061095c57610100808354040283529160200191610987565b820191906000526020600020905b81548152906001019060200180831161096a57829003601f168201915b505050505081525050815260200190600101906108bb565b50505050905060005b81518110156109fc578181815181106109c3576109c3614248565b60200260200101518786806109d7906142bb565b9750815181106109e9576109e9614248565b60209081029190910101526001016109a8565b505050806001019050610877565b509195945050505050565b60408051600080825260208201819052818301819052606080830191909152608082015290819052610a468261308e565b600082815260026020818152604092839020835160a0810185528154815260018201546001600160401b0380821683860152600160401b8204811683880152600160801b9091041660608201529281018054855181850281018501909652808652939491936080860193830182828015610ae957602002820191906000526020600020905b81546001600160a01b03168152600190910190602001808311610acb575b5050505050815250509050919050565b6001600160a01b0383166000908152600f60205260408120606091610b1d8261306c565b905083811881851102841885811186820302806001600160401b03811115610b4757610b47613d6a565b604051908082528060200260200182016040528015610b8057816020015b610b6d61380d565b815260200190600190039081610b655790505b50945060005b81811015610c7f576000868281518110610ba257610ba2614248565b60200260200101519050610bc1828a018761307690919063ffffffff16565b808252600090815260026020818152604092839020835160a0810185528154815260018201546001600160401b0380821683860152600160401b8204811683880152600160801b9091041660608201529281018054855181850281018501909652808652939491936080860193830182828015610c6757602002820191906000526020600020905b81546001600160a01b03168152600190910190602001808311610c49575b50505091909252505050602090910152600101610b86565b50505050509392505050565b610c936130d4565b6001600160a01b0316336001600160a01b031614610cc6576040516365f4906560e01b81523360048201526024016105bb565b610ccf81613102565b50565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef5200054640100000000900460ff16610d1c57604051630ef4733760e31b815260040160405180910390fd5b60005b818110156107a557610d56838383818110610d3c57610d3c614248565b9050602002016020810190610d51919061391a565b6131d4565b600101610d1f565b6000610d6a600561306c565b905090565b60408051600080825260208201819052818301819052606080830182905260808301819052928290529091610da38461308e565b600084815260026020818152604080842060048352818520546003845294829020825160a0810184528254815260018301546001600160401b0380821683880152600160401b8204811683870152600160801b90910416606082015294820180548451818702810187019095528085529296959194919387936080860193919291830182828015610e5d57602002820191906000526020600020905b81546001600160a01b03168152600190910190602001808311610e3f575b5050505050815250509250808054610e7490614287565b80601f0160208091040260200160405190810160405280929190818152602001828054610ea090614287565b8015610eed5780601f10610ec257610100808354040283529160200191610eed565b820191906000526020600020905b815481529060010190602001808311610ed057829003601f168201915b505050505090509250925092509193909250565b6001600160a01b03808316600090815260076020526040902060020154839116610f6157604080518082018252600e81526d1393d11157d393d517d193d5539160921b6020820152905162461bcd60e51b81526105bb919060040161421f565b33610f6d600882613023565b610fa75760408051808201825260088152670848288be82aaa8960c31b6020820152905162461bcd60e51b81526105bb919060040161421f565b6001600160a01b03808516600090815260076020526040902060030154859133911681146110055760408051808201825260088152670848288be82aaa8960c31b6020820152905162461bcd60e51b81526105bb919060040161421f565b6001600160a01b0386166000908152600760205260409020805461102c9060ff1687613299565b80548690829060ff1916600183600581111561104a5761104a613e5b565b021790555060028101546040516001600160a01b03909116907f20891cc7622c7951cbd8c70c61a5201eb45625b8c00e8f6c986cfca78f3dbfa0906110909089906142d4565b60405180910390a250505050505050565b336000818152600760205260409020600201546001600160a01b03166110fd57604080518082018252600e81526d1393d11157d393d517d193d5539160921b6020820152905162461bcd60e51b81526105bb919060040161421f565b866111078161342c565b86866111138282613478565b60008a815260026020819052604082209189918c918c9185919061113a9083018585613857565b5050929092555061114e905060008c613082565b5060008b8152600360205260409020611168878983614349565b5060008b81526004602052604090208890556111858b8b8b613504565b7f55ef7efc60ef99743e54209752c9a8e047e013917ec91572db75875069dd65bb8b8b8b8b8b8b6040516111be96959493929190614474565b60405180910390a15050505050505050505050565b60006111e0600883613023565b92915050565b336111f2600882613023565b61122c5760408051808201825260088152670848288be82aaa8960c31b6020820152905162461bcd60e51b81526105bb919060040161421f565b6001600160a01b0380841660009081526007602052604090206002015484911661128c57604080518082018252600e81526d1393d11157d393d517d193d5539160921b6020820152905162461bcd60e51b81526105bb919060040161421f565b6001600160a01b03808516600090815260076020526040902060030154859133911681146112ea5760408051808201825260088152670848288be82aaa8960c31b6020820152905162461bcd60e51b81526105bb919060040161421f565b6001600160a01b0386166000908152600760209081526040918290209151611314918891016144b4565b604051602081830303815290604052805190602001208160010160405160200161133e91906144d0565b604051602081830303815290604052805190602001200361138e5760408051808201825260078152664241445f41524760c81b6020820152905162461bcd60e51b81526105bb919060040161421f565b6001810161139c8782614546565b5060028101546040516001600160a01b03909116907f4505168a8705a16fd4d0575197fd0f510db69df93a065e158ad2c0957ba12bac9061109090899061421f565b6113e66130d4565b6001600160a01b0316336001600160a01b031614611419576040516365f4906560e01b81523360048201526024016105bb565b6001600160a01b03811661145c5760408051808201825260078152664241445f41524760c81b6020820152905162461bcd60e51b81526105bb919060040161421f565b611467600d82613566565b6114a25760408051808201825260098152681393d517d193d5539160ba1b6020820152905162461bcd60e51b81526105bb919060040161421f565b6040516001600160a01b038216907ff9889c857e5356066b564327caa757c325ecbc001b2b47d72edf8cf9aedb1be590600090a250565b6060816114e7600a82613048565b6115225760408051808201825260098152681393d517d193d5539160ba1b6020820152905162461bcd60e51b81526105bb919060040161421f565b6000838152600c6020908152604080832080548251818502810185019093528083529193909284015b8282101561162f57600084815260209081902060408051606081018252600386029092018054835260018101546001600160401b0316938301939093526002830180549293929184019161159e90614287565b80601f01602080910402602001604051908101604052809291908181526020018280546115ca90614287565b80156116175780601f106115ec57610100808354040283529160200191611617565b820191906000526020600020905b8154815290600101906020018083116115fa57829003601f168201915b5050505050815250508152602001906001019061154b565b5050505091505b50919050565b6116676040805160808101909152806000815260606020820181905260006040830181905291015290565b611672600583613023565b6116b257604080518082018252600e81526d1393d11157d393d517d193d5539160921b6020820152905162461bcd60e51b81526105bb919060040161421f565b6001600160a01b038216600090815260076020526040908190208151608081019092528054829060ff1660058111156116ed576116ed613e5b565b60058111156116fe576116fe613e5b565b815260200160018201805461171290614287565b80601f016020809104026020016040519081016040528092919081815260200182805461173e90614287565b801561178b5780601f106117605761010080835404028352916020019161178b565b820191906000526020600020905b81548152906001019060200180831161176e57829003601f168201915b505050918352505060028201546001600160a01b03908116602083015260039092015490911660409091015292915050565b816117c78161308e565b336000818152600760205260409020600201546001600160a01b031661182357604080518082018252600e81526d1393d11157d393d517d193d5539160921b6020820152905162461bcd60e51b81526105bb919060040161421f565b60008481526002602081815260408084206001600160a01b0388168552600f909252909220908201906118569087613082565b50805460005b818110156118de57866001600160a01b031683828154811061188057611880614248565b6000918252602090912001546001600160a01b0316036118d657604080518082018252600e81526d414c52454144595f45584953545360901b6020820152905162461bcd60e51b81526105bb919060040161421f565b60010161185c565b50815460018082018455600084815260209081902090920180546001600160a01b0319166001600160a01b038a16908117909155604080518b8152938401919091528201527faaa473c28a5fe04b6a7ecd795826e462f9d0c23f00ef9f51ec02fa6ea418806f906060015b60405180910390a150505050505050565b33611966600d82613023565b6119a05760408051808201825260088152670848288be82aaa8960c31b6020820152905162461bcd60e51b81526105bb919060040161421f565b67fffffffffffffffe196001600160401b038516016119ee5760408051808201825260078152664241445f41524760c81b6020820152905162461bcd60e51b81526105bb919060040161421f565b6000829003611a2c5760408051808201825260078152664241445f41524760c81b6020820152905162461bcd60e51b81526105bb919060040161421f565b611a37600a86613048565b611a4857611a46600a86613082565b505b6000858152600c6020526040812054905b81811015611b2f576000878152600c6020526040902080546001600160401b038816919083908110611a8d57611a8d614248565b60009182526020909120600160039092020101546001600160401b031603611b27576000878152600c6020526040902080548691869184908110611ad357611ad3614248565b90600052602060002090600302016002019182611af1929190614349565b50600080516020614a19833981519152878787876000604051611b18959493929190614603565b60405180910390a15050611c2c565b600101611a59565b506000600c0160008781526020019081526020016000206040518060600160405280888152602001876001600160401b0316815260200186868080601f0160208091040260200160405190810160405280939291908181526020018383808284376000920182905250939094525050835460018082018655948252602091829020845160039092020190815590830151938101805467ffffffffffffffff19166001600160401b03909516949094179093555060408101519091906002820190611bf99082614546565b505050600080516020614a19833981519152868686866000604051611c22959493929190614603565b60405180910390a1505b5050505050565b60606000611c41600561306c565b6001600160401b03811115611c5857611c58613d6a565b604051908082528060200260200182016040528015611cb457816020015b611ca16040805160808101909152806000815260606020820181905260006040830181905291015290565b815260200190600190039081611c765790505b50905060005b611cc4600561306c565b8110156116365760076000611cda600584613076565b6001600160a01b03168152602081019190915260409081016000208151608081019092528054829060ff166005811115611d1657611d16613e5b565b6005811115611d2757611d27613e5b565b8152602001600182018054611d3b90614287565b80601f0160208091040260200160405190810160405280929190818152602001828054611d6790614287565b8015611db45780601f10611d8957610100808354040283529160200191611db4565b820191906000526020600020905b815481529060010190602001808311611d9757829003601f168201915b505050918352505060028201546001600160a01b0390811660208301526003909201549091166040909101528251839083908110611df457611df4614248565b6020908102919091010152600101611cba565b611e0f6130d4565b6001600160a01b0316336001600160a01b031614611e42576040516365f4906560e01b81523360048201526024016105bb565b611e4d600882613023565b611e9157604080518082018252601281527113d41154905513d497d393d517d193d5539160721b6020820152905162461bcd60e51b81526105bb919060040161421f565b60005b611e9e600561306c565b811015611f26576001600160a01b03821660076000611ebe600585613076565b6001600160a01b0390811682526020820192909252604001600020600301541603611f1e57604080518082018252600d81526c4f55545f4f465f424f554e445360981b6020820152905162461bcd60e51b81526105bb919060040161421f565b600101611e94565b50611f32600882613566565b506040516001600160a01b038216907f80c0b871b97b595b16a7741c1b06fed0c6f6f558639f18ccbce50724325dc40d90600090a250565b6001600160a01b0380821660009081526007602052604090206003015482913391168114611fc85760408051808201825260088152670848288be82aaa8960c31b6020820152905162461bcd60e51b81526105bb919060040161421f565b6001600160a01b038381166000908152600760205260409020600201541661202657604080518082018252600e81526d1393d11157d393d517d193d5539160921b6020820152905162461bcd60e51b81526105bb919060040161421f565b60056001600160a01b03841660009081526007602052604090205460ff16600581111561205557612055613e5b565b1461209e5760408051808201825260168152751393d11157d4d510551157d393d517d0531313d5d15160521b6020820152905162461bcd60e51b81526105bb919060040161421f565b6120a9600584613566565b506001600160a01b0383166000908152600760205260408120805460ff19168155906120d860018301826137b2565b506002810180546001600160a01b03199081169091556003909101805490911690556040516001600160a01b038416907fcfc24166db4bb677e857cacabd1541fb2b30645021b27c5130419589b84db52b90600090a2505050565b336000818152600760205260409020600201546001600160a01b031661218f57604080518082018252600e81526d1393d11157d393d517d193d5539160921b6020820152905162461bcd60e51b81526105bb919060040161421f565b836121998161342c565b6121a66080840184614640565b6121b08282613478565b6121bb600088613082565b50600087815260026020526040902085906121d68282614715565b505060008781526004602052604090208690556121ff876121fa6080880188614640565b613504565b7fac1b69e6e0382c43def3cccabf63091ba47b5d8b10a705d16a1076668643fe4d878787604051611949939291906147e4565b3361223e600d82613023565b6122785760408051808201825260088152670848288be82aaa8960c31b6020820152905162461bcd60e51b81526105bb919060040161421f565b6000805b6000858152600c60205260409020548110156123f9576000858152600c6020526040902080546001600160401b0386169190839081106122be576122be614248565b60009182526020909120600160039092020101546001600160401b0316036123f1576000858152600c6020526040902080546122fc906001906148ad565b8154811061230c5761230c614248565b90600052602060002090600302016000600c016000878152602001908152602001600020828154811061234157612341614248565b600091825260209091208254600390920201908155600180830154908201805467ffffffffffffffff19166001600160401b0390921691909117905560028082019061238f908401826148c0565b5050506000858152600c602052604090208054806123af576123af614232565b60008281526020812060036000199093019283020181815560018101805467ffffffffffffffff19169055906123e860028301826137b2565b50509055600191505b60010161227c565b50806124365760408051808201825260098152681393d517d193d5539160ba1b6020820152905162461bcd60e51b81526105bb919060040161421f565b604080518581526001600160401b03851660208201526080818301819052600090820152600160608201529051600080516020614a198339815191529181900360a00190a150505050565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef5200054640100000000900460ff166124cb57604051630ef4733760e31b815260040160405180910390fd5b60005b818110156107a5576125058383838181106124eb576124eb614248565b9050602002016020810190612500919061391a565b613102565b6001016124ce565b6000610d6a8161306c565b6125206130d4565b6001600160a01b0316336001600160a01b031614612553576040516365f4906560e01b81523360048201526024016105bb565b610ccf816131d4565b6001600160a01b0381166000908152600f602052604081206111e09061306c565b6060610d6a600561357b565b60606000806125978161306c565b9050838118818511028418858111868203026000816001600160401b038111156125c3576125c3613d6a565b6040519080825280602002602001820160405280156125fc57816020015b6125e961380d565b8152602001906001900390816125e15790505b50905060005b828110156126f657600082828151811061261e5761261e614248565b6020908102919091010151905061263860008b8401613076565b808252600090815260026020818152604092839020835160a0810185528154815260018201546001600160401b0380821683860152600160401b8204811683880152600160801b90910416606082015292810180548551818502810185019096528086529394919360808601938301828280156126de57602002820191906000526020600020905b81546001600160a01b031681526001909101906020018083116126c0575b50505091909252505050602090910152600101612602565b509450505083101590505b9250929050565b60006111e08183613048565b60006111e0600d83613023565b336000818152600760205260409020600201546001600160a01b031661277d57604080518082018252600e81526d1393d11157d393d517d193d5539160921b6020820152905162461bcd60e51b81526105bb919060040161421f565b856127878161308e565b6000878152600260205260409020600180820154600160801b900416156127e357604080518082018252600d81526c14d51491505357d4d150531151609a1b6020820152905162461bcd60e51b81526105bb919060040161421f565b60018101546001600160401b0380871691161061282f5760408051808201825260078152664241445f41524760c81b6020820152905162461bcd60e51b81526105bb919060040161421f565b6000888152600360205260408120612846916137b2565b85815560018101805467ffffffffffffffff19166001600160401b03871617905583156128a0576001818101805467ffffffffffffffff60801b198116600160801b918290046001600160401b0316909317029190911790555b6128ac88878787613588565b5050505050505050565b6060610d6a600861357b565b816128cc8161308e565b336000818152600760205260409020600201546001600160a01b031661292857604080518082018252600e81526d1393d11157d393d517d193d5539160921b6020820152905162461bcd60e51b81526105bb919060040161421f565b60008481526002602081815260408084206001600160a01b0388168552600f9092529092209082019061295b9087613060565b508054600090815b81811015612a5e57876001600160a01b031684828154811061298757612987614248565b6000918252602090912001546001600160a01b031603612a5657836129ad6001846148ad565b815481106129bd576129bd614248565b9060005260206000200160009054906101000a90046001600160a01b03168482815481106129ed576129ed614248565b9060005260206000200160006101000a8154816001600160a01b0302191690836001600160a01b0316021790555083805480612a2b57612a2b614232565b600082815260209020810160001990810180546001600160a01b031916905501905560019250612a5e565b600101612963565b5081612aa057604080518082018252600e81526d1393d11157d393d517d193d5539160921b6020820152905162461bcd60e51b81526105bb919060040161421f565b604080518981526001600160a01b038916602082015260008183015290517faaa473c28a5fe04b6a7ecd795826e462f9d0c23f00ef9f51ec02fa6ea418806f9181900360600190a15050505050505050565b33612afe600882613023565b612b385760408051808201825260088152670848288be82aaa8960c31b6020820152905162461bcd60e51b81526105bb919060040161421f565b6001600160a01b038481166000908152600760205260409020600201541615612b9757604080518082018252600e81526d414c52454144595f45584953545360901b6020820152905162461bcd60e51b81526105bb919060040161421f565b60006040518060800160405280846005811115612bb657612bb6613e5b565b8152602081018690526001600160a01b0387166040820152336060909101529050612be26005866135d5565b506001600160a01b03851660009081526007602052604090208151815483929190829060ff19166001836005811115612c1d57612c1d613e5b565b021790555060208201516001820190612c369082614546565b506040828101516002830180546001600160a01b03199081166001600160a01b03938416179091556060909401516003909301805490941692811692909217909255905133918716907f759154d15a6aec80ceab7bc8820f46ebc53ad68bb18f47afb77483fea9dcc9ff90612cae9088908890614990565b60405180910390a35050505050565b60006111e0600a83613048565b336000818152600760205260409020600201546001600160a01b0316612d2657604080518082018252600e81526d1393d11157d393d517d193d5539160921b6020820152905162461bcd60e51b81526105bb919060040161421f565b816000819003612d655760408051808201825260078152664241445f41524760c81b6020820152905162461bcd60e51b81526105bb919060040161421f565b60005b81811015611c2c5736858583818110612d8357612d83614248565b60a002919091019150612d9a905060008235613048565b612e12577f75460fe319331413a18a82d99b07735cec53fa0c4061ada38c2141e331082afa81356040830135612dd660808501606086016149b2565b60408051808201825260098152681393d517d193d5539160ba1b60208201529051612e0494939291906149cf565b60405180910390a15061301b565b80356000908152600260205260409020600180820154600160801b90041615612eae577f75460fe319331413a18a82d99b07735cec53fa0c4061ada38c2141e331082afa82356040840135612e6d60808601606087016149b2565b604080518082018252600d81526c14d51491505357d4d150531151609a1b60208201529051612e9f94939291906149cf565b60405180910390a1505061301b565b612ebe60808301606084016149b2565b60018201546001600160401b03918216911610612f39577f75460fe319331413a18a82d99b07735cec53fa0c4061ada38c2141e331082afa82356040840135612f0d60808601606087016149b2565b60408051808201825260078152664241445f41524760c81b60208201529051612e9f94939291906149cf565b60018101546001600160401b0316600003612f675781356000908152600360205260408120612f67916137b2565b60408201358155612f7e60808301606084016149b2565b60018201805467ffffffffffffffff19166001600160401b0392909216919091179055612fb160a08301608084016149fd565b15612fe9576001818101805467ffffffffffffffff60801b198116600160801b918290046001600160401b0316909317029190911790555b6130188235604084013561300360808601606087016149b2565b61301360a08701608088016149fd565b613588565b50505b600101612d68565b6001600160a01b038116600090815260018301602052604081205415155b9392505050565b60008181526001830160205260408120541515613041565b600061304183836135ea565b60006111e0825490565b600061304183836136dd565b60006130418383613707565b613099600082613048565b610ccf5760408051808201825260098152681393d517d193d5539160ba1b6020820152905162461bcd60e51b81526105bb919060040161421f565b7f4675fa8241f86f37157864d3d49b85ad4b164352c516da28e1678a90470ae300546001600160a01b031690565b6001600160a01b0381166131455760408051808201825260078152664241445f41524760c81b6020820152905162461bcd60e51b81526105bb919060040161421f565b613150600882613023565b1561319157604080518082018252600e81526d414c52454144595f45584953545360901b6020820152905162461bcd60e51b81526105bb919060040161421f565b61319c6008826135d5565b506040516001600160a01b038216907fac6fa858e9350a46cec16539926e0fde25b7629f84b5a72bffaae4df888ae86d90600090a250565b6001600160a01b0381166132175760408051808201825260078152664241445f41524760c81b6020820152905162461bcd60e51b81526105bb919060040161421f565b613222600d826135d5565b61326257604080518082018252600e81526d414c52454144595f45584953545360901b6020820152905162461bcd60e51b81526105bb919060040161421f565b6040516001600160a01b038216907f7afd798379ae2d2e5035438544cea2b60eb1dde6a8128e6d447fd2a25f8825a290600090a250565b60008260058111156132ad576132ad613e5b565b1480613301575060018260058111156132c8576132c8613e5b565b148015613301575060038160058111156132e4576132e4613e5b565b1480613301575060048160058111156132ff576132ff613e5b565b145b806133545750600282600581111561331b5761331b613e5b565b1480156133545750600381600581111561333757613337613e5b565b14806133545750600481600581111561335257613352613e5b565b145b806133a75750600482600581111561336e5761336e613e5b565b1480156133a75750600381600581111561338a5761338a613e5b565b14806133a7575060058160058111156133a5576133a5613e5b565b145b806133df575060038260058111156133c1576133c1613e5b565b1480156133df575060058160058111156133dd576133dd613e5b565b145b156133e8575050565b60408051808201825260168152751393d11157d4d510551157d393d517d0531313d5d15160521b6020820152905162461bcd60e51b81526105bb919060040161421f565b613437600082613048565b15610ccf57604080518082018252600e81526d414c52454144595f45584953545360901b6020820152905162461bcd60e51b81526105bb919060040161421f565b8060005b818110156134fe576134b684848381811061349957613499614248565b90506020020160208101906134ae919061391a565b600590613023565b6134f657604080518082018252600e81526d1393d11157d393d517d193d5539160921b6020820152905162461bcd60e51b81526105bb919060040161421f565b60010161347c565b50505050565b60005b818110156134fe5761355d84600f600086868681811061352957613529614248565b905060200201602081019061353e919061391a565b6001600160a01b03168152602081019190915260400160002090613082565b50600101613507565b6000613041836001600160a01b0384166135ea565b6060600061304183613756565b60007fccc26bbb6dd655ea0bb8a40a3c30e35c6bdf42f8faf0d71bbea897af768cda8b9050604051856000528460205283604052826060528160806000a160405250506000606052505050565b6000613041836001600160a01b038416613707565b600081815260018301602052604081205480156136d357600061360e6001836148ad565b8554909150600090613622906001906148ad565b905080821461368757600086600001828154811061364257613642614248565b906000526020600020015490508087600001848154811061366557613665614248565b6000918252602080832090910192909255918252600188019052604090208390555b855486908061369857613698614232565b6001900381819060005260206000200160009055905585600101600086815260200190815260200160002060009055600193505050506111e0565b60009150506111e0565b60008260000182815481106136f4576136f4614248565b9060005260206000200154905092915050565b600081815260018301602052604081205461374e575081546001818101845560008481526020808220909301849055845484825282860190935260409020919091556111e0565b5060006111e0565b6060816000018054806020026020016040519081016040528092919081815260200182805480156137a657602002820191906000526020600020905b815481526020019060010190808311613792575b50505050509050919050565b5080546137be90614287565b6000825580601f106137ce575050565b601f016020900490600052602060002090810190610ccf91906138ba565b5080546000825560030290600052602060002090810190610ccf91906138cf565b6040805180820190915260008152602081016138526040805160a081018252600080825260208201819052918101829052606080820192909252608081019190915290565b905290565b8280548282559060005260206000209081019282156138aa579160200282015b828111156138aa5781546001600160a01b0319166001600160a01b03843516178255602090920191600190910190613877565b506138b69291506138ba565b5090565b5b808211156138b657600081556001016138bb565b808211156138b657600080825560018201805467ffffffffffffffff191690556138fc60028301826137b2565b506003016138cf565b6001600160a01b0381168114610ccf57600080fd5b60006020828403121561392c57600080fd5b813561304181613905565b60006020828403121561394957600080fd5b5035919050565b6000806040838503121561396357600080fd5b50508035926020909101359150565b60005b8381101561398d578181015183820152602001613975565b50506000910152565b600081518084526139ae816020860160208601613972565b601f01601f19169290920160200192915050565b600060208083018184528085518083526040925060408601915060408160051b87010184880160005b83811015613a3e57888303603f19018552815180518452878101516001600160401b0316888501528601516060878501819052613a2a81860183613996565b9689019694505050908601906001016139eb565b509098975050505050505050565b600060a08301825184526020808401516001600160401b0380821660208801528060408701511660408801528060608701511660608801525050608084015160a0608087015282815180855260c088019150602083019450600092505b80831015613ad25784516001600160a01b03168252938301936001929092019190830190613aa9565b509695505050505050565b6020815260006130416020830184613a4c565b600080600060608486031215613b0557600080fd5b8335613b1081613905565b95602085013595506040909401359392505050565b600082825180855260208086019550808260051b84010181860160005b84811015613b8457858303601f190189528151805184528401516040858501819052613b7081860183613a4c565b9a86019a9450505090830190600101613b42565b5090979650505050505050565b6020815260006130416020830184613b25565b60008083601f840112613bb657600080fd5b5081356001600160401b03811115613bcd57600080fd5b6020830191508360208260051b850101111561270157600080fd5b60008060208385031215613bfb57600080fd5b82356001600160401b03811115613c1157600080fd5b613c1d85828601613ba4565b90969095509350505050565b606081526000613c3c6060830186613a4c565b8460208401528281036040840152613c548185613996565b9695505050505050565b803560068110613c6d57600080fd5b919050565b60008060408385031215613c8557600080fd5b8235613c9081613905565b9150613c9e60208401613c5e565b90509250929050565b60008083601f840112613cb957600080fd5b5081356001600160401b03811115613cd057600080fd5b60208301915083602082850101111561270157600080fd5b60008060008060008060808789031215613d0157600080fd5b8635955060208701356001600160401b0380821115613d1f57600080fd5b613d2b8a838b01613ba4565b9097509550604089013594506060890135915080821115613d4b57600080fd5b50613d5889828a01613ca7565b979a9699509497509295939492505050565b634e487b7160e01b600052604160045260246000fd5b600082601f830112613d9157600080fd5b81356001600160401b0380821115613dab57613dab613d6a565b604051601f8301601f19908116603f01168101908282118183101715613dd357613dd3613d6a565b81604052838152866020858801011115613dec57600080fd5b836020870160208301376000602085830101528094505050505092915050565b60008060408385031215613e1f57600080fd5b8235613e2a81613905565b915060208301356001600160401b03811115613e4557600080fd5b613e5185828601613d80565b9150509250929050565b634e487b7160e01b600052602160045260246000fd5b60068110613e8f57634e487b7160e01b600052602160045260246000fd5b9052565b613e9e828251613e71565b6000602082015160806020850152613eb96080850182613996565b6040848101516001600160a01b03908116918701919091526060948501511693909401929092525090919050565b6020815260006130416020830184613e93565b60008060408385031215613f0d57600080fd5b823591506020830135613f1f81613905565b809150509250929050565b6001600160401b0381168114610ccf57600080fd5b60008060008060608587031215613f5557600080fd5b843593506020850135613f6781613f2a565b925060408501356001600160401b03811115613f8257600080fd5b613f8e87828801613ca7565b95989497509550505050565b600060208083016020845280855180835260408601915060408160051b87010192506020870160005b82811015613ff157603f19888603018452613fdf858351613e93565b94509285019290850190600101613fc3565b5092979650505050505050565b60008060006060848603121561401357600080fd5b833592506020840135915060408401356001600160401b0381111561403757600080fd5b840160a0818703121561404957600080fd5b809150509250925092565b6000806040838503121561406757600080fd5b823591506020830135613f1f81613f2a565b6020808252825182820181905260009190848201906040850190845b818110156140ba5783516001600160a01b031683529284019291840191600101614095565b50909695505050505050565b6040815260006140d96040830185613b25565b905082151560208301529392505050565b80358015158114613c6d57600080fd5b600080600080600060a0868803121561411257600080fd5b853594506020860135935060408601359250606086013561413281613f2a565b9150614140608087016140ea565b90509295509295909350565b60008060006060848603121561416157600080fd5b833561416c81613905565b925060208401356001600160401b0381111561418757600080fd5b61419386828701613d80565b9250506141a260408501613c5e565b90509250925092565b600080602083850312156141be57600080fd5b82356001600160401b03808211156141d557600080fd5b818501915085601f8301126141e957600080fd5b8135818111156141f857600080fd5b86602060a08302850101111561420d57600080fd5b60209290920196919550909350505050565b6020815260006130416020830184613996565b634e487b7160e01b600052603160045260246000fd5b634e487b7160e01b600052603260045260246000fd5b634e487b7160e01b600052601160045260246000fd5b808201808211156111e0576111e061425e565b600181811c9082168061429b57607f821691505b60208210810361163657634e487b7160e01b600052602260045260246000fd5b6000600182016142cd576142cd61425e565b5060010190565b602081016111e08284613e71565b5b818110156142f757600081556001016142e3565b5050565b601f8211156107a557806000526020600020601f840160051c810160208510156143225750805b611c2c601f850160051c8301826142e2565b600019600383901b1c191660019190911b1790565b6001600160401b0383111561436057614360613d6a565b6143748361436e8354614287565b836142fb565b6000601f8411600181146143a257600085156143905750838201355b61439a8682614334565b845550611c2c565b600083815260209020601f19861690835b828110156143d357868501358255602094850194600190920191016143b3565b50868210156143f05760001960f88860031b161c19848701351681555b505060018560011b0183555050505050565b8183526000602080850194508260005b8581101561444057813561442581613905565b6001600160a01b031687529582019590820190600101614412565b509495945050505050565b81835281816020850137506000828201602090810191909152601f909101601f19169091010190565b86815260806020820152600061448e608083018789614402565b85604084015282810360608401526144a781858761444b565b9998505050505050505050565b600082516144c6818460208701613972565b9190910192915050565b60008083546144de81614287565b600182811680156144f6576001811461450b5761453a565b60ff198416875282151583028701945061453a565b8760005260208060002060005b858110156145315781548a820152908401908201614518565b50505082870194505b50929695505050505050565b81516001600160401b0381111561455f5761455f613d6a565b6145738161456d8454614287565b846142fb565b602080601f8311600181146145a257600084156145905750858301515b61459a8582614334565b8655506145fb565b600085815260208120601f198616915b828110156145d1578886015182559484019460019091019084016145b2565b50858210156145ef5787850151600019600388901b60f8161c191681555b505060018460011b0185555b505050505050565b8581526001600160401b038516602082015260806040820152600061462c60808301858761444b565b905082151560608301529695505050505050565b6000808335601e1984360301811261465757600080fd5b8301803591506001600160401b0382111561467157600080fd5b6020019150600581901b360382131561270157600080fd5b6001600160401b038311156146a0576146a0613d6a565b600160401b8311156146b4576146b4613d6a565b8054838255808410156146da578160005260206000206146d88282018683016142e2565b505b50818160005260208060002060005b8681101561470c5783356146fc81613905565b82820155928201926001016146e9565b50505050505050565b8135815560018101602083013561472b81613f2a565b6001600160401b038254604086013561474381613f2a565b606087013561475181613f2a565b6001600160401b0360801b8160801b168486166001600160401b0360c01b8516176fffffffffffffffff00000000000000008460401b161717865550505060808501359250601e198536030183126147a857600080fd5b9184019182359150808211156147bd57600080fd5b506020820191508060051b36038213156147d657600080fd5b6134fe818360028601614689565b83815282602082015260606040820152813560608201526000602083013561480b81613f2a565b6001600160401b03908116608084015260408401359061482a82613f2a565b90811660a084015260608401359061484182613f2a565b90811660c084015260808401359036859003601e1901821261486257600080fd5b602091850191820191358181111561487957600080fd5b8060051b360383131561488b57600080fd5b60a060e08601526148a161010086018285614402565b98975050505050505050565b818103818111156111e0576111e061425e565b8181036148cb575050565b6148d58254614287565b6001600160401b038111156148ec576148ec613d6a565b6148fa8161456d8454614287565b6000601f82116001811461492857600083156149165750848201545b6149208482614334565b855550611c2c565b600085815260209020601f19841690600086815260209020845b838110156149625782860154825560019586019590910190602001614942565b50858310156149805781850154600019600388901b60f8161c191681555b5050505050600190811b01905550565b6040815260006149a36040830185613996565b90506130416020830184613e71565b6000602082840312156149c457600080fd5b813561304181613f2a565b8481528360208201526001600160401b0383166040820152608060608201526000613c546080830184613996565b600060208284031215614a0f57600080fd5b613041826140ea56fec01483261a841a868b99cb8802faed4ea44a1a816651c4f7ee061a96a205fe98",
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

// GetPaginatedStreamsOnNode is a free data retrieval call binding the contract method 0x22bbda64.
//
// Solidity: function getPaginatedStreamsOnNode(address nodeAddress, uint256 start, uint256 stop) view returns((bytes32,(bytes32,uint64,uint64,uint64,address[]))[] streams)
func (_MockRiverRegistry *MockRiverRegistryCaller) GetPaginatedStreamsOnNode(opts *bind.CallOpts, nodeAddress common.Address, start *big.Int, stop *big.Int) ([]StreamWithId, error) {
	var out []interface{}
	err := _MockRiverRegistry.contract.Call(opts, &out, "getPaginatedStreamsOnNode", nodeAddress, start, stop)

	if err != nil {
		return *new([]StreamWithId), err
	}

	out0 := *abi.ConvertType(out[0], new([]StreamWithId)).(*[]StreamWithId)

	return out0, err

}

// GetPaginatedStreamsOnNode is a free data retrieval call binding the contract method 0x22bbda64.
//
// Solidity: function getPaginatedStreamsOnNode(address nodeAddress, uint256 start, uint256 stop) view returns((bytes32,(bytes32,uint64,uint64,uint64,address[]))[] streams)
func (_MockRiverRegistry *MockRiverRegistrySession) GetPaginatedStreamsOnNode(nodeAddress common.Address, start *big.Int, stop *big.Int) ([]StreamWithId, error) {
	return _MockRiverRegistry.Contract.GetPaginatedStreamsOnNode(&_MockRiverRegistry.CallOpts, nodeAddress, start, stop)
}

// GetPaginatedStreamsOnNode is a free data retrieval call binding the contract method 0x22bbda64.
//
// Solidity: function getPaginatedStreamsOnNode(address nodeAddress, uint256 start, uint256 stop) view returns((bytes32,(bytes32,uint64,uint64,uint64,address[]))[] streams)
func (_MockRiverRegistry *MockRiverRegistryCallerSession) GetPaginatedStreamsOnNode(nodeAddress common.Address, start *big.Int, stop *big.Int) ([]StreamWithId, error) {
	return _MockRiverRegistry.Contract.GetPaginatedStreamsOnNode(&_MockRiverRegistry.CallOpts, nodeAddress, start, stop)
}

// GetStream is a free data retrieval call binding the contract method 0x1290abe8.
//
// Solidity: function getStream(bytes32 streamId) view returns((bytes32,uint64,uint64,uint64,address[]) stream)
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
// Solidity: function getStream(bytes32 streamId) view returns((bytes32,uint64,uint64,uint64,address[]) stream)
func (_MockRiverRegistry *MockRiverRegistrySession) GetStream(streamId [32]byte) (Stream, error) {
	return _MockRiverRegistry.Contract.GetStream(&_MockRiverRegistry.CallOpts, streamId)
}

// GetStream is a free data retrieval call binding the contract method 0x1290abe8.
//
// Solidity: function getStream(bytes32 streamId) view returns((bytes32,uint64,uint64,uint64,address[]) stream)
func (_MockRiverRegistry *MockRiverRegistryCallerSession) GetStream(streamId [32]byte) (Stream, error) {
	return _MockRiverRegistry.Contract.GetStream(&_MockRiverRegistry.CallOpts, streamId)
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
// Solidity: function getStreamCountOnNode(address nodeAddress) view returns(uint256 count)
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
// Solidity: function getStreamCountOnNode(address nodeAddress) view returns(uint256 count)
func (_MockRiverRegistry *MockRiverRegistrySession) GetStreamCountOnNode(nodeAddress common.Address) (*big.Int, error) {
	return _MockRiverRegistry.Contract.GetStreamCountOnNode(&_MockRiverRegistry.CallOpts, nodeAddress)
}

// GetStreamCountOnNode is a free data retrieval call binding the contract method 0xc87d1324.
//
// Solidity: function getStreamCountOnNode(address nodeAddress) view returns(uint256 count)
func (_MockRiverRegistry *MockRiverRegistryCallerSession) GetStreamCountOnNode(nodeAddress common.Address) (*big.Int, error) {
	return _MockRiverRegistry.Contract.GetStreamCountOnNode(&_MockRiverRegistry.CallOpts, nodeAddress)
}

// GetStreamWithGenesis is a free data retrieval call binding the contract method 0x3c2544d1.
//
// Solidity: function getStreamWithGenesis(bytes32 streamId) view returns((bytes32,uint64,uint64,uint64,address[]) stream, bytes32, bytes)
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
// Solidity: function getStreamWithGenesis(bytes32 streamId) view returns((bytes32,uint64,uint64,uint64,address[]) stream, bytes32, bytes)
func (_MockRiverRegistry *MockRiverRegistrySession) GetStreamWithGenesis(streamId [32]byte) (Stream, [32]byte, []byte, error) {
	return _MockRiverRegistry.Contract.GetStreamWithGenesis(&_MockRiverRegistry.CallOpts, streamId)
}

// GetStreamWithGenesis is a free data retrieval call binding the contract method 0x3c2544d1.
//
// Solidity: function getStreamWithGenesis(bytes32 streamId) view returns((bytes32,uint64,uint64,uint64,address[]) stream, bytes32, bytes)
func (_MockRiverRegistry *MockRiverRegistryCallerSession) GetStreamWithGenesis(streamId [32]byte) (Stream, [32]byte, []byte, error) {
	return _MockRiverRegistry.Contract.GetStreamWithGenesis(&_MockRiverRegistry.CallOpts, streamId)
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

// IsNode is a free data retrieval call binding the contract method 0x01750152.
//
// Solidity: function isNode(address nodeAddress) view returns(bool)
func (_MockRiverRegistry *MockRiverRegistryCaller) IsNode(opts *bind.CallOpts, nodeAddress common.Address) (bool, error) {
	var out []interface{}
	err := _MockRiverRegistry.contract.Call(opts, &out, "isNode", nodeAddress)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsNode is a free data retrieval call binding the contract method 0x01750152.
//
// Solidity: function isNode(address nodeAddress) view returns(bool)
func (_MockRiverRegistry *MockRiverRegistrySession) IsNode(nodeAddress common.Address) (bool, error) {
	return _MockRiverRegistry.Contract.IsNode(&_MockRiverRegistry.CallOpts, nodeAddress)
}

// IsNode is a free data retrieval call binding the contract method 0x01750152.
//
// Solidity: function isNode(address nodeAddress) view returns(bool)
func (_MockRiverRegistry *MockRiverRegistryCallerSession) IsNode(nodeAddress common.Address) (bool, error) {
	return _MockRiverRegistry.Contract.IsNode(&_MockRiverRegistry.CallOpts, nodeAddress)
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

// IsStream is a free data retrieval call binding the contract method 0xd0c27c4f.
//
// Solidity: function isStream(bytes32 streamId) view returns(bool)
func (_MockRiverRegistry *MockRiverRegistryCaller) IsStream(opts *bind.CallOpts, streamId [32]byte) (bool, error) {
	var out []interface{}
	err := _MockRiverRegistry.contract.Call(opts, &out, "isStream", streamId)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsStream is a free data retrieval call binding the contract method 0xd0c27c4f.
//
// Solidity: function isStream(bytes32 streamId) view returns(bool)
func (_MockRiverRegistry *MockRiverRegistrySession) IsStream(streamId [32]byte) (bool, error) {
	return _MockRiverRegistry.Contract.IsStream(&_MockRiverRegistry.CallOpts, streamId)
}

// IsStream is a free data retrieval call binding the contract method 0xd0c27c4f.
//
// Solidity: function isStream(bytes32 streamId) view returns(bool)
func (_MockRiverRegistry *MockRiverRegistryCallerSession) IsStream(streamId [32]byte) (bool, error) {
	return _MockRiverRegistry.Contract.IsStream(&_MockRiverRegistry.CallOpts, streamId)
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

// AddStream is a paid mutator transaction binding the contract method 0xb2e76b8e.
//
// Solidity: function addStream(bytes32 streamId, bytes32 genesisMiniblockHash, (bytes32,uint64,uint64,uint64,address[]) stream) returns()
func (_MockRiverRegistry *MockRiverRegistryTransactor) AddStream(opts *bind.TransactOpts, streamId [32]byte, genesisMiniblockHash [32]byte, stream Stream) (*types.Transaction, error) {
	return _MockRiverRegistry.contract.Transact(opts, "addStream", streamId, genesisMiniblockHash, stream)
}

// AddStream is a paid mutator transaction binding the contract method 0xb2e76b8e.
//
// Solidity: function addStream(bytes32 streamId, bytes32 genesisMiniblockHash, (bytes32,uint64,uint64,uint64,address[]) stream) returns()
func (_MockRiverRegistry *MockRiverRegistrySession) AddStream(streamId [32]byte, genesisMiniblockHash [32]byte, stream Stream) (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.AddStream(&_MockRiverRegistry.TransactOpts, streamId, genesisMiniblockHash, stream)
}

// AddStream is a paid mutator transaction binding the contract method 0xb2e76b8e.
//
// Solidity: function addStream(bytes32 streamId, bytes32 genesisMiniblockHash, (bytes32,uint64,uint64,uint64,address[]) stream) returns()
func (_MockRiverRegistry *MockRiverRegistryTransactorSession) AddStream(streamId [32]byte, genesisMiniblockHash [32]byte, stream Stream) (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.AddStream(&_MockRiverRegistry.TransactOpts, streamId, genesisMiniblockHash, stream)
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

// SyncNodesOnStreams is a paid mutator transaction binding the contract method 0x03cc8793.
//
// Solidity: function syncNodesOnStreams(uint256 start, uint256 stop) returns()
func (_MockRiverRegistry *MockRiverRegistryTransactor) SyncNodesOnStreams(opts *bind.TransactOpts, start *big.Int, stop *big.Int) (*types.Transaction, error) {
	return _MockRiverRegistry.contract.Transact(opts, "syncNodesOnStreams", start, stop)
}

// SyncNodesOnStreams is a paid mutator transaction binding the contract method 0x03cc8793.
//
// Solidity: function syncNodesOnStreams(uint256 start, uint256 stop) returns()
func (_MockRiverRegistry *MockRiverRegistrySession) SyncNodesOnStreams(start *big.Int, stop *big.Int) (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.SyncNodesOnStreams(&_MockRiverRegistry.TransactOpts, start, stop)
}

// SyncNodesOnStreams is a paid mutator transaction binding the contract method 0x03cc8793.
//
// Solidity: function syncNodesOnStreams(uint256 start, uint256 stop) returns()
func (_MockRiverRegistry *MockRiverRegistryTransactorSession) SyncNodesOnStreams(start *big.Int, stop *big.Int) (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.SyncNodesOnStreams(&_MockRiverRegistry.TransactOpts, start, stop)
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

// MockRiverRegistryStreamCreatedIterator is returned from FilterStreamCreated and is used to iterate over the raw logs and unpacked data for StreamCreated events raised by the MockRiverRegistry contract.
type MockRiverRegistryStreamCreatedIterator struct {
	Event *MockRiverRegistryStreamCreated // Event containing the contract specifics and raw log

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
func (it *MockRiverRegistryStreamCreatedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockRiverRegistryStreamCreated)
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
		it.Event = new(MockRiverRegistryStreamCreated)
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
func (it *MockRiverRegistryStreamCreatedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockRiverRegistryStreamCreatedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockRiverRegistryStreamCreated represents a StreamCreated event raised by the MockRiverRegistry contract.
type MockRiverRegistryStreamCreated struct {
	StreamId             [32]byte
	GenesisMiniblockHash [32]byte
	Stream               Stream
	Raw                  types.Log // Blockchain specific contextual infos
}

// FilterStreamCreated is a free log retrieval operation binding the contract event 0xac1b69e6e0382c43def3cccabf63091ba47b5d8b10a705d16a1076668643fe4d.
//
// Solidity: event StreamCreated(bytes32 streamId, bytes32 genesisMiniblockHash, (bytes32,uint64,uint64,uint64,address[]) stream)
func (_MockRiverRegistry *MockRiverRegistryFilterer) FilterStreamCreated(opts *bind.FilterOpts) (*MockRiverRegistryStreamCreatedIterator, error) {

	logs, sub, err := _MockRiverRegistry.contract.FilterLogs(opts, "StreamCreated")
	if err != nil {
		return nil, err
	}
	return &MockRiverRegistryStreamCreatedIterator{contract: _MockRiverRegistry.contract, event: "StreamCreated", logs: logs, sub: sub}, nil
}

// WatchStreamCreated is a free log subscription operation binding the contract event 0xac1b69e6e0382c43def3cccabf63091ba47b5d8b10a705d16a1076668643fe4d.
//
// Solidity: event StreamCreated(bytes32 streamId, bytes32 genesisMiniblockHash, (bytes32,uint64,uint64,uint64,address[]) stream)
func (_MockRiverRegistry *MockRiverRegistryFilterer) WatchStreamCreated(opts *bind.WatchOpts, sink chan<- *MockRiverRegistryStreamCreated) (event.Subscription, error) {

	logs, sub, err := _MockRiverRegistry.contract.WatchLogs(opts, "StreamCreated")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockRiverRegistryStreamCreated)
				if err := _MockRiverRegistry.contract.UnpackLog(event, "StreamCreated", log); err != nil {
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

// ParseStreamCreated is a log parse operation binding the contract event 0xac1b69e6e0382c43def3cccabf63091ba47b5d8b10a705d16a1076668643fe4d.
//
// Solidity: event StreamCreated(bytes32 streamId, bytes32 genesisMiniblockHash, (bytes32,uint64,uint64,uint64,address[]) stream)
func (_MockRiverRegistry *MockRiverRegistryFilterer) ParseStreamCreated(log types.Log) (*MockRiverRegistryStreamCreated, error) {
	event := new(MockRiverRegistryStreamCreated)
	if err := _MockRiverRegistry.contract.UnpackLog(event, "StreamCreated", log); err != nil {
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
