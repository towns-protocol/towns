package rules

import (
	"bytes"
	"context"
	"fmt"
	"time"

	"github.com/towns-protocol/towns/core/node/crypto"

	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/node/auth"
	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
)

type NodeRegistryChecks interface {
	IsOperator(address common.Address) bool
}

type csParams struct {
	ctx                   context.Context
	cfg                   *config.Config
	maxChunkCount         int
	streamMembershipLimit int
	streamId              shared.StreamId
	parsedEvents          []*events.ParsedEvent
	requestMetadata       map[string][]byte
	inceptionPayload      IsInceptionPayload
	creatorAddress        common.Address
	creatorUserStreamId   shared.StreamId
	creatorAppAddress     common.Address
	nodeRegistryChecks    NodeRegistryChecks
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

type csUserMetadataRules struct {
	params    *csParams
	inception *UserMetadataPayload_Inception
}

type csUserSettingsRules struct {
	params    *csParams
	inception *UserSettingsPayload_Inception
}

type csUserInboxRules struct {
	params    *csParams
	inception *UserInboxPayload_Inception
}

type csMetadataRules struct {
	params    *csParams
	inception *MetadataPayload_Inception
}

/*
*
* CanCreateStream
* a pure function with no side effects that returns a boolean value and prerequesits
* for creating a stream.
*
  - @return CreateStreamRules // rules for creating a stream
  - @return error // if adding result would result in invalid state

*
* example valid states:
* (nil, nil, nil) // stream can be created
* (nil, nil, error) // stream falied validation
* (nil, []*DerivedEvent, nil) // stream can be created and derived events should be created after
* (chainAuthArgs, nil, nil) // stream can be created if chainAuthArgs are satisfied
* (chainAuthArgs, []*DerivedEvent, nil) // stream can be created if chainAuthArgs are satisfied and derived events should be created after
*/
func CanCreateStream(
	ctx context.Context,
	cfg *config.Config,
	chainConfig crypto.OnChainConfiguration,
	currentTime time.Time,
	streamId shared.StreamId,
	parsedEvents []*events.ParsedEvent,
	requestMetadata map[string][]byte,
	nodeRegistryChecks NodeRegistryChecks,
) (*CreateStreamRules, error) {
	if len(parsedEvents) == 0 {
		return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, "no events")
	}

	if parsedEvents[0].Event.DelegateExpiryEpochMs > 0 &&
		isPastExpiry(currentTime, parsedEvents[0].Event.DelegateExpiryEpochMs) {
		return nil, RiverError(
			Err_PERMISSION_DENIED,
			"event delegate has expired",
			"currentTime",
			currentTime,
			"expiry",
			parsedEvents[0].Event.DelegateExpiryEpochMs,
		)
	}

	creatorAddress := common.BytesToAddress(parsedEvents[0].Event.GetCreatorAddress())
	creatorUserStreamId := shared.UserStreamIdFromAddr(creatorAddress)
	creatorAppAddress := common.Address{}
	if appAddress, ok := requestMetadata["appAddress"]; ok {
		if len(appAddress) == 20 {
			creatorAppAddress = common.BytesToAddress(appAddress)
		} else if len(appAddress) != 0 {
			return nil, RiverError(
				Err_BAD_STREAM_CREATION_PARAMS,
				"invalid ethereum appAddress length",
				"length", len(appAddress), "expectedLength", 20,
			)
		}
	}

	for _, event := range parsedEvents {
		if event.Event.PrevMiniblockHash != nil {
			return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, "PrevMiniblockHash should be nil")
		}
		if !bytes.Equal(event.Event.CreatorAddress, creatorAddress.Bytes()) {
			return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, "all events should have the same creator address")
		}
	}

	inceptionEvent := parsedEvents[0]
	inceptionPayload := inceptionEvent.Event.GetInceptionPayload()
	if inceptionPayload == nil {
		return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, "first event is not an inception event")
	}

	if !streamId.EqualsBytes(inceptionPayload.GetStreamId()) {
		return nil, RiverError(
			Err_BAD_STREAM_CREATION_PARAMS,
			"stream id in request does not match stream id in inception event",
			"inceptionStreamId",
			inceptionPayload.GetStreamId(),
			"streamId",
			streamId,
		)
	}

	settings := chainConfig.Get()

	r := &csParams{
		ctx:                   ctx,
		cfg:                   cfg,
		maxChunkCount:         int(settings.MediaMaxChunkCount),
		streamMembershipLimit: int(settings.MembershipLimits.ForType(streamId.Type())),
		streamId:              streamId,
		parsedEvents:          parsedEvents,
		requestMetadata:       requestMetadata,
		inceptionPayload:      inceptionPayload,
		creatorAddress:        creatorAddress,
		creatorUserStreamId:   creatorUserStreamId,
		creatorAppAddress:     creatorAppAddress,
		nodeRegistryChecks:    nodeRegistryChecks,
	}

	builder := r.canCreateStream()
	r.log().Debugw("CanCreateStream", "builder", builder)
	return builder.run()
}

