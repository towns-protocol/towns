package rpc

import (
	"casablanca/node/events"
	"casablanca/node/infra"
	"casablanca/node/protocol"
	"context"

	connect "github.com/bufbuild/connect-go"
)

func (s *Service) CreateStream(ctx context.Context, req *connect.Request[protocol.CreateStreamRequest]) (*connect.Response[protocol.CreateStreamResponse], error) {
	log := infra.GetLogger(ctx)
	if len(req.Msg.Events) == 0 {
		return nil, RpcErrorf(protocol.Err_BAD_STREAM_CREATION_PARAMS, "CreateStream: no events")
	}

	events, err := events.ParseEvents("", req.Msg.Events)
	if err != nil {
		return nil, RpcErrorf(protocol.Err_BAD_STREAM_CREATION_PARAMS, "CreateStream: error parsing events: %v", err)
	}

	inception := events[0].GetInceptionPayload()
	if inception == nil {
		return nil, RpcErrorf(protocol.Err_BAD_STREAM_CREATION_PARAMS, "CreateStream: first event is not an inception event")
	}

	switch inception.StreamKind {
	case protocol.StreamKind_SK_USER:
		if !ValidUserStreamId(inception.StreamId) {
			return nil, RpcErrorf(protocol.Err_BAD_STREAM_ID, "CreateStream: invalid user stream id '%s'", inception.StreamId)
		}
		if inception.SpaceId != "" {
			return nil, RpcErrorf(protocol.Err_BAD_STREAM_CREATION_PARAMS, "CreateStream: space id must be empty for user stream")
		}
		if len(events) != 1 {
			return nil, RpcErrorf(protocol.Err_BAD_STREAM_CREATION_PARAMS, "CreateStream: user stream must have only one event")
		}
	case protocol.StreamKind_SK_SPACE:
		if !ValidSpaceStreamId(inception.StreamId) {
			return nil, RpcErrorf(protocol.Err_BAD_STREAM_ID, "CreateStream: invalid space stream id '%s'", inception.StreamId)
		}
		if inception.SpaceId != "" {
			return nil, RpcErrorf(protocol.Err_BAD_STREAM_CREATION_PARAMS, "CreateStream: (parent) space id must be empty for space stream")
		}
		if len(events) != 2 {
			return nil, RpcErrorf(protocol.Err_BAD_STREAM_CREATION_PARAMS, "CreateStream: space stream must have exactly two events")
		}
		if err := validateJoinEvent(events); err != nil {
			return nil, err
		}
	case protocol.StreamKind_SK_CHANNEL:
		if !ValidChannelStreamId(inception.StreamId) {
			return nil, RpcErrorf(protocol.Err_BAD_STREAM_ID, "CreateStream: invalid channel stream id '%s'", inception.StreamId)
		}
		if inception.SpaceId == "" {
			return nil, RpcErrorf(protocol.Err_BAD_STREAM_CREATION_PARAMS, "CreateStream: space id must not be empty for channel stream")
		}
		if len(events) != 2 {
			return nil, RpcErrorf(protocol.Err_BAD_STREAM_CREATION_PARAMS, "CreateStream: channel stream must have exactly two events")
		}
		if err := validateJoinEvent(events); err != nil {
			return nil, err
		}
	default:
		return nil, RpcErrorf(protocol.Err_BAD_STREAM_CREATION_PARAMS, "CreateStream: invalid stream kind %d", inception.StreamKind)
	}

	streamId := inception.StreamId
	log.Info("CreateStream: ", streamId)
	cookie, err := s.Storage.CreateStream(ctx, streamId, req.Msg.Events[0:1])
	if err != nil {
		return nil, err
	}
	view := makeView(ctx, s.Storage, streamId)

	for _, event := range req.Msg.Events[1:] {
		cookie, err = s.addEvent(ctx, streamId, view, event)
		if err != nil {
			// TODO: s.Storage.DeleteStream(ctx, streamId)
			return nil, err
		}
	}
	return connect.NewResponse(&protocol.CreateStreamResponse{
		SyncCookie: cookie,
	}), nil
}

func validateJoinEvent(events []*events.ParsedEvent) error {
	join := events[1].GetJoinableStreamPayload()
	if join == nil {
		return RpcErrorf(protocol.Err_BAD_STREAM_CREATION_PARAMS, "CreateStream: second event is not a join event")
	}
	if join.GetOp() != protocol.StreamOp_SO_JOIN {
		return RpcErrorf(protocol.Err_BAD_STREAM_CREATION_PARAMS, "CreateStream: bad join op %d", join.GetOp())
	}
	creatorUserId := UserIdFromAddress(events[0].Event.GetCreatorAddress())
	if join.UserId != creatorUserId {
		return RpcErrorf(protocol.Err_BAD_STREAM_CREATION_PARAMS, "CreateStream: bad join user id '%s', created by '%s'", join.UserId, creatorUserId)
	}
	return nil
}
