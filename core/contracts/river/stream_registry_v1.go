// Code generated via abigen V2 - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package river

import (
	"bytes"
	"errors"
	"math/big"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind/v2"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
)

// Reference imports to suppress errors if they are not otherwise used.
var (
	_ = bytes.Equal
	_ = errors.New
	_ = big.NewInt
	_ = common.Big1
	_ = types.BloomLookup
	_ = abi.ConvertType
)

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

// StreamRegistryV1MetaData contains all meta data concerning the StreamRegistryV1 contract.
var StreamRegistryV1MetaData = bind.MetaData{
	ABI: "[{\"type\":\"function\",\"name\":\"addStream\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"genesisMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"stream\",\"type\":\"tuple\",\"internalType\":\"structStream\",\"components\":[{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"reserved0\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"flags\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"}]}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"allocateStream\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"},{\"name\":\"genesisMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"genesisMiniblock\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"getPaginatedStreams\",\"inputs\":[{\"name\":\"start\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"stop\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple[]\",\"internalType\":\"structStreamWithId[]\",\"components\":[{\"name\":\"id\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"stream\",\"type\":\"tuple\",\"internalType\":\"structStream\",\"components\":[{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"reserved0\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"flags\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"}]}]},{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getPaginatedStreamsOnNode\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"start\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"stop\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"streams\",\"type\":\"tuple[]\",\"internalType\":\"structStreamWithId[]\",\"components\":[{\"name\":\"id\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"stream\",\"type\":\"tuple\",\"internalType\":\"structStream\",\"components\":[{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"reserved0\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"flags\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"}]}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getStream\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple\",\"internalType\":\"structStream\",\"components\":[{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"reserved0\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"flags\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getStreamCount\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getStreamCountOnNode\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getStreamWithGenesis\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple\",\"internalType\":\"structStream\",\"components\":[{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"reserved0\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"flags\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"}]},{\"name\":\"\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"isStream\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"placeStreamOnNode\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"removeStreamFromNode\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setStreamLastMiniblockBatch\",\"inputs\":[{\"name\":\"miniblocks\",\"type\":\"tuple[]\",\"internalType\":\"structSetMiniblock[]\",\"components\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"prevMiniBlockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"isSealed\",\"type\":\"bool\",\"internalType\":\"bool\"}]}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setStreamReplicationFactor\",\"inputs\":[{\"name\":\"requests\",\"type\":\"tuple[]\",\"internalType\":\"structSetStreamReplicationFactor[]\",\"components\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"},{\"name\":\"replicationFactor\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"syncNodesOnStreams\",\"inputs\":[{\"name\":\"start\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"stop\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"StreamLastMiniblockUpdateFailed\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"indexed\":false,\"internalType\":\"uint64\"},{\"name\":\"reason\",\"type\":\"string\",\"indexed\":false,\"internalType\":\"string\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"StreamUpdated\",\"inputs\":[{\"name\":\"eventType\",\"type\":\"uint8\",\"indexed\":true,\"internalType\":\"enumIStreamRegistryBase.StreamEventType\"},{\"name\":\"data\",\"type\":\"bytes\",\"indexed\":false,\"internalType\":\"bytes\"}],\"anonymous\":false}]",
	ID:  "StreamRegistryV1",
}

// StreamRegistryV1 is an auto generated Go binding around an Ethereum contract.
type StreamRegistryV1 struct {
	abi abi.ABI
}

// NewStreamRegistryV1 creates a new instance of StreamRegistryV1.
func NewStreamRegistryV1() *StreamRegistryV1 {
	parsed, err := StreamRegistryV1MetaData.ParseABI()
	if err != nil {
		panic(errors.New("invalid ABI: " + err.Error()))
	}
	return &StreamRegistryV1{abi: *parsed}
}

// Instance creates a wrapper for a deployed contract instance at the given address.
// Use this to create the instance object passed to abigen v2 library functions Call, Transact, etc.
func (c *StreamRegistryV1) Instance(backend bind.ContractBackend, addr common.Address) *bind.BoundContract {
	return bind.NewBoundContract(addr, c.abi, backend, backend, backend)
}

