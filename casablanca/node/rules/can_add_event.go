package rules

import (
	"context"
	"time"

	"golang.org/x/exp/slog"

	"github.com/river-build/river/auth"
	. "github.com/river-build/river/base"
	"github.com/river-build/river/config"
	"github.com/river-build/river/dlog"
	"github.com/river-build/river/events"
	. "github.com/river-build/river/protocol"
	"github.com/river-build/river/shared"
)

type caeRules struct {
	ctx                context.Context
	cfg                *config.StreamConfig
	validNodeAddresses []string
	currentTime        time.Time
	streamView         events.StreamView
	parsedEvent        *events.ParsedEvent
	membership         *Membership
}

/**
* CanAddEvent
* a pure function with no side effects that returns a boolean value and prerequesits
* for adding an event to a stream.
*
* @return canAddEvent bool // true if the event can be added to the stream, will be false in case of duplictate state
* @return chainAuthArgs *auth.ChainAuthArgs // on chain requirements for adding an event to the stream
* @return requiredParentEvent *RequiredParentEvent // event that must
* @return error // if adding result would result in invalid state
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

	ru := &caeRules{
		ctx:                ctx,
		cfg:                cfg,
		validNodeAddresses: validNodeAddresses,
		currentTime:        currentTime,
		parsedEvent:        parsedEvent,
		streamView:         streamView,
	}
	builder := ru.canAddEvent()
	ru.log().Debug("canAddEvent", "builder", builder)
	return builder.run()
}

func (ru *caeRules) canAddEvent() ruleBuilder {
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
		return builder().
			fail(unknownPayloadType(payload))
	}
}

func (ru *caeRules) canAddChannelPayload(payload *StreamEvent_ChannelPayload) ruleBuilder {
	switch content := payload.ChannelPayload.Content.(type) {
	case *ChannelPayload_Inception_:
		return builder().
			fail(invalidContentType(content))
	case *ChannelPayload_Membership:
		ru.membership = content.Membership
		return builder().
			check(ru.validMembershipTransistionForChannel).
			requireChainAuth(ru.channelMembershipEntitlements).
			requireParentEvent(ru.requireStreamParentMembership)
	case *ChannelPayload_Message:
		return builder().
			check(ru.creatorIsMember).
			requireChainAuth(ru.channelMessageEntitlements)
	default:
		return builder().
			fail(unknownContentType(content))
	}
}

func (ru *caeRules) canAddDmChannelPayload(payload *StreamEvent_DmChannelPayload) ruleBuilder {
	switch content := payload.DmChannelPayload.Content.(type) {
	case *DmChannelPayload_Inception_:
		return builder().
			fail(invalidContentType(content))
	case *DmChannelPayload_Membership:
		ru.membership = content.Membership
		return builder().
			check(ru.validMembershipTransistionForDM)
	case *DmChannelPayload_Message:
		return builder().
			check(ru.creatorIsMember)
	case *DmChannelPayload_DisplayName:
		return builder().
			check(ru.creatorIsMember)
	case *DmChannelPayload_Username:
		return builder().
			check(ru.creatorIsMember)
	default:
		return builder().
			fail(unknownContentType(content))
	}
}

func (ru *caeRules) canAddGdmChannelPayload(payload *StreamEvent_GdmChannelPayload) ruleBuilder {
	switch content := payload.GdmChannelPayload.Content.(type) {
	case *GdmChannelPayload_Inception_:
		return builder().
			fail(invalidContentType(content))
	case *GdmChannelPayload_Membership:
		ru.membership = content.Membership
		return builder().
			check(ru.validMembershipTransistionForGDM)
	case *GdmChannelPayload_Message:
		return builder().
			check(ru.creatorIsMember)
	case *GdmChannelPayload_DisplayName:
		return builder().
			check(ru.creatorIsMember)
	case *GdmChannelPayload_Username:
		return builder().
			check(ru.creatorIsMember)
	case *GdmChannelPayload_ChannelProperties:
		return builder().
			check(ru.creatorIsMember)
	default:
		return builder().
			fail(unknownContentType(content))
	}
}

func (ru *caeRules) canAddSpacePayload(payload *StreamEvent_SpacePayload) ruleBuilder {
	switch content := payload.SpacePayload.Content.(type) {
	case *SpacePayload_Inception_:
		return builder().
			fail(invalidContentType(content))
	case *SpacePayload_Membership:
		ru.membership = content.Membership
		return builder().
			check(ru.validMembershipTransistionForSpace).
			requireChainAuth(ru.spaceMembershipEntitlements)
	case *SpacePayload_Channel_:
		if content.Channel.Op == ChannelOp_CO_UPDATED {
			return builder().
				check(ru.creatorIsMember)
		} else {
			return builder().
				check(ru.creatorIsValidNode)
		}
	case *SpacePayload_Username:
		return builder().
			check(ru.creatorIsMember)
	case *SpacePayload_DisplayName:
		return builder().
			check(ru.creatorIsMember)
	default:
		return builder().
			fail(unknownContentType(content))
	}
}

func (ru *caeRules) canAddUserPayload(payload *StreamEvent_UserPayload) ruleBuilder {
	switch content := payload.UserPayload.Content.(type) {
	case *UserPayload_Inception_:
		return builder().
			fail(invalidContentType(content))

	case *UserPayload_UserMembership_:
		return builder().
			checkOneOf(ru.creatorIsMember, ru.creatorIsValidNode).
			requireParentEvent(ru.parentEventForUserMembership)
	case *UserPayload_UserMembershipAction_:
		return builder().
			check(ru.creatorIsMember).
			requireParentEvent(ru.parentEventForUserMembershipAction)
	default:
		return builder().
			fail(unknownContentType(content))
	}
}

func (ru *caeRules) canAddUserDeviceKeyPayload(payload *StreamEvent_UserDeviceKeyPayload) ruleBuilder {
	switch content := payload.UserDeviceKeyPayload.Content.(type) {
	case *UserDeviceKeyPayload_Inception_:
		return builder().
			fail(invalidContentType(content))
	case *UserDeviceKeyPayload_EncryptionDevice_:
		return builder().
			check(ru.creatorIsMember)
	default:
		return builder().
			fail(unknownContentType(content))
	}
}

func (ru *caeRules) canAddUserSettingsPayload(payload *StreamEvent_UserSettingsPayload) ruleBuilder {
	switch content := payload.UserSettingsPayload.Content.(type) {
	case *UserSettingsPayload_Inception_:
		return builder().
			fail(invalidContentType(content))
	case *UserSettingsPayload_FullyReadMarkers_:
		return builder().
			check(ru.creatorIsMember)
	default:
		return builder().
			fail(unknownContentType(content))
	}
}

func (ru *caeRules) canAddUserInboxPayload(payload *StreamEvent_UserInboxPayload) ruleBuilder {
	switch content := payload.UserInboxPayload.Content.(type) {
	case *UserInboxPayload_Inception_:
		return builder().
			fail(invalidContentType(content))
	case *UserInboxPayload_GroupEncryptionSessions_:
		return builder().
			check(ru.pass)
	case *UserInboxPayload_Ack_:
		return builder().
			check(ru.creatorIsMember)
	default:
		return builder().
			fail(unknownContentType(content))
	}
}

func (ru *caeRules) canAddMediaPayload(payload *StreamEvent_MediaPayload) ruleBuilder {
	switch content := payload.MediaPayload.Content.(type) {
	case *MediaPayload_Inception_:
		return builder().
			fail(invalidContentType(content))
	case *MediaPayload_Chunk_:
		return builder().
			check(ru.canAddMediaChunk)
	default:
		return builder().
			fail(unknownContentType(content))
	}
}

func (ru *caeRules) canAddCommonPayload(payload *StreamEvent_CommonPayload) ruleBuilder {
	switch content := payload.CommonPayload.Content.(type) {
	case *CommonPayload_KeySolicitation_:
		return builder().
			checkOneOf(ru.creatorIsMember, ru.creatorIsInvited)
	case *CommonPayload_KeyFulfillment_:
		return builder().
			checkOneOf(ru.creatorIsMember, ru.creatorIsInvited)
	default:
		return builder().
			fail(unknownContentType(content))
	}
}

func (ru *caeRules) pass() (bool, error) {
	// we probably shouldn't ever have 0 checks... currently this is the case in one place
	return true, nil
}

func (ru *caeRules) creatorIsMember() (bool, error) {
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

func (ru *caeRules) creatorIsInvited() (bool, error) {
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

func (ru *caeRules) validMembershipTransistion() (bool, error) {
	if ru.membership == nil {
		return false, RiverError(Err_INVALID_ARGUMENT, "membership is nil")
	}
	if ru.membership.Op == MembershipOp_SO_UNSPECIFIED {
		return false, RiverError(Err_INVALID_ARGUMENT, "membership op is unspecified")
	}
	currentMembership, err := ru.streamView.(events.JoinableStreamView).GetMembership(ru.membership.UserId)
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

func (ru *caeRules) validMembershipTransistionForSpace() (bool, error) {
	canAdd, err := ru.creatorIsValidNode()
	if !canAdd || err != nil {
		return canAdd, err
	}

	canAdd, err = ru.validMembershipTransistion()
	if !canAdd || err != nil {
		return canAdd, err
	}
	return true, nil
}

func (ru *caeRules) validMembershipTransistionForChannel() (bool, error) {
	canAdd, err := ru.creatorIsValidNode()
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
func (ru *caeRules) validMembershipTransistionForDM() (bool, error) {
	canAdd, err := ru.creatorIsValidNode()
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

	inception, err := ru.streamView.(events.DMChannelStreamView).GetDMChannelInception()
	if err != nil {
		return false, err
	}

	if !ru.isValidNode(ru.membership.InitiatorId) {
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
func (ru *caeRules) validMembershipTransistionForGDM() (bool, error) {
	canAdd, err := ru.creatorIsValidNode()
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
		membership, err := ru.streamView.(events.JoinableStreamView).GetMembership(ru.membership.InitiatorId)
		if err != nil {
			return false, err
		}
		if membership != MembershipOp_SO_JOIN && membership != MembershipOp_SO_INVITE {
			return false, RiverError(Err_PERMISSION_DENIED, "initiator of invite is not a member of GDM", "initiator", ru.membership.InitiatorId, "nodes", ru.validNodeAddresses)
		}
		return true, nil
	case MembershipOp_SO_JOIN:
		// users have to be invited to join
		membership, err := ru.streamView.(events.JoinableStreamView).GetMembership(ru.membership.UserId)
		if err != nil {
			return false, err
		}
		if membership != MembershipOp_SO_INVITE {
			return false, RiverError(Err_PERMISSION_DENIED, "user is not invited to GDM", "user", ru.membership.UserId)
		}
		return true, nil
	case MembershipOp_SO_LEAVE:
		// only members can initiate leave
		membership, err := ru.streamView.(events.JoinableStreamView).GetMembership(ru.membership.InitiatorId)
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

func (ru *caeRules) requireStreamParentMembership() (*RequiredParentEvent, error) {
	if ru.membership == nil {
		return nil, RiverError(Err_INVALID_ARGUMENT, "membership is nil")
	}
	if ru.membership.Op == MembershipOp_SO_LEAVE {
		return nil, nil
	}
	streamParentId := ru.streamView.StreamParentId()
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

// / user membership triggers membership events on space, channel, dm, gdm streams
func (ru *caeRules) parentEventForUserMembership() (*RequiredParentEvent, error) {
	if ru.parsedEvent.Event.GetUserPayload() == nil || ru.parsedEvent.Event.GetUserPayload().GetUserMembership() == nil {
		return nil, RiverError(Err_INVALID_ARGUMENT, "event is not a user membership event")
	}
	userMembership := ru.parsedEvent.Event.GetUserPayload().GetUserMembership()
	creatorId, err := shared.AddressHex(ru.parsedEvent.Event.CreatorAddress)
	if err != nil {
		return nil, err
	}

	userId := shared.GetStreamIdPostfix(ru.streamView.StreamId())
	toStreamId := userMembership.StreamId
	var initiatorId string
	if userMembership.Inviter != nil && ru.isValidNode(creatorId) {
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
func (ru *caeRules) parentEventForUserMembershipAction() (*RequiredParentEvent, error) {
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

func (ru *caeRules) spaceMembershipEntitlements() (*auth.ChainAuthArgs, error) {
	streamId := ru.streamView.StreamId()

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

func (ru *caeRules) channelMembershipEntitlements() (*auth.ChainAuthArgs, error) {
	inception, err := ru.streamView.(events.ChannelStreamView).GetChannelInception()
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
		ru.streamView.StreamId(),
		permissionUser,
		permission,
	)

	return chainAuthArgs, nil
}

func (ru *caeRules) channelMessageEntitlements() (*auth.ChainAuthArgs, error) {
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

func (ru *caeRules) creatorIsValidNode() (bool, error) {
	creatorAddressStr, err := shared.AddressHex(ru.parsedEvent.Event.CreatorAddress)
	if err != nil {
		return false, err
	}
	if !ru.isValidNode(creatorAddressStr) {
		return false, RiverError(Err_UNKNOWN_NODE, "No record for node in validNodeAddresses", "address", creatorAddressStr, "nodes", ru.validNodeAddresses).Func("CheckNodeIsValid")
	}
	return true, nil
}

func (ru *caeRules) getPermissionForMembershipOp() (auth.Permission, string, error) {
	if ru.membership == nil {
		return auth.PermissionUndefined, "", RiverError(Err_INVALID_ARGUMENT, "membership is nil")
	}
	membership := ru.membership
	currentMembership, err := ru.streamView.(events.JoinableStreamView).GetMembership(membership.UserId)
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

func (ru *caeRules) canAddMediaChunk() (bool, error) {
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

func (ru *caeRules) isValidNode(addressOrId string) bool {
	for _, item := range ru.validNodeAddresses {
		if item == addressOrId {
			return true
		}
	}
	return false
}

func (ru *caeRules) log() *slog.Logger {
	return dlog.FromCtx(ru.ctx)
}

func unknownPayloadType(payload any) error {
	return RiverError(Err_INVALID_ARGUMENT, "unknown payload type %T", payload)
}

func unknownContentType(content any) error {
	return RiverError(Err_INVALID_ARGUMENT, "unknown content type %T", content)
}

func invalidContentType(content any) error {
	return RiverError(Err_INVALID_ARGUMENT, "invalid cpmtemt type")
}
