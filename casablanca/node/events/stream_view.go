package events

import (
	"bytes"
	. "casablanca/node/base"
	. "casablanca/node/protocol"
	. "casablanca/node/utils"
	"fmt"
	"os"
	"runtime/debug"
	"sync"
)

type StreamView interface {
	StreamId() string
	InceptionEvent() *ParsedEvent
	InceptionPayload() IsInceptionPayload
	JoinedUsers() (map[string]struct{}, error)
	LastEvent() *ParsedEvent
	Envelopes() []*Envelope
	SyncCookie() *SyncCookie
}

var debugLogMutex = &sync.Mutex{}

func degugLogEvents(events []*ParsedEvent, markEvent string, problem error) {
	debugLogMutex.Lock()
	defer debugLogMutex.Unlock()
	for i, e := range events {
		var marker string
		if e.HashStr == markEvent {
			marker = " <=="
		}
		fmt.Printf("%3d %s%s\n", i, e.ShortDebugStr(), marker)
	}
	fmt.Printf("Error: %s\n", problem.Error())
	if DebugCorruptionExit() {
		fmt.Printf("%s", debug.Stack())
		os.Exit(1)
	}
}

func topologicalSort(events []*ParsedEvent, eventsByHash map[string]*ParsedEvent) (sorted []*ParsedEvent, err error) {
	sorted = make([]*ParsedEvent, 0, len(events))
	visited := make(map[string]bool)

	for _, e := range events {
		if !visited[e.HashStr] {
			visited[e.HashStr] = true
			sorted, err = dfs(e, visited, events, eventsByHash, sorted)
			if err != nil {
				return
			}
		}
	}

	return
}

func dfs(e *ParsedEvent, visited map[string]bool, events []*ParsedEvent, eventsByHash map[string]*ParsedEvent, sorted []*ParsedEvent) ([]*ParsedEvent, error) {
	for _, p := range e.PrevEventStrs {
		if !visited[p] {
			pe := eventsByHash[p]
			if pe == nil {
				err := RpcErrorf(Err_BAD_EVENT, "MakeStreamView: prev event not found, prev_event_hash=%s, event=%s", FormatHashFromString(p), e.ShortDebugStr())
				if DebugCorruptionPrint() {
					fmt.Printf("%d\n", len(eventsByHash))
					degugLogEvents(events, e.HashStr, err)
				}
				return nil, err
			}
			visited[p] = true
			sorted2, err := dfs(pe, visited, events, eventsByHash, sorted)
			if err != nil {
				return nil, err
			}
			sorted = sorted2
		}
	}
	return append(sorted, e), nil
}

func MakeStreamView(envelopes []*Envelope) (*streamViewImpl, error) {
	unsortedEvents, err := ParseEvents(envelopes)
	if err != nil {
		return nil, err
	}
	return MakeStreamViewFromParsedEvents(unsortedEvents)
}

