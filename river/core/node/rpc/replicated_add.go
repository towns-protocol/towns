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
	remotes, _ := r.nodes.GetRemotesAndIsLocal()
	// TODO: remove
	if len(remotes) == 0 {
		return r.localStream.AddEvent(ctx, event)
	}

	sender := NewQuorumPool(len(remotes))

	sender.GoLocal(func() error {
		return r.localStream.AddEvent(ctx, event)
	})

	if len(remotes) > 0 {
		streamId, err := shared.StreamIdFromString(r.streamId)
		if err != nil {
			return err
		}
		for _, n := range remotes {
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
