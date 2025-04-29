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
	ABI: "[{\"type\":\"constructor\",\"inputs\":[{\"name\":\"approvedOperators\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"stateMutability\":\"payable\"},{\"type\":\"function\",\"name\":\"__OperatorRegistry_init\",\"inputs\":[{\"name\":\"initialOperators\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"__RiverConfig_init\",\"inputs\":[{\"name\":\"configManagers\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"addStream\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"genesisMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"stream\",\"type\":\"tuple\",\"internalType\":\"structStream\",\"components\":[{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"reserved0\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"flags\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"}]}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"allocateStream\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"},{\"name\":\"genesisMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"genesisMiniblock\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"approveConfigurationManager\",\"inputs\":[{\"name\":\"manager\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"approveOperator\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"configurationExists\",\"inputs\":[{\"name\":\"key\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"deleteConfiguration\",\"inputs\":[{\"name\":\"key\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"deleteConfigurationOnBlock\",\"inputs\":[{\"name\":\"key\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"blockNumber\",\"type\":\"uint64\",\"internalType\":\"uint64\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"getAllConfiguration\",\"inputs\":[],\"outputs\":[{\"name\":\"settings\",\"type\":\"tuple[]\",\"internalType\":\"structSetting[]\",\"components\":[{\"name\":\"key\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"blockNumber\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"value\",\"type\":\"bytes\",\"internalType\":\"bytes\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getAllNodeAddresses\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getAllNodes\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"tuple[]\",\"internalType\":\"structNode[]\",\"components\":[{\"name\":\"status\",\"type\":\"uint8\",\"internalType\":\"enumNodeStatus\"},{\"name\":\"url\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getAllOperators\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getConfiguration\",\"inputs\":[{\"name\":\"key\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple[]\",\"internalType\":\"structSetting[]\",\"components\":[{\"name\":\"key\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"blockNumber\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"value\",\"type\":\"bytes\",\"internalType\":\"bytes\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getNode\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple\",\"internalType\":\"structNode\",\"components\":[{\"name\":\"status\",\"type\":\"uint8\",\"internalType\":\"enumNodeStatus\"},{\"name\":\"url\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getNodeCount\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getPaginatedStreams\",\"inputs\":[{\"name\":\"start\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"stop\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple[]\",\"internalType\":\"structStreamWithId[]\",\"components\":[{\"name\":\"id\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"stream\",\"type\":\"tuple\",\"internalType\":\"structStream\",\"components\":[{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"reserved0\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"flags\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"}]}]},{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getPaginatedStreamsOnNode\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"start\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"stop\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"streams\",\"type\":\"tuple[]\",\"internalType\":\"structStreamWithId[]\",\"components\":[{\"name\":\"id\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"stream\",\"type\":\"tuple\",\"internalType\":\"structStream\",\"components\":[{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"reserved0\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"flags\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"}]}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getStream\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"stream\",\"type\":\"tuple\",\"internalType\":\"structStream\",\"components\":[{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"reserved0\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"flags\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getStreamCount\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getStreamCountOnNode\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"count\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getStreamWithGenesis\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"stream\",\"type\":\"tuple\",\"internalType\":\"structStream\",\"components\":[{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"reserved0\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"flags\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"}]},{\"name\":\"\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"isConfigurationManager\",\"inputs\":[{\"name\":\"manager\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"isNode\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"isOperator\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"isStream\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"placeStreamOnNode\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"registerNode\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"url\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"status\",\"type\":\"uint8\",\"internalType\":\"enumNodeStatus\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"removeConfigurationManager\",\"inputs\":[{\"name\":\"manager\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"removeNode\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"removeOperator\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"removeStreamFromNode\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setConfiguration\",\"inputs\":[{\"name\":\"key\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"blockNumber\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"value\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setStreamLastMiniblockBatch\",\"inputs\":[{\"name\":\"miniblocks\",\"type\":\"tuple[]\",\"internalType\":\"structSetMiniblock[]\",\"components\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"prevMiniBlockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"isSealed\",\"type\":\"bool\",\"internalType\":\"bool\"}]}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setStreamReplicationFactor\",\"inputs\":[{\"name\":\"requests\",\"type\":\"tuple[]\",\"internalType\":\"structSetStreamReplicationFactor[]\",\"components\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"},{\"name\":\"replicationFactor\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"syncNodesOnStreams\",\"inputs\":[{\"name\":\"start\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"stop\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"updateNodeStatus\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"status\",\"type\":\"uint8\",\"internalType\":\"enumNodeStatus\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"updateNodeUrl\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"url\",\"type\":\"string\",\"internalType\":\"string\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"ConfigurationChanged\",\"inputs\":[{\"name\":\"key\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"block\",\"type\":\"uint64\",\"indexed\":false,\"internalType\":\"uint64\"},{\"name\":\"value\",\"type\":\"bytes\",\"indexed\":false,\"internalType\":\"bytes\"},{\"name\":\"deleted\",\"type\":\"bool\",\"indexed\":false,\"internalType\":\"bool\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"ConfigurationManagerAdded\",\"inputs\":[{\"name\":\"manager\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"ConfigurationManagerRemoved\",\"inputs\":[{\"name\":\"manager\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Initialized\",\"inputs\":[{\"name\":\"version\",\"type\":\"uint32\",\"indexed\":false,\"internalType\":\"uint32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceAdded\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceRemoved\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"NodeAdded\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"operator\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"url\",\"type\":\"string\",\"indexed\":false,\"internalType\":\"string\"},{\"name\":\"status\",\"type\":\"uint8\",\"indexed\":false,\"internalType\":\"enumNodeStatus\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"NodeRemoved\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"NodeStatusUpdated\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"status\",\"type\":\"uint8\",\"indexed\":false,\"internalType\":\"enumNodeStatus\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"NodeUrlUpdated\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"url\",\"type\":\"string\",\"indexed\":false,\"internalType\":\"string\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"OperatorAdded\",\"inputs\":[{\"name\":\"operatorAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"OperatorRemoved\",\"inputs\":[{\"name\":\"operatorAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"OwnershipTransferred\",\"inputs\":[{\"name\":\"previousOwner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"newOwner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"StreamLastMiniblockUpdateFailed\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"indexed\":false,\"internalType\":\"uint64\"},{\"name\":\"reason\",\"type\":\"string\",\"indexed\":false,\"internalType\":\"string\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"StreamUpdated\",\"inputs\":[{\"name\":\"eventType\",\"type\":\"uint8\",\"indexed\":true,\"internalType\":\"enumIStreamRegistryBase.StreamEventType\"},{\"name\":\"data\",\"type\":\"bytes\",\"indexed\":false,\"internalType\":\"bytes\"}],\"anonymous\":false},{\"type\":\"error\",\"name\":\"Initializable_InInitializingState\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Initializable_NotInInitializingState\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_AlreadySupported\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_NotSupported\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Ownable__NotOwner\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"Ownable__ZeroAddress\",\"inputs\":[]}]",
	Bin: "0x6080604052604051615c72380380615c7283398101604081905261002291610416565b61002a610085565b6100333361012b565b80515f5b8181101561007d575f838281518110610052576100526104e0565b6020026020010151905061006b816101cf60201b60201c565b61007481610282565b50600101610037565b5050506104f4565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef520008054640100000000900460ff16156100d1576040516366008a2d60e01b815260040160405180910390fd5b805463ffffffff908116101561012857805463ffffffff191663ffffffff90811782556040519081527fe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c9060200160405180910390a15b50565b5f61014a5f516020615c525f395f51905f52546001600160a01b031690565b90506001600160a01b03821661017357604051634e3ef82560e01b815260040160405180910390fd5b815f516020615c525f395f51905f5280546001600160a01b0319166001600160a01b03928316179055604051838216918316907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0905f90a35050565b6001600160a01b038116610204576040805180820190915260078152664241445f41524760c81b60208201526102049061032a565b61020d8161034d565b156102405760408051808201909152600e81526d414c52454144595f45584953545360901b60208201526102409061032a565b61024b60088261035f565b506040516001600160a01b038216907fac6fa858e9350a46cec16539926e0fde25b7629f84b5a72bffaae4df888ae86d905f90a250565b6001600160a01b0381166102b7576040805180820190915260078152664241445f41524760c81b60208201526102b79061032a565b6102c2600d8261035f565b6102f45760408051808201909152600e81526d414c52454144595f45584953545360901b60208201526102f49061032a565b6040516001600160a01b038216907f7afd798379ae2d2e5035438544cea2b60eb1dde6a8128e6d447fd2a25f8825a2905f90a250565b6308c379a06040820352602080820352601f19601f825101166044810160248303fd5b5f61035960088361037a565b92915050565b5f610373836001600160a01b03841661039b565b9392505050565b6001600160a01b0381165f9081526001830160205260408120541515610373565b5f8181526001830160205260408120546103e057508154600181810184555f848152602080822090930184905584548482528286019093526040902091909155610359565b505f610359565b634e487b7160e01b5f52604160045260245ffd5b80516001600160a01b0381168114610411575f5ffd5b919050565b5f60208284031215610426575f5ffd5b81516001600160401b0381111561043b575f5ffd5b8201601f8101841361044b575f5ffd5b80516001600160401b03811115610464576104646103e7565b604051600582901b90603f8201601f191681016001600160401b0381118282101715610492576104926103e7565b6040529182526020818401810192908101878411156104af575f5ffd5b6020850194505b838510156104d5576104c7856103fb565b8152602094850194016104b6565b509695505050505050565b634e487b7160e01b5f52603260045260245ffd5b615751806105015f395ff3fe608060405234801561000f575f5ffd5b5060043610610283575f3560e01c8063a09449a611610157578063c87d1324116100d2578063d911c63211610088578063eecc66f41161006e578063eecc66f414610598578063fc207c01146105ab578063ff3a14ab146105be575f5ffd5b8063d911c6321461057d578063ee885b1214610585575f5ffd5b8063ca78c41a116100b8578063ca78c41a14610536578063d0c27c4f14610557578063d4bd44a01461056a575f5ffd5b8063c87d13241461050e578063c8fe3a0114610521575f5ffd5b8063b2e76b8e11610127578063ba428b1a1161010d578063ba428b1a146104e0578063c0f22084146104f3578063c179b85f146104fb575f5ffd5b8063b2e76b8e146104ba578063b7f227ee146104cd575f5ffd5b8063a09449a61461046c578063a1174e7d1461047f578063ac8a584a14610494578063b2b99ec9146104a7575f5ffd5b80633c2544d1116102015780637e4465e7116101b75780639283ae3a1161019d5780639283ae3a146104265780639d209048146104395780639ee86d3814610459575f5ffd5b80637e4465e714610400578063813049ec14610413575f5ffd5b80635c665ce9116101e75780635c665ce9146103c75780636b883c39146103da5780636d70f7ae146103ed575f5ffd5b80633c2544d114610392578063581f8b9b146103b4575f5ffd5b80631290abe811610256578063242cae9f1161023c578063242cae9f14610356578063313745111461036957806339bf397e1461037c575f5ffd5b80631290abe81461031657806322bbda6414610336575f5ffd5b80630175015214610287578063035759e1146102d957806303cc8793146102ee578063081814db14610301575b5f5ffd5b6102c46102953660046141e5565b73ffffffffffffffffffffffffffffffffffffffff9081165f9081526007602052604090206002015416151590565b60405190151581526020015b60405180910390f35b6102ec6102e7366004614200565b6105d1565b005b6102ec6102fc366004614217565b6106e9565b610309610750565b6040516102d09190614283565b610329610324366004614200565b610981565b6040516102d091906143d9565b6103496103443660046143eb565b610aaa565b6040516102d091906144ac565b6102ec6103643660046141e5565b610c64565b6102ec6103773660046144ff565b610ce7565b610384610d8b565b6040519081526020016102d0565b6103a56103a0366004614200565b610d9b565b6040516102d09392919061453e565b6102ec6103c2366004614585565b610f70565b6102ec6103d53660046144ff565b611171565b6102ec6103e83660046145f6565b6113f2565b6102c46103fb3660046141e5565b611565565b6102ec61040e36600461474e565b611577565b6102ec6104213660046141e5565b6117bb565b610309610434366004614200565b611916565b61044c6104473660046141e5565b611a7d565b6040516102d09190614872565b6102ec610467366004614884565b611c15565b6102ec61047a3660046148c7565b611e54565b610487612143565b6040516102d0919061491f565b6102ec6104a23660046141e5565b61232a565b6102ec6104b53660046141e5565b6124eb565b6102ec6104c8366004614994565b61272a565b6102ec6104db3660046149e6565b612814565b6102ec6104ee3660046144ff565b612a92565b610384612b36565b6102ec6105093660046141e5565b612b40565b61038461051c3660046141e5565b612bbb565b610529612be8565b6040516102d09190614a09565b610549610544366004614217565b612bf4565b6040516102d0929190614a61565b6102c4610565366004614200565b612d8c565b6102c46105783660046141e5565b612d97565b610529612da3565b6102ec610593366004614884565b612daf565b6102ec6105a6366004614a84565b61308a565b6102c46105b9366004614200565b6132c6565b6102ec6105cc366004614ae0565b6132d2565b336105dd600d82613771565b61061f5761061f6040518060400160405280600881526020017f4241445f415554480000000000000000000000000000000000000000000000008152506137a2565b8161062b600a826137c5565b61066d5761066d6040518060400160405280600981526020017f4e4f545f464f554e4400000000000000000000000000000000000000000000008152506137a2565b5f838152600c6020526040812061068391614027565b61068e600a846137dc565b506040805184815267ffffffffffffffff602082015260808183018190525f908201526001606082015290517fc01483261a841a868b99cb8802faed4ea44a1a816651c4f7ee061a96a205fe989181900360a00190a1505050565b5f806106f4816137e7565b838118908411028318848111908590030284019150505b8083101561074b575f61071e81856137f0565b5f81815260026020819052604090912091925061073e90839083016137fb565b505082600101925061070b565b505050565b60605f8061075e600a6137e7565b90505f5b8181101561079c575f610776600a836137f0565b5f818152600c60205260409020549091506107919085614b7e565b935050600101610762565b508167ffffffffffffffff8111156107b6576107b6614678565b60405190808252806020026020018201604052801561080257816020015b60408051606080820183525f8083526020830152918101919091528152602001906001900390816107d45790505b5092505f610810600a6137e7565b90505f805b82811015610979575f610829600a836137f0565b5f818152600c60205260408120805492935091905b8181101561096a5782818154811061085857610858614b91565b905f5260205f2090600302016040518060600160405290815f8201548152602001600182015f9054906101000a900467ffffffffffffffff1667ffffffffffffffff1667ffffffffffffffff1681526020016002820180546108b990614bbe565b80601f01602080910402602001604051908101604052809291908181526020018280546108e590614bbe565b80156109305780601f1061090757610100808354040283529160200191610930565b820191905f5260205f20905b81548152906001019060200180831161091357829003601f168201915b5050505050815250508a878061094590614c09565b98508151811061095757610957614b91565b602090810291909101015260010161083e565b50505050806001019050610815565b505050505090565b6109cd6040518060a001604052805f81526020015f67ffffffffffffffff1681526020015f67ffffffffffffffff1681526020015f67ffffffffffffffff168152602001606081525090565b806040526109da82613867565b5f82815260026020818152604092839020835160a08101855281548152600182015467ffffffffffffffff808216838601526801000000000000000082048116838801527001000000000000000000000000000000009091041660608201529281018054855181850281018501909652808652939491936080860193830182828015610a9a57602002820191905f5260205f20905b815473ffffffffffffffffffffffffffffffffffffffff168152600190910190602001808311610a6f575b5050505050815250509050919050565b73ffffffffffffffffffffffffffffffffffffffff83165f908152601060205260408120606091610ada826137e7565b9050838118818511028418858111868203028067ffffffffffffffff811115610b0557610b05614678565b604051908082528060200260200182016040528015610b3e57816020015b610b2b614045565b815260200190600190039081610b235790505b5094505f5b81811015610c58575f868281518110610b5e57610b5e614b91565b60200260200101519050610b7d828a01876137f090919063ffffffff16565b8082525f90815260026020818152604092839020835160a08101855281548152600182015467ffffffffffffffff808216838601526801000000000000000082048116838801527001000000000000000000000000000000009091041660608201529281018054855181850281018501909652808652939491936080860193830182828015610c4057602002820191905f5260205f20905b815473ffffffffffffffffffffffffffffffffffffffff168152600190910190602001808311610c15575b50505091909252505050602090910152600101610b43565b50505050509392505050565b7f4675fa8241f86f37157864d3d49b85ad4b164352c516da28e1678a90470ae3005473ffffffffffffffffffffffffffffffffffffffff163314610cdb576040517f65f490650000000000000000000000000000000000000000000000000000000081523360048201526024015b60405180910390fd5b610ce4816138b3565b50565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef5200054640100000000900460ff16610d4a576040517f77a399b800000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b5f5b8181101561074b57610d83838383818110610d6957610d69614b91565b9050602002016020810190610d7e91906141e5565b6139a7565b600101610d4c565b5f610d9660056137e7565b905090565b610de76040518060a001604052805f81526020015f67ffffffffffffffff1681526020015f67ffffffffffffffff1681526020015f67ffffffffffffffff168152602001606081525090565b5f606082604052610df784613867565b5f84815260026020818152604080842060048352818520546003845294829020825160a08101845282548152600183015467ffffffffffffffff8082168388015268010000000000000000820481168387015270010000000000000000000000000000000090910416606082015294820180548451818702810187019095528085529296959194919387936080860193919291830182828015610ece57602002820191905f5260205f20905b815473ffffffffffffffffffffffffffffffffffffffff168152600190910190602001808311610ea3575b5050505050815250509250808054610ee590614bbe565b80601f0160208091040260200160405190810160405280929190818152602001828054610f1190614bbe565b8015610f5c5780601f10610f3357610100808354040283529160200191610f5c565b820191905f5260205f20905b815481529060010190602001808311610f3f57829003601f168201915b505050505090509250925092509193909250565b73ffffffffffffffffffffffffffffffffffffffff8083165f90815260076020526040902060020154839116610fde57610fde6040518060400160405280600e81526020017f4e4f44455f4e4f545f464f554e440000000000000000000000000000000000008152506137a2565b33610fea600882613771565b61102c5761102c6040518060400160405280600881526020017f4241445f415554480000000000000000000000000000000000000000000000008152506137a2565b73ffffffffffffffffffffffffffffffffffffffff8085165f908152600760205260409020600301548591339116811461109e5761109e6040518060400160405280600881526020017f4241445f415554480000000000000000000000000000000000000000000000008152506137a2565b73ffffffffffffffffffffffffffffffffffffffff86165f90815260076020526040902080546110d19060ff1687613a90565b8054869082907fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0016600183600581111561110d5761110d61479b565b0217905550600281015460405173ffffffffffffffffffffffffffffffffffffffff909116907f20891cc7622c7951cbd8c70c61a5201eb45625b8c00e8f6c986cfca78f3dbfa090611160908990614c40565b60405180910390a250505050505050565b3361117d600d82613771565b6111bf576111bf6040518060400160405280600881526020017f4241445f415554480000000000000000000000000000000000000000000000008152506137a2565b815f819003611206576112066040518060400160405280600781526020017f4241445f415247000000000000000000000000000000000000000000000000008152506137a2565b5f5b818110156113eb573685858381811061122357611223614b91565b90506020028101906112359190614c4e565b90506112476060820160408301614c8a565b60ff161580611275575061125e6020820182614caa565b90506112706060830160408401614c8a565b60ff16115b156112b8576112b86040518060400160405280600781526020017f4241445f415247000000000000000000000000000000000000000000000000008152506137a2565b6112c28135613867565b80355f818152600260208190526040909120916112e0918301613c3c565b6112f782356112f26020850185614caa565b613ca2565b6113046020830183614caa565b600183015461135f9068010000000000000000900467ffffffffffffffff166113336060870160408801614c8a565b60ff167fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00919091161790565b6001840180547fffffffffffffffffffffffffffffffff0000000000000000ffffffffffffffff166801000000000000000067ffffffffffffffff8416021790556113ae6002850184846140a7565b505050506113e16002835f0135836040516020016113cd929190614d0e565b604051602081830303815290604052613d0e565b5050600101611208565b5050505050565b335f8181526007602052604090206002015473ffffffffffffffffffffffffffffffffffffffff1661145c5761145c6040518060400160405280600e81526020017f4e4f44455f4e4f545f464f554e440000000000000000000000000000000000008152506137a2565b8661146681613d4c565b86866114728282613d99565b5f8a8152600260205260409020600181015488908b908b9067ffffffffffffff00680100000000000000009091041660ff8216176001850180547fffffffffffffffffffffffffffffffff0000000000000000ffffffffffffffff166801000000000000000067ffffffffffffffff841602179055845f6114f76002830186866140a7565b5050939093555061150c91505f90508c613e20565b505f8b8152600360205260409020611525878983614e14565b505f8b81526004602052604090208890556115418b8b8b613ca2565b6115585f8c836040516020016113cd929190614d0e565b5050505050505050505050565b5f611571600883613771565b92915050565b33611583600882613771565b6115c5576115c56040518060400160405280600881526020017f4241445f415554480000000000000000000000000000000000000000000000008152506137a2565b73ffffffffffffffffffffffffffffffffffffffff8084165f90815260076020526040902060020154849116611633576116336040518060400160405280600e81526020017f4e4f44455f4e4f545f464f554e440000000000000000000000000000000000008152506137a2565b73ffffffffffffffffffffffffffffffffffffffff8085165f90815260076020526040902060030154859133911681146116a5576116a56040518060400160405280600881526020017f4241445f415554480000000000000000000000000000000000000000000000008152506137a2565b73ffffffffffffffffffffffffffffffffffffffff86165f9081526007602090815260409182902091516116db91889101614f2a565b60405160208183030381529060405280519060200120816001016040516020016117059190614f40565b604051602081830303815290604052805190602001200361175e5761175e6040518060400160405280600781526020017f4241445f415247000000000000000000000000000000000000000000000000008152506137a2565b6001810161176c8782614fcf565b50600281015460405173ffffffffffffffffffffffffffffffffffffffff909116907f4505168a8705a16fd4d0575197fd0f510db69df93a065e158ad2c0957ba12bac906111609089906150e9565b7f4675fa8241f86f37157864d3d49b85ad4b164352c516da28e1678a90470ae3005473ffffffffffffffffffffffffffffffffffffffff16331461182d576040517f65f49065000000000000000000000000000000000000000000000000000000008152336004820152602401610cd2565b73ffffffffffffffffffffffffffffffffffffffff8116611886576118866040518060400160405280600781526020017f4241445f415247000000000000000000000000000000000000000000000000008152506137a2565b611891600d82613e2b565b6118d3576118d36040518060400160405280600981526020017f4e4f545f464f554e4400000000000000000000000000000000000000000000008152506137a2565b60405173ffffffffffffffffffffffffffffffffffffffff8216907ff9889c857e5356066b564327caa757c325ecbc001b2b47d72edf8cf9aedb1be5905f90a250565b606081611924600a826137c5565b611966576119666040518060400160405280600981526020017f4e4f545f464f554e4400000000000000000000000000000000000000000000008152506137a2565b5f838152600c6020908152604080832080548251818502810185019093528083529193909284015b82821015611a70575f848152602090819020604080516060810182526003860290920180548352600181015467ffffffffffffffff1693830193909352600283018054929392918401916119e190614bbe565b80601f0160208091040260200160405190810160405280929190818152602001828054611a0d90614bbe565b8015611a585780601f10611a2f57610100808354040283529160200191611a58565b820191905f5260205f20905b815481529060010190602001808311611a3b57829003601f168201915b5050505050815250508152602001906001019061198e565b5050505091505b50919050565b611aa66040805160808101909152805f81526060602082018190525f6040830181905291015290565b611ab1600583613771565b611af357611af36040518060400160405280600e81526020017f4e4f44455f4e4f545f464f554e440000000000000000000000000000000000008152506137a2565b73ffffffffffffffffffffffffffffffffffffffff82165f90815260076020526040908190208151608081019092528054829060ff166005811115611b3a57611b3a61479b565b6005811115611b4b57611b4b61479b565b8152602001600182018054611b5f90614bbe565b80601f0160208091040260200160405190810160405280929190818152602001828054611b8b90614bbe565b8015611bd65780601f10611bad57610100808354040283529160200191611bd6565b820191905f5260205f20905b815481529060010190602001808311611bb957829003601f168201915b5050509183525050600282015473ffffffffffffffffffffffffffffffffffffffff908116602083015260039092015490911660409091015292915050565b81611c1f81613867565b335f8181526007602052604090206002015473ffffffffffffffffffffffffffffffffffffffff16611c8957611c896040518060400160405280600e81526020017f4e4f44455f4e4f545f464f554e440000000000000000000000000000000000008152506137a2565b5f84815260026020818152604080842073ffffffffffffffffffffffffffffffffffffffff88168552601090925290922090820190611cc89087613e20565b5080545f5b81811015611d6a578673ffffffffffffffffffffffffffffffffffffffff16838281548110611cfe57611cfe614b91565b5f9182526020909120015473ffffffffffffffffffffffffffffffffffffffff1603611d6257611d626040518060400160405280600e81526020017f414c52454144595f4558495354530000000000000000000000000000000000008152506137a2565b600101611ccd565b508154600180820184555f8481526020902090910180547fffffffffffffffffffffffff00000000000000000000000000000000000000001673ffffffffffffffffffffffffffffffffffffffff89161790558301548254611e099168010000000000000000900467ffffffffffffffff169060ff167fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00919091161790565b8360010160086101000a81548167ffffffffffffffff021916908367ffffffffffffffff160217905550611e4b600288856040516020016113cd929190614d0e565b50505050505050565b33611e60600d82613771565b611ea257611ea26040518060400160405280600881526020017f4241445f415554480000000000000000000000000000000000000000000000008152506137a2565b7fffffffffffffffffffffffffffffffffffffffffffffffff000000000000000167ffffffffffffffff851601611f1157611f116040518060400160405280600781526020017f4241445f415247000000000000000000000000000000000000000000000000008152506137a2565b5f829003611f5757611f576040518060400160405280600781526020017f4241445f415247000000000000000000000000000000000000000000000000008152506137a2565b611f62600a866137c5565b611f7357611f71600a86613e20565b505b5f858152600c60205260408120805490915b8181101561202b575f838281548110611fa057611fa0614b91565b5f9182526020909120600390910201600181015490915067ffffffffffffffff8981169116036120225760028101611fd9878983614e14565b507fc01483261a841a868b99cb8802faed4ea44a1a816651c4f7ee061a96a205fe98898989895f6040516120119594939291906150fb565b60405180910390a1505050506113eb565b50600101611f85565b508160405180606001604052808981526020018867ffffffffffffffff16815260200187878080601f0160208091040260200160405190810160405280939291908181526020018383808284375f92018290525093909452505083546001808201865594825260209182902084516003909202019081559083015193810180547fffffffffffffffffffffffffffffffffffffffffffffffff00000000000000001667ffffffffffffffff9095169490941790935550604081015190919060028201906120f89082614fcf565b5050507fc01483261a841a868b99cb8802faed4ea44a1a816651c4f7ee061a96a205fe98878787875f6040516121329594939291906150fb565b60405180910390a150505050505050565b60605f61215060056137e7565b67ffffffffffffffff81111561216857612168614678565b6040519080825280602002602001820160405280156121c257816020015b6121af6040805160808101909152805f81526060602082018190525f6040830181905291015290565b8152602001906001900390816121865790505b5090505f5b6121d160056137e7565b811015611a775760075f6121e66005846137f0565b73ffffffffffffffffffffffffffffffffffffffff168152602081019190915260409081015f208151608081019092528054829060ff16600581111561222e5761222e61479b565b600581111561223f5761223f61479b565b815260200160018201805461225390614bbe565b80601f016020809104026020016040519081016040528092919081815260200182805461227f90614bbe565b80156122ca5780601f106122a1576101008083540402835291602001916122ca565b820191905f5260205f20905b8154815290600101906020018083116122ad57829003601f168201915b5050509183525050600282015473ffffffffffffffffffffffffffffffffffffffff9081166020830152600390920154909116604090910152825183908390811061231757612317614b91565b60209081029190910101526001016121c7565b7f4675fa8241f86f37157864d3d49b85ad4b164352c516da28e1678a90470ae3005473ffffffffffffffffffffffffffffffffffffffff16331461239c576040517f65f49065000000000000000000000000000000000000000000000000000000008152336004820152602401610cd2565b6123a581611565565b6123e7576123e76040518060400160405280601281526020017f4f50455241544f525f4e4f545f464f554e4400000000000000000000000000008152506137a2565b5f6123f260056137e7565b90505f5b8181101561249a5773ffffffffffffffffffffffffffffffffffffffff831660075f6124236005856137f0565b73ffffffffffffffffffffffffffffffffffffffff908116825260208201929092526040015f20600301541603612492576124926040518060400160405280600d81526020017f4f55545f4f465f424f554e4453000000000000000000000000000000000000008152506137a2565b6001016123f6565b506124a6600883613e2b565b5060405173ffffffffffffffffffffffffffffffffffffffff8316907f80c0b871b97b595b16a7741c1b06fed0c6f6f558639f18ccbce50724325dc40d905f90a25050565b73ffffffffffffffffffffffffffffffffffffffff8082165f908152600760205260409020600301548291339116811461255d5761255d6040518060400160405280600881526020017f4241445f415554480000000000000000000000000000000000000000000000008152506137a2565b73ffffffffffffffffffffffffffffffffffffffff8381165f90815260076020526040902060020154166125c9576125c96040518060400160405280600e81526020017f4e4f44455f4e4f545f464f554e440000000000000000000000000000000000008152506137a2565b600573ffffffffffffffffffffffffffffffffffffffff84165f9081526007602052604090205460ff1660058111156126045761260461479b565b14612647576126476040518060400160405280601681526020017f4e4f44455f53544154455f4e4f545f414c4c4f574544000000000000000000008152506137a2565b612652600584613e2b565b5073ffffffffffffffffffffffffffffffffffffffff83165f90815260076020526040812080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00168155906126ab600183018261412d565b506002810180547fffffffffffffffffffffffff000000000000000000000000000000000000000090811690915560039091018054909116905560405173ffffffffffffffffffffffffffffffffffffffff8416907fcfc24166db4bb677e857cacabd1541fb2b30645021b27c5130419589b84db52b905f90a2505050565b335f8181526007602052604090206002015473ffffffffffffffffffffffffffffffffffffffff16612794576127946040518060400160405280600e81526020017f4e4f44455f4e4f545f464f554e440000000000000000000000000000000000008152506137a2565b8361279e81613d4c565b6127ab6080840184614caa565b6127b58282613d99565b6127bf5f88613e20565b505f87815260026020526040902085906127d982826151f0565b50505f8781526004602052604090208690556127fc876112f26080880188614caa565b611e4b600188876040516020016113cd929190615383565b33612820600d82613771565b612862576128626040518060400160405280600881526020017f4241445f415554480000000000000000000000000000000000000000000000008152506137a2565b5f838152600c602052604081208054825b818110156129ef578567ffffffffffffffff1683828154811061289857612898614b91565b5f91825260209091206001600390920201015467ffffffffffffffff16036129e757826128c6600184615468565b815481106128d6576128d6614b91565b905f5260205f2090600302018382815481106128f4576128f4614b91565b5f9182526020909120825460039092020190815560018083015490820180547fffffffffffffffffffffffffffffffffffffffffffffffff00000000000000001667ffffffffffffffff9092169190911790556002808201906129599084018261547b565b509050508280548061296d5761296d6155a4565b5f8281526020812060037fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff909301928302018181556001810180547fffffffffffffffffffffffffffffffffffffffffffffffff0000000000000000169055906129da600283018261412d565b50509055600193506129ef565b600101612873565b5082612a3357612a336040518060400160405280600981526020017f4e4f545f464f554e4400000000000000000000000000000000000000000000008152506137a2565b6040805187815267ffffffffffffffff8716602082015260808183018190525f908201526001606082015290517fc01483261a841a868b99cb8802faed4ea44a1a816651c4f7ee061a96a205fe989181900360a00190a1505050505050565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef5200054640100000000900460ff16612af5576040517f77a399b800000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b5f5b8181101561074b57612b2e838383818110612b1457612b14614b91565b9050602002016020810190612b2991906141e5565b6138b3565b600101612af7565b5f610d96816137e7565b7f4675fa8241f86f37157864d3d49b85ad4b164352c516da28e1678a90470ae3005473ffffffffffffffffffffffffffffffffffffffff163314612bb2576040517f65f49065000000000000000000000000000000000000000000000000000000008152336004820152602401610cd2565b610ce4816139a7565b73ffffffffffffffffffffffffffffffffffffffff81165f908152601060205260408120611571906137e7565b6060610d966005613e4c565b60605f80612c01816137e7565b9050838118818511028418858111868203025f8167ffffffffffffffff811115612c2d57612c2d614678565b604051908082528060200260200182016040528015612c6657816020015b612c53614045565b815260200190600190039081612c4b5790505b5090505f5b82811015612d7a575f828281518110612c8657612c86614b91565b60209081029190910101519050612c9f5f8b84016137f0565b8082525f90815260026020818152604092839020835160a08101855281548152600182015467ffffffffffffffff808216838601526801000000000000000082048116838801527001000000000000000000000000000000009091041660608201529281018054855181850281018501909652808652939491936080860193830182828015612d6257602002820191905f5260205f20905b815473ffffffffffffffffffffffffffffffffffffffff168152600190910190602001808311612d37575b50505091909252505050602090910152600101612c6b565b509450505083101590505b9250929050565b5f61157181836137c5565b5f611571600d83613771565b6060610d966008613e4c565b81612db981613867565b335f8181526007602052604090206002015473ffffffffffffffffffffffffffffffffffffffff16612e2357612e236040518060400160405280600e81526020017f4e4f44455f4e4f545f464f554e440000000000000000000000000000000000008152506137a2565b5f84815260026020818152604080842073ffffffffffffffffffffffffffffffffffffffff88168552601090925290922090820190612e6290876137dc565b5080545f90815b81811015612fd3578773ffffffffffffffffffffffffffffffffffffffff16848281548110612e9a57612e9a614b91565b5f9182526020909120015473ffffffffffffffffffffffffffffffffffffffff1603612fcb5783612ecc600184615468565b81548110612edc57612edc614b91565b905f5260205f20015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff16848281548110612f1657612f16614b91565b905f5260205f20015f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555083805480612f6b57612f6b6155a4565b5f8281526020902081017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff90810180547fffffffffffffffffffffffff000000000000000000000000000000000000000016905501905560019250612fd3565b600101612e69565b5081613017576130176040518060400160405280600e81526020017f4e4f44455f4e4f545f464f554e440000000000000000000000000000000000008152506137a2565b60018401805484547fffffffffffffffffffffffffffffffff0000000000000000ffffffffffffffff821660ff909116680100000000000000009283900467ffffffffffffff001617909102179055604051613080906002906113cd908b908890602001614d0e565b5050505050505050565b33613096600882613771565b6130d8576130d86040518060400160405280600881526020017f4241445f415554480000000000000000000000000000000000000000000000008152506137a2565b73ffffffffffffffffffffffffffffffffffffffff8481165f908152600760205260409020600201541615613145576131456040518060400160405280600e81526020017f414c52454144595f4558495354530000000000000000000000000000000000008152506137a2565b5f60405180608001604052808460058111156131635761316361479b565b81526020810186905273ffffffffffffffffffffffffffffffffffffffff8716604082015233606090910152905061319c600586613e58565b5073ffffffffffffffffffffffffffffffffffffffff85165f908152600760205260409020815181548392919082907fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff001660018360058111156132015761320161479b565b02179055506020820151600182019061321a9082614fcf565b506040828101516002830180547fffffffffffffffffffffffff000000000000000000000000000000000000000090811673ffffffffffffffffffffffffffffffffffffffff938416179091556060909401516003909301805490941692811692909217909255905133918716907f759154d15a6aec80ceab7bc8820f46ebc53ad68bb18f47afb77483fea9dcc9ff906132b790889088906155d1565b60405180910390a35050505050565b5f611571600a836137c5565b335f8181526007602052604090206002015473ffffffffffffffffffffffffffffffffffffffff1661333c5761333c6040518060400160405280600e81526020017f4e4f44455f4e4f545f464f554e440000000000000000000000000000000000008152506137a2565b815f819003613383576133836040518060400160405280600781526020017f4241445f415247000000000000000000000000000000000000000000000000008152506137a2565b5f8167ffffffffffffffff81111561339d5761339d614678565b60405190808252806020026020018201604052801561340757816020015b6133f46040518060a001604052805f81526020015f81526020015f81526020015f67ffffffffffffffff1681526020015f151581525090565b8152602001906001900390816133bb5790505b5090505f805b8381101561374f573687878381811061342857613428614b91565b60a00291909101915061343e90505f82356137c5565b6134ca577f75460fe319331413a18a82d99b07735cec53fa0c4061ada38c2141e331082afa8135604083013561347a60808501606086016155f2565b604080518082018252600981527f4e4f545f464f554e440000000000000000000000000000000000000000000000602082015290516134bc949392919061560d565b60405180910390a150613747565b80355f90815260026020526040902060018082015470010000000000000000000000000000000090041615613582577f75460fe319331413a18a82d99b07735cec53fa0c4061ada38c2141e331082afa8235604084013561353160808601606087016155f2565b604080518082018252600d81527f53545245414d5f5345414c45440000000000000000000000000000000000000060208201529051613573949392919061560d565b60405180910390a15050613747565b61359260808301606084016155f2565b600182015467ffffffffffffffff918216911610613624577f75460fe319331413a18a82d99b07735cec53fa0c4061ada38c2141e331082afa823560408401356135e260808601606087016155f2565b604080518082018252600781527f4241445f4152470000000000000000000000000000000000000000000000000060208201529051613573949392919061560d565b600181015467ffffffffffffffff165f036136515781355f9081526003602052604081206136519161412d565b6040820135815561366860808301606084016155f2565b6001820180547fffffffffffffffffffffffffffffffffffffffffffffffff00000000000000001667ffffffffffffffff929092169190911790556136b360a083016080840161564a565b1561370d57600181810180547fffffffffffffffff0000000000000000ffffffffffffffffffffffffffffffff81167001000000000000000000000000000000009182900467ffffffffffffffff16909317029190911790555b61371c36839003830183615663565b858561372781614c09565b96508151811061373957613739614b91565b602002602001018190525050505b60010161340d565b508082526137696003836040516020016113cd91906156de565b505050505050565b73ffffffffffffffffffffffffffffffffffffffff81165f90815260018301602052604081205415155b9392505050565b6308c379a06040820352602080820352601f19601f825101166044810160248303fd5b5f818152600183016020526040812054151561379b565b5f61379b8383613e79565b5f611571825490565b5f61379b8383613f5c565b80545f5b8181101561386157613858845f6010015f86858154811061382257613822614b91565b5f91825260208083209091015473ffffffffffffffffffffffffffffffffffffffff168352820192909252604001902090613e20565b506001016137ff565b50505050565b6138715f826137c5565b610ce457610ce46040518060400160405280600981526020017f4e4f545f464f554e4400000000000000000000000000000000000000000000008152506137a2565b73ffffffffffffffffffffffffffffffffffffffff811661390c5761390c6040518060400160405280600781526020017f4241445f415247000000000000000000000000000000000000000000000000008152506137a2565b61391581611565565b15613958576139586040518060400160405280600e81526020017f414c52454144595f4558495354530000000000000000000000000000000000008152506137a2565b613963600882613e58565b5060405173ffffffffffffffffffffffffffffffffffffffff8216907fac6fa858e9350a46cec16539926e0fde25b7629f84b5a72bffaae4df888ae86d905f90a250565b73ffffffffffffffffffffffffffffffffffffffff8116613a0057613a006040518060400160405280600781526020017f4241445f415247000000000000000000000000000000000000000000000000008152506137a2565b613a0b600d82613e58565b613a4d57613a4d6040518060400160405280600e81526020017f414c52454144595f4558495354530000000000000000000000000000000000008152506137a2565b60405173ffffffffffffffffffffffffffffffffffffffff8216907f7afd798379ae2d2e5035438544cea2b60eb1dde6a8128e6d447fd2a25f8825a2905f90a250565b5f826005811115613aa357613aa361479b565b1480613b1357506001826005811115613abe57613abe61479b565b148015613b1357506003816005811115613ada57613ada61479b565b1480613af757506004816005811115613af557613af561479b565b145b80613b1357506002816005811115613b1157613b1161479b565b145b80613b6657506002826005811115613b2d57613b2d61479b565b148015613b6657506003816005811115613b4957613b4961479b565b1480613b6657506004816005811115613b6457613b6461479b565b145b80613bb957506004826005811115613b8057613b8061479b565b148015613bb957506003816005811115613b9c57613b9c61479b565b1480613bb957506005816005811115613bb757613bb761479b565b145b80613bf157506003826005811115613bd357613bd361479b565b148015613bf157506005816005811115613bef57613bef61479b565b145b15613bfa575050565b613c386040518060400160405280601681526020017f4e4f44455f53544154455f4e4f545f414c4c4f574544000000000000000000008152506137a2565b5050565b80545f5b8181101561386157613c99845f6010015f868581548110613c6357613c63614b91565b5f91825260208083209091015473ffffffffffffffffffffffffffffffffffffffff1683528201929092526040019020906137dc565b50600101613c40565b5f5b8181101561386157613d058460105f868686818110613cc557613cc5614b91565b9050602002016020810190613cda91906141e5565b73ffffffffffffffffffffffffffffffffffffffff16815260208101919091526040015f2090613e20565b50600101613ca4565b5f7f378ece20ebca29c2f887798617154658265a73d80c84fad8c9c49639ffdb29bb9050602082038051602082528483604086510184a29052505050565b613d565f826137c5565b15610ce457610ce46040518060400160405280600e81526020017f414c52454144595f4558495354530000000000000000000000000000000000008152506137a2565b805f5b8181101561386157613dd6848483818110613db957613db9614b91565b9050602002016020810190613dce91906141e5565b600590613771565b613e1857613e186040518060400160405280600e81526020017f4e4f44455f4e4f545f464f554e440000000000000000000000000000000000008152506137a2565b600101613d9c565b5f61379b8383613f82565b5f61379b8373ffffffffffffffffffffffffffffffffffffffff8416613e79565b60605f61379b83613fce565b5f61379b8373ffffffffffffffffffffffffffffffffffffffff8416613f82565b5f8181526001830160205260408120548015613f53575f613e9b600183615468565b85549091505f90613eae90600190615468565b9050808214613f0d575f865f018281548110613ecc57613ecc614b91565b905f5260205f200154905080875f018481548110613eec57613eec614b91565b5f918252602080832090910192909255918252600188019052604090208390555b8554869080613f1e57613f1e6155a4565b600190038181905f5260205f20015f90559055856001015f8681526020019081526020015f205f905560019350505050611571565b5f915050611571565b5f825f018281548110613f7157613f71614b91565b905f5260205f200154905092915050565b5f818152600183016020526040812054613fc757508154600181810184555f848152602080822090930184905584548482528286019093526040902091909155611571565b505f611571565b6060815f0180548060200260200160405190810160405280929190818152602001828054801561401b57602002820191905f5260205f20905b815481526020019060010190808311614007575b50505050509050919050565b5080545f8255600302905f5260205f2090810190610ce49190614164565b60405180604001604052805f81526020016140a26040518060a001604052805f81526020015f67ffffffffffffffff1681526020015f67ffffffffffffffff1681526020015f67ffffffffffffffff168152602001606081525090565b905290565b828054828255905f5260205f2090810192821561411d579160200282015b8281111561411d5781547fffffffffffffffffffffffff00000000000000000000000000000000000000001673ffffffffffffffffffffffffffffffffffffffff8435161782556020909201916001909101906140c5565b506141299291506141b0565b5090565b50805461413990614bbe565b5f825580601f10614148575050565b601f0160209004905f5260205f2090810190610ce491906141b0565b80821115614129575f8082556001820180547fffffffffffffffffffffffffffffffffffffffffffffffff00000000000000001690556141a7600283018261412d565b50600301614164565b5b80821115614129575f81556001016141b1565b73ffffffffffffffffffffffffffffffffffffffff81168114610ce4575f5ffd5b5f602082840312156141f5575f5ffd5b813561379b816141c4565b5f60208284031215614210575f5ffd5b5035919050565b5f5f60408385031215614228575f5ffd5b50508035926020909101359150565b5f81518084528060208401602086015e5f6020828601015260207fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0601f83011685010191505092915050565b5f602082016020835280845180835260408501915060408160051b8601019250602086015f5b82811015614323577fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc087860301845281518051865267ffffffffffffffff6020820151166020870152604081015190506060604087015261430d6060870182614237565b95505060209384019391909101906001016142a9565b50929695505050505050565b5f60a083018251845267ffffffffffffffff602084015116602085015267ffffffffffffffff604084015116604085015267ffffffffffffffff6060840151166060850152608083015160a0608086015281815180845260c0870191506020830193505f92505b808310156143cf5773ffffffffffffffffffffffffffffffffffffffff8451168252602082019150602084019350600183019250614396565b5095945050505050565b602081525f61379b602083018461432f565b5f5f5f606084860312156143fd575f5ffd5b8335614408816141c4565b95602085013595506040909401359392505050565b5f82825180855260208501945060208160051b830101602085015f5b838110156144a0577fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe08584030188528151805184526020810151905060406020850152614489604085018261432f565b6020998a0199909450929092019150600101614439565b50909695505050505050565b602081525f61379b602083018461441d565b5f5f83601f8401126144ce575f5ffd5b50813567ffffffffffffffff8111156144e5575f5ffd5b6020830191508360208260051b8501011115612d85575f5ffd5b5f5f60208385031215614510575f5ffd5b823567ffffffffffffffff811115614526575f5ffd5b614532858286016144be565b90969095509350505050565b606081525f614550606083018661432f565b84602084015282810360408401526145688185614237565b9695505050505050565b803560068110614580575f5ffd5b919050565b5f5f60408385031215614596575f5ffd5b82356145a1816141c4565b91506145af60208401614572565b90509250929050565b5f5f83601f8401126145c8575f5ffd5b50813567ffffffffffffffff8111156145df575f5ffd5b602083019150836020828501011115612d85575f5ffd5b5f5f5f5f5f5f6080878903121561460b575f5ffd5b86359550602087013567ffffffffffffffff811115614628575f5ffd5b61463489828a016144be565b90965094505060408701359250606087013567ffffffffffffffff81111561465a575f5ffd5b61466689828a016145b8565b979a9699509497509295939492505050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52604160045260245ffd5b5f82601f8301126146b4575f5ffd5b813567ffffffffffffffff8111156146ce576146ce614678565b604051601f82017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0908116603f0116810167ffffffffffffffff8111828210171561471b5761471b614678565b604052818152838201602001851015614732575f5ffd5b816020850160208301375f918101602001919091529392505050565b5f5f6040838503121561475f575f5ffd5b823561476a816141c4565b9150602083013567ffffffffffffffff811115614785575f5ffd5b614791858286016146a5565b9150509250929050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52602160045260245ffd5b600681106147fd577f4e487b71000000000000000000000000000000000000000000000000000000005f52602160045260245ffd5b9052565b61480c8282516147c8565b5f6020820151608060208501526148266080850182614237565b905073ffffffffffffffffffffffffffffffffffffffff604084015116604085015273ffffffffffffffffffffffffffffffffffffffff60608401511660608501528091505092915050565b602081525f61379b6020830184614801565b5f5f60408385031215614895575f5ffd5b8235915060208301356148a7816141c4565b809150509250929050565b67ffffffffffffffff81168114610ce4575f5ffd5b5f5f5f5f606085870312156148da575f5ffd5b8435935060208501356148ec816148b2565b9250604085013567ffffffffffffffff811115614907575f5ffd5b614913878288016145b8565b95989497509550505050565b5f602082016020835280845180835260408501915060408160051b8601019250602086015f5b82811015614323577fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc087860301845261497f858351614801565b94506020938401939190910190600101614945565b5f5f5f606084860312156149a6575f5ffd5b8335925060208401359150604084013567ffffffffffffffff8111156149ca575f5ffd5b840160a081870312156149db575f5ffd5b809150509250925092565b5f5f604083850312156149f7575f5ffd5b8235915060208301356148a7816148b2565b602080825282518282018190525f918401906040840190835b81811015614a5657835173ffffffffffffffffffffffffffffffffffffffff16835260209384019390920191600101614a22565b509095945050505050565b604081525f614a73604083018561441d565b905082151560208301529392505050565b5f5f5f60608486031215614a96575f5ffd5b8335614aa1816141c4565b9250602084013567ffffffffffffffff811115614abc575f5ffd5b614ac8868287016146a5565b925050614ad760408501614572565b90509250925092565b5f5f60208385031215614af1575f5ffd5b823567ffffffffffffffff811115614b07575f5ffd5b8301601f81018513614b17575f5ffd5b803567ffffffffffffffff811115614b2d575f5ffd5b85602060a083028401011115614b41575f5ffd5b6020919091019590945092505050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b8082018082111561157157611571614b51565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52603260045260245ffd5b600181811c90821680614bd257607f821691505b602082108103611a77577f4e487b71000000000000000000000000000000000000000000000000000000005f52602260045260245ffd5b5f7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8203614c3957614c39614b51565b5060010190565b6020810161157182846147c8565b5f82357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffa1833603018112614c80575f5ffd5b9190910192915050565b5f60208284031215614c9a575f5ffd5b813560ff8116811461379b575f5ffd5b5f5f83357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe1843603018112614cdd575f5ffd5b83018035915067ffffffffffffffff821115614cf7575f5ffd5b6020019150600581901b3603821315612d85575f5ffd5b828152604060208201525f60e0820183546040840152600184015467ffffffffffffffff8116606085015267ffffffffffffffff8160401c16608085015267ffffffffffffffff8160801c1660a0850152506002840160a060c085015281815480845261010086019150825f5260205f2093505f92505b80831015614dbe5773ffffffffffffffffffffffffffffffffffffffff8454168252602082019150600184019350600183019250614d85565b509695505050505050565b5b81811015613c38575f8155600101614dca565b601f82111561074b57805f5260205f20601f840160051c81016020851015614e025750805b6113eb601f850160051c830182614dc9565b67ffffffffffffffff831115614e2c57614e2c614678565b614e4083614e3a8354614bbe565b83614ddd565b5f601f841160018114614e90575f8515614e5a5750838201355b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff600387901b1c1916600186901b1783556113eb565b5f838152602081207fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe08716915b82811015614edd5786850135825560209485019460019092019101614ebd565b5086821015614f18577fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff60f88860031b161c19848701351681555b505060018560011b0183555050505050565b5f82518060208501845e5f920191825250919050565b5f5f8354614f4d81614bbe565b600182168015614f645760018114614f9757614fc4565b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0083168652811515820286019350614fc4565b865f5260205f205f5b83811015614fbc57815488820152600190910190602001614fa0565b505081860193505b509195945050505050565b815167ffffffffffffffff811115614fe957614fe9614678565b614ffd81614ff78454614bbe565b84614ddd565b6020601f821160018114615051575f83156150185750848201515b600184901b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff600386901b1c198216175b8555506113eb565b5f848152602081207fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe08516915b8281101561509e578785015182556020948501946001909201910161507e565b50848210156150da57868401517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff600387901b60f8161c191681555b50505050600190811b01905550565b602081525f61379b6020830184614237565b85815267ffffffffffffffff8516602082015260806040820152826080820152828460a08301375f60a084830101525f60a07fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0601f860116830101905082151560608301529695505050505050565b67ffffffffffffffff83111561518257615182614678565b6801000000000000000083111561519b5761519b614678565b8054838255808410156151bf57815f5260205f206151bd828201868301614dc9565b505b5081815f5260205f205f5b858110156137695782356151dd816141c4565b82820155602092909201916001016151ca565b81358155600181016020830135615206816148b2565b81546040850135615216816148b2565b6fffffffffffffffff00000000000000008160401b1667ffffffffffffffff84167fffffffffffffffffffffffffffffffff000000000000000000000000000000008416171784555050505f6060840135615270816148b2565b82547fffffffffffffffff0000000000000000ffffffffffffffffffffffffffffffff16608091821b77ffffffffffffffff000000000000000000000000000000001617909255505f908190840135368590037fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe10181126152ef575f5ffd5b84018035915067ffffffffffffffff821115615309575f5ffd5b6020019150600581901b3603821315615320575f5ffd5b61386181836002860161516a565b8183526020830192505f815f5b8481101561537957813561534e816141c4565b73ffffffffffffffffffffffffffffffffffffffff168652602095860195919091019060010161533b565b5093949350505050565b828152604060208201525f5f833590508060408401525060208301356153a8816148b2565b67ffffffffffffffff16606083015260408301356153c5816148b2565b67ffffffffffffffff16608083015260608301356153e2816148b2565b67ffffffffffffffff1660a08301526080830135368490037fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe1018112615426575f5ffd5b830160208101903567ffffffffffffffff811115615442575f5ffd5b8060051b3603821315615453575f5ffd5b60a060c085015261456860e08501828461532e565b8181038181111561157157611571614b51565b818103615486575050565b6154908254614bbe565b67ffffffffffffffff8111156154a8576154a8614678565b6154b681614ff78454614bbe565b5f601f821160018114615504575f8315615018575081850154600184901b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff600386901b1c19821617615049565b5f85815260208082208683529082207fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe08616925b838110156155585782860154825560019586019590910190602001615538565b508583101561559457818501547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff600388901b60f8161c191681555b5050505050600190811b01905550565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52603160045260245ffd5b604081525f6155e36040830185614237565b905061379b60208301846147c8565b5f60208284031215615602575f5ffd5b813561379b816148b2565b84815283602082015267ffffffffffffffff83166040820152608060608201525f6145686080830184614237565b80358015158114614580575f5ffd5b5f6020828403121561565a575f5ffd5b61379b8261563b565b5f60a0828403128015615674575f5ffd5b5060405160a0810167ffffffffffffffff8111828210171561569857615698614678565b60409081528335825260208085013590830152838101359082015260608301356156c1816148b2565b60608201526156d26080840161563b565b60808201529392505050565b602080825282518282018190525f918401906040840190835b81811015614a5657835180518452602081015160208501526040810151604085015267ffffffffffffffff60608201511660608501526080810151151560808501525060a0830192506020840193506001810190506156f7564675fa8241f86f37157864d3d49b85ad4b164352c516da28e1678a90470ae300",
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