func (ru *csParams) log() *logging.Log {
	return logging.FromCtx(ru.ctx)
}

func (ru *csParams) inceptionAppAddress() []byte {
	switch p := ru.inceptionPayload.(type) {
	case *UserInboxPayload_Inception:
		return p.AppAddress
	case *UserMetadataPayload_Inception:
		return p.AppAddress
	case *UserPayload_Inception:
		return p.AppAddress
	case *UserSettingsPayload_Inception:
		return p.AppAddress
	default:
		return nil
	}
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
				ru.params.streamIdTypeIsCorrect(shared.STREAM_SPACE_BIN),
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
				ru.params.streamIdTypeIsCorrect(shared.STREAM_CHANNEL_BIN),
				ru.params.eventCountMatches(2),
				ru.validateChannelJoinEvent,
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

		if shared.ValidUserIdBytes(inception.UserId) {
			return builder.
				check(
					ru.params.streamIdTypeIsCorrect(shared.STREAM_MEDIA_BIN),
					ru.params.eventCountInRange(1, 2),
					ru.checkMediaInceptionPayload,
				).
				requireUserAddr(inception.UserId).
				requireChainAuth(ru.getChainAuthForMediaStream)
		}

		return builder.
			check(
				ru.params.streamIdTypeIsCorrect(shared.STREAM_MEDIA_BIN),
				ru.params.eventCountInRange(1, 2),
				ru.checkMediaInceptionPayload,
			).
			requireMembership(
				inception.ChannelId,
				inception.SpaceId,
			).
			requireChainAuth(ru.getChainAuthForMediaStream)

	case *DmChannelPayload_Inception:
		ru := &csDmChannelRules{
			params:    ru,
			inception: inception,
		}
		return builder.
			check(
				ru.params.streamIdTypeIsCorrect(shared.STREAM_DM_CHANNEL_BIN),
				ru.params.eventCountMatches(3),
				ru.checkDMInceptionPayload,
			).
			requireUserAddr(ru.inception.SecondPartyAddress).
			requireChainAuth(ru.dmStreamCreationChainAuth).
			requireDerivedEvents(ru.derivedDMMembershipEvents)

	case *GdmChannelPayload_Inception:
		ru := &csGdmChannelRules{
			params:    ru,
			inception: inception,
		}
		return builder.
			check(
				ru.params.streamIdTypeIsCorrect(shared.STREAM_GDM_CHANNEL_BIN),
				ru.params.eventCountGreaterThanOrEqualTo(4),
				ru.checkGDMPayloads,
			).
			requireUserAddr(ru.getGDMUserAddresses()[1:]...).
			requireDerivedEvents(ru.derivedGDMMembershipEvents)

	case *UserPayload_Inception:
		ru := &csUserRules{
			params:    ru,
			inception: inception,
		}
		return builder.check(
			ru.params.streamIdTypeIsCorrect(shared.STREAM_USER_BIN),
			ru.params.eventCountMatches(1),
			ru.params.isUserStreamId,
		).requireChainAuth(ru.params.getNewUserStreamChainAuth)

	case *UserMetadataPayload_Inception:
		ru := &csUserMetadataRules{
			params:    ru,
			inception: inception,
		}
		return builder.check(
			ru.params.streamIdTypeIsCorrect(shared.STREAM_USER_METADATA_KEY_BIN),
			ru.params.eventCountMatches(1),
			ru.params.isUserStreamId,
		).requireChainAuth(ru.params.getNewUserStreamChainAuth)

	case *UserSettingsPayload_Inception:
		ru := &csUserSettingsRules{
			params:    ru,
			inception: inception,
		}
		return builder.check(
			ru.params.streamIdTypeIsCorrect(shared.STREAM_USER_SETTINGS_BIN),
			ru.params.eventCountMatches(1),
			ru.params.isUserStreamId,
		).requireChainAuth(ru.params.getNewUserStreamChainAuth)

	case *UserInboxPayload_Inception:
		ru := &csUserInboxRules{
			params:    ru,
			inception: inception,
		}
		return builder.check(
			ru.params.streamIdTypeIsCorrect(shared.STREAM_USER_INBOX_BIN),
			ru.params.eventCountMatches(1),
			ru.params.isUserStreamId,
		).requireChainAuth(ru.params.getNewUserStreamChainAuth)

	case *MetadataPayload_Inception:
		ru := &csMetadataRules{
			params:    ru,
			inception: inception,
		}
		return builder.
			check(
				ru.params.streamIdTypeIsCorrect(shared.STREAM_METADATA_BIN),
				ru.params.eventCountMatches(1),
				ru.params.metadataShardIsInRange,
				ru.params.creatorIsOperator,
			)

	default:
		return builder.fail(unknownPayloadType(inception))
	}
}

