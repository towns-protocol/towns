package cmd

import (
	"context"
	"fmt"
	"math/big"
	"strconv"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/common"
	"github.com/spf13/cobra"

	"github.com/towns-protocol/towns/core/contracts/river"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/registries"
	"github.com/towns-protocol/towns/core/node/shared"
)

type intervalTracker struct {
	blockchain        *crypto.Blockchain
	miniblockInterval uint64
	lastInterval      uint64
	miniblocksInRange map[byte]int
	allStreamTypes    []byte
}

func newIntervalTracker(blockchain *crypto.Blockchain, miniblockInterval uint64) *intervalTracker {
	return &intervalTracker{
		blockchain:        blockchain,
		miniblockInterval: miniblockInterval,
		lastInterval:      0,
		miniblocksInRange: make(map[byte]int),
		allStreamTypes: []byte{
			shared.STREAM_CHANNEL_BIN, shared.STREAM_DM_CHANNEL_BIN, shared.STREAM_GDM_CHANNEL_BIN,
			shared.STREAM_MEDIA_BIN, shared.STREAM_METADATA_BIN, shared.STREAM_SPACE_BIN,
			shared.STREAM_USER_METADATA_KEY_BIN, shared.STREAM_USER_INBOX_BIN, shared.STREAM_USER_BIN,
			shared.STREAM_USER_SETTINGS_BIN,
		},
	}
}

func (t *intervalTracker) printHeader() {
	fmt.Printf("riverBlockNum,riverBlockCreated")
	for _, streamType := range t.allStreamTypes {
		fmt.Printf(",%s", shared.StreamTypeToString(streamType))
	}
	fmt.Printf("\n")
}

func (t *intervalTracker) flushInterval(ctx context.Context) error {
	if t.lastInterval == 0 {
		return nil
	}
	offset := t.lastInterval * t.miniblockInterval
	header, err := t.blockchain.Client.HeaderByNumber(ctx, new(big.Int).SetUint64(offset))
	if err != nil {
		return err
	}
	fmt.Printf("%d,%d", offset, header.Time)
	for _, streamType := range t.allStreamTypes {
		fmt.Printf(",%d", t.miniblocksInRange[streamType])
	}
	fmt.Printf("\n")
	return nil
}

func (t *intervalTracker) record(
	ctx context.Context,
	blockNumber uint64,
	streamID shared.StreamId,
	miniblockCount int,
) error {
	interval := blockNumber / t.miniblockInterval

	if interval != t.lastInterval {
		if err := t.flushInterval(ctx); err != nil {
			return err
		}
		t.lastInterval = interval
		t.miniblocksInRange = make(map[byte]int)
	}

	t.miniblocksInRange[streamID.Type()] += miniblockCount
	return nil
}

func runMiniblockProductionRateCmd(cmd *cobra.Command, args []string) error {
	ctx := cmd.Context()

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

	defer blockchain.Close()

	miniblockInterval, err := strconv.ParseUint(args[0], 10, 64)
	if err != nil {
		return fmt.Errorf("invalid miniblock interval value: %s", args[1])
	}

	start, err := strconv.ParseUint(args[1], 10, 64)
	if err != nil {
		return fmt.Errorf("invalid start value: %s", args[1])
	}

	var last uint64
	if len(args) > 2 {
		last, err = strconv.ParseUint(args[2], 10, 64)
		if err != nil {
			return fmt.Errorf("invalid last value: %s", args[2])
		}
	} else {
		last = blockchain.InitialBlockNum.AsUint64()
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

	const blockRange = uint64(3000)
	tracker := newIntervalTracker(blockchain, miniblockInterval)
	tracker.printHeader()

	for batchStart := start; batchStart < last; batchStart += blockRange {
		batchEnd := batchStart + blockRange - 1
		if batchEnd > last {
			batchEnd = last
		}

		logs, err := blockchain.Client.FilterLogs(ctx, ethereum.FilterQuery{
			FromBlock: new(big.Int).SetUint64(batchStart),
			ToBlock:   new(big.Int).SetUint64(batchEnd),
			Addresses: registryContract.Addresses,
			Topics:    [][]common.Hash{{registryContract.StreamUpdatedEventTopic}},
		})
		if err != nil {
			return fmt.Errorf("failed to filter logs for blocks %d-%d: %w", batchStart, batchEnd, err)
		}

		for _, log := range logs {
			if len(log.Topics) == 0 || log.Topics[0] != registryContract.StreamUpdatedEventTopic {
				continue
			}

			streamUpdate, err := river.StreamRegistry.UnpackStreamUpdatedEvent(&log)
			if err != nil {
				return fmt.Errorf("failed to unpack stream updated event: %w", err)
			}

			events, err := river.ParseStreamUpdatedEvent(streamUpdate)
			if err != nil {
				return fmt.Errorf("failed to parse stream updated event: %w", err)
			}

			for _, event := range events {
				var streamID shared.StreamId
				var miniblockCount int

				switch e := event.(type) {
				case *river.StreamState:
					if e.Reason() != river.StreamUpdatedEventTypeCreate &&
						e.Reason() != river.StreamUpdatedEventTypeAllocate {
						continue
					}
					streamID = e.GetStreamId()
					if streamID.Type() == shared.STREAM_MEDIA_BIN {
						miniblockCount = int(e.Stream.LastMbNum()) + 1
					} else {
						miniblockCount = 1
					}
				case *river.StreamMiniblockUpdate:
					streamID = e.GetStreamId()
					if streamID.Type() == shared.STREAM_MEDIA_BIN {
						miniblockCount = int(e.LastMiniblockNum) + 1
					} else {
						miniblockCount = 1
					}
				default:
					continue
				}

				if err := tracker.record(ctx, log.BlockNumber, streamID, miniblockCount); err != nil {
					return err
				}
			}
		}
	}

	if err := tracker.flushInterval(ctx); err != nil {
		return err
	}

	return nil
}

func init() {
	cmdMiniblock := &cobra.Command{
		Use:   "miniblock",
		Short: "Access miniblock data",
	}

	cmdMiniblockProductionRate := &cobra.Command{
		Use:   "production-rate <group-miniblock-count> <start-miniblock-num> [end-miniblock-num]",
		Short: "Miniblock production per time interval",
		Long: `Dump miniblock production rate over a number of miniblocks (30->1minute).
If end isn't given the latest miniblock is used.'

Example:
	production-rate 30 12000 12500
`,
		Args: cobra.RangeArgs(2, 3),
		RunE: runMiniblockProductionRateCmd,
	}

	cmdMiniblock.AddCommand(cmdMiniblockProductionRate)

	rootCmd.AddCommand(cmdMiniblock)
}
