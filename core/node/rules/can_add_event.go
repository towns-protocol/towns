package rules

import (
	"bytes"
	"context"
	"math/big"
	"slices"
	"sort"
	"time"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	ethTypes "github.com/ethereum/go-ethereum/core/types"
	"google.golang.org/protobuf/proto"

	"github.com/towns-protocol/towns/core/config"
	baseContracts "github.com/towns-protocol/towns/core/contracts/base"
	"github.com/towns-protocol/towns/core/node/auth"
	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/xchain/bindings/erc20"
)

type aeParams struct {
	ctx                   context.Context
	config                config.Config
	chainConfig           crypto.OnChainConfiguration
	mediaMaxChunkSize     int
	streamMembershipLimit int
	validNodeAddresses    []common.Address
	currentTime           time.Time
	streamView            *events.StreamView
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

type aeBlockchainTransactionRules struct {
	params      *aeParams
	transaction *BlockchainTransaction
}

type aeReceivedBlockchainTransactionRules struct {
	params              *aeParams
	receivedTransaction *UserPayload_ReceivedBlockchainTransaction
}

type aeMemberBlockchainTransactionRules struct {
	params            *aeParams
	memberTransaction *MemberPayload_MemberBlockchainTransaction
}

type aeSpaceChannelRules struct {
	params        *aeParams
	channelUpdate *SpacePayload_ChannelUpdate
}

type aePinRules struct {
	params *aeParams
	pin    *MemberPayload_Pin
}

type aeUnpinRules struct {
	params *aeParams
	unpin  *MemberPayload_Unpin
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

type aeAutojoinRules struct {
	update *SpacePayload_UpdateChannelAutojoin
}

type aeHideUserJoinLeaveEventsWrapperRules struct {
	update *SpacePayload_UpdateChannelHideUserJoinLeaveEvents
}

type aeEncryptedGroupSessionRules struct {
	params  *aeParams
	session *UserInboxPayload_GroupEncryptionSessions
}

/*
*
* CanAddEvent
* a pure function with no side effects that returns a boolean value and prerequesits
* for adding an event to a stream.
*

  - @return canAddEvent bool // true if the event can be added to the stream, will be false in case of duplictate state

  - @return verifications *AddEventVerifications // a list of on chain requirements, such that, if defined, at least one must be satisfied in order to add the event to the stream

  - @return sideEffects *AddEventSideEffects // side effects that need to be executed before adding the event to the stream or on failures

  - @return error // if adding result would result in invalid state

*
* example valid states:
* (false, nil, nil, nil) // event cannot be added to the stream, but there is no error, state would remain the same
* (false, nil, nil, error) // event cannot be added to the stream, but there is no error, state would remain the same
* (true, nil, nil, nil) // event can be added to the stream
* (true, nil, &AddEventSideEffects, nil) // event can be added after parent event is added or verified
* (true, &AddEventVerifications, nil, nil) // event can be added if chainAuthArgs are satisfied
* (true, &AddEventVerifications, &AddEventSideEffects, nil) // event can be added if chainAuthArgs are satisfied and parent event is added or verified
*/
func CanAddEvent(
	ctx context.Context,
	config config.Config,
	chainConfig crypto.OnChainConfiguration,
	validNodeAddresses []common.Address,
	currentTime time.Time,
	parsedEvent *events.ParsedEvent,
	streamView *events.StreamView,
) (bool, *AddEventVerifications, *AddEventSideEffects, error) {
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
	if err := streamView.ValidateNextEvent(ctx, chainConfig.Get(), parsedEvent, currentTime); err != nil {
		return false, nil, nil, err
	}

	// make sure the stream event is of the same type as the inception event
	if err := parsedEvent.Event.VerifyPayloadTypeMatchesStreamType(streamView.InceptionPayload()); err != nil {
		return false, nil, nil, AsRiverError(err, Err_INVALID_ARGUMENT)
	}

	settings := chainConfig.Get()

	ru := &aeParams{
		ctx:                   ctx,
		config:                config,
		chainConfig:           chainConfig,
		mediaMaxChunkSize:     int(settings.MediaMaxChunkSize),
		streamMembershipLimit: int(settings.MembershipLimits.ForType(streamView.StreamId().Type())),
		validNodeAddresses:    validNodeAddresses,
		currentTime:           currentTime,
		parsedEvent:           parsedEvent,
		streamView:            streamView,
	}
	builder := ru.canAddEvent()
	ru.log().Debugw("CanAddEvent", "builder", builder)
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
	case *StreamEvent_UserMetadataPayload:
		return params.canAddUserMetadataPayload(payload)
	case *StreamEvent_UserSettingsPayload:
		return params.canAddUserSettingsPayload(payload)
	case *StreamEvent_UserInboxPayload:
		return params.canAddUserInboxPayload(payload)
	case *StreamEvent_MediaPayload:
		return params.canAddMediaPayload(payload)
	case *StreamEvent_MemberPayload:
		return params.canAddMemberPayload(payload)
	case *StreamEvent_MetadataPayload:
		panic("give me callstack")
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
			requireOneOfChainAuths(params.channelEntitlements(auth.PermissionWrite), params.channelEntitlements(auth.PermissionReact))
	case *ChannelPayload_Redaction_:
		return aeBuilder().
			check(params.creatorIsMember).
			requireChainAuth(params.channelEntitlements(auth.PermissionRedact))
	case *ChannelPayload_InteractionRequest:
		return aeBuilder().
			check(params.creatorIsMember).
			check(params.creatorIsApp).
			requireOneOfChainAuths(params.channelEntitlements(auth.PermissionWrite), params.channelEntitlements(auth.PermissionReact))
	case *ChannelPayload_InteractionResponse:
		return aeBuilder().
			check(params.creatorIsMember).
			requireOneOfChainAuths(params.channelEntitlements(auth.PermissionWrite), params.channelEntitlements(auth.PermissionReact))
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
			check(params.creatorIsMember).
			requireChainAuth(params.dmValidationChainAuth)
	default:
		return aeBuilder().
			fail(unknownContentType(content))
	}
}

func (params *aeParams) dmValidationChainAuth() (*auth.ChainAuthArgs, error) {
	inception, err := params.streamView.GetDMChannelInception()
	if err != nil {
		return nil, err
	}

	firstPartyAddr := common.BytesToAddress(inception.FirstPartyAddress)
	secondPartyAddr := common.BytesToAddress(inception.SecondPartyAddress)

	var firstPartyAppAddr, secondPartyAppAddr *common.Address
	if len(inception.FirstPartyAppAddress) == 20 {
		addr := common.BytesToAddress(inception.FirstPartyAppAddress)
		firstPartyAppAddr = &addr
	}
	if len(inception.SecondPartyAppAddress) == 20 {
		addr := common.BytesToAddress(inception.SecondPartyAppAddress)
		secondPartyAppAddr = &addr
	}
	if firstPartyAppAddr == nil && secondPartyAppAddr == nil {
		return nil, nil
	}

	return auth.NewChainAuthArgsForDmEvent(firstPartyAddr, secondPartyAddr, firstPartyAppAddr, secondPartyAppAddr), nil
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
	case *SpacePayload_UpdateChannelAutojoin_:
		ru := &aeAutojoinRules{content.UpdateChannelAutojoin}
		return aeBuilder().
			check(params.creatorIsMember).
			check(params.channelExistsInSpace(ru)).
			requireChainAuth(params.spaceEntitlements(auth.PermissionAddRemoveChannels))
	case *SpacePayload_UpdateChannelHideUserJoinLeaveEvents_:
		ru := &aeHideUserJoinLeaveEventsWrapperRules{content.UpdateChannelHideUserJoinLeaveEvents}
		return aeBuilder().
			check(params.creatorIsMember).
			check(params.channelExistsInSpace(ru)).
			requireChainAuth(params.spaceEntitlements(auth.PermissionAddRemoveChannels))
	case *SpacePayload_SpaceImage:
		return aeBuilder().
			check(params.creatorIsMember).
			requireOneOfChainAuths(params.spaceEntitlements(auth.PermissionModifySpaceSettings))
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
			check(ru.validUserMembershipStream).
			requireParentEvent(ru.parentEventForUserMembership).
			requireChainAuth(ru.chainAuthForUserMembership)

	case *UserPayload_UserMembershipAction_:
		ru := &aeUserMembershipActionRules{
			params: params,
			action: content.UserMembershipAction,
		}
		return aeBuilder().
			check(params.creatorIsMember).
			requireParentEvent(ru.parentEventForUserMembershipAction)
	case *UserPayload_BlockchainTransaction:
		ru := &aeBlockchainTransactionRules{
			params:      params,
			transaction: content.BlockchainTransaction,
		}
		// from the user, only the user, run all receipt verifications
		return aeBuilder().
			check(ru.params.creatorIsMember).
			check(ru.validBlockchainTransaction_IsUnique).
			check(ru.validBlockchainTransaction_CheckReceiptMetadata).
			verifyReceipt(ru.blockchainTransaction_GetReceipt).
			requireChainAuth(ru.blockchainTransaction_ChainAuth).
			requireParentEvent(ru.parentEventForBlockchainTransaction)
	case *UserPayload_ReceivedBlockchainTransaction_:
		ru := &aeReceivedBlockchainTransactionRules{
			params:              params,
			receivedTransaction: content.ReceivedBlockchainTransaction,
		}
		// from the node, derived from other event, creator should be a node
		return aeBuilder().
			check(ru.params.creatorIsValidNode).
			check(ru.validReceivedBlockchainTransaction_IsUnique).
			requireChainAuth(ru.receivedBlockchainTransaction_ChainAuth).
			requireParentEvent(ru.parentEventForReceivedBlockchainTransaction)
	default:
		return aeBuilder().
			fail(unknownContentType(content))
	}
}

