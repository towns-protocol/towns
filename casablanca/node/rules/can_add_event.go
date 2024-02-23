package rules

import (
	"context"
	"time"

	"log/slog"

	"github.com/river-build/river/auth"
	. "github.com/river-build/river/base"
	"github.com/river-build/river/config"
	"github.com/river-build/river/dlog"
	"github.com/river-build/river/events"
	. "github.com/river-build/river/protocol"
	"github.com/river-build/river/shared"
)

type aeRules struct {
	ctx                context.Context
	cfg                *config.StreamConfig
	validNodeAddresses []string
	currentTime        time.Time
	streamView         events.StreamView
	parsedEvent        *events.ParsedEvent
}

type aeMembershipRules struct {
	params     *aeRules
	membership *Membership
}

type aeUserMembershipRules struct {
	params         *aeRules
	userMembership *UserPayload_UserMembership
}

/*
*
* CanAddEvent
* a pure function with no side effects that returns a boolean value and prerequesits
* for adding an event to a stream.
*
  - @return canAddEvent bool // true if the event can be added to the stream, will be false in case of duplictate state
  - @return chainAuthArgs *auth.ChainAuthArgs // on chain requirements for adding an event to the stream
  - @return requiredParentEvent *RequiredParentEvent // event that must exist in the stream before the event can be added
    // required parent events must be replayable - meaning that in the case of a no-op, the can_add_event function should return false, nil, nil, nil to indicate
    // that the event cannot be added to the stream, but there is no error
  - @return error // if adding result would result in invalid state

*
* example valid states:
* (false, nil, nil, nil) // event cannot be added to the stream, but there is no error, state would remain the same
* (false, nil, nil, error) // event cannot be added to the stream, but there is no error, state would remain the same
* (true, nil, nil, nil) // event can be added to the stream
* (true, nil, &IsStreamEvent_Payload, nil) // event can be added after parent event is added or verified
* (true, chainAuthArgs, nil, nil) // event can be added if chainAuthArgs are satisfied
* (true, chainAuthArgs, &IsStreamEvent_Payload, nil) // event can be added if chainAuthArgs are satisfied and parent event is added or verified
*/
func CanAddEvent(ctx context.Context, cfg *config.StreamConfig, validNodeAddresses []string, currentTime time.Time, parsedEvent *events.ParsedEvent, streamView events.StreamView) (bool, *auth.ChainAuthArgs, *RequiredParentEvent, error) {

	// validate that event has required properties
	if parsedEvent.Event.PrevMiniblockHash == nil {
		return false, nil, nil, RiverError(Err_INVALID_ARGUMENT, "event has no prevMiniblockHash")
	}
	// check preceding miniblock hash
	err := streamView.ValidateNextEvent(ctx, &cfg.RecencyConstraints, parsedEvent, currentTime)
	if err != nil {
		return false, nil, nil, err
	}
	// make sure the stream event is of the same type as the inception event
	err = parsedEvent.Event.VerifyPayloadTypeMatchesStreamType(streamView.InceptionPayload())
	if err != nil {
		return false, nil, nil, err
	}

	ru := &aeRules{
		ctx:                ctx,
		cfg:                cfg,
		validNodeAddresses: validNodeAddresses,
		currentTime:        currentTime,
		parsedEvent:        parsedEvent,
		streamView:         streamView,
	}
	builder := ru.canAddEvent()
	ru.log().Debug("CanAddEvent", "builder", builder)
	return builder.run()
}

