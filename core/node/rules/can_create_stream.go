package rules

import (
	"bytes"
	"context"
	"fmt"
	"log/slog"

	"github.com/ethereum/go-ethereum/common"
	"github.com/river-build/river/core/node/auth"
	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/config"
	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/node/events"
	. "github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/shared"
)

type csParams struct {
	ctx                 context.Context
	cfg                 *config.StreamConfig
	streamId            shared.StreamId
	parsedEvents        []*events.ParsedEvent
	inceptionPayload    IsInceptionPayload
	creatorAddress      []byte
	creatorUserId       string
	creatorUserStreamId shared.StreamId
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
func CanCreateStream(ctx context.Context, cfg *config.StreamConfig, streamId shared.StreamId, parsedEvents []*events.ParsedEvent) (*CreateStreamRules, error) {
	if len(parsedEvents) == 0 {
		return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, "no events")
	}

	creatorAddress := parsedEvents[0].Event.GetCreatorAddress()
	creatorUserId, err := shared.AddressHex(creatorAddress)
	if err != nil {
		return nil, err
	}
	creatorUserStreamIdStr, err := shared.UserStreamIdFromId(creatorUserId)
	if err != nil {
		return nil, err
	}
	creatorUserStreamId, err := shared.StreamIdFromString(creatorUserStreamIdStr)
	if err != nil {
		return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, "invalid creator user stream id", "err", err)
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

	if !streamId.EqualsBytes(inceptionPayload.GetStreamId()) {
		return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, "stream id in request does not match stream id in inception event", "inceptionStreamId", inceptionPayload.GetStreamId(), "streamId", streamId)
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

func (ru *csParams) canCreateStream() ruleBuilderCS {
	builder := csBuilder(ru.creatorUserStreamId)

	switch inception := ru.inceptionPayload.(type) {

	case *SpacePayload_Inception:
		ru := &csSpaceRules{
			params:    ru,
			inception: inception,
		}
		return builder.
			check(
				ru.params.streamIdFormatIsValid(shared.STREAM_SPACE_PREFIX),
				ru.params.eventCountMatches(2),
				ru.validateSpaceJoinEvent,
			).
			requireChainAuth(ru.getCreateSpaceChainAuth).
			requireDerivedEvent(ru.params.derivedMembershipEvent)

	case *ChannelPayload_Inception:
		ru := &csChannelRules{
			params:    ru,
			inception: inception,
		}
		return builder.
			check(
				ru.params.streamIdFormatIsValid(shared.STREAM_CHANNEL_PREFIX),
				ru.params.eventCountMatches(2),
				ru.validateChannelJoinEvent,
			).
			requireMembership(
				inception.SpaceId,
			).
			requireChainAuth(ru.getCreateChannelChainAuth).
			requireDerivedEvent(
				ru.derivedChannelSpaceParentEvent,
				ru.params.derivedMembershipEvent,
			)

	case *MediaPayload_Inception:
		ru := &csMediaRules{
			params:    ru,
			inception: inception,
		}
		return builder.
			check(
				ru.params.streamIdFormatIsValid(shared.STREAM_MEDIA_PREFIX),
				ru.params.eventCountMatches(1),
				ru.checkMediaInceptionPayload,
			).
			requireMembership(
				inception.ChannelId,
			).
			requireChainAuth(ru.getChainAuthForMediaStream)

	case *DmChannelPayload_Inception:
		ru := &csDmChannelRules{
			params:    ru,
			inception: inception,
		}
		return builder.
			check(
				ru.params.streamIdFormatIsValid(shared.STREAM_DM_CHANNEL_PREFIX),
				ru.params.eventCountMatches(3),
				ru.checkDMInceptionPayload,
			).
			requireUserAddr(ru.inception.SecondPartyAddress).
			requireDerivedEvents(ru.derivedDMMembershipEvents)

	case *GdmChannelPayload_Inception:
		ru := &csGdmChannelRules{
			params:    ru,
			inception: inception,
		}
		return builder.
			check(
				ru.params.streamIdFormatIsValid(shared.STREAM_GDM_CHANNEL_PREFIX),
				ru.params.eventCountGreaterThanOrEqualTo(4),
				ru.checkGDMPayloads,
			).
			requireUser(ru.getGDMUserIds()[1:]...).
			requireDerivedEvents(ru.derivedGDMMembershipEvents)

	case *UserPayload_Inception:
		ru := &csUserRules{
			params:    ru,
			inception: inception,
		}
		return builder.
			check(
				ru.params.streamIdFormatIsValid(shared.STREAM_USER_PREFIX),
				ru.params.eventCountMatches(1),
				ru.params.isUserStreamId,
			)
		// TODO HNT-4630 add chain auth for user stream

	case *UserDeviceKeyPayload_Inception:
		ru := &csUserDeviceKeyRules{
			params:    ru,
			inception: inception,
		}
		return builder.
			check(
				ru.params.streamIdFormatIsValid(shared.STREAM_USER_DEVICE_KEY_PREFIX),
				ru.params.eventCountMatches(1),
				ru.params.isUserStreamId,
			)
		// TODO HNT-4630 add chain auth for user stream

	case *UserSettingsPayload_Inception:
		ru := &csUserSettingsRules{
			params:    ru,
			inception: inception,
		}
		return builder.
			check(
				ru.params.streamIdFormatIsValid(shared.STREAM_USER_SETTINGS_PREFIX),
				ru.params.eventCountMatches(1),
				ru.params.isUserStreamId,
			)
		// TODO HNT-4630 add chain auth for user stream

	case *UserInboxPayload_Inception:
		ru := &csUserInboxRules{
			params:    ru,
			inception: inception,
		}
		return builder.
			check(
				ru.params.streamIdFormatIsValid(shared.STREAM_USER_INBOX_PREFIX),
				ru.params.eventCountMatches(1),
				ru.params.isUserStreamId,
			)
		// TODO HNT-4630 add chain auth for user stream

	default:
		return builder.fail(unknownPayloadType(inception))
	}
}

func (ru *csParams) streamIdFormatIsValid(expectedPrefix string) func() error {
	return func() error {
		if shared.IsValidIdForPrefix(ru.streamId.String(), expectedPrefix) {
			return nil
		} else {
			return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "invalid stream id", "streamId", ru.streamId)
		}
	}
}
func (ru *csParams) isUserStreamId() error {
	addressInName, err := shared.GetUserAddressFromStreamId(ru.streamId.String())
	if err != nil {
		return err
	}

	// TODO: there is also ru.creatorAddress, should it be used here?
	creatorAddress := common.BytesToAddress(ru.parsedEvents[0].Event.GetCreatorAddress())

	if addressInName != creatorAddress {
		return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "stream id doesn't match creator address", "streamId", ru.streamId, "addressInName", addressInName, "creator", creatorAddress)
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
	payload := event.Event.GetMemberPayload()
	if payload == nil {
		return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "second event is not a channel payload")
	}
	membershipPayload := payload.GetMembership()
	if membershipPayload == nil {
		return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "second event is not a channel join event")
	}
	return ru.params.validateOwnJoinEventPayload(event, membershipPayload)

}

