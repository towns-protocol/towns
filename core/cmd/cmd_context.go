package cmd

import (
	"context"
	"net/http"
	"time"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/spf13/cobra"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/contracts/river"
	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/http_client"
	"github.com/towns-protocol/towns/core/node/infra"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/protocol/protocolconnect"
	"github.com/towns-protocol/towns/core/node/registries"
	"github.com/towns-protocol/towns/core/node/rpc/headers"
	. "github.com/towns-protocol/towns/core/node/shared"
)

type cmdContext struct {
	ctx              context.Context
	ctxCancel        context.CancelFunc
	cfg              *config.Config
	blockchain       *crypto.Blockchain
	registryContract *registries.RiverRegistryContract
	httpClient       *http.Client

	// Below are parsed values for optional common flags
	// Values are parsed only if flag is present in the flagset
	// If command does not define a flag, value is not parsed
	streamID    StreamId           // "stream"
	nodeAddress common.Address     // "node"
	verbose     bool               // "verbose"
	csv         bool               // "csv"
	json        bool               // "json"
	pageSize    int                // "page-size"
	timeout     time.Duration      // "timeout" (if not set, default is 30 seconds) // TODO: move timeout to top-level cmd? What to do with long-running commands then?
	blockNum    crypto.BlockNumber // "block" (if not set, default is latest block)
	number      int                // "number", i.e. "n" (if not set, default is 1)
}

func newCmdContext(cmd *cobra.Command, cfg *config.Config) (*cmdContext, context.CancelFunc, error) {
	ctx := cmd.Context()
	cc := &cmdContext{
		ctx: ctx,
		cfg: cfg,
	}

	var err error
	f := cmd.Flags().Lookup("stream")
	if f != nil {
		streamID, err := StreamIdFromString(f.Value.String())
		if err != nil {
			return nil, nil, err
		}
		cc.streamID = streamID
	}

	f = cmd.Flags().Lookup("node")
	if f != nil {
		val := f.Value.String()
		if !common.IsHexAddress(val) {
			return nil, nil, RiverError(Err_INVALID_ARGUMENT, "Invalid node address", "arg", val)
		}
		cc.nodeAddress = common.HexToAddress(val)
	}

	f = cmd.Flags().Lookup("verbose")
	if f != nil {
		cc.verbose, err = cmd.Flags().GetBool("verbose")
		if err != nil {
			return nil, nil, err
		}
	}

	f = cmd.Flags().Lookup("csv")
	if f != nil {
		cc.csv, err = cmd.Flags().GetBool("csv")
		if err != nil {
			return nil, nil, err
		}
	}

	f = cmd.Flags().Lookup("json")
	if f != nil {
		cc.json, err = cmd.Flags().GetBool("json")
		if err != nil {
			return nil, nil, err
		}
	}

	f = cmd.Flags().Lookup("page-size")
	if f != nil {
		cc.pageSize, err = cmd.Flags().GetInt("page-size")
		if err != nil {
			return nil, nil, err
		}
	}

	f = cmd.Flags().Lookup("timeout")
	if f != nil {
		cc.timeout, err = cmd.Flags().GetDuration("timeout")
		if err != nil {
			return nil, nil, err
		}
	}
	if cc.timeout <= 0 {
		cc.timeout = 30 * time.Second
	}
	cc.ctx, cc.ctxCancel = context.WithTimeout(cc.ctx, cc.timeout)

	f = cmd.Flags().Lookup("block")
	var cmdBlockNum int64
	if f != nil {
		cmdBlockNum, err = cmd.Flags().GetInt64("block")
		if err != nil {
			return nil, nil, err
		}
	}

	f = cmd.Flags().Lookup("number")
	if f != nil {
		cc.number, err = cmd.Flags().GetInt("number")
		if err != nil {
			return nil, nil, err
		}
	}

	blockchain, err := crypto.NewBlockchain(
		ctx,
		&cfg.RiverChain,
		nil,
		infra.NewMetricsFactory(nil, "river", "cmdline"),
		nil,
	)
	if err != nil {
		return nil, nil, err
	}
	cc.blockchain = blockchain

	if cmdBlockNum > 0 {
		cc.blockNum = crypto.BlockNumber(cmdBlockNum)
	} else if cmdBlockNum == 0 {
		cc.blockNum = blockchain.InitialBlockNum
	} else {
		cc.blockNum = crypto.BlockNumber(int64(blockchain.InitialBlockNum) + cmdBlockNum)
	}

	registryContract, err := registries.NewRiverRegistryContract(
		ctx,
		blockchain,
		&cfg.RegistryContract,
		&cfg.RiverRegistry,
	)
	if err != nil {
		return nil, nil, err
	}
	cc.registryContract = registryContract

	return cc, cc.ctxCancel, nil
}

func (cc *cmdContext) getHttpClient() (*http.Client, error) {
	if cc.httpClient != nil {
		return cc.httpClient, nil
	}

	httpClient, err := http_client.GetHttpClient(cc.ctx, cc.cfg)
	if err != nil {
		return nil, err
	}

	cc.httpClient = httpClient
	return httpClient, nil
}

func (cc *cmdContext) getStubForStream(
	streamID StreamId,
	preferredNode common.Address,
) (StreamServiceClient, *river.StreamWithId, *river.Node, error) {
	ctx, cancel := context.WithTimeout(cc.ctx, 30*time.Second)
	defer cancel()

	record, err := cc.registryContract.GetStream(ctx, streamID, cc.blockchain.InitialBlockNum)
	if err != nil {
		return nil, nil, nil, err
	}

	var node common.Address
	if preferredNode != (common.Address{}) {
		node = preferredNode
	} else {
		node = record.Stream.Nodes[0]
	}

	nodeRecord, err := cc.registryContract.NodeRegistry.GetNode(&bind.CallOpts{
		Context: ctx,
	}, node)
	if err != nil {
		return nil, nil, nil, err
	}

	httpClient, err := cc.getHttpClient()
	if err != nil {
		return nil, nil, nil, err
	}

	streamServiceClient := NewStreamServiceClient(httpClient, nodeRecord.Url, connect.WithGRPC())
	return streamServiceClient, record, &nodeRecord, nil
}

func (cc *cmdContext) getStream(streamId StreamId, stub StreamServiceClient) (*StreamAndCookie, error) {
	request := connect.NewRequest(&GetStreamRequest{
		StreamId: streamId[:],
	})
	request.Header().Set(headers.RiverNoForwardHeader, headers.RiverHeaderTrueValue)
	request.Header().Set(headers.RiverAllowNoQuorumHeader, headers.RiverHeaderTrueValue)
	response, err := stub.GetStream(cc.ctx, request)
	if err != nil {
		return nil, err
	}
	return response.Msg.GetStream(), nil
}

func addBlockFlag(cmd *cobra.Command) {
	cmd.Flags().
		Int64("block", 0, "Blockchain block number to use, 0 for latest block, negative for relative to latest block")
}

func addNumberFlag(cmd *cobra.Command) {
	cmd.Flags().IntP("number", "n", 1, "Number of items to dump")
}

func addJsonFlag(cmd *cobra.Command) {
	cmd.Flags().Bool("json", false, "Dump in JSON format")
}
