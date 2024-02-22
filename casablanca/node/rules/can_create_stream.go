package rules

import (
	"bytes"
	"context"
	"fmt"
	"log/slog"
	"strings"

	"github.com/river-build/river/auth"
	. "github.com/river-build/river/base"
	"github.com/river-build/river/config"
	"github.com/river-build/river/dlog"
	"github.com/river-build/river/events"
	. "github.com/river-build/river/protocol"
	"github.com/river-build/river/shared"
)

type csParams struct {
	ctx                 context.Context
	cfg                 *config.StreamConfig
	streamId            string
	parsedEvents        []*events.ParsedEvent
	inceptionPayload    IsInceptionPayload
	creatorAddress      []byte
	creatorUserId       string
	creatorUserStreamId string
}

type csSpaceRules struct {
	params    *csParams
	inception *SpacePayload_Inception
}

type csChannelRules struct {
	params    *csParams
	inception *ChannelPayload_Inception
}

type csMediaRules struct {
	params    *csParams
	inception *MediaPayload_Inception
}

type csDmChannelRules struct {
	params    *csParams
	inception *DmChannelPayload_Inception
}

type csGdmChannelRules struct {
	params    *csParams
	inception *GdmChannelPayload_Inception
}

type csUserRules struct {
	params    *csParams
	inception *UserPayload_Inception
}

type csUserDeviceKeyRules struct {
	params    *csParams
	inception *UserDeviceKeyPayload_Inception
}

type csUserSettingsRules struct {
	params    *csParams
	inception *UserSettingsPayload_Inception
}

type csUserInboxRules struct {
	params    *csParams
	inception *UserInboxPayload_Inception
}

/*
*
* CanCreateStreamEvent
* a pure function with no side effects that returns a boolean value and prerequesits
* for creating a stream.
*
  - @return creatorStreamId string // the id of the creator's user stream
  - @return requiredUsers []string // user ids that must have valid user streams before creating the stream
  - @return requiredMemberships []string // stream ids that the creator must be a member of to create the stream
    // every case except for the user stream the creator must be a member of their own user stream first
  - @return chainAuthArgs *auth.ChainAuthArgs // on chain requirements for creating the stream
  - @return derivedEvents []*DerivedEvent // event that should be added after the stream is created
    // derived events events must be replayable - meaning that in the case of a no-op, the can_add_event
    // function should return false, nil, nil, nil to indicate
    // that the event cannot be added to the stream, but there is no error
  - @return error // if adding result would result in invalid state

*
* example valid states:
* (nil, nil, nil) // stream can be created
* (nil, nil, error) // stream falied validation
* (nil, []*DerivedEvent, nil) // stream can be created and derived events should be created after
* (chainAuthArgs, nil, nil) // stream can be created if chainAuthArgs are satisfied
* (chainAuthArgs, []*DerivedEvent, nil) // stream can be created if chainAuthArgs are satisfied and derived events should be created after
*/
func CanCreateStream(ctx context.Context, cfg *config.StreamConfig, streamId string, parsedEvents []*events.ParsedEvent) (*CreateStreamRules, error) {
	if len(parsedEvents) == 0 {
		return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, "no events")
	}

	creatorAddress := parsedEvents[0].Event.GetCreatorAddress()
	creatorUserId, err := shared.AddressHex(creatorAddress)
	if err != nil {
		return nil, err
	}
	creatorUserStreamId, err := shared.UserStreamIdFromId(creatorUserId)
	if err != nil {
		return nil, err
	}

	for _, event := range parsedEvents {
		if event.Event.PrevMiniblockHash != nil {
			return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, "PrevMiniblockHash should be nil")
		}
		if !bytes.Equal(event.Event.CreatorAddress, creatorAddress) {
			return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, "all events should have the same creator address")
		}
	}

	inceptionEvent := parsedEvents[0]
	inceptionPayload := inceptionEvent.Event.GetInceptionPayload()
	if inceptionPayload == nil {
		return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, "first event is not an inception event")
	}

	if inceptionPayload.GetStreamId() != streamId {
		return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, "stream id in request does not match stream id in inception event")
	}

	r := &csParams{
		ctx:                 ctx,
		cfg:                 cfg,
		streamId:            streamId,
		parsedEvents:        parsedEvents,
		inceptionPayload:    inceptionPayload,
		creatorAddress:      creatorAddress,
		creatorUserId:       creatorUserId,
		creatorUserStreamId: creatorUserStreamId,
	}

	builder := r.canCreateStream()
	r.log().Debug("CanCreateStream", "builder", builder)
	return builder.run()
}

