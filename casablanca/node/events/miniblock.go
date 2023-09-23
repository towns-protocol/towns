package events

import (
	. "casablanca/node/base"
	. "casablanca/node/protocol"

	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/emptypb"
	"google.golang.org/protobuf/types/known/timestamppb"
)

func Make_GenisisMiniblockHeader(parsedEvents []*ParsedEvent) (*MiniblockHeader, error) {
	if len(parsedEvents) <= 0 {
		return nil, RiverError(Err_STREAM_EMPTY, "no events to make genisis miniblock header")
	}
	if parsedEvents[0].Event.GetInceptionPayload() == nil {
		return nil, RiverError(Err_STREAM_NO_INCEPTION_EVENT, "first event must be inception event")
	}
	for _, event := range parsedEvents[1:] {
		if event.Event.GetInceptionPayload() != nil {
			return nil, RiverError(Err_BAD_EVENT, "inception event can only be first event")
		}
		if event.Event.GetMiniblockHeader() != nil {
			return nil, RiverError(Err_BAD_EVENT, "block header can't be a block event")
		}
	}

	snapshot, err := Make_GenisisSnapshot(parsedEvents)
	if err != nil {
		return nil, err
	}

	eventHashes := make([][]byte, len(parsedEvents))
	for i, event := range parsedEvents {
		eventHashes[i] = event.Hash
	}

	return &MiniblockHeader{
		MiniblockNum: 0,
		Timestamp:    NextMiniblockTimestamp(nil),
		EventHashes:  eventHashes,
		Snapshot:     snapshot,
		Content: &MiniblockHeader_None{
			None: &emptypb.Empty{},
		},
	}, nil

}

func NextMiniblockTimestamp(prevBlockTimestamp *timestamppb.Timestamp) *timestamppb.Timestamp {
	now := timestamppb.Now()

	if prevBlockTimestamp != nil {
		if now.Seconds < prevBlockTimestamp.Seconds ||
			(now.Seconds == prevBlockTimestamp.Seconds && now.Nanos <= prevBlockTimestamp.Nanos) {
			now.Seconds = prevBlockTimestamp.Seconds + 1
			now.Nanos = 0
		}
	}

	return now
}

type miniblockInfo struct {
	headerEvent *ParsedEvent
	events      []*ParsedEvent
	proto       *Miniblock
}

func (b *miniblockInfo) header() *MiniblockHeader {
	return b.headerEvent.Event.GetMiniblockHeader()
}

func (b *miniblockInfo) lastEvent() *ParsedEvent {
	if len(b.events) > 0 {
		return b.events[len(b.events)-1]
	} else {
		return nil
	}
}

func (b *miniblockInfo) forEachEvent(op func(e *ParsedEvent) (bool, error)) error {
	for _, event := range b.events {
		c, err := op(event)
		if !c {
			return err
		}
	}
	c, err := op(b.headerEvent)
	if !c {
		return err
	}
	return nil
}

func NewMiniblockInfoFromBytes(bytes []byte) (*miniblockInfo, error) {
	var pb Miniblock
	err := proto.Unmarshal(bytes, &pb)
	if err != nil {
		return nil, err
	}

	return NewMiniblockInfoFromProto(&pb)
}

func NewMiniblockInfoFromProto(pb *Miniblock) (*miniblockInfo, error) {
	headerEvent, err := ParseEvent(pb.Header)
	if err != nil {
		return nil, err
	}

	events, err := ParseEvents(pb.Events)
	if err != nil {
		return nil, err
	}

	// TODO: add header validation, num of events, prev block hash, block num, etc

	return &miniblockInfo{
		headerEvent: headerEvent,
		events:      events,
		proto:       pb,
	}, nil
}

func NewMiniblockInfoFromParsed(headerEvent *ParsedEvent, events []*ParsedEvent) (*miniblockInfo, error) {
	if headerEvent.Event.GetMiniblockHeader() == nil {
		return nil, RiverError(Err_BAD_EVENT, "header event must be a block header")
	}

	envelopes := make([]*Envelope, len(events))
	for i, e := range events {
		envelopes[i] = e.Envelope
	}

	return &miniblockInfo{
		headerEvent: headerEvent,
		events:      events,
		proto: &Miniblock{
			Header: headerEvent.Envelope,
			Events: envelopes,
		},
	}, nil
}

func (b *miniblockInfo) ToBytes() ([]byte, error) {
	return proto.Marshal(b.proto)
}
