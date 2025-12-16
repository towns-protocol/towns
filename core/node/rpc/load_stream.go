package rpc

import (
	"context"
	"time"

	. "github.com/towns-protocol/towns/core/node/events"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/protocol/protocolconnect"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/utils/timing"

	"connectrpc.com/connect"
)

type remoteStream struct {
	streamId StreamId
	stub     StreamServiceClient
	view     *StreamView
}

var _ ViewStream = (*remoteStream)(nil)

func (s *Service) loadStream(ctx context.Context, streamId StreamId) (ViewStream, error) {
	ctx = timing.StartSpan(ctx, "GetStreamNoWait")
	stream, err := s.cache.GetStreamNoWait(ctx, streamId)
	ctx = timing.End(ctx, err)
	_ = ctx
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

	streamView, err := MakeRemoteStreamView(resp.Msg.GetStream())
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
) ([]*MiniblockInfo, bool, error) {
	res, err := s.stub.GetMiniblocks(ctx, connect.NewRequest(&GetMiniblocksRequest{
		StreamId:      s.streamId[:],
		FromInclusive: fromInclusive,
		ToExclusive:   toExclusive,
	}))
	if err != nil {
		return nil, false, err
	}

	mbs := make([]*MiniblockInfo, len(res.Msg.GetMiniblocks()))
	for i, mbProto := range res.Msg.GetMiniblocks() {
		mbs[i], err = NewMiniblockInfoFromProto(
			mbProto, res.Msg.GetMiniblockSnapshot(fromInclusive+int64(i)),
			NewParsedMiniblockInfoOpts().WithExpectedBlockNumber(fromInclusive+int64(i)),
		)
		if err != nil {
			return nil, false, err
		}
	}

	return mbs, res.Msg.Terminus, nil
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
