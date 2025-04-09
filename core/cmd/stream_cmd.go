package cmd

import (
	"bytes"
	"context"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"slices"
	"strconv"
	"time"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/accounts/keystore"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	eth_crypto "github.com/ethereum/go-ethereum/crypto"
	"github.com/gammazero/workerpool"
	"github.com/spf13/cobra"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/contracts/river"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/http_client"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/nodes"
	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/protocol/protocolconnect"
	"github.com/towns-protocol/towns/core/node/registries"
	"github.com/towns-protocol/towns/core/node/rpc"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
)

func runStreamGetEventCmd(cmd *cobra.Command, args []string) error {
	ctx := context.Background() // lint:ignore context.Background() is fine here
	streamID, err := shared.StreamIdFromString(args[0])
	if err != nil {
		return err
	}
	eventHash := common.HexToHash(args[1])
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

	stream, err := registryContract.StreamRegistry.GetStream(nil, streamID)
	if err != nil {
		return err
	}

	nodes := nodes.NewStreamNodesWithLock(stream.StreamReplicationFactor(), stream.Nodes, common.Address{})
	remoteNodeAddress := nodes.GetStickyPeer()

	remote, err := registryContract.NodeRegistry.GetNode(nil, remoteNodeAddress)
	if err != nil {
		return err
	}

	remoteClient := protocolconnect.NewStreamServiceClient(http.DefaultClient, remote.Url)

	response, err := remoteClient.GetStream(ctx, connect.NewRequest(&protocol.GetStreamRequest{
		StreamId: streamID[:],
		Optional: false,
	}))
	if err != nil {
		return err
	}

	streamAndCookie := response.Msg.GetStream()

	to := streamAndCookie.GetNextSyncCookie().GetMinipoolGen()
	blockRange := int64(100)
	if len(args) == 4 {
		blockRange, err = strconv.ParseInt(args[2], 10, 64)
		if err != nil {
			return err
		}
	}
	from := max(to-blockRange, 0)

	miniblocks, err := remoteClient.GetMiniblocks(ctx, connect.NewRequest(&protocol.GetMiniblocksRequest{
		StreamId:      streamID[:],
		FromInclusive: from,
		ToExclusive:   to,
	}))
	if err != nil {
		return err
	}

	for n, miniblock := range miniblocks.Msg.GetMiniblocks() {
		// Parse header
		info, err := events.NewMiniblockInfoFromProto(
			miniblock, miniblocks.Msg.GetMiniblockSnapshot(from+int64(n)),
			events.NewParsedMiniblockInfoOpts().
				WithExpectedBlockNumber(from+int64(n)),
		)
		if err != nil {
			return err
		}

		for _, event := range info.Proto.GetEvents() {
			if bytes.Equal(eventHash[:], event.GetHash()) {
				var streamEvent protocol.StreamEvent
				if err := proto.Unmarshal(event.Event, &streamEvent); err != nil {
					return err
				}

				fmt.Printf("\n%s\n", protojson.Format(&streamEvent))

				return nil
			}
		}
	}

	fmt.Printf("Event %s not found in stream %s (block range [%d...%d])\n", eventHash, streamID, from, to)

	return nil
}

func runStreamGetMiniblockCmd(cmd *cobra.Command, args []string) error {
	ctx := context.Background() // lint:ignore context.Background() is fine here
	streamID, err := shared.StreamIdFromString(args[0])
	if err != nil {
		return err
	}
	miniblockHash := common.HexToHash(args[1])
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

	stream, err := registryContract.StreamRegistry.GetStream(nil, streamID)
	if err != nil {
		return err
	}

	nodes := nodes.NewStreamNodesWithLock(stream.StreamReplicationFactor(), stream.Nodes, common.Address{})
	remoteNodeAddress := nodes.GetStickyPeer()

	remote, err := registryContract.NodeRegistry.GetNode(nil, remoteNodeAddress)
	if err != nil {
		return err
	}

	remoteClient := protocolconnect.NewStreamServiceClient(http.DefaultClient, remote.Url)

	response, err := remoteClient.GetStream(ctx, connect.NewRequest(&protocol.GetStreamRequest{
		StreamId: streamID[:],
		Optional: false,
	}))
	if err != nil {
		return err
	}

	streamAndCookie := response.Msg.GetStream()

	to := streamAndCookie.GetNextSyncCookie().GetMinipoolGen()
	blockRange := int64(100)
	if len(args) == 3 {
		blockRange, err = strconv.ParseInt(args[2], 10, 64)
		if err != nil {
			return err
		}
	}
	from := max(to-blockRange, 0)

	miniblocks, err := remoteClient.GetMiniblocks(ctx, connect.NewRequest(&protocol.GetMiniblocksRequest{
		StreamId:      streamID[:],
		FromInclusive: from,
		ToExclusive:   to,
	}))
	if err != nil {
		return err
	}

	for n, miniblock := range miniblocks.Msg.GetMiniblocks() {
		// Parse header
		info, err := events.NewMiniblockInfoFromProto(
			miniblock, miniblocks.Msg.GetMiniblockSnapshot(from+int64(n)),
			events.NewParsedMiniblockInfoOpts().
				WithExpectedBlockNumber(from+int64(n)),
		)
		if err != nil {
			return err
		}

		if info.HeaderEvent().Hash == miniblockHash {
			mbHeader, ok := info.HeaderEvent().Event.Payload.(*protocol.StreamEvent_MiniblockHeader)
			if !ok {
				return fmt.Errorf("unable to parse header event as miniblock header")
			}

			if len(mbHeader.MiniblockHeader.EventHashes) != len(miniblock.Events) {
				return fmt.Errorf("malformatted miniblock: header event count and miniblock event count do not match")
			}

			for i, hash := range mbHeader.MiniblockHeader.EventHashes {
				if !bytes.Equal(miniblock.Events[i].Hash, hash) {
					return fmt.Errorf(
						"event %d hashes do not match: %v v %v in the header",
						i,
						hex.EncodeToString(miniblock.Events[i].Hash),
						hex.EncodeToString(hash),
					)
				}
			}

			fmt.Printf("\nMiniblock\n=========\n%s\n", protojson.Format(miniblock))

			fmt.Printf("\nHeader\n======\n%s\n", protojson.Format(mbHeader.MiniblockHeader))

			return nil
		}
	}

	fmt.Printf("Miniblock hash %s not found in stream %s (block range [%d...%d])\n", miniblockHash, streamID, from, to)

	return nil
}