func (ru *aeRules) canAddEvent() ruleBuilderAE {
	// run checks per payload type
	switch payload := ru.parsedEvent.Event.Payload.(type) {
	case *StreamEvent_ChannelPayload:
		return ru.canAddChannelPayload(payload)
	case *StreamEvent_DmChannelPayload:
		return ru.canAddDmChannelPayload(payload)
	case *StreamEvent_GdmChannelPayload:
		return ru.canAddGdmChannelPayload(payload)
	case *StreamEvent_SpacePayload:
		return ru.canAddSpacePayload(payload)
	case *StreamEvent_UserPayload:
		return ru.canAddUserPayload(payload)
	case *StreamEvent_UserDeviceKeyPayload:
		return ru.canAddUserDeviceKeyPayload(payload)
	case *StreamEvent_UserSettingsPayload:
		return ru.canAddUserSettingsPayload(payload)
	case *StreamEvent_UserInboxPayload:
		return ru.canAddUserInboxPayload(payload)
	case *StreamEvent_MediaPayload:
		return ru.canAddMediaPayload(payload)
	case *StreamEvent_CommonPayload:
		return ru.canAddCommonPayload(payload)
	default:
		return aeBuilder().
			fail(unknownPayloadType(payload))
	}
}

func (ru *aeRules) canAddChannelPayload(payload *StreamEvent_ChannelPayload) ruleBuilderAE {
	switch content := payload.ChannelPayload.Content.(type) {
	case *ChannelPayload_Inception_:
		return aeBuilder().
			fail(invalidContentType(content))
	case *ChannelPayload_Membership:
		uu := &aeMembershipRules{
			params:     ru,
			membership: content.Membership,
		}
		return aeBuilder().
			check(uu.validMembershipTransistionForChannel).
			requireChainAuth(uu.channelMembershipEntitlements).
			requireParentEvent(uu.requireStreamParentMembership)
	case *ChannelPayload_Message:
		return aeBuilder().
			check(ru.creatorIsMember).
			requireChainAuth(ru.channelMessageEntitlements)
	default:
		return aeBuilder().
			fail(unknownContentType(content))
	}
}

func (ru *aeRules) canAddDmChannelPayload(payload *StreamEvent_DmChannelPayload) ruleBuilderAE {
	switch content := payload.DmChannelPayload.Content.(type) {
	case *DmChannelPayload_Inception_:
		return aeBuilder().
			fail(invalidContentType(content))
	case *DmChannelPayload_Membership:
		uu := &aeMembershipRules{
			params:     ru,
			membership: content.Membership,
		}
		return aeBuilder().
			check(uu.validMembershipTransistionForDM)
	case *DmChannelPayload_Message:
		return aeBuilder().
			check(ru.creatorIsMember)
	case *DmChannelPayload_DisplayName:
		return aeBuilder().
			check(ru.creatorIsMember)
	case *DmChannelPayload_Username:
		return aeBuilder().
			check(ru.creatorIsMember)
	default:
		return aeBuilder().
			fail(unknownContentType(content))
	}
}

func (ru *aeRules) canAddGdmChannelPayload(payload *StreamEvent_GdmChannelPayload) ruleBuilderAE {
	switch content := payload.GdmChannelPayload.Content.(type) {
	case *GdmChannelPayload_Inception_:
		return aeBuilder().
			fail(invalidContentType(content))
	case *GdmChannelPayload_Membership:
		uu := &aeMembershipRules{
			params:     ru,
			membership: content.Membership,
		}
		return aeBuilder().
			check(uu.validMembershipTransistionForGDM)
	case *GdmChannelPayload_Message:
		return aeBuilder().
			check(ru.creatorIsMember)
	case *GdmChannelPayload_DisplayName:
		return aeBuilder().
			check(ru.creatorIsMember)
	case *GdmChannelPayload_Username:
		return aeBuilder().
			check(ru.creatorIsMember)
	case *GdmChannelPayload_ChannelProperties:
		return aeBuilder().
			check(ru.creatorIsMember)
	default:
		return aeBuilder().
			fail(unknownContentType(content))
	}
}

