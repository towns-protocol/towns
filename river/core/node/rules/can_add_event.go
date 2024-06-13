package rules

import (
	"bytes"
	"context"
	"log/slog"
	"slices"
	"time"

	"github.com/river-build/river/core/node/crypto"

	"github.com/ethereum/go-ethereum/common"
	"github.com/river-build/river/core/node/auth"
	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/node/events"
	. "github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/shared"
)

type aeParams struct {
	ctx                   context.Context
	cfg                   crypto.OnChainConfiguration
	mediaMaxChunkSize     int
	streamMembershipLimit int
	validNodeAddresses    []common.Address
	currentTime           time.Time
	streamView            events.StreamView
	parsedEvent           *events.ParsedEvent
}

type aeMembershipRules struct {
	params     *aeParams
	membership *MemberPayload_Membership
}

type aeUserMembershipRules struct {
	params         *aeParams
	userMembership *UserPayload_UserMembership
}

type aeUserMembershipActionRules struct {
	params *aeParams
	action *UserPayload_UserMembershipAction
}

type aeSpaceChannelRules struct {
	params        *aeParams
	channelUpdate *SpacePayload_ChannelUpdate
}

type aeMediaPayloadChunkRules struct {
	params *aeParams
	chunk  *MediaPayload_Chunk
}

type aeEnsAddressRules struct {
	params  *aeParams
	address *MemberPayload_EnsAddress
}

type aeNftRules struct {
	params *aeParams
	nft    *MemberPayload_Nft
}

type aeKeySolicitationRules struct {
	params       *aeParams
	solicitation *MemberPayload_KeySolicitation
}

type aeKeyFulfillmentRules struct {
	params      *aeParams
	fulfillment *MemberPayload_KeyFulfillment
}

