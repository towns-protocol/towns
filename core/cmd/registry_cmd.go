package cmd

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"os"
	"slices"
	"strconv"
	"strings"
	"sync/atomic"
	"time"

	"github.com/ethereum/go-ethereum/accounts/keystore"
	"github.com/ethereum/go-ethereum/core/types"
	eth_crypto "github.com/ethereum/go-ethereum/crypto"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/common/hexutil"
	"github.com/spf13/cobra"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/contracts/river"
	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/events/dumpevents"
	"github.com/towns-protocol/towns/core/node/http_client"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/protocol/protocolconnect"
	"github.com/towns-protocol/towns/core/node/registries"
	"github.com/towns-protocol/towns/core/node/rpc"
	. "github.com/towns-protocol/towns/core/node/shared"
)

type streamDumpOpts struct {
	countOnly bool
	time      bool
	stats     bool
	dump      bool
	csv       bool
	node      common.Address
	blockNum  crypto.BlockNumber
}

func printStats(opts *streamDumpOpts, humanName, csvName, value string) {
	if !opts.stats {
		return
	}

	if opts.csv {
		fmt.Fprintf(os.Stderr, "%s,%s\n", csvName, value)
	} else {
		fmt.Fprintf(os.Stderr, "%s: %s\n", humanName, value)
	}
}

func printStreamCsv(strm *river.StreamWithId) {
	var nodeAddresses []string
	for _, node := range strm.Nodes() {
		nodeAddresses = append(nodeAddresses, node.Hex())
	}
	nodeList := strings.Join(nodeAddresses, ",")
	fmt.Printf(
		"%s,%s,%d,%t,%d,%s\n",
		strm.StreamId().String(),
		strm.LastMbHash().Hex(),
		strm.LastMbNum(),
		strm.IsSealed(),
		strm.ReplicationFactor(),
		nodeList,
	)
}

func printStream(opts *streamDumpOpts, i int64, strm *river.StreamWithId) {
	if !opts.dump {
		return
	}

	if !opts.csv {
		s := fmt.Sprintf("%4d %s", i-1, strm.StreamId().String())
		fmt.Printf(
			"%-69s %4d, %s %t %d\n",
			s,
			strm.LastMbNum(),
			strm.LastMbHash().Hex(),
			strm.IsSealed(),
			strm.ReplicationFactor(),
		)
		for _, node := range strm.Nodes() {
			fmt.Printf("        %s\n", node.Hex())
		}
	} else {
		printStreamCsv(strm)
	}
}

