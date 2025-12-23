package cmd

import (
	"bytes"
	"context"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"math/big"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"reflect"
	"slices"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"golang.org/x/sync/semaphore"

	"github.com/gammazero/workerpool"

	"github.com/towns-protocol/towns/core/blockchain"
	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/contracts/base"
	"github.com/towns-protocol/towns/core/contracts/river"
	"github.com/towns-protocol/towns/core/node/http_client"
	"github.com/towns-protocol/towns/core/node/rpc/headers"

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
	request.Header().Set(headers.RiverNoForwardHeader, headers.RiverHeaderTrueValue)
	request.Header().Set(headers.RiverAllowNoQuorumHeader, headers.RiverHeaderTrueValue)

	response, err := remoteClient.GetStream(ctx, request)
	if err != nil {
		return err
	}

	stream := response.Msg.GetStream()
	fmt.Println("MBs: ", len(stream.GetMiniblocks()), " Events: ", len(stream.GetEvents()))

	opt := events.NewParsedMiniblockInfoOpts().WithDoNotParseEvents(true).WithApplyOnlyMatchingSnapshot()
	for _, mb := range stream.GetMiniblocks() {
		info, err := events.NewMiniblockInfoFromProto(mb, stream.Snapshot, opt)
		if err != nil {
			return err
		}

		fmt.Print(info.Ref, "  ", info.Header().GetTimestamp().AsTime().Local())
		if info.Snapshot != nil {
			fmt.Print(" SNAPSHOT")
		}
		fmt.Println()
	}

	return nil
}

func runStreamGetEventCmd(cmd *cobra.Command, args []string) error {
	ctx := cmd.Context()
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

	stream, err := registryContract.StreamRegistry.GetStreamOnLatestBlock(ctx, streamID)
	if err != nil {
		return err
	}

	nodes := nodes.NewStreamNodesWithLock(stream.ReplicationFactor(), stream.Nodes, common.Address{})
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
	ctx := cmd.Context()

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
	ctx := cmd.Context()
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

	stream, err := registryContract.StreamRegistry.GetStreamOnLatestBlock(ctx, streamID)
	if err != nil {
		return err
	}

	nodes := nodes.NewStreamNodesWithLock(stream.ReplicationFactor(), stream.Nodes, common.Address{})
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
				WithSkipSnapshotValidation().
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
		"=============================\nMiniblock %d (size %s)\n=============================\n",
		mbHeader.MiniblockHeader.MiniblockNum,
		formatBytes(proto.Size(miniblock)),
	)
	fmt.Printf("       Timestamp: %v\n", mbHeader.MiniblockHeader.GetTimestamp().AsTime().UTC())
	fmt.Printf("            Hash: %v\n", hex.EncodeToString(miniblock.Header.Hash))
	fmt.Printf("          Author: %v\n", common.BytesToAddress(info.HeaderEvent().Event.CreatorAddress))
	fmt.Printf("Event num offset: %d\n", mbHeader.MiniblockHeader.GetEventNumOffset())
	if info.Snapshot != nil {
		fmt.Printf(
			"  **********************\n  Snapshot: (size %s)\n  **********************\n",
			formatBytes(proto.Size(info.Snapshot)),
		)
		fmt.Printf("    %v\n", info.Snapshot.ParsedStringWithIndent("    "))
	}
	fmt.Printf("  ------------\n  Events: (%d)\n  ------------\n", len(info.Proto.Events))
	for i, event := range info.Proto.GetEvents() {
		parsedEvent, err := events.ParseEvent(event)
		if err != nil {
			return err
		}

		seconds := parsedEvent.Event.CreatedAtEpochMs / 1000
		nanoseconds := (parsedEvent.Event.CreatedAtEpochMs % 1000) * 1e6 // 1 millisecond = 1e6 nanoseconds
		timestamp := time.Unix(seconds, nanoseconds)
		fmt.Printf(
			"    (%d) %v %v Len=(%d)\n      Creator: %v %v\n",
			i,
			timestamp.UTC(),
			hex.EncodeToString(event.Hash),
			len(event.Event),
			hex.EncodeToString(parsedEvent.Event.CreatorAddress),
			parsedEvent.ParsedStringWithIndent("        "),
		)
	}
	return nil
}