/*
*
* CanAddEvent
* a pure function with no side effects that returns a boolean value and prerequesits
* for adding an event to a stream.
*

  - @return canAddEvent bool // true if the event can be added to the stream, will be false in case of duplictate state

  - @return chainAuthArgs *auth.ChainAuthArgs // on chain requirements for adding an event to the stream

  - @return sideEffects *AddEventSideEffects // side effects that need to be executed before adding the event to the stream or on failures

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
func CanAddEvent(
	ctx context.Context,
	chainConfig crypto.OnChainConfiguration,
	validNodeAddresses []common.Address,
	currentTime time.Time,
	parsedEvent *events.ParsedEvent,
	streamView events.StreamView,
) (bool, *auth.ChainAuthArgs, *AddEventSideEffects, error) {
	if parsedEvent.Event.DelegateExpiryEpochMs > 0 &&
		isPastExpiry(currentTime, parsedEvent.Event.DelegateExpiryEpochMs) {
		return false, nil, nil, RiverError(
			Err_PERMISSION_DENIED,
			"event delegate has expired",
			"currentTime",
			currentTime,
			"expiryTime",
			parsedEvent.Event.DelegateExpiryEpochMs,
		)
	}

	// validate that event has required properties
	if parsedEvent.Event.PrevMiniblockHash == nil {
		return false, nil, nil, RiverError(Err_INVALID_ARGUMENT, "event has no prevMiniblockHash")
	}
	// check preceding miniblock hash
	err := streamView.ValidateNextEvent(ctx, chainConfig, parsedEvent, currentTime)
	if err != nil {
		return false, nil, nil, err
	}
	// make sure the stream event is of the same type as the inception event
	err = parsedEvent.Event.VerifyPayloadTypeMatchesStreamType(streamView.InceptionPayload())
	if err != nil {
		return false, nil, nil, err
	}

	mediaMaxChunkSize, err := chainConfig.GetInt(crypto.StreamMediaMaxChunkSizeConfigKey)
	if err != nil {
		return false, nil, nil, err
	}

	streamMembershipLimit, err := chainConfig.GetStreamMembershipLimit(streamView.StreamId().Type())
	if err != nil {
		return false, nil, nil, err
	}

	ru := &aeParams{
		ctx:                   ctx,
		cfg:                   chainConfig,
		mediaMaxChunkSize:     mediaMaxChunkSize,
		streamMembershipLimit: streamMembershipLimit,
		validNodeAddresses:    validNodeAddresses,
		currentTime:           currentTime,
		parsedEvent:           parsedEvent,
		streamView:            streamView,
	}
	builder := ru.canAddEvent()
	ru.log().Debug("CanAddEvent", "builder", builder)
	return builder.run()
}

func (params *aeParams) canAddEvent() ruleBuilderAE {
	// run checks per payload type
	switch payload := params.parsedEvent.Event.Payload.(type) {
	case *StreamEvent_ChannelPayload:
		return params.canAddChannelPayload(payload)
	case *StreamEvent_DmChannelPayload:
		return params.canAddDmChannelPayload(payload)
	case *StreamEvent_GdmChannelPayload:
		return params.canAddGdmChannelPayload(payload)
	case *StreamEvent_SpacePayload:
		return params.canAddSpacePayload(payload)
	case *StreamEvent_UserPayload:
		return params.canAddUserPayload(payload)
	case *StreamEvent_UserDeviceKeyPayload:
		return params.canAddUserDeviceKeyPayload(payload)
	case *StreamEvent_UserSettingsPayload:
		return params.canAddUserSettingsPayload(payload)
	case *StreamEvent_UserInboxPayload:
		return params.canAddUserInboxPayload(payload)
	case *StreamEvent_MediaPayload:
		return params.canAddMediaPayload(payload)
	case *StreamEvent_MemberPayload:
		return params.canAddMemberPayload(payload)
	default:
		return aeBuilder().
			fail(unknownPayloadType(payload))
	}
}

func (params *aeParams) canAddChannelPayload(payload *StreamEvent_ChannelPayload) ruleBuilderAE {
	switch content := payload.ChannelPayload.Content.(type) {
	case *ChannelPayload_Inception_:
		return aeBuilder().
			fail(invalidContentType(content))
	case *ChannelPayload_Message:
		return aeBuilder().
			check(params.creatorIsMember).
			requireChainAuth(params.channelMessageWriteEntitlements)
	case *ChannelPayload_Redaction_:
		return aeBuilder().check(params.creatorIsMember).
			requireChainAuth(params.redactChannelMessageEntitlements)
	default:
		return aeBuilder().
			fail(unknownContentType(content))
	}
}

func (params *aeParams) canAddDmChannelPayload(payload *StreamEvent_DmChannelPayload) ruleBuilderAE {
	switch content := payload.DmChannelPayload.Content.(type) {
	case *DmChannelPayload_Inception_:
		return aeBuilder().
			fail(invalidContentType(content))
	case *DmChannelPayload_Message:
		return aeBuilder().
			check(params.creatorIsMember)
	default:
		return aeBuilder().
			fail(unknownContentType(content))
	}
}

func (params *aeParams) canAddGdmChannelPayload(payload *StreamEvent_GdmChannelPayload) ruleBuilderAE {
	switch content := payload.GdmChannelPayload.Content.(type) {
	case *GdmChannelPayload_Inception_:
		return aeBuilder().
			fail(invalidContentType(content))
	case *GdmChannelPayload_Message:
		return aeBuilder().
			check(params.creatorIsMember)
	case *GdmChannelPayload_ChannelProperties:
		return aeBuilder().
			check(params.creatorIsMember)
	default:
		return aeBuilder().
			fail(unknownContentType(content))
	}
}

func (params *aeParams) canAddSpacePayload(payload *StreamEvent_SpacePayload) ruleBuilderAE {
	switch content := payload.SpacePayload.Content.(type) {
	case *SpacePayload_Inception_:
		return aeBuilder().
			fail(invalidContentType(content))
	case *SpacePayload_Channel:
		ru := &aeSpaceChannelRules{
			params:        params,
			channelUpdate: content.Channel,
		}
		if content.Channel.Op == ChannelOp_CO_UPDATED {
			return aeBuilder().
				check(params.creatorIsMember).
				check(ru.validSpaceChannelOp)
		} else {
			return aeBuilder().
				check(params.creatorIsValidNode).
				check(ru.validSpaceChannelOp)
		}
	default:
		return aeBuilder().
			fail(unknownContentType(content))
	}
}

func (params *aeParams) canAddUserPayload(payload *StreamEvent_UserPayload) ruleBuilderAE {
	switch content := payload.UserPayload.Content.(type) {
	case *UserPayload_Inception_:
		return aeBuilder().
			fail(invalidContentType(content))

	case *UserPayload_UserMembership_:
		ru := &aeUserMembershipRules{
			params:         params,
			userMembership: content.UserMembership,
		}
		return aeBuilder().
			checkOneOf(params.creatorIsMember, params.creatorIsValidNode).
			check(ru.validUserMembershipTransition).
			requireParentEvent(ru.parentEventForUserMembership)
	case *UserPayload_UserMembershipAction_:
		ru := &aeUserMembershipActionRules{
			params: params,
			action: content.UserMembershipAction,
		}
		return aeBuilder().
			check(params.creatorIsMember).
			requireParentEvent(ru.parentEventForUserMembershipAction)
	default:
		return aeBuilder().
			fail(unknownContentType(content))
	}
}

func (params *aeParams) canAddUserDeviceKeyPayload(payload *StreamEvent_UserDeviceKeyPayload) ruleBuilderAE {
	switch content := payload.UserDeviceKeyPayload.Content.(type) {
	case *UserDeviceKeyPayload_Inception_:
		return aeBuilder().
			fail(invalidContentType(content))
	case *UserDeviceKeyPayload_EncryptionDevice_:
		return aeBuilder().
			check(params.creatorIsMember)
	default:
		return aeBuilder().
			fail(unknownContentType(content))
	}
}

func (params *aeParams) canAddUserSettingsPayload(payload *StreamEvent_UserSettingsPayload) ruleBuilderAE {
	switch content := payload.UserSettingsPayload.Content.(type) {
	case *UserSettingsPayload_Inception_:
		return aeBuilder().
			fail(invalidContentType(content))
	case *UserSettingsPayload_FullyReadMarkers_:
		return aeBuilder().
			check(params.creatorIsMember)
	case *UserSettingsPayload_UserBlock_:
		return aeBuilder().
			check(params.creatorIsMember)
	default:
		return aeBuilder().
			fail(unknownContentType(content))
	}
}

func (params *aeParams) canAddUserInboxPayload(payload *StreamEvent_UserInboxPayload) ruleBuilderAE {
	switch content := payload.UserInboxPayload.Content.(type) {
	case *UserInboxPayload_Inception_:
		return aeBuilder().
			fail(invalidContentType(content))
	case *UserInboxPayload_GroupEncryptionSessions_:
		return aeBuilder().
			check(params.pass)
	case *UserInboxPayload_Ack_:
		return aeBuilder().
			check(params.creatorIsMember)
	default:
		return aeBuilder().
			fail(unknownContentType(content))
	}
}

func (params *aeParams) canAddMediaPayload(payload *StreamEvent_MediaPayload) ruleBuilderAE {
	switch content := payload.MediaPayload.Content.(type) {
	case *MediaPayload_Inception_:
		return aeBuilder().
			fail(invalidContentType(content))
	case *MediaPayload_Chunk_:
		ru := &aeMediaPayloadChunkRules{
			params: params,
			chunk:  content.Chunk,
		}
		return aeBuilder().
			check(ru.canAddMediaChunk)
	default:
		return aeBuilder().
			fail(unknownContentType(content))
	}
}

func (params *aeParams) canAddMemberPayload(payload *StreamEvent_MemberPayload) ruleBuilderAE {
	switch content := payload.MemberPayload.Content.(type) {
	case *MemberPayload_Membership_:
		ru := &aeMembershipRules{
			params:     params,
			membership: content.Membership,
		}
		if shared.ValidSpaceStreamId(ru.params.streamView.StreamId()) {
			return aeBuilder().
				check(ru.validMembershipPayload).
				check(ru.validMembershipTransitionForSpace).
				check(ru.validMembershipLimit).
				requireChainAuth(ru.spaceMembershipEntitlements)
		} else if shared.ValidChannelStreamId(ru.params.streamView.StreamId()) {
			return aeBuilder().
				check(ru.validMembershipPayload).
				check(ru.validMembershipTransitionForChannel).
				check(ru.validMembershipLimit).
				requireChainAuth(ru.channelMembershipEntitlements).
				requireParentEvent(ru.requireStreamParentMembership)
		} else if shared.ValidDMChannelStreamId(ru.params.streamView.StreamId()) {
			return aeBuilder().
				check(ru.validMembershipPayload).
				check(ru.validMembershipTransitionForDM).
				check(ru.validMembershipLimit)
		} else if shared.ValidGDMChannelStreamId(ru.params.streamView.StreamId()) {
			return aeBuilder().
				check(ru.validMembershipPayload).
				check(ru.validMembershipTransitionForGDM).
				check(ru.validMembershipLimit)
		} else {
			return aeBuilder().
				fail(RiverError(Err_INVALID_ARGUMENT, "invalid stream id for membership payload", "streamId", ru.params.streamView.StreamId()))
		}
	case *MemberPayload_KeySolicitation_:
		ru := &aeKeySolicitationRules{
			params:       params,
			solicitation: content.KeySolicitation,
		}
		return aeBuilder().
			checkOneOf(params.creatorIsMember).
			check(ru.validKeySolicitation)
	case *MemberPayload_KeyFulfillment_:
		ru := &aeKeyFulfillmentRules{
			params:      params,
			fulfillment: content.KeyFulfillment,
		}
		return aeBuilder().
			checkOneOf(params.creatorIsMember).
			check(ru.validKeyFulfillment)
	case *MemberPayload_DisplayName:
		return aeBuilder().
			check(params.creatorIsMember)
	case *MemberPayload_Username:
		return aeBuilder().
			check(params.creatorIsMember)
	case *MemberPayload_EnsAddress:
		ru := &aeEnsAddressRules{
			params:  params,
			address: content,
		}
		return aeBuilder().
			check(params.creatorIsMember).
			check(ru.validEnsAddress)
	case *MemberPayload_Nft_:
		ru := &aeNftRules{
			params: params,
			nft:    content.Nft,
		}
		return aeBuilder().
			check(params.creatorIsMember).
			check(ru.validNft)

	default:
		return aeBuilder().
			fail(unknownContentType(content))
	}
}

func (params *aeParams) pass() (bool, error) {
	// we probably shouldn't ever have 0 checks... currently this is the case in one place
	return true, nil
}

func (params *aeParams) creatorIsMember() (bool, error) {
	creatorAddress := params.parsedEvent.Event.CreatorAddress
	isMember, err := params.streamView.IsMember(creatorAddress)
	if err != nil {
		return false, err
	}
	if !isMember {
		return false, RiverError(
			Err_PERMISSION_DENIED,
			"event creator is not a member of the stream",
			"creatorAddress",
			creatorAddress,
			"streamId",
			params.streamView.StreamId(),
		)
	}
	return true, nil
}

func (ru *aeMembershipRules) validMembershipPayload() (bool, error) {
	if ru.membership == nil {
		return false, RiverError(Err_INVALID_ARGUMENT, "membership is nil")
	}
	// for join events require a parent stream id if the stream has a parent
	if ru.membership.Op == MembershipOp_SO_JOIN {
		streamParentId := ru.params.streamView.StreamParentId()

		if streamParentId != nil {
			if ru.membership.StreamParentId == nil {
				return false, RiverError(
					Err_INVALID_ARGUMENT,
					"membership parent stream id is nil",
					"streamParentId",
					streamParentId,
				)
			}
			if !streamParentId.EqualsBytes(ru.membership.StreamParentId) {
				return false, RiverError(
					Err_INVALID_ARGUMENT,
					"membership parent stream id does not match parent stream id",
					"membershipParentStreamId",
					FormatFullHashFromBytes(ru.membership.StreamParentId),
					"streamParentId",
					streamParentId,
				)
			}
		}
	}
	return true, nil
}

func (ru *aeMembershipRules) validMembershipLimit() (bool, error) {
	if ru.membership.Op == MembershipOp_SO_JOIN || ru.membership.Op == MembershipOp_SO_INVITE {
		members, err := ru.params.streamView.(events.JoinableStreamView).GetChannelMembers()
		if err != nil {
			return false, err
		}
		if ru.params.streamMembershipLimit > 0 && (*members).Cardinality() >= ru.params.streamMembershipLimit {
			return false, RiverError(
				Err_INVALID_ARGUMENT,
				"membership limit reached",
				"membershipLimit",
				ru.params.streamMembershipLimit)
		}
	}
	return true, nil
}

func (ru *aeMembershipRules) validMembershipTransition() (bool, error) {
	if ru.membership == nil {
		return false, RiverError(Err_INVALID_ARGUMENT, "membership is nil")
	}
	if ru.membership.Op == MembershipOp_SO_UNSPECIFIED {
		return false, RiverError(Err_INVALID_ARGUMENT, "membership op is unspecified")
	}

	userAddress := ru.membership.UserAddress

	currentMembership, err := ru.params.streamView.(events.JoinableStreamView).GetMembership(userAddress)
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
		// from unspecified, leave isn't valid, return a no-op
		if ru.membership.Op == MembershipOp_SO_LEAVE {
			return false, nil
		} else {
			return true, nil
		}
	default:
		return false, RiverError(Err_BAD_EVENT, "invalid current membership", "currentMembership", currentMembership)
	}
}

func (ru *aeMembershipRules) validMembershipTransitionForSpace() (bool, error) {
	canAdd, err := ru.params.creatorIsValidNode()
	if !canAdd || err != nil {
		return canAdd, err
	}

	canAdd, err = ru.validMembershipTransition()
	if !canAdd || err != nil {
		return canAdd, err
	}
	return true, nil
}

func (ru *aeMembershipRules) validMembershipTransitionForChannel() (bool, error) {
	canAdd, err := ru.params.creatorIsValidNode()
	if !canAdd || err != nil {
		return canAdd, err
	}

	canAdd, err = ru.validMembershipTransition()
	if !canAdd || err != nil {
		return canAdd, err
	}

	return true, nil
}

// / GDMs and DMs don't have blockchain entitlements so we need to run extra checks
func (ru *aeMembershipRules) validMembershipTransitionForDM() (bool, error) {
	canAdd, err := ru.params.creatorIsValidNode()
	if !canAdd || err != nil {
		return canAdd, err
	}

	canAdd, err = ru.validMembershipTransition()
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

	fp := inception.FirstPartyAddress
	sp := inception.SecondPartyAddress

	userAddress := ru.membership.UserAddress
	initiatorAddress := ru.membership.InitiatorAddress

	if !ru.params.isValidNode(initiatorAddress) {
		if !bytes.Equal(initiatorAddress, fp) && !bytes.Equal(initiatorAddress, sp) {
			return false, RiverError(
				Err_PERMISSION_DENIED,
				"initiator is not a member of DM",
				"initiator",
				initiatorAddress,
			)
		}
	}

	if !bytes.Equal(userAddress, fp) && !bytes.Equal(userAddress, sp) {
		return false, RiverError(Err_PERMISSION_DENIED, "user is not a member of DM", "user", userAddress)
	}

	if ru.membership.Op != MembershipOp_SO_LEAVE && ru.membership.Op != MembershipOp_SO_JOIN {
		return false, RiverError(Err_PERMISSION_DENIED, "only join and leave events are permitted")
	}
	return true, nil
}

// / GDMs and DMs don't have blockchain entitlements so we need to run extra checks
func (ru *aeMembershipRules) validMembershipTransitionForGDM() (bool, error) {
	canAdd, err := ru.params.creatorIsValidNode()
	if !canAdd || err != nil {
		return canAdd, err
	}

	canAdd, err = ru.validMembershipTransition()
	if !canAdd || err != nil {
		return canAdd, err
	}

	if ru.membership == nil {
		return false, RiverError(Err_INVALID_ARGUMENT, "membership is nil")
	}

	initiatorAddress := ru.membership.InitiatorAddress
	userAddress := ru.membership.UserAddress

	initiatorMembership, err := ru.params.streamView.(events.JoinableStreamView).GetMembership(initiatorAddress)
	if err != nil {
		return false, err
	}
	userMembership, err := ru.params.streamView.(events.JoinableStreamView).GetMembership(userAddress)
	if err != nil {
		return false, err
	}

	switch ru.membership.Op {
	case MembershipOp_SO_INVITE:
		// only members can invite (also for some reason invited can invite)
		if initiatorMembership != MembershipOp_SO_JOIN && initiatorMembership != MembershipOp_SO_INVITE {
			return false, RiverError(
				Err_PERMISSION_DENIED,
				"initiator of invite is not a member of GDM",
				"initiator",
				initiatorAddress,
				"nodes",
				ru.params.validNodeAddresses,
			)
		}
		return true, nil
	case MembershipOp_SO_JOIN:
		// if current membership is invite, allow
		if userMembership == MembershipOp_SO_INVITE {
			return true, nil
		}
		// if the user is not invited, fail if the initiator is the user,
		if bytes.Equal(initiatorAddress, userAddress) {
			return false, RiverError(Err_PERMISSION_DENIED, "user is not invited to GDM", "user", userAddress)
		}
		// check the initiator membership
		if initiatorMembership != MembershipOp_SO_JOIN {
			return false, RiverError(
				Err_PERMISSION_DENIED,
				"initiator of join is not a member of GDM",
				"initiator",
				initiatorAddress,
			)
		}
		// user is either invited, or initiator is a member and the user did not just leave
		return true, nil
	case MembershipOp_SO_LEAVE:
		// only members can initiate leave
		if initiatorMembership != MembershipOp_SO_JOIN && initiatorMembership != MembershipOp_SO_INVITE {
			return false, RiverError(
				Err_PERMISSION_DENIED,
				"initiator of leave is not a member of GDM",
				"initiator",
				initiatorAddress,
			)
		}
		return true, nil
	case MembershipOp_SO_UNSPECIFIED:
		return false, RiverError(Err_INVALID_ARGUMENT, "membership op is unspecified")
	default:
		return false, RiverError(Err_PERMISSION_DENIED, "unknown membership event", "op", ru.membership.Op)
	}
}

func (ru *aeMembershipRules) requireStreamParentMembership() (*DerivedEvent, error) {
	if ru.membership == nil {
		return nil, RiverError(Err_INVALID_ARGUMENT, "membership is nil")
	}
	if ru.membership.Op == MembershipOp_SO_LEAVE {
		return nil, nil
	}
	if ru.membership.Op == MembershipOp_SO_INVITE {
		return nil, nil
	}
	streamParentId := ru.params.streamView.StreamParentId()
	if streamParentId == nil {
		return nil, nil
	}

	userStreamId, err := shared.UserStreamIdFromBytes(ru.membership.UserAddress)
	if err != nil {
		return nil, err
	}
	initiatorId, err := shared.AddressHex(ru.membership.InitiatorAddress)
	if err != nil {
		return nil, err
	}
	// for joins and invites, require space membership
	return &DerivedEvent{
		Payload:  events.Make_UserPayload_Membership(MembershipOp_SO_JOIN, *streamParentId, &initiatorId, nil),
		StreamId: userStreamId,
	}, nil
}

func (ru *aeUserMembershipRules) validUserMembershipTransition() (bool, error) {
	if ru.userMembership == nil {
		return false, RiverError(Err_INVALID_ARGUMENT, "membership is nil")
	}
	if ru.userMembership.Op == MembershipOp_SO_UNSPECIFIED {
		return false, RiverError(Err_INVALID_ARGUMENT, "membership op is unspecified")
	}
	streamId, err := shared.StreamIdFromBytes(ru.userMembership.StreamId)
	if err != nil {
		return false, err
	}
	currentMembershipOp, err := ru.params.streamView.(events.UserStreamView).GetUserMembership(streamId)
	if err != nil {
		return false, err
	}

	if currentMembershipOp == ru.userMembership.Op {
		return false, nil
	}

	switch currentMembershipOp {
	case MembershipOp_SO_INVITE:
		// from invite only join and leave are valid
		return true, nil
	case MembershipOp_SO_JOIN:
		// from join only leave is valid
		if ru.userMembership.Op == MembershipOp_SO_LEAVE {
			return true, nil
		} else {
			return false, RiverError(Err_PERMISSION_DENIED, "only leave is valid from join", "op", ru.userMembership.Op)
		}
	case MembershipOp_SO_LEAVE:
		// from leave, invite and join are valid
		return true, nil
	case MembershipOp_SO_UNSPECIFIED:
		// from unspecified, leave would be a no op, join and invite are valid
		if ru.userMembership.Op == MembershipOp_SO_LEAVE {
			return false, nil
		} else {
			return true, nil
		}
	default:
		return false, RiverError(Err_BAD_EVENT, "invalid current membership", "op", currentMembershipOp)
	}
}

// / user membership triggers membership events on space, channel, dm, gdm streams
func (ru *aeUserMembershipRules) parentEventForUserMembership() (*DerivedEvent, error) {
	if ru.userMembership == nil {
		return nil, RiverError(Err_INVALID_ARGUMENT, "event is not a user membership event")
	}
	userMembership := ru.userMembership
	creatorAddress := ru.params.parsedEvent.Event.CreatorAddress

	userAddress, err := shared.GetUserAddressFromStreamId(*ru.params.streamView.StreamId())
	if err != nil {
		return nil, err
	}

	toStreamId, err := shared.StreamIdFromBytes(userMembership.StreamId)
	if err != nil {
		return nil, err
	}
	var initiatorAddress []byte
	if userMembership.Inviter != nil && ru.params.isValidNode(creatorAddress) {
		// the initiator will need permissions to do specific things
		// if the creator of this payload was a valid node, trust that the inviter was the initiator
		initiatorAddress = userMembership.Inviter
	} else {
		// otherwise the initiator is the creator of the event
		initiatorAddress = creatorAddress
	}

	return &DerivedEvent{
		Payload: events.Make_MemberPayload_Membership(
			userMembership.Op,
			userAddress.Bytes(),
			initiatorAddress,
			userMembership.StreamParentId,
		),
		StreamId: toStreamId,
	}, nil
}

// / user actions perform user membership events on other user's streams
func (ru *aeUserMembershipActionRules) parentEventForUserMembershipAction() (*DerivedEvent, error) {
	if ru.action == nil {
		return nil, RiverError(Err_INVALID_ARGUMENT, "event is not a user membership action event")
	}
	action := ru.action
	inviterId, err := shared.AddressHex(ru.params.parsedEvent.Event.CreatorAddress)
	if err != nil {
		return nil, err
	}
	actionStreamId, err := shared.StreamIdFromBytes(action.StreamId)
	if err != nil {
		return nil, err
	}
	payload := events.Make_UserPayload_Membership(action.Op, actionStreamId, &inviterId, action.StreamParentId)
	toUserStreamId, err := shared.UserStreamIdFromBytes(action.UserId)
	if err != nil {
		return nil, err
	}
	return &DerivedEvent{
		Payload:  payload,
		StreamId: toUserStreamId,
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
		*streamId,
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

	spaceId, err := shared.StreamIdFromBytes(inception.SpaceId)
	if err != nil {
		return nil, err
	}

	chainAuthArgs := auth.NewChainAuthArgsForChannel(
		spaceId,
		*ru.params.streamView.StreamId(),
		permissionUser,
		permission,
	)

	return chainAuthArgs, nil
}

func (params *aeParams) channelMessageWriteEntitlements() (*auth.ChainAuthArgs, error) {
	userId, err := shared.AddressHex(params.parsedEvent.Event.CreatorAddress)
	if err != nil {
		return nil, err
	}

	inception, err := params.streamView.(events.ChannelStreamView).GetChannelInception()
	if err != nil {
		return nil, err
	}

	spaceId, err := shared.StreamIdFromBytes(inception.SpaceId)
	if err != nil {
		return nil, err
	}

	chainAuthArgs := auth.NewChainAuthArgsForChannel(
		spaceId,
		*params.streamView.StreamId(),
		userId,
		auth.PermissionWrite,
	)

	return chainAuthArgs, nil
}

func (params *aeParams) redactChannelMessageEntitlements() (*auth.ChainAuthArgs, error) {
	userId, err := shared.AddressHex(params.parsedEvent.Event.CreatorAddress)
	if err != nil {
		return nil, err
	}

	inception, err := params.streamView.(events.ChannelStreamView).GetChannelInception()
	if err != nil {
		return nil, err
	}

	spaceId, err := shared.StreamIdFromBytes(inception.SpaceId)
	if err != nil {
		return nil, err
	}

	chainAuthArgs := auth.NewChainAuthArgsForChannel(
		spaceId,
		*params.streamView.StreamId(),
		userId,
		auth.PermissionRedact,
	)

	return chainAuthArgs, nil
}

func (params *aeParams) creatorIsValidNode() (bool, error) {
	creatorAddress := params.parsedEvent.Event.CreatorAddress
	if !params.isValidNode(creatorAddress) {
		return false, RiverError(
			Err_UNKNOWN_NODE,
			"Event creator must be a valid node",
			"address",
			creatorAddress,
			"nodes",
			params.validNodeAddresses,
		).Func("CheckNodeIsValid")
	}
	return true, nil
}

func (ru *aeMembershipRules) getPermissionForMembershipOp() (auth.Permission, string, error) {
	if ru.membership == nil {
		return auth.PermissionUndefined, "", RiverError(Err_INVALID_ARGUMENT, "membership is nil")
	}
	membership := ru.membership

	// todo aellis - don't need these conversions
	initiatorId, err := shared.AddressHex(ru.membership.InitiatorAddress)
	if err != nil {
		return auth.PermissionUndefined, "", err
	}

	userAddress := ru.membership.UserAddress
	userId, err := shared.AddressHex(userAddress)
	if err != nil {
		return auth.PermissionUndefined, "", err
	}

	currentMembership, err := ru.params.streamView.(events.JoinableStreamView).GetMembership(userAddress)
	if err != nil {
		return auth.PermissionUndefined, "", err
	}
	if membership.Op == currentMembership {
		// this could panic, the rule builder should never allow us to get here
		return auth.PermissionUndefined, "", RiverError(
			Err_FAILED_PRECONDITION,
			"membershipOp should not be the same as currentMembership",
		)
	}

	switch membership.Op {
	case MembershipOp_SO_INVITE:
		if currentMembership == MembershipOp_SO_JOIN {
			return auth.PermissionUndefined, "", RiverError(
				Err_FAILED_PRECONDITION,
				"user is already a member of the channel",
				"user",
				userId,
				"initiator",
				initiatorId,
			)
		}
		return auth.PermissionInvite, initiatorId, nil

	case MembershipOp_SO_JOIN:
		return auth.PermissionRead, userId, nil

	case MembershipOp_SO_LEAVE:
		if currentMembership != MembershipOp_SO_JOIN {
			return auth.PermissionUndefined, "", RiverError(
				Err_FAILED_PRECONDITION,
				"user is not a member of the channel",
				"user",
				userId,
				"initiator",
				initiatorId,
			)
		}
		if userId != initiatorId {
			return auth.PermissionBan, initiatorId, nil
		} else {
			return auth.PermissionUndefined, userId, nil
		}

	case MembershipOp_SO_UNSPECIFIED:
		fallthrough

	default:
		return auth.PermissionUndefined, "", RiverError(Err_BAD_EVENT, "Need valid membership op", "op", membership.Op)
	}
}

func (ru *aeSpaceChannelRules) validSpaceChannelOp() (bool, error) {
	if ru.channelUpdate == nil {
		return false, RiverError(Err_INVALID_ARGUMENT, "event is not a channel event")
	}

	next := ru.channelUpdate
	view := ru.params.streamView.(events.SpaceStreamView)
	channelId, err := shared.StreamIdFromBytes(next.ChannelId)
	if err != nil {
		return false, err
	}
	current, err := view.GetChannelInfo(channelId)
	if err != nil {
		return false, err
	}
	// if we don't have a channel, accept add
	if current == nil {
		return next.Op == ChannelOp_CO_CREATED, nil
	}

	if current.Op == ChannelOp_CO_DELETED {
		return false, RiverError(Err_PERMISSION_DENIED, "channel is deleted", "channelId", channelId)
	}

	if next.Op == ChannelOp_CO_CREATED {
		// this channel is already created, we can't create it again, but it's not an error, this event is a no-op
		return false, nil
	}

	return true, nil
}

func (ru *aeMediaPayloadChunkRules) canAddMediaChunk() (bool, error) {
	canAdd, err := ru.params.creatorIsMember()
	if !canAdd || err != nil {
		return canAdd, err
	}

	if ru.chunk == nil {
		return false, RiverError(Err_INVALID_ARGUMENT, "event is not a media chunk event")
	}
	chunk := ru.chunk

	inception, err := ru.params.streamView.(events.MediaStreamView).GetMediaInception()
	if err != nil {
		return false, err
	}

	if chunk.ChunkIndex >= inception.ChunkCount || chunk.ChunkIndex < 0 {
		return false, RiverError(Err_INVALID_ARGUMENT, "chunk index out of bounds")
	}

	if len(chunk.Data) > ru.params.mediaMaxChunkSize {
		return false, RiverError(
			Err_INVALID_ARGUMENT,
			"chunk size must be less than or equal to",
			"cfg.Media.MaxChunkSize",
			ru.params.mediaMaxChunkSize)
	}

	return true, nil
}

func (ru *aeKeySolicitationRules) validKeySolicitation() (bool, error) {
	// key solicitations are allowed if they are not empty, or if they are empty and isNewDevice is true and there is no existing device key
	if ru.solicitation == nil {
		return false, RiverError(Err_INVALID_ARGUMENT, "event is not a key solicitation event")
	}

	if !ru.solicitation.IsNewDevice && len(ru.solicitation.SessionIds) == 0 {
		return false, RiverError(Err_INVALID_ARGUMENT, "session ids are required for existing devices")
	}

	if !slices.IsSorted(ru.solicitation.SessionIds) {
		return false, RiverError(Err_INVALID_ARGUMENT, "session ids must be sorted")
	}

	return true, nil
}

func (ru *aeKeyFulfillmentRules) validKeyFulfillment() (bool, error) {
	if ru.fulfillment == nil {
		return false, RiverError(Err_INVALID_ARGUMENT, "event is not a key fulfillment event")
	}
	userAddress := ru.fulfillment.UserAddress
	solicitations, err := ru.params.streamView.(events.JoinableStreamView).GetKeySolicitations(userAddress)
	if err != nil {
		return false, err
	}

	if len(ru.fulfillment.SessionIds) > 0 && !slices.IsSorted(ru.fulfillment.SessionIds) {
		return false, RiverError(Err_INVALID_ARGUMENT, "session ids are required")
	}

	// loop over solicitations, see if the device key exists
	for _, solicitation := range solicitations {
		if solicitation.DeviceKey == ru.fulfillment.DeviceKey {
			if solicitation.IsNewDevice {
				return true, nil
			}
			if hasCommon(solicitation.SessionIds, ru.fulfillment.SessionIds) {
				return true, nil
			}
			return false, RiverError(Err_DUPLICATE_EVENT, "solicitation with common session ids not found")
		}
	}
	return false, RiverError(Err_INVALID_ARGUMENT, "solicitation with matching device key not found")
}

func (ru *aeEnsAddressRules) validEnsAddress() (bool, error) {
	if ru.address == nil {
		return false, RiverError(Err_INVALID_ARGUMENT, "event is not an ENS address event")
	}

	// Allow users to clear their ENS Address or set a valid address
	if len(ru.address.EnsAddress) != 0 && len(ru.address.EnsAddress) != 20 {
		return false, RiverError(Err_INVALID_ARGUMENT, "Invalid ENS address length")
	}
	return true, nil
}

func (ru *aeNftRules) validNft() (bool, error) {
	if ru.nft == nil {
		return false, RiverError(Err_INVALID_ARGUMENT, "event is not an NFT address event")
	}

	// Allow users to clear their NFT or set a valid NFT
	if len(ru.nft.ContractAddress) == 0 {
		return true, nil
	}

	if len(ru.nft.ContractAddress) != 20 {
		return false, RiverError(Err_INVALID_ARGUMENT, "invalid contract address")
	}

	if len(ru.nft.TokenId) == 0 {
		return false, RiverError(Err_INVALID_ARGUMENT, "invalid token id")
	}

	if ru.nft.ChainId == 0 {
		return false, RiverError(Err_INVALID_ARGUMENT, "invalid chain id")
	}

	return true, nil
}

func (params *aeParams) isValidNode(addressOrId []byte) bool {
	for _, item := range params.validNodeAddresses {
		if bytes.Equal(item[:], addressOrId) {
			return true
		}
	}
	return false
}

func (params *aeParams) log() *slog.Logger {
	return dlog.FromCtx(params.ctx)
}

func hasCommon(x, y []string) bool {
	i, j := 0, 0

	for i < len(x) && j < len(y) {
		if x[i] < y[j] {
			i++
		} else if x[i] > y[j] {
			j++
		} else {
			return true
		}
	}

	return false
}
