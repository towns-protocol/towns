package rpc

import (
	"context"

	"github.com/ethereum/go-ethereum/common"
	. "github.com/river-build/river/core/node/events"
	. "github.com/river-build/river/core/node/nodes"
	. "github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/shared"

	"connectrpc.com/connect"
)

type replicatedStream struct {
	streamId    string
	localStream AddableStream
	nodes       StreamNodes
	service     *Service
}

var _ AddableStream = (*replicatedStream)(nil)

func (r *replicatedStream) AddEvent(ctx context.Context, event *ParsedEvent) error {
	numRemotes := r.nodes.NumRemotes()
	// TODO: remove
	if numRemotes == 0 {
		return r.localStream.AddEvent(ctx, event)
	}

	sender := newQuorumPool(numRemotes)

	sender.GoLocal(func() error {
		return r.localStream.AddEvent(ctx, event)
	})

	if numRemotes > 0 {
		streamId, err := shared.StreamIdFromString(r.streamId)
		if err != nil {
			return err
		}
		for _, n := range r.nodes.GetRemotes() {
			sender.GoRemote(
				n,
				func(node common.Address) error {
					stub, err := r.service.nodeRegistry.GetNodeToNodeClientForAddress(node)
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
				},
			)
		}
	}

	return sender.Wait()
}