func formatBytes(bytes int) string {
	const (
		KB = 1 << 10
		MB = 1 << 20
		GB = 1 << 30
		TB = 1 << 40
	)

	switch {
	case bytes < KB:
		return fmt.Sprintf("%d B", bytes)
	case bytes < MB:
		return fmt.Sprintf("%.2f KB", float64(bytes)/KB)
	case bytes < GB:
		return fmt.Sprintf("%.2f MB", float64(bytes)/MB)
	case bytes < TB:
		return fmt.Sprintf("%.2f GB", float64(bytes)/GB)
	default:
		return fmt.Sprintf("%.2f TB", float64(bytes)/TB)
	}
}

func runStreamGetMiniblockNumCmd(cmd *cobra.Command, args []string) error {
	ctx := context.Background() // lint:ignore context.Background() is fine here
	streamID, err := shared.StreamIdFromString(args[0])
	if err != nil {
		return err
	}
	miniblockNum, err := strconv.ParseInt(args[1], 10, 64)
	if err != nil {
		return fmt.Errorf("could not parse miniblockNum: %w", err)
	}

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

	stream, err := registryContract.StreamRegistry.GetStream(nil, streamID)
	if err != nil {
		return err
	}

	nodes := nodes.NewStreamNodesWithLock(stream.StreamReplicationFactor(), stream.Nodes, common.Address{})
	remoteNodeAddress := nodes.GetStickyPeer()

	remote, err := registryContract.NodeRegistry.GetNode(nil, remoteNodeAddress)
	if err != nil {
		return err
	}

	remoteClient := protocolconnect.NewStreamServiceClient(http.DefaultClient, remote.Url)
	miniblocks, err := remoteClient.GetMiniblocks(ctx, connect.NewRequest(&protocol.GetMiniblocksRequest{
		StreamId:      streamID[:],
		FromInclusive: miniblockNum,
		ToExclusive:   miniblockNum + 1,
	}))
	if err != nil {
		return err
	}

	// There should only be one miniblock here
	if len(miniblocks.Msg.Miniblocks) < 1 {
		fmt.Printf("Miniblock num %d not found in stream %s\n", miniblockNum, streamID)
		return nil
	}

	miniblock := miniblocks.Msg.GetMiniblocks()[0]

	// Parse header
	info, err := events.NewMiniblockInfoFromProto(
		miniblock, miniblocks.Msg.GetMiniblockSnapshot(miniblockNum),
		events.NewParsedMiniblockInfoOpts().
			WithExpectedBlockNumber(miniblockNum),
	)
	if err != nil {
		return err
	}

	mbHeader, ok := info.HeaderEvent().Event.Payload.(*protocol.StreamEvent_MiniblockHeader)
	if !ok {
		return fmt.Errorf("unable to parse header event as miniblock header")
	}

	if len(mbHeader.MiniblockHeader.EventHashes) != len(miniblock.Events) {
		return fmt.Errorf("malformatted miniblock: header event count and miniblock event count do not match")
	}

	fmt.Printf(
		"Miniblock %d (size %s)\n=========\n",
		mbHeader.MiniblockHeader.MiniblockNum,
		formatBytes(proto.Size(miniblock)),
	)
	fmt.Printf("  Timestamp: %v\n", mbHeader.MiniblockHeader.GetTimestamp().AsTime().UTC())
	fmt.Printf("  Events: (%d)\n", len(info.Proto.Events))
	for i, event := range info.Proto.GetEvents() {
		var streamEvent protocol.StreamEvent
		if err := proto.Unmarshal(event.Event, &streamEvent); err != nil {
			return err
		}

		seconds := streamEvent.CreatedAtEpochMs / 1000
		nanoseconds := (streamEvent.CreatedAtEpochMs % 1000) * 1e6 // 1 millisecond = 1e6 nanoseconds
		timestamp := time.Unix(seconds, nanoseconds)
		fmt.Printf(
			"    (%d) %v %v\n",
			i,
			hex.EncodeToString(event.Hash),
			timestamp.UTC(),
		)
		// fmt.Println(protojson.Format(&streamEvent))
	}

	return nil
}