func (ru *aeRules) canAddSpacePayload(payload *StreamEvent_SpacePayload) ruleBuilderAE {
	switch content := payload.SpacePayload.Content.(type) {
	case *SpacePayload_Inception_:
		return aeBuilder().
			fail(invalidContentType(content))
	case *SpacePayload_Membership:
		uu := &aeMembershipRules{
			params:     ru,
			membership: content.Membership,
		}
		return aeBuilder().
			check(uu.validMembershipTransistionForSpace).
			requireChainAuth(uu.spaceMembershipEntitlements)
	case *SpacePayload_Channel_:
		if content.Channel.Op == ChannelOp_CO_UPDATED {
			return aeBuilder().
				check(ru.creatorIsMember)
		} else {
			return aeBuilder().
				check(ru.creatorIsValidNode).
				check(ru.validSpaceChannelOp)
		}
	case *SpacePayload_Username:
		return aeBuilder().
			check(ru.creatorIsMember)
	case *SpacePayload_DisplayName:
		return aeBuilder().
			check(ru.creatorIsMember)
	default:
		return aeBuilder().
			fail(unknownContentType(content))
	}
}

func (ru *aeRules) canAddUserPayload(payload *StreamEvent_UserPayload) ruleBuilderAE {
	switch content := payload.UserPayload.Content.(type) {
	case *UserPayload_Inception_:
		return aeBuilder().
			fail(invalidContentType(content))

	case *UserPayload_UserMembership_:
		uu := &aeUserMembershipRules{
			params:         ru,
			userMembership: content.UserMembership,
		}
		return aeBuilder().
			checkOneOf(ru.creatorIsMember, ru.creatorIsValidNode).
			check(uu.validUserMembershipTransistion).
			requireParentEvent(uu.parentEventForUserMembership)
	case *UserPayload_UserMembershipAction_:
		return aeBuilder().
			check(ru.creatorIsMember).
			requireParentEvent(ru.parentEventForUserMembershipAction)
	default:
		return aeBuilder().
			fail(unknownContentType(content))
	}
}

func (ru *aeRules) canAddUserDeviceKeyPayload(payload *StreamEvent_UserDeviceKeyPayload) ruleBuilderAE {
	switch content := payload.UserDeviceKeyPayload.Content.(type) {
	case *UserDeviceKeyPayload_Inception_:
		return aeBuilder().
			fail(invalidContentType(content))
	case *UserDeviceKeyPayload_EncryptionDevice_:
		return aeBuilder().
			check(ru.creatorIsMember)
	default:
		return aeBuilder().
			fail(unknownContentType(content))
	}
}

func (ru *aeRules) canAddUserSettingsPayload(payload *StreamEvent_UserSettingsPayload) ruleBuilderAE {
	switch content := payload.UserSettingsPayload.Content.(type) {
	case *UserSettingsPayload_Inception_:
		return aeBuilder().
			fail(invalidContentType(content))
	case *UserSettingsPayload_FullyReadMarkers_:
		return aeBuilder().
			check(ru.creatorIsMember)
	default:
		return aeBuilder().
			fail(unknownContentType(content))
	}
}

func (ru *aeRules) canAddUserInboxPayload(payload *StreamEvent_UserInboxPayload) ruleBuilderAE {
	switch content := payload.UserInboxPayload.Content.(type) {
	case *UserInboxPayload_Inception_:
		return aeBuilder().
			fail(invalidContentType(content))
	case *UserInboxPayload_GroupEncryptionSessions_:
		return aeBuilder().
			check(ru.pass)
	case *UserInboxPayload_Ack_:
		return aeBuilder().
			check(ru.creatorIsMember)
	default:
		return aeBuilder().
			fail(unknownContentType(content))
	}
}

func (ru *aeRules) canAddMediaPayload(payload *StreamEvent_MediaPayload) ruleBuilderAE {
	switch content := payload.MediaPayload.Content.(type) {
	case *MediaPayload_Inception_:
		return aeBuilder().
			fail(invalidContentType(content))
	case *MediaPayload_Chunk_:
		return aeBuilder().
			check(ru.canAddMediaChunk)
	default:
		return aeBuilder().
			fail(unknownContentType(content))
	}
}