// PackAddStream is the Go binding used to pack the parameters required for calling
// the contract method with ID 0xb2e76b8e.  This method will panic if any
// invalid/nil inputs are passed.
//
// Solidity: function addStream(bytes32 streamId, bytes32 genesisMiniblockHash, (bytes32,uint64,uint64,uint64,address[]) stream) returns()
func (streamRegistryV1 *StreamRegistryV1) PackAddStream(streamId [32]byte, genesisMiniblockHash [32]byte, stream Stream) []byte {
	enc, err := streamRegistryV1.abi.Pack("addStream", streamId, genesisMiniblockHash, stream)
	if err != nil {
		panic(err)
	}
	return enc
}

// TryPackAddStream is the Go binding used to pack the parameters required for calling
// the contract method with ID 0xb2e76b8e.  This method will return an error
// if any inputs are invalid/nil.
//
// Solidity: function addStream(bytes32 streamId, bytes32 genesisMiniblockHash, (bytes32,uint64,uint64,uint64,address[]) stream) returns()
func (streamRegistryV1 *StreamRegistryV1) TryPackAddStream(streamId [32]byte, genesisMiniblockHash [32]byte, stream Stream) ([]byte, error) {
	return streamRegistryV1.abi.Pack("addStream", streamId, genesisMiniblockHash, stream)
}

// PackAllocateStream is the Go binding used to pack the parameters required for calling
// the contract method with ID 0x6b883c39.  This method will panic if any
// invalid/nil inputs are passed.
//
// Solidity: function allocateStream(bytes32 streamId, address[] nodes, bytes32 genesisMiniblockHash, bytes genesisMiniblock) returns()
func (streamRegistryV1 *StreamRegistryV1) PackAllocateStream(streamId [32]byte, nodes []common.Address, genesisMiniblockHash [32]byte, genesisMiniblock []byte) []byte {
	enc, err := streamRegistryV1.abi.Pack("allocateStream", streamId, nodes, genesisMiniblockHash, genesisMiniblock)
	if err != nil {
		panic(err)
	}
	return enc
}

// TryPackAllocateStream is the Go binding used to pack the parameters required for calling
// the contract method with ID 0x6b883c39.  This method will return an error
// if any inputs are invalid/nil.
//
// Solidity: function allocateStream(bytes32 streamId, address[] nodes, bytes32 genesisMiniblockHash, bytes genesisMiniblock) returns()
func (streamRegistryV1 *StreamRegistryV1) TryPackAllocateStream(streamId [32]byte, nodes []common.Address, genesisMiniblockHash [32]byte, genesisMiniblock []byte) ([]byte, error) {
	return streamRegistryV1.abi.Pack("allocateStream", streamId, nodes, genesisMiniblockHash, genesisMiniblock)
}

// PackGetPaginatedStreams is the Go binding used to pack the parameters required for calling
// the contract method with ID 0xca78c41a.  This method will panic if any
// invalid/nil inputs are passed.
//
// Solidity: function getPaginatedStreams(uint256 start, uint256 stop) view returns((bytes32,(bytes32,uint64,uint64,uint64,address[]))[], bool)
func (streamRegistryV1 *StreamRegistryV1) PackGetPaginatedStreams(start *big.Int, stop *big.Int) []byte {
	enc, err := streamRegistryV1.abi.Pack("getPaginatedStreams", start, stop)
	if err != nil {
		panic(err)
	}
	return enc
}

// TryPackGetPaginatedStreams is the Go binding used to pack the parameters required for calling
// the contract method with ID 0xca78c41a.  This method will return an error
// if any inputs are invalid/nil.
//
// Solidity: function getPaginatedStreams(uint256 start, uint256 stop) view returns((bytes32,(bytes32,uint64,uint64,uint64,address[]))[], bool)
func (streamRegistryV1 *StreamRegistryV1) TryPackGetPaginatedStreams(start *big.Int, stop *big.Int) ([]byte, error) {
	return streamRegistryV1.abi.Pack("getPaginatedStreams", start, stop)
}

// GetPaginatedStreamsOutput serves as a container for the return parameters of contract
// method GetPaginatedStreams.
type GetPaginatedStreamsOutput struct {
	Arg0 []StreamWithId
	Arg1 bool
}