func (params *aeParams) canAddUserMetadataPayload(payload *StreamEvent_UserMetadataPayload) ruleBuilderAE {
	switch content := payload.UserMetadataPayload.Content.(type) {
	case *UserMetadataPayload_Inception_:
		return aeBuilder().
			fail(invalidContentType(content))
	case *UserMetadataPayload_EncryptionDevice_:
		return aeBuilder().
			check(params.creatorIsMember)
	case *UserMetadataPayload_ProfileImage:
		return aeBuilder().
			requireChainAuth(params.creatorIsMemberOrAppOwner)
	case *UserMetadataPayload_Bio:
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
		ru := &aeEncryptedGroupSessionRules{
			params:  params,
			session: content.GroupEncryptionSessions,
		}
		return aeBuilder().
			check(ru.validEncryptedGroupSession)
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
				check(ru.validMembershipLimit).
				requireChainAuth(ru.gdmBotSponsorEntitlements)
		} else {
			return aeBuilder().
				fail(RiverError(Err_INVALID_ARGUMENT, "invalid stream id for membership payload", "streamId", ru.params.streamView.StreamId()))
		}
	case *MemberPayload_KeySolicitation_:
		ru := &aeKeySolicitationRules{
			params:       params,
			solicitation: content.KeySolicitation,
		}

		if shared.ValidChannelStreamId(params.streamView.StreamId()) {
			return aeBuilder().
				check(params.creatorIsMember).
				check(ru.validKeySolicitation).
				requireChainAuth(params.channelEntitlements(auth.PermissionRead)).
				onChainAuthFailure(params.onEntitlementFailureForUserEvent)
		} else {
			return aeBuilder().
				check(params.creatorIsMember).
				check(ru.validKeySolicitation)
		}
	case *MemberPayload_KeyFulfillment_:
		ru := &aeKeyFulfillmentRules{
			params:      params,
			fulfillment: content.KeyFulfillment,
		}
		return aeBuilder().
			check(params.creatorIsMember).
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
	case *MemberPayload_Pin_:
		pinRuls := &aePinRules{
			params: params,
			pin:    content.Pin,
		}
		if shared.ValidSpaceStreamId(params.streamView.StreamId()) {
			return aeBuilder().
				check(params.creatorIsMember).
				check(pinRuls.validPin).
				requireChainAuth(params.spaceEntitlements(auth.PermissionPinMessage))
		} else if shared.ValidChannelStreamId(params.streamView.StreamId()) {
			return aeBuilder().
				check(params.creatorIsMember).
				check(pinRuls.validPin).
				requireChainAuth(params.channelEntitlements(auth.PermissionPinMessage))
		} else {
			return aeBuilder().
				check(params.creatorIsMember).
				check(pinRuls.validPin)
		}
	case *MemberPayload_Unpin_:
		unpinRules := &aeUnpinRules{
			params: params,
			unpin:  content.Unpin,
		}
		if shared.ValidSpaceStreamId(params.streamView.StreamId()) {
			return aeBuilder().
				check(params.creatorIsMember).
				check(unpinRules.validUnpin).
				requireChainAuth(params.spaceEntitlements(auth.PermissionPinMessage))
		} else if shared.ValidChannelStreamId(params.streamView.StreamId()) {
			return aeBuilder().
				check(params.creatorIsMember).
				check(unpinRules.validUnpin).
				requireChainAuth(params.channelEntitlements(auth.PermissionPinMessage))
		} else {
			return aeBuilder().
				check(params.creatorIsMember).
				check(unpinRules.validUnpin)
		}
	case *MemberPayload_MemberBlockchainTransaction_:
		ru := &aeMemberBlockchainTransactionRules{
			params:            params,
			memberTransaction: content.MemberBlockchainTransaction,
		}
		return aeBuilder().
			check(params.creatorIsValidNode).
			check(ru.validMemberBlockchainTransaction_IsUnique).
			check(ru.validMemberBlockchainTransaction_ReceiptMetadata)
	case *MemberPayload_EncryptionAlgorithm_:
		return aeBuilder().
			check(params.creatorIsMember)
	default:
		return aeBuilder().
			fail(unknownContentType(content))
	}
}

func checkIsMember(params *aeParams, creatorAddress []byte) error {
	isMember, err := params.streamView.IsMember(creatorAddress)
	if err != nil {
		return err
	}
	if !isMember {
		return RiverError(
			Err_PERMISSION_DENIED,
			"event creator is not a member of the stream",
			"creatorAddress",
			creatorAddress,
			"streamId",
			params.streamView.StreamId(),
		)
	}
	return nil
}

func checkIsApp(params *aeParams, creatorAddress []byte) error {
	appAddress, err := params.streamView.GetMemberAppAddress(common.Address(creatorAddress))
	if err != nil {
		return err
	}
	if appAddress == (common.Address{}) {
		return RiverError(Err_PERMISSION_DENIED, "creator is not an app registered with the client address")
	}
	return nil
}

func (params *aeParams) creatorIsMember() (bool, error) {
	creatorAddress := params.parsedEvent.Event.CreatorAddress
	err := checkIsMember(params, creatorAddress)
	if err != nil {
		return false, err
	}
	return true, nil
}

// creatorIsMemberOrAppOwner returns nil if the creator is a member (no chain auth needed),
// or returns chain auth args for bot owner verification if the creator is not a member
// but the stream belongs to a bot user.
func (params *aeParams) creatorIsMemberOrAppOwner() (*auth.ChainAuthArgs, error) {
	creatorAddress := params.parsedEvent.Event.CreatorAddress
	isMember, err := params.streamView.IsMember(creatorAddress)
	if err != nil {
		return nil, err
	}
	if isMember {
		// skip chain auth - already authorized as member
		return nil, nil
	}

	// not member - check if this is a bot user's stream
	isAppUser, err := params.streamView.IsUserMetadataAppUser()
	if err != nil {
		return nil, err
	}
	if !isAppUser {
		return nil, RiverError(
			Err_PERMISSION_DENIED,
			"creator is not a member and stream is not associated with an app",
			"creatorAddress", creatorAddress,
			"streamId", params.streamView.StreamId(),
		)
	}
	// this is a bot user stream, return chain auth to verify bot ownership
	return params.appOwnerChainAuth()
}

func (params *aeParams) creatorIsApp() (bool, error) {
	creatorAddress := params.parsedEvent.Event.CreatorAddress
	err := checkIsApp(params, creatorAddress)
	if err != nil {
		return false, err
	}
	return true, nil
}

// appOwnerChainAuth returns chain auth args to check if the event creator is the owner
// of the bot whose user metadata stream this is. This is used to allow bot owners to
// update their bot's profile image.
func (params *aeParams) appOwnerChainAuth() (*auth.ChainAuthArgs, error) {
	// Get the user address from the stream ID (the bot's client address)
	botClientAddress, err := shared.GetUserAddressFromStreamId(*params.streamView.StreamId())
	if err != nil {
		return nil, err
	}

	// Get the creator's address
	creatorAddress := common.BytesToAddress(params.parsedEvent.Event.CreatorAddress)

	// Create chain auth args to check if creator is the bot owner
	return auth.NewChainAuthArgsForIsAppOwner(creatorAddress, botClientAddress), nil
}