func (ru *aeRules) canAddCommonPayload(payload *StreamEvent_CommonPayload) ruleBuilderAE {
	switch content := payload.CommonPayload.Content.(type) {
	case *CommonPayload_KeySolicitation_:
		return aeBuilder().
			checkOneOf(ru.creatorIsMember, ru.creatorIsInvited)
	case *CommonPayload_KeyFulfillment_:
		return aeBuilder().
			checkOneOf(ru.creatorIsMember, ru.creatorIsInvited)
	default:
		return aeBuilder().
			fail(unknownContentType(content))
	}
}

func (ru *aeRules) pass() (bool, error) {
	// we probably shouldn't ever have 0 checks... currently this is the case in one place
	return true, nil
}

func (ru *aeRules) creatorIsMember() (bool, error) {
	creatorId, err := shared.AddressHex(ru.parsedEvent.Event.CreatorAddress)
	if err != nil {
		return false, err
	}
	isMember, err := ru.streamView.IsMember(creatorId)
	if err != nil {
		return false, err
	}
	if !isMember {
		return false, RiverError(Err_PERMISSION_DENIED, "creator is not a member of the stream", "creatorId", creatorId)
	}
	return true, nil
}

func (ru *aeRules) creatorIsInvited() (bool, error) {
	userId, err := shared.AddressHex(ru.parsedEvent.Event.CreatorAddress)
	if err != nil {
		return false, err
	}
	membership, err := ru.streamView.(events.JoinableStreamView).GetMembership(userId)
	if err != nil {
		return false, err
	}
	if membership != MembershipOp_SO_INVITE {
		return false, nil
	}
	return true, nil
}

func (ru *aeMembershipRules) validMembershipTransistion() (bool, error) {
	if ru.membership == nil {
		return false, RiverError(Err_INVALID_ARGUMENT, "membership is nil")
	}
	if ru.membership.Op == MembershipOp_SO_UNSPECIFIED {
		return false, RiverError(Err_INVALID_ARGUMENT, "membership op is unspecified")
	}
	currentMembership, err := ru.params.streamView.(events.JoinableStreamView).GetMembership(ru.membership.UserId)
	if err != nil {
		return false, err
	}
	if currentMembership == ru.membership.Op {
		return false, nil
	}

	switch currentMembership {
	case MembershipOp_SO_INVITE:
		// from invite only join and leave are valid
		return true, nil
	case MembershipOp_SO_JOIN:
		// from join only leave is valid
		if ru.membership.Op == MembershipOp_SO_LEAVE {
			return true, nil
		} else {
			return false, RiverError(Err_PERMISSION_DENIED, "only leave is valid from join", "op", ru.membership.Op)
		}
	case MembershipOp_SO_LEAVE:
		// from leave, invite and join are valid
		return true, nil
	case MembershipOp_SO_UNSPECIFIED:
		// from unspecified, leave would be a no op, join and invite are valid
		if ru.membership.Op == MembershipOp_SO_LEAVE {
			return false, nil
		} else {
			return true, nil
		}
	default:
		return false, RiverError(Err_BAD_EVENT, "invalid current membership", "op", currentMembership)
	}
}

func (ru *aeMembershipRules) validMembershipTransistionForSpace() (bool, error) {
	canAdd, err := ru.params.creatorIsValidNode()
	if !canAdd || err != nil {
		return canAdd, err
	}

	canAdd, err = ru.validMembershipTransistion()
	if !canAdd || err != nil {
		return canAdd, err
	}
	return true, nil
}

func (ru *aeMembershipRules) validMembershipTransistionForChannel() (bool, error) {
	canAdd, err := ru.params.creatorIsValidNode()
	if !canAdd || err != nil {
		return canAdd, err
	}

	canAdd, err = ru.validMembershipTransistion()
	if !canAdd || err != nil {
		return canAdd, err
	}
	return true, nil
}