func (ru *csSpaceRules) validateSpaceJoinEvent() error {
	joinEventIndex := 1
	event := ru.params.parsedEvents[joinEventIndex]
	payload := event.Event.GetMemberPayload()
	if payload == nil {
		return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "second event is not a channel payload")
	}
	membershipPayload := payload.GetMembership()
	if membershipPayload == nil {
		return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "second event is not a channel join event")
	}
	return ru.params.validateOwnJoinEventPayload(event, membershipPayload)
}

func (ru *csParams) validateOwnJoinEventPayload(event *events.ParsedEvent, membership *MemberPayload_Membership) error {
	creatorAddress := event.Event.GetCreatorAddress()
	if membership.GetOp() != MembershipOp_SO_JOIN {
		return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "bad join op", "op", membership.GetOp())
	}
	if !bytes.Equal(membership.UserAddress, creatorAddress) {
		return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "bad join user", "id", membership.UserAddress, "created_by", creatorAddress)
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
		ru.params.streamId.String(),
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
	spaceId, err := shared.StreamIdFromBytes(ru.inception.SpaceId)
	if err != nil {
		return nil, err
	}
	return auth.NewChainAuthArgsForSpace(
		spaceId.String(), // check parent space id
		userId,
		auth.PermissionAddRemoveChannels,
	), nil

}