// UnpackGetPaginatedStreams is the Go binding that unpacks the parameters returned
// from invoking the contract method with ID 0xca78c41a.
//
// Solidity: function getPaginatedStreams(uint256 start, uint256 stop) view returns((bytes32,(bytes32,uint64,uint64,uint64,address[]))[], bool)
func (streamRegistryV1 *StreamRegistryV1) UnpackGetPaginatedStreams(data []byte) (GetPaginatedStreamsOutput, error) {
	out, err := streamRegistryV1.abi.Unpack("getPaginatedStreams", data)
	outstruct := new(GetPaginatedStreamsOutput)
	if err != nil {
		return *outstruct, err
	}
	outstruct.Arg0 = *abi.ConvertType(out[0], new([]StreamWithId)).(*[]StreamWithId)
	outstruct.Arg1 = *abi.ConvertType(out[1], new(bool)).(*bool)
	return *outstruct, nil
}

// PackGetPaginatedStreamsOnNode is the Go binding used to pack the parameters required for calling
// the contract method with ID 0x22bbda64.  This method will panic if any
// invalid/nil inputs are passed.
//
// Solidity: function getPaginatedStreamsOnNode(address nodeAddress, uint256 start, uint256 stop) view returns((bytes32,(bytes32,uint64,uint64,uint64,address[]))[] streams)
func (streamRegistryV1 *StreamRegistryV1) PackGetPaginatedStreamsOnNode(nodeAddress common.Address, start *big.Int, stop *big.Int) []byte {
	enc, err := streamRegistryV1.abi.Pack("getPaginatedStreamsOnNode", nodeAddress, start, stop)
	if err != nil {
		panic(err)
	}
	return enc
}

// TryPackGetPaginatedStreamsOnNode is the Go binding used to pack the parameters required for calling
// the contract method with ID 0x22bbda64.  This method will return an error
// if any inputs are invalid/nil.
//
// Solidity: function getPaginatedStreamsOnNode(address nodeAddress, uint256 start, uint256 stop) view returns((bytes32,(bytes32,uint64,uint64,uint64,address[]))[] streams)
func (streamRegistryV1 *StreamRegistryV1) TryPackGetPaginatedStreamsOnNode(nodeAddress common.Address, start *big.Int, stop *big.Int) ([]byte, error) {
	return streamRegistryV1.abi.Pack("getPaginatedStreamsOnNode", nodeAddress, start, stop)
}

// UnpackGetPaginatedStreamsOnNode is the Go binding that unpacks the parameters returned
// from invoking the contract method with ID 0x22bbda64.
//
// Solidity: function getPaginatedStreamsOnNode(address nodeAddress, uint256 start, uint256 stop) view returns((bytes32,(bytes32,uint64,uint64,uint64,address[]))[] streams)
func (streamRegistryV1 *StreamRegistryV1) UnpackGetPaginatedStreamsOnNode(data []byte) ([]StreamWithId, error) {
	out, err := streamRegistryV1.abi.Unpack("getPaginatedStreamsOnNode", data)
	if err != nil {
		return *new([]StreamWithId), err
	}
	out0 := *abi.ConvertType(out[0], new([]StreamWithId)).(*[]StreamWithId)
	return out0, nil
}

// PackGetStream is the Go binding used to pack the parameters required for calling
// the contract method with ID 0x1290abe8.  This method will panic if any
// invalid/nil inputs are passed.
//
// Solidity: function getStream(bytes32 streamId) view returns((bytes32,uint64,uint64,uint64,address[]))
func (streamRegistryV1 *StreamRegistryV1) PackGetStream(streamId [32]byte) []byte {
	enc, err := streamRegistryV1.abi.Pack("getStream", streamId)
	if err != nil {
		panic(err)
	}
	return enc
}

// TryPackGetStream is the Go binding used to pack the parameters required for calling
// the contract method with ID 0x1290abe8.  This method will return an error
// if any inputs are invalid/nil.
//
// Solidity: function getStream(bytes32 streamId) view returns((bytes32,uint64,uint64,uint64,address[]))
func (streamRegistryV1 *StreamRegistryV1) TryPackGetStream(streamId [32]byte) ([]byte, error) {
	return streamRegistryV1.abi.Pack("getStream", streamId)
}