func runStreamDumpCmd(cmd *cobra.Command, args []string) error {
	ctx := context.Background() // lint:ignore context.Background() is fine here
	streamID, err := shared.StreamIdFromString(args[0])
	if err != nil {
		return err
	}

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

	stream, err := registryContract.StreamRegistry.GetStream(nil, streamID)
	if err != nil {
		return err
	}

	nodes := nodes.NewStreamNodesWithLock(stream.StreamReplicationFactor(), stream.Nodes, common.Address{})
	remoteNodeAddress := nodes.GetStickyPeer()

	remote, err := registryContract.NodeRegistry.GetNode(nil, remoteNodeAddress)
	if err != nil {
		return err
	}

	remoteClient := protocolconnect.NewStreamServiceClient(http.DefaultClient, remote.Url)

	response, err := remoteClient.GetStream(ctx, connect.NewRequest(&protocol.GetStreamRequest{
		StreamId: streamID[:],
		Optional: false,
	}))
	if err != nil {
		return err
	}

	streamAndCookie := response.Msg.GetStream()

	maxBlock := streamAndCookie.GetNextSyncCookie().GetMinipoolGen()
	blockRange := int64(10)
	if len(args) == 2 {
		blockRange, err = strconv.ParseInt(args[1], 10, 64)
		if err != nil {
			return err
		}
	}
	from := max(maxBlock-blockRange, 0)
	to := maxBlock
	for {
		miniblocks, err := remoteClient.GetMiniblocks(ctx, connect.NewRequest(&protocol.GetMiniblocksRequest{
			StreamId:      streamID[:],
			FromInclusive: from,
			ToExclusive:   to,
		}))
		if err != nil {
			return err
		}

		for n, miniblock := range miniblocks.Msg.GetMiniblocks() {
			// Parse header
			info, err := events.NewMiniblockInfoFromProto(
				miniblock, miniblocks.Msg.GetMiniblockSnapshot(from+int64(n)),
				events.NewParsedMiniblockInfoOpts().
					WithExpectedBlockNumber(from+int64(n)),
			)
			if err != nil {
				return err
			}

			mbHeader, ok := info.HeaderEvent().Event.Payload.(*protocol.StreamEvent_MiniblockHeader)
			if !ok {
				return fmt.Errorf("unable to parse header event as miniblock header")
			}

			if len(mbHeader.MiniblockHeader.EventHashes) != len(miniblock.Events) {
				return fmt.Errorf("malformatted miniblock: header event count and miniblock event count do not match")
			}

			for i, hash := range mbHeader.MiniblockHeader.EventHashes {
				if !bytes.Equal(miniblock.Events[i].Hash, hash) {
					return fmt.Errorf(
						"event %d hashes do not match: %v v %v in the header",
						i,
						hex.EncodeToString(miniblock.Events[i].Hash),
						hex.EncodeToString(hash),
					)
				}
			}

			fmt.Printf(
				"\nMiniblock %d\n=========\n%s",
				mbHeader.MiniblockHeader.MiniblockNum,
				protojson.Format(miniblock),
			)
			fmt.Printf("\n(Parsed Header)\n-------------\n%s\n", protojson.Format(mbHeader.MiniblockHeader))
		}

		from = from + int64(len(miniblocks.Msg.Miniblocks))
		to = min(from+blockRange, maxBlock)

		if len(miniblocks.Msg.Miniblocks) == 0 || from == to {
			break
		}
	}

	if from < maxBlock-1 {
		return fmt.Errorf("unable to download all blocks from stream")
	}

	return nil
}

