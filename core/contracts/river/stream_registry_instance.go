package river

import (
	"context"
	"math/big"

	"github.com/ethereum/go-ethereum/accounts/abi"
	bind2 "github.com/ethereum/go-ethereum/accounts/abi/bind/v2"
	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/blockchain"
	. "github.com/towns-protocol/towns/core/node/shared"
)

// Since v2 contract bindings are stateless, create a singleton instance to use across the codebase.
var StreamRegistry *StreamRegistryContract

func init() {
	StreamRegistry = NewStreamRegistryContract()
}

func (r *StreamRegistryContract) ABI() *abi.ABI {
	return &r.abi
}

func (r *StreamRegistryContract) NewInstance(
	backend bind2.ContractBackend,
	addr common.Address,
) *StreamRegistryInstance {
	return &StreamRegistryInstance{
		BoundContract: bind2.NewBoundContract(addr, StreamRegistry.abi, backend, backend, backend),
	}
}

type StreamRegistryInstance struct {
	*bind2.BoundContract
}

func (c *StreamRegistryInstance) GetStream(
	ctx context.Context,
	blockNum blockchain.BlockNumber,
	streamId StreamId,
) (*Stream, error) {
	return blockchain.CallPtr(
		c.BoundContract,
		ctx,
		"GetStream",
		blockNum,
		func() ([]byte, error) { return StreamRegistry.TryPackGetStream(streamId) },
		StreamRegistry.UnpackGetStream,
	)
}

// GetStreamWithGenesis returns stream, genesis miniblock hash, genesis miniblock, error
func (c *StreamRegistryInstance) GetStreamWithGenesis(
	ctx context.Context,
	blockNum blockchain.BlockNumber,
	streamId StreamId,
) (*Stream, common.Hash, []byte, error) {
	result, err := blockchain.CallPtr(
		c.BoundContract,
		ctx,
		"GetStreamWithGenesis",
		blockNum,
		func() ([]byte, error) { return StreamRegistry.TryPackGetStreamWithGenesis(streamId) },
		StreamRegistry.UnpackGetStreamWithGenesis,
	)
	if err != nil {
		return nil, common.Hash{}, nil, err
	}
	return &result.Arg0, result.Arg1, result.Arg2, nil
}

func (c *StreamRegistryInstance) GetStreamCount(ctx context.Context, blockNum blockchain.BlockNumber) (int64, error) {
	return blockchain.CallInt64Raw(
		c.BoundContract,
		ctx,
		"GetStreamCount",
		blockNum,
		StreamRegistry.PackGetStreamCount(),
		StreamRegistry.UnpackGetStreamCount,
	)
}

func (c *StreamRegistryInstance) GetStreamCountOnNode(
	ctx context.Context,
	blockNum blockchain.BlockNumber,
	node common.Address,
) (int64, error) {
	return blockchain.CallInt64(
		c.BoundContract,
		ctx,
		"GetStreamCountOnNode",
		blockNum,
		func() ([]byte, error) { return StreamRegistry.TryPackGetStreamCountOnNode(node) },
		StreamRegistry.UnpackGetStreamCountOnNode,
	)
}

func (c *StreamRegistryInstance) GetPaginatedStreamsOnNode(
	ctx context.Context,
	blockNum blockchain.BlockNumber,
	node common.Address,
	start int64,
	end int64,
) ([]StreamWithId, error) {
	return blockchain.CallValue(
		c.BoundContract,
		ctx,
		"GetPaginatedStreamsOnNode",
		blockNum,
		func() ([]byte, error) {
			return StreamRegistry.TryPackGetPaginatedStreamsOnNode(node, big.NewInt(start), big.NewInt(end))
		},
		StreamRegistry.UnpackGetPaginatedStreamsOnNode,
	)
}

func (c *StreamRegistryInstance) GetPaginatedStreams(
	ctx context.Context,
	blockNum blockchain.BlockNumber,
	start int64,
	end int64,
) ([]StreamWithId, bool, error) {
	ret, err := blockchain.CallValue(
		c.BoundContract,
		ctx,
		"GetPaginatedStreams",
		blockNum,
		func() ([]byte, error) {
			return StreamRegistry.TryPackGetPaginatedStreams(big.NewInt(start), big.NewInt(end))
		},
		StreamRegistry.UnpackGetPaginatedStreams,
	)
	if err != nil {
		return nil, false, err
	}
	return ret.Arg0, ret.Arg1, nil
}