func (ru *csParams) log() *slog.Logger {
	return dlog.FromCtx(ru.ctx)
}

func (params *csParams) canCreateStream() ruleBuilderCS {
	builder := csBuilder(params.creatorUserStreamId)

	switch inception := params.inceptionPayload.(type) {

	case *SpacePayload_Inception:
		ru := &csSpaceRules{
			params:    params,
			inception: inception,
		}
		return builder.
			check(
				ru.params.streamIdHasPrefix(shared.STREAM_SPACE_PREFIX_DASH),
				ru.params.eventCountMatches(2),
				ru.validateSpaceJoinEvent,
			).
			requireMembership(ru.params.creatorUserStreamId).
			requireChainAuth(ru.getCreateSpaceChainAuth).
			requireDerivedEvent(ru.params.derivedMembershipEvent)

	case *ChannelPayload_Inception:
		ru := &csChannelRules{
			params:    params,
			inception: inception,
		}
		return builder.
			check(
				ru.params.streamIdHasPrefix(shared.STREAM_CHANNEL_PREFIX_DASH),
				ru.params.eventCountMatches(2),
				ru.validateChannelJoinEvent,
			).
			requireMembership(
				ru.params.creatorUserStreamId,
				inception.SpaceId,
			).
			requireChainAuth(ru.getCreateChannelChainAuth).
			requireDerivedEvent(
				ru.derivedChannelSpaceParentEvent,
				ru.params.derivedMembershipEvent,
			)

	case *MediaPayload_Inception:
		ru := &csMediaRules{
			params:    params,
			inception: inception,
		}
		return builder.
			check(
				ru.params.streamIdHasPrefix(shared.STREAM_MEDIA_PREFIX_DASH),
				ru.params.eventCountMatches(1),
				ru.checkMediaInceptionPayload,
			).
			requireMembership(
				ru.params.creatorUserStreamId,
				inception.ChannelId,
			).
			requireChainAuth(ru.getChainAuthForMediaStream)

	case *DmChannelPayload_Inception:
		ru := &csDmChannelRules{
			params:    params,
			inception: inception,
		}
		return builder.
			check(
				ru.params.streamIdHasPrefix(shared.STREAM_DM_CHANNEL_PREFIX_DASH),
				ru.params.eventCountMatches(3),
				ru.checkDMInceptionPayload,
			).
			requireMembership(ru.params.creatorUserStreamId).
			requireUser(ru.inception.SecondPartyId).
			requireDerivedEvents(ru.derivedDMMembershipEvents)

	case *GdmChannelPayload_Inception:
		ru := &csGdmChannelRules{
			params:    params,
			inception: inception,
		}
		return builder.
			check(
				ru.params.streamIdHasPrefix(shared.STREAM_GDM_CHANNEL_PREFIX_DASH),
				ru.params.eventCountGreaterThanOrEqualTo(4),
				ru.checkGDMPayloads,
			).
			requireMembership(ru.params.creatorUserStreamId).
			requireUser(ru.getGDMUserIds()[1:]...).
			requireDerivedEvents(ru.derivedGDMMembershipEvents)

	case *UserPayload_Inception:
		ru := &csUserRules{
			params:    params,
			inception: inception,
		}
		return builder.
			check(
				ru.params.streamIdHasPrefix(shared.STREAM_USER_PREFIX_DASH),
				ru.params.eventCountMatches(1),
				ru.params.isUserStreamId,
			)
		// TODO HNT-4630 add chain auth for user stream

	case *UserDeviceKeyPayload_Inception:
		ru := &csUserDeviceKeyRules{
			params:    params,
			inception: inception,
		}
		return builder.
			check(
				ru.params.streamIdHasPrefix(shared.STREAM_USER_DEVICE_KEY_PREFIX_DASH),
				ru.params.eventCountMatches(1),
				ru.params.isUserStreamId,
			)
		// TODO HNT-4630 add chain auth for user stream

	case *UserSettingsPayload_Inception:
		ru := &csUserSettingsRules{
			params:    params,
			inception: inception,
		}
		return builder.
			check(
				ru.params.streamIdHasPrefix(shared.STREAM_USER_SETTINGS_PREFIX_DASH),
				ru.params.eventCountMatches(1),
				ru.params.isUserStreamId,
			)
		// TODO HNT-4630 add chain auth for user stream

	case *UserInboxPayload_Inception:
		ru := &csUserInboxRules{
			params:    params,
			inception: inception,
		}
		return builder.
			check(
				ru.params.streamIdHasPrefix(shared.STREAM_USER_INBOX_PREFIX_DASH),
				ru.params.eventCountMatches(1),
				ru.params.isUserStreamId,
			)
		// TODO HNT-4630 add chain auth for user stream

	default:
		return builder.fail(unknownPayloadType(inception))
	}
}