func runStreamGetMiniblockNumCmd(cmd *cobra.Command, args []string) error {
	ctx := cmd.Context()
	streamID, err := StreamIdFromString(args[0])
	if err != nil {
		return err
	}
	miniblockNum, err := strconv.ParseInt(args[1], 10, 64)
	if err != nil {
		return fmt.Errorf("could not parse miniblockNum: %w", err)
	}

	// Parse optional range argument (default to 1 if not provided)
	rangeCount := int64(1)
	if len(args) == 3 {
		rangeCount, err = strconv.ParseInt(args[2], 10, 64)
		if err != nil {
			return fmt.Errorf("could not parse range: %w", err)
		}
		if rangeCount < 1 {
			return fmt.Errorf("range must be at least 1")
		}
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

	stream, err := registryContract.StreamRegistry.GetStreamOnLatestBlock(ctx, streamID)
	if err != nil {
		return err
	}

	nodes := nodes.NewStreamNodesWithLock(stream.ReplicationFactor(), stream.Nodes, common.Address{})
	remoteNodeAddress := nodes.GetStickyPeer()

	remote, err := registryContract.NodeRegistry.GetNode(nil, remoteNodeAddress)
	if err != nil {
		return err
	}

	remoteClient := protocolconnect.NewStreamServiceClient(http.DefaultClient, remote.Url)
	miniblocks, err := remoteClient.GetMiniblocks(ctx, connect.NewRequest(&protocol.GetMiniblocksRequest{
		StreamId:      streamID[:],
		FromInclusive: miniblockNum,
		ToExclusive:   miniblockNum + rangeCount,
		OmitSnapshots: false,
	}))
	if err != nil {
		return err
	}

	// Check if we got any miniblocks
	if len(miniblocks.Msg.Miniblocks) < 1 {
		fmt.Printf("Miniblock num %d not found in stream %s\n", miniblockNum, streamID)
		return nil
	}

	// Print summary for each miniblock in the range
	for i, miniblock := range miniblocks.Msg.GetMiniblocks() {
		mbNum := miniblockNum + int64(i)
		if err := printMbSummary(miniblock, miniblocks.Msg.GetMiniblockSnapshot(mbNum), mbNum); err != nil {
			return err
		}
	}

	// Report if we got fewer miniblocks than requested
	if int64(len(miniblocks.Msg.Miniblocks)) < rangeCount {
		fmt.Printf("\n(Found %d miniblocks, requested %d)\n", len(miniblocks.Msg.Miniblocks), rangeCount)
	}

	return nil
}

func runStreamDumpCmd(cmd *cobra.Command, args []string) error {
	ctx := cmd.Context()
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

	stream, err := registryContract.StreamRegistry.GetStreamOnLatestBlock(ctx, streamID)
	if err != nil {
		return err
	}

	nodes := nodes.NewStreamNodesWithLock(stream.ReplicationFactor(), stream.Nodes, common.Address{})
	remoteNodeAddress := nodes.GetStickyPeer()

	if len(args) >= 3 {
		remoteNodeAddress = common.HexToAddress(args[2])
	}

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
	if len(args) >= 2 {
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
			OmitSnapshots: false,
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
	ctx := cmd.Context()
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
			if err := printMbSummary(miniblock, miniblocks.Msg.GetMiniblockSnapshot(from+int64(n)), from+int64(n)); err != nil {
				return err
			}
		}
		blocksRead = len(miniblocks.Msg.Miniblocks)
		from = from + int64(blocksRead)
		to = from + blockRange
	}

	return nil
}