// UnpackGetStream is the Go binding that unpacks the parameters returned
// from invoking the contract method with ID 0x1290abe8.
//
// Solidity: function getStream(bytes32 streamId) view returns((bytes32,uint64,uint64,uint64,address[]))
func (streamRegistryV1 *StreamRegistryV1) UnpackGetStream(data []byte) (Stream, error) {
	out, err := streamRegistryV1.abi.Unpack("getStream", data)
	if err != nil {
		return *new(Stream), err
	}
	out0 := *abi.ConvertType(out[0], new(Stream)).(*Stream)
	return out0, nil
}

// PackGetStreamCount is the Go binding used to pack the parameters required for calling
// the contract method with ID 0xc0f22084.  This method will panic if any
// invalid/nil inputs are passed.
//
// Solidity: function getStreamCount() view returns(uint256)
func (streamRegistryV1 *StreamRegistryV1) PackGetStreamCount() []byte {
	enc, err := streamRegistryV1.abi.Pack("getStreamCount")
	if err != nil {
		panic(err)
	}
	return enc
}

// TryPackGetStreamCount is the Go binding used to pack the parameters required for calling
// the contract method with ID 0xc0f22084.  This method will return an error
// if any inputs are invalid/nil.
//
// Solidity: function getStreamCount() view returns(uint256)
func (streamRegistryV1 *StreamRegistryV1) TryPackGetStreamCount() ([]byte, error) {
	return streamRegistryV1.abi.Pack("getStreamCount")
}

// UnpackGetStreamCount is the Go binding that unpacks the parameters returned
// from invoking the contract method with ID 0xc0f22084.
//
// Solidity: function getStreamCount() view returns(uint256)
func (streamRegistryV1 *StreamRegistryV1) UnpackGetStreamCount(data []byte) (*big.Int, error) {
	out, err := streamRegistryV1.abi.Unpack("getStreamCount", data)
	if err != nil {
		return new(big.Int), err
	}
	out0 := abi.ConvertType(out[0], new(big.Int)).(*big.Int)
	return out0, nil
}

// PackGetStreamCountOnNode is the Go binding used to pack the parameters required for calling
// the contract method with ID 0xc87d1324.  This method will panic if any
// invalid/nil inputs are passed.
//
// Solidity: function getStreamCountOnNode(address nodeAddress) view returns(uint256)
func (streamRegistryV1 *StreamRegistryV1) PackGetStreamCountOnNode(nodeAddress common.Address) []byte {
	enc, err := streamRegistryV1.abi.Pack("getStreamCountOnNode", nodeAddress)
	if err != nil {
		panic(err)
	}
	return enc
}

// TryPackGetStreamCountOnNode is the Go binding used to pack the parameters required for calling
// the contract method with ID 0xc87d1324.  This method will return an error
// if any inputs are invalid/nil.
//
// Solidity: function getStreamCountOnNode(address nodeAddress) view returns(uint256)
func (streamRegistryV1 *StreamRegistryV1) TryPackGetStreamCountOnNode(nodeAddress common.Address) ([]byte, error) {
	return streamRegistryV1.abi.Pack("getStreamCountOnNode", nodeAddress)
}

// UnpackGetStreamCountOnNode is the Go binding that unpacks the parameters returned
// from invoking the contract method with ID 0xc87d1324.
//
// Solidity: function getStreamCountOnNode(address nodeAddress) view returns(uint256)
func (streamRegistryV1 *StreamRegistryV1) UnpackGetStreamCountOnNode(data []byte) (*big.Int, error) {
	out, err := streamRegistryV1.abi.Unpack("getStreamCountOnNode", data)
	if err != nil {
		return new(big.Int), err
	}
	out0 := abi.ConvertType(out[0], new(big.Int)).(*big.Int)
	return out0, nil
}

// PackGetStreamWithGenesis is the Go binding used to pack the parameters required for calling
// the contract method with ID 0x3c2544d1.  This method will panic if any
// invalid/nil inputs are passed.
//
// Solidity: function getStreamWithGenesis(bytes32 streamId) view returns((bytes32,uint64,uint64,uint64,address[]), bytes32, bytes)
func (streamRegistryV1 *StreamRegistryV1) PackGetStreamWithGenesis(streamId [32]byte) []byte {
	enc, err := streamRegistryV1.abi.Pack("getStreamWithGenesis", streamId)
	if err != nil {
		panic(err)
	}
	return enc
}