func (ru *csParams) streamIdHasPrefix(prefix string) func() error {
	return func() error {
		if !strings.HasPrefix(ru.streamId, prefix) {
			return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "stream id doesn't match expected prefix", "streamId", ru.streamId, "expected", prefix)
		}
		if len(ru.streamId) < len(prefix)+4 {
			return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "stream id too short", "streamId", ru.streamId)
		}
		return nil
	}
}
func (ru *csParams) isUserStreamId() error {
	creatorUserId, err := shared.AddressHex(ru.parsedEvents[0].Event.GetCreatorAddress())
	if err != nil {
		return err
	}

	if shared.GetStreamIdPostfix(ru.streamId) != creatorUserId {
		return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "stream id doesn't match creator address", "streamId", ru.streamId, "creator", creatorUserId)
	}
	return nil
}

func (ru *csParams) eventCountMatches(eventCount int) func() error {
	return func() error {
		if len(ru.parsedEvents) != eventCount {
			return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "bad event count", "count", len(ru.parsedEvents), "expectedCount", eventCount)
		}
		return nil
	}
}

func (ru *csParams) eventCountGreaterThanOrEqualTo(eventCount int) func() error {
	return func() error {
		if len(ru.parsedEvents) < eventCount {
			return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "bad event count", "count", len(ru.parsedEvents), "expectedCount", eventCount)
		}
		return nil
	}
}

func (ru *csChannelRules) validateChannelJoinEvent() error {
	const joinEventIndex = 1
	event := ru.params.parsedEvents[joinEventIndex]
	payload, ok := event.Event.GetPayload().(*StreamEvent_ChannelPayload)
	if !ok {
		return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "second event is not a channel payload")
	}
	membershipPayload, ok := payload.ChannelPayload.GetContent().(*ChannelPayload_Membership)
	if !ok {
		return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "second event is not a channel join event")
	}
	return ru.params.validateJoinEventPayload(event, membershipPayload.Membership)

}

func (ru *csSpaceRules) validateSpaceJoinEvent() error {
	joinEventIndex := 1
	event := ru.params.parsedEvents[joinEventIndex]
	payload, ok := event.Event.GetPayload().(*StreamEvent_SpacePayload)
	if !ok {
		return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "second event is not a channel payload")
	}
	membershipPayload, ok := payload.SpacePayload.GetContent().(*SpacePayload_Membership)
	if !ok {
		return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "second event is not a channel join event")
	}
	return ru.params.validateJoinEventPayload(event, membershipPayload.Membership)
}

