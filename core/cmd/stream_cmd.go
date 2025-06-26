package cmd

import (
	"bytes"
	"context"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math"
	"math/big"
	"net/http"
	"os"
	"reflect"
	"slices"
	"strconv"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gammazero/workerpool"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/contracts/river"
	"github.com/towns-protocol/towns/core/node/http_client"
	"github.com/towns-protocol/towns/core/node/rpc"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/spf13/cobra"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/events"
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

	request := connect.NewRequest(&protocol.GetStreamRequest{
		StreamId: streamID[:],
		Optional: false,
	})
	request.Header().Set(rpc.RiverNoForwardHeader, rpc.RiverHeaderTrueValue)
	request.Header().Set(rpc.RiverAllowNoQuorumHeader, rpc.RiverHeaderTrueValue)

	response, err := remoteClient.GetStream(ctx, request)
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

func runStreamCompareMiniblockChainCmd(cfg *config.Config, args []string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	streamId, err := StreamIdFromString(args[0])
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

	stream, err := registryContract.GetStream(ctx, streamId, blockchain.InitialBlockNum)
	if err != nil {
		return err
	}

	// find latest mb num on each node
	allNodes, err := registryContract.GetAllNodes(ctx, blockchain.InitialBlockNum)
	if err != nil {
		return err
	}

	lowest := func(nodeMbChain map[common.Address]map[int64]common.Hash) int64 {
		lowest := int64(math.MaxInt64)
		for _, chain := range nodeMbChain {
			for num := range chain {
				lowest = min(lowest, num)
			}
		}
		return lowest
	}

	highest := func(nodeMbChain map[common.Address]map[int64]common.Hash) int64 {
		highest := int64(math.MinInt64)
		for _, chain := range nodeMbChain {
			for num := range chain {
				highest = max(highest, num)
			}
		}
		return highest
	}

	atSameMbHeight := func(nodeMbChain map[common.Address]map[int64]common.Hash) bool {
		return lowest(nodeMbChain) == highest(nodeMbChain)
	}

	atSameMbHash := func(nodeMbChain map[common.Address]map[int64]common.Hash) bool {
		var first map[int64]common.Hash
		for _, chain := range nodeMbChain {
			if first == nil {
				first = chain
			} else {
				if !reflect.DeepEqual(first, chain) {
					return false
				}
			}
		}

		return true
	}

	allInSync := func(nodeMbChain map[common.Address]map[int64]common.Hash) bool {
		return atSameMbHeight(nodeMbChain) && atSameMbHash(nodeMbChain)
	}

	getMiniblockHash := func(ctx context.Context, addr common.Address, num int64) (common.Hash, error) {
		index := slices.IndexFunc(allNodes, func(n registries.NodeRecord) bool {
			return n.NodeAddress == addr
		})

		if index == -1 {
			return common.Hash{}, fmt.Errorf("node %s not found in registry", addr)
		}

		node := allNodes[index]

		streamServiceClient := protocolconnect.NewStreamServiceClient(http.DefaultClient, node.Url)
		request := connect.NewRequest(
			&protocol.GetMiniblocksRequest{StreamId: streamId[:], FromInclusive: num, ToExclusive: num + 1},
		)
		request.Header().Set(rpc.RiverNoForwardHeader, rpc.RiverHeaderTrueValue)
		request.Header().Set(rpc.RiverAllowNoQuorumHeader, rpc.RiverHeaderTrueValue)

		response, err := streamServiceClient.GetMiniblocks(ctx, request)
		if err != nil {
			return common.Hash{}, err
		}

		return common.BytesToHash(response.Msg.Miniblocks[0].Header.GetHash()), nil
	}

	hasForked := func(nodeMbChain map[common.Address]map[int64]common.Hash) (bool, error) {
		lowest := lowest(nodeMbChain)
		lowestHashes := make(map[common.Hash]struct{})
		for node, chain := range nodeMbChain {
			hash, contains := chain[lowest]
			if !contains {
				hash, err := getMiniblockHash(ctx, node, lowest)
				if err != nil {
					return false, err
				}
				lowestHashes[hash] = struct{}{}
			} else {
				lowestHashes[hash] = struct{}{}
			}
		}
		return len(lowestHashes) != 1, nil
	}

	printChain := func(nodeMbChain map[common.Address]map[int64]common.Hash) {
		for node, chain := range nodeMbChain {
			fmt.Printf("Node %s:\n", node)
			blockNums := make([]int64, 0, len(chain))
			for num := range chain {
				blockNums = append(blockNums, num)
			}
			slices.Sort(blockNums)

			for _, num := range blockNums {
				fmt.Printf("  %d: %s\n", num, chain[num])
			}
		}
		println()
	}

	printFork := func(nodeMbChain map[common.Address]map[int64]common.Hash) error {
		lowest := lowest(nodeMbChain)
		// loop back over all nodes until a shared hash is found
		for num := lowest; num >= 0; num-- {
			hashes := make(map[common.Hash]struct{})
			for node := range nodeMbChain {
				hash, err := getMiniblockHash(ctx, node, num)
				if err != nil {
					return err
				}
				hashes[hash] = struct{}{}
				nodeMbChain[node][num] = hash
			}
			if len(hashes) == 1 {
				printChain(nodeMbChain)
				fmt.Printf("Forked at %d\n", num+1)
				return nil
			}
		}

		return fmt.Errorf("no fork detected")
	}

	loadChain := func(addr common.Address, fromInclusive int64, toExclusive int64) (map[int64]common.Hash, error) {
		index := slices.IndexFunc(allNodes, func(n registries.NodeRecord) bool {
			return n.NodeAddress == addr
		})

		if index == -1 {
			return nil, fmt.Errorf("node %s not found in registry", addr)
		}

		chain := make(map[int64]common.Hash)
		node := allNodes[index]
		streamServiceClient := protocolconnect.NewStreamServiceClient(http.DefaultClient, node.Url)
		request := connect.NewRequest(&protocol.GetMiniblocksRequest{
			StreamId:      streamId[:],
			FromInclusive: fromInclusive,
			ToExclusive:   toExclusive,
			OmitSnapshots: true,
		})
		request.Header().Set(rpc.RiverNoForwardHeader, rpc.RiverHeaderTrueValue)
		request.Header().Set(rpc.RiverAllowNoQuorumHeader, rpc.RiverHeaderTrueValue)

		response, err := streamServiceClient.GetMiniblocks(ctx, request)
		if err != nil {
			return nil, err
		}

		for i, mb := range response.Msg.GetMiniblocks() {
			info, err := events.NewMiniblockInfoFromProto(
				mb, response.Msg.GetMiniblockSnapshot(int64(i)),
				events.NewParsedMiniblockInfoOpts().
					WithDoNotParseEvents(true),
			)
			if err != nil {
				return nil, err
			}

			chain[info.Ref.Num] = info.Ref.Hash
		}

		return chain, nil
	}

	loadLatestMb := func(ctx context.Context, stream *river.StreamWithId) (map[common.Address]map[int64]common.Hash, error) {
		nodeMbChain := make(map[common.Address]map[int64]common.Hash)
		for _, addr := range stream.Nodes() {
			index := slices.IndexFunc(allNodes, func(n registries.NodeRecord) bool {
				return n.NodeAddress == addr
			})

			if index == -1 {
				return nil, fmt.Errorf("node %s not found in registry", addr)
			}

			node := allNodes[index]
			streamServiceClient := protocolconnect.NewStreamServiceClient(http.DefaultClient, node.Url)
			request := connect.NewRequest(&protocol.GetLastMiniblockHashRequest{StreamId: streamId[:]})
			request.Header().Set(rpc.RiverNoForwardHeader, rpc.RiverHeaderTrueValue)
			request.Header().Set(rpc.RiverAllowNoQuorumHeader, rpc.RiverHeaderTrueValue)

			response, err := streamServiceClient.GetLastMiniblockHash(ctx, request)
			if err != nil {
				return nil, err
			}

			nodeMbChain[addr] = make(map[int64]common.Hash)
			nodeMbChain[addr][response.Msg.GetMiniblockNum()] = common.BytesToHash(response.Msg.GetHash())
		}

		return nodeMbChain, nil
	}

	nodeMbChain, err := loadLatestMb(ctx, stream)
	if err != nil {
		return err
	}

	if allInSync(nodeMbChain) {
		fmt.Println("All nodes are in sync")
		printChain(nodeMbChain)
		return nil
	}

	if hasForked, err := hasForked(nodeMbChain); err != nil {
		return err
	} else if hasForked {
		return printFork(nodeMbChain)
	}

	fromInclusive := max(0, lowest(nodeMbChain)-15)
	toExclusive := fromInclusive + 18

	for addr := range nodeMbChain {
		chain, err := loadChain(addr, fromInclusive, toExclusive)
		if err != nil {
			return err
		}
		nodeMbChain[addr] = chain
	}

	fmt.Println("Node out of sync")
	printChain(nodeMbChain)

	return nil
}

func runStreamOutOfSyncCmd(cfg *config.Config, args []string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	outputFile, err := os.Create(args[0])
	if err != nil {
		return err
	}

	output := json.NewEncoder(outputFile)

	defer outputFile.Close()

	const targetReplicationFactor = 3

	riverChain, err := crypto.NewBlockchain(
		ctx,
		&cfg.RiverChain,
		nil,
		infra.NewMetricsFactory(nil, "river", "cmdline"),
		nil,
	)
	if err != nil {
		return err
	}

	defer riverChain.Close()

	riverRegistry, err := registries.NewRiverRegistryContract(
		ctx,
		riverChain,
		&cfg.RegistryContract,
		&cfg.RiverRegistry,
	)
	if err != nil {
		return err
	}

	allNodes, err := riverRegistry.NodeRegistry.GetAllNodes(&bind.CallOpts{
		BlockNumber: big.NewInt(int64(riverChain.InitialBlockNum)),
	})
	if err != nil {
		return err
	}

	nodeWorkerPools := make(map[common.Address]*workerpool.WorkerPool)
	for _, node := range allNodes {
		nodeWorkerPools[node.NodeAddress] = workerpool.New(8)
	}

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
		nil,
		nil)
	if err != nil {
		return err
	}

	type nodeStatus struct {
		NodeAddress   common.Address `json:"nodeAddress"`
		MiniblockNum  int64          `json:"miniblockNum"`
		MiniblockHash common.Hash    `json:"miniblockHash"`
		Error         string         `json:"err,omitempty"`
	}

	type streamStatus struct {
		StreamID     StreamId
		NodeStatuses []*nodeStatus
	}

	inSync := func(streamID StreamId, nodeStatuses []*nodeStatus) bool {
		if len(nodeStatuses) != targetReplicationFactor {
			return false
		}

		var miniblockNums []int64
		hashes := make(map[common.Hash]common.Address)

		for _, nodeStatus := range nodeStatuses {
			miniblockNums = append(miniblockNums, nodeStatus.MiniblockNum)
			hashes[nodeStatus.MiniblockHash] = nodeStatus.NodeAddress
		}
		slices.Sort(miniblockNums)

		// allow max 1 block difference between the highest and lowest miniblock number
		diff := miniblockNums[targetReplicationFactor-1] - miniblockNums[0]
		return (diff == 0 && len(hashes) == 1) || diff == 1
	}

	var (
		totalStreams           atomic.Int64
		totalReplicatedStreams atomic.Int64
		outOfSyncStreams       atomic.Int64
		inSyncStreams          atomic.Int64
	)

	forAllStreamsErr := riverRegistry.ForAllStreams(
		ctx,
		riverChain.InitialBlockNum,
		func(stream *river.StreamWithId) bool {
			totalStreams.Add(1)
			if len(stream.Nodes()) == 1 {
				return true // non-replicated stream
			}

			if trs := totalReplicatedStreams.Add(1); trs%10_000 == 0 {
				fmt.Printf("out-of-sync: %d in-sync: %d replicated-streams: %d total-streams: %d\n",
					outOfSyncStreams.Load(), inSyncStreams.Load(), totalReplicatedStreams.Load(), totalStreams.Load())
			}

			if len(stream.Nodes()) != targetReplicationFactor {
				return true
			}

			var (
				mu           = new(sync.Mutex)
				nodeStatuses []*nodeStatus
			)

			// request latest miniblock hash from each node and compare them.
			for _, nodeAddress := range stream.Nodes() {
				nodeWorkerPools[nodeAddress].Submit(func() {
					streamServiceClient, err := nodeRegistry.GetStreamServiceClientForAddress(nodeAddress)
					if err != nil {
						panic(err)
					}

					request := connect.NewRequest(&protocol.GetLastMiniblockHashRequest{StreamId: stream.Id[:]})
					request.Header().Set(rpc.RiverNoForwardHeader, rpc.RiverHeaderTrueValue)
					request.Header().Set(rpc.RiverAllowNoQuorumHeader, rpc.RiverHeaderTrueValue)

					var ns *nodeStatus
					if resp, err := streamServiceClient.GetLastMiniblockHash(ctx, request); err == nil {
						ns = &nodeStatus{
							NodeAddress:   nodeAddress,
							MiniblockNum:  resp.Msg.MiniblockNum,
							MiniblockHash: common.BytesToHash(resp.Msg.Hash),
						}
					} else {
						ns = &nodeStatus{NodeAddress: nodeAddress, Error: err.Error()}
					}

					mu.Lock()
					defer mu.Unlock()

					nodeStatuses = append(nodeStatuses, ns)
					if len(nodeStatuses) == targetReplicationFactor {
						if !inSync(stream.Id, nodeStatuses) {
							outOfSyncStreams.Add(1)
							_ = output.Encode(&streamStatus{
								StreamID:     stream.Id,
								NodeStatuses: nodeStatuses,
							})
						} else {
							inSyncStreams.Add(1)
						}
					}
				})
			}

			return true
		},
	)

	if forAllStreamsErr != nil {
		return forAllStreamsErr
	}

	done := make(chan struct{})
	go func() {
		defer close(done)
		for {
			fmt.Printf("out-of-sync: %d in-sync: %d replicated-streams: %d total-streams: %d\n",
				outOfSyncStreams.Load(), inSyncStreams.Load(), totalReplicatedStreams.Load(), totalStreams.Load())
			select {
			case <-time.After(15 * time.Second):
				continue
			case <-done:
				return
			}
		}
	}()

	// wait for all tasks to finish
	for _, workerPool := range nodeWorkerPools {
		workerPool.StopWait()
	}
	close(done)

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

	cmdStreamCompareMiniblockChain := &cobra.Command{
		Use:   "compare-miniblock-chain <stream-id>",
		Short: "Compare miniblock chains",
		Long:  `Compare miniblock chain by loading all miniblocks and comparing them between nodes.`,
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			return runStreamCompareMiniblockChainCmd(cmdConfig, args)
		},
	}

	cmdStreamOutOfSync := &cobra.Command{
		Use:   "out-of-sync <output-file>",
		Short: "Find out-of-sync streams",
		Long:  `Find out-of-sync streams by loading all miniblocks and comparing them between nodes.`,
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			return runStreamOutOfSyncCmd(cmdConfig, args)
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
	cmdStream.AddCommand(cmdStreamCompareMiniblockChain)
	cmdStream.AddCommand(cmdStreamOutOfSync)

	rootCmd.AddCommand(cmdStream)
}
