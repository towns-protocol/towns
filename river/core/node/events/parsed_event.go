package events

import (
	"bytes"
	"strings"

	"github.com/ethereum/go-ethereum/common"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"

	. "github.com/river-build/river/core/node/base"
	. "github.com/river-build/river/core/node/crypto"
	. "github.com/river-build/river/core/node/protocol"
)

type ParsedEvent struct {
	Event             *StreamEvent
	Envelope          *Envelope
	Hash              common.Hash
	PrevMiniblockHash *common.Hash `dlog:"omit"`
	SignerPubKey      []byte
	shortDebugStr     string
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
	hash := RiverHash(envelope.Event)
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
			return nil, RiverError(Err_BAD_EVENT_SIGNATURE, "Bad signature provided", "computed address", address, "event creatorAddress", streamEvent.CreatorAddress)
		}
	}

	PrevMiniblockHash := common.BytesToHash(streamEvent.PrevMiniblockHash)
	return &ParsedEvent{
		Event:             &streamEvent,
		Envelope:          envelope,
		Hash:              common.BytesToHash(envelope.Hash),
		PrevMiniblockHash: &PrevMiniblockHash,
		SignerPubKey:      signerPubKey,
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
			return nil, err
		}
		parsedEvents[i] = parsedEvent
	}
	return parsedEvents, nil
}

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