func (ru *csParams) validateJoinEventPayload(event *events.ParsedEvent, membership *Membership) error {
	creatorUserId, err := shared.AddressHex(event.Event.GetCreatorAddress())
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

func (ru *csSpaceRules) getCreateSpaceChainAuth() (*auth.ChainAuthArgs, error) {
	creatorUserAddress := ru.params.parsedEvents[0].Event.GetCreatorAddress()
	userId, err := shared.AddressHex(creatorUserAddress)
	if err != nil {
		return nil, err
	}
	return auth.NewChainAuthArgsForSpace(
		ru.params.streamId,
		userId,
		auth.PermissionAddRemoveChannels, // todo should be isOwner...
	), nil

}

func (ru *csChannelRules) getCreateChannelChainAuth() (*auth.ChainAuthArgs, error) {
	creatorUserAddress := ru.params.parsedEvents[0].Event.GetCreatorAddress()
	userId, err := shared.AddressHex(creatorUserAddress)
	if err != nil {
		return nil, err
	}
	return auth.NewChainAuthArgsForSpace(
		ru.inception.SpaceId, // check parent space id
		userId,
		auth.PermissionAddRemoveChannels,
	), nil

}

func (ru *csChannelRules) derivedChannelSpaceParentEvent() (*DerivedEvent, error) {
	payload := events.Make_SpacePayload_Channel(
		ChannelOp_CO_CREATED,
		ru.inception.StreamId,
		ru.inception.ChannelProperties,
		&EventRef{
			StreamId:  ru.inception.StreamId,
			Hash:      ru.params.parsedEvents[0].Envelope.Hash,
			Signature: ru.params.parsedEvents[0].Envelope.Signature,
		},
		ru.inception.IsDefault,
	)

	return &DerivedEvent{
		StreamId: ru.inception.SpaceId,
		Payload:  payload,
	}, nil
}

func (ru *csParams) derivedMembershipEvent() (*DerivedEvent, error) {
	creatorAddress := ru.parsedEvents[0].Event.GetCreatorAddress()

	creatorUserStreamId, err := shared.UserStreamIdFromAddress(creatorAddress)
	if err != nil {
		return nil, err
	}
	inviterId, err := shared.AddressHex(creatorAddress)
	if err != nil {
		return nil, err
	}

	payload := events.Make_UserPayload_Membership(
		MembershipOp_SO_JOIN,
		ru.streamId,
		&inviterId,
	)

	return &DerivedEvent{
		StreamId: creatorUserStreamId,
		Payload:  payload,
	}, nil
}

func (ru *csMediaRules) checkMediaInceptionPayload() error {
	if ru.inception.ChannelId == "" {
		return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "channel id must not be empty for media stream")
	}
	if ru.inception.ChunkCount > int32(ru.params.cfg.Media.MaxChunkCount) {
		return RiverError(
			Err_BAD_STREAM_CREATION_PARAMS,
			fmt.Sprintf("chunk count must be less than or equal to %d", ru.params.cfg.Media.MaxChunkCount),
		)
	}

	if shared.ValidChannelStreamId(ru.inception.ChannelId) {
		if ru.inception.SpaceId == nil {
			return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "space id must not be nil for media stream")
		}
		if *ru.inception.SpaceId == "" {
			return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "space id must not be empty for media stream")
		}
		return nil
	} else if shared.ValidDMChannelStreamId(ru.inception.ChannelId) ||
		shared.ValidGDMChannelStreamId(ru.inception.ChannelId) {
		// as long as the creator is a member, and in the case of channels chainAuth succeeds, this is valid
		return nil
	} else {
		return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "invalid channel id")
	}
}

func (ru *csMediaRules) getChainAuthForMediaStream() (*auth.ChainAuthArgs, error) {
	userId, err := shared.AddressHex(ru.params.creatorAddress)
	if err != nil {
		return nil, err
	}

	if shared.ValidChannelStreamId(ru.inception.ChannelId) {
		if ru.inception.SpaceId == nil {
			return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, "space id must not be empty for media stream")
		}
		return auth.NewChainAuthArgsForChannel(
			*ru.inception.SpaceId,
			ru.inception.ChannelId,
			userId,
			auth.PermissionWrite,
		), nil
	} else {
		return nil, nil
	}

}

func (ru *csDmChannelRules) checkDMInceptionPayload() error {
	if ru.inception.FirstPartyId == "" || ru.inception.SecondPartyId == "" {
		return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "user ids must not be nil for dm channel")
	}
	if ru.inception.FirstPartyId == ru.inception.SecondPartyId {
		return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "user ids must not be the same for dm channel")
	}
	if ru.params.creatorUserId != ru.inception.FirstPartyId {
		return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "creator must be first party for dm channel")
	}
	addr1, err := shared.AddressFromUserId(ru.inception.FirstPartyId)
	if err != nil {
		return err
	}
	addr2, err := shared.AddressFromUserId(ru.inception.SecondPartyId)
	if err != nil {
		return err
	}
	if !shared.ValidDMChannelStreamIdBetween(ru.params.streamId, addr1, addr2) {
		return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "invalid stream id for dm channel")
	}
	return nil
}