func (ru *csChannelRules) derivedChannelSpaceParentEvent() (*DerivedEvent, error) {
	channelId, err := shared.StreamIdFromBytes(ru.inception.StreamId)
	if err != nil {
		return nil, err
	}
	spaceId, err := shared.StreamIdFromBytes(ru.inception.SpaceId)
	if err != nil {
		return nil, err
	}

	payload := events.Make_SpacePayload_Channel(
		ChannelOp_CO_CREATED,
		channelId.String(),
		ru.inception.ChannelProperties,
		&EventRef{
			StreamId:  ru.inception.StreamId,
			Hash:      ru.params.parsedEvents[0].Envelope.Hash,
			Signature: ru.params.parsedEvents[0].Envelope.Signature,
		},
		ru.inception.IsDefault,
	)

	return &DerivedEvent{
		StreamId: spaceId,
		Payload:  payload,
	}, nil
}

func (ru *csParams) derivedMembershipEvent() (*DerivedEvent, error) {
	creatorAddress := common.BytesToAddress(ru.parsedEvents[0].Event.GetCreatorAddress())

	creatorUserStreamIdStr, err := shared.UserStreamIdFromAddress(creatorAddress)
	if err != nil {
		return nil, err
	}
	creatorUserStreamId, err := shared.StreamIdFromString(creatorUserStreamIdStr)
	if err != nil {
		return nil, err
	}
	inviterId := creatorAddress.Hex()

	payload := events.Make_UserPayload_Membership(
		MembershipOp_SO_JOIN,
		ru.streamId.String(),
		&inviterId,
	)

	return &DerivedEvent{
		StreamId: creatorUserStreamId,
		Payload:  payload,
	}, nil
}

func (ru *csMediaRules) checkMediaInceptionPayload() error {
	if len(ru.inception.ChannelId) == 0 {
		return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "channel id must not be empty for media stream")
	}
	if ru.inception.ChunkCount > int32(ru.params.cfg.Media.MaxChunkCount) {
		return RiverError(
			Err_BAD_STREAM_CREATION_PARAMS,
			fmt.Sprintf("chunk count must be less than or equal to %d", ru.params.cfg.Media.MaxChunkCount),
		)
	}

	if shared.ValidChannelStreamIdBytes(ru.inception.ChannelId) {
		if ru.inception.SpaceId == nil {
			return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "space id must not be nil for media stream")
		}
		if len(ru.inception.SpaceId) == 0 {
			return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "space id must not be empty for media stream")
		}
		return nil
	} else if shared.ValidDMChannelStreamIdBytes(ru.inception.ChannelId) ||
		shared.ValidGDMChannelStreamIdBytes(ru.inception.ChannelId) {
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

	if shared.ValidChannelStreamIdBytes(ru.inception.ChannelId) {
		if len(ru.inception.SpaceId) == 0 {
			return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, "space id must not be empty for media stream")
		}
		spaceId, err := shared.StreamIdFromBytes(ru.inception.SpaceId)
		if err != nil {
			return nil, err
		}
		channelId, err := shared.StreamIdFromBytes(ru.inception.ChannelId)
		if err != nil {
			return nil, err
		}

		return auth.NewChainAuthArgsForChannel(
			spaceId.String(),
			channelId.String(),
			userId,
			auth.PermissionWrite,
		), nil
	} else {
		return nil, nil
	}

}

func (ru *csDmChannelRules) checkDMInceptionPayload() error {
	if len(ru.inception.FirstPartyAddress) != 20 || len(ru.inception.SecondPartyAddress) != 20 {
		return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "invalid party addresses for dm channel")
	}
	if bytes.Equal(ru.inception.FirstPartyAddress, ru.inception.SecondPartyAddress) {
		return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "user ids must not be the same for dm channel")
	}
	if !bytes.Equal(ru.params.creatorAddress, ru.inception.FirstPartyAddress) {
		return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "creator must be first party for dm channel")
	}
	if !shared.ValidDMChannelStreamIdBetween(ru.params.streamId.String(), ru.inception.FirstPartyAddress, ru.inception.SecondPartyAddress) {
		return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "invalid stream id for dm channel")
	}
	return nil
}

