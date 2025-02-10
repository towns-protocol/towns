package events

import (
	"context"
	"slices"
	"time"

	"connectrpc.com/connect"

	"github.com/towns-protocol/towns/core/contracts/river"
	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/registries"
	"github.com/towns-protocol/towns/core/node/storage"
)

func (s *StreamCache) onStreamCreated(
	ctx context.Context,
	event *river.StreamCreated,
	blockNum crypto.BlockNumber,
) {
	if !slices.Contains(event.Stream.Nodes, s.params.Wallet.Address) {
		return
	}

	stream := &Stream{
		params:              s.params,
		streamId:            event.GetStreamId(),
		lastAppliedBlockNum: blockNum,
		lastAccessedTime:    time.Now(),
		local:               &localStreamState{},
	}
	stream.nodesLocked.Reset(event.Stream.Nodes, s.params.Wallet.Address)

	go func() {
		if err := s.normalizeEphemeralStream(
			ctx,
			stream,
			int64(event.Stream.LastMiniblockNum),
			event.Stream.Flags&uint64(registries.StreamFlagSealed) != 0,
		); err != nil {
			logging.FromCtx(ctx).Errorw("Failed to normalize ephemeral stream", "err", err, "streamId", event.GetStreamId())
		}

		// Cache the stream
		stream.mu.Lock()
		s.cache.Store(stream.streamId, stream)
		stream.mu.Unlock()
	}()
}

// normalizeEphemeralStream normalizes the ephemeral stream.
// Loads the missing miniblocks from the sticky peers and writes them to the storage.
// Seals the stream if it is ephemeral and all miniblocks are loaded.
func (s *StreamCache) normalizeEphemeralStream(
	ctx context.Context,
	stream *Stream,
	lastMiniblockNum int64,
	isSealed bool,
) error {
	if !isSealed {
		// Stream is not sealed, no need to normalize it yet.
		return nil
	}

	missingMbs := make([]int64, 0, lastMiniblockNum+1)

	// Check if the given stream is already sealed, if so, ignore the event.
	ephemeral, err := s.params.Storage.IsStreamEphemeral(ctx, stream.streamId)
	if err != nil {
		if !IsRiverErrorCode(err, Err_NOT_FOUND) {
			return err
		}

		// Stream does not exist in the storage - the entire stream is missing.
		for i := int64(0); i <= lastMiniblockNum; i++ {
			missingMbs = append(missingMbs, i)
		}
	} else if !ephemeral {
		// Stream exists in the storage and sealed already.
		return nil
	} else {
		// Stream exists in the storage, but not sealed yet, i.e. ephemeral.

		// Get existing miniblock numbers.
		existingMbs, err := s.params.Storage.ReadEphemeralMiniblockNums(ctx, stream.streamId)
		if err != nil {
			return err
		}

		existingMbsMap := make(map[int64]struct{}, len(existingMbs))
		for _, num := range existingMbs {
			existingMbsMap[int64(num)] = struct{}{}
		}

		for num := int64(0); num <= lastMiniblockNum; num++ {
			if _, exists := existingMbsMap[num]; !exists {
				missingMbs = append(missingMbs, num)
			}
		}
	}

	// Fill missing miniblocks
	if len(missingMbs) > 0 {
		remotes, _ := stream.GetRemotesAndIsLocal()
		currentStickyPeer := stream.GetStickyPeer()
		for range len(remotes) {
			stub, err := s.params.NodeRegistry.GetNodeToNodeClientForAddress(currentStickyPeer)
			if err != nil {
				logging.FromCtx(ctx).Errorw("Failed to get node to node client", "err", err, "streamId", stream.streamId)
				currentStickyPeer = stream.AdvanceStickyPeer(currentStickyPeer)
				continue
			}

			resp, err := stub.GetMiniblocksByIds(ctx, connect.NewRequest[GetMiniblocksByIdsRequest](
				&GetMiniblocksByIdsRequest{
					StreamId:     stream.streamId[:],
					MiniblockIds: missingMbs,
				},
			))
			if err != nil {
				logging.FromCtx(ctx).Errorw("Failed to get miniblocks from sticky peer", "err", err, "streamId", stream.streamId)
				currentStickyPeer = stream.AdvanceStickyPeer(currentStickyPeer)
				continue
			}

			// Start processing miniblocks from the stream.
			// If the processing breaks in the middle, the rest of missing miniblocks will be fetched from the next sticky peer.
			var toNextPeer bool
			for resp.Receive() {
				mbInfo, err := NewMiniblockInfoFromProto(resp.Msg().GetMiniblock(), NewParsedMiniblockInfoOpts())
				if err != nil {
					logging.FromCtx(ctx).Errorw("Failed to parse miniblock info", "err", err, "streamId", stream.streamId)
					_ = resp.Close()
					toNextPeer = true
					break
				}

				mbBytes, err := mbInfo.ToBytes()
				if err != nil {
					logging.FromCtx(ctx).Errorw("Failed to serialize miniblock", "err", err, "streamId", stream.streamId)
					_ = resp.Close()
					toNextPeer = true
					break
				}

				if err = s.params.Storage.WriteEphemeralMiniblock(ctx, stream.streamId, &storage.WriteMiniblockData{
					Number:   mbInfo.Ref.Num,
					Hash:     mbInfo.Ref.Hash,
					Snapshot: mbInfo.IsSnapshot(),
					Data:     mbBytes,
				}); err != nil {
					logging.FromCtx(ctx).Errorw("Failed to write miniblock to storage", "err", err, "streamId", stream.streamId)
					_ = resp.Close()
					toNextPeer = true
					break
				}

				// Delete the processed miniblock from the missingMbs slice
				i := 0
				mbNum := resp.Msg().GetNum()
				for _, v := range missingMbs {
					if v != mbNum {
						missingMbs[i] = v
						i++
					}
				}
				missingMbs = missingMbs[:i]

				// No missing miniblocks left, just return.
				if len(missingMbs) == 0 {
					_ = resp.Close()
					return nil
				}
			}

			if toNextPeer {
				currentStickyPeer = stream.AdvanceStickyPeer(currentStickyPeer)
				continue
			}

			// There are still missing miniblocks and something went wrong with the receiving miniblocks from the
			// current sticky peer. Try the next sticky peer for the rest of missing miniblocks.
			if err = resp.Err(); err != nil {
				logging.FromCtx(ctx).Errorw("Failed to get miniblocks from sticky peer", "err", err, "streamId", stream.streamId)
				currentStickyPeer = stream.AdvanceStickyPeer(currentStickyPeer)
				continue
			}
		}
	}

	if len(missingMbs) > 0 {
		return RiverError(Err_INTERNAL, "Failed to reconcile ephemeral stream", "missingMbs", missingMbs).
			Func("reconcileEphemeralStream")
	}

	// Stream is ready to be normalized
	_, err = s.params.Storage.NormalizeEphemeralStream(ctx, stream.streamId)
	return err
}
