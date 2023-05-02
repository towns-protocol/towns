package events

import (
	"bytes"
	"strings"

	"github.com/gologme/log"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"

	. "casablanca/node/base"
	. "casablanca/node/crypto"
	. "casablanca/node/protocol"
)

type ParsedEvent struct {
	Event    *StreamEvent
	Envelope *Envelope
	Hash     []byte
}

type FullEvent struct {
	StreamId    string
	SeqNum      int64
	ParsedEvent *ParsedEvent
}

func ParseEvent(envelope *Envelope, strict bool) (*ParsedEvent, error) {
	hash := TownsHash(envelope.Event)
	if !bytes.Equal(hash, envelope.Hash) {
		if strict {
			return nil, RpcErrorf(Err_BAD_EVENT_HASH, "Bad hash provided, computed %x, got %x", hash, envelope.Hash)
		} else {
			log.Warnf("Bad hash provided, computed %x, got %x", hash, envelope.Hash)
		}
	}

	signerPubKey, err := RecoverSignerPublicKey(hash, envelope.Signature)
	if err != nil {
		if strict {
			return nil, err
		} else {
			log.Warnf("Bad signature provided, %s", err.Error())
		}
	}

	var streamEvent StreamEvent
	err = proto.Unmarshal(envelope.Event, &streamEvent)
	if err != nil {
		if strict {
			return nil, err
		} else {
			log.Warnf("Bad event provided, %s", err.Error())
		}
	}

	if len(streamEvent.DelegateSig) > 0 {
		err = CheckDelegateSig(streamEvent.CreatorAddress, signerPubKey, streamEvent.DelegateSig)
		if err != nil {
			err2 := CheckOldDelegateSig(streamEvent.CreatorAddress, signerPubKey, streamEvent.DelegateSig)
			if err2 != nil {
				if strict {
					return nil, RpcErrorf(Err_BAD_EVENT_SIGNATURE, "%s and (old delegate) %s", err.Error(), err2.Error())
				} else {
					log.Warnf("%s and (old delegate) %s", err.Error(), err2.Error())
				}
			}
		}
	} else {
		address := PublicKeyToAddress(signerPubKey)
		if !bytes.Equal(address.Bytes(), streamEvent.CreatorAddress) {
			if strict {
				return nil, RpcErrorf(Err_BAD_EVENT_SIGNATURE, "Bad signature provided, computed address %x, event creatorAddress %x", address, streamEvent.CreatorAddress)
			} else {
				log.Warnf("Bad signature provided, computed address %x, event creatorAddress %x", address, streamEvent.CreatorAddress)
			}
		}
	}

	return &ParsedEvent{
		Event:    &streamEvent,
		Envelope: envelope,
		Hash:     envelope.Hash,
	}, nil
}

// TODO(HNT-1381): needs to be refactored
func FormatEventsToJson(events []*Envelope) string {
	sb := strings.Builder{}
	sb.WriteString("[")
	for idx, event := range events {
		parsedEvent, err := ParseEvent(event, true)
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
		parsedEvent, err := ParseEvent(event, true)
		if err != nil {
			return nil, err
		}
		parsedEvents[i] = parsedEvent
	}
	return parsedEvents, nil
}

func (e *ParsedEvent) GetInceptionPayload() *Payload_Inception {
	return e.Event.GetPayload().GetInception()
}

func (e *ParsedEvent) GetJoinableStreamPayload() *Payload_JoinableStream {
	return e.Event.GetPayload().GetJoinableStream()
}
