package rpc

import (
	"context"
	"fmt"
	"sync"

	"github.com/river-build/river/auth"
	"github.com/river-build/river/dlog"
	. "github.com/river-build/river/events"
	"github.com/river-build/river/infra"
	. "github.com/river-build/river/protocol"
	"github.com/river-build/river/shared"

	"github.com/bufbuild/connect-go"
	connect_go "github.com/bufbuild/connect-go"
	"golang.org/x/exp/slog"

	. "github.com/river-build/river/base"
	. "github.com/river-build/river/shared"
)

var createStreamRequests = infra.NewSuccessMetrics("create_stream_requests", serviceRequests)

func (s *Service) createStreamImpl(
	ctx context.Context,
	req *connect_go.Request[CreateStreamRequest],
) (*connect_go.Response[CreateStreamResponse], error) {
	resMsg, err := s.createStream(ctx, req.Msg)
	if err != nil {
		createStreamRequests.FailInc()
		return nil, AsRiverError(err).Func("localCreateStream")
	}
	createStreamRequests.PassInc()
	return connect_go.NewResponse(resMsg), nil
}

func (s *Service) createStream(ctx context.Context, req *CreateStreamRequest) (*CreateStreamResponse, error) {
	log := dlog.CtxLog(ctx)

	if len(req.Events) == 0 {
		return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, "no events")
	}

	parsedEvents, err := ParseEvents(req.Events)
	if err != nil {
		return nil, err
	}

	log.Debug("localCreateStream", "parsedEvents", parsedEvents)

	for _, event := range parsedEvents {
		if event.Event.PrevMiniblockHash != nil {
			return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, "PrevMiniblockHash should be nil")
		}
	}

	inceptionEvent := parsedEvents[0]
	inceptionPayload := inceptionEvent.Event.GetInceptionPayload()

	if inceptionPayload == nil {
		return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, "first event is not an inception event")
	}

	if inceptionPayload.GetStreamId() != req.StreamId {
		return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, "stream id in request does not match stream id in inception event")
	}

	var resp *CreateStreamResponse
	switch inception := inceptionPayload.(type) {
	case *ChannelPayload_Inception:
		resp, err = s.createStream_Channel(ctx, log, parsedEvents, inception)

	case *SpacePayload_Inception:
		resp, err = s.createStream_Space(ctx, log, parsedEvents, inception)

	case *UserPayload_Inception:
		resp, err = s.createStream_User(ctx, log, parsedEvents, inception)

	case *UserDeviceKeyPayload_Inception:
		resp, err = s.createStream_UserDeviceKey(ctx, log, parsedEvents, inception)

	case *UserSettingsPayload_Inception:
		resp, err = s.createStream_UserSettings(ctx, log, parsedEvents, inception)

	case *UserToDevicePayload_Inception:
		resp, err = s.createStream_UserToDevice(ctx, log, parsedEvents, inception)

	case *MediaPayload_Inception:
		resp, err = s.createStream_Media(ctx, log, parsedEvents, inception)

	case *DmChannelPayload_Inception:
		resp, err = s.createStream_DMChannel(ctx, log, parsedEvents, inception)

	case *GdmChannelPayload_Inception:
		resp, err = s.createStream_GDMChannel(ctx, log, parsedEvents, inception)

	default:
		err = RiverError(Err_BAD_STREAM_CREATION_PARAMS, "invalid stream kind")
	}

	if err != nil {
		return nil, err
	}

	if resp == nil {
		return nil, RiverError(Err_INTERNAL, "stream not created, but there is no error")
	}

	return resp, nil
}

