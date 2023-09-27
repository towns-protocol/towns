package rpc

import (
	. "casablanca/node/events"
	. "casablanca/node/nodes"
	. "casablanca/node/protocol"
	"context"

	"github.com/bufbuild/connect-go"
)

type remoteStream struct {
	streamID string
	stub     StreamService
}

var _ Stream = (*remoteStream)(nil)

func (s *Service) loadStream(ctx context.Context, streamID string) (Stream, StreamView, error) {
	nodes, err := s.streamRegistry.GetNodeAddressesForStream(ctx, streamID)
	if err != nil {
		return nil, nil, err
	}

	if s.nodeRegistry.ContainsLocalNode(nodes) {
		return s.cache.GetStream(ctx, streamID)
	}

	targetNode := nodes[0]
	stub, err := s.nodeRegistry.GetStubForAddress(targetNode)
	if err != nil {
		return nil, nil, err
	}

	resp, err := stub.GetStream(ctx, connect.NewRequest(&GetStreamRequest{
		StreamId: streamID,
	}))
	if err != nil {
		return nil, nil, err
	}

	streamView, err := MakeRemoteStreamView(resp.Msg)
	if err != nil {
		return nil, nil, err
	}

	return &remoteStream{
		streamID: streamID,
		stub:     stub,
	}, streamView, nil
}

func (s *remoteStream) GetMiniblocks(ctx context.Context, fromIndex int, toIndex int) ([]*Miniblock, bool, error) {
	res, err := s.stub.GetMiniblocks(ctx, connect.NewRequest(&GetMiniblocksRequest{
		StreamId:      s.streamID,
		FromInclusive: int64(fromIndex),
		ToExclusive:   int64(toIndex),
	}))
	if err != nil {
		return nil, false, err
	}

	return res.Msg.Miniblocks, res.Msg.Terminus, nil
}

func (s *remoteStream) AddEvent(ctx context.Context, event *ParsedEvent) error {
	req := &AddEventRequest{
		StreamId: s.streamID,
		Event:    event.Envelope,
	}

	_, err := s.stub.AddEvent(ctx, connect.NewRequest(req))
	if err != nil {
		return err
	}

	return nil
}
