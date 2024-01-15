package rpc

import (
	"context"

	. "github.com/river-build/river/events"
	. "github.com/river-build/river/protocol"

	"github.com/bufbuild/connect-go"
)

type replicatedStream struct {
	streamId    string
	localStream AddableStream
	remotes     []string
	service     *Service
}

var _ AddableStream = (*replicatedStream)(nil)

func (r *replicatedStream) AddEvent(ctx context.Context, event *ParsedEvent) error {
	// TODO: remove
	if len(r.remotes) == 0 {
		return r.localStream.AddEvent(ctx, event)
	}

	sender := newQuorumPool(len(r.remotes))

	sender.GoLocal(func() error {
		return r.localStream.AddEvent(ctx, event)
	})

	if len(r.remotes) > 0 {
		for _, n := range r.remotes {
			sender.GoRemote(
				n,
				func(node string) error {
					stub, err := r.service.nodeRegistry.GetNodeToNodeClientForAddress(node)
					if err != nil {
						return err
					}
					_, err = stub.NewEventReceived(
						ctx,
						connect.NewRequest[NewEventReceivedRequest](
							&NewEventReceivedRequest{
								StreamId: r.streamId,
								Event:    event.Envelope,
							},
						),
					)
					return err
				},
			)
		}
	}

	return sender.Wait()
}
