package events

import (
	"bytes"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/ethereum/go-ethereum/common"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/crypto"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

type ParsedEvent struct {
	Event         *StreamEvent
	Envelope      *Envelope
	Hash          common.Hash
	MiniblockRef  *MiniblockRef
	SignerPubKey  []byte
	shortDebugStr string
}

func (e *ParsedEvent) GetEnvelopeBytes() ([]byte, error) {
	b, err := proto.Marshal(e.Envelope)
	if err == nil {
		return b, nil
	}
	return nil, AsRiverError(err, Err_INTERNAL).
		Message("Failed to marshal parsed event envelope to bytes").
		Func("GetEnvelopeBytes")
}

func ParseEvent(envelope *Envelope) (*ParsedEvent, error) {
	if envelope == nil {
		return nil, RiverError(Err_BAD_EVENT, "Nil envelope provided").Func("ParseEvent")
	}
	hash := TownsHashForEvents.Hash(envelope.Event)
	if !bytes.Equal(hash[:], envelope.Hash) {
		return nil, RiverError(Err_BAD_EVENT_HASH, "Bad hash provided", "computed", hash, "got", envelope.Hash)
	}

	signerPubKey, err := RecoverSignerPublicKey(hash[:], envelope.Signature)
	if err != nil {
		return nil, err
	}

	var streamEvent StreamEvent
	err = proto.Unmarshal(envelope.Event, &streamEvent)
	if err != nil {
		return nil, AsRiverError(err, Err_INVALID_ARGUMENT).
			Message("Failed to decode stream event from bytes").
			Func("ParseEvent")
	}

	if len(streamEvent.DelegateSig) > 0 {
		err := CheckDelegateSig(
			streamEvent.CreatorAddress,
			signerPubKey,
			streamEvent.DelegateSig,
			streamEvent.DelegateExpiryEpochMs,
		)
		if err != nil {
			return nil, WrapRiverError(
				Err_BAD_EVENT_SIGNATURE,
				err,
			).Message("Bad signature").
				Func("ParseEvent")
		}
	} else {
		address := PublicKeyToAddress(signerPubKey)
		if !bytes.Equal(address.Bytes(), streamEvent.CreatorAddress) {
			return nil, RiverError(Err_BAD_EVENT_SIGNATURE, "Bad signature provided",
				"computed address", address,
				"event creatorAddress", streamEvent.CreatorAddress)
		}
	}

	prevMiniblockNum := int64(-1)
	if streamEvent.PrevMiniblockNum != nil {
		prevMiniblockNum = *streamEvent.PrevMiniblockNum
	}

	return &ParsedEvent{
		Event:    &streamEvent,
		Envelope: envelope,
		Hash:     common.BytesToHash(envelope.Hash),
		MiniblockRef: &MiniblockRef{
			Hash: common.BytesToHash(streamEvent.PrevMiniblockHash),
			Num:  prevMiniblockNum,
		},
		SignerPubKey: signerPubKey,
	}, nil
}

func (e *ParsedEvent) ShortDebugStr() string {
	if e == nil {
		return "nil"
	}
	if (e.shortDebugStr) != "" {
		return e.shortDebugStr
	}

	e.shortDebugStr = FormatEventShort(e)
	return e.shortDebugStr
}

func FormatEventToJsonSB(sb *strings.Builder, event *ParsedEvent) {
	sb.WriteString(protojson.Format(event.Event))
}

// TODO(HNT-1381): needs to be refactored
func FormatEventsToJson(events []*Envelope) string {
	sb := strings.Builder{}
	sb.WriteString("[")
	for idx, event := range events {
		parsedEvent, err := ParseEvent(event)
		if err == nil {
			sb.WriteString("{ \"envelope\": ")

			sb.WriteString(protojson.Format(parsedEvent.Envelope))
			sb.WriteString(", \"event\": ")
			sb.WriteString(protojson.Format(parsedEvent.Event))
			sb.WriteString(" }")
		} else {
			sb.WriteString("{ \"error\": \"" + err.Error() + "\" }")
		}
		if idx < len(events)-1 {
			sb.WriteString(",")
		}
	}
	sb.WriteString("]")
	return sb.String()
}

func ParseEvents(events []*Envelope) ([]*ParsedEvent, error) {
	parsedEvents := make([]*ParsedEvent, len(events))
	for i, event := range events {
		parsedEvent, err := ParseEvent(event)
		if err != nil {
			return nil, AsRiverError(err, Err_BAD_EVENT).
				Tag("CorruptEventIndex", i).
				Func("ParseEvents")
		}
		parsedEvents[i] = parsedEvent
	}
	return parsedEvents, nil
}

// TODO: doesn't belong here, refactor
func (e *ParsedEvent) GetChannelMessage() *ChannelPayload_Message {
	switch payload := e.Event.Payload.(type) {
	case *StreamEvent_ChannelPayload:
		switch cp := payload.ChannelPayload.Content.(type) {
		case *ChannelPayload_Message:
			return cp
		}
	}
	return nil
}

func (e *ParsedEvent) GetEncryptedMessage() *EncryptedData {
	switch payload := e.Event.Payload.(type) {
	case *StreamEvent_ChannelPayload:
		switch cp := payload.ChannelPayload.Content.(type) {
		case *ChannelPayload_Message:
			return cp.Message
		}
	case *StreamEvent_DmChannelPayload:
		switch cp := payload.DmChannelPayload.Content.(type) {
		case *DmChannelPayload_Message:
			return cp.Message
		}
	case *StreamEvent_GdmChannelPayload:
		switch cp := payload.GdmChannelPayload.Content.(type) {
		case *GdmChannelPayload_Message:
			return cp.Message
		}
	}
	return nil
}

type streamSettings struct {
	DisableMiniblockCreation bool
	LightStream              bool
}

type channelSettings struct {
	Autojoin                bool
	HideUserJoinLeaveEvents bool
}

// ParsedString prints the content of the ParsedEvent according to it's event type.
func (e *ParsedEvent) ParsedString() string {
	return e.ParsedStringWithIndent("")
}

func (e *ParsedEvent) ParsedStringWithIndent(indent string) string {
	switch payload := e.Event.Payload.(type) {
	case *StreamEvent_ChannelPayload:
		{
			switch content := payload.ChannelPayload.Content.(type) {
			case *ChannelPayload_Inception_:
				{
					bytes, err := json.MarshalIndent(struct {
						Type            string
						SpaceId         string
						StreamId        string
						StreamSettings  streamSettings
						ChannelSettings channelSettings
					}{
						Type:     "ChannelPayload_Inception",
						SpaceId:  hex.EncodeToString(content.Inception.SpaceId),
						StreamId: hex.EncodeToString(content.Inception.StreamId),
						StreamSettings: streamSettings{
							DisableMiniblockCreation: content.Inception.GetSettings().GetDisableMiniblockCreation(),
							LightStream:              content.Inception.GetSettings().GetLightStream(),
						},
						ChannelSettings: channelSettings{
							Autojoin:                content.Inception.GetChannelSettings().GetAutojoin(),
							HideUserJoinLeaveEvents: content.Inception.GetChannelSettings().GetHideUserJoinLeaveEvents(),
						},
					}, indent, "  ")
					if err != nil {
						return "<ChannelPayload_Inception>"
					}
					return string(bytes)
				}
			case *ChannelPayload_Message:
				{
					bytes, err := json.MarshalIndent(struct {
						Type           string
						Message        string
						SessionId      string
						CreatorAddress string
					}{
						Type:           "ChannelPayload_Message",
						Message:        content.Message.Ciphertext,
						SessionId:      hex.EncodeToString(content.Message.SessionIdBytes),
						CreatorAddress: hex.EncodeToString(e.Event.CreatorAddress),
					}, indent, "  ")
					if err != nil {
						return "<ChannelPayload_Message>"
					}
					return string(bytes)
				}
			default:
				return "<ChannelPayload>"
			}
		}
	case *StreamEvent_MemberPayload:
		{
			switch content := payload.MemberPayload.Content.(type) {
			case *MemberPayload_Membership_:
				{
					bytes, err := json.MarshalIndent(struct {
						Type             string
						UserAddress      string
						InitiatorAddress string
						Op               string
					}{
						Type:             "MemberPayload_Membership",
						UserAddress:      hex.EncodeToString(content.Membership.UserAddress),
						InitiatorAddress: hex.EncodeToString(content.Membership.InitiatorAddress),
						Op:               content.Membership.Op.String(),
					}, indent, "  ")
					if err != nil {
						return "<MemberPayload_Membership>"
					}
					return string(bytes)
				}
			default:
				return "<MemberPayload>"
			}
		}
	case *StreamEvent_UserSettingsPayload:
		{
			switch content := payload.UserSettingsPayload.Content.(type) {
			case *UserSettingsPayload_Inception_:
				{
					bytes, err := json.MarshalIndent(struct {
						Type     string
						StreamId string
					}{
						Type:     "UserSettingsPayload_Inception",
						StreamId: hex.EncodeToString(content.Inception.StreamId),
					}, indent, "  ")
					if err != nil {
						return "<UserSettingsPayload_Inception>"
					}
					return string(bytes)
				}
			case *UserSettingsPayload_FullyReadMarkers_:
				{
					var data map[string]interface{}
					if err := json.Unmarshal([]byte(content.FullyReadMarkers.GetContent().GetData()), &data); err != nil {
						return fmt.Sprintf("%v", err)
					}
					bytes, err := json.MarshalIndent(struct {
						Type     string
						StreamId string
						Content  any
					}{
						Type:     "UserSettingsPayload_FullyReadMarkers",
						StreamId: hex.EncodeToString(content.FullyReadMarkers.StreamId),
						Content:  data,
					}, indent, "  ")
					if err != nil {
						return "<UserSettingsPayload_FullyReadMarkers>"
					}
					return string(bytes)
				}
			case *UserSettingsPayload_UserBlock_:
				{
					bytes, err := json.MarshalIndent(struct {
						Type           string
						UserId         string
						IsBlocked      bool
						EventNum       int64
						CreatorAddress string
					}{
						Type:           "UserSettingsPayload_UserBlock",
						UserId:         hex.EncodeToString(content.UserBlock.UserId),
						IsBlocked:      content.UserBlock.IsBlocked,
						EventNum:       content.UserBlock.EventNum,
						CreatorAddress: hex.EncodeToString(e.Event.CreatorAddress),
					}, indent, "  ")
					if err != nil {
						return "<UserSettingsPayload_UserBlock>"
					}
					return string(bytes)
				}
			default:
				return "<UserSettingsPayload>"
			}
		}
	case *StreamEvent_UserPayload:
		{
			switch content := payload.UserPayload.Content.(type) {
			case *UserPayload_Inception_:
				{
					bytes, err := json.MarshalIndent(struct {
						Type     string
						StreamId string
					}{
						Type:     "UserPayload_Inception",
						StreamId: hex.EncodeToString(content.Inception.StreamId),
					}, indent, "  ")
					if err != nil {
						return "<UserPayload_Inception>"
					}
					return string(bytes)
				}
			case *UserPayload_UserMembership_:
				{
					bytes, err := json.MarshalIndent(struct {
						Type           string
						StreamId       string
						Op             string
						CreatorAddress string
					}{
						Type:           "UserPayload_UserMembership",
						StreamId:       hex.EncodeToString(content.UserMembership.StreamId),
						Op:             content.UserMembership.Op.String(),
						CreatorAddress: hex.EncodeToString(e.Event.CreatorAddress),
					}, indent, "  ")
					if err != nil {
						return "<UserPayload_UserMembership>"
					}
					return string(bytes)
				}
			case *UserPayload_UserMembershipAction_:
				{
					bytes, err := json.MarshalIndent(struct {
						Type           string
						StreamId       string
						UserId         string
						Op             string
						CreatorAddress string
					}{
						Type:           "UserPayload_UserMembershipAction",
						StreamId:       hex.EncodeToString(content.UserMembershipAction.StreamId),
						UserId:         hex.EncodeToString(content.UserMembershipAction.UserId),
						Op:             content.UserMembershipAction.Op.String(),
						CreatorAddress: hex.EncodeToString(e.Event.CreatorAddress),
					}, indent, "  ")
					if err != nil {
						return "<UserPayload_UserMembershipAction>"
					}
					return string(bytes)
				}
			case *UserPayload_BlockchainTransaction:
				{
					bytes, err := json.MarshalIndent(struct {
						Type            string
						TransactionHash string
						CreatorAddress  string
					}{
						Type:            "UserPayload_BlockchainTransaction",
						TransactionHash: hex.EncodeToString(content.BlockchainTransaction.Receipt.TransactionHash),
						CreatorAddress:  hex.EncodeToString(e.Event.CreatorAddress),
					}, indent, "  ")
					if err != nil {
						return "<UserPayload_BlockchainTransaction>"
					}
					return string(bytes)
				}
			case *UserPayload_ReceivedBlockchainTransaction_:
				{
					bytes, err := json.MarshalIndent(struct {
						Type            string
						TransactionHash string
						FromUserAddress string
						CreatorAddress  string
					}{
						Type:            "UserPayload_ReceivedBlockchainTransaction",
						TransactionHash: hex.EncodeToString(content.ReceivedBlockchainTransaction.Transaction.Receipt.TransactionHash),
						FromUserAddress: hex.EncodeToString(content.ReceivedBlockchainTransaction.FromUserAddress),
						CreatorAddress:  hex.EncodeToString(e.Event.CreatorAddress),
					}, indent, "  ")
					if err != nil {
						return "<UserPayload_ReceivedBlockchainTransaction>"
					}
					return string(bytes)
				}
			default:
				return "<UserPayload>"
			}
		}
	case *StreamEvent_UserMetadataPayload:
		{
			switch content := payload.UserMetadataPayload.Content.(type) {
			case *UserMetadataPayload_Inception_:
				{
					bytes, err := json.MarshalIndent(struct {
						Type     string
						StreamId string
					}{
						Type:     "UserMetadataPayload_Inception",
						StreamId: hex.EncodeToString(content.Inception.StreamId),
					}, indent, "  ")
					if err != nil {
						return "<UserMetadataPayload_Inception>"
					}
					return string(bytes)
				}
			case *UserMetadataPayload_EncryptionDevice_:
				{
					bytes, err := json.MarshalIndent(struct {
						Type           string
						DeviceKey      string
						FallbackKey    string
						CreatorAddress string
					}{
						Type:           "UserMetadataPayload_EncryptionDevice",
						DeviceKey:      content.EncryptionDevice.DeviceKey,
						FallbackKey:    content.EncryptionDevice.FallbackKey,
						CreatorAddress: hex.EncodeToString(e.Event.CreatorAddress),
					}, indent, "  ")
					if err != nil {
						return "<UserMetadataPayload_EncryptionDevice>"
					}
					return string(bytes)
				}
			case *UserMetadataPayload_ProfileImage:
				{
					bytes, err := json.MarshalIndent(struct {
						Type           string
						Ciphertext     string
						SessionId      string
						CreatorAddress string
					}{
						Type:           "UserMetadataPayload_ProfileImage",
						Ciphertext:     content.ProfileImage.Ciphertext,
						SessionId:      hex.EncodeToString(content.ProfileImage.SessionIdBytes),
						CreatorAddress: hex.EncodeToString(e.Event.CreatorAddress),
					}, indent, "  ")
					if err != nil {
						return "<UserMetadataPayload_ProfileImage>"
					}
					return string(bytes)
				}
			case *UserMetadataPayload_Bio:
				{
					bytes, err := json.MarshalIndent(struct {
						Type           string
						Ciphertext     string
						SessionId      string
						CreatorAddress string
					}{
						Type:           "UserMetadataPayload_Bio",
						Ciphertext:     content.Bio.Ciphertext,
						SessionId:      hex.EncodeToString(content.Bio.SessionIdBytes),
						CreatorAddress: hex.EncodeToString(e.Event.CreatorAddress),
					}, indent, "  ")
					if err != nil {
						return "<UserMetadataPayload_Bio>"
					}
					return string(bytes)
				}
			default:
				return "<UserMetadataPayload>"
			}
		}
	case *StreamEvent_UserInboxPayload:
		{
			switch content := payload.UserInboxPayload.Content.(type) {
			case *UserInboxPayload_Inception_:
				{
					bytes, err := json.MarshalIndent(struct {
						Type     string
						StreamId string
					}{
						Type:     "UserInboxPayload_Inception",
						StreamId: hex.EncodeToString(content.Inception.StreamId),
					}, indent, "  ")
					if err != nil {
						return "<UserInboxPayload_Inception>"
					}
					return string(bytes)
				}
			case *UserInboxPayload_Ack_:
				{
					bytes, err := json.MarshalIndent(struct {
						Type           string
						DeviceKey      string
						MiniblockNum   int64
						CreatorAddress string
					}{
						Type:           "UserInboxPayload_Ack",
						DeviceKey:      content.Ack.DeviceKey,
						MiniblockNum:   content.Ack.MiniblockNum,
						CreatorAddress: hex.EncodeToString(e.Event.CreatorAddress),
					}, indent, "  ")
					if err != nil {
						return "<UserInboxPayload_Ack>"
					}
					return string(bytes)
				}
			case *UserInboxPayload_GroupEncryptionSessions_:
				{
					bytes, err := json.MarshalIndent(struct {
						Type             string
						StreamId         string
						SenderKey        string
						SessionIds       []string
						CiphertextsCount int
						Algorithm        string
						CreatorAddress   string
					}{
						Type:             "UserInboxPayload_GroupEncryptionSessions",
						StreamId:         hex.EncodeToString(content.GroupEncryptionSessions.StreamId),
						SenderKey:        content.GroupEncryptionSessions.SenderKey,
						SessionIds:       content.GroupEncryptionSessions.SessionIds,
						CiphertextsCount: len(content.GroupEncryptionSessions.Ciphertexts),
						Algorithm:        content.GroupEncryptionSessions.Algorithm,
						CreatorAddress:   hex.EncodeToString(e.Event.CreatorAddress),
					}, indent, "  ")
					if err != nil {
						return "<UserInboxPayload_GroupEncryptionSessions>"
					}
					return string(bytes)
				}
			default:
				return "<UserInboxPayload>"
			}
		}
	default:
		return "<StreamEvent>"
	}
}