func MakeStreamViewFromParsedEvents(unsortedEvents []*ParsedEvent) (*streamViewImpl, error) {
	// TODO: HNT-1854: Change storage to be block-aware.
	//
	// Currently this function reconstructs blocks from flat events, since this is what current
	// storage implemntation returns. In the future storage will be updated to represent blocks
	// and minipool directly, and this function will be updated to use them.
	//
	// Currently storage returns events in non-append order, so we need to sort them.

	if len(unsortedEvents) <= 0 {
		return nil, RpcErrorf(Err_STREAM_EMPTY, "MakeStreamView: No events")
	}

	eventsByHash := make(map[string]*ParsedEvent)

	for _, e := range unsortedEvents {
		if _, ok := eventsByHash[e.HashStr]; !ok {
			eventsByHash[e.HashStr] = e
		} else {
			err := RpcErrorf(Err_DUPLICATE_EVENT, "MakeStreamView: Duplicate event hash, event=%s", e.ShortDebugStr())
			if DebugCorruptionPrint() {
				degugLogEvents(unsortedEvents, e.HashStr, err)
			}
			return nil, err
		}
	}

	events, err := topologicalSort(unsortedEvents, eventsByHash)
	if err != nil {
		return nil, err
	}

	if events[0].Event.GetInceptionPayload() == nil {
		return nil, RpcErrorf(Err_BAD_EVENT, "MakeStreamView: First event is not inception")
	}

	streamId := events[0].Event.GetInceptionPayload().GetStreamId()

	blocks := make([]*miniblockInfo, 0, len(events)/8)
	for _, event := range events {
		header := event.Event.GetMiniblockHeader()
		if header != nil {
			if header.MiniblockNum != int64(len(blocks)) {
				return nil, RpcErrorf(Err_BAD_BLOCK, "MakeStreamView: block number mismatch, expected=%d, actual=%d", len(blocks), header.MiniblockNum)
			}

			if len(blocks) > 0 {
				if header.PrevMiniblockHash == nil {
					return nil, RpcErrorf(Err_BAD_BLOCK, "MakeStreamView: block hash is nil, block=%s", event.ShortDebugStr())
				}
				if !bytes.Equal(blocks[len(blocks)-1].headerEvent.Hash, header.PrevMiniblockHash) {
					return nil, RpcErrorf(Err_BAD_BLOCK, "MakeStreamView: block hash mismatch, block=%s", event.ShortDebugStr())
				}
			} else {
				if header.PrevMiniblockHash != nil {
					return nil, RpcErrorf(Err_BAD_BLOCK, "MakeStreamView: block hash is not nil, block=%s", event.ShortDebugStr())
				}
			}

			delete(eventsByHash, event.HashStr)

			blockEvents := make([]*ParsedEvent, 0, len(header.EventHashes))
			for _, hash := range header.EventHashes {
				eventHashStr := string(hash)
				e := eventsByHash[eventHashStr]
				if e == nil {
					return nil, RpcErrorf(Err_BAD_BLOCK, "MakeStreamView: block event not found, block=%s, event_hash=%s", e.ShortDebugStr(), FormatHashFromString(eventHashStr))
				}
				delete(eventsByHash, eventHashStr)
				blockEvents = append(blockEvents, e)
			}

			blocks = append(blocks, &miniblockInfo{
				headerEvent: event,
				events:      blockEvents,
			})
		}
	}

	if len(blocks) <= 0 {
		return nil, RpcErrorf(Err_BAD_BLOCK, "MakeStreamView: No blocks")
	}

	// Now eventsByHash contains events that are not in any block, and thus are part of the minipool.
	minipoolEvents := NewOrderedMap[string, *ParsedEvent](len(eventsByHash))
	for _, e := range events {
		if _, ok := eventsByHash[e.HashStr]; ok {
			minipoolEvents.Set(e.HashStr, e)
		}
	}

	return &streamViewImpl{
		streamId: streamId,
		blocks:   blocks,
		minipool: newMiniPoolInstance(minipoolEvents),
	}, nil
}

type streamViewImpl struct {
	streamId string

	blocks   []*miniblockInfo
	minipool *minipoolInstance
}

func (r *streamViewImpl) copyAndAddEvent(event *ParsedEvent) (*streamViewImpl, error) {
	if event.Event.GetMiniblockHeader() != nil {
		return r.copyAndApplyBlock(event)
	}

	// TODO: HNT-1843: Re-enable block-aware event duplicate checks
	// There is a need to reject duplicate events, but there is no efficient way to do it without scanning
	// all blocks (and minipool). Also, this doesn't work in presense of snapshots.
	// The fix for this is to allow events to be added only if they reference "recent" block and
	// to check only recent blocks for duplicates.

	r = &streamViewImpl{
		streamId: r.streamId,
		blocks:   r.blocks,
		minipool: r.minipool.copyAndAddEvent(event),
	}
	return r, nil
}

func (r *streamViewImpl) lastBlock() *miniblockInfo {
	return r.blocks[len(r.blocks)-1]
}

func (r *streamViewImpl) makeMiniblockHeader() *MiniblockHeader {
	hashes := make([][]byte, 0, r.minipool.events.Len())
	_ = r.minipool.forEachEvent(func(e *ParsedEvent) (bool, error) {
		hashes = append(hashes, e.Hash)
		return true, nil
	})
	last := r.lastBlock()
	return &MiniblockHeader{
		MiniblockNum:      last.header().MiniblockNum + 1,
		Timestamp:         NextMiniblockTimestamp(last.header().Timestamp),
		EventHashes:       hashes,
		PrevMiniblockHash: last.headerEvent.Hash,
	}
}