func (ru *csParams) streamIdTypeIsCorrect(expectedType byte) func() error {
	return func() error {
		if ru.streamId.Type() == expectedType {
			return nil
		} else {
			return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "invalid stream id type", "streamId", ru.streamId, "expectedType", expectedType)
		}
	}
}

func (ru *csParams) isUserStreamId() error {
	addressInName, err := shared.GetUserAddressFromStreamId(ru.streamId)
	if err != nil {
		return err
	}

	// TODO: there is also ru.creatorAddress, should it be used here?
	creatorAddress := common.BytesToAddress(ru.parsedEvents[0].Event.GetCreatorAddress())

	if addressInName != creatorAddress {
		return RiverError(
			Err_BAD_STREAM_CREATION_PARAMS,
			"stream id doesn't match creator address",
			"streamId",
			ru.streamId,
			"addressInName",
			addressInName,
			"creator",
			creatorAddress,
		)
	}
	return nil
}

func (ru *csParams) eventCountMatches(eventCount int) func() error {
	return func() error {
		if len(ru.parsedEvents) != eventCount {
			return RiverError(
				Err_BAD_STREAM_CREATION_PARAMS,
				"bad event count",
				"count",
				len(ru.parsedEvents),
				"expectedCount",
				eventCount,
			)
		}
		return nil
	}
}

func (ru *csParams) eventCountGreaterThanOrEqualTo(eventCount int) func() error {
	return func() error {
		if len(ru.parsedEvents) < eventCount {
			return RiverError(
				Err_BAD_STREAM_CREATION_PARAMS,
				"bad event count",
				"count",
				len(ru.parsedEvents),
				"expectedCount",
				eventCount,
			)
		}
		return nil
	}
}

func (ru *csParams) eventCountInRange(min, max int) func() error {
	return func() error {
		if len(ru.parsedEvents) < min || len(ru.parsedEvents) > max {
			return RiverError(
				Err_BAD_STREAM_CREATION_PARAMS,
				"bad event count",
				"count",
				len(ru.parsedEvents),
				"minExpectedCount", min, "maxExpectedCount", max,
			)
		}
		return nil
	}
}