func runStreamGetCmd(cmd *cobra.Command, args []string) error {
	ctx := cmd.Context()
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

	streamRecord, err := registryContract.StreamRegistry.GetStreamOnLatestBlock(ctx, streamID)
	if err != nil {
		return err
	}

	nodes := nodes.NewStreamNodesWithLock(streamRecord.ReplicationFactor(), streamRecord.Nodes, common.Address{})
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
	ctx := cmd.Context()

	contract, err := cmd.Flags().GetBool("contract")
	if err != nil {
		return err
	}

	a := args[0]
	if !common.IsHexAddress(a) {
		return RiverError(protocol.Err_INVALID_ARGUMENT, "Not a valid address", "arg", a)
	}
	address := common.HexToAddress(a)

	if contract {
		baseBlockchain, err := crypto.NewBlockchain(
			ctx,
			&cmdConfig.BaseChain,
			nil,
			infra.NewMetricsFactory(nil, "river", "cmdline"),
			nil,
		)
		if err != nil {
			return err
		}

		contract, err := base.NewWalletLink(cmdConfig.GetWalletLinkContractAddress(), baseBlockchain.Client)
		if err != nil {
			return err
		}

		rootKey, err := contract.GetRootKeyForWallet(&bind.CallOpts{Context: ctx}, address)
		if err != nil {
			return err
		}
		fmt.Printf("Root key for wallet %s is %s\n", address.Hex(), rootKey.Hex())
		address = rootKey
	}

	fmt.Printf("%s\n", UserStreamIdFromAddr(address))
	fmt.Printf("%s\n", UserSettingStreamIdFromAddr(address))
	fmt.Printf("%s\n", UserMetadataStreamIdFromAddr(address))
	fmt.Printf("%s\n", UserInboxStreamIdFromAddr(address))

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

func runStreamCompareMiniblockChainCmd(ctx context.Context, cfg *config.Config, args []string) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Minute)
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

	streamNoId, err := registryContract.StreamRegistry.GetStreamOnBlock(ctx, streamId, blockchain.InitialBlockNum)
	if err != nil {
		return err
	}
	stream := river.NewStreamWithId(streamId, streamNoId)

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
		request.Header().Set(headers.RiverNoForwardHeader, headers.RiverHeaderTrueValue)
		request.Header().Set(headers.RiverAllowNoQuorumHeader, headers.RiverHeaderTrueValue)

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
		request.Header().Set(headers.RiverNoForwardHeader, headers.RiverHeaderTrueValue)
		request.Header().Set(headers.RiverAllowNoQuorumHeader, headers.RiverHeaderTrueValue)

		response, err := streamServiceClient.GetMiniblocks(ctx, request)
		if err != nil {
			return nil, err
		}

		for i, mb := range response.Msg.GetMiniblocks() {
			info, err := events.NewMiniblockInfoFromProto(
				mb, response.Msg.GetMiniblockSnapshot(int64(i)),
				events.NewParsedMiniblockInfoOpts().
					WithSkipSnapshotValidation().
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
			request.Header().Set(headers.RiverNoForwardHeader, headers.RiverHeaderTrueValue)
			request.Header().Set(headers.RiverAllowNoQuorumHeader, headers.RiverHeaderTrueValue)

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

type (
	nodeStreamState struct {
		LastMiniblockNum  int64       `json:"lastMiniblockNum"`
		LastMiniblockHash common.Hash `json:"lastMiniblockHash"`
		Err               string      `json:"error,omitempty"`
	}
	streamState struct {
		StreamID                  StreamId                            `json:"streamId"`
		RiverBlock                blockchain.BlockNumber              `json:"riverBlock"`
		RegistryLastMiniblockNum  int64                               `json:"registryLastMiniblockNum"`
		RegistryLastMiniblockHash common.Hash                         `json:"registryLastMiniblockHash"`
		When                      time.Time                           `json:"when"`
		Nodes                     map[common.Address]*nodeStreamState `json:"nodes"`
		Status                    string                              `json:"status"`
	}

	Client struct {
		sem    *semaphore.Weighted
		client protocolconnect.StreamServiceClient
	}
)

func runStreamCheckStateCmd(cmd *cobra.Command, cfg *config.Config, args []string) error {
	var (
		ctx                  = cmd.Context()
		outputDir            = args[0]
		okOutputFileName     = path.Join(outputDir, "streams.OK.jsonl")
		noticeOutputFileName = path.Join(outputDir, "streams.NOTICE.jsonl")
		warnOutputFileName   = path.Join(outputDir, "streams.WARN.jsonl")
		errorOutputFileName  = path.Join(outputDir, "streams.ERROR.jsonl")
		processedStreamsMu   sync.Mutex
		processedStreams     = make(map[StreamId]*streamState)
		clients              = make(map[common.Address]*Client)
	)

	if err := os.MkdirAll(outputDir, 0o755); err != nil {
		return err
	}

	var outputFileMu sync.Mutex
	okOutputFile, err := os.OpenFile(okOutputFileName, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o644)
	if err != nil {
		return err
	}
	defer okOutputFile.Close()
	noticeOutputFile, err := os.OpenFile(noticeOutputFileName, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o644)
	if err != nil {
		return err
	}
	defer noticeOutputFile.Close()
	warnOutputFile, err := os.OpenFile(warnOutputFileName, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o644)
	if err != nil {
		return err
	}
	defer warnOutputFile.Close()
	errorOutputFile, err := os.OpenFile(errorOutputFileName, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o644)
	if err != nil {
		return err
	}
	defer errorOutputFile.Close()

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

	// load already processed stream state records
	if err := filepath.WalkDir(outputDir, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil // don't process sub directories
		}
		if !strings.HasSuffix(d.Name(), ".jsonl") {
			return nil // only process .jsonl files
		}

		nodeFile, err := os.Open(path)
		if err != nil {
			return err
		}
		defer nodeFile.Close()

		input := json.NewDecoder(nodeFile)
		for {
			var s streamState
			if err := input.Decode(&s); err != nil {
				if errors.Is(err, io.EOF) {
					break
				}
				if err != nil {
					return err
				}
			}
			processedStreams[s.StreamID] = &s
		}
		return nil
	}); err != nil {
		return err
	}

	fmt.Printf("Loaded %d processed streams\n", len(processedStreams))

	// loop over registered streams at river block and check their state if not already processed
	riverRegistry, err := registries.NewRiverRegistryContract(
		ctx,
		riverChain,
		&cfg.RegistryContract,
		&cfg.RiverRegistry,
	)
	if err != nil {
		return err
	}

	allNodesResp, err := riverRegistry.NodeRegistry.GetAllNodes(&bind.CallOpts{
		BlockNumber: riverChain.InitialBlockNum.AsBigInt(),
	})
	if err != nil {
		return err
	}

	// limit concurrent requests to each node to prevent interfering with normal operations.
	const maxConcurrentRequestPerNode = 8

	for _, n := range allNodesResp {
		clients[n.NodeAddress] = &Client{
			sem:    semaphore.NewWeighted(maxConcurrentRequestPerNode),
			client: protocolconnect.NewStreamServiceClient(http.DefaultClient, n.Url),
		}
	}

	wp := workerpool.New(len(clients) * maxConcurrentRequestPerNode)

	expStreamCount, err := riverRegistry.StreamRegistry.GetStreamCount(ctx, riverChain.InitialBlockNum)
	if err != nil {
		return err
	}

	done := make(chan struct{})
	defer close(done)

	go func() {
		for {
			select {
			case <-done:
				return
			case <-time.After(time.Minute):
				processedStreamsMu.Lock()
				fmt.Printf("%s processed %d/%d streams\n", time.Now(), len(processedStreams), expStreamCount)
				processedStreamsMu.Unlock()
			}
		}
	}()

	if err := riverRegistry.ForAllStreams(ctx, riverChain.InitialBlockNum, func(stream *river.StreamWithId) bool {
		processedStreamsMu.Lock()
		if _, ok := processedStreams[stream.StreamId()]; !ok {
			processedStreamsMu.Unlock()
			wp.Submit(func() {
				result := fetchStreamStateSummaryOnNodes(ctx, stream, riverChain, clients)

				d, err := json.MarshalIndent(result, "", "  ")
				if err != nil {
					panic(err)
				}
				d = append(d, '\n')

				var outputFile *os.File
				switch result.Status {
				case "OK":
					outputFile = okOutputFile
				case "NOTICE":
					outputFile = noticeOutputFile
				case "WARN":
					outputFile = warnOutputFile
				case "ERROR":
					outputFile = errorOutputFile
				}

				outputFileMu.Lock()
				_, _ = outputFile.Write(d)
				outputFileMu.Unlock()

				processedStreamsMu.Lock()
				processedStreams[stream.StreamId()] = &result
				processedStreamsMu.Unlock()
			})
		} else {
			processedStreamsMu.Unlock()
		}
		return true
	}); err != nil {
		return err
	}

	wp.StopWait()

	processedStreamsMu.Lock()
	fmt.Printf("Expected %d streams, actually processed %d streams on block %d\n",
		expStreamCount, len(processedStreams), riverChain.InitialBlockNum)
	processedStreamsMu.Unlock()

	return nil
}

