package rpc

import (
	"context"
	"time"

	. "github.com/river-build/river/core/node/events"
	. "github.com/river-build/river/core/node/protocol"
	. "github.com/river-build/river/core/node/protocol/protocolconnect"
	. "github.com/river-build/river/core/node/shared"

	"connectrpc.com/connect"
)

type remoteStream struct {
	streamId StreamId
	stub     StreamServiceClient
	view     *StreamView
}

var _ ViewStream = (*remoteStream)(nil)

func (s *Service) loadStream(ctx context.Context, streamId StreamId) (ViewStream, error) {
	stream, err := s.cache.GetStreamNoWait(ctx, streamId)
	if err != nil {
		return nil, err
	}

	if stream.IsLocal() {
		return stream, nil
	}

	// TODO: REPLICATION: retries here
	targetNode := stream.GetStickyPeer()
	stub, err := s.nodeRegistry.GetStreamServiceClientForAddress(targetNode)
	if err != nil {
		return nil, err
	}

	resp, err := stub.GetStream(ctx, connect.NewRequest(&GetStreamRequest{
		StreamId: streamId[:],
	}))
	if err != nil {
		return nil, err
	}

	streamView, err := MakeRemoteStreamView(ctx, resp.Msg.GetStream())
	if err != nil {
		return nil, err
	}

	return &remoteStream{
		streamId: streamId,
		stub:     stub,
		view:     streamView,
	}, nil
}

// We never scrub remote streams
func (s *remoteStream) LastScrubbedTime() time.Time    { return time.Time{} }
func (s *remoteStream) MarkScrubbed(_ context.Context) {}

func (s *remoteStream) GetMiniblocks(
	ctx context.Context,
	fromInclusive int64,
	toExclusive int64,
) ([]*Miniblock, bool, error) {
	res, err := s.stub.GetMiniblocks(ctx, connect.NewRequest(&GetMiniblocksRequest{
		StreamId:      s.streamId[:],
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
		StreamId: s.streamId[:],
		Event:    event.Envelope,
	}

	_, err := s.stub.AddEvent(ctx, connect.NewRequest(req))
	if err != nil {
		return err
	}

	return nil
}

func (s *remoteStream) GetView(ctx context.Context) (*StreamView, error) {
	return s.view, nil
}

func (s *remoteStream) GetViewIfLocal(ctx context.Context) (*StreamView, error) {
	return nil, nil
}
