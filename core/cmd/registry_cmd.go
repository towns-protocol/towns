package cmd

import (
	"context"
	"fmt"
	"net/http"
	"slices"
	"sync/atomic"
	"time"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/common/hexutil"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/contracts/river"
	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/http_client"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/protocol/protocolconnect"
	"github.com/towns-protocol/towns/core/node/registries"
	. "github.com/towns-protocol/towns/core/node/shared"

	"github.com/spf13/cobra"
)

func srStreamDump(cfg *config.Config, countOnly, timeOnly bool) error {
	ctx := context.Background() // lint:ignore context.Background() is fine here
	blockchain, err := crypto.NewBlockchain(
		ctx,
		&cfg.RiverChain,
		nil,
		infra.NewMetricsFactory(nil, "river", "cmdline"),
		nil,
	)
	if err != nil {
		return err
	}

	registryContract, err := registries.NewRiverRegistryContract(
		ctx,
		blockchain,
		&cfg.RegistryContract,
		&cfg.RiverRegistry,
	)
	if err != nil {
		return err
	}
	fmt.Printf("Using block number: %d\n", blockchain.InitialBlockNum)

	streamNum, err := registryContract.GetStreamCount(ctx, blockchain.InitialBlockNum)
	if err != nil {
		return err
	}
	fmt.Printf("Stream count reported: %d\n", streamNum)

	if countOnly {
		return nil
	}

	var i atomic.Int64
	startTime := time.Now()
	err = registryContract.ForAllStreams(ctx, blockchain.InitialBlockNum, func(strm *river.StreamWithId) bool {
		curI := i.Add(1)
		if !timeOnly {
			s := fmt.Sprintf("%4d %s", curI-1, strm.StreamId().String())
			fmt.Printf("%-69s %4d, %s\n", s, strm.LastMbNum(), strm.LastMbHash().Hex())
			for _, node := range strm.Nodes() {
				fmt.Printf("        %s\n", node.Hex())
			}
		}
		if timeOnly && curI%50000 == 0 {
			elapsed := time.Since(startTime)
			fmt.Printf("Received %d streams in %s (%.1f streams/s)\n", curI, elapsed, float64(curI)/elapsed.Seconds())
		}
		return true
	})
	if err != nil {
		return err
	}
	elapsed := time.Since(startTime)
	finalI := i.Load()
	fmt.Printf("TOTAL: %d ELAPSED: %s (%.1f streams/s)\n", finalI, elapsed, float64(finalI)/elapsed.Seconds())

	if streamNum != finalI {
		return RiverError(
			Err_INTERNAL,
			"Stream count mismatch",
			"GetStreamCount",
			streamNum,
			"ForAllStreams",
			finalI,
		)
	}

	return nil
}

func validateStream(
	ctx context.Context,
	httpClient *http.Client,
	registryContract *registries.RiverRegistryContract,
	streamId StreamId,
	nodeAddress common.Address,
	expectedMinBlockHash common.Hash,
	expectedMinBlockNum int64,
) error {
	nodeRecord, err := registryContract.NodeRegistry.GetNode(&bind.CallOpts{
		Context: ctx,
	}, nodeAddress)
	if err != nil {
		return err
	}

	streamServiceClient := NewStreamServiceClient(httpClient, nodeRecord.Url, connect.WithGRPC())
	response, err := streamServiceClient.GetStream(
		ctx,
		connect.NewRequest(&GetStreamRequest{
			StreamId: streamId[:],
		}),
	)
	if err != nil {
		return err
	}
	stream := response.Msg.GetStream()

	fmt.Printf("      Miniblocks: %d\n", len(stream.Miniblocks))
	var lastBlock *MiniblockRef
	for i, mb := range stream.Miniblocks {
		info, err := events.NewMiniblockInfoFromProto(
			mb, stream.GetSnapshotByMiniblockIndex(i),
			events.NewParsedMiniblockInfoOpts().
				WithDoNotParseEvents(true),
		)
		if err != nil {
			return err
		}
		lastBlock = info.Ref
		header := info.Header()
		var snapshot string
		if header.IsSnapshot() {
			snapshot = "snapshot"
		}
		fmt.Printf(
			"          %d %s num_events=%d %s\n",
			info.Ref.Num,
			info.Ref.Hash.Hex(),
			len(header.EventHashes),
			snapshot,
		)
		// If a snapshot has occurred after the most recent hash committed to the contract, we
		// may never see the block committed to the contract. However if we do see it, let's validate
		// that it has the expected hash.
		if i == int(expectedMinBlockNum) {
			if lastBlock.Hash != expectedMinBlockHash {
				return RiverError(
					Err_INTERNAL,
					"Block hash mismatch",
					"expected",
					expectedMinBlockHash,
					"actual",
					lastBlock.Hash,
					"mismatchedHashBlockNum",
					i,
					"node",
					nodeAddress,
				)
			}
		}
	}
	fmt.Printf("      Minipool: len=%d\n", len(stream.Events))
	fmt.Printf(
		"      Cookie: minipool_generation=%d prev_mb_hash=%s\n",
		stream.NextSyncCookie.MinipoolGen,
		common.BytesToHash(stream.NextSyncCookie.PrevMiniblockHash),
	)

	if lastBlock == nil {
		return RiverError(Err_INTERNAL, "No miniblocks found", "node", nodeAddress)
	}
	if lastBlock.Num < expectedMinBlockNum {
		return RiverError(
			Err_INTERNAL,
			"Block number mismatch",
			"expectedMinimumBlockNum",
			expectedMinBlockNum,
			"actual",
			lastBlock.Num,
			"node",
			nodeAddress,
		)
	}
	return nil
}