func (ru *csParams) creatorIsOperator() error {
	if ru.nodeRegistryChecks.IsOperator(ru.creatorAddress) {
		return nil
	}
	return RiverError(Err_PERMISSION_DENIED, "creator is not an operator", "creator", ru.creatorAddress)
}

func (ru *csParams) metadataShardIsInRange() error {
	shard, err := shared.ShardFromMetadataStreamId(ru.streamId)
	if err != nil {
		return err
	}
	if shard <= ru.cfg.MetadataShardMask {
		return nil
	}
	return RiverError(
		Err_BAD_STREAM_ID,
		"metadata shard is out of range",
		"shard",
		shard,
		"mask",
		ru.cfg.MetadataShardMask,
	)
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
		return RiverError(
			Err_BAD_STREAM_CREATION_PARAMS,
			"bad join user",
			"id",
			membership.UserAddress,
			"created_by",
			creatorAddress,
		)
	}
	return nil
}

func (ru *csSpaceRules) getCreateSpaceChainAuth() (*auth.ChainAuthArgs, error) {
	return auth.NewChainAuthArgsForSpace(
		ru.params.streamId,
		ru.params.creatorAddress,
		auth.PermissionAddRemoveChannels, // todo should be isOwner...
		ru.params.creatorAppAddress,
	), nil
}

func (ru *csChannelRules) getCreateChannelChainAuth() (*auth.ChainAuthArgs, error) {
	channelId, err := shared.StreamIdFromBytes(ru.inception.StreamId)
	if err != nil {
		return nil, err
	}
	spaceId, err := shared.SpaceIdFromChannelId(channelId)
	if err != nil {
		return nil, err
	}
	return auth.NewChainAuthArgsForSpace(
		spaceId, // check parent space id
		ru.params.creatorAddress,
		auth.PermissionAddRemoveChannels,
		ru.params.creatorAppAddress,
	), nil
}

func (ru *csChannelRules) derivedChannelSpaceParentEvent() (*DerivedEvent, error) {
	channelId, err := shared.StreamIdFromBytes(ru.inception.StreamId)
	if err != nil {
		return nil, err
	}
	spaceId, err := shared.SpaceIdFromChannelId(channelId)
	if err != nil {
		return nil, err
	}

	channelSettings := ru.inception.ChannelSettings
	// If channel settings unspecified, apply defaults
	if channelSettings == nil {
		channelSettings = &SpacePayload_ChannelSettings{
			Autojoin:                shared.IsDefaultChannelId(channelId),
			HideUserJoinLeaveEvents: false,
		}
	}
	payload := events.Make_SpacePayload_ChannelUpdate(
		ChannelOp_CO_CREATED,
		channelId,
		&EventRef{
			StreamId:  ru.inception.StreamId,
			Hash:      ru.params.parsedEvents[0].Envelope.Hash,
			Signature: ru.params.parsedEvents[0].Envelope.Signature,
		},
		channelSettings,
	)

	return &DerivedEvent{
		StreamId: spaceId,
		Payload:  payload,
	}, nil
}

func (ru *csParams) derivedMembershipEvent() (*DerivedEvent, error) {
	creatorUserStreamId := shared.UserStreamIdFromAddr(ru.creatorAddress)
	payload := events.Make_UserPayload_Membership(
		MembershipOp_SO_JOIN,
		ru.streamId,
		ru.creatorAddress,
		nil,
	)

	return &DerivedEvent{
		StreamId: creatorUserStreamId,
		Payload:  payload,
	}, nil
}