// TryPackGetStreamWithGenesis is the Go binding used to pack the parameters required for calling
// the contract method with ID 0x3c2544d1.  This method will return an error
// if any inputs are invalid/nil.
//
// Solidity: function getStreamWithGenesis(bytes32 streamId) view returns((bytes32,uint64,uint64,uint64,address[]), bytes32, bytes)
func (streamRegistryV1 *StreamRegistryV1) TryPackGetStreamWithGenesis(streamId [32]byte) ([]byte, error) {
	return streamRegistryV1.abi.Pack("getStreamWithGenesis", streamId)
}

// GetStreamWithGenesisOutput serves as a container for the return parameters of contract
// method GetStreamWithGenesis.
type GetStreamWithGenesisOutput struct {
	Arg0 Stream
	Arg1 [32]byte
	Arg2 []byte
}

// UnpackGetStreamWithGenesis is the Go binding that unpacks the parameters returned
// from invoking the contract method with ID 0x3c2544d1.
//
// Solidity: function getStreamWithGenesis(bytes32 streamId) view returns((bytes32,uint64,uint64,uint64,address[]), bytes32, bytes)
func (streamRegistryV1 *StreamRegistryV1) UnpackGetStreamWithGenesis(data []byte) (GetStreamWithGenesisOutput, error) {
	out, err := streamRegistryV1.abi.Unpack("getStreamWithGenesis", data)
	outstruct := new(GetStreamWithGenesisOutput)
	if err != nil {
		return *outstruct, err
	}
	outstruct.Arg0 = *abi.ConvertType(out[0], new(Stream)).(*Stream)
	outstruct.Arg1 = *abi.ConvertType(out[1], new([32]byte)).(*[32]byte)
	outstruct.Arg2 = *abi.ConvertType(out[2], new([]byte)).(*[]byte)
	return *outstruct, nil
}

// PackIsStream is the Go binding used to pack the parameters required for calling
// the contract method with ID 0xd0c27c4f.  This method will panic if any
// invalid/nil inputs are passed.
//
// Solidity: function isStream(bytes32 streamId) view returns(bool)
func (streamRegistryV1 *StreamRegistryV1) PackIsStream(streamId [32]byte) []byte {
	enc, err := streamRegistryV1.abi.Pack("isStream", streamId)
	if err != nil {
		panic(err)
	}
	return enc
}

// TryPackIsStream is the Go binding used to pack the parameters required for calling
// the contract method with ID 0xd0c27c4f.  This method will return an error
// if any inputs are invalid/nil.
//
// Solidity: function isStream(bytes32 streamId) view returns(bool)
func (streamRegistryV1 *StreamRegistryV1) TryPackIsStream(streamId [32]byte) ([]byte, error) {
	return streamRegistryV1.abi.Pack("isStream", streamId)
}

// UnpackIsStream is the Go binding that unpacks the parameters returned
// from invoking the contract method with ID 0xd0c27c4f.
//
// Solidity: function isStream(bytes32 streamId) view returns(bool)
func (streamRegistryV1 *StreamRegistryV1) UnpackIsStream(data []byte) (bool, error) {
	out, err := streamRegistryV1.abi.Unpack("isStream", data)
	if err != nil {
		return *new(bool), err
	}
	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)
	return out0, nil
}

// PackPlaceStreamOnNode is the Go binding used to pack the parameters required for calling
// the contract method with ID 0x9ee86d38.  This method will panic if any
// invalid/nil inputs are passed.
//
// Solidity: function placeStreamOnNode(bytes32 streamId, address nodeAddress) returns()
func (streamRegistryV1 *StreamRegistryV1) PackPlaceStreamOnNode(streamId [32]byte, nodeAddress common.Address) []byte {
	enc, err := streamRegistryV1.abi.Pack("placeStreamOnNode", streamId, nodeAddress)
	if err != nil {
		panic(err)
	}
	return enc
}

// TryPackPlaceStreamOnNode is the Go binding used to pack the parameters required for calling
// the contract method with ID 0x9ee86d38.  This method will return an error
// if any inputs are invalid/nil.
//
// Solidity: function placeStreamOnNode(bytes32 streamId, address nodeAddress) returns()
func (streamRegistryV1 *StreamRegistryV1) TryPackPlaceStreamOnNode(streamId [32]byte, nodeAddress common.Address) ([]byte, error) {
	return streamRegistryV1.abi.Pack("placeStreamOnNode", streamId, nodeAddress)
}