// / GDMs and DMs don't have blockchain entitlements so we need to run extra checks
func (ru *aeMembershipRules) validMembershipTransistionForDM() (bool, error) {
	canAdd, err := ru.params.creatorIsValidNode()
	if !canAdd || err != nil {
		return canAdd, err
	}

	canAdd, err = ru.validMembershipTransistion()
	if !canAdd || err != nil {
		return canAdd, err
	}

	if ru.membership == nil {
		return false, RiverError(Err_INVALID_ARGUMENT, "membership is nil")
	}

	inception, err := ru.params.streamView.(events.DMChannelStreamView).GetDMChannelInception()
	if err != nil {
		return false, err
	}

	if !ru.params.isValidNode(ru.membership.InitiatorId) {
		if ru.membership.InitiatorId != inception.FirstPartyId && ru.membership.InitiatorId != inception.SecondPartyId {
			return false, RiverError(Err_PERMISSION_DENIED, "initiator is not a member of DM", "initiator", ru.membership.InitiatorId)
		}
	}

	if ru.membership.UserId != inception.FirstPartyId && ru.membership.UserId != inception.SecondPartyId {
		return false, RiverError(Err_PERMISSION_DENIED, "user is not a member of DM", "user", ru.membership.UserId)
	}

	if ru.membership.Op != MembershipOp_SO_LEAVE && ru.membership.Op != MembershipOp_SO_JOIN {
		return false, RiverError(Err_PERMISSION_DENIED, "only join and leave events are permitted")
	}
	return true, nil
}

// / GDMs and DMs don't have blockchain entitlements so we need to run extra checks
func (ru *aeMembershipRules) validMembershipTransistionForGDM() (bool, error) {
	canAdd, err := ru.params.creatorIsValidNode()
	if !canAdd || err != nil {
		return canAdd, err
	}

	canAdd, err = ru.validMembershipTransistion()
	if !canAdd || err != nil {
		return canAdd, err
	}

	if ru.membership == nil {
		return false, RiverError(Err_INVALID_ARGUMENT, "membership is nil")
	}

	switch ru.membership.Op {
	case MembershipOp_SO_INVITE:
		// only members can invite (also for some reason invited can invite)
		membership, err := ru.params.streamView.(events.JoinableStreamView).GetMembership(ru.membership.InitiatorId)
		if err != nil {
			return false, err
		}
		if membership != MembershipOp_SO_JOIN && membership != MembershipOp_SO_INVITE {
			return false, RiverError(Err_PERMISSION_DENIED, "initiator of invite is not a member of GDM", "initiator", ru.membership.InitiatorId, "nodes", ru.params.validNodeAddresses)
		}
		return true, nil
	case MembershipOp_SO_JOIN:
		// users have to be invited to join
		membership, err := ru.params.streamView.(events.JoinableStreamView).GetMembership(ru.membership.UserId)
		if err != nil {
			return false, err
		}
		if membership != MembershipOp_SO_INVITE {
			return false, RiverError(Err_PERMISSION_DENIED, "user is not invited to GDM", "user", ru.membership.UserId)
		}
		return true, nil
	case MembershipOp_SO_LEAVE:
		// only members can initiate leave
		membership, err := ru.params.streamView.(events.JoinableStreamView).GetMembership(ru.membership.InitiatorId)
		if err != nil {
			return false, err
		}
		if membership != MembershipOp_SO_JOIN && membership != MembershipOp_SO_INVITE {
			return false, RiverError(Err_PERMISSION_DENIED, "initiator of leave is not a member of GDM", "initiator", ru.membership.InitiatorId)
		}
		return true, nil
	case MembershipOp_SO_UNSPECIFIED:
		return false, RiverError(Err_INVALID_ARGUMENT, "membership op is unspecified")
	default:
		return false, RiverError(Err_PERMISSION_DENIED, "unknown membership event", "op", ru.membership.Op)
	}

}