func (s *Service) createReplicatedStream(
	ctx context.Context,
	streamId string,
	parsedEvents []*ParsedEvent,
) (*CreateStreamResponse, error) {
	mb, err := MakeGenesisMiniblock(s.wallet, parsedEvents)
	if err != nil {
		return nil, err
	}

	nodes, err := s.streamRegistry.AllocateStream(ctx, streamId, mb.Header.Hash)
	if err != nil {
		return nil, err
	}

	isLocal, remotes := s.splitLocalAndRemote(ctx, nodes)
	sender := newQuorumPool(len(remotes))

	var localSyncCookie *SyncCookie
	if isLocal {
		sender.GoLocal(func() error {
			_, sv, err := s.cache.CreateStream(ctx, streamId, mb)
			if err != nil {
				return err
			}
			localSyncCookie = sv.SyncCookie(s.wallet.AddressStr)
			return nil
		})
	}

	var remoteSyncCookie *SyncCookie
	var remoteSyncCookieOnce sync.Once
	if len(remotes) > 0 {
		for _, n := range remotes {
			sender.GoRemote(
				n,
				func(node string) error {
					stub, err := s.nodeRegistry.GetNodeToNodeClientForAddress(node)
					if err != nil {
						return err
					}
					r, err := stub.AllocateStream(
						ctx,
						connect.NewRequest[AllocateStreamRequest](
							&AllocateStreamRequest{
								StreamId:  streamId,
								Miniblock: mb,
							},
						),
					)
					if err != nil {
						return err
					}
					remoteSyncCookieOnce.Do(func() {
						remoteSyncCookie = r.Msg.SyncCookie
					})
					return nil
				},
			)
		}
	}

	err = sender.Wait()
	if err != nil {
		return nil, err
	}

	cookie := localSyncCookie
	if cookie == nil {
		cookie = remoteSyncCookie
	}

	return &CreateStreamResponse{
		Stream: &StreamAndCookie{
			NextSyncCookie: cookie,
			Miniblocks:     []*Miniblock{mb},
		},
	}, nil
}

func (s *Service) createStream_Channel(
	ctx context.Context,
	log *slog.Logger,
	parsedEvents []*ParsedEvent,
	inception *ChannelPayload_Inception,
) (*CreateStreamResponse, error) {
	if len(parsedEvents) != 2 {
		return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, "channel stream must have exactly two events")
	}
	inceptionEvent := parsedEvents[0]
	joinEvent := parsedEvents[1]

	creatorUserStreamId, err := UserStreamIdFromAddress(inceptionEvent.Event.CreatorAddress)
	if err != nil {
		return nil, err
	}

	// Validation of creation params.
	if !ValidChannelStreamId(inception.StreamId) {
		return nil, RiverError(Err_BAD_STREAM_ID, "invalid channel stream id")
	}
	if inception.SpaceId == "" {
		return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, "space id must not be empty for channel stream")
	}
	if err := validateChannelJoinEvent(joinEvent); err != nil {
		return nil, err
	}

	// Load space. Check if it exists. Used later for auth and to add the channel to the space.
	spaceStream, spaceView, err := s.loadStream(ctx, inception.SpaceId)
	if err != nil {
		return nil, err
	}

	// Load user.
	userStream, userView, err := s.loadStream(ctx, creatorUserStreamId)
	if err != nil {
		return nil, err
	}

	// Authorization.
	err = s.authAddRemoveChannelsInSpace(ctx, inceptionEvent.Event.CreatorAddress, inception.SpaceId)
	if err != nil {
		return nil, err
	}

	streamId := inception.GetStreamId()
	resp, err := s.createReplicatedStream(ctx, streamId, parsedEvents)
	if err != nil {
		return nil, err
	}

	// side effects
	prevHash := spaceView.LastBlock().Hash
	spaceStreamEvent, err := MakeParsedEventWithPayload(
		s.wallet,
		Make_SpacePayload_Channel(
			ChannelOp_CO_CREATED,
			inception.StreamId,
			inception.ChannelProperties,
			&EventRef{
				StreamId:  streamId,
				Hash:      inceptionEvent.Envelope.Hash,
				Signature: inceptionEvent.Envelope.Signature,
			},
		),
		prevHash,
	)
	if err != nil {
		return nil, err
	}

	err = spaceStream.AddEvent(ctx, spaceStreamEvent)
	if err != nil {
		return nil, err
	}

	err = s.addDerivedMembershipEventToUserStream(ctx, userStream, userView, streamId, joinEvent, MembershipOp_SO_JOIN)
	if err != nil {
		return nil, err
	}

	return resp, nil
}

