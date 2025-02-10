package rpc

import (
	"context"
	"time"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"
	"google.golang.org/protobuf/proto"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/nodes"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
)

func contextDeadlineLeft(ctx context.Context) time.Duration {
	deadline, ok := ctx.Deadline()
	if !ok {
		return -1
	}
	return time.Until(deadline)
}

func (s *Service) replicatedAddEvent(ctx context.Context, stream *Stream, event *ParsedEvent) error {
	originalDeadline := contextDeadlineLeft(ctx)

	backoff := BackoffTracker{
		NextDelay:   100 * time.Millisecond,
		MaxAttempts: 10,
		Multiplier:  2,
		Divisor:     1,
	}

	for {
		err := s.replicatedAddEventImpl(ctx, stream, event)
		if err == nil {
			if backoff.NumAttempts > 0 {
				logging.FromCtx(ctx).Warnw("replicatedAddEvent: success after backoff", "attempts", backoff.NumAttempts, "originalDeadline", originalDeadline.String(), "deadline", contextDeadlineLeft(ctx).String())
			}
			return nil
		}

		// Check if Err_MINIBLOCK_TOO_NEW or Err_BAD_PREV_MINIBLOCK_HASH code is present in the error chain.
		riverErr := AsRiverError(err)
		if riverErr.IsCodeWithBases(Err_MINIBLOCK_TOO_NEW) || riverErr.IsCodeWithBases(Err_BAD_PREV_MINIBLOCK_HASH) {
			err = backoff.Wait(ctx, err)
			if err != nil {
				logging.FromCtx(ctx).Warnw("replicatedAddEvent: no backoff left", "error", err, "attempts", backoff.NumAttempts, "originalDeadline", originalDeadline.String(), "deadline", contextDeadlineLeft(ctx).String())
				return err
			}
			logging.FromCtx(ctx).Warnw("replicatedAddEvent: retrying after backoff", "attempt", backoff.NumAttempts, "deadline", contextDeadlineLeft(ctx).String(), "originalDeadline", originalDeadline.String())
			continue
		}
		return err
	}
}

func (s *Service) replicatedAddEventImpl(ctx context.Context, stream *Stream, event *ParsedEvent) error {
	remotes, isLocal := stream.GetRemotesAndIsLocal()
	if !isLocal {
		return RiverError(Err_INTERNAL, "replicatedAddEvent: stream must be local")
	}

	if len(remotes) == 0 {
		return stream.AddEvent(ctx, event)
	}

	streamId := stream.StreamId()
	sender := NewQuorumPool("method", "replicatedAddEventImpl", "streamId", streamId)
	sender.Timeout = 2500 * time.Millisecond // TODO: REPLICATION: TEST: setting so test can have more aggressive timeout

	sender.GoLocal(ctx, func(ctx context.Context) error {
		return stream.AddEvent(ctx, event)
	})

	sender.GoRemotes(ctx, remotes, func(ctx context.Context, node common.Address) error {
		stub, err := s.nodeRegistry.GetNodeToNodeClientForAddress(node)
		if err != nil {
			return err
		}
		_, err = stub.NewEventReceived(
			ctx,
			connect.NewRequest[NewEventReceivedRequest](
				&NewEventReceivedRequest{
					StreamId: streamId[:],
					Event:    event.Envelope,
				},
			),
		)
		return err
	})

	return sender.Wait()
}

func (s *Service) replicatedAddMediaEvent(ctx context.Context, event *ParsedEvent, cc *CreationCookie, last bool) ([]byte, error) {
	originalDeadline := contextDeadlineLeft(ctx)

	backoff := BackoffTracker{
		NextDelay:   100 * time.Millisecond,
		MaxAttempts: 10,
		Multiplier:  2,
		Divisor:     1,
	}

	for {
		mbHash, err := s.replicatedAddMediaEventImpl(ctx, event, cc, last)
		if err == nil {
			if backoff.NumAttempts > 0 {
				logging.FromCtx(ctx).Warnw("replicatedAddMediaEvent: success after backoff", "attempts", backoff.NumAttempts, "originalDeadline", originalDeadline.String(), "deadline", contextDeadlineLeft(ctx).String())
			}
			return mbHash, nil
		}

		// Check if Err_MINIBLOCK_TOO_NEW code is present.
		if AsRiverError(err).IsCodeWithBases(Err_MINIBLOCK_TOO_NEW) {
			err = backoff.Wait(ctx, err)
			if err != nil {
				logging.FromCtx(ctx).Warnw("replicatedAddMediaEvent: no backoff left", "error", err, "attempts", backoff.NumAttempts, "originalDeadline", originalDeadline.String(), "deadline", contextDeadlineLeft(ctx).String())
				return nil, err
			}
			logging.FromCtx(ctx).Warnw("replicatedAddMediaEvent: retrying after backoff", "attempt", backoff.NumAttempts, "deadline", contextDeadlineLeft(ctx).String(), "originalDeadline", originalDeadline.String())
			continue
		}
		return nil, err
	}
}