func (ru *aeMembershipRules) requireStreamParentMembership() (*RequiredParentEvent, error) {
	if ru.membership == nil {
		return nil, RiverError(Err_INVALID_ARGUMENT, "membership is nil")
	}
	if ru.membership.Op == MembershipOp_SO_LEAVE {
		return nil, nil
	}
	streamParentId := ru.params.streamView.StreamParentId()
	if streamParentId == nil {
		return nil, nil
	}
	userStreamId, err := shared.UserStreamIdFromId(ru.membership.UserId)
	if err != nil {
		return nil, err
	}
	// for joins and invites, require space membership
	return &RequiredParentEvent{
		Payload:  events.Make_UserPayload_Membership(MembershipOp_SO_JOIN, *streamParentId, &ru.membership.InitiatorId),
		StreamId: userStreamId,
	}, nil
}

func (uu *aeUserMembershipRules) validUserMembershipTransistion() (bool, error) {
	if uu.userMembership == nil {
		return false, RiverError(Err_INVALID_ARGUMENT, "membership is nil")
	}
	if uu.userMembership.Op == MembershipOp_SO_UNSPECIFIED {
		return false, RiverError(Err_INVALID_ARGUMENT, "membership op is unspecified")
	}
	currentMembershipOp, err := uu.params.streamView.(events.UserStreamView).GetUserMembership(uu.userMembership.StreamId)
	if err != nil {
		return false, err
	}

	if currentMembershipOp == uu.userMembership.Op {
		return false, nil
	}

	switch currentMembershipOp {
	case MembershipOp_SO_INVITE:
		// from invite only join and leave are valid
		return true, nil
	case MembershipOp_SO_JOIN:
		// from join only leave is valid
		if uu.userMembership.Op == MembershipOp_SO_LEAVE {
			return true, nil
		} else {
			return false, RiverError(Err_PERMISSION_DENIED, "only leave is valid from join", "op", uu.userMembership.Op)
		}
	case MembershipOp_SO_LEAVE:
		// from leave, invite and join are valid
		return true, nil
	case MembershipOp_SO_UNSPECIFIED:
		// from unspecified, leave would be a no op, join and invite are valid
		if uu.userMembership.Op == MembershipOp_SO_LEAVE {
			return false, nil
		} else {
			return true, nil
		}
	default:
		return false, RiverError(Err_BAD_EVENT, "invalid current membership", "op", currentMembershipOp)
	}

}

// / user membership triggers membership events on space, channel, dm, gdm streams
func (ru *aeUserMembershipRules) parentEventForUserMembership() (*RequiredParentEvent, error) {
	if ru.userMembership == nil {
		return nil, RiverError(Err_INVALID_ARGUMENT, "event is not a user membership event")
	}
	userMembership := ru.userMembership
	creatorId, err := shared.AddressHex(ru.params.parsedEvent.Event.CreatorAddress)
	if err != nil {
		return nil, err
	}

	userId := shared.GetStreamIdPostfix(ru.params.streamView.StreamId())
	toStreamId := userMembership.StreamId
	var initiatorId string
	if userMembership.Inviter != nil && ru.params.isValidNode(creatorId) {
		// the initiator will need permissions to do specific things
		// if the creator of this payload was a valid node, trust that the inviter was the initiator
		initiatorId = *userMembership.Inviter
	} else {
		// otherwise the initiator is the creator of the event
		initiatorId = creatorId
	}

	if shared.ValidSpaceStreamId(toStreamId) {
		return &RequiredParentEvent{
			Payload:  events.Make_SpacePayload_Membership(userMembership.Op, userId, initiatorId),
			StreamId: toStreamId,
		}, nil
	} else if shared.ValidChannelStreamId(toStreamId) {
		return &RequiredParentEvent{
			Payload:  events.Make_ChannelPayload_Membership(userMembership.Op, userId, initiatorId),
			StreamId: toStreamId,
		}, nil
	} else if shared.ValidDMChannelStreamId(toStreamId) {
		return &RequiredParentEvent{
			Payload:  events.Make_DmChannelPayload_Membership(userMembership.Op, userId, initiatorId),
			StreamId: toStreamId,
		}, nil
	} else if shared.ValidGDMChannelStreamId(toStreamId) {
		return &RequiredParentEvent{
			Payload:  events.Make_GdmChannelPayload_Membership(userMembership.Op, userId, initiatorId),
			StreamId: toStreamId,
		}, nil
	}
	return nil, RiverError(Err_INVALID_ARGUMENT, "invalid stream id for user membership op", "streamId", toStreamId)
}