func (s *Service) createStream_DMChannel(
	ctx context.Context,
	log *slog.Logger,
	parsedEvents []*ParsedEvent,
	inception *DmChannelPayload_Inception,
) (*CreateStreamResponse, error) {
	if len(parsedEvents) != 3 {
		return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, "DM channel stream must have exactly 3 events")
	}

	inceptionEvent := parsedEvents[0]
	joinEvent := parsedEvents[1]
	inviteEvent := parsedEvents[2]

	creatorUserStreamId, err := UserStreamIdFromAddress(inceptionEvent.Event.CreatorAddress)
	if err != nil {
		return nil, err
	}

	otherUserAddress, err := AddressFromUserId(inviteEvent.Event.GetDmChannelPayload().GetMembership().GetUserId())
	if err != nil {
		return nil, err
	}

	if !ValidDMChannelStreamId(inception.StreamId, inceptionEvent.Event.CreatorAddress, otherUserAddress) {
		return nil, RiverError(Err_BAD_STREAM_ID, "invalid DM channel stream id")
	}

	otherUserStreamId, err := UserStreamIdFromAddress(otherUserAddress)
	if err != nil {
		return nil, err
	}

	userStream, userView, err := s.loadStream(ctx, creatorUserStreamId)
	if err != nil {
		return nil, err
	}

	otherUserStream, otherUserView, err := s.loadStream(ctx, otherUserStreamId)
	if err != nil {
		return nil, err
	}

	streamId := inception.GetStreamId()
	resp, err := s.createReplicatedStream(ctx, streamId, parsedEvents)
	if err != nil {
		return nil, err
	}

	err = s.addDerivedMembershipEventToUserStream(ctx, userStream, userView, streamId, joinEvent, MembershipOp_SO_JOIN)
	if err != nil {
		return nil, err
	}
	err = s.addDerivedMembershipEventToUserStream(ctx, otherUserStream, otherUserView, streamId, inviteEvent, MembershipOp_SO_JOIN)
	if err != nil {
		return nil, err
	}
	return resp, nil
}

func (s *Service) createStream_GDMChannel(
	ctx context.Context,
	log *slog.Logger,
	parsedEvents []*ParsedEvent,
	inception *GdmChannelPayload_Inception,
) (*CreateStreamResponse, error) {
	// GDMs require 3+ users. The 4 required events are:
	// 1. Inception
	// 2. Join event for creator
	// 3. Invite event for user 2
	// 4. Invite event for user 3
	// Followed by optional invite events for more users.

	if len(parsedEvents) < 4 {
		return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, "gdm channel stream must have four or more events")
	}

	if !ValidGDMChannelStreamId(inception.StreamId) {
		return nil, RiverError(Err_BAD_STREAM_ID, "invalid gdm channel stream id")
	}

	inceptionEvent := parsedEvents[0]
	joinEvent := parsedEvents[1]
	if err := validateGDMChannelMembershipEvent(joinEvent, MembershipOp_SO_JOIN); err != nil {
		return nil, err
	}

	creatorUserStreamId, err := UserStreamIdFromAddress(inceptionEvent.Event.CreatorAddress)
	if err != nil {
		return nil, err
	}

	userStream, userView, err := s.loadStream(ctx, creatorUserStreamId)
	if err != nil {
		return nil, err
	}

	type invitationInfo struct {
		stream     Stream
		streamView StreamView
		event      *ParsedEvent
	}
	var invitations []invitationInfo

	// Check that all invite events belong to a real user, store in slice to avoid fetching twice.
	for _, event := range parsedEvents[2:] {
		if err := validateGDMChannelMembershipEvent(event, MembershipOp_SO_JOIN); err != nil {
			return nil, err
		}

		address, err := AddressFromUserId(event.Event.GetGdmChannelPayload().GetMembership().UserId)
		if err != nil {
			return nil, err
		}
		userStreamId, err := UserStreamIdFromAddress(address)
		if err != nil {
			return nil, err
		}
		stream, streamView, err := s.loadStream(ctx, userStreamId)
		if err != nil {
			return nil, err
		}
		invitations = append(invitations, invitationInfo{stream, streamView, event})
	}

	streamId := inception.GetStreamId()
	resp, err := s.createReplicatedStream(ctx, streamId, parsedEvents)
	if err != nil {
		return nil, err
	}

	err = s.addDerivedMembershipEventToUserStream(ctx, userStream, userView, streamId, joinEvent, MembershipOp_SO_JOIN)
	if err != nil {
		return nil, err
	}

	for _, invitation := range invitations {
		err = s.addDerivedMembershipEventToUserStream(ctx,
			invitation.stream,
			invitation.streamView,
			streamId,
			invitation.event,
			MembershipOp_SO_JOIN)
		if err != nil {
			return nil, err
		}
	}
	return resp, nil
}

