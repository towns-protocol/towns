package rpc

import (
	"context"

	. "github.com/river-build/river/events"
	. "github.com/river-build/river/protocol"
	. "github.com/river-build/river/protocol/protocolconnect"

	"connectrpc.com/connect"
)

type remoteStream struct {
	streamID string
	stub     StreamServiceClient
}

var _ Stream = (*remoteStream)(nil)

func (s *Service) loadStream(ctx context.Context, streamId string) (Stream, StreamView, error) {
	nodes, _, err := s.streamRegistry.GetStreamInfo(ctx, streamId)
	if err != nil {
		return nil, nil, err
	}

	if nodes.IsLocal() {
		return s.cache.GetStream(ctx, streamId)
	}

	targetNode := nodes.GetRemotes()[0]
	stub, err := s.nodeRegistry.GetStreamServiceClientForAddress(targetNode)
	if err != nil {
		return nil, nil, err
	}

	resp, err := stub.GetStream(ctx, connect.NewRequest(&GetStreamRequest{
		StreamId: streamId,
	}))
	if err != nil {
		return nil, nil, err
	}

	streamView, err := MakeRemoteStreamView(resp.Msg)
	if err != nil {
		return nil, nil, err
	}

	return &remoteStream{
		streamID: streamId,
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