// / user actions perform user membership events on other user's streams
func (ru *aeRules) parentEventForUserMembershipAction() (*RequiredParentEvent, error) {
	if ru.parsedEvent.Event.GetUserPayload() == nil || ru.parsedEvent.Event.GetUserPayload().GetUserMembershipAction() == nil {
		return nil, RiverError(Err_INVALID_ARGUMENT, "event is not a user membership action event")
	}
	action := ru.parsedEvent.Event.GetUserPayload().GetUserMembershipAction()
	inviterId, err := shared.AddressHex(ru.parsedEvent.Event.CreatorAddress)
	if err != nil {
		return nil, err
	}
	payload := events.Make_UserPayload_Membership(action.Op, action.StreamId, &inviterId)
	streamId, err := shared.UserStreamIdFromId(action.UserId)
	if err != nil {
		return nil, err
	}
	return &RequiredParentEvent{
		Payload:  payload,
		StreamId: streamId,
	}, nil
}

func (ru *aeMembershipRules) spaceMembershipEntitlements() (*auth.ChainAuthArgs, error) {
	streamId := ru.params.streamView.StreamId()

	permission, permissionUser, err := ru.getPermissionForMembershipOp()
	if err != nil {
		return nil, err
	}

	if permission == auth.PermissionUndefined {
		return nil, nil
	}

	chainAuthArgs := auth.NewChainAuthArgsForSpace(
		streamId,
		permissionUser,
		permission,
	)
	return chainAuthArgs, nil
}

func (ru *aeMembershipRules) channelMembershipEntitlements() (*auth.ChainAuthArgs, error) {
	inception, err := ru.params.streamView.(events.ChannelStreamView).GetChannelInception()
	if err != nil {
		return nil, err
	}

	permission, permissionUser, err := ru.getPermissionForMembershipOp()
	if err != nil {
		return nil, err
	}

	if permission == auth.PermissionUndefined {
		return nil, nil
	}

	chainAuthArgs := auth.NewChainAuthArgsForChannel(
		inception.SpaceId,
		ru.params.streamView.StreamId(),
		permissionUser,
		permission,
	)

	return chainAuthArgs, nil
}

func (ru *aeRules) channelMessageEntitlements() (*auth.ChainAuthArgs, error) {
	userId, err := shared.AddressHex(ru.parsedEvent.Event.CreatorAddress)
	if err != nil {
		return nil, err
	}

	inception, err := ru.streamView.(events.ChannelStreamView).GetChannelInception()
	if err != nil {
		return nil, err
	}

	chainAuthArgs := auth.NewChainAuthArgsForChannel(
		inception.SpaceId,
		ru.streamView.StreamId(),
		userId,
		auth.PermissionWrite,
	)

	return chainAuthArgs, nil
}

func (ru *aeRules) creatorIsValidNode() (bool, error) {
	creatorAddressStr, err := shared.AddressHex(ru.parsedEvent.Event.CreatorAddress)
	if err != nil {
		return false, err
	}
	if !ru.isValidNode(creatorAddressStr) {
		return false, RiverError(Err_UNKNOWN_NODE, "No record for node in validNodeAddresses", "address", creatorAddressStr, "nodes", ru.validNodeAddresses).Func("CheckNodeIsValid")
	}
	return true, nil
}