func srStreamDump(cfg *config.Config, opts *streamDumpOpts) error {
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

	blockNum := blockchain.InitialBlockNum
	if opts.blockNum != 0 {
		blockNum = opts.blockNum
	}
	printStats(opts, "Block number", "block_number", fmt.Sprintf("%d", blockNum))

	var streamNum int64
	if (opts.node == common.Address{}) {
		streamNum, err = registryContract.GetStreamCount(ctx, blockNum)
	} else {
		streamNum, err = registryContract.GetStreamCountOnNode(ctx, blockNum, opts.node)
	}
	if err != nil {
		return err
	}
	printStats(opts, "Stream count", "stream_count", fmt.Sprintf("%d", streamNum))

	if opts.countOnly {
		return nil
	}

	var i atomic.Int64
	startTime := time.Now()

	streamFunc := func(strm *river.StreamWithId) bool {
		curI := i.Add(1)

		printStream(opts, curI, strm)

		if opts.time && curI%50000 == 0 {
			elapsed := time.Since(startTime)
			fmt.Fprintf(
				os.Stderr,
				"Received %d streams in %s (%.1f streams/s)\n",
				curI,
				elapsed,
				float64(curI)/elapsed.Seconds(),
			)
		}
		return true
	}

	if (opts.node == common.Address{}) {
		err = registryContract.ForAllStreams(ctx, blockNum, streamFunc)
	} else {
		err = registryContract.ForAllStreamsOnNode(ctx, blockNum, opts.node, streamFunc)
	}
	if err != nil {
		return err
	}
	elapsed := time.Since(startTime)
	finalI := i.Load()
	printStats(opts, "Total", "total", fmt.Sprintf("%d", finalI))
	printStats(opts, "Elapsed seconds", "elapsed_seconds", fmt.Sprintf("%.3f", elapsed.Seconds()))
	printStats(opts, "Streams/s", "streams_per_second", fmt.Sprintf("%.1f", float64(finalI)/elapsed.Seconds()))

	if streamNum != finalI {
		return RiverError(
			Err_INTERNAL,
			"Stream count mismatch",
			"GetStreamCount",
			streamNum,
			"ForAllStreams",
			finalI,
			"node",
			opts.node.Hex(),
			"block",
			blockNum,
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
	timeout time.Duration,
	verbose bool,
) error {
	if timeout <= 0 {
		timeout = 30 * time.Second
	}
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	nodeRecord, err := registryContract.NodeRegistry.GetNode(&bind.CallOpts{
		Context: ctx,
	}, nodeAddress)
	if err != nil {
		return err
	}

	streamServiceClient := NewStreamServiceClient(httpClient, nodeRecord.Url, connect.WithGRPC())
	request := connect.NewRequest(&GetStreamRequest{
		StreamId: streamId[:],
	})
	request.Header().Set(rpc.RiverNoForwardHeader, rpc.RiverHeaderTrueValue)
	request.Header().Set(rpc.RiverAllowNoQuorumHeader, rpc.RiverHeaderTrueValue)
	response, err := streamServiceClient.GetStream(ctx, request)
	if err != nil {
		return err
	}
	stream := response.Msg.GetStream()

	fmt.Printf("      Miniblocks: %d\n", len(stream.Miniblocks))
	var lastBlock *MiniblockRef
	opts := events.NewParsedMiniblockInfoOpts().WithDoNotParseEvents(true).WithApplyOnlyMatchingSnapshot()
	for i, mb := range stream.Miniblocks {
		info, err := events.NewMiniblockInfoFromProto(mb, stream.Snapshot, opts)
		if err != nil {
			return err
		}
		lastBlock = info.Ref
		header := info.Header()
		var snapshot string
		if info.Snapshot != nil {
			snapshot = "snapshot"
		}
		fmt.Printf(
			"          %6d %s %s num_events=%d %s\n",
			info.Ref.Num,
			info.Ref.Hash.Hex(),
			info.Header().Timestamp.AsTime().Local().Format(time.RFC3339),
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
	evs, err := events.ParseEvents(stream.Events)
	if err != nil {
		return err
	}
	var minTimestampEpochMs int64 = math.MaxInt64
	var maxTimestampEpochMs int64 = math.MinInt64
	for _, ev := range evs {
		if ev.Event.CreatedAtEpochMs < minTimestampEpochMs {
			minTimestampEpochMs = ev.Event.CreatedAtEpochMs
		}
		if ev.Event.CreatedAtEpochMs > maxTimestampEpochMs {
			maxTimestampEpochMs = ev.Event.CreatedAtEpochMs
		}
	}
	fmt.Printf("      Minipool: len=%d\n", len(evs))
	if len(evs) > 0 {
		fmt.Printf(
			"                min_timestamp=%s\n                max_timestamp=%s\n",
			time.UnixMilli(minTimestampEpochMs).Local().Format(time.RFC3339),
			time.UnixMilli(maxTimestampEpochMs).Local().Format(time.RFC3339),
		)
	}
	if verbose {
		for i, ev := range evs {
			fmt.Printf(
				"          Event %4d: %s %s\n",
				i,
				ev.Hash.Hex(),
				time.UnixMilli(ev.Event.CreatedAtEpochMs).Local().Format(time.RFC3339),
			)
			fmt.Printf(
				"                        %s creator: %s type: %s %s\n",
				ev.MiniblockRef,
				common.BytesToAddress(ev.Event.CreatorAddress),
				dumpevents.GetPayloadName(ev.Event.Payload),
				dumpevents.GetContentName(ev.Event.Payload),
			)
		}
	}

	if lastBlock == nil {
		return RiverError(Err_INTERNAL, "No miniblocks found", "node", nodeAddress)
	}
	if lastBlock.Num < expectedMinBlockNum {
		return RiverError(
			Err_INTERNAL,
			"Node miniblock is behind blockchain record (can happen while candidate is being promoted)",
			"expectedMinimumBlockNum",
			expectedMinBlockNum,
			"actual",
			lastBlock.Num,
			"node",
			nodeAddress,
		)
	}
	if lastBlock.Num > expectedMinBlockNum {
		return RiverError(
			Err_INTERNAL,
			"Node miniblock is AHEAD of blockchain record",
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

func srStream(
	cfg *config.Config,
	streamId string,
	validate, urls, csv, jsonOutput, verbose bool,
	timeout time.Duration,
) error {
	if csv && validate {
		return RiverError(Err_INVALID_ARGUMENT, "--validate and --csv flags cannot be used together")
	}
	if (csv && jsonOutput) || (jsonOutput && validate) {
		return RiverError(Err_INVALID_ARGUMENT, "--json and --csv or --validate flags cannot be used together")
	}
	ctx := context.Background() // lint:ignore context.Background() is fine here

	httpClient, err := http_client.GetHttpClient(ctx, cfg)
	if err != nil {
		return err
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

	nodes := make(map[common.Address]registries.NodeRecord)
	if urls {
		nn, err := registryContract.GetAllNodes(ctx, blockchain.InitialBlockNum)
		if err == nil {
			for _, n := range nn {
				nodes[n.NodeAddress] = n
			}
		}
	}

	if csv {
		printStreamCsv(stream)
	} else if jsonOutput {
		output := map[string]any{
			"streamId":          stream.StreamId().String(),
			"miniblock":         map[string]any{"num": stream.LastMbNum(), "hash": stream.LastMbHash()},
			"isSealed":          stream.IsSealed(),
			"replicationFactor": stream.ReplicationFactor(),
		}

		outputNodes := []map[string]any{}
		for _, node := range stream.Nodes() {
			nodeRecord, ok := nodes[node]
			if !ok {
				outputNodes = append(outputNodes, map[string]any{
					"node":     node,
					"url":      node.Hex(),
					"operator": nodeRecord.Operator,
					"err":      "not found",
				})
				continue
			}

			nodeRecord, err := registryContract.NodeRegistry.GetNode(&bind.CallOpts{Context: ctx}, node)
			if err != nil {
				return err
			}

			streamServiceClient := NewStreamServiceClient(httpClient, nodeRecord.Url, connect.WithGRPC())
			request := connect.NewRequest(&GetLastMiniblockHashRequest{
				StreamId: stream.Id[:],
			})
			request.Header().Set(rpc.RiverNoForwardHeader, rpc.RiverHeaderTrueValue)
			request.Header().Set(rpc.RiverAllowNoQuorumHeader, rpc.RiverHeaderTrueValue)

			response, err := streamServiceClient.GetLastMiniblockHash(ctx, request)
			if err != nil {
				return err
			}

			outputNodes = append(outputNodes, map[string]any{
				"node":     node,
				"url":      nodeRecord.Url,
				"operator": nodeRecord.Operator,
				"lastMiniblock": map[string]any{
					"num":  response.Msg.GetMiniblockNum(),
					"hash": fmt.Sprintf("%x", response.Msg.GetHash()),
				},
			})
		}

		output["nodes"] = outputNodes

		jsonBytes, err := json.MarshalIndent(output, "", "  ")
		if err != nil {
			return err
		}
		fmt.Println(string(jsonBytes))
	} else {
		fmt.Printf("StreamId: %s\n", stream.StreamId().String())
		fmt.Printf("Miniblock: %d %s\n", stream.LastMbNum(), stream.LastMbHash().Hex())
		fmt.Println("IsSealed: ", stream.IsSealed())
		fmt.Println("ReplicationFactor: ", stream.ReplicationFactor())
		fmt.Println("Nodes:")
		err = nil
		for i, node := range stream.Nodes() {
			fmt.Printf("  %d %s\n", i, node)
			if urls {
				nodeRecord, ok := nodes[node]
				if ok {
					url := nodeRecord.Url
					fmt.Printf("                %s/debug\n", url)
					fmt.Printf("                %s/debug/stream/%s\n", url, stream.StreamId())
				}
			}
			if validate {
				startTime := time.Now()
				validateErr := validateStream(
					ctx,
					httpClient,
					registryContract,
					id,
					node,
					stream.LastMbHash(),
					stream.LastMbNum(),
					timeout,
					verbose,
				)
				elapsed := time.Since(startTime)
				if validateErr != nil {
					if err == nil {
						err = validateErr
					}

					fmt.Printf("      ERROR, Elapsed: %s, Error: %s\n", elapsed, validateErr)
				} else {
					fmt.Printf("      OK, Elapsed: %s\n", elapsed)
				}
			}
		}
	}

	return err
}

func nodesDump(cfg *config.Config, csv bool) error {
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
		if csv {
			fmt.Printf("%s,%s,%d,%s,%s\n",
				node.NodeAddress.Hex(),
				node.Operator.Hex(),
				node.Status,
				river.NodeStatusString(node.Status),
				node.Url,
			)
		} else {
			fmt.Printf(
				"%4d %s %s %d (%-11s) %s/debug\n",
				i,
				node.NodeAddress.Hex(),
				node.Operator.Hex(),
				node.Status,
				river.NodeStatusString(node.Status),
				node.Url,
			)
		}
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

	if err := registryContract.ForAllStreamsOnNode(ctx, blockNum, node, func(result *river.StreamWithId) bool {
		fmt.Println(result.StreamId().String())
		return true
	}); err != nil {
		return err
	}

	return nil
}

func eventsDump(cmd *cobra.Command, cfg *config.Config) error {
	cc, cancel, err := newCmdContext(cmd, cfg)
	ctx := cc.ctx

	if err != nil {
		return err
	}
	defer cancel()

	n := cc.number
	if n <= 0 {
		n = 1
	}

	logs, err := cc.blockchain.Client.FilterLogs(
		ctx,
		ethereum.FilterQuery{
			FromBlock: cc.blockNum.Add(-int64(n - 1)).AsBigInt(),
			ToBlock:   cc.blockNum.AsBigInt(),
			Addresses: []common.Address{cc.registryContract.Address},
		},
	)
	if err != nil {
		return err
	}

	if !cc.json {
		fmt.Println("TOTAL_LOGS:", len(logs))
	}

	unknown, err := cmd.Flags().GetBool("unknown")
	if err != nil {
		return err
	}

	for _, log := range logs {
		if unknown {
			if len(log.Topics) == 0 {
				fmt.Printf("No topics: %d %d\n", log.BlockNumber, log.Index)
				continue
			}

			if !slices.Contains(cc.registryContract.StreamEventTopics[0], log.Topics[0]) {
				fmt.Printf("Not a stream event: %d %d %s\n", log.BlockNumber, log.Index, log.Topics[0])
				continue
			}

			parsed, err := cc.registryContract.ParseEvent(
				ctx,
				cc.registryContract.StreamRegistry.BoundContract(),
				cc.registryContract.StreamEventInfo,
				&log,
			)
			if err != nil {
				fmt.Printf("Error parsing event: %d %d %s\n", log.BlockNumber, log.Index, err)
				continue
			}

			_, known1 := parsed.(*river.StreamUpdated)
			_, known2 := parsed.(*river.StreamLastMiniblockUpdateFailed)

			if known1 || known2 {
				continue
			}

			fmt.Printf("Unknown event: %d %d %T\n", log.BlockNumber, log.Index, parsed)
		} else if cc.json {
			jsonBytes, err := json.MarshalIndent(log, "", "  ")
			if err != nil {
				return err
			}
			fmt.Println(string(jsonBytes))
		} else {
			if len(log.Topics) == 0 {
				fmt.Printf("No topics: %d %d\n", log.BlockNumber, log.Index)
				continue
			}

			if !slices.Contains(cc.registryContract.StreamEventTopics[0], log.Topics[0]) {
				fmt.Printf("Not a stream event: %d %d %s\n", log.BlockNumber, log.Index, log.Topics[0])
				continue
			}

			fmt.Println("STREAM EVENT:", log.Topics[0])

			parsed, err := cc.registryContract.ParseEvent(ctx, cc.registryContract.StreamRegistry.BoundContract(), cc.registryContract.StreamEventInfo, &log)
			if err != nil {
				fmt.Printf("Error parsing event: %d %d %s\n", log.BlockNumber, log.Index, err)
				continue
			}

			if streamUpdate, ok := parsed.(*river.StreamUpdated); ok {
				ev, err := river.ParseStreamUpdatedEvent(streamUpdate)
				if err != nil {
					fmt.Printf("Error parsing stream update event: %d %d %s\n", log.BlockNumber, log.Index, err)
					continue
				}

				for _, e := range ev {
					fmt.Println(log.BlockNumber, log.Index, e.Reason(), e.GetStreamId())
				}
				continue
			}

			if f, ok := parsed.(*river.StreamLastMiniblockUpdateFailed); ok {
				fmt.Println(log.BlockNumber, log.Index, "StreamLastMiniblockUpdateFailed", f.Reason, StreamId(f.StreamId), f.LastMiniblockNum)
				continue
			}

			fmt.Printf("Unknown event: %d %d %T\n", log.BlockNumber, log.Index, parsed)
		}
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
			var err error
			opts := &streamDumpOpts{}
			opts.countOnly, err = cmd.Flags().GetBool("count")
			if err != nil {
				return err
			}
			opts.time, err = cmd.Flags().GetBool("time")
			if err != nil {
				return err
			}
			opts.dump, err = cmd.Flags().GetBool("dump")
			if err != nil {
				return err
			}
			opts.stats, err = cmd.Flags().GetBool("stats")
			if err != nil {
				return err
			}
			opts.csv, err = cmd.Flags().GetBool("csv")
			if err != nil {
				return err
			}
			node, err := cmd.Flags().GetString("node")
			if err != nil {
				return err
			}
			if node != "" {
				if !common.IsHexAddress(node) {
					return RiverError(Err_INVALID_ARGUMENT, "Invalid node address", "node", node)
				}
				opts.node = common.HexToAddress(node)
			}
			blockNum, err := cmd.Flags().GetUint64("block")
			if err != nil {
				return err
			}
			opts.blockNum = crypto.BlockNumber(blockNum)

			return srStreamDump(cmdConfig, opts)
		},
	}
	streamsCmd.Flags().Bool("count", false, "Only print the stream count")
	streamsCmd.Flags().Bool("time", false, "Print timing information")
	streamsCmd.Flags().Bool("dump", true, "Dump all streams")
	streamsCmd.Flags().Bool("stats", true, "Print stats")
	streamsCmd.Flags().Bool("csv", false, "Output in CSV format")
	streamsCmd.Flags().String("node", "", "Node address to dump streams for")
	streamsCmd.Flags().Uint64("block", 0, "Block number to dump streams for")
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
			urls, err := cmd.Flags().GetBool("urls")
			if err != nil {
				return err
			}
			csv, err := cmd.Flags().GetBool("csv")
			if err != nil {
				return err
			}
			json, err := cmd.Flags().GetBool("json")
			if err != nil {
				return err
			}
			timeout, err := cmd.Flags().GetDuration("timeout")
			if err != nil {
				return err
			}
			verbose, err := cmd.Flags().GetBool("verbose")
			if err != nil {
				return err
			}
			return srStream(cmdConfig, args[0], validate, urls, csv, json, verbose, timeout)
		},
	}
	streamCmd.Flags().Bool("validate", false, "Fetch stream from each node and compare to the registry record")
	streamCmd.Flags().Bool("urls", true, "Print node URLs")
	streamCmd.Flags().Bool("csv", false, "Output in CSV format")
	streamCmd.Flags().Bool("json", false, "Output in JSON format")
	streamCmd.Flags().Bool("verbose", false, "Print verbose output")
	streamCmd.Flags().Duration("timeout", 30*time.Second, "Timeout for validation")
	srCmd.AddCommand(streamCmd)

	nodesCmd := &cobra.Command{
		Use:   "nodes",
		Short: "Get node records from the registry contract",
		RunE: func(cmd *cobra.Command, args []string) error {
			csv, err := cmd.Flags().GetBool("csv")
			if err != nil {
				return err
			}
			return nodesDump(cmdConfig, csv)
		},
	}
	nodesCmd.Flags().Bool("csv", false, "Output in CSV format")
	srCmd.AddCommand(nodesCmd)

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

	eventsCmd := &cobra.Command{
		Use:   "events",
		Short: "Dump stream events from the registry contract",
		RunE: func(cmd *cobra.Command, args []string) error {
			return eventsDump(cmd, cmdConfig)
		},
		Args: cobra.NoArgs,
	}
	addBlockFlag(eventsCmd)
	addNumberFlag(eventsCmd)
	addJsonFlag(eventsCmd)
	eventsCmd.Flags().Bool("unknown", false, "Search for unknown events")
	srCmd.AddCommand(eventsCmd)

	srCmd.AddCommand(&cobra.Command{
		Use:   "update-stream <wallet> <stream-id> <replication-factor> <node1> [node2] [node3] ...",
		Short: "Update stream record in stream registry",
		Long: `Update the stream record with the given replication factor. If the replication factor is less than the
number of given nodes only the first replication factor nodes are quorum nodes. The other nodes will be sync nodes.
	
stream-placement <wallet> <stream-id> 1 0xaa..ff 0xbb..ff 0xcc..ff
	
Marks node 0xaa..ff as the single quorum node and node 0xbb..ff and 0xcc..ff as sync nodes.`,
		Args: cobra.RangeArgs(4, 10),
		RunE: func(cmd *cobra.Command, args []string) error {
			return runRegistryUpdateStream(args, cmdConfig)
		},
	})
}

func runRegistryUpdateStream(args []string, cfg *config.Config) error {
	ctx := context.Background() // lint:ignore context.Background() is fine here

	walletFileContents, err := os.ReadFile(args[0])
	if err != nil {
		return err
	}

	key, err := keystore.DecryptKey(walletFileContents, "")
	if err != nil {
		return err
	}

	wallet := &crypto.Wallet{
		PrivateKeyStruct: key.PrivateKey,
		PrivateKey:       eth_crypto.FromECDSA(key.PrivateKey),
		Address:          eth_crypto.PubkeyToAddress(key.PrivateKey.PublicKey),
	}

	streamID, err := StreamIdFromString(args[1])
	if err != nil {
		return err
	}

	replFactor, err := strconv.ParseInt(args[2], 10, 8)
	if err != nil {
		return err
	}

	var nodes []common.Address
	for _, nodeAddrStr := range args[3:] {
		nodes = append(nodes, common.HexToAddress(nodeAddrStr))
	}

	if replFactor > int64(len(nodes)) {
		return RiverError(
			Err_INVALID_ARGUMENT,
			"stream replication factor must be less than or equal to the number of nodes",
		)
	}

	blockchain, err := crypto.NewBlockchain(
		ctx, &cfg.RiverChain, wallet,
		infra.NewMetricsFactory(nil, "river", "cmdline"), nil)
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

	configCaller, err := river.NewRiverConfigV1Caller(cfg.RegistryContract.Address, blockchain.Client)
	if err != nil {
		return err
	}

	isConfigurationManager, err := configCaller.IsConfigurationManager(nil, wallet.Address)
	if err != nil {
		return err
	}

	if !isConfigurationManager {
		return RiverError(Err_PERMISSION_DENIED, "wallet is not a configuration manager", "wallet", wallet.Address)
	}

	pendingTx, err := blockchain.TxPool.Submit(ctx,
		"StreamRegistry::SetStreamReplicationFactor", func(opts *bind.TransactOpts) (*types.Transaction, error) {
			return registryContract.StreamRegistry.SetStreamReplicationFactor(opts, []river.SetStreamReplicationFactor{
				{
					StreamId:          streamID,
					ReplicationFactor: uint8(replFactor),
					Nodes:             nodes,
				},
			})
		})
	if err != nil {
		return err
	}

	receipt, err := pendingTx.Wait(ctx)
	if err != nil {
		return err
	}

	fmt.Printf("            stream: %s\n", streamID)
	fmt.Printf("replication factor: %d\n", replFactor)
	fmt.Printf("      node address: %v\n", nodes)
	fmt.Printf("  transaction hash: %s\n", receipt.TxHash.Hex())
	fmt.Printf("           success: %v\n", receipt.Status == types.ReceiptStatusSuccessful)

	return nil
}
