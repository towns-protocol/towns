package rpc

import (
	. "casablanca/node/events"
	. "casablanca/node/protocol"
	. "casablanca/node/protocol/protocolconnect"
	"context"

	"github.com/bufbuild/connect-go"
)

type remoteStream struct {
	streamID string
	stub     StreamServiceClient
}

var _ Stream = (*remoteStream)(nil)

func (s *Service) loadStream(ctx context.Context, streamID string) (Stream, StreamView, error) {
	nodes, err := s.streamRegistry.GetNodeAddressesForStream(ctx, streamID)
	if err != nil {
		return nil, nil, err
	}

	targetNode := nodes[0]
	stub, err := s.nodeRegistry.GetRemoteStubForAddress(targetNode)
	if err != nil {
		return nil, nil, err
	}

	if stub == nil {
		// Local node.
		return s.cache.GetStream(ctx, streamID)
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

func (s *remoteStream) GetMiniblocks(ctx context.Context, fromInclusive int64, toExclusive int64) ([]*Miniblock, bool, error) {
	res, err := s.stub.GetMiniblocks(ctx, connect.NewRequest(&GetMiniblocksRequest{
		StreamId:      s.streamID,
		FromInclusive: fromInclusive,
		ToExclusive:   toExclusive,
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