// PackRemoveStreamFromNode is the Go binding used to pack the parameters required for calling
// the contract method with ID 0xee885b12.  This method will panic if any
// invalid/nil inputs are passed.
//
// Solidity: function removeStreamFromNode(bytes32 streamId, address nodeAddress) returns()
func (streamRegistryV1 *StreamRegistryV1) PackRemoveStreamFromNode(streamId [32]byte, nodeAddress common.Address) []byte {
	enc, err := streamRegistryV1.abi.Pack("removeStreamFromNode", streamId, nodeAddress)
	if err != nil {
		panic(err)
	}
	return enc
}

// TryPackRemoveStreamFromNode is the Go binding used to pack the parameters required for calling
// the contract method with ID 0xee885b12.  This method will return an error
// if any inputs are invalid/nil.
//
// Solidity: function removeStreamFromNode(bytes32 streamId, address nodeAddress) returns()
func (streamRegistryV1 *StreamRegistryV1) TryPackRemoveStreamFromNode(streamId [32]byte, nodeAddress common.Address) ([]byte, error) {
	return streamRegistryV1.abi.Pack("removeStreamFromNode", streamId, nodeAddress)
}

// PackSetStreamLastMiniblockBatch is the Go binding used to pack the parameters required for calling
// the contract method with ID 0xff3a14ab.  This method will panic if any
// invalid/nil inputs are passed.
//
// Solidity: function setStreamLastMiniblockBatch((bytes32,bytes32,bytes32,uint64,bool)[] miniblocks) returns()
func (streamRegistryV1 *StreamRegistryV1) PackSetStreamLastMiniblockBatch(miniblocks []SetMiniblock) []byte {
	enc, err := streamRegistryV1.abi.Pack("setStreamLastMiniblockBatch", miniblocks)
	if err != nil {
		panic(err)
	}
	return enc
}

// TryPackSetStreamLastMiniblockBatch is the Go binding used to pack the parameters required for calling
// the contract method with ID 0xff3a14ab.  This method will return an error
// if any inputs are invalid/nil.
//
// Solidity: function setStreamLastMiniblockBatch((bytes32,bytes32,bytes32,uint64,bool)[] miniblocks) returns()
func (streamRegistryV1 *StreamRegistryV1) TryPackSetStreamLastMiniblockBatch(miniblocks []SetMiniblock) ([]byte, error) {
	return streamRegistryV1.abi.Pack("setStreamLastMiniblockBatch", miniblocks)
}

// PackSetStreamReplicationFactor is the Go binding used to pack the parameters required for calling
// the contract method with ID 0x5c665ce9.  This method will panic if any
// invalid/nil inputs are passed.
//
// Solidity: function setStreamReplicationFactor((bytes32,address[],uint8)[] requests) returns()
func (streamRegistryV1 *StreamRegistryV1) PackSetStreamReplicationFactor(requests []SetStreamReplicationFactor) []byte {
	enc, err := streamRegistryV1.abi.Pack("setStreamReplicationFactor", requests)
	if err != nil {
		panic(err)
	}
	return enc
}

// TryPackSetStreamReplicationFactor is the Go binding used to pack the parameters required for calling
// the contract method with ID 0x5c665ce9.  This method will return an error
// if any inputs are invalid/nil.
//
// Solidity: function setStreamReplicationFactor((bytes32,address[],uint8)[] requests) returns()
func (streamRegistryV1 *StreamRegistryV1) TryPackSetStreamReplicationFactor(requests []SetStreamReplicationFactor) ([]byte, error) {
	return streamRegistryV1.abi.Pack("setStreamReplicationFactor", requests)
}

// PackSyncNodesOnStreams is the Go binding used to pack the parameters required for calling
// the contract method with ID 0x03cc8793.  This method will panic if any
// invalid/nil inputs are passed.
//
// Solidity: function syncNodesOnStreams(uint256 start, uint256 stop) returns()
func (streamRegistryV1 *StreamRegistryV1) PackSyncNodesOnStreams(start *big.Int, stop *big.Int) []byte {
	enc, err := streamRegistryV1.abi.Pack("syncNodesOnStreams", start, stop)
	if err != nil {
		panic(err)
	}
	return enc
}

