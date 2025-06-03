package cmd

import (
	"bytes"
	"context"
	"encoding/hex"
	"fmt"
	"math"
	"net/http"
	"os"
	"slices"
	"strconv"
	"sync"
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
	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/http_client"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/nodes"
	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/protocol/protocolconnect"
	"github.com/towns-protocol/towns/core/node/registries"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
)

func getStreamFromNode(
	ctx context.Context,
	registryContract registries.RiverRegistryContract,
	remoteNodeAddress common.Address,
	streamID StreamId,
) error {
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

func runStreamGetEventCmd(cmd *cobra.Command, args []string) error {
	ctx := context.Background() // lint:ignore context.Background() is fine here
	streamID, err := StreamIdFromString(args[0])
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

func runStreamNodeGetCmd(cmd *cobra.Command, args []string) error {
	ctx := context.Background() // lint:ignore context.Background() is fine here

	nodeAddress := common.HexToAddress(args[0])
	zeroAddress := common.Address{}
	if nodeAddress == zeroAddress {
		return fmt.Errorf("invalid argument 0: node-address")
	}

	streamID, err := StreamIdFromString(args[1])
	if err != nil {
		return fmt.Errorf("invalid argument 1: stream-id; %w", err)
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

	return getStreamFromNode(ctx, *registryContract, nodeAddress, streamID)
}

func runStreamGetMiniblockCmd(cmd *cobra.Command, args []string) error {
	ctx := context.Background() // lint:ignore context.Background() is fine here
	streamID, err := StreamIdFromString(args[0])
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

	var miniblocks []*protocol.Miniblock
	for currentFrom := from; currentFrom < to; currentFrom += 100 {
		currentTo := min(currentFrom+100, to)
		resp, err := remoteClient.GetMiniblocks(ctx, connect.NewRequest(&protocol.GetMiniblocksRequest{
			StreamId:      streamID[:],
			FromInclusive: currentFrom,
			ToExclusive:   currentTo,
			OmitSnapshots: true,
		}))
		if err != nil {
			return err
		}
		miniblocks = append(miniblocks, resp.Msg.GetMiniblocks()...)
	}

	for n, miniblock := range miniblocks {
		// Parse header
		info, err := events.NewMiniblockInfoFromProto(
			miniblock,
			nil,
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

func printMbSummary(miniblock *protocol.Miniblock, snapshot *protocol.Envelope, miniblockNum int64) error {
	info, err := events.NewMiniblockInfoFromProto(
		miniblock, snapshot,
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
	fmt.Printf("  Author: %v\n", common.BytesToAddress(info.HeaderEvent().Event.CreatorAddress))
	fmt.Printf("  Events: (%d)\n", len(info.Proto.Events))
	for i, event := range info.Proto.GetEvents() {
		parsedEvent, err := events.ParseEvent(event)
		if err != nil {
			return err
		}

		seconds := parsedEvent.Event.CreatedAtEpochMs / 1000
		nanoseconds := (parsedEvent.Event.CreatedAtEpochMs % 1000) * 1e6 // 1 millisecond = 1e6 nanoseconds
		timestamp := time.Unix(seconds, nanoseconds)
		fmt.Printf(
			"    (%d) %v %v Len=(%d) %v\n",
			i,
			timestamp.UTC(),
			hex.EncodeToString(event.Hash),
			len(event.Event),
			parsedEvent.ParsedString(),
		)
	}
	return nil
}

func runStreamGetMiniblockNumCmd(cmd *cobra.Command, args []string) error {
	ctx := context.Background() // lint:ignore context.Background() is fine here
	streamID, err := StreamIdFromString(args[0])
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

	return printMbSummary(miniblock, miniblocks.Msg.GetMiniblockSnapshot(miniblockNum), miniblockNum)
}

func runStreamDumpCmd(cmd *cobra.Command, args []string) error {
	ctx := context.Background() // lint:ignore context.Background() is fine here
	streamID, err := StreamIdFromString(args[0])
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
			if err := printMbSummary(miniblock, miniblocks.Msg.GetMiniblockSnapshot(from+int64(n)), from+int64(n)); err != nil {
				return err
			}
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

	streamId, err := StreamIdFromString(args[1])
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
	streamID, err := StreamIdFromString(args[0])
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

	return getStreamFromNode(ctx, *registryContract, remoteNodeAddress, streamID)
}

func runStreamPartitionCmd(cmd *cobra.Command, args []string) error {
	streamID, err := StreamIdFromString(args[0])
	if err != nil {
		return err
	}

	suffix := storage.CreatePartitionSuffix(streamID, 256)
	fmt.Printf("Partition for %v is %v\n", streamID, suffix)

	return nil
}

func runStreamUserCmd(cmd *cobra.Command, args []string) error {
	a := args[0]
	if !common.IsHexAddress(a) {
		return RiverError(protocol.Err_INVALID_ARGUMENT, "Not a valid address", "arg", a)
	}
	address := common.HexToAddress(a)

	fmt.Printf("%s\n", UserStreamIdFromAddr(address))
	fmt.Printf("%s\n", UserSettingStreamIdFromAddr(address))
	fmt.Printf("%s\n", UserMetadataStreamIdFromAddress(address))
	fmt.Printf("%s\n", UserInboxStreamIdFromAddress(address))

	return nil
}

func loadWallet(walletFile string) (*crypto.Wallet, error) {
	walletFileContents, err := os.ReadFile(walletFile)
	if err != nil {
		return nil, err
	}

	key, err := keystore.DecryptKey(walletFileContents, "")
	if err != nil {
		return nil, err
	}

	return &crypto.Wallet{
		PrivateKeyStruct: key.PrivateKey,
		PrivateKey:       eth_crypto.FromECDSA(key.PrivateKey),
		Address:          eth_crypto.PubkeyToAddress(key.PrivateKey.PublicKey),
	}, nil
}

func initRiverBlockchain(ctx context.Context, wallet *crypto.Wallet) (
	*crypto.Blockchain,
	*registries.RiverRegistryContract,
	error,
) {
	blockchain, err := crypto.NewBlockchain(
		ctx,
		&cmdConfig.RiverChain,
		wallet,
		infra.NewMetricsFactory(nil, "river", "cmdline"),
		nil,
	)
	if err != nil {
		return nil, nil, err
	}

	registryContract, err := registries.NewRiverRegistryContract(
		ctx,
		blockchain,
		&cmdConfig.RegistryContract,
		&cmdConfig.RiverRegistry,
	)
	if err != nil {
		return nil, nil, err
	}

	return blockchain, registryContract, nil
}

const targetReplicationFactor = 3

func runStreamMigrationStatusCmd(*config.Config, []string) error {
	ctx, cancel := context.WithCancel(context.Background()) // lint:ignore context.Background() is fine here
	defer cancel()

	riverChain, riverRegistry, err := initRiverBlockchain(ctx, nil)
	if err != nil {
		return err
	}

	defer riverChain.Close()

	nonReplicatedStreams := 0
	nonReplicatedStreamsWithSyncNodes := 0
	todoStreams := 0
	replicatedStreams := 0

	if err = riverRegistry.ForAllStreams(ctx, riverChain.InitialBlockNum, func(stream *river.StreamWithId) bool {
		if stream.ReplicationFactor() == targetReplicationFactor && len(stream.Nodes()) == targetReplicationFactor {
			replicatedStreams++
		} else if stream.ReplicationFactor() <= 1 && len(stream.Nodes()) == 1 {
			nonReplicatedStreams++
		} else if stream.ReplicationFactor() == 1 && len(stream.Nodes()) == targetReplicationFactor {
			nonReplicatedStreamsWithSyncNodes++
		} else {
			todoStreams++
		}
		return true
	}); err != nil {
		return err
	}

	fmt.Printf("    Replicated streams: %d\n", replicatedStreams)
	fmt.Printf("Non-replicated streams: %d\n", nonReplicatedStreams)
	fmt.Printf(" Migration in progress: %d\n", nonReplicatedStreamsWithSyncNodes)
	fmt.Printf("          Todo streams: %d\n", todoStreams)

	return nil
}

// runStreamMigrationToReplicatedStreamsCmd queries the streams registry and matches streams
// that aren't replicated or in the process of being migrated to replicated streams and either
// initiates the migration or advances the migration process to the next step/completed it.
// It can be killed at any time and resumed later.
func runStreamMigrationToReplicatedStreamsCmd(cfg *config.Config, args []string) error {
	ctx, cancel := context.WithCancel(context.Background()) // lint:ignore context.Background() is fine here
	defer cancel()

	wallet, err := loadWallet(args[0])
	if err != nil {
		return err
	}

	riverChain, riverRegistry, err := initRiverBlockchain(ctx, wallet)
	if err != nil {
		return err
	}
	defer riverChain.Close()

	onChainConfig, err := crypto.NewOnChainConfig(
		ctx,
		riverChain.Client,
		riverRegistry.Address,
		riverChain.InitialBlockNum,
		riverChain.ChainMonitor,
	)
	if err != nil {
		return err
	}

	decoder, err := crypto.NewEVMErrorDecoder(
		river.StreamRegistryV1MetaData,
		river.RiverConfigV1MetaData,
		river.NodeRegistryV1MetaData,
		river.StreamRegistryV1MetaData)
	if err != nil {
		return err
	}

	httpClient, err := http_client.GetHttpClient(ctx, cfg)
	if err != nil {
		return err
	}

	nodeRegistry, err := nodes.LoadNodeRegistry(
		ctx,
		riverRegistry,
		common.Address{},
		riverChain.InitialBlockNum,
		riverChain.ChainMonitor,
		onChainConfig,
		httpClient,
		nil)
	if err != nil {
		return err
	}

	mustProcessStream := func(stream *river.StreamWithId) bool {
		isReplicatedStream := stream.ReplicationFactor() == targetReplicationFactor &&
			len(stream.Nodes()) == targetReplicationFactor

		if isReplicatedStream {
			return false // already fully replicated
		}

		// migration in progress, try to complete it
		if stream.ReplicationFactor() == 1 && len(stream.Nodes()) == targetReplicationFactor {
			return true
		}

		return stream.LastMbNum() <= 150 // only migrate small streams for now
	}

	setStreamReplicationFactorRequestsChan := make(chan river.SetStreamReplicationFactor, 250)

	initTotal := 0
	enterQuorumTotal := 0

	submitSetStreamReplicationFactorTx := func(requests []river.SetStreamReplicationFactor) error {
		pendingTx, err := riverChain.TxPool.Submit(
			context.Background(), // lint:ignore context.Background() is fine here
			"StreamRegistry::SetStreamReplicationFactor",
			func(opts *bind.TransactOpts) (*types.Transaction, error) {
				return riverRegistry.StreamRegistry.SetStreamReplicationFactor(opts, requests)
			},
		)
		if err != nil {
			cs, st, err := decoder.DecodeEVMError(err)
			if cs != nil {
				return cs
			}
			if st != nil {
				return st
			}
			return err
		}

		receipt, err := pendingTx.Wait(context.Background()) // lint:ignore context.Background() is fine here
		if err != nil {
			return err
		}

		if receipt.Status != types.ReceiptStatusSuccessful {
			return fmt.Errorf("set stream replication factor tx failed")
		}

		for _, r := range requests {
			if r.ReplicationFactor == 1 {
				initTotal++
			} else {
				enterQuorumTotal++
			}

			fmt.Printf(
				"Set stream replication factor for stream %x to %d nodes: %v (tx=%s)\n",
				r.StreamId,
				r.ReplicationFactor,
				r.Nodes,
				receipt.TxHash,
			)
		}

		fmt.Printf("Total set stream replication factor requests initiated: %d / enterQuorum: %d\n",
			initTotal, enterQuorumTotal)

		return nil
	}

	var backgroundJobs sync.WaitGroup
	backgroundJobs.Add(1)

	go func() {
		defer backgroundJobs.Done()

		var setStreamReplicationFactorRequests []river.SetStreamReplicationFactor

		for {
			select {
			case request := <-setStreamReplicationFactorRequestsChan:
				setStreamReplicationFactorRequests = append(setStreamReplicationFactorRequests, request)

				if len(setStreamReplicationFactorRequests) >= 75 {
					if err := submitSetStreamReplicationFactorTx(setStreamReplicationFactorRequests); err != nil {
						panic(fmt.Sprintf("Error submitting set stream replication factor tx: %v\n", err))
					}
					setStreamReplicationFactorRequests = nil
				}

			case <-ctx.Done():
				if len(setStreamReplicationFactorRequests) > 0 {
					if err := submitSetStreamReplicationFactorTx(setStreamReplicationFactorRequests); err != nil {
						panic(fmt.Sprintf("Error submitting set stream replication factor tx: %v\n", err))
					}
					setStreamReplicationFactorRequests = nil
				}
				return
			}
		}
	}()

	inProgressWorkerPool := workerpool.New(40)

	type nodeStatus struct {
		NodeAddress   common.Address
		MiniblockNum  int64
		MiniblockHash common.Hash
	}

	// readyToEnterQuorum returns an indication if the nodes are in sync and can all participate in stream quorum
	readyToEnterQuorum := func(nodeStatuses []*nodeStatus) bool {
		if len(nodeStatuses) != targetReplicationFactor {
			return false
		}

		var miniblockNums []int64
		for _, nodeStatus := range nodeStatuses {
			miniblockNums = append(miniblockNums, nodeStatus.MiniblockNum)
		}

		// order by last miniblock number and reverse order so the highest miniblock number is first
		slices.Sort(miniblockNums)
		slices.Reverse(miniblockNums)

		// ensure that the required number of nodes to reach quorum is at, or almost at the latest miniblock number.
		minBlock := int64(math.MaxInt64)
		maxBlock := int64(math.MinInt64)
		quorumCount := events.TotalQuorumNum(len(miniblockNums))

		for _, qn := range miniblockNums[:quorumCount] {
			minBlock = min(minBlock, qn)
			maxBlock = max(maxBlock, qn)
		}

		return maxBlock >= 0 && maxBlock-minBlock <= 1
	}

	// loop over registered streams and check if they are replicated or in the process of being migrated
	riverRegistry.ForAllStreams(ctx, riverChain.InitialBlockNum, func(stream *river.StreamWithId) bool {
		if !mustProcessStream(stream) {
			return true
		}

		if stream.ReplicationFactor() <= 1 &&
			len(stream.Nodes()) < targetReplicationFactor { // initiate stream migration to replicated stream

			newNodes, err := nodeRegistry.ChooseStreamNodesWithCriteria(
				ctx,
				stream.StreamId(),
				targetReplicationFactor-len(stream.Nodes()),
				func(node common.Address, operator common.Address) bool {
					return !slices.Contains(stream.Nodes(), node)
				},
			)
			if err != nil {
				fmt.Printf("Error choosing stream nodes for stream %s: %v\n", stream.StreamId(), err)
				return true
			}

			newNodeList := append(stream.Nodes(), newNodes...)
			if len(newNodeList) != targetReplicationFactor {
				panic(
					fmt.Sprintf(
						"Unexpected new node list length for stream %s new nodes: %v\n",
						stream.StreamId(),
						newNodeList,
					),
				)
			}

			setStreamReplicationFactorRequestsChan <- river.SetStreamReplicationFactor{
				StreamId: stream.StreamId(),
				Nodes:    newNodeList,
				ReplicationFactor: uint8(
					len(stream.Nodes()),
				), // add new nodes as sync nodes and keep existing nodes as quorum nodes
			}

			return true
		} else if stream.ReplicationFactor() == 1 && len(stream.Nodes()) == targetReplicationFactor { // stream migration is in progress
			inProgressWorkerPool.Submit(func() {
				// ask all quorum and sync nodes and determine if they are in sync,
				// if in sync let the sync nodes enter quorum to finish the migration to replicated stream
				var nodeStatuses []*nodeStatus
			nodeStatusLoop:
				for _, nodeAddress := range stream.Nodes() {
					streamServiceClient, err := nodeRegistry.GetStreamServiceClientForAddress(nodeAddress)
					if err != nil {
						panic(fmt.Sprintf("Error getting stream service client for node %s: %v\n", nodeAddress, err))
					}

					resp, err := streamServiceClient.GetLastMiniblockHash(ctx, connect.NewRequest(&protocol.GetLastMiniblockHashRequest{
						StreamId: stream.Id[:],
					}))
					if err != nil {
						fmt.Printf("Error getting last miniblock hash for stream %s on node %s: %v\n", stream.StreamId(), nodeAddress, err)
						break nodeStatusLoop
					}

					nodeStatuses = append(nodeStatuses, &nodeStatus{
						NodeAddress:   nodeAddress,
						MiniblockNum:  resp.Msg.GetMiniblockNum(),
						MiniblockHash: common.BytesToHash(resp.Msg.GetHash()),
					})
				}

				if readyToEnterQuorum(nodeStatuses) {
					setStreamReplicationFactorRequestsChan <- river.SetStreamReplicationFactor{
						StreamId:          stream.StreamId(),
						Nodes:             stream.Nodes(),
						ReplicationFactor: uint8(len(stream.Nodes())),
					}
					return
				}
			})
		} else if stream.ReplicationFactor() == 1 && targetReplicationFactor == 3 && len(stream.Nodes()) == 4 &&
			stream.Nodes()[0] == common.HexToAddress("0x14D237838A619784c831E3A690AbceB2df953F26") {
			// migration of streams from bravo-2 that seemed overcommited at the time but is now fine
			// and not overcommited anymore

			inProgressWorkerPool.Submit(func() {
				// ask all quorum and sync nodes and determine if they are in sync,
				// if in sync let the sync nodes enter quorum to finish the migration to replicated stream
				var nodeStatuses []*nodeStatus
			nodeStatusLoop:
				for _, nodeAddress := range stream.Nodes() {
					streamServiceClient, err := nodeRegistry.GetStreamServiceClientForAddress(nodeAddress)
					if err != nil {
						panic(fmt.Sprintf("Error getting stream service client for node %s: %v\n", nodeAddress, err))
					}

					resp, err := streamServiceClient.GetLastMiniblockHash(ctx, connect.NewRequest(&protocol.GetLastMiniblockHashRequest{
						StreamId: stream.Id[:],
					}))
					if err != nil {
						fmt.Printf("Error getting last miniblock hash for stream %s on node %s: %v\n", stream.StreamId(), nodeAddress, err)
						break nodeStatusLoop
					}

					nodeStatuses = append(nodeStatuses, &nodeStatus{
						NodeAddress:   nodeAddress,
						MiniblockNum:  resp.Msg.GetMiniblockNum(),
						MiniblockHash: common.BytesToHash(resp.Msg.GetHash()),
					})
				}

				if readyToEnterQuorum(nodeStatuses) {
					setStreamReplicationFactorRequestsChan <- river.SetStreamReplicationFactor{
						StreamId:          stream.StreamId(),
						Nodes:             stream.Nodes()[:3],
						ReplicationFactor: uint8(targetReplicationFactor),
					}
					return
				}
			})
		} else if len(stream.Nodes()) != targetReplicationFactor {
			fmt.Printf("Stream: %s replFactor: %d has unexpected number of nodes: %d\n", stream.StreamId(), stream.ReplicationFactor(), len(stream.Nodes()))
		}

		return true
	})

	backgroundJobs.Done()
	inProgressWorkerPool.StopWait()

	return nil
}

func runStreamValidateCmd(cmd *cobra.Command, args []string) error {
	cc, ctxCancel, err := newCmdContext(cmd, cmdConfig)
	if err != nil {
		return err
	}
	defer ctxCancel()

	streamId, err := StreamIdFromString(args[0])
	if err != nil {
		return err
	}

	stub, _, _, err := cc.getStubForStream(streamId, cc.nodeAddress)
	if err != nil {
		return err
	}

	stream, err := cc.getStream(streamId, stub)
	if err != nil {
		return err
	}

	si := &streamInfo{}
	if err := si.init(stream); err != nil {
		return err
	}

	if si.minKnownMb != math.MaxInt64 && si.minKnownMb > 0 {
		for {
			toExclusive := si.minKnownMb
			fromInclusive := toExclusive - int64(cc.pageSize)
			if fromInclusive < 0 {
				fromInclusive = 0
			}

			resp, err := stub.GetMiniblocks(cc.ctx, connect.NewRequest(&protocol.GetMiniblocksRequest{
				StreamId:      streamId[:],
				FromInclusive: fromInclusive,
				ToExclusive:   toExclusive,
			}))
			if err != nil {
				return err
			}

			if len(resp.Msg.Miniblocks) != 0 {
				if err := si.addMbProtos(resp.Msg.Miniblocks, fromInclusive); err != nil {
					return err
				}
			}

			if fromInclusive == 0 || resp.Msg.Terminus {
				break
			}

			if len(resp.Msg.Miniblocks) == 0 {
				return RiverError(
					protocol.Err_INTERNAL,
					"No miniblocks found in range",
					"stream",
					streamId,
					"from",
					fromInclusive,
					"to",
					toExclusive,
				)
			}
		}
	}

	err = si.validateEventMbRefs()
	if err != nil {
		return err
	}

	fmt.Printf("OK\n")

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

	cmdStreamGet := &cobra.Command{
		Use:   "get <stream-id>",
		Short: "Get stream contents",
		Long:  `Get stream content from node using GetStream RPC.`,
		Args:  cobra.ExactArgs(1),
		RunE:  runStreamGetCmd,
	}

	cmdStreamNodeGet := &cobra.Command{
		Use:   "node-get <node-address> <stream-id>",
		Short: "Get stream contents from node",
		Long:  `Get stream content from specified node using GetStream RPC.`,
		Args:  cobra.ExactArgs(2),
		RunE:  runStreamNodeGetCmd,
	}

	cmdStreamGetPartition := &cobra.Command{
		Use:   "part <stream-id>",
		Short: "Get stream stream database partition",
		Long:  `Get partition in database where the stream is stored (assuming 256 total partitions)`,
		Args:  cobra.RangeArgs(1, 1),
		RunE:  runStreamPartitionCmd,
	}

	cmdStreamUser := &cobra.Command{
		Use:   "user <stream-id>",
		Short: "Get user stream ids",
		Long:  `Print 4 stream ids for the given user`,
		Args:  cobra.RangeArgs(1, 1),
		RunE:  runStreamUserCmd,
	}

	cmdStreamValidate := &cobra.Command{
		Use:   "validate <stream-id>",
		Short: "Validate stream contents",
		Long:  `Validate stream content by loading all miniblocks and checking for duplicate events.`,
		Args:  cobra.ExactArgs(1),
		RunE:  runStreamValidateCmd,
	}

	cmdStreamMigrationToReplicatedStreams := &cobra.Command{
		Use:   "migration-to-replicated-streams <wallet>",
		Short: "Migrate stream to replicated streams",
		Long:  `Migrate stream to replicated streams.`,
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			return runStreamMigrationToReplicatedStreamsCmd(cmdConfig, args)
		},
	}

	cmdStreamMigrationStatus := &cobra.Command{
		Use:   "repl-migration-status",
		Short: "Replication migration status",
		Long:  `Dump how manys streams need to be migrated to replicated streams or are in the process of being migrated.`,
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			return runStreamMigrationStatusCmd(cmdConfig, args)
		},
	}

	cmdStreamValidate.Flags().String("node", "", "Optional node address to fetch stream from")
	cmdStreamValidate.Flags().Duration("timeout", 30*time.Second, "Timeout for running the command")
	cmdStreamValidate.Flags().Int("page-size", 1000, "Number of miniblocks to fetch per page")

	cmdStream.AddCommand(cmdStreamGetMiniblock)
	cmdStream.AddCommand(cmdStreamGetMiniblockNum)
	cmdStream.AddCommand(cmdStreamGetEvent)
	cmdStream.AddCommand(cmdStreamDump)
	cmdStream.AddCommand(cmdStreamNodeDump)
	cmdStream.AddCommand(cmdStreamGet)
	cmdStream.AddCommand(cmdStreamNodeGet)
	cmdStream.AddCommand(cmdStreamGetPartition)
	cmdStream.AddCommand(cmdStreamUser)
	cmdStream.AddCommand(cmdStreamValidate)
	cmdStream.AddCommand(cmdStreamMigrationToReplicatedStreams)
	cmdStream.AddCommand(cmdStreamMigrationStatus)

	rootCmd.AddCommand(cmdStream)
}