func (ru *aeMemberBlockchainTransactionRules) validMemberBlockchainTransaction_ReceiptMetadata() (bool, error) {
	// check creator
	switch content := ru.memberTransaction.Transaction.Content.(type) {
	case nil:
		// only accept typed transactions
		return false, RiverError(Err_INVALID_ARGUMENT, "member transaction content is nil")
	case *BlockchainTransaction_Tip_:
		// make sure everyone is a member
		err := checkIsMember(ru.params, ru.memberTransaction.GetFromUserAddress())
		if err != nil {
			return false, err
		}
		err = checkIsMember(ru.params, content.Tip.GetToUserAddress())
		if err != nil {
			return false, err
		}
		// we need a ref event id
		if content.Tip.GetEvent().GetMessageId() == nil {
			return false, RiverError(Err_INVALID_ARGUMENT, "tip transaction message id is nil")
		}
		return true, nil
	case *BlockchainTransaction_TokenTransfer_:
		err := checkIsMember(ru.params, ru.memberTransaction.GetFromUserAddress())
		if err != nil {
			return false, err
		}
		// we need a ref event id
		if content.TokenTransfer.GetMessageId() == nil {
			return false, RiverError(Err_INVALID_ARGUMENT, "transfer transaction message id is nil")
		}
		return true, nil
	case *BlockchainTransaction_SpaceReview_:
		err := checkIsMember(ru.params, ru.memberTransaction.GetFromUserAddress())
		if err != nil {
			return false, err
		}
		return true, nil
	default:
		return false, RiverError(
			Err_INVALID_ARGUMENT,
			"unknown transaction content - member blockchain transaction",
			"content",
			content,
		)
	}
}

func (ru *aeMemberBlockchainTransactionRules) validMemberBlockchainTransaction_IsUnique() (bool, error) {
	// loop over all events in the view, check if the transaction is already in the view
	streamView := ru.params.streamView

	hasTransaction, err := streamView.HasTransaction(
		ru.memberTransaction.Transaction.GetReceipt(),
		ru.memberTransaction.Transaction.GetSolanaReceipt(),
	)
	if err != nil {
		return false, err
	}
	if hasTransaction {
		// this is a derived event, so we don't return an error so that the user
		// can retry adding the original event until it succeeds
		return false, nil
	}
	return true, nil
}

func (ru *aeReceivedBlockchainTransactionRules) validReceivedBlockchainTransaction_IsUnique() (bool, error) {
	// loop over all events in the view, check if the transaction is already in the view
	userStreamView := ru.params.streamView

	hasTransaction, err := userStreamView.HasTransaction(
		ru.receivedTransaction.Transaction.GetReceipt(),
		ru.receivedTransaction.Transaction.GetSolanaReceipt(),
	)
	if err != nil {
		return false, err
	}
	if hasTransaction {
		// this is a derived event, so we don't return an error so that the user
		// can retry adding the original event until it succeeds
		return false, nil
	}
	return true, nil
}

func (ru *aeBlockchainTransactionRules) validBlockchainTransaction_IsUnique() (bool, error) {
	// loop over all events in the view, check if the transaction is already in the view
	userStreamView := ru.params.streamView

	hasTransaction, err := userStreamView.HasTransaction(ru.transaction.GetReceipt(), ru.transaction.GetSolanaReceipt())
	if err != nil {
		return false, err
	}
	if hasTransaction {
		if ru.transaction.GetReceipt() != nil {
			return false, RiverError(
				Err_INVALID_ARGUMENT,
				"duplicate transaction",
				"streamId",
				ru.params.streamView.StreamId(),
				"transactionHash",
				ru.transaction.GetReceipt().TransactionHash,
			)
		} else if ru.transaction.GetSolanaReceipt().GetTransaction() != nil {
			return false, RiverError(
				Err_INVALID_ARGUMENT,
				"duplicate transaction",
				"streamId",
				ru.params.streamView.StreamId(),
				"transactionHash",
				ru.transaction.GetSolanaReceipt().GetTransaction().Signatures,
			)
		} else {
			// should never happen
			return false, RiverError(Err_INVALID_ARGUMENT, "receipt is nil")
		}
	}
	return true, nil
}

func (ru *aeBlockchainTransactionRules) validBlockchainTransaction_CheckReceiptMetadata() (bool, error) {
	if ru.transaction.Receipt != nil {
		return ru.validBlockchainTransaction_CheckReceiptMetadataEVM()
	} else if ru.transaction.SolanaReceipt != nil {
		return ru.validBlockchainTransaction_CheckReceiptMetadataSolana()
	} else {
		return false, RiverError(Err_INVALID_ARGUMENT, "receipt is nil")
	}
}