// TryPackSyncNodesOnStreams is the Go binding used to pack the parameters required for calling
// the contract method with ID 0x03cc8793.  This method will return an error
// if any inputs are invalid/nil.
//
// Solidity: function syncNodesOnStreams(uint256 start, uint256 stop) returns()
func (streamRegistryV1 *StreamRegistryV1) TryPackSyncNodesOnStreams(start *big.Int, stop *big.Int) ([]byte, error) {
	return streamRegistryV1.abi.Pack("syncNodesOnStreams", start, stop)
}

// StreamRegistryV1StreamLastMiniblockUpdateFailed represents a StreamLastMiniblockUpdateFailed event raised by the StreamRegistryV1 contract.
type StreamRegistryV1StreamLastMiniblockUpdateFailed struct {
	StreamId          [32]byte
	LastMiniblockHash [32]byte
	LastMiniblockNum  uint64
	Reason            string
	Raw               *types.Log // Blockchain specific contextual infos
}

const StreamRegistryV1StreamLastMiniblockUpdateFailedEventName = "StreamLastMiniblockUpdateFailed"

// ContractEventName returns the user-defined event name.
func (StreamRegistryV1StreamLastMiniblockUpdateFailed) ContractEventName() string {
	return StreamRegistryV1StreamLastMiniblockUpdateFailedEventName
}

// UnpackStreamLastMiniblockUpdateFailedEvent is the Go binding that unpacks the event data emitted
// by contract.
//
// Solidity: event StreamLastMiniblockUpdateFailed(bytes32 streamId, bytes32 lastMiniblockHash, uint64 lastMiniblockNum, string reason)
func (streamRegistryV1 *StreamRegistryV1) UnpackStreamLastMiniblockUpdateFailedEvent(log *types.Log) (*StreamRegistryV1StreamLastMiniblockUpdateFailed, error) {
	event := "StreamLastMiniblockUpdateFailed"
	if log.Topics[0] != streamRegistryV1.abi.Events[event].ID {
		return nil, errors.New("event signature mismatch")
	}
	out := new(StreamRegistryV1StreamLastMiniblockUpdateFailed)
	if len(log.Data) > 0 {
		if err := streamRegistryV1.abi.UnpackIntoInterface(out, event, log.Data); err != nil {
			return nil, err
		}
	}
	var indexed abi.Arguments
	for _, arg := range streamRegistryV1.abi.Events[event].Inputs {
		if arg.Indexed {
			indexed = append(indexed, arg)
		}
	}
	if err := abi.ParseTopics(out, indexed, log.Topics[1:]); err != nil {
		return nil, err
	}
	out.Raw = log
	return out, nil
}

// StreamRegistryV1StreamUpdated represents a StreamUpdated event raised by the StreamRegistryV1 contract.
type StreamRegistryV1StreamUpdated struct {
	EventType uint8
	Data      []byte
	Raw       *types.Log // Blockchain specific contextual infos
}

const StreamRegistryV1StreamUpdatedEventName = "StreamUpdated"

// ContractEventName returns the user-defined event name.
func (StreamRegistryV1StreamUpdated) ContractEventName() string {
	return StreamRegistryV1StreamUpdatedEventName
}

// UnpackStreamUpdatedEvent is the Go binding that unpacks the event data emitted
// by contract.
//
// Solidity: event StreamUpdated(uint8 indexed eventType, bytes data)
func (streamRegistryV1 *StreamRegistryV1) UnpackStreamUpdatedEvent(log *types.Log) (*StreamRegistryV1StreamUpdated, error) {
	event := "StreamUpdated"
	if log.Topics[0] != streamRegistryV1.abi.Events[event].ID {
		return nil, errors.New("event signature mismatch")
	}
	out := new(StreamRegistryV1StreamUpdated)
	if len(log.Data) > 0 {
		if err := streamRegistryV1.abi.UnpackIntoInterface(out, event, log.Data); err != nil {
			return nil, err
		}
	}
	var indexed abi.Arguments
	for _, arg := range streamRegistryV1.abi.Events[event].Inputs {
		if arg.Indexed {
			indexed = append(indexed, arg)
		}
	}
	if err := abi.ParseTopics(out, indexed, log.Topics[1:]); err != nil {
		return nil, err
	}
	out.Raw = log
	return out, nil
}