func fetchStreamStateSummaryOnNodes(
	ctx context.Context,
	stream *river.StreamWithId,
	riverChain *crypto.Blockchain,
	clients map[common.Address]*Client,
) streamState {
	streamID := stream.StreamId()
	result := streamState{
		StreamID:                  streamID,
		RiverBlock:                riverChain.InitialBlockNum,
		RegistryLastMiniblockNum:  stream.LastMbNum(),
		RegistryLastMiniblockHash: stream.LastMbHash(),
		When:                      time.Now(),
		Nodes:                     make(map[common.Address]*nodeStreamState),
		Status:                    "OK",
	}

	for _, n := range stream.Nodes() {
		client, found := clients[n]
		if !found {
			result.Nodes[n] = &nodeStreamState{Err: fmt.Sprintf("no client for node %s", n)}
			continue
		}

		req := connect.NewRequest(&protocol.GetLastMiniblockHashRequest{StreamId: streamID[:]})
		req.Header().Set(headers.RiverNoForwardHeader, headers.RiverHeaderTrueValue)
		req.Header().Set(headers.RiverAllowNoQuorumHeader, headers.RiverHeaderTrueValue)

		if err := client.sem.Acquire(ctx, 1); err != nil {
			panic(err)
		}
		resp, err := client.client.GetLastMiniblockHash(ctx, req)
		client.sem.Release(1)

		if err != nil {
			result.Nodes[n] = &nodeStreamState{Err: fmt.Sprintf("unable to retrieve last miniblock: %s", err)}
			continue
		}

		result.Nodes[n] = &nodeStreamState{
			LastMiniblockNum:  resp.Msg.MiniblockNum,
			LastMiniblockHash: common.BytesToHash(resp.Msg.Hash),
		}
	}

	var (
		miniblockNums = map[int64]struct{}{
			result.RegistryLastMiniblockNum: {},
		}
		miniblockHashes = map[common.Hash]struct{}{
			result.RegistryLastMiniblockHash: {},
		}
		highestNodeMiniblock = int64(-1)
	)

	for _, nodeResult := range result.Nodes {
		miniblockNums[nodeResult.LastMiniblockNum] = struct{}{}
		miniblockHashes[nodeResult.LastMiniblockHash] = struct{}{}
		highestNodeMiniblock = max(nodeResult.LastMiniblockNum, highestNodeMiniblock)
		if len(nodeResult.Err) > 0 {
			result.Status = "ERROR"
		} else if result.Status == "OK" && (len(result.Nodes) != len(stream.Nodes()) || len(miniblockNums) != 1 || len(miniblockHashes) != 1) {
			// if all nodes are on the same miniblock and the registry is lagging, this is a migrated stream
			// and didn't see a new miniblock after migration. This is ok and will be fixed in the node.
			allMatch := true
			foundNum := int64(-1)
			var foundHash common.Hash
			for _, check := range result.Nodes {
				if foundNum == -1 {
					foundNum = check.LastMiniblockNum
					foundHash = check.LastMiniblockHash
				} else {
					allMatch = allMatch &&
						check.LastMiniblockNum == foundNum &&
						check.LastMiniblockHash == foundHash
				}
			}

			if len(miniblockNums) == 2 && allMatch && foundNum > result.RegistryLastMiniblockNum {
				result.Status = "NOTICE"
			} else {
				result.Status = "WARN"
			}
		}
	}

	if result.RegistryLastMiniblockNum > highestNodeMiniblock {
		result.Status = "ERROR"
	}

	return result
}