func (ru *aeMembershipRules) getPermissionForMembershipOp() (auth.Permission, string, error) {
	if ru.membership == nil {
		return auth.PermissionUndefined, "", RiverError(Err_INVALID_ARGUMENT, "membership is nil")
	}
	membership := ru.membership
	currentMembership, err := ru.params.streamView.(events.JoinableStreamView).GetMembership(membership.UserId)
	if err != nil {
		return auth.PermissionUndefined, "", err
	}
	if membership.Op == currentMembership {
		panic("membershipOp should not be the same as currentMembership")
	}
	switch membership.Op {
	case MembershipOp_SO_INVITE:
		if currentMembership == MembershipOp_SO_JOIN {
			return auth.PermissionUndefined, "", RiverError(Err_FAILED_PRECONDITION, "user is already a member of the channel", "user", membership.UserId, "initiator", membership.InitiatorId)
		}
		return auth.PermissionInvite, membership.InitiatorId, nil

	case MembershipOp_SO_JOIN:
		return auth.PermissionRead, membership.UserId, nil

	case MembershipOp_SO_LEAVE:
		if currentMembership != MembershipOp_SO_JOIN {
			return auth.PermissionUndefined, "", RiverError(Err_FAILED_PRECONDITION, "user is not a member of the channel", "user", membership.UserId, "initiator", membership.InitiatorId)
		}
		if membership.UserId != membership.InitiatorId {
			// if the user is not the creator, then the user must be an admin
			return auth.PermissionOwner, membership.InitiatorId, nil
		} else {
			return auth.PermissionUndefined, membership.UserId, nil
		}

	case MembershipOp_SO_UNSPECIFIED:
		fallthrough

	default:
		return auth.PermissionUndefined, "", RiverError(Err_BAD_EVENT, "Need valid membership op", "op", membership.Op)
	}
}

func (ru *aeRules) validSpaceChannelOp() (bool, error) {
	if ru.parsedEvent.Event.GetSpacePayload() == nil {
		return false, RiverError(Err_INVALID_ARGUMENT, "event is not a channel event")
	}
	if ru.parsedEvent.Event.GetSpacePayload().GetChannel() == nil {
		return false, RiverError(Err_INVALID_ARGUMENT, "event is not a channel event")
	}
	next := ru.parsedEvent.Event.GetSpacePayload().GetChannel()
	view := ru.streamView.(events.SpaceStreamView)
	current, err := view.GetChannelInfo(next.ChannelId)
	if err != nil {
		return false, err
	}
	// if we don't have a channel, accept add
	if current == nil {
		return next.Op == ChannelOp_CO_CREATED, nil
	}

	if current.Op == ChannelOp_CO_DELETED {
		return false, RiverError(Err_PERMISSION_DENIED, "channel is deleted", "channelId", next.ChannelId)
	}

	if next.Op == ChannelOp_CO_CREATED {
		// this channel is already created, we can't create it again, but it's not an error, this event is a no-op
		return false, nil
	}

	return true, nil
}

func (ru *aeRules) canAddMediaChunk() (bool, error) {
	canAdd, err := ru.creatorIsMember()
	if !canAdd || err != nil {
		return canAdd, err
	}

	if ru.parsedEvent.Event.GetMediaPayload() == nil || ru.parsedEvent.Event.GetMediaPayload().GetChunk() == nil {
		return false, RiverError(Err_INVALID_ARGUMENT, "event is not a media chunk event")
	}
	chunk := ru.parsedEvent.Event.GetMediaPayload().GetChunk()

	inception, err := ru.streamView.(events.MediaStreamView).GetMediaInception()
	if err != nil {
		return false, err
	}

	if chunk.ChunkIndex >= inception.ChunkCount || chunk.ChunkIndex < 0 {
		return false, RiverError(Err_INVALID_ARGUMENT, "chunk index out of bounds")
	}

	if len(chunk.Data) > ru.cfg.Media.MaxChunkSize {
		return false, RiverError(
			Err_INVALID_ARGUMENT,
			"chunk size must be less than or equal to",
			"cfg.Media.MaxChunkSize",
			ru.cfg.Media.MaxChunkSize)

	}

	return true, nil
}

func (ru *aeRules) isValidNode(addressOrId string) bool {
	for _, item := range ru.validNodeAddresses {
		if item == addressOrId {
			return true
		}
	}
	return false
}

func (ru *aeRules) log() *slog.Logger {
	return dlog.FromCtx(ru.ctx)
}