func (s *Service) replicatedAddMediaEventImpl(ctx context.Context, event *ParsedEvent, cc *CreationCookie, last bool) ([]byte, error) {
	streamId, err := StreamIdFromBytes(cc.StreamId)
	if err != nil {
		return nil, err
	}

	header, err := MakeEnvelopeWithPayload(s.wallet, Make_MiniblockHeader(&MiniblockHeader{
		MiniblockNum:      cc.MiniblockNum,
		PrevMiniblockHash: cc.PrevMiniblockHash,
		Timestamp:         NextMiniblockTimestamp(nil),
		EventHashes:       [][]byte{event.Hash[:]},
	}), event.MiniblockRef)
	if err != nil {
		return nil, err
	}

	ephemeralMb := &Miniblock{
		Events: []*Envelope{event.Envelope},
		Header: header,
	}

	nodes := NewStreamNodesWithLock(cc.NodeAddresses(), s.wallet.Address)
	remotes, _ := nodes.GetRemotesAndIsLocal()
	sender := NewQuorumPool("method", "replicatedAddMediaEvent", "streamId", streamId)

	// These are needed to register the stream onchain if everything goes well.
	var genesisMiniblockHash common.Hash

	// Save the ephemeral miniblock locally
	sender.GoLocal(ctx, func(ctx context.Context) error {
		mbBytes, err := proto.Marshal(ephemeralMb)
		if err != nil {
			return err
		}

		if err = s.storage.WriteEphemeralMiniblock(ctx, streamId, &storage.WriteMiniblockData{
			Number:   cc.MiniblockNum,
			Hash:     common.BytesToHash(ephemeralMb.Header.Hash),
			Snapshot: false,
			Data:     mbBytes,
		}); err != nil {
			return err
		}

		// Return here if there are more chunks to upload.
		if !last {
			return nil
		}

		// Normalize stream locally
		genesisMiniblockHash, err = s.storage.NormalizeEphemeralStream(ctx, streamId)
		if err != nil {
			return err
		}

		return nil
	})

	// Save the ephemeral miniblock on remotes
	sender.GoRemotes(ctx, remotes, func(ctx context.Context, node common.Address) error {
		stub, err := s.nodeRegistry.GetNodeToNodeClientForAddress(node)
		if err != nil {
			return err
		}

		if _, err = stub.SaveEphemeralMiniblock(
			ctx,
			connect.NewRequest[SaveEphemeralMiniblockRequest](
				&SaveEphemeralMiniblockRequest{
					StreamId:  streamId[:],
					Miniblock: ephemeralMb,
				},
			),
		); err != nil {
			return err
		}

		// Return here if there are more chunks to upload.
		if !last {
			return nil
		}

		// Seal ephemeral stream in remotes
		if _, err = stub.SealEphemeralStream(
			ctx,
			connect.NewRequest[SealEphemeralStreamRequest](
				&SealEphemeralStreamRequest{
					StreamId: streamId[:],
				},
			),
		); err != nil {
			return err
		}

		return nil
	})

	if err = sender.Wait(); err != nil {
		return nil, err
	}

	if last {
		// Register the given stream onchain with sealed flag
		if err = s.streamRegistry.AddStream(
			ctx,
			streamId,
			cc.NodeAddresses(),
			genesisMiniblockHash,
			common.BytesToHash(ephemeralMb.Header.Hash),
			cc.MiniblockNum,
			true,
		); err != nil {
			return nil, err
		}
	}

	return ephemeralMb.Header.Hash, nil
}