func (s *Service) createStream_Space(
	ctx context.Context,
	log *slog.Logger,
	parsedEvents []*ParsedEvent,
	inception *SpacePayload_Inception,
) (*CreateStreamResponse, error) {
	if len(parsedEvents) != 2 {
		return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, "space stream must have exactly two events")
	}
	inceptionEvent := parsedEvents[0]
	joinEvent := parsedEvents[1]

	creatorUserId, err := UserStreamIdFromAddress(inceptionEvent.Event.CreatorAddress)
	if err != nil {
		return nil, err
	}

	var userStream Stream
	var userView StreamView

	// Validation of creation params.
	if !ValidSpaceStreamId(inception.StreamId) {
		return nil, RiverError(Err_BAD_STREAM_ID, "invalid space stream id")
	}
	if err := validateSpaceJoinEvent(joinEvent); err != nil {
		return nil, err
	}

	// Load user.
	userStream, userView, err = s.loadStream(ctx, creatorUserId)
	if err != nil {
		return nil, err
	}

	// Authorization.
	// TODO: this is wrong check. Real check should be "Space exists in contract and user is owner of space".
	err = s.authAddRemoveChannelsInSpace(ctx, inceptionEvent.Event.CreatorAddress, inception.StreamId)
	if err != nil {
		return nil, err
	}

	// Create stream.
	streamId := inception.GetStreamId()
	resp, err := s.createReplicatedStream(ctx, streamId, parsedEvents)
	if err != nil {
		return nil, err
	}

	// Side effects.
	err = s.addDerivedMembershipEventToUserStream(ctx, userStream, userView, streamId, joinEvent, MembershipOp_SO_JOIN)
	if err != nil {
		return nil, err
	}

	return resp, nil
}

func (s *Service) createStream_User(
	ctx context.Context,
	log *slog.Logger,
	parsedEvents []*ParsedEvent,
	inception *UserPayload_Inception,
) (*CreateStreamResponse, error) {
	if len(parsedEvents) != 1 {
		return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, "user stream must have only one event")
	}

	// Validation of creation params.
	err := CheckUserStreamId(inception.StreamId, parsedEvents[0].Event.CreatorAddress)
	if err != nil {
		return nil, err
	}

	// TODO: Authorization.

	streamId := inception.GetStreamId()
	resp, err := s.createReplicatedStream(ctx, streamId, parsedEvents)
	if err != nil {
		return nil, err
	}

	return resp, nil
}

