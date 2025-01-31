package rpc

import (
	"context"

	"github.com/ethereum/go-ethereum/common"

	. "github.com/river-build/river/core/node/base"
	. "github.com/river-build/river/core/node/events"
	. "github.com/river-build/river/core/node/protocol"

	"connectrpc.com/connect"
)

func (s *Service) replicatedAddEvent(ctx context.Context, stream *Stream, event *ParsedEvent) error {
	remotes, isLocal := stream.GetRemotesAndIsLocal()
	if !isLocal {
		return RiverError(Err_INTERNAL, "replicatedAddEvent: stream must be local")
	}

	if len(remotes) == 0 {
		return stream.AddEvent(ctx, event)
	}

	streamId := stream.StreamId()
	sender := NewQuorumPool("method", "replicatedStream.AddEvent", "streamId", streamId)

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