func (ru *csDmChannelRules) derivedDMMembershipEvents() ([]*DerivedEvent, error) {

	firstPartyStream, err := shared.UserStreamIdFromId(ru.inception.FirstPartyId)
	if err != nil {
		return nil, err
	}

	secondPartyStream, err := shared.UserStreamIdFromId(ru.inception.SecondPartyId)
	if err != nil {
		return nil, err
	}

	// first party
	payload1 := events.Make_UserPayload_Membership(
		MembershipOp_SO_JOIN,
		ru.params.streamId,
		&ru.params.creatorUserId,
	)

	// second party
	payload2 := events.Make_UserPayload_Membership(
		MembershipOp_SO_JOIN,
		ru.params.streamId,
		&ru.params.creatorUserId,
	)

	return []*DerivedEvent{
		{
			StreamId: firstPartyStream,
			Payload:  payload1,
		},
		{
			StreamId: secondPartyStream,
			Payload:  payload2,
		},
	}, nil
}

func (ru *csGdmChannelRules) checkGDMPayload(event *events.ParsedEvent, expectedUserId *string) error {
	payload, ok := event.Event.GetPayload().(*StreamEvent_GdmChannelPayload)
	if !ok {
		return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "event is not a gdm channel payload")
	}
	membershipPayload, ok := payload.GdmChannelPayload.GetContent().(*GdmChannelPayload_Membership)
	if !ok {
		return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "event is not a gdm channel membership event")
	}

	if membershipPayload.Membership.GetOp() != MembershipOp_SO_JOIN {
		return RiverError(
			Err_BAD_STREAM_CREATION_PARAMS,
			"membership op does not match",
			"op",
			membershipPayload.Membership.GetOp(),
			"expected",
			MembershipOp_SO_JOIN,
		)
	}

	if expectedUserId != nil && membershipPayload.Membership.UserId != *expectedUserId {
		return RiverError(
			Err_BAD_STREAM_CREATION_PARAMS,
			"membership user id does not match",
			"userId",
			membershipPayload.Membership.UserId,
			"expected",
			*expectedUserId,
		)
	}

	return nil
}

func (ru *csGdmChannelRules) checkGDMPayloads() error {
	// GDMs require 3+ users. The 4 required events are:
	// 1. Inception
	// 2. Join event for creator
	// 3. Invite event for user 2
	// 4. Invite event for user 3
	if len(ru.params.parsedEvents) < 4 {
		return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "gdm channel requires 3+ users")
	}

	// check the first join
	if err := ru.checkGDMPayload(ru.params.parsedEvents[1], &ru.params.creatorUserId); err != nil {
		return err
	}

	// check the rest
	for _, event := range ru.params.parsedEvents[2:] {
		if err := ru.checkGDMPayload(event, nil); err != nil {
			return err
		}
	}
	return nil
}

func (ru *csGdmChannelRules) getGDMUserIds() []string {
	userIds := make([]string, 0, len(ru.params.parsedEvents)-1)
	for _, event := range ru.params.parsedEvents[1:] {
		payload, ok := event.Event.GetPayload().(*StreamEvent_GdmChannelPayload)
		if !ok {
			continue
		}
		membershipPayload, ok := payload.GdmChannelPayload.GetContent().(*GdmChannelPayload_Membership)
		if !ok {
			continue
		}
		userIds = append(userIds, membershipPayload.Membership.UserId)
	}
	return userIds
}

func (ru *csGdmChannelRules) derivedGDMMembershipEvents() ([]*DerivedEvent, error) {
	userIds := ru.getGDMUserIds()
	derivedEvents := make([]*DerivedEvent, 0, len(userIds))
	for _, userId := range userIds {
		userStreamId, err := shared.UserStreamIdFromId(userId)
		if err != nil {
			return nil, err
		}
		payload := events.Make_UserPayload_Membership(
			MembershipOp_SO_JOIN,
			ru.params.streamId,
			&ru.params.creatorUserId,
		)
		derivedEvents = append(derivedEvents, &DerivedEvent{
			StreamId: userStreamId,
			Payload:  payload,
		})
	}
	return derivedEvents, nil
}
