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
	Status         uint8
	Url            string
	NodeAddress    common.Address
	Operator       common.Address
	PermanentIndex uint32
	CometBftPubKey [32]byte
}

// SetMiniblock is an auto generated low-level Go binding around an user-defined struct.
type SetMiniblock struct {
	StreamId          [32]byte
	PrevMiniBlockHash [32]byte
	LastMiniblockHash [32]byte
	LastMiniblockNum  uint64
	IsSealed          bool
}

// SetStreamReplicationFactor is an auto generated low-level Go binding around an user-defined struct.
type SetStreamReplicationFactor struct {
	StreamId          [32]byte
	Nodes             []common.Address
	ReplicationFactor uint8
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
	ABI: "[{\"type\":\"constructor\",\"inputs\":[{\"name\":\"approvedOperators\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"stateMutability\":\"payable\"},{\"type\":\"function\",\"name\":\"__OperatorRegistry_init\",\"inputs\":[{\"name\":\"initialOperators\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"__RiverConfig_init\",\"inputs\":[{\"name\":\"configManagers\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"addStream\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"genesisMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"stream\",\"type\":\"tuple\",\"internalType\":\"structStream\",\"components\":[{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"reserved0\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"flags\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"}]}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"allocateStream\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"},{\"name\":\"genesisMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"genesisMiniblock\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"approveConfigurationManager\",\"inputs\":[{\"name\":\"manager\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"approveOperator\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"backfillPermanentIndices\",\"inputs\":[],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"configurationExists\",\"inputs\":[{\"name\":\"key\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"deleteConfiguration\",\"inputs\":[{\"name\":\"key\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"deleteConfigurationOnBlock\",\"inputs\":[{\"name\":\"key\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"blockNumber\",\"type\":\"uint64\",\"internalType\":\"uint64\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"getAllConfiguration\",\"inputs\":[],\"outputs\":[{\"name\":\"settings\",\"type\":\"tuple[]\",\"internalType\":\"structSetting[]\",\"components\":[{\"name\":\"key\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"blockNumber\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"value\",\"type\":\"bytes\",\"internalType\":\"bytes\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getAllNodeAddresses\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getAllNodes\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"tuple[]\",\"internalType\":\"structNode[]\",\"components\":[{\"name\":\"status\",\"type\":\"uint8\",\"internalType\":\"enumNodeStatus\"},{\"name\":\"url\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"permanentIndex\",\"type\":\"uint32\",\"internalType\":\"uint32\"},{\"name\":\"cometBftPubKey\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getAllOperators\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getConfiguration\",\"inputs\":[{\"name\":\"key\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple[]\",\"internalType\":\"structSetting[]\",\"components\":[{\"name\":\"key\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"blockNumber\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"value\",\"type\":\"bytes\",\"internalType\":\"bytes\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getLastNodeIndex\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint32\",\"internalType\":\"uint32\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getNode\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple\",\"internalType\":\"structNode\",\"components\":[{\"name\":\"status\",\"type\":\"uint8\",\"internalType\":\"enumNodeStatus\"},{\"name\":\"url\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"permanentIndex\",\"type\":\"uint32\",\"internalType\":\"uint32\"},{\"name\":\"cometBftPubKey\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getNodeCount\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getPaginatedStreams\",\"inputs\":[{\"name\":\"start\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"stop\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple[]\",\"internalType\":\"structStreamWithId[]\",\"components\":[{\"name\":\"id\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"stream\",\"type\":\"tuple\",\"internalType\":\"structStream\",\"components\":[{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"reserved0\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"flags\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"}]}]},{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getPaginatedStreamsOnNode\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"start\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"stop\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"streams\",\"type\":\"tuple[]\",\"internalType\":\"structStreamWithId[]\",\"components\":[{\"name\":\"id\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"stream\",\"type\":\"tuple\",\"internalType\":\"structStream\",\"components\":[{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"reserved0\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"flags\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"}]}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getStream\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"stream\",\"type\":\"tuple\",\"internalType\":\"structStream\",\"components\":[{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"reserved0\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"flags\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getStreamCount\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getStreamCountOnNode\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"count\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getStreamWithGenesis\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"stream\",\"type\":\"tuple\",\"internalType\":\"structStream\",\"components\":[{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"reserved0\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"flags\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"}]},{\"name\":\"\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"isConfigurationManager\",\"inputs\":[{\"name\":\"manager\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"isNode\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"isOperator\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"isStream\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"placeStreamOnNode\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"registerNode\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"url\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"status\",\"type\":\"uint8\",\"internalType\":\"enumNodeStatus\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"removeConfigurationManager\",\"inputs\":[{\"name\":\"manager\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"removeNode\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"removeOperator\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"removeStreamFromNode\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setConfiguration\",\"inputs\":[{\"name\":\"key\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"blockNumber\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"value\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setNodeCometBftPubKey\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"cometBftPubKey\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setStreamLastMiniblockBatch\",\"inputs\":[{\"name\":\"miniblocks\",\"type\":\"tuple[]\",\"internalType\":\"structSetMiniblock[]\",\"components\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"prevMiniBlockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"isSealed\",\"type\":\"bool\",\"internalType\":\"bool\"}]}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setStreamReplicationFactor\",\"inputs\":[{\"name\":\"requests\",\"type\":\"tuple[]\",\"internalType\":\"structSetStreamReplicationFactor[]\",\"components\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"},{\"name\":\"replicationFactor\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"syncNodesOnStreams\",\"inputs\":[{\"name\":\"start\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"stop\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"updateNodeStatus\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"status\",\"type\":\"uint8\",\"internalType\":\"enumNodeStatus\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"updateNodeUrl\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"url\",\"type\":\"string\",\"internalType\":\"string\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"ConfigurationChanged\",\"inputs\":[{\"name\":\"key\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"block\",\"type\":\"uint64\",\"indexed\":false,\"internalType\":\"uint64\"},{\"name\":\"value\",\"type\":\"bytes\",\"indexed\":false,\"internalType\":\"bytes\"},{\"name\":\"deleted\",\"type\":\"bool\",\"indexed\":false,\"internalType\":\"bool\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"ConfigurationManagerAdded\",\"inputs\":[{\"name\":\"manager\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"ConfigurationManagerRemoved\",\"inputs\":[{\"name\":\"manager\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Initialized\",\"inputs\":[{\"name\":\"version\",\"type\":\"uint32\",\"indexed\":false,\"internalType\":\"uint32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceAdded\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceRemoved\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"NodeAdded\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"operator\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"url\",\"type\":\"string\",\"indexed\":false,\"internalType\":\"string\"},{\"name\":\"status\",\"type\":\"uint8\",\"indexed\":false,\"internalType\":\"enumNodeStatus\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"NodeCometBftPubKeyUpdated\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"cometBftPubKey\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"NodeRemoved\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"NodeStatusUpdated\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"status\",\"type\":\"uint8\",\"indexed\":false,\"internalType\":\"enumNodeStatus\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"NodeUrlUpdated\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"url\",\"type\":\"string\",\"indexed\":false,\"internalType\":\"string\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"OperatorAdded\",\"inputs\":[{\"name\":\"operatorAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"OperatorRemoved\",\"inputs\":[{\"name\":\"operatorAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"OwnershipTransferred\",\"inputs\":[{\"name\":\"previousOwner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"newOwner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"StreamLastMiniblockUpdateFailed\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"indexed\":false,\"internalType\":\"uint64\"},{\"name\":\"reason\",\"type\":\"string\",\"indexed\":false,\"internalType\":\"string\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"StreamUpdated\",\"inputs\":[{\"name\":\"eventType\",\"type\":\"uint8\",\"indexed\":true,\"internalType\":\"enumIStreamRegistryBase.StreamEventType\"},{\"name\":\"data\",\"type\":\"bytes\",\"indexed\":false,\"internalType\":\"bytes\"}],\"anonymous\":false},{\"type\":\"error\",\"name\":\"Initializable_InInitializingState\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Initializable_NotInInitializingState\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_AlreadySupported\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_NotSupported\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Ownable__NotOwner\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"Ownable__ZeroAddress\",\"inputs\":[]}]",
	Bin: "0x608060405260405161613738038061613783398101604081905261002291610416565b61002a610085565b6100333361012b565b80515f5b8181101561007d575f838281518110610052576100526104e0565b6020026020010151905061006b816101cf60201b60201c565b61007481610282565b50600101610037565b5050506104f4565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef520008054640100000000900460ff16156100d1576040516366008a2d60e01b815260040160405180910390fd5b805463ffffffff908116101561012857805463ffffffff191663ffffffff90811782556040519081527fe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c9060200160405180910390a15b50565b5f61014a5f5160206161175f395f51905f52546001600160a01b031690565b90506001600160a01b03821661017357604051634e3ef82560e01b815260040160405180910390fd5b815f5160206161175f395f51905f5280546001600160a01b0319166001600160a01b03928316179055604051838216918316907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0905f90a35050565b6001600160a01b038116610204576040805180820190915260078152664241445f41524760c81b60208201526102049061032a565b61020d8161034d565b156102405760408051808201909152600e81526d414c52454144595f45584953545360901b60208201526102409061032a565b61024b60088261035f565b506040516001600160a01b038216907fac6fa858e9350a46cec16539926e0fde25b7629f84b5a72bffaae4df888ae86d905f90a250565b6001600160a01b0381166102b7576040805180820190915260078152664241445f41524760c81b60208201526102b79061032a565b6102c2600d8261035f565b6102f45760408051808201909152600e81526d414c52454144595f45584953545360901b60208201526102f49061032a565b6040516001600160a01b038216907f7afd798379ae2d2e5035438544cea2b60eb1dde6a8128e6d447fd2a25f8825a2905f90a250565b6308c379a06040820352602080820352601f19601f825101166044810160248303fd5b5f61035960088361037a565b92915050565b5f610373836001600160a01b03841661039b565b9392505050565b6001600160a01b0381165f9081526001830160205260408120541515610373565b5f8181526001830160205260408120546103e057508154600181810184555f848152602080822090930184905584548482528286019093526040902091909155610359565b505f610359565b634e487b7160e01b5f52604160045260245ffd5b80516001600160a01b0381168114610411575f5ffd5b919050565b5f60208284031215610426575f5ffd5b81516001600160401b0381111561043b575f5ffd5b8201601f8101841361044b575f5ffd5b80516001600160401b03811115610464576104646103e7565b604051600582901b90603f8201601f191681016001600160401b0381118282101715610492576104926103e7565b6040529182526020818401810192908101878411156104af575f5ffd5b6020850194505b838510156104d5576104c7856103fb565b8152602094850194016104b6565b509695505050505050565b634e487b7160e01b5f52603260045260245ffd5b615c16806105015f395ff3fe608060405234801561000f575f5ffd5b50600436106102c2575f3560e01c80639d2090481161017c578063c179b85f116100dd578063d4bd44a011610093578063eecc66f41161006e578063eecc66f41461060a578063fc207c011461061d578063ff3a14ab14610630575f5ffd5b8063d4bd44a0146105dc578063d911c632146105ef578063ee885b12146105f7575f5ffd5b8063c8fe3a01116100c3578063c8fe3a0114610593578063ca78c41a146105a8578063d0c27c4f146105c9575f5ffd5b8063c179b85f1461056d578063c87d132414610580575f5ffd5b8063b2b99ec911610132578063b7f227ee11610118578063b7f227ee1461053f578063ba428b1a14610552578063c0f2208414610565575f5ffd5b8063b2b99ec914610519578063b2e76b8e1461052c575f5ffd5b8063a09449a611610162578063a09449a6146104de578063a1174e7d146104f1578063ac8a584a14610506575f5ffd5b80639d209048146104ab5780639ee86d38146104cb575f5ffd5b80633c2544d1116102265780636b883c39116101dc5780637e4465e7116101c25780637e4465e714610472578063813049ec146104855780639283ae3a14610498575f5ffd5b80636b883c391461044c5780636d70f7ae1461045f575f5ffd5b8063581f8b9b1161020c578063581f8b9b1461041e5780635c665ce9146104315780636242457614610444575f5ffd5b80633c2544d1146103e457806344be9beb14610406575f5ffd5b806322bbda641161027b5780632936781a116102615780632936781a146103a857806331374511146103bb57806339bf397e146103ce575f5ffd5b806322bbda6414610375578063242cae9f14610395575f5ffd5b806303cc8793116102ab57806303cc87931461032d578063081814db146103405780631290abe814610355575f5ffd5b806301750152146102c6578063035759e114610318575b5f5ffd5b6103036102d4366004614642565b73ffffffffffffffffffffffffffffffffffffffff9081165f9081526007602052604090206002015416151590565b60405190151581526020015b60405180910390f35b61032b61032636600461465d565b610643565b005b61032b61033b366004614674565b61075b565b6103486107c2565b60405161030f91906146e0565b61036861036336600461465d565b6109f3565b60405161030f9190614836565b610388610383366004614848565b610b1c565b60405161030f9190614909565b61032b6103a3366004614642565b610cd6565b61032b6103b636600461491b565b610d59565b61032b6103c9366004614986565b610e8a565b6103d6610f2e565b60405190815260200161030f565b6103f76103f236600461465d565b610f3e565b60405161030f939291906149c5565b60115460405163ffffffff909116815260200161030f565b61032b61042c366004614a0c565b611113565b61032b61043f366004614986565b611314565b61032b611595565b61032b61045a366004614a7d565b6116f0565b61030361046d366004614642565b611863565b61032b610480366004614bd5565b611875565b61032b610493366004614642565b611ab9565b6103486104a636600461465d565b611c14565b6104be6104b9366004614642565b611d7b565b60405161030f9190614d13565b61032b6104d9366004614d25565b611f49565b61032b6104ec366004614d68565b612188565b6104f9612477565b60405161030f9190614dc0565b61032b610514366004614642565b6126ae565b61032b610527366004614642565b61286f565b61032b61053a366004614e35565b612ad0565b61032b61054d366004614e87565b612bba565b61032b610560366004614986565b612e38565b6103d6612edc565b61032b61057b366004614642565b612ee6565b6103d661058e366004614642565b612f61565b61059b612f8e565b60405161030f9190614eaa565b6105bb6105b6366004614674565b612f9a565b60405161030f929190614f02565b6103036105d736600461465d565b613132565b6103036105ea366004614642565b61313d565b61059b613149565b61032b610605366004614d25565b613155565b61032b610618366004614f25565b613430565b61030361062b36600461465d565b613723565b61032b61063e366004614f81565b61372f565b3361064f600d82613bce565b610691576106916040518060400160405280600881526020017f4241445f41555448000000000000000000000000000000000000000000000000815250613bff565b8161069d600a82613c22565b6106df576106df6040518060400160405280600981526020017f4e4f545f464f554e440000000000000000000000000000000000000000000000815250613bff565b5f838152600c602052604081206106f591614484565b610700600a84613c39565b506040805184815267ffffffffffffffff602082015260808183018190525f908201526001606082015290517fc01483261a841a868b99cb8802faed4ea44a1a816651c4f7ee061a96a205fe989181900360a00190a1505050565b5f8061076681613c44565b838118908411028318848111908590030284019150505b808310156107bd575f6107908185613c4d565b5f8181526002602081905260409091209192506107b09083908301613c58565b505082600101925061077d565b505050565b60605f806107d0600a613c44565b90505f5b8181101561080e575f6107e8600a83613c4d565b5f818152600c6020526040902054909150610803908561501f565b9350506001016107d4565b508167ffffffffffffffff81111561082857610828614aff565b60405190808252806020026020018201604052801561087457816020015b60408051606080820183525f8083526020830152918101919091528152602001906001900390816108465790505b5092505f610882600a613c44565b90505f805b828110156109eb575f61089b600a83613c4d565b5f818152600c60205260408120805492935091905b818110156109dc578281815481106108ca576108ca615032565b905f5260205f2090600302016040518060600160405290815f8201548152602001600182015f9054906101000a900467ffffffffffffffff1667ffffffffffffffff1667ffffffffffffffff16815260200160028201805461092b9061505f565b80601f01602080910402602001604051908101604052809291908181526020018280546109579061505f565b80156109a25780601f10610979576101008083540402835291602001916109a2565b820191905f5260205f20905b81548152906001019060200180831161098557829003601f168201915b5050505050815250508a87806109b7906150aa565b9850815181106109c9576109c9615032565b60209081029190910101526001016108b0565b50505050806001019050610887565b505050505090565b610a3f6040518060a001604052805f81526020015f67ffffffffffffffff1681526020015f67ffffffffffffffff1681526020015f67ffffffffffffffff168152602001606081525090565b80604052610a4c82613cc4565b5f82815260026020818152604092839020835160a08101855281548152600182015467ffffffffffffffff808216838601526801000000000000000082048116838801527001000000000000000000000000000000009091041660608201529281018054855181850281018501909652808652939491936080860193830182828015610b0c57602002820191905f5260205f20905b815473ffffffffffffffffffffffffffffffffffffffff168152600190910190602001808311610ae1575b5050505050815250509050919050565b73ffffffffffffffffffffffffffffffffffffffff83165f908152601060205260408120606091610b4c82613c44565b9050838118818511028418858111868203028067ffffffffffffffff811115610b7757610b77614aff565b604051908082528060200260200182016040528015610bb057816020015b610b9d6144a2565b815260200190600190039081610b955790505b5094505f5b81811015610cca575f868281518110610bd057610bd0615032565b60200260200101519050610bef828a0187613c4d90919063ffffffff16565b8082525f90815260026020818152604092839020835160a08101855281548152600182015467ffffffffffffffff808216838601526801000000000000000082048116838801527001000000000000000000000000000000009091041660608201529281018054855181850281018501909652808652939491936080860193830182828015610cb257602002820191905f5260205f20905b815473ffffffffffffffffffffffffffffffffffffffff168152600190910190602001808311610c87575b50505091909252505050602090910152600101610bb5565b50505050509392505050565b7f4675fa8241f86f37157864d3d49b85ad4b164352c516da28e1678a90470ae3005473ffffffffffffffffffffffffffffffffffffffff163314610d4d576040517f65f490650000000000000000000000000000000000000000000000000000000081523360048201526024015b60405180910390fd5b610d5681613d10565b50565b73ffffffffffffffffffffffffffffffffffffffff8083165f90815260076020526040902060020154839116610dc757610dc76040518060400160405280600e81526020017f4e4f44455f4e4f545f464f554e44000000000000000000000000000000000000815250613bff565b3373ffffffffffffffffffffffffffffffffffffffff841614610e2257610e226040518060400160405280600881526020017f4241445f41555448000000000000000000000000000000000000000000000000815250613bff565b73ffffffffffffffffffffffffffffffffffffffff83165f818152600760209081526040918290206004810186905591518581529192917f59fdfe8dc31c73e0c191476c7185d5dd1242052b47edc1de5a45c770cc0e7edc910160405180910390a250505050565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef5200054640100000000900460ff16610eed576040517f77a399b800000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b5f5b818110156107bd57610f26838383818110610f0c57610f0c615032565b9050602002016020810190610f219190614642565b613e04565b600101610eef565b5f610f396005613c44565b905090565b610f8a6040518060a001604052805f81526020015f67ffffffffffffffff1681526020015f67ffffffffffffffff1681526020015f67ffffffffffffffff168152602001606081525090565b5f606082604052610f9a84613cc4565b5f84815260026020818152604080842060048352818520546003845294829020825160a08101845282548152600183015467ffffffffffffffff808216838801526801000000000000000082048116838701527001000000000000000000000000000000009091041660608201529482018054845181870281018701909552808552929695919491938793608086019391929183018282801561107157602002820191905f5260205f20905b815473ffffffffffffffffffffffffffffffffffffffff168152600190910190602001808311611046575b50505050508152505092508080546110889061505f565b80601f01602080910402602001604051908101604052809291908181526020018280546110b49061505f565b80156110ff5780601f106110d6576101008083540402835291602001916110ff565b820191905f5260205f20905b8154815290600101906020018083116110e257829003601f168201915b505050505090509250925092509193909250565b73ffffffffffffffffffffffffffffffffffffffff8083165f90815260076020526040902060020154839116611181576111816040518060400160405280600e81526020017f4e4f44455f4e4f545f464f554e44000000000000000000000000000000000000815250613bff565b3361118d600882613bce565b6111cf576111cf6040518060400160405280600881526020017f4241445f41555448000000000000000000000000000000000000000000000000815250613bff565b73ffffffffffffffffffffffffffffffffffffffff8085165f9081526007602052604090206003015485913391168114611241576112416040518060400160405280600881526020017f4241445f41555448000000000000000000000000000000000000000000000000815250613bff565b73ffffffffffffffffffffffffffffffffffffffff86165f90815260076020526040902080546112749060ff1687613eed565b8054869082907fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff001660018360058111156112b0576112b0614c22565b0217905550600281015460405173ffffffffffffffffffffffffffffffffffffffff909116907f20891cc7622c7951cbd8c70c61a5201eb45625b8c00e8f6c986cfca78f3dbfa0906113039089906150e1565b60405180910390a250505050505050565b33611320600d82613bce565b611362576113626040518060400160405280600881526020017f4241445f41555448000000000000000000000000000000000000000000000000815250613bff565b815f8190036113a9576113a96040518060400160405280600781526020017f4241445f41524700000000000000000000000000000000000000000000000000815250613bff565b5f5b8181101561158e57368585838181106113c6576113c6615032565b90506020028101906113d891906150ef565b90506113ea606082016040830161512b565b60ff1615806114185750611401602082018261514b565b9050611413606083016040840161512b565b60ff16115b1561145b5761145b6040518060400160405280600781526020017f4241445f41524700000000000000000000000000000000000000000000000000815250613bff565b6114658135613cc4565b80355f81815260026020819052604090912091611483918301614099565b61149a8235611495602085018561514b565b6140ff565b6114a7602083018361514b565b60018301546115029068010000000000000000900467ffffffffffffffff166114d6606087016040880161512b565b60ff167fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00919091161790565b6001840180547fffffffffffffffffffffffffffffffff0000000000000000ffffffffffffffff166801000000000000000067ffffffffffffffff841602179055611551600285018484614504565b505050506115846002835f0135836040516020016115709291906151af565b60405160208183030381529060405261416b565b50506001016113ab565b5050505050565b60115463ffffffff16156115e1576115e16040518060400160405280600e81526020017f414c52454144595f455849535453000000000000000000000000000000000000815250613bff565b5f6115ec6005613c44565b90505f805b828110156116b7575f611605600583613c4d565b73ffffffffffffffffffffffffffffffffffffffff81165f90815260076020526040812060038101549293509174010000000000000000000000000000000000000000900463ffffffff1690036116ad57836116608161526a565b6003830180547fffffffffffffffff00000000ffffffffffffffffffffffffffffffffffffffff167401000000000000000000000000000000000000000063ffffffff8416021790559450505b50506001016115f1565b50601180547fffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000001663ffffffff9290921691909117905550565b335f8181526007602052604090206002015473ffffffffffffffffffffffffffffffffffffffff1661175a5761175a6040518060400160405280600e81526020017f4e4f44455f4e4f545f464f554e44000000000000000000000000000000000000815250613bff565b86611764816141a9565b868661177082826141f6565b5f8a8152600260205260409020600181015488908b908b9067ffffffffffffff00680100000000000000009091041660ff8216176001850180547fffffffffffffffffffffffffffffffff0000000000000000ffffffffffffffff166801000000000000000067ffffffffffffffff841602179055845f6117f5600283018686614504565b5050939093555061180a91505f90508c61427d565b505f8b81526003602052604090206118238789836152d9565b505f8b815260046020526040902088905561183f8b8b8b6140ff565b6118565f8c836040516020016115709291906151af565b5050505050505050505050565b5f61186f600883613bce565b92915050565b33611881600882613bce565b6118c3576118c36040518060400160405280600881526020017f4241445f41555448000000000000000000000000000000000000000000000000815250613bff565b73ffffffffffffffffffffffffffffffffffffffff8084165f90815260076020526040902060020154849116611931576119316040518060400160405280600e81526020017f4e4f44455f4e4f545f464f554e44000000000000000000000000000000000000815250613bff565b73ffffffffffffffffffffffffffffffffffffffff8085165f90815260076020526040902060030154859133911681146119a3576119a36040518060400160405280600881526020017f4241445f41555448000000000000000000000000000000000000000000000000815250613bff565b73ffffffffffffffffffffffffffffffffffffffff86165f9081526007602090815260409182902091516119d9918891016153ef565b6040516020818303038152906040528051906020012081600101604051602001611a039190615405565b6040516020818303038152906040528051906020012003611a5c57611a5c6040518060400160405280600781526020017f4241445f41524700000000000000000000000000000000000000000000000000815250613bff565b60018101611a6a8782615494565b50600281015460405173ffffffffffffffffffffffffffffffffffffffff909116907f4505168a8705a16fd4d0575197fd0f510db69df93a065e158ad2c0957ba12bac906113039089906155ae565b7f4675fa8241f86f37157864d3d49b85ad4b164352c516da28e1678a90470ae3005473ffffffffffffffffffffffffffffffffffffffff163314611b2b576040517f65f49065000000000000000000000000000000000000000000000000000000008152336004820152602401610d44565b73ffffffffffffffffffffffffffffffffffffffff8116611b8457611b846040518060400160405280600781526020017f4241445f41524700000000000000000000000000000000000000000000000000815250613bff565b611b8f600d82614288565b611bd157611bd16040518060400160405280600981526020017f4e4f545f464f554e440000000000000000000000000000000000000000000000815250613bff565b60405173ffffffffffffffffffffffffffffffffffffffff8216907ff9889c857e5356066b564327caa757c325ecbc001b2b47d72edf8cf9aedb1be5905f90a250565b606081611c22600a82613c22565b611c6457611c646040518060400160405280600981526020017f4e4f545f464f554e440000000000000000000000000000000000000000000000815250613bff565b5f838152600c6020908152604080832080548251818502810185019093528083529193909284015b82821015611d6e575f848152602090819020604080516060810182526003860290920180548352600181015467ffffffffffffffff169383019390935260028301805492939291840191611cdf9061505f565b80601f0160208091040260200160405190810160405280929190818152602001828054611d0b9061505f565b8015611d565780601f10611d2d57610100808354040283529160200191611d56565b820191905f5260205f20905b815481529060010190602001808311611d3957829003601f168201915b50505050508152505081526020019060010190611c8c565b5050505091505b50919050565b6040805160c0810182525f8082526060602083018190529282018190529181018290526080810182905260a0810191909152611db8600583613bce565b611dfa57611dfa6040518060400160405280600e81526020017f4e4f44455f4e4f545f464f554e44000000000000000000000000000000000000815250613bff565b73ffffffffffffffffffffffffffffffffffffffff82165f9081526007602052604090819020815160c081019092528054829060ff166005811115611e4157611e41614c22565b6005811115611e5257611e52614c22565b8152602001600182018054611e669061505f565b80601f0160208091040260200160405190810160405280929190818152602001828054611e929061505f565b8015611edd5780601f10611eb457610100808354040283529160200191611edd565b820191905f5260205f20905b815481529060010190602001808311611ec057829003601f168201915b5050509183525050600282015473ffffffffffffffffffffffffffffffffffffffff90811660208301526003830154908116604083015274010000000000000000000000000000000000000000900463ffffffff16606082015260049091015460809091015292915050565b81611f5381613cc4565b335f8181526007602052604090206002015473ffffffffffffffffffffffffffffffffffffffff16611fbd57611fbd6040518060400160405280600e81526020017f4e4f44455f4e4f545f464f554e44000000000000000000000000000000000000815250613bff565b5f84815260026020818152604080842073ffffffffffffffffffffffffffffffffffffffff88168552601090925290922090820190611ffc908761427d565b5080545f5b8181101561209e578673ffffffffffffffffffffffffffffffffffffffff1683828154811061203257612032615032565b5f9182526020909120015473ffffffffffffffffffffffffffffffffffffffff1603612096576120966040518060400160405280600e81526020017f414c52454144595f455849535453000000000000000000000000000000000000815250613bff565b600101612001565b508154600180820184555f8481526020902090910180547fffffffffffffffffffffffff00000000000000000000000000000000000000001673ffffffffffffffffffffffffffffffffffffffff8916179055830154825461213d9168010000000000000000900467ffffffffffffffff169060ff167fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00919091161790565b8360010160086101000a81548167ffffffffffffffff021916908367ffffffffffffffff16021790555061217f600288856040516020016115709291906151af565b50505050505050565b33612194600d82613bce565b6121d6576121d66040518060400160405280600881526020017f4241445f41555448000000000000000000000000000000000000000000000000815250613bff565b7fffffffffffffffffffffffffffffffffffffffffffffffff000000000000000167ffffffffffffffff851601612245576122456040518060400160405280600781526020017f4241445f41524700000000000000000000000000000000000000000000000000815250613bff565b5f82900361228b5761228b6040518060400160405280600781526020017f4241445f41524700000000000000000000000000000000000000000000000000815250613bff565b612296600a86613c22565b6122a7576122a5600a8661427d565b505b5f858152600c60205260408120805490915b8181101561235f575f8382815481106122d4576122d4615032565b5f9182526020909120600390910201600181015490915067ffffffffffffffff898116911603612356576002810161230d8789836152d9565b507fc01483261a841a868b99cb8802faed4ea44a1a816651c4f7ee061a96a205fe98898989895f6040516123459594939291906155c0565b60405180910390a15050505061158e565b506001016122b9565b508160405180606001604052808981526020018867ffffffffffffffff16815260200187878080601f0160208091040260200160405190810160405280939291908181526020018383808284375f92018290525093909452505083546001808201865594825260209182902084516003909202019081559083015193810180547fffffffffffffffffffffffffffffffffffffffffffffffff00000000000000001667ffffffffffffffff90951694909417909355506040810151909190600282019061242c9082615494565b5050507fc01483261a841a868b99cb8802faed4ea44a1a816651c4f7ee061a96a205fe98878787875f6040516124669594939291906155c0565b60405180910390a150505050505050565b60605f6124846005613c44565b67ffffffffffffffff81111561249c5761249c614aff565b60405190808252806020026020018201604052801561251957816020015b6040805160c0810182525f8082526060602080840182905293830182905282018190526080820181905260a082015282527fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff9092019101816124ba5790505b5090505f5b6125286005613c44565b811015611d755760075f61253d600584613c4d565b73ffffffffffffffffffffffffffffffffffffffff168152602081019190915260409081015f20815160c081019092528054829060ff16600581111561258557612585614c22565b600581111561259657612596614c22565b81526020016001820180546125aa9061505f565b80601f01602080910402602001604051908101604052809291908181526020018280546125d69061505f565b80156126215780601f106125f857610100808354040283529160200191612621565b820191905f5260205f20905b81548152906001019060200180831161260457829003601f168201915b5050509183525050600282015473ffffffffffffffffffffffffffffffffffffffff90811660208301526003830154908116604083015274010000000000000000000000000000000000000000900463ffffffff166060820152600490910154608090910152825183908390811061269b5761269b615032565b602090810291909101015260010161251e565b7f4675fa8241f86f37157864d3d49b85ad4b164352c516da28e1678a90470ae3005473ffffffffffffffffffffffffffffffffffffffff163314612720576040517f65f49065000000000000000000000000000000000000000000000000000000008152336004820152602401610d44565b61272981611863565b61276b5761276b6040518060400160405280601281526020017f4f50455241544f525f4e4f545f464f554e440000000000000000000000000000815250613bff565b5f6127766005613c44565b90505f5b8181101561281e5773ffffffffffffffffffffffffffffffffffffffff831660075f6127a7600585613c4d565b73ffffffffffffffffffffffffffffffffffffffff908116825260208201929092526040015f20600301541603612816576128166040518060400160405280600d81526020017f4f55545f4f465f424f554e445300000000000000000000000000000000000000815250613bff565b60010161277a565b5061282a600883614288565b5060405173ffffffffffffffffffffffffffffffffffffffff8316907f80c0b871b97b595b16a7741c1b06fed0c6f6f558639f18ccbce50724325dc40d905f90a25050565b73ffffffffffffffffffffffffffffffffffffffff8082165f90815260076020526040902060030154829133911681146128e1576128e16040518060400160405280600881526020017f4241445f41555448000000000000000000000000000000000000000000000000815250613bff565b73ffffffffffffffffffffffffffffffffffffffff8381165f908152600760205260409020600201541661294d5761294d6040518060400160405280600e81526020017f4e4f44455f4e4f545f464f554e44000000000000000000000000000000000000815250613bff565b600573ffffffffffffffffffffffffffffffffffffffff84165f9081526007602052604090205460ff16600581111561298857612988614c22565b146129cb576129cb6040518060400160405280601681526020017f4e4f44455f53544154455f4e4f545f414c4c4f57454400000000000000000000815250613bff565b6129d6600584614288565b5073ffffffffffffffffffffffffffffffffffffffff83165f90815260076020526040812080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0016815590612a2f600183018261458a565b506002810180547fffffffffffffffffffffffff00000000000000000000000000000000000000001690556003810180547fffffffffffffffff0000000000000000000000000000000000000000000000001690555f600490910181905560405173ffffffffffffffffffffffffffffffffffffffff8516917fcfc24166db4bb677e857cacabd1541fb2b30645021b27c5130419589b84db52b91a2505050565b335f8181526007602052604090206002015473ffffffffffffffffffffffffffffffffffffffff16612b3a57612b3a6040518060400160405280600e81526020017f4e4f44455f4e4f545f464f554e44000000000000000000000000000000000000815250613bff565b83612b44816141a9565b612b51608084018461514b565b612b5b82826141f6565b612b655f8861427d565b505f8781526002602052604090208590612b7f82826156b5565b50505f878152600460205260409020869055612ba287611495608088018861514b565b61217f60018887604051602001611570929190615848565b33612bc6600d82613bce565b612c0857612c086040518060400160405280600881526020017f4241445f41555448000000000000000000000000000000000000000000000000815250613bff565b5f838152600c602052604081208054825b81811015612d95578567ffffffffffffffff16838281548110612c3e57612c3e615032565b5f91825260209091206001600390920201015467ffffffffffffffff1603612d8d5782612c6c60018461592d565b81548110612c7c57612c7c615032565b905f5260205f209060030201838281548110612c9a57612c9a615032565b5f9182526020909120825460039092020190815560018083015490820180547fffffffffffffffffffffffffffffffffffffffffffffffff00000000000000001667ffffffffffffffff909216919091179055600280820190612cff90840182615940565b5090505082805480612d1357612d13615a69565b5f8281526020812060037fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff909301928302018181556001810180547fffffffffffffffffffffffffffffffffffffffffffffffff000000000000000016905590612d80600283018261458a565b5050905560019350612d95565b600101612c19565b5082612dd957612dd96040518060400160405280600981526020017f4e4f545f464f554e440000000000000000000000000000000000000000000000815250613bff565b6040805187815267ffffffffffffffff8716602082015260808183018190525f908201526001606082015290517fc01483261a841a868b99cb8802faed4ea44a1a816651c4f7ee061a96a205fe989181900360a00190a1505050505050565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef5200054640100000000900460ff16612e9b576040517f77a399b800000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b5f5b818110156107bd57612ed4838383818110612eba57612eba615032565b9050602002016020810190612ecf9190614642565b613d10565b600101612e9d565b5f610f3981613c44565b7f4675fa8241f86f37157864d3d49b85ad4b164352c516da28e1678a90470ae3005473ffffffffffffffffffffffffffffffffffffffff163314612f58576040517f65f49065000000000000000000000000000000000000000000000000000000008152336004820152602401610d44565b610d5681613e04565b73ffffffffffffffffffffffffffffffffffffffff81165f90815260106020526040812061186f90613c44565b6060610f3960056142a9565b60605f80612fa781613c44565b9050838118818511028418858111868203025f8167ffffffffffffffff811115612fd357612fd3614aff565b60405190808252806020026020018201604052801561300c57816020015b612ff96144a2565b815260200190600190039081612ff15790505b5090505f5b82811015613120575f82828151811061302c5761302c615032565b602090810291909101015190506130455f8b8401613c4d565b8082525f90815260026020818152604092839020835160a08101855281548152600182015467ffffffffffffffff80821683860152680100000000000000008204811683880152700100000000000000000000000000000000909104166060820152928101805485518185028101850190965280865293949193608086019383018282801561310857602002820191905f5260205f20905b815473ffffffffffffffffffffffffffffffffffffffff1681526001909101906020018083116130dd575b50505091909252505050602090910152600101613011565b509450505083101590505b9250929050565b5f61186f8183613c22565b5f61186f600d83613bce565b6060610f3960086142a9565b8161315f81613cc4565b335f8181526007602052604090206002015473ffffffffffffffffffffffffffffffffffffffff166131c9576131c96040518060400160405280600e81526020017f4e4f44455f4e4f545f464f554e44000000000000000000000000000000000000815250613bff565b5f84815260026020818152604080842073ffffffffffffffffffffffffffffffffffffffff881685526010909252909220908201906132089087613c39565b5080545f90815b81811015613379578773ffffffffffffffffffffffffffffffffffffffff1684828154811061324057613240615032565b5f9182526020909120015473ffffffffffffffffffffffffffffffffffffffff1603613371578361327260018461592d565b8154811061328257613282615032565b905f5260205f20015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff168482815481106132bc576132bc615032565b905f5260205f20015f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055508380548061331157613311615a69565b5f8281526020902081017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff90810180547fffffffffffffffffffffffff000000000000000000000000000000000000000016905501905560019250613379565b60010161320f565b50816133bd576133bd6040518060400160405280600e81526020017f4e4f44455f4e4f545f464f554e44000000000000000000000000000000000000815250613bff565b60018401805484547fffffffffffffffffffffffffffffffff0000000000000000ffffffffffffffff821660ff909116680100000000000000009283900467ffffffffffffff00161790910217905560405161342690600290611570908b9088906020016151af565b5050505050505050565b3361343c600882613bce565b61347e5761347e6040518060400160405280600881526020017f4241445f41555448000000000000000000000000000000000000000000000000815250613bff565b73ffffffffffffffffffffffffffffffffffffffff8481165f9081526007602052604090206002015416156134eb576134eb6040518060400160405280600e81526020017f414c52454144595f455849535453000000000000000000000000000000000000815250613bff565b6011545f9063ffffffff1615613535576011805463ffffffff16905f6135108361526a565b82546101009290920a63ffffffff818102199093169183160217909155601154169150505b5f6040518060c0016040528085600581111561355357613553614c22565b81526020810187905273ffffffffffffffffffffffffffffffffffffffff8816604082015233606082015263ffffffff80851660808301525f60a0909201919091529091506135a79060059088906142b516565b5073ffffffffffffffffffffffffffffffffffffffff86165f908152600760205260409020815181548392919082907fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0016600183600581111561360c5761360c614c22565b0217905550602082015160018201906136259082615494565b5060408281015160028301805473ffffffffffffffffffffffffffffffffffffffff9283167fffffffffffffffffffffffff00000000000000000000000000000000000000009091161790556060840151600384018054608087015163ffffffff1674010000000000000000000000000000000000000000027fffffffffffffffff0000000000000000000000000000000000000000000000009091169284169290921791909117905560a0909301516004909201919091555133918816907f759154d15a6aec80ceab7bc8820f46ebc53ad68bb18f47afb77483fea9dcc9ff906137139089908990615a96565b60405180910390a3505050505050565b5f61186f600a83613c22565b335f8181526007602052604090206002015473ffffffffffffffffffffffffffffffffffffffff16613799576137996040518060400160405280600e81526020017f4e4f44455f4e4f545f464f554e44000000000000000000000000000000000000815250613bff565b815f8190036137e0576137e06040518060400160405280600781526020017f4241445f41524700000000000000000000000000000000000000000000000000815250613bff565b5f8167ffffffffffffffff8111156137fa576137fa614aff565b60405190808252806020026020018201604052801561386457816020015b6138516040518060a001604052805f81526020015f81526020015f81526020015f67ffffffffffffffff1681526020015f151581525090565b8152602001906001900390816138185790505b5090505f805b83811015613bac573687878381811061388557613885615032565b60a00291909101915061389b90505f8235613c22565b613927577f75460fe319331413a18a82d99b07735cec53fa0c4061ada38c2141e331082afa813560408301356138d76080850160608601615ab7565b604080518082018252600981527f4e4f545f464f554e440000000000000000000000000000000000000000000000602082015290516139199493929190615ad2565b60405180910390a150613ba4565b80355f908152600260205260409020600180820154700100000000000000000000000000000000900416156139df577f75460fe319331413a18a82d99b07735cec53fa0c4061ada38c2141e331082afa8235604084013561398e6080860160608701615ab7565b604080518082018252600d81527f53545245414d5f5345414c454400000000000000000000000000000000000000602082015290516139d09493929190615ad2565b60405180910390a15050613ba4565b6139ef6080830160608401615ab7565b600182015467ffffffffffffffff918216911610613a81577f75460fe319331413a18a82d99b07735cec53fa0c4061ada38c2141e331082afa82356040840135613a3f6080860160608701615ab7565b604080518082018252600781527f4241445f41524700000000000000000000000000000000000000000000000000602082015290516139d09493929190615ad2565b600181015467ffffffffffffffff165f03613aae5781355f908152600360205260408120613aae9161458a565b60408201358155613ac56080830160608401615ab7565b6001820180547fffffffffffffffffffffffffffffffffffffffffffffffff00000000000000001667ffffffffffffffff92909216919091179055613b1060a0830160808401615b0f565b15613b6a57600181810180547fffffffffffffffff0000000000000000ffffffffffffffffffffffffffffffff81167001000000000000000000000000000000009182900467ffffffffffffffff16909317029190911790555b613b7936839003830183615b28565b8585613b84816150aa565b965081518110613b9657613b96615032565b602002602001018190525050505b60010161386a565b50808252613bc66003836040516020016115709190615ba3565b505050505050565b73ffffffffffffffffffffffffffffffffffffffff81165f90815260018301602052604081205415155b9392505050565b6308c379a06040820352602080820352601f19601f825101166044810160248303fd5b5f8181526001830160205260408120541515613bf8565b5f613bf883836142d6565b5f61186f825490565b5f613bf883836143b9565b80545f5b81811015613cbe57613cb5845f6010015f868581548110613c7f57613c7f615032565b5f91825260208083209091015473ffffffffffffffffffffffffffffffffffffffff16835282019290925260400190209061427d565b50600101613c5c565b50505050565b613cce5f82613c22565b610d5657610d566040518060400160405280600981526020017f4e4f545f464f554e440000000000000000000000000000000000000000000000815250613bff565b73ffffffffffffffffffffffffffffffffffffffff8116613d6957613d696040518060400160405280600781526020017f4241445f41524700000000000000000000000000000000000000000000000000815250613bff565b613d7281611863565b15613db557613db56040518060400160405280600e81526020017f414c52454144595f455849535453000000000000000000000000000000000000815250613bff565b613dc06008826142b5565b5060405173ffffffffffffffffffffffffffffffffffffffff8216907fac6fa858e9350a46cec16539926e0fde25b7629f84b5a72bffaae4df888ae86d905f90a250565b73ffffffffffffffffffffffffffffffffffffffff8116613e5d57613e5d6040518060400160405280600781526020017f4241445f41524700000000000000000000000000000000000000000000000000815250613bff565b613e68600d826142b5565b613eaa57613eaa6040518060400160405280600e81526020017f414c52454144595f455849535453000000000000000000000000000000000000815250613bff565b60405173ffffffffffffffffffffffffffffffffffffffff8216907f7afd798379ae2d2e5035438544cea2b60eb1dde6a8128e6d447fd2a25f8825a2905f90a250565b5f826005811115613f0057613f00614c22565b1480613f7057506001826005811115613f1b57613f1b614c22565b148015613f7057506003816005811115613f3757613f37614c22565b1480613f5457506004816005811115613f5257613f52614c22565b145b80613f7057506002816005811115613f6e57613f6e614c22565b145b80613fc357506002826005811115613f8a57613f8a614c22565b148015613fc357506003816005811115613fa657613fa6614c22565b1480613fc357506004816005811115613fc157613fc1614c22565b145b8061401657506004826005811115613fdd57613fdd614c22565b14801561401657506003816005811115613ff957613ff9614c22565b14806140165750600581600581111561401457614014614c22565b145b8061404e5750600382600581111561403057614030614c22565b14801561404e5750600581600581111561404c5761404c614c22565b145b15614057575050565b6140956040518060400160405280601681526020017f4e4f44455f53544154455f4e4f545f414c4c4f57454400000000000000000000815250613bff565b5050565b80545f5b81811015613cbe576140f6845f6010015f8685815481106140c0576140c0615032565b5f91825260208083209091015473ffffffffffffffffffffffffffffffffffffffff168352820192909252604001902090613c39565b5060010161409d565b5f5b81811015613cbe576141628460105f86868681811061412257614122615032565b90506020020160208101906141379190614642565b73ffffffffffffffffffffffffffffffffffffffff16815260208101919091526040015f209061427d565b50600101614101565b5f7f378ece20ebca29c2f887798617154658265a73d80c84fad8c9c49639ffdb29bb9050602082038051602082528483604086510184a29052505050565b6141b35f82613c22565b15610d5657610d566040518060400160405280600e81526020017f414c52454144595f455849535453000000000000000000000000000000000000815250613bff565b805f5b81811015613cbe5761423384848381811061421657614216615032565b905060200201602081019061422b9190614642565b600590613bce565b614275576142756040518060400160405280600e81526020017f4e4f44455f4e4f545f464f554e44000000000000000000000000000000000000815250613bff565b6001016141f9565b5f613bf883836143df565b5f613bf88373ffffffffffffffffffffffffffffffffffffffff84166142d6565b60605f613bf88361442b565b5f613bf88373ffffffffffffffffffffffffffffffffffffffff84166143df565b5f81815260018301602052604081205480156143b0575f6142f860018361592d565b85549091505f9061430b9060019061592d565b905080821461436a575f865f01828154811061432957614329615032565b905f5260205f200154905080875f01848154811061434957614349615032565b5f918252602080832090910192909255918252600188019052604090208390555b855486908061437b5761437b615a69565b600190038181905f5260205f20015f90559055856001015f8681526020019081526020015f205f90556001935050505061186f565b5f91505061186f565b5f825f0182815481106143ce576143ce615032565b905f5260205f200154905092915050565b5f81815260018301602052604081205461442457508154600181810184555f84815260208082209093018490558454848252828601909352604090209190915561186f565b505f61186f565b6060815f0180548060200260200160405190810160405280929190818152602001828054801561447857602002820191905f5260205f20905b815481526020019060010190808311614464575b50505050509050919050565b5080545f8255600302905f5260205f2090810190610d5691906145c1565b60405180604001604052805f81526020016144ff6040518060a001604052805f81526020015f67ffffffffffffffff1681526020015f67ffffffffffffffff1681526020015f67ffffffffffffffff168152602001606081525090565b905290565b828054828255905f5260205f2090810192821561457a579160200282015b8281111561457a5781547fffffffffffffffffffffffff00000000000000000000000000000000000000001673ffffffffffffffffffffffffffffffffffffffff843516178255602090920191600190910190614522565b5061458692915061460d565b5090565b5080546145969061505f565b5f825580601f106145a5575050565b601f0160209004905f5260205f2090810190610d56919061460d565b80821115614586575f8082556001820180547fffffffffffffffffffffffffffffffffffffffffffffffff0000000000000000169055614604600283018261458a565b506003016145c1565b5b80821115614586575f815560010161460e565b73ffffffffffffffffffffffffffffffffffffffff81168114610d56575f5ffd5b5f60208284031215614652575f5ffd5b8135613bf881614621565b5f6020828403121561466d575f5ffd5b5035919050565b5f5f60408385031215614685575f5ffd5b50508035926020909101359150565b5f81518084528060208401602086015e5f6020828601015260207fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0601f83011685010191505092915050565b5f602082016020835280845180835260408501915060408160051b8601019250602086015f5b82811015614780577fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc087860301845281518051865267ffffffffffffffff6020820151166020870152604081015190506060604087015261476a6060870182614694565b9550506020938401939190910190600101614706565b50929695505050505050565b5f60a083018251845267ffffffffffffffff602084015116602085015267ffffffffffffffff604084015116604085015267ffffffffffffffff6060840151166060850152608083015160a0608086015281815180845260c0870191506020830193505f92505b8083101561482c5773ffffffffffffffffffffffffffffffffffffffff84511682526020820191506020840193506001830192506147f3565b5095945050505050565b602081525f613bf8602083018461478c565b5f5f5f6060848603121561485a575f5ffd5b833561486581614621565b95602085013595506040909401359392505050565b5f82825180855260208501945060208160051b830101602085015f5b838110156148fd577fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe085840301885281518051845260208101519050604060208501526148e6604085018261478c565b6020998a0199909450929092019150600101614896565b50909695505050505050565b602081525f613bf8602083018461487a565b5f5f6040838503121561492c575f5ffd5b823561493781614621565b946020939093013593505050565b5f5f83601f840112614955575f5ffd5b50813567ffffffffffffffff81111561496c575f5ffd5b6020830191508360208260051b850101111561312b575f5ffd5b5f5f60208385031215614997575f5ffd5b823567ffffffffffffffff8111156149ad575f5ffd5b6149b985828601614945565b90969095509350505050565b606081525f6149d7606083018661478c565b84602084015282810360408401526149ef8185614694565b9695505050505050565b803560068110614a07575f5ffd5b919050565b5f5f60408385031215614a1d575f5ffd5b8235614a2881614621565b9150614a36602084016149f9565b90509250929050565b5f5f83601f840112614a4f575f5ffd5b50813567ffffffffffffffff811115614a66575f5ffd5b60208301915083602082850101111561312b575f5ffd5b5f5f5f5f5f5f60808789031215614a92575f5ffd5b86359550602087013567ffffffffffffffff811115614aaf575f5ffd5b614abb89828a01614945565b90965094505060408701359250606087013567ffffffffffffffff811115614ae1575f5ffd5b614aed89828a01614a3f565b979a9699509497509295939492505050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52604160045260245ffd5b5f82601f830112614b3b575f5ffd5b813567ffffffffffffffff811115614b5557614b55614aff565b604051601f82017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0908116603f0116810167ffffffffffffffff81118282101715614ba257614ba2614aff565b604052818152838201602001851015614bb9575f5ffd5b816020850160208301375f918101602001919091529392505050565b5f5f60408385031215614be6575f5ffd5b8235614bf181614621565b9150602083013567ffffffffffffffff811115614c0c575f5ffd5b614c1885828601614b2c565b9150509250929050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52602160045260245ffd5b60068110614c84577f4e487b71000000000000000000000000000000000000000000000000000000005f52602160045260245ffd5b9052565b614c93828251614c4f565b5f602082015160c06020850152614cad60c0850182614694565b905073ffffffffffffffffffffffffffffffffffffffff604084015116604085015273ffffffffffffffffffffffffffffffffffffffff606084015116606085015263ffffffff608084015116608085015260a083015160a08501528091505092915050565b602081525f613bf86020830184614c88565b5f5f60408385031215614d36575f5ffd5b823591506020830135614d4881614621565b809150509250929050565b67ffffffffffffffff81168114610d56575f5ffd5b5f5f5f5f60608587031215614d7b575f5ffd5b843593506020850135614d8d81614d53565b9250604085013567ffffffffffffffff811115614da8575f5ffd5b614db487828801614a3f565b95989497509550505050565b5f602082016020835280845180835260408501915060408160051b8601019250602086015f5b82811015614780577fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc0878603018452614e20858351614c88565b94506020938401939190910190600101614de6565b5f5f5f60608486031215614e47575f5ffd5b8335925060208401359150604084013567ffffffffffffffff811115614e6b575f5ffd5b840160a08187031215614e7c575f5ffd5b809150509250925092565b5f5f60408385031215614e98575f5ffd5b823591506020830135614d4881614d53565b602080825282518282018190525f918401906040840190835b81811015614ef757835173ffffffffffffffffffffffffffffffffffffffff16835260209384019390920191600101614ec3565b509095945050505050565b604081525f614f14604083018561487a565b905082151560208301529392505050565b5f5f5f60608486031215614f37575f5ffd5b8335614f4281614621565b9250602084013567ffffffffffffffff811115614f5d575f5ffd5b614f6986828701614b2c565b925050614f78604085016149f9565b90509250925092565b5f5f60208385031215614f92575f5ffd5b823567ffffffffffffffff811115614fa8575f5ffd5b8301601f81018513614fb8575f5ffd5b803567ffffffffffffffff811115614fce575f5ffd5b85602060a083028401011115614fe2575f5ffd5b6020919091019590945092505050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b8082018082111561186f5761186f614ff2565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52603260045260245ffd5b600181811c9082168061507357607f821691505b602082108103611d75577f4e487b71000000000000000000000000000000000000000000000000000000005f52602260045260245ffd5b5f7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff82036150da576150da614ff2565b5060010190565b6020810161186f8284614c4f565b5f82357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffa1833603018112615121575f5ffd5b9190910192915050565b5f6020828403121561513b575f5ffd5b813560ff81168114613bf8575f5ffd5b5f5f83357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe184360301811261517e575f5ffd5b83018035915067ffffffffffffffff821115615198575f5ffd5b6020019150600581901b360382131561312b575f5ffd5b828152604060208201525f60e0820183546040840152600184015467ffffffffffffffff8116606085015267ffffffffffffffff8160401c16608085015267ffffffffffffffff8160801c1660a0850152506002840160a060c085015281815480845261010086019150825f5260205f2093505f92505b8083101561525f5773ffffffffffffffffffffffffffffffffffffffff8454168252602082019150600184019350600183019250615226565b509695505050505050565b5f63ffffffff821663ffffffff810361528557615285614ff2565b60010192915050565b5b81811015614095575f815560010161528f565b601f8211156107bd57805f5260205f20601f840160051c810160208510156152c75750805b61158e601f850160051c83018261528e565b67ffffffffffffffff8311156152f1576152f1614aff565b615305836152ff835461505f565b836152a2565b5f601f841160018114615355575f851561531f5750838201355b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff600387901b1c1916600186901b17835561158e565b5f838152602081207fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe08716915b828110156153a25786850135825560209485019460019092019101615382565b50868210156153dd577fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff60f88860031b161c19848701351681555b505060018560011b0183555050505050565b5f82518060208501845e5f920191825250919050565b5f5f83546154128161505f565b600182168015615429576001811461545c57615489565b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0083168652811515820286019350615489565b865f5260205f205f5b8381101561548157815488820152600190910190602001615465565b505081860193505b509195945050505050565b815167ffffffffffffffff8111156154ae576154ae614aff565b6154c2816154bc845461505f565b846152a2565b6020601f821160018114615516575f83156154dd5750848201515b600184901b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff600386901b1c198216175b85555061158e565b5f848152602081207fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe08516915b828110156155635787850151825560209485019460019092019101615543565b508482101561559f57868401517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff600387901b60f8161c191681555b50505050600190811b01905550565b602081525f613bf86020830184614694565b85815267ffffffffffffffff8516602082015260806040820152826080820152828460a08301375f60a084830101525f60a07fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0601f860116830101905082151560608301529695505050505050565b67ffffffffffffffff83111561564757615647614aff565b6801000000000000000083111561566057615660614aff565b80548382558084101561568457815f5260205f2061568282820186830161528e565b505b5081815f5260205f205f5b85811015613bc65782356156a281614621565b828201556020929092019160010161568f565b813581556001810160208301356156cb81614d53565b815460408501356156db81614d53565b6fffffffffffffffff00000000000000008160401b1667ffffffffffffffff84167fffffffffffffffffffffffffffffffff000000000000000000000000000000008416171784555050505f606084013561573581614d53565b82547fffffffffffffffff0000000000000000ffffffffffffffffffffffffffffffff16608091821b77ffffffffffffffff000000000000000000000000000000001617909255505f908190840135368590037fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe10181126157b4575f5ffd5b84018035915067ffffffffffffffff8211156157ce575f5ffd5b6020019150600581901b36038213156157e5575f5ffd5b613cbe81836002860161562f565b8183526020830192505f815f5b8481101561583e57813561581381614621565b73ffffffffffffffffffffffffffffffffffffffff1686526020958601959190910190600101615800565b5093949350505050565b828152604060208201525f5f8335905080604084015250602083013561586d81614d53565b67ffffffffffffffff166060830152604083013561588a81614d53565b67ffffffffffffffff16608083015260608301356158a781614d53565b67ffffffffffffffff1660a08301526080830135368490037fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe10181126158eb575f5ffd5b830160208101903567ffffffffffffffff811115615907575f5ffd5b8060051b3603821315615918575f5ffd5b60a060c08501526149ef60e0850182846157f3565b8181038181111561186f5761186f614ff2565b81810361594b575050565b615955825461505f565b67ffffffffffffffff81111561596d5761596d614aff565b61597b816154bc845461505f565b5f601f8211600181146159c9575f83156154dd575081850154600184901b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff600386901b1c1982161761550e565b5f85815260208082208683529082207fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe08616925b83811015615a1d57828601548255600195860195909101906020016159fd565b5085831015615a5957818501547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff600388901b60f8161c191681555b5050505050600190811b01905550565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52603160045260245ffd5b604081525f615aa86040830185614694565b9050613bf86020830184614c4f565b5f60208284031215615ac7575f5ffd5b8135613bf881614d53565b84815283602082015267ffffffffffffffff83166040820152608060608201525f6149ef6080830184614694565b80358015158114614a07575f5ffd5b5f60208284031215615b1f575f5ffd5b613bf882615b00565b5f60a0828403128015615b39575f5ffd5b5060405160a0810167ffffffffffffffff81118282101715615b5d57615b5d614aff565b6040908152833582526020808501359083015283810135908201526060830135615b8681614d53565b6060820152615b9760808401615b00565b60808201529392505050565b602080825282518282018190525f918401906040840190835b81811015614ef757835180518452602081015160208501526040810151604085015267ffffffffffffffff60608201511660608501526080810151151560808501525060a083019250602084019350600181019050615bbc564675fa8241f86f37157864d3d49b85ad4b164352c516da28e1678a90470ae300",
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
// Solidity: function getAllConfiguration() view returns((bytes32,uint64,bytes)[] settings)
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
// Solidity: function getAllConfiguration() view returns((bytes32,uint64,bytes)[] settings)
func (_MockRiverRegistry *MockRiverRegistrySession) GetAllConfiguration() ([]Setting, error) {
	return _MockRiverRegistry.Contract.GetAllConfiguration(&_MockRiverRegistry.CallOpts)
}

// GetAllConfiguration is a free data retrieval call binding the contract method 0x081814db.
//
// Solidity: function getAllConfiguration() view returns((bytes32,uint64,bytes)[] settings)
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
// Solidity: function getAllNodes() view returns((uint8,string,address,address,uint32,bytes32)[])
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
// Solidity: function getAllNodes() view returns((uint8,string,address,address,uint32,bytes32)[])
func (_MockRiverRegistry *MockRiverRegistrySession) GetAllNodes() ([]Node, error) {
	return _MockRiverRegistry.Contract.GetAllNodes(&_MockRiverRegistry.CallOpts)
}

// GetAllNodes is a free data retrieval call binding the contract method 0xa1174e7d.
//
// Solidity: function getAllNodes() view returns((uint8,string,address,address,uint32,bytes32)[])
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

// GetLastNodeIndex is a free data retrieval call binding the contract method 0x44be9beb.
//
// Solidity: function getLastNodeIndex() view returns(uint32)
func (_MockRiverRegistry *MockRiverRegistryCaller) GetLastNodeIndex(opts *bind.CallOpts) (uint32, error) {
	var out []interface{}
	err := _MockRiverRegistry.contract.Call(opts, &out, "getLastNodeIndex")

	if err != nil {
		return *new(uint32), err
	}

	out0 := *abi.ConvertType(out[0], new(uint32)).(*uint32)

	return out0, err

}

// GetLastNodeIndex is a free data retrieval call binding the contract method 0x44be9beb.
//
// Solidity: function getLastNodeIndex() view returns(uint32)
func (_MockRiverRegistry *MockRiverRegistrySession) GetLastNodeIndex() (uint32, error) {
	return _MockRiverRegistry.Contract.GetLastNodeIndex(&_MockRiverRegistry.CallOpts)
}

// GetLastNodeIndex is a free data retrieval call binding the contract method 0x44be9beb.
//
// Solidity: function getLastNodeIndex() view returns(uint32)
func (_MockRiverRegistry *MockRiverRegistryCallerSession) GetLastNodeIndex() (uint32, error) {
	return _MockRiverRegistry.Contract.GetLastNodeIndex(&_MockRiverRegistry.CallOpts)
}

// GetNode is a free data retrieval call binding the contract method 0x9d209048.
//
// Solidity: function getNode(address nodeAddress) view returns((uint8,string,address,address,uint32,bytes32))
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
// Solidity: function getNode(address nodeAddress) view returns((uint8,string,address,address,uint32,bytes32))
func (_MockRiverRegistry *MockRiverRegistrySession) GetNode(nodeAddress common.Address) (Node, error) {
	return _MockRiverRegistry.Contract.GetNode(&_MockRiverRegistry.CallOpts, nodeAddress)
}

// GetNode is a free data retrieval call binding the contract method 0x9d209048.
//
// Solidity: function getNode(address nodeAddress) view returns((uint8,string,address,address,uint32,bytes32))
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

// BackfillPermanentIndices is a paid mutator transaction binding the contract method 0x62424576.
//
// Solidity: function backfillPermanentIndices() returns()
func (_MockRiverRegistry *MockRiverRegistryTransactor) BackfillPermanentIndices(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _MockRiverRegistry.contract.Transact(opts, "backfillPermanentIndices")
}

// BackfillPermanentIndices is a paid mutator transaction binding the contract method 0x62424576.
//
// Solidity: function backfillPermanentIndices() returns()
func (_MockRiverRegistry *MockRiverRegistrySession) BackfillPermanentIndices() (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.BackfillPermanentIndices(&_MockRiverRegistry.TransactOpts)
}

// BackfillPermanentIndices is a paid mutator transaction binding the contract method 0x62424576.
//
// Solidity: function backfillPermanentIndices() returns()
func (_MockRiverRegistry *MockRiverRegistryTransactorSession) BackfillPermanentIndices() (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.BackfillPermanentIndices(&_MockRiverRegistry.TransactOpts)
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

// SetNodeCometBftPubKey is a paid mutator transaction binding the contract method 0x2936781a.
//
// Solidity: function setNodeCometBftPubKey(address nodeAddress, bytes32 cometBftPubKey) returns()
func (_MockRiverRegistry *MockRiverRegistryTransactor) SetNodeCometBftPubKey(opts *bind.TransactOpts, nodeAddress common.Address, cometBftPubKey [32]byte) (*types.Transaction, error) {
	return _MockRiverRegistry.contract.Transact(opts, "setNodeCometBftPubKey", nodeAddress, cometBftPubKey)
}

// SetNodeCometBftPubKey is a paid mutator transaction binding the contract method 0x2936781a.
//
// Solidity: function setNodeCometBftPubKey(address nodeAddress, bytes32 cometBftPubKey) returns()
func (_MockRiverRegistry *MockRiverRegistrySession) SetNodeCometBftPubKey(nodeAddress common.Address, cometBftPubKey [32]byte) (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.SetNodeCometBftPubKey(&_MockRiverRegistry.TransactOpts, nodeAddress, cometBftPubKey)
}

// SetNodeCometBftPubKey is a paid mutator transaction binding the contract method 0x2936781a.
//
// Solidity: function setNodeCometBftPubKey(address nodeAddress, bytes32 cometBftPubKey) returns()
func (_MockRiverRegistry *MockRiverRegistryTransactorSession) SetNodeCometBftPubKey(nodeAddress common.Address, cometBftPubKey [32]byte) (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.SetNodeCometBftPubKey(&_MockRiverRegistry.TransactOpts, nodeAddress, cometBftPubKey)
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

// SetStreamReplicationFactor is a paid mutator transaction binding the contract method 0x5c665ce9.
//
// Solidity: function setStreamReplicationFactor((bytes32,address[],uint8)[] requests) returns()
func (_MockRiverRegistry *MockRiverRegistryTransactor) SetStreamReplicationFactor(opts *bind.TransactOpts, requests []SetStreamReplicationFactor) (*types.Transaction, error) {
	return _MockRiverRegistry.contract.Transact(opts, "setStreamReplicationFactor", requests)
}

// SetStreamReplicationFactor is a paid mutator transaction binding the contract method 0x5c665ce9.
//
// Solidity: function setStreamReplicationFactor((bytes32,address[],uint8)[] requests) returns()
func (_MockRiverRegistry *MockRiverRegistrySession) SetStreamReplicationFactor(requests []SetStreamReplicationFactor) (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.SetStreamReplicationFactor(&_MockRiverRegistry.TransactOpts, requests)
}

// SetStreamReplicationFactor is a paid mutator transaction binding the contract method 0x5c665ce9.
//
// Solidity: function setStreamReplicationFactor((bytes32,address[],uint8)[] requests) returns()
func (_MockRiverRegistry *MockRiverRegistryTransactorSession) SetStreamReplicationFactor(requests []SetStreamReplicationFactor) (*types.Transaction, error) {
	return _MockRiverRegistry.Contract.SetStreamReplicationFactor(&_MockRiverRegistry.TransactOpts, requests)
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

// MockRiverRegistryNodeCometBftPubKeyUpdatedIterator is returned from FilterNodeCometBftPubKeyUpdated and is used to iterate over the raw logs and unpacked data for NodeCometBftPubKeyUpdated events raised by the MockRiverRegistry contract.
type MockRiverRegistryNodeCometBftPubKeyUpdatedIterator struct {
	Event *MockRiverRegistryNodeCometBftPubKeyUpdated // Event containing the contract specifics and raw log

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
func (it *MockRiverRegistryNodeCometBftPubKeyUpdatedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockRiverRegistryNodeCometBftPubKeyUpdated)
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
		it.Event = new(MockRiverRegistryNodeCometBftPubKeyUpdated)
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
func (it *MockRiverRegistryNodeCometBftPubKeyUpdatedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockRiverRegistryNodeCometBftPubKeyUpdatedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockRiverRegistryNodeCometBftPubKeyUpdated represents a NodeCometBftPubKeyUpdated event raised by the MockRiverRegistry contract.
type MockRiverRegistryNodeCometBftPubKeyUpdated struct {
	NodeAddress    common.Address
	CometBftPubKey [32]byte
	Raw            types.Log // Blockchain specific contextual infos
}

// FilterNodeCometBftPubKeyUpdated is a free log retrieval operation binding the contract event 0x59fdfe8dc31c73e0c191476c7185d5dd1242052b47edc1de5a45c770cc0e7edc.
//
// Solidity: event NodeCometBftPubKeyUpdated(address indexed nodeAddress, bytes32 cometBftPubKey)
func (_MockRiverRegistry *MockRiverRegistryFilterer) FilterNodeCometBftPubKeyUpdated(opts *bind.FilterOpts, nodeAddress []common.Address) (*MockRiverRegistryNodeCometBftPubKeyUpdatedIterator, error) {

	var nodeAddressRule []interface{}
	for _, nodeAddressItem := range nodeAddress {
		nodeAddressRule = append(nodeAddressRule, nodeAddressItem)
	}

	logs, sub, err := _MockRiverRegistry.contract.FilterLogs(opts, "NodeCometBftPubKeyUpdated", nodeAddressRule)
	if err != nil {
		return nil, err
	}
	return &MockRiverRegistryNodeCometBftPubKeyUpdatedIterator{contract: _MockRiverRegistry.contract, event: "NodeCometBftPubKeyUpdated", logs: logs, sub: sub}, nil
}

// WatchNodeCometBftPubKeyUpdated is a free log subscription operation binding the contract event 0x59fdfe8dc31c73e0c191476c7185d5dd1242052b47edc1de5a45c770cc0e7edc.
//
// Solidity: event NodeCometBftPubKeyUpdated(address indexed nodeAddress, bytes32 cometBftPubKey)
func (_MockRiverRegistry *MockRiverRegistryFilterer) WatchNodeCometBftPubKeyUpdated(opts *bind.WatchOpts, sink chan<- *MockRiverRegistryNodeCometBftPubKeyUpdated, nodeAddress []common.Address) (event.Subscription, error) {

	var nodeAddressRule []interface{}
	for _, nodeAddressItem := range nodeAddress {
		nodeAddressRule = append(nodeAddressRule, nodeAddressItem)
	}

	logs, sub, err := _MockRiverRegistry.contract.WatchLogs(opts, "NodeCometBftPubKeyUpdated", nodeAddressRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockRiverRegistryNodeCometBftPubKeyUpdated)
				if err := _MockRiverRegistry.contract.UnpackLog(event, "NodeCometBftPubKeyUpdated", log); err != nil {
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

// ParseNodeCometBftPubKeyUpdated is a log parse operation binding the contract event 0x59fdfe8dc31c73e0c191476c7185d5dd1242052b47edc1de5a45c770cc0e7edc.
//
// Solidity: event NodeCometBftPubKeyUpdated(address indexed nodeAddress, bytes32 cometBftPubKey)
func (_MockRiverRegistry *MockRiverRegistryFilterer) ParseNodeCometBftPubKeyUpdated(log types.Log) (*MockRiverRegistryNodeCometBftPubKeyUpdated, error) {
	event := new(MockRiverRegistryNodeCometBftPubKeyUpdated)
	if err := _MockRiverRegistry.contract.UnpackLog(event, "NodeCometBftPubKeyUpdated", log); err != nil {
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

// MockRiverRegistryStreamUpdatedIterator is returned from FilterStreamUpdated and is used to iterate over the raw logs and unpacked data for StreamUpdated events raised by the MockRiverRegistry contract.
type MockRiverRegistryStreamUpdatedIterator struct {
	Event *MockRiverRegistryStreamUpdated // Event containing the contract specifics and raw log

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
func (it *MockRiverRegistryStreamUpdatedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockRiverRegistryStreamUpdated)
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
		it.Event = new(MockRiverRegistryStreamUpdated)
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
func (it *MockRiverRegistryStreamUpdatedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockRiverRegistryStreamUpdatedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockRiverRegistryStreamUpdated represents a StreamUpdated event raised by the MockRiverRegistry contract.
type MockRiverRegistryStreamUpdated struct {
	EventType uint8
	Data      []byte
	Raw       types.Log // Blockchain specific contextual infos
}

// FilterStreamUpdated is a free log retrieval operation binding the contract event 0x378ece20ebca29c2f887798617154658265a73d80c84fad8c9c49639ffdb29bb.
//
// Solidity: event StreamUpdated(uint8 indexed eventType, bytes data)
func (_MockRiverRegistry *MockRiverRegistryFilterer) FilterStreamUpdated(opts *bind.FilterOpts, eventType []uint8) (*MockRiverRegistryStreamUpdatedIterator, error) {

	var eventTypeRule []interface{}
	for _, eventTypeItem := range eventType {
		eventTypeRule = append(eventTypeRule, eventTypeItem)
	}

	logs, sub, err := _MockRiverRegistry.contract.FilterLogs(opts, "StreamUpdated", eventTypeRule)
	if err != nil {
		return nil, err
	}
	return &MockRiverRegistryStreamUpdatedIterator{contract: _MockRiverRegistry.contract, event: "StreamUpdated", logs: logs, sub: sub}, nil
}

// WatchStreamUpdated is a free log subscription operation binding the contract event 0x378ece20ebca29c2f887798617154658265a73d80c84fad8c9c49639ffdb29bb.
//
// Solidity: event StreamUpdated(uint8 indexed eventType, bytes data)
func (_MockRiverRegistry *MockRiverRegistryFilterer) WatchStreamUpdated(opts *bind.WatchOpts, sink chan<- *MockRiverRegistryStreamUpdated, eventType []uint8) (event.Subscription, error) {

	var eventTypeRule []interface{}
	for _, eventTypeItem := range eventType {
		eventTypeRule = append(eventTypeRule, eventTypeItem)
	}

	logs, sub, err := _MockRiverRegistry.contract.WatchLogs(opts, "StreamUpdated", eventTypeRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockRiverRegistryStreamUpdated)
				if err := _MockRiverRegistry.contract.UnpackLog(event, "StreamUpdated", log); err != nil {
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

// ParseStreamUpdated is a log parse operation binding the contract event 0x378ece20ebca29c2f887798617154658265a73d80c84fad8c9c49639ffdb29bb.
//
// Solidity: event StreamUpdated(uint8 indexed eventType, bytes data)
func (_MockRiverRegistry *MockRiverRegistryFilterer) ParseStreamUpdated(log types.Log) (*MockRiverRegistryStreamUpdated, error) {
	event := new(MockRiverRegistryStreamUpdated)
	if err := _MockRiverRegistry.contract.UnpackLog(event, "StreamUpdated", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