func (ru *csMediaRules) checkMediaInceptionPayload() error {
	if ru.inception.ChunkCount > int32(ru.params.maxChunkCount) {
		return RiverError(
			Err_BAD_STREAM_CREATION_PARAMS,
			fmt.Sprintf("chunk count must be less than or equal to %d", ru.params.maxChunkCount),
		)
	}

	if len(ru.inception.ChannelId) == 0 && len(ru.inception.SpaceId) == 0 &&
		shared.ValidUserIdBytes(ru.inception.UserId) {
		return nil
	}

	// checks for space or channel media stream
	if len(ru.inception.ChannelId) == 0 {
		if len(ru.inception.SpaceId) == 0 {
			return RiverError(
				Err_BAD_STREAM_CREATION_PARAMS,
				"both space id and channel id must not be nil or empty for media stream",
			)
		}

		if shared.ValidSpaceStreamIdBytes(ru.inception.SpaceId) {
			return nil
		} else {
			return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "invalid space id")
		}
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

func (ru *csParams) getNewUserStreamChainAuth() (*auth.ChainAuthArgs, error) {
	// if we're not using chain auth don't bother
	if ru.cfg.DisableBaseChain {
		return nil, nil
	}

	// Test-only bypass for user stream creation: if enabled and header present, suppress chain auth.
	if ru.cfg != nil && ru.cfg.TestEntitlementsBypassSecret != "" {
		if auth.IsTestEntitlementBypassEnabled(ru.ctx) {
			return nil, nil
		}
	}

	appAddress := ru.inceptionAppAddress()
	if len(appAddress) > 0 {
		if len(appAddress) != 20 {
			return nil, RiverError(
				Err_BAD_STREAM_CREATION_PARAMS,
				"invalid ethereum address length",
				"address",
				appAddress,
				"length",
				len(appAddress),
				"expectedLength",
				20,
			)
		}
		return auth.NewChainAuthArgsForApp(ru.creatorAddress, common.Address(appAddress)), nil
	}

	// get the user id for the stream
	userAddress, err := shared.GetUserAddressFromStreamId(ru.streamId)
	if err != nil {
		return nil, err
	}

	// Check for dmPartnerAddress in metadata - this allows users to create their user stream
	// when they want to DM a bot. The dmPartner must be a bot and the bot module must be installed.
	if dmPartnerBytes, ok := ru.requestMetadata["dmPartnerAddress"]; ok {
		if len(dmPartnerBytes) != 20 {
			return nil, RiverError(
				Err_BAD_STREAM_CREATION_PARAMS,
				"invalid dmPartnerAddress length",
				"length", len(dmPartnerBytes),
				"expectedLength", 20,
			)
		}
		dmPartnerAddress := common.BytesToAddress(dmPartnerBytes)
		return auth.NewChainAuthArgsForDmValidation(userAddress, dmPartnerAddress), nil
	}

	// we don't have a good way to check to see if they have on chain assets yet,
	// so require a space id to be passed in the metadata and check that the user has read permissions there
	if spaceIdBytes, ok := ru.requestMetadata["spaceId"]; ok {
		spaceId, err := shared.StreamIdFromBytes(spaceIdBytes)
		if err != nil {
			return nil, err
		}
		return auth.NewChainAuthArgsForIsSpaceMember(
			spaceId,
			userAddress,
			ru.creatorAppAddress,
		), nil
	} else {
		return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, "A spaceId where spaceContract.isMember(userId)==true or a dmPartnerAddress for a bot must be provided in metadata for user stream")
	}
}

func (ru *csMediaRules) getChainAuthForMediaStream() (*auth.ChainAuthArgs, error) {
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
			spaceId,
			channelId,
			ru.params.creatorAddress,
			auth.PermissionWrite,
			ru.params.creatorAppAddress,
		), nil
	} else if shared.ValidSpaceStreamIdBytes(ru.inception.SpaceId) {
		spaceId, err := shared.StreamIdFromBytes(ru.inception.SpaceId)
		if err != nil {
			return nil, err
		}

		return auth.NewChainAuthArgsForSpace(
			spaceId,
			ru.params.creatorAddress,
			auth.PermissionModifySpaceSettings, // TODO: should it be Owner?
			ru.params.creatorAppAddress,
		), nil
	} else {
		return nil, nil
	}
}