func (ru *aeBlockchainTransactionRules) validBlockchainTransaction_CheckReceiptMetadataEVM() (bool, error) {
	receipt := ru.transaction.Receipt
	if receipt == nil {
		return false, RiverError(Err_INVALID_ARGUMENT, "receipt is nil")
	}
	// check creator
	switch content := ru.transaction.Content.(type) {
	case nil:
		// for unspecified types, we don't need to check anything specific
		// the other checks should make sure the transaction is valid and from this user
		return true, nil
	case *BlockchainTransaction_Tip_:
		// parse the logs for the tip event, make sure it matches the tip metadata
		filterer, err := baseContracts.NewTippingFilterer(common.Address{}, nil)
		if err != nil {
			return false, err
		}

		// Define ABI types for decoding TipSent data field
		bytes32Type, _ := abi.NewType("bytes32", "", nil)
		uint256Type, _ := abi.NewType("uint256", "", nil)
		memberDataArgs := abi.Arguments{
			{Type: bytes32Type, Name: "messageId"},
			{Type: bytes32Type, Name: "channelId"},
			{Type: uint256Type, Name: "tokenId"},
		}
		botDataArgs := abi.Arguments{
			{Type: bytes32Type, Name: "messageId"},
			{Type: bytes32Type, Name: "channelId"},
		}

		for _, receiptLog := range receipt.Logs {
			// unpack the log
			// compare to metadata in the tip
			topics := make([]common.Hash, len(receiptLog.Topics))
			for i, topic := range receiptLog.Topics {
				topics[i] = common.BytesToHash(topic)
			}
			log := ethTypes.Log{
				Address: common.BytesToAddress(receiptLog.Address),
				Topics:  topics,
				Data:    receiptLog.Data,
			}

			// Try parsing as TipSent event (new format)
			tipSentEvent, err := filterer.ParseTipSent(log)
			if err == nil {
				// TipSent event found, decode data and validate
				var messageId, channelId [32]byte

				// RecipientType: 0 = Member, 1 = Bot, 2 = Pool
				if tipSentEvent.RecipientType == 0 {
					// Member tip: decode as (messageId, channelId, tokenId)
					values, err := memberDataArgs.Unpack(tipSentEvent.Data)
					if err != nil {
						continue
					}
					messageId = values[0].([32]byte)
					channelId = values[1].([32]byte)
					tokenId := values[2].(*big.Int)

					// Validate tokenId for member tips
					if tokenId.Cmp(big.NewInt(int64(content.Tip.GetEvent().GetTokenId()))) != 0 {
						continue
					}
				} else {
					// Bot/Pool tip: decode as (messageId, channelId) - no tokenId
					values, err := botDataArgs.Unpack(tipSentEvent.Data)
					if err != nil {
						continue
					}
					messageId = values[0].([32]byte)
					channelId = values[1].([32]byte)
					// Note: tokenId is not validated for bot/pool tips
				}

				// Validate that messageId and channelId are not empty
				var emptyBytes32 [32]byte
				if bytes.Equal(messageId[:], emptyBytes32[:]) {
					continue // reject tips with empty messageId
				}
				if bytes.Equal(channelId[:], emptyBytes32[:]) {
					continue // reject tips with empty channelId
				}

				// Validate common fields
				if !bytes.Equal(tipSentEvent.Currency[:], content.Tip.GetEvent().GetCurrency()) {
					continue
				}
				if !bytes.Equal(tipSentEvent.Sender[:], content.Tip.GetEvent().GetSender()) {
					continue
				}
				if !bytes.Equal(tipSentEvent.Receiver[:], content.Tip.GetEvent().GetReceiver()) {
					continue
				}
				if tipSentEvent.Amount.Cmp(big.NewInt(int64(content.Tip.GetEvent().GetAmount()))) != 0 {
					continue
				}
				if !bytes.Equal(messageId[:], content.Tip.GetEvent().GetMessageId()) {
					continue
				}
				if !bytes.Equal(channelId[:], content.Tip.GetEvent().GetChannelId()) {
					continue
				}
				// match found
				return true, nil
			}

			// Fallback to legacy Tip event for backwards compatibility
			tipEvent, err := filterer.ParseTip(log)
			if err != nil {
				continue // not a tip event
			}
			if tipEvent.TokenId.Cmp(big.NewInt(int64(content.Tip.GetEvent().GetTokenId()))) != 0 {
				continue
			}
			if !bytes.Equal(tipEvent.Currency[:], content.Tip.GetEvent().GetCurrency()) {
				continue
			}
			if !bytes.Equal(tipEvent.Sender[:], content.Tip.GetEvent().GetSender()) {
				continue
			}
			if !bytes.Equal(tipEvent.Receiver[:], content.Tip.GetEvent().GetReceiver()) {
				continue
			}
			if tipEvent.Amount.Cmp(big.NewInt(int64(content.Tip.GetEvent().GetAmount()))) != 0 {
				continue
			}
			if !bytes.Equal(tipEvent.MessageId[:], content.Tip.GetEvent().GetMessageId()) {
				continue
			}
			if !bytes.Equal(tipEvent.ChannelId[:], content.Tip.GetEvent().GetChannelId()) {
				continue
			}
			// match found
			return true, nil
		}
		return false, RiverError(
			Err_INVALID_ARGUMENT,
			"matching tip event not found in receipt logs",
		)
	case *BlockchainTransaction_TokenTransfer_:
		amount := &big.Int{}
		amount, ok := amount.SetString(content.TokenTransfer.GetAmount(), 10)
		if !ok {
			return false, RiverError(Err_INVALID_ARGUMENT, "failed to parse amount")
		}
		filterer, err := erc20.NewErc20Filterer(common.Address{}, nil)
		if err != nil {
			return false, err
		}

		senderAddress := common.BytesToAddress(content.TokenTransfer.GetSender())

		for _, receiptLog := range receipt.Logs {
			if !bytes.Equal(receiptLog.GetAddress(), content.TokenTransfer.GetAddress()) {
				continue
			}
			topics := make([]common.Hash, len(receiptLog.Topics))
			for i, topic := range receiptLog.Topics {
				topics[i] = common.BytesToHash(topic)
			}
			log := ethTypes.Log{
				Address: common.BytesToAddress(receiptLog.Address),
				Topics:  topics,
				Data:    receiptLog.Data,
			}
			transfer, err := filterer.ParseTransfer(log)
			if err != nil {
				continue
			}

			if transfer.Value.Cmp(amount) != 0 {
				continue
			}

			if content.TokenTransfer.IsBuy && transfer.To.Cmp(senderAddress) != 0 {
				continue
			}

			if !content.TokenTransfer.IsBuy && transfer.From.Cmp(senderAddress) != 0 {
				continue
			}

			return true, nil
		}
		return false, RiverError(Err_INVALID_ARGUMENT, "matching transfer event not found in receipt logs")
	case *BlockchainTransaction_SpaceReview_:
		// parse the logs for the review event, make sure it matches the review metadata
		filterer, err := baseContracts.NewSpaceReviewFilterer(common.Address{}, nil)
		if err != nil {
			return false, err
		}
		for _, receiptLog := range receipt.Logs {
			if !bytes.Equal(receiptLog.Address, content.SpaceReview.GetSpaceAddress()) {
				continue
			}

			topics := make([]common.Hash, len(receiptLog.Topics))
			for i, topic := range receiptLog.Topics {
				topics[i] = common.BytesToHash(topic)
			}
			log := ethTypes.Log{
				Address: common.BytesToAddress(receiptLog.Address),
				Topics:  topics,
				Data:    receiptLog.Data,
			}
			switch content.SpaceReview.GetAction() {
			case BlockchainTransaction_SpaceReview_Add:
				reviewEvent, err := filterer.ParseReviewAdded(log)
				if err != nil {
					continue
				}
				if reviewEvent.Rating != uint8(content.SpaceReview.GetEvent().Rating) {
					continue
				}
				if !bytes.Equal(reviewEvent.User[:], content.SpaceReview.GetEvent().User) {
					continue
				}
				return true, nil
			case BlockchainTransaction_SpaceReview_Update:
				reviewEvent, err := filterer.ParseReviewUpdated(log)
				if err != nil {
					continue
				}
				if reviewEvent.Rating != uint8(content.SpaceReview.GetEvent().Rating) {
					continue
				}
				if !bytes.Equal(reviewEvent.User[:], content.SpaceReview.GetEvent().User) {
					continue
				}
				return true, nil
			case BlockchainTransaction_SpaceReview_Delete:
				reviewEvent, err := filterer.ParseReviewDeleted(log)
				if err != nil {
					continue
				}
				if !bytes.Equal(reviewEvent.User[:], content.SpaceReview.GetEvent().User) {
					continue
				}
				return true, nil
			default:
				continue
			}
		}
		return false, RiverError(
			Err_INVALID_ARGUMENT,
			"matching review event not found in receipt logs",
		)
	default:
		return false, RiverError(
			Err_INVALID_ARGUMENT,
			"unknown transaction type - check receipt metadata",
			"transactionType",
			content,
		)
	}
}

func (ru *aeBlockchainTransactionRules) validBlockchainTransaction_CheckReceiptMetadataSolana() (bool, error) {
	receipt := ru.transaction.SolanaReceipt
	if receipt == nil {
		return false, RiverError(Err_INVALID_ARGUMENT, "solana receipt is nil")
	}

	switch content := ru.transaction.Content.(type) {
	case nil:
		// for unspecified types, we don't need to check anything specific
		// the other checks should make sure the transaction is valid and from this user
		return true, nil
	case *BlockchainTransaction_Tip_:
		return false, RiverError(Err_INVALID_ARGUMENT, "solana tip transactions are not supported")
	case *BlockchainTransaction_TokenTransfer_:
		meta := receipt.GetMeta()
		if meta == nil {
			return false, RiverError(Err_INVALID_ARGUMENT, "solana transfer transaction meta is nil")
		}

		sender := string(content.TokenTransfer.Sender)
		// get the amount _before_ the transfer
		idx := sort.Search(len(meta.GetPreTokenBalances()), func(i int) bool {
			return meta.GetPreTokenBalances()[i].Mint == string(content.TokenTransfer.Address) && meta.GetPreTokenBalances()[i].Owner == sender
		})

		// preTokenBalances isn't set when a user opens a token account (buys a token for the 1st time),
		// so we need to check if it's not empty otherwise, we use 0 as the amount before
		amountBefore := big.NewInt(0)
		if idx != len(meta.GetPreTokenBalances()) {
			var ok bool
			amountString := meta.GetPreTokenBalances()[idx].Amount.Amount
			amountBefore, ok = new(big.Int).SetString(amountString, 0)
			if !ok {
				return false, RiverError(Err_INVALID_ARGUMENT, "invalid pre token balance amount", "amount", amountString)
			}
		}

		// get the amount _after_ the transfer
		idx = sort.Search(len(meta.GetPostTokenBalances()), func(i int) bool {
			return meta.GetPostTokenBalances()[i].Mint == string(content.TokenTransfer.Address) && meta.GetPostTokenBalances()[i].Owner == sender
		})
		if idx == len(meta.GetPostTokenBalances()) {
			return false, RiverError(Err_INVALID_ARGUMENT, "solana transfer transaction mint not found in postTokenBalances")
		}
		amountAfter, ok := new(big.Int).SetString(meta.GetPostTokenBalances()[idx].Amount.Amount, 0)
		if !ok {
			return false, RiverError(Err_INVALID_ARGUMENT, "invalid post token balance amount")
		}

		// check the amount
		expectedBalanceDiff, ok := new(big.Int).SetString(content.TokenTransfer.Amount, 0)
		if !ok {
			return false, RiverError(Err_INVALID_ARGUMENT, "invalid balance amount")
		}

		if expectedBalanceDiff.CmpAbs(new(big.Int).Sub(amountAfter, amountBefore)) != 0 {
			return false, RiverError(Err_INVALID_ARGUMENT, "solana transfer transaction amount not equal to balance diff")
		}

		// make sure it's a valid buy or sell
		if content.TokenTransfer.IsBuy && amountAfter.Cmp(amountBefore) < 0 {
			return false, RiverError(Err_INVALID_ARGUMENT, "solana transfer transaction is buy but balance decreased")
		} else if !content.TokenTransfer.IsBuy && amountAfter.Cmp(amountBefore) > 0 {
			return false, RiverError(Err_INVALID_ARGUMENT, "solana transfer transaction is sell but balance increased")
		}
		return true, nil
	default:
		return false, RiverError(
			Err_INVALID_ARGUMENT,
			"unknown transaction type",
			"transactionType",
			content,
		)
	}
}