func (s *Service) createStream_UserToDevice(
	ctx context.Context,
	log *slog.Logger,
	parsedEvents []*ParsedEvent,
	inception *UserToDevicePayload_Inception,
) (*CreateStreamResponse, error) {
	if len(parsedEvents) != 1 {
		return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, "user to device stream must have only one event")
	}

	err := CheckUserToDeviceStreamId(inception.StreamId, parsedEvents[0].Event.CreatorAddress)
	if err != nil {
		return nil, err
	}
	// TODO: Authorization.
	streamId := inception.GetStreamId()
	resp, err := s.createReplicatedStream(ctx, streamId, parsedEvents)
	if err != nil {
		return nil, err
	}

	return resp, nil
}

func (s *Service) createStream_UserDeviceKey(
	ctx context.Context,
	log *slog.Logger,
	parsedEvents []*ParsedEvent,
	inception *UserDeviceKeyPayload_Inception,
) (*CreateStreamResponse, error) {
	if len(parsedEvents) != 1 {
		return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, "user device key stream must have only one event")
	}

	// Validation of creation params.
	err := CheckUserDeviceKeyStreamId(inception.StreamId, parsedEvents[0].Event.CreatorAddress)
	if err != nil {
		return nil, err
	}

	// TODO: Authorization.

	streamId := inception.GetStreamId()
	resp, err := s.createReplicatedStream(ctx, streamId, parsedEvents)
	if err != nil {
		return nil, err
	}

	return resp, nil
}

func (s *Service) createStream_UserSettings(
	ctx context.Context,
	log *slog.Logger,
	parsedEvents []*ParsedEvent,
	inception *UserSettingsPayload_Inception,
) (*CreateStreamResponse, error) {
	if len(parsedEvents) != 1 {
		return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, "user settings stream must have only one event")
	}

	// Validation of creation params.
	err := CheckUserSettingsStreamId(inception.StreamId, parsedEvents[0].Event.CreatorAddress)
	if err != nil {
		return nil, err
	}

	// TODO: Authorization.

	streamId := inception.GetStreamId()
	resp, err := s.createReplicatedStream(ctx, streamId, parsedEvents)
	if err != nil {
		return nil, err
	}

	return resp, nil
}

func (s *Service) createStream_Media(
	ctx context.Context,
	log *slog.Logger,
	parsedEvents []*ParsedEvent,
	inception *MediaPayload_Inception,
) (*CreateStreamResponse, error) {
	if !CheckMediaStreamId(inception.StreamId) {
		return nil, RiverError(Err_BAD_STREAM_ID, "CreateStream: invalid media stream id '%s'", inception.StreamId)
	}

	if inception.ChannelId == "" {
		return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, "channel id must not be empty for media stream")
	}

	if inception.ChunkCount > int32(s.streamConfig.Media.MaxChunkCount) {
		return nil, RiverError(
			Err_BAD_STREAM_CREATION_PARAMS,
			fmt.Sprintf("chunk count must be less than or equal to %d", s.streamConfig.Media.MaxChunkCount),
		)
	}

	// TODO: replace with stream registry stream existence check
	// Make sure that the channel exists, get channelStreamView for auth
	_, channelStreamView, err := s.loadStream(ctx, inception.ChannelId)
	if err != nil {
		return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, "channel does not exist")
	}

	user, err := shared.AddressHex(parsedEvents[0].Event.CreatorAddress)
	if err != nil {
		return nil, err
	}

	if ValidChannelStreamId(inception.GetChannelId()) {
		channelInception, err := ChannelFromInception(channelStreamView.InceptionPayload())
		if err != nil {
			return nil, err
		}

		err = s.authChecker.CheckPermission(
			ctx,
			auth.NewAuthCheckArgsForChannel(
				channelInception.SpaceId,
				inception.ChannelId,
				user,
				auth.PermissionWrite,
			),
		)
		if err != nil {
			return nil, err
		}

		// check if user is a member of the channel
		member, err := s.checkMembership(ctx, channelStreamView, user)
		if err != nil {
			return nil, err
		}
		if !member {
			return nil, RiverError(Err_PERMISSION_DENIED, "user is not a member of channel", "user", user)
		}
	} else if CheckDMStreamId(inception.GetChannelId()) {
		_, streamView, err := s.loadStream(ctx, inception.GetChannelId())
		if err != nil {
			return nil, err
		}

		inceptionPayload := streamView.InceptionPayload()
		info, err := DMStreamInfoFromInceptionPayload(inceptionPayload, inception.GetChannelId())
		if err != nil {
			return nil, err
		}

		if user != info.FirstPartyId && user != info.SecondPartyId {
			return nil, RiverError(Err_PERMISSION_DENIED, "user is not a member of DM", "user", user)
		}
	} else if ValidGDMChannelStreamId(inception.GetChannelId()) {
		_, streamView, err := s.loadStream(ctx, inception.GetChannelId())
		if err != nil {
			return nil, err
		}
		member, err := s.checkMembership(ctx, streamView, user)
		if err != nil {
			return nil, err
		}
		if !member {
			return nil, RiverError(Err_PERMISSION_DENIED, "user is not a member of channel", "user", user)
		}
	} else {
		return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, "channel stream does not support media")
	}

	streamId := inception.GetStreamId()
	resp, err := s.createReplicatedStream(ctx, streamId, parsedEvents)
	if err != nil {
		return nil, err
	}

	return resp, nil
}

