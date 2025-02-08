package rpc

import (
	"context"
	"time"

	"github.com/ethereum/go-ethereum/common"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"

	"connectrpc.com/connect"
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

		// Check if Err_MINIBLOCK_TOO_NEW code is present.
		if AsRiverError(err).IsCodeWithBases(Err_MINIBLOCK_TOO_NEW) {
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
	sender := NewQuorumPool("method", "replicatedStream.AddEvent", "streamId", streamId)
	sender.Timeout = 2500 * time.Millisecond // TODO: REPLICATION: TEST: setting so test can have more aggressive timeout

	sender.GoLocal(ctx, func(ctx context.Context) error {
		return stream.AddEvent(ctx, event)
	})

	if len(remotes) > 0 {
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
	}

	return sender.Wait()
}
