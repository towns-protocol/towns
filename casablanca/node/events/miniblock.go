package events

import (
	. "casablanca/node/protocol"

	"google.golang.org/protobuf/types/known/emptypb"
	"google.golang.org/protobuf/types/known/timestamppb"
)

func Make_GenisisMiniblockHeader(parsedEvents []*ParsedEvent) (*MiniblockHeader, error) {
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
