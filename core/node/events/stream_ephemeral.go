package events

import (
	"context"
	"slices"
	"time"

	"github.com/towns-protocol/towns/core/blockchain"
	"github.com/towns-protocol/towns/core/contracts/river"
	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
)

// TODO: FIX: move to correct file
func (s *StreamCache) onStreamCreated(
	ctx context.Context,
	event *river.StreamState,
	blockNum blockchain.BlockNumber,
) {
	if !slices.Contains(event.Stream.Nodes(), s.params.Wallet.Address) {
		return
	}

	stream := &Stream{
		params:              s.params,
		streamId:            event.GetStreamId(),
		lastAppliedBlockNum: blockNum,
		lastAccessedTime:    time.Now(),
		local:               &localStreamState{},
	}
	stream.nodesLocked.ResetFromStreamWithId(event.Stream, s.params.Wallet.Address)

	go func() {
		if err := s.normalizeEphemeralStream(
			ctx,
			stream,
			event.Stream.LastMbNum(),
			event.Stream.IsSealed(),
		); err != nil {
			logging.FromCtx(ctx).
				Errorw("Failed to normalize ephemeral stream", "error", err, "streamId", event.GetStreamId())
		}

		// Cache the stream
		s.cache.Store(stream.streamId, stream)
	}()
}

// TODO: FIX: move to correct file
func (s *StreamCache) onStreamPlacementUpdated(
	ctx context.Context,
	event *river.StreamState,
	blockNum blockchain.BlockNumber,
) {
	participatingInStream := slices.Contains(event.Stream.Nodes(), s.params.Wallet.Address)
	if !participatingInStream {
		if stream, ok := s.cache.Load(event.GetStreamId()); ok {
			stream.mu.Lock()
			stream.nodesLocked.ResetFromStreamWithId(event.Stream, s.params.Wallet.Address)
			stream.local = nil
			stream.mu.Unlock()
		}

		// DB for stream that are not placed on this node anymore are deleted on node boot
		// This prevents running potential long DB operations on the main event processing loop.
		return
	}

	// If in cache, load existing, otherwise insert new record in the correct state.
	stream, loaded := s.cache.LoadOrCompute(
		event.GetStreamId(),
		func() (newValue *Stream, cancel bool) {
			s := &Stream{
				streamId:            event.GetStreamId(),
				lastAppliedBlockNum: blockNum,
				params:              s.params,
				local:               &localStreamState{},
			}
			s.nodesLocked.ResetFromStreamWithId(event.Stream, s.params.Wallet.Address)
			return s, false
		},
	)

	if loaded {
		stream.mu.Lock()
		// TODO: REPLICATION: FIX: what to do with lastAppliedBlockNum
		stream.nodesLocked.ResetFromStreamWithId(event.Stream, s.params.Wallet.Address)
		if stream.local == nil {
			stream.local = &localStreamState{}
		}
		stream.mu.Unlock()
	}

	// Check if this is the start of replication process for previously unreplicated stream.
	if event.Stream.Stream.ReplicationFactor() == 1 && len(event.Stream.Stream.Nodes) > 1 &&
		event.Stream.Stream.Nodes[0] == s.params.Wallet.Address {
		go s.writeLatestMbToBlockchain(ctx, stream)
	} else {
		// Always submit a reconciliation task, since this only happens on stream placement updates it happens
		// rarely. If local node was in quorum, it should be up-to-date making this a no-op task.
		s.SubmitReconcileStreamTask(stream, event.Stream)
	}
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
	peersLoop:
		for range len(remotes) {
			resp, err := s.params.RemoteMiniblockProvider.GetMiniblocksByIds(
				ctx,
				currentStickyPeer,
				&GetMiniblocksByIdsRequest{
					StreamId:     stream.streamId[:],
					MiniblockIds: missingMbs,
				},
			)
			if err != nil {
				logging.FromCtx(ctx).
					Errorw("Failed to get miniblocks from sticky peer", "error", err, "streamId", stream.streamId)
				currentStickyPeer = stream.AdvanceStickyPeer(currentStickyPeer)
				continue
			}

			// Start processing miniblocks from the stream.
			// If the processing breaks in the middle, the rest of missing miniblocks will be fetched from the next
			// sticky peer.
			var toNextPeer bool
			var allFetched bool
			for resp.Receive() {
				msg := resp.Msg()
				if msg == nil || msg.GetMiniblock() == nil {
					_ = resp.Close()
					toNextPeer = len(missingMbs) > 0
					break
				}

				mbInfo, err := NewMiniblockInfoFromProto(
					msg.GetMiniblock(), msg.GetSnapshot(),
					NewParsedMiniblockInfoOpts(),
				)
				if err != nil {
					logging.FromCtx(ctx).
						Errorw("Failed to parse miniblock info", "error", err, "streamId", stream.streamId)
					_ = resp.Close()
					toNextPeer = true
					break
				}

				storageMb, err := mbInfo.AsStorageMb()
				if err != nil {
					logging.FromCtx(ctx).
						Errorw("Failed to serialize miniblock", "error", err, "streamId", stream.streamId)
					_ = resp.Close()
					toNextPeer = true
					break
				}

				if err = s.params.Storage.WriteEphemeralMiniblock(ctx, stream.streamId, storageMb); err != nil {
					logging.FromCtx(ctx).
						Errorw("Failed to write miniblock to storage", "error", err, "streamId", stream.streamId)
					_ = resp.Close()
					toNextPeer = true
					break
				}

				// Delete the processed miniblock from the missingMbs slice
				i := 0
				mbNum := msg.GetNum()
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
					allFetched = true
					break
				}
			}
			if allFetched {
				break peersLoop
			}

			if toNextPeer {
				currentStickyPeer = stream.AdvanceStickyPeer(currentStickyPeer)
				continue
			}

			// There are still missing miniblocks and something went wrong with the receiving miniblocks from the
			// current sticky peer. Try the next sticky peer for the rest of missing miniblocks.
			if err = resp.Err(); err != nil {
				logging.FromCtx(ctx).
					Errorw("Failed to get miniblocks from sticky peer", "error", err, "streamId", stream.streamId)
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