func runStreamNodeDumpCmd(cmd *cobra.Command, args []string) error {
	ctx := context.Background() // lint:ignore context.Background() is fine here
	nodeAddress := common.HexToAddress(args[0])
	zeroAddress := common.Address{}
	if nodeAddress == zeroAddress {
		return fmt.Errorf("invalid argument 0: node-address")
	}

	streamId, err := shared.StreamIdFromString(args[1])
	if err != nil {
		return err
	}

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

	remote, err := registryContract.NodeRegistry.GetNode(nil, nodeAddress)
	if err != nil {
		return err
	}

	remoteClient := protocolconnect.NewStreamServiceClient(http.DefaultClient, remote.Url)

	blockRange := int64(100)
	if len(args) == 3 {
		blockRange, err = strconv.ParseInt(args[2], 10, 64)
		if err != nil {
			return err
		}
	}

	blocksRead := -1
	from := int64(0)
	to := blockRange
	for blocksRead != 0 {
		miniblocks, err := remoteClient.GetMiniblocks(ctx, connect.NewRequest(&protocol.GetMiniblocksRequest{
			StreamId:      streamId[:],
			FromInclusive: from,
			ToExclusive:   to,
		}))
		if err != nil {
			return err
		}

		for n, miniblock := range miniblocks.Msg.GetMiniblocks() {
			// Parse header
			info, err := events.NewMiniblockInfoFromProto(
				miniblock, miniblocks.Msg.GetMiniblockSnapshot(from+int64(n)),
				events.NewParsedMiniblockInfoOpts().
					WithExpectedBlockNumber(from+int64(n)),
			)
			if err != nil {
				return err
			}

			mbHeader, ok := info.HeaderEvent().Event.Payload.(*protocol.StreamEvent_MiniblockHeader)
			if !ok {
				return fmt.Errorf("unable to parse header event as miniblock header")
			}

			fmt.Printf(
				"\nMiniblock %d\n=========\n%s",
				mbHeader.MiniblockHeader.MiniblockNum,
				protojson.Format(miniblock),
			)
			fmt.Printf("\n(Parsed Header)\n-------------\n%s\n", protojson.Format(mbHeader.MiniblockHeader))
		}
		blocksRead = len(miniblocks.Msg.Miniblocks)
		from = from + int64(blocksRead)
		to = from + blockRange
	}

	return nil
}

func runStreamGetCmd(cmd *cobra.Command, args []string) error {
	ctx := context.Background() // lint:ignore context.Background() is fine here
	streamID, err := shared.StreamIdFromString(args[0])
	if err != nil {
		return err
	}

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

	streamRecord, err := registryContract.StreamRegistry.GetStream(nil, streamID)
	if err != nil {
		return err
	}

	nodes := nodes.NewStreamNodesWithLock(streamRecord.StreamReplicationFactor(), streamRecord.Nodes, common.Address{})
	remoteNodeAddress := nodes.GetStickyPeer()

	remote, err := registryContract.NodeRegistry.GetNode(nil, remoteNodeAddress)
	if err != nil {
		return err
	}

	remoteClient := protocolconnect.NewStreamServiceClient(http.DefaultClient, remote.Url)

	response, err := remoteClient.GetStream(ctx, connect.NewRequest(&protocol.GetStreamRequest{
		StreamId: streamID[:],
		Optional: false,
	}))
	if err != nil {
		return err
	}

	stream := response.Msg.GetStream()
	fmt.Println("MBs: ", len(stream.GetMiniblocks()), " Events: ", len(stream.GetEvents()))

	for i, mb := range stream.GetMiniblocks() {
		info, err := events.NewMiniblockInfoFromProto(
			mb, stream.GetSnapshotByMiniblockIndex(i),
			events.NewParsedMiniblockInfoOpts().
				WithDoNotParseEvents(true),
		)
		if err != nil {
			return err
		}

		fmt.Print(info.Ref, "  ", info.Header().GetTimestamp().AsTime().Local())
		if info.Header().IsSnapshot() {
			fmt.Print(" SNAPSHOT")
		}
		fmt.Println()
	}

	return nil
}

type StreamNotMigrated struct {
	StreamID          shared.StreamId  `json:"stream_id"`
	ReplicationFactor uint8            `json:"replication_factor"`
	Status            string           `json:"status"`
	NodeAddresses     []common.Address `json:"node_addresses"`
}

type StreamPlacementTxResult struct {
	StreamID      shared.StreamId  `json:"stream_id"`
	Status        string           `json:"status"`
	TxHash        common.Hash      `json:"tx_hash"`
	NodeAddresses []common.Address `json:"node_addresses"`
}

type streamSyncNodeStatus struct {
	Status      string `json:"status"`
	MinipoolGen int64  `json:"minipool_gen,omitempty"`
	Error       string `json:"error,omitempty"`
}

type streamSyncStatus struct {
	StreamID shared.StreamId `json:"stream_id"`
	Nodes    map[common.Address]streamSyncNodeStatus
}