func (s *Service) authAddRemoveChannelsInSpace(
	ctx context.Context,
	creatorUserAddress []byte,
	spaceId string,
) error {
	userId, err := AddressHex(creatorUserAddress)
	if err != nil {
		return err
	}

	err = s.authChecker.CheckPermission(
		ctx,
		auth.NewAuthCheckArgsForSpace(spaceId, userId, auth.PermissionAddRemoveChannels),
	)
	if err != nil {
		return err
	}
	return nil
}

func validateChannelJoinEvent(event *ParsedEvent) error {
	payload, ok := event.Event.GetPayload().(*StreamEvent_ChannelPayload)
	if !ok {
		return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "second event is not a channel payload")
	}
	membershipPayload, ok := payload.ChannelPayload.GetContent().(*ChannelPayload_Membership)
	if !ok {
		return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "second event is not a channel join event")
	}
	return validateJoinEventPayload(event, membershipPayload.Membership)
}

func validateGDMChannelMembershipEvent(event *ParsedEvent, op MembershipOp) error {
	payload, ok := event.Event.GetPayload().(*StreamEvent_GdmChannelPayload)
	if !ok {
		return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "event is not a gdm channel payload")
	}
	membershipPayload, ok := payload.GdmChannelPayload.GetContent().(*GdmChannelPayload_Membership)
	if !ok {
		return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "event is not a gdm channel membership event")
	}

	if membershipPayload.Membership.GetOp() != op {
		return RiverError(
			Err_BAD_STREAM_CREATION_PARAMS,
			"membership op does not match",
			"op",
			membershipPayload.Membership.GetOp(),
			"expected",
			op,
		)
	}
	return nil
}

func validateSpaceJoinEvent(event *ParsedEvent) error {
	payload, ok := event.Event.GetPayload().(*StreamEvent_SpacePayload)
	if !ok {
		return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "second event is not a channel payload")
	}
	membershipPayload, ok := payload.SpacePayload.GetContent().(*SpacePayload_Membership)
	if !ok {
		return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "second event is not a channel join event")
	}
	return validateJoinEventPayload(event, membershipPayload.Membership)
}

func validateJoinEventPayload(event *ParsedEvent, membership *Membership) error {
	creatorUserId, err := AddressHex(event.Event.GetCreatorAddress())
	if err != nil {
		return err
	}
	if membership.GetOp() != MembershipOp_SO_JOIN {
		return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "bad join op", "op", membership.GetOp())
	}
	if membership.UserId != creatorUserId {
		return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "bad join user", "id", membership.UserId, "created_by", creatorUserId)
	}
	return nil
}