func (ru *csDmChannelRules) derivedDMMembershipEvents() ([]*DerivedEvent, error) {

	firstPartyStreamStr, err := shared.UserStreamIdFromBytes(ru.inception.FirstPartyAddress)
	if err != nil {
		return nil, err
	}
	firstPartyStream, err := shared.StreamIdFromString(firstPartyStreamStr)
	if err != nil {
		return nil, err
	}

	secondPartyStreamStr, err := shared.UserStreamIdFromBytes(ru.inception.SecondPartyAddress)
	if err != nil {
		return nil, err
	}
	secondPartyStream, err := shared.StreamIdFromString(secondPartyStreamStr)
	if err != nil {
		return nil, err
	}

	// first party
	firstPartyPayload := events.Make_UserPayload_Membership(
		MembershipOp_SO_JOIN,
		ru.params.streamId.String(),
		&ru.params.creatorUserId,
	)

	// second party
	secondPartyPayload := events.Make_UserPayload_Membership(
		MembershipOp_SO_JOIN,
		ru.params.streamId.String(),
		&ru.params.creatorUserId,
	)

	// send the first party payload last, so that any failure will be retired by the client
	return []*DerivedEvent{
		{
			StreamId: secondPartyStream,
			Payload:  secondPartyPayload,
		},
		{
			StreamId: firstPartyStream,
			Payload:  firstPartyPayload,
		},
	}, nil
}

func (ru *csGdmChannelRules) checkGDMMemberPayload(event *events.ParsedEvent, expectedUserAddress *[]byte) error {
	payload := event.Event.GetMemberPayload()
	if payload == nil {
		return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "event is not a gdm channel payload")
	}
	membershipPayload := payload.GetMembership()
	if membershipPayload == nil {
		return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "event is not a gdm channel membership event")
	}

	if membershipPayload.GetOp() != MembershipOp_SO_JOIN {
		return RiverError(
			Err_BAD_STREAM_CREATION_PARAMS,
			"membership op does not match",
			"op",
			membershipPayload.GetOp(),
			"expected",
			MembershipOp_SO_JOIN,
		)
	}

	if expectedUserAddress != nil && !bytes.Equal(*expectedUserAddress, membershipPayload.UserAddress) {
		return RiverError(
			Err_BAD_STREAM_CREATION_PARAMS,
			"membership user id does not match",
			"userId",
			membershipPayload.UserAddress,
			"expected",
			*expectedUserAddress,
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
	if err := ru.checkGDMMemberPayload(ru.params.parsedEvents[1], &ru.params.creatorAddress); err != nil {
		return err
	}

	// check the rest
	for _, event := range ru.params.parsedEvents[2:] {
		if err := ru.checkGDMMemberPayload(event, nil); err != nil {
			return err
		}
	}
	return nil
}

func (ru *csGdmChannelRules) getGDMUserIds() []string {
	userIds := make([]string, 0, len(ru.params.parsedEvents)-1)
	for _, event := range ru.params.parsedEvents[1:] {
		payload := event.Event.GetMemberPayload()
		if payload == nil {
			continue
		}
		membershipPayload := payload.GetMembership()
		if membershipPayload == nil {
			continue
		}
		// todo we should remove the conversions here
		userId, err := shared.AddressHex(membershipPayload.UserAddress)
		if err != nil {
			continue
		}
		userIds = append(userIds, userId)
	}
	return userIds
}

func (ru *csGdmChannelRules) derivedGDMMembershipEvents() ([]*DerivedEvent, error) {
	userIds := ru.getGDMUserIds()
	// swap the creator into the last position in the array
	// send the creator's join event last, so that any failure will be retired by the client
	if len(userIds) < 1 {
		return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, "gdm channel requires 3+ users")
	}
	creatorUserId := userIds[0]
	userIds = append(userIds[1:], creatorUserId)
	// create derived events for each user
	derivedEvents := make([]*DerivedEvent, 0, len(userIds))
	for _, userId := range userIds {
		userStreamIdStr, err := shared.UserStreamIdFromId(userId)
		if err != nil {
			return nil, err
		}
		userStreamId, err := shared.StreamIdFromString(userStreamIdStr)
		if err != nil {
			return nil, err
		}
		payload := events.Make_UserPayload_Membership(
			MembershipOp_SO_JOIN,
			ru.params.streamId.String(),
			&ru.params.creatorUserId,
		)
		derivedEvents = append(derivedEvents, &DerivedEvent{
			StreamId: userStreamId,
			Payload:  payload,
		})
	}
	return derivedEvents, nil
}