func (ru *aeReceivedBlockchainTransactionRules) receivedBlockchainTransaction_ChainAuth() (*auth.ChainAuthArgs, error) {
	transaction := ru.receivedTransaction.Transaction
	if transaction == nil {
		return nil, RiverError(Err_INVALID_ARGUMENT, "transaction is nil")
	}

	switch content := transaction.Content.(type) {
	case nil:
		return nil, nil
	case *BlockchainTransaction_Tip_:
		userAddress, err := shared.GetUserAddressFromStreamId(*ru.params.streamView.StreamId())
		if err != nil {
			return nil, err
		}
		if !bytes.Equal(content.Tip.GetToUserAddress(), userAddress.Bytes()) {
			return nil, RiverError(Err_INVALID_ARGUMENT, "to user address is not the user", "toUser", content.Tip.GetToUserAddress(), "user", userAddress.Bytes())
		}
		// make sure that the receiver (in the event emitted from the tipping facet) is one of our wallets
		return auth.NewChainAuthArgsForIsWalletLinked(
			userAddress,
			common.BytesToAddress(content.Tip.GetEvent().GetReceiver()),
		), nil
	default:
		return nil, RiverError(Err_INVALID_ARGUMENT, "unknown received transaction kind for chain auth", "kind", content)
	}
}

func (ru *aeReceivedBlockchainTransactionRules) parentEventForReceivedBlockchainTransaction() (*DerivedEvent, error) {
	transaction := ru.receivedTransaction.Transaction
	if transaction == nil {
		return nil, RiverError(Err_INVALID_ARGUMENT, "transaction is nil")
	}

	switch content := transaction.Content.(type) {
	case nil:
		return nil, RiverError(Err_INVALID_ARGUMENT, "transaction content is unspecified")
	case *BlockchainTransaction_Tip_:
		if content.Tip.GetEvent().GetChannelId() == nil {
			return nil, RiverError(Err_INVALID_ARGUMENT, "transaction channel id is nil")
		}
		// convert to stream id
		streamId, err := shared.StreamIdFromBytes(content.Tip.GetEvent().GetChannelId())
		if err != nil {
			return nil, err
		}
		// forward the tip to the stream as a member event, preserving the original sender as the from address
		return &DerivedEvent{
			Payload: events.Make_MemberPayload_BlockchainTransaction(
				ru.receivedTransaction.FromUserAddress,
				transaction,
			),
			StreamId: streamId,
			Tags:     ru.params.parsedEvent.Event.Tags, // forward tags
		}, nil
	case *BlockchainTransaction_TokenTransfer_:
		return nil, RiverError(Err_INVALID_ARGUMENT, "transfer transactions are not supported", "transaction", transaction)
	case *BlockchainTransaction_SpaceReview_:
		return nil, RiverError(Err_INVALID_ARGUMENT, "space review is not a valid received blockchain transaction")
	default:
		return nil, RiverError(Err_INVALID_ARGUMENT, "unknown transaction content", "content", content)
	}
}

func (ru *aeBlockchainTransactionRules) parentEventForBlockchainTransaction() (*DerivedEvent, error) {
	switch content := ru.transaction.Content.(type) {
	case nil:
		// unspecified just stays in the user stream
		return nil, nil
	case *BlockchainTransaction_Tip_:
		// forward a "tip received" event to the user stream of the toUserAddress
		userStreamId, err := shared.UserStreamIdFromBytes(content.Tip.GetToUserAddress())
		if err != nil {
			return nil, err
		}
		toStreamId, err := shared.StreamIdFromBytes(content.Tip.GetEvent().GetChannelId())
		if err != nil {
			return nil, err
		}
		if shared.ValidChannelStreamId(&toStreamId) ||
			shared.ValidDMChannelStreamId(&toStreamId) ||
			shared.ValidGDMChannelStreamId(&toStreamId) ||
			shared.ValidSpaceStreamId(&toStreamId) {
			return &DerivedEvent{
				Payload: events.Make_UserPayload_ReceivedBlockchainTransaction(
					ru.params.parsedEvent.Event.CreatorAddress,
					ru.transaction,
				),
				StreamId: userStreamId,
				Tags:     ru.params.parsedEvent.Event.Tags, // forward tags
			}, nil
		}

		return nil, RiverError(
			Err_INVALID_ARGUMENT,
			"tip transaction streamId is not a valid channel/dm/gdm stream id",
			"streamId",
			toStreamId,
		)
	case *BlockchainTransaction_TokenTransfer_:
		if content.TokenTransfer.GetChannelId() == nil {
			return nil, RiverError(Err_INVALID_ARGUMENT, "transaction channel id is nil")
		}
		// convert to stream id
		toStreamId, err := shared.StreamIdFromBytes(content.TokenTransfer.GetChannelId())
		if err != nil {
			return nil, err
		}

		if !shared.ValidChannelStreamId(&toStreamId) &&
			!shared.ValidDMChannelStreamId(&toStreamId) &&
			!shared.ValidGDMChannelStreamId(&toStreamId) {
			return nil, RiverError(
				Err_INVALID_ARGUMENT,
				"tip transaction streamId is not a valid channel/dm/gdm stream id",
				"streamId",
				toStreamId,
			)
		}

		// forward the transfer to the stream as a member event, preserving the original sender as the from address
		return &DerivedEvent{
			Payload: events.Make_MemberPayload_BlockchainTransaction(
				ru.params.parsedEvent.Event.CreatorAddress,
				ru.transaction,
			),
			StreamId: toStreamId,
			Tags:     ru.params.parsedEvent.Event.Tags, // forward tags
		}, nil
	case *BlockchainTransaction_SpaceReview_:
		// forward the space review to the space stream
		spaceStreamId, err := shared.SpaceIdFromBytes(content.SpaceReview.GetSpaceAddress())
		if err != nil {
			return nil, err
		}

		// forward the tip to the space stream as a member event, preserving the original sender as the from address
		return &DerivedEvent{
			Payload: events.Make_MemberPayload_BlockchainTransaction(
				ru.params.parsedEvent.Event.CreatorAddress,
				ru.transaction,
			),
			StreamId: spaceStreamId,
			Tags:     ru.params.parsedEvent.Event.Tags, // forward tags if any
		}, nil
	default:
		return nil, RiverError(
			Err_INVALID_ARGUMENT,
			"unknown transaction type - parent event for blockchain transaction",
			"transactionType",
			content,
		)
	}
}

func (ru *aeBlockchainTransactionRules) blockchainTransaction_GetReceipt() (*BlockchainTransactionReceipt, error) {
	return ru.transaction.GetReceipt(), nil
}

// check to see that the transaction is from a wallet linked to the creator
func (ru *aeBlockchainTransactionRules) blockchainTransaction_ChainAuth() (*auth.ChainAuthArgs, error) {
	if ru.transaction.SolanaReceipt != nil {
		// not applicable to Solana transactions for now
		return nil, nil
	}

	if ru.transaction.Receipt == nil {
		return nil, RiverError(Err_INVALID_ARGUMENT, "transaction receipt is nil")
	}

	if bytes.Equal(ru.transaction.Receipt.From, ru.params.parsedEvent.Event.CreatorAddress) {
		return nil, nil
	}
	switch content := ru.transaction.Content.(type) {
	case nil:
		// no content, verify the receipt.from
		return auth.NewChainAuthArgsForIsWalletLinked(
			common.BytesToAddress(ru.params.parsedEvent.Event.CreatorAddress),
			common.BytesToAddress(ru.transaction.Receipt.From),
		), nil
	case *BlockchainTransaction_Tip_:
		// tips can be sent through a bundler, verify the tip sender
		// as specified in the tip content and verified against the logs in blockchainTransaction_CheckReceiptMetadata
		return auth.NewChainAuthArgsForIsWalletLinked(
			common.BytesToAddress(ru.params.parsedEvent.Event.CreatorAddress),
			common.BytesToAddress(content.Tip.GetEvent().GetSender()),
		), nil
	case *BlockchainTransaction_TokenTransfer_:
		return auth.NewChainAuthArgsForIsWalletLinked(
			common.BytesToAddress(ru.params.parsedEvent.Event.CreatorAddress),
			common.BytesToAddress(content.TokenTransfer.GetSender()),
		), nil
	case *BlockchainTransaction_SpaceReview_:
		// space reviews can be sent through a bundler, verify the space review sender
		// as specified in the space review content and verified against the logs in
		// blockchainTransaction_CheckReceiptMetadata
		return auth.NewChainAuthArgsForIsWalletLinked(
			common.BytesToAddress(ru.params.parsedEvent.Event.CreatorAddress),
			common.BytesToAddress(content.SpaceReview.GetEvent().GetUser()),
		), nil
	default:
		return nil, RiverError(
			Err_INVALID_ARGUMENT,
			"unknown transaction type - chain auth",
			"transactionType",
			content,
		)
	}
}

