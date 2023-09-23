package events

import (
	"bytes"
	"strings"

	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"

	. "casablanca/node/base"
	. "casablanca/node/crypto"
	. "casablanca/node/protocol"
)

type ParsedEvent struct {
	Event         *StreamEvent
	Envelope      *Envelope
	Hash          []byte
	HashStr       string   `dlog:"omit"` // strangely Go can't have key maps of type []byte...
	PrevEventStrs []string `dlog:"omit"`
	SignerPubKey  []byte
	shortDebugStr string
}

func (e *ParsedEvent) GetEnvelopeBytes() ([]byte, error) {
	return proto.Marshal(e.Envelope)
}

type FullEvent struct {
	StreamId    string
	SeqNum      int64
	ParsedEvent *ParsedEvent
}

func ParseEvent(envelope *Envelope) (*ParsedEvent, error) {
	hash := TownsHash(envelope.Event)
	if !bytes.Equal(hash, envelope.Hash) {
		return nil, RiverErrorf(Err_BAD_EVENT_HASH, "Bad hash provided, computed %x, got %x", hash, envelope.Hash)
	}

	signerPubKey, err := RecoverSignerPublicKey(hash, envelope.Signature)
	if err != nil {
		return nil, err
	}

	var streamEvent StreamEvent
	err = proto.Unmarshal(envelope.Event, &streamEvent)
	if err != nil {
		return nil, err
	}

	if len(streamEvent.DelegateSig) > 0 {
		err = CheckDelegateSig(streamEvent.CreatorAddress, signerPubKey, streamEvent.DelegateSig)
		if err != nil {
			// The old style signature is a standard ethereum message signature.
			// TODO(HNT-1380): once we switch to the new signing model, remove this call
			err2 := CheckEthereumMessageSignature(streamEvent.CreatorAddress, signerPubKey, streamEvent.DelegateSig)
			if err2 != nil {
				return nil, RiverErrorf(Err_BAD_EVENT_SIGNATURE, "%s and (old delegate) %s", err.Error(), err2.Error())
			}
		}
	} else {
		address := PublicKeyToAddress(signerPubKey)
		if !bytes.Equal(address.Bytes(), streamEvent.CreatorAddress) {
			return nil, RiverErrorf(Err_BAD_EVENT_SIGNATURE, "Bad signature provided, computed address %x, event creatorAddress %x", address, streamEvent.CreatorAddress)
		}
	}

	prevEventStrs := make([]string, len(streamEvent.PrevEvents))
	for i, prevEvent := range streamEvent.PrevEvents {
		prevEventStrs[i] = string(prevEvent)
	}

	return &ParsedEvent{
		Event:         &streamEvent,
		Envelope:      envelope,
		Hash:          envelope.Hash,
		HashStr:       string(envelope.Hash),
		PrevEventStrs: prevEventStrs,
		SignerPubKey:  signerPubKey,
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