func runStreamMigrationListCmd(cmd *cobra.Command, args []string) error {
	limit := -1
	if len(args) == 2 {
		n, err := strconv.ParseInt(args[1], 10, 64)
		if err != nil {
			return err
		}
		limit = int(n)
	}

	outputFile, err := os.OpenFile(args[0], os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return err
	}
	defer outputFile.Close()

	output := json.NewEncoder(outputFile)

	ctx := context.Background() // lint:ignore context.Background() is fine here

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

	dumped := 0
	registryContract.ForAllStreams(ctx, blockchain.InitialBlockNum, func(streamWithID *river.StreamWithId) bool {
		stream := streamWithID.Stream
		if len(stream.Nodes) == 1 {
			streamNotMigrated := &StreamNotMigrated{
				StreamID:          streamWithID.Id,
				ReplicationFactor: uint8(stream.StreamReplicationFactor()),
				Status:            "not_migrated",
				NodeAddresses:     stream.Nodes,
			}

			if err := output.Encode(streamNotMigrated); err != nil {
				panic(err)
			}

			dumped++
		}
		return limit == -1 || dumped < limit
	})

	return nil
}

func runStreamPlaceInitiateCmd(cfg *config.Config, args []string) error {
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

	n, err := strconv.ParseInt(args[2], 10, 8)
	if err != nil {
		return err
	}
	targetReplicationFactor := int(n)

	if targetReplicationFactor == 0 || targetReplicationFactor > 5 {
		return fmt.Errorf("invalid replication factor: %d", targetReplicationFactor)
	}

	ctx := context.Background() // lint:ignore context.Background() is fine here

	blockchain, err := crypto.NewBlockchain(
		ctx,
		&cmdConfig.RiverChain,
		wallet,
		infra.NewMetricsFactory(nil, "river", "cmdline"),
		nil,
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
		return fmt.Errorf("address %s is not a configuration manager", wallet.Address)
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

	httpClient, err := http_client.GetHttpClient(ctx, cfg)
	if err != nil {
		return err
	}

	onChainConfig, err := crypto.NewOnChainConfig(
		ctx,
		blockchain.Client,
		registryContract.Address,
		blockchain.InitialBlockNum,
		blockchain.ChainMonitor,
	)
	if err != nil {
		return err
	}

	nodeRegistry, err := nodes.LoadNodeRegistry(ctx, registryContract, common.Address{}, blockchain.InitialBlockNum,
		blockchain.ChainMonitor, onChainConfig, httpClient, nil)
	if err != nil {
		return err
	}

	nodesToOperator := make(map[common.Address]common.Address)
	operatorToNodes := make(map[common.Address][]common.Address)
	for _, node := range nodeRegistry.GetAllNodes() {
		nodesToOperator[node.Address()] = node.Operator()
		if operator, found := operatorToNodes[node.Operator()]; found {
			operatorToNodes[node.Operator()] = append(operator, node.Address())
		} else {
			operatorToNodes[node.Operator()] = []common.Address{node.Address()}
		}
	}

	inputFile, err := os.ReadFile(args[1])
	if err != nil {
		return err
	}

	// decode input file and ensure that all stream node lists are max targetReplicationFactor length
	var (
		streamSetReplicationFactorRequests []river.SetStreamReplicationFactor
		inputJSON                          = json.NewDecoder(bytes.NewReader(inputFile))
	)

	for {
		var record StreamNotMigrated

		err := inputJSON.Decode(&record)
		if errors.Is(err, io.EOF) {
			break
		}

		if err != nil {
			return err
		}

		allStreamOperators := make(map[common.Address]struct{})

		if len(record.NodeAddresses) > targetReplicationFactor {
			return fmt.Errorf(
				"Invalid number of nodes for stream %s: %d, replication factor: %d",
				record.StreamID,
				len(record.NodeAddresses),
				targetReplicationFactor,
			)
		}

		// add random nodes to ensure that the number of stream nodes is the targeted replication factor
		// ensure that newly added nodes are from different operators
		choosenStreamNodes, err := nodeRegistry.ChooseStreamNodes(ctx, record.StreamID, targetReplicationFactor)
		if err != nil {
			return err
		}

		for _, newNode := range choosenStreamNodes {
			operator, found := nodesToOperator[newNode]
			if !found {
				return fmt.Errorf("Unable to find operator for node %s", newNode)
			}

			if len(record.NodeAddresses) < targetReplicationFactor {
				if _, found := allStreamOperators[operator]; !found {
					record.NodeAddresses = append(record.NodeAddresses, newNode)
					allStreamOperators[operator] = struct{}{}
				}
			}
		}

		if allowedMultipleNodesFromSameOperator := len(record.NodeAddresses) < targetReplicationFactor; allowedMultipleNodesFromSameOperator {
			for _, node := range choosenStreamNodes {
				if len(record.NodeAddresses) < targetReplicationFactor && !slices.Contains(record.NodeAddresses, node) {
					record.NodeAddresses = append(record.NodeAddresses, node)
				}
			}
		}

		if len(record.NodeAddresses) != targetReplicationFactor {
			return fmt.Errorf("Unable to add enough nodes to stream %s", record.StreamID)
		}

		streamSetReplicationFactorRequests = append(
			streamSetReplicationFactorRequests,
			river.SetStreamReplicationFactor{
				StreamId:          record.StreamID,
				Nodes:             record.NodeAddresses,
				ReplicationFactor: record.ReplicationFactor,
			},
		)
	}

	outputFile, err := os.OpenFile(args[1]+".initiated", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return err
	}
	defer outputFile.Close()

	output := json.NewEncoder(outputFile)

	decoder, err := crypto.NewEVMErrorDecoder(
		river.StreamRegistryV1MetaData,
		river.RiverConfigV1MetaData,
		river.NodeRegistryV1MetaData,
		river.StreamRegistryV1MetaData)
	if err != nil {
		return err
	}

	for requests := range slices.Chunk(streamSetReplicationFactorRequests, 500) {
		pendingTx, err := blockchain.TxPool.Submit(
			ctx,
			"StreamRegistry::SetStreamReplicationFactor",
			func(opts *bind.TransactOpts) (*types.Transaction, error) {
				return registryContract.StreamRegistry.SetStreamReplicationFactor(opts, requests)
			},
		)
		if err != nil {
			cs, st, err := decoder.DecodeEVMError(err)
			fmt.Printf("submit err: %v %v %v\n", cs, st, err)
			return err
		}

		receipt, err := pendingTx.Wait(ctx)
		if err != nil {
			return err
		}

		var results []*StreamPlacementTxResult
		for _, req := range requests {
			results = append(results, &StreamPlacementTxResult{
				Status:        "pending",
				StreamID:      req.StreamId,
				NodeAddresses: req.Nodes,
			})
		}

		switch receipt.Status {
		case types.ReceiptStatusSuccessful:
			for _, result := range results {
				result.Status = "success"
				result.TxHash = receipt.TxHash
				if err := output.Encode(result); err != nil {
					return err
				}
			}
		case types.ReceiptStatusFailed:
			for _, result := range results {
				result.Status = "failed"
				result.TxHash = receipt.TxHash
				if err := output.Encode(result); err != nil {
					return err
				}
			}
			return fmt.Errorf("transaction %s failed", receipt.TxHash)
		default:
			return fmt.Errorf("invalid transaction status: %d", receipt.Status)
		}
	}

	return nil
}

func runStreamPlaceStatusCmd(cfg *config.Config, args []string) error {
	ctx := context.Background() // lint:ignore context.Background() is fine here

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
		&cfg.RegistryContract,
		&cfg.RiverRegistry,
	)
	if err != nil {
		return err
	}

	httpClient, err := http_client.GetHttpClient(ctx, cfg)
	if err != nil {
		return err
	}

	onChainConfig, err := crypto.NewOnChainConfig(
		ctx,
		blockchain.Client,
		registryContract.Address,
		blockchain.InitialBlockNum,
		blockchain.ChainMonitor,
	)
	if err != nil {
		return err
	}

	nodeRegistry, err := nodes.LoadNodeRegistry(ctx, registryContract, common.Address{}, blockchain.InitialBlockNum,
		blockchain.ChainMonitor, onChainConfig, httpClient, nil)
	if err != nil {
		return err
	}

	inputFile, err := os.Open(args[0])
	if err != nil {
		return err
	}
	defer inputFile.Close()

	input := json.NewDecoder(inputFile)
	var streamPlacementTxResults []*StreamPlacementTxResult
	for {
		var result StreamPlacementTxResult
		if err := input.Decode(&result); err != nil {
			if errors.Is(err, io.EOF) {
				break
			}
			return err
		}
		streamPlacementTxResults = append(streamPlacementTxResults, &result)
	}

	var (
		wp        = workerpool.New(32)
		results   = make(chan *streamSyncStatus, 32)
		getStatus = func(stream *StreamPlacementTxResult) func() {
			return func() {
				status := &streamSyncStatus{
					StreamID: stream.StreamID,
					Nodes:    make(map[common.Address]streamSyncNodeStatus),
				}

				for _, nodeAddress := range stream.NodeAddresses {
					if stream.Status != "success" {
						status.Nodes[nodeAddress] = streamSyncNodeStatus{
							Status: "failed",
							Error:  "initiate tx failed",
						}
						continue
					}

					streamServiceClient, err := nodeRegistry.GetStreamServiceClientForAddress(nodeAddress)
					if err != nil {
						status.Nodes[nodeAddress] = streamSyncNodeStatus{
							Status: "failed",
							Error:  err.Error(),
						}
						continue
					}

					request := connect.NewRequest(&protocol.GetStreamRequest{StreamId: stream.StreamID[:]})
					request.Header().Set(rpc.RiverNoForwardHeader, rpc.RiverHeaderTrueValue)
					request.Header().Set(rpc.RiverAllowNoQuorumHeader, rpc.RiverHeaderTrueValue)

					response, err := streamServiceClient.GetStream(ctx, request)
					if err != nil {
						status.Nodes[nodeAddress] = streamSyncNodeStatus{
							Status: "failed",
							Error:  err.Error(),
						}
						continue
					}

					status.Nodes[nodeAddress] = streamSyncNodeStatus{
						Status:      "success",
						MinipoolGen: response.Msg.GetStream().GetNextSyncCookie().GetMinipoolGen(),
					}
				}

				results <- status
			}
		}
	)

	go func() {
		for _, stream := range streamPlacementTxResults {
			wp.Submit(getStatus(stream))
		}
		wp.StopWait()
		close(results)
	}()

	outputSink, err := os.OpenFile(args[0]+".status", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		outputSink = os.Stdout
	}
	output := json.NewEncoder(outputSink)

	for result := range results {
		output.Encode(result)
	}

	return nil
}