func (ru *aeMembershipRules) validMembershipPayload() (bool, error) {
	if ru.membership == nil {
		return false, RiverError(Err_INVALID_ARGUMENT, "membership is nil")
	}
	return true, nil
}

func (ru *aeMembershipRules) validMembershipLimit() (bool, error) {
	if ru.membership.Op == MembershipOp_SO_JOIN || ru.membership.Op == MembershipOp_SO_INVITE {
		members, err := ru.params.streamView.GetChannelMembers()
		if err != nil {
			return false, err
		}
		if ru.params.streamMembershipLimit > 0 && members.Cardinality() >= ru.params.streamMembershipLimit {
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

	currentMembership, err := ru.params.streamView.GetMembership(userAddress)
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

	inception, err := ru.params.streamView.GetDMChannelInception()
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

	initiatorMembership, err := ru.params.streamView.GetMembership(initiatorAddress)
	if err != nil {
		return false, err
	}
	userMembership, err := ru.params.streamView.GetMembership(userAddress)
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
		// If the joining user is a bot (has app_address), validate sponsor
		if len(ru.membership.AppAddress) > 0 {
			// Bot must have a sponsor address set
			if len(ru.membership.GetAppSponsorAddress()) == 0 {
				return false, RiverError(
					Err_PERMISSION_DENIED,
					"bot joining GDM must have app_sponsor_address set",
					"user",
					userAddress,
				)
			}
			// The sponsor must be the initiator (the member adding the bot)
			if !bytes.Equal(ru.membership.GetAppSponsorAddress(), initiatorAddress) {
				return false, RiverError(
					Err_PERMISSION_DENIED,
					"bot sponsor must be the initiator",
					"sponsor",
					ru.membership.GetAppSponsorAddress(),
					"initiator",
					initiatorAddress,
				)
			}
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
	// for joins and invites, require space membership
	return &DerivedEvent{
		Payload: events.Make_UserPayload_Membership(
			MembershipOp_SO_JOIN,
			*streamParentId,
			common.BytesToAddress(ru.membership.InitiatorAddress),
			nil,
		),
		StreamId: userStreamId,
	}, nil
}

func (ru *aeUserMembershipRules) addRemoveChannelChainAuthForApp(
	userId common.Address,
	appAddress common.Address,
) (*auth.ChainAuthArgs, error) {
	if ru.userMembership == nil {
		return nil, RiverError(Err_INVALID_ARGUMENT, "membership is nil")
	}
	streamId, err := shared.StreamIdFromBytes(ru.userMembership.StreamId)
	if err != nil {
		return nil, err
	}
	if streamId.Type() == shared.STREAM_CHANNEL_BIN {
		return auth.NewChainAuthArgsForChannel(
			streamId.SpaceID(),
			streamId,
			userId,
			auth.PermissionAddRemoveChannels,
			appAddress,
		), nil
	}

	return nil, RiverError(
		Err_PERMISSION_DENIED,
		"Invalid stream for app join, wanted channel",
		"streamId",
		streamId,
	)
}

// ownerChainAuthForInviter validates that the inviter on the UserMembership event has space ownership.
// For apps, we expect the user membership event to be derived from a user membership action posted
// by the space owner; this authorization is required to ensure that apps are added to spaces or channels
// directly by space owners.
func (ru *aeUserMembershipRules) ownerChainAuthForInviter() (*auth.ChainAuthArgs, error) {
	streamId, err := shared.StreamIdFromBytes(ru.userMembership.StreamId)
	if err != nil {
		return nil, err
	}

	if streamId.Type() == shared.STREAM_SPACE_BIN {
		return auth.NewChainAuthArgsForSpace(
			streamId,
			common.Address(ru.userMembership.Inviter),
			auth.PermissionOwnership,
			common.Address{},
		), nil
	}

	if streamId.Type() == shared.STREAM_CHANNEL_BIN {
		return auth.NewChainAuthArgsForChannel(
			streamId.SpaceID(),
			streamId,
			common.Address(ru.userMembership.Inviter),
			auth.PermissionOwnership,
			common.Address{},
		), nil
	}

	return nil, RiverError(
		Err_BAD_STREAM_ID,
		"Invalid stream type for determining ownership",
	).Tag("streamId", streamId).
		Tag("inviter", ru.userMembership.Inviter)
}

// validUserMembershipStream confirms that, if the user stream belongs to an app, the app is
// being added to acceptible stream types. At this time the protocol does not support app membership
// in DM and GDM channels. At this time, non-app users are allowed to join streams of all types.
func (ru *aeUserMembershipRules) validUserMembershipStream() (bool, error) {
	isAppUser, err := ru.params.streamView.IsAppUser()
	if err != nil {
		return false, err
	}

	if !isAppUser {
		return true, nil
	}

	streamId, err := shared.StreamIdFromBytes(ru.userMembership.StreamId)
	if err != nil {
		return false, err
	}

	return streamId.Type() != shared.STREAM_DM_CHANNEL_BIN && streamId.Type() != shared.STREAM_GDM_CHANNEL_BIN, nil
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
	currentMembershipOp, err := ru.params.streamView.GetUserMembership(streamId)
	if err != nil {
		return false, err
	}

	if currentMembershipOp == ru.userMembership.Op {
		return false, nil
	}

	if ru.userMembership.Reason != nil && *ru.userMembership.Reason != MembershipReason_MR_NONE {
		// at this time, the only reasons are for the scrubber so we need to make sure the membership op is leave
		if ru.userMembership.Op != MembershipOp_SO_LEAVE {
			return false, RiverError(
				Err_PERMISSION_DENIED,
				"reasons should be undefined for non-leave events",
				"op",
				ru.userMembership.Op,
			)
		}
		// reasons should only be set by the scrubber at this time
		canAdd, err := ru.params.creatorIsValidNode()
		if !canAdd || err != nil {
			return false, err
		}
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

	// Pass along the app address to the stream where the user's membership is changing.
	lastSnap, err := ru.params.streamView.GetUserSnapshotContent()
	if err != nil {
		return nil, err
	}
	appAddress := common.BytesToAddress(lastSnap.Inception.AppAddress)

	// For GDM streams, if the user is a bot (appAddress != zero), set the app sponsor address
	// to the initiator address. This allows entitlement checks to verify the app is installed
	// on the sponsor's account.
	var appSponsorAddress common.Address
	if shared.ValidGDMChannelStreamId(&toStreamId) && appAddress != (common.Address{}) {
		appSponsorAddress = common.BytesToAddress(initiatorAddress)
	}

	return &DerivedEvent{
		Payload: events.Make_MemberPayload_Membership(
			userMembership.Op,
			userAddress.Bytes(),
			initiatorAddress,
			userMembership.Reason,
			appAddress,
			appSponsorAddress,
		),
		StreamId: toStreamId,
	}, nil
}

// chainAuthForUserMembership computes the optional authorization necessary to change a user's membership.
// Membership authorization is typically computed on the membership event inserted into the stream where
// the membership is changing, but bot users require an additional check that their memberships can only
// be changed by either:
// - the owner of a space where the bot is experiencing a membership change, OR
// - by a node, specifically in the case of membership loss due to scrubbing.
// - by the app itself, specifically in the case of creating a new channel and adding itself
// Thus, for the very specific case when users are bot users, and the membership change is not a node-initiated
// bounce, we want to verify that the initiator of the membership change has space ownership permissions.
// NOTE that at this time, bots cannot be members of DMs or GDMs, so there will always be a space involved
// in bot membership events.
func (ru *aeUserMembershipRules) chainAuthForUserMembership() (*auth.ChainAuthArgs, error) {
	appAddress, err := ru.params.streamView.GetAppAddress()
	if err != nil {
		return nil, err
	}
	isApp := appAddress != (common.Address{})
	userId, err := shared.GetUserAddressFromStreamId(*ru.params.streamView.StreamId())
	if err != nil {
		return nil, err
	}
	isNodeCreator := ru.params.isValidNode(ru.params.parsedEvent.Event.CreatorAddress)
	isNodeInitiator := isNodeCreator &&
		bytes.Equal(ru.userMembership.Inviter, ru.params.parsedEvent.Event.CreatorAddress)
	isNodeBoot := ru.userMembership.Op == MembershipOp_SO_LEAVE && isNodeInitiator
	if isApp && !isNodeBoot {
		if !isNodeCreator {
			return nil, RiverError(
				Err_PERMISSION_DENIED,
				"app memberships should come from derived events, apps can't add themselves",
				"inviter",
				ru.userMembership.Inviter,
			)
		}
		if bytes.Equal(ru.userMembership.Inviter, userId.Bytes()) {
			// if the app invited itself, check to see that they have add remove channel permissions (supposibly the
			// only way we could have gotten here is via a new channel creation)
			return ru.addRemoveChannelChainAuthForApp(userId, appAddress)
		} else {
			// otherwise, check to see that the inviter has space ownership permissions
			return ru.ownerChainAuthForInviter()
		}
	}
	return nil, nil
}

// / user actions perform user membership events on other user's streams
func (ru *aeUserMembershipActionRules) parentEventForUserMembershipAction() (*DerivedEvent, error) {
	if ru.action == nil {
		return nil, RiverError(Err_INVALID_ARGUMENT, "event is not a user membership action event")
	}
	action := ru.action
	actionStreamId, err := shared.StreamIdFromBytes(action.StreamId)
	if err != nil {
		return nil, err
	}
	payload := events.Make_UserPayload_Membership(
		action.Op,
		actionStreamId,
		common.BytesToAddress(ru.params.parsedEvent.Event.CreatorAddress),
		nil,
	)
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

	permission, permissionUser, appAddress, err := ru.getPermissionForMembershipOp()
	if err != nil {
		return nil, err
	}

	if permission == auth.PermissionUndefined {
		return nil, nil
	}

	var chainAuthArgs *auth.ChainAuthArgs
	// Space joins are a special case as they do not require an entitlement check. We simply
	// verify that the user is a space member.
	if ru.membership.Op == MembershipOp_SO_JOIN {
		chainAuthArgs = auth.NewChainAuthArgsForIsSpaceMember(
			*streamId,
			permissionUser,
			appAddress,
		)
	} else {
		chainAuthArgs = auth.NewChainAuthArgsForSpace(
			*streamId,
			permissionUser,
			permission,
			appAddress,
		)
	}
	return chainAuthArgs, nil
}

func (ru *aeMembershipRules) channelMembershipEntitlements() (*auth.ChainAuthArgs, error) {
	channelId := *ru.params.streamView.StreamId()
	spaceId, err := shared.SpaceIdFromChannelId(channelId)
	if err != nil {
		return nil, err
	}

	permission, permissionUser, appAddress, err := ru.getPermissionForMembershipOp()
	if err != nil {
		return nil, err
	}

	if permission == auth.PermissionUndefined {
		return nil, nil
	}

	// ModifyBanning is a space level permission
	// but users with this entitlement should also be entitled to kick users from the channel
	if permission == auth.PermissionModifyBanning {
		return auth.NewChainAuthArgsForSpace(
			spaceId,
			permissionUser,
			permission,
			appAddress,
		), nil
	}

	chainAuthArgs := auth.NewChainAuthArgsForChannel(
		spaceId,
		channelId,
		permissionUser,
		permission,
		appAddress,
	)

	return chainAuthArgs, nil
}

// gdmBotSponsorEntitlements checks if a bot joining a GDM has its app installed on the sponsor's account.
// For non-bot joins, this returns nil (no chain auth required).
// For bot joins, it verifies the app is installed on the sponsor's smart contract account.
func (ru *aeMembershipRules) gdmBotSponsorEntitlements() (*auth.ChainAuthArgs, error) {
	// Only check entitlements for bot joins (when AppAddress is set)
	if ru.membership.Op != MembershipOp_SO_JOIN || len(ru.membership.AppAddress) == 0 {
		return nil, nil
	}

	// Verify the app is installed on the sponsor's account
	sponsorAddress := common.BytesToAddress(ru.membership.GetAppSponsorAddress())
	appAddress := common.BytesToAddress(ru.membership.AppAddress)

	return auth.NewChainAuthArgsForIsAppInstalled(sponsorAddress, appAddress), nil
}

// return function that can be used to check if a user has a permission for a space
func (params *aeParams) spaceEntitlements(permission auth.Permission) func() (*auth.ChainAuthArgs, error) {
	return func() (*auth.ChainAuthArgs, error) {
		spaceId := params.streamView.StreamId()

		if !shared.ValidSpaceStreamId(spaceId) {
			return nil, RiverError(Err_INVALID_ARGUMENT, "invalid space stream id", "streamId", spaceId)
		}
		permissionUser := common.BytesToAddress(params.parsedEvent.Event.CreatorAddress)

		appAddress, err := params.streamView.GetMemberAppAddress(permissionUser)
		if err != nil {
			return nil, err
		}

		chainAuthArgs := auth.NewChainAuthArgsForSpace(
			*spaceId,
			permissionUser,
			permission,
			appAddress,
		)
		return chainAuthArgs, nil
	}
}

// return a function that can be used to check if a user has a permission for a channel
func (params *aeParams) channelEntitlements(permission auth.Permission) func() (*auth.ChainAuthArgs, error) {
	return func() (*auth.ChainAuthArgs, error) {
		userId := common.BytesToAddress(params.parsedEvent.Event.CreatorAddress)
		channelId := *params.streamView.StreamId()
		spaceId, err := shared.SpaceIdFromChannelId(channelId)
		if err != nil {
			return nil, err
		}

		appAddress, err := params.streamView.GetMemberAppAddress(userId)
		if err != nil {
			return nil, err
		}

		chainAuthArgs := auth.NewChainAuthArgsForChannel(
			spaceId,
			channelId,
			userId,
			permission,
			appAddress,
		)

		return chainAuthArgs, nil
	}
}

func (params *aeParams) onEntitlementFailureForUserEvent() (*DerivedEvent, error) {
	userId := common.BytesToAddress(params.parsedEvent.Event.CreatorAddress)
	userStreamId, err := shared.UserStreamIdFromBytes(params.parsedEvent.Event.CreatorAddress)
	if err != nil {
		return nil, err
	}

	channelId := params.streamView.StreamId()
	if !shared.ValidChannelStreamId(channelId) {
		return nil, RiverError(Err_INVALID_ARGUMENT, "invalid channel stream id", "streamId", channelId)
	}

	return &DerivedEvent{
		StreamId: userStreamId,
		Payload: events.Make_UserPayload_Membership(
			MembershipOp_SO_LEAVE,
			*channelId,
			userId,
			nil,
		),
	}, nil
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

func (ru *aeMembershipRules) getPermissionForMembershipOp() (permission auth.Permission, permissionUser common.Address, appAddress common.Address, err error) {
	if ru.membership == nil {
		return auth.PermissionUndefined, common.Address{}, common.Address{}, RiverError(
			Err_INVALID_ARGUMENT,
			"membership is nil",
		)
	}
	membership := ru.membership

	initiatorId := common.BytesToAddress(ru.membership.InitiatorAddress)

	userAddress := common.BytesToAddress(ru.membership.UserAddress)

	currentMembership, err := ru.params.streamView.GetMembership(userAddress.Bytes())
	if err != nil {
		return auth.PermissionUndefined, common.Address{}, common.Address{}, err
	}
	if membership.Op == currentMembership {
		// this could panic, the rule builder should never allow us to get here
		return auth.PermissionUndefined, common.Address{}, common.Address{}, RiverError(
			Err_FAILED_PRECONDITION,
			"membershipOp should not be the same as currentMembership",
		)
	}

	switch membership.Op {
	case MembershipOp_SO_INVITE:
		if currentMembership == MembershipOp_SO_JOIN {
			return auth.PermissionUndefined, common.Address{}, common.Address{}, RiverError(
				Err_FAILED_PRECONDITION,
				"user is already a member of the channel",
				"user",
				userAddress,
				"initiator",
				initiatorId,
			)
		}
		permission = auth.PermissionInvite
		permissionUser = initiatorId

	case MembershipOp_SO_JOIN:
		permission = auth.PermissionRead
		permissionUser = userAddress

	case MembershipOp_SO_LEAVE:
		if currentMembership != MembershipOp_SO_JOIN {
			return auth.PermissionUndefined, common.Address{}, common.Address{}, RiverError(
				Err_FAILED_PRECONDITION,
				"user is not a member of the channel",
				"user",
				userAddress,
				"initiator",
				initiatorId,
			)
		}
		if userAddress != initiatorId && !ru.params.isValidNode(initiatorId[:]) {
			permission = auth.PermissionModifyBanning
			permissionUser = initiatorId
		} else {
			permission = auth.PermissionUndefined
			permissionUser = userAddress
		}

	case MembershipOp_SO_UNSPECIFIED:
		fallthrough

	default:
		return auth.PermissionUndefined, common.Address{}, common.Address{}, RiverError(
			Err_BAD_EVENT,
			"Need valid membership op",
			"op",
			membership.Op,
		)
	}

	// Set appAddress only if the permission user is the membership user address
	if permissionUser == userAddress {
		appAddress = common.BytesToAddress(ru.membership.AppAddress)
	}

	return permission, permissionUser, appAddress, nil
}

func (ru *aePinRules) validPin() (bool, error) {
	if ru.pin == nil {
		return false, RiverError(Err_INVALID_ARGUMENT, "event is not a pin event")
	}
	// check the hash
	if len(ru.pin.EventId) != 32 {
		return false, RiverError(Err_INVALID_ARGUMENT, "invalid message hash")
	}

	// hash the event and check against the hash
	eventBytes, err := proto.Marshal(ru.pin.Event)
	if err != nil {
		return false, err
	}
	computedHash := crypto.TownsHashForEvents.Hash(eventBytes)

	if !bytes.Equal(ru.pin.EventId, computedHash[:]) {
		return false, RiverError(Err_INVALID_ARGUMENT, "invalid message hash")
	}

	// cast as joinable view state
	view := ru.params.streamView
	// get existing pins
	existingPins, err := view.GetPinnedMessages()
	if err != nil {
		return false, err
	}
	// check if we have too many pins
	if len(existingPins) > 100 {
		// if we have more than N pins, we can't add more
		return false, RiverError(Err_INVALID_ARGUMENT, "channel has too many pins")
	}
	// check if the hash is already pinned
	for _, snappedPin := range existingPins {
		if bytes.Equal(snappedPin.Pin.EventId, ru.pin.EventId) {
			return false, RiverError(Err_ALREADY_EXISTS, "message is already pinned")
		}
	}
	return true, nil
}

func (ru *aeUnpinRules) validUnpin() (bool, error) {
	if ru.unpin == nil {
		return false, RiverError(Err_INVALID_ARGUMENT, "event is not an unpin event")
	}
	// check the hash
	if len(ru.unpin.EventId) != 32 {
		return false, RiverError(Err_INVALID_ARGUMENT, "invalid message hash")
	}
	// cast as joinable view state
	view := ru.params.streamView
	// get existing pins
	existingPins, err := view.GetPinnedMessages()
	if err != nil {
		return false, err
	}
	// check if the hash is already pinned
	for _, snappedPin := range existingPins {
		if bytes.Equal(snappedPin.Pin.EventId, ru.unpin.EventId) {
			return true, nil
		}
	}
	return false, RiverError(Err_INVALID_ARGUMENT, "message is not pinned")
}

type HasChannelIdBytes interface {
	channelIdBytes() ([]byte, error)
}

func (w *aeAutojoinRules) channelIdBytes() ([]byte, error) {
	if w.update == nil {
		return nil, RiverError(Err_INVALID_ARGUMENT, "event is not an update autojoin event")
	}
	return w.update.ChannelId, nil
}

func (w *aeHideUserJoinLeaveEventsWrapperRules) channelIdBytes() ([]byte, error) {
	if w.update == nil {
		return nil, RiverError(Err_INVALID_ARGUMENT, "event is not an update channel hide user join leave events event")
	}
	return w.update.ChannelId, nil
}

func (params *aeParams) channelExistsInSpace(spaceChannelPayloadRules HasChannelIdBytes) func() (bool, error) {
	return func() (bool, error) {
		channelIdBytes, err := spaceChannelPayloadRules.channelIdBytes()
		if err != nil {
			return false, err
		}
		channelId, err := shared.StreamIdFromBytes(channelIdBytes)
		if err != nil {
			return false, err
		}

		view := params.streamView
		// check if the channel exists
		_, err = view.GetChannelInfo(channelId)
		if err != nil {
			return false, err
		}

		return true, nil
	}
}

func (ru *aeSpaceChannelRules) validSpaceChannelOp() (bool, error) {
	if ru.channelUpdate == nil {
		return false, RiverError(Err_INVALID_ARGUMENT, "event is not a channel event")
	}

	next := ru.channelUpdate
	view := ru.params.streamView
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

	inception, err := ru.params.streamView.GetMediaInception()
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
	// key solicitations are allowed if they are not empty, or if they are empty and isNewDevice is true and there is no
	// existing device key
	if ru.solicitation == nil {
		return false, RiverError(Err_INVALID_ARGUMENT, "event is not a key solicitation event")
	}

	if len(ru.solicitation.SessionIds) == 0 {
		return false, RiverError(Err_INVALID_ARGUMENT, "session ids are required for all solicitations")
	}

	if !slices.IsSorted(ru.solicitation.SessionIds) {
		return false, RiverError(Err_INVALID_ARGUMENT, "session ids must be sorted")
	}

	if len(ru.solicitation.SessionIds) > 0 {
		for _, sessionId := range ru.solicitation.SessionIds {
			if sessionId == "" {
				return false, RiverError(Err_INVALID_ARGUMENT, "session ids must not be empty")
			}
		}
	}

	return true, nil
}

func (ru *aeKeyFulfillmentRules) validKeyFulfillment() (bool, error) {
	if ru.fulfillment == nil {
		return false, RiverError(Err_INVALID_ARGUMENT, "event is not a key fulfillment event")
	}
	userAddress := ru.fulfillment.UserAddress
	solicitations, err := ru.params.streamView.GetKeySolicitations(userAddress)
	if err != nil {
		return false, err
	}

	if len(ru.fulfillment.SessionIds) > 0 && !slices.IsSorted(ru.fulfillment.SessionIds) {
		return false, RiverError(Err_INVALID_ARGUMENT, "session ids are required")
	}

	// if the fulfillment is ephemeral, the node has no idea that the ephemeral key solicitation this fulfillment is
	// fulfilling
	// exists or not — so we need to allow it
	if ru.params.parsedEvent.Event.Ephemeral {
		return true, nil
	}

	// loop over solicitations, see if the device key exists
	for _, solicitation := range solicitations {
		if solicitation.DeviceKey == ru.fulfillment.DeviceKey {
			if solicitation.IsNewDevice {
				// if the user has indicated that this is a new device, it's possible that a client
				// will fulfill with all known sessionids, but not have an overlapping sessionId
				// this will clear the IsNewDevice flag, but the solicitation will still be valid, and
				// a different client could complete the fulfillment
				return true, nil
			}
			if hasCommon(solicitation.SessionIds, ru.fulfillment.SessionIds) {
				return true, nil
			}
			return false, RiverError(Err_NOT_FOUND, "solicitation with common session ids not found")
		}
	}
	return false, RiverError(Err_INVALID_ARGUMENT, "solicitation with matching device key not found")
}

func (ru *aeEncryptedGroupSessionRules) validEncryptedGroupSession() (bool, error) {
	if ru.session == nil {
		return false, RiverError(Err_INVALID_ARGUMENT, "event is not a group encryption session event")
	}
	// check to make sure there are unique session ids and device ids here
	// first build up a map of deviceId => sessionIds in the view
	view := ru.params.streamView
	streamId, err := shared.StreamIdFromBytes(ru.session.StreamId)
	if err != nil {
		return false, err
	}
	groupEncryptionSessions, err := view.GetGroupEncryptionSessions(streamId)
	if err != nil {
		return false, err
	}
	// now check to make sure there is at least one new session in this group
	for deviceId := range ru.session.Ciphertexts {
		for _, sessionId := range ru.session.SessionIds {
			if _, ok := groupEncryptionSessions[deviceId]; !ok {
				// new device! let's go!
				return true, nil
			}
			if _, ok := groupEncryptionSessions[deviceId][sessionId]; !ok {
				// new session! let's go!
				return true, nil
			}
		}
	}
	// don't allow it, but don't error, this is a no-op
	return false, nil
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

func (params *aeParams) log() *logging.Log {
	return logging.FromCtx(params.ctx)
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