func srStream(cfg *config.Config, streamId string, validate bool) error {
	ctx := context.Background() // lint:ignore context.Background() is fine here

	var httpClient *http.Client
	var err error
	if validate {
		httpClient, err = http_client.GetHttpClient(ctx, cfg)
		if err != nil {
			return err
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
		return err
	}

	registryContract, err := registries.NewRiverRegistryContract(
		ctx,
		blockchain,
		&cfg.RegistryContract,
		&cfg.RiverRegistry,
	)
	if err != nil {
		return err
	}

	id, err := StreamIdFromString(streamId)
	if err != nil {
		return err
	}

	stream, err := registryContract.GetStream(ctx, id, blockchain.InitialBlockNum)
	if err != nil {
		return err
	}

	fmt.Printf("StreamId: %s\n", stream.StreamId().String())
	fmt.Printf("Miniblock: %d %s\n", stream.LastMbNum(), stream.LastMbHash().Hex())
	fmt.Printf("ReplFactor: %d\n", stream.ReplicationFactor())
	fmt.Println("IsSealed: ", stream.IsSealed())
	fmt.Println("Nodes:")
	err = nil
	for i, node := range stream.Nodes() {
		fmt.Printf("  %d %s\n", i, node)
		if validate {
			validateErr := validateStream(
				ctx,
				httpClient,
				registryContract,
				id,
				node,
				stream.LastMbHash(),
				stream.LastMbNum(),
			)
			if validateErr != nil {
				if err == nil {
					err = validateErr
				}

				fmt.Printf("      %s\n", validateErr)
			}
		}
	}

	return err
}

func nodesDump(cfg *config.Config) error {
	ctx := context.Background() // lint:ignore context.Background() is fine here

	blockchain, err := crypto.NewBlockchain(
		ctx,
		&cfg.RiverChain,
		nil,
		infra.NewMetricsFactory(nil, "river", "cmdline"),
		nil,
	)
	if err != nil {
		return err
	}

	registryContract, err := registries.NewRiverRegistryContract(
		ctx,
		blockchain,
		&cfg.RegistryContract,
		&cfg.RiverRegistry,
	)
	if err != nil {
		return err
	}

	nodes, err := registryContract.GetAllNodes(ctx, blockchain.InitialBlockNum)
	if err != nil {
		return err
	}

	for i, node := range nodes {
		fmt.Printf(
			"%4d %s %s %d (%-11s) %s\n",
			i,
			node.NodeAddress.Hex(),
			node.Operator.Hex(),
			node.Status,
			river.NodeStatusString(node.Status),
			node.Url,
		)
	}

	return nil
}

func settingsDump(cfg *config.Config) error {
	ctx := context.Background() // lint:ignore context.Background() is fine here

	blockchain, err := crypto.NewBlockchain(
		ctx,
		&cfg.RiverChain,
		nil,
		infra.NewMetricsFactory(nil, "river", "cmdline"),
		nil,
	)
	if err != nil {
		return err
	}

	blockNum, err := blockchain.GetBlockNumber(ctx)
	if err != nil {
		return err
	}
	fmt.Printf("Using current block number: %d\n", blockNum)

	caller, err := river.NewRiverConfigV1Caller(cfg.RegistryContract.Address, blockchain.Client)
	if err != nil {
		return err
	}

	retrievedSettings, err := caller.GetAllConfiguration(&bind.CallOpts{
		Context:     ctx,
		BlockNumber: blockNum.AsBigInt(),
	})
	if err != nil {
		return err
	}

	if len(retrievedSettings) == 0 {
		fmt.Println("No settings found")
		return nil
	}

	for _, s := range retrievedSettings {
		fmt.Printf("%10d %s %s\n", s.BlockNumber, common.Hash(s.Key).Hex(), hexutil.Encode(s.Value))
	}

	return nil
}

func blockNumber(cfg *config.Config) error {
	ctx := context.Background() // lint:ignore context.Background() is fine here

	blockchain, err := crypto.NewBlockchain(
		ctx,
		&cfg.RiverChain,
		nil,
		infra.NewMetricsFactory(nil, "river", "cmdline"),
		nil,
	)
	if err != nil {
		return err
	}

	blockNum, err := blockchain.GetBlockNumber(ctx)
	if err != nil {
		return err
	}
	fmt.Printf("%d\n", blockNum)

	return nil
}

func getStreamsForNode(ctx context.Context, node common.Address) error {
	blockchain, err := crypto.NewBlockchain(
		ctx,
		&cmdConfig.RiverChain,
		nil,
		infra.NewMetricsFactory(nil, "river", "cmdline"),
		nil,
	)
	if err != nil {
		return err
	}

	registryContract, err := registries.NewRiverRegistryContract(
		ctx,
		blockchain,
		&cmdConfig.RegistryContract,
		&cmdConfig.RiverRegistry,
	)
	if err != nil {
		return err
	}

	blockNum, err := blockchain.GetBlockNumber(ctx)
	if err != nil {
		return err
	}
	fmt.Printf("#Using current block number: %d, node address %v\n", blockNum, node)
	fmt.Printf("#Streams:\n")
	fmt.Printf("#========\n")

	if err := registryContract.ForAllStreams(ctx, blockNum, func(result *river.StreamWithId) bool {
		if slices.Contains(result.Nodes(), node) {
			fmt.Println(result.StreamId().String())
		}
		return true
	}); err != nil {
		return err
	}

	return nil
}

func init() {
	srCmd := &cobra.Command{
		Use:     "registry",
		Aliases: []string{"reg"},
		Short:   "Stream registry management commands",
	}
	rootCmd.AddCommand(srCmd)

	streamsCmd := &cobra.Command{
		Use:   "streams",
		Short: "Dump stream records",
		RunE: func(cmd *cobra.Command, args []string) error {
			countOnly, err := cmd.Flags().GetBool("count")
			if err != nil {
				return err
			}
			timeOnly, err := cmd.Flags().GetBool("time")
			if err != nil {
				return err
			}
			return srStreamDump(cmdConfig, countOnly, timeOnly)
		},
	}
	streamsCmd.Flags().Bool("count", false, "Only print the stream count")
	streamsCmd.Flags().Bool("time", false, "Print only timing information")
	srCmd.AddCommand(streamsCmd)

	allStreamsCmd := &cobra.Command{
		Use:   "all-streams <node-address>",
		Short: "Get all streams on a node from the stream registry",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			nodeAddress := common.HexToAddress(args[0])
			zeroAddress := common.Address{}
			if nodeAddress == zeroAddress {
				return fmt.Errorf("invalid argument 0: node-address")
			}

			return getStreamsForNode(
				logging.CtxWithLog(context.Background(), logging.NoopLogger()),
				nodeAddress,
			)
		},
	}
	srCmd.AddCommand(allStreamsCmd)

	streamCmd := &cobra.Command{
		Use:   "stream <stream-id>",
		Short: "Get stream info from stream registry",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			validate, err := cmd.Flags().GetBool("validate")
			if err != nil {
				return err
			}
			return srStream(cmdConfig, args[0], validate)
		},
	}
	streamCmd.Flags().Bool("validate", false, "Fetch stream from each node and compare to the registry record")
	srCmd.AddCommand(streamCmd)

	srCmd.AddCommand(&cobra.Command{
		Use:   "nodes",
		Short: "Get node records from the registry contract",
		RunE: func(cmd *cobra.Command, args []string) error {
			return nodesDump(cmdConfig)
		},
	})

	srCmd.AddCommand(&cobra.Command{
		Use:   "settings",
		Short: "Dump settings from the registry contract",
		RunE: func(cmd *cobra.Command, args []string) error {
			return settingsDump(cmdConfig)
		},
	})

	srCmd.AddCommand(&cobra.Command{
		Use:     "blocknumber",
		Aliases: []string{"bn"},
		Short:   "Print current River chain block number",
		RunE: func(cmd *cobra.Command, args []string) error {
			return blockNumber(cmdConfig)
		},
	})
}