func runStreamOutOfSyncCmd(ctx context.Context, cfg *config.Config, args []string) error {
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	outputFile, err := os.Create(args[0])
	if err != nil {
		return err
	}
	defer outputFile.Close()

	skippedFile, err := os.Create(args[0] + ".skipped")
	if err != nil {
		return err
	}
	defer skippedFile.Close()

	output := json.NewEncoder(outputFile)
	skippedOutput := json.NewEncoder(skippedFile)

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
		nodeWorkerPools[node.NodeAddress] = workerpool.New(5)
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

	targetReplicationFactor := int(onChainConfig.Get().ReplicationFactor)

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

	type skippedStream struct {
		StreamID                  StreamId `json:"streamId"`
		NodeCount                 int      `json:"nodeCount"`
		ExpectedReplicationFactor int      `json:"expectedReplicationFactor"`
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
				_ = skippedOutput.Encode(&skippedStream{
					StreamID:                  stream.Id,
					NodeCount:                 len(stream.Nodes()),
					ExpectedReplicationFactor: targetReplicationFactor,
				})
				return true
			}

			var (
				mu           = new(sync.Mutex)
				nodeStatuses []*nodeStatus
			)

			// request latest miniblock hash from each node and compare them.
			for _, nodeAddress := range stream.Nodes() {
				pool, poolOK := nodeWorkerPools[nodeAddress]
				if !poolOK {
					ns := &nodeStatus{NodeAddress: nodeAddress, Error: fmt.Sprintf("node %s not found", nodeAddress)}

					mu.Lock()
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
					mu.Unlock()
				} else {
					pool.Submit(func() {
						var ns *nodeStatus

						streamServiceClient, err := nodeRegistry.GetStreamServiceClientForAddress(nodeAddress)
						if err != nil {
							ns = &nodeStatus{NodeAddress: nodeAddress, Error: fmt.Sprintf("client error: %s", err)}
						} else {
							request := connect.NewRequest(&protocol.GetLastMiniblockHashRequest{StreamId: stream.Id[:]})
							request.Header().Set(headers.RiverNoForwardHeader, headers.RiverHeaderTrueValue)
							request.Header().Set(headers.RiverAllowNoQuorumHeader, headers.RiverHeaderTrueValue)

							if resp, err := streamServiceClient.GetLastMiniblockHash(ctx, request); err == nil {
								ns = &nodeStatus{
									NodeAddress:   nodeAddress,
									MiniblockNum:  resp.Msg.MiniblockNum,
									MiniblockHash: common.BytesToHash(resp.Msg.Hash),
								}
							} else {
								ns = &nodeStatus{NodeAddress: nodeAddress, Error: err.Error()}
							}
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
			}

			return true
		},
	)

	if forAllStreamsErr != nil {
		return forAllStreamsErr
	}

	done := make(chan struct{})
	go func() {
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
		Short: "Get Miniblock <stream-id> <miniblockNum> [range]",
		Long: `Dump miniblock content to stdout.
range is optional and specifies the number of miniblocks to print (default=1).
For example, range=5 will print miniblocks from miniblockNum to miniblockNum+4.`,
		Args: cobra.RangeArgs(2, 3),
		RunE: runStreamGetMiniblockNumCmd,
	}

	cmdStreamDump := &cobra.Command{
		Use:   "dump",
		Short: "Dump stream contents <stream-id> [max-block-range] [node-address]",
		Long: `Dump stream content to stdout.
max-block-range is optional and limits the number of blocks to consider (default=100)`,
		Args: cobra.RangeArgs(1, 3),
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
		Use:   "user <user-address>",
		Short: "Get user stream ids",
		Long:  `Print 4 stream ids for the given user`,
		Args:  cobra.ExactArgs(1),
		RunE:  runStreamUserCmd,
	}
	cmdStreamUser.Flags().Bool("contract", false, "Treat input as a wallet address and find the corresponding root key")

	cmdStreamValidate := &cobra.Command{
		Use:   "validate <stream-id>",
		Short: "Validate stream contents",
		Long:  `Validate stream content by loading all miniblocks and checking for duplicate events.`,
		Args:  cobra.ExactArgs(1),
		RunE:  runStreamValidateCmd,
	}
	cmdStreamValidate.Flags().String("node", "", "Optional node address to fetch stream from")
	cmdStreamValidate.Flags().Duration("timeout", 30*time.Second, "Timeout for running the command")
	cmdStreamValidate.Flags().Int("page-size", 1000, "Number of miniblocks to fetch per page")

	cmdStreamCompareMiniblockChain := &cobra.Command{
		Use:   "compare-miniblock-chain <stream-id>",
		Short: "Compare miniblock chains",
		Long:  `Compare miniblock chain by loading all miniblocks and comparing them between nodes.`,
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			return runStreamCompareMiniblockChainCmd(cmd.Context(), cmdConfig, args)
		},
	}

	cmdStreamOutOfSync := &cobra.Command{
		Use:   "out-of-sync <output-file>",
		Short: "Find out-of-sync streams",
		Long:  `Find out-of-sync streams by loading all miniblocks and comparing them between nodes.`,
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			return runStreamOutOfSyncCmd(cmd.Context(), cmdConfig, args)
		},
	}

	cmdStreamCheckStreamState := &cobra.Command{
		Use:   "check <output-dir>",
		Short: "Check stream state consistency over nodes",
		Long:  `Check stream state consistency over nodes by comparing the stream state on each node.`,
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			return runStreamCheckStateCmd(cmd, cmdConfig, args)
		},
	}

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
	cmdStream.AddCommand(cmdStreamCheckStreamState)

	rootCmd.AddCommand(cmdStream)
}