func (ru *csDmChannelRules) checkDMInceptionPayload() error {
	if len(ru.inception.FirstPartyAddress) != 20 || len(ru.inception.SecondPartyAddress) != 20 {
		return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "invalid party addresses for dm channel")
	}
	if !bytes.Equal(ru.params.creatorAddress.Bytes(), ru.inception.FirstPartyAddress) {
		return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "creator must be first party for dm channel")
	}
	if !shared.ValidDMChannelStreamIdBetween(
		ru.params.streamId,
		ru.inception.FirstPartyAddress,
		ru.inception.SecondPartyAddress,
	) {
		return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "invalid stream id for dm channel")
	}
	return nil
}

func (ru *csDmChannelRules) dmStreamCreationChainAuth() (*auth.ChainAuthArgs, error) {
	secondPartyAddr := common.BytesToAddress(ru.inception.SecondPartyAddress)
	return auth.NewChainAuthArgsForDmValidation(ru.params.creatorAddress, secondPartyAddr), nil
}

func (ru *csDmChannelRules) derivedDMMembershipEvents() ([]*DerivedEvent, error) {
	firstPartyStream, err := shared.UserStreamIdFromBytes(ru.inception.FirstPartyAddress)
	if err != nil {
		return nil, err
	}

	secondPartyStream, err := shared.UserStreamIdFromBytes(ru.inception.SecondPartyAddress)
	if err != nil {
		return nil, err
	}

	// first party
	firstPartyPayload := events.Make_UserPayload_Membership(
		MembershipOp_SO_JOIN,
		ru.params.streamId,
		ru.params.creatorAddress,
		nil,
	)

	// second party
	secondPartyPayload := events.Make_UserPayload_Membership(
		MembershipOp_SO_JOIN,
		ru.params.streamId,
		ru.params.creatorAddress,
		nil,
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

func (ru *csGdmChannelRules) checkGDMMemberPayload(
	event *events.ParsedEvent,
	expectedUserAddress *common.Address,
) error {
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

	if expectedUserAddress != nil && !bytes.Equal(expectedUserAddress.Bytes(), membershipPayload.UserAddress) {
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

	// GDM memberships cannot exceed the configured limit. the first event is the inception event
	// and is subtracted from the parsed events count.
	if len(ru.params.parsedEvents)-1 > ru.params.streamMembershipLimit {
		return RiverError(
			Err_INVALID_ARGUMENT,
			"membership limit reached",
			"membershipLimit",
			ru.params.streamMembershipLimit)
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

func (ru *csGdmChannelRules) getGDMUserAddresses() [][]byte {
	userAddresses := make([][]byte, 0, len(ru.params.parsedEvents)-1)
	for _, event := range ru.params.parsedEvents[1:] {
		payload := event.Event.GetMemberPayload()
		if payload == nil {
			continue
		}
		membershipPayload := payload.GetMembership()
		if membershipPayload == nil {
			continue
		}
		userAddresses = append(userAddresses, membershipPayload.UserAddress)
	}
	return userAddresses
}

func (ru *csGdmChannelRules) derivedGDMMembershipEvents() ([]*DerivedEvent, error) {
	userAddresses := ru.getGDMUserAddresses()
	// swap the creator into the last position in the array
	// send the creator's join event last, so that any failure will be retired by the client
	if len(userAddresses) < 1 {
		return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, "gdm channel requires 3+ users")
	}
	creatorUserAddress := userAddresses[0]
	userAddresses = append(userAddresses[1:], creatorUserAddress)
	// create derived events for each user
	derivedEvents := make([]*DerivedEvent, 0, len(userAddresses))
	for _, userAddress := range userAddresses {
		userStreamId, err := shared.UserStreamIdFromBytes(userAddress)
		if err != nil {
			return nil, err
		}
		payload := events.Make_UserPayload_Membership(
			MembershipOp_SO_JOIN,
			ru.params.streamId,
			ru.params.creatorAddress,
			nil,
		)
		derivedEvents = append(derivedEvents, &DerivedEvent{
			StreamId: userStreamId,
			Payload:  payload,
		})
	}
	return derivedEvents, nil
}
