package rpc

import (
	"bytes"
	"casablanca/node/events"
	"casablanca/node/infra"
	"casablanca/node/protocol"
	"context"

	connect "github.com/bufbuild/connect-go"

	. "casablanca/node/base"
)

func (s *Service) CreateStream(ctx context.Context, req *connect.Request[protocol.CreateStreamRequest]) (*connect.Response[protocol.CreateStreamResponse], error) {
	log := infra.GetLogger(ctx)
	if len(req.Msg.Events) == 0 {
		return nil, RpcErrorf(protocol.Err_BAD_STREAM_CREATION_PARAMS, "CreateStream: no events")
	}

	parsedEvents, err := events.ParseEvents(req.Msg.Events)
	if err != nil {
		return nil, RpcErrorf(protocol.Err_BAD_STREAM_CREATION_PARAMS, "CreateStream: error parsing events: %v", err)
	}

	inceptionEvent := parsedEvents[0]
	inception := inceptionEvent.GetInceptionPayload()
	if inception == nil {
		return nil, RpcErrorf(protocol.Err_BAD_STREAM_CREATION_PARAMS, "CreateStream: first event is not an inception event")
	}

	var spaceStreamLeafHashes [][]byte

	switch inception.StreamKind {
	case protocol.StreamKind_SK_USER:
		if !ValidUserStreamId(inception.StreamId) {
			return nil, RpcErrorf(protocol.Err_BAD_STREAM_ID, "CreateStream: invalid user stream id '%s'", inception.StreamId)
		}
		if inception.SpaceId != "" {
			return nil, RpcErrorf(protocol.Err_BAD_STREAM_CREATION_PARAMS, "CreateStream: space id must be empty for user stream")
		}
		if len(parsedEvents) != 1 {
			return nil, RpcErrorf(protocol.Err_BAD_STREAM_CREATION_PARAMS, "CreateStream: user stream must have only one event")
		}
	case protocol.StreamKind_SK_SPACE:
		if !ValidSpaceStreamId(inception.StreamId) {
			return nil, RpcErrorf(protocol.Err_BAD_STREAM_ID, "CreateStream: invalid space stream id '%s'", inception.StreamId)
		}
		if inception.SpaceId != "" {
			return nil, RpcErrorf(protocol.Err_BAD_STREAM_CREATION_PARAMS, "CreateStream: (parent) space id must be empty for space stream")
		}
		if len(parsedEvents) != 2 {
			return nil, RpcErrorf(protocol.Err_BAD_STREAM_CREATION_PARAMS, "CreateStream: space stream must have exactly two events")
		}
		if err := validateJoinEvent(parsedEvents); err != nil {
			return nil, err
		}
	case protocol.StreamKind_SK_CHANNEL:
		if !ValidChannelStreamId(inception.StreamId) {
			return nil, RpcErrorf(protocol.Err_BAD_STREAM_ID, "CreateStream: invalid channel stream id '%s'", inception.StreamId)
		}
		if inception.SpaceId == "" {
			return nil, RpcErrorf(protocol.Err_BAD_STREAM_CREATION_PARAMS, "CreateStream: space id must not be empty for channel stream")
		}
		if len(parsedEvents) != 2 {
			return nil, RpcErrorf(protocol.Err_BAD_STREAM_CREATION_PARAMS, "CreateStream: channel stream must have exactly two events")
		}
		if err := validateJoinEvent(parsedEvents); err != nil {
			return nil, err
		}
		spaceView := makeView(ctx, s.Storage, inception.SpaceId)
		spaceStreamLeafHashes, err = spaceView.GetAllLeafEvents(ctx)
		if err != nil {
			return nil, err
		}
	default:
		return nil, RpcErrorf(protocol.Err_BAD_STREAM_CREATION_PARAMS, "CreateStream: invalid stream kind %d", inception.StreamKind)
	}

	// TODO(HNT-1355): this needs to be fixed: there is no need to load stream back and append second event through separate call
	// Storage.CreateStream should work fine with two events.
	streamId := inception.StreamId
	log.Info("CreateStream: calling storage", streamId)
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

	// streamId := inception.StreamId
	// log.Info("CreateStream: calling storage", streamId)
	// cookie, err := s.Storage.CreateStream(ctx, streamId, req.Msg.Events)
	// if err != nil {
	// 	return nil, err
	// }

	if inception.StreamKind == protocol.StreamKind_SK_CHANNEL {
		envelope, err := s.makeEnvelopeWithPayload(
			events.MakePayload_Channel(
				protocol.ChannelOp_CO_CREATED,
				inception.StreamId,
				&protocol.EventRef{
					StreamId:  streamId,
					Hash:      inceptionEvent.Envelope.Hash,
					Signature: inceptionEvent.Envelope.Signature,
				},
			),
			spaceStreamLeafHashes,
		)
		if err != nil {
			return nil, err
		}

		_, err = s.Storage.AddEvent(ctx, inception.SpaceId, envelope)
		if err != nil {
			return nil, err
		}
	}

	return connect.NewResponse(&protocol.CreateStreamResponse{
		SyncCookie: cookie,
	}), nil
}

func validateJoinEvent(events []*events.ParsedEvent) error {
	if len(events[1].Event.PrevEvents) != 1 || !bytes.Equal(events[1].Event.PrevEvents[0], events[0].Hash) {
		return RpcErrorf(protocol.Err_BAD_STREAM_CREATION_PARAMS, "CreateStream: bad hash on second event")
	}

	join := events[1].GetJoinableStreamPayload()

	if join == nil {
		return RpcErrorf(protocol.Err_BAD_STREAM_CREATION_PARAMS, "CreateStream: second event is not a join event")
	}
	if join.GetOp() != protocol.MembershipOp_SO_JOIN {
		return RpcErrorf(protocol.Err_BAD_STREAM_CREATION_PARAMS, "CreateStream: bad join op %d", join.GetOp())
	}
	creatorUserId := UserIdFromAddress(events[0].Event.GetCreatorAddress())
	if join.UserId != creatorUserId {
		return RpcErrorf(protocol.Err_BAD_STREAM_CREATION_PARAMS, "CreateStream: bad join user id '%s', created by '%s'", join.UserId, creatorUserId)
	}
	return nil
}