func runStreamPlaceEnterQuorumCmd(cfg *config.Config, args []string) error {
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

	ctx := context.Background() // lint:ignore context.Background() is fine here

	blockchain, err := crypto.NewBlockchain(
		ctx,
		&cmdConfig.RiverChain,
		wallet,
		infra.NewMetricsFactory(nil, "river", "cmdline"),
		nil,
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
		return fmt.Errorf("address %s is not a configuration manager", wallet.Address)
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

	inputFile, err := os.ReadFile(args[1])
	if err != nil {
		return err
	}

	// decode input file and ensure that all stream node lists are max targetReplicationFactor length
	var (
		streamSetReplicationFactorRequests []river.SetStreamReplicationFactor
		inputJSON                          = json.NewDecoder(bytes.NewReader(inputFile))
	)

	for {
		var record streamSyncStatus

		err := inputJSON.Decode(&record)
		if errors.Is(err, io.EOF) {
			break
		}

		if err != nil {
			return err
		}

		nodes := make([]common.Address, 0, len(record.Nodes))
		for node := range record.Nodes {
			nodes = append(nodes, node)
		}

		streamSetReplicationFactorRequests = append(
			streamSetReplicationFactorRequests,
			river.SetStreamReplicationFactor{
				StreamId:          record.StreamID,
				Nodes:             nodes,
				ReplicationFactor: uint8(len(nodes)),
			},
		)
	}

	outputFile, err := os.OpenFile(args[1]+".enter_quorum", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return err
	}
	defer outputFile.Close()

	output := json.NewEncoder(outputFile)

	decoder, err := crypto.NewEVMErrorDecoder(
		river.StreamRegistryV1MetaData,
		river.RiverConfigV1MetaData,
		river.NodeRegistryV1MetaData,
		river.StreamRegistryV1MetaData)
	if err != nil {
		return err
	}

	for requests := range slices.Chunk(streamSetReplicationFactorRequests, 500) {
		pendingTx, err := blockchain.TxPool.Submit(
			ctx,
			"StreamRegistry::SetStreamReplicationFactor",
			func(opts *bind.TransactOpts) (*types.Transaction, error) {
				return registryContract.StreamRegistry.SetStreamReplicationFactor(opts, requests)
			},
		)
		if err != nil {
			cs, st, err := decoder.DecodeEVMError(err)
			fmt.Printf("submit err: %v %v %v\n", cs, st, err)
			return err
		}

		receipt, err := pendingTx.Wait(ctx)
		if err != nil {
			return err
		}

		var results []*StreamPlacementTxResult
		for _, req := range requests {
			results = append(results, &StreamPlacementTxResult{
				Status:        "pending",
				StreamID:      req.StreamId,
				NodeAddresses: req.Nodes,
			})
		}

		switch receipt.Status {
		case types.ReceiptStatusSuccessful:
			for _, result := range results {
				result.Status = "success"
				result.TxHash = receipt.TxHash
				if err := output.Encode(result); err != nil {
					return err
				}
			}
		case types.ReceiptStatusFailed:
			for _, result := range results {
				result.Status = "failed"
				result.TxHash = receipt.TxHash
				if err := output.Encode(result); err != nil {
					return err
				}
			}
			return fmt.Errorf("transaction %s failed", receipt.TxHash)
		default:
			return fmt.Errorf("invalid transaction status: %d", receipt.Status)
		}
	}

	return nil
}

func runStreamPartitionCmd(cmd *cobra.Command, args []string) error {
	streamID, err := shared.StreamIdFromString(args[0])
	if err != nil {
		return err
	}

	suffix := storage.CreatePartitionSuffix(streamID, 256)
	fmt.Printf("Partition for %v is %v\n", streamID, suffix)

	return nil
}

func init() {
	cmdStream := &cobra.Command{
		Use:   "stream",
		Short: "Access stream data",
	}

	cmdStreamGetEvent := &cobra.Command{
		Use:   "event",
		Short: "Get event <stream-id> <event-hash> [max-block-range]",
		Long: `Dump stream event to stdout.
max-block-range is optional and limits the number of blocks to consider (default=100)`,
		Args: cobra.RangeArgs(2, 3),
		RunE: runStreamGetEventCmd,
	}

	cmdStreamGetMiniblock := &cobra.Command{
		Use:   "miniblock",
		Short: "Get Miniblock <stream-id> <block-hash> [max-block-range]",
		Long: `Dump miniblock content to stdout.
max-block-range is optional and limits the number of blocks to consider (default=100)`,
		Args: cobra.RangeArgs(2, 3),
		RunE: runStreamGetMiniblockCmd,
	}

	cmdStreamGetMiniblockNum := &cobra.Command{
		Use:   "miniblock-num",
		Short: "Get Miniblock <stream-id> <miniblockNum>",
		Long:  `Dump miniblock content to stdout.`,
		Args:  cobra.ExactArgs(2),
		RunE:  runStreamGetMiniblockNumCmd,
	}

	cmdStreamDump := &cobra.Command{
		Use:   "dump",
		Short: "Dump stream contents <stream-id> [max-block-range]",
		Long: `Dump stream content to stdout.
max-block-range is optional and limits the number of blocks to consider (default=100)`,
		Args: cobra.RangeArgs(1, 2),
		RunE: runStreamDumpCmd,
	}

	cmdStreamNodeDump := &cobra.Command{
		Use:   "node-dump",
		Short: "Dump stream contents from node <node-address> <stream-id> <chunk-size>",
		Long:  `Dump stream content to stdout, connecting directly to the requested node.`,
		Args:  cobra.RangeArgs(2, 3),
		RunE:  runStreamNodeDumpCmd,
	}

	cmdStreamMigrationList := &cobra.Command{
		Use:   "not-migrated <output-stream-id-file> [max-streams]",
		Short: "Dump non-replicated streams to file",
		Long: `Dump streams that are not replicated nor the migration to replicated streams was started
to a file, optionally the number of streams is limited by max-streams.`,
		Args: cobra.RangeArgs(1, 2),
		RunE: runStreamMigrationListCmd,
	}

	cmdStreamPlace := &cobra.Command{
		Use:   "place",
		Short: "Place streams on nodes",
	}

	cmdStreamPlaceInitiate := &cobra.Command{
		Use:   "initiate",
		Short: "Initiate stream placement <wallet-file> <input-stream-id-file> <replication-factor>",
		Long:  `Initiate stream placement for streams in the given file.`,
		Args:  cobra.ExactArgs(3),
		RunE: func(cmd *cobra.Command, args []string) error {
			return runStreamPlaceInitiateCmd(cmdConfig, args)
		},
	}

	cmdStreamPlaceStatus := &cobra.Command{
		Use:   "status",
		Short: "Status stream placement <input-stream-id-file>",
		Long:  `Get overview of stream placement status for streams in the given file.`,
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			return runStreamPlaceStatusCmd(cmdConfig, args)
		},
	}

	cmdStreamPlaceEnterQuorum := &cobra.Command{
		Use:   "enter-quorum",
		Short: "Enter quorum <wallet-file> <input-stream-id-file>",
		Long:  `Let all nodes enter quorum for streams in the given file.`,
		Args:  cobra.ExactArgs(2),
		RunE: func(cmd *cobra.Command, args []string) error {
			return runStreamPlaceEnterQuorumCmd(cmdConfig, args)
		},
	}

	cmdStreamGet := &cobra.Command{
		Use:   "get <stream-id>",
		Short: "Get stream contents",
		Long:  `Get stream content from node using GetStream RPC.`,
		Args:  cobra.ExactArgs(1),
		RunE:  runStreamGetCmd,
	}

	cmdStreamGetPartition := &cobra.Command{
		Use:   "part <stream-id>",
		Short: "Get stream stream database partition",
		Long:  `Get partition in database where the stream is stored (assuming 256 total partitions)`,
		Args:  cobra.RangeArgs(1, 1),
		RunE:  runStreamPartitionCmd,
	}

	cmdStreamPlace.AddCommand(cmdStreamPlaceInitiate)
	cmdStreamPlace.AddCommand(cmdStreamPlaceStatus)
	cmdStreamPlace.AddCommand(cmdStreamPlaceEnterQuorum)
	cmdStream.AddCommand(cmdStreamGetMiniblock)
	cmdStream.AddCommand(cmdStreamGetMiniblockNum)
	cmdStream.AddCommand(cmdStreamGetEvent)
	cmdStream.AddCommand(cmdStreamDump)
	cmdStream.AddCommand(cmdStreamNodeDump)
	cmdStream.AddCommand(cmdStreamMigrationList)
	cmdStream.AddCommand(cmdStreamPlace)
	cmdStream.AddCommand(cmdStreamGet)
	cmdStream.AddCommand(cmdStreamGetPartition)
	rootCmd.AddCommand(cmdStream)
}