// In 1.21 there is built-in max! (facepalm)
func MaxInt_(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func (r *streamViewImpl) copyAndApplyBlock(headerEvent *ParsedEvent) (*streamViewImpl, error) {
	header := headerEvent.Event.GetMiniblockHeader()
	if header == nil {
		return nil, RpcErrorf(Err_INTERNAL_ERROR, "streamViewImpl: non block event not allowed, stream=%s, event=%s", r.streamId, headerEvent.ShortDebugStr())
	}

	lastBlock := r.lastBlock()
	if header.MiniblockNum != lastBlock.header().MiniblockNum+1 {
		return nil, RpcErrorf(Err_BAD_BLOCK, "streamViewImpl: block number mismatch, expected=%d, actual=%d", lastBlock.header().MiniblockNum+1, header.MiniblockNum)
	}
	if !bytes.Equal(lastBlock.headerEvent.Hash, header.PrevMiniblockHash) {
		return nil, RpcErrorf(Err_BAD_BLOCK, "streamViewImpl: block hash mismatch, expected=%s, actual=%s", FormatHashFromString(string(lastBlock.headerEvent.Hash)), FormatHashFromString(string(header.PrevMiniblockHash)))
	}

	remaining := make(map[string]*ParsedEvent, MaxInt_(r.minipool.events.Len()-len(header.EventHashes), 0))
	for k, v := range r.minipool.events.Map {
		remaining[k] = v
	}

	eventsInBlock := make([]*ParsedEvent, 0, len(header.EventHashes))
	for _, hash := range header.EventHashes {
		eventHashStr := string(hash)
		if e, ok := remaining[eventHashStr]; ok {
			eventsInBlock = append(eventsInBlock, e)
			delete(remaining, eventHashStr)
		} else {
			return nil, RpcErrorf(Err_BAD_BLOCK, "streamViewImpl: block event not found, stream=%s, event_hash=%s", r.streamId, FormatHashFromString(eventHashStr))
		}
	}

	minipoolEvents := NewOrderedMap[string, *ParsedEvent](len(remaining))
	for _, e := range r.minipool.events.Values {
		if _, ok := remaining[e.HashStr]; ok {
			minipoolEvents.Set(e.HashStr, e)
		}
	}

	return &streamViewImpl{
		streamId: r.streamId,
		blocks:   append(r.blocks, &miniblockInfo{headerEvent: headerEvent, events: eventsInBlock}),
		minipool: newMiniPoolInstance(minipoolEvents),
	}, nil
}

func (r *streamViewImpl) StreamId() string {
	return r.streamId
}

func (r *streamViewImpl) InceptionEvent() *ParsedEvent {
	return r.blocks[0].events[0]
}

func (r *streamViewImpl) InceptionPayload() IsInceptionPayload {
	return r.InceptionEvent().Event.GetInceptionPayload()
}

func (r *streamViewImpl) forEachEvent(startBlock int, op func(e *ParsedEvent) (bool, error)) error {
	if startBlock < 0 || startBlock > len(r.blocks) {
		return RpcErrorf(Err_BAD_ARGS, "iterateEvents: bad startBlock, startBlock=%d", startBlock)
	}

	for i := startBlock; i < len(r.blocks); i++ {
		err := r.blocks[i].forEachEvent(op)
		if err != nil {
			return err
		}
	}
	return r.minipool.forEachEvent(op)
}

func (r *streamViewImpl) JoinedUsers() (map[string]struct{}, error) {
	users := make(map[string]struct{})

	_ = r.forEachEvent(0, func(e *ParsedEvent) (bool, error) {
		switch payload := e.Event.Payload.(type) {
		case *StreamEvent_SpacePayload:
			switch spacePayload := payload.SpacePayload.Content.(type) {
			case *SpacePayload_Membership:
				user := spacePayload.Membership.UserId
				if spacePayload.Membership.GetOp() == MembershipOp_SO_JOIN {
					users[user] = struct{}{}
				} else if spacePayload.Membership.GetOp() == MembershipOp_SO_LEAVE {
					delete(users, user)
				}
			default:
				break
			}
		case *StreamEvent_ChannelPayload:
			switch channelPayload := payload.ChannelPayload.Content.(type) {
			case *ChannelPayload_Membership:
				user := channelPayload.Membership.UserId
				if channelPayload.Membership.GetOp() == MembershipOp_SO_JOIN {
					users[user] = struct{}{}
				} else if channelPayload.Membership.GetOp() == MembershipOp_SO_LEAVE {
					delete(users, user)
				}
			default:
				break
			}
		}
		return true, nil
	})

	return users, nil
}

func (r *streamViewImpl) LastEvent() *ParsedEvent {
	lastEvent := r.minipool.lastEvent()
	if lastEvent != nil {
		return lastEvent
	}

	// Iterate over blocks in reverse order to find non-empty block and return last event from it.
	for i := len(r.blocks) - 1; i >= 0; i-- {
		lastEvent := r.blocks[i].lastEvent()
		if lastEvent != nil {
			return lastEvent
		}
	}
	return nil
}

func (r *streamViewImpl) Envelopes() []*Envelope {
	envelopes := make([]*Envelope, 0, len(r.blocks)*8)
	_ = r.forEachEvent(0, func(e *ParsedEvent) (bool, error) {
		envelopes = append(envelopes, e.Envelope)
		return true, nil
	})
	return envelopes
}

func (r *streamViewImpl) SyncCookie() *SyncCookie {
	// TODO: create once and re-use.
	return &SyncCookie{
		StreamId:         r.streamId,
		MiniblockNum:     int64(len(r.blocks)),
		MiniblockHash:    r.lastBlock().headerEvent.Hash,
		MinipoolInstance: r.minipool.instance,
		MinipoolSlot:     int64(r.minipool.events.Len()),
	}

}
